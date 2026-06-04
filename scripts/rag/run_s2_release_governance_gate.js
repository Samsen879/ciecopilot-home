#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { buildS2ReleaseGovernanceGate } from './lib/s2_advisory_gate.js';

const ROOT = process.cwd();
const RELEASE_DECISION_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_release_decision.json');
const EVAL_SCHEMA_CHECK_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_eval_summary_schema_check.json');
const ADVISORY_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_advisory_gate_summary.json');
const WORKFLOW_INVARIANT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_workflow_invariant_check.json');
const S1_CONTRACT_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_contract_gate_summary.json');
const S1_METRIC_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_release_governance_gate_summary.json');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const payload = buildS2ReleaseGovernanceGate({
    releaseDecision: readJsonIfExists(RELEASE_DECISION_FILE),
    evalSummarySchemaCheck: readJsonIfExists(EVAL_SCHEMA_CHECK_FILE),
    advisoryGateSummary: readJsonIfExists(ADVISORY_GATE_FILE),
    workflowInvariant: readJsonIfExists(WORKFLOW_INVARIANT_FILE),
    s1ContractGate: readJsonIfExists(S1_CONTRACT_GATE_FILE),
    s1MetricGate: readJsonIfExists(S1_METRIC_GATE_FILE),
  });
  const output = {
    ...payload,
    inputs: {
      release_decision: toRel(RELEASE_DECISION_FILE),
      s2_eval_summary_schema_check: toRel(EVAL_SCHEMA_CHECK_FILE),
      advisory_gate: toRel(ADVISORY_GATE_FILE),
      workflow_invariant: toRel(WORKFLOW_INVARIANT_FILE),
      s1_contract_gate: toRel(S1_CONTRACT_GATE_FILE),
      s1_metric_gate: toRel(S1_METRIC_GATE_FILE),
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);
  if (output.status !== 'pass') process.exit(1);
}

main();
