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
  LOW_CLASSIFICATION_CONFIDENCE: 'low_classification_confidence',
  UNVALIDATED_UNCERTAINTY_POSTURE: 'unvalidated_uncertainty_posture',
  SUBJECT_ADAPTER_CAPABILITY_NOT_ENABLED: 'subject_adapter_capability_not_enabled',
});

export const LEARNING_SIGNAL_POSTURES = Object.freeze({
  AUTHORITATIVE_SCORING: 'authoritative_scoring',
  CONSERVATIVE_FALLBACK: 'conservative_fallback',
});

export const RELEASED_SCOPE_CHECK_CONTRACT_VERSION = 'phase_1a_released_scope_check.v1';

export const CONFIDENCE_BANDS = Object.freeze(['low', 'medium', 'high']);
export const LOW_CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.8;

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

export function normalizeConfidenceBand(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return CONFIDENCE_BANDS.includes(normalized) ? normalized : null;
}

export function deriveConfidenceBand(classificationConfidence) {
  const normalizedClassification = normalizeClassificationConfidence(classificationConfidence);
  if (normalizedClassification === null) {
    return null;
  }

  if (normalizedClassification < LOW_CLASSIFICATION_CONFIDENCE_THRESHOLD) {
    return 'low';
  }

  if (normalizedClassification < 0.85) {
    return 'medium';
  }

  return 'high';
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

function buildExplanationFactor(code, status, summary, value = null) {
  return {
    code,
    status,
    summary,
    ...(value !== null && value !== undefined ? { value } : {}),
  };
}

function summarizeFallbackReason(fallbackReasonCode) {
  switch (fallbackReasonCode) {
    case FALLBACK_REASON_CODES.MISSING_QUESTION_TYPE:
      return 'the question type is still missing';
    case FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE:
      return 'the question type is outside the released authoritative slice';
    case FALLBACK_REASON_CODES.MISSING_RELEASED_FAMILY_EVIDENCE:
      return 'released family evidence is still missing';
    case FALLBACK_REASON_CODES.MISSING_RELEASED_RUBRIC:
      return 'a released rubric is still missing';
    case FALLBACK_REASON_CODES.MISSING_CLASSIFICATION_CONFIDENCE:
      return 'classification confidence is still missing';
    case FALLBACK_REASON_CODES.LOW_CLASSIFICATION_CONFIDENCE:
      return 'classification confidence is too low for authoritative scoring';
    case FALLBACK_REASON_CODES.UNVALIDATED_UNCERTAINTY_POSTURE:
      return 'validated uncertainty posture is still missing';
    case FALLBACK_REASON_CODES.SUBJECT_ADAPTER_CAPABILITY_NOT_ENABLED:
      return 'the current subject remains in a conservative read-only posture';
    default:
      return 'the released-scoring gate is still unresolved';
  }
}

function isReleasedScoringCheckSatisfied(posture = {}) {
  return Boolean(
    posture.release_scope_status === RELEASE_SCOPE_STATUSES.RELEASED_SCORING
    && posture.authoritative_scoring_allowed === true
    && posture.fallback_mode === null
    && posture.fallback_reason_code === null,
  );
}

export function buildReleasedScopeCheck(posture = {}) {
  const releasedScoring = isReleasedScoringCheckSatisfied(posture);

  return {
    contract_version: RELEASED_SCOPE_CHECK_CONTRACT_VERSION,
    released_scoring: releasedScoring,
    non_released_fallback: !releasedScoring,
    release_scope_status: releasedScoring
      ? RELEASE_SCOPE_STATUSES.RELEASED_SCORING
      : RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    fallback_mode: releasedScoring
      ? null
      : (posture.fallback_mode || LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK),
    fallback_reason_code: releasedScoring ? null : (posture.fallback_reason_code ?? null),
    learning_signal_posture: releasedScoring
      ? LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING
      : LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
    allowed_outputs: {
      authoritative_score: releasedScoring,
      formal_point_judgement: releasedScoring,
      strong_positive_type_level_mastery: releasedScoring,
    },
  };
}

function buildReleasedScopeExplanation({
  posture = {},
  questionTypeId = null,
  questionTypeReleaseState = null,
  candidateRubricRefs = [],
  classificationConfidence = null,
  uncertaintyValidated = false,
  uncertaintyPosture = null,
  releasedFamilyEvidenceOk = null,
} = {}) {
  const normalizedQuestionTypeId = normalizeQuestionTypeId(questionTypeId);
  const normalizedReleaseState = normalizeQuestionTypeReleaseState(questionTypeReleaseState);
  const normalizedClassification = normalizeClassificationConfidence(
    classificationConfidence ?? posture.classification_confidence,
  );
  const releasedQuestionTypeMet = Boolean(normalizedQuestionTypeId) && normalizedReleaseState === 'released';
  const releasedRubricMet = hasReleasedRubricRef(candidateRubricRefs);
  const uncertaintyValidationMet = hasValidatedUncertaintyPosture(
    uncertaintyPosture ?? uncertaintyValidated,
  );
  const factors = [
    buildExplanationFactor(
      'released_question_type',
      releasedQuestionTypeMet ? 'met' : 'missing',
      releasedQuestionTypeMet
        ? `Released question type ${normalizedQuestionTypeId} is available.`
        : 'A released question type is required before authoritative scoring can apply.',
      normalizedQuestionTypeId || null,
    ),
    releasedFamilyEvidenceOk === null
      ? null
      : buildExplanationFactor(
        'released_family_evidence',
        releasedFamilyEvidenceOk ? 'met' : 'missing',
        releasedFamilyEvidenceOk
          ? 'Released family evidence is available for this question type.'
          : 'Released family evidence is still missing for this question type.',
      ),
    buildExplanationFactor(
      'released_rubric',
      releasedRubricMet ? 'met' : 'missing',
      releasedRubricMet
        ? 'A released rubric is available for this question type.'
        : 'A released rubric is required before authoritative scoring can apply.',
    ),
    buildExplanationFactor(
      'classification_confidence',
      normalizedClassification !== null ? 'met' : 'missing',
      normalizedClassification !== null
        ? `Classification confidence ${normalizedClassification} is available.`
        : 'Classification confidence is still required before authoritative scoring can apply.',
      normalizedClassification,
    ),
    buildExplanationFactor(
      'uncertainty_validation',
      uncertaintyValidationMet ? 'met' : 'missing',
      uncertaintyValidationMet
        ? 'Validated uncertainty posture is available.'
        : 'Validated uncertainty posture is still required before authoritative scoring can apply.',
    ),
  ].filter(Boolean);

  if (posture.authoritative_scoring_allowed) {
    return {
      posture: 'released_authoritative',
      summary:
        'Released authoritative scoring is active because the released question-type, family, rubric, confidence, and uncertainty gates are satisfied.',
      factors,
    };
  }

  return {
    posture: 'conservative_fallback',
    summary: `Fallback remains active because ${summarizeFallbackReason(posture.fallback_reason_code)}.`,
    factors,
  };
}

export function withReleasedScopeExplanation(posture, context = {}) {
  const withExplanation = {
    ...posture,
    explanation: buildReleasedScopeExplanation({
      posture,
      ...context,
    }),
  };

  return {
    ...withExplanation,
    released_scope_check: buildReleasedScopeCheck(withExplanation),
  };
}

export function buildFallbackPosture(fallbackReasonCode, classificationConfidence) {
  const posture = {
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: fallbackReasonCode,
    classification_confidence: classificationConfidence,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
    explanation: {
      posture: 'conservative_fallback',
      summary: `Fallback remains active because ${summarizeFallbackReason(fallbackReasonCode)}.`,
      factors: [],
    },
  };

  return {
    ...posture,
    released_scope_check: buildReleasedScopeCheck(posture),
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
  confidenceBand = null,
  isPilotQuestionType = null,
} = {}) {
  const normalizedQuestionType = normalizeQuestionTypeId(questionTypeId);
  const normalizedClassification = normalizeClassificationConfidence(classificationConfidence);
  const normalizedConfidenceBand = normalizeConfidenceBand(confidenceBand)
    || deriveConfidenceBand(normalizedClassification);
  const validatedUncertainty = hasValidatedUncertaintyPosture(
    uncertaintyPosture ?? uncertaintyValidated,
  );
  const pilotQuestionTypeMatch = typeof isPilotQuestionType === 'boolean'
    ? isPilotQuestionType
    : isSeededPilotQuestionType(normalizedQuestionType, questionTypeReleaseState);

  if (!normalizedQuestionType) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.MISSING_QUESTION_TYPE,
        normalizedClassification,
      ),
      {
        questionTypeId: normalizedQuestionType,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassification,
      },
    );
  }

  if (!pilotQuestionTypeMatch) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
        normalizedClassification,
      ),
      {
        questionTypeId: normalizedQuestionType,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassification,
      },
    );
  }

  if (!hasReleasedRubricRef(candidateRubricRefs)) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.MISSING_RELEASED_RUBRIC,
        normalizedClassification,
      ),
      {
        questionTypeId: normalizedQuestionType,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassification,
      },
    );
  }

  if (normalizedClassification === null) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.MISSING_CLASSIFICATION_CONFIDENCE,
        normalizedClassification,
      ),
      {
        questionTypeId: normalizedQuestionType,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassification,
      },
    );
  }

  if (normalizedConfidenceBand === 'low') {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.LOW_CLASSIFICATION_CONFIDENCE,
        normalizedClassification,
      ),
      {
        questionTypeId: normalizedQuestionType,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassification,
      },
    );
  }

  if (!validatedUncertainty) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.UNVALIDATED_UNCERTAINTY_POSTURE,
        normalizedClassification,
      ),
      {
        questionTypeId: normalizedQuestionType,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassification,
      },
    );
  }

  return withReleasedScopeExplanation({
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: normalizedClassification,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  }, {
    questionTypeId: normalizedQuestionType,
    questionTypeReleaseState,
    candidateRubricRefs,
    uncertaintyValidated,
    uncertaintyPosture,
    classificationConfidence: normalizedClassification,
  });
}
