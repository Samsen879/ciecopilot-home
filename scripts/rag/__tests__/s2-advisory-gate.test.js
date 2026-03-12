import {
  buildS2AdvisoryGateSummary,
  buildS2ReleaseDecision,
} from '../lib/s2_advisory_gate.js';

describe('S2 advisory gate', () => {
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
  });

  it('builds hold decision when advisory gate is not pass', () => {
    const decision = buildS2ReleaseDecision({
      advisoryGateSummary: { status: 'fail' },
      s1ContractGate: { all_green: true },
      s1MetricGate: { status: 'pass', gate_mode: 'required_fail_closed' },
    });
    expect(decision.decision).toBe('hold_s2_keep_s1_default');
    expect(decision.release_ready).toBe(false);
  });
});
