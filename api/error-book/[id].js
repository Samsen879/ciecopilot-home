import { requireAuth } from '../lib/security/auth-guard.js';
import { getServiceClient } from '../lib/supabase/client.js';
import { applyErrorBookCors, sendError } from './lib/error-book-http.js';
import { createErrorBookService } from './lib/error-book-service.js';
import { ValidationError } from './lib/error-book-validator.js';

const ALLOWED_METHODS = ['GET', 'PATCH', 'DELETE', 'OPTIONS'];

function buildService() {
  return createErrorBookService({
    supabase: getServiceClient(),
    logger: console,
  });
}

function resolveRecordId(req) {
  const value = req?.query?.id || req?.query?.error_id;
  const id = typeof value === 'string' ? value.trim() : String(value || '').trim();
  if (!id) {
    throw new ValidationError('id is required.', {
      code: 'bad_request',
    });
  }
  return id;
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

  if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) {
    return sendError(req, res, {
      status: 405,
      code: 'method_not_allowed',
      message: 'Only GET, PATCH, and DELETE are supported on this endpoint.',
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
    const id = resolveRecordId(req);
    const service = buildService();

    if (req.method === 'GET') {
      const payload = await service.getEntry({
        userId: req.auth_user_id,
        id,
      });
      return res.status(200).json(payload);
    }

    if (req.method === 'PATCH') {
      const payload = await service.updateEntry({
        userId: req.auth_user_id,
        id,
        body: req.body || {},
      });
      return res.status(200).json(payload);
    }

    const payload = await service.deleteEntry({
      userId: req.auth_user_id,
      id,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return handleRouteError(req, res, error);
  }
}
