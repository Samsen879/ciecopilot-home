#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_augmentation_eval_summary.json');
const ADVISORY_GATE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_advisory_gate_summary.json');
const RELEASE_DECISION_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_release_decision.json');
const REPORT_FILE = path.join(ROOT, 'docs', 'reports', 'rag_s2_augmentation_eval_report.md');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_c3_eval_checkpoint.json');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildRemediationSuggestions(summary) {
  const suggestions = [];
  const fallbackReasonCounts = summary?.fallback_reason_counts || {};
  const topFailingCases = Array.isArray(summary?.top_failing_cases) ? summary.top_failing_cases : [];
  const readinessBlockRate = toNumber(summary?.readiness_guard_block_rate, 0);
  const readinessReasonCounts = summary?.readiness_guard_reason_counts || {};
  if (toNumber(fallbackReasonCounts.S2_EMPTY_EVIDENCE, 0) > 0) {
    suggestions.push('tighten s2 routing eligibility and reduce false-positive S2 routing on sparse-evidence queries');
    suggestions.push('improve prerequisite expansion coverage to avoid empty hop-1 retrieval results');
  }
  if (toNumber(fallbackReasonCounts.S2_CONTRACT_INVALID, 0) > 0) {
    suggestions.push('harden S2 boundary filtering before evidence assembly to prevent contract-invalid fallback');
  }
  if (toNumber(summary?.target_slice_quality_vs_s1, 0) <= 0) {
    suggestions.push('improve target-slice quality signal before promotion (quality delta must be > 0)');
  }
  if (topFailingCases.some((row) => row?.s2_failure_class === 'UNEXPECTED_UNCERTAIN')) {
    suggestions.push('audit unexpected-uncertain cases and tighten intent guard patterns for cross-topic planning prompts');
  }
  if (topFailingCases.some((row) => row?.s2_route_stage === 'readiness_guard')) {
    suggestions.push('expand corpus/topic readiness coverage or add per-subject rollout allowlists to reduce readiness-guard downgrades');
  }
  if (readinessBlockRate > 0.5) {
    suggestions.push('introduce layered readiness thresholds by subject/topic depth and reduce single-threshold blocking');
  }
  if (toNumber(readinessReasonCounts.topic_depth_exceeded, 0) > 0) {
    suggestions.push('tune readiness depth policy (global + per-subject overrides) to lift S2 route share without breaking fallback SLA');
  }
  if (toNumber(readinessReasonCounts.subject_not_covered, 0) > 0) {
    suggestions.push('backfill readiness coverage profile for blocked subjects before widening S2 routing');
  }
  if (suggestions.length === 0 && topFailingCases.length > 0) {
    suggestions.push('review top failing cases by query_family and add targeted route policy or prompt-template adjustments');
  }
  return [...new Set(suggestions)];
}

function main() {
  const summary = readJson(SUMMARY_FILE);
  const advisoryGate = readJson(ADVISORY_GATE_FILE);
  const releaseDecision = readJson(RELEASE_DECISION_FILE);
  const reportExists = fs.existsSync(REPORT_FILE);
  const topFailingCases = Array.isArray(summary?.top_failing_cases) ? summary.top_failing_cases : [];
  const remediationSuggestions = buildRemediationSuggestions(summary);

  const checks = {
    has_s1_vs_s2_comparison_result:
      Boolean(summary?.mode_summaries?.s1_baseline) &&
      Boolean(summary?.mode_summaries?.s2_enabled) &&
      Boolean(summary?.target_slice_quality_vs_s1_by_slice),
    fallback_rate_within_threshold: toNumber(summary?.fallback_rate, 1) <= 0.2,
    topic_leakage_rate_zero: toNumber(summary?.topic_leakage_rate, 1) === 0,
    evidence_traceability_rate_threshold: toNumber(summary?.evidence_traceability_rate, 0) >= 0.95,
    top_failing_cases_locatable: topFailingCases.length > 0,
    remediation_suggestions_available: remediationSuggestions.length > 0,
    advisory_gate_artifact_present: Boolean(advisoryGate),
    release_decision_artifact_present: Boolean(releaseDecision),
    report_present: reportExists,
  };

  const blockedReasons = [];
  if (!checks.has_s1_vs_s2_comparison_result) {
    blockedReasons.push('missing_s1_vs_s2_comparison_result');
  }
  if (!checks.fallback_rate_within_threshold) {
    blockedReasons.push('fallback_rate_above_0_20');
  }
  if (!checks.topic_leakage_rate_zero || !checks.evidence_traceability_rate_threshold) {
    blockedReasons.push('boundary_or_traceability_threshold_not_met');
  }
  if (!checks.top_failing_cases_locatable || !checks.remediation_suggestions_available) {
    blockedReasons.push('top_failing_cases_or_remediation_missing');
  }

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_checkpoint_c3',
    run_config: {
      summary: toRel(SUMMARY_FILE),
      advisory_gate: toRel(ADVISORY_GATE_FILE),
      release_decision: toRel(RELEASE_DECISION_FILE),
      report: toRel(REPORT_FILE),
      thresholds: {
        fallback_rate_max: 0.2,
        topic_leakage_rate_eq: 0,
        evidence_traceability_rate_min: 0.95,
      },
    },
    metrics_snapshot: {
      fallback_rate: toNumber(summary?.fallback_rate, null),
      topic_leakage_rate: toNumber(summary?.topic_leakage_rate, null),
      evidence_traceability_rate: toNumber(summary?.evidence_traceability_rate, null),
      target_slice_quality_vs_s1: toNumber(summary?.target_slice_quality_vs_s1, null),
    },
    checks,
    top_failing_cases_count: topFailingCases.length,
    remediation_suggestions: remediationSuggestions,
    status: blockedReasons.length === 0 ? 'pass' : 'fail',
    blocked_reasons: blockedReasons,
    gate: {
      checkpoint: 'C3',
      self_check_passed: blockedReasons.length === 0,
      requires_user_confirmation: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);

  if (payload.status !== 'pass') process.exit(1);
}

main();
