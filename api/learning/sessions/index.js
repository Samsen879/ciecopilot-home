import { requireAuth } from '../../lib/security/auth-guard.js';
import { getServiceClient } from '../../lib/supabase/client.js';
import { createLearningSession, sendLearningError } from '../lib/session-runtime/session-service.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendLearningError(req, res, 'invalid_payload', {
      status: 405,
      message: 'Method not allowed.',
    });
  }

  const auth = await ensureLearningAuth(req);
  if (!auth.ok || !auth.userId) {
    return sendLearningError(req, res, auth.code || 'auth_required', {
      status: auth.status || 401,
      message: auth.message || 'Authentication required.',
    });
  }

  try {
    const payload = await createLearningSession(getServiceClient(), {
      userId: auth.userId,
      requestPath: req.path || '/api/learning/sessions',
      body: req.body || {},
      idempotencyKey:
        req?.headers?.['idempotency-key'] || req?.headers?.['Idempotency-Key'] || null,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return sendLearningError(req, res, error.code || 'internal_error', {
      status: error.status,
      message: error.message,
      details: error.details,
    });
  }
}
