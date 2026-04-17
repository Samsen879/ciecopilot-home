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

const STUDENT_EXPLANATION_LABEL_BY_FACTOR = Object.freeze({
  recent_error: '最近出错',
  interval_due: '间隔已到',
  exam_near: '临近考试',
  same_question_type_repair: '同题型回补',
  regression_risk: '回归风险',
});

const STUDENT_EXPLANATION_LABEL_ORDER = Object.freeze([
  'recent_error',
  'interval_due',
  'exam_near',
  'same_question_type_repair',
  'regression_risk',
]);

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

function buildExplanationFactor(code, summary, value = null) {
  return {
    code,
    status: 'grounded',
    summary,
    value,
  };
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

function uniqueExplanationFactors(factors = []) {
  const seen = new Set();
  return normalizeArray(factors).flatMap((factor) => {
    const normalized = normalizeObject(factor);
    const code = normalizeString(normalized.code);
    if (!code || seen.has(code)) {
      return [];
    }

    seen.add(code);
    return [{
      code,
      status: normalizeString(normalized.status, 'grounded'),
      summary: normalizeString(normalized.summary),
      value: normalized.value ?? null,
    }];
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

function buildStructuredExplainabilityFactors(task = {}, explainability = {}, storedFactors = []) {
  const attemptHistory = normalizeObject(explainability.attempt_history);
  const evidence = normalizeObject(explainability.evidence);
  const freshness = normalizeObject(explainability.freshness);
  const schedulerState = normalizeObject(task?.scheduler_state);
  const factors = [];

  const hasRecentError = Boolean(
    evidence.source_attempt_ref
    || normalizeString(evidence.source_question_id)
    || normalizeArray(evidence.misconception_tags).length > 0
    || Number(attemptHistory.attempt_count ?? 0) > 0,
  );
  if (hasRecentError) {
    factors.push(buildExplanationFactor(
      'recent_error',
      'Recent repair evidence exists for this task.',
      {
        attempt_count: Number(attemptHistory.attempt_count ?? 0),
        misconception_tag_count: normalizeArray(evidence.misconception_tags).length,
      },
    ));
  }

  const sameQuestionTypeRepair = Boolean(
    normalizeString(task?.target_question_type_id)
    && (
      evidence.source_attempt_ref
      || normalizeString(evidence.source_question_id)
    ),
  );
  if (sameQuestionTypeRepair) {
    factors.push(buildExplanationFactor(
      'same_question_type_repair',
      'Repair stays on the same grounded question type.',
      normalizeString(task?.target_question_type_id),
    ));
  }

  const intervalDue = schedulerState?.reason_code === 'due_window_open'
    || schedulerState?.value === 'due';
  if (intervalDue) {
    factors.push(buildExplanationFactor(
      'interval_due',
      'The scheduled review interval has opened.',
      normalizeString(task?.due_at),
    ));
  }

  if (freshness.route === 'exam_polish') {
    factors.push(buildExplanationFactor(
      'exam_near',
      'This review was scheduled for exam-near preparation.',
      normalizeString(task?.due_at),
    ));
  }

  if (
    freshness.route === 'regression_recovery'
    || schedulerState?.reason_code === 'regression_recovery_due'
  ) {
    factors.push(buildExplanationFactor(
      'regression_risk',
      'Regression recovery evidence is active for this task.',
      normalizeString(task?.due_at),
    ));
  }

  return uniqueExplanationFactors([
    ...normalizeArray(storedFactors),
    ...factors,
  ]);
}

function buildStudentExplanationSummary(factorCodes = []) {
  const factorSet = new Set(normalizeArray(factorCodes));

  if (
    factorSet.has('regression_risk')
    && factorSet.has('recent_error')
    && factorSet.has('same_question_type_repair')
  ) {
    return {
      summary: '这类内容有回归风险，而且你最近在这个题型上出错过，所以安排一次同题型回补。',
      factor_codes: ['regression_risk', 'recent_error', 'same_question_type_repair'],
    };
  }

  if (factorSet.has('exam_near') && factorSet.has('interval_due')) {
    return {
      summary: '临近考试，而且现在到了这类内容的复习时间，所以安排一次回顾。',
      factor_codes: ['exam_near', 'interval_due'],
    };
  }

  if (factorSet.has('recent_error') && factorSet.has('same_question_type_repair')) {
    return {
      summary: '你最近在这个题型上出错过，所以先安排一次同题型回补。',
      factor_codes: ['recent_error', 'same_question_type_repair'],
    };
  }

  if (factorSet.has('interval_due') && factorSet.has('same_question_type_repair')) {
    return {
      summary: '现在到了这类内容的复习时间，所以安排一次回顾。',
      factor_codes: ['interval_due', 'same_question_type_repair'],
    };
  }

  return {
    summary: null,
    factor_codes: [],
  };
}

function buildStudentExplanation(task = {}, explanation = {}) {
  const factors = uniqueExplanationFactors(explanation?.factors);
  const factorCodes = new Set(factors.map((factor) => factor.code));
  const labelMappings = STUDENT_EXPLANATION_LABEL_ORDER
    .filter((code) => factorCodes.has(code))
    .map((code) => ({
      label: STUDENT_EXPLANATION_LABEL_BY_FACTOR[code],
      factor_code: code,
    }))
    .slice(0, 4);
  const labels = labelMappings.map((mapping) => mapping.label);
  const summaryShape = buildStudentExplanationSummary(labelMappings.map((mapping) => mapping.factor_code));

  if (labels.length < 2 || !summaryShape.summary) {
    return null;
  }

  return {
    summary: summaryShape.summary,
    labels,
    provenance: {
      summary_factor_codes: summaryShape.factor_codes,
      label_mappings: labelMappings,
    },
  };
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
  const storedFactors = uniqueExplanationFactors(storedExplainability.factors);
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
    factors: storedFactors,
  };

  explanation.factors = buildStructuredExplainabilityFactors(task, explanation, storedFactors);

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
      explanation: null,
      student_explanation: null,
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
    task.explanation = buildReviewTaskExplainability(task);
    task.student_explanation = buildStudentExplanation(task, task.explanation);
  }

  for (const task of items) {
    if (!task.explanation) {
      task.explanation = buildReviewTaskExplainability(task);
    }
    if (typeof task.student_explanation === 'undefined' || task.student_explanation === null) {
      task.student_explanation = buildStudentExplanation(task, task.explanation);
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
  const explanation = buildReviewTaskExplainability({
    ...item,
    scheduler_policy: schedulerPolicy,
    scheduler_state: schedulerState,
    scheduler_reasons: schedulerReasons,
  });

  return {
    ...item,
    scheduler_policy: schedulerPolicy,
    scheduler_state: schedulerState,
    scheduler_reasons: schedulerReasons,
    explanation,
    student_explanation: buildStudentExplanation(item, explanation),
  };
}
