const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);
const META_ENV = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
const SCHEDULER_EXPLANATION_ENV_FLAG = 'VITE_LEARNING_RUNTIME_SCHEDULER_EXPLANATION_ENABLED';
const FROZEN_STUDENT_EXPLANATION_LABELS = new Set([
  '最近出错',
  '间隔已到',
  '临近考试',
  '同题型回补',
  '回归风险',
]);

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

function normalizeSchedulerState(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return {
    value: normalizeString(value.value),
    label: normalizeString(value.label),
    tone: normalizeString(value.tone, 'neutral'),
    reasonCode: normalizeString(value.reasonCode ?? value.reason_code),
    reasonSummary: normalizeString(value.reasonSummary ?? value.reason_summary),
  };
}

function normalizeSchedulerPolicy(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return {
    route: normalizeString(value.route),
    freshnessBucket: normalizeString(value.freshnessBucket ?? value.freshness_bucket),
    dailyRecommendationCap: value.dailyRecommendationCap ?? value.daily_recommendation_cap ?? null,
    maxHighPriorityOpenPerType:
      value.maxHighPriorityOpenPerType ?? value.max_high_priority_open_per_type ?? null,
    immediateRepairMaxDeferralAt:
      normalizeString(value.immediateRepairMaxDeferralAt ?? value.immediate_repair_max_deferral_at),
  };
}

function normalizeSchedulerReasons(value) {
  return (Array.isArray(value) ? value : []).map((reason) => ({
    code: normalizeString(reason?.code),
    summary: normalizeString(reason?.summary),
  })).filter((reason) => reason.code || reason.summary);
}

function normalizeExplanationFactors(value) {
  return (Array.isArray(value) ? value : []).map((factor) => ({
    code: normalizeString(factor?.code),
    status: normalizeString(factor?.status),
    summary: normalizeString(factor?.summary),
    value: factor?.value ?? null,
  })).filter((factor) => factor.code || factor.summary);
}

function normalizeReviewQueueFeatureFlags(value, env = META_ENV) {
  const featureFlags = value && typeof value === 'object' ? value : {};
  const explicitFlag = featureFlags.schedulerExplanationEnabled;
  const snakeCaseFlag = featureFlags.scheduler_explanation_enabled;

  return {
    schedulerExplanationEnabled:
      typeof explicitFlag === 'boolean'
        ? explicitFlag
        : typeof snakeCaseFlag === 'boolean'
          ? snakeCaseFlag
          : env[SCHEDULER_EXPLANATION_ENV_FLAG] === 'true',
  };
}

function normalizeStudentExplanation(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const provenance = value.provenance ?? {};
  const labels = (Array.isArray(value.labels) ? value.labels : [])
    .map((label) => normalizeString(label))
    .filter((label) => Boolean(label) && FROZEN_STUDENT_EXPLANATION_LABELS.has(label))
    .slice(0, 4);
  const summary = normalizeString(value.summary);

  if (!summary || labels.length < 2 || labels.length > 4) {
    return null;
  }

  return {
    summary,
    labels,
    provenance: {
      summaryFactorCodes: (
        Array.isArray(provenance.summaryFactorCodes ?? provenance.summary_factor_codes)
          ? (provenance.summaryFactorCodes ?? provenance.summary_factor_codes)
          : []
      ).map((code) => normalizeString(code)).filter(Boolean),
      labelMappings: (
        Array.isArray(provenance.labelMappings ?? provenance.label_mappings)
          ? (provenance.labelMappings ?? provenance.label_mappings)
          : []
      ).map((mapping) => ({
        label: normalizeString(mapping?.label),
        factorCode: normalizeString(mapping?.factorCode ?? mapping?.factor_code),
      })).filter((mapping) => mapping.label || mapping.factorCode),
    },
  };
}

function normalizeReviewTaskExplanation(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const attemptHistory = value.attemptHistory ?? value.attempt_history ?? {};
  const evidence = value.evidence ?? {};
  const freshness = value.freshness ?? {};

  return {
    summary: normalizeString(value.summary),
    posture: normalizeString(value.posture),
    postureReasonCode: normalizeString(
      value.postureReasonCode ?? value.posture_reason_code,
    ),
    creationReasonCodes: (Array.isArray(value.creationReasonCodes ?? value.creation_reason_codes)
      ? (value.creationReasonCodes ?? value.creation_reason_codes)
      : []).map((code) => normalizeString(code)).filter(Boolean),
    factors: normalizeExplanationFactors(value.factors),
    attemptHistory: {
      attemptCount:
        attemptHistory.attemptCount
        ?? attemptHistory.attempt_count
        ?? 0,
      latestSourceAttemptRef:
        attemptHistory.latestSourceAttemptRef
        ?? attemptHistory.latest_source_attempt_ref
        ?? null,
      sourceAttemptRefs:
        Array.isArray(attemptHistory.sourceAttemptRefs ?? attemptHistory.source_attempt_refs)
          ? (attemptHistory.sourceAttemptRefs ?? attemptHistory.source_attempt_refs)
          : [],
      sourceQuestionIds:
        Array.isArray(attemptHistory.sourceQuestionIds ?? attemptHistory.source_question_ids)
          ? (attemptHistory.sourceQuestionIds ?? attemptHistory.source_question_ids)
          : [],
    },
    evidence: {
      sourceQuestionId: normalizeString(
        evidence.sourceQuestionId ?? evidence.source_question_id,
      ),
      sourceAttemptRef:
        evidence.sourceAttemptRef
        ?? evidence.source_attempt_ref
        ?? null,
      misconceptionTags: (Array.isArray(
        evidence.misconceptionTags ?? evidence.misconception_tags,
      )
        ? (evidence.misconceptionTags ?? evidence.misconception_tags)
        : []).map((tag) => normalizeString(tag)).filter(Boolean),
      coverageScope: normalizeString(
        evidence.coverageScope ?? evidence.coverage_scope,
      ),
      localSignalOnly:
        typeof evidence.localSignalOnly === 'boolean'
          ? evidence.localSignalOnly
          : evidence.local_signal_only === true,
      ambiguousPartMappingCount:
        evidence.ambiguousPartMappingCount
        ?? evidence.ambiguous_part_mapping_count
        ?? 0,
      partResults: Array.isArray(evidence.partResults ?? evidence.part_results)
        ? (evidence.partResults ?? evidence.part_results)
        : [],
    },
    freshness: {
      bucket: normalizeString(freshness.bucket),
      route: normalizeString(freshness.route),
      dueAt: normalizeString(freshness.dueAt ?? freshness.due_at),
      schedulerState: normalizeString(
        freshness.schedulerState ?? freshness.scheduler_state,
      ),
      reasonCodes: (Array.isArray(freshness.reasonCodes ?? freshness.reason_codes)
        ? (freshness.reasonCodes ?? freshness.reason_codes)
        : []).map((code) => normalizeString(code)).filter(Boolean),
    },
  };
}

function buildSchedulerExplanation(schedulerState, schedulerReasons, schedulerPolicy) {
  const primaryReason = schedulerReasons[0] || null;
  if (!schedulerState && !primaryReason && !schedulerPolicy) {
    return null;
  }

  return {
    summary: primaryReason?.summary || schedulerState?.reasonSummary || null,
    reasonCode: primaryReason?.code || schedulerState?.reasonCode || null,
    route: schedulerPolicy?.route || null,
    freshnessBucket: schedulerPolicy?.freshnessBucket || null,
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
  const featureFlags = normalizeReviewQueueFeatureFlags(
    reviewQueue?.featureFlags ?? reviewQueue?.feature_flags ?? {},
    options.env,
  );
  const normalizedItems = items.map((item) => {
    const status = normalizeString(item.status, 'open');
    const schedulerState = normalizeSchedulerState(item.schedulerState ?? item.scheduler_state);
    const schedulerPolicy = normalizeSchedulerPolicy(item.schedulerPolicy ?? item.scheduler_policy);
    const schedulerReasons = normalizeSchedulerReasons(item.schedulerReasons ?? item.scheduler_reasons);

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
      queueState: schedulerState || buildQueueState(status, item.dueAt ?? item.due_at, now),
      dueAt: normalizeString(item.dueAt ?? item.due_at),
      dueAtLabel: formatTimestampLabel(item.dueAt ?? item.due_at),
      estimatedMinutes: item.estimatedMinutes ?? item.estimated_minutes ?? 0,
      estimatedMinutesLabel: `${item.estimatedMinutes ?? item.estimated_minutes ?? 0} min`,
      completionEvidence: item.completionEvidence ?? item.completion_evidence ?? null,
      resultFeedback: buildResultFeedback(
        status,
        item.completionEvidence ?? item.completion_evidence ?? null,
      ),
      schedulerState,
      schedulerPolicy,
      schedulerReasons,
      schedulerExplanation: buildSchedulerExplanation(
        schedulerState,
        schedulerReasons,
        schedulerPolicy,
      ),
      studentExplanation: normalizeStudentExplanation(
        item.studentExplanation ?? item.student_explanation,
      ),
      explanation: normalizeReviewTaskExplanation(item.explanation),
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
    escalated: 0,
    due: 0,
    open: 0,
    deferred: 0,
    completed: 0,
    blocked: 0,
  });

  return {
    scope: normalizeString(reviewQueue?.scope),
    topicId: normalizeString(reviewQueue?.topicId ?? reviewQueue?.topic_id),
    policy: normalizeSchedulerPolicy(reviewQueue?.policy),
    featureFlags,
    items: normalizedItems,
    summary,
    actionDrafts: buildReviewQueueActionDrafts(normalizedItems, {}, { now }),
  };
}

export default buildReviewQueueViewModel;
