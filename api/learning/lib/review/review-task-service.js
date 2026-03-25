import { createReviewTaskRepository } from '../repositories/review-task-repository.js';
import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import {
  buildReviewTaskSchedulerSeed,
  mergeReviewTaskPayload,
  pickReviewTaskMergeCandidate,
} from './review-scheduler-policy.js';

const REVIEW_TASK_INTENTS = new Set(['complete', 'reschedule', 'snooze', 'reopen']);
const REVIEW_TASK_COMPLETION_OUTCOMES = new Set(['completed', 'partial']);
const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);
const REOPENABLE_REVIEW_TASK_STATUSES = new Set(['completed', 'partial']);

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasTypedRef(value) {
  if (!isPlainObject(value) || !normalizeString(value.kind)) {
    return false;
  }

  return Object.entries(value).some(([key, refValue]) =>
    key !== 'kind' && normalizeString(refValue));
}

function hasCompletionEvidenceSignal(evidence) {
  if (!isPlainObject(evidence)) {
    return false;
  }

  if (normalizeString(evidence.summary) || normalizeString(evidence.note)) {
    return true;
  }

  if (hasTypedRef(evidence.artifact_ref) || hasTypedRef(evidence.attempt_ref) || hasTypedRef(evidence.mark_run_ref)) {
    return true;
  }

  if (Array.isArray(evidence.evidence_refs) && evidence.evidence_refs.some(hasTypedRef)) {
    return true;
  }

  return false;
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function buildInvalidPayload(message, details) {
  return new LearningHttpError(LEARNING_ERROR_CODES.INVALID_PAYLOAD, message, {
    status: 400,
    details,
  });
}

function buildReviewTaskNotFound() {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.REVIEW_TASK_NOT_FOUND,
    'Review task not found.',
    {
      status: 404,
    },
  );
}

function buildReviewTaskConflict(message, details) {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.REVIEW_TASK_STATE_CONFLICT,
    message,
    {
      status: 409,
      details,
    },
  );
}

function buildAuthForbidden(details) {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.AUTH_FORBIDDEN,
    'Authenticated user cannot access this review task.',
    {
      status: 403,
      details,
    },
  );
}

function normalizeIsoTimestamp(value, field) {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw buildInvalidPayload(`${field} is required.`, { field });
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw buildInvalidPayload(`${field} must be a valid ISO-8601 timestamp.`, { field });
  }

  return parsed.toISOString();
}

function normalizeCompletionEvidence(input = {}) {
  if (!isPlainObject(input) || !hasCompletionEvidenceSignal(input)) {
    throw buildInvalidPayload(
      'completion_evidence must include summary, note, or typed reference evidence.',
      { field: 'completion_evidence' },
    );
  }

  return clone(input);
}

function validatePatchInput({
  reviewTaskId,
  intent,
  completionOutcome,
  completionEvidence,
  dueAt,
} = {}) {
  if (!normalizeString(reviewTaskId)) {
    throw buildInvalidPayload('review_task_id is required.', { field: 'review_task_id' });
  }

  if (!REVIEW_TASK_INTENTS.has(intent)) {
    throw buildInvalidPayload('Review-task lifecycle writes must use explicit intents.', {
      field: 'intent',
    });
  }

  if (intent === 'complete' && !REVIEW_TASK_COMPLETION_OUTCOMES.has(completionOutcome)) {
    throw buildInvalidPayload('completion_outcome must be completed or partial.', {
      field: 'completion_outcome',
    });
  }

  if (intent === 'complete') {
    normalizeCompletionEvidence(completionEvidence);
  }

  if ((intent === 'reschedule' || intent === 'snooze') && !normalizeString(dueAt)) {
    throw buildInvalidPayload('due_at is required for schedule changes.', {
      field: 'due_at',
    });
  }
}

function buildCompletionEvidence(input, completionOutcome, timestamp) {
  return {
    ...normalizeCompletionEvidence(input),
    outcome: completionOutcome,
    recorded_at: timestamp,
  };
}

function buildSchedulePatch(reviewTask, intent, dueAt, timestamp) {
  if (!ACTIVE_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw buildReviewTaskConflict('Only open or partial review tasks can change schedule.', {
      review_task_id: reviewTask.review_task_id,
      status: reviewTask.status,
      intent,
    });
  }

  const normalizedDueAt = normalizeIsoTimestamp(dueAt, 'due_at');
  const nextDueAtMs = new Date(normalizedDueAt).getTime();
  const nowMs = new Date(timestamp).getTime();

  if (nextDueAtMs <= nowMs) {
    throw buildInvalidPayload('due_at must be in the future.', {
      field: 'due_at',
    });
  }

  if (intent === 'snooze') {
    const currentDueAtMs = normalizeString(reviewTask.due_at)
      ? new Date(reviewTask.due_at).getTime()
      : null;
    const minimumDueAtMs = currentDueAtMs && currentDueAtMs > nowMs
      ? currentDueAtMs
      : nowMs;

    if (nextDueAtMs <= minimumDueAtMs) {
      throw buildInvalidPayload('snooze must move due_at later than the current schedule.', {
        field: 'due_at',
      });
    }
  }

  const schedulerPolicy = reviewTask?.success_criteria?.scheduler_policy ?? {};
  if (schedulerPolicy?.route === 'immediate_repair') {
    const maxDeferralAt = normalizeString(schedulerPolicy.immediate_repair_max_deferral_at);
    if (maxDeferralAt) {
      const maxDeferralAtMs = new Date(maxDeferralAt).getTime();
      if (Number.isFinite(maxDeferralAtMs) && nextDueAtMs > maxDeferralAtMs) {
        throw buildInvalidPayload(
          'Immediate-repair tasks cannot move beyond the freshness deferral window.',
          { field: 'due_at' },
        );
      }
    }
  }

  return {
    due_at: normalizedDueAt,
    updated_at: timestamp,
  };
}

function buildReopenPatch(reviewTask, timestamp) {
  if (!REOPENABLE_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw buildReviewTaskConflict('Only completed or partial review tasks can be reopened.', {
      review_task_id: reviewTask.review_task_id,
      status: reviewTask.status,
    });
  }

  const existingEvidence = isPlainObject(reviewTask.completion_evidence)
    ? clone(reviewTask.completion_evidence)
    : {};

  return {
    status: 'open',
    completion_evidence: {
      ...existingEvidence,
      reopened_at: timestamp,
      reopened_from_status: reviewTask.status,
    },
    updated_at: timestamp,
  };
}

function buildCompletionPatch(reviewTask, completionOutcome, completionEvidence, timestamp) {
  if (!ACTIVE_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw buildReviewTaskConflict('Only open or partial review tasks can be completed.', {
      review_task_id: reviewTask.review_task_id,
      status: reviewTask.status,
    });
  }

  return {
    status: completionOutcome,
    completion_evidence: buildCompletionEvidence(
      completionEvidence,
      completionOutcome,
      timestamp,
    ),
    updated_at: timestamp,
  };
}

function pickTargetKind({ targetQuestionTypeId, familyId } = {}) {
  if (targetQuestionTypeId) {
    return 'question_type';
  }

  if (familyId) {
    return 'family';
  }

  return 'misconception_tag';
}

function buildReviewTaskPayload(input = {}, now = new Date()) {
  const targetQuestionTypeId =
    input.repair_target_question_type_id
    || input.question_context?.question_type_id
    || null;
  const scheduler = buildReviewTaskSchedulerSeed({
    now,
    misconceptionTags: input.misconception_tags,
    triggerType: input.trigger_type,
    regressionRecovery: input.regression_recovery === true,
    learnerGoal: input.learner_goal ?? null,
    fallbackReasonCode: input.fallback_reason_code ?? null,
  });
  const targetKind = pickTargetKind({
    targetQuestionTypeId,
    familyId: input.question_context?.family_id ?? null,
  });
  const partResults = normalizeArray(input.marking_result?.part_results).map((partResult) => ({
    part_id: partResult?.part_id ?? null,
    subpart_id: partResult?.subpart_id ?? null,
    score_awarded: Number(partResult?.score_awarded ?? 0),
    score_max: Number(partResult?.score_max ?? 0),
  }));
  const ambiguousPartMappingCount = Number(
    input.marking_result?.marking_summary?.ambiguous_rubric_point_result_count ?? 0,
  );

  return {
    user_id: input.user_id,
    target_kind: targetKind,
    target_topic_id: input.repair_target_topic_id,
    target_family_id: input.question_context?.family_id ?? null,
    target_question_type_id: targetQuestionTypeId,
    target_misconception_tags: normalizeArray(input.misconception_tags),
    related_artifact_refs: normalizeArray(input.related_artifact_refs),
    source_question_id: input.question_id ?? null,
    source_attempt_ref: input.source_attempt_ref ?? null,
    trigger_type: scheduler.triggerType,
    mode: scheduler.mode,
    due_at: scheduler.dueAt,
    priority: scheduler.priority,
    estimated_minutes: 15,
    success_criteria: {
      posture: 'conservative_fallback',
      authoritative_scoring_allowed: false,
      coverage_scope: input.marking_result?.marking_summary?.coverage_scope ?? 'question',
      local_signal_only: input.marking_result?.marking_summary?.local_signal_only === true,
      ambiguous_part_mapping_count: ambiguousPartMappingCount,
      part_results: partResults,
      fallback_reason_code: input.fallback_reason_code ?? null,
      scheduler_policy: scheduler.policy,
    },
    completion_evidence: {},
    status: 'open',
    target_topic_path: input.repair_target_topic_path ?? null,
  };
}

export function createReviewTaskService({
  reviewTaskRepository = null,
  now = () => new Date(),
} = {}) {
  return {
    async generateTasksFromOutcome(input = {}) {
      if (input.authoritative_scoring_allowed) {
        return [];
      }

      if (!input.repair_target_topic_id) {
        return [];
      }

      const payload = buildReviewTaskPayload(input, now());

      if (!reviewTaskRepository) {
        return [payload];
      }

      const activeTasks = await reviewTaskRepository.listReviewTaskProjectionsByUser?.(payload.user_id)
        ?? [];
      const mergeCandidate = pickReviewTaskMergeCandidate(activeTasks, payload);
      if (mergeCandidate?.review_task_id) {
        const mergedPatch = mergeReviewTaskPayload(
          mergeCandidate,
          payload,
          now().toISOString(),
        );
        const merged = await reviewTaskRepository.updateReviewTask(
          mergeCandidate.review_task_id,
          mergedPatch,
        );
        return [
          {
            ...mergeCandidate,
            ...merged,
            target_topic_path:
              payload.target_topic_path ?? mergeCandidate.target_topic_path ?? null,
          },
        ];
      }

      const stored = await reviewTaskRepository.insertReviewTask(payload);
      return [
        {
          ...stored,
          target_topic_path: payload.target_topic_path,
        },
      ];
    },

    async patchReviewTask({
      userId,
      reviewTaskId,
      intent,
      completionOutcome = null,
      completionEvidence = null,
      dueAt = null,
    } = {}) {
      validatePatchInput({
        reviewTaskId,
        intent,
        completionOutcome,
        completionEvidence,
        dueAt,
      });

      if (!reviewTaskRepository?.getReviewTaskById || !reviewTaskRepository?.updateReviewTask) {
        throw new Error('reviewTaskRepository is required for review-task writes.');
      }

      const reviewTask = clone(await reviewTaskRepository.getReviewTaskById(reviewTaskId));
      if (!reviewTask) {
        throw buildReviewTaskNotFound();
      }

      if (reviewTask.user_id !== userId) {
        throw buildAuthForbidden({
          review_task_id: reviewTask.review_task_id,
        });
      }

      const timestamp = now().toISOString();
      let patch = null;

      if (intent === 'complete') {
        patch = buildCompletionPatch(
          reviewTask,
          completionOutcome,
          completionEvidence,
          timestamp,
        );
      } else if (intent === 'reopen') {
        patch = buildReopenPatch(reviewTask, timestamp);
      } else {
        patch = buildSchedulePatch(reviewTask, intent, dueAt, timestamp);
      }

      const updated = await reviewTaskRepository.updateReviewTask(reviewTask.review_task_id, patch);
      const projection = await reviewTaskRepository.getReviewTaskProjectionById?.(
        reviewTask.review_task_id,
      );

      return {
        review_task: projection || updated,
      };
    },
  };
}

export function createDefaultReviewTaskService(client, options = {}) {
  return createReviewTaskService({
    ...options,
    reviewTaskRepository: createReviewTaskRepository(client),
  });
}

export async function patchLearningReviewTask({
  client,
  ...input
} = {}) {
  return createDefaultReviewTaskService(client, input.now ? { now: input.now } : {})
    .patchReviewTask(input);
}
