import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockResolveUserId = jest.fn();
const mockGetServiceClient = jest.fn();

class MockAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

jest.unstable_mockModule('../../api/marking/lib/auth-helper.js', () => ({
  resolveUserId: mockResolveUserId,
  AuthError: MockAuthError,
}));

jest.unstable_mockModule('../../api/lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { default: handler, _resetClient } = await import('../../api/evidence/context.js');

function buildQueryChain(result, terminalMethod = 'then') {
  const chain = {};
  for (const method of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle']) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }
  if (terminalMethod === 'maybeSingle') {
    chain.maybeSingle = jest.fn().mockResolvedValue(result);
  }
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

function makeReq({
  method = 'GET',
  url = '/api/evidence/context',
  query,
  headers = {},
  requestId = 'req-evidence-1',
} = {}) {
  return {
    method,
    url,
    query,
    headers,
    request_id: requestId,
  };
}

function makeRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: null,
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
      return this;
    },
    end(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('evidence context contract hardening', () => {
  beforeEach(() => {
    _resetClient();
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    mockResolveUserId.mockResolvedValue({ user_id: 'user-1', auth_source: 'jwt' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a stable code/message envelope for validation failures', async () => {
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('topic_path query parameter is required.');
    expect(res.body.code).toBe('bad_request');
    expect(res.body.message).toBe('topic_path query parameter is required.');
    expect(res.body.request_id).toBe('req-evidence-1');
    expect(res.body.details).toEqual({ field: 'topic_path' });
  });

  it('accepts topic_path from req.query when req.url does not carry the query string', async () => {
    mockGetServiceClient.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: {
          mastery: null,
          recent_decisions: [],
          misconception_tags: [],
          recent_errors: [],
        },
        error: null,
      }),
    });

    const req = makeReq({
      query: {
        topic_path: ' 9709.p1.algebra.quadratics ',
        limit: '12',
      },
    });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.topic_path).toBe('9709.p1.algebra.quadratics');
    expect(res.body.meta.limit).toBe(12);
    expect(res.body.meta.source).toBe('rpc');
  });

  it('normalizes malformed RPC payloads into empty arrays and null mastery', async () => {
    mockGetServiceClient.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: {
          mastery: 'bad-shape',
          recent_decisions: ['bad-row'],
          misconception_tags: [{ tag: 'sign_error', weighted_count: '2' }, null],
          recent_errors: [{ topic_path: '9709.p1.algebra', created_at: 'invalid-date' }],
        },
        error: null,
      }),
    });

    const req = makeReq({
      url: '/api/evidence/context?topic_path=9709.p1.algebra',
    });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.mastery).toBeNull();
    expect(res.body.recent_decisions).toEqual([]);
    expect(res.body.misconception_tags).toEqual([
      { tag: 'sign_error', weighted_count: 2 },
    ]);
    expect(res.body.recent_errors).toEqual([
      { topic_path: '9709.p1.algebra', created_at: null },
    ]);
  });

  it('returns stable auth codes while preserving the legacy error string', async () => {
    mockResolveUserId.mockRejectedValue(new MockAuthError('Invalid token', 401));
    const req = makeReq({
      url: '/api/evidence/context?topic_path=9709.p1.algebra',
    });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid token');
    expect(res.body.code).toBe('auth_required');
    expect(res.body.message).toBe('Invalid token');
  });

  it('falls back to the composed query path and emits normalized contract payloads', async () => {
    mockGetServiceClient.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'missing function' },
      }),
      from(table) {
        if (table === 'user_learning_profiles') {
          return buildQueryChain({
            data: {
              mastery_by_node: {},
              misconception_frequencies: {},
            },
            error: null,
          }, 'maybeSingle');
        }
        if (table === 'curriculum_nodes') {
          return buildQueryChain({ data: null, error: null }, 'maybeSingle');
        }
        if (table === 'attempts' || table === 'error_events') {
          return buildQueryChain({ data: [], error: null });
        }
        throw new Error(`Unhandled table ${table}`);
      },
    });

    const req = makeReq({
      url: '/api/evidence/context?topic_path=9709.p1.algebra&limit=5',
    });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.mastery).toBeNull();
    expect(res.body.recent_decisions).toEqual([]);
    expect(res.body.misconception_tags).toEqual([]);
    expect(res.body.recent_errors).toEqual([]);
    expect(res.body.meta).toEqual({
      topic_path: '9709.p1.algebra',
      limit: 5,
      source: 'fallback',
    });
  });
});
