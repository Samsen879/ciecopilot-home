#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTRACT_WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-contract-gate.yml');
const METRIC_WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-metric-gate.yml');
const S2_WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s2-advisory-gate.yml');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_workflow_invariant_check.json');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function checkContains(content, expected) {
  if (!content) return false;
  if (expected instanceof RegExp) return expected.test(content);
  return content.includes(String(expected));
}

function buildCheck({ id, ok, details = {} }) {
  return { id, ok, details };
}

function main() {
  const contractWorkflow = readTextIfExists(CONTRACT_WORKFLOW_FILE);
  const metricWorkflow = readTextIfExists(METRIC_WORKFLOW_FILE);
  const s2Workflow = readTextIfExists(S2_WORKFLOW_FILE);

  const checks = [];
  checks.push(
    buildCheck({
      id: 's1_contract_workflow_present',
      ok: Boolean(contractWorkflow),
      details: { path: toRel(CONTRACT_WORKFLOW_FILE), exists: Boolean(contractWorkflow) },
    }),
  );
  checks.push(
    buildCheck({
      id: 's1_contract_workflow_name_unchanged',
      ok: checkContains(contractWorkflow, /^name:\s*RAG S1 Contract Gate$/m),
      details: { expected: 'name: RAG S1 Contract Gate' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's1_contract_job_name_unchanged',
      ok: checkContains(contractWorkflow, /name:\s*S1 Contract Gate/m),
      details: { expected: 'name: S1 Contract Gate' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's1_contract_artifact_path_unchanged',
      ok: checkContains(contractWorkflow, 'runs/backend/rag_s1_contract_gate_summary.json'),
      details: { expected: 'runs/backend/rag_s1_contract_gate_summary.json' },
    }),
  );

  checks.push(
    buildCheck({
      id: 's1_metric_workflow_present',
      ok: Boolean(metricWorkflow),
      details: { path: toRel(METRIC_WORKFLOW_FILE), exists: Boolean(metricWorkflow) },
    }),
  );
  checks.push(
    buildCheck({
      id: 's1_metric_workflow_name_unchanged',
      ok: checkContains(metricWorkflow, /^name:\s*RAG S1 Metric Gate$/m),
      details: { expected: 'name: RAG S1 Metric Gate' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's1_metric_job_name_unchanged',
      ok: checkContains(metricWorkflow, /name:\s*S1 Metric Gate \(Required\)/m),
      details: { expected: 'name: S1 Metric Gate (Required)' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's1_metric_artifact_path_unchanged',
      ok: checkContains(metricWorkflow, 'runs/backend/rag_s1_metric_gate_summary.json'),
      details: { expected: 'runs/backend/rag_s1_metric_gate_summary.json' },
    }),
  );

  checks.push(
    buildCheck({
      id: 's2_advisory_workflow_present',
      ok: Boolean(s2Workflow),
      details: { path: toRel(S2_WORKFLOW_FILE), exists: Boolean(s2Workflow) },
    }),
  );
  checks.push(
    buildCheck({
      id: 's2_advisory_job_name_is_non_required',
      ok: checkContains(s2Workflow, /name:\s*S2 Advisory Gate \(Non-Blocking\)/m),
      details: { expected: 'name: S2 Advisory Gate (Non-Blocking)' },
    }),
  );

  const blockedReasons = checks.filter((check) => !check.ok).map((check) => check.id);

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_workflow_invariant_check',
    run_config: {
      script: 'scripts/rag/run_s2_workflow_invariant_check.js',
      required_invariants: [
        'S1 Contract Gate workflow/job names unchanged',
        'S1 Metric Gate (Required) workflow/job names unchanged',
        'S1 gate artifact paths unchanged',
        'S2 advisory workflow exists and remains non-blocking by job naming',
      ],
    },
    inputs: {
      s1_contract_workflow: toRel(CONTRACT_WORKFLOW_FILE),
      s1_metric_workflow: toRel(METRIC_WORKFLOW_FILE),
      s2_advisory_workflow: toRel(S2_WORKFLOW_FILE),
    },
    checks,
    status: blockedReasons.length === 0 ? 'pass' : 'fail',
    blocked_reasons: blockedReasons,
    gate: {
      checkpoint: 'S2_WORKFLOW_GOVERNANCE',
      self_check_passed: blockedReasons.length === 0,
      advisory_only: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);

  if (payload.status !== 'pass') process.exit(1);
}

main();
