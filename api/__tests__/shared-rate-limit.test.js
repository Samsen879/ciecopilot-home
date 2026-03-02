import { jest } from '@jest/globals';
import http from 'node:http';
import request from 'supertest';
import { findRoute } from '../_runtime/route-registry.js';
import {
  _clearRateLimitBackendOverrideForTest,
  _resetRateLimitStoreForTest,
  _setRateLimitBackendForTest,
  consumeRateLimit,
} from '../lib/security/rate-limit.js';
import { resolveRateLimitDescriptor } from '../lib/security/rate-limit-middleware.js';
import { SharedRateLimitStore } from '../lib/security/rate-limit-shared-store.js';

describe('shared rate limit gate coverage', () => {
  let server;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_LOCAL_TEST_MODE = 'true';
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
    process.env.RATE_LIMIT_ALLOW_DEGRADE = 'true';
    await _resetRateLimitStoreForTest();
  });

  it('enforces per-user limits on RAG endpoints', async () => {
    const headers = {
      Origin: 'http://localhost:3000',
      Authorization: 'Bearer test-user:student-1:student',
    };

    for (let i = 0; i < 10; i += 1) {
      const res = await request(server)
        .post('/api/rag/search')
        .set(headers)
        .send({ q: 'test', subject_code: '9709' });
      expect(res.status).not.toBe(429);
    }

    const blocked = await request(server)
      .post('/api/rag/search')
      .set(headers)
      .send({ q: 'test', subject_code: '9709' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('rate_limited');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('can enforce per-ip limits when unauthenticated traffic is allowed by policy', async () => {
    const profile = { limit: 2, windowMs: 60_000 };
    const key = 'ip:127.0.0.1:shared';

    const first = await consumeRateLimit(key, profile);
    const second = await consumeRateLimit(key, profile);
    const blocked = await consumeRateLimit(key, profile);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('falls back to memory store in controlled degrade mode', async () => {
    const original = SharedRateLimitStore.prototype.consume;
    SharedRateLimitStore.prototype.consume = jest.fn(async () => {
      throw new Error('rpc unavailable');
    });
    _setRateLimitBackendForTest('shared');

    try {
      const result = await consumeRateLimit('u:student-1:rag-search', {
        limit: 3,
        windowMs: 60_000,
      });

      expect(result.allowed).toBe(true);
      expect(result.degraded).toBe(true);
      expect(result.store).toBe('memory');
      expect(result.degrade_reason).toContain('rpc unavailable');
    } finally {
      SharedRateLimitStore.prototype.consume = original;
      _clearRateLimitBackendOverrideForTest();
    }
  });

  it('does not rate limit safe reads for write-only policies', () => {
    const errorBookRoute = findRoute('/api/error-book', 'POST').route;
    const errorBookWrite = resolveRateLimitDescriptor(
      {
        method: 'POST',
        auth_user_id: 'student-1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      errorBookRoute,
    );
    const errorBookRead = resolveRateLimitDescriptor(
      {
        method: 'GET',
        auth_user_id: 'student-1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      errorBookRoute,
    );
    const communityRoute = findRoute('/api/community', 'POST').route;
    const communityRead = resolveRateLimitDescriptor(
      {
        method: 'GET',
        auth_user_id: 'student-1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      communityRoute,
    );
    const communityWrite = resolveRateLimitDescriptor(
      {
        method: 'POST',
        auth_user_id: 'student-1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      },
      communityRoute,
    );

    expect(errorBookWrite?.profile?.limit).toBe(12);
    expect(errorBookRead).toBeNull();
    expect(communityRead).toBeNull();
    expect(communityWrite?.profile?.limit).toBe(20);
  });
});
