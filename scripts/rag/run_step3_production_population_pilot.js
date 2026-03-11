#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPilotSourceSelection,
  buildProductionSourceInventory,
  renderProductionSourceInventoryReport,
} from './lib/production-source-inventory.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function runNodeScript(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  return {
    command: [process.execPath, ...args],
    exit_code: result.status ?? 1,
    signal: result.signal ?? null,
    ok: (result.status ?? 1) === 0,
  };
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function createCorpusVersion(subjectCode) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `rag_step3_${subjectCode}_pilot_${stamp}`;
}

function normalizePolicyMode(value) {
  const normalized = String(value || 'restricted_official').trim().toLowerCase();
  return normalized || 'restricted_official';
}

function normalizePdfChunkMode(value) {
  const normalized = String(value || 'question_aware').trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'question_aware') return 'question_aware';
  if (normalized === 'page_level' || normalized === 'page' || normalized === 'token_page') return 'page_level';
  throw new Error(`Unsupported pdf chunk mode: ${value}`);
}

function toArtifactPrefix(policyMode) {
  return policyMode.replace(/[^a-z0-9_]+/g, '_');
}

function defaultCoverageBaselinePath(policyMode) {
  const restricted = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_restricted_official_summary.json');
  if (policyMode === 'restricted_official' && fs.existsSync(restricted)) {
    return restricted;
  }
  return path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_production_summary.json');
}

function buildArtifactPaths(subjectCode, policyMode) {
  const artifactPrefix = toArtifactPrefix(policyMode);
  return {
    postureJson: path.join(ROOT, 'runs', 'backend', 'rag_s1_3_production_source_posture.json'),
    coverageBaselineJson: defaultCoverageBaselinePath(policyMode),
    inventoryJson: path.join(ROOT, `runs/backend/rag_step3_${artifactPrefix}_source_inventory_${subjectCode}.json`),
    inventoryMd: path.join(ROOT, `docs/reports/rag_step3_${artifactPrefix}_source_inventory_${subjectCode}.md`),
    selectionJson: path.join(ROOT, `runs/backend/rag_step3_${artifactPrefix}_${subjectCode}_pilot_selection.json`),
    ingestSummaryJson: path.join(ROOT, `runs/backend/rag_step3_${artifactPrefix}_${subjectCode}_pilot_population_summary.json`),
    mappingJson: path.join(ROOT, `runs/backend/rag_step3_${artifactPrefix}_${subjectCode}_topic_path_mapping_backfill.json`),
    mappingMd: path.join(ROOT, `docs/reports/rag_step3_${artifactPrefix}_${subjectCode}_topic_path_mapping_backfill.md`),
    coverageJson: path.join(ROOT, `runs/backend/rag_step3_${artifactPrefix}_${subjectCode}_coverage_summary.json`),
    coverageMd: path.join(ROOT, `docs/reports/rag_step3_${artifactPrefix}_${subjectCode}_coverage.md`),
    datasetJson: path.join(ROOT, `data/eval/rag_step3_retrieval_availability_sample_${subjectCode}.json`),
    datasetManifestJson: path.join(ROOT, `data/eval/rag_step3_retrieval_availability_sample_${subjectCode}_manifest.json`),
    evalSummaryJson: path.join(ROOT, `runs/backend/rag_step3_retrieval_availability_summary_${subjectCode}.json`),
    evalReportMd: path.join(ROOT, `docs/reports/rag_step3_retrieval_availability_${subjectCode}.md`),
    overallSummaryJson: path.join(ROOT, `runs/backend/rag_step3_${artifactPrefix}_population_pilot_summary_${subjectCode}.json`),
  };
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const subjectCode = String(argv.subject || '9709').trim();
  const retrievalLimit = Number.isFinite(Number(argv['retrieval-limit'])) ? Number(argv['retrieval-limit']) : 20;
  const corpusVersion = String(argv['corpus-version'] || createCorpusVersion(subjectCode));
  const policyMode = normalizePolicyMode(argv.policy || process.env.RAG_SOURCE_POLICY_MODE || 'restricted_official');
  const pdfChunkMode = normalizePdfChunkMode(
    argv['pdf-chunk-mode'] || process.env.RAG_PDF_CHUNK_MODE || 'question_aware',
  );
  const paths = buildArtifactPaths(subjectCode, policyMode);

  const inventory = buildProductionSourceInventory({
    workspaceRoot: ROOT,
    postureFile: paths.postureJson,
    coverageFile: paths.coverageBaselineJson,
  });
  const pilotSelection = buildPilotSourceSelection(inventory, { subjectCode });
  inventory.pilot_selection = {
    subject_code: subjectCode,
    selected_count: pilotSelection.selected_count,
    missing_count: pilotSelection.missing.length,
    artifact: toRel(paths.selectionJson),
  };

  fs.mkdirSync(path.dirname(paths.inventoryJson), { recursive: true });
  fs.mkdirSync(path.dirname(paths.inventoryMd), { recursive: true });
  fs.mkdirSync(path.dirname(paths.selectionJson), { recursive: true });
  fs.writeFileSync(paths.inventoryJson, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  fs.writeFileSync(paths.inventoryMd, renderProductionSourceInventoryReport(inventory), 'utf8');
  fs.writeFileSync(paths.selectionJson, `${JSON.stringify(pilotSelection, null, 2)}\n`, 'utf8');

  const steps = [];

  steps.push({
    step: 'ingest',
    ...runNodeScript([
      'scripts/rag_ingest.js',
      '--subject', subjectCode,
      '--pdf',
      '--source-list-json', toRel(paths.selectionJson),
      '--limit', String(pilotSelection.selected_count || 0),
      '--write-mode', 'canonical',
      '--pdf-chunk-mode', pdfChunkMode,
      '--corpus-version', corpusVersion,
      '--summary-out', toRel(paths.ingestSummaryJson),
      '--continue-on-error',
      '--skip-existing',
    ]),
  });

  const ingestOk = steps[steps.length - 1].ok;

  if (ingestOk) {
    steps.push({
      step: 'topic_path_mapping_backfill',
      ...runNodeScript([
        'scripts/rag/run_topic_path_mapping_backfill.js',
        '--apply',
        '--subject', subjectCode,
        '--corpus-version', corpusVersion,
        '--out-json', toRel(paths.mappingJson),
        '--out-md', toRel(paths.mappingMd),
      ]),
    });
  }

  const mappingOk = steps[steps.length - 1]?.ok !== false;

  if (ingestOk && mappingOk) {
    steps.push({
      step: 'coverage',
      ...runNodeScript([
        'scripts/rag/run_corpus_source_coverage.js',
        '--policy', policyMode,
        '--out-json', toRel(paths.coverageJson),
        '--out-md', toRel(paths.coverageMd),
      ]),
    });
    steps.push({
      step: 'build_retrieval_sample',
      ...runNodeScript([
        'scripts/rag/build_step3_retrieval_availability_sample.js',
        '--subject', subjectCode,
        '--limit', String(retrievalLimit),
        '--out-dataset', toRel(paths.datasetJson),
        '--out-manifest', toRel(paths.datasetManifestJson),
      ]),
    });
  }

  const sampleBuildOk = steps[steps.length - 1]?.step === 'build_retrieval_sample' ? steps[steps.length - 1].ok : false;

  if (ingestOk && mappingOk && sampleBuildOk) {
    steps.push({
      step: 'retrieval_availability_eval',
      ...runNodeScript([
        'scripts/rag/run_s2_augmentation_eval.js',
        '--dataset', toRel(paths.datasetJson),
        '--manifest', toRel(paths.datasetManifestJson),
        '--corpus-summary', toRel(paths.coverageJson),
        '--out-summary', toRel(paths.evalSummaryJson),
        '--out-report', toRel(paths.evalReportMd),
        '--limit', String(retrievalLimit),
      ]),
    });
  }

  const coverage = readJsonIfExists(paths.coverageJson);
  const evalSummary = readJsonIfExists(paths.evalSummaryJson);
  const ingestSummary = readJsonIfExists(paths.ingestSummaryJson);
  const mappingSummary = readJsonIfExists(paths.mappingJson);

  const overall = {
    generated_at: new Date().toISOString(),
    subject_code: subjectCode,
    policy_mode: policyMode,
    pdf_chunk_mode: pdfChunkMode,
    corpus_version: corpusVersion,
    artifacts: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, toRel(value)])),
    pilot_selection: {
      selected_count: pilotSelection.selected_count,
      missing_count: pilotSelection.missing.length,
      missing: pilotSelection.missing,
    },
    steps,
    results: {
      ingest: ingestSummary ? {
        status: ingestSummary.status,
        pdf_chunk_mode: ingestSummary.filters?.pdf_chunk_mode || pdfChunkMode,
        files_processed: ingestSummary.counts?.files_processed || 0,
        chunks_planned: ingestSummary.counts?.chunks_planned || 0,
        canonical_inserts: ingestSummary.counts?.canonical_inserts || 0,
      } : null,
      topic_path_mapping: mappingSummary ? {
        status: mappingSummary.status,
        rows_scanned: mappingSummary.totals?.rows_scanned || 0,
        applied_updates: mappingSummary.totals?.applied_updates || 0,
        unresolved_rows: mappingSummary.totals?.unresolved_rows || 0,
      } : null,
      coverage: coverage ? {
        status: coverage.status,
        policy_mode: coverage.inputs?.policy_mode || policyMode,
        subject_counts: coverage.subject_counts || {},
        source_type_counts: coverage.source_type_counts || {},
        blocked_source_type_counts: coverage.blocked_source_type_counts || {},
        source_ref_resolvability_rate: coverage.metrics?.source_ref_resolvability_rate ?? null,
        topic_path_coverage_rate: coverage.metrics?.topic_path_coverage_rate ?? null,
      } : null,
      retrieval_availability: evalSummary ? {
        status: evalSummary.status,
        case_count: evalSummary.case_count || null,
        fallback_reason_counts: evalSummary.fallback_reason_counts || {},
        s2_empty_evidence_reason_counts: evalSummary.s2_empty_evidence_reason_counts || {},
        subject_counts: evalSummary.subject_counts || {},
      } : null,
    },
  };

  overall.status = steps.every((item) => item.ok) ? 'pass' : 'warn';
  writeJson(paths.overallSummaryJson, overall);
  process.stdout.write(`${paths.overallSummaryJson}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

