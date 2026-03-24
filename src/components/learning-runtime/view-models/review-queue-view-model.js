const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);

function normalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function labelFromToken(token, fallback = 'unknown') {
  return normalizeString(token, fallback).replace(/_/g, ' ');
}

function titleCaseToken(token, fallback = 'Unknown') {
  return labelFromToken(token, fallback)
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function parseTimestamp(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatTimestampLabel(value) {
  const parsed = parseTimestamp(value);
  if (!parsed) {
    return 'Unscheduled';
  }

  return parsed.toISOString();
}

function toDateTimeLocalValue(value) {
  const parsed = parseTimestamp(value);
  return parsed ? parsed.toISOString().slice(0, 16) : '';
}

function buildDefaultRescheduleValue(dueAt, now) {
  const nowDate = parseTimestamp(now) || new Date();
  const dueAtDate = parseTimestamp(dueAt);

  if (dueAtDate && dueAtDate.getTime() > nowDate.getTime()) {
    return toDateTimeLocalValue(dueAtDate.toISOString());
  }

  return new Date(nowDate.getTime() + (24 * 60 * 60 * 1000))
    .toISOString()
    .slice(0, 16);
}

function buildQueueState(status, dueAt, now) {
  if (status === 'blocked') {
    return {
      value: 'blocked',
      label: 'Blocked',
      tone: 'danger',
    };
  }

  if (status === 'completed') {
    return {
      value: 'completed',
      label: 'Completed',
      tone: 'success',
    };
  }

  const dueAtDate = parseTimestamp(dueAt);
  const nowDate = parseTimestamp(now) || new Date();

  if (dueAtDate && dueAtDate.getTime() <= nowDate.getTime()) {
    return {
      value: 'due',
      label: 'Due',
      tone: 'warning',
    };
  }

  if (dueAtDate) {
    return {
      value: 'deferred',
      label: 'Deferred',
      tone: 'neutral',
    };
  }

  return {
    value: 'open',
    label: 'Open',
    tone: 'neutral',
  };
}

function buildResultFeedback(status, completionEvidence) {
  const summary = normalizeString(completionEvidence?.summary ?? completionEvidence?.note);
  const outcome = normalizeString(completionEvidence?.outcome);

  if (!summary && !outcome && status !== 'completed' && status !== 'partial') {
    return null;
  }

  return {
    label: titleCaseToken(outcome || (status === 'partial' ? 'partial' : status)),
    summary,
  };
}

function buildLaunchPayload(item) {
  const reviewTaskId = normalizeString(item.reviewTaskId ?? item.review_task_id);
  if (!reviewTaskId) {
    return null;
  }

  return {
    anchorKind: 'review_task',
    reviewTaskId,
    mode: 'spaced_review',
    topicId: normalizeString(item.targetTopicId ?? item.target_topic_id, ''),
    topicPath: normalizeString(item.targetTopicPath ?? item.target_topic_path, ''),
    currentQuestionTypeId: normalizeString(
      item.targetQuestionTypeId ?? item.target_question_type_id,
      '',
    ),
  };
}

export function buildReviewQueueActionDrafts(items = [], currentDrafts = {}, options = {}) {
  const now = normalizeString(options.now) || new Date().toISOString();

  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    if (!item?.reviewTaskId) {
      return acc;
    }

    const currentDraft = currentDrafts?.[item.reviewTaskId] || {};
    acc[item.reviewTaskId] = {
      completionSummary: normalizeString(currentDraft.completionSummary, ''),
      dueAt: normalizeString(currentDraft.dueAt, item.rescheduleAtDefault || ''),
    };
    return acc;
  }, {});
}

export function buildReviewQueueViewModel(reviewQueue = {}, options = {}) {
  const now = normalizeString(options.now) || new Date().toISOString();
  const items = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];
  const normalizedItems = items.map((item) => {
    const status = normalizeString(item.status, 'open');

    return {
      ...item,
      reviewTaskId: normalizeString(item.reviewTaskId ?? item.review_task_id),
      targetTopicId: normalizeString(item.targetTopicId ?? item.target_topic_id),
      targetTopicPath: normalizeString(item.targetTopicPath ?? item.target_topic_path, null),
      targetQuestionTypeId: normalizeString(
        item.targetQuestionTypeId ?? item.target_question_type_id,
        null,
      ),
      targetQuestionTypeTitle: normalizeString(
        item.targetQuestionTypeTitle ?? item.target_question_type_title,
        null,
      ),
      mode: normalizeString(item.mode),
      modeLabel: labelFromToken(item.mode),
      status,
      statusLabel: labelFromToken(status),
      queueState: buildQueueState(status, item.dueAt ?? item.due_at, now),
      dueAt: normalizeString(item.dueAt ?? item.due_at),
      dueAtLabel: formatTimestampLabel(item.dueAt ?? item.due_at),
      estimatedMinutes: item.estimatedMinutes ?? item.estimated_minutes ?? 0,
      estimatedMinutesLabel: `${item.estimatedMinutes ?? item.estimated_minutes ?? 0} min`,
      completionEvidence: item.completionEvidence ?? item.completion_evidence ?? null,
      resultFeedback: buildResultFeedback(
        status,
        item.completionEvidence ?? item.completion_evidence ?? null,
      ),
      launchPayload: buildLaunchPayload(item),
      workspaceLink: {
        topicId: normalizeString(item.targetTopicId ?? item.target_topic_id, ''),
        topicPath: normalizeString(item.targetTopicPath ?? item.target_topic_path, ''),
      },
      canLaunch: ACTIVE_REVIEW_TASK_STATUSES.has(status),
      canComplete: ACTIVE_REVIEW_TASK_STATUSES.has(status),
      canReschedule: ACTIVE_REVIEW_TASK_STATUSES.has(status),
      rescheduleAtDefault: buildDefaultRescheduleValue(item.dueAt ?? item.due_at, now),
    };
  });

  const summary = normalizedItems.reduce((acc, item) => {
    const key = item.queueState?.value;
    if (key && Object.prototype.hasOwnProperty.call(acc, key)) {
      acc[key] += 1;
    }
    acc.total += 1;
    return acc;
  }, {
    total: 0,
    due: 0,
    open: 0,
    deferred: 0,
    completed: 0,
    blocked: 0,
  });

  return {
    scope: normalizeString(reviewQueue?.scope),
    topicId: normalizeString(reviewQueue?.topicId ?? reviewQueue?.topic_id),
    items: normalizedItems,
    summary,
    actionDrafts: buildReviewQueueActionDrafts(normalizedItems, {}, { now }),
  };
}

export default buildReviewQueueViewModel;
