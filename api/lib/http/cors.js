import { ensureResponseHelpers } from './respond.js';

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

function resolveAllowedOrigin(requestOrigin) {
  const allowedOrigins = getAllowedOrigins();
  const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

  if (!normalizedRequestOrigin) {
    return allowedOrigins[0] || DEFAULT_ORIGIN;
  }

  if (allowedOrigins.includes(normalizedRequestOrigin)) {
    return normalizedRequestOrigin;
  }

  return null;
}

export function applyApiCors(req, res, allowedMethods = ['GET']) {
  ensureResponseHelpers(res);

  const requestOrigin = req?.headers?.origin;
  const corsOrigin = resolveAllowedOrigin(requestOrigin);

  if (requestOrigin && !corsOrigin) {
    res.status(403).json({
      code: 'cors_origin_denied',
      error: 'cors_origin_denied',
      message: 'Origin not allowed by CORS policy.',
    });
    return false;
  }

  if (corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', [...new Set([...allowedMethods, 'OPTIONS'])].join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Run-Id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  return true;
}
