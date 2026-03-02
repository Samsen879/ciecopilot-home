import { getServiceClient } from '../lib/supabase/client.js';
import { VALID_RECOMMENDATION_TYPES } from './algorithm-engine.js';
import { orchestrateRecommendationGeneration } from './lib/recommendation-orchestrator.js';
import {
  RECOMMENDATIONS_BACKEND_VERSION,
  authenticateRecommendationsRequest,
  createRequestContext,
  handleUnexpectedError,
  parseBooleanFlag,
  parseFloatInRange,
  parseInteger,
  sendError,
  sendSuccess,
} from './lib/runtime.js';

const CACHE_TTL_SECONDS = 3600;
const MAX_LIMIT = 50;
const VALID_FEEDBACK_TYPES = new Set(['like', 'dislike', 'not_relevant', 'helpful', 'too_easy', 'too_hard']);
const POSITIVE_FEEDBACK_TYPES = new Set(['like', 'helpful']);

function getClient() {
  return getServiceClient();
}

function buildCacheKey(userId, subjectCode, type, limit, minConfidence) {
  return [
    'recommendations',
    RECOMMENDATIONS_BACKEND_VERSION,
    userId,
    subjectCode,
    type,
    `limit:${limit}`,
    `min:${minConfidence.toFixed(2)}`,
  ].join(':');
}

function normalizeRecommendationRow(row) {
  return {
    id: row.id,
    subject_code: row.subject_code,
    recommendation_type: row.recommendation_type,
    target: {
      type: row.target_type,
      id: row.target_id,
    },
    title: row.title,
    description: row.description,
    scores: {
      confidence: Number(row.confidence_score || 0),
      relevance: Number(row.relevance_score || 0),
      priority: Number(row.priority_score || 0),
    },
    state: {
      clicked: Boolean(row.is_clicked),
      dismissed: Boolean(row.is_dismissed),
      click_count: Number(row.click_count || 0),
      impression_count: Number(row.impression_count || 0),
    },
    reasoning: row.reasoning || {},
    metadata: row.metadata || {},
    algorithm_version: row.algorithm_version || RECOMMENDATIONS_BACKEND_VERSION,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    expires_at: row.expires_at || null,
  };
}

function shapeRecommendationPayload(payload, { limit, offset }) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const safeLimit = Math.max(Number.parseInt(limit, 10) || 10, 1);
  const windowed = items.slice(safeOffset, safeOffset + safeLimit);

  return {
    items: windowed,
    pagination: {
      offset: safeOffset,
      limit: safeLimit,
      returned: windowed.length,
      total: items.length,
    },
    filters: payload.filters,
    generated_at: payload.generated_at,
    expires_at: payload.expires_at,
  };
}

async function getCachedRecommendationPayload(cacheKey) {
  try {
    const { data, error } = await getClient()
      .from('recommendation_cache')
      .select('id, recommendation_data, expires_at, hit_count')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data?.recommendation_data) {
      return null;
    }

    if (data.recommendation_data?.version !== RECOMMENDATIONS_BACKEND_VERSION) {
      return null;
    }

    await getClient()
      .from('recommendation_cache')
      .update({
        last_accessed: new Date().toISOString(),
        hit_count: Number(data.hit_count || 0) + 1,
      })
      .eq('id', data.id);

    return data.recommendation_data;
  } catch (error) {
    console.warn('[recommendations] cache read failed:', error);
    return null;
  }
}

async function cacheRecommendationPayload(cacheKey, userId, subjectCode, payload) {
  try {
    await getClient()
      .from('recommendation_cache')
      .upsert({
        cache_key: cacheKey,
        user_id: userId,
        subject_code: subjectCode,
        recommendation_data: payload,
        algorithm_version: RECOMMENDATIONS_BACKEND_VERSION,
        cache_metadata: {
          recommendation_type: payload.filters.type,
          item_count: payload.items.length,
        },
        expires_at: payload.expires_at,
        last_accessed: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });
  } catch (error) {
    console.warn('[recommendations] cache write failed:', error);
  }
}

async function clearRecommendationCache(userId, subjectCode) {
  try {
    await getClient()
      .from('recommendation_cache')
      .delete()
      .eq('user_id', userId)
      .eq('subject_code', subjectCode);
  } catch (error) {
    console.warn('[recommendations] cache clear failed:', error);
  }
}

async function storeRecommendations(userId, subjectCode, generatedItems, generatedAt, expiresAt) {
  if (!generatedItems.length) {
    return [];
  }

  const rowsToInsert = generatedItems.map((item) => ({
    user_id: userId,
    subject_code: subjectCode,
    recommendation_type: item.recommendation_type,
    target_type: item.target_type,
    target_id: item.target_id,
    title: item.title,
    description: item.description,
    confidence_score: item.confidence_score,
    relevance_score: item.relevance_score,
    priority_score: item.priority_score,
    algorithm_version: RECOMMENDATIONS_BACKEND_VERSION,
    reasoning: item.reasoning,
    metadata: item.metadata,
    impression_count: 1,
    expires_at: expiresAt,
    created_at: generatedAt,
    updated_at: generatedAt,
  }));

  const { data, error } = await getClient()
    .from('recommendations')
    .insert(rowsToInsert)
    .select('*');

  if (error) {
    throw error;
  }

  const order = new Map(
    generatedItems.map((item, index) => [`${item.target_type}:${item.target_id}`, index]),
  );

  return (data || [])
    .slice()
    .sort((left, right) => {
      const leftKey = `${left.target_type}:${left.target_id}`;
      const rightKey = `${right.target_type}:${right.target_id}`;
      return (order.get(leftKey) ?? 0) - (order.get(rightKey) ?? 0);
    })
    .map(normalizeRecommendationRow);
}

async function getOwnedRecommendation(userId, recommendationId) {
  const { data, error } = await getClient()
    .from('recommendations')
    .select('*')
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function updateRecommendationRow(recommendationId, userId, patch) {
  const { data, error } = await getClient()
    .from('recommendations')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return normalizeRecommendationRow(data);
}

async function handleGetRecommendations(req, res, user, context) {
  const subjectCode = typeof req.query?.subject_code === 'string' ? req.query.subject_code.trim() : '';
  const type = typeof req.query?.type === 'string' ? req.query.type.trim() : 'content';
  const limit = parseInteger(req.query?.limit, 10, { min: 1, max: MAX_LIMIT });
  const offset = parseInteger(req.query?.offset, 0, { min: 0, max: 1000 });
  const requestedCount = Math.min(limit + offset, MAX_LIMIT);
  const minConfidence = parseFloatInRange(req.query?.min_confidence, 0.4, { min: 0, max: 1 });
  const refresh = parseBooleanFlag(req.query?.refresh, false);

  if (!subjectCode) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_subject_code',
      message: 'subject_code is required.',
    });
  }

  if (!VALID_RECOMMENDATION_TYPES.has(type)) {
    return sendError(res, context, {
      status: 400,
      code: 'invalid_recommendation_type',
      message: 'Unsupported recommendation type.',
      details: {
        allowed: Array.from(VALID_RECOMMENDATION_TYPES),
      },
    });
  }

  const cacheKey = buildCacheKey(user.id, subjectCode, type, requestedCount, minConfidence);

  if (!refresh) {
    const cachedPayload = await getCachedRecommendationPayload(cacheKey);
    if (cachedPayload) {
      return sendSuccess(res, context, {
        data: shapeRecommendationPayload(cachedPayload, { limit, offset }),
        meta: {
          cached: true,
          engine_version: cachedPayload.engine_version,
          source_count: cachedPayload.source_count,
        },
      });
    }
  }

  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (CACHE_TTL_SECONDS * 1000)).toISOString();
  const generated = await orchestrateRecommendationGeneration({
    userId: user.id,
    subjectCode,
    type,
    requestedCount,
    minConfidence,
  });

  const persistedItems = await storeRecommendations(user.id, subjectCode, generated.items, generatedAt, expiresAt);
  const payload = {
    version: RECOMMENDATIONS_BACKEND_VERSION,
    engine_version: generated.engine_version,
    source_count: generated.metadata.candidate_count,
    generated_at: generatedAt,
    expires_at: expiresAt,
    filters: {
      subject_code: subjectCode,
      type,
      min_confidence: minConfidence,
    },
    items: persistedItems,
  };

  await cacheRecommendationPayload(cacheKey, user.id, subjectCode, payload);

  return sendSuccess(res, context, {
    data: shapeRecommendationPayload(payload, { limit, offset }),
    meta: {
      cached: false,
      engine_version: generated.engine_version,
      source_count: generated.metadata.candidate_count,
    },
  });
}

async function handleCreateRecommendationFeedback(req, res, user, context) {
  const recommendationId = req.body?.recommendation_id;
  const feedbackType = req.body?.feedback_type;
  const rating = req.body?.rating;
  const comment = req.body?.comment;

  if (!recommendationId || !feedbackType) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_required_fields',
      message: 'recommendation_id and feedback_type are required.',
    });
  }

  if (!VALID_FEEDBACK_TYPES.has(feedbackType)) {
    return sendError(res, context, {
      status: 400,
      code: 'invalid_feedback_type',
      message: 'feedback_type is invalid.',
      details: {
        allowed: Array.from(VALID_FEEDBACK_TYPES),
      },
    });
  }

  if (typeof rating !== 'undefined') {
    const normalizedRating = Number(rating);
    if (!Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return sendError(res, context, {
        status: 400,
        code: 'invalid_rating',
        message: 'rating must be between 1 and 5.',
      });
    }
  }

  const recommendation = await getOwnedRecommendation(user.id, recommendationId);
  if (!recommendation) {
    return sendError(res, context, {
      status: 404,
      code: 'recommendation_not_found',
      message: 'Recommendation not found.',
    });
  }

  const { data, error } = await getClient()
    .from('recommendation_feedback')
    .insert({
      recommendation_id: recommendationId,
      user_id: user.id,
      feedback_type: feedbackType,
      rating: typeof rating === 'undefined' ? null : Number(rating),
      comment: typeof comment === 'string' ? comment.trim() || null : null,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  let updatedRecommendation = normalizeRecommendationRow(recommendation);
  if (POSITIVE_FEEDBACK_TYPES.has(feedbackType)) {
    updatedRecommendation = await updateRecommendationRow(recommendationId, user.id, {
      is_clicked: true,
      click_count: Number(recommendation.click_count || 0) + 1,
    });
  }

  await clearRecommendationCache(user.id, recommendation.subject_code);

  return sendSuccess(res, context, {
    status: 201,
    message: 'Recommendation feedback recorded.',
    data: {
      feedback: data,
      recommendation: updatedRecommendation,
    },
  });
}

async function handleUpdateRecommendation(req, res, user, context) {
  const recommendationId = req.query?.recommendation_id;
  const nextClicked = req.body?.is_clicked;
  const nextDismissed = req.body?.is_dismissed;

  if (!recommendationId) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_recommendation_id',
      message: 'recommendation_id is required.',
    });
  }

  const recommendation = await getOwnedRecommendation(user.id, recommendationId);
  if (!recommendation) {
    return sendError(res, context, {
      status: 404,
      code: 'recommendation_not_found',
      message: 'Recommendation not found.',
    });
  }

  const patch = {};

  if (typeof nextClicked === 'boolean') {
    patch.is_clicked = nextClicked;
    if (nextClicked && !recommendation.is_clicked) {
      patch.click_count = Number(recommendation.click_count || 0) + 1;
    }
  }

  if (typeof nextDismissed === 'boolean') {
    patch.is_dismissed = nextDismissed;
  }

  if (!Object.keys(patch).length) {
    return sendError(res, context, {
      status: 400,
      code: 'no_valid_fields',
      message: 'No supported fields were provided for update.',
      details: {
        allowed: ['is_clicked', 'is_dismissed'],
      },
    });
  }

  const updatedRecommendation = await updateRecommendationRow(recommendationId, user.id, patch);
  await clearRecommendationCache(user.id, recommendation.subject_code);

  return sendSuccess(res, context, {
    message: 'Recommendation updated.',
    data: {
      recommendation: updatedRecommendation,
    },
  });
}

async function handleDeleteRecommendation(req, res, user, context) {
  const recommendationId = req.query?.recommendation_id;

  if (!recommendationId) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_recommendation_id',
      message: 'recommendation_id is required.',
    });
  }

  const recommendation = await getOwnedRecommendation(user.id, recommendationId);
  if (!recommendation) {
    return sendError(res, context, {
      status: 404,
      code: 'recommendation_not_found',
      message: 'Recommendation not found.',
    });
  }

  const { error } = await getClient()
    .from('recommendations')
    .delete()
    .eq('id', recommendationId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  await clearRecommendationCache(user.id, recommendation.subject_code);

  return sendSuccess(res, context, {
    message: 'Recommendation deleted.',
    data: {
      recommendation_id: recommendationId,
    },
  });
}

export default async function handler(req, res) {
  const context = createRequestContext(req, res, 'recommendations');
  if (context.handled) {
    return;
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    sendError(res, context, {
      status: 405,
      code: 'method_not_allowed',
      message: 'Method not allowed.',
    });
    return;
  }

  try {
    const auth = await authenticateRecommendationsRequest(req, res, context);
    if (auth.handled) {
      return;
    }

    if (req.method === 'GET') {
      await handleGetRecommendations(req, res, auth.user, context);
      return;
    }

    if (req.method === 'POST') {
      await handleCreateRecommendationFeedback(req, res, auth.user, context);
      return;
    }

    if (req.method === 'PUT') {
      await handleUpdateRecommendation(req, res, auth.user, context);
      return;
    }

    if (req.method === 'DELETE') {
      await handleDeleteRecommendation(req, res, auth.user, context);
      return;
    }
  } catch (error) {
    handleUnexpectedError(res, context, error, 'recommendations_unhandled_error', 'Failed to process recommendation request.');
  }
}
