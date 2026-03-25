const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);
const HIGH_PRIORITY_VALUES = new Set(['high', 'urgent']);
const VALID_TRIGGER_TYPES = new Set([
  'immediate_repair',
  'short_delay',
  'spaced_review',
  'regression_recovery',
  'exam_polish',
]);

const PRIORITY_WEIGHT = Object.freeze({
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
});

const ROUTE_WEIGHT = Object.freeze({
  spaced_review: 1,
  short_delay: 2,
  exam_polish: 3,
  immediate_repair: 4,
  regression_recovery: 5,
});

export const REVIEW_SCHEDULER_POLICY = Object.freeze({
  DAILY_RECOMMENDATION_CAP: 3,
  MAX_HIGH_PRIORITY_OPEN_PER_TYPE: 1,
  IMMEDIATE_REPAIR_MAX_DEFERRAL_HOURS: 12,
  SHORT_DELAY_HOURS: 24,
  SPACED_REVIEW_HOURS: 72,
  EXAM_POLISH_HOURS: 12,
});

function normalizeString(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function parseTimestamp(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addHours(date, hours) {
  return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}

function priorityWeight(priority) {
  return PRIORITY_WEIGHT[normalizeString(priority, 'normal')] ?? PRIORITY_WEIGHT.normal;
}

function routeWeight(route) {
  return ROUTE_WEIGHT[normalizeString(route, 'short_delay')] ?? ROUTE_WEIGHT.short_delay;
}

function normalizeRoute(task = {}) {
  const storedPolicy = normalizeObject(task?.success_criteria)?.scheduler_policy;
  const storedRoute = normalizeString(storedPolicy?.route);
  if (storedRoute && VALID_TRIGGER_TYPES.has(storedRoute)) {
    return storedRoute;
  }

  const triggerType = normalizeString(task?.trigger_type);
  if (triggerType && VALID_TRIGGER_TYPES.has(triggerType)) {
    return triggerType;
  }

  return 'short_delay';
}

function buildReason(code, summary) {
  return { code, summary };
}

function typeGroupingKey(task = {}) {
  return normalizeString(task?.target_question_type_id)
    || normalizeString(task?.target_family_id)
    || normalizeString(task?.target_topic_id)
    || normalizeString(task?.review_task_id)
    || 'untyped';
}

function compareTaskRank(left, right) {
  const leftRoute = routeWeight(normalizeRoute(left));
  const rightRoute = routeWeight(normalizeRoute(right));
  if (leftRoute !== rightRoute) {
    return rightRoute - leftRoute;
  }

  const leftPriority = priorityWeight(left?.priority);
  const rightPriority = priorityWeight(right?.priority);
  if (leftPriority !== rightPriority) {
    return rightPriority - leftPriority;
  }

  const leftDue = parseTimestamp(left?.due_at)?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightDue = parseTimestamp(right?.due_at)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  return String(left?.created_at ?? '').localeCompare(String(right?.created_at ?? ''));
}

function summarizeReasonForState(state, route) {
  if (state === 'escalated' && route === 'regression_recovery') {
    return buildReason(
      'regression_recovery_due',
      'Escalated because repeated regression needs immediate recovery work.',
    );
  }

  if (state === 'escalated') {
    return buildReason(
      'fresh_immediate_repair',
      'Fresh repair evidence should be retried before it is spaced.',
    );
  }

  if (state === 'due') {
    return buildReason(
      'due_window_open',
      'Due because the current review window has opened.',
    );
  }

  if (state === 'deferred') {
    return buildReason(
      'freshness_window',
      'Deferred until the next spaced-review freshness window opens.',
    );
  }

  return null;
}

function buildStoredPolicy(policy = {}, fallbackReasonCode = null) {
  const normalizedPolicy = normalizeObject(policy);
  return {
    daily_recommendation_cap: REVIEW_SCHEDULER_POLICY.DAILY_RECOMMENDATION_CAP,
    max_high_priority_open_per_type: REVIEW_SCHEDULER_POLICY.MAX_HIGH_PRIORITY_OPEN_PER_TYPE,
    ...normalizedPolicy,
    ...(fallbackReasonCode ? { fallback_reason_code: fallbackReasonCode } : {}),
  };
}

export function buildReviewTaskSchedulerSeed({
  now = new Date(),
  misconceptionTags = [],
  triggerType = null,
  regressionRecovery = false,
  learnerGoal = null,
  fallbackReasonCode = null,
  freshnessBucket = null,
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const normalizedTriggerType = normalizeString(triggerType);
  const route = normalizedTriggerType && VALID_TRIGGER_TYPES.has(normalizedTriggerType)
    ? normalizedTriggerType
    : regressionRecovery
      ? 'regression_recovery'
      : normalizeString(learnerGoal) === 'exam_polish'
        ? 'exam_polish'
        : normalizeArray(misconceptionTags).length > 0
          ? 'immediate_repair'
          : 'short_delay';

  const dueDate = route === 'regression_recovery' || route === 'immediate_repair'
    ? nowDate
    : route === 'exam_polish'
      ? addHours(nowDate, REVIEW_SCHEDULER_POLICY.EXAM_POLISH_HOURS)
      : route === 'spaced_review'
        ? addHours(nowDate, REVIEW_SCHEDULER_POLICY.SPACED_REVIEW_HOURS)
        : addHours(nowDate, REVIEW_SCHEDULER_POLICY.SHORT_DELAY_HOURS);

  const mode = route === 'spaced_review'
    ? 'quick_recall'
    : route === 'exam_polish'
      ? 'timed_check'
      : normalizeArray(misconceptionTags).length > 0
        ? 'trap_fix'
        : 'redo_variant';

  const priority = route === 'regression_recovery'
    ? 'urgent'
    : route === 'immediate_repair' || route === 'exam_polish'
      ? 'high'
      : 'normal';

  const resolvedFreshnessBucket = freshnessBucket
    || (route === 'immediate_repair'
      ? 'fresh'
      : route === 'regression_recovery'
        ? 'stale'
        : route === 'spaced_review'
          ? 'current'
          : 'cooling');

  return {
    triggerType: route,
    mode,
    priority,
    dueAt: dueDate.toISOString(),
    policy: buildStoredPolicy({
      route,
      freshness_bucket: resolvedFreshnessBucket,
      immediate_repair_max_deferral_at:
        route === 'immediate_repair'
          ? addHours(
            nowDate,
            REVIEW_SCHEDULER_POLICY.IMMEDIATE_REPAIR_MAX_DEFERRAL_HOURS,
          ).toISOString()
          : null,
    }, fallbackReasonCode),
  };
}

export function buildSchedulerStateFromTask(task = {}, options = {}) {
  const nowDate = parseTimestamp(options.now) || new Date();
  const route = normalizeRoute(task);
  const dueAtDate = parseTimestamp(task?.due_at);

  if (!ACTIVE_REVIEW_TASK_STATUSES.has(task?.status)) {
    return {
      value: task?.status === 'completed' ? 'completed' : 'open',
      label: task?.status === 'completed' ? 'Completed' : 'Open',
      tone: task?.status === 'completed' ? 'success' : 'neutral',
      reason_code: null,
      reason_summary: null,
    };
  }

  if (
    (route === 'immediate_repair' || route === 'regression_recovery')
    && dueAtDate
    && dueAtDate.getTime() <= nowDate.getTime()
  ) {
    const reason = summarizeReasonForState('escalated', route);
    return {
      value: 'escalated',
      label: 'Escalated',
      tone: 'danger',
      reason_code: reason.code,
      reason_summary: reason.summary,
    };
  }

  if (dueAtDate && dueAtDate.getTime() <= nowDate.getTime()) {
    const reason = summarizeReasonForState('due', route);
    return {
      value: 'due',
      label: 'Due',
      tone: 'warning',
      reason_code: reason.code,
      reason_summary: reason.summary,
    };
  }

  if (dueAtDate) {
    const reason = summarizeReasonForState('deferred', route);
    return {
      value: 'deferred',
      label: 'Deferred',
      tone: 'neutral',
      reason_code: reason.code,
      reason_summary: reason.summary,
    };
  }

  return {
    value: 'open',
    label: 'Open',
    tone: 'neutral',
    reason_code: null,
    reason_summary: null,
  };
}

export function summarizeReviewQueueItems(items = []) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const key = item?.scheduler_state?.value;
    if (key && Object.prototype.hasOwnProperty.call(acc, key)) {
      acc[key] += 1;
    }
    acc.total += 1;
    return acc;
  }, {
    total: 0,
    escalated: 0,
    due: 0,
    open: 0,
    deferred: 0,
    completed: 0,
    blocked: 0,
  });
}

export function deriveReviewQueueProjection(tasks = [], options = {}) {
  const nowDate = parseTimestamp(options.now) || new Date();
  const items = normalizeArray(tasks).map((task) => {
    const successCriteria = normalizeObject(task?.success_criteria);
    const schedulerPolicy = buildStoredPolicy(
      successCriteria.scheduler_policy,
      successCriteria.scheduler_policy?.fallback_reason_code
        ?? successCriteria.fallback_reason_code
        ?? null,
    );

    return {
      ...task,
      success_criteria: successCriteria,
      scheduler_policy: schedulerPolicy,
      scheduler_state: buildSchedulerStateFromTask(task, { now: nowDate.toISOString() }),
      scheduler_reasons: [],
    };
  });

  const activeItems = items
    .filter((task) => ACTIVE_REVIEW_TASK_STATUSES.has(task?.status))
    .sort(compareTaskRank);

  const strongestHighPriorityTaskIdByType = new Map();
  for (const task of activeItems) {
    if (!HIGH_PRIORITY_VALUES.has(normalizeString(task?.priority, 'normal'))) {
      continue;
    }

    const groupKey = typeGroupingKey(task);
    if (!strongestHighPriorityTaskIdByType.has(groupKey)) {
      strongestHighPriorityTaskIdByType.set(groupKey, task.review_task_id);
    }
  }

  const primaryCandidates = [];
  for (const task of activeItems) {
    const groupKey = typeGroupingKey(task);
    const primaryHighPriorityTaskId = strongestHighPriorityTaskIdByType.get(groupKey);
    if (
      HIGH_PRIORITY_VALUES.has(normalizeString(task?.priority, 'normal'))
      && primaryHighPriorityTaskId
      && primaryHighPriorityTaskId !== task.review_task_id
    ) {
      task.scheduler_state = {
        value: 'blocked',
        label: 'Blocked',
        tone: 'danger',
        reason_code: 'high_priority_type_limit',
        reason_summary:
          'Blocked because this question type already has a stronger high-priority repair task.',
      };
      task.scheduler_reasons = [
        buildReason(
          'high_priority_type_limit',
          'Blocked because this question type already has a stronger high-priority repair task.',
        ),
      ];
      continue;
    }

    primaryCandidates.push(task);
  }

  const recommendedIds = new Set(
    primaryCandidates
      .slice(0, REVIEW_SCHEDULER_POLICY.DAILY_RECOMMENDATION_CAP)
      .map((task) => task.review_task_id),
  );

  for (const task of items) {
    if (!ACTIVE_REVIEW_TASK_STATUSES.has(task?.status)) {
      continue;
    }

    if (task.scheduler_state?.value === 'blocked') {
      continue;
    }

    if (!recommendedIds.has(task.review_task_id)) {
      task.scheduler_state = {
        value: 'blocked',
        label: 'Blocked',
        tone: 'danger',
        reason_code: 'daily_recommendation_cap',
        reason_summary:
          'Blocked by overload control because the canonical queue already has 3 higher-priority tasks.',
      };
      task.scheduler_reasons = [
        buildReason(
          'daily_recommendation_cap',
          'Blocked by overload control because the canonical queue already has 3 higher-priority tasks.',
        ),
      ];
      continue;
    }

    const reason = task.scheduler_state?.reason_code
      ? buildReason(task.scheduler_state.reason_code, task.scheduler_state.reason_summary)
      : null;
    task.scheduler_reasons = reason ? [reason] : [];
  }

  return {
    policy: {
      daily_recommendation_cap: REVIEW_SCHEDULER_POLICY.DAILY_RECOMMENDATION_CAP,
      max_high_priority_open_per_type: REVIEW_SCHEDULER_POLICY.MAX_HIGH_PRIORITY_OPEN_PER_TYPE,
      immediate_repair_max_deferral_hours:
        REVIEW_SCHEDULER_POLICY.IMMEDIATE_REPAIR_MAX_DEFERRAL_HOURS,
    },
    items,
    summary: summarizeReviewQueueItems(items),
  };
}

export function buildMergedSchedulerPolicy(existingTask = {}, candidateTask = {}) {
  const existingPolicy = buildStoredPolicy(
    normalizeObject(existingTask?.success_criteria)?.scheduler_policy,
    normalizeObject(existingTask?.success_criteria)?.fallback_reason_code ?? null,
  );
  const candidatePolicy = buildStoredPolicy(
    normalizeObject(candidateTask?.success_criteria)?.scheduler_policy,
    normalizeObject(candidateTask?.success_criteria)?.fallback_reason_code ?? null,
  );

  const strongestRoute = routeWeight(existingPolicy.route) >= routeWeight(candidatePolicy.route)
    ? existingPolicy.route
    : candidatePolicy.route;

  return buildStoredPolicy({
    ...existingPolicy,
    ...candidatePolicy,
    route: strongestRoute,
    freshness_bucket: routeWeight(existingPolicy.route) >= routeWeight(candidatePolicy.route)
      ? existingPolicy.freshness_bucket ?? candidatePolicy.freshness_bucket ?? null
      : candidatePolicy.freshness_bucket ?? existingPolicy.freshness_bucket ?? null,
    immediate_repair_max_deferral_at:
      candidatePolicy.immediate_repair_max_deferral_at
      ?? existingPolicy.immediate_repair_max_deferral_at
      ?? null,
  }, candidatePolicy.fallback_reason_code ?? existingPolicy.fallback_reason_code ?? null);
}

export function pickReviewTaskMergeCandidate(tasks = [], candidateTask = {}) {
  const candidateMisconceptionTags = new Set(
    normalizeArray(candidateTask?.target_misconception_tags).map((tag) => normalizeString(tag)).filter(Boolean),
  );

  return normalizeArray(tasks)
    .filter((task) => ACTIVE_REVIEW_TASK_STATUSES.has(task?.status))
    .filter((task) => task?.target_topic_id === candidateTask?.target_topic_id)
    .filter((task) => {
      if (
        normalizeString(task?.target_question_type_id)
        && normalizeString(task?.target_question_type_id)
          === normalizeString(candidateTask?.target_question_type_id)
      ) {
        return true;
      }

      return normalizeArray(task?.target_misconception_tags).some((tag) =>
        candidateMisconceptionTags.has(normalizeString(tag)));
    })
    .sort(compareTaskRank)[0] ?? null;
}

export function mergeReviewTaskPayload(existingTask = {}, candidateTask = {}, timestamp) {
  const mergedSchedulerPolicy = buildMergedSchedulerPolicy(existingTask, candidateTask);
  const existingSuccessCriteria = clone(normalizeObject(existingTask?.success_criteria));
  const candidateSuccessCriteria = clone(normalizeObject(candidateTask?.success_criteria));
  const dueAtDate = [existingTask?.due_at, candidateTask?.due_at]
    .map((value) => parseTimestamp(value))
    .filter(Boolean)
    .sort((left, right) => left.getTime() - right.getTime())[0];

  return {
    due_at: dueAtDate ? dueAtDate.toISOString() : existingTask?.due_at ?? candidateTask?.due_at ?? null,
    trigger_type: routeWeight(normalizeRoute(existingTask)) >= routeWeight(normalizeRoute(candidateTask))
      ? normalizeRoute(existingTask)
      : normalizeRoute(candidateTask),
    mode: routeWeight(normalizeRoute(existingTask)) >= routeWeight(normalizeRoute(candidateTask))
      ? existingTask?.mode ?? candidateTask?.mode
      : candidateTask?.mode ?? existingTask?.mode,
    priority: priorityWeight(existingTask?.priority) >= priorityWeight(candidateTask?.priority)
      ? existingTask?.priority ?? candidateTask?.priority
      : candidateTask?.priority ?? existingTask?.priority,
    target_misconception_tags: [
      ...new Set([
        ...normalizeArray(existingTask?.target_misconception_tags),
        ...normalizeArray(candidateTask?.target_misconception_tags),
      ]),
    ],
    related_artifact_refs: [
      ...new Set(
        [...normalizeArray(existingTask?.related_artifact_refs), ...normalizeArray(candidateTask?.related_artifact_refs)]
          .map((ref) => JSON.stringify(ref)),
      ),
    ].map((ref) => JSON.parse(ref)),
    success_criteria: {
      ...existingSuccessCriteria,
      ...candidateSuccessCriteria,
      scheduler_policy: mergedSchedulerPolicy,
    },
    updated_at: timestamp,
  };
}

export function normalizeSchedulerProjectionItem(item = {}) {
  const schedulerPolicy = normalizeObject(item?.scheduler_policy);
  const schedulerState = normalizeObject(item?.scheduler_state);
  const schedulerReasons = normalizeArray(item?.scheduler_reasons);

  return {
    ...item,
    scheduler_policy: schedulerPolicy,
    scheduler_state: schedulerState,
    scheduler_reasons: schedulerReasons,
  };
}
