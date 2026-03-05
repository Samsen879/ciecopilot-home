import { ensureResponseHelpers } from '../../lib/http/respond.js';

const DEFAULT_ORIGIN = 'http://localhost:3000';

function normalizeOrigin(origin) {
  return typeof origin === 'string' ? origin.trim() : '';
}

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || DEFAULT_ORIGIN;
  return raw
    .split(',')
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);
}

function resolveCorsOrigin(requestOrigin) {
  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = normalizeOrigin(requestOrigin);

  if (!normalizedOrigin) {
    return allowedOrigins[0] || DEFAULT_ORIGIN;
  }

  if (allowedOrigins.includes(normalizedOrigin)) {
    return normalizedOrigin;
  }

  return null;
}

export function sendError(req, res, { status = 500, code = 'internal_error', message = 'Internal server error.', details } = {}) {
  ensureResponseHelpers(res);
  return res.status(status).json({
    error: code,
    code,
    message,
    request_id: req?.request_id || null,
    ...(typeof details === 'undefined' ? {} : { details }),
  });
}

export function applyErrorBookCors(req, res, allowedMethods = ['GET']) {
  ensureResponseHelpers(res);
  const requestOrigin = req?.headers?.origin;
  const corsOrigin = resolveCorsOrigin(requestOrigin);

  if (requestOrigin && !corsOrigin) {
    sendError(req, res, {
      status: 403,
      code: 'cors_origin_denied',
      message: 'Origin not allowed by CORS policy.',
    });
    return false;
  }

  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', [...new Set(allowedMethods)].join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  return true;
}
