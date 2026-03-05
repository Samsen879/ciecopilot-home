import http from 'node:http';
import { adaptRequestBasics, ensureParsedJsonBody } from './_runtime/request-adapter.js';
import { adaptResponse } from './_runtime/response-adapter.js';
import { loadHandler } from './_runtime/handler-loader.js';
import { findRoute, listRoutes, LEGACY_EXCLUDED_ENDPOINTS } from './_runtime/route-registry.js';
import { errorResponse } from './lib/http/respond.js';
import { requireAuth } from './lib/security/auth-guard.js';
import { buildSecurityFailure, sendSecurityFailure } from './lib/security/error-envelope.js';
import { applyRateLimitGuard } from './lib/security/rate-limit-middleware.js';
import { safeLog } from './lib/security/redaction.js';

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function applyCors(req, res) {
  const allowedOrigins = parseAllowedOrigins();
  const requestOrigin = req.headers.origin;

  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    errorResponse(res, {
      status: 403,
      code: 'cors_origin_denied',
      message: 'Origin not allowed by CORS policy.',
      request_id: req.request_id,
    });
    return false;
  }

  const resolvedOrigin = requestOrigin || allowedOrigins[0];
  if (resolvedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', resolvedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Run-Id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  return true;
}

function apiInfo() {
  return {
    name: 'CIE Copilot API',
    version: '2.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    routes: listRoutes(),
  };
}

function healthInfo() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
}

function handleInternalRoutes(req, res) {
  if (req.path === '/' || req.path === '/api' || req.path === '/api/info') {
    res.status(200).json(apiInfo());
    return true;
  }
  if (req.path === '/api/health') {
    res.status(200).json(healthInfo());
    return true;
  }
  if (req.path === '/api/routes') {
    res.status(200).json({
      routes: listRoutes(),
      legacy_excluded: LEGACY_EXCLUDED_ENDPOINTS,
    });
    return true;
  }
  return false;
}

function handleLegacyExcluded(req, res) {
  if (!LEGACY_EXCLUDED_ENDPOINTS.includes(req.path)) {
    return false;
  }
  errorResponse(res, {
    status: 404,
    code: 'endpoint_not_found',
    message: 'Endpoint not found.',
    request_id: req.request_id,
    hint: 'Use /api/rag/chat or /api/marking/evaluate-v1.',
  });
  return true;
}

async function applyAuthIfNeeded(req, res, route) {
  if (route.auth !== 'jwt_required') return true;
  const auth = await requireAuth(req);
  if (auth.ok) return true;
  sendSecurityFailure(
    res,
    req.request_id,
    buildSecurityFailure({
      status: auth.status,
      code: auth.code,
      message: auth.message,
    }),
  );
  return false;
}

async function applyRateLimitIfNeeded(req, res, route) {
  const evaluation = await applyRateLimitGuard(req, route);
  if (!evaluation) return true;
  const { result } = evaluation;
  if (result.degraded) {
    safeLog('warn', 'rate_limit_degraded', {
      request_id: req.request_id,
      route_module: route.module,
      store: result.store,
      degrade_reason: result.degrade_reason || null,
    });
  }
  if (result.allowed) return true;
  const retryAfterSec = Math.max(Math.ceil((result.retryAfterMs || 0) / 1000), 1);
  res.setHeader('Retry-After', String(retryAfterSec));
  errorResponse(res, {
    status: 429,
    code: 'rate_limited',
    message: 'Too many requests.',
    request_id: req.request_id,
    details: {
      retry_after_sec: retryAfterSec,
    },
  });
  return false;
}

async function invokeExpressRouter(req, res, route, handler) {
  const originalUrl = req.url;
  const parsed = new URL(req.url || '/', 'http://localhost');
  const subPath = req.path.slice(route.pathPrefix.length) || '/';
  req.originalUrl = originalUrl;
  req.url = `${subPath}${parsed.search}`;

  await new Promise((resolve) => {
    const done = () => resolve();
    const maybe = handler(req, res, done);
    if (maybe && typeof maybe.then === 'function') {
      maybe.finally(resolve);
    }
  });
}

async function invokeRouteHandler(req, res, route, params = {}) {
  if (params && typeof params === 'object') {
    req.query = { ...(req.query || {}), ...params };
  }

  const loaded = await loadHandler(route.importPath);
  if (loaded.kind === 'express_router' || route.runtime === 'express_router') {
    await invokeExpressRouter(req, res, route, loaded.handler);
    return;
  }

  await ensureParsedJsonBody(req, { limitBytes: 1 * 1024 * 1024 });
  await loaded.handler(req, res);
}

export default async function handler(req, res) {
  try {
    adaptRequestBasics(req);
    adaptResponse(res, req.request_id);

    if (!applyCors(req, res)) return;

    if (handleInternalRoutes(req, res)) return;
    if (handleLegacyExcluded(req, res)) return;

    const { route, allowed, params } = findRoute(req.path, req.method);
    if (!route) {
      errorResponse(res, {
        status: 404,
        code: 'endpoint_not_found',
        message: 'Endpoint not found.',
        request_id: req.request_id,
      });
      return;
    }

    if (!allowed) {
      errorResponse(res, {
        status: 405,
        code: 'method_not_allowed',
        message: 'Method not allowed.',
        request_id: req.request_id,
      });
      return;
    }

    if (!(await applyAuthIfNeeded(req, res, route))) return;
    if (!(await applyRateLimitIfNeeded(req, res, route))) return;

    await invokeRouteHandler(req, res, route, params);
  } catch (error) {
    safeLog('error', 'api_gateway_unhandled_error', {
      request_id: req?.request_id,
      method: req?.method,
      path: req?.path,
      message: error?.message || String(error),
      stack: error?.stack,
    });
    if (!res.writableEnded) {
      errorResponse(res, {
        status: error?.status || 500,
        code: error?.code || 'internal_error',
        message: error?.message || 'Internal server error.',
        request_id: req?.request_id || null,
      });
    }
  }
}

if (process.env.NODE_ENV !== 'test') {
  const server = http.createServer(handler);
  const port = Number(process.env.PORT || 3001);
  server.listen(port, () => {
    safeLog('info', 'api_server_started', {
      port,
      base_url: `http://localhost:${port}`,
      health_url: `http://localhost:${port}/api/health`,
    });
  });

  process.on('SIGTERM', () => {
    safeLog('warn', 'api_server_sigterm', {});
    server.close(() => process.exit(0));
  });
}
