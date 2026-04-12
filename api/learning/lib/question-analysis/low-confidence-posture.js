export const CONFIDENCE_BANDS = Object.freeze(['low', 'medium', 'high']);

export const LOW_CONFIDENCE_THRESHOLD = 0.8;
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const LOW_CONFIDENCE_FALLBACK_REASON = 'low_classification_confidence';

function normalizeConfidence(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeConfidenceBand(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return CONFIDENCE_BANDS.includes(normalized) ? normalized : null;
}

export function deriveConfidenceBand(classificationConfidence) {
  const normalizedConfidence = normalizeConfidence(classificationConfidence);
  if (normalizedConfidence === null) {
    return null;
  }

  if (normalizedConfidence < LOW_CONFIDENCE_THRESHOLD) {
    return 'low';
  }

  if (normalizedConfidence < HIGH_CONFIDENCE_THRESHOLD) {
    return 'medium';
  }

  return 'high';
}

export function buildLowConfidencePosture({
  classificationConfidence = null,
  confidenceBand = null,
} = {}) {
  const normalizedConfidence = normalizeConfidence(classificationConfidence);
  const normalizedBand = normalizeConfidenceBand(confidenceBand)
    || deriveConfidenceBand(normalizedConfidence);

  if (normalizedBand !== 'low') {
    return null;
  }

  return {
    posture: 'low_confidence',
    authoritative_scoring_allowed: false,
    fallback_reason_code: LOW_CONFIDENCE_FALLBACK_REASON,
    confidence_band: normalizedBand,
    classification_confidence: normalizedConfidence,
    threshold: LOW_CONFIDENCE_THRESHOLD,
    reasons: ['classification_confidence_below_threshold'],
  };
}
