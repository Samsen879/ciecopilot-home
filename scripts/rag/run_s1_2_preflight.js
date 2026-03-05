#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_RETRIEVAL_CONFIG, RETRIEVAL_VERSION } from '../../api/rag/lib/constants.js';
import {
  S1_2_EXPECTED_BEHAVIORS,
  S1_2_QUERY_FAMILIES,
  S1_2_RISK_FAMILIES,
} from './lib/s1_2_dataset.js';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_2_preflight.json');

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readJson(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function main() {
  const s1Metric = readJson('runs/backend/rag_s1_metric_gate_summary.json');
  const s1_1Metric = readJson('runs/backend/rag_s1_1_benchmark_summary.json');

  const payload = {
    generated_at: new Date().toISOString(),
    defaults: {
      retrieval_version: RETRIEVAL_VERSION,
      retrieval: DEFAULT_RETRIEVAL_CONFIG,
    },
    baseline_snapshots: {
      s1_metric_gate: {
        path: 'runs/backend/rag_s1_metric_gate_summary.json',
        exists: exists('runs/backend/rag_s1_metric_gate_summary.json'),
        status: s1Metric?.status || null,
        benchmark_profile: s1Metric?.benchmark_profile || null,
        gate_mode: s1Metric?.gate_mode || null,
      },
      s1_1_benchmark: {
        path: 'runs/backend/rag_s1_1_benchmark_summary.json',
        exists: exists('runs/backend/rag_s1_1_benchmark_summary.json'),
        status: s1_1Metric?.status || null,
        benchmark_profile: s1_1Metric?.benchmark_profile || null,
        gate_mode: s1_1Metric?.gate_mode || null,
      },
    },
    s1_2_contract: {
      benchmark_profile: 'syllabus_qa_core_v1',
      benchmark_tier: 'advisory',
      workflow_source: '.github/workflows/rag-s1-2-benchmark.yml',
      expected_behaviors: S1_2_EXPECTED_BEHAVIORS,
      query_families: S1_2_QUERY_FAMILIES,
      risk_families: S1_2_RISK_FAMILIES,
    },
    artifacts: {
      dataset: 'data/eval/rag_s1_2_syllabus_qa_core_v1.json',
      manifest: 'data/eval/rag_s1_2_syllabus_qa_core_v1_manifest.json',
      benchmark_summary: 'runs/backend/rag_s1_2_benchmark_summary.json',
      corpus_audit_summary: 'runs/backend/rag_corpus_audit_summary.json',
      benchmark_report: 'docs/reports/rag_s1_2_benchmark.md',
      corpus_audit_report: 'docs/reports/rag_corpus_audit.md',
      decision_report: 'docs/reports/rag_s1_2_decision_report.md',
    },
    guards: {
      s1_required_gate_paths_unchanged: [
        'runs/backend/rag_s1_contract_gate_summary.json',
        'runs/backend/rag_s1_metric_gate_summary.json',
      ],
      default_strategy_must_remain: RETRIEVAL_VERSION,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();
