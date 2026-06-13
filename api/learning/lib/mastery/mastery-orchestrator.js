import { buildAttemptRef, buildMarkRunRef } from '../contracts/runtime-contract.js';
import {
  buildRuntimeAuthorityPosture,
  isNonAuthoritativeRuntimeInput,
} from '../contracts/runtime-authority-posture.js';
import {
  buildReviewTaskPayload,
  createDefaultReviewTaskService,
  createReviewTaskService,
  shouldGenerateReviewTaskFromOutcome,
} from '../review/review-task-service.js';
import { buildArtifactCandidate, createArtifactService } from '../artifacts/artifact-service.js';
import { createArtifactRepository } from '../repositories/artifact-repository.js';
import { createArtifactContentRepository } from '../repositories/artifact-content-repository.js';
import { createReconciliationService } from '../reconciliation/reconciliation-service.js';
import { createDefaultReconciliationService } from '../reconciliation/reconciliation-service.js';
import { SUBJECT_ADAPTER_CAPABILITY_POSTURES } from '../subjects/subject-adapter-contract.js';
import {
  getSubjectAdapter,
  resolveSubjectCodeFromRuntimeInput,
} from '../subjects/subject-adapter-registry.js';
import { buildLearningRuntimeAutoEntryPayload } from '../../../error-book/lib/error-book-service.js';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getQuestionContext(input = {}) {
  return input.question_context || {};
}

function normalizeSignalToken(value) {
  const withWordBoundaries = typeof value === 'string'
    ? value.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    : '';

  return withWordBoundaries
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const PASSIVE_MASTERY_EVIDENCE_KINDS = new Set([
  'reading',
  'passive_reading',
  'browsing',
  'artifact_view',
  'artifact_viewing',
  'content_view',
  'raw_chat',
  'chat',
  'explanation_exposure',
  'explanation_view',
  'classification_only',
  'question_classified',
  'non_released_fallback_diagnostic',
  'diagnostic_only',
  'ui_only',
]);

const STRONG_MASTERY_BANDS = new Set([
  'secure',
  'exam_ready',
  'examready',
]);

const MINIMUM_POSITIVE_DECISION_CONFIDENCE = 0.8;

function normalizeMasteryBand(value) {
  return normalizeSignalToken(value).replace(/-/g, '_');
}

function isTypedRef(value) {
  if (!isPlainObject(value) || !normalizeString(value.kind)) {
    return false;
  }

  return Object.entries(value).some(([key, refValue]) =>
    key !== 'kind' && normalizeString(refValue));
}

function normalizeClassificationConfidence(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveConfidenceBand(classificationConfidence) {
  const normalized = normalizeClassificationConfidence(classificationConfidence);
  if (normalized === null) {
    return null;
  }

  if (normalized < 0.8) {
    return 'low';
  }

  if (normalized < 0.85) {
    return 'medium';
  }

  return 'high';
}

function resolveConfidenceBand({
  input = {},
  questionContext = {},
  releaseScopePosture = {},
} = {}) {
  return normalizeSignalToken(
    releaseScopePosture.confidence_band
    ?? releaseScopePosture.confidenceBand
    ?? questionContext.confidence_band
    ?? questionContext.confidenceBand,
  )
    || deriveConfidenceBand(
      releaseScopePosture.classification_confidence
      ?? questionContext.classification_confidence,
    );
}

function resolveFreshnessBucket(input = {}) {
  return normalizeSignalToken(
    input.evidence_freshness_bucket
    ?? input.evidenceFreshnessBucket
    ?? input.freshness_bucket
    ?? input.freshnessBucket
    ?? input.marking_result?.marking_summary?.freshness_bucket
    ?? input.marking_result?.marking_summary?.freshnessBucket,
  ) || null;
}

function resolveEvidenceKind(input = {}) {
  const candidates = [
    input.evidence_kind,
    input.evidenceKind,
    input.learning_event_kind,
    input.learningEventKind,
    input.interaction_mode,
    input.interactionMode,
    input.activity_kind,
    input.activityKind,
    input.source_event_type,
    input.sourceEventType,
    input.trigger_type,
    input.triggerType,
  ];

  return candidates
    .map((candidate) => normalizeSignalToken(candidate))
    .find(Boolean) || null;
}

function isPassiveMasteryEvidenceKind(evidenceKind) {
  return PASSIVE_MASTERY_EVIDENCE_KINDS.has(normalizeSignalToken(evidenceKind));
}

function hasValidMarkedDecisionEvidence(decision = {}) {
  const confidence = normalizeClassificationConfidence(decision.alignment_confidence);
  return Boolean(
    (
      typeof decision?.awarded === 'boolean'
      || Number.isFinite(Number(decision?.awarded_marks))
    )
    && confidence !== null
    && confidence >= MINIMUM_POSITIVE_DECISION_CONFIDENCE,
  );
}

function hasConservativeMarkingPosture(markingResult = {}) {
  const markingSummary = isPlainObject(markingResult?.marking_summary)
    ? markingResult.marking_summary
    : {};

  return Boolean(
    markingSummary.local_signal_only === true
    || markingSummary.conservative_part_mapping === true
    || Number(markingSummary.ambiguous_rubric_point_result_count ?? 0) > 0,
  );
}

function hasExplicitPerformanceEvidence(input = {}) {
  return Boolean(
    input.mastery_evidence?.valid_performance_evidence === true
    || input.masteryEvidence?.validPerformanceEvidence === true
    || input.performance_evidence?.valid === true
    || input.performanceEvidence?.valid === true,
  );
}

function hasReviewTaskPerformanceEvidence(input = {}) {
  const evidence =
    input.review_task_completion_evidence
    || input.reviewTaskCompletionEvidence
    || input.completion_evidence
    || input.completionEvidence;
  const contract = evidence?.evidence_contract ?? evidence?.evidenceContract ?? {};

  return Boolean(
    contract.outcome === 'completed'
    && contract.validation === 'mode_specific'
    && (
      isTypedRef(evidence.attempt_ref)
      || isTypedRef(evidence.variant_attempt_ref)
      || isTypedRef(evidence.timed_attempt_ref)
      || isTypedRef(evidence.corrected_attempt_ref)
      || isTypedRef(evidence.fix_evidence_ref)
    )
  );
}

function hasMarkingPerformanceEvidence({
  input = {},
  sourceAttemptRef = null,
  sourceMarkRunRef = null,
} = {}) {
  return Boolean(
    isTypedRef(sourceAttemptRef)
    && isTypedRef(sourceMarkRunRef)
    && normalizeArray(input.decisions).some(hasValidMarkedDecisionEvidence)
    && !hasConservativeMarkingPosture(input.marking_result),
  );
}

function hasValidPerformanceEvidence({
  input = {},
  sourceAttemptRef = null,
  sourceMarkRunRef = null,
} = {}) {
  return Boolean(
    hasExplicitPerformanceEvidence(input)
    || hasReviewTaskPerformanceEvidence(input)
    || hasMarkingPerformanceEvidence({
      input,
      sourceAttemptRef,
      sourceMarkRunRef,
    })
  );
}

function isReleasedScopeCheckSatisfied(releaseScopePosture = {}) {
  const releasedScopeCheck = releaseScopePosture.released_scope_check;
  return isPlainObject(releasedScopeCheck) && releasedScopeCheck.released_scoring === true;
}

function buildMasteryGuardrailDecision({
  input = {},
  questionContext = {},
  releaseScopePosture = {},
  sourceAttemptRef = null,
  sourceMarkRunRef = null,
} = {}) {
  const evidenceKind = resolveEvidenceKind(input);
  const passiveEvidence = isPassiveMasteryEvidenceKind(evidenceKind);
  const confidenceBand = resolveConfidenceBand({
    input,
    questionContext,
    releaseScopePosture,
  });
  const classificationConfidence = normalizeClassificationConfidence(
    releaseScopePosture.classification_confidence
    ?? questionContext.classification_confidence,
  );
  const freshnessBucket = resolveFreshnessBucket(input);
  const releasedScopeCheckSatisfied = isReleasedScopeCheckSatisfied(releaseScopePosture);
  const validPerformanceEvidence = !passiveEvidence && hasValidPerformanceEvidence({
    input,
    sourceAttemptRef,
    sourceMarkRunRef,
  });
  let blockedMasteryReasonCode = null;

  if (passiveEvidence) {
    blockedMasteryReasonCode = 'passive_or_non_performance_evidence';
  } else if (freshnessBucket === 'stale') {
    blockedMasteryReasonCode = 'stale_performance_evidence';
  } else if (confidenceBand === 'low' || classificationConfidence === null) {
    blockedMasteryReasonCode = 'low_confidence_performance_evidence';
  } else if (!validPerformanceEvidence) {
    blockedMasteryReasonCode = 'missing_valid_performance_evidence';
  } else if (!releasedScopeCheckSatisfied) {
    blockedMasteryReasonCode = 'released_scope_check_not_satisfied';
  }

  return {
    mastery_write_allowed: !passiveEvidence,
    positive_mastery_allowed:
      !passiveEvidence
      && validPerformanceEvidence
      && releasedScopeCheckSatisfied
      && confidenceBand !== 'low'
      && classificationConfidence !== null
      && freshnessBucket !== 'stale',
    valid_performance_evidence: validPerformanceEvidence,
    performance_evidence_kind: validPerformanceEvidence
      ? (hasReviewTaskPerformanceEvidence(input) ? 'review_task_completion' : 'marking_performance')
      : null,
    blocked_mastery_reason_code: blockedMasteryReasonCode,
    evidence_kind: evidenceKind,
    confidence_band: confidenceBand,
    classification_confidence: classificationConfidence,
    freshness_bucket: freshnessBucket,
    released_scope_check: clone(releaseScopePosture.released_scope_check ?? null),
  };
}

function getEffectSignalDirection(effect = {}) {
  return normalizeSignalToken(
    effect.signal_direction
    ?? effect.mastery_state?.signal_direction
    ?? effect.signalSummary?.signal_direction
    ?? effect.signal_summary?.signal_direction,
  );
}

function getEffectSignalWeight(effect = {}) {
  return normalizeSignalToken(
    effect.signal_weight
    ?? effect.mastery_state?.signal_weight
    ?? effect.signalSummary?.signal_weight
    ?? effect.signal_summary?.signal_weight,
  );
}

function hasStrongMasteryBand(effect = {}) {
  return [
    effect.mastery_band,
    effect.masteryBand,
    effect.target_band,
    effect.targetBand,
    effect.next_band,
    effect.nextBand,
    effect.mastery_state?.mastery_band,
    effect.mastery_state?.masteryBand,
    effect.mastery_state?.band,
    effect.mastery_state?.target_band,
    effect.mastery_state?.targetBand,
    effect.mastery_state?.next_band,
    effect.mastery_state?.nextBand,
  ].some((value) => STRONG_MASTERY_BANDS.has(normalizeMasteryBand(value)));
}

function isPositiveMasteryMovement(effect = {}) {
  if (hasStrongMasteryBand(effect)) {
    return true;
  }

  return Boolean(
    getEffectSignalDirection(effect) === 'positive'
    || getEffectSignalWeight(effect) === 'authoritative'
  );
}

function isMasteryUpdateAllowed(masteryUpdate = {}, masteryGuardrailDecision = {}) {
  if (masteryGuardrailDecision.mastery_write_allowed === false) {
    return false;
  }

  if (!isPositiveMasteryMovement(masteryUpdate)) {
    return true;
  }

  return masteryGuardrailDecision.positive_mastery_allowed === true;
}

function buildMasteryNoop(effect = {}, guardrailDecision = {}) {
  return {
    effect_status: 'noop',
    effect_key: effect.effect_key ?? null,
    guardrail_decision: {
      mastery_write_allowed: false,
      blocked_mastery_reason_code:
        guardrailDecision.blocked_mastery_reason_code
        || 'missing_released_performance_evidence',
    },
  };
}

function validateProposedMasteryEffectForMaterialization(effect = {}) {
  if (!isPositiveMasteryMovement(effect)) {
    return {
      ok: true,
      mastery_write_allowed: true,
      blocked_mastery_reason_code: null,
    };
  }

  const releasedScopeCheck = effect.signal_summary?.released_scope_check;
  const masteryEvidence = effect.signal_summary?.mastery_evidence;
  const masteryGuardrailDecision = effect.signal_summary?.mastery_guardrail_decision;
  const evidenceKind = normalizeSignalToken(masteryEvidence?.evidence_kind);
  const freshnessBucket = normalizeSignalToken(masteryEvidence?.freshness_bucket);
  const classificationConfidence = normalizeClassificationConfidence(
    masteryEvidence?.classification_confidence,
  );
  const confidenceBand = normalizeSignalToken(masteryEvidence?.confidence_band)
    || deriveConfidenceBand(classificationConfidence);

  if (!isPlainObject(releasedScopeCheck)) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'released_scope_check_not_satisfied',
    };
  }

  if (releasedScopeCheck.released_scoring !== true) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'missing_released_performance_evidence',
    };
  }

  if (masteryEvidence?.valid_performance_evidence !== true) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'missing_released_performance_evidence',
    };
  }

  if (isPassiveMasteryEvidenceKind(evidenceKind)) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'passive_or_non_performance_evidence',
    };
  }

  if (freshnessBucket === 'stale') {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'stale_performance_evidence',
    };
  }

  if (confidenceBand === 'low' || classificationConfidence === null) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'low_confidence_performance_evidence',
    };
  }

  if (!isPlainObject(masteryGuardrailDecision)) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code: 'missing_mastery_guardrail_decision',
    };
  }

  if (
    masteryGuardrailDecision.mastery_write_allowed !== true
    || masteryGuardrailDecision.positive_mastery_allowed !== true
    || masteryGuardrailDecision.valid_performance_evidence !== true
    || masteryGuardrailDecision.blocked_mastery_reason_code
  ) {
    return {
      ok: false,
      mastery_write_allowed: false,
      blocked_mastery_reason_code:
        normalizeString(masteryGuardrailDecision.blocked_mastery_reason_code)
        || 'mastery_guardrail_decision_not_satisfied',
    };
  }

  return {
    ok: true,
    mastery_write_allowed: true,
    blocked_mastery_reason_code: null,
  };
}

function renderEffectKeyFragment(value, fallback = 'none') {
  const normalized = normalizeString(value);
  return normalized || fallback;
}

function renderEffectTagFragment(tags = []) {
  const normalized = normalizeArray(tags)
    .map((tag) => normalizeString(tag))
    .filter(Boolean);

  return normalized.length > 0 ? normalized.join('+') : 'none';
}

function buildProposalKey(input = {}) {
  const markRunId = normalizeString(input.mark_run_id ?? input.markRunId);
  if (markRunId) {
    return `mark-run:${markRunId}`;
  }

  return `attempt:${renderEffectKeyFragment(input.attempt_id ?? input.attemptId, 'unknown-attempt')}`;
}

function buildProposalRevisionKey({
  proposalKey,
  truthRevision,
} = {}) {
  const normalizedProposalKey = normalizeString(proposalKey) || 'proposal:unknown';
  const normalizedTruthRevision = Number.isInteger(Number(truthRevision)) && Number(truthRevision) >= 1
    ? Number(truthRevision)
    : 1;

  return `${normalizedProposalKey}:r${normalizedTruthRevision}`;
}

function buildMasteryEffectKey(effect = {}, proposalRevisionKey = 'proposal:unknown:r1') {
  const level = normalizeString(effect.level) || 'family';
  const userId = renderEffectKeyFragment(effect.user_id, 'anonymous');
  const topicId = renderEffectKeyFragment(effect.topic_id, 'unknown-topic');
  const targetId = level === 'question_type'
    ? renderEffectKeyFragment(effect.question_type_id, 'unknown-type')
    : renderEffectKeyFragment(effect.family_id, 'unknown-family');

  return `mastery:${proposalRevisionKey}:${level}:${userId}:${topicId}:${targetId}`;
}

function buildReviewTaskEffectKey(payload = {}, proposalRevisionKey = 'proposal:unknown:r1') {
  const userId = renderEffectKeyFragment(payload.user_id, 'anonymous');
  const topicId = renderEffectKeyFragment(payload.target_topic_id, 'unknown-topic');
  const targetId = renderEffectKeyFragment(
    payload.target_question_type_id ?? payload.target_family_id,
    payload.target_kind,
  );
  const tags = renderEffectTagFragment(payload.target_misconception_tags);

  return `review:${proposalRevisionKey}:${userId}:${topicId}:${targetId}:${tags}`;
}

function buildArtifactSuggestionEffectKey(
  candidate = {},
  userId = null,
  proposalRevisionKey = 'proposal:unknown:r1',
) {
  const normalizedUserId = renderEffectKeyFragment(userId, 'anonymous');
  const topicId = renderEffectKeyFragment(candidate.canonical_home_topic_id, 'unknown-topic');
  const artifactKind = renderEffectKeyFragment(candidate.artifact_kind, 'artifact');
  const tags = renderEffectTagFragment(candidate.misconception_tags);

  return `artifact:${proposalRevisionKey}:${normalizedUserId}:${topicId}:${artifactKind}:${tags}`;
}

function buildGuardrailDecisions(releaseScopePosture = {}, masteryGuardrailDecision = {}) {
  const fallbackReason = normalizeString(releaseScopePosture.fallback_reason_code) || null;

  return {
    authoritative_scoring_allowed: Boolean(releaseScopePosture.authoritative_scoring_allowed),
    release_scope_status: normalizeString(releaseScopePosture.release_scope_status) || null,
    learning_signal_posture: normalizeString(releaseScopePosture.learning_signal_posture) || null,
    fallback_mode: normalizeString(releaseScopePosture.fallback_mode) || null,
    fallback_reason_code: fallbackReason,
    mastery_write_allowed: masteryGuardrailDecision.mastery_write_allowed ?? null,
    positive_mastery_allowed: masteryGuardrailDecision.positive_mastery_allowed ?? null,
    valid_performance_evidence: masteryGuardrailDecision.valid_performance_evidence ?? null,
    performance_evidence_kind: masteryGuardrailDecision.performance_evidence_kind ?? null,
    blocked_mastery_reason_code: masteryGuardrailDecision.blocked_mastery_reason_code ?? null,
    evidence_kind: masteryGuardrailDecision.evidence_kind ?? null,
    confidence_band: masteryGuardrailDecision.confidence_band ?? null,
    classification_confidence: masteryGuardrailDecision.classification_confidence ?? null,
    freshness_bucket: masteryGuardrailDecision.freshness_bucket ?? null,
    released_scope_check: clone(masteryGuardrailDecision.released_scope_check ?? null),
    reasons: [
      ...(fallbackReason ? [fallbackReason] : ['released_scoring']),
      ...(masteryGuardrailDecision.blocked_mastery_reason_code
        ? [masteryGuardrailDecision.blocked_mastery_reason_code]
        : []),
    ],
  };
}

function buildErrorBookHooks({
  input,
  subjectCode,
  artifactCandidates,
  repairTopicId,
  repairTopicPath,
} = {}) {
  if (!input.user_id || !repairTopicId) {
    return [];
  }

  return artifactCandidates
    .filter((candidate) => candidate.artifact_kind === 'misconception_card')
    .map((candidate) =>
      buildLearningRuntimeAutoEntryPayload({
        userId: input.user_id,
        subjectCode,
        question: input.error_book_question || 'Auto-generated learning-runtime misconception note.',
        explanation: input.error_book_explanation ?? null,
        repairTopicRef: {
          kind: 'topic',
          topic_id: repairTopicId,
          topic_path: repairTopicPath,
        },
        sourceQuestionRef: input.question_id
          ? {
            kind: 'question',
            question_id: input.question_id,
          }
          : null,
        sourceAttemptRef: input.source_attempt_ref ?? null,
        sourceMarkRunRef: input.source_mark_run_ref ?? null,
        artifactRef: candidate.artifact_id
          ? {
            kind: 'artifact',
            artifact_id: candidate.artifact_id,
          }
          : null,
        misconceptionTag: normalizeArray(input.misconception_tags)[0] ?? null,
      }));
}

function buildReconciliationHistorical(input = {}) {
  return {
    attempts: normalizeArray(input.historical?.attempts),
    mark_runs: normalizeArray(input.historical?.mark_runs),
  };
}

function resolveLearningEffectsPosture({
  input,
  questionContext,
  adapter,
} = {}) {
  const basePosture = input.release_scope_posture || adapter.marking.resolveReleasedScoringPosture({
    questionTypeId: questionContext.question_type_id,
    questionTypeReleaseState:
      questionContext.question_type_release_state
      ?? questionContext.primary_question_type_release_state
      ?? null,
    candidateRubricRefs: questionContext.candidate_rubric_refs,
    classificationConfidence: questionContext.classification_confidence,
    uncertaintyValidated: input.uncertainty_validated ?? false,
  });

  return buildRuntimeAuthorityPosture(basePosture, {
    questionContext,
  });
}

function buildNormalizedMasteryEffect({
  masteryUpdate,
  input,
  releaseScopePosture,
  masteryGuardrailDecision,
  sourceAttemptRef,
  sourceMarkRunRef,
  proposalRevisionKey,
} = {}) {
  const effect = {
    effect_key: null,
    user_id: input.user_id ?? null,
    level: masteryUpdate.level,
    topic_id: masteryUpdate.topic_id ?? null,
    family_id: masteryUpdate.family_id ?? null,
    question_type_id: masteryUpdate.question_type_id ?? null,
    mastery_state: {
      signal_direction: masteryUpdate.signal_direction ?? null,
      signal_weight: masteryUpdate.signal_weight ?? null,
      release_scope_status: masteryUpdate.release_scope_status ?? releaseScopePosture.release_scope_status ?? null,
      runtime_authority_posture: releaseScopePosture.runtime_authority_posture ?? null,
    },
    signal_summary: {
      release_scope_status: releaseScopePosture.release_scope_status ?? null,
      source_attempt_ref: clone(sourceAttemptRef ?? null),
      source_mark_run_ref: clone(sourceMarkRunRef ?? null),
      fallback_reason_code: releaseScopePosture.fallback_reason_code ?? null,
      learning_signal_posture: releaseScopePosture.learning_signal_posture ?? null,
      released_scope_check: clone(releaseScopePosture.released_scope_check ?? null),
      mastery_evidence: {
        valid_performance_evidence:
          masteryGuardrailDecision?.valid_performance_evidence === true,
        performance_evidence_kind: masteryGuardrailDecision?.performance_evidence_kind ?? null,
        evidence_kind: masteryGuardrailDecision?.evidence_kind ?? null,
        confidence_band: masteryGuardrailDecision?.confidence_band ?? null,
        classification_confidence: masteryGuardrailDecision?.classification_confidence ?? null,
        freshness_bucket: masteryGuardrailDecision?.freshness_bucket ?? null,
      },
      mastery_guardrail_decision: clone(masteryGuardrailDecision ?? {}),
    },
  };

  return {
    ...effect,
    effect_key: buildMasteryEffectKey(effect, proposalRevisionKey),
  };
}

function buildNormalizedReviewTaskProposal(payload = {}, proposalRevisionKey) {
  const effectKey = buildReviewTaskEffectKey(payload, proposalRevisionKey);

  return {
    effect_key: effectKey,
    ...clone(payload),
  };
}

function buildNormalizedArtifactSuggestion(candidate = {}, userId = null, proposalRevisionKey) {
  const effectKey = buildArtifactSuggestionEffectKey(candidate, userId, proposalRevisionKey);

  return {
    effect_key: effectKey,
    ...clone(candidate),
  };
}

export function buildLearningUpdateProposal(input = {}, { now = new Date() } = {}) {
  const questionContext = getQuestionContext(input);
  const subjectCode = resolveSubjectCodeFromRuntimeInput(input, questionContext);
  const adapter = getSubjectAdapter(subjectCode);
  const releaseScopePosture = resolveLearningEffectsPosture({
    input,
    questionContext,
    adapter,
  });
  const nonAuthoritativeRuntimeInput = isNonAuthoritativeRuntimeInput({
    ...input,
    release_scope_posture: releaseScopePosture,
    question_context: questionContext,
  });
  const sourceAttemptRef = input.source_attempt_ref
    || (input.attempt_id ? buildAttemptRef(input.attempt_id) : null);
  const sourceMarkRunRef = input.source_mark_run_ref
    || (input.mark_run_id ? buildMarkRunRef(input.mark_run_id) : null);
  const masteryGuardrailDecision = buildMasteryGuardrailDecision({
    input,
    questionContext,
    releaseScopePosture,
    sourceAttemptRef,
    sourceMarkRunRef,
  });
  const repairTopicId =
    input.repair_target_topic_id
    || questionContext.primary_topic_id
    || input.source_attempt_context?.topic_id
    || null;
  const repairTopicPath =
    input.repair_target_topic_path
    || questionContext.primary_topic_path
    || input.source_attempt_context?.topic_path
    || null;
  const reviewTaskInput = {
    ...input,
    subject_code: subjectCode,
    authoritative_scoring_allowed: releaseScopePosture.authoritative_scoring_allowed,
    fallback_reason_code: releaseScopePosture.fallback_reason_code,
    repair_target_topic_id: repairTopicId,
    repair_target_topic_path: repairTopicPath,
    repair_target_question_type_id:
      input.repair_target_question_type_id || questionContext.question_type_id || null,
    source_attempt_ref: sourceAttemptRef,
    source_mark_run_ref: sourceMarkRunRef,
    runtime_authority_posture: releaseScopePosture.runtime_authority_posture,
    runtime_authority_reason_code: releaseScopePosture.runtime_authority_reason_code,
    question_source_kind: releaseScopePosture.question_source_kind,
  };
  const artifactInput = {
    artifact_kind: 'misconception_card',
    canonical_home_topic_id:
      questionContext.primary_topic_id || input.source_attempt_context?.topic_id || null,
    canonical_home_topic_path:
      questionContext.primary_topic_path || input.source_attempt_context?.topic_path || null,
    repair_target_topic_id: repairTopicId,
    repair_target_topic_path: repairTopicPath,
    target_family_id: questionContext.family_id ?? null,
    target_question_type_id:
      input.repair_target_question_type_id || questionContext.question_type_id || null,
    misconception_tags: normalizeArray(input.misconception_tags),
    source_attempt_ref: sourceAttemptRef,
    source_mark_run_ref: sourceMarkRunRef,
    source_session_id: input.source_session_id ?? null,
    runtime_authority_posture: releaseScopePosture.runtime_authority_posture,
    runtime_authority_reason_code: releaseScopePosture.runtime_authority_reason_code,
    question_source_kind: releaseScopePosture.question_source_kind,
    blocked_materializers: releaseScopePosture.blocked_materializers,
  };
  const masteryProjection = adapter.mastery.buildMasteryProjection({
    input,
    questionContext,
    releaseScopePosture,
  });
  const localSignals = masteryProjection.localSignals;
  const masteryUpdates = nonAuthoritativeRuntimeInput
    ? []
    : normalizeArray(masteryProjection.masteryUpdates)
      .filter((masteryUpdate) =>
        isMasteryUpdateAllowed(masteryUpdate, masteryGuardrailDecision));
  const reviewCapabilityPosture = adapter.meta.capability_posture?.review
    ?? SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED;
  const reviewTaskPayload = reviewCapabilityPosture !== SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED
    || nonAuthoritativeRuntimeInput
    || !shouldGenerateReviewTaskFromOutcome(reviewTaskInput)
    ? null
    : buildReviewTaskPayload(reviewTaskInput, now);
  const artifactCandidate = (
    (artifactInput.artifact_kind || 'misconception_card') === 'misconception_card'
    && normalizeArray(artifactInput.misconception_tags).length === 0
  )
    ? null
    : buildArtifactCandidate(artifactInput, now.toISOString());
  const proposalKey = buildProposalKey(input);
  const proposalRevisionKey = buildProposalRevisionKey({
    proposalKey,
    truthRevision: input.truth_revision ?? input.truthRevision ?? null,
  });

  return {
    proposal_key: proposalKey,
    guardrail_decisions: buildGuardrailDecisions(
      releaseScopePosture,
      masteryGuardrailDecision,
    ),
    releaseScopePosture,
    masteryGuardrailDecision,
    sourceAttemptRef,
    sourceMarkRunRef,
    repairTopicId,
    repairTopicPath,
    localSignals,
    masteryUpdates,
    proposedMasteryEffects: masteryUpdates.map((masteryUpdate) =>
      buildNormalizedMasteryEffect({
        masteryUpdate,
        input,
        releaseScopePosture,
        masteryGuardrailDecision,
        sourceAttemptRef,
        sourceMarkRunRef,
        proposalRevisionKey,
      })),
    proposedReviewTasks: reviewTaskPayload
      ? [buildNormalizedReviewTaskProposal(reviewTaskPayload, proposalRevisionKey)]
      : [],
    proposedArtifactSuggestions: artifactCandidate?.canonical_home_topic_id
      ? [buildNormalizedArtifactSuggestion(artifactCandidate, input.user_id, proposalRevisionKey)]
      : [],
  };
}

async function upsertMasteryEffect(client, effect = {}) {
  if (!client) {
    return clone(effect);
  }

  const tableName = effect.level === 'question_type'
    ? 'learning_type_masteries'
    : 'learning_family_masteries';
  const conflictColumns = effect.level === 'question_type'
    ? 'user_id,topic_id,question_type_id'
    : 'user_id,topic_id,family_id';
  const row = {
    user_id: effect.user_id,
    topic_id: effect.topic_id,
    family_id: effect.family_id,
    mastery_state: clone(effect.mastery_state ?? {}),
    signal_summary: clone(effect.signal_summary ?? {}),
    updated_at: new Date().toISOString(),
  };

  if (effect.level === 'question_type') {
    row.question_type_id = effect.question_type_id;
  }

  const { data, error } = await client
    .from(tableName)
    .upsert(row, {
      onConflict: conflictColumns,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || `Failed to upsert ${tableName}.`);
  }

  return data;
}

export function createMasteryOrchestrator({
  reviewTaskService = null,
  artifactService = null,
  reconciliationService = null,
  supabase = null,
  now = () => new Date(),
} = {}) {
  return {
    buildLearningUpdateProposal(input = {}) {
      return buildLearningUpdateProposal(input, {
        now: now(),
      });
    },

    async materializeProposedMasteryEffect(effect = {}) {
      const guardrailDecision = validateProposedMasteryEffectForMaterialization(effect);
      if (!guardrailDecision.ok) {
        return buildMasteryNoop(effect, guardrailDecision);
      }

      return upsertMasteryEffect(supabase, effect);
    },

    async applyLearningEffects(input = {}) {
      const questionContext = getQuestionContext(input);
      const subjectCode = resolveSubjectCodeFromRuntimeInput(input, questionContext);
      const proposal = buildLearningUpdateProposal(input, {
        now: now(),
      });
      const reviewTaskInput = {
        ...input,
        subject_code: subjectCode,
        authoritative_scoring_allowed: proposal.releaseScopePosture.authoritative_scoring_allowed,
        fallback_reason_code: proposal.releaseScopePosture.fallback_reason_code,
        repair_target_topic_id: proposal.repairTopicId,
        repair_target_topic_path: proposal.repairTopicPath,
        repair_target_question_type_id:
          input.repair_target_question_type_id || questionContext.question_type_id || null,
        source_attempt_ref: proposal.sourceAttemptRef,
        source_mark_run_ref: proposal.sourceMarkRunRef,
        runtime_authority_posture: proposal.releaseScopePosture.runtime_authority_posture,
        runtime_authority_reason_code: proposal.releaseScopePosture.runtime_authority_reason_code,
        question_source_kind: proposal.releaseScopePosture.question_source_kind,
      };
      const artifactInput = {
        artifact_kind: 'misconception_card',
        canonical_home_topic_id:
          questionContext.primary_topic_id || input.source_attempt_context?.topic_id || null,
        canonical_home_topic_path:
          questionContext.primary_topic_path || input.source_attempt_context?.topic_path || null,
        repair_target_topic_id: proposal.repairTopicId,
        repair_target_topic_path: proposal.repairTopicPath,
        target_family_id: questionContext.family_id ?? null,
        target_question_type_id:
          input.repair_target_question_type_id || questionContext.question_type_id || null,
        misconception_tags: normalizeArray(input.misconception_tags),
        source_attempt_ref: proposal.sourceAttemptRef,
        source_mark_run_ref: proposal.sourceMarkRunRef,
        source_session_id: input.source_session_id ?? null,
        runtime_authority_posture: proposal.releaseScopePosture.runtime_authority_posture,
        runtime_authority_reason_code: proposal.releaseScopePosture.runtime_authority_reason_code,
        question_source_kind: proposal.releaseScopePosture.question_source_kind,
        blocked_materializers: proposal.releaseScopePosture.blocked_materializers,
      };
      const adapter = getSubjectAdapter(subjectCode);
      const reviewCapabilityPosture = adapter.meta.capability_posture?.review
        ?? SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED;
      const reviewTasks = reviewCapabilityPosture !== SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED
        || isNonAuthoritativeRuntimeInput({
          ...input,
          release_scope_posture: proposal.releaseScopePosture,
          question_context: questionContext,
        })
        || !shouldGenerateReviewTaskFromOutcome(reviewTaskInput)
        ? []
        : await reviewTaskService.generateTasksFromOutcome(reviewTaskInput);
      const artifactCandidates = await artifactService.buildArtifactCandidates(artifactInput);
      const errorBookHooks = buildErrorBookHooks({
        input,
        subjectCode,
        artifactCandidates,
        repairTopicId: proposal.repairTopicId,
        repairTopicPath: proposal.repairTopicPath,
      });
      const reconciliation = await reconciliationService.reconcileDerivedState({
        triggerSource: input.reconciliation_trigger_source || 'marking_correction',
        sourceRef: proposal.sourceMarkRunRef || proposal.sourceAttemptRef,
        historical: buildReconciliationHistorical(input),
        derivedState: {
          family_masteries: proposal.masteryUpdates.filter((item) => item.level === 'family'),
          type_masteries: proposal.masteryUpdates.filter((item) => item.level === 'question_type'),
          review_tasks: reviewTasks,
          artifacts: artifactCandidates,
          error_book_hooks: errorBookHooks,
          local_signals: proposal.localSignals,
          marking_result: input.marking_result ?? null,
        },
        oldSnapshotRefs: normalizeArray(input.old_snapshot_refs),
        newSnapshotRefs: normalizeArray(
          normalizeArray(input.new_snapshot_refs).length > 0
            ? input.new_snapshot_refs
            : [proposal.sourceMarkRunRef],
        ).filter(Boolean),
      });

      return {
        ...proposal.releaseScopePosture,
        proposal_key: proposal.proposal_key,
        guardrail_decisions: proposal.guardrail_decisions,
        proposed_mastery_effects: proposal.proposedMasteryEffects,
        proposed_review_tasks: proposal.proposedReviewTasks,
        proposed_artifact_suggestions: proposal.proposedArtifactSuggestions,
        mastery_updates: proposal.masteryUpdates,
        local_signals: proposal.localSignals,
        review_tasks: reviewTasks,
        artifact_candidates: artifactCandidates,
        error_book_hooks: errorBookHooks,
        reconciliation,
        generated_at: now().toISOString(),
      };
    },
  };
}

export async function applyLearningEffects(input = {}, dependencies = {}) {
  const supabase = dependencies.supabase || input.supabase || null;
  const orchestrator = createMasteryOrchestrator({
    ...dependencies,
    supabase,
    reviewTaskService:
      dependencies.reviewTaskService
      || (supabase ? createDefaultReviewTaskService(supabase) : createReviewTaskService()),
    artifactService:
      dependencies.artifactService
      || createArtifactService({
        artifactRepository:
          dependencies.artifactRepository || (supabase ? createArtifactRepository(supabase) : null),
        artifactContentRepository:
          dependencies.artifactContentRepository
          || (supabase ? createArtifactContentRepository(supabase) : null),
      }),
    reconciliationService:
      dependencies.reconciliationService
      || (supabase ? createDefaultReconciliationService(supabase) : createReconciliationService()),
  });

  return orchestrator.applyLearningEffects(input);
}
