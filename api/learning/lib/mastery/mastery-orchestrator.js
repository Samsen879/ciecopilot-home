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

function getQuestionContext(input = {}) {
  return input.question_context || {};
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

function buildGuardrailDecisions(releaseScopePosture = {}) {
  const fallbackReason = normalizeString(releaseScopePosture.fallback_reason_code) || null;

  return {
    authoritative_scoring_allowed: Boolean(releaseScopePosture.authoritative_scoring_allowed),
    release_scope_status: normalizeString(releaseScopePosture.release_scope_status) || null,
    learning_signal_posture: normalizeString(releaseScopePosture.learning_signal_posture) || null,
    fallback_mode: normalizeString(releaseScopePosture.fallback_mode) || null,
    fallback_reason_code: fallbackReason,
    reasons: fallbackReason ? [fallbackReason] : ['released_scoring'],
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
  const masteryUpdates = nonAuthoritativeRuntimeInput ? [] : masteryProjection.masteryUpdates;
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
    guardrail_decisions: buildGuardrailDecisions(releaseScopePosture),
    releaseScopePosture,
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
