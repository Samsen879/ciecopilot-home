import http from 'node:http';
import request from 'supertest';
import { consumeRateLimit, _resetRateLimitStoreForTest } from '../lib/security/rate-limit.js';
import { redact } from '../lib/security/redaction.js';

describe('security baseline', () => {
  let server;

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
    if (!server || !server.listening) {
      done();
      return;
    }
    server.close(done);
  });

  beforeEach(async () => {
    await _resetRateLimitStoreForTest();
  });

  it('requires JWT on protected routes', async () => {
    const res = await request(server)
      .post('/api/rag/search')
      .set('Origin', 'http://localhost:3000')
      .send({ q: 'test', subject_code: '9709' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('auth_required');
  });

  it('enforces CORS allowlist and never returns wildcard origin', async () => {
    const denied = await request(server).get('/api/info').set('Origin', 'https://evil.example');
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('cors_origin_denied');

    const allowed = await request(server).get('/api/info').set('Origin', 'http://localhost:3000');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('applies sliding-window rate limit utility', async () => {
    const key = 'ip:127.0.0.1:rag';
    const profile = { limit: 5, windowMs: 60_000 };
    for (let i = 0; i < 5; i += 1) {
      const result = await consumeRateLimit(key, profile);
      expect(result.allowed).toBe(true);
    }
    const blocked = await consumeRateLimit(key, profile);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('redacts sensitive fields in logs', () => {
    const input = {
      access_token: 'abcdefghijklmnopqrstuvwxyz',
      nested: {
        password: 'my-password',
      },
      plain: 'safe',
    };
    const output = redact(input);
    expect(output.access_token).not.toBe(input.access_token);
    expect(output.nested.password).not.toBe(input.nested.password);
    expect(output.plain).toBe('safe');
  });
});
