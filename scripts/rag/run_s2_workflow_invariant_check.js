#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONTRACT_WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-contract-gate.yml');
const METRIC_WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-metric-gate.yml');
const S2_WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s2-advisory-gate.yml');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_workflow_invariant_check.json');
const REQUIRED_S2_ARTIFACT_PATHS = [
  'runs/backend/rag_s2_augmentation_eval_summary.json',
  'docs/reports/rag_s2_augmentation_eval_report.md',
  'runs/backend/rag_s2_advisory_gate_summary.json',
  'runs/backend/rag_s2_workflow_invariant_check.json',
  'runs/backend/rag_s2_release_decision.json',
  'docs/reports/rag_s2_release_decision_report.md',
];

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

function hasRequiredNameCollision(content) {
  return /name:\s*.*S2.*\(Required\)/.test(content || '');
}

function hasUploadArtifactStep(content) {
  return /uses:\s*actions\/upload-artifact@v[0-9]+/.test(content || '');
}

function hasAlwaysOnUploadArtifactStep(content) {
  const uploadIndex = String(content || '').search(/uses:\s*actions\/upload-artifact@v[0-9]+/);
  if (uploadIndex === -1) return false;
  const beforeUpload = String(content || '').slice(Math.max(uploadIndex - 240, 0), uploadIndex);
  return /if:\s*always\(\)/.test(beforeUpload);
}

export function buildS2WorkflowInvariantCheck({
  contractWorkflow = null,
  metricWorkflow = null,
  s2Workflow = null,
  inputPaths = {},
} = {}) {
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
  checks.push(
    buildCheck({
      id: 's2_advisory_job_continue_on_error_true',
      ok: checkContains(s2Workflow, /continue-on-error:\s*true/m),
      details: { expected: 'continue-on-error: true' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's2_advisory_no_required_name_collision',
      ok: Boolean(s2Workflow) && !hasRequiredNameCollision(s2Workflow),
      details: { forbidden: 'S2 workflow/job names containing (Required)' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's2_advisory_artifact_upload_present',
      ok: hasUploadArtifactStep(s2Workflow),
      details: { expected: 'actions/upload-artifact' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's2_advisory_artifact_upload_if_always',
      ok: hasAlwaysOnUploadArtifactStep(s2Workflow),
      details: { expected: 'if: always() on the S2 artifact upload step' },
    }),
  );
  checks.push(
    buildCheck({
      id: 's2_advisory_artifact_paths_complete',
      ok: REQUIRED_S2_ARTIFACT_PATHS.every((artifactPath) => checkContains(s2Workflow, artifactPath)),
      details: {
        required_paths: REQUIRED_S2_ARTIFACT_PATHS,
        missing_paths: REQUIRED_S2_ARTIFACT_PATHS.filter((artifactPath) => !checkContains(s2Workflow, artifactPath)),
      },
    }),
  );

  const blockedReasons = checks.filter((check) => !check.ok).map((check) => check.id);

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_workflow_invariant_check',
    run_config: {
      script: 'scripts/rag/run_s2_workflow_invariant_check.js',
      required_invariants: [
        'S1 Contract Gate workflow/job names unchanged',
        'S1 Metric Gate (Required) workflow/job names unchanged',
        'S1 gate artifact paths unchanged',
        'S2 advisory workflow exists and remains non-blocking by job naming and continue-on-error',
        'S2 advisory workflow uploads release artifacts with if: always()',
        'S2 advisory workflow has no required-gate naming collision',
      ],
    },
    inputs: {
      s1_contract_workflow: inputPaths.s1_contract_workflow || toRel(CONTRACT_WORKFLOW_FILE),
      s1_metric_workflow: inputPaths.s1_metric_workflow || toRel(METRIC_WORKFLOW_FILE),
      s2_advisory_workflow: inputPaths.s2_advisory_workflow || toRel(S2_WORKFLOW_FILE),
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
}

export function main() {
  const payload = buildS2WorkflowInvariantCheck({
    contractWorkflow: readTextIfExists(CONTRACT_WORKFLOW_FILE),
    metricWorkflow: readTextIfExists(METRIC_WORKFLOW_FILE),
    s2Workflow: readTextIfExists(S2_WORKFLOW_FILE),
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);

  return payload.status === 'pass' ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = main();
}
