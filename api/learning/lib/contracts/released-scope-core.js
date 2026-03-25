export const RELEASE_SCOPE_STATUSES = Object.freeze({
  RELEASED_SCORING: 'released_scoring',
  NON_RELEASED_FALLBACK: 'non_released_fallback',
});

export const LEARNING_FALLBACK_MODES = Object.freeze({
  NON_RELEASED_FALLBACK: 'non_released_fallback',
});

export const FALLBACK_REASON_CODES = Object.freeze({
  MISSING_QUESTION_TYPE: 'missing_question_type',
  NON_PILOT_QUESTION_TYPE: 'non_pilot_question_type',
  MISSING_RELEASED_FAMILY_EVIDENCE: 'missing_released_family_evidence',
  MISSING_RELEASED_RUBRIC: 'missing_released_rubric',
  MISSING_CLASSIFICATION_CONFIDENCE: 'missing_classification_confidence',
  UNVALIDATED_UNCERTAINTY_POSTURE: 'unvalidated_uncertainty_posture',
});

export const LEARNING_SIGNAL_POSTURES = Object.freeze({
  AUTHORITATIVE_SCORING: 'authoritative_scoring',
  CONSERVATIVE_FALLBACK: 'conservative_fallback',
});

export function normalizeQuestionTypeId(questionTypeId) {
  return typeof questionTypeId === 'string' ? questionTypeId.trim() : '';
}

function normalizeQuestionTypeReleaseState(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeClassificationConfidence(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasReleasedRubricRef(candidateRubricRefs) {
  return Array.isArray(candidateRubricRefs)
    && candidateRubricRefs.some(
      (ref) => ref?.kind === 'rubric_release' && ref?.release_state === 'released',
    );
}

function hasValidatedUncertaintyPosture(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  if (value.validated === true || value.is_validated === true) {
    return true;
  }

  return value.status === 'validated';
}

export function buildFallbackPosture(fallbackReasonCode, classificationConfidence) {
  return {
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: fallbackReasonCode,
    classification_confidence: classificationConfidence,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  };
}

export function isSeededPilotQuestionType(questionTypeId, questionTypeReleaseState = null) {
  const normalizedQuestionTypeId = normalizeQuestionTypeId(
    typeof questionTypeId === 'object' && questionTypeId !== null
      ? questionTypeId.questionTypeId ?? questionTypeId.question_type_id
      : questionTypeId,
  );
  const normalizedReleaseState = normalizeQuestionTypeReleaseState(
    typeof questionTypeId === 'object' && questionTypeId !== null
      ? (
        questionTypeId.questionTypeReleaseState
        ?? questionTypeId.question_type_release_state
        ?? questionTypeId.release_state
      )
      : questionTypeReleaseState,
  );

  return Boolean(normalizedQuestionTypeId) && normalizedReleaseState === 'released';
}

export function resolveInlineReleasedScoringPosture({
  questionTypeId,
  questionTypeReleaseState = null,
  candidateRubricRefs = [],
  uncertaintyValidated = false,
  uncertaintyPosture = null,
  classificationConfidence = null,
  isPilotQuestionType = null,
} = {}) {
  const normalizedQuestionType = normalizeQuestionTypeId(questionTypeId);
  const normalizedClassification = normalizeClassificationConfidence(classificationConfidence);
  const validatedUncertainty = hasValidatedUncertaintyPosture(
    uncertaintyPosture ?? uncertaintyValidated,
  );
  const pilotQuestionTypeMatch = typeof isPilotQuestionType === 'boolean'
    ? isPilotQuestionType
    : isSeededPilotQuestionType(normalizedQuestionType, questionTypeReleaseState);

  if (!normalizedQuestionType) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.MISSING_QUESTION_TYPE,
      normalizedClassification,
    );
  }

  if (!pilotQuestionTypeMatch) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
      normalizedClassification,
    );
  }

  if (!hasReleasedRubricRef(candidateRubricRefs)) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.MISSING_RELEASED_RUBRIC,
      normalizedClassification,
    );
  }

  if (normalizedClassification === null) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.MISSING_CLASSIFICATION_CONFIDENCE,
      normalizedClassification,
    );
  }

  if (!validatedUncertainty) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.UNVALIDATED_UNCERTAINTY_POSTURE,
      normalizedClassification,
    );
  }

  return {
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: normalizedClassification,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  };
}
