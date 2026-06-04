#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildS2ReleaseDecision,
  renderS2ReleaseDecisionReport,
} from './lib/s2_advisory_gate.js';

const ROOT = process.cwd();
const ADVISORY_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_advisory_gate_summary.json');
const EVAL_SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_augmentation_eval_summary.json');
const EVAL_SCHEMA_CHECK_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_eval_summary_schema_check.json');
const S1_CONTRACT_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_contract_gate_summary.json');
const S1_METRIC_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json');
const WORKFLOW_INVARIANT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_workflow_invariant_check.json');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s2_release_decision.json');
const OUT_REPORT = path.join(ROOT, 'docs', 'reports', 'rag_s2_release_decision_report.md');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const advisoryGateSummary = readJsonIfExists(ADVISORY_GATE_FILE);
  const evalSummary = readJsonIfExists(EVAL_SUMMARY_FILE);
  const evalSummarySchemaCheck = readJsonIfExists(EVAL_SCHEMA_CHECK_FILE);
  const s1ContractGate = readJsonIfExists(S1_CONTRACT_GATE_FILE);
  const s1MetricGate = readJsonIfExists(S1_METRIC_GATE_FILE);
  const workflowInvariant = readJsonIfExists(WORKFLOW_INVARIANT_FILE);

  const decision = buildS2ReleaseDecision({
    advisoryGateSummary,
    evalSummary,
    evalSummarySchemaCheck,
    s1ContractGate,
    s1MetricGate,
    workflowInvariant,
  });
  const output = {
    ...decision,
    inputs: {
      advisory_gate: toRel(ADVISORY_GATE_FILE),
      s2_augmentation_eval_summary: toRel(EVAL_SUMMARY_FILE),
      s2_eval_summary_schema_check: toRel(EVAL_SCHEMA_CHECK_FILE),
      s1_contract_gate: toRel(S1_CONTRACT_GATE_FILE),
      s1_metric_gate: toRel(S1_METRIC_GATE_FILE),
      workflow_invariant: toRel(WORKFLOW_INVARIANT_FILE),
    },
    evidence: {
      advisory_gate_status: advisoryGateSummary?.status || null,
      advisory_gate_generated_at: advisoryGateSummary?.generated_at || null,
      s2_eval_summary_status: evalSummary?.status || null,
      s2_eval_summary_generated_at: evalSummary?.generated_at || null,
      s2_eval_summary_schema_check_status: evalSummarySchemaCheck?.status || null,
      s2_eval_summary_schema_valid: evalSummarySchemaCheck?.schema_valid ?? null,
      s2_eval_summary_semantic_valid: evalSummarySchemaCheck?.semantic_valid ?? null,
      s1_contract_gate_all_green: s1ContractGate?.all_green ?? null,
      s1_contract_gate_generated_at: s1ContractGate?.generated_at || null,
      s1_metric_gate_status: s1MetricGate?.status || null,
      s1_metric_gate_mode: s1MetricGate?.gate_mode || null,
      s1_metric_gate_generated_at: s1MetricGate?.generated_at || null,
      workflow_invariant_status: workflowInvariant?.status || null,
      workflow_invariant_advisory_only: workflowInvariant?.gate?.advisory_only === true,
    },
  };
  const report = renderS2ReleaseDecisionReport({
    decisionPayload: output,
    sourcePaths: {
      advisoryGate: output.inputs.advisory_gate,
      s1ContractGate: output.inputs.s1_contract_gate,
      s1MetricGate: output.inputs.s1_metric_gate,
      workflowInvariant: output.inputs.workflow_invariant,
    },
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_REPORT), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_REPORT, report, 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_REPORT}\n`);
}

main();
