#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { buildS2ReleaseDecision } from './lib/s2_advisory_gate.js';

const ROOT = process.cwd();
const ADVISORY_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_advisory_gate_summary.json');
const S1_CONTRACT_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_contract_gate_summary.json');
const S1_METRIC_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_release_decision.json');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required artifact missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const advisoryGateSummary = readJson(ADVISORY_GATE_FILE);
  const s1ContractGate = readJson(S1_CONTRACT_GATE_FILE);
  const s1MetricGate = readJson(S1_METRIC_GATE_FILE);

  const decision = buildS2ReleaseDecision({
    advisoryGateSummary,
    s1ContractGate,
    s1MetricGate,
  });
  const output = {
    ...decision,
    inputs: {
      advisory_gate: toRel(ADVISORY_GATE_FILE),
      s1_contract_gate: toRel(S1_CONTRACT_GATE_FILE),
      s1_metric_gate: toRel(S1_METRIC_GATE_FILE),
    },
    evidence: {
      advisory_gate_status: advisoryGateSummary?.status || null,
      advisory_gate_generated_at: advisoryGateSummary?.generated_at || null,
      s1_contract_gate_all_green: s1ContractGate?.all_green ?? null,
      s1_contract_gate_generated_at: s1ContractGate?.generated_at || null,
      s1_metric_gate_status: s1MetricGate?.status || null,
      s1_metric_gate_mode: s1MetricGate?.gate_mode || null,
      s1_metric_gate_generated_at: s1MetricGate?.generated_at || null,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();
