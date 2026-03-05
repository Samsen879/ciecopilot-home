import { randomUUID } from 'crypto';

const DEFAULT_ORIGIN = 'http://localhost:3000';

function normalizeOrigin(origin) {
  return typeof origin === 'string' ? origin.trim() : '';
}

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || DEFAULT_ORIGIN;
  return raw
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);
}

function resolveCorsOrigin(requestOrigin) {
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

export function applyCors(req, res, allowedMethods = ['GET']) {
  const corsOrigin = resolveCorsOrigin(req?.headers?.origin);
  if (!corsOrigin) {
    sendApiError(res, {
      status: 403,
      error: 'cors_origin_denied',
      code: 'CORS_ORIGIN_DENIED',
      message: 'Origin is not allowed by CORS policy',
      requestId: getRequestId(req)
    });
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', [...new Set(allowedMethods)].join(', '));
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Request-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  return true;
}

export function getRequestId(req) {
  const headerValue = req?.headers?.['x-request-id'];
  if (typeof headerValue === 'string') {
    const trimmed = headerValue.trim();
    if (trimmed && trimmed.length <= 120) {
      return trimmed;
    }
  }
  try {
    return randomUUID();
  } catch (error) {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function sendApiError(
  res,
  {
    status = 500,
    error = 'internal_server_error',
    code = 'INTERNAL_SERVER_ERROR',
    message = 'Internal server error',
    userMessage,
    requestId,
    details
  } = {}
) {
  const payload = {
    error,
    code,
    message,
    request_id: requestId || null
  };
  if (typeof userMessage === 'string' && userMessage.trim()) {
    payload.userMessage = userMessage.trim();
  }
  if (typeof details !== 'undefined') {
    payload.details = details;
  }
  return res.status(status).json(payload);
}

export function sanitizePlainText(value, maxLength = 10000) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
}

export function sanitizeSearchTerm(value) {
  if (!value) {
    return '';
  }
  return sanitizePlainText(value, 120).replace(/[,%()]/g, '');
}

export function sanitizeTagList(values, maxItems = 10, maxLength = 40) {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized = values
    .map((item) => sanitizePlainText(item, maxLength).toLowerCase())
    .filter(Boolean)
    .slice(0, maxItems);
  return [...new Set(normalized)];
}

export function sanitizeSafeUrl(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

export function toPositiveInt(value, fallback, min = 1, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export async function getCommunityRole(supabase, userId) {
  if (!userId) {
    return 'student';
  }
  try {
    const { data, error } = await supabase
      .from('user_community_profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data?.role) {
      return 'student';
    }
    return String(data.role).toLowerCase();
  } catch (error) {
    return 'student';
  }
}

export async function isCommunityRoleAllowed(supabase, userId, allowedRoles) {
  const role = await getCommunityRole(supabase, userId);
  return allowedRoles.map((entry) => String(entry).toLowerCase()).includes(role);
}
