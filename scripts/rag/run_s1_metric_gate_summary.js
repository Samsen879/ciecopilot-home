#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIVE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_latest.json');
const STABILITY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_stability.json');
const ORCHESTRATION_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_orchestration.json');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json');
const WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-metric-gate.yml');

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const live = readJsonIfExists(LIVE_FILE);
  const stability = readJsonIfExists(STABILITY_FILE);
  const orchestration = readJsonIfExists(ORCHESTRATION_FILE);
  const stageFailures = (orchestration?.stage_results || []).filter((stage) => stage.exit_code !== 0 && stage.exit_code !== null);
  const orchestrationStatus = stageFailures.length === 0 ? 'pass' : 'fail';

  const payload = {
    generated_at: new Date().toISOString(),
    source: live ? path.relative(ROOT, LIVE_FILE).replace(/\\/g, '/') : null,
    status: live?.status || 'fail',
    orchestration_status: orchestrationStatus,
    stage_failures: stageFailures,
    threshold_checks: live?.threshold_checks || {},
    execution_checks: live?.execution_checks || {},
    metrics: live?.metrics || {},
    total_requests: live?.total_requests || 0,
    dataset_total_cases: live?.dataset_total_cases || 0,
    benchmark_profile: live?.benchmark_profile || null,
    gold_label_source: live?.gold_label_source || null,
    strata: live?.strata || null,
    run_config: live?.run_config || null,
    round_timeout_ms: live?.run_config?.round_timeout_ms || null,
    per_request_timeout_ms: live?.run_config?.per_request_timeout_ms || null,
    case_timeout_ms: live?.run_config?.case_timeout_ms || null,
    slowest_cases_top_k: live?.slowest_cases_top_k || [],
    error_breakdown: live?.error_breakdown || {},
    failures_file: live?.failures_file || null,
    f1_audit: live?.f1_audit || null,
    traceability_audit: live?.traceability_audit || null,
    leakage_audit: live?.leakage_audit || null,
    uncertain_audit: live?.uncertain_audit || null,
    retrieval_audit: live?.retrieval_audit || null,
    cost_audit: live?.cost_audit || null,
    execution: live?.execution || null,
    orchestration: orchestration || null,
    required_gate_upgrade_eligible: Boolean(stability?.required_gate_upgrade_eligible),
    stability_source: stability ? path.relative(ROOT, STABILITY_FILE).replace(/\\/g, '/') : null,
    gate_mode: 'required_fail_closed',
    workflow_source: path.relative(ROOT, WORKFLOW_FILE).replace(/\\/g, '/'),
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
  if (payload.status !== 'pass') process.exit(1);
}

main();
