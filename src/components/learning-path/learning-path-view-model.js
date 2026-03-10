export const subjectMetaByCode = {
  '9709': {
    name: 'Mathematics',
    fullName: 'CIE A-Level Mathematics',
  },
  '9702': {
    name: 'Physics',
    fullName: 'CIE A-Level Physics',
  },
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function formatMinutes(minutes) {
  const safeMinutes = Math.max(Math.round(toNumber(minutes, 0)), 0);
  if (!safeMinutes) {
    return '时长待定';
  }
  if (safeMinutes < 60) {
    return `${safeMinutes} 分钟`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder ? `${hours} 小时 ${remainder} 分钟` : `${hours} 小时`;
}

function formatRelativeTimestamp(isoValue, now = Date.now()) {
  if (!isoValue) {
    return '未知时间';
  }

  const timestamp = new Date(isoValue).getTime();
  if (!Number.isFinite(timestamp)) {
    return '未知时间';
  }

  const deltaMs = Math.max(now - timestamp, 0);
  const deltaHours = Math.round(deltaMs / 3600000);
  if (deltaHours < 1) {
    return '刚刚';
  }
  if (deltaHours < 24) {
    return `${deltaHours} 小时前`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays} 天前`;
}

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeDifficulty(value) {
  const label = safeText(value, '');
  if (label) {
    return label;
  }

  const numeric = toNumber(value, 0);
  return numeric > 0 ? `难度 ${numeric}` : '难度待定';
}

function getSessionStatus(entry) {
  const current = clamp(Math.round(toNumber(entry?.current_mastery, 0) * 100));
  const target = clamp(Math.round(toNumber(entry?.target_mastery, 0.8) * 100));

  if (current >= target && target > 0) {
    return 'completed';
  }
  if (current > 0 || toNumber(entry?.allocated_time, 0) > 0) {
    return 'in_progress';
  }
  return 'pending';
}

function normalizeTimelineEntry(entry, index = 0) {
  if (typeof entry === 'string') {
    return {
      id: `timeline-${index}`,
      title: entry,
      status: 'pending',
      durationMinutes: 0,
      durationLabel: '时长待定',
      dayLabel: `Day ${index + 1}`,
      sessionCount: 0,
      currentMasteryPercentage: 0,
      targetMasteryPercentage: 80,
      priorityReason: '等待生成更细的学习节奏',
      activityLabel: '学习',
      difficultyLabel: '难度待定',
    };
  }

  const allocatedMinutes = Math.max(toNumber(entry?.allocated_time, entry?.estimated_time), 0);
  const currentMasteryPercentage = clamp(Math.round(toNumber(entry?.current_mastery, 0) * 100));
  const targetMasteryPercentage = clamp(Math.round(toNumber(entry?.target_mastery, 0.8) * 100));
  const sessions = toArray(entry?.sessions);

  return {
    id: entry?.topic_id || `timeline-${index}`,
    title: safeText(entry?.topic_name || entry?.title, `主题 ${index + 1}`),
    status: getSessionStatus(entry),
    durationMinutes: allocatedMinutes,
    durationLabel: formatMinutes(allocatedMinutes),
    dayLabel: sessions.length > 0 ? `Day ${sessions[0].day}` : `Day ${index + 1}`,
    sessionCount: sessions.length,
    currentMasteryPercentage,
    targetMasteryPercentage,
    priorityReason: safeText(entry?.priority_reason, '根据当前掌握度与依赖关系排序'),
    activityLabel: safeText(sessions[0]?.activity_type, '学习'),
    difficultyLabel: normalizeDifficulty(sessions[0]?.difficulty_level || entry?.difficulty_level),
  };
}

function normalizeMilestoneEntry(entry, index = 0) {
  return {
    id: entry?.milestone_id || `milestone-${index}`,
    title: safeText(entry?.title, `里程碑 ${index + 1}`),
    description: safeText(entry?.description, '继续推进当前学习计划。'),
    dayLabel: entry?.day ? `Day ${entry.day}` : `阶段 ${index + 1}`,
    celebrationMessage: safeText(entry?.celebration_message, ''),
  };
}

function calculateCompletionPercentage(timeline, explicitProgress = null) {
  if (Number.isFinite(Number(explicitProgress))) {
    return clamp(Math.round(Number(explicitProgress)));
  }

  if (!timeline.length) {
    return 0;
  }

  const total = timeline.reduce((sum, entry) => sum + entry.currentMasteryPercentage, 0);
  return clamp(Math.round(total / timeline.length));
}

function buildAdaptiveRuleList(adaptiveRules) {
  return Object.entries(adaptiveRules || {}).flatMap(([section, rules]) => (
    Object.entries(rules || {}).map(([ruleKey, rule]) => ({
      id: `${section}:${ruleKey}`,
      label: safeText(rule?.action || ruleKey, ruleKey),
      description: safeText(rule?.description, '系统将在满足条件时调整学习路径。'),
    }))
  ));
}

function resolveSubjectMeta(subjectCode) {
  return subjectMetaByCode[subjectCode] || {
    name: 'Unknown Subject',
    fullName: 'Unknown Subject',
  };
}

function buildViewModelFromStoredRecord(record, subjectCode, now) {
  const timeline = toArray(record?.topics_sequence).map((entry, index) => normalizeTimelineEntry(entry, index));
  const adaptiveRules = record?.adaptive_rules || {};
  const milestones = toArray(adaptiveRules?.milestones).map((entry, index) => normalizeMilestoneEntry(entry, index));
  const nextSteps = toArray(adaptiveRules?.next_steps).filter(Boolean);
  const updatedAt = toIsoTimestamp(record?.updated_at || adaptiveRules?.generated_at || record?.created_at);
  const estimatedMinutes = Math.max(
    toNumber(record?.estimated_completion_time, 0),
    toNumber(adaptiveRules?.daily_study_time, 0) * toNumber(adaptiveRules?.estimated_duration_days, 0),
  );
  const completionPercentage = calculateCompletionPercentage(
    timeline,
    record?.progress_percentage ?? adaptiveRules?.completion_percentage,
  );

  return {
    source: 'stored',
    title: safeText(record?.title, `${resolveSubjectMeta(subjectCode).name} 学习路径`),
    subjectCode,
    subject: resolveSubjectMeta(subjectCode),
    updatedAt,
    updatedLabel: formatRelativeTimestamp(updatedAt, now),
    stale: Boolean(updatedAt) && (now - new Date(updatedAt).getTime()) > (7 * 24 * 3600000),
    completionPercentage,
    estimatedMinutes,
    estimatedDurationLabel: formatMinutes(estimatedMinutes),
    dailyCommitmentLabel: formatMinutes(adaptiveRules?.daily_study_time || 0),
    targetMasteryPercentage: clamp(Math.round(toNumber(adaptiveRules?.target_mastery, 0.8) * 100)),
    timeline,
    milestones,
    nextSteps,
    adaptiveRules: buildAdaptiveRuleList(adaptiveRules),
    stats: {
      totalTopics: timeline.length,
      milestoneCount: milestones.length,
      totalSessions: timeline.reduce((sum, entry) => sum + entry.sessionCount, 0),
    },
  };
}

function buildViewModelFromGeneratedPayload(payload, subjectCode, now) {
  const learningPath = payload?.data?.learning_path || {};
  const timeline = toArray(learningPath?.timeline).map((entry, index) => normalizeTimelineEntry(entry, index));
  const milestones = toArray(learningPath?.milestones).map((entry, index) => normalizeMilestoneEntry(entry, index));
  const estimatedMinutes = Math.max(
    toNumber(learningPath?.daily_study_time, 0) * toNumber(learningPath?.estimated_duration, 0),
    timeline.reduce((sum, entry) => sum + entry.durationMinutes, 0),
  );
  const updatedAt = new Date(now).toISOString();

  return {
    source: 'generated',
    title: `${resolveSubjectMeta(subjectCode).name} 学习路径`,
    subjectCode,
    subject: resolveSubjectMeta(subjectCode),
    updatedAt,
    updatedLabel: '刚刚',
    stale: false,
    completionPercentage: calculateCompletionPercentage(timeline, 0),
    estimatedMinutes,
    estimatedDurationLabel: formatMinutes(estimatedMinutes),
    dailyCommitmentLabel: formatMinutes(learningPath?.daily_study_time || 0),
    targetMasteryPercentage: clamp(Math.round(toNumber(learningPath?.target_mastery, 0.8) * 100)),
    timeline,
    milestones,
    nextSteps: toArray(payload?.data?.next_steps).filter(Boolean),
    adaptiveRules: buildAdaptiveRuleList(learningPath?.adaptive_rules),
    stats: {
      totalTopics: Math.max(toNumber(learningPath?.total_topics, timeline.length), timeline.length),
      milestoneCount: milestones.length,
      totalSessions: timeline.reduce((sum, entry) => sum + entry.sessionCount, 0),
    },
  };
}

export function hasUsableLearningPath(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  return toArray(record.topics_sequence).length > 0 || toArray(record?.adaptive_rules?.milestones).length > 0;
}

export function createLearningPathViewModel(
  { storedRecord = null, generatedPayload = null, subjectCode = '9709', now = Date.now() } = {},
) {
  if (storedRecord) {
    return buildViewModelFromStoredRecord(storedRecord, subjectCode, now);
  }

  if (generatedPayload) {
    return buildViewModelFromGeneratedPayload(generatedPayload, subjectCode, now);
  }

  const subject = resolveSubjectMeta(subjectCode);
  return {
    source: 'empty',
    title: `${subject.name} 学习路径`,
    subjectCode,
    subject,
    updatedAt: null,
    updatedLabel: '尚未生成',
    stale: false,
    completionPercentage: 0,
    estimatedMinutes: 0,
    estimatedDurationLabel: '尚未生成',
    dailyCommitmentLabel: '尚未生成',
    targetMasteryPercentage: 80,
    timeline: [],
    milestones: [],
    nextSteps: [],
    adaptiveRules: [],
    stats: {
      totalTopics: 0,
      milestoneCount: 0,
      totalSessions: 0,
    },
  };
}

export function deriveLearningPathSurfaceState({
  isAuthenticated = true,
  isLoading = false,
  error = null,
  viewModel = null,
} = {}) {
  if (!isAuthenticated) {
    return 'auth_required';
  }

  if (isLoading && !viewModel) {
    return 'loading';
  }

  if (error && !viewModel) {
    return 'error';
  }

  if (!viewModel || viewModel.timeline.length === 0) {
    return 'empty';
  }

  if (isLoading) {
    return 'refreshing';
  }

  if (viewModel.stale) {
    return 'stale';
  }

  return 'ready';
}

export function serializeGeneratedLearningPathForStorage(
  payload,
  { userId, subjectCode, preferences = {} } = {},
) {
  const learningPath = payload?.data?.learning_path || {};
  const now = new Date().toISOString();
  const dailyStudyTime = toNumber(learningPath?.daily_study_time, 0);
  const estimatedDurationDays = toNumber(learningPath?.estimated_duration, 0);

  return {
    userId,
    subjectCode,
    topicsSequence: toArray(learningPath?.timeline),
    adaptiveRules: {
      ...(learningPath?.adaptive_rules || {}),
      milestones: toArray(learningPath?.milestones),
      next_steps: toArray(payload?.data?.next_steps),
      user_state: payload?.data?.user_state || {},
      target_mastery: toNumber(learningPath?.target_mastery, 0.8),
      daily_study_time: dailyStudyTime,
      estimated_duration_days: estimatedDurationDays,
      generated_at: now,
      completion_percentage: 0,
    },
    estimatedCompletionMinutes: dailyStudyTime * estimatedDurationDays,
    difficultyProgression: safeText(preferences?.difficulty_progression, 'adaptive'),
    title: `${resolveSubjectMeta(subjectCode).name} 学习路径`,
  };
}
