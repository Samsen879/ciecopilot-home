#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIVE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_latest.json');
const STABILITY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_live_benchmark_stability.json');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s1_metric_gate_summary.json');
const WORKFLOW_FILE = path.join(ROOT, '.github', 'workflows', 'rag-s1-metric-gate.yml');

function main() {
  if (!fs.existsSync(LIVE_FILE)) {
    throw new Error(`Missing live benchmark file: ${LIVE_FILE}`);
  }
  const live = JSON.parse(fs.readFileSync(LIVE_FILE, 'utf8'));
  const stability = fs.existsSync(STABILITY_FILE)
    ? JSON.parse(fs.readFileSync(STABILITY_FILE, 'utf8'))
    : null;
  const payload = {
    generated_at: new Date().toISOString(),
    source: path.relative(ROOT, LIVE_FILE).replace(/\\/g, '/'),
    status: live.status || 'fail',
    threshold_checks: live.threshold_checks || {},
    metrics: live.metrics || {},
    total_requests: live.total_requests || 0,
    benchmark_profile: live.benchmark_profile || null,
    gold_label_source: live.gold_label_source || null,
    strata: live.strata || null,
    f1_audit: live.f1_audit || null,
    traceability_audit: live.traceability_audit || null,
    leakage_audit: live.leakage_audit || null,
    uncertain_audit: live.uncertain_audit || null,
    retrieval_audit: live.retrieval_audit || null,
    cost_audit: live.cost_audit || null,
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
