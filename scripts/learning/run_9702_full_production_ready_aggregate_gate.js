#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED_9702_PRODUCTION_DB_ZERO_FIELDS } from './run_9702_production_ready_gate.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

export const NORMALIZED_TEXT_SOURCE = 'question_plain_text_v2.normalized_plain_text';
export const RAG_CORPUS_VERSION = 'rag_step3_9702_question_plain_text_v2_phase7_v1';

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-10',
  reportsDir: 'docs/reports',
  sourceInventory: 'docs/reports/2026-06-09-9702-source-truth-inventory.json',
  fullRowSurfaceManifest: 'data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json',
  productionBatchPlan: 'data/manifests/9702_production_batch_plan_2026_06_10_manifest_v1.json',
  psqlMode: 'docker',
  psqlContainer: 'supabase_db_ciecopilot-home',
  updateIndex: false,
});

const PAGE_CHAIN_COMPLETE_STATES = Object.freeze([
  'full_crop_render_complete_pending_visual_review',
  'visual_review_accepted',
  'question_plain_text_v2_ready',
]);

const FULL_DB_ZERO_FIELDS = Object.freeze([
  ...REQUIRED_9702_PRODUCTION_DB_ZERO_FIELDS,
  'rag_duplicate_chunk_rows',
]);

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function normalizePsqlMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return DEFAULTS.psqlMode;
  if (!['docker', 'direct'].includes(normalized)) {
    throw new Error(`Unsupported --psql-mode: ${value}`);
  }
  return normalized;
}

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/run_9702_full_production_ready_aggregate_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--reports-dir <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--source-inventory <path>]',
    '  [--full-row-surface-manifest <path>]',
    '  [--production-batch-plan <path>]',
    '  [--update-index]',
    '  [--psql-mode <docker|direct>]',
    '  [--psql-container <name>]',
  ].join('\n'));
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULTS,
    help: false,
    jsonOut: null,
    markdownOut: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--generated-on') {
      options.generatedOn = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--reports-dir') {
      options.reportsDir = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--json-out') {
      options.jsonOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--markdown-out') {
      options.markdownOut = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--source-inventory') {
      options.sourceInventory = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--full-row-surface-manifest') {
      options.fullRowSurfaceManifest = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--production-batch-plan') {
      options.productionBatchPlan = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--update-index') {
      options.updateIndex = true;
      continue;
    }
    if (token === '--psql-mode') {
      options.psqlMode = normalizePsqlMode(requiredValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--psql-container') {
      options.psqlContainer = requiredValue(argv, index, token);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function resolveRepoPath(repoPath) {
  return path.resolve(ROOT, repoPath);
}

function relativeRepoPath(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replaceAll(path.sep, '/');
}

function readJson(repoPath) {
  return JSON.parse(fs.readFileSync(resolveRepoPath(repoPath), 'utf8'));
}

function readJsonWithArtifactPath(repoPath) {
  return {
    ...readJson(repoPath),
    artifact_path: repoPath,
  };
}

function writeJson(repoPath, payload) {
  const resolved = resolveRepoPath(repoPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(repoPath, text) {
  const resolved = resolveRepoPath(repoPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, text, 'utf8');
}

function normalizeString(value) {
  return typeof value === 'string' ? value.replaceAll('\u0000', '').trim() : '';
}

function identityKey(row = {}) {
  return `${normalizeString(row.storage_key)}#${Number(row.q_number)}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function countWhere(rows, predicate) {
  return rows.reduce((total, row) => total + (predicate(row) ? 1 : 0), 0);
}

function duplicateExcessRows(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
}

function duplicateSamples(rows, keyFn, limit = 10) {
  const byKey = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  return [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .slice(0, limit)
    .map(([key, group]) => ({
      identity: key,
      count: group.length,
      storage_key: group[0].storage_key,
      q_number: group[0].q_number,
      shards: unique(group.map((row) => row.shard_id)),
    }));
}

function compareIdentitySets(leftRows, rightRows) {
  const left = new Set(leftRows.map(identityKey));
  const right = new Set(rightRows.map(identityKey));
  return {
    missing_from_right: [...left].filter((key) => !right.has(key)).length,
    extra_in_right: [...right].filter((key) => !left.has(key)).length,
  };
}

function metric(metrics, key) {
  return Number.isInteger(metrics?.[key]) ? metrics[key] : null;
}

function firstMetric(metrics, keys, fallback = 0) {
  for (const key of keys) {
    const value = metric(metrics, key);
    if (value !== null) return value;
  }
  return fallback;
}

function addBlocker(blockers, check, expected, actual, details = {}) {
  if (actual !== expected) {
    blockers.push({
      check,
      expected,
      actual,
      details,
    });
  }
}

function addZeroBlocker(blockers, check, actual, details = {}) {
  addBlocker(blockers, check, 0, actual, details);
}

function buildCoverage(count, expected) {
  return {
    covered: count,
    expected,
    pass: count === expected,
    ratio: `${count}/${expected}`,
  };
}

function finalArtifactPaths({ generatedOn, reportsDir, jsonOut, markdownOut }) {
  const prefix = `${reportsDir}/${generatedOn}-9702-full-production-ready`;
  return {
    aggregateJson: jsonOut ?? `${prefix}-gate.json`,
    aggregateMarkdown: markdownOut ?? `${prefix}-closeout.md`,
  };
}

function flattenProductionRows(productionManifests) {
  return productionManifests.flatMap((manifest) => (
    Array.isArray(manifest.rows)
      ? manifest.rows.map((row) => ({
          ...row,
          __production_manifest: manifest.artifact_path ?? null,
          __manifest_wave: manifest.wave ?? null,
        }))
      : []
  ));
}

function flattenPageChainRows(pageChainSurfaces = []) {
  return pageChainSurfaces.flatMap((surface) => (
    Array.isArray(surface.items)
      ? surface.items.map((item) => ({
          ...item,
          __surface_manifest: surface.artifact_path ?? null,
        }))
      : []
  ));
}

function fullSurfaceRows(fullRowSurfaceManifest = {}) {
  return Array.isArray(fullRowSurfaceManifest.items) ? fullRowSurfaceManifest.items : [];
}

function summarizeProductionManifests(productionManifests) {
  return productionManifests.map((manifest) => ({
    artifact_path: manifest.artifact_path ?? null,
    manifest_id: manifest.manifest_id ?? null,
    wave: manifest.wave ?? null,
    status: manifest.status ?? null,
    production_ready_claimed: manifest.production_ready_claimed === true,
    rows: Array.isArray(manifest.rows) ? manifest.rows.length : 0,
    shards: unique((manifest.rows ?? []).map((row) => row.shard_id)).length,
    source_pdfs: unique((manifest.rows ?? []).map((row) => row.source_pdf)).length,
    summary: manifest.summary ?? null,
  }));
}

function summarizePageChainSurfaces(pageChainSurfaces) {
  return pageChainSurfaces.map((surface) => ({
    artifact_path: surface.artifact_path ?? null,
    manifest_id: surface.manifest_id ?? null,
    surface_status: surface.surface_status ?? surface.status ?? null,
    item_count: Number.isInteger(surface.item_count) ? surface.item_count : (surface.items ?? []).length,
    rows_re_read: Array.isArray(surface.items) ? surface.items.length : 0,
    source_pdf_count: Number.isInteger(surface.source_pdf_count)
      ? surface.source_pdf_count
      : unique((surface.items ?? []).map((row) => row.source_pdf)).length,
    evidence_layers_gate_status: surface.evidence_layers_gate?.status ?? surface.evidence_layers_gate?.gate_status ?? null,
  }));
}

function sourceInventoryPath(record = {}) {
  return normalizeString(record.repo_path) || normalizeString(record.source_path);
}

function sourceRecordPasses(record = {}) {
  return (
    record.status === 'pass'
    && record.pdf_signature?.starts_with_pdf_signature === true
    && record.pdf_signature?.eof_marker_present === true
    && record.parser?.parse_success === true
    && Number(record.parser?.page_count) > 0
    && record.first_page_identity?.status === 'pass'
    && record.render_sanity?.status === 'pass'
    && (!Array.isArray(record.blockers) || record.blockers.length === 0)
  );
}

function sourceInventoryCoverage({ sourceInventory, productionSourcePdfs, sourceFileExists }) {
  const records = Array.isArray(sourceInventory?.records) ? sourceInventory.records : [];
  const byPath = new Map(records.map((record) => [sourceInventoryPath(record), record]).filter(([recordPath]) => recordPath));
  const missingRecords = [];
  const failingRecords = [];
  const missingFiles = [];

  for (const sourcePdf of productionSourcePdfs) {
    const record = byPath.get(sourcePdf);
    if (!record) {
      missingRecords.push(sourcePdf);
      continue;
    }
    if (!sourceRecordPasses(record)) {
      failingRecords.push({
        source_pdf: sourcePdf,
        status: record.status ?? null,
        parser: record.parser ?? null,
        first_page_identity: record.first_page_identity ?? null,
        render_sanity: record.render_sanity ?? null,
      });
    }
    if (!sourceFileExists(sourcePdf)) {
      missingFiles.push(sourcePdf);
    }
  }

  return {
    records,
    missing_records: missingRecords,
    failing_records: failingRecords,
    missing_files: missingFiles,
  };
}

function defaultSourceFileExists(repoPath) {
  return fs.existsSync(resolveRepoPath(repoPath));
}

function expectedFromEvidence({
  expected = {},
  fullRowSurfaceManifest,
  productionBatchPlan,
  productionManifests,
  productionRows,
}) {
  return {
    rows: Number.isInteger(expected.rows)
      ? expected.rows
      : Number(fullRowSurfaceManifest?.item_count ?? fullSurfaceRows(fullRowSurfaceManifest).length ?? productionRows.length),
    shards: Number.isInteger(expected.shards)
      ? expected.shards
      : Number(fullRowSurfaceManifest?.shard_count ?? (fullRowSurfaceManifest?.shards ?? []).length),
    sourcePdfs: Number.isInteger(expected.sourcePdfs)
      ? expected.sourcePdfs
      : Number(fullRowSurfaceManifest?.accepted_source_pdf_count ?? fullRowSurfaceManifest?.source_pdf_count ?? unique(productionRows.map((row) => row.source_pdf)).length),
    productionBatches: Number.isInteger(expected.productionBatches)
      ? expected.productionBatches
      : Number(productionBatchPlan?.summary?.batches ?? (productionBatchPlan?.batches ?? []).length ?? productionManifests.length),
  };
}

export function build9702FullProductionReadyAggregate({
  generatedOn = DEFAULTS.generatedOn,
  expected = {},
  productionManifests = [],
  fullRowSurfaceManifest = null,
  pageChainSurfaces = [],
  sourceInventory = null,
  productionBatchPlan = null,
  dbReadback = null,
  artifacts = {},
  sourceFileExists = defaultSourceFileExists,
} = {}) {
  const productionRows = flattenProductionRows(productionManifests);
  const expectedCounts = expectedFromEvidence({
    expected,
    fullRowSurfaceManifest,
    productionBatchPlan,
    productionManifests,
    productionRows,
  });
  const acceptedRows = fullSurfaceRows(fullRowSurfaceManifest);
  const pageChainRows = flattenPageChainRows(pageChainSurfaces);
  const fullSurfaceShards = Array.isArray(fullRowSurfaceManifest?.shards) ? fullRowSurfaceManifest.shards : [];
  const productionShards = unique(productionRows.map((row) => row.shard_id));
  const productionSourcePdfs = unique(productionRows.map((row) => row.source_pdf));
  const acceptedSourcePdfs = unique(acceptedRows.map((row) => row.source_pdf));
  const pageChainSourcePdfs = unique(pageChainRows.map((row) => row.source_pdf));
  const productionToSurface = compareIdentitySets(acceptedRows, productionRows);
  const pageChainToFullSurface = compareIdentitySets(acceptedRows, pageChainRows);
  const duplicateRows = duplicateExcessRows(productionRows, identityKey);
  const metrics = dbReadback?.metrics ?? {};
  const sourceCoverage = sourceInventoryCoverage({
    sourceInventory,
    productionSourcePdfs,
    sourceFileExists,
  });

  const manifestSummaries = summarizeProductionManifests(productionManifests);
  const pageChainSummaries = summarizePageChainSurfaces(pageChainSurfaces);
  const productionRowsReady = countWhere(productionRows, (row) => row.production_ready_claimed === true);
  const dbRowsClaimed = countWhere(productionRows, (row) => row.db_consumption_claimed === true);
  const searchRowsClaimed = countWhere(productionRows, (row) => row.search_consumption_claimed === true);
  const readModelRowsClaimed = countWhere(productionRows, (row) => row.read_model_consumption_claimed === true);
  const ragRowsClaimed = countWhere(productionRows, (row) => row.rag_consumption_claimed === true);
  const normalizedSourceRows = countWhere(productionRows, (row) => row.question_plain_text_source === NORMALIZED_TEXT_SOURCE);
  const localSearchSourceRows = countWhere(productionRows, (row) => row.local_search_text_source === NORMALIZED_TEXT_SOURCE);
  const localReadModelSourceRows = countWhere(productionRows, (row) => row.local_read_model_prompt_source === NORMALIZED_TEXT_SOURCE);
  const localRagSourceRows = countWhere(productionRows, (row) => row.local_rag_content_source === NORMALIZED_TEXT_SOURCE);

  const dbRegistryCoverage = firstMetric(metrics, ['question_bank_registry_rows', 'present', 'db_question_bank_registry_coverage']);
  const productionSearchCoverage = firstMetric(metrics, ['search_rows_using_normalized_plain_text']);
  const productionReadModelCoverage = firstMetric(metrics, ['read_model_rows_using_normalized_plain_text']);
  const productionRagCoverage = firstMetric(metrics, ['rag_rows_using_normalized_plain_text']);
  const productionRagChunks = firstMetric(metrics, ['rag_chunks_present'], productionRagCoverage);
  const dbDuplicateRows = firstMetric(metrics, ['duplicate_storage_key_q_number_rows']);

  const sourceSummary = sourceInventory?.summary ?? {};
  const sourceInventoryBlockerCount = Number(sourceSummary.blocker_count ?? (Array.isArray(sourceInventory?.blockers) ? sourceInventory.blockers.length : 0));
  const pageChainNotComplete = pageChainSummaries.filter((surface) => (
    surface.rows_re_read !== surface.item_count
    || !PAGE_CHAIN_COMPLETE_STATES.includes(surface.surface_status)
    || surface.evidence_layers_gate_status !== 'pass'
  )).length;

  const blockers = [];
  addBlocker(blockers, 'production_surface_manifest_count', expectedCounts.productionBatches, productionManifests.length);
  addBlocker(blockers, 'production_batch_plan_batch_count', expectedCounts.productionBatches, Number(productionBatchPlan?.summary?.batches ?? (productionBatchPlan?.batches ?? []).length ?? 0));
  addBlocker(blockers, 'production_batch_plan_selected_rows', expectedCounts.rows, Number(productionBatchPlan?.summary?.selected_rows ?? 0));
  addZeroBlocker(blockers, 'production_batch_plan_blockers', Number(productionBatchPlan?.summary?.blockers ?? (productionBatchPlan?.blockers ?? []).length ?? 0));
  if (productionBatchPlan?.status !== 'ready') {
    blockers.push({
      check: 'production_batch_plan_status',
      expected: 'ready',
      actual: productionBatchPlan?.status ?? null,
      details: { artifact: artifacts.production_batch_plan ?? null },
    });
  }

  addBlocker(blockers, 'accepted_production_ready_row_coverage', expectedCounts.rows, productionRows.length);
  addBlocker(blockers, 'accepted_shard_page_chain_surface_count', expectedCounts.shards, fullSurfaceShards.length);
  addBlocker(blockers, 'production_shard_coverage', expectedCounts.shards, productionShards.length);
  addBlocker(blockers, 'source_qp_pdf_coverage', expectedCounts.sourcePdfs, productionSourcePdfs.length);
  addBlocker(blockers, 'full_row_surface_item_count', expectedCounts.rows, Number(fullRowSurfaceManifest?.item_count ?? acceptedRows.length));
  addBlocker(blockers, 'full_row_surface_rows_re_read', expectedCounts.rows, acceptedRows.length);
  addBlocker(blockers, 'full_row_surface_shard_count', expectedCounts.shards, Number(fullRowSurfaceManifest?.shard_count ?? fullSurfaceShards.length));
  addBlocker(blockers, 'full_row_surface_source_pdf_count', expectedCounts.sourcePdfs, Number(fullRowSurfaceManifest?.accepted_source_pdf_count ?? fullRowSurfaceManifest?.source_pdf_count ?? acceptedSourcePdfs.length));
  addBlocker(blockers, 'accepted_surface_source_pdf_re_read_count', expectedCounts.sourcePdfs, acceptedSourcePdfs.length);
  addBlocker(blockers, 'page_chain_surface_manifest_count', expectedCounts.shards, pageChainSurfaces.length);
  addBlocker(blockers, 'page_chain_surface_rows_re_read', expectedCounts.rows, pageChainRows.length);
  addBlocker(blockers, 'page_chain_surface_source_pdf_re_read_count', expectedCounts.sourcePdfs, pageChainSourcePdfs.length);
  addZeroBlocker(blockers, 'page_chain_surface_not_complete', pageChainNotComplete, { surfaces: pageChainSummaries });
  addZeroBlocker(blockers, 'page_chain_rows_missing_from_full_surface', pageChainToFullSurface.missing_from_right);
  addZeroBlocker(blockers, 'page_chain_rows_extra_beyond_full_surface', pageChainToFullSurface.extra_in_right);
  addZeroBlocker(blockers, 'production_rows_missing_from_surface_rows', productionToSurface.missing_from_right);
  addZeroBlocker(blockers, 'production_rows_extra_beyond_surface_rows', productionToSurface.extra_in_right);
  addZeroBlocker(blockers, 'duplicate_storage_key_q_number_rows', duplicateRows, {
    samples: duplicateSamples(productionRows, identityKey),
  });
  addZeroBlocker(blockers, 'db_duplicate_storage_key_q_number_rows', dbDuplicateRows);

  addBlocker(blockers, 'source_inventory_tracked_source_pdf_count', expectedCounts.sourcePdfs, Number(sourceSummary.tracked_source_pdf_count ?? 0));
  addBlocker(blockers, 'source_inventory_represented_once_count', expectedCounts.sourcePdfs, Number(sourceSummary.represented_once_count ?? 0));
  addBlocker(blockers, 'source_inventory_pdf_signature_pass_count', expectedCounts.sourcePdfs, Number(sourceSummary.pdf_signature_pass_count ?? 0));
  addBlocker(blockers, 'source_inventory_pdfjs_parse_success_count', expectedCounts.sourcePdfs, Number(sourceSummary.pdfjs_parse_success_count ?? 0));
  addBlocker(blockers, 'source_inventory_render_sanity_pass_count', expectedCounts.sourcePdfs, Number(sourceSummary.render_sanity_pass_count ?? 0));
  addBlocker(blockers, 'source_inventory_first_page_identity_pass_count', expectedCounts.sourcePdfs, Number(sourceSummary.first_page_identity_pass_count ?? 0));
  addZeroBlocker(blockers, 'source_inventory_blocker_count', sourceInventoryBlockerCount);
  if (sourceInventory?.status !== 'pass') {
    blockers.push({
      check: 'source_inventory_status',
      expected: 'pass',
      actual: sourceInventory?.status ?? null,
      details: { artifact: artifacts.source_inventory ?? null },
    });
  }
  addZeroBlocker(blockers, 'source_inventory_records_missing_for_production_pdfs', sourceCoverage.missing_records.length, { samples: sourceCoverage.missing_records.slice(0, 10) });
  addZeroBlocker(blockers, 'source_inventory_records_not_parse_render_pass', sourceCoverage.failing_records.length, { samples: sourceCoverage.failing_records.slice(0, 10) });
  addZeroBlocker(blockers, 'source_pdf_files_missing', sourceCoverage.missing_files.length, { samples: sourceCoverage.missing_files.slice(0, 10) });

  addZeroBlocker(
    blockers,
    'production_manifest_not_ready',
    manifestSummaries.filter((manifest) => manifest.status !== 'ready' || !manifest.production_ready_claimed).length,
    { manifests: manifestSummaries },
  );
  addBlocker(blockers, 'production_ready_row_claims', expectedCounts.rows, productionRowsReady);
  addBlocker(blockers, 'manifest_db_consumption_claims', expectedCounts.rows, dbRowsClaimed);
  addBlocker(blockers, 'manifest_search_consumption_claims', expectedCounts.rows, searchRowsClaimed);
  addBlocker(blockers, 'manifest_read_model_consumption_claims', expectedCounts.rows, readModelRowsClaimed);
  addBlocker(blockers, 'manifest_rag_consumption_claims', expectedCounts.rows, ragRowsClaimed);
  addBlocker(blockers, 'manifest_question_plain_text_source', expectedCounts.rows, normalizedSourceRows);
  addBlocker(blockers, 'manifest_local_search_source', expectedCounts.rows, localSearchSourceRows);
  addBlocker(blockers, 'manifest_local_read_model_source', expectedCounts.rows, localReadModelSourceRows);
  addBlocker(blockers, 'manifest_local_rag_source', expectedCounts.rows, localRagSourceRows);

  addBlocker(blockers, 'db_question_bank_registry_coverage', expectedCounts.rows, dbRegistryCoverage);
  addBlocker(blockers, 'db_manifest_count', expectedCounts.rows, firstMetric(metrics, ['manifest_count']));
  addBlocker(blockers, 'db_joined_snapshot_coverage', expectedCounts.rows, firstMetric(metrics, ['joined_snapshots', 'active_snapshot_rows']));
  for (const field of FULL_DB_ZERO_FIELDS) {
    addZeroBlocker(blockers, `db_${field}`, firstMetric(metrics, [field]));
  }
  if (dbReadback?.status !== 'pass') {
    blockers.push({
      check: 'db_readback_status',
      expected: 'pass',
      actual: dbReadback?.status ?? null,
      details: dbReadback ?? null,
    });
  }
  addBlocker(blockers, 'production_search_coverage', expectedCounts.rows, productionSearchCoverage);
  addBlocker(blockers, 'production_search_text_match', expectedCounts.rows, firstMetric(metrics, ['search_text_matches_normalized_plain_text']));
  addBlocker(blockers, 'production_search_projection_normalized_text_match', expectedCounts.rows, firstMetric(metrics, ['projection_normalized_plain_text_matches']));
  addBlocker(blockers, 'production_read_model_coverage', expectedCounts.rows, productionReadModelCoverage);
  addBlocker(blockers, 'production_read_model_text_match', expectedCounts.rows, firstMetric(metrics, ['read_model_normalized_text_matches', 'read_model_normalized_plain_text_matches', 'registry_normalized_plain_text_matches']));
  addBlocker(blockers, 'production_read_model_prompt_match', expectedCounts.rows, firstMetric(metrics, ['prompt_representation_matches_normalized_plain_text']));
  addBlocker(blockers, 'production_read_model_provenance_match', expectedCounts.rows, firstMetric(metrics, ['provenance_normalized_plain_text_matches']));
  addBlocker(blockers, 'production_rag_chunk_coverage', expectedCounts.rows, productionRagChunks);
  addBlocker(blockers, 'production_rag_source_coverage', expectedCounts.rows, productionRagCoverage);
  addBlocker(blockers, 'production_rag_content_match', expectedCounts.rows, firstMetric(metrics, ['rag_content_matches_normalized_plain_text']));
  addBlocker(blockers, 'production_rag_fts_coverage', expectedCounts.rows, firstMetric(metrics, ['rag_chunks_with_fts'], productionRagChunks));

  const status = blockers.length === 0 ? 'pass' : 'blocked';

  return {
    schema_version: '9702_full_production_ready_aggregate_gate_v1',
    generated_on: generatedOn,
    status,
    verdict: status === 'pass' ? 'production-ready' : 'blocked',
    production_ready_claimed: status === 'pass',
    scope: {
      subject_code: '9702',
      expected_rows: expectedCounts.rows,
      rows: productionRows.length,
      expected_shards: expectedCounts.shards,
      shards: productionShards.length,
      expected_source_pdfs: expectedCounts.sourcePdfs,
      source_pdfs: productionSourcePdfs.length,
      expected_production_batches: expectedCounts.productionBatches,
      production_batches: productionManifests.length,
      full_row_surface_manifest: artifacts.full_row_surface_manifest ?? null,
      production_batch_plan: artifacts.production_batch_plan ?? null,
    },
    acceptance: {
      accepted_production_ready_row_coverage: buildCoverage(productionRows.length, expectedCounts.rows),
      page_chain_surface_coverage: buildCoverage(pageChainSurfaces.length, expectedCounts.shards),
      source_qp_pdf_coverage: buildCoverage(productionSourcePdfs.length, expectedCounts.sourcePdfs),
      production_batch_coverage: buildCoverage(productionManifests.length, expectedCounts.productionBatches),
      db_question_bank_registry_coverage: buildCoverage(dbRegistryCoverage, expectedCounts.rows),
      production_search_coverage: {
        ...buildCoverage(productionSearchCoverage, expectedCounts.rows),
        source: NORMALIZED_TEXT_SOURCE,
      },
      production_read_model_coverage: {
        ...buildCoverage(productionReadModelCoverage, expectedCounts.rows),
        source: NORMALIZED_TEXT_SOURCE,
      },
      production_rag_chunk_coverage: {
        ...buildCoverage(productionRagChunks, expectedCounts.rows),
        source: NORMALIZED_TEXT_SOURCE,
      },
      duplicate_storage_key_q_number_rows: duplicateRows,
      production_rows_missing_from_surface_rows: productionToSurface.missing_from_right,
      production_rows_extra_beyond_surface_rows: productionToSurface.extra_in_right,
      remaining_blockers: blockers.length,
    },
    summary: {
      rows_by_paper: countBy(productionRows, (row) => `p${row.paper}`),
      rows_by_shard: countBy(productionRows, (row) => row.shard_id),
      rows_by_production_wave: countBy(productionRows, (row) => row.production_wave || row.__manifest_wave || '(missing)'),
      text_only_ready_rows: countWhere(productionRows, (row) => row.text_consumption_status === 'text_only_ready'),
      image_context_required_rows: countWhere(productionRows, (row) => row.text_consumption_status === 'image_context_required'),
      duplicate_storage_key_q_number_rows: duplicateRows,
      production_rows_missing_from_surface_rows: productionToSurface.missing_from_right,
      production_rows_extra_beyond_surface_rows: productionToSurface.extra_in_right,
      db_question_bank_registry_coverage: dbRegistryCoverage,
      production_search_coverage: productionSearchCoverage,
      production_read_model_coverage: productionReadModelCoverage,
      production_rag_chunk_coverage: productionRagChunks,
      source_inventory_records_not_parse_render_pass: sourceCoverage.failing_records.length,
      source_pdf_files_missing: sourceCoverage.missing_files.length,
      blockers: blockers.length,
    },
    production_consumption_source: {
      expected_source: NORMALIZED_TEXT_SOURCE,
      manifest_question_plain_text_rows: normalizedSourceRows,
      manifest_search_rows: localSearchSourceRows,
      manifest_read_model_rows: localReadModelSourceRows,
      manifest_rag_rows: localRagSourceRows,
      db_search_rows: productionSearchCoverage,
      db_read_model_rows: productionReadModelCoverage,
      db_rag_rows: productionRagCoverage,
    },
    source_inventory: {
      artifact_path: artifacts.source_inventory ?? null,
      status: sourceInventory?.status ?? null,
      summary: sourceSummary,
      production_source_pdf_records_missing: sourceCoverage.missing_records.length,
      production_source_pdf_records_not_parse_render_pass: sourceCoverage.failing_records.length,
      production_source_pdf_files_missing: sourceCoverage.missing_files.length,
    },
    row_surfaces: {
      full_manifest_id: fullRowSurfaceManifest?.manifest_id ?? null,
      summary: {
        item_count: fullRowSurfaceManifest?.item_count ?? acceptedRows.length,
        shard_count: fullRowSurfaceManifest?.shard_count ?? fullSurfaceShards.length,
        source_pdf_count: fullRowSurfaceManifest?.source_pdf_count ?? acceptedSourcePdfs.length,
        accepted_source_pdf_count: fullRowSurfaceManifest?.accepted_source_pdf_count ?? acceptedSourcePdfs.length,
      },
      page_chain_surface_count: pageChainSurfaces.length,
      page_chain_rows_re_read: pageChainRows.length,
      page_chain_source_pdfs_re_read: pageChainSourcePdfs.length,
      page_chain_surfaces: pageChainSummaries,
    },
    db_readback: dbReadback,
    production_manifests: manifestSummaries,
    blockers,
    artifacts: {
      ...artifacts,
      production_surface_manifests: manifestSummaries.map((manifest) => manifest.artifact_path).filter(Boolean),
      page_chain_surface_manifests: pageChainSummaries.map((surface) => surface.artifact_path).filter(Boolean),
    },
    source_artifact_policy: {
      row_surface_truth: [
        'data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json',
        '25 accepted 9702 page-chain surface manifests referenced by that full row-surface manifest',
        '25 9702 production surface manifests listed by data/manifests/9702_production_batch_plan_2026_06_10_manifest_v1.json',
      ],
      old_eval_or_benchmark_artifacts_used_as_row_surface_proof: false,
      rag_sample_artifacts_used_as_row_surface_proof: false,
    },
    boundaries: [
      'This is row-level question-text production readiness, not a claim of perfect semantic retrieval quality, mark-scheme scoring quality, or complete detailed physics syllabus taxonomy.',
      'The classifier remains a non-released question-text-foundation row-surface classifier; authoritative scoring is not claimed.',
      'RAG proof covers deterministic question_plain_text_v2 rows in public.chunks and source attribution, not semantic retrieval-quality evaluation.',
      'Parent issue #402 must be updated or closed only after this PR merges and main contains the aggregate closeout artifacts.',
    ],
  };
}

function toBase64Json(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function recordsetSql(base64Json, columns) {
  return `jsonb_to_recordset(convert_from(decode('${base64Json}', 'base64'), 'UTF8')::jsonb) AS input(${columns})`;
}

function buildFullDbReadbackSql(readyRows) {
  const rowsBase64 = toBase64Json(readyRows.map((row) => ({
    storage_key: row.storage_key,
    q_number: row.q_number,
    normalized_plain_text: normalizeString(row.normalized_plain_text),
    production_wave: row.production_wave,
  })));

  return `
WITH manifest AS (
  SELECT * FROM ${recordsetSql(rowsBase64, 'storage_key text, q_number int, normalized_plain_text text, production_wave text')}
), registry AS (
  SELECT
    manifest.storage_key,
    manifest.q_number,
    manifest.normalized_plain_text,
    manifest.production_wave,
    qb.question_id,
    qb.prompt_representation,
    qb.provenance_summary,
    qb.classification_snapshot_ref,
    qb.primary_question_type_id
  FROM manifest
  LEFT JOIN public.question_bank qb
    ON qb.storage_key = manifest.storage_key
   AND qb.q_number = manifest.q_number
   AND qb.source_kind = 'paper_question'
), active_snapshots AS (
  SELECT question_id, classification_snapshot_id
  FROM public.learning_question_analysis_snapshots
  WHERE superseded_by_snapshot_id IS NULL
), search_projection AS (
  SELECT storage_key, q_number, search_text, search_text_source, normalized_plain_text
  FROM public.learning_question_search_projection
  WHERE source_kind = 'paper_question'
), read_model AS (
  SELECT
    r.provenance_summary ->> 'storage_key' AS storage_key,
    (r.provenance_summary ->> 'q_number')::int AS q_number,
    r.normalized_plain_text AS registry_normalized_plain_text,
    r.question_plain_text_source,
    r.prompt_representation ->> 'value' AS prompt_value,
    r.provenance_summary ->> 'normalized_plain_text' AS provenance_normalized_plain_text
  FROM public.learning_question_registry_projection r
  WHERE r.source_kind = 'paper_question'
    AND r.subject_code = '9702'
), rag_rollup AS (
  SELECT
    manifest.storage_key,
    manifest.q_number,
    manifest.production_wave,
    COUNT(c.id)::int AS rag_chunk_count,
    COUNT(c.id) FILTER (WHERE c.source_ref ->> 'content_source' = '${NORMALIZED_TEXT_SOURCE}')::int AS rag_normalized_source_count,
    COUNT(c.id) FILTER (WHERE c.content = manifest.normalized_plain_text)::int AS rag_content_match_count,
    COUNT(c.id) FILTER (WHERE c.fts IS NOT NULL)::int AS rag_fts_count
  FROM manifest
  LEFT JOIN public.chunks c
    ON c.source_ref ->> 'storage_key' = manifest.storage_key
   AND (c.source_ref ->> 'q_number')::int = manifest.q_number
   AND c.source_type = 'question_plain_text_v2'
   AND c.corpus_version = '${RAG_CORPUS_VERSION}'
   AND c.source_ref ->> 'production_wave' = manifest.production_wave
  GROUP BY manifest.storage_key, manifest.q_number, manifest.production_wave
), registry_duplicate_rows AS (
  SELECT COALESCE(SUM(duplicate_count - 1), 0)::int AS duplicate_storage_key_q_number_rows
  FROM (
    SELECT qb.storage_key, qb.q_number, COUNT(*) AS duplicate_count
    FROM public.question_bank qb
    JOIN manifest
      ON manifest.storage_key = qb.storage_key
     AND manifest.q_number = qb.q_number
    WHERE qb.source_kind = 'paper_question'
    GROUP BY qb.storage_key, qb.q_number
    HAVING COUNT(*) > 1
  ) duplicate_groups
), metric_source AS (
  SELECT
    registry.*,
    active_snapshots.classification_snapshot_id,
    search_projection.search_text,
    search_projection.search_text_source,
    search_projection.normalized_plain_text AS projection_normalized_plain_text,
    read_model.registry_normalized_plain_text,
    read_model.question_plain_text_source,
    read_model.prompt_value,
    read_model.provenance_normalized_plain_text,
    rag_rollup.rag_chunk_count,
    rag_rollup.rag_normalized_source_count,
    rag_rollup.rag_content_match_count,
    rag_rollup.rag_fts_count
  FROM registry
  LEFT JOIN active_snapshots ON active_snapshots.question_id = registry.question_id
  LEFT JOIN search_projection
    ON search_projection.storage_key = registry.storage_key
   AND search_projection.q_number = registry.q_number
  LEFT JOIN read_model
    ON read_model.storage_key = registry.storage_key
   AND read_model.q_number = registry.q_number
  LEFT JOIN rag_rollup
    ON rag_rollup.storage_key = registry.storage_key
   AND rag_rollup.q_number = registry.q_number
   AND rag_rollup.production_wave = registry.production_wave
)
SELECT json_build_object(
  'schema_version', '9702_full_production_ready_db_readback_v1',
  'status', CASE WHEN (
    COUNT(question_id) = COUNT(*)
    AND COUNT(classification_snapshot_id) = COUNT(*)
    AND COUNT(*) FILTER (WHERE question_id IS NULL) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (prompt_representation IS NULL OR prompt_representation = '{}'::jsonb)) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND provenance_summary IS NULL) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND NULLIF(BTRIM(provenance_summary ->> 'normalized_plain_text'), '') IS NULL) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (search_text IS NULL OR BTRIM(search_text) = '')) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND COALESCE(search_text_source, '') <> '${NORMALIZED_TEXT_SOURCE}') = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (classification_snapshot_ref IS NULL OR classification_snapshot_ref = '{}'::jsonb)) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND classification_snapshot_id IS NULL) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND primary_question_type_id IS NULL) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND question_plain_text_source <> '${NORMALIZED_TEXT_SOURCE}') = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND registry_normalized_plain_text <> normalized_plain_text) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND prompt_value <> normalized_plain_text) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND rag_chunk_count <> 1) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND rag_normalized_source_count <> 1) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND rag_content_match_count <> 1) = 0
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND rag_fts_count <> 1) = 0
    AND (SELECT duplicate_storage_key_q_number_rows FROM registry_duplicate_rows) = 0
  ) THEN 'pass' ELSE 'blocked' END,
  'metrics', json_build_object(
    'manifest_count', COUNT(*)::int,
    'question_bank_registry_rows', COUNT(question_id)::int,
    'present', COUNT(question_id)::int,
    'joined_snapshots', COUNT(classification_snapshot_id)::int,
    'active_snapshot_rows', COUNT(classification_snapshot_id)::int,
    'db_question_bank_registry_coverage', COUNT(question_id)::int,
    'question_bank_prompt_rows', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND prompt_representation IS NOT NULL AND prompt_representation <> '{}'::jsonb)::int,
    'question_bank_provenance_rows', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND provenance_summary IS NOT NULL)::int,
    'classifier_rows', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND primary_question_type_id IS NOT NULL)::int,
    'missing_registry', COUNT(*) FILTER (WHERE question_id IS NULL)::int,
    'prompt_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (prompt_representation IS NULL OR prompt_representation = '{}'::jsonb))::int,
    'provenance_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND provenance_summary IS NULL)::int,
    'normalized_plain_text_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND NULLIF(BTRIM(provenance_summary ->> 'normalized_plain_text'), '') IS NULL)::int,
    'search_text_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (search_text IS NULL OR BTRIM(search_text) = ''))::int,
    'search_text_source_not_normalized', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND COALESCE(search_text_source, '') <> '${NORMALIZED_TEXT_SOURCE}')::int,
    'snapshot_ref_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (classification_snapshot_ref IS NULL OR classification_snapshot_ref = '{}'::jsonb))::int,
    'snapshot_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND classification_snapshot_id IS NULL)::int,
    'materialized_classifier_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND primary_question_type_id IS NULL)::int,
    'duplicate_storage_key_q_number_rows', (SELECT duplicate_storage_key_q_number_rows FROM registry_duplicate_rows),
    'search_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE search_text_source = '${NORMALIZED_TEXT_SOURCE}')::int,
    'search_text_matches_normalized_plain_text', COUNT(*) FILTER (WHERE search_text = normalized_plain_text)::int,
    'projection_normalized_plain_text_matches', COUNT(*) FILTER (WHERE projection_normalized_plain_text = normalized_plain_text)::int,
    'read_model_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE question_plain_text_source = '${NORMALIZED_TEXT_SOURCE}')::int,
    'read_model_normalized_text_matches', COUNT(*) FILTER (WHERE registry_normalized_plain_text = normalized_plain_text)::int,
    'registry_normalized_plain_text_matches', COUNT(*) FILTER (WHERE registry_normalized_plain_text = normalized_plain_text)::int,
    'prompt_representation_matches_normalized_plain_text', COUNT(*) FILTER (WHERE prompt_value = normalized_plain_text)::int,
    'provenance_normalized_plain_text_matches', COUNT(*) FILTER (WHERE provenance_normalized_plain_text = normalized_plain_text)::int,
    'rag_chunks_present', COUNT(*) FILTER (WHERE rag_chunk_count = 1)::int,
    'rag_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE rag_normalized_source_count = 1)::int,
    'rag_content_matches_normalized_plain_text', COUNT(*) FILTER (WHERE rag_content_match_count = 1)::int,
    'rag_chunks_with_fts', COUNT(*) FILTER (WHERE rag_fts_count = 1)::int,
    'rag_duplicate_chunk_rows', COUNT(*) FILTER (WHERE rag_chunk_count > 1)::int,
    'rag_chunk_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND COALESCE(rag_chunk_count, 0) = 0)::int,
    'corpus_version', '${RAG_CORPUS_VERSION}'
  )
)::text
FROM metric_source;
`;
}

function runPsqlText(sql, options) {
  if (options.psqlMode === 'docker') {
    return execFileSync(
      'docker',
      ['exec', '-i', options.psqlContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1'],
      {
        cwd: ROOT,
        encoding: 'utf8',
        input: sql,
        maxBuffer: 1024 * 1024 * 64,
        env: process.env,
      },
    );
  }

  const databaseUrl = process.env.DATABASE_URL
    || process.env.SUPABASE_DB_URL
    || process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) is required for --psql-mode direct.');
  }
  return execFileSync(
    'psql',
    [databaseUrl, '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      input: sql,
      maxBuffer: 1024 * 1024 * 64,
      env: process.env,
    },
  );
}

function runPsqlJson(sql, options) {
  const stdout = runPsqlText(sql, options).trim();
  if (!stdout) {
    throw new Error('psql returned no JSON output.');
  }
  return JSON.parse(stdout.split('\n').at(-1));
}

function runFullDbReadback({ readyRows, generatedOn, artifactPath, options }) {
  const databaseSurface = options.psqlMode === 'docker' ? `docker:${options.psqlContainer}` : 'direct';
  return {
    generated_on: generatedOn,
    artifact: artifactPath,
    database_surface: databaseSurface,
    ...runPsqlJson(buildFullDbReadbackSql(readyRows), options),
  };
}

function productionManifestPaths(productionBatchPlan) {
  return (productionBatchPlan.batches ?? []).map((batch) => batch.ready_manifest).filter(Boolean);
}

function loadPageChainSurfaces(fullRowSurfaceManifest) {
  return (fullRowSurfaceManifest.shards ?? []).map((shard) => readJsonWithArtifactPath(shard.page_chain_surface_manifest_path));
}

function renderRowsByShard(rowsByShard) {
  return [
    '| Shard | Rows |',
    '| --- | ---: |',
    ...Object.entries(rowsByShard).map(([shardId, rows]) => `| \`${shardId}\` | ${rows} |`),
    '',
  ].join('\n');
}

function renderManifestMatrix(manifests) {
  return [
    '| Production surface manifest | Wave | Rows | Shards | Source PDFs | Claimed |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    ...manifests.map((manifest) => [
      `| \`${manifest.artifact_path}\``,
      `\`${manifest.wave}\``,
      manifest.rows,
      manifest.shards,
      manifest.source_pdfs,
      `\`${manifest.production_ready_claimed}\` |`,
    ].join(' | ')),
    '',
  ].join('\n');
}

function renderAggregateMarkdown(aggregate, paths) {
  return [
    '# 9702 full production-ready closeout',
    '',
    `日期: ${aggregate.generated_on}`,
    '',
    '## Verdict',
    '',
    aggregate.status === 'pass'
      ? `Cambridge 9702 Physics row-level question-text foundation is production-ready across all \`${aggregate.scope.rows}/${aggregate.scope.expected_rows}\` accepted rows.`
      : 'Cambridge 9702 Physics row-level question-text foundation is not fully production-ready; aggregate blockers remain.',
    '',
    `- aggregate gate status: \`${aggregate.status}\``,
    `- production_ready_claimed: \`${aggregate.production_ready_claimed}\``,
    `- full row coverage: \`${aggregate.acceptance.accepted_production_ready_row_coverage.ratio}\``,
    `- page-chain surface coverage: \`${aggregate.acceptance.page_chain_surface_coverage.ratio}\``,
    `- source QP PDF coverage: \`${aggregate.acceptance.source_qp_pdf_coverage.ratio}\``,
    `- production batch coverage: \`${aggregate.acceptance.production_batch_coverage.ratio}\``,
    `- text-only ready rows: \`${aggregate.summary.text_only_ready_rows}\``,
    `- image-context required rows: \`${aggregate.summary.image_context_required_rows}\``,
    `- DB/question_bank registry coverage: \`${aggregate.acceptance.db_question_bank_registry_coverage.ratio}\``,
    `- production search coverage: \`${aggregate.acceptance.production_search_coverage.ratio}\`, source \`${NORMALIZED_TEXT_SOURCE}\``,
    `- production read-model coverage: \`${aggregate.acceptance.production_read_model_coverage.ratio}\`, source \`${NORMALIZED_TEXT_SOURCE}\``,
    `- production RAG chunk coverage: \`${aggregate.acceptance.production_rag_chunk_coverage.ratio}\`, source \`${NORMALIZED_TEXT_SOURCE}\``,
    `- duplicate storage-key/q_number rows: \`${aggregate.acceptance.duplicate_storage_key_q_number_rows}\``,
    `- production rows missing from row-surface manifests: \`${aggregate.acceptance.production_rows_missing_from_surface_rows}\``,
    `- production rows extra beyond row-surface manifests: \`${aggregate.acceptance.production_rows_extra_beyond_surface_rows}\``,
    `- remaining blockers: \`${aggregate.acceptance.remaining_blockers}\``,
    '',
    '## DB Readback',
    '',
    `- database surface: \`${aggregate.db_readback?.database_surface ?? '(not recorded)'}\``,
    `- readback status: \`${aggregate.db_readback?.status ?? '(missing)'}\``,
    `- manifest rows: \`${aggregate.db_readback?.metrics?.manifest_count ?? 0}\``,
    `- question_bank rows: \`${aggregate.db_readback?.metrics?.question_bank_registry_rows ?? 0}\``,
    `- active snapshots: \`${aggregate.db_readback?.metrics?.active_snapshot_rows ?? aggregate.db_readback?.metrics?.joined_snapshots ?? 0}\``,
    `- classifier rows: \`${aggregate.db_readback?.metrics?.classifier_rows ?? 0}\``,
    `- search source rows: \`${aggregate.db_readback?.metrics?.search_rows_using_normalized_plain_text ?? 0}\``,
    `- read-model source rows: \`${aggregate.db_readback?.metrics?.read_model_rows_using_normalized_plain_text ?? 0}\``,
    `- RAG chunks present: \`${aggregate.db_readback?.metrics?.rag_chunks_present ?? 0}\``,
    `- RAG chunks with FTS: \`${aggregate.db_readback?.metrics?.rag_chunks_with_fts ?? 0}\``,
    '',
    '## Production Surface Manifests',
    '',
    renderManifestMatrix(aggregate.production_manifests),
    '## Shard Coverage',
    '',
    renderRowsByShard(aggregate.summary.rows_by_shard),
    aggregate.blockers.length
      ? [
          '## Blockers',
          '',
          ...aggregate.blockers.map((blocker) => `- \`${blocker.check}\`: expected \`${blocker.expected}\`, actual \`${blocker.actual}\``),
          '',
        ].join('\n')
      : '',
    '## Evidence Policy',
    '',
    '- Row-surface proof comes from `data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json`, the 25 page-chain surface manifests referenced there, and the 25 production surface manifests listed by the Phase 7 production batch plan.',
    '- Old eval, benchmark, and RAG sample artifacts were not used as row-surface proof.',
    '',
    '## Boundary',
    '',
    ...aggregate.boundaries.map((boundary) => `- ${boundary}`),
    '',
    '## Artifacts',
    '',
    `- generator: \`${relativeRepoPath(__filename)}\``,
    `- machine gate: \`${paths.aggregateJson}\``,
    `- markdown closeout: \`${paths.aggregateMarkdown}\``,
    '',
  ].join('\n');
}

function updateReportsIndex({ generatedOn, indexPath, paths, aggregate }) {
  const resolved = resolveRepoPath(indexPath);
  const current = fs.readFileSync(resolved, 'utf8');
  const marker = '## Project Status\n\n';
  if (!current.includes(marker)) {
    throw new Error(`Cannot update ${indexPath}: missing Project Status marker.`);
  }
  const entry = [
    `- \`${generatedOn}-9702-full-production-ready-closeout.md\` and \`${generatedOn}-9702-full-production-ready-gate.json\` - final all-9702 aggregate production-ready closeout for ${aggregate.scope.expected_shards}/${aggregate.scope.expected_shards} accepted page-chain surfaces and ${aggregate.scope.expected_rows}/${aggregate.scope.expected_rows} rows: source QP coverage ${aggregate.scope.source_pdfs}/${aggregate.scope.expected_source_pdfs}, production batches ${aggregate.scope.production_batches}/${aggregate.scope.expected_production_batches}, text-only ready ${aggregate.summary.text_only_ready_rows}, image-context required ${aggregate.summary.image_context_required_rows}, DB/question_bank registry coverage ${aggregate.summary.db_question_bank_registry_coverage}/${aggregate.scope.expected_rows}, production search/read-model/RAG all consume \`question_plain_text_v2.normalized_plain_text\` at ${aggregate.summary.production_search_coverage}/${aggregate.summary.production_read_model_coverage}/${aggregate.summary.production_rag_chunk_coverage}, duplicate storage-key/q_number rows ${aggregate.summary.duplicate_storage_key_q_number_rows}, row-surface missing/extra ${aggregate.summary.production_rows_missing_from_surface_rows}/${aggregate.summary.production_rows_extra_beyond_surface_rows}, blockers ${aggregate.summary.blockers}, and \`production_ready_claimed=${aggregate.production_ready_claimed}\`; this proves row-level question-text production readiness only, not perfect semantic retrieval quality, mark-scheme scoring quality, or complete detailed physics syllabus taxonomy.`,
    `- \`${paths.aggregateJson}\` - machine-readable all-9702 aggregate gate re-reading the accepted full row-surface manifest, 25 page-chain surface manifests, 25 production surface manifests, source inventory parse/render posture, and live DB/search/read-model/RAG readback.`,
    '',
  ].join('\n');
  if (current.includes(`${generatedOn}-9702-full-production-ready-closeout.md`)) {
    return;
  }
  fs.writeFileSync(resolved, current.replace(marker, `${marker}${entry}`), 'utf8');
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const paths = finalArtifactPaths({
    generatedOn: options.generatedOn,
    reportsDir: options.reportsDir,
    jsonOut: options.jsonOut,
    markdownOut: options.markdownOut,
  });
  const sourceInventory = readJson(options.sourceInventory);
  const fullRowSurfaceManifest = readJson(options.fullRowSurfaceManifest);
  const productionBatchPlan = readJson(options.productionBatchPlan);
  const pageChainSurfaces = loadPageChainSurfaces(fullRowSurfaceManifest);
  const productionManifestPathsToRead = productionManifestPaths(productionBatchPlan);
  const productionManifests = productionManifestPathsToRead.map(readJsonWithArtifactPath);
  const productionRows = flattenProductionRows(productionManifests);

  writeStdoutLine('9702_full_db_readback=start');
  const dbReadback = runFullDbReadback({
    readyRows: productionRows,
    generatedOn: options.generatedOn,
    artifactPath: paths.aggregateJson,
    options,
  });
  writeStdoutLine('9702_full_db_readback=done');

  const aggregate = build9702FullProductionReadyAggregate({
    generatedOn: options.generatedOn,
    productionManifests,
    fullRowSurfaceManifest,
    pageChainSurfaces,
    sourceInventory,
    productionBatchPlan,
    dbReadback,
    artifacts: {
      source_inventory: options.sourceInventory,
      full_row_surface_manifest: options.fullRowSurfaceManifest,
      production_batch_plan: options.productionBatchPlan,
      full_aggregate_gate: paths.aggregateJson,
      full_aggregate_closeout: paths.aggregateMarkdown,
    },
  });

  writeJson(paths.aggregateJson, aggregate);
  writeText(paths.aggregateMarkdown, renderAggregateMarkdown(aggregate, paths));
  if (options.updateIndex) {
    updateReportsIndex({
      generatedOn: options.generatedOn,
      indexPath: 'docs/reports/INDEX.md',
      paths,
      aggregate,
    });
  }

  writeStdoutLine(`9702_full_production_ready_status=${aggregate.status}`);
  writeStdoutLine(`9702_full_production_ready_claimed=${aggregate.production_ready_claimed}`);
  writeStdoutLine(`9702_full_rows=${aggregate.scope.rows}`);
  writeStdoutLine(`9702_full_page_chain_surfaces=${aggregate.row_surfaces.page_chain_surface_count}`);
  writeStdoutLine(`9702_full_source_pdfs=${aggregate.scope.source_pdfs}`);
  writeStdoutLine(`9702_full_production_batches=${aggregate.scope.production_batches}`);
  writeStdoutLine(`9702_full_text_only_ready_rows=${aggregate.summary.text_only_ready_rows}`);
  writeStdoutLine(`9702_full_image_context_required_rows=${aggregate.summary.image_context_required_rows}`);
  writeStdoutLine(`9702_full_db_question_bank_registry=${aggregate.summary.db_question_bank_registry_coverage}`);
  writeStdoutLine(`9702_full_production_search=${aggregate.summary.production_search_coverage}`);
  writeStdoutLine(`9702_full_production_read_model=${aggregate.summary.production_read_model_coverage}`);
  writeStdoutLine(`9702_full_production_rag=${aggregate.summary.production_rag_chunk_coverage}`);
  writeStdoutLine(`9702_full_duplicate_storage_key_q_number_rows=${aggregate.summary.duplicate_storage_key_q_number_rows}`);
  writeStdoutLine(`9702_full_blockers=${aggregate.summary.blockers}`);

  return aggregate.status === 'pass' ? 0 : 1;
}

export function isEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }
  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isEntrypoint(process.argv[1], import.meta.url)) {
  try {
    process.exitCode = await main();
  } catch (error) {
    writeStderrLine(error.stack ?? error.message);
    process.exitCode = 1;
  }
}
