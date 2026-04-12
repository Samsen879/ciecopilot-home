import {
  evaluateReleasedFamilyEvidenceGate,
  loadReleasedFamilyGateReceipt,
} from './released-family-gate.js';
import {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  buildFallbackPosture,
  normalizeClassificationConfidence,
  normalizeQuestionTypeId,
  resolveInlineReleasedScoringPosture as resolveCoreInlineReleasedScoringPosture,
  withReleasedScopeExplanation,
} from './released-scope-core.js';

function normalizeSeedMembershipInput(questionTypeId) {
  return normalizeQuestionTypeId(
    typeof questionTypeId === 'object' && questionTypeId !== null
      ? questionTypeId.questionTypeId ?? questionTypeId.question_type_id
      : questionTypeId,
  );
}

function normalizeReleaseState(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function loadReleasedScoringQuestionTypeIds() {
  let receipt;

  try {
    receipt = loadReleasedFamilyGateReceipt();
  } catch {
    return Object.freeze([]);
  }

  const questionTypeIds = Array.isArray(receipt?.question_type_results)
    ? [...new Set(receipt.question_type_results
      .filter((entry) => entry?.status === 'pass')
      .map((entry) => normalizeQuestionTypeId(entry?.question_type_id))
      .filter(Boolean))]
    : [];

  return Object.freeze(questionTypeIds);
}

const RELEASED_SCORING_QUESTION_TYPE_IDS = loadReleasedScoringQuestionTypeIds();

function resolveReleasedQuestionTypeMatch(
  questionTypeId,
  questionTypeReleaseState = null,
  isPilotQuestionType = null,
) {
  const releasedScopeMatch = isReleasedScoringQuestionType(questionTypeId);
  const releasedStateMatch = normalizeReleaseState(questionTypeReleaseState) === 'released';

  return (
    releasedScopeMatch
    && releasedStateMatch
    && (typeof isPilotQuestionType === 'boolean' ? isPilotQuestionType : true)
  );
}

export {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
};

export function isReleasedScoringQuestionType(questionTypeId) {
  return RELEASED_SCORING_QUESTION_TYPE_IDS.includes(normalizeSeedMembershipInput(questionTypeId));
}

export function isSeededPilotQuestionType(questionTypeId) {
  return isReleasedScoringQuestionType(questionTypeId);
}

export function resolveInlineReleasedScoringPosture({
  questionTypeId,
  questionTypeReleaseState = null,
  isPilotQuestionType = null,
  ...rest
} = {}) {
  return resolveCoreInlineReleasedScoringPosture({
    questionTypeId,
    questionTypeReleaseState,
    ...rest,
    isPilotQuestionType: resolveReleasedQuestionTypeMatch(
      questionTypeId,
      questionTypeReleaseState,
      isPilotQuestionType,
    ),
  });
}

export function resolveReleasedScoringPosture({
  questionTypeId,
  questionTypeReleaseState = null,
  candidateRubricRefs = [],
  uncertaintyValidated = false,
  uncertaintyPosture = null,
  classificationConfidence = null,
  confidenceBand = null,
  isPilotQuestionType = null,
  releaseEvidenceReceipt = null,
} = {}) {
  const normalizedQuestionTypeId = normalizeQuestionTypeId(questionTypeId);
  const normalizedClassificationConfidence = normalizeClassificationConfidence(classificationConfidence);
  const releasedQuestionTypeMatch = resolveReleasedQuestionTypeMatch(
    normalizedQuestionTypeId,
    questionTypeReleaseState,
    isPilotQuestionType,
  );

  if (!normalizedQuestionTypeId) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.MISSING_QUESTION_TYPE,
        normalizedClassificationConfidence,
      ),
      {
        questionTypeId: normalizedQuestionTypeId,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassificationConfidence,
      },
    );
  }

  if (!releasedQuestionTypeMatch) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
        normalizedClassificationConfidence,
      ),
      {
        questionTypeId: normalizedQuestionTypeId,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassificationConfidence,
      },
    );
  }

  const releasedFamilyEvidence = evaluateReleasedFamilyEvidenceGate(normalizedQuestionTypeId, {
    receipt: releaseEvidenceReceipt,
  });

  if (!releasedFamilyEvidence.ok) {
    return withReleasedScopeExplanation(
      buildFallbackPosture(
        FALLBACK_REASON_CODES.MISSING_RELEASED_FAMILY_EVIDENCE,
        normalizedClassificationConfidence,
      ),
      {
        questionTypeId: normalizedQuestionTypeId,
        questionTypeReleaseState,
        candidateRubricRefs,
        uncertaintyValidated,
        uncertaintyPosture,
        classificationConfidence: normalizedClassificationConfidence,
        releasedFamilyEvidenceOk: false,
      },
    );
  }

  return withReleasedScopeExplanation(resolveInlineReleasedScoringPosture({
    questionTypeId: normalizedQuestionTypeId,
    questionTypeReleaseState,
    candidateRubricRefs,
    uncertaintyValidated,
    uncertaintyPosture,
    classificationConfidence: normalizedClassificationConfidence,
    confidenceBand,
    isPilotQuestionType: releasedQuestionTypeMatch,
  }), {
    questionTypeId: normalizedQuestionTypeId,
    questionTypeReleaseState,
    candidateRubricRefs,
    uncertaintyValidated,
    uncertaintyPosture,
    classificationConfidence: normalizedClassificationConfidence,
    releasedFamilyEvidenceOk: true,
  });
}
