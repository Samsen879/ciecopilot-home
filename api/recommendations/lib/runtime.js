import crypto from 'node:crypto';
import { ensureResponseHelpers } from '../../lib/http/respond.js';
import { requireAuth } from '../../lib/security/auth-guard.js';

export const RECOMMENDATIONS_ORCHESTRATOR = 'recommendations-production';
export const RECOMMENDATIONS_BACKEND_VERSION = 'post-rag-s1-recommendations-v1';

const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:3000';
const bootState = {
  boot_id: crypto.randomUUID(),
  booted_at: new Date().toISOString(),
  request_count: 0,
};

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGIN;
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function nextColdStartState() {
  bootState.request_count += 1;
  const isColdStart = bootState.request_count === 1;
  return {
    is_cold_start: isColdStart,
    cold_start_reason: isColdStart ? 'process_boot' : 'warm_runtime',
    boot_id: bootState.boot_id,
    booted_at: bootState.booted_at,
    request_count: bootState.request_count,
  };
}

function setCommonHeaders(req, res, meta) {
  if (meta.request_id) {
    res.setHeader('X-Request-Id', meta.request_id);
  }
  res.setHeader('X-Recommendations-Orchestrator', meta.orchestrator);
  res.setHeader('X-Recommendations-Version', meta.version);
  res.setHeader('X-Cold-Start', meta.cold_start.is_cold_start ? '1' : '0');
  if (req?.headers?.origin) {
    res.setHeader('Vary', 'Origin');
  }
}

function buildMeta(baseMeta, extraMeta = {}) {
  return {
    ...baseMeta,
    ...extraMeta,
    responded_at: new Date().toISOString(),
  };
}

export function createRequestContext(req, res, moduleName) {
  ensureResponseHelpers(res);

  const allowedOrigins = parseAllowedOrigins();
  const requestOrigin = req?.headers?.origin;

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    const meta = buildMeta({
      request_id: req?.request_id || null,
      module: moduleName,
      orchestrator: RECOMMENDATIONS_ORCHESTRATOR,
      version: RECOMMENDATIONS_BACKEND_VERSION,
      cold_start: nextColdStartState(),
    });

    setCommonHeaders(req, res, meta);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Run-Id');

    res.status(403).json({
      ok: false,
      success: false,
      error: {
        code: 'cors_origin_denied',
        message: 'Origin not allowed by CORS policy.',
      },
      meta,
    });

    return { handled: true, meta };
  }

  const resolvedOrigin = requestOrigin || allowedOrigins[0] || DEFAULT_ALLOWED_ORIGIN;
  if (resolvedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', resolvedOrigin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Run-Id');

  const meta = {
    request_id: req?.request_id || null,
    module: moduleName,
    orchestrator: RECOMMENDATIONS_ORCHESTRATOR,
    version: RECOMMENDATIONS_BACKEND_VERSION,
    cold_start: nextColdStartState(),
  };

  setCommonHeaders(req, res, meta);

  if (req?.method === 'OPTIONS') {
    res.status(204).end();
    return { handled: true, meta };
  }

  return { handled: false, meta };
}

export async function authenticateRecommendationsRequest(req, res, context) {
  const trustedUser = req?.auth_user || req?.user || null;
  const trustedUserId = req?.auth_user_id || trustedUser?.id || null;

  if (trustedUser && trustedUserId) {
    return {
      handled: false,
      user: {
        ...trustedUser,
        id: trustedUserId,
      },
    };
  }

  const auth = await requireAuth(req);
  if (!auth.ok) {
    sendError(res, context, {
      status: auth.status,
      code: auth.code,
      message: auth.message,
    });
    return { handled: true, user: null };
  }

  return { handled: false, user: auth.user };
}

export function sendSuccess(res, context, { status = 200, data = {}, meta = {}, message } = {}) {
  return res.status(status).json({
    ok: true,
    success: true,
    ...(typeof message === 'string' ? { message } : {}),
    data,
    meta: buildMeta(context.meta, meta),
  });
}

export function sendError(
  res,
  context,
  { status = 500, code = 'internal_error', message = 'Internal server error.', details } = {},
) {
  return res.status(status).json({
    ok: false,
    success: false,
    error: {
      code,
      message,
      ...(typeof details === 'undefined' ? {} : { details }),
    },
    meta: buildMeta(context.meta),
  });
}

export function handleUnexpectedError(res, context, error, code, message) {
  console.error(`[${context.meta.module}] ${code}:`, error);
  return sendError(res, context, {
    status: 500,
    code,
    message,
  });
}

export function parseBooleanFlag(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return defaultValue;
}

export function parseInteger(value, defaultValue, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.min(Math.max(parsed, min), max);
}

export function parseFloatInRange(value, defaultValue, { min = 0, max = 1 } = {}) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.min(Math.max(parsed, min), max);
}

export function truncateText(value, limit = 240) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(limit - 3, 1)).trimEnd()}...`;
}

export function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

export function normalizeStringArray(value, maxItems = Infinity) {
  return toArray(value)
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
    .slice(0, maxItems);
}
