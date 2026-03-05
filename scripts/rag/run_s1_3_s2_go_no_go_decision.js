#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildS13Decision,
  renderS13TrustReport,
} from './lib/s1_3_decision.js';

const ROOT = process.cwd();
const NODES_AUDIT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_curriculum_nodes_quality_audit.json');
const CORPUS_COVERAGE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
const FORCED_BENCHMARK_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_forced_retrieval_summary.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_s2_go_no_go_decision.json');
const OUT_REPORT = path.join(ROOT, 'docs', 'reports', 'rag_s1_3_data_source_trust_report.md');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required artifact missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const nodesAudit = readJson(NODES_AUDIT_FILE);
  const corpusCoverage = readJson(CORPUS_COVERAGE_FILE);
  const forcedBenchmark = readJson(FORCED_BENCHMARK_FILE);

  const decision = buildS13Decision({
    nodesAudit,
    corpusCoverage,
    forcedBenchmark,
  });

  const output = {
    ...decision,
    inputs: {
      nodes_audit: path.relative(ROOT, NODES_AUDIT_FILE).replace(/\\/g, '/'),
      corpus_coverage: path.relative(ROOT, CORPUS_COVERAGE_FILE).replace(/\\/g, '/'),
      forced_benchmark: path.relative(ROOT, FORCED_BENCHMARK_FILE).replace(/\\/g, '/'),
    },
  };

  const report = renderS13TrustReport({
    nodesAudit,
    corpusCoverage,
    forcedBenchmark,
    decision: output,
    sourcePaths: {
      nodesAudit: output.inputs.nodes_audit,
      corpusCoverage: output.inputs.corpus_coverage,
      forcedBenchmark: output.inputs.forced_benchmark,
    },
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_REPORT), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_REPORT, report, 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_REPORT}\n`);
}

main();
