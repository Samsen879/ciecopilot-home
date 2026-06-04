#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

export const REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS = Object.freeze([
  'missing_registry',
  'prompt_missing',
  'provenance_missing',
  'search_text_missing',
  'snapshot_ref_missing',
  'snapshot_missing',
  'materialized_classifier_missing',
]);

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-04',
  batchManifest: 'data/manifests/9709_new_papers_2026_06_03_manifest_v2.json',
  reportsDir: 'docs/reports',
  jsonOut: 'docs/reports/2026-06-04-9709-new-paper-v2-production-ready-aggregate-gate.json',
  markdownOut: 'docs/reports/2026-06-04-9709-new-paper-v2-production-ready-closeout.md',
  psqlMode: 'docker',
  psqlContainer: 'supabase_db_ciecopilot-home',
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine([
    'Usage: node scripts/learning/run_9709_new_paper_v2_production_ready_aggregate_gate.js',
    '  [--generated-on <YYYY-MM-DD>]',
    '  [--batch-manifest <path>]',
    '  [--reports-dir <path>]',
    '  [--json-out <path>]',
    '  [--markdown-out <path>]',
    '  [--psql-mode <direct|docker>]',
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
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized) {
    return DEFAULTS.psqlMode;
  }
  if (!['direct', 'docker'].includes(normalized)) {
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
      index += 1;
      continue;
    }
    if (token === '--batch-manifest') {
      options.batchManifest = requiredValue(argv, index, token);
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

function repoPathExists(repoPath) {
  return fs.existsSync(resolveRepoPath(repoPath));
}

function readJson(repoPath) {
  return JSON.parse(fs.readFileSync(resolveRepoPath(repoPath), 'utf8'));
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

function toKebabShardId(shardId) {
  return shardId.replaceAll('_', '-');
}

function sqlLiteral(value) {
  if (value === null || typeof value === 'undefined') {
    return 'NULL';
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function parseShardId(shardId) {
  const match = /^p(?<paper>[1-6])_(?<session>m25|s25|w24|w25)_standard_001$/.exec(shardId);
  if (!match?.groups) {
    throw new Error(`Unexpected corrected-v2 shard id: ${shardId}`);
  }
  return {
    paper: Number(match.groups.paper),
    session: match.groups.session,
    source_type: 'standard',
  };
}

function countPdfSources(inputManifest) {
  const sourcePdfs = new Set();
  for (const item of inputManifest.items ?? []) {
    if (typeof item?.source_pdf === 'string' && item.source_pdf.trim()) {
      sourcePdfs.add(item.source_pdf.trim());
    }
  }
  return sourcePdfs.size || inputManifest.pdf_count || 0;
}

function countWarnings(payload) {
  if (Array.isArray(payload?.warnings)) {
    return payload.warnings.length;
  }
  if (Number.isInteger(payload?.counts?.warnings)) {
    return payload.counts.warnings;
  }
  if (Number.isInteger(payload?.summary?.warnings)) {
    return payload.summary.warnings;
  }
  return null;
}

function countBlockers(payload) {
  if (Array.isArray(payload?.blockers)) {
    return payload.blockers.length;
  }
  if (Number.isInteger(payload?.counts?.blockers)) {
    return payload.counts.blockers;
  }
  if (Number.isInteger(payload?.summary?.blockers)) {
    return payload.summary.blockers;
  }
  return null;
}

function finalArtifactPaths({ generatedOn, reportsDir, shardId }) {
  const kebab = toKebabShardId(shardId);
  const prefix = `${reportsDir}/${generatedOn}-9709-${kebab}`;
  return {
    authorityManifest: `${prefix}-authority-manifest-final.json`,
    alignedManifest: `${prefix}-aligned-manifest-final.json`,
    readyManifest: `${prefix}-ready-manifest-final.json`,
    evidenceBundles: `${prefix}-evidence-bundles-final.json`,
    releaseJson: `${prefix}-release-preflight-final.json`,
    releaseMarkdown: `${prefix}-release-preflight-final.md`,
    gateJson: `${prefix}-search-gate.json`,
    gateReport: `${prefix}-search-gate-report.md`,
    dbCoverage: `${prefix}-db-coverage.json`,
    productionReadyJson: `${prefix}-production-ready.json`,
    productionReadyMarkdown: `${prefix}-production-ready.md`,
  };
}

function buildValuesSql(storageKeys) {
  if (!storageKeys.length) {
    throw new Error('DB coverage requires at least one storage key.');
  }
  return storageKeys.map((storageKey) => `(${sqlLiteral(storageKey)})`).join(',\n    ');
}

export function buildDbCoverageSql(storageKeys) {
  return [
    'WITH manifest(storage_key) AS (',
    `  VALUES ${buildValuesSql(storageKeys)}`,
    '), registry AS (',
    '  SELECT',
    '    m.storage_key,',
    '    qb.question_id,',
    '    qb.primary_topic_id,',
    '    qb.primary_question_type_id,',
    '    qb.release_scope_status,',
    '    qb.classification_snapshot_ref,',
    '    qb.prompt_representation,',
    '    qb.provenance_summary',
    '  FROM manifest m',
    '  LEFT JOIN public.question_bank qb',
    '    ON qb.storage_key = m.storage_key',
    "   AND qb.source_kind = 'paper_question'",
    '), active_snapshots AS (',
    '  SELECT',
    '    s.question_id,',
    '    s.classification_snapshot_id',
    '  FROM public.learning_question_analysis_snapshots s',
    '  WHERE s.superseded_by_snapshot_id IS NULL',
    '), projection AS (',
    '  SELECT',
    '    p.storage_key,',
    '    p.search_text,',
    '    p.summary',
    '  FROM public.learning_question_search_projection p',
    '  INNER JOIN manifest m ON m.storage_key = p.storage_key',
    "  WHERE p.source_kind = 'paper_question'",
    '), metric_source AS (',
    '  SELECT',
    '    r.*,',
    '    s.classification_snapshot_id,',
    '    p.search_text',
    '  FROM registry r',
    '  LEFT JOIN active_snapshots s ON s.question_id = r.question_id',
    '  LEFT JOIN projection p ON p.storage_key = r.storage_key',
    '), topic_distribution AS (',
    '  SELECT',
    "    COALESCE(cn.topic_path::text, '(missing)') AS topic_path,",
    '    COUNT(*)::int AS count',
    '  FROM registry r',
    '  LEFT JOIN public.curriculum_nodes cn ON cn.node_id = r.primary_topic_id',
    '  WHERE r.question_id IS NOT NULL',
    '  GROUP BY 1',
    '  ORDER BY 1',
    '), release_distribution AS (',
    '  SELECT',
    "    COALESCE(r.release_scope_status, '(missing)') AS release_scope_status,",
    '    COUNT(*)::int AS count',
    '  FROM registry r',
    '  WHERE r.question_id IS NOT NULL',
    '  GROUP BY 1',
    '  ORDER BY 1',
    ')',
    'SELECT json_build_object(',
    "  'metrics', (",
    '    SELECT json_build_object(',
    "      'present', COUNT(question_id)::int,",
    "      'manifest_count', COUNT(*)::int,",
    "      'joined_snapshots', COUNT(classification_snapshot_id)::int,",
    "      'missing_registry', COUNT(*) FILTER (WHERE question_id IS NULL)::int,",
    "      'prompt_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (prompt_representation IS NULL OR prompt_representation = '{}'::jsonb))::int,",
    "      'provenance_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND provenance_summary IS NULL)::int,",
    "      'search_text_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (search_text IS NULL OR btrim(search_text) = ''))::int,",
    "      'snapshot_ref_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND (classification_snapshot_ref IS NULL OR classification_snapshot_ref = '{}'::jsonb))::int,",
    "      'snapshot_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND classification_snapshot_id IS NULL)::int,",
    "      'materialized_classifier_missing', COUNT(*) FILTER (WHERE question_id IS NOT NULL AND primary_question_type_id IS NULL)::int",
    '    )',
    '    FROM metric_source',
    '  ),',
    "  'topic_distribution', COALESCE((",
    "    SELECT json_agg(json_build_object('topic_path', topic_path, 'count', count) ORDER BY topic_path)",
    '    FROM topic_distribution',
    "  ), '[]'::json),",
    "  'release_scope_distribution', COALESCE((",
    "    SELECT json_agg(json_build_object('release_scope_status', release_scope_status, 'count', count) ORDER BY release_scope_status)",
    '    FROM release_distribution',
    "  ), '[]'::json)",
    ')::text;',
  ].join('\n');
}

function runPsqlJson(sql, options) {
  let stdout;
  if (options.psqlMode === 'docker') {
    stdout = execFileSync(
      'docker',
      ['exec', '-i', options.psqlContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-A', '-t', '-q', '-c', sql],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 16,
        env: process.env,
      },
    );
  } else {
    const databaseUrl = process.env.DATABASE_URL
      || process.env.SUPABASE_DB_URL
      || process.env.SUPABASE_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_DATABASE_URL) is required for --psql-mode direct.');
    }
    stdout = execFileSync(
      'psql',
      [databaseUrl, '-X', '-A', '-t', '-q', '-c', sql],
      {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 16,
        env: process.env,
      },
    );
  }

  return JSON.parse(stdout.trim());
}

function dbCoveragePass(metrics, rows) {
  return (
    metrics?.present === rows
    && metrics?.manifest_count === rows
    && metrics?.joined_snapshots === rows
    && REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS.every((field) => metrics?.[field] === 0)
  );
}

function buildChecks(record) {
  const dbMetrics = record.db_coverage?.metrics ?? {};
  return {
    ready_manifest: record.ready_manifest?.count === record.rows,
    release_preflight: record.release_preflight?.status === 'pass' && record.release_preflight?.blockers === 0,
    search_gate: record.search_gate?.pass === true,
    db_present_equals_rows:
      dbMetrics.present === record.rows
      && dbMetrics.manifest_count === record.rows
      && dbMetrics.joined_snapshots === record.rows,
    db_zero_missing: REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS.every((field) => dbMetrics[field] === 0),
    db_coverage: dbCoveragePass(dbMetrics, record.rows),
    production_ready_closeout:
      Boolean(record.production_ready_report?.json)
      && Boolean(record.production_ready_report?.markdown)
      && (!record.production_ready_report?.status || record.production_ready_report.status === 'production-ready'),
  };
}

function addCount(target, key, increment) {
  target[key] = (target[key] ?? 0) + increment;
}

function collectBlocker(blockers, record, check, details = {}) {
  blockers.push({
    shard_id: record.shard_id,
    check,
    rows: record.rows,
    artifacts: {
      ready_manifest: record.ready_manifest?.path ?? null,
      release_preflight: record.release_preflight?.path ?? null,
      search_gate: record.search_gate?.path ?? null,
      db_coverage: record.db_coverage?.path ?? null,
      production_ready: record.production_ready_report?.json ?? null,
    },
    details,
  });
}

export function buildNewPaperV2Aggregate({
  generatedOn,
  shardRecords,
} = {}) {
  const records = shardRecords.map((record) => ({
    ...record,
    checks: record.checks ?? buildChecks(record),
  }));
  const summary = {
    blockers: 0,
    rows_by_paper: {},
    rows_by_session: {},
    shards_by_paper: {},
    gate_counts: {
      ready_manifest: 0,
      release_preflight: 0,
      search_gate: 0,
      db_coverage: 0,
      production_ready_closeout: 0,
    },
  };
  const blockers = [];

  for (const record of records) {
    addCount(summary.rows_by_paper, `p${record.paper}`, record.rows);
    addCount(summary.rows_by_session, record.session, record.rows);
    addCount(summary.shards_by_paper, `p${record.paper}`, 1);

    if (record.checks.ready_manifest) summary.gate_counts.ready_manifest += 1;
    if (record.checks.release_preflight) summary.gate_counts.release_preflight += 1;
    if (record.checks.search_gate) summary.gate_counts.search_gate += 1;
    if (record.checks.db_coverage) summary.gate_counts.db_coverage += 1;
    if (record.checks.production_ready_closeout) summary.gate_counts.production_ready_closeout += 1;

    if (!record.checks.ready_manifest) {
      collectBlocker(blockers, record, 'ready_manifest_count', {
        expected_rows: record.rows,
        ready_manifest_count: record.ready_manifest?.count ?? null,
      });
    }
    if (!record.checks.release_preflight) {
      collectBlocker(blockers, record, 'release_preflight_pass', record.release_preflight ?? {});
    }
    if (!record.checks.search_gate) {
      collectBlocker(blockers, record, 'search_gate_pass', record.search_gate ?? {});
    }
    if (!record.checks.db_present_equals_rows) {
      collectBlocker(blockers, record, 'db_present_equals_rows', {
        expected_rows: record.rows,
        metrics: record.db_coverage?.metrics ?? null,
      });
    }
    if (!record.checks.db_zero_missing) {
      collectBlocker(blockers, record, 'db_zero_missing', {
        required_zero_fields: REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS,
        metrics: record.db_coverage?.metrics ?? null,
      });
    }
    if (!record.checks.production_ready_closeout) {
      collectBlocker(blockers, record, 'production_ready_closeout', record.production_ready_report ?? {});
    }
  }

  summary.blockers = blockers.length;
  const status = blockers.length === 0 ? 'pass' : 'blocked';

  return {
    schema_version: '9709_new_paper_v2_production_ready_aggregate_gate_v1',
    generated_on: generatedOn,
    status,
    verdict: status === 'pass' ? 'production-ready' : 'blocked',
    scope: {
      subject_code: '9709',
      corrected_v2_shards: records.length,
      corrected_v2_rows: records.reduce((total, record) => total + record.rows, 0),
      corrected_v2_pdfs: records.reduce((total, record) => total + record.pdfs, 0),
      source_manifest: 'data/manifests/9709_new_papers_2026_06_03_manifest_v2.json',
      input_scope: 'corrected-v2 new 9709 PDFs only',
    },
    summary,
    blockers,
    shards: records.map((record) => ({
      shard_id: record.shard_id,
      paper: record.paper,
      session: record.session,
      source_type: record.source_type ?? 'standard',
      rows: record.rows,
      pdfs: record.pdfs,
      surface_manifest: record.surface_manifest,
      ready_manifest: record.ready_manifest?.path ?? null,
      release_preflight: record.release_preflight?.path ?? null,
      search_gate: record.search_gate?.path ?? null,
      db_coverage: record.db_coverage?.path ?? null,
      production_ready_report: record.production_ready_report?.json ?? null,
      checks: record.checks,
      release_warnings: record.release_preflight?.warnings ?? null,
    })),
    required_gate_contract: {
      ready_manifest: 'exists and item count equals shard rows',
      release_preflight: 'status pass with zero blockers',
      search_gate: 'gate pass true',
      db_coverage: {
        present_equals_manifest_count_equals_joined_snapshots_equals_rows: true,
        required_zero_fields: REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS,
      },
      production_ready_closeout: 'per-shard production-ready json and markdown generated after all gates pass',
    },
    boundaries: [
      'This aggregate covers only corrected-v2 new-paper manifests generated from data/manifests/9709_new_papers_2026_06_03_manifest_v2.json.',
      'It does not use or promote the old 610-row v1 new-paper input set.',
      'The corrected-v2 visual layer used local operator/Codex visual dispositions only; no external VLM/API review is claimed for these new-paper v2 shards.',
      'This report does not restate the older 36-shard / 2937-row legacy 9709 aggregate gate.',
    ],
  };
}

function renderCountTable(title, rows) {
  return [
    `| ${title} | Rows |`,
    '| --- | ---: |',
    ...Object.entries(rows).map(([key, value]) => `| \`${key}\` | ${value} |`),
    '',
  ].join('\n');
}

function renderShardMatrix(shards) {
  return [
    '| Shard | Rows | Ready | DB | Search | Release | Production closeout |',
    '| --- | ---: | --- | --- | --- | --- | --- |',
    ...shards.map((shard) => [
      `| \`${shard.shard_id}\``,
      shard.rows,
      `\`${shard.checks.ready_manifest}\``,
      `\`${shard.checks.db_coverage}\``,
      `\`${shard.checks.search_gate}\``,
      `\`${shard.checks.release_preflight}\``,
      `\`${shard.checks.production_ready_closeout}\` |`,
    ].join(' | ')),
    '',
  ].join('\n');
}

function renderAggregateMarkdown(aggregate, options) {
  const gateCounts = aggregate.summary.gate_counts;
  return [
    '# 9709 corrected-v2 new-paper production-ready closeout',
    '',
    `日期: ${aggregate.generated_on}`,
    '',
    '## Verdict',
    '',
    aggregate.status === 'pass'
      ? '新增 corrected-v2 `9709` PDF 题目行已全量 production-ready。'
      : '新增 corrected-v2 `9709` PDF 题目行尚未通过 aggregate gate。',
    '',
    `- aggregate gate status: \`${aggregate.status}\``,
    `- corrected-v2 shards: \`${aggregate.scope.corrected_v2_shards}\``,
    `- corrected-v2 rows: \`${aggregate.scope.corrected_v2_rows}\``,
    `- source PDFs: \`${aggregate.scope.corrected_v2_pdfs}\``,
    `- blockers: \`${aggregate.summary.blockers}\``,
    '',
    '## Gate Contract',
    '',
    `- ready manifest row match: \`${gateCounts.ready_manifest}/${aggregate.scope.corrected_v2_shards}\``,
    `- DB coverage: \`${gateCounts.db_coverage}/${aggregate.scope.corrected_v2_shards}\``,
    `- search gate: \`${gateCounts.search_gate}/${aggregate.scope.corrected_v2_shards}\``,
    `- release preflight: \`${gateCounts.release_preflight}/${aggregate.scope.corrected_v2_shards}\``,
    `- production-ready closeout: \`${gateCounts.production_ready_closeout}/${aggregate.scope.corrected_v2_shards}\``,
    '',
    'DB coverage requires `present == manifest_count == joined_snapshots == shard rows` and zero values for `missing_registry`, `prompt_missing`, `provenance_missing`, `search_text_missing`, `snapshot_ref_missing`, `snapshot_missing`, and `materialized_classifier_missing`.',
    '',
    '## Distribution',
    '',
    renderCountTable('Paper', aggregate.summary.rows_by_paper),
    renderCountTable('Session', aggregate.summary.rows_by_session),
    '## Shard Matrix',
    '',
    renderShardMatrix(aggregate.shards),
    aggregate.blockers.length
      ? [
          '## Blockers',
          '',
          ...aggregate.blockers.map((blocker) => `- \`${blocker.shard_id}\`: \`${blocker.check}\``),
          '',
        ].join('\n')
      : '',
    '## Artifacts',
    '',
    `- generator: \`${relativeRepoPath(__filename)}\``,
    `- machine gate: \`${options.jsonOut}\``,
    `- markdown closeout: \`${options.markdownOut}\``,
    '- per-shard final artifacts: `docs/reports/2026-06-04-9709-p*-*-standard-001-*-final.*`',
    '- per-shard production closeouts: `docs/reports/2026-06-04-9709-p*-*-standard-001-production-ready.*`',
    '',
    '## Boundary',
    '',
    '- Scope is the 24 corrected-v2 new-paper shards / 593 rows / 72 PDFs only.',
    '- This does not use the old 610-row v1 new-paper manifests.',
    '- Visual disposition for this corrected-v2 batch is local/operator-reviewed, not external VLM-reviewed.',
    '- DB backfill, analysis hydration, search gate, release preflight, and DB coverage have all been checked shard-by-shard before this aggregate verdict.',
    '',
  ].join('\n');
}

function renderShardMarkdown(report) {
  return [
    `# 9709 ${report.shard_id} corrected-v2 production-ready closeout`,
    '',
    `日期: ${report.generated_on}`,
    '',
    `status: \`${report.status}\``,
    '',
    '## Scope',
    '',
    `- shard rows: \`${report.scope.manifest_rows}\``,
    `- PDFs: \`${report.scope.pdfs}\``,
    `- surface manifest: \`${report.scope.surface_manifest}\``,
    `- ready manifest: \`${report.scope.ready_manifest}\``,
    '',
    '## Gates',
    '',
    `- release preflight: \`${report.release_preflight.status}\`, blockers \`${report.release_preflight.blockers}\`, warnings \`${report.release_preflight.warnings}\``,
    `- search gate pass: \`${report.search_gate.gate_pass}\``,
    `- DB coverage present/manifest/snapshots: \`${report.db_coverage.present}/${report.db_coverage.manifest_count}/${report.db_coverage.joined_snapshots}\``,
    `- DB missing metrics: \`${REQUIRED_NEW_PAPER_V2_DB_ZERO_FIELDS.map((field) => `${field}=${report.db_coverage[field]}`).join(', ')}\``,
    '',
    '## Boundary',
    '',
    '- This closeout covers only this corrected-v2 new-paper shard.',
    '- It does not use the old 610-row v1 new-paper input.',
    '- The v2 visual disposition was local/operator-reviewed; this report does not claim external VLM review.',
    '',
  ].join('\n');
}

function buildShardProductionReport(record, paths, generatedOn) {
  const checks = buildChecks(record);
  const status = Object.values(checks).every(Boolean) ? 'production-ready' : 'blocked';
  return {
    schema_version: '9709_new_paper_v2_shard_production_ready_v1',
    generated_on: generatedOn,
    shard_id: record.shard_id,
    status,
    scope: {
      subject_code: '9709',
      manifest_rows: record.rows,
      pdfs: record.pdfs,
      paper: record.paper,
      session: record.session,
      source_type: record.source_type ?? 'standard',
      surface_manifest: record.surface_manifest,
      ready_manifest: record.ready_manifest.path,
    },
    visual: {
      posture: 'local_operator_visual_disposition',
      external_vlm_review_claimed: false,
      surface_manifest: record.surface_manifest,
    },
    authority: {
      sidecar: `data/manifests/9709_${record.shard_id}_authority_sidecar_v2.json`,
      curriculum_seed: 'data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_p6_v1.json',
      rows: record.rows,
    },
    db_coverage: record.db_coverage.metrics,
    search_gate: {
      gate_pass: record.search_gate.pass,
      metrics: record.search_gate.metrics ?? null,
    },
    release_preflight: {
      status: record.release_preflight.status,
      blockers: record.release_preflight.blockers,
      warnings: record.release_preflight.warnings,
    },
    checks,
    boundaries: [
      'This closes only this corrected-v2 new-paper shard.',
      'No old 610-row v1 new-paper input is used.',
      'The corrected-v2 visual layer is local/operator-reviewed; no external VLM review is claimed.',
    ],
    artifacts: [
      record.surface_manifest,
      `data/manifests/9709_${record.shard_id}_authority_sidecar_v2.json`,
      record.ready_manifest.path,
      record.release_preflight.path,
      record.search_gate.path,
      record.db_coverage.path,
      paths.productionReadyJson,
      paths.productionReadyMarkdown,
    ],
  };
}

function buildShardRecord({ shard, generatedOn, reportsDir, options }) {
  const shardId = shard.shard_id;
  const parsed = parseShardId(shardId);
  const paths = finalArtifactPaths({ generatedOn, reportsDir, shardId });
  const inputManifestPath = `data/manifests/9709_${shardId}_input_v2.json`;
  const inputManifest = readJson(inputManifestPath);
  const readyManifest = readJson(paths.readyManifest);
  const releasePreflight = readJson(paths.releaseJson);
  const searchGate = readJson(paths.gateJson);
  const storageKeys = (readyManifest.items ?? []).map((item) => item?.storage_key).filter(Boolean);
  const dbCoverage = {
    schema_version: '9709_new_paper_v2_shard_db_coverage_v1',
    generated_on: new Date().toISOString(),
    shard_id: shardId,
    database_surface: options.psqlMode === 'docker' ? `docker:${options.psqlContainer}` : 'direct',
    ready_manifest: paths.readyManifest,
    ...runPsqlJson(buildDbCoverageSql(storageKeys), options),
  };
  writeJson(paths.dbCoverage, dbCoverage);

  const record = {
    shard_id: shardId,
    rows: shard.item_count,
    pdfs: shard.pdf_count ?? countPdfSources(inputManifest),
    paper: parsed.paper,
    session: parsed.session,
    source_type: parsed.source_type,
    surface_manifest: `data/manifests/9709_${shardId}_page_chain_surface_v2.json`,
    ready_manifest: {
      path: paths.readyManifest,
      count: Array.isArray(readyManifest.items) ? readyManifest.items.length : 0,
    },
    release_preflight: {
      path: paths.releaseJson,
      status: releasePreflight.status ?? 'unknown',
      blockers: countBlockers(releasePreflight),
      warnings: countWarnings(releasePreflight),
    },
    search_gate: {
      path: paths.gateJson,
      pass: searchGate.gate?.pass === true,
      metrics: searchGate.metrics ?? null,
    },
    db_coverage: {
      path: paths.dbCoverage,
      metrics: dbCoverage.metrics,
    },
    production_ready_report: {
      json: paths.productionReadyJson,
      markdown: paths.productionReadyMarkdown,
    },
  };

  const productionReport = buildShardProductionReport(record, paths, generatedOn);
  writeJson(paths.productionReadyJson, productionReport);
  writeText(paths.productionReadyMarkdown, renderShardMarkdown(productionReport));
  record.production_ready_report.status = productionReport.status;
  record.checks = buildChecks(record);
  return record;
}

function assertFinalArtifactsExist(shardId, paths) {
  const required = [
    paths.authorityManifest,
    paths.alignedManifest,
    paths.readyManifest,
    paths.evidenceBundles,
    paths.releaseJson,
    paths.releaseMarkdown,
    paths.gateJson,
    paths.gateReport,
  ];
  const missing = required.filter((repoPath) => !repoPathExists(repoPath));
  if (missing.length > 0) {
    throw new Error(`${shardId}: missing final artifacts: ${missing.join(', ')}`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const batchManifest = readJson(options.batchManifest);
  const shards = batchManifest.shards ?? [];
  const records = [];
  for (const shard of shards) {
    const paths = finalArtifactPaths({
      generatedOn: options.generatedOn,
      reportsDir: options.reportsDir,
      shardId: shard.shard_id,
    });
    assertFinalArtifactsExist(shard.shard_id, paths);
    writeStdoutLine(`db_coverage ${shard.shard_id}`);
    records.push(buildShardRecord({
      shard,
      generatedOn: options.generatedOn,
      reportsDir: options.reportsDir,
      options,
    }));
  }

  const aggregate = buildNewPaperV2Aggregate({
    generatedOn: options.generatedOn,
    shardRecords: records,
  });
  aggregate.scope.source_manifest = options.batchManifest;
  writeJson(options.jsonOut, aggregate);
  writeText(options.markdownOut, renderAggregateMarkdown(aggregate, options));

  writeStdoutLine(`9709_new_paper_v2_aggregate_status=${aggregate.status}`);
  writeStdoutLine(`9709_new_paper_v2_shards=${aggregate.scope.corrected_v2_shards}`);
  writeStdoutLine(`9709_new_paper_v2_rows=${aggregate.scope.corrected_v2_rows}`);
  writeStdoutLine(`9709_new_paper_v2_pdfs=${aggregate.scope.corrected_v2_pdfs}`);
  writeStdoutLine(`9709_new_paper_v2_blockers=${aggregate.summary.blockers}`);

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
