import {
  buildS2AdvisoryGateSummary,
  buildS2ReleaseDecision,
  renderS2ReleaseDecisionReport,
} from '../lib/s2_advisory_gate.js';

describe('S2 advisory gate', () => {
  it('fails when the release eval summary is missing', () => {
    const summary = buildS2AdvisoryGateSummary();

    expect(summary.status).toBe('fail');
    expect(summary.blocker_categories).toContain('release_evidence');
    expect(summary.blocking_reasons).toEqual(
      expect.arrayContaining(['release eval summary missing']),
    );
  });

  it('fails advisory gate when fallback is above threshold and no quality gain', () => {
    const summary = buildS2AdvisoryGateSummary({
      evalSummary: {
        topic_leakage_rate: 0,
        evidence_traceability_rate: 1,
        fallback_rate: 0.5,
        target_slice_quality_vs_s1: 0,
      },
    });

    expect(summary.status).toBe('fail');
    expect(summary.threshold_checks.topic_leakage_rate).toBe(true);
    expect(summary.threshold_checks.evidence_traceability_rate).toBe(true);
    expect(summary.threshold_checks.fallback_rate).toBe(false);
    expect(summary.threshold_checks.target_slice_quality_vs_s1).toBe(false);
    expect(summary.blocker_categories).toContain('s2_advisory_readiness');
  });

  it('builds hold decision when advisory gate is not pass', () => {
    const decision = buildS2ReleaseDecision({
      advisoryGateSummary: { status: 'fail' },
      s1ContractGate: { all_green: true },
      s1MetricGate: { status: 'pass', gate_mode: 'required_fail_closed' },
      workflowInvariant: { status: 'pass', gate: { advisory_only: false } },
    });

    expect(decision.decision).toBe('stay_advisory_only');
    expect(decision.release_ready).toBe(false);
    expect(decision.blocker_categories).toContain('s2_advisory_readiness');
  });

  it('keeps S2 advisory only when the active contract still locks the default route', () => {
    const decision = buildS2ReleaseDecision({
      advisoryGateSummary: { status: 'pass' },
      s1ContractGate: { all_green: true },
      s1MetricGate: { status: 'pass', gate_mode: 'required_fail_closed' },
      workflowInvariant: { status: 'pass', gate: { advisory_only: true } },
      evalSummary: { status: 'pass', release_blockers: [] },
      evalSummarySchemaCheck: { status: 'pass', eval_summary_present: true, schema_valid: true, semantic_valid: true },
    });

    expect(decision.decision).toBe('stay_advisory_only');
    expect(decision.release_ready).toBe(true);
    expect(decision.default_route_promotion_ready).toBe(false);
    expect(decision.release_state).toBe('safe_advisory_hold');
    expect(decision.safe_hold_ready).toBe(true);
    expect(decision.s2_default_route_allowed).toBe(false);

    const report = renderS2ReleaseDecisionReport({
      decisionPayload: decision,
      sourcePaths: {
        advisoryGate: 'runs/backend/rag_s2_advisory_gate_summary.json',
        s1ContractGate: 'runs/backend/rag_s1_contract_gate_summary.json',
        s1MetricGate: 'runs/backend/rag_s1_metric_gate_summary.json',
        workflowInvariant: 'runs/backend/rag_s2_workflow_invariant_check.json',
      },
    });

    expect(report).toContain('Decision: `stay_advisory_only`');
    expect(report).toContain('Safe hold ready: `true`');
  });

  it('marks safe advisory hold when S2 readiness fails but governance inputs are explicit', () => {
    const decision = buildS2ReleaseDecision({
      advisoryGateSummary: {
        status: 'fail',
        blockers: [
          {
            category: 's2_advisory_readiness',
            code: 'fallback_rate_above_threshold',
            message: 'fallback_rate must be <= 0.2, got 0.5',
          },
        ],
      },
      s1ContractGate: { all_green: true },
      s1MetricGate: { status: 'pass', gate_mode: 'required_fail_closed' },
      workflowInvariant: { status: 'pass', gate: { advisory_only: true } },
      evalSummary: {
        status: 'fail',
        release_blockers: [
          {
            category: 'runtime_budget',
            code: 's2_timeout_present',
            message: 'S2_TIMEOUT fallback occurred 1 time(s)',
          },
        ],
      },
      evalSummarySchemaCheck: { status: 'pass', eval_summary_present: true, schema_valid: true, semantic_valid: true },
    });

    expect(decision.release_state).toBe('safe_advisory_hold');
    expect(decision.decision).toBe('stay_advisory_only');
    expect(decision.release_mode).toBe('advisory_only');
    expect(decision.safe_hold_ready).toBe(true);
    expect(decision.safe_to_merge_governance_patch).toBe(true);
    expect(decision.advisory_candidate_ready).toBe(false);
    expect(decision.default_route_promotion_ready).toBe(false);
    expect(decision.s2_default_route_allowed).toBe(false);
    expect(decision.effective_default_production_route).toBe('b_simplified_retrieval_s1_v1');
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 's2_timeout_present' }),
      ]),
    );
  });

  it('marks promotion as release-ready when all non-policy gates pass', () => {
    const decision = buildS2ReleaseDecision({
      advisoryGateSummary: { status: 'pass' },
      s1ContractGate: { all_green: true },
      s1MetricGate: { status: 'pass', gate_mode: 'required_fail_closed' },
      workflowInvariant: { status: 'pass', gate: { advisory_only: false } },
    });

    expect(decision.decision).toBe('promote');
    expect(decision.release_ready).toBe(true);
    expect(decision.advisory_candidate_ready).toBe(true);
    expect(decision.default_route_promotion_ready).toBe(true);
    expect(decision.legacy_release_posture).toBe('go_s2_advisory_candidate');
  });
});
