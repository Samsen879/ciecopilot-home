import http from 'node:http';
import request from 'supertest';
import { listRoutes } from '../_runtime/route-registry.js';
import {
  _clearRateLimitBackendOverrideForTest,
  _resetRateLimitStoreForTest,
} from '../lib/security/rate-limit.js';
import { requireRole } from '../middleware/auth.js';
import { createErrorBookService } from '../error-book/lib/error-book-service.js';

function buildRequest(agent, route, method, origin = 'http://localhost:3000') {
  let req = agent[method.toLowerCase()](route.pathPrefix).set('Origin', origin);
  if (method !== 'GET' && method !== 'DELETE') {
    req = req.send({});
  }
  return req;
}

function pickDisallowedMethod(route) {
  const allowed = new Set((route.methods || []).filter((method) => method !== 'OPTIONS'));
  const candidates = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  return candidates.find((method) => !allowed.has(method)) || null;
}

describe('security depth gateway coverage', () => {
  let server;
  const protectedRoutes = listRoutes().filter((route) => route.auth === 'jwt_required');

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_LOCAL_TEST_MODE = 'true';
    process.env.RATE_LIMIT_BACKEND = 'memory';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';

    const mod = await import('../index.js');
    server = http.createServer(mod.default);
  });

  afterAll((done) => {
    _clearRateLimitBackendOverrideForTest();
    if (!server || !server.listening) {
      done();
      return;
    }
    server.close(done);
  });

  beforeEach(async () => {
    await _resetRateLimitStoreForTest();
  });

  it('rejects missing bearer tokens on all protected routes', async () => {
    for (const route of protectedRoutes) {
      const method = (route.methods || ['GET']).find((item) => item !== 'OPTIONS' && item !== '*') || 'GET';
      const res = await buildRequest(request(server), route, method);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth_required');
    }
  });

  it('rejects invalid bearer tokens on all protected routes', async () => {
    for (const route of protectedRoutes) {
      const method = (route.methods || ['GET']).find((item) => item !== 'OPTIONS' && item !== '*') || 'GET';
      const res = await buildRequest(request(server), route, method).set(
        'Authorization',
        'Bearer test-invalid-token',
      );
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('auth_invalid');
    }
  });

  it('rejects disallowed origins before auth on all protected routes', async () => {
    for (const route of protectedRoutes) {
      const method = (route.methods || ['GET']).find((item) => item !== 'OPTIONS' && item !== '*') || 'GET';
      const res = await buildRequest(request(server), route, method, 'https://evil.example');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('cors_origin_denied');
    }
  });

  it('returns method_not_allowed for fixed-method routes', async () => {
    const fixedRoutes = protectedRoutes.filter(
      (route) =>
        !route.moduleOwnsMethodRouting &&
        Array.isArray(route.methods) &&
        !route.methods.includes('*') &&
        route.methods.some((method) => method !== 'OPTIONS'),
    );
    for (const route of fixedRoutes) {
      const badMethod = pickDisallowedMethod(route);
      if (!badMethod) continue;
      const res = await buildRequest(request(server), route, badMethod).set(
        'Authorization',
        'Bearer test-user:student-1:student',
      );
      expect(res.status).toBe(405);
      expect(res.body.code).toBe('method_not_allowed');
    }
  });

  it('rejects insufficient roles for admin-only direct contracts', async () => {
    const result = await requireRole(
      {
        id: 'student-1',
        role: 'student',
      },
      'admin',
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toBe('insufficient_role');
  });

  it('rejects cross-user ownership access in error-book service contracts', async () => {
    const supabase = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async single() {
            return {
              data: {
                id: 'err-1',
                user_id: 'owner-user',
                source: 'manual',
                question: 'Owned by someone else',
                metadata: {},
              },
              error: null,
            };
          },
        };
      },
    };
    const service = createErrorBookService({ supabase });

    await expect(
      service.getEntry({
        userId: 'other-user',
        id: 'err-1',
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: 'ownership_forbidden',
    });
  });
});
