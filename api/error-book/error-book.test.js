import { jest } from '@jest/globals';

let supabaseStub = null;
const mockRequireAuth = jest.fn(async () => ({ ok: true, user: { id: 'fallback-user' } }));
const mockGetServiceClient = jest.fn(() => supabaseStub);

jest.unstable_mockModule('../lib/security/auth-guard.js', () => ({
  requireAuth: mockRequireAuth,
}));

jest.unstable_mockModule('../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { default: indexHandler } = await import('./index.js');
const { default: itemHandler } = await import('./[id].js');

function createReq({
  method = 'GET',
  headers = {},
  query = {},
  body = {},
  authUser = null,
  authUserId = null,
} = {}) {
  return {
    method,
    headers,
    query,
    body,
    auth_user: authUser,
    auth_user_id: authUserId,
    request_id: 'req-error-book-smoke',
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

function createSupabaseStub(resolveQuery) {
  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.operation = 'select';
      this.payload = null;
      this.filters = [];
      this.options = {};
    }

    select(columns) {
      this.options.columns = columns;
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

    in(field, values) {
      this.filters.push({ operator: 'in', field, value: values });
      return this;
    }

    gte(field, value) {
      this.filters.push({ operator: 'gte', field, value });
      return this;
    }

    lte(field, value) {
      this.filters.push({ operator: 'lte', field, value });
      return this;
    }

    order(field, options = {}) {
      this.options.order = { field, options };
      return this;
    }

    limit(value) {
      this.options.limit = value;
      return this;
    }

    single() {
      return Promise.resolve(resolveQuery(this.snapshot({ single: true })));
    }

    maybeSingle() {
      return Promise.resolve(resolveQuery(this.snapshot({ maybeSingle: true })));
    }

    then(resolve, reject) {
      return Promise.resolve(resolveQuery(this.snapshot())).then(resolve, reject);
    }

    snapshot(extra = {}) {
      return {
        table: this.table,
        operation: this.operation,
        payload: this.payload,
        filters: this.filters,
        options: {
          ...this.options,
          ...extra,
        },
      };
    }
  }

  return {
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  process.env.ERROR_BOOK_ALLOW_AUTO_SOURCE = 'false';
  jest.clearAllMocks();
});

describe('error-book route smoke', () => {
  it('rejects disallowed origins and never returns wildcard CORS', async () => {
    supabaseStub = createSupabaseStub(() => ({ data: [], error: null }));
    const req = createReq({
      headers: { origin: 'https://evil.example' },
      authUserId: 'trusted-user',
      authUser: { id: 'trusted-user' },
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('cors_origin_denied');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('returns method_not_allowed for unsupported methods on item route', async () => {
    supabaseStub = createSupabaseStub(() => ({ data: [], error: null }));
    const req = createReq({
      method: 'PUT',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-1' },
      authUserId: 'trusted-user',
      authUser: { id: 'trusted-user' },
    });
    const res = createRes();

    await itemHandler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body.code).toBe('method_not_allowed');
  });
});
