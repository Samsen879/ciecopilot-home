export const S2_ADVISORY_THRESHOLDS = Object.freeze({
  topic_leakage_rate_eq: 0,
  evidence_traceability_rate_min: 0.95,
  fallback_rate_max: 0.2,
  target_slice_quality_vs_s1_gt: 0,
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildS2AdvisoryGateSummary({ evalSummary = null } = {}) {
  const metrics = {
    topic_leakage_rate: toNumber(evalSummary?.topic_leakage_rate, 1),
    evidence_traceability_rate: toNumber(evalSummary?.evidence_traceability_rate, 0),
    fallback_rate: toNumber(evalSummary?.fallback_rate, 1),
    target_slice_quality_vs_s1: toNumber(evalSummary?.target_slice_quality_vs_s1, -1),
    readiness_guard_block_rate: toNumber(evalSummary?.readiness_guard_block_rate, 0),
  };

  const thresholdChecks = {
    topic_leakage_rate: metrics.topic_leakage_rate === S2_ADVISORY_THRESHOLDS.topic_leakage_rate_eq,
    evidence_traceability_rate:
      metrics.evidence_traceability_rate >= S2_ADVISORY_THRESHOLDS.evidence_traceability_rate_min,
    fallback_rate: metrics.fallback_rate <= S2_ADVISORY_THRESHOLDS.fallback_rate_max,
    target_slice_quality_vs_s1:
      metrics.target_slice_quality_vs_s1 > S2_ADVISORY_THRESHOLDS.target_slice_quality_vs_s1_gt,
  };

  const blockingReasons = [];
  if (!thresholdChecks.topic_leakage_rate) {
    blockingReasons.push(`topic_leakage_rate must equal 0, got ${metrics.topic_leakage_rate}`);
  }
  if (!thresholdChecks.evidence_traceability_rate) {
    blockingReasons.push(
      `evidence_traceability_rate must be >= ${S2_ADVISORY_THRESHOLDS.evidence_traceability_rate_min}, got ${metrics.evidence_traceability_rate}`,
    );
  }
  if (!thresholdChecks.fallback_rate) {
    blockingReasons.push(
      `fallback_rate must be <= ${S2_ADVISORY_THRESHOLDS.fallback_rate_max}, got ${metrics.fallback_rate}`,
    );
  }
  if (!thresholdChecks.target_slice_quality_vs_s1) {
    blockingReasons.push(
      `target_slice_quality_vs_s1 must be > ${S2_ADVISORY_THRESHOLDS.target_slice_quality_vs_s1_gt}, got ${metrics.target_slice_quality_vs_s1}`,
    );
  }

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_advisory_gate',
    advisory_mode: true,
    thresholds: S2_ADVISORY_THRESHOLDS,
    metrics,
    threshold_checks: thresholdChecks,
    route_counts: evalSummary?.route_counts || {},
    readiness_guard_block_count: toNumber(evalSummary?.readiness_guard_block_count, 0),
    readiness_guard_reason_counts: evalSummary?.readiness_guard_reason_counts || {},
    readiness_effective_depth_source_counts: evalSummary?.readiness_effective_depth_source_counts || {},
    fallback_reason_counts: evalSummary?.fallback_reason_counts || {},
    dependency_status_counts: evalSummary?.dependency_status_counts || {},
    top_failing_cases: evalSummary?.top_failing_cases || [],
    status: Object.values(thresholdChecks).every(Boolean) ? 'pass' : 'fail',
    blocking_reasons: blockingReasons,
  };
}

export function buildS2ReleaseDecision({
  advisoryGateSummary = null,
  s1ContractGate = null,
  s1MetricGate = null,
} = {}) {
  const checks = {
    advisory_gate_pass: advisoryGateSummary?.status === 'pass',
    s1_contract_gate_pass: s1ContractGate?.all_green === true,
    s1_metric_gate_pass: s1MetricGate?.status === 'pass',
    s1_metric_gate_mode_required_fail_closed: s1MetricGate?.gate_mode === 'required_fail_closed',
  };
  const releaseReady = Object.values(checks).every(Boolean);

  const blockingReasons = [];
  if (!checks.advisory_gate_pass) {
    blockingReasons.push('S2 advisory gate not passed');
  }
  if (!checks.s1_contract_gate_pass) {
    blockingReasons.push('S1 Contract Gate is not green');
  }
  if (!checks.s1_metric_gate_pass) {
    blockingReasons.push('S1 Metric Gate (Required) is not pass');
  }
  if (!checks.s1_metric_gate_mode_required_fail_closed) {
    blockingReasons.push('S1 Metric Gate mode is not required_fail_closed');
  }

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_release_decision',
    release_mode: 'advisory_only',
    s1_default_production_route_must_remain: 'b_simplified_retrieval_s1_v1',
    checks,
    decision: releaseReady ? 'go_s2_advisory_candidate' : 'hold_s2_keep_s1_default',
    release_ready: releaseReady,
    blocking_reasons: blockingReasons,
    next_actions: releaseReady
      ? [
          'keep S1 as default production path',
          'proceed with S2 advisory rollout guardrails and monitoring',
        ]
      : [
          'keep S1 as default production path',
          'fix S2 fallback and quality delta issues before advisory promotion',
        ],
  };
}
