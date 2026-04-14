import {
  evaluateHitlRoutingDecision,
  HITL_REASON_CODES,
  HITL_ROUTING_TARGETS,
} from '../lib/question-analysis/hitl-routing-contract.js';

describe('hitl-routing-contract: evaluateHitlRoutingDecision', () => {
  test('high-confidence result does not require HITL', () => {
    const result = evaluateHitlRoutingDecision({
      confidence_band: 'high',
      low_confidence_posture: null,
      analysis_audit_metadata: { hint_conflict: false },
    });

    expect(result.hitl_required).toBe(false);
    expect(result.hitl_reason_codes).toEqual([]);
    expect(result.hitl_routing_target).toBeNull();
  });

  test('medium-confidence result does not require HITL', () => {
    const result = evaluateHitlRoutingDecision({
      confidence_band: 'medium',
      low_confidence_posture: null,
      analysis_audit_metadata: { hint_conflict: false },
    });

    expect(result.hitl_required).toBe(false);
  });

  test('low-confidence band triggers HITL', () => {
    const result = evaluateHitlRoutingDecision({
      confidence_band: 'low',
      low_confidence_posture: null,
    });

    expect(result.hitl_required).toBe(true);
    expect(result.hitl_reason_codes).toContain(HITL_REASON_CODES.LOW_CONFIDENCE_BAND);
    expect(result.hitl_routing_target).toBe(HITL_ROUTING_TARGETS.MANUAL_REVIEW_QUEUE);
  });

  test('conservative_only posture triggers HITL', () => {
    const result = evaluateHitlRoutingDecision({
      confidence_band: 'medium',
      low_confidence_posture: { posture: 'conservative_only' },
    });

    expect(result.hitl_required).toBe(true);
    expect(result.hitl_reason_codes).toContain(HITL_REASON_CODES.CONSERVATIVE_POSTURE_ACTIVE);
  });

  test('hint conflict triggers HITL', () => {
    const result = evaluateHitlRoutingDecision({
      confidence_band: 'high',
      analysis_audit_metadata: { hint_conflict: true },
    });

    expect(result.hitl_required).toBe(true);
    expect(result.hitl_reason_codes).toContain(HITL_REASON_CODES.HINT_CONFLICT);
  });

  test('multiple reasons are accumulated', () => {
    const result = evaluateHitlRoutingDecision({
      confidence_band: 'low',
      low_confidence_posture: { posture: 'conservative_only' },
      analysis_audit_metadata: { hint_conflict: true },
    });

    expect(result.hitl_required).toBe(true);
    expect(result.hitl_reason_codes).toHaveLength(3);
  });

  test('empty input does not require HITL', () => {
    const result = evaluateHitlRoutingDecision({});

    expect(result.hitl_required).toBe(false);
    expect(result.hitl_reason_codes).toEqual([]);
    expect(result.hitl_routing_target).toBeNull();
  });

  test('defaults to no HITL when called with no arguments', () => {
    const result = evaluateHitlRoutingDecision();

    expect(result.hitl_required).toBe(false);
  });
});
