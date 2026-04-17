import { createReviewTaskRepository } from '../repositories/review-task-repository.js';
import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import { isNonAuthoritativeRuntimeInput } from '../contracts/runtime-authority-posture.js';
import { LearningHttpError } from '../http/learning-http.js';
import {
  REVIEW_SCHEDULER_POLICY,
  buildReviewTaskExplainabilitySeed,
  mergeReviewTaskPayload,
  normalizeSchedulerProjectionItem,
  pickReviewTaskMergeCandidate,
} from './review-scheduler-policy.js';
import {
  getSubjectAdapter,
  resolveSubjectCodeFromRuntimeInput,
} from '../subjects/subject-adapter-registry.js';

const REVIEW_TASK_ERROR_CODES = Object.freeze({
  NOT_FOUND: 'review_task_not_found',
  STATE_CONFLICT: 'review_task_state_conflict',
});

const REVIEW_ACTION_CONTRACT_ENV_FLAG = 'LEARNING_REVIEW_ACTION_CONTRACT';
const REVIEW_TASK_INTENTS = new Set(['complete', 'reschedule', 'snooze', 'reopen']);
const REVIEW_TASK_OPERATOR_INTENTS = new Set(['invalidate', 'withdraw']);
const REVIEW_TASK_COMPLETION_OUTCOMES = new Set(['completed', 'partial']);
const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);
const REOPENABLE_REVIEW_TASK_STATUSES = new Set(['completed', 'partial']);
const REVIEW_TASK_BACKEND_DISPOSITIONS = Object.freeze({
  invalidate: 'invalidated',
  withdraw: 'withdrawn_by_policy',
  mergedIntoSuccessor: 'merged_into_successor',
});

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
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

function addHours(date, hours) {
  return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}

function parseTimestamp(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isReviewActionContractEnabled(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return process.env[REVIEW_ACTION_CONTRACT_ENV_FLAG] === 'true';
}

function buildInvalidPayload(message, details) {
  return new LearningHttpError(LEARNING_ERROR_CODES.INVALID_PAYLOAD, message, {
    status: 400,
    details,
  });
}

function buildReviewTaskNotFound() {
  return new LearningHttpError(
    REVIEW_TASK_ERROR_CODES.NOT_FOUND,
    'Review task not found.',
    {
      status: 404,
    },
  );
}

function buildReviewTaskConflict(message, details) {
  return new LearningHttpError(
    REVIEW_TASK_ERROR_CODES.STATE_CONFLICT,
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

function normalizeOptionalCompletionEvidence(input = null) {
  if (input === null || input === undefined) {
    return {};
  }

  return normalizeCompletionEvidence(input);
}

function resolveReviewTaskPosture(input = {}) {
  const successCriteria = isPlainObject(input?.success_criteria) ? input.success_criteria : {};
  const storedPosture = normalizeString(successCriteria.posture);
  if (storedPosture) {
    return storedPosture;
  }

  return input.authoritative_scoring_allowed ? 'released_scoring_repair' : 'conservative_fallback';
}

function buildReviewTargetKey({
  targetKind,
  targetTopicId,
  targetFamilyId,
  targetQuestionTypeId,
  posture,
} = {}) {
  return [
    normalizeString(targetKind, 'untyped'),
    normalizeString(targetTopicId, 'untopic'),
    normalizeString(targetFamilyId, 'unfamily'),
    normalizeString(targetQuestionTypeId, 'untype'),
    normalizeString(posture, 'unknown_posture'),
  ].join('|');
}

function getReviewTargetKey(task = {}) {
  const successCriteria = isPlainObject(task?.success_criteria) ? task.success_criteria : {};
  const storedKey = normalizeString(successCriteria.review_target_key);
  if (storedKey) {
    return storedKey;
  }

  return buildReviewTargetKey({
    targetKind: task?.target_kind,
    targetTopicId: task?.target_topic_id,
    targetFamilyId: task?.target_family_id,
    targetQuestionTypeId: task?.target_question_type_id,
    posture: resolveReviewTaskPosture(task),
  });
}

function buildReviewActionContractState(reviewTask = {}) {
  const successCriteria = isPlainObject(reviewTask?.success_criteria) ? reviewTask.success_criteria : {};
  const existing = isPlainObject(successCriteria.review_action_contract)
    ? clone(successCriteria.review_action_contract)
    : {};
  const reviewTargetKey = getReviewTargetKey(reviewTask);

  return {
    ...existing,
    review_target_key: reviewTargetKey,
    lineage_key:
      normalizeString(existing.lineage_key)
      || `${reviewTargetKey}:${normalizeString(reviewTask.review_task_id, 'pending')}`,
    last_lineage_action: normalizeString(existing.last_lineage_action),
    schedule_provenance: normalizeArray(existing.schedule_provenance).map((entry) => clone(entry)),
  };
}

function withReviewActionContract(reviewTask, patch = {}) {
  const existingSuccessCriteria = isPlainObject(reviewTask?.success_criteria)
    ? clone(reviewTask.success_criteria)
    : {};
  const existingContract = buildReviewActionContractState(reviewTask);

  return {
    ...existingSuccessCriteria,
    review_target_key: normalizeString(
      patch.review_target_key,
      existingSuccessCriteria.review_target_key ?? getReviewTargetKey(reviewTask),
    ),
    posture: normalizeString(
      patch.posture,
      existingSuccessCriteria.posture ?? resolveReviewTaskPosture(reviewTask),
    ),
    review_action_contract: {
      ...existingContract,
      ...patch,
      review_target_key: normalizeString(
        patch.review_target_key,
        patch.review_target_key ?? existingContract.review_target_key,
      ),
      lineage_key: normalizeString(
        patch.lineage_key,
        patch.lineage_key ?? existingContract.lineage_key,
      ),
      last_lineage_action: normalizeString(
        patch.last_lineage_action,
        patch.last_lineage_action ?? existingContract.last_lineage_action,
      ),
      schedule_provenance:
        patch.schedule_provenance
          ? normalizeArray(patch.schedule_provenance).map((entry) => clone(entry))
          : existingContract.schedule_provenance,
    },
  };
}

function validatePatchInput({
  reviewTaskId,
  intent,
  completionOutcome,
  completionEvidence,
  dueAt,
  reviewActionContractEnabled = false,
} = {}) {
  if (!normalizeString(reviewTaskId)) {
    throw buildInvalidPayload('review_task_id is required.', { field: 'review_task_id' });
  }

  const allowedIntents = reviewActionContractEnabled
    ? new Set([...REVIEW_TASK_INTENTS, ...REVIEW_TASK_OPERATOR_INTENTS])
    : REVIEW_TASK_INTENTS;

  if (!allowedIntents.has(intent)) {
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

  if (
    (intent === 'reschedule' || (intent === 'snooze' && !reviewActionContractEnabled))
    && !normalizeString(dueAt)
  ) {
    throw buildInvalidPayload('due_at is required for schedule changes.', {
      field: 'due_at',
    });
  }

  if (reviewActionContractEnabled && (intent === 'invalidate' || intent === 'withdraw')) {
    normalizeOptionalCompletionEvidence(completionEvidence);
  }
}

function buildCompletionEvidence(input, completionOutcome, timestamp) {
  return {
    ...normalizeCompletionEvidence(input),
    outcome: completionOutcome,
    recorded_at: timestamp,
  };
}

function buildSkipOnceDueAt(reviewTask, timestamp) {
  const nowDate = parseTimestamp(timestamp) || new Date(timestamp);
  const currentDueAt = parseTimestamp(reviewTask?.due_at);
  const baseDate = currentDueAt && currentDueAt.getTime() > nowDate.getTime()
    ? currentDueAt
    : nowDate;
  const route = normalizeString(reviewTask?.success_criteria?.scheduler_policy?.route)
    || normalizeString(reviewTask?.trigger_type)
    || 'short_delay';
  const hours = route === 'spaced_review'
    ? REVIEW_SCHEDULER_POLICY.SPACED_REVIEW_HOURS
    : route === 'short_delay'
      ? REVIEW_SCHEDULER_POLICY.SHORT_DELAY_HOURS
      : REVIEW_SCHEDULER_POLICY.IMMEDIATE_REPAIR_MAX_DEFERRAL_HOURS;

  return addHours(baseDate, hours).toISOString();
}

function buildSchedulePatch(
  reviewTask,
  intent,
  dueAt,
  timestamp,
  { reviewActionContractEnabled = false } = {},
) {
  if (!ACTIVE_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw buildReviewTaskConflict('Only open or partial review tasks can change schedule.', {
      review_task_id: reviewTask.review_task_id,
      status: reviewTask.status,
      intent,
    });
  }

  const contractState = reviewActionContractEnabled
    ? buildReviewActionContractState(reviewTask)
    : null;
  const requestedDueAt = reviewActionContractEnabled && intent === 'snooze'
    ? dueAt ?? buildSkipOnceDueAt(reviewTask, timestamp)
    : dueAt;
  const lineageAction = intent === 'snooze' ? 'skip_once' : 'reschedule';

  if (
    reviewActionContractEnabled
    && intent === 'snooze'
    && contractState?.last_lineage_action === 'skip_once'
  ) {
    throw buildReviewTaskConflict('skip_once cannot be applied consecutively to the same lineage.', {
      review_task_id: reviewTask.review_task_id,
      lineage_key: contractState.lineage_key,
    });
  }

  const normalizedDueAt = normalizeIsoTimestamp(requestedDueAt, 'due_at');
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

  const patch = {
    due_at: normalizedDueAt,
    updated_at: timestamp,
  };

  if (!reviewActionContractEnabled) {
    return patch;
  }

  return {
    ...patch,
    success_criteria: withReviewActionContract(reviewTask, {
      last_lineage_action: lineageAction,
      last_action_recorded_at: timestamp,
      schedule_provenance: [
        ...contractState.schedule_provenance,
        {
          intent: lineageAction,
          previous_due_at: normalizeString(reviewTask.due_at),
          next_due_at: normalizedDueAt,
          changed_at: timestamp,
        },
      ],
    }),
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

function buildOperatorDispositionPatch(reviewTask, intent, disposition, completionEvidence, timestamp) {
  if (!ACTIVE_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw buildReviewTaskConflict('Only open or partial review tasks can be updated by operator disposition.', {
      review_task_id: reviewTask.review_task_id,
      status: reviewTask.status,
      intent,
    });
  }

  return {
    status: 'expired',
    completion_evidence: {
      ...normalizeOptionalCompletionEvidence(completionEvidence),
      backend_disposition: disposition,
      recorded_at: timestamp,
    },
    success_criteria: withReviewActionContract(reviewTask, {
      last_lineage_action: disposition,
      last_action_recorded_at: timestamp,
    }),
    updated_at: timestamp,
  };
}

function pickNearestSuccessorDueAt(reviewTask, timestamp) {
  const nowDate = parseTimestamp(timestamp) || new Date(timestamp);
  const currentDueAt = parseTimestamp(reviewTask?.due_at);
  if (!currentDueAt) {
    return nowDate.toISOString();
  }

  return currentDueAt.getTime() <= nowDate.getTime()
    ? currentDueAt.toISOString()
    : nowDate.toISOString();
}

function buildPartialSuccessorPayload(reviewTask, timestamp) {
  const contractState = buildReviewActionContractState(reviewTask);
  const successCriteria = isPlainObject(reviewTask?.success_criteria)
    ? clone(reviewTask.success_criteria)
    : {};

  return {
    user_id: reviewTask.user_id,
    target_kind: reviewTask.target_kind,
    target_topic_id: reviewTask.target_topic_id,
    target_family_id: reviewTask.target_family_id ?? null,
    target_question_type_id: reviewTask.target_question_type_id ?? null,
    target_misconception_tags: normalizeArray(reviewTask.target_misconception_tags),
    related_artifact_refs: normalizeArray(reviewTask.related_artifact_refs),
    source_question_id: reviewTask.source_question_id ?? null,
    source_attempt_ref: reviewTask.source_attempt_ref ?? null,
    trigger_type: reviewTask.trigger_type,
    mode: reviewTask.mode,
    due_at: pickNearestSuccessorDueAt(reviewTask, timestamp),
    priority: reviewTask.priority ?? 'normal',
    estimated_minutes: reviewTask.estimated_minutes ?? null,
    success_criteria: {
      ...successCriteria,
      review_target_key: contractState.review_target_key,
      review_action_contract: {
        ...contractState,
        predecessor_review_task_ref: {
          kind: 'review_task',
          review_task_id: reviewTask.review_task_id,
        },
        last_lineage_action: 'partial',
        last_action_recorded_at: timestamp,
      },
    },
    completion_evidence: {},
    status: 'open',
    target_topic_path: reviewTask.target_topic_path ?? null,
  };
}

async function upsertPartialSuccessor(reviewTaskRepository, reviewTask, timestamp) {
  const successorPayload = buildPartialSuccessorPayload(reviewTask, timestamp);
  const reviewTargetKey = getReviewTargetKey(reviewTask);
  const activeTasks = await reviewTaskRepository.listReviewTaskProjectionsByUser?.(reviewTask.user_id) ?? [];
  const successorCandidate = activeTasks
    .filter((task) => task?.review_task_id !== reviewTask.review_task_id)
    .filter((task) => ACTIVE_REVIEW_TASK_STATUSES.has(task?.status))
    .find((task) => getReviewTargetKey(task) === reviewTargetKey);

  if (successorCandidate?.review_task_id) {
    const mergedPatch = {
      ...mergeReviewTaskPayload(successorCandidate, successorPayload, timestamp),
      status: 'open',
      success_criteria: withReviewActionContract(successorCandidate, {
        review_target_key: reviewTargetKey,
        predecessor_review_task_ref: {
          kind: 'review_task',
          review_task_id: reviewTask.review_task_id,
        },
        last_lineage_action: 'partial',
        last_action_recorded_at: timestamp,
      }),
    };

    return reviewTaskRepository.updateReviewTask(successorCandidate.review_task_id, mergedPatch);
  }

  return reviewTaskRepository.insertReviewTask(successorPayload);
}

async function patchPartialReviewTask(
  reviewTaskRepository,
  reviewTask,
  completionEvidence,
  timestamp,
) {
  if (!reviewTaskRepository?.insertReviewTask || !reviewTaskRepository?.listReviewTaskProjectionsByUser) {
    throw new Error('reviewTaskRepository must support insert/list for partial lineage writes.');
  }

  if (!ACTIVE_REVIEW_TASK_STATUSES.has(reviewTask.status)) {
    throw buildReviewTaskConflict('Only open or partial review tasks can be completed.', {
      review_task_id: reviewTask.review_task_id,
      status: reviewTask.status,
    });
  }

  const successor = await upsertPartialSuccessor(reviewTaskRepository, reviewTask, timestamp);
  const currentPatch = {
    status: 'expired',
    completion_evidence: {
      ...buildCompletionEvidence(completionEvidence, 'partial', timestamp),
      backend_disposition: REVIEW_TASK_BACKEND_DISPOSITIONS.mergedIntoSuccessor,
      successor_review_task_ref: {
        kind: 'review_task',
        review_task_id: successor.review_task_id,
      },
    },
    success_criteria: withReviewActionContract(reviewTask, {
      last_lineage_action: 'partial',
      last_action_recorded_at: timestamp,
      successor_review_task_ref: {
        kind: 'review_task',
        review_task_id: successor.review_task_id,
      },
    }),
    updated_at: timestamp,
  };
  await reviewTaskRepository.updateReviewTask(reviewTask.review_task_id, currentPatch);

  return successor;
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

function hasPositiveAwardDecision(decision = {}) {
  return decision?.awarded === true && Number(decision?.awarded_marks ?? 0) > 0;
}

function hasRepairSignal(input = {}) {
  if (input.regression_recovery === true) {
    return true;
  }

  if (normalizeArray(input.misconception_tags).length > 0) {
    return true;
  }

  const markingSummary = input.marking_result?.marking_summary ?? {};
  const decisions = normalizeArray(input.decisions);
  const hasPositiveDecision = decisions.some(hasPositiveAwardDecision);

  if (decisions.some((decision) =>
    decision?.awarded === false || Number(decision?.awarded_marks ?? 0) <= 0)) {
    return true;
  }

  if (
    markingSummary.conservative_part_mapping === true
    || Number(markingSummary.ambiguous_rubric_point_result_count ?? 0) > 0
  ) {
    return true;
  }

  if (hasPositiveDecision) {
    return false;
  }

  if (markingSummary.local_signal_only === true) {
    return true;
  }

  return decisions.length > 0 && !hasPositiveDecision;
}

export function shouldGenerateReviewTaskFromOutcome(input = {}) {
  if (!input.repair_target_topic_id) {
    return false;
  }

  if (isNonAuthoritativeRuntimeInput(input)) {
    return false;
  }

  if (!input.authoritative_scoring_allowed) {
    return true;
  }

  return hasRepairSignal(input);
}

function buildReviewTaskPayload(
  input = {},
  now = new Date(),
  { reviewActionContractEnabled = false } = {},
) {
  const targetQuestionTypeId =
    input.repair_target_question_type_id
    || input.question_context?.question_type_id
    || null;
  if (!shouldGenerateReviewTaskFromOutcome(input)) {
    return null;
  }

  const subjectCode = resolveSubjectCodeFromRuntimeInput(input, input.question_context);
  const adapter = getSubjectAdapter(subjectCode);
  const scheduler = adapter.review.buildSchedulerSeed({
    now,
    misconceptionTags: input.misconception_tags,
    triggerType: input.trigger_type,
    regressionRecovery: input.regression_recovery === true,
    learnerGoal: input.learner_goal ?? null,
    fallbackReasonCode: input.fallback_reason_code ?? null,
  });
  if (!scheduler) {
    return null;
  }
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
  const schedulerPolicy = scheduler.policy;
  const reviewTaskPosture = input.authoritative_scoring_allowed
    ? 'released_scoring_repair'
    : 'conservative_fallback';
  const reviewTargetKey = buildReviewTargetKey({
    targetKind,
    targetTopicId: input.repair_target_topic_id,
    targetFamilyId: input.question_context?.family_id ?? null,
    targetQuestionTypeId,
    posture: reviewTaskPosture,
  });
  const explainability = buildReviewTaskExplainabilitySeed({
    sourceQuestionId: input.question_id ?? null,
    sourceAttemptRef: input.source_attempt_ref ?? null,
    targetMisconceptionTags: input.misconception_tags,
    posture: reviewTaskPosture,
    postureReasonCode: input.authoritative_scoring_allowed ? 'released_scoring_repair' : null,
    fallbackReasonCode: input.fallback_reason_code ?? null,
    schedulerPolicy,
    coverageScope: input.marking_result?.marking_summary?.coverage_scope ?? 'question',
    localSignalOnly: input.marking_result?.marking_summary?.local_signal_only === true,
    partResults,
    ambiguousPartMappingCount,
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
    trigger_type: scheduler.triggerType,
    mode: scheduler.mode,
    due_at: scheduler.dueAt,
    priority: scheduler.priority,
    estimated_minutes: 15,
    success_criteria: {
      posture: reviewTaskPosture,
      authoritative_scoring_allowed: input.authoritative_scoring_allowed === true,
      coverage_scope: input.marking_result?.marking_summary?.coverage_scope ?? 'question',
      local_signal_only: input.marking_result?.marking_summary?.local_signal_only === true,
      ambiguous_part_mapping_count: ambiguousPartMappingCount,
      part_results: partResults,
      fallback_reason_code: input.fallback_reason_code ?? null,
      scheduler_policy: schedulerPolicy,
      explainability,
      ...(reviewActionContractEnabled ? { review_target_key: reviewTargetKey } : {}),
    },
    completion_evidence: {},
    status: 'open',
    target_topic_path: input.repair_target_topic_path ?? null,
  };
}

export function createReviewTaskService({
  reviewTaskRepository = null,
  now = () => new Date(),
  reviewActionContractEnabled = null,
} = {}) {
  const contractEnabled = isReviewActionContractEnabled(reviewActionContractEnabled);

  return {
    async generateTasksFromOutcome(input = {}) {
      const payload = buildReviewTaskPayload(input, now(), {
        reviewActionContractEnabled: contractEnabled,
      });
      if (!payload) {
        return [];
      }

      if (!reviewTaskRepository) {
        return [normalizeSchedulerProjectionItem(payload)];
      }

      const activeTasks = await reviewTaskRepository.listReviewTaskProjectionsByUser?.(payload.user_id)
        ?? [];
      const mergeCandidate = pickReviewTaskMergeCandidate(activeTasks, payload, {
        reviewActionContractEnabled: contractEnabled,
      });
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
          normalizeSchedulerProjectionItem({
            ...mergeCandidate,
            ...merged,
            target_topic_path:
              payload.target_topic_path ?? mergeCandidate.target_topic_path ?? null,
          }),
        ];
      }

      const stored = await reviewTaskRepository.insertReviewTask(payload);
      return [
        normalizeSchedulerProjectionItem({
          ...stored,
          target_topic_path: payload.target_topic_path,
        }),
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
        reviewActionContractEnabled: contractEnabled,
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
      let updated = null;
      let projectionId = reviewTask.review_task_id;

      if (contractEnabled && intent === 'complete' && completionOutcome === 'partial') {
        updated = await patchPartialReviewTask(
          reviewTaskRepository,
          reviewTask,
          completionEvidence,
          timestamp,
        );
        projectionId = updated.review_task_id;
      } else {
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
        } else if (contractEnabled && intent === 'invalidate') {
          patch = buildOperatorDispositionPatch(
            reviewTask,
            intent,
            REVIEW_TASK_BACKEND_DISPOSITIONS.invalidate,
            completionEvidence,
            timestamp,
          );
        } else if (contractEnabled && intent === 'withdraw') {
          patch = buildOperatorDispositionPatch(
            reviewTask,
            intent,
            REVIEW_TASK_BACKEND_DISPOSITIONS.withdraw,
            completionEvidence,
            timestamp,
          );
        } else {
          patch = buildSchedulePatch(reviewTask, intent, dueAt, timestamp, {
            reviewActionContractEnabled: contractEnabled,
          });
        }

        updated = await reviewTaskRepository.updateReviewTask(reviewTask.review_task_id, patch);
      }
      const projection = await reviewTaskRepository.getReviewTaskProjectionById?.(
        projectionId,
      );

      return {
        review_task: normalizeSchedulerProjectionItem(projection || updated),
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
