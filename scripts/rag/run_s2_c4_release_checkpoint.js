#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INPUTS = Object.freeze({
  preflight: 'runs/backend/rag_s2_preflight.json',
  c1_checkpoint: 'runs/backend/rag_s2_c1_classifier_gate.json',
  c2_checkpoint: 'runs/backend/rag_s2_c2_execution_checkpoint.json',
  c3_checkpoint: 'runs/backend/rag_s2_c3_eval_checkpoint.json',
  eval_summary: 'runs/backend/rag_s2_augmentation_eval_summary.json',
  advisory_gate: 'runs/backend/rag_s2_advisory_gate_summary.json',
  release_decision: 'runs/backend/rag_s2_release_decision.json',
  workflow_invariant: 'runs/backend/rag_s2_workflow_invariant_check.json',
  s1_contract_gate: 'runs/backend/rag_s1_contract_gate_summary.json',
  s1_metric_gate: 'runs/backend/rag_s1_metric_gate_summary.json',
  s2_runbook: 'docs/reports/rag_s2_advisory_workflow_and_kill_switch_runbook.md',
  s2_eval_report: 'docs/reports/rag_s2_augmentation_eval_report.md',
  reports_index: 'docs/reports/INDEX.md',
});
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_c4_release_checkpoint.json');

const ALLOWED_ROUTES = new Set(['s1_default', 's2_augmentation']);

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function readText(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function main() {
  const preflight = readJson(INPUTS.preflight);
  const c1 = readJson(INPUTS.c1_checkpoint);
  const c2 = readJson(INPUTS.c2_checkpoint);
  const c3 = readJson(INPUTS.c3_checkpoint);
  const evalSummary = readJson(INPUTS.eval_summary);
  const advisoryGate = readJson(INPUTS.advisory_gate);
  const releaseDecision = readJson(INPUTS.release_decision);
  const workflowInvariant = readJson(INPUTS.workflow_invariant);
  const s1ContractGate = readJson(INPUTS.s1_contract_gate);
  const s1MetricGate = readJson(INPUTS.s1_metric_gate);
  const runbookText = readText(INPUTS.s2_runbook);
  const reportsIndexText = readText(INPUTS.reports_index);

  const inputPresence = Object.fromEntries(
    Object.entries(INPUTS).map(([name, relPath]) => [
      name,
      {
        path: relPath,
        exists: exists(relPath),
      },
    ]),
  );

  const routeCounts = evalSummary?.route_counts || {};
  const routeKeys = Object.keys(routeCounts);
  const hasUnexpectedRoute = routeKeys.some((key) => !ALLOWED_ROUTES.has(String(key)));
  const s1DefaultCount = Number(routeCounts.s1_default || 0);
  const s2AugCount = Number(routeCounts.s2_augmentation || 0);

  const c1OpenAiCheck = Array.isArray(c1?.checks)
    ? c1.checks.find((item) => item.id === 'openai_not_required_for_router')
    : null;
  const workflowChecks = Array.isArray(workflowInvariant?.checks) ? workflowInvariant.checks : [];
  const s1ContractNameInvariant = workflowChecks.find((item) => item.id === 's1_contract_job_name_unchanged')?.ok === true;
  const s1MetricNameInvariant = workflowChecks.find((item) => item.id === 's1_metric_job_name_unchanged')?.ok === true;

  const checks = {
    all_required_inputs_present: Object.values(inputPresence).every((item) => item.exists),
    s2_augmentation_only_route_labels: !hasUnexpectedRoute,
    s2_does_not_replace_s1_default: s1DefaultCount > 0 && s1DefaultCount >= s2AugCount,
    c2_checkpoint_passed: c2?.status === 'pass',
    c3_checkpoint_passed: c3?.status === 'pass',
    release_decision_advisory_ready:
      releaseDecision?.release_mode === 'advisory_only' && releaseDecision?.release_ready === true,
    traceability_artifacts_present:
      exists(INPUTS.s2_runbook) &&
      exists(INPUTS.s2_eval_report) &&
      exists(INPUTS.eval_summary) &&
      exists(INPUTS.advisory_gate) &&
      exists(INPUTS.release_decision) &&
      exists(INPUTS.workflow_invariant),
    runbook_has_kill_switch_instructions:
      String(runbookText || '').includes('RAG_S2_ROUTE_KILL_SWITCH=true') &&
      String(runbookText || '').includes('RAG_S2_ENABLED=false'),
    reports_index_contains_s2_entries:
      String(reportsIndexText || '').includes('rag_s2_augmentation_eval_report.md') &&
      String(reportsIndexText || '').includes('rag_s2_advisory_workflow_and_kill_switch_runbook.md'),
    openai_not_required_for_s2:
      preflight?.guardrails?.openai_api_key_must_not_be_required === true &&
      c1OpenAiCheck?.ok === true,
    s1_required_gates_unchanged:
      workflowInvariant?.status === 'pass' &&
      s1ContractNameInvariant &&
      s1MetricNameInvariant &&
      s1ContractGate?.all_green === true &&
      s1MetricGate?.status === 'pass' &&
      s1MetricGate?.gate_mode === 'required_fail_closed',
    advisory_gate_passed: advisoryGate?.status === 'pass',
  };

  const blockedReasons = [];
  if (!checks.s2_augmentation_only_route_labels || !checks.s2_does_not_replace_s1_default) {
    blockedReasons.push('s2_not_augmentation_only');
  }
  if (!checks.traceability_artifacts_present || !checks.reports_index_contains_s2_entries) {
    blockedReasons.push('s2_artifacts_not_traceable');
  }
  if (!checks.openai_not_required_for_s2) {
    blockedReasons.push('openai_forced_dependency_detected');
  }
  if (!checks.s1_required_gates_unchanged) {
    blockedReasons.push('s1_required_gates_changed_or_polluted');
  }
  if (!checks.c2_checkpoint_passed || !checks.c3_checkpoint_passed) {
    blockedReasons.push('prior_checkpoints_not_passed');
  }

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_checkpoint_c4',
    run_config: {
      script: 'scripts/rag/run_s2_c4_release_checkpoint.js',
      inputs: INPUTS,
      release_policy: {
        s2_mode_must_remain: 'augmentation_only',
        s1_default_route_must_remain: 'b_simplified_retrieval_s1_v1',
        openai_must_not_be_forced: true,
      },
    },
    inputs: inputPresence,
    metrics_snapshot: {
      route_counts: routeCounts,
      fallback_rate: Number(evalSummary?.fallback_rate ?? 0),
      topic_leakage_rate: Number(evalSummary?.topic_leakage_rate ?? 0),
      evidence_traceability_rate: Number(evalSummary?.evidence_traceability_rate ?? 0),
      target_slice_quality_vs_s1: Number(evalSummary?.target_slice_quality_vs_s1 ?? 0),
    },
    checks,
    evidence: {
      c2_status: c2?.status || null,
      c3_status: c3?.status || null,
      advisory_gate_status: advisoryGate?.status || null,
      release_decision: releaseDecision?.decision || null,
      workflow_invariant_status: workflowInvariant?.status || null,
      s1_contract_gate_all_green: s1ContractGate?.all_green === true,
      s1_metric_gate_status: s1MetricGate?.status || null,
      s1_metric_gate_mode: s1MetricGate?.gate_mode || null,
    },
    status: blockedReasons.length === 0 ? 'pass' : 'fail',
    blocked_reasons: blockedReasons,
    gate: {
      checkpoint: 'C4',
      self_check_passed: blockedReasons.length === 0,
      requires_user_confirmation: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(OUT_FILE)}\n`);

  if (payload.status !== 'pass') process.exit(1);
}

main();
