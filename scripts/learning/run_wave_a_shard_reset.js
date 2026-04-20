#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import {
  filterManifestItemsByShard,
  loadManifest,
} from './lib/wave-a-manifest.js';

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    `Usage: node ${path.join('scripts', 'learning', 'run_wave_a_shard_reset.js')} --manifest <path> --shard-id <id> [--scope-from-manifest] [--output-json <path>] [--dry-run]`,
  );
}

function normalizeRequiredOptionValue(argv, index, token) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${token} requires a value.`);
  }
  return value;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    manifestPath: null,
    shardId: null,
    scopeMode: null,
    outputJsonPath: null,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--manifest') {
      options.manifestPath = normalizeRequiredOptionValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--shard-id') {
      options.shardId = normalizeRequiredOptionValue(argv, index, token).trim();
      index += 1;
      continue;
    }
    if (token === '--scope-from-manifest') {
      options.scopeMode = 'manifest';
      continue;
    }
    if (token === '--output-json') {
      options.outputJsonPath = normalizeRequiredOptionValue(argv, index, token);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.help && !options.manifestPath) {
    throw new Error('--manifest is required.');
  }
  if (!options.help && !options.shardId) {
    throw new Error('--shard-id is required.');
  }
  if (!options.help && !options.scopeMode) {
    throw new Error('Reset requires an explicit scope flag. Use --scope-from-manifest.');
  }

  return options;
}

function normalizeCountMap(counts = {}) {
  return {
    question_bank: Number(counts?.question_bank ?? 0),
    learning_question_analysis_snapshots: Number(
      counts?.learning_question_analysis_snapshots ?? 0,
    ),
    learning_question_events: Number(counts?.learning_question_events ?? 0),
  };
}

export function buildWaveAShardResetReport({
  manifest,
  shardId,
  scopeMode,
  deletedStorageKeys = [],
  preResetCounts = {},
  deletedCounts = {},
  postResetCounts = {},
  dryRun = false,
} = {}) {
  const targetItems = filterManifestItemsByShard(manifest, shardId);
  const targetStorageKeys = targetItems.map((item) => item.storage_key);
  const targetStorageKeySet = new Set(targetStorageKeys);
  const normalizedPre = normalizeCountMap(preResetCounts);
  const normalizedDeleted = normalizeCountMap(deletedCounts);
  const normalizedPost = normalizeCountMap(postResetCounts);
  const failures = [];

  if (scopeMode !== 'manifest') {
    failures.push({
      code: 'unsupported_scope_mode',
      scope_mode: scopeMode,
    });
  }

  const outOfScopeDeletes = deletedStorageKeys.filter((storageKey) => !targetStorageKeySet.has(storageKey));
  if (outOfScopeDeletes.length > 0) {
    failures.push({
      code: 'out_of_scope_delete',
      storage_keys: outOfScopeDeletes,
    });
  }

  if (!dryRun && normalizedDeleted.question_bank !== normalizedPre.question_bank) {
    failures.push({
      code: 'partial_delete',
      pre_question_bank_rows: normalizedPre.question_bank,
      deleted_question_bank_rows: normalizedDeleted.question_bank,
    });
  }

  const leftoverEntries = Object.entries(normalizedPost)
    .filter(([, count]) => count > 0)
    .map(([surface, count]) => ({ surface, count }));
  if (!dryRun && leftoverEntries.length > 0) {
    failures.push({
      code: 'unresolved_leftovers',
      leftovers: leftoverEntries,
    });
  }

  return {
    manifest_id: manifest?.manifest_id ?? null,
    shard_id: shardId,
    scope_mode: scopeMode,
    dry_run: dryRun,
    pass: failures.length === 0,
    target_identities: targetStorageKeys,
    pre_reset_counts: normalizedPre,
    deleted_counts: normalizedDeleted,
    post_reset_counts: normalizedPost,
    summary: {
      target_row_count: targetStorageKeys.length,
      deleted_question_bank_rows: normalizedDeleted.question_bank,
      leftover_question_bank_rows: normalizedPost.question_bank,
    },
    failures,
  };
}

async function selectQuestionBankRows(client, targetStorageKeys) {
  const { data, error } = await client
    .from('question_bank')
    .select('question_id, storage_key, source_kind')
    .eq('source_kind', 'paper_question')
    .in('storage_key', targetStorageKeys);

  if (error) {
    throw new Error(`Failed to load question_bank rows for reset: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

async function countRowsByQuestionIds(client, table, questionIds) {
  if (questionIds.length === 0) {
    return 0;
  }

  const { data, error } = await client
    .from(table)
    .select('question_id')
    .in('question_id', questionIds);

  if (error) {
    throw new Error(`Failed to load ${table} rows for reset: ${error.message}`);
  }

  return Array.isArray(data) ? data.length : 0;
}

async function runWaveAShardReset({
  manifest,
  shardId,
  scopeMode,
  dryRun = false,
} = {}) {
  const targetItems = filterManifestItemsByShard(manifest, shardId);
  const targetStorageKeys = targetItems.map((item) => item.storage_key);
  const client = getServiceClient();
  const questionBankRows = await selectQuestionBankRows(client, targetStorageKeys);
  const questionIds = questionBankRows
    .map((row) => row?.question_id)
    .filter(Boolean);

  const preResetCounts = {
    question_bank: questionBankRows.length,
    learning_question_analysis_snapshots: await countRowsByQuestionIds(
      client,
      'learning_question_analysis_snapshots',
      questionIds,
    ),
    learning_question_events: await countRowsByQuestionIds(
      client,
      'learning_question_events',
      questionIds,
    ),
  };

  if (dryRun) {
    return buildWaveAShardResetReport({
      manifest,
      shardId,
      scopeMode,
      deletedStorageKeys: targetStorageKeys,
      preResetCounts,
      deletedCounts: {
        question_bank: questionBankRows.length,
      },
      postResetCounts: {
        question_bank: 0,
        learning_question_analysis_snapshots: 0,
        learning_question_events: 0,
      },
      dryRun: true,
    });
  }

  let deletedRows = [];
  if (questionIds.length > 0) {
    const { data, error } = await client
      .from('question_bank')
      .delete()
      .eq('source_kind', 'paper_question')
      .in('question_id', questionIds)
      .select('question_id, storage_key');

    if (error) {
      throw new Error(`Failed to delete question_bank rows for reset: ${error.message}`);
    }

    deletedRows = Array.isArray(data) ? data : [];
  }

  const postQuestionBankRows = await selectQuestionBankRows(client, targetStorageKeys);
  const postResetCounts = {
    question_bank: postQuestionBankRows.length,
    learning_question_analysis_snapshots: await countRowsByQuestionIds(
      client,
      'learning_question_analysis_snapshots',
      questionIds,
    ),
    learning_question_events: await countRowsByQuestionIds(
      client,
      'learning_question_events',
      questionIds,
    ),
  };

  return buildWaveAShardResetReport({
    manifest,
    shardId,
    scopeMode,
    deletedStorageKeys: deletedRows
      .map((row) => row?.storage_key)
      .filter(Boolean),
    preResetCounts,
    deletedCounts: {
      question_bank: deletedRows.length,
    },
    postResetCounts,
    dryRun: false,
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const manifest = loadManifest(options.manifestPath);
  const report = await runWaveAShardReset({
    manifest,
    shardId: options.shardId,
    scopeMode: options.scopeMode,
    dryRun: options.dryRun,
  });

  const rendered = JSON.stringify(report, null, 2);
  if (options.outputJsonPath) {
    fs.writeFileSync(options.outputJsonPath, `${rendered}\n`);
  } else {
    writeStdoutLine(rendered);
  }

  return report.pass ? 0 : 1;
}

export function isWaveAShardResetEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isWaveAShardResetEntrypoint(process.argv[1], import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    writeStderrLine(error.message);
    process.exitCode = 1;
  }
}
