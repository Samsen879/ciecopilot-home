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

function pushBlocker(blockers, category, code, message) {
  if (!category || !code || !message) return;
  if (blockers.some((item) => item.code === code)) return;
  blockers.push({ category, code, message });
}

function collectBlockerCategories(blockers = []) {
  return [...new Set((Array.isArray(blockers) ? blockers : []).map((item) => item.category).filter(Boolean))];
}

function appendBlockers(target, blockers = []) {
  for (const blocker of Array.isArray(blockers) ? blockers : []) {
    pushBlocker(target, blocker.category, blocker.code, blocker.message);
  }
}

export function buildS2AdvisoryGateSummary({ evalSummary = null } = {}) {
  const hasEvalSummary = Boolean(evalSummary && typeof evalSummary === 'object');
  const evalSummaryStatus = hasEvalSummary
    ? typeof evalSummary?.status === 'string'
      ? evalSummary.status
      : 'pass'
    : null;
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

  const blockers = [];
  if (!hasEvalSummary) {
    pushBlocker(blockers, 'release_evidence', 'release_eval_summary_missing', 'release eval summary missing');
  } else if (evalSummaryStatus !== 'pass') {
    pushBlocker(
      blockers,
      'release_evidence',
      'release_eval_summary_not_pass',
      `release eval summary status must be pass, got ${evalSummaryStatus || 'missing'}`,
    );
    appendBlockers(blockers, evalSummary?.release_blockers);
  }
  if (hasEvalSummary && !thresholdChecks.topic_leakage_rate) {
    pushBlocker(
      blockers,
      's2_advisory_readiness',
      'topic_leakage_rate_not_zero',
      `topic_leakage_rate must equal 0, got ${metrics.topic_leakage_rate}`,
    );
  }
  if (hasEvalSummary && !thresholdChecks.evidence_traceability_rate) {
    pushBlocker(
      blockers,
      's2_advisory_readiness',
      'evidence_traceability_below_threshold',
      `evidence_traceability_rate must be >= ${S2_ADVISORY_THRESHOLDS.evidence_traceability_rate_min}, got ${metrics.evidence_traceability_rate}`,
    );
  }
  if (hasEvalSummary && !thresholdChecks.fallback_rate) {
    pushBlocker(
      blockers,
      's2_advisory_readiness',
      'fallback_rate_above_threshold',
      `fallback_rate must be <= ${S2_ADVISORY_THRESHOLDS.fallback_rate_max}, got ${metrics.fallback_rate}`,
    );
  }
  if (hasEvalSummary && !thresholdChecks.target_slice_quality_vs_s1) {
    pushBlocker(
      blockers,
      's2_advisory_readiness',
      'target_slice_quality_non_positive',
      `target_slice_quality_vs_s1 must be > ${S2_ADVISORY_THRESHOLDS.target_slice_quality_vs_s1_gt}, got ${metrics.target_slice_quality_vs_s1}`,
    );
  }

  const status =
    hasEvalSummary &&
    evalSummaryStatus === 'pass' &&
    Object.values(thresholdChecks).every(Boolean)
      ? 'pass'
      : 'fail';

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_advisory_gate',
    advisory_mode: true,
    thresholds: S2_ADVISORY_THRESHOLDS,
    input_checks: {
      release_eval_summary_present: hasEvalSummary,
      release_eval_summary_status: evalSummaryStatus,
      release_eval_summary_status_pass: evalSummaryStatus === 'pass',
    },
    metrics,
    threshold_checks: thresholdChecks,
    route_counts: evalSummary?.route_counts || {},
    readiness_guard_block_count: toNumber(evalSummary?.readiness_guard_block_count, 0),
    readiness_guard_reason_counts: evalSummary?.readiness_guard_reason_counts || {},
    readiness_effective_depth_source_counts: evalSummary?.readiness_effective_depth_source_counts || {},
    fallback_reason_counts: evalSummary?.fallback_reason_counts || {},
    dependency_status_counts: evalSummary?.dependency_status_counts || {},
    top_failing_cases: evalSummary?.top_failing_cases || [],
    status,
    blocker_categories: collectBlockerCategories(blockers),
    blockers,
    blocking_reasons: blockers.map((item) => item.message),
  };
}

export function buildS2ReleaseDecision({
  advisoryGateSummary = null,
  s1ContractGate = null,
  s1MetricGate = null,
  workflowInvariant = null,
  evalSummary = null,
  evalSummarySchemaCheck = null,
} = {}) {
  const checks = {
    advisory_gate_present: Boolean(advisoryGateSummary),
    advisory_gate_pass: advisoryGateSummary?.status === 'pass',
    advisory_gate_failure_explicit:
      advisoryGateSummary?.status === 'pass' ||
      (Array.isArray(advisoryGateSummary?.blockers) && advisoryGateSummary.blockers.length > 0),
    s1_contract_gate_present: Boolean(s1ContractGate),
    s1_contract_gate_pass: s1ContractGate?.all_green === true,
    s1_metric_gate_present: Boolean(s1MetricGate),
    s1_metric_gate_pass: s1MetricGate?.status === 'pass',
    s1_metric_gate_mode_required_fail_closed: s1MetricGate?.gate_mode === 'required_fail_closed',
    workflow_invariant_present: Boolean(workflowInvariant),
    workflow_invariant_pass: workflowInvariant?.status === 'pass',
    workflow_contract_advisory_only: workflowInvariant?.gate?.advisory_only === true,
    s2_advisory_workflow_non_blocking:
      workflowInvariant?.status === 'pass' && workflowInvariant?.gate?.advisory_only === true,
    eval_summary_present: Boolean(evalSummary),
    eval_summary_schema_check_present: Boolean(evalSummarySchemaCheck),
    eval_summary_schema_check_pass: evalSummarySchemaCheck?.status === 'pass',
    eval_summary_schema_valid: evalSummarySchemaCheck?.schema_valid === true,
    eval_summary_semantic_valid: evalSummarySchemaCheck?.semantic_valid === true,
    s2_readiness_failures_explicit:
      evalSummary?.status === 'pass' ||
      (Array.isArray(evalSummary?.release_blockers) && evalSummary.release_blockers.length > 0) ||
      (Array.isArray(advisoryGateSummary?.blockers) && advisoryGateSummary.blockers.length > 0),
  };
  const advisoryCandidateReady =
    checks.advisory_gate_pass &&
    checks.s1_contract_gate_pass &&
    checks.s1_metric_gate_pass &&
    checks.s1_metric_gate_mode_required_fail_closed &&
    checks.workflow_invariant_pass;
  const releaseReady = advisoryCandidateReady;
  const blockers = [];

  if (!checks.advisory_gate_present) {
    pushBlocker(
      blockers,
      'release_evidence',
      'advisory_gate_summary_missing',
      'fresh S2 advisory gate summary is missing',
    );
  } else if (!checks.advisory_gate_pass) {
    if (Array.isArray(advisoryGateSummary?.blockers) && advisoryGateSummary.blockers.length > 0) {
      appendBlockers(blockers, advisoryGateSummary.blockers);
    } else {
      pushBlocker(
        blockers,
        's2_advisory_readiness',
        'advisory_gate_not_passed',
        'S2 advisory gate not passed',
      );
    }
  }
  if (evalSummary?.status && evalSummary.status !== 'pass') {
    appendBlockers(blockers, evalSummary?.release_blockers);
  }

  if (!checks.s1_contract_gate_present) {
    pushBlocker(
      blockers,
      'required_gates',
      's1_contract_gate_missing',
      'fresh S1 Contract Gate artifact is missing',
    );
  } else if (!checks.s1_contract_gate_pass) {
    pushBlocker(
      blockers,
      'required_gates',
      's1_contract_gate_not_green',
      'S1 Contract Gate is not green',
    );
  }

  if (!checks.s1_metric_gate_present) {
    pushBlocker(
      blockers,
      'required_gates',
      's1_metric_gate_missing',
      'fresh S1 Metric Gate artifact is missing',
    );
  } else {
    if (!checks.s1_metric_gate_pass) {
      pushBlocker(
        blockers,
        'required_gates',
        's1_metric_gate_not_pass',
        'S1 Metric Gate (Required) is not pass',
      );
    }
    if (!checks.s1_metric_gate_mode_required_fail_closed) {
      pushBlocker(
        blockers,
        'required_gates',
        's1_metric_gate_mode_not_required_fail_closed',
        'S1 Metric Gate mode is not required_fail_closed',
      );
    }
  }

  if (!checks.workflow_invariant_present) {
    pushBlocker(
      blockers,
      'release_policy',
      'workflow_invariant_missing',
      'fresh workflow invariant artifact is missing',
    );
  } else if (!checks.workflow_invariant_pass) {
    const workflowBlockedReasons = Array.isArray(workflowInvariant?.blocked_reasons)
      ? workflowInvariant.blocked_reasons
      : [];
    if (workflowBlockedReasons.includes('s2_advisory_workflow_present')) {
      pushBlocker(
        blockers,
        'release_policy',
        's2_advisory_workflow_missing',
        'the S2 advisory workflow file is missing, so the non-blocking release contract cannot be verified',
      );
    }
    if (workflowBlockedReasons.includes('s2_advisory_job_name_is_non_required')) {
      pushBlocker(
        blockers,
        'release_policy',
        's2_advisory_workflow_not_non_blocking',
        'the S2 advisory workflow no longer proves a non-blocking advisory-only release posture',
      );
    }
    if (!workflowBlockedReasons.includes('s2_advisory_workflow_present') &&
      !workflowBlockedReasons.includes('s2_advisory_job_name_is_non_required')) {
      pushBlocker(
        blockers,
        'release_policy',
        'workflow_invariant_not_pass',
        'workflow invariants are not green',
      );
    }
  }

  const defaultRoutePromotionReady =
    advisoryCandidateReady &&
    checks.workflow_contract_advisory_only === false;

  const decision = defaultRoutePromotionReady ? 'promote' : 'stay_advisory_only';
  const releaseMode = decision === 'promote' ? 'default_route' : 'advisory_only';
  const effectiveDefaultProductionRoute =
    decision === 'promote' ? 's2_augmentation' : 'b_simplified_retrieval_s1_v1';
  const s2DefaultRouteAllowed = defaultRoutePromotionReady;
  const safeHoldReady =
    checks.s1_contract_gate_pass &&
    checks.s1_metric_gate_pass &&
    checks.s1_metric_gate_mode_required_fail_closed &&
    checks.s2_advisory_workflow_non_blocking &&
    checks.eval_summary_schema_check_pass &&
    checks.eval_summary_schema_valid &&
    checks.eval_summary_semantic_valid &&
    checks.s2_readiness_failures_explicit &&
    decision === 'stay_advisory_only' &&
    releaseMode === 'advisory_only' &&
    effectiveDefaultProductionRoute === 'b_simplified_retrieval_s1_v1' &&
    defaultRoutePromotionReady === false;
  const legacyReleasePosture = advisoryCandidateReady ? 'go_s2_advisory_candidate' : 'hold_s2_keep_s1_default';

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_release_decision',
    release_state: safeHoldReady ? 'safe_advisory_hold' : 'advisory_hold_governance_blocked',
    release_mode: releaseMode,
    s1_default_production_route_must_remain: 'b_simplified_retrieval_s1_v1',
    effective_default_production_route: effectiveDefaultProductionRoute,
    checks,
    decision,
    release_ready: releaseReady,
    advisory_candidate_ready: advisoryCandidateReady,
    default_route_promotion_ready: defaultRoutePromotionReady,
    s2_default_route_allowed: s2DefaultRouteAllowed,
    s2_advisory_workflow_non_blocking: checks.s2_advisory_workflow_non_blocking,
    s2_advisory_workflow_required: false,
    s2_advisory_workflow_non_required: checks.s2_advisory_workflow_non_blocking,
    s2_advisory_workflow_non_blocking_required_for_safe_hold: true,
    s2_advisory_workflow_advisory_only_contract: checks.workflow_contract_advisory_only,
    s2_eval_summary_present: checks.eval_summary_present || evalSummarySchemaCheck?.eval_summary_present === true,
    s2_eval_status: evalSummary?.status || null,
    s2_eval_summary_schema_valid: checks.eval_summary_schema_valid,
    safe_hold_ready: safeHoldReady,
    safe_to_merge_governance_patch: safeHoldReady && !defaultRoutePromotionReady,
    legacy_release_posture: legacyReleasePosture,
    blocker_categories: collectBlockerCategories(blockers),
    blockers,
    blocking_reasons: blockers.map((item) => item.message),
    next_actions: decision === 'promote'
      ? [
          'promote S2 as the default route for the approved scope',
          'update downstream rollout and operator surfaces to reflect the promoted route',
        ]
      : releaseReady
        ? [
            'keep S1 as default production path',
            'treat S2 as advisory-ready only until default-route approval conditions are explicitly released',
          ]
        : [
            'keep S1 as default production path',
            'refresh missing or failing release-authority inputs before reconsidering default-route promotion',
          ],
  };
}

export function buildS2ReleaseGovernanceGate({
  releaseDecision = null,
  evalSummarySchemaCheck = null,
  advisoryGateSummary = null,
  workflowInvariant = null,
  s1ContractGate = null,
  s1MetricGate = null,
} = {}) {
  const blockers = [];
  const warnings = [];
  const warningReasons = [];
  const checks = {
    release_decision_present: Boolean(releaseDecision),
    release_decision_stay_advisory_only: releaseDecision?.decision === 'stay_advisory_only',
    release_mode_advisory_only: releaseDecision?.release_mode === 'advisory_only',
    effective_default_route_s1:
      releaseDecision?.effective_default_production_route === 'b_simplified_retrieval_s1_v1',
    s1_default_route_required:
      releaseDecision?.s1_default_production_route_must_remain === 'b_simplified_retrieval_s1_v1',
    default_route_promotion_not_ready: releaseDecision?.default_route_promotion_ready === false,
    s2_default_route_not_allowed: releaseDecision?.s2_default_route_allowed === false,
    safe_hold_ready: releaseDecision?.safe_hold_ready === true,
    safe_to_merge_governance_patch: releaseDecision?.safe_to_merge_governance_patch === true,
    eval_schema_check_present: Boolean(evalSummarySchemaCheck),
    eval_schema_check_pass: evalSummarySchemaCheck?.status === 'pass',
    eval_summary_present: evalSummarySchemaCheck?.eval_summary_present === true,
    eval_schema_valid: evalSummarySchemaCheck?.schema_valid === true,
    eval_semantic_valid: evalSummarySchemaCheck?.semantic_valid === true,
    advisory_gate_present: Boolean(advisoryGateSummary),
    advisory_gate_advisory_mode: advisoryGateSummary?.advisory_mode === true,
    advisory_gate_failure_explicit:
      advisoryGateSummary?.status === 'pass' ||
      (Array.isArray(advisoryGateSummary?.blockers) && advisoryGateSummary.blockers.length > 0),
    workflow_invariant_present: Boolean(workflowInvariant),
    workflow_invariant_pass: workflowInvariant?.status === 'pass',
    workflow_contract_advisory_only: workflowInvariant?.gate?.advisory_only === true,
    s1_contract_gate_pass: s1ContractGate?.all_green === true,
    s1_metric_gate_pass: s1MetricGate?.status === 'pass',
    s1_metric_gate_required_fail_closed: s1MetricGate?.gate_mode === 'required_fail_closed',
  };

  if (!checks.release_decision_present) {
    pushBlocker(blockers, 'release_policy', 'release_decision_missing', 'release decision artifact is missing');
  } else {
    if (!checks.release_decision_stay_advisory_only) {
      pushBlocker(
        blockers,
        'release_policy',
        'release_decision_not_stay_advisory_only',
        'release decision must remain stay_advisory_only in this governance patch',
      );
    }
    if (!checks.release_mode_advisory_only) {
      pushBlocker(blockers, 'release_policy', 'release_mode_not_advisory_only', 'release mode must remain advisory_only');
    }
    if (!checks.effective_default_route_s1) {
      pushBlocker(
        blockers,
        'release_policy',
        'effective_default_route_not_s1',
        'effective default production route must remain b_simplified_retrieval_s1_v1',
      );
    }
    if (!checks.s1_default_route_required) {
      pushBlocker(
        blockers,
        'release_policy',
        's1_default_route_requirement_drift',
        'S1 default production route requirement drifted',
      );
    }
    if (!checks.default_route_promotion_not_ready) {
      pushBlocker(
        blockers,
        'release_policy',
        'default_route_promotion_ready_true',
        'default_route_promotion_ready must remain false in this governance patch',
      );
    }
    if (!checks.s2_default_route_not_allowed) {
      pushBlocker(
        blockers,
        'release_policy',
        's2_default_route_allowed_true',
        's2_default_route_allowed must remain false in this governance patch',
      );
    }
    if (!checks.safe_hold_ready) {
      pushBlocker(
        blockers,
        'release_policy',
        'safe_hold_ready_not_true',
        'release decision must explicitly mark safe_hold_ready true',
      );
    }
  }

  if (!checks.eval_schema_check_present) {
    pushBlocker(
      blockers,
      'release_evidence',
      'eval_summary_schema_check_missing',
      'S2 eval summary schema check artifact is missing',
    );
  } else {
    if (!checks.eval_schema_check_pass) {
      pushBlocker(
        blockers,
        'release_evidence',
        'eval_summary_schema_check_not_pass',
        'S2 eval summary schema check must pass',
      );
    }
    if (!checks.eval_summary_present) {
      pushBlocker(blockers, 'release_evidence', 'eval_summary_missing', 'S2 eval summary is missing');
    }
    if (!checks.eval_schema_valid) {
      pushBlocker(blockers, 'release_evidence', 'eval_summary_schema_invalid', 'S2 eval summary schema is invalid');
    }
    if (!checks.eval_semantic_valid) {
      pushBlocker(blockers, 'release_evidence', 'eval_summary_semantic_invalid', 'S2 eval summary semantics are invalid');
    }
  }

  if (!checks.advisory_gate_present) {
    pushBlocker(blockers, 'release_evidence', 'advisory_gate_summary_missing', 'S2 advisory gate summary is missing');
  } else {
    if (!checks.advisory_gate_advisory_mode) {
      pushBlocker(blockers, 'release_policy', 'advisory_gate_not_advisory_mode', 'S2 advisory gate must be advisory_mode');
    }
    if (advisoryGateSummary.status === 'fail' && checks.advisory_gate_failure_explicit) {
      warnings.push({
        code: 's2_advisory_gate_failed_but_safe_hold_explicit',
        message: 'S2 advisory gate failed, but blockers are explicit and production remains on S1',
      });
      warningReasons.push('s2_advisory_gate_failed_but_safe_hold_explicit');
    } else if (!checks.advisory_gate_failure_explicit) {
      pushBlocker(
        blockers,
        'release_evidence',
        'advisory_gate_failed_without_explicit_blockers',
        'S2 advisory gate failure must include explicit blockers',
      );
    }
  }

  if (!checks.workflow_invariant_present) {
    pushBlocker(blockers, 'workflow_policy', 'workflow_invariant_missing', 'workflow invariant artifact is missing');
  } else {
    if (!checks.workflow_invariant_pass) {
      pushBlocker(blockers, 'workflow_policy', 'workflow_invariant_not_pass', 'workflow invariant must pass');
    }
    if (!checks.workflow_contract_advisory_only) {
      pushBlocker(
        blockers,
        'workflow_policy',
        'workflow_contract_not_advisory_only',
        'S2 workflow contract must remain advisory_only in this governance patch',
      );
    }
  }

  if (!checks.s1_contract_gate_pass) {
    pushBlocker(blockers, 'required_gates', 's1_contract_gate_not_green', 'S1 Contract Gate must be green');
  }
  if (!checks.s1_metric_gate_pass) {
    pushBlocker(blockers, 'required_gates', 's1_metric_gate_not_pass', 'S1 Metric Gate must pass');
  }
  if (!checks.s1_metric_gate_required_fail_closed) {
    pushBlocker(
      blockers,
      'required_gates',
      's1_metric_gate_not_required_fail_closed',
      'S1 Metric Gate must remain required_fail_closed',
    );
  }

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_release_governance_gate',
    status: blockers.length === 0 ? 'pass' : 'fail',
    release_state: blockers.length === 0 ? 'safe_advisory_hold' : 'safe_advisory_hold_blocked',
    safe_hold_ready: blockers.length === 0 && checks.safe_hold_ready,
    safe_to_merge_governance_patch: blockers.length === 0 && checks.safe_to_merge_governance_patch,
    checks,
    warnings,
    warning_reasons: warningReasons,
    blocker_categories: collectBlockerCategories(blockers),
    blockers,
    blocked_reasons: blockers.map((item) => item.code),
  };
}

export function renderS2ReleaseDecisionReport({
  decisionPayload = {},
  sourcePaths = {},
} = {}) {
  const blockers = Array.isArray(decisionPayload.blockers) ? decisionPayload.blockers : [];
  const lines = [
    '# RAG S2 Release Decision Report',
    '',
    `- Generated at: \`${decisionPayload.generated_at || 'unknown'}\``,
    `- Decision: \`${decisionPayload.decision || 'unknown'}\``,
    `- Release mode: \`${decisionPayload.release_mode || 'unknown'}\``,
    `- Effective default production route: \`${decisionPayload.effective_default_production_route || 'unknown'}\``,
    `- Advisory candidate ready: \`${Boolean(decisionPayload.advisory_candidate_ready)}\``,
    `- Default-route promotion ready: \`${Boolean(decisionPayload.default_route_promotion_ready)}\``,
    `- Safe hold ready: \`${Boolean(decisionPayload.safe_hold_ready)}\``,
    `- Safe to merge governance patch: \`${Boolean(decisionPayload.safe_to_merge_governance_patch)}\``,
    `- Legacy release posture: \`${decisionPayload.legacy_release_posture || 'unknown'}\``,
    '',
    '## Blocker Categories',
    '',
  ];

  if ((decisionPayload.blocker_categories || []).length === 0) {
    lines.push('- none');
  } else {
    for (const category of decisionPayload.blocker_categories || []) {
      lines.push(`- ${category}`);
    }
  }

  lines.push('', '## Concrete Blockers', '');
  if (blockers.length === 0) {
    lines.push('- none');
  } else {
    for (const blocker of blockers) {
      lines.push(`- [${blocker.category}] ${blocker.code}: ${blocker.message}`);
    }
  }

  lines.push('', '## Input Evidence', '');
  lines.push(`- advisory_gate: \`${sourcePaths.advisoryGate || 'unknown'}\``);
  lines.push(`- s1_contract_gate: \`${sourcePaths.s1ContractGate || 'unknown'}\``);
  lines.push(`- s1_metric_gate: \`${sourcePaths.s1MetricGate || 'unknown'}\``);
  lines.push(`- workflow_invariant: \`${sourcePaths.workflowInvariant || 'unknown'}\``);
  lines.push('');

  return `${lines.join('\n')}\n`;
}
