import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const clientState = {
  authGetUser: async () => ({ data: { user: null }, error: null }),
  resolveQuery: () => ({ data: null, error: null }),
  calls: [],
};

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.operation = 'select';
    this.payload = null;
    this.filters = [];
    this.options = {};
  }

  select(columns, options = {}) {
    if (this.operation === 'select') {
      this.operation = 'select';
    }
    this.options.columns = columns;
    this.options.select = options;
    return this;
  }

  insert(payload) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(field, value) {
    this.filters.push({ operator: 'eq', field, value });
    return this;
  }

  gte(field, value) {
    this.filters.push({ operator: 'gte', field, value });
    return this;
  }

  order(field, options = {}) {
    this.options.order = { field, options };
    return this;
  }

  maybeSingle() {
    return this.#resolve({ maybeSingle: true });
  }

  single() {
    return this.#resolve({ single: true });
  }

  then(resolve, reject) {
    return this.#resolve({}).then(resolve, reject);
  }

  #resolve(extra = {}) {
    const query = {
      table: this.table,
      operation: this.operation,
      payload: this.payload,
      filters: [...this.filters],
      options: {
        ...this.options,
        ...extra,
      },
    };
    clientState.calls.push(query);
    return Promise.resolve(clientState.resolveQuery(query));
  }
}

const mockGetServiceClient = jest.fn(() => ({
  auth: {
    getUser: (...args) => clientState.authGetUser(...args),
  },
  from(table) {
    return new QueryBuilder(table);
  },
}));

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { default: authHandler } = await import('../index.js');
const { resolveTrustedAuthContext } = await import('../../lib/security/auth-context.js');
const { generateToken, hashToken } = await import('../../middleware/auth.js');
const { listRoutes } = await import('../../_runtime/route-registry.js');

function createReq({
  method = 'GET',
  headers = {},
  query = {},
  body = {},
  url,
} = {}) {
  return {
    method,
    headers,
    query,
    body,
    url: url || `/api/auth?action=${query.action || ''}`,
    request_id: 'req-auth-prod-1',
    connection: {
      remoteAddress: '127.0.0.1',
    },
  };
}

function createRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: null,
    writableEnded: false,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
    end(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
  };
}

function matchFilter(query, field, value) {
  return query.filters.some((filter) => filter.field === field && filter.value === value);
}

function buildActiveUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    username: 'auth-user',
    name: 'Auth User',
    role: 'student',
    status: 'active',
    reputation: 8,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  process.env.JWT_SECRET = 'test-secret';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.AUTH_LOCAL_TEST_MODE = 'false';
  process.env.AUTH_EMAIL_MODE = 'log';
  process.env.AUTH_PUBLIC_BASE_URL = 'https://app.example.com';
  delete process.env.AUTH_ENFORCE_SESSIONS;
  delete process.env.RESEND_API_KEY;
  delete process.env.AUTH_EMAIL_FROM;
  clientState.calls = [];
  clientState.authGetUser = async () => ({
    data: { user: null },
    error: { message: 'Invalid token' },
  });
  clientState.resolveQuery = () => ({ data: null, error: null });
  jest.clearAllMocks();
});

describe('auth backend productionization', () => {
  it('adds a verify action for login-issued access tokens', async () => {
    const user = buildActiveUser();
    clientState.resolveQuery = (query) => {
      if (query.table === 'user_profiles' && query.operation === 'select' && matchFilter(query, 'id', user.id)) {
        return { data: user, error: null };
      }
      if (query.table === 'user_permissions') {
        return { data: [], error: null };
      }
      throw new Error(`Unhandled query ${query.table}:${query.operation}`);
    };

    const token = generateToken({ userId: user.id, email: user.email, role: user.role }, '24h');
    const req = createReq({
      method: 'GET',
      headers: {
        origin: 'http://localhost:3000',
        authorization: `Bearer ${token}`,
      },
      query: { action: 'verify' },
      url: '/api/auth?action=verify',
    });
    const res = createRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.code).toBe('AUTH_TOKEN_VALID');
    expect(res.body.user).toMatchObject({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  });

  it('lets gateway auth-context accept custom JWTs even when Supabase auth.getUser rejects them', async () => {
    const user = buildActiveUser();
    clientState.resolveQuery = (query) => {
      if (query.table === 'user_profiles' && query.operation === 'select' && matchFilter(query, 'id', user.id)) {
        return { data: user, error: null };
      }
      if (query.table === 'user_permissions') {
        return { data: [], error: null };
      }
      throw new Error(`Unhandled query ${query.table}:${query.operation}`);
    };

    const token = generateToken({ userId: user.id, email: user.email, role: user.role }, '24h');
    const req = createReq({
      headers: {
        authorization: `Bearer ${token}`,
      },
      url: '/api/community/questions',
    });

    const result = await resolveTrustedAuthContext(req);

    expect(result.ok).toBe(true);
    expect(result.context.userId).toBe(user.id);
    expect(result.context.role).toBe(user.role);
    expect(result.context.source).toBe('custom_jwt');
  });

  it('logs a verification delivery artifact with a real verify-email link in local mail mode', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    clientState.resolveQuery = (query) => {
      if (query.table === 'user_profiles' && query.operation === 'select' && matchFilter(query, 'email', 'user@example.com')) {
        return { data: null, error: null };
      }
      if (query.table === 'user_profiles' && query.operation === 'insert') {
        return {
          data: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'Auth User',
            role: 'student',
            status: 'pending_verification',
          },
          error: null,
        };
      }
      if (query.table === 'user_community_profiles' || query.table === 'user_learning_profiles') {
        return { data: null, error: null };
      }
      if (query.table === 'security_events') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query ${query.table}:${query.operation}`);
    };

    const req = createReq({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
      query: { action: 'register' },
      body: {
        email: 'user@example.com',
        password: 'abc12345',
        name: 'Auth User',
      },
      url: '/api/auth?action=register',
    });
    const res = createRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('action=verify-email&code='),
      expect.any(Object),
    );
  });

  it('logs a password-reset delivery artifact with a real reset-password link in local mail mode', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    clientState.resolveQuery = (query) => {
      if (query.table === 'user_profiles' && query.operation === 'select' && matchFilter(query, 'email', 'user@example.com')) {
        return {
          data: {
            id: 'user-1',
            email: 'user@example.com',
            status: 'active',
          },
          error: null,
        };
      }
      if (query.table === 'user_profiles' && query.operation === 'update') {
        return { data: null, error: null };
      }
      if (query.table === 'security_events') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query ${query.table}:${query.operation}`);
    };

    const req = createReq({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
      query: { action: 'request-reset' },
      body: {
        email: 'user@example.com',
      },
      url: '/api/auth?action=request-reset',
    });
    const res = createRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('action=reset-password&token='),
      expect.any(Object),
    );
  });

  it('rotates tracked refresh sessions using user_sessions.refresh_token_hash', async () => {
    const user = buildActiveUser();
    const refreshToken = generateToken(
      { userId: user.id, email: user.email, role: user.role, type: 'refresh' },
      '7d',
    );

    clientState.resolveQuery = (query) => {
      if (query.table === 'user_sessions' && query.operation === 'select') {
        return {
          data: {
            id: 'session-1',
            user_id: user.id,
            refresh_token_hash: hashToken(refreshToken),
            expires_at: '2099-01-01T00:00:00.000Z',
          },
          error: null,
        };
      }
      if (query.table === 'user_profiles' && query.operation === 'select' && matchFilter(query, 'id', user.id)) {
        return { data: user, error: null };
      }
      if (query.table === 'user_sessions' && query.operation === 'update') {
        return { data: null, error: null };
      }
      if (query.table === 'security_events') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query ${query.table}:${query.operation}`);
    };

    const req = createReq({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
      query: { action: 'refresh' },
      body: {
        refreshToken,
      },
      url: '/api/auth?action=refresh',
    });
    const res = createRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).not.toBe(refreshToken);

    const sessionLookup = clientState.calls.find(
      (query) => query.table === 'user_sessions' && query.operation === 'select',
    );
    expect(sessionLookup).toBeTruthy();
    expect(matchFilter(sessionLookup, 'refresh_token_hash', hashToken(refreshToken))).toBe(true);

    const sessionUpdate = clientState.calls.find(
      (query) => query.table === 'user_sessions' && query.operation === 'update',
    );
    expect(sessionUpdate).toBeTruthy();
    expect(sessionUpdate.payload.refresh_token_hash).toBe(hashToken(res.body.refreshToken));
  });

  it('keeps login working when user_sessions is unavailable and session persistence degrades', async () => {
    const user = buildActiveUser({
      password_hash: await bcrypt.hash('abc12345', 4),
    });

    clientState.resolveQuery = (query) => {
      if (query.table === 'user_login_attempts' && query.operation === 'select') {
        return { data: [], error: null };
      }
      if (query.table === 'user_profiles' && query.operation === 'select' && matchFilter(query, 'email', 'user@example.com')) {
        return { data: user, error: null };
      }
      if (query.table === 'user_sessions' && query.operation === 'insert') {
        return { data: null, error: { code: '42P01', message: 'relation "user_sessions" does not exist' } };
      }
      if (query.table === 'user_profiles' && query.operation === 'update') {
        return { data: null, error: null };
      }
      if (query.table === 'user_login_attempts' && query.operation === 'insert') {
        return { data: null, error: null };
      }
      if (query.table === 'security_events') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query ${query.table}:${query.operation}`);
    };

    const req = createReq({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
      },
      query: { action: 'login' },
      body: {
        email: 'user@example.com',
        password: 'abc12345',
      },
      url: '/api/auth?action=login',
    });
    const res = createRes();

    await authHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe('AUTH_LOGIN_SUCCESS');
    expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.tokens.refreshToken).toEqual(expect.any(String));
  });

  it('registers a dedicated gateway rate-limit policy for /api/auth', () => {
    const authRoute = listRoutes().find((route) => route.module === 'auth');

    expect(authRoute).toBeTruthy();
    expect(authRoute.hasRateLimit).toBe(true);
    expect(authRoute.rateLimitPolicyId).toBe('auth_public_v1');
  });
});
