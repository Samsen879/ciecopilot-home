#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { buildS12Decision, renderS12DecisionReport } from './lib/s1_2_decision.js';

const ROOT = process.cwd();
const BENCHMARK_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_2_benchmark_summary.json');
const CORPUS_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_audit_summary.json');
const OUT_FILE = path.join(ROOT, 'docs', 'reports', 'rag_s1_2_decision_report.md');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s1_2_decision_summary.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required artifact missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const benchmarkSummary = readJson(BENCHMARK_FILE);
  const corpusAuditSummary = readJson(CORPUS_FILE);
  const decisionPayload = buildS12Decision(benchmarkSummary, corpusAuditSummary);
  const markdown = renderS12DecisionReport({
    benchmarkSummary,
    corpusAuditSummary,
    decisionPayload,
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_FILE, markdown, 'utf8');
  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        benchmark_summary: path.relative(ROOT, BENCHMARK_FILE).replace(/\\/g, '/'),
        corpus_audit_summary: path.relative(ROOT, CORPUS_FILE).replace(/\\/g, '/'),
        ...decisionPayload,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  process.stdout.write(`${OUT_FILE}\n${OUT_JSON}\n`);
}

main();
