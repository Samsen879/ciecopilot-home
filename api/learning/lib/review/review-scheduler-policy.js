import {
  deriveConfidenceBand,
  normalizeConfidenceBand,
} from '../question-analysis/low-confidence-posture.js';
import {
  buildLearningRuntimeBlockedState,
  buildLearningRuntimeReviewTaskState,
} from '../orchestration/learning-runtime-state-machine.js';

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

const FRESHNESS_FACTOR_SCORE = Object.freeze({
  fresh: 2,
  cooling: 1,
  current: 0,
  stale: 1,
});

const TRIGGER_URGENCY_FACTOR_SCORE = Object.freeze({
  spaced_review: 0,
  short_delay: 1,
  exam_polish: 1,
  immediate_repair: 2,
  regression_recovery: 3,
});

const BAND_VULNERABILITY_FACTOR_SCORE = Object.freeze({
  high: 0,
  medium: 1,
  low: 2,
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

function normalizeNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function priorityWeight(priority) {
  return PRIORITY_WEIGHT[normalizeString(priority, 'normal')] ?? PRIORITY_WEIGHT.normal;
}

function routeWeight(route) {
  return ROUTE_WEIGHT[normalizeString(route, 'short_delay')] ?? ROUTE_WEIGHT.short_delay;
}

function factorProfileFromTask(task = {}) {
  const successCriteria = normalizeObject(task?.success_criteria);
  const taskPolicy = normalizeObject(task?.scheduler_policy);
  const storedPolicy = normalizeObject(successCriteria.scheduler_policy);
  return normalizeObject(taskPolicy.factor_profile ?? storedPolicy.factor_profile);
}

function factorTotalScore(task = {}) {
  const factorProfile = factorProfileFromTask(task);
  const totalScore = factorProfile.total_score;
  return Number.isFinite(totalScore) ? totalScore : null;
}

function factorProfileTotal(profile = {}) {
  const totalScore = normalizeObject(profile).total_score;
  return Number.isFinite(totalScore) ? totalScore : null;
}

function pickStrongerFactorProfile(existingPolicy = {}, candidatePolicy = {}) {
  const existingFactorProfile = clone(normalizeObject(existingPolicy.factor_profile));
  const candidateFactorProfile = clone(normalizeObject(candidatePolicy.factor_profile));
  const existingTotal = factorProfileTotal(existingFactorProfile);
  const candidateTotal = factorProfileTotal(candidateFactorProfile);

  if (existingTotal === null) {
    return candidateFactorProfile;
  }

  if (candidateTotal === null) {
    return existingFactorProfile;
  }

  return existingTotal >= candidateTotal ? existingFactorProfile : candidateFactorProfile;
}

function freshnessFactor(freshnessBucket = null) {
  const bucket = normalizeString(freshnessBucket);
  return {
    bucket,
    score: FRESHNESS_FACTOR_SCORE[bucket] ?? 0,
  };
}

function overduePressureFactor({ dueAt = null, now = new Date() } = {}) {
  const dueAtDate = parseTimestamp(dueAt);
  const nowDate = now instanceof Date ? now : parseTimestamp(now) ?? new Date();
  if (!dueAtDate || dueAtDate.getTime() >= nowDate.getTime()) {
    return {
      score: 0,
    };
  }

  const overdueHours = (nowDate.getTime() - dueAtDate.getTime()) / (60 * 60 * 1000);
  return {
    score: overdueHours >= 24 ? 2 : 1,
  };
}

function bandVulnerabilityFactor({
  confidenceBand = null,
  classificationConfidence = null,
} = {}) {
  const band = normalizeConfidenceBand(confidenceBand)
    || deriveConfidenceBand(normalizeNumber(classificationConfidence));
  return {
    band,
    score: BAND_VULNERABILITY_FACTOR_SCORE[band] ?? 0,
  };
}

function triggerUrgencyFactor(route = null) {
  const normalizedRoute = normalizeString(route, 'short_delay');
  return {
    route: normalizedRoute,
    score: TRIGGER_URGENCY_FACTOR_SCORE[normalizedRoute] ?? 0,
  };
}

function examProximityFactor({
  learnerGoal = null,
  route = null,
} = {}) {
  const normalizedGoal = normalizeString(learnerGoal);
  const normalizedRoute = normalizeString(route);
  return {
    score: normalizedGoal === 'exam_polish' || normalizedRoute === 'exam_polish' ? 1 : 0,
  };
}

function regressionSeverityFactor({
  regressionRecovery = false,
  route = null,
} = {}) {
  return {
    score: regressionRecovery === true || normalizeString(route) === 'regression_recovery' ? 2 : 0,
  };
}

function buildBoundedFactorProfile({
  route = 'short_delay',
  freshnessBucket = null,
  dueAt = null,
  now = new Date(),
  confidenceBand = null,
  classificationConfidence = null,
  learnerGoal = null,
  regressionRecovery = false,
} = {}) {
  const freshness = freshnessFactor(freshnessBucket);
  const overduePressure = overduePressureFactor({
    dueAt,
    now,
  });
  const bandVulnerability = bandVulnerabilityFactor({
    confidenceBand,
    classificationConfidence,
  });
  const triggerUrgency = triggerUrgencyFactor(route);
  const examProximity = examProximityFactor({
    learnerGoal,
    route,
  });
  const regressionSeverity = regressionSeverityFactor({
    regressionRecovery,
    route,
  });

  return {
    total_score:
      freshness.score
      + overduePressure.score
      + bandVulnerability.score
      + triggerUrgency.score
      + examProximity.score
      + regressionSeverity.score,
    freshness,
    overdue_pressure: overduePressure,
    band_vulnerability: bandVulnerability,
    trigger_urgency: triggerUrgency,
    exam_proximity: examProximity,
    regression_severity: regressionSeverity,
  };
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
  const leftFactorTotal = factorTotalScore(left);
  const rightFactorTotal = factorTotalScore(right);
  if (leftFactorTotal !== null || rightFactorTotal !== null) {
    const normalizedLeft = leftFactorTotal ?? Number.NEGATIVE_INFINITY;
    const normalizedRight = rightFactorTotal ?? Number.NEGATIVE_INFINITY;
    if (normalizedLeft !== normalizedRight) {
      return normalizedRight - normalizedLeft;
    }
  }

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

export function compareReviewTaskProjectionItems(left, right) {
  return compareTaskRank(left, right);
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

function uniqueStrings(values = []) {
  const seen = new Set();
  return normalizeArray(values).filter((value) => {
    const normalized = normalizeString(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function uniqueTypedRefs(refs = []) {
  const seen = new Set();
  return normalizeArray(refs).flatMap((ref) => {
    const normalized = normalizeObject(ref);
    const kind = normalizeString(normalized.kind);
    if (!kind) {
      return [];
    }

    const refKey = JSON.stringify(normalized);
    if (seen.has(refKey)) {
      return [];
    }

    seen.add(refKey);
    return [clone(normalized)];
  });
}

function labelFromMisconceptionTag(tag) {
  const normalized = normalizeString(tag);
  if (!normalized) {
    return null;
  }

  const lastToken = normalized.split(':').pop() || normalized;
  return lastToken.replace(/_/g, ' ');
}

function summarizeExplainability(task = {}, explainability = {}) {
  const misconceptionTags = normalizeArray(
    explainability?.evidence?.misconception_tags ?? task?.target_misconception_tags,
  );
  const misconceptionLabel = labelFromMisconceptionTag(misconceptionTags[0]);
  const evidenceLabel = misconceptionLabel
    ? `${misconceptionLabel}-repair`
    : normalizeString(explainability?.evidence?.coverage_scope)
      ? `${normalizeString(explainability.evidence.coverage_scope)}-level`
      : 'runtime';

  if (normalizeString(explainability?.posture) === 'released_scoring_repair') {
    return `Queued from ${evidenceLabel} evidence while released scoring stays active.`;
  }

  return `Queued from ${evidenceLabel} evidence while authoritative mastery stays conservative.`;
}

export function buildReviewTaskExplainabilitySeed({
  sourceQuestionId = null,
  sourceAttemptRef = null,
  targetMisconceptionTags = [],
  posture = 'conservative_fallback',
  postureReasonCode = null,
  fallbackReasonCode = null,
  schedulerPolicy = {},
  coverageScope = 'question',
  localSignalOnly = false,
  partResults = [],
  ambiguousPartMappingCount = 0,
} = {}) {
  const sourceAttemptRefs = uniqueTypedRefs(sourceAttemptRef ? [sourceAttemptRef] : []);
  const sourceQuestionIds = uniqueStrings(sourceQuestionId ? [sourceQuestionId] : []);

  return {
    posture,
    posture_reason_code: postureReasonCode ?? fallbackReasonCode ?? null,
    creation_reason_codes: uniqueStrings([
      fallbackReasonCode,
      posture === 'released_scoring_repair' ? 'released_scoring_repair' : null,
      normalizeArray(targetMisconceptionTags).length > 0 ? 'misconception_tag_trigger' : null,
      localSignalOnly ? 'local_signal_only' : null,
    ]),
    attempt_history: {
      attempt_count: Math.max(sourceAttemptRefs.length, sourceQuestionIds.length),
      latest_source_attempt_ref: sourceAttemptRef ?? null,
      source_attempt_refs: sourceAttemptRefs,
      source_question_ids: sourceQuestionIds,
    },
    evidence: {
      source_question_id: sourceQuestionId ?? null,
      source_attempt_ref: sourceAttemptRef ?? null,
      misconception_tags: normalizeArray(targetMisconceptionTags),
      coverage_scope: coverageScope ?? null,
      local_signal_only: localSignalOnly === true,
      ambiguous_part_mapping_count: Number(ambiguousPartMappingCount ?? 0),
      part_results: normalizeArray(partResults),
    },
    freshness: {
      route: normalizeString(schedulerPolicy?.route),
      bucket: normalizeString(schedulerPolicy?.freshness_bucket),
    },
  };
}

function mergeReviewTaskExplainability(existingTask = {}, candidateTask = {}) {
  const existingExplainability = normalizeObject(
    normalizeObject(existingTask?.success_criteria)?.explainability,
  );
  const candidateExplainability = normalizeObject(
    normalizeObject(candidateTask?.success_criteria)?.explainability,
  );
  const existingAttemptHistory = normalizeObject(existingExplainability.attempt_history);
  const candidateAttemptHistory = normalizeObject(candidateExplainability.attempt_history);
  const existingEvidence = normalizeObject(existingExplainability.evidence);
  const candidateEvidence = normalizeObject(candidateExplainability.evidence);
  const existingFreshness = normalizeObject(existingExplainability.freshness);
  const candidateFreshness = normalizeObject(candidateExplainability.freshness);
  const sourceAttemptRefs = uniqueTypedRefs([
    ...normalizeArray(existingAttemptHistory.source_attempt_refs),
    existingAttemptHistory.latest_source_attempt_ref,
    existingEvidence.source_attempt_ref,
    ...normalizeArray(candidateAttemptHistory.source_attempt_refs),
    candidateAttemptHistory.latest_source_attempt_ref,
    candidateEvidence.source_attempt_ref,
  ]);
  const latestSourceAttemptRef =
    candidateAttemptHistory.latest_source_attempt_ref
    ?? candidateEvidence.source_attempt_ref
    ?? existingAttemptHistory.latest_source_attempt_ref
    ?? existingEvidence.source_attempt_ref
    ?? null;
  const sourceQuestionIds = uniqueStrings([
    ...normalizeArray(existingAttemptHistory.source_question_ids),
    existingEvidence.source_question_id,
    ...normalizeArray(candidateAttemptHistory.source_question_ids),
    candidateEvidence.source_question_id,
  ]);

  return {
    posture: candidateExplainability.posture ?? existingExplainability.posture ?? 'conservative_fallback',
    posture_reason_code:
      candidateExplainability.posture_reason_code
      ?? existingExplainability.posture_reason_code
      ?? null,
    creation_reason_codes: uniqueStrings([
      ...normalizeArray(existingExplainability.creation_reason_codes),
      ...normalizeArray(candidateExplainability.creation_reason_codes),
    ]),
    attempt_history: {
      attempt_count:
        Math.max(
          sourceAttemptRefs.length,
          sourceQuestionIds.length,
          Number(existingAttemptHistory.attempt_count ?? 0),
          Number(candidateAttemptHistory.attempt_count ?? 0),
        ),
      latest_source_attempt_ref: latestSourceAttemptRef,
      source_attempt_refs: sourceAttemptRefs,
      source_question_ids: sourceQuestionIds,
    },
    evidence: {
      ...existingEvidence,
      ...candidateEvidence,
      source_question_id:
        candidateEvidence.source_question_id ?? existingEvidence.source_question_id ?? null,
      source_attempt_ref: latestSourceAttemptRef,
      misconception_tags: uniqueStrings([
        ...normalizeArray(existingEvidence.misconception_tags),
        ...normalizeArray(candidateEvidence.misconception_tags),
      ]),
      part_results:
        normalizeArray(candidateEvidence.part_results).length > 0
          ? normalizeArray(candidateEvidence.part_results)
          : normalizeArray(existingEvidence.part_results),
      ambiguous_part_mapping_count:
        candidateEvidence.ambiguous_part_mapping_count
        ?? existingEvidence.ambiguous_part_mapping_count
        ?? 0,
      coverage_scope: candidateEvidence.coverage_scope ?? existingEvidence.coverage_scope ?? null,
      local_signal_only:
        candidateEvidence.local_signal_only
        ?? existingEvidence.local_signal_only
        ?? false,
    },
    freshness: {
      ...existingFreshness,
      ...candidateFreshness,
      route: candidateFreshness.route ?? existingFreshness.route ?? null,
      bucket: candidateFreshness.bucket ?? existingFreshness.bucket ?? null,
    },
  };
}

export function buildReviewTaskExplainability(task = {}) {
  const successCriteria = normalizeObject(task?.success_criteria);
  const storedExplainability = normalizeObject(successCriteria.explainability);
  const attemptHistory = normalizeObject(storedExplainability.attempt_history);
  const evidence = normalizeObject(storedExplainability.evidence);
  const freshness = normalizeObject(storedExplainability.freshness);
  const schedulerState = normalizeObject(task?.scheduler_state);
  const schedulerReasons = normalizeArray(task?.scheduler_reasons);
  const explanation = {
    posture: normalizeString(storedExplainability.posture, 'conservative_fallback'),
    posture_reason_code:
      normalizeString(
        storedExplainability.posture_reason_code,
        successCriteria.fallback_reason_code ?? null,
      ),
    creation_reason_codes: uniqueStrings(storedExplainability.creation_reason_codes),
    attempt_history: {
      attempt_count:
        Number(
          attemptHistory.attempt_count
          ?? uniqueTypedRefs([
            ...normalizeArray(attemptHistory.source_attempt_refs),
            attemptHistory.latest_source_attempt_ref,
            evidence.source_attempt_ref ?? task?.source_attempt_ref,
          ]).length,
        ) || 0,
      latest_source_attempt_ref:
        attemptHistory.latest_source_attempt_ref
        ?? evidence.source_attempt_ref
        ?? task?.source_attempt_ref
        ?? null,
      source_attempt_refs: uniqueTypedRefs([
        ...normalizeArray(attemptHistory.source_attempt_refs),
        attemptHistory.latest_source_attempt_ref,
        evidence.source_attempt_ref,
        task?.source_attempt_ref,
      ]),
      source_question_ids: uniqueStrings([
        ...normalizeArray(attemptHistory.source_question_ids),
        evidence.source_question_id,
        task?.source_question_id,
      ]),
    },
    evidence: {
      source_question_id: normalizeString(
        evidence.source_question_id,
        task?.source_question_id ?? null,
      ),
      source_attempt_ref:
        evidence.source_attempt_ref
        ?? task?.source_attempt_ref
        ?? null,
      misconception_tags: uniqueStrings(
        evidence.misconception_tags ?? task?.target_misconception_tags,
      ),
      coverage_scope: normalizeString(
        evidence.coverage_scope,
        successCriteria.coverage_scope ?? null,
      ),
      local_signal_only:
        typeof evidence.local_signal_only === 'boolean'
          ? evidence.local_signal_only
          : successCriteria.local_signal_only === true,
      ambiguous_part_mapping_count:
        evidence.ambiguous_part_mapping_count
        ?? successCriteria.ambiguous_part_mapping_count
        ?? 0,
      part_results: normalizeArray(
        evidence.part_results ?? successCriteria.part_results,
      ),
    },
    freshness: {
      route: normalizeString(
        freshness.route,
        task?.scheduler_policy?.route ?? normalizeRoute(task),
      ),
      bucket: normalizeString(
        freshness.bucket,
        task?.scheduler_policy?.freshness_bucket ?? null,
      ),
      due_at: normalizeString(task?.due_at),
      scheduler_state: normalizeString(task?.scheduler_state?.value),
      reason_codes: uniqueStrings(
        schedulerReasons.map((reason) => reason?.code),
      ),
    },
    summary: normalizeString(storedExplainability.summary),
  };

  if (!explanation.summary) {
    explanation.summary = summarizeExplainability(task, explanation);
  }

  return explanation;
}

export function buildReviewTaskSchedulerSeed({
  now = new Date(),
  misconceptionTags = [],
  triggerType = null,
  regressionRecovery = false,
  learnerGoal = null,
  fallbackReasonCode = null,
  freshnessBucket = null,
  confidenceBand = null,
  classificationConfidence = null,
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
  const factorProfile = buildBoundedFactorProfile({
    route,
    freshnessBucket: resolvedFreshnessBucket,
    dueAt: dueDate.toISOString(),
    now: nowDate,
    confidenceBand,
    classificationConfidence,
    learnerGoal,
    regressionRecovery,
  });

  return {
    triggerType: route,
    mode,
    priority,
    dueAt: dueDate.toISOString(),
    policy: buildStoredPolicy({
      route,
      freshness_bucket: resolvedFreshnessBucket,
      factor_profile: factorProfile,
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
  return buildLearningRuntimeReviewTaskState(task, options);
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
      explanation: null,
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
      task.scheduler_state = buildLearningRuntimeBlockedState('high_priority_type_limit');
      task.scheduler_reasons = [
        buildReason(
          task.scheduler_state.reason_code,
          task.scheduler_state.reason_summary,
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
      task.scheduler_state = buildLearningRuntimeBlockedState('daily_recommendation_cap');
      task.scheduler_reasons = [
        buildReason(
          task.scheduler_state.reason_code,
          task.scheduler_state.reason_summary,
        ),
      ];
      continue;
    }

    const reason = task.scheduler_state?.reason_code
      ? buildReason(task.scheduler_state.reason_code, task.scheduler_state.reason_summary)
      : null;
    task.scheduler_reasons = reason ? [reason] : [];
    task.explanation = buildReviewTaskExplainability(task);
  }

  for (const task of items) {
    if (!task.explanation) {
      task.explanation = buildReviewTaskExplainability(task);
    }
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
    factor_profile: pickStrongerFactorProfile(existingPolicy, candidatePolicy),
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
      explainability: mergeReviewTaskExplainability(existingTask, candidateTask),
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
    explanation: buildReviewTaskExplainability({
      ...item,
      scheduler_policy: schedulerPolicy,
      scheduler_state: schedulerState,
      scheduler_reasons: schedulerReasons,
    }),
  };
}
