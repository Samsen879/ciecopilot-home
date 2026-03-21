import { createReviewTaskRepository } from '../repositories/review-task-repository.js';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
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
  const dueAt = new Date(now.getTime() + ONE_DAY_IN_MS).toISOString();
  const targetQuestionTypeId =
    input.repair_target_question_type_id
    || input.question_context?.question_type_id
    || null;
  const targetKind = pickTargetKind({
    targetQuestionTypeId,
    familyId: input.question_context?.family_id ?? null,
  });

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
    trigger_type: input.fallback_reason_code || 'non_released_fallback',
    mode: normalizeArray(input.misconception_tags).length > 0 ? 'trap_fix' : 'redo_variant',
    due_at: dueAt,
    priority: 'normal',
    estimated_minutes: 15,
    success_criteria: {
      posture: 'conservative_fallback',
      authoritative_scoring_allowed: false,
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

      const stored = await reviewTaskRepository.insertReviewTask(payload);
      return [
        {
          ...stored,
          target_topic_path: payload.target_topic_path,
        },
      ];
    },
  };
}

export function createDefaultReviewTaskService(client, options = {}) {
  return createReviewTaskService({
    ...options,
    reviewTaskRepository: createReviewTaskRepository(client),
  });
}
