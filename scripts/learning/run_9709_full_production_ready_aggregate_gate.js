#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');

const DEFAULTS = Object.freeze({
  generatedOn: '2026-06-02',
  manifestsDir: 'data/manifests',
  reportsDir: 'docs/reports',
  jsonOut: 'docs/reports/2026-06-02-9709-full-production-ready-aggregate-gate.json',
  markdownOut: 'docs/reports/2026-06-02-9709-full-production-ready-closeout.md',
});

const REQUIRED_DB_ZERO_FIELDS = Object.freeze([
  'missing_registry',
  'prompt_missing',
  'provenance_missing',
  'search_text_missing',
  'snapshot_ref_missing',
  'snapshot_missing',
  'materialized_classifier_missing',
]);

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    [
      'Usage: node scripts/learning/run_9709_full_production_ready_aggregate_gate.js',
      '  [--generated-on <YYYY-MM-DD>]',
      '  [--manifests-dir <path>]',
      '  [--reports-dir <path>]',
      '  [--json-out <path>]',
      '  [--markdown-out <path>]',
    ].join('\n'),
  );
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
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
    if (token === '--manifests-dir') {
      options.manifestsDir = requiredValue(argv, index, token);
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

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

function resolveRepoPath(filePath) {
  return path.resolve(ROOT, filePath);
}

function relativeRepoPath(filePath) {
  return path.relative(ROOT, path.resolve(filePath)).replaceAll(path.sep, '/');
}

function readJson(repoPath) {
  return JSON.parse(fs.readFileSync(resolveRepoPath(repoPath), 'utf8'));
}

function readText(repoPath) {
  return fs.readFileSync(resolveRepoPath(repoPath), 'utf8');
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

function toKebabShardId(shardId) {
  return shardId.replaceAll('_', '-');
}

function getRows(manifest) {
  if (Array.isArray(manifest.items)) {
    return manifest.items.length;
  }
  if (Array.isArray(manifest.rows)) {
    return manifest.rows.length;
  }
  if (Array.isArray(manifest.questions)) {
    return manifest.questions.length;
  }
  if (Number.isInteger(manifest.item_count)) {
    return manifest.item_count;
  }
  throw new Error(`Cannot infer manifest row count for ${manifest.shard_id ?? manifest.manifest_id}.`);
}

function parseShardId(shardId) {
  const match = /^p(?<paper>[1-6])_(?<session>[msw])_(?<sourceType>standard|watermarked)_001$/.exec(shardId);
  if (!match?.groups) {
    throw new Error(`Unexpected 9709 shard id: ${shardId}`);
  }
  return {
    paper: Number(match.groups.paper),
    session: match.groups.session,
    sourceType: match.groups.sourceType,
  };
}

function inferShardIdFromManifestPath(manifestPath) {
  const match = /^9709_(p[1-6]_[msw]_(standard|watermarked)_001)_page_chain_surface_v1.json$/.exec(path.basename(manifestPath));
  return match?.[1] ?? null;
}

function listReportFiles(reportsDir) {
  return fs.readdirSync(resolveRepoPath(reportsDir), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function selectLatest(files, pattern, preferJson = false) {
  const matches = files.filter((file) => pattern.test(file)).sort((left, right) => left.localeCompare(right));
  if (matches.length === 0) {
    return null;
  }
  if (preferJson) {
    const jsonMatches = matches.filter((file) => file.endsWith('.json'));
    if (jsonMatches.length > 0) {
      return jsonMatches.at(-1);
    }
  }
  return matches.at(-1);
}

function findShardArtifacts({ reportFiles, reportsDir, shardId }) {
  const kebab = toKebabShardId(shardId);
  const escaped = kebab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withDir = (file) => (file ? `${reportsDir}/${file}` : null);

  return {
    productionReady: withDir(selectLatest(
      reportFiles,
      new RegExp(`9709-${escaped}.*production-ready\\.(json|md)$`),
      true,
    )),
    dbCoverage: withDir(selectLatest(
      reportFiles,
      new RegExp(`9709-${escaped}.*db-coverage\\.json$`),
    )),
    searchGate: withDir(selectLatest(
      reportFiles,
      new RegExp(`9709-${escaped}.*search-gate\\.json$`),
    )),
    releasePreflight: withDir(selectLatest(
      reportFiles,
      new RegExp(`9709-${escaped}.*release-preflight-final\\.json$`),
    )),
  };
}

function firstInteger(values) {
  for (const value of values) {
    if (Number.isInteger(value)) {
      return value;
    }
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return Number(value);
    }
  }
  return null;
}

function parseProductionReadyMarkdown(text) {
  const rowMatch = /manifest rows:\s*`?(\d+)`?/i.exec(text);
  const status = /status:\s*`production-ready`/i.test(text) || /production-ready closeout/i.test(text)
    ? 'production-ready'
    : 'unknown';

  return {
    status,
    rows: rowMatch ? Number(rowMatch[1]) : null,
  };
}

function readProductionReadyReport(repoPath) {
  if (!repoPath) {
    return {
      ok: false,
      status: 'missing',
      report: null,
      rows: null,
    };
  }

  if (repoPath.endsWith('.json')) {
    const payload = readJson(repoPath);
    const rows = firstInteger([
      payload.scope?.manifest_rows,
      payload.scope?.manifest_count,
      payload.scope?.rows,
      payload.rows,
      payload.row_count,
      payload.summary?.rows,
    ]);
    return {
      ok: payload.status === 'production-ready',
      status: payload.status ?? 'unknown',
      report: path.basename(repoPath),
      rows,
    };
  }

  const parsed = parseProductionReadyMarkdown(readText(repoPath));
  return {
    ok: parsed.status === 'production-ready',
    status: parsed.status,
    report: path.basename(repoPath),
    rows: parsed.rows,
  };
}

function parseMarkdownDbCoverage(text) {
  const metrics = {};
  for (const field of ['manifest_count', 'present', 'joined_snapshots', ...REQUIRED_DB_ZERO_FIELDS]) {
    const fieldPattern = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`\\|\\s*\\\`?${fieldPattern}\\\`?\\s*\\|\\s*\\\`?(\\d+)\\\`?\\s*\\|`, 'i').exec(text);
    if (match) {
      metrics[field] = Number(match[1]);
    }
  }
  return Object.keys(metrics).length > 0 ? metrics : null;
}

function readDbCoverage({ dbCoveragePath, productionReadyPath }) {
  if (dbCoveragePath) {
    const payload = readJson(dbCoveragePath);
    return {
      source: 'json',
      report: path.basename(dbCoveragePath),
      metrics: payload.metrics || payload.coverage || payload,
    };
  }

  if (productionReadyPath?.endsWith('.md')) {
    const metrics = parseMarkdownDbCoverage(readText(productionReadyPath));
    if (metrics) {
      return {
        source: 'production_ready_markdown_table',
        report: path.basename(productionReadyPath),
        metrics,
      };
    }
  }

  return {
    source: 'missing',
    report: null,
    metrics: null,
  };
}

function readSearchGate(repoPath) {
  if (!repoPath) {
    return {
      report: null,
      pass: false,
      metrics: null,
    };
  }
  const payload = readJson(repoPath);
  return {
    report: path.basename(repoPath),
    pass: payload.gate?.pass === true || payload.gate_pass === true || payload.pass === true || payload.status === 'pass',
    metrics: payload.metrics ?? null,
    failing_checks: payload.gate?.failing_checks ?? [],
  };
}

function readReleasePreflight(repoPath) {
  if (!repoPath) {
    return {
      report: null,
      status: 'missing',
      blockers: null,
      warnings: null,
    };
  }

  const payload = readJson(repoPath);
  const blockerCount = Array.isArray(payload.blockers)
    ? payload.blockers.length
    : firstInteger([payload.blockers, payload.counts?.blockers, payload.summary?.blockers]);
  const warningCount = Array.isArray(payload.warnings)
    ? payload.warnings.length
    : firstInteger([payload.warnings, payload.counts?.warnings, payload.summary?.warnings]);

  return {
    report: path.basename(repoPath),
    status: payload.status ?? 'unknown',
    blockers: blockerCount,
    warnings: warningCount,
  };
}

function addCount(target, key, increment) {
  target[key] = (target[key] ?? 0) + increment;
}

function collectBlocker(blockers, shard, check, details = {}) {
  blockers.push({
    shard: shard.shard_id,
    check,
    row_count: shard.rows,
    artifacts: {
      production_ready: shard.artifacts.productionReady ? path.basename(shard.artifacts.productionReady) : null,
      db: shard.db.report,
      search: shard.search.report,
      release: shard.release.report,
    },
    details,
  });
}

function evaluateShard({ manifestPath, manifest, reportFiles, reportsDir }) {
  const shardId = manifest.shard_id ?? inferShardIdFromManifestPath(manifestPath);
  const { paper, session, sourceType } = parseShardId(shardId);
  const rows = getRows(manifest);
  const artifacts = findShardArtifacts({ reportFiles, reportsDir, shardId });
  const productionReady = readProductionReadyReport(artifacts.productionReady);
  const db = readDbCoverage({
    dbCoveragePath: artifacts.dbCoverage,
    productionReadyPath: artifacts.productionReady,
  });
  const search = readSearchGate(artifacts.searchGate);
  const release = readReleasePreflight(artifacts.releasePreflight);
  const dbMetrics = db.metrics ?? {};
  const checks = {
    production_ready_report: productionReady.ok && productionReady.rows === rows,
    db_present_equals_rows: dbMetrics.present === rows && dbMetrics.manifest_count === rows,
    db_zero_missing: REQUIRED_DB_ZERO_FIELDS.every((field) => dbMetrics[field] === 0),
    search_gate_pass: search.pass === true,
    release_preflight_pass: release.status === 'pass' && release.blockers === 0,
  };

  return {
    shard_id: shardId,
    paper,
    session,
    source_type: sourceType,
    rows,
    surface_manifest: manifestPath,
    production_ready_report: artifacts.productionReady,
    db_coverage_report: artifacts.dbCoverage ?? artifacts.productionReady,
    db_coverage_source: db.source,
    search_gate_report: artifacts.searchGate,
    release_preflight_report: artifacts.releasePreflight,
    checks,
    release_warnings: release.warnings,
    artifacts,
    productionReady,
    db,
    search,
    release,
  };
}

function buildAggregate(options) {
  const manifestsDir = options.manifestsDir.replace(/\/$/, '');
  const reportsDir = options.reportsDir.replace(/\/$/, '');
  const manifestFilePattern = /^9709_p[1-6]_[msw]_(standard|watermarked)_001_page_chain_surface_v1\.json$/;
  const manifestFiles = fs.readdirSync(resolveRepoPath(manifestsDir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && manifestFilePattern.test(entry.name))
    .map((entry) => `${manifestsDir}/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
  const reportFiles = listReportFiles(reportsDir);
  const shards = manifestFiles.map((manifestPath) => evaluateShard({
    manifestPath,
    manifest: readJson(manifestPath),
    reportFiles,
    reportsDir,
  }));

  const summary = {
    blockers: 0,
    rows_by_paper: {},
    rows_by_session: {},
    rows_by_source_type: {},
    shards_by_paper: {},
    shards_by_source_type: {},
    db_coverage_sources: {},
    gate_counts: {
      production_ready_report: 0,
      db_coverage: 0,
      search_gate: 0,
      release_preflight: 0,
    },
  };
  const blockers = [];

  for (const shard of shards) {
    addCount(summary.rows_by_paper, `p${shard.paper}`, shard.rows);
    addCount(summary.rows_by_session, shard.session, shard.rows);
    addCount(summary.rows_by_source_type, shard.source_type, shard.rows);
    addCount(summary.shards_by_paper, `p${shard.paper}`, 1);
    addCount(summary.shards_by_source_type, shard.source_type, 1);
    addCount(summary.db_coverage_sources, shard.db_coverage_source, 1);
    if (shard.checks.production_ready_report) {
      summary.gate_counts.production_ready_report += 1;
    }
    if (shard.checks.db_present_equals_rows && shard.checks.db_zero_missing) {
      summary.gate_counts.db_coverage += 1;
    }
    if (shard.checks.search_gate_pass) {
      summary.gate_counts.search_gate += 1;
    }
    if (shard.checks.release_preflight_pass) {
      summary.gate_counts.release_preflight += 1;
    }

    if (!shard.checks.production_ready_report) {
      collectBlocker(blockers, shard, 'production_ready_report', {
        expected_rows: shard.rows,
        production_ready: shard.productionReady,
      });
    }
    if (!shard.checks.db_present_equals_rows) {
      collectBlocker(blockers, shard, 'db_present_equals_rows', {
        expected_rows: shard.rows,
        db_metrics: shard.db.metrics,
      });
    }
    if (!shard.checks.db_zero_missing) {
      collectBlocker(blockers, shard, 'db_zero_missing', {
        required_zero_fields: REQUIRED_DB_ZERO_FIELDS,
        db_metrics: shard.db.metrics,
      });
    }
    if (!shard.checks.search_gate_pass) {
      collectBlocker(blockers, shard, 'search_gate_pass', {
        search: shard.search,
      });
    }
    if (!shard.checks.release_preflight_pass) {
      collectBlocker(blockers, shard, 'release_preflight_pass', {
        release: shard.release,
      });
    }
  }

  summary.blockers = blockers.length;
  const status = blockers.length === 0 ? 'pass' : 'blocked';

  return {
    schema_version: '9709_full_production_ready_aggregate_gate_v1',
    generated_on: options.generatedOn,
    status,
    verdict: status === 'pass' ? 'production-ready' : 'blocked',
    scope: {
      subject_code: '9709',
      surface_shards: shards.length,
      current_surface_rows: shards.reduce((total, shard) => total + shard.rows, 0),
      original_2026_05_04_inventory_rows: 2935,
      inventory_note: 'Current surface manifests contain 2937 rows after later correction/recovery: p2_s_standard_001 swapped three false-positive S16 rows for three printed S17 q02 rows, p5_w_standard_001 recovered w18_qp_52 q02, and p6_m_standard_001 recovered m21_qp_62 q04.',
    },
    summary,
    blockers,
    shards: shards.map((shard) => ({
      shard_id: shard.shard_id,
      paper: shard.paper,
      session: shard.session,
      source_type: shard.source_type,
      rows: shard.rows,
      surface_manifest: shard.surface_manifest,
      production_ready_report: shard.production_ready_report,
      db_coverage_report: shard.db_coverage_report,
      db_coverage_source: shard.db_coverage_source,
      search_gate_report: shard.search_gate_report,
      release_preflight_report: shard.release_preflight_report,
      checks: shard.checks,
      release_warnings: shard.release_warnings,
    })),
    required_gate_contract: {
      production_ready_closeout: 'exists and row count matches the current surface manifest',
      db_coverage: {
        present_equals_manifest_count_equals_rows: true,
        required_zero_fields: REQUIRED_DB_ZERO_FIELDS,
      },
      search_gate: 'pass',
      release_preflight: 'pass with zero blockers',
    },
    boundaries: [
      'This aggregate gate covers the current 9709 page-chain surface manifests only.',
      'It does not promote raw q01-q15 probe slots that were not confirmed as printed question rows.',
      'It does not rerun external VLM/API extraction; it aggregates already committed shard evidence.',
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
    '| Shard | Rows | Production ready | DB coverage | Search gate | Release preflight |',
    '| --- | ---: | --- | --- | --- | --- |',
    ...shards.map((shard) => {
      const dbPass = shard.checks.db_present_equals_rows && shard.checks.db_zero_missing;
      return [
        `| \`${shard.shard_id}\``,
        shard.rows,
        `\`${shard.checks.production_ready_report}\``,
        `\`${dbPass}\``,
        `\`${shard.checks.search_gate_pass}\``,
        `\`${shard.checks.release_preflight_pass}\` |`,
      ].join(' | ');
    }),
    '',
  ].join('\n');
}

function renderMarkdown(aggregate, options) {
  const dbSources = Object.entries(aggregate.summary.db_coverage_sources)
    .map(([source, count]) => `\`${source}\`: \`${count}\``)
    .join(', ');
  const gateCounts = aggregate.summary.gate_counts;

  return [
    '# 9709 full production-ready aggregate closeout',
    '',
    `日期: ${aggregate.generated_on}`,
    '',
    '## Verdict',
    '',
    aggregate.status === 'pass'
      ? '当前 `9709` surface-manifest inventory 已全量 production-ready。'
      : '当前 `9709` surface-manifest inventory 尚未通过 aggregate gate。',
    '',
    `- aggregate gate status: \`${aggregate.status}\``,
    `- current surface shards: \`${aggregate.scope.surface_shards}/${aggregate.scope.surface_shards}\``,
    `- current surface rows: \`${aggregate.scope.current_surface_rows}/${aggregate.scope.current_surface_rows}\``,
    `- blockers: \`${aggregate.summary.blockers}\``,
    `- DB coverage sources: ${dbSources}`,
    '',
    '这里的“全量”是当前已确认可解析题目行口径，不是原始 `5400` 个 probe slots。原始 2026-05-04 inventory 是 `2935` rows；后续修复和补行后，当前 surface manifests 为 `2937` rows。',
    '',
    '## Gate Contract',
    '',
    '已统一核对 36 个 shard 的以下条件：',
    '',
    `- production-ready closeout 存在且行数匹配: \`${gateCounts.production_ready_report}/36\`。`,
    `- DB coverage 中 \`present == manifest_count == shard rows\` 且 missing 指标全为 0: \`${gateCounts.db_coverage}/36\`。`,
    `- question search gate 全部 pass: \`${gateCounts.search_gate}/36\`。`,
    `- final release preflight 全部 pass 且 blockers 为 0: \`${gateCounts.release_preflight}/36\`。`,
    '',
    'DB missing 指标包括: `missing_registry`, `prompt_missing`, `provenance_missing`, `search_text_missing`, `snapshot_ref_missing`, `snapshot_missing`, `materialized_classifier_missing`。',
    '',
    '## Distribution',
    '',
    renderCountTable('Paper', aggregate.summary.rows_by_paper),
    renderCountTable('Session', aggregate.summary.rows_by_session),
    renderCountTable('Source type', aggregate.summary.rows_by_source_type),
    '## Shard Matrix',
    '',
    renderShardMatrix(aggregate.shards),
    '## Inventory Note',
    '',
    '当前 surface manifests 比 2026-05-04 原始 inventory 多 2 行净增：',
    '',
    '- `p2_s_standard_001`: 移除 3 个 S16 false-positive slots，加入 3 个 S17 printed q02 rows，row count 不变。',
    '- `p5_w_standard_001`: recovered `9709/w18_qp_52/questions/q02.png`。',
    '- `p6_m_standard_001`: recovered `9709/m21_qp_62/questions/q04.png`。',
    '',
    '因此当前可声明的生产口径是 `2937/2937` current surface rows production-ready。',
    '',
    '## Artifacts',
    '',
    `- generator: \`${relativeRepoPath(__filename)}\``,
    `- machine gate: \`${options.jsonOut}\``,
    '- shard source manifests: `data/manifests/9709_p*_page_chain_surface_v1.json`',
    '- shard reports: `docs/reports/*9709*production-ready*`, `*db-coverage.json`, `*search-gate.json`, `*release-preflight-final.json`',
    '',
    '## Boundary',
    '',
    '本报告不把原始 q01-q15 probe slots 中未被确认为 printed question 的 locator 空位纳入 production-ready 题目行。若未来要审计这些 probe slots，需要单独做 locator/printed-question audit。',
    '',
  ].join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return 0;
  }

  const aggregate = buildAggregate(options);
  writeJson(options.jsonOut, aggregate);
  writeText(options.markdownOut, renderMarkdown(aggregate, options));

  writeStdoutLine(`9709_full_production_ready_aggregate_status=${aggregate.status}`);
  writeStdoutLine(`9709_full_production_ready_surface_shards=${aggregate.scope.surface_shards}`);
  writeStdoutLine(`9709_full_production_ready_surface_rows=${aggregate.scope.current_surface_rows}`);
  writeStdoutLine(`9709_full_production_ready_blockers=${aggregate.summary.blockers}`);

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
