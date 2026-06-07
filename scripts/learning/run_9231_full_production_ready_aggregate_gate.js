#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS,
  build9231ProductionBatchConfig,
} from './run_9231_wave4_production_ready_gate.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

export const NORMALIZED_TEXT_SOURCE = 'question_plain_text_v2.normalized_plain_text';
export const RAG_CORPUS_VERSION = 'rag_step3_9231_question_aware_v1';
export const FULL_9231_PRODUCTION_BATCH_IDS = Object.freeze([
  'wave1',
  'wave3_wave2_batch2',
  'wave4',
  'next_wave_16',
  'wm_final_150',
]);

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-07',
  reportsDir: 'docs/reports',
  shardSplitManifest: 'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json',
  psqlMode: 'docker',
  psqlContainer: 'supabase_db_ciecopilot-home',
  updateIndex: false,
});

const FULL_EXPECTED = Object.freeze({
  rows: 1593,
  shards: 64,
  sourcePdfs: 200,
  productionBatches: 5,
});

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
    'Usage: node scripts/learning/run_9231_full_production_ready_aggregate_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--reports-dir <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--shard-split-manifest <path>]',
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
    if (token === '--shard-split-manifest') {
      options.shardSplitManifest = requiredValue(argv, index, token);
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
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

function finalArtifactPaths({ generatedOn, reportsDir, jsonOut, markdownOut }) {
  const prefix = `${reportsDir}/${generatedOn}-9231-full-production-ready`;
  return {
    aggregateJson: jsonOut ?? `${prefix}-gate.json`,
    aggregateMarkdown: markdownOut ?? `${prefix}-closeout.md`,
  };
}

function productionManifestPaths() {
  return FULL_9231_PRODUCTION_BATCH_IDS.map((batchId) => build9231ProductionBatchConfig(batchId).readyManifest);
}

function loadShardSurfaces(shardSplitManifest) {
  const surfaces = [];
  for (const shard of shardSplitManifest.shards ?? []) {
    const surfacePath = shard.page_chain_surface_manifest_path;
    const surface = readJson(surfacePath);
    surfaces.push({
      artifact_path: surfacePath,
      shard_id: shard.shard_id,
      item_count: Array.isArray(surface.items) ? surface.items.length : 0,
      source_pdf_count: surface.source_pdf_count ?? unique((surface.items ?? []).map((item) => item.source_pdf)).length,
      items: (surface.items ?? []).map((item) => ({
        ...item,
        __surface_manifest: surfacePath,
      })),
    });
  }
  return surfaces;
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

function flattenSurfaceRows(shardSurfaces = []) {
  return shardSurfaces.flatMap((surface) => surface.items ?? []);
}

function countSourceFilesMissing(sourcePdfs) {
  return sourcePdfs.filter((sourcePdf) => !fs.existsSync(resolveRepoPath(sourcePdf))).length;
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

export function build9231FullProductionReadyAggregate({
  generatedOn = DEFAULTS.generatedOn,
  expected = FULL_EXPECTED,
  productionManifests = [],
  shardSplitManifest = null,
  shardSurfaces = [],
  dbReadback = null,
  artifacts = {},
} = {}) {
  const productionRows = flattenProductionRows(productionManifests);
  const expectedProductionBatches = Number.isInteger(expected.productionBatches)
    ? expected.productionBatches
    : productionManifests.length;
  const surfaceRows = flattenSurfaceRows(shardSurfaces);
  const splitSummary = shardSplitManifest?.summary ?? {};
  const splitShards = Array.isArray(shardSplitManifest?.shards) ? shardSplitManifest.shards : [];
  const productionShards = unique(productionRows.map((row) => row.shard_id));
  const productionSourcePdfs = unique(productionRows.map((row) => row.source_pdf));
  const surfaceShards = unique(surfaceRows.map((row) => row.shard_id));
  const surfaceSourcePdfs = unique(surfaceRows.map((row) => row.source_pdf));
  const duplicateRows = duplicateExcessRows(productionRows, identityKey);
  const productionToSurface = surfaceRows.length > 0
    ? compareIdentitySets(surfaceRows, productionRows)
    : { missing_from_right: 0, extra_in_right: 0 };
  const metrics = dbReadback?.metrics ?? {};

  const manifestSummaries = summarizeProductionManifests(productionManifests);
  const productionRowsReady = countWhere(productionRows, (row) => row.production_ready_claimed === true);
  const dbRowsClaimed = countWhere(productionRows, (row) => row.db_consumption_claimed === true);
  const searchRowsClaimed = countWhere(productionRows, (row) => row.search_consumption_claimed === true);
  const readModelRowsClaimed = countWhere(productionRows, (row) => row.read_model_consumption_claimed === true);
  const ragRowsClaimed = countWhere(productionRows, (row) => row.rag_consumption_claimed === true);
  const normalizedSourceRows = countWhere(productionRows, (row) => row.question_plain_text_source === NORMALIZED_TEXT_SOURCE);
  const localSearchSourceRows = countWhere(productionRows, (row) => row.local_search_text_source === NORMALIZED_TEXT_SOURCE);
  const localReadModelSourceRows = countWhere(productionRows, (row) => row.local_read_model_prompt_source === NORMALIZED_TEXT_SOURCE);
  const localRagSourceRows = countWhere(productionRows, (row) => row.local_rag_content_source === NORMALIZED_TEXT_SOURCE);

  const dbRegistryCoverage = metric(metrics, 'question_bank_registry_rows') ?? metric(metrics, 'present') ?? 0;
  const productionSearchCoverage = metric(metrics, 'search_rows_using_normalized_plain_text') ?? 0;
  const productionReadModelCoverage = metric(metrics, 'read_model_rows_using_normalized_plain_text') ?? 0;
  const productionRagCoverage = metric(metrics, 'rag_rows_using_normalized_plain_text') ?? 0;
  const productionRagChunks = metric(metrics, 'rag_chunks_present') ?? productionRagCoverage;
  const dbDuplicateRows = metric(metrics, 'duplicate_storage_key_q_number_rows') ?? 0;

  const blockers = [];
  addBlocker(blockers, 'production_surface_manifest_count', expectedProductionBatches, productionManifests.length);
  addBlocker(blockers, 'full_production_ready_row_coverage', expected.rows, productionRows.length);
  addBlocker(blockers, 'shard_coverage', expected.shards, productionShards.length);
  addBlocker(blockers, 'source_qp_coverage', expected.sourcePdfs, productionSourcePdfs.length);
  addBlocker(blockers, 'shard_split_row_count', expected.rows, splitSummary.question_row_count ?? null);
  addBlocker(blockers, 'shard_split_shard_count', expected.shards, splitSummary.shard_count ?? splitShards.length);
  addBlocker(blockers, 'shard_split_source_pdf_count', expected.sourcePdfs, splitSummary.source_pdf_count ?? null);
  addZeroBlocker(blockers, 'duplicate_storage_key_q_number_rows', duplicateRows, {
    samples: duplicateSamples(productionRows, identityKey),
  });
  addZeroBlocker(blockers, 'db_duplicate_storage_key_q_number_rows', dbDuplicateRows);
  addZeroBlocker(blockers, 'production_rows_missing_from_surface_rows', productionToSurface.missing_from_right);
  addZeroBlocker(blockers, 'production_rows_extra_beyond_surface_rows', productionToSurface.extra_in_right);
  addZeroBlocker(blockers, 'source_pdf_files_missing', countSourceFilesMissing(productionSourcePdfs));

  if (surfaceRows.length > 0) {
    addBlocker(blockers, 'surface_row_count', expected.rows, surfaceRows.length);
    addBlocker(blockers, 'surface_shard_count', expected.shards, surfaceShards.length);
    addBlocker(blockers, 'surface_source_pdf_count', expected.sourcePdfs, surfaceSourcePdfs.length);
  }

  addZeroBlocker(
    blockers,
    'production_manifest_not_ready',
    manifestSummaries.filter((manifest) => manifest.status !== 'ready' || !manifest.production_ready_claimed).length,
    { manifests: manifestSummaries },
  );
  addBlocker(blockers, 'production_ready_row_claims', expected.rows, productionRowsReady);
  addBlocker(blockers, 'manifest_db_consumption_claims', expected.rows, dbRowsClaimed);
  addBlocker(blockers, 'manifest_search_consumption_claims', expected.rows, searchRowsClaimed);
  addBlocker(blockers, 'manifest_read_model_consumption_claims', expected.rows, readModelRowsClaimed);
  addBlocker(blockers, 'manifest_rag_consumption_claims', expected.rows, ragRowsClaimed);
  addBlocker(blockers, 'manifest_question_plain_text_source', expected.rows, normalizedSourceRows);
  addBlocker(blockers, 'manifest_local_search_source', expected.rows, localSearchSourceRows);
  addBlocker(blockers, 'manifest_local_read_model_source', expected.rows, localReadModelSourceRows);
  addBlocker(blockers, 'manifest_local_rag_source', expected.rows, localRagSourceRows);

  addBlocker(blockers, 'db_question_bank_registry_coverage', expected.rows, dbRegistryCoverage);
  addBlocker(blockers, 'db_manifest_count', expected.rows, metric(metrics, 'manifest_count') ?? 0);
  addBlocker(blockers, 'db_joined_snapshot_coverage', expected.rows, metric(metrics, 'joined_snapshots') ?? 0);
  for (const field of REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS) {
    addZeroBlocker(blockers, `db_${field}`, metric(metrics, field) ?? 0);
  }
  if (dbReadback?.status !== 'pass') {
    blockers.push({
      check: 'db_readback_status',
      expected: 'pass',
      actual: dbReadback?.status ?? null,
      details: dbReadback ?? null,
    });
  }
  addBlocker(blockers, 'production_search_coverage', expected.rows, productionSearchCoverage);
  addBlocker(blockers, 'production_search_text_match', expected.rows, metric(metrics, 'search_text_matches_normalized_plain_text') ?? 0);
  addBlocker(blockers, 'production_read_model_coverage', expected.rows, productionReadModelCoverage);
  addBlocker(blockers, 'production_read_model_text_match', expected.rows, metric(metrics, 'read_model_normalized_plain_text_matches') ?? 0);
  addBlocker(blockers, 'production_read_model_prompt_match', expected.rows, metric(metrics, 'prompt_representation_matches_normalized_plain_text') ?? 0);
  addBlocker(blockers, 'production_rag_chunk_coverage', expected.rows, productionRagChunks);
  addBlocker(blockers, 'production_rag_source_coverage', expected.rows, productionRagCoverage);
  addBlocker(blockers, 'production_rag_content_match', expected.rows, metric(metrics, 'rag_content_matches_normalized_plain_text') ?? 0);

  const status = blockers.length === 0 ? 'pass' : 'blocked';

  return {
    schema_version: '9231_full_production_ready_aggregate_gate_v1',
    generated_on: generatedOn,
    status,
    verdict: status === 'pass' ? 'production-ready' : 'blocked',
    production_ready_claimed: status === 'pass',
    scope: {
      subject_code: '9231',
      expected_rows: expected.rows,
      rows: productionRows.length,
      expected_shards: expected.shards,
      shards: productionShards.length,
      expected_source_pdfs: expected.sourcePdfs,
      source_pdfs: productionSourcePdfs.length,
      production_batches: productionManifests.length,
      shard_split_manifest: artifacts.shard_split_manifest ?? null,
    },
    acceptance: {
      full_production_ready_row_coverage: buildCoverage(productionRows.length, expected.rows),
      shard_coverage: buildCoverage(productionShards.length, expected.shards),
      source_qp_coverage: buildCoverage(productionSourcePdfs.length, expected.sourcePdfs),
      db_question_bank_registry_coverage: buildCoverage(dbRegistryCoverage, expected.rows),
      production_search_coverage: {
        ...buildCoverage(productionSearchCoverage, expected.rows),
        source: NORMALIZED_TEXT_SOURCE,
      },
      production_read_model_coverage: {
        ...buildCoverage(productionReadModelCoverage, expected.rows),
        source: NORMALIZED_TEXT_SOURCE,
      },
      production_rag_chunk_coverage: {
        ...buildCoverage(productionRagChunks, expected.rows),
        source: NORMALIZED_TEXT_SOURCE,
      },
      duplicate_storage_key_q_number_rows: duplicateRows,
      remaining_blockers: blockers.length,
    },
    summary: {
      rows_by_paper: countBy(productionRows, (row) => `p${row.paper}`),
      rows_by_shard: countBy(productionRows, (row) => row.shard_id),
      rows_by_production_wave: countBy(productionRows, (row) => row.production_wave || row.__manifest_wave || '(missing)'),
      text_only_ready_rows: countWhere(productionRows, (row) => row.text_consumption_status === 'text_only_ready'),
      image_context_required_rows: countWhere(productionRows, (row) => row.text_consumption_status === 'image_context_required'),
      duplicate_storage_key_q_number_rows: duplicateRows,
      db_question_bank_registry_coverage: dbRegistryCoverage,
      production_search_coverage: productionSearchCoverage,
      production_read_model_coverage: productionReadModelCoverage,
      production_rag_chunk_coverage: productionRagChunks,
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
    db_readback: dbReadback,
    shard_split: {
      manifest_id: shardSplitManifest?.manifest_id ?? null,
      summary: splitSummary,
      surface_manifest_count: splitShards.length,
      surface_rows_re_read: surfaceRows.length || null,
      surface_source_pdfs_re_read: surfaceRows.length ? surfaceSourcePdfs.length : null,
    },
    production_manifests: manifestSummaries,
    blockers,
    artifacts: {
      ...artifacts,
      production_surface_manifests: manifestSummaries.map((manifest) => manifest.artifact_path).filter(Boolean),
    },
    source_artifact_policy: {
      row_surface_truth: [
        'data/manifests/9231_question_shard_split_2026_06_04_manifest_v1.json',
        '64 data/manifests/9231_*_page_chain_surface_v1.json shard surfaces',
        'five 9231 production surface manifests listed in production_surface_manifests',
      ],
      old_eval_or_benchmark_artifacts_used_as_row_surface_proof: false,
    },
    boundaries: [
      'This is row-level question-text production readiness, not a claim of perfect semantic retrieval quality or detailed syllabus-topic canonicalization.',
      'The classifier remains a non-released question-text-foundation row-surface classifier; authoritative scoring taxonomy is not claimed.',
      'RAG proof covers deterministic question_plain_text_v2 rows in public.chunks and source attribution, not semantic retrieval-quality evaluation.',
      'Parent issue #389 should be updated or closed only after this PR merges and the orchestrator verifies final aggregate truth.',
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
  SELECT storage_key, q_number, search_text, search_text_source
  FROM public.learning_question_search_projection
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
    AND r.subject_code = '9231'
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
  'schema_version', '9231_full_production_ready_db_readback_v1',
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
    AND (SELECT duplicate_storage_key_q_number_rows FROM registry_duplicate_rows) = 0
  ) THEN 'pass' ELSE 'blocked' END,
  'metrics', json_build_object(
    'manifest_count', COUNT(*)::int,
    'question_bank_registry_rows', COUNT(question_id)::int,
    'present', COUNT(question_id)::int,
    'joined_snapshots', COUNT(classification_snapshot_id)::int,
    'db_question_bank_registry_coverage', COUNT(question_id)::int,
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
    'read_model_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE question_plain_text_source = '${NORMALIZED_TEXT_SOURCE}')::int,
    'read_model_normalized_plain_text_matches', COUNT(*) FILTER (WHERE registry_normalized_plain_text = normalized_plain_text)::int,
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
    '# 9231 full production-ready closeout',
    '',
    `日期: ${aggregate.generated_on}`,
    '',
    '## Verdict',
    '',
    aggregate.status === 'pass'
      ? 'Cambridge 9231 row-level question-text foundation is production-ready across all `1593/1593` rows.'
      : 'Cambridge 9231 row-level question-text foundation is not fully production-ready; aggregate blockers remain.',
    '',
    `- aggregate gate status: \`${aggregate.status}\``,
    `- production_ready_claimed: \`${aggregate.production_ready_claimed}\``,
    `- full row coverage: \`${aggregate.acceptance.full_production_ready_row_coverage.ratio}\``,
    `- shard coverage: \`${aggregate.acceptance.shard_coverage.ratio}\``,
    `- source QP coverage: \`${aggregate.acceptance.source_qp_coverage.ratio}\``,
    `- DB/question_bank registry coverage: \`${aggregate.acceptance.db_question_bank_registry_coverage.ratio}\``,
    `- production search coverage: \`${aggregate.acceptance.production_search_coverage.ratio}\`, source \`${NORMALIZED_TEXT_SOURCE}\``,
    `- production read-model coverage: \`${aggregate.acceptance.production_read_model_coverage.ratio}\`, source \`${NORMALIZED_TEXT_SOURCE}\``,
    `- production RAG chunk coverage: \`${aggregate.acceptance.production_rag_chunk_coverage.ratio}\`, source \`${NORMALIZED_TEXT_SOURCE}\``,
    `- duplicate storage-key/q_number rows: \`${aggregate.acceptance.duplicate_storage_key_q_number_rows}\``,
    `- remaining blockers: \`${aggregate.acceptance.remaining_blockers}\``,
    '',
    '## DB Readback',
    '',
    `- database surface: \`${aggregate.db_readback?.database_surface ?? '(not recorded)'}\``,
    `- readback status: \`${aggregate.db_readback?.status ?? '(missing)'}\``,
    `- manifest rows: \`${aggregate.db_readback?.metrics?.manifest_count ?? 0}\``,
    `- question_bank rows: \`${aggregate.db_readback?.metrics?.question_bank_registry_rows ?? 0}\``,
    `- search source rows: \`${aggregate.db_readback?.metrics?.search_rows_using_normalized_plain_text ?? 0}\``,
    `- read-model source rows: \`${aggregate.db_readback?.metrics?.read_model_rows_using_normalized_plain_text ?? 0}\``,
    `- RAG chunks present: \`${aggregate.db_readback?.metrics?.rag_chunks_present ?? 0}\``,
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
    '- Row-surface proof comes from the shard split manifest, all 64 shard page-chain surface manifests, and the five production surface manifests.',
    '- Old eval, benchmark, or RAG sample artifacts were not used as row-surface proof.',
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
    `- \`${generatedOn}-9231-full-production-ready-closeout.md\` and \`${generatedOn}-9231-full-production-ready-gate.json\` - final all-9231 aggregate production-ready closeout for 64/64 shard surfaces and 1593/1593 rows: source QP coverage 200/200, DB/question_bank registry coverage ${aggregate.summary.db_question_bank_registry_coverage}/1593, production search/read-model/RAG all consume \`question_plain_text_v2.normalized_plain_text\` at ${aggregate.summary.production_search_coverage}/${aggregate.summary.production_read_model_coverage}/${aggregate.summary.production_rag_chunk_coverage}, duplicate storage-key/q_number rows ${aggregate.summary.duplicate_storage_key_q_number_rows}, blockers ${aggregate.summary.blockers}, and \`production_ready_claimed=${aggregate.production_ready_claimed}\`.`,
    `- \`${paths.aggregateJson}\` - machine-readable all-9231 aggregate gate re-reading five production surface manifests, all 64 shard surfaces from the shard split foundation manifest, and live DB/search/read-model/RAG readback.`,
    '',
  ].join('\n');
  if (current.includes(`${generatedOn}-9231-full-production-ready-closeout.md`)) {
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
  const productionManifestPathsToRead = productionManifestPaths();
  const productionManifests = productionManifestPathsToRead.map(readJsonWithArtifactPath);
  const shardSplitManifest = readJson(options.shardSplitManifest);
  const shardSurfaces = loadShardSurfaces(shardSplitManifest);
  const productionRows = flattenProductionRows(productionManifests);

  writeStdoutLine('9231_full_db_readback=start');
  const dbReadback = runFullDbReadback({
    readyRows: productionRows,
    generatedOn: options.generatedOn,
    artifactPath: paths.aggregateJson,
    options,
  });
  writeStdoutLine('9231_full_db_readback=done');

  const aggregate = build9231FullProductionReadyAggregate({
    generatedOn: options.generatedOn,
    expected: FULL_EXPECTED,
    productionManifests,
    shardSplitManifest,
    shardSurfaces,
    dbReadback,
    artifacts: {
      shard_split_manifest: options.shardSplitManifest,
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

  writeStdoutLine(`9231_full_production_ready_status=${aggregate.status}`);
  writeStdoutLine(`9231_full_production_ready_claimed=${aggregate.production_ready_claimed}`);
  writeStdoutLine(`9231_full_rows=${aggregate.scope.rows}`);
  writeStdoutLine(`9231_full_shards=${aggregate.scope.shards}`);
  writeStdoutLine(`9231_full_source_pdfs=${aggregate.scope.source_pdfs}`);
  writeStdoutLine(`9231_full_db_question_bank_registry=${aggregate.summary.db_question_bank_registry_coverage}`);
  writeStdoutLine(`9231_full_production_search=${aggregate.summary.production_search_coverage}`);
  writeStdoutLine(`9231_full_production_read_model=${aggregate.summary.production_read_model_coverage}`);
  writeStdoutLine(`9231_full_production_rag=${aggregate.summary.production_rag_chunk_coverage}`);
  writeStdoutLine(`9231_full_duplicate_storage_key_q_number_rows=${aggregate.summary.duplicate_storage_key_q_number_rows}`);
  writeStdoutLine(`9231_full_blockers=${aggregate.summary.blockers}`);

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
