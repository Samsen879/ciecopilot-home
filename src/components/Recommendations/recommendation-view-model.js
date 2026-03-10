const RECOMMENDATION_TYPE_META = {
  content: {
    label: '内容推荐',
    emptyTitle: '还没有可展示的内容推荐',
    emptyDescription: '先完成几次学习记录或调整推荐偏好，系统才能更稳地给出内容排序。',
  },
  topic: {
    label: '主题推荐',
    emptyTitle: '还没有可展示的主题推荐',
    emptyDescription: '当前没有足够信号来判断优先复习的主题，可以先继续积累学习记录。',
  },
  learning_path: {
    label: '路径推荐',
    emptyTitle: '还没有可展示的学习路径推荐',
    emptyDescription: '系统暂时没有足够数据拼装下一条学习路径，稍后刷新或补充偏好即可。',
  },
};

const FACTOR_LABELS = {
  goal_alignment: '目标对齐',
  difficulty_fit: '难度匹配',
  novel_content: '新内容优先',
  recently_updated: '近期更新',
  profile_baseline: '基础画像',
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercentage(value) {
  return Math.round(Math.min(Math.max(toNumber(value, 0), 0), 1) * 100);
}

function safeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
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
  const deltaMinutes = Math.round(deltaMs / 60000);
  if (deltaMinutes < 1) {
    return '刚刚';
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} 小时前`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays} 天前`;
}

function formatDifficulty(metadata) {
  const label = safeText(metadata?.difficulty_label, '');
  if (label) {
    return label;
  }

  const level = toNumber(metadata?.difficulty_level, 0);
  if (level <= 0) {
    return '难度待定';
  }

  return `难度 ${level}/5`;
}

function buildReasonTags(item) {
  const factorTags = toArray(item?.reasoning?.factors).map((factor) => ({
    id: factor,
    label: FACTOR_LABELS[factor] || factor,
  }));
  const termTags = toArray(item?.metadata?.candidate_terms).slice(0, 3).map((term) => ({
    id: `term:${term}`,
    label: term,
  }));
  return [...factorTags, ...termTags];
}

function buildRecommendationCard(item, index = 0) {
  const metadata = item?.metadata || {};
  const scores = item?.scores || {};

  return {
    id: item?.id || `${item?.recommendation_type || 'recommendation'}-${index}`,
    title: safeText(item?.title, 'Untitled recommendation'),
    description: safeText(item?.description, '当前没有可展示的说明信息。'),
    recommendationType: item?.recommendation_type || 'content',
    targetType: item?.target?.type || 'unknown',
    targetId: item?.target?.id ?? null,
    confidencePercentage: clampPercentage(scores.confidence),
    relevancePercentage: clampPercentage(scores.relevance),
    priorityPercentage: clampPercentage(scores.priority),
    difficultyLabel: formatDifficulty(metadata),
    estimatedDurationLabel: formatMinutes(metadata?.estimated_duration_minutes),
    freshnessLabel: metadata?.published_at ? formatRelativeTimestamp(metadata.published_at) : '来源时间未知',
    reasoningSummary: safeText(item?.reasoning?.summary, '系统未提供额外解释。'),
    reasonTags: buildReasonTags(item),
    state: {
      clicked: Boolean(item?.state?.clicked),
      dismissed: Boolean(item?.state?.dismissed),
      clickCount: Math.max(toNumber(item?.state?.click_count, 0), 0),
      impressionCount: Math.max(toNumber(item?.state?.impression_count, 0), 0),
    },
  };
}

export function createRecommendationsViewModel(
  payload,
  { activeType = 'content', subjectCode = '9709', now = Date.now() } = {},
) {
  const data = payload?.data || {};
  const meta = payload?.meta || {};
  const typeMeta = RECOMMENDATION_TYPE_META[activeType] || RECOMMENDATION_TYPE_META.content;
  const items = toArray(data.items).map((item, index) => buildRecommendationCard(item, index));
  const expiresAt = data?.expires_at || null;
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const isStale = Boolean(meta.stale) || (Number.isFinite(expiresAtMs) && expiresAtMs <= now);

  return {
    subjectCode,
    activeType,
    typeLabel: typeMeta.label,
    items,
    emptyState: {
      title: typeMeta.emptyTitle,
      description: typeMeta.emptyDescription,
    },
    summary: {
      total: Math.max(toNumber(data?.pagination?.total, items.length), items.length),
      returned: Math.max(toNumber(data?.pagination?.returned, items.length), items.length ? 1 : 0),
      sourceCount: Math.max(toNumber(meta?.source_count, 0), 0),
      cached: Boolean(meta?.cached),
      stale: isStale,
      generatedLabel: formatRelativeTimestamp(data?.generated_at, now),
      expiresLabel: expiresAt ? formatRelativeTimestamp(expiresAt, now) : '未知',
      requestId: safeText(meta?.request_id, '') || null,
      engineVersion: safeText(meta?.engine_version || meta?.version, '') || null,
      fallbackReason: safeText(meta?.fallback_reason, '') || null,
      gateReason: safeText(meta?.gate?.reason, '') || null,
    },
    filters: {
      subjectCode: safeText(data?.filters?.subject_code, subjectCode),
      type: safeText(data?.filters?.type, activeType),
      minConfidence: toNumber(data?.filters?.min_confidence, 0.4),
    },
  };
}

export function deriveRecommendationsSurfaceState({
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

  if (!viewModel || viewModel.summary.total === 0) {
    return 'empty';
  }

  if (isLoading) {
    return 'refreshing';
  }

  if (viewModel.summary.stale) {
    return 'stale';
  }

  return 'ready';
}

export const recommendationTypeMeta = RECOMMENDATION_TYPE_META;
