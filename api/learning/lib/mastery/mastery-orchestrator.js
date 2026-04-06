import { buildAttemptRef, buildMarkRunRef } from '../contracts/runtime-contract.js';
import { evaluateReleasedFamilyEvidenceGate } from '../contracts/released-family-gate.js';
import { resolveInlineReleasedScoringPosture } from '../contracts/released-scope-core.js';
import { createReviewTaskService } from '../review/review-task-service.js';
import { createDefaultReviewTaskService } from '../review/review-task-service.js';
import { createArtifactService } from '../artifacts/artifact-service.js';
import { createArtifactRepository } from '../repositories/artifact-repository.js';
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

function getQuestionContext(input = {}) {
  return input.question_context || {};
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

  if (basePosture?.fallback_reason_code !== 'non_pilot_question_type') {
    return basePosture;
  }

  const releaseEvidence = evaluateReleasedFamilyEvidenceGate(questionContext.question_type_id);
  const releaseEvidencePosture = releaseEvidence.ok
    ? resolveInlineReleasedScoringPosture({
      questionTypeId: questionContext.question_type_id,
      questionTypeReleaseState:
        questionContext.question_type_release_state
        ?? questionContext.primary_question_type_release_state
        ?? null,
      candidateRubricRefs: questionContext.candidate_rubric_refs,
      classificationConfidence: questionContext.classification_confidence,
      uncertaintyValidated: input.uncertainty_validated ?? false,
      isPilotQuestionType: true,
    })
    : null;

  if (!releaseEvidencePosture?.authoritative_scoring_allowed) {
    return basePosture;
  }

  return releaseEvidencePosture;
}

export function createMasteryOrchestrator({
  reviewTaskService = null,
  artifactService = null,
  reconciliationService = null,
  now = () => new Date(),
} = {}) {
  return {
    async applyLearningEffects(input = {}) {
      const questionContext = getQuestionContext(input);
      const subjectCode = resolveSubjectCodeFromRuntimeInput(input, questionContext);
      const adapter = getSubjectAdapter(subjectCode);
      const releaseScopePosture = resolveLearningEffectsPosture({
        input,
        questionContext,
        adapter,
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
      };
      const masteryProjection = adapter.mastery.buildMasteryProjection({
        input,
        questionContext,
        releaseScopePosture,
      });
      const localSignals = masteryProjection.localSignals;
      const masteryUpdates = masteryProjection.masteryUpdates;
      const reviewCapabilityPosture = adapter.meta.capability_posture?.review
        ?? SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED;
      const reviewTasks = releaseScopePosture.authoritative_scoring_allowed
        || reviewCapabilityPosture !== SUBJECT_ADAPTER_CAPABILITY_POSTURES.SUPPORTED
        ? []
        : await reviewTaskService.generateTasksFromOutcome(reviewTaskInput);
      const artifactCandidates = await artifactService.buildArtifactCandidates(artifactInput);
      const errorBookHooks = buildErrorBookHooks({
        input,
        subjectCode,
        artifactCandidates,
        repairTopicId,
        repairTopicPath,
      });
      const reconciliation = await reconciliationService.reconcileDerivedState({
        triggerSource: input.reconciliation_trigger_source || 'marking_correction',
        sourceRef: sourceMarkRunRef || sourceAttemptRef,
        historical: buildReconciliationHistorical(input),
        derivedState: {
          family_masteries: masteryUpdates.filter((item) => item.level === 'family'),
          type_masteries: masteryUpdates.filter((item) => item.level === 'question_type'),
          review_tasks: reviewTasks,
          artifacts: artifactCandidates,
          error_book_hooks: errorBookHooks,
          local_signals: localSignals,
          marking_result: input.marking_result ?? null,
        },
        oldSnapshotRefs: normalizeArray(input.old_snapshot_refs),
        newSnapshotRefs: normalizeArray(
          normalizeArray(input.new_snapshot_refs).length > 0
            ? input.new_snapshot_refs
            : [sourceMarkRunRef],
        ).filter(Boolean),
      });

      return {
        ...releaseScopePosture,
        mastery_updates: masteryUpdates,
        local_signals: localSignals,
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
    reviewTaskService:
      dependencies.reviewTaskService
      || (supabase ? createDefaultReviewTaskService(supabase) : createReviewTaskService()),
    artifactService:
      dependencies.artifactService
      || createArtifactService({
        artifactRepository:
          dependencies.artifactRepository || (supabase ? createArtifactRepository(supabase) : null),
      }),
    reconciliationService:
      dependencies.reconciliationService
      || (supabase ? createDefaultReconciliationService(supabase) : createReconciliationService()),
  });

  return orchestrator.applyLearningEffects(input);
}
