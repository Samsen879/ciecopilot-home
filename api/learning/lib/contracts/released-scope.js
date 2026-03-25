import { evaluateReleasedFamilyEvidenceGate } from './released-family-gate.js';
import {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  buildFallbackPosture,
  isSeededPilotQuestionType,
  normalizeClassificationConfidence,
  normalizeQuestionTypeId,
  resolveInlineReleasedScoringPosture,
} from './released-scope-core.js';

export {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  isSeededPilotQuestionType,
  resolveInlineReleasedScoringPosture,
};

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
  const pilotQuestionTypeMatch = typeof isPilotQuestionType === 'boolean'
    ? isPilotQuestionType
    : isSeededPilotQuestionType(normalizedQuestionTypeId, questionTypeReleaseState);

  if (!normalizedQuestionTypeId) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.MISSING_QUESTION_TYPE,
      normalizedClassificationConfidence,
    );
  }

  if (!pilotQuestionTypeMatch) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
      normalizedClassificationConfidence,
    );
  }

  const releasedFamilyEvidence = evaluateReleasedFamilyEvidenceGate(normalizedQuestionTypeId, {
    receipt: releaseEvidenceReceipt,
  });

  if (!releasedFamilyEvidence.ok) {
    return buildFallbackPosture(
      FALLBACK_REASON_CODES.MISSING_RELEASED_FAMILY_EVIDENCE,
      normalizedClassificationConfidence,
    );
  }

  return resolveInlineReleasedScoringPosture({
    questionTypeId: normalizedQuestionTypeId,
    questionTypeReleaseState,
    candidateRubricRefs,
    uncertaintyValidated,
    uncertaintyPosture,
    classificationConfidence: normalizedClassificationConfidence,
    isPilotQuestionType: pilotQuestionTypeMatch,
  });
}
