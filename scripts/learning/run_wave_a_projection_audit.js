#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import {
  filterManifestItemsByShard,
  loadManifest,
  readJson,
} from './lib/wave-a-manifest.js';

const DEFAULT_THRESHOLDS_PATH = 'data/contracts/9709_wave_a_thresholds_v1.json';

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRequiredOptionValue(argv, index, token) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${token} requires a value.`);
  }
  return value;
}

function printUsage() {
  writeStdoutLine(
    `Usage: node ${path.join('scripts', 'learning', 'run_wave_a_projection_audit.js')} --manifest <path> --shard-id <id> [--thresholds-json <path>] [--projection-json <path>] [--output-json <path>]`,
  );
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    manifestPath: null,
    shardId: null,
    thresholdsPath: DEFAULT_THRESHOLDS_PATH,
    projectionJsonPath: null,
    outputJsonPath: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--manifest') {
      options.manifestPath = normalizeRequiredOptionValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--shard-id') {
      options.shardId = normalizeString(normalizeRequiredOptionValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--thresholds-json') {
      options.thresholdsPath = normalizeRequiredOptionValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--projection-json') {
      options.projectionJsonPath = normalizeRequiredOptionValue(argv, index, token);
      index += 1;
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

  return options;
}

function buildStructuredIdentityKey(row = {}) {
  return [
    normalizeString(row.subject_code || row.syllabus_code),
    row.year ?? '',
    normalizeString(row.session).toLowerCase(),
    row.paper_number ?? row.paper ?? '',
    row.variant ?? '',
    row.q_number ?? '',
  ].join('::');
}

function requiredFieldMissing(row = {}, field) {
  const value = row?.[field];
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

export function buildWaveAProjectionAudit({
  manifest,
  shardId,
  thresholds = {},
  projectionRows = [],
} = {}) {
  const targetItems = filterManifestItemsByShard(manifest, shardId);
  const rows = [];
  const failures = [];
  const requiredFields = Array.isArray(thresholds?.projection_required_fields)
    ? thresholds.projection_required_fields
    : [];
  const duplicateProjectionRowsMax = Number(thresholds?.duplicate_projection_rows_max ?? 0);
  const completenessRequired = Number(
    thresholds?.current_shard_projection_completeness_required ?? 1,
  );
  const queryabilityRequired = Number(
    thresholds?.current_shard_queryability_required ?? 1,
  );

  const projectionByStorageKey = new Map();
  const projectionByIdentity = new Map();

  for (const row of projectionRows) {
    const storageKey = normalizeString(row?.storage_key);
    if (storageKey) {
      const bucket = projectionByStorageKey.get(storageKey) ?? [];
      bucket.push(row);
      projectionByStorageKey.set(storageKey, bucket);
    }

    const identityKey = buildStructuredIdentityKey(row);
    const identityBucket = projectionByIdentity.get(identityKey) ?? [];
    identityBucket.push(row);
    projectionByIdentity.set(identityKey, identityBucket);
  }

  let duplicateProjectionRows = 0;
  let completeRows = 0;
  let queryableRows = 0;

  for (const item of targetItems) {
    const storageKey = item.storage_key;
    const matchedRows = projectionByStorageKey.get(storageKey) ?? [];
    const manifestIdentityKey = buildStructuredIdentityKey({
      subject_code: item.syllabus_code,
      year: item.year,
      session: item.session,
      paper_number: item.paper,
      variant: item.variant,
      q_number: item.q_number,
    });
    const identityMatches = projectionByIdentity.get(manifestIdentityKey) ?? [];

    const rowReport = {
      storage_key: storageKey,
      shard_id: item.shard_id ?? null,
      matched_projection_rows: matchedRows.length,
      missing_required_fields: [],
      paper_number_matches: false,
      queryability_pass: false,
      duplicate_projection_rows: matchedRows.length > 1 ? matchedRows.length - 1 : 0,
    };

    if (matchedRows.length === 0) {
      failures.push({
        code: 'missing_projection_row',
        storage_key: storageKey,
      });
      rows.push(rowReport);
      continue;
    }

    if (matchedRows.length > 1) {
      duplicateProjectionRows += 1;
      failures.push({
        code: 'duplicate_projection_rows',
        storage_key: storageKey,
        duplicate_count: matchedRows.length,
      });
    }

    const primaryRow = matchedRows[0];
    rowReport.missing_required_fields = requiredFields.filter((field) => requiredFieldMissing(primaryRow, field));
    rowReport.paper_number_matches = Number(primaryRow?.paper_number) === Number(item.paper);
    rowReport.queryability_pass = rowReport.paper_number_matches && identityMatches.length === 1;

    if (!rowReport.paper_number_matches) {
      failures.push({
        code: 'paper_number_mismatch',
        storage_key: storageKey,
        manifest_paper: item.paper,
        projection_paper_number: primaryRow?.paper_number ?? null,
      });
    }

    if (rowReport.missing_required_fields.length > 0) {
      failures.push({
        code: 'missing_required_projection_fields',
        storage_key: storageKey,
        missing_required_fields: rowReport.missing_required_fields,
      });
    }

    if (!rowReport.queryability_pass) {
      failures.push({
        code: 'current_shard_queryability_failed',
        storage_key: storageKey,
        matching_identity_rows: identityMatches.length,
      });
    }

    if (rowReport.missing_required_fields.length === 0 && matchedRows.length === 1) {
      completeRows += 1;
    }
    if (rowReport.queryability_pass) {
      queryableRows += 1;
    }

    rows.push(rowReport);
  }

  const targetRowCount = targetItems.length;
  const summary = {
    target_row_count: targetRowCount,
    duplicate_projection_rows: duplicateProjectionRows,
    current_shard_projection_completeness: targetRowCount > 0
      ? completeRows / targetRowCount
      : 0,
    current_shard_queryability: targetRowCount > 0
      ? queryableRows / targetRowCount
      : 0,
  };

  if (summary.duplicate_projection_rows > duplicateProjectionRowsMax) {
    failures.push({
      code: 'duplicate_projection_rows_threshold_failed',
      actual: summary.duplicate_projection_rows,
      expected_max: duplicateProjectionRowsMax,
    });
  }
  if (summary.current_shard_projection_completeness < completenessRequired) {
    failures.push({
      code: 'current_shard_projection_completeness_below_threshold',
      actual: summary.current_shard_projection_completeness,
      expected_min: completenessRequired,
    });
  }
  if (summary.current_shard_queryability < queryabilityRequired) {
    failures.push({
      code: 'current_shard_queryability_below_threshold',
      actual: summary.current_shard_queryability,
      expected_min: queryabilityRequired,
    });
  }

  return {
    manifest_id: manifest?.manifest_id ?? null,
    shard_id: shardId,
    pass: failures.length === 0,
    thresholds_contract_id: thresholds?.contract_id ?? null,
    summary,
    rows,
    failures,
  };
}

async function loadProjectionRowsForScope(targetStorageKeys) {
  const client = getServiceClient();
  const { data, error } = await client
    .from('learning_question_search_projection')
    .select('storage_key, question_id, source_kind, subject_code, year, session, paper_number, variant, q_number, summary, search_text')
    .in('storage_key', targetStorageKeys);

  if (error) {
    throw new Error(`Failed to load projection rows: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const manifest = loadManifest(options.manifestPath);
  const thresholds = readJson(options.thresholdsPath);
  const targetItems = filterManifestItemsByShard(manifest, options.shardId);
  const targetStorageKeys = targetItems.map((item) => item.storage_key);
  const projectionRows = options.projectionJsonPath
    ? readJson(options.projectionJsonPath)
    : await loadProjectionRowsForScope(targetStorageKeys);

  const report = buildWaveAProjectionAudit({
    manifest,
    shardId: options.shardId,
    thresholds,
    projectionRows,
  });

  const rendered = JSON.stringify(report, null, 2);
  if (options.outputJsonPath) {
    fs.writeFileSync(options.outputJsonPath, `${rendered}\n`);
  } else {
    writeStdoutLine(rendered);
  }
  return report.pass ? 0 : 1;
}

export function isWaveAProjectionAuditEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isWaveAProjectionAuditEntrypoint(process.argv[1], import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    fs.writeSync(2, `${error.message}\n`);
    process.exitCode = 1;
  }
}
