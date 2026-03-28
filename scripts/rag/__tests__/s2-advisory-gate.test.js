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
    });

    expect(decision.decision).toBe('stay_advisory_only');
    expect(decision.release_ready).toBe(true);
    expect(decision.default_route_promotion_ready).toBe(false);
    expect(decision.blocker_categories).toContain('release_policy');

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
    expect(report).toContain('release_policy');
  });
});
