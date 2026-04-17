import { requireAuth } from '../../lib/security/auth-guard.js';
import { getServiceClient } from '../../lib/supabase/client.js';
import { LEARNING_ERROR_CODES } from '../lib/contracts/error-contract.js';
import {
  LearningHttpError,
  sendLearningError,
  sendLearningHttpError,
  sendLearningJson,
} from '../lib/http/learning-http.js';
import {
  getQuestionSearchProductFlagStatus,
  searchQuestions,
} from '../lib/questions/question-search-service.js';

async function ensureLearningAuth(req) {
  if (req?.auth_user_id) {
    return {
      ok: true,
      userId: req.auth_user_id,
    };
  }

  const auth = await requireAuth(req);
  if (!auth.ok) {
    return auth;
  }

  return {
    ok: true,
    userId: auth.user?.id || req?.auth_user_id || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendLearningError(
      res,
      req?.request_id || null,
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      {
        status: 405,
        message: 'Method not allowed.',
      },
    );
  }

  const auth = await ensureLearningAuth(req);
  if (!auth.ok || !auth.userId) {
    return sendLearningError(
      res,
      req?.request_id || null,
      auth.code || LEARNING_ERROR_CODES.AUTH_REQUIRED,
      {
        status: auth.status || 401,
        message: auth.message || 'Authentication required.',
      },
    );
  }

  try {
    const payload = await searchQuestions(getServiceClient(), req.query || {}, {
      productMode: getQuestionSearchProductFlagStatus().enabled,
    });
    return sendLearningJson(res, req?.request_id || null, payload);
  } catch (error) {
    if (error instanceof LearningHttpError) {
      return sendLearningHttpError(res, req?.request_id || null, error);
    }

    return sendLearningError(res, req?.request_id || null, 'internal_error', {
      status: 500,
      message: 'Internal server error.',
    });
  }
}
