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

const FROZEN_PILOT_FAMILY_ID = '9709.trigonometry_manipulation_equations';

function normalizeSeedMembershipInput(questionTypeId) {
  return normalizeQuestionTypeId(
    typeof questionTypeId === 'object' && questionTypeId !== null
      ? questionTypeId.questionTypeId ?? questionTypeId.question_type_id
      : questionTypeId,
  );
}

function loadSeededPilotQuestionTypeIds() {
  let receipt;

  try {
    receipt = loadReleasedFamilyGateReceipt();
  } catch {
    return Object.freeze([]);
  }

  const frozenPilotFamily = Array.isArray(receipt?.family_results)
    ? receipt.family_results.find((family) => family?.family_id === FROZEN_PILOT_FAMILY_ID)
    : null;

  const questionTypeIds = Array.isArray(frozenPilotFamily?.released_question_type_ids)
    ? [...new Set(frozenPilotFamily.released_question_type_ids
      .map((questionTypeId) => normalizeQuestionTypeId(questionTypeId))
      .filter(Boolean))]
    : [];

  return Object.freeze(questionTypeIds);
}

const SEEDED_PILOT_QUESTION_TYPE_IDS = loadSeededPilotQuestionTypeIds();

function resolvePilotQuestionTypeMatch(questionTypeId, isPilotQuestionType = null) {
  const registryMatch = isSeededPilotQuestionType(questionTypeId);
  return registryMatch && (typeof isPilotQuestionType === 'boolean' ? isPilotQuestionType : true);
}

export {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
};

export function isSeededPilotQuestionType(questionTypeId) {
  return SEEDED_PILOT_QUESTION_TYPE_IDS.includes(normalizeSeedMembershipInput(questionTypeId));
}

export function resolveInlineReleasedScoringPosture({
  questionTypeId,
  isPilotQuestionType = null,
  ...rest
} = {}) {
  return resolveCoreInlineReleasedScoringPosture({
    questionTypeId,
    ...rest,
    isPilotQuestionType: resolvePilotQuestionTypeMatch(questionTypeId, isPilotQuestionType),
  });
}

export function resolveReleasedScoringPosture({
  questionTypeId,
  questionTypeReleaseState = null,
  candidateRubricRefs = [],
  uncertaintyValidated = false,
  uncertaintyPosture = null,
  classificationConfidence = null,
  isPilotQuestionType = null,
  releaseEvidenceReceipt = null,
} = {}) {
  const normalizedQuestionTypeId = normalizeQuestionTypeId(questionTypeId);
  const normalizedClassificationConfidence = normalizeClassificationConfidence(classificationConfidence);
  const pilotQuestionTypeMatch = resolvePilotQuestionTypeMatch(
    normalizedQuestionTypeId,
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

  if (!pilotQuestionTypeMatch) {
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
    isPilotQuestionType: pilotQuestionTypeMatch,
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
