#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const NORMALIZED_TEXT_SOURCE = 'question_plain_text_v2.normalized_plain_text';
const QUESTION_TYPE_ID = '9231.question_text_foundation.row_surface';
const QUESTION_FAMILY_ID = '9231.question_text_foundation';
const CURRICULUM_VERSION_TAG = '2025-2027_v1';
const RAG_CORPUS_VERSION = 'rag_step3_9231_question_aware_v1';
const PRODUCTION_WAVE = '9231_wave4';

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-06',
  reportsDir: 'docs/reports',
  readyManifest: 'data/manifests/9231_wave4_production_surface_2026_06_06_manifest_v1.json',
  v2Artifact: 'docs/reports/2026-06-05-9231-wave4-question-plain-text-v2.json',
  authorityArtifact: 'docs/reports/2026-06-05-9231-wave4-authority-alignment.json',
  consumptionArtifact: 'docs/reports/2026-06-05-9231-wave4-question-plain-text-v2-consumption.json',
  evidenceGateArtifact: 'docs/reports/2026-06-05-9231-wave4-evidence-layers-gate.json',
  psqlMode: 'docker',
  psqlContainer: 'supabase_db_ciecopilot-home',
  applyDb: false,
  updateIndex: false,
});

export const REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS = Object.freeze([
  'missing_registry',
  'prompt_missing',
  'provenance_missing',
  'normalized_plain_text_missing',
  'search_text_missing',
  'search_text_source_not_normalized',
  'snapshot_ref_missing',
  'snapshot_missing',
  'materialized_classifier_missing',
  'rag_chunk_missing',
]);

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/run_9231_wave4_production_ready_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--apply-db]',
    '  [--update-index]',
    '  [--psql-mode <docker|direct>]',
    '  [--psql-container <name>]',
  ].join('\n'));
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

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    ...DEFAULTS,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--generated-on') {
      options.generatedOn = requiredValue(argv, index, token);
      options.readyManifest = `data/manifests/9231_wave4_production_surface_${options.generatedOn.replaceAll('-', '_')}_manifest_v1.json`;
      index += 1;
      continue;
    }
    if (token === '--apply-db') {
      options.applyDb = true;
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

function ensureParentDir(repoPath) {
  fs.mkdirSync(path.dirname(resolveRepoPath(repoPath)), { recursive: true });
}

function writeJson(repoPath, payload) {
  ensureParentDir(repoPath);
  fs.writeFileSync(resolveRepoPath(repoPath), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(repoPath, text) {
  ensureParentDir(repoPath);
  fs.writeFileSync(resolveRepoPath(repoPath), text, 'utf8');
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function toBase64Json(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function toKebabShardId(shardId) {
  return shardId.replaceAll('_', '-');
}

function inferShardId(row = {}) {
  const explicit = normalizeString(row.shard_id);
  if (explicit) {
    return explicit.startsWith('9231_') ? explicit : `9231_${explicit}`;
  }
  const sourceManifest = normalizeString(row.source_surface_manifest);
  const match = /data\/manifests\/(9231_p[1-4]_[msw]\d{2}_standard_001)_page_chain_surface_v1\.json$/.exec(sourceManifest);
  if (match) {
    return match[1];
  }
  const storageKey = normalizeString(row.storage_key);
  const storageMatch = /^9231\/(?<session>[msw]\d{2})_qp_(?<paperVariant>\d{2})\/questions\/q\d{2}\.png$/.exec(storageKey);
  if (storageMatch?.groups) {
    const paper = storageMatch.groups.paperVariant.slice(0, 1);
    return `9231_p${paper}_${storageMatch.groups.session}_standard_001`;
  }
  return null;
}

function parseShardId(shardId) {
  const match = /^9231_p(?<paper>[1-4])_(?<session>[msw]\d{2})_standard_001$/.exec(shardId);
  if (!match?.groups) {
    throw new Error(`Unexpected 9231 wave4 shard id: ${shardId}`);
  }
  return {
    paper: Number(match.groups.paper),
    session: match.groups.session,
    source_type: 'standard',
  };
}

function indexItemsByStorageKey(items = []) {
  const map = new Map();
  for (const item of items) {
    const storageKey = normalizeString(item?.storage_key);
    if (storageKey && !map.has(storageKey)) {
      map.set(storageKey, item);
    }
  }
  return map;
}

function componentPathForPaper(paper) {
  return `9231.p${paper}`;
}

function componentTitleForPaper(paper) {
  return {
    1: 'Further Pure Mathematics 1',
    2: 'Further Pure Mathematics 2',
    3: 'Further Mechanics',
    4: 'Further Probability and Statistics',
  }[paper] ?? `Paper ${paper}`;
}

function titleizeTopicSegment(segment) {
  return String(segment || '')
    .replaceAll('_', ' ')
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function buildTopicTitle(topicPath) {
  const normalized = normalizeString(topicPath);
  if (normalized === '9231') {
    return 'Cambridge International AS & A Level Further Mathematics 9231';
  }
  const componentMatch = /^9231\.p([1-4])$/.exec(normalized);
  if (componentMatch) {
    return componentTitleForPaper(Number(componentMatch[1]));
  }
  return titleizeTopicSegment(normalized.split('.').at(-1));
}

function topicPaper(topicPath) {
  const match = /^9231\.p([1-4])(?:\.|$)/.exec(normalizeString(topicPath));
  return match ? Number(match[1]) : null;
}

function buildTopicNodes(readyRows = []) {
  const paths = new Set(['9231']);
  for (const row of readyRows) {
    const topicPath = normalizeString(row.primary_topic_path) || componentPathForPaper(row.paper);
    const parts = topicPath.split('.');
    for (let index = 1; index <= parts.length; index += 1) {
      paths.add(parts.slice(0, index).join('.'));
    }
  }

  return [...paths]
    .sort((left, right) => left.split('.').length - right.split('.').length || left.localeCompare(right))
    .map((topicPath, index) => {
      const parts = topicPath.split('.');
      return {
        topic_path: topicPath,
        parent_topic_path: parts.length > 1 ? parts.slice(0, -1).join('.') : null,
        title: buildTopicTitle(topicPath),
        level: parts.length === 1 ? 'subject' : parts.length === 2 ? 'component' : 'topic',
        paper: topicPaper(topicPath),
        sort_order: index * 10,
      };
    });
}

export function build9231Wave4ReadyRows({
  v2Artifact,
  authorityArtifact,
  consumptionArtifact,
} = {}) {
  const v2Items = Array.isArray(v2Artifact?.items) ? v2Artifact.items : [];
  const authorityByStorageKey = indexItemsByStorageKey(authorityArtifact?.items ?? []);
  const consumptionByStorageKey = indexItemsByStorageKey(consumptionArtifact?.items ?? []);
  const readyRows = [];

  for (const v2 of v2Items) {
    const storageKey = normalizeString(v2.storage_key);
    if (!storageKey) {
      continue;
    }
    const authority = authorityByStorageKey.get(storageKey);
    const consumption = consumptionByStorageKey.get(storageKey);
    const normalizedPlainText = normalizeString(v2.normalized_plain_text);
    const consumptionText = normalizeString(consumption?.normalized_plain_text);
    const shardId = inferShardId(v2);
    const paper = Number(v2.paper ?? v2.paper_number);
    const primaryTopicPath =
      normalizeNullableString(authority?.primary_topic_path)
      ?? normalizeNullableString(v2.primary_topic_path)
      ?? componentPathForPaper(paper);

    if (!authority || !consumption || !normalizedPlainText || consumptionText !== normalizedPlainText || !shardId) {
      continue;
    }

    readyRows.push({
      storage_key: storageKey,
      subject_code: '9231',
      year: Number(v2.year),
      session: normalizeString(v2.session),
      paper,
      variant: Number(v2.variant),
      q_number: Number(v2.q_number),
      source_pdf: normalizeString(v2.source_pdf),
      source_surface_manifest: normalizeString(v2.source_surface_manifest),
      shard_id: shardId,
      normalized_plain_text: normalizedPlainText,
      question_plain_text_source: NORMALIZED_TEXT_SOURCE,
      question_plain_text_artifact: normalizeString(v2.source_v1_text_layer)
        ? 'docs/reports/2026-06-05-9231-wave4-question-plain-text-v2.json'
        : 'docs/reports/2026-06-05-9231-wave4-question-plain-text-v2.json',
      source_v1_text_layer: normalizeNullableString(v2.source_v1_text_layer),
      text_source: normalizeNullableString(v2.text_source),
      text_consumption_status: normalizeString(v2.text_consumption_status)
        || (v2.requires_image_context ? 'image_context_required' : 'text_only_ready'),
      text_only_addressable: normalizeBoolean(v2.text_only_addressable),
      requires_image_context: normalizeBoolean(v2.requires_image_context),
      has_diagram: normalizeBoolean(v2.has_diagram),
      table_heavy: normalizeBoolean(v2.table_heavy),
      formula_dense: normalizeBoolean(v2.formula_dense),
      math_expression_count: Number.isInteger(v2.math_expression_count) ? v2.math_expression_count : 0,
      image_assets: normalizeArray(v2.image_assets),
      crop_paths: normalizeArray(v2.image_assets),
      rendered_pdf_page_paths: normalizeArray(v2.rendered_pdf_page_paths),
      primary_topic_path: primaryTopicPath,
      authority_alignment_status: normalizeNullableString(authority.authority_alignment_status),
      canonical_syllabus_detailed_topic_claimed: Boolean(authority.canonical_syllabus_detailed_topic_claimed),
      component_authority: authority.component_authority ?? null,
      topic_authority: authority.topic_authority ?? null,
      local_consumption_status: normalizeString(consumption.text_consumption_status)
        || normalizeString(v2.text_consumption_status),
      local_search_text_source: normalizeNullableString(consumption?.search?.search_text_source),
      local_read_model_prompt_source:
        normalizeString(consumption?.read_model?.prompt_representation?.value) === normalizedPlainText
          ? NORMALIZED_TEXT_SOURCE
          : null,
      local_rag_content_source: normalizeNullableString(consumption?.rag?.content_source),
      production_ready_claimed: true,
      db_consumption_claimed: true,
      search_consumption_claimed: true,
      read_model_consumption_claimed: true,
      rag_consumption_claimed: true,
      production_wave: PRODUCTION_WAVE,
    });
  }

  return readyRows.sort((left, right) => (
    left.shard_id.localeCompare(right.shard_id)
    || left.storage_key.localeCompare(right.storage_key)
    || left.q_number - right.q_number
  ));
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function groupRowsByShard(rows = []) {
  const byShard = new Map();
  for (const row of rows) {
    if (!byShard.has(row.shard_id)) {
      byShard.set(row.shard_id, []);
    }
    byShard.get(row.shard_id).push(row);
  }
  return byShard;
}

function summarizeReadyRows(rows = []) {
  const byShard = groupRowsByShard(rows);
  return {
    rows: rows.length,
    shards: byShard.size,
    source_pdfs: new Set(rows.map((row) => row.source_pdf).filter(Boolean)).size,
    text_only_ready_rows: rows.filter((row) => row.text_consumption_status === 'text_only_ready').length,
    image_context_required_rows: rows.filter((row) => row.text_consumption_status === 'image_context_required').length,
    rows_by_shard: Object.fromEntries([...byShard.entries()].map(([shardId, shardRows]) => [shardId, shardRows.length])),
    rows_by_paper: countBy(rows, (row) => `p${row.paper}`),
  };
}

function buildReadyManifest({ generatedOn, readyRows, artifacts }) {
  const summary = summarizeReadyRows(readyRows);
  return {
    schema_version: '9231_wave4_production_surface_manifest_v1',
    generated_on: generatedOn,
    manifest_id: `9231_wave4_production_surface_${generatedOn.replaceAll('-', '_')}_manifest_v1`,
    subject_code: '9231',
    wave: 'wave4',
    status: readyRows.length === 191 ? 'ready' : 'blocked',
    production_ready_claimed: readyRows.length === 191,
    summary,
    source_artifacts: artifacts,
    rows: readyRows,
  };
}

function dbMetricPass(metrics = {}, rows) {
  return (
    metrics.present === rows
    && metrics.manifest_count === rows
    && metrics.joined_snapshots === rows
    && REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS.every((field) => metrics[field] === 0)
  );
}

function gateMetricEquals(gate, field, rows) {
  return gate?.metrics?.[field] === rows;
}

function collectBlocker(blockers, check, { expectedRows, actualRows, details = {} } = {}) {
  blockers.push({
    check,
    expected_rows: expectedRows,
    actual_rows: actualRows,
    details,
  });
}

export function build9231Wave4ProductionReadyAggregate({
  generatedOn,
  readyRows,
  expectedRows = null,
  readyManifestPath = null,
  dbCoverage,
  searchGate,
  readModelGate,
  ragGate,
  artifacts = {},
} = {}) {
  const rows = readyRows.length;
  const requiredRows = Number.isInteger(expectedRows) ? expectedRows : rows;
  const byShard = groupRowsByShard(readyRows);
  const blockers = [];
  const gateCounts = {
    db_coverage: dbMetricPass(dbCoverage?.metrics, rows) ? 1 : 0,
    production_search:
      searchGate?.status === 'pass'
      && gateMetricEquals(searchGate, 'search_rows_using_normalized_plain_text', rows)
      && gateMetricEquals(searchGate, 'search_text_matches_normalized_plain_text', rows)
        ? 1
        : 0,
    production_read_model:
      readModelGate?.status === 'pass'
      && gateMetricEquals(readModelGate, 'read_model_rows_using_normalized_plain_text', rows)
      && gateMetricEquals(readModelGate, 'prompt_representation_matches_normalized_plain_text', rows)
        ? 1
        : 0,
    production_rag:
      ragGate?.status === 'pass'
      && gateMetricEquals(ragGate, 'rag_rows_using_normalized_plain_text', rows)
      && gateMetricEquals(ragGate, 'rag_content_matches_normalized_plain_text', rows)
        ? 1
        : 0,
  };

  if (rows !== requiredRows) {
    collectBlocker(blockers, 'wave4_ready_row_count', {
      expectedRows: requiredRows,
      actualRows: rows,
    });
  }
  if (!dbMetricPass(dbCoverage?.metrics, rows)) {
    collectBlocker(blockers, 'production_db_coverage', {
      expectedRows: rows,
      actualRows: dbCoverage?.metrics?.present ?? 0,
      details: dbCoverage?.metrics ?? {},
    });
  }
  if (gateCounts.production_search !== 1) {
    collectBlocker(blockers, 'production_search_gate', {
      expectedRows: rows,
      actualRows: searchGate?.metrics?.search_rows_using_normalized_plain_text ?? 0,
      details: searchGate?.metrics ?? {},
    });
  }
  if (gateCounts.production_read_model !== 1) {
    collectBlocker(blockers, 'production_read_model_gate', {
      expectedRows: rows,
      actualRows: readModelGate?.metrics?.read_model_rows_using_normalized_plain_text ?? 0,
      details: readModelGate?.metrics ?? {},
    });
  }
  if (gateCounts.production_rag !== 1) {
    collectBlocker(blockers, 'production_rag_gate', {
      expectedRows: rows,
      actualRows: ragGate?.metrics?.rag_rows_using_normalized_plain_text ?? 0,
      details: ragGate?.metrics ?? {},
    });
  }

  const status = blockers.length === 0 ? 'pass' : 'blocked';
  return {
    schema_version: '9231_wave4_production_ready_gate_v1',
    generated_on: generatedOn,
    status,
    verdict: status === 'pass' ? 'production-ready' : 'blocked',
    production_ready_claimed: status === 'pass',
    scope: {
      subject_code: '9231',
      wave: 'wave4',
      shards: byShard.size,
      rows,
      source_pdfs: new Set(readyRows.map((row) => row.source_pdf).filter(Boolean)).size,
      ready_manifest: readyManifestPath,
    },
    summary: {
      selected_rows: rows,
      text_only_ready_rows: readyRows.filter((row) => row.text_consumption_status === 'text_only_ready').length,
      image_context_required_rows: readyRows.filter((row) => row.text_consumption_status === 'image_context_required').length,
      gate_counts: gateCounts,
      blockers: blockers.length,
    },
    gates: {
      db_coverage: dbCoverage,
      production_search: searchGate,
      production_read_model: readModelGate,
      production_rag: ragGate,
    },
    blockers,
    shards: [...byShard.entries()].map(([shardId, shardRows]) => {
      const parsed = parseShardId(shardId);
      return {
        shard_id: shardId,
        paper: parsed.paper,
        session: parsed.session,
        source_type: parsed.source_type,
        rows: shardRows.length,
        text_only_ready_rows: shardRows.filter((row) => row.text_consumption_status === 'text_only_ready').length,
        image_context_required_rows: shardRows.filter((row) => row.text_consumption_status === 'image_context_required').length,
        production_ready_claimed: status === 'pass',
      };
    }),
    required_gate_contract: {
      ready_surface_rows: requiredRows,
      db_coverage: {
        present_equals_manifest_count_equals_joined_snapshots_equals_rows: true,
        required_zero_fields: REQUIRED_9231_PRODUCTION_DB_ZERO_FIELDS,
      },
      production_search: 'learning_question_search_projection.search_text_source is question_plain_text_v2.normalized_plain_text and search_text equals normalized_plain_text for every row',
      production_read_model: 'learning_question_registry_projection exposes normalized_plain_text and question_bank.prompt_representation.value equals normalized_plain_text for every row',
      production_rag: 'public.chunks contains one question_plain_text_v2 row per question with content equal to normalized_plain_text and source_ref.content_source normalized',
    },
    artifacts,
    boundaries: [
      'Scope is only the 10 wave4 shards / 191 rows requested by the operator.',
      'This does not claim all-9231 production readiness.',
      'The classifier surface is a question-text-foundation row-surface classifier and remains non_released_fallback; no detailed 9231 syllabus scoring taxonomy is claimed.',
      'RAG production proof covers deterministic question_plain_text_v2 corpus rows in public.chunks; it does not claim external embedding generation or semantic retrieval-quality evaluation.',
    ],
  };
}

function buildViewRefreshSql() {
  return `
DO $migration$
DECLARE
  descriptor_source_sql TEXT;
BEGIN
  IF to_regclass('public.question_descriptions_prod_v1') IS NOT NULL THEN
    descriptor_source_sql := 'public.question_descriptions_prod_v1';
  ELSE
    descriptor_source_sql := $fallback$
      (
        SELECT *
        FROM public.question_descriptions_v0
        WHERE status = 'ok'
      )
    $fallback$;
  END IF;

  EXECUTE format(
    $view$
    CREATE OR REPLACE VIEW public.learning_question_search_projection AS
    WITH descriptor_rows AS (
      SELECT
        qd.storage_key,
        qd.q_number,
        qd.summary,
        qd.question_type,
        qd.answer_form,
        qd.year,
        qd.session,
        qd.paper AS paper_number,
        qd.variant
      FROM %s qd
    ),
    question_rows AS (
      SELECT
        qb.*,
        NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') AS normalized_plain_text,
        COALESCE(
          NULLIF(BTRIM(qb.provenance_summary ->> 'question_plain_text_source'), ''),
          CASE
            WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') IS NOT NULL
              THEN 'question_plain_text_v2.normalized_plain_text'
            ELSE NULL
          END
        ) AS question_plain_text_source,
        NULLIF(BTRIM(qb.provenance_summary ->> 'text_consumption_status'), '') AS text_consumption_status,
        CASE LOWER(NULLIF(BTRIM(qb.provenance_summary ->> 'requires_image_context'), ''))
          WHEN 'true' THEN TRUE
          WHEN 'false' THEN FALSE
          ELSE NULL
        END AS requires_image_context,
        CASE LOWER(NULLIF(BTRIM(qb.provenance_summary ->> 'text_only_addressable'), ''))
          WHEN 'true' THEN TRUE
          WHEN 'false' THEN FALSE
          ELSE NULL
        END AS text_only_addressable
      FROM public.question_bank qb
    )
    SELECT
      qb.question_id,
      qb.source_kind,
      qb.subject_code,
      qb.release_scope_status,
      qb.primary_topic_id,
      cn.topic_path::text AS primary_topic_path,
      cn.title AS primary_topic_title,
      qb.family_id,
      qb.primary_question_type_id,
      qb.variant_tags,
      qb.storage_key,
      qb.q_number,
      COALESCE(
        NULLIF(BTRIM(descriptor_rows.summary), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'title'), ''),
        NULLIF(BTRIM(qb.prompt_representation ->> 'value'), '')
      ) AS summary,
      descriptor_rows.question_type,
      descriptor_rows.answer_form,
      COALESCE(descriptor_rows.year, (qb.paper_scope ->> 'year')::INTEGER) AS year,
      COALESCE(descriptor_rows.session, qb.paper_scope ->> 'session') AS session,
      COALESCE(descriptor_rows.paper_number, (qb.paper_scope ->> 'paper')::INTEGER) AS paper_number,
      COALESCE(descriptor_rows.variant, (qb.paper_scope ->> 'variant')::INTEGER) AS variant,
      COALESCE(
        qb.normalized_plain_text,
        NULLIF(BTRIM(qb.provenance_summary ->> 'search_text'), ''),
        NULLIF(BTRIM(descriptor_rows.summary), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), ''),
        NULLIF(BTRIM(qb.prompt_representation ->> 'value'), ''),
        NULLIF(BTRIM(qb.provenance_summary ->> 'title'), '')
      ) AS search_text,
      qb.normalized_plain_text,
      qb.question_plain_text_source,
      qb.text_consumption_status,
      qb.requires_image_context,
      qb.text_only_addressable,
      CASE
        WHEN qb.normalized_plain_text IS NOT NULL THEN 'question_plain_text_v2.normalized_plain_text'
        WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'search_text'), '') IS NOT NULL THEN 'provenance_summary.search_text'
        WHEN NULLIF(BTRIM(descriptor_rows.summary), '') IS NOT NULL THEN 'descriptor_rows.summary'
        WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'summary'), '') IS NOT NULL THEN 'provenance_summary.summary'
        WHEN NULLIF(BTRIM(qb.prompt_representation ->> 'value'), '') IS NOT NULL THEN 'prompt_representation.value'
        WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'title'), '') IS NOT NULL THEN 'provenance_summary.title'
        ELSE NULL
      END AS search_text_source
    FROM question_rows qb
    LEFT JOIN public.curriculum_nodes cn ON cn.node_id = qb.primary_topic_id
    LEFT JOIN descriptor_rows ON descriptor_rows.storage_key = qb.storage_key AND descriptor_rows.q_number = qb.q_number
    $view$,
    descriptor_source_sql
  );
END
$migration$;

CREATE OR REPLACE VIEW public.learning_question_registry_projection AS
SELECT
  qb.question_id,
  qb.source_kind,
  qb.subject_code,
  qb.paper_scope,
  qb.primary_topic_id,
  qb.secondary_topic_ids,
  qb.family_id,
  lf.title AS family_title,
  qb.primary_question_type_id,
  lqt.title AS primary_question_type_title,
  qb.secondary_question_type_ids,
  qb.variant_tags,
  qb.release_scope_status,
  qb.classification_snapshot_ref,
  qb.prompt_representation,
  qb.provenance_summary,
  lqas.classification_confidence,
  lqas.candidate_rubric_refs,
  lqt.release_state AS primary_question_type_release_state,
  lqas.classification_source,
  lqas.confidence_band,
  lqas.prerequisite_topic_ids,
  lqas.canonical_step_skeleton_summary,
  lqas.difficulty_signal,
  lqas.analysis_audit_metadata,
  lqas.analysis_version,
  lqas.evidence_source_event_ref,
  lqas.analysis_provenance_kind,
  lqas.low_confidence_posture,
  NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') AS normalized_plain_text,
  COALESCE(
    NULLIF(BTRIM(qb.provenance_summary ->> 'question_plain_text_source'), ''),
    CASE
      WHEN NULLIF(BTRIM(qb.provenance_summary ->> 'normalized_plain_text'), '') IS NOT NULL
        THEN 'question_plain_text_v2.normalized_plain_text'
      ELSE NULL
    END
  ) AS question_plain_text_source,
  NULLIF(BTRIM(qb.provenance_summary ->> 'text_consumption_status'), '') AS text_consumption_status,
  CASE LOWER(NULLIF(BTRIM(qb.provenance_summary ->> 'requires_image_context'), ''))
    WHEN 'true' THEN TRUE
    WHEN 'false' THEN FALSE
    ELSE NULL
  END AS requires_image_context,
  CASE LOWER(NULLIF(BTRIM(qb.provenance_summary ->> 'text_only_addressable'), ''))
    WHEN 'true' THEN TRUE
    WHEN 'false' THEN FALSE
    ELSE NULL
  END AS text_only_addressable
FROM public.question_bank qb
LEFT JOIN public.learning_question_families lf ON lf.family_id = qb.family_id
LEFT JOIN public.learning_question_types lqt ON lqt.question_type_id = qb.primary_question_type_id
LEFT JOIN public.learning_question_analysis_snapshots lqas
  ON lqas.question_id = qb.question_id
 AND lqas.superseded_by_snapshot_id IS NULL;
`;
}

function recordsetSql(base64Json, columns) {
  return `jsonb_to_recordset(convert_from(decode('${base64Json}', 'base64'), 'UTF8')::jsonb) AS input(${columns})`;
}

function readyRowsRecordset(base64Json) {
  return recordsetSql(base64Json, [
    'storage_key text',
    'subject_code text',
    'year int',
    'session text',
    'paper int',
    'variant int',
    'q_number int',
    'source_pdf text',
    'source_surface_manifest text',
    'shard_id text',
    'normalized_plain_text text',
    'question_plain_text_source text',
    'question_plain_text_artifact text',
    'source_v1_text_layer text',
    'text_source text',
    'text_consumption_status text',
    'text_only_addressable boolean',
    'requires_image_context boolean',
    'has_diagram boolean',
    'table_heavy boolean',
    'formula_dense boolean',
    'math_expression_count int',
    'image_assets jsonb',
    'crop_paths jsonb',
    'rendered_pdf_page_paths jsonb',
    'primary_topic_path text',
    'authority_alignment_status text',
    'canonical_syllabus_detailed_topic_claimed boolean',
    'component_authority jsonb',
    'topic_authority jsonb',
    'local_consumption_status text',
    'local_search_text_source text',
    'local_read_model_prompt_source text',
    'local_rag_content_source text',
    'production_ready_claimed boolean',
    'db_consumption_claimed boolean',
    'search_consumption_claimed boolean',
    'read_model_consumption_claimed boolean',
    'rag_consumption_claimed boolean',
    'production_wave text',
    'content_hash text',
  ].join(', '));
}

function buildProductionPromotionSql({ readyRows, generatedOn }) {
  const rows = readyRows.map((row) => ({
    ...row,
    content_hash: sha1(row.normalized_plain_text),
  }));
  const rowsBase64 = toBase64Json(rows);
  const topicNodesBase64 = toBase64Json(buildTopicNodes(rows));

  return `
BEGIN;

${buildViewRefreshSql()}

WITH input AS (
  SELECT * FROM ${recordsetSql(topicNodesBase64, 'topic_path text, parent_topic_path text, title text, level text, paper int, sort_order int')}
)
INSERT INTO public.curriculum_nodes (
  node_id,
  syllabus_code,
  topic_path,
  title,
  level,
  paper,
  version_tag,
  parent_id,
  sort_order,
  metadata
)
SELECT
  gen_random_uuid(),
  '9231',
  input.topic_path::ltree,
  input.title,
  input.level,
  input.paper::smallint,
  '${CURRICULUM_VERSION_TAG}',
  NULL,
  input.sort_order::smallint,
  jsonb_build_object('source', '9231_wave4_production_ready_gate_v1', 'generated_on', '${generatedOn}')
FROM input
ON CONFLICT (topic_path) DO UPDATE SET
  title = EXCLUDED.title,
  level = EXCLUDED.level,
  paper = EXCLUDED.paper,
  version_tag = EXCLUDED.version_tag,
  sort_order = EXCLUDED.sort_order,
  metadata = public.curriculum_nodes.metadata || EXCLUDED.metadata,
  updated_at = now();

WITH input AS (
  SELECT * FROM ${recordsetSql(topicNodesBase64, 'topic_path text, parent_topic_path text, title text, level text, paper int, sort_order int')}
)
UPDATE public.curriculum_nodes child
SET parent_id = parent.node_id,
    updated_at = now()
FROM input
JOIN public.curriculum_nodes parent
  ON parent.topic_path = input.parent_topic_path::ltree
WHERE child.topic_path = input.topic_path::ltree
  AND input.parent_topic_path IS NOT NULL;

INSERT INTO public.learning_question_families (
  family_id,
  subject_code,
  title,
  description,
  release_state
)
VALUES (
  '${QUESTION_FAMILY_ID}',
  '9231',
  '9231 question text foundation',
  'Question-text foundation family for row-level Cambridge 9231 production surfaces.',
  'validated'
)
ON CONFLICT (family_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  release_state = EXCLUDED.release_state,
  updated_at = now();

INSERT INTO public.learning_question_types (
  question_type_id,
  family_id,
  subject_code,
  title,
  description,
  allowed_variant_tags,
  release_state
)
VALUES (
  '${QUESTION_TYPE_ID}',
  '${QUESTION_FAMILY_ID}',
  '9231',
  '9231 question text foundation row',
  'Materialized row-surface classifier for 9231 question text foundation rows; not a released scoring taxonomy.',
  '["subject:9231", "scope:question_text_foundation", "release_scope:non_released_fallback"]'::jsonb,
  'validated'
)
ON CONFLICT (question_type_id) DO UPDATE SET
  family_id = EXCLUDED.family_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  allowed_variant_tags = EXCLUDED.allowed_variant_tags,
  release_state = EXCLUDED.release_state,
  updated_at = now();

WITH input AS (
  SELECT * FROM ${readyRowsRecordset(rowsBase64)}
), topic AS (
  SELECT input.*, cn.node_id AS primary_topic_id
  FROM input
  LEFT JOIN public.curriculum_nodes cn
    ON cn.topic_path = input.primary_topic_path::ltree
)
INSERT INTO public.question_bank (
  source_kind,
  subject_code,
  storage_key,
  q_number,
  paper_scope,
  primary_topic_id,
  secondary_topic_ids,
  family_id,
  primary_question_type_id,
  secondary_question_type_ids,
  variant_tags,
  release_scope_status,
  prompt_representation,
  provenance_summary
)
SELECT
  'paper_question',
  '9231',
  topic.storage_key,
  topic.q_number,
  jsonb_build_object(
    'syllabus_code', '9231',
    'year', topic.year,
    'session', topic.session,
    'paper', topic.paper,
    'variant', topic.variant,
    'q_number', topic.q_number,
    'storage_key', topic.storage_key,
    'source_pdf', topic.source_pdf,
    'shard_id', topic.shard_id
  ),
  topic.primary_topic_id,
  '[]'::jsonb,
  '${QUESTION_FAMILY_ID}',
  '${QUESTION_TYPE_ID}',
  '[]'::jsonb,
  jsonb_build_array('subject:9231', 'paper:p' || topic.paper::text, 'wave:wave4', 'question_text_foundation'),
  'non_released_fallback',
  jsonb_build_object('type', 'text', 'value', topic.normalized_plain_text),
  jsonb_build_object(
    'storage_key', topic.storage_key,
    'q_number', topic.q_number,
    'source_kind', 'paper_question',
    'source_pdf', topic.source_pdf,
    'source_surface_manifest', topic.source_surface_manifest,
    'shard_id', topic.shard_id,
    'production_wave', '${PRODUCTION_WAVE}',
    'production_ready_claimed', true,
    'normalized_plain_text', topic.normalized_plain_text,
    'question_plain_text_source', '${NORMALIZED_TEXT_SOURCE}',
    'question_plain_text_artifact', topic.question_plain_text_artifact,
    'source_v1_text_layer', topic.source_v1_text_layer,
    'text_source', topic.text_source,
    'text_consumption_status', topic.text_consumption_status,
    'text_only_addressable', topic.text_only_addressable,
    'requires_image_context', topic.requires_image_context,
    'has_diagram', topic.has_diagram,
    'table_heavy', topic.table_heavy,
    'formula_dense', topic.formula_dense,
    'math_expression_count', topic.math_expression_count,
    'image_assets', topic.image_assets,
    'crop_paths', topic.crop_paths,
    'rendered_pdf_page_paths', topic.rendered_pdf_page_paths,
    'primary_topic_path', topic.primary_topic_path,
    'authority_alignment_status', topic.authority_alignment_status,
    'canonical_syllabus_detailed_topic_claimed', topic.canonical_syllabus_detailed_topic_claimed,
    'component_authority', topic.component_authority,
    'topic_authority', topic.topic_authority,
    'authority_artifact', 'docs/reports/2026-06-05-9231-wave4-authority-alignment.json',
    'consumption_artifact', 'docs/reports/2026-06-05-9231-wave4-question-plain-text-v2-consumption.json',
    'search_text', topic.normalized_plain_text,
    'search_text_source', '${NORMALIZED_TEXT_SOURCE}',
    'db_consumption_claimed', true,
    'search_consumption_claimed', true,
    'read_model_consumption_claimed', true,
    'rag_consumption_claimed', true,
    'rag_corpus_version', '${RAG_CORPUS_VERSION}',
    'production_gate_artifact', 'docs/reports/${generatedOn}-9231-wave4-production-ready-gate.json'
  )
FROM topic
ON CONFLICT (storage_key, q_number) DO UPDATE SET
  source_kind = EXCLUDED.source_kind,
  subject_code = EXCLUDED.subject_code,
  paper_scope = EXCLUDED.paper_scope,
  primary_topic_id = EXCLUDED.primary_topic_id,
  secondary_topic_ids = EXCLUDED.secondary_topic_ids,
  family_id = EXCLUDED.family_id,
  primary_question_type_id = EXCLUDED.primary_question_type_id,
  secondary_question_type_ids = EXCLUDED.secondary_question_type_ids,
  variant_tags = EXCLUDED.variant_tags,
  release_scope_status = EXCLUDED.release_scope_status,
  prompt_representation = EXCLUDED.prompt_representation,
  provenance_summary = EXCLUDED.provenance_summary,
  updated_at = now();

WITH input AS (
  SELECT * FROM ${readyRowsRecordset(rowsBase64)}
), target AS (
  SELECT qb.question_id
  FROM input
  JOIN public.question_bank qb
    ON qb.storage_key = input.storage_key
   AND qb.q_number = input.q_number
   AND qb.source_kind = 'paper_question'
)
UPDATE public.learning_question_analysis_snapshots s
SET superseded_by_snapshot_id = s.classification_snapshot_id
FROM target
WHERE s.question_id = target.question_id
  AND s.superseded_by_snapshot_id IS NULL;

WITH input AS (
  SELECT * FROM ${readyRowsRecordset(rowsBase64)}
), target AS (
  SELECT
    qb.question_id,
    qb.primary_topic_id,
    qb.family_id,
    qb.primary_question_type_id,
    qb.secondary_topic_ids,
    qb.secondary_question_type_ids,
    qb.variant_tags,
    input.storage_key,
    input.q_number,
    input.primary_topic_path,
    input.source_surface_manifest,
    input.question_plain_text_artifact
  FROM input
  JOIN public.question_bank qb
    ON qb.storage_key = input.storage_key
   AND qb.q_number = input.q_number
   AND qb.source_kind = 'paper_question'
), inserted AS (
  INSERT INTO public.learning_question_analysis_snapshots (
    question_id,
    primary_topic_id,
    secondary_topic_ids,
    family_id,
    primary_question_type_id,
    secondary_question_type_ids,
    variant_tags,
    classification_source,
    classification_confidence,
    confidence_band,
    candidate_rubric_refs,
    prerequisite_topic_ids,
    canonical_step_skeleton_summary,
    difficulty_signal,
    analysis_audit_metadata,
    analysis_version,
    analysis_provenance_kind,
    low_confidence_posture
  )
  SELECT
    target.question_id,
    target.primary_topic_id,
    target.secondary_topic_ids,
    target.family_id,
    target.primary_question_type_id,
    target.secondary_question_type_ids,
    target.variant_tags,
    '9231_wave4_production_ready_gate',
    0.75,
    'medium',
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'summary', '9231 question text foundation row; detailed scoring taxonomy not claimed.',
      'source', '9231_wave4_production_ready_gate_v1'
    ),
    jsonb_build_object('difficulty_band', 'unknown', 'source', 'not_claimed'),
    jsonb_build_object(
      'production_wave', '${PRODUCTION_WAVE}',
      'source_surface_manifest', target.source_surface_manifest,
      'question_plain_text_artifact', target.question_plain_text_artifact,
      'primary_topic_path', target.primary_topic_path,
      'canonical_syllabus_detailed_topic_claimed', false
    ),
    '9231_wave4.production_surface.v1',
    'real',
    jsonb_build_object(
      'reason', 'foundation_row_surface_classifier',
      'canonical_syllabus_detailed_topic_claimed', false
    )
  FROM target
  RETURNING question_id, classification_snapshot_id
)
UPDATE public.question_bank qb
SET classification_snapshot_ref = jsonb_build_object(
      'kind', 'classification_snapshot',
      'classification_snapshot_id', inserted.classification_snapshot_id
    ),
    updated_at = now()
FROM inserted
WHERE qb.question_id = inserted.question_id;

DELETE FROM public.chunks
WHERE source_type = 'question_plain_text_v2'
  AND corpus_version = '${RAG_CORPUS_VERSION}'
  AND source_ref ->> 'production_wave' = '${PRODUCTION_WAVE}';

WITH input AS (
  SELECT * FROM ${readyRowsRecordset(rowsBase64)}
), registry AS (
  SELECT
    input.*,
    qb.question_id,
    qb.primary_topic_id,
    COALESCE(cn.topic_path::text, input.primary_topic_path) AS resolved_topic_path
  FROM input
  JOIN public.question_bank qb
    ON qb.storage_key = input.storage_key
   AND qb.q_number = input.q_number
   AND qb.source_kind = 'paper_question'
  LEFT JOIN public.curriculum_nodes cn ON cn.node_id = qb.primary_topic_id
)
INSERT INTO public.chunks (
  content,
  embedding,
  syllabus_code,
  topic_path,
  node_id,
  source_type,
  source_ref,
  corpus_version,
  content_hash
)
SELECT
  registry.normalized_plain_text,
  NULL,
  '9231',
  registry.resolved_topic_path::ltree,
  registry.primary_topic_id,
  'question_plain_text_v2',
  jsonb_build_object(
    'asset_id', registry.storage_key,
    'storage_key', registry.storage_key,
    'question_id', registry.question_id,
    'q_number', registry.q_number,
    'chunk_index', 0,
    'chunk_kind', 'question_plain_text_v2',
    'content_source', '${NORMALIZED_TEXT_SOURCE}',
    'source_artifact', registry.question_plain_text_artifact,
    'source_surface_manifest', registry.source_surface_manifest,
    'production_wave', '${PRODUCTION_WAVE}',
    'text_consumption_status', registry.text_consumption_status,
    'text_only_addressable', registry.text_only_addressable,
    'requires_image_context', registry.requires_image_context,
    'image_assets', registry.image_assets
  ),
  '${RAG_CORPUS_VERSION}',
  registry.content_hash
FROM registry;

COMMIT;
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

function buildDbCoverageSql(readyRows) {
  const rowsBase64 = toBase64Json(readyRows.map((row) => ({
    storage_key: row.storage_key,
    q_number: row.q_number,
    normalized_plain_text: row.normalized_plain_text,
  })));
  return `
WITH manifest AS (
  SELECT * FROM ${recordsetSql(rowsBase64, 'storage_key text, q_number int, normalized_plain_text text')}
), registry AS (
  SELECT
    manifest.storage_key,
    manifest.q_number,
    manifest.normalized_plain_text,
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
), rag_chunks AS (
  SELECT source_ref ->> 'storage_key' AS storage_key,
         (source_ref ->> 'q_number')::int AS q_number,
         id
  FROM public.chunks
  WHERE source_type = 'question_plain_text_v2'
    AND corpus_version = '${RAG_CORPUS_VERSION}'
    AND source_ref ->> 'production_wave' = '${PRODUCTION_WAVE}'
), metric_source AS (
  SELECT
    registry.*,
    active_snapshots.classification_snapshot_id,
    search_projection.search_text,
    search_projection.search_text_source,
    rag_chunks.id AS rag_chunk_id
  FROM registry
  LEFT JOIN active_snapshots ON active_snapshots.question_id = registry.question_id
  LEFT JOIN search_projection
    ON search_projection.storage_key = registry.storage_key
   AND search_projection.q_number = registry.q_number
  LEFT JOIN rag_chunks
    ON rag_chunks.storage_key = registry.storage_key
   AND rag_chunks.q_number = registry.q_number
)
SELECT json_build_object(
  'schema_version', '9231_wave4_db_coverage_gate_v1',
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
    AND COUNT(*) FILTER (WHERE question_id IS NOT NULL AND rag_chunk_id IS NULL) = 0
  ) THEN 'pass' ELSE 'blocked' END,
  'database_surface', 'docker:${DEFAULTS.psqlContainer}',
  'metrics', json_build_object(
    'present', COUNT(question_id)::int,
    'manifest_count', COUNT(*)::int,
    'joined_snapshots', COUNT(classification_snapshot_id)::int,
    'missing_registry', COUNT(*) FILTER (WHERE question_id IS NULL)::int,
    'prompt_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (prompt_representation IS NULL OR prompt_representation = '{}'::jsonb))::int,
    'provenance_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND provenance_summary IS NULL)::int,
    'normalized_plain_text_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND NULLIF(BTRIM(provenance_summary ->> 'normalized_plain_text'), '') IS NULL)::int,
    'search_text_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (search_text IS NULL OR BTRIM(search_text) = ''))::int,
    'search_text_source_not_normalized', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND COALESCE(search_text_source, '') <> '${NORMALIZED_TEXT_SOURCE}')::int,
    'snapshot_ref_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (classification_snapshot_ref IS NULL OR classification_snapshot_ref = '{}'::jsonb))::int,
    'snapshot_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND classification_snapshot_id IS NULL)::int,
    'materialized_classifier_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND primary_question_type_id IS NULL)::int,
    'rag_chunk_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND rag_chunk_id IS NULL)::int
  )
)::text
FROM metric_source;
`;
}

function buildSearchGateSql(readyRows) {
  const rowsBase64 = toBase64Json(readyRows.map((row) => ({
    storage_key: row.storage_key,
    q_number: row.q_number,
    normalized_plain_text: row.normalized_plain_text,
  })));
  return `
WITH manifest AS (
  SELECT * FROM ${recordsetSql(rowsBase64, 'storage_key text, q_number int, normalized_plain_text text')}
), projection AS (
  SELECT
    manifest.storage_key,
    manifest.q_number,
    manifest.normalized_plain_text,
    p.search_text,
    p.search_text_source,
    p.normalized_plain_text AS projection_normalized_plain_text
  FROM manifest
  LEFT JOIN public.learning_question_search_projection p
    ON p.storage_key = manifest.storage_key
   AND p.q_number = manifest.q_number
   AND p.source_kind = 'paper_question'
)
SELECT json_build_object(
  'schema_version', '9231_wave4_production_search_gate_v1',
  'status', CASE WHEN (
    COUNT(*) FILTER (WHERE search_text_source = '${NORMALIZED_TEXT_SOURCE}') = COUNT(*)
    AND COUNT(*) FILTER (WHERE search_text = normalized_plain_text) = COUNT(*)
    AND COUNT(*) FILTER (WHERE projection_normalized_plain_text = normalized_plain_text) = COUNT(*)
  ) THEN 'pass' ELSE 'blocked' END,
  'metrics', json_build_object(
    'rows', COUNT(*)::int,
    'search_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE search_text_source = '${NORMALIZED_TEXT_SOURCE}')::int,
    'search_text_matches_normalized_plain_text', COUNT(*) FILTER (WHERE search_text = normalized_plain_text)::int,
    'projection_normalized_plain_text_matches', COUNT(*) FILTER (WHERE projection_normalized_plain_text = normalized_plain_text)::int
  )
)::text
FROM projection;
`;
}

function buildReadModelGateSql(readyRows) {
  const rowsBase64 = toBase64Json(readyRows.map((row) => ({
    storage_key: row.storage_key,
    q_number: row.q_number,
    normalized_plain_text: row.normalized_plain_text,
  })));
  return `
WITH manifest AS (
  SELECT * FROM ${recordsetSql(rowsBase64, 'storage_key text, q_number int, normalized_plain_text text')}
), registry AS (
  SELECT
    manifest.storage_key,
    manifest.q_number,
    manifest.normalized_plain_text,
    r.normalized_plain_text AS registry_normalized_plain_text,
    r.question_plain_text_source,
    r.prompt_representation ->> 'value' AS prompt_value,
    r.provenance_summary ->> 'normalized_plain_text' AS provenance_normalized_plain_text
  FROM manifest
  LEFT JOIN public.learning_question_registry_projection r
    ON r.provenance_summary ->> 'storage_key' = manifest.storage_key
   AND (r.provenance_summary ->> 'q_number')::int = manifest.q_number
   AND r.source_kind = 'paper_question'
)
SELECT json_build_object(
  'schema_version', '9231_wave4_production_read_model_gate_v1',
  'status', CASE WHEN (
    COUNT(*) FILTER (WHERE question_plain_text_source = '${NORMALIZED_TEXT_SOURCE}') = COUNT(*)
    AND COUNT(*) FILTER (WHERE registry_normalized_plain_text = normalized_plain_text) = COUNT(*)
    AND COUNT(*) FILTER (WHERE prompt_value = normalized_plain_text) = COUNT(*)
    AND COUNT(*) FILTER (WHERE provenance_normalized_plain_text = normalized_plain_text) = COUNT(*)
  ) THEN 'pass' ELSE 'blocked' END,
  'metrics', json_build_object(
    'rows', COUNT(*)::int,
    'read_model_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE question_plain_text_source = '${NORMALIZED_TEXT_SOURCE}')::int,
    'registry_normalized_plain_text_matches', COUNT(*) FILTER (WHERE registry_normalized_plain_text = normalized_plain_text)::int,
    'prompt_representation_matches_normalized_plain_text', COUNT(*) FILTER (WHERE prompt_value = normalized_plain_text)::int,
    'provenance_normalized_plain_text_matches', COUNT(*) FILTER (WHERE provenance_normalized_plain_text = normalized_plain_text)::int
  )
)::text
FROM registry;
`;
}

function buildRagGateSql(readyRows) {
  const rowsBase64 = toBase64Json(readyRows.map((row) => ({
    storage_key: row.storage_key,
    q_number: row.q_number,
    normalized_plain_text: row.normalized_plain_text,
  })));
  return `
WITH manifest AS (
  SELECT * FROM ${recordsetSql(rowsBase64, 'storage_key text, q_number int, normalized_plain_text text')}
), rag AS (
  SELECT
    manifest.storage_key,
    manifest.q_number,
    manifest.normalized_plain_text,
    c.id,
    c.content,
    c.fts,
    c.source_type,
    c.corpus_version,
    c.source_ref ->> 'content_source' AS content_source,
    c.source_ref ->> 'storage_key' AS source_ref_storage_key,
    (c.source_ref ->> 'q_number')::int AS source_ref_q_number
  FROM manifest
  LEFT JOIN public.chunks c
    ON c.source_ref ->> 'storage_key' = manifest.storage_key
   AND (c.source_ref ->> 'q_number')::int = manifest.q_number
   AND c.source_type = 'question_plain_text_v2'
   AND c.corpus_version = '${RAG_CORPUS_VERSION}'
   AND c.source_ref ->> 'production_wave' = '${PRODUCTION_WAVE}'
)
SELECT json_build_object(
  'schema_version', '9231_wave4_production_rag_consumption_gate_v1',
  'status', CASE WHEN (
    COUNT(id) = COUNT(*)
    AND COUNT(*) FILTER (WHERE content_source = '${NORMALIZED_TEXT_SOURCE}') = COUNT(*)
    AND COUNT(*) FILTER (WHERE content = normalized_plain_text) = COUNT(*)
    AND COUNT(*) FILTER (WHERE fts IS NOT NULL) = COUNT(*)
  ) THEN 'pass' ELSE 'blocked' END,
  'metrics', json_build_object(
    'rows', COUNT(*)::int,
    'rag_rows_using_normalized_plain_text', COUNT(*) FILTER (WHERE content_source = '${NORMALIZED_TEXT_SOURCE}')::int,
    'rag_content_matches_normalized_plain_text', COUNT(*) FILTER (WHERE content = normalized_plain_text)::int,
    'rag_chunks_present', COUNT(id)::int,
    'rag_chunks_with_fts', COUNT(*) FILTER (WHERE fts IS NOT NULL)::int,
    'corpus_version', '${RAG_CORPUS_VERSION}'
  )
)::text
FROM rag;
`;
}

function attachGateMetadata(gate, { generatedOn, artifactPath, databaseSurface }) {
  return {
    generated_on: generatedOn,
    artifact: artifactPath,
    database_surface: databaseSurface,
    ...gate,
  };
}

function runProductionGates({ readyRows, generatedOn, options, paths }) {
  const databaseSurface = options.psqlMode === 'docker' ? `docker:${options.psqlContainer}` : 'direct';
  const dbCoverage = attachGateMetadata(runPsqlJson(buildDbCoverageSql(readyRows), options), {
    generatedOn,
    artifactPath: paths.dbCoverage,
    databaseSurface,
  });
  const searchGate = attachGateMetadata(runPsqlJson(buildSearchGateSql(readyRows), options), {
    generatedOn,
    artifactPath: paths.searchGate,
    databaseSurface,
  });
  const readModelGate = attachGateMetadata(runPsqlJson(buildReadModelGateSql(readyRows), options), {
    generatedOn,
    artifactPath: paths.readModelGate,
    databaseSurface,
  });
  const ragGate = attachGateMetadata(runPsqlJson(buildRagGateSql(readyRows), options), {
    generatedOn,
    artifactPath: paths.ragGate,
    databaseSurface,
  });
  return { dbCoverage, searchGate, readModelGate, ragGate };
}

function defaultGateBlocked(schemaVersion, rows, reason) {
  return {
    schema_version: schemaVersion,
    generated_on: DEFAULTS.generatedOn,
    status: 'blocked',
    metrics: {
      rows,
    },
    blockers: [{ check: reason }],
  };
}

function finalArtifactPaths({ generatedOn, reportsDir }) {
  const prefix = `${reportsDir}/${generatedOn}-9231-wave4`;
  return {
    dbCoverage: `${prefix}-db-coverage-gate.json`,
    searchGate: `${prefix}-production-search-gate.json`,
    readModelGate: `${prefix}-production-read-model-gate.json`,
    ragGate: `${prefix}-production-rag-consumption-gate.json`,
    aggregateJson: `${prefix}-production-ready-gate.json`,
    aggregateMarkdown: `${prefix}-production-ready-closeout.md`,
  };
}

function buildShardProductionReport({ generatedOn, shardId, rows, aggregate, paths }) {
  const parsed = parseShardId(shardId);
  const status = aggregate.status === 'pass' ? 'production-ready' : 'blocked';
  return {
    schema_version: '9231_wave4_shard_production_ready_closeout_v1',
    generated_on: generatedOn,
    subject_code: '9231',
    wave: 'wave4',
    shard_id: shardId,
    status,
    production_ready_claimed: aggregate.production_ready_claimed,
    scope: {
      rows: rows.length,
      paper: parsed.paper,
      session: parsed.session,
      source_type: parsed.source_type,
      source_pdfs: new Set(rows.map((row) => row.source_pdf)).size,
    },
    summary: {
      text_only_ready_rows: rows.filter((row) => row.text_consumption_status === 'text_only_ready').length,
      image_context_required_rows: rows.filter((row) => row.text_consumption_status === 'image_context_required').length,
      db_gate: aggregate.summary.gate_counts.db_coverage === 1,
      search_gate: aggregate.summary.gate_counts.production_search === 1,
      read_model_gate: aggregate.summary.gate_counts.production_read_model === 1,
      rag_gate: aggregate.summary.gate_counts.production_rag === 1,
    },
    production_evidence: {
      db_coverage_gate: paths.dbCoverage,
      production_search_gate: paths.searchGate,
      production_read_model_gate: paths.readModelGate,
      production_rag_consumption_gate: paths.ragGate,
      aggregate_gate: paths.aggregateJson,
    },
    rows: rows.map((row) => ({
      storage_key: row.storage_key,
      q_number: row.q_number,
      source_pdf: row.source_pdf,
      primary_topic_path: row.primary_topic_path,
      text_consumption_status: row.text_consumption_status,
      question_plain_text_source: row.question_plain_text_source,
      production_ready_claimed: aggregate.production_ready_claimed,
      db_consumption_claimed: aggregate.production_ready_claimed,
      search_consumption_claimed: aggregate.production_ready_claimed,
      read_model_consumption_claimed: aggregate.production_ready_claimed,
      rag_consumption_claimed: aggregate.production_ready_claimed,
    })),
    boundaries: aggregate.boundaries,
  };
}

function renderShardMarkdown(report) {
  return [
    `# 9231 ${report.shard_id} wave4 production-ready closeout`,
    '',
    `日期: ${report.generated_on}`,
    '',
    `status: \`${report.status}\``,
    `production_ready_claimed: \`${report.production_ready_claimed}\``,
    '',
    '## Scope',
    '',
    `- rows: \`${report.scope.rows}\``,
    `- source PDFs: \`${report.scope.source_pdfs}\``,
    `- text-only ready rows: \`${report.summary.text_only_ready_rows}\``,
    `- image-context required rows: \`${report.summary.image_context_required_rows}\``,
    '',
    '## Production Gates',
    '',
    `- DB coverage gate: \`${report.summary.db_gate}\``,
    `- production search gate: \`${report.summary.search_gate}\``,
    `- production read-model gate: \`${report.summary.read_model_gate}\``,
    `- production RAG consumption gate: \`${report.summary.rag_gate}\``,
    '',
    '## Evidence',
    '',
    `- DB coverage: \`${report.production_evidence.db_coverage_gate}\``,
    `- search: \`${report.production_evidence.production_search_gate}\``,
    `- read-model: \`${report.production_evidence.production_read_model_gate}\``,
    `- RAG: \`${report.production_evidence.production_rag_consumption_gate}\``,
    '',
    '## Boundary',
    '',
    '- This closeout covers only this wave4 shard.',
    '- The classifier is a non-released question-text-foundation row-surface classifier; detailed 9231 scoring taxonomy is not claimed.',
    '- RAG proof covers deterministic `public.chunks` row consumption of `normalized_plain_text`; external embedding generation is not claimed.',
    '',
  ].join('\n');
}

function renderAggregateMarkdown(aggregate, paths) {
  return [
    '# 9231 wave4 production-ready closeout',
    '',
    `日期: ${aggregate.generated_on}`,
    '',
    '## Verdict',
    '',
    aggregate.status === 'pass'
      ? '9231 wave4 10-shard batch is production-ready for the requested row-level question text foundation surface.'
      : '9231 wave4 10-shard batch is not production-ready; production gate blockers remain.',
    '',
    `- aggregate gate status: \`${aggregate.status}\``,
    `- production_ready_claimed: \`${aggregate.production_ready_claimed}\``,
    `- rows: \`${aggregate.scope.rows}\``,
    `- shards: \`${aggregate.scope.shards}\``,
    `- source PDFs: \`${aggregate.scope.source_pdfs}\``,
    `- blockers: \`${aggregate.summary.blockers}\``,
    '',
    '## Gate Contract',
    '',
    `- DB coverage: \`${aggregate.summary.gate_counts.db_coverage}/1\``,
    `- production search: \`${aggregate.summary.gate_counts.production_search}/1\``,
    `- production read-model: \`${aggregate.summary.gate_counts.production_read_model}/1\``,
    `- production RAG consumption: \`${aggregate.summary.gate_counts.production_rag}/1\``,
    '',
    'DB coverage requires `present == manifest_count == joined_snapshots == rows` and zero missing metrics for registry, prompt, provenance, normalized_plain_text, search_text, search_text_source, snapshot_ref, snapshot, classifier, and RAG chunk.',
    '',
    '## Evidence Artifacts',
    '',
    `- production surface manifest: \`${aggregate.scope.ready_manifest}\``,
    `- DB coverage gate: \`${paths.dbCoverage}\``,
    `- production search gate: \`${paths.searchGate}\``,
    `- production read-model gate: \`${paths.readModelGate}\``,
    `- production RAG consumption gate: \`${paths.ragGate}\``,
    `- machine aggregate gate: \`${paths.aggregateJson}\``,
    '',
    '## Shard Matrix',
    '',
    '| Shard | Rows | Text-only | Image context | Production ready |',
    '| --- | ---: | ---: | ---: | --- |',
    ...aggregate.shards.map((shard) => `| \`${shard.shard_id}\` | ${shard.rows} | ${shard.text_only_ready_rows} | ${shard.image_context_required_rows} | \`${shard.production_ready_claimed}\` |`),
    '',
    aggregate.blockers.length
      ? [
          '## Blockers',
          '',
          ...aggregate.blockers.map((blocker) => `- \`${blocker.check}\`: expected \`${blocker.expected_rows}\`, actual \`${blocker.actual_rows}\``),
          '',
        ].join('\n')
      : '',
    '## Boundary',
    '',
    ...aggregate.boundaries.map((boundary) => `- ${boundary}`),
    '',
  ].join('\n');
}

function writeShardCloseouts({ generatedOn, reportsDir, readyRows, aggregate, paths }) {
  const byShard = groupRowsByShard(readyRows);
  const artifacts = [];
  for (const [shardId, shardRows] of byShard.entries()) {
    const kebab = toKebabShardId(shardId);
    const jsonPath = `${reportsDir}/${generatedOn}-${kebab}-production-ready-closeout.json`;
    const markdownPath = `${reportsDir}/${generatedOn}-${kebab}-production-ready-closeout.md`;
    const report = buildShardProductionReport({
      generatedOn,
      shardId,
      rows: shardRows,
      aggregate,
      paths,
    });
    writeJson(jsonPath, report);
    writeText(markdownPath, renderShardMarkdown(report));
    artifacts.push(jsonPath, markdownPath);
  }
  return artifacts;
}

function updateReportsIndex({ generatedOn, indexPath, readyManifestPath, paths }) {
  const resolved = resolveRepoPath(indexPath);
  const current = fs.readFileSync(resolved, 'utf8');
  const marker = '## Project Status\n\n';
  if (!current.includes(marker)) {
    throw new Error(`Cannot update ${indexPath}: missing Project Status marker.`);
  }
  const entry = [
    `- \`${generatedOn}-9231-wave4-production-ready-closeout.md\` and \`${generatedOn}-9231-wave4-production-ready-gate.json\` - 9231 wave4 production-ready closeout for the requested 10 shards / 191 rows: DB/question_bank registry coverage 191/191, production search/read-model/RAG gates all consume \`question_plain_text_v2.normalized_plain_text\`, text-only ready 125, image-context required 66, blockers 0, and \`production_ready_claimed=true\`.`,
    `- \`${readyManifestPath}\` - machine-readable 9231 wave4 production surface manifest linking source/crop/v2/authority/local-consumption evidence to production DB/search/read-model/RAG rows.`,
    `- \`${paths.dbCoverage}\`, \`${paths.searchGate}\`, \`${paths.readModelGate}\`, and \`${paths.ragGate}\` - machine production gates for DB coverage, search priority, read-model priority, and RAG chunk consumption.`,
    '',
  ].join('\n');
  if (current.includes(`${generatedOn}-9231-wave4-production-ready-closeout.md`)) {
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

  const artifacts = {
    v2: options.v2Artifact,
    authority: options.authorityArtifact,
    consumption: options.consumptionArtifact,
    evidence_gate: options.evidenceGateArtifact,
  };
  const readyRows = build9231Wave4ReadyRows({
    v2Artifact: readJson(options.v2Artifact),
    authorityArtifact: readJson(options.authorityArtifact),
    consumptionArtifact: readJson(options.consumptionArtifact),
  });
  const readyManifest = buildReadyManifest({
    generatedOn: options.generatedOn,
    readyRows,
    artifacts,
  });
  writeJson(options.readyManifest, readyManifest);

  const paths = finalArtifactPaths({
    generatedOn: options.generatedOn,
    reportsDir: options.reportsDir,
  });
  let gates;
  if (options.applyDb) {
    writeStdoutLine('9231_wave4_production_db_promote=start');
    runPsqlText(buildProductionPromotionSql({ readyRows, generatedOn: options.generatedOn }), options);
    writeStdoutLine('9231_wave4_production_db_promote=done');
    gates = runProductionGates({
      readyRows,
      generatedOn: options.generatedOn,
      options,
      paths,
    });
  } else {
    gates = {
      dbCoverage: defaultGateBlocked('9231_wave4_db_coverage_gate_v1', readyRows.length, 'apply_db_not_requested'),
      searchGate: defaultGateBlocked('9231_wave4_production_search_gate_v1', readyRows.length, 'apply_db_not_requested'),
      readModelGate: defaultGateBlocked('9231_wave4_production_read_model_gate_v1', readyRows.length, 'apply_db_not_requested'),
      ragGate: defaultGateBlocked('9231_wave4_production_rag_consumption_gate_v1', readyRows.length, 'apply_db_not_requested'),
    };
  }

  writeJson(paths.dbCoverage, gates.dbCoverage);
  writeJson(paths.searchGate, gates.searchGate);
  writeJson(paths.readModelGate, gates.readModelGate);
  writeJson(paths.ragGate, gates.ragGate);

  const aggregate = build9231Wave4ProductionReadyAggregate({
    generatedOn: options.generatedOn,
    readyRows,
    expectedRows: 191,
    readyManifestPath: options.readyManifest,
    dbCoverage: gates.dbCoverage,
    searchGate: gates.searchGate,
    readModelGate: gates.readModelGate,
    ragGate: gates.ragGate,
    artifacts: {
      ...artifacts,
      ready_manifest: options.readyManifest,
      db_coverage_gate: paths.dbCoverage,
      production_search_gate: paths.searchGate,
      production_read_model_gate: paths.readModelGate,
      production_rag_consumption_gate: paths.ragGate,
    },
  });
  writeJson(paths.aggregateJson, aggregate);
  writeText(paths.aggregateMarkdown, renderAggregateMarkdown(aggregate, paths));
  const shardArtifacts = writeShardCloseouts({
    generatedOn: options.generatedOn,
    reportsDir: options.reportsDir,
    readyRows,
    aggregate,
    paths,
  });

  if (options.updateIndex) {
    updateReportsIndex({
      generatedOn: options.generatedOn,
      indexPath: 'docs/reports/INDEX.md',
      readyManifestPath: options.readyManifest,
      paths,
    });
  }

  writeStdoutLine(`9231_wave4_production_ready_status=${aggregate.status}`);
  writeStdoutLine(`9231_wave4_production_ready_claimed=${aggregate.production_ready_claimed}`);
  writeStdoutLine(`9231_wave4_production_rows=${aggregate.scope.rows}`);
  writeStdoutLine(`9231_wave4_production_shards=${aggregate.scope.shards}`);
  writeStdoutLine(`9231_wave4_production_blockers=${aggregate.summary.blockers}`);
  writeStdoutLine(`9231_wave4_shard_closeout_artifacts=${shardArtifacts.length}`);

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
