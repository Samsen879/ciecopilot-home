import { requireAuth } from '../lib/security/auth-guard.js';
import { getServiceClient } from '../lib/supabase/client.js';
import { applyErrorBookCors, sendError } from './lib/error-book-http.js';
import { createErrorBookService } from './lib/error-book-service.js';

const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

function buildService() {
  return createErrorBookService({
    supabase: getServiceClient(),
    logger: console,
  });
}

async function ensureTrustedAuth(req) {
  if (req?.auth_user_id) {
    return {
      ok: true,
      user: req.auth_user || { id: req.auth_user_id },
    };
  }
  return requireAuth(req);
}

function handleRouteError(req, res, error) {
  return sendError(req, res, {
    status: error?.status || 500,
    code: error?.code || 'internal_error',
    message: error?.message || 'Internal server error.',
    details: error?.details,
  });
}

export default async function handler(req, res) {
  if (!applyErrorBookCors(req, res, ALLOWED_METHODS)) {
    return;
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return sendError(req, res, {
      status: 405,
      code: 'method_not_allowed',
      message: 'Only GET and POST are supported on this endpoint.',
    });
  }

  const auth = await ensureTrustedAuth(req);
  if (!auth.ok) {
    return sendError(req, res, {
      status: auth.status,
      code: auth.code,
      message: auth.message,
    });
  }

  try {
    const service = buildService();

    if (req.method === 'GET') {
      const payload = await service.listEntries({
        userId: req.auth_user_id,
        query: req.query || {},
      });
      return res.status(200).json(payload);
    }

    const payload = await service.createEntry({
      userId: req.auth_user_id,
      body: req.body || {},
    });
    return res.status(201).json(payload);
  } catch (error) {
    return handleRouteError(req, res, error);
  }
}
