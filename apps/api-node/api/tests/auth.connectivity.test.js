import { describe, it, expect } from '@jest/globals';
import { handler as authHandler } from '../auth/index.js';
import { authenticateToken } from '../middleware/auth.js';

// Mock Supabase 客户端用于 auth 单元联通测试
jest.mock('../config/supabase.js', () => {
  const profiles = new Map();
  const now = () => Math.floor(Date.now() / 1000) + 3600;

  return {
    __esModule: true,
    default: {
      auth: {
        signUp: async ({ email }) => {
          const id = `test-user-${Math.random().toString(36).slice(2, 10)}`;
          profiles.set(id, { id, email, name: 'Tester', role: 'student', status: 'active' });
          return { data: { user: { id, email } }, error: null };
        },
        signInWithPassword: async ({ email }) => {
          const entry = [...profiles.values()].find(p => p.email === email) || { id: 'mock-id', email };
          return {
            data: {
              user: { id: entry.id, email: entry.email },
              session: { access_token: 'mock-access', refresh_token: 'mock-refresh', expires_at: now() }
            },
            error: null
          };
        },
        refreshSession: async ({ refresh_token }) => {
          if (!refresh_token) return { data: null, error: { message: 'missing refresh token' } };
          return { data: { session: { access_token: 'mock-access-2', refresh_token, expires_at: now() } }, error: null };
        },
        getUser: async (token) => {
          if (!token) return { data: { user: null }, error: { message: 'no token' } };
          return { data: { user: { id: 'test-user-ctx', email: 'ctx@example.com' } }, error: null };
        }
      },
      from: (table) => ({
        upsert: async (row) => {
          if (table === 'user_profiles') {
            profiles.set(row.id, row);
            return { data: [row], error: null };
          }
          return { data: [], error: null };
        },
        update: async () => ({ data: [], error: null }),
        select: async () => ({ data: [], error: null })
      })
    }
  };
});

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    locals: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader() {}
  };
  return res;
}

describe('认证联通轻量测试', () => {
  it('注册成功并同步 user_profiles', async () => {
    const req = { method: 'POST', query: { action: 'register' }, body: { email: 't1@example.com', password: 'passw0rd123', name: 'T1' }, headers: {} };
    const res = createMockRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('user.id');
    expect(res.body).toHaveProperty('user.email', 't1@example.com');
  });

  it('登录成功返回令牌', async () => {
    const req = { method: 'POST', query: { action: 'login' }, body: { email: 't1@example.com', password: 'passw0rd123' }, headers: {} };
    const res = createMockRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tokens.accessToken');
    expect(res.body).toHaveProperty('tokens.refreshToken');
  });

  it('verify-email 以POST方法应返回405', async () => {
    const req = { method: 'POST', query: { action: 'verify-email' }, headers: {} };
    const res = createMockRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(405);
    // 兼容旧实现返回简单消息
    expect(res.body).toHaveProperty('error');
  });

  it('认证缺失应返回401', async () => {
    const req = { headers: {}, method: 'GET' };
    const res = createMockRes();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});