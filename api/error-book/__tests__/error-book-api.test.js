import { jest } from '@jest/globals';

let supabaseStub = null;
const mockRequireAuth = jest.fn(async () => ({ ok: true, user: { id: 'fallback-user' } }));
const mockGetServiceClient = jest.fn(() => supabaseStub);

jest.unstable_mockModule('../../lib/security/auth-guard.js', () => ({
  requireAuth: mockRequireAuth,
}));

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { default: indexHandler } = await import('../index.js');
const { default: itemHandler } = await import('../[id].js');

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
    request_id: 'req-error-book-1',
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

function createSupabaseStub(resolveQuery, callStore) {
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
      const snapshot = this.snapshot({ single: true });
      callStore.push(snapshot);
      return Promise.resolve(resolveQuery(snapshot));
    }

    maybeSingle() {
      const snapshot = this.snapshot({ maybeSingle: true });
      callStore.push(snapshot);
      return Promise.resolve(resolveQuery(snapshot));
    }

    then(resolve, reject) {
      const snapshot = this.snapshot();
      callStore.push(snapshot);
      return Promise.resolve(resolveQuery(snapshot)).then(resolve, reject);
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

describe('error-book contract', () => {
  it('uses trusted auth context for list queries and ignores query.user_id', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        return { data: [], error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {
        user_id: 'attacker-user',
        source: 'manual',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.manual_first).toBe(true);
    expect(res.body.meta.filters.source).toBe('manual');
    const userFilter = calls
      .find((call) => call.table === 'user_errors' && call.operation === 'select')
      ?.filters.find((filter) => filter.field === 'user_id');
    expect(userFilter?.value).toBe('trusted-user');
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });

  it('writes entries under trusted auth user and ignores body.user_id', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'insert') {
        return {
          data: {
            id: 'err-1',
            ...query.payload,
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: {
        user_id: 'attacker-user',
        question: 'Why did I lose the mark?',
        source: 'manual',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.item.user_id).toBe('trusted-user');
    const insertCall = calls.find((call) => call.table === 'user_errors' && call.operation === 'insert');
    expect(insertCall.payload.user_id).toBe('trusted-user');
  });

  it('rejects automatic sources while manual-first is enforced', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub(() => ({ data: null, error: null }), calls);

    const req = createReq({
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: {
        question: 'auto fill',
        source: 'mark_engine_auto',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('auto_source_disabled');
    expect(calls).toHaveLength(0);
  });

  it('returns normalized null enrichment fields when enrichment is missing', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        return {
          data: {
            id: 'err-1',
            user_id: 'trusted-user',
            source: 'manual',
            question: 'What went wrong?',
            metadata: {},
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-01T00:00:00.000Z',
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-1' },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await itemHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.item.enrichment.attempt.attempt_id).toBeNull();
    expect(res.body.item.enrichment.mark_decision.mark_decision_id).toBeNull();
    expect(res.body.item.enrichment.error_event.error_event_id).toBeNull();
  });

  it('returns ownership_forbidden when trusted user does not own the record', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        return {
          data: {
            id: 'err-1',
            user_id: 'other-user',
            source: 'manual',
            question: 'Other record',
            metadata: {},
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-1' },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await itemHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('ownership_forbidden');
  });
});
