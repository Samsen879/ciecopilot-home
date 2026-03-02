import { getServiceClient } from '../lib/supabase/client.js';
import {
  authenticateRecommendationsRequest,
  createRequestContext,
  handleUnexpectedError,
  normalizeStringArray,
  parseBooleanFlag,
  parseInteger,
  sendError,
  sendSuccess,
} from './lib/runtime.js';

const LEARNING_DATA_CONFIG = {
  MAX_RECORDS_PER_REQUEST: 200,
  VALID_ACTIVITY_TYPES: [
    'study',
    'practice',
    'review',
    'assessment',
    'video_watch',
    'reading',
    'discussion',
    'quiz',
    'view',
    'download',
    'bookmark',
    'search',
    'study_session',
  ],
  VALID_DIFFICULTY_LEVELS: [1, 2, 3, 4, 5],
  MIN_TIME_SPENT: 1,
  MAX_TIME_SPENT: 4 * 60 * 60,
};

function getClient() {
  return getServiceClient();
}

function mapLearningRow(row) {
  const metadata = row.activity_data || {};

  return {
    id: row.id,
    user_id: row.user_id,
    subject_code: row.subject_code,
    topic_id: row.topic_id || null,
    paper_id: row.paper_id || null,
    content_id: metadata.content_id || row.paper_id || null,
    activity_type: row.activity_type,
    time_spent: row.time_spent ?? 0,
    difficulty_level: row.difficulty_rating ?? null,
    is_correct: typeof metadata.is_correct === 'boolean' ? metadata.is_correct : null,
    score: row.user_rating ?? null,
    session_id: row.session_id || null,
    engagement_score: row.engagement_score ?? null,
    completion_rate: row.completion_rate ?? null,
    device_type: row.device_type || null,
    metadata,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function buildRecordInsert(body, userId) {
  const metadata = body.metadata && typeof body.metadata === 'object' ? { ...body.metadata } : {};
  if (typeof body.is_correct === 'boolean') {
    metadata.is_correct = body.is_correct;
  }
  if (body.content_id) {
    metadata.content_id = body.content_id;
  }

  return {
    user_id: userId,
    subject_code: body.subject_code.trim(),
    topic_id: body.topic_id,
    paper_id: body.paper_id || body.content_id || null,
    activity_type: body.activity_type,
    activity_data: metadata,
    time_spent: typeof body.time_spent === 'undefined' ? 0 : Number(body.time_spent),
    difficulty_rating: typeof body.difficulty_level === 'undefined' ? null : Number(body.difficulty_level),
    user_rating: typeof body.score === 'undefined' ? null : Number(body.score),
    engagement_score: typeof body.engagement_score === 'undefined' ? null : Number(body.engagement_score),
    completion_rate: typeof body.completion_rate === 'undefined' ? null : Number(body.completion_rate),
    session_id: body.session_id || generateSessionId(),
    device_type: body.device_type || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function validateCreatePayload(body) {
  if (!body?.subject_code || !String(body.subject_code).trim() || !body?.topic_id || !body?.activity_type) {
    return {
      ok: false,
      status: 400,
      code: 'missing_required_fields',
      message: 'subject_code, topic_id, and activity_type are required.',
    };
  }

  if (!LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES.includes(body.activity_type)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_activity_type',
      message: 'activity_type is invalid.',
      details: {
        allowed: LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES,
      },
    };
  }

  if (typeof body.time_spent !== 'undefined') {
    const timeSpent = Number(body.time_spent);
    if (!Number.isFinite(timeSpent) || timeSpent < LEARNING_DATA_CONFIG.MIN_TIME_SPENT || timeSpent > LEARNING_DATA_CONFIG.MAX_TIME_SPENT) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_time_spent',
        message: 'time_spent is out of range.',
      };
    }
  }

  if (typeof body.difficulty_level !== 'undefined') {
    const difficultyLevel = Number(body.difficulty_level);
    if (!LEARNING_DATA_CONFIG.VALID_DIFFICULTY_LEVELS.includes(difficultyLevel)) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_difficulty_level',
        message: 'difficulty_level must be between 1 and 5.',
      };
    }
  }

  if (typeof body.score !== 'undefined') {
    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_score',
        message: 'score must be between 0 and 100.',
      };
    }
  }

  return { ok: true };
}

async function getOwnedLearningRecord(userId, recordId) {
  const { data, error } = await getClient()
    .from('user_learning_data')
    .select('*')
    .eq('id', recordId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

function buildUpdatePatch(existingRow, body) {
  const patch = {};
  const nextMetadata = {
    ...(existingRow.activity_data || {}),
  };

  if (typeof body.time_spent !== 'undefined') {
    patch.time_spent = Number(body.time_spent);
  }
  if (typeof body.difficulty_level !== 'undefined') {
    patch.difficulty_rating = Number(body.difficulty_level);
  }
  if (typeof body.score !== 'undefined') {
    patch.user_rating = Number(body.score);
  }
  if (typeof body.is_correct === 'boolean') {
    nextMetadata.is_correct = body.is_correct;
  }
  if (body.metadata && typeof body.metadata === 'object') {
    Object.assign(nextMetadata, body.metadata);
  }
  if (typeof body.content_id === 'string' && body.content_id.trim()) {
    nextMetadata.content_id = body.content_id.trim();
    patch.paper_id = body.paper_id || body.content_id.trim();
  }
  if (typeof body.paper_id === 'string' && body.paper_id.trim()) {
    patch.paper_id = body.paper_id.trim();
  }
  if (typeof body.engagement_score !== 'undefined') {
    patch.engagement_score = Number(body.engagement_score);
  }
  if (typeof body.completion_rate !== 'undefined') {
    patch.completion_rate = Number(body.completion_rate);
  }
  if (typeof body.device_type === 'string') {
    patch.device_type = body.device_type.trim() || null;
  }

  if (Object.keys(nextMetadata).length) {
    patch.activity_data = nextMetadata;
  }

  return patch;
}

function buildStats(records) {
  if (!records.length) {
    return {
      total_records: 0,
      total_time_spent: 0,
      average_score: 0,
      accuracy_rate: 0,
      activity_breakdown: {},
      difficulty_breakdown: {},
      daily_activity: [],
    };
  }

  const totalTimeSpent = records.reduce((sum, record) => sum + Number(record.time_spent || 0), 0);
  const scoredRecords = records.filter((record) => record.score !== null && typeof record.score !== 'undefined');
  const correctRecords = records.filter((record) => record.is_correct === true).length;
  const checkedRecords = records.filter((record) => record.is_correct !== null).length;

  const activityBreakdown = {};
  const difficultyBreakdown = {};
  const dailyActivity = {};

  records.forEach((record) => {
    activityBreakdown[record.activity_type] = (activityBreakdown[record.activity_type] || 0) + 1;
    if (record.difficulty_level) {
      difficultyBreakdown[record.difficulty_level] = (difficultyBreakdown[record.difficulty_level] || 0) + 1;
    }

    const dayKey = String(record.created_at || '').split('T')[0];
    if (!dayKey) {
      return;
    }

    if (!dailyActivity[dayKey]) {
      dailyActivity[dayKey] = {
        date: dayKey,
        count: 0,
        time_spent: 0,
        activities: [],
      };
    }

    dailyActivity[dayKey].count += 1;
    dailyActivity[dayKey].time_spent += Number(record.time_spent || 0);
    dailyActivity[dayKey].activities.push(record.activity_type);
  });

  return {
    total_records: records.length,
    total_time_spent: totalTimeSpent,
    average_score: scoredRecords.length
      ? Number((scoredRecords.reduce((sum, record) => sum + Number(record.score || 0), 0) / scoredRecords.length).toFixed(2))
      : 0,
    accuracy_rate: checkedRecords
      ? Number((((correctRecords / checkedRecords) * 100)).toFixed(2))
      : 0,
    activity_breakdown: activityBreakdown,
    difficulty_breakdown: difficultyBreakdown,
    daily_activity: Object.values(dailyActivity).sort((left, right) => left.date.localeCompare(right.date)),
  };
}

async function handleGetLearningData(req, res, user, context) {
  const subjectCode = typeof req.query?.subject_code === 'string' ? req.query.subject_code.trim() : '';
  const activityType = typeof req.query?.activity_type === 'string' ? req.query.activity_type.trim() : '';
  const startDate = typeof req.query?.start_date === 'string' ? req.query.start_date.trim() : '';
  const endDate = typeof req.query?.end_date === 'string' ? req.query.end_date.trim() : '';
  const page = parseInteger(req.query?.page, 1, { min: 1, max: 1000 });
  const limit = parseInteger(req.query?.limit, 50, { min: 1, max: LEARNING_DATA_CONFIG.MAX_RECORDS_PER_REQUEST });
  const includeStats = parseBooleanFlag(req.query?.include_stats, false);

  if (activityType && !LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES.includes(activityType)) {
    return sendError(res, context, {
      status: 400,
      code: 'invalid_activity_type',
      message: 'activity_type is invalid.',
      details: {
        allowed: LEARNING_DATA_CONFIG.VALID_ACTIVITY_TYPES,
      },
    });
  }

  let query = getClient()
    .from('user_learning_data')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (subjectCode) {
    query = query.eq('subject_code', subjectCode);
  }
  if (activityType) {
    query = query.eq('activity_type', activityType);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const rangeStart = (page - 1) * limit;
  const rangeEnd = rangeStart + limit - 1;
  const { data, error, count } = await query.range(rangeStart, rangeEnd);

  if (error) {
    throw error;
  }

  let stats = null;
  if (includeStats) {
    let statsQuery = getClient()
      .from('user_learning_data')
      .select('*')
      .eq('user_id', user.id);

    if (subjectCode) {
      statsQuery = statsQuery.eq('subject_code', subjectCode);
    }
    if (activityType) {
      statsQuery = statsQuery.eq('activity_type', activityType);
    }
    if (startDate) {
      statsQuery = statsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      statsQuery = statsQuery.lte('created_at', endDate);
    }

    const statsResult = await statsQuery;
    if (statsResult.error) {
      throw statsResult.error;
    }
    stats = buildStats((statsResult.data || []).map(mapLearningRow));
  }

  return sendSuccess(res, context, {
    data: {
      items: (data || []).map(mapLearningRow),
      pagination: {
        page,
        limit,
        total: Number(count || 0),
        total_pages: Math.ceil(Number(count || 0) / limit),
      },
      filters: {
        subject_code: subjectCode || null,
        activity_type: activityType || null,
        start_date: startDate || null,
        end_date: endDate || null,
      },
      stats,
    },
  });
}

async function handleCreateLearningData(req, res, user, context) {
  const validation = validateCreatePayload(req.body || {});
  if (!validation.ok) {
    return sendError(res, context, validation);
  }

  const insertRow = buildRecordInsert(req.body || {}, user.id);
  const { data, error } = await getClient()
    .from('user_learning_data')
    .insert(insertRow)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return sendSuccess(res, context, {
    status: 201,
    message: 'Learning activity recorded.',
    data: {
      learning_record: mapLearningRow(data),
    },
  });
}

async function handleUpdateLearningData(req, res, user, context) {
  const recordId = req.query?.record_id;
  if (!recordId) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_record_id',
      message: 'record_id is required.',
    });
  }

  const existingRow = await getOwnedLearningRecord(user.id, recordId);
  if (!existingRow) {
    return sendError(res, context, {
      status: 404,
      code: 'record_not_found',
      message: 'Learning record not found.',
    });
  }

  const validation = validateCreatePayload({
    subject_code: existingRow.subject_code,
    topic_id: existingRow.topic_id,
    activity_type: existingRow.activity_type,
    ...req.body,
  });
  if (!validation.ok) {
    return sendError(res, context, validation);
  }

  const patch = buildUpdatePatch(existingRow, req.body || {});
  if (!Object.keys(patch).length) {
    return sendError(res, context, {
      status: 400,
      code: 'no_valid_fields',
      message: 'No supported fields were provided for update.',
      details: {
        allowed: ['time_spent', 'difficulty_level', 'score', 'is_correct', 'metadata', 'content_id', 'paper_id', 'engagement_score', 'completion_rate', 'device_type'],
      },
    });
  }

  const { data, error } = await getClient()
    .from('user_learning_data')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return sendSuccess(res, context, {
    message: 'Learning activity updated.',
    data: {
      learning_record: mapLearningRow(data),
    },
  });
}

async function handleDeleteLearningData(req, res, user, context) {
  const recordId = req.query?.record_id;
  if (!recordId) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_record_id',
      message: 'record_id is required.',
    });
  }

  const existingRow = await getOwnedLearningRecord(user.id, recordId);
  if (!existingRow) {
    return sendError(res, context, {
      status: 404,
      code: 'record_not_found',
      message: 'Learning record not found.',
    });
  }

  const { error } = await getClient()
    .from('user_learning_data')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  return sendSuccess(res, context, {
    message: 'Learning activity deleted.',
    data: {
      record_id: recordId,
    },
  });
}

export default async function handler(req, res) {
  const context = createRequestContext(req, res, 'recommendations/learning-data');
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
      await handleGetLearningData(req, res, auth.user, context);
      return;
    }
    if (req.method === 'POST') {
      await handleCreateLearningData(req, res, auth.user, context);
      return;
    }
    if (req.method === 'PUT') {
      await handleUpdateLearningData(req, res, auth.user, context);
      return;
    }
    if (req.method === 'DELETE') {
      await handleDeleteLearningData(req, res, auth.user, context);
    }
  } catch (error) {
    handleUnexpectedError(res, context, error, 'learning_data_unhandled_error', 'Failed to process learning data request.');
  }
}

export { LEARNING_DATA_CONFIG, mapLearningRow };

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
