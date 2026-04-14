/**
 * HITL (Human-in-the-Loop) routing contract for low-confidence question analysis.
 *
 * This module provides a pure decision function that determines whether a
 * question analysis result should be flagged for human review. It does NOT
 * implement the operational queue, dashboard, or notification layer — those
 * are deferred to later operational phases.
 *
 * References:
 *   - docs/reports/2026-04-11-ao-next-phase-execution-roadmap.md §8.4.2
 *   - docs/reports/2026-04-12-phase-a-product-decision-record.md §4.2
 */

const HITL_REASON_CODES = Object.freeze({
  LOW_CONFIDENCE_BAND: 'low_confidence_band',
  CONSERVATIVE_POSTURE_ACTIVE: 'conservative_posture_active',
  HINT_CONFLICT: 'hint_conflict',
});

const HITL_ROUTING_TARGETS = Object.freeze({
  MANUAL_REVIEW_QUEUE: 'manual_review_queue',
});

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Evaluates whether a question analysis result should be routed to human review.
 *
 * @param {object} analysisResult - The question analysis result object.
 * @param {string} [analysisResult.confidence_band] - 'high', 'medium', or 'low'.
 * @param {object} [analysisResult.low_confidence_posture] - Low-confidence posture, if any.
 * @param {object} [analysisResult.analysis_audit_metadata] - Audit metadata from the analyzer.
 * @returns {{ hitl_required: boolean, hitl_reason_codes: string[], hitl_routing_target: string | null }}
 */
export function evaluateHitlRoutingDecision(analysisResult = {}) {
  const reasons = [];
  const confidenceBand = normalizeString(analysisResult.confidence_band);
  const posture = analysisResult.low_confidence_posture;
  const auditMetadata = analysisResult.analysis_audit_metadata;

  if (confidenceBand === 'low') {
    reasons.push(HITL_REASON_CODES.LOW_CONFIDENCE_BAND);
  }

  if (
    posture
    && typeof posture === 'object'
    && posture.posture === 'conservative_only'
  ) {
    reasons.push(HITL_REASON_CODES.CONSERVATIVE_POSTURE_ACTIVE);
  }

  if (
    auditMetadata
    && typeof auditMetadata === 'object'
    && auditMetadata.hint_conflict === true
  ) {
    reasons.push(HITL_REASON_CODES.HINT_CONFLICT);
  }

  const hitlRequired = reasons.length > 0;

  return {
    hitl_required: hitlRequired,
    hitl_reason_codes: reasons,
    hitl_routing_target: hitlRequired
      ? HITL_ROUTING_TARGETS.MANUAL_REVIEW_QUEUE
      : null,
  };
}

export { HITL_REASON_CODES, HITL_ROUTING_TARGETS };
