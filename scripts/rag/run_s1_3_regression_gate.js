#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { S1_3_RETRIEVAL_AUDIT_KEYS, S1_3_THRESHOLDS } from './lib/s1_3_forced_retrieval.js';

const ROOT = process.cwd();
const DEFAULT_SOURCE = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_forced_retrieval_summary.json');
const DEFAULT_OUT = path.join(ROOT, 'runs', 'backend', 'rag_s1_3_regression_gate_summary.json');

const REQUIRED_METRIC_KEYS = Object.freeze([
  'topic_leakage_rate',
  'evidence_traceability_rate',
  'retrieval_path_ratio',
  'short_circuit_ratio',
  'no_relevant_chunk_rate',
  'execution_error_rate',
  'infra_failure_rate',
]);

const REQUIRED_THRESHOLD_KEYS = Object.freeze([...REQUIRED_METRIC_KEYS]);

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function isFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`source summary not found: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('source summary must be an object');
  }
  return parsed;
}

function evaluateStructuralChecks(summary) {
  const metricChecks = Object.fromEntries(
    REQUIRED_METRIC_KEYS.map((key) => [key, isFiniteNumber(summary?.metrics?.[key])]),
  );
  const thresholdChecks = Object.fromEntries(
    REQUIRED_THRESHOLD_KEYS.map((key) => [key, typeof summary?.threshold_checks?.[key] === 'boolean']),
  );

  const retrievalAuditContract = summary?.retrieval_audit_contract || {};
  const hasRequiredAuditKeys = Array.isArray(retrievalAuditContract.required_keys)
    && S1_3_RETRIEVAL_AUDIT_KEYS.every((key) => retrievalAuditContract.required_keys.includes(key));
  const stableRate = toNumber(retrievalAuditContract.stable_row_rate, -1);

  return {
    has_metrics_object: Boolean(summary?.metrics && typeof summary.metrics === 'object'),
    has_threshold_checks_object: Boolean(summary?.threshold_checks && typeof summary.threshold_checks === 'object'),
    required_metric_keys_present: Object.values(metricChecks).every(Boolean),
    required_threshold_keys_present: Object.values(thresholdChecks).every(Boolean),
    metric_key_checks: metricChecks,
    threshold_key_checks: thresholdChecks,
    has_run_config: Boolean(summary?.run_config && typeof summary.run_config === 'object'),
    has_query_mode_counts: Boolean(summary?.query_mode_counts && typeof summary.query_mode_counts === 'object'),
    has_error_breakdown: Boolean(summary?.error_breakdown && typeof summary.error_breakdown === 'object'),
    has_leakage_audit: Boolean(summary?.leakage_audit && typeof summary.leakage_audit === 'object'),
    has_traceability_audit: Boolean(summary?.traceability_audit && typeof summary.traceability_audit === 'object'),
    retrieval_audit_required_keys_present: hasRequiredAuditKeys,
    retrieval_audit_stable_row_rate_full: stableRate === 1,
  };
}

function evaluateThresholdChecks(summary) {
  const metrics = summary?.metrics || {};
  const thresholds = summary?.thresholds || S1_3_THRESHOLDS;

  return {
    topic_leakage_rate: toNumber(metrics.topic_leakage_rate, Infinity) <= toNumber(thresholds.topic_leakage_rate_max, S1_3_THRESHOLDS.topic_leakage_rate_max),
    evidence_traceability_rate: toNumber(metrics.evidence_traceability_rate, -1) >= toNumber(thresholds.evidence_traceability_rate_min, S1_3_THRESHOLDS.evidence_traceability_rate_min),
    retrieval_path_ratio: toNumber(metrics.retrieval_path_ratio, -1) >= toNumber(thresholds.retrieval_path_ratio_min, S1_3_THRESHOLDS.retrieval_path_ratio_min),
    short_circuit_ratio: toNumber(metrics.short_circuit_ratio, Infinity) <= toNumber(thresholds.short_circuit_ratio_max, S1_3_THRESHOLDS.short_circuit_ratio_max),
    no_relevant_chunk_rate: toNumber(metrics.no_relevant_chunk_rate, Infinity) <= toNumber(thresholds.no_relevant_chunk_rate_max, S1_3_THRESHOLDS.no_relevant_chunk_rate_max),
    execution_error_rate: toNumber(metrics.execution_error_rate, Infinity) <= toNumber(thresholds.execution_error_rate_max, S1_3_THRESHOLDS.execution_error_rate_max),
    infra_failure_rate: toNumber(metrics.infra_failure_rate, Infinity) <= toNumber(thresholds.infra_failure_rate_max, S1_3_THRESHOLDS.infra_failure_rate_max),
  };
}

function flattenFailedChecks(checkGroup, prefix) {
  return Object.entries(checkGroup)
    .filter(([, passed]) => passed === false)
    .map(([name]) => `${prefix}.${name}`);
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const sourcePath = argv.source
    ? path.resolve(ROOT, String(argv.source))
    : DEFAULT_SOURCE;
  const outPath = argv.out
    ? path.resolve(ROOT, String(argv.out))
    : DEFAULT_OUT;

  const summary = loadSummary(sourcePath);
  const structuralChecks = evaluateStructuralChecks(summary);
  const thresholdChecks = evaluateThresholdChecks(summary);

  const gateChecks = {
    source_status_pass: summary?.status === 'pass',
    source_total_requests_positive: toNumber(summary?.total_requests, 0) > 0,
    source_round_not_aborted: summary?.run_config?.round_aborted !== true,
  };

  const failedChecks = [
    ...flattenFailedChecks(structuralChecks, 'structural'),
    ...flattenFailedChecks(thresholdChecks, 'threshold'),
    ...flattenFailedChecks(gateChecks, 'gate'),
  ];

  const payload = {
    generated_at: new Date().toISOString(),
    source: path.relative(ROOT, sourcePath).replace(/\\/g, '/'),
    source_generated_at: summary.generated_at || null,
    benchmark_profile: summary.benchmark_profile || null,
    benchmark_tier: summary.benchmark_tier || null,
    total_requests: toNumber(summary.total_requests, 0),
    thresholds: summary.thresholds || S1_3_THRESHOLDS,
    metrics_snapshot: summary.metrics || {},
    structural_checks: structuralChecks,
    threshold_checks: thresholdChecks,
    gate_checks: gateChecks,
    failed_checks: failedChecks,
    status: failedChecks.length === 0 ? 'pass' : 'fail',
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${outPath}\n`);
  if (payload.status !== 'pass') {
    process.exit(1);
  }
}

main();
