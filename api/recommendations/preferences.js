import { getServiceClient } from '../lib/supabase/client.js';
import {
  authenticateRecommendationsRequest,
  createRequestContext,
  handleUnexpectedError,
  normalizeStringArray,
  sendError,
  sendSuccess,
} from './lib/runtime.js';

const PREFERENCE_CONFIG = {
  MAX_INTERESTS: 20,
  MAX_GOALS: 10,
  VALID_LEARNING_STYLES: ['visual', 'auditory', 'kinesthetic', 'reading'],
  VALID_DIFFICULTY_LEVELS: [1, 2, 3, 4, 5],
  VALID_LEARNING_PACE: ['slow', 'medium', 'fast'],
};

const PREFERENCE_RECORD_TYPE = 'recommendations_profile';

function getClient() {
  return getServiceClient();
}

function validatePreferencePayload(payload, { requireSubjectCode = false } = {}) {
  const subjectCode = typeof payload?.subject_code === 'string' ? payload.subject_code.trim() : '';

  if (requireSubjectCode && !subjectCode) {
    return {
      ok: false,
      status: 400,
      code: 'missing_subject_code',
      message: 'subject_code is required.',
    };
  }

  if (payload?.learning_style && !PREFERENCE_CONFIG.VALID_LEARNING_STYLES.includes(payload.learning_style)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_learning_style',
      message: 'learning_style is invalid.',
      details: {
        allowed: PREFERENCE_CONFIG.VALID_LEARNING_STYLES,
      },
    };
  }

  if (
    typeof payload?.preferred_difficulty !== 'undefined' &&
    !PREFERENCE_CONFIG.VALID_DIFFICULTY_LEVELS.includes(Number(payload.preferred_difficulty))
  ) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_preferred_difficulty',
      message: 'preferred_difficulty must be between 1 and 5.',
      details: {
        allowed: PREFERENCE_CONFIG.VALID_DIFFICULTY_LEVELS,
      },
    };
  }

  if (payload?.learning_pace && !PREFERENCE_CONFIG.VALID_LEARNING_PACE.includes(payload.learning_pace)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_learning_pace',
      message: 'learning_pace is invalid.',
      details: {
        allowed: PREFERENCE_CONFIG.VALID_LEARNING_PACE,
      },
    };
  }

  const interests = normalizeStringArray(payload?.interests, PREFERENCE_CONFIG.MAX_INTERESTS + 1);
  if (interests.length > PREFERENCE_CONFIG.MAX_INTERESTS) {
    return {
      ok: false,
      status: 400,
      code: 'too_many_interests',
      message: `No more than ${PREFERENCE_CONFIG.MAX_INTERESTS} interests are allowed.`,
    };
  }

  const learningGoals = normalizeStringArray(payload?.learning_goals, PREFERENCE_CONFIG.MAX_GOALS + 1);
  if (learningGoals.length > PREFERENCE_CONFIG.MAX_GOALS) {
    return {
      ok: false,
      status: 400,
      code: 'too_many_learning_goals',
      message: `No more than ${PREFERENCE_CONFIG.MAX_GOALS} learning goals are allowed.`,
    };
  }

  return { ok: true };
}

function buildPreferenceValue(payload) {
  return {
    learning_style: payload.learning_style || 'visual',
    preferred_difficulty: Number(payload.preferred_difficulty ?? 3),
    learning_pace: payload.learning_pace || 'medium',
    content_preferences: payload.content_preferences && typeof payload.content_preferences === 'object'
      ? payload.content_preferences
      : {},
    learning_goals: normalizeStringArray(payload.learning_goals, PREFERENCE_CONFIG.MAX_GOALS),
    interests: normalizeStringArray(payload.interests, PREFERENCE_CONFIG.MAX_INTERESTS),
    time_preferences: payload.time_preferences && typeof payload.time_preferences === 'object'
      ? payload.time_preferences
      : {},
  };
}

function mapPreferenceRow(row) {
  if (!row) {
    return null;
  }

  const value = row.preference_value || {};
  return {
    subject_code: row.subject_code,
    learning_style: value.learning_style || 'visual',
    preferred_difficulty: Number(value.preferred_difficulty ?? 3),
    learning_pace: value.learning_pace || 'medium',
    content_preferences: value.content_preferences || {},
    learning_goals: normalizeStringArray(value.learning_goals, PREFERENCE_CONFIG.MAX_GOALS),
    interests: normalizeStringArray(value.interests, PREFERENCE_CONFIG.MAX_INTERESTS),
    time_preferences: value.time_preferences || {},
    updated_at: row.last_updated || row.created_at || null,
    created_at: row.created_at || null,
  };
}

async function getPreferenceRow(userId, subjectCode) {
  const { data, error } = await getClient()
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_code', subjectCode)
    .eq('preference_type', PREFERENCE_RECORD_TYPE)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function syncLearningProfile(userId, subjectCode, preferenceValue) {
  try {
    await getClient()
      .from('user_learning_profiles')
      .upsert({
        user_id: userId,
        subject_code: subjectCode,
        learning_style: {
          primary: preferenceValue.learning_style,
          preferences: preferenceValue.content_preferences || {},
        },
        learning_pace: preferenceValue.learning_pace,
        preferred_difficulty: Number(preferenceValue.preferred_difficulty ?? 3),
        content_preferences: preferenceValue.content_preferences || {},
        strength_areas: preferenceValue.interests || [],
        goal_preferences: preferenceValue.learning_goals || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,subject_code',
      });
  } catch (error) {
    console.warn('[recommendations/preferences] learning profile sync failed:', error);
  }
}

async function handleGetPreferences(req, res, user, context) {
  const subjectCode = typeof req.query?.subject_code === 'string' ? req.query.subject_code.trim() : '';
  const includeProfile = req.query?.include_profile !== 'false';

  if (subjectCode) {
    const [preferenceRow, profileResult] = await Promise.all([
      getPreferenceRow(user.id, subjectCode),
      includeProfile
        ? getClient()
          .from('user_learning_profiles')
          .select('*')
          .eq('user_id', user.id)
          .eq('subject_code', subjectCode)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profileResult.error) {
      throw profileResult.error;
    }

    return sendSuccess(res, context, {
      data: {
        preference: mapPreferenceRow(preferenceRow),
        learning_profile: includeProfile ? (profileResult.data || null) : undefined,
      },
    });
  }

  const [preferenceResult, profileResult] = await Promise.all([
    getClient()
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('preference_type', PREFERENCE_RECORD_TYPE)
      .order('last_updated', { ascending: false }),
    includeProfile
      ? getClient()
        .from('user_learning_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (preferenceResult.error) {
    throw preferenceResult.error;
  }
  if (profileResult.error) {
    throw profileResult.error;
  }

  return sendSuccess(res, context, {
    data: {
      preferences: (preferenceResult.data || []).map(mapPreferenceRow),
      total: preferenceResult.data?.length || 0,
      learning_profiles: includeProfile ? (profileResult.data || []) : undefined,
    },
  });
}

async function handleCreatePreferences(req, res, user, context) {
  const validation = validatePreferencePayload(req.body || {}, { requireSubjectCode: true });
  if (!validation.ok) {
    return sendError(res, context, validation);
  }

  const subjectCode = req.body.subject_code.trim();
  const existingRow = await getPreferenceRow(user.id, subjectCode);
  if (existingRow) {
    return sendError(res, context, {
      status: 409,
      code: 'preferences_exist',
      message: 'Preferences already exist for this subject. Use PUT to update them.',
    });
  }

  const preferenceValue = buildPreferenceValue(req.body || {});
  const { data, error } = await getClient()
    .from('user_preferences')
    .insert({
      user_id: user.id,
      subject_code: subjectCode,
      preference_type: PREFERENCE_RECORD_TYPE,
      preference_value: preferenceValue,
      weight: 1,
      last_updated: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await syncLearningProfile(user.id, subjectCode, preferenceValue);

  return sendSuccess(res, context, {
    status: 201,
    message: 'Preferences created.',
    data: {
      preference: mapPreferenceRow(data),
    },
  });
}

async function handleUpdatePreferences(req, res, user, context) {
  const subjectCode = typeof req.query?.subject_code === 'string' ? req.query.subject_code.trim() : '';
  if (!subjectCode) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_subject_code',
      message: 'subject_code is required.',
    });
  }

  const validation = validatePreferencePayload(req.body || {});
  if (!validation.ok) {
    return sendError(res, context, validation);
  }

  const existingRow = await getPreferenceRow(user.id, subjectCode);
  if (!existingRow) {
    return sendError(res, context, {
      status: 404,
      code: 'preferences_not_found',
      message: 'Preferences not found.',
    });
  }

  const mergedPreferenceValue = {
    ...mapPreferenceRow(existingRow),
    ...req.body,
  };
  delete mergedPreferenceValue.subject_code;
  delete mergedPreferenceValue.created_at;
  delete mergedPreferenceValue.updated_at;

  const nextPreferenceValue = buildPreferenceValue(mergedPreferenceValue);

  const { data, error } = await getClient()
    .from('user_preferences')
    .update({
      preference_value: nextPreferenceValue,
      last_updated: new Date().toISOString(),
    })
    .eq('id', existingRow.id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await syncLearningProfile(user.id, subjectCode, nextPreferenceValue);

  return sendSuccess(res, context, {
    message: 'Preferences updated.',
    data: {
      preference: mapPreferenceRow(data),
    },
  });
}

async function handleDeletePreferences(req, res, user, context) {
  const subjectCode = typeof req.query?.subject_code === 'string' ? req.query.subject_code.trim() : '';
  if (!subjectCode) {
    return sendError(res, context, {
      status: 400,
      code: 'missing_subject_code',
      message: 'subject_code is required.',
    });
  }

  const existingRow = await getPreferenceRow(user.id, subjectCode);
  if (!existingRow) {
    return sendError(res, context, {
      status: 404,
      code: 'preferences_not_found',
      message: 'Preferences not found.',
    });
  }

  const { error } = await getClient()
    .from('user_preferences')
    .delete()
    .eq('id', existingRow.id)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }

  return sendSuccess(res, context, {
    message: 'Preferences deleted.',
    data: {
      subject_code: subjectCode,
    },
  });
}

export default async function handler(req, res) {
  const context = createRequestContext(req, res, 'recommendations/preferences');
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
      await handleGetPreferences(req, res, auth.user, context);
      return;
    }
    if (req.method === 'POST') {
      await handleCreatePreferences(req, res, auth.user, context);
      return;
    }
    if (req.method === 'PUT') {
      await handleUpdatePreferences(req, res, auth.user, context);
      return;
    }
    if (req.method === 'DELETE') {
      await handleDeletePreferences(req, res, auth.user, context);
    }
  } catch (error) {
    handleUnexpectedError(res, context, error, 'preferences_unhandled_error', 'Failed to process preferences request.');
  }
}

export async function getUserPreferenceStats(userId) {
  const { data, error } = await getClient()
    .from('user_preferences')
    .select('subject_code, preference_value')
    .eq('user_id', userId)
    .eq('preference_type', PREFERENCE_RECORD_TYPE);

  if (error) {
    throw error;
  }

  const preferences = (data || []).map((row) => mapPreferenceRow(row)).filter(Boolean);
  const learningStyleDistribution = {};
  const difficultyDistribution = {};
  const paceDistribution = {};

  preferences.forEach((preference) => {
    learningStyleDistribution[preference.learning_style] = (learningStyleDistribution[preference.learning_style] || 0) + 1;
    difficultyDistribution[preference.preferred_difficulty] = (difficultyDistribution[preference.preferred_difficulty] || 0) + 1;
    paceDistribution[preference.learning_pace] = (paceDistribution[preference.learning_pace] || 0) + 1;
  });

  const averageDifficulty = preferences.length
    ? preferences.reduce((sum, preference) => sum + Number(preference.preferred_difficulty || 0), 0) / preferences.length
    : 3;

  return {
    total_subjects: preferences.length,
    learning_style_distribution: learningStyleDistribution,
    difficulty_distribution: difficultyDistribution,
    pace_distribution: paceDistribution,
    average_difficulty: Number(averageDifficulty.toFixed(2)),
  };
}

export { PREFERENCE_CONFIG };
