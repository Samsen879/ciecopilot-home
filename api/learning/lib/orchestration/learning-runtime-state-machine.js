const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);
const VALID_TRIGGER_TYPES = new Set([
  'immediate_repair',
  'short_delay',
  'spaced_review',
  'regression_recovery',
  'exam_polish',
]);

const BLOCKED_REASON_SUMMARIES = Object.freeze({
  daily_recommendation_cap:
    'Blocked by overload control because the canonical queue already has 3 higher-priority tasks.',
  high_priority_type_limit:
    'Blocked because this question type already has a stronger high-priority repair task.',
});

function normalizeString(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

function parseTimestamp(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeRoute(task = {}) {
  const storedRoute = normalizeString(task?.success_criteria?.scheduler_policy?.route);
  if (storedRoute && VALID_TRIGGER_TYPES.has(storedRoute)) {
    return storedRoute;
  }

  const triggerType = normalizeString(task?.trigger_type);
  if (triggerType && VALID_TRIGGER_TYPES.has(triggerType)) {
    return triggerType;
  }

  return 'short_delay';
}

function buildStateReason(state, route) {
  if (state === 'escalated' && route === 'regression_recovery') {
    return {
      code: 'regression_recovery_due',
      summary: 'Escalated because repeated regression needs immediate recovery work.',
    };
  }

  if (state === 'escalated') {
    return {
      code: 'fresh_immediate_repair',
      summary: 'Fresh repair evidence should be retried before it is spaced.',
    };
  }

  if (state === 'due') {
    return {
      code: 'due_window_open',
      summary: 'Due because the current review window has opened.',
    };
  }

  if (state === 'deferred') {
    return {
      code: 'freshness_window',
      summary: 'Deferred until the next spaced-review freshness window opens.',
    };
  }

  return null;
}

export function buildLearningRuntimeBlockedState(reasonCode = null) {
  const normalizedReasonCode = normalizeString(reasonCode);
  return {
    value: 'blocked',
    label: 'Blocked',
    tone: 'danger',
    reason_code: normalizedReasonCode,
    reason_summary:
      normalizedReasonCode && BLOCKED_REASON_SUMMARIES[normalizedReasonCode]
        ? BLOCKED_REASON_SUMMARIES[normalizedReasonCode]
        : null,
  };
}

export function buildLearningRuntimeReviewTaskState(task = {}, options = {}) {
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
    const reason = buildStateReason('escalated', route);
    return {
      value: 'escalated',
      label: 'Escalated',
      tone: 'danger',
      reason_code: reason.code,
      reason_summary: reason.summary,
    };
  }

  if (dueAtDate && dueAtDate.getTime() <= nowDate.getTime()) {
    const reason = buildStateReason('due', route);
    return {
      value: 'due',
      label: 'Due',
      tone: 'warning',
      reason_code: reason.code,
      reason_summary: reason.summary,
    };
  }

  if (dueAtDate) {
    const reason = buildStateReason('deferred', route);
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
