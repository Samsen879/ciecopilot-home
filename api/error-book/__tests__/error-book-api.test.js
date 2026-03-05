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

function addDaysIso(isoString, days) {
  return new Date(new Date(isoString).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
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

  it('applies scheduling defaults on create and exposes review view fields', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'insert') {
        return {
          data: {
            id: 'err-review-default',
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
        question: 'Need spaced repetition defaults',
        tags: ['algebra'],
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(201);
    const insertCall = calls.find((call) => call.table === 'user_errors' && call.operation === 'insert');
    const expectedNextReviewAt = addDaysIso(insertCall.payload.created_at, 1);
    expect(insertCall.payload.metadata.review.review_interval).toBe(1);
    expect(insertCall.payload.metadata.review.next_review_at).toBe(expectedNextReviewAt);
    expect(insertCall.payload.metadata.review.last_reviewed_at).toBeNull();
    expect(insertCall.payload.metadata.review.misconception_tag).toBeNull();

    expect(res.body.item.review_interval).toBe(1);
    expect(res.body.item.next_review_at).toBe(expectedNextReviewAt);
    expect(res.body.item.review.schedule.review_interval).toBe(1);
    expect(res.body.item.review.tags).toEqual(['algebra']);
  });

  it('validates review_interval on create payload', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub(() => ({ data: null, error: null }), calls);

    const req = createReq({
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: {
        question: 'invalid review interval',
        review_interval: 0,
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('bad_request');
    expect(calls).toHaveLength(0);
  });

  it('writes schedule and misconception_tag into metadata on update without dropping existing metadata', async () => {
    const calls = [];
    let selectCount = 0;
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            data: {
              id: 'err-merge',
              user_id: 'trusted-user',
              source: 'manual',
              question: 'Merge metadata review patch',
              metadata: {
                preserve: 'keep-me',
                review: {
                  next_review_at: '2026-03-05T00:00:00.000Z',
                  review_interval: 2,
                },
              },
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            },
            error: null,
          };
        }
      }
      if (query.table === 'user_errors' && query.operation === 'update') {
        return {
          data: {
            id: 'err-merge',
            user_id: 'trusted-user',
            source: 'manual',
            question: 'Merge metadata review patch',
            metadata: query.payload.metadata,
            tags: ['limits'],
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-merge' },
      body: {
        review_interval: 4,
        last_reviewed_at: '2026-03-03T10:20:30.000Z',
        misconception_tag: 'sign_error',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await itemHandler(req, res);

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((call) => call.table === 'user_errors' && call.operation === 'update');
    expect(updateCall.payload.metadata.preserve).toBe('keep-me');
    expect(updateCall.payload.metadata.review.review_interval).toBe(4);
    expect(updateCall.payload.metadata.review.next_review_at).toBe('2026-03-07T10:20:30.000Z');
    expect(updateCall.payload.metadata.review.last_reviewed_at).toBe('2026-03-03T10:20:30.000Z');
    expect(updateCall.payload.metadata.review.misconception_tag).toBe('sign_error');

    expect(res.body.item.review_interval).toBe(4);
    expect(res.body.item.next_review_at).toBe('2026-03-07T10:20:30.000Z');
    expect(res.body.item.misconception_tag).toBe('sign_error');
    expect(res.body.item.review.tags).toEqual(['limits', 'sign_error']);
  });

  it('keeps explicit next_review_at when patch provides it', async () => {
    const calls = [];
    let selectCount = 0;
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            data: {
              id: 'err-explicit-next',
              user_id: 'trusted-user',
              source: 'manual',
              question: 'Explicit next review',
              metadata: {
                review: {
                  review_interval: 2,
                  last_reviewed_at: '2026-03-01T00:00:00.000Z',
                  next_review_at: '2026-03-03T00:00:00.000Z',
                },
              },
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            },
            error: null,
          };
        }
      }
      if (query.table === 'user_errors' && query.operation === 'update') {
        return {
          data: {
            id: 'err-explicit-next',
            user_id: 'trusted-user',
            source: 'manual',
            question: 'Explicit next review',
            metadata: query.payload.metadata,
            created_at: '2026-03-01T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-explicit-next' },
      body: {
        review_interval: 10,
        next_review_at: '2026-03-20T08:00:00.000Z',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await itemHandler(req, res);

    expect(res.statusCode).toBe(200);
    const updateCall = calls.find((call) => call.table === 'user_errors' && call.operation === 'update');
    expect(updateCall.payload.metadata.review.review_interval).toBe(10);
    expect(updateCall.payload.metadata.review.next_review_at).toBe('2026-03-20T08:00:00.000Z');
    expect(res.body.item.next_review_at).toBe('2026-03-20T08:00:00.000Z');
  });

  it('validates review datetime fields on patch', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        return {
          data: {
            id: 'err-invalid-datetime',
            user_id: 'trusted-user',
            source: 'manual',
            question: 'Invalid date test',
            metadata: {},
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-invalid-datetime' },
      body: {
        next_review_at: 'not-a-date',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await itemHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('bad_request');
    const updateCall = calls.find((call) => call.table === 'user_errors' && call.operation === 'update');
    expect(updateCall).toBeUndefined();
  });

  it('serializes review fields from list/get and merges misconception_tag into review tags', async () => {
    const calls = [];
    let selectCount = 0;
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        selectCount += 1;
        if (selectCount === 1) {
          return {
            data: [
              {
                id: 'err-list-review',
                user_id: 'trusted-user',
                source: 'manual',
                question: 'List review model',
                tags: ['derivative'],
                metadata: {
                  review: {
                    review_interval: 3,
                    last_reviewed_at: '2026-03-01T00:00:00.000Z',
                  },
                },
                created_at: '2026-03-01T00:00:00.000Z',
                updated_at: '2026-03-01T00:00:00.000Z',
              },
            ],
            error: null,
          };
        }

        return {
          data: {
            id: 'err-get-review',
            user_id: 'trusted-user',
            source: 'manual',
            question: 'Get review model',
            tags: ['integration'],
            metadata: {
              error_event_id: 'ev-1',
              review: {
                review_interval: 2,
                last_reviewed_at: '2026-03-02T00:00:00.000Z',
              },
            },
            created_at: '2026-03-02T00:00:00.000Z',
            updated_at: '2026-03-02T00:00:00.000Z',
          },
          error: null,
        };
      }

      if (query.table === 'error_events') {
        return {
          data: [
            {
              error_event_id: 'ev-1',
              user_id: 'trusted-user',
              misconception_tag: 'chain_rule',
              created_at: '2026-03-02T00:10:00.000Z',
            },
          ],
          error: null,
        };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const listReq = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const listRes = createRes();
    await indexHandler(listReq, listRes);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.items).toHaveLength(1);
    expect(listRes.body.items[0].review_interval).toBe(3);
    expect(listRes.body.items[0].next_review_at).toBe('2026-03-04T00:00:00.000Z');
    expect(listRes.body.items[0].review.tags).toEqual(['derivative']);

    const getReq = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { id: 'err-get-review' },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const getRes = createRes();
    await itemHandler(getReq, getRes);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.item.review_interval).toBe(2);
    expect(getRes.body.item.misconception_tag).toBe('chain_rule');
    expect(getRes.body.item.review.tags).toEqual(['integration', 'chain_rule']);
  });

  it('supports list filtering by next_review_at range and sorting by next_review_at', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_errors' && query.operation === 'select') {
        return {
          data: [
            {
              id: 'err-1',
              user_id: 'trusted-user',
              source: 'manual',
              question: 'late',
              metadata: {
                review: {
                  next_review_at: '2026-03-08T00:00:00.000Z',
                  review_interval: 1,
                },
              },
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            },
            {
              id: 'err-2',
              user_id: 'trusted-user',
              source: 'manual',
              question: 'in-range-early',
              metadata: {
                review: {
                  next_review_at: '2026-03-05T00:00:00.000Z',
                  review_interval: 1,
                },
              },
              created_at: '2026-03-02T00:00:00.000Z',
              updated_at: '2026-03-02T00:00:00.000Z',
            },
            {
              id: 'err-3',
              user_id: 'trusted-user',
              source: 'manual',
              question: 'in-range-late',
              metadata: {
                review: {
                  next_review_at: '2026-03-07T00:00:00.000Z',
                  review_interval: 1,
                },
              },
              created_at: '2026-03-03T00:00:00.000Z',
              updated_at: '2026-03-03T00:00:00.000Z',
            },
          ],
          error: null,
        };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    }, calls);

    const req = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {
        next_review_after: '2026-03-05T00:00:00.000Z',
        next_review_before: '2026-03-07T23:59:59.000Z',
        sort_by: 'next_review_at',
        sort_order: 'asc',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meta.filters.next_review_after).toBe('2026-03-05T00:00:00.000Z');
    expect(res.body.meta.filters.next_review_before).toBe('2026-03-07T23:59:59.000Z');
    expect(res.body.meta.filters.sort_by).toBe('next_review_at');
    expect(res.body.meta.filters.sort_order).toBe('asc');
    expect(res.body.items.map((item) => item.id)).toEqual(['err-2', 'err-3']);
  });

  it('rejects invalid next_review_at range filters', async () => {
    const calls = [];
    supabaseStub = createSupabaseStub(() => ({ data: [], error: null }), calls);

    const req = createReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: {
        next_review_after: '2026-03-08T00:00:00.000Z',
        next_review_before: '2026-03-05T00:00:00.000Z',
      },
      authUser: { id: 'trusted-user' },
      authUserId: 'trusted-user',
    });
    const res = createRes();

    await indexHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('bad_request');
    expect(calls).toHaveLength(0);
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
