import { askWithinLearningSession } from '../../../rag/lib/ask-service.js';
import { requireAuth } from '../../../lib/security/auth-guard.js';
import { getServiceClient } from '../../../lib/supabase/client.js';
import {
  LEARNING_ERROR_CODES,
} from '../../lib/contracts/error-contract.js';
import {
  sendLearningHttpError,
  sendLearningJson,
} from '../../lib/http/learning-http.js';
import {
  normalizeContinuationClientContext,
  validateSessionContinuationContext,
} from '../../lib/session-runtime/context-health.js';
import { readLearningSession } from '../../lib/session-runtime/session-service.js';

const KNOWN_LEARNING_ASK_ERROR_CODES = new Set([
  LEARNING_ERROR_CODES.AUTH_REQUIRED,
  LEARNING_ERROR_CODES.AUTH_FORBIDDEN,
  LEARNING_ERROR_CODES.INVALID_PAYLOAD,
  LEARNING_ERROR_CODES.SESSION_NOT_FOUND,
  LEARNING_ERROR_CODES.SESSION_STATE_CONFLICT,
]);

async function ensureLearningAuth(req) {
  if (req?.auth_user_id) {
    return {
      ok: true,
      userId: req.auth_user_id,
    };
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return auth;
  return {
    ok: true,
    userId: auth.user?.id || req?.auth_user_id || null,
  };
}

function sendInternalLearningError(res, requestId) {
  return res.status(500).json({
    request_id: requestId ?? null,
    error: {
      code: 'internal_error',
      message: 'Internal server error.',
      retryable: false,
      details: {},
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendLearningHttpError(
      res,
      req?.request_id || null,
      {
        code: LEARNING_ERROR_CODES.INVALID_PAYLOAD,
        status: 405,
        publicMessage: 'Method not allowed.',
      },
      {
        defaultCode: LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      },
    );
  }

  const auth = await ensureLearningAuth(req);
  if (!auth.ok || !auth.userId) {
    return sendLearningHttpError(
      res,
      req?.request_id || null,
      {
        code: auth.code || LEARNING_ERROR_CODES.AUTH_REQUIRED,
        status: auth.status || 401,
        publicMessage: auth.message || 'Authentication required.',
      },
      {
        defaultCode: LEARNING_ERROR_CODES.AUTH_REQUIRED,
      },
    );
  }

  try {
    const client = getServiceClient();
    const sessionPayload = await readLearningSession(client, {
      userId: auth.userId,
      sessionId: req?.query?.id || null,
    });
    const clientContext = normalizeContinuationClientContext(req?.body || {});

    validateSessionContinuationContext(sessionPayload.session, clientContext);

    const response = await askWithinLearningSession(
      {
        req,
        supabase: client,
      },
      {
        session: sessionPayload.session,
        message: req?.body?.message ?? null,
        clientTurnId: req?.body?.client_turn_id ?? null,
        clientContext,
      },
    );

    return sendLearningJson(res, req?.request_id || null, response);
  } catch (error) {
    const knownCode = KNOWN_LEARNING_ASK_ERROR_CODES.has(error?.code)
      ? error.code
      : null;
    if (!knownCode) {
      return sendInternalLearningError(res, req?.request_id || null);
    }
    return sendLearningHttpError(
      res,
      req?.request_id || null,
      error,
      {
        defaultCode: knownCode,
      },
    );
  }
}
