import { recommendationEngine, VALID_RECOMMENDATION_TYPES } from '../algorithm-engine.js';
import { RECOMMENDATIONS_BACKEND_VERSION } from './runtime.js';

const DEFAULT_REASONING_SUMMARY = 'Recommendation ranked from profile fit and learning history.';
const MAX_COLLECTION_ITEMS = 8;

function clampScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(Math.max(parsed, 0), 1);
}

function toInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeIsoTimestamp(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeStringList(value, maxItems = MAX_COLLECTION_ITEMS) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean),
  )).slice(0, maxItems);
}

function normalizeDurationMinutes(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) {
      return normalizeDurationMinutes(Number(match[0]));
    }
  }

  return null;
}

function normalizeMetadata(metadata, { targetType, targetId } = {}) {
  const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};

  return {
    source_type: safeMetadata.source_type || targetType || null,
    source_id: typeof safeMetadata.source_id !== 'undefined' ? safeMetadata.source_id : (targetId ?? null),
    source_label: normalizeText(safeMetadata.source_label, '') || null,
    difficulty_level: Number.isFinite(Number(safeMetadata.difficulty_level))
      ? Number(safeMetadata.difficulty_level)
      : null,
    difficulty_label: normalizeText(safeMetadata.difficulty_label, '') || null,
    published_at: normalizeIsoTimestamp(safeMetadata.published_at || safeMetadata.updated_at || safeMetadata.created_at),
    estimated_duration_minutes: normalizeDurationMinutes(
      safeMetadata.estimated_duration_minutes ?? safeMetadata.estimated_duration,
    ),
    keywords: normalizeStringList(safeMetadata.keywords),
    learning_objectives: normalizeStringList(safeMetadata.learning_objectives, 6),
    topic_tags: normalizeStringList(safeMetadata.topic_tags, 6),
    candidate_terms: normalizeStringList(safeMetadata.candidate_terms || safeMetadata.match_terms),
  };
}

function normalizeReasoning(reasoning) {
  const safeReasoning = reasoning && typeof reasoning === 'object' ? reasoning : {};
  const factors = normalizeStringList(safeReasoning.factors, 6);

  return {
    summary: normalizeText(safeReasoning.summary, DEFAULT_REASONING_SUMMARY),
    factors: factors.length ? factors : ['profile_baseline'],
  };
}

function normalizeRecommendationType(type, fallbackType = 'content') {
  if (VALID_RECOMMENDATION_TYPES.has(type)) {
    return type;
  }
  return VALID_RECOMMENDATION_TYPES.has(fallbackType) ? fallbackType : 'content';
}

function normalizeTargetType(value, recommendationType) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  switch (recommendationType) {
    case 'topic':
      return 'topic';
    case 'learning_path':
      return 'path';
    default:
      return 'paper';
  }
}

export function normalizeRecommendationContractItem(item, { fallbackType = 'content' } = {}) {
  const recommendationType = normalizeRecommendationType(item?.recommendation_type, fallbackType);
  const targetType = normalizeTargetType(item?.target?.type ?? item?.target_type, recommendationType);
  const targetId = item?.target?.id ?? item?.target_id ?? null;

  return {
    ...((item && Object.prototype.hasOwnProperty.call(item, 'id')) ? { id: item.id } : {}),
    subject_code: normalizeText(item?.subject_code, '') || null,
    recommendation_type: recommendationType,
    target: {
      type: targetType,
      id: targetId,
    },
    title: normalizeText(item?.title, 'Untitled recommendation'),
    description: normalizeText(item?.description, ''),
    scores: {
      confidence: clampScore(item?.scores?.confidence ?? item?.confidence_score),
      relevance: clampScore(item?.scores?.relevance ?? item?.relevance_score),
      priority: clampScore(item?.scores?.priority ?? item?.priority_score),
    },
    state: {
      clicked: Boolean(item?.state?.clicked ?? item?.is_clicked),
      dismissed: Boolean(item?.state?.dismissed ?? item?.is_dismissed),
      click_count: toInteger(item?.state?.click_count ?? item?.click_count),
      impression_count: toInteger(item?.state?.impression_count ?? item?.impression_count),
    },
    reasoning: normalizeReasoning(item?.reasoning),
    metadata: normalizeMetadata(item?.metadata, { targetType, targetId }),
    algorithm_version: normalizeText(item?.algorithm_version, RECOMMENDATIONS_BACKEND_VERSION),
    created_at: normalizeIsoTimestamp(item?.created_at),
    updated_at: normalizeIsoTimestamp(item?.updated_at),
    expires_at: normalizeIsoTimestamp(item?.expires_at),
  };
}

export function normalizeRecommendationContractBatch(
  items,
  { fallbackType = 'content', limit = Infinity, minConfidence = 0 } = {},
) {
  const deduped = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeRecommendationContractItem(item, { fallbackType });
    const key = `${normalized.target.type}:${String(normalized.target.id ?? '')}`;
    const hasTargetId = normalized.target.id !== null && typeof normalized.target.id !== 'undefined' && normalized.target.id !== '';

    if (!hasTargetId || normalized.scores.confidence < minConfidence || deduped.has(key)) {
      return;
    }

    deduped.set(key, normalized);
  });

  return Array.from(deduped.values()).slice(0, limit);
}

export async function orchestrateRecommendationGeneration({
  userId,
  subjectCode,
  type,
  requestedCount,
  minConfidence,
} = {}) {
  if (!VALID_RECOMMENDATION_TYPES.has(type)) {
    const error = new Error('Unsupported recommendation type.');
    error.status = 400;
    error.code = 'invalid_recommendation_type';
    error.details = {
      allowed: Array.from(VALID_RECOMMENDATION_TYPES),
    };
    throw error;
  }

  const rawResult = await recommendationEngine.generateRecommendations({
    userId,
    subjectCode,
    type,
    limit: requestedCount,
    minConfidence,
  });

  const normalizedItems = normalizeRecommendationContractBatch(rawResult?.items, {
    fallbackType: type,
    limit: requestedCount,
    minConfidence,
  });

  return {
    items: normalizedItems,
    engine_version: normalizeText(rawResult?.engine_version, RECOMMENDATIONS_BACKEND_VERSION),
    metadata: {
      candidate_count: Math.max(toInteger(rawResult?.metadata?.candidate_count), Array.isArray(rawResult?.items) ? rawResult.items.length : 0),
      returned_count: normalizedItems.length,
      min_confidence: clampScore(rawResult?.metadata?.min_confidence ?? minConfidence),
    },
  };
}
