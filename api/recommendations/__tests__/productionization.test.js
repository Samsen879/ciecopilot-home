import fs from 'node:fs';
import path from 'node:path';
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

const { default: recommendationsHandler } = await import('../index.js');
const { default: learningDataHandler } = await import('../learning-data.js');
const { default: preferencesHandler } = await import('../preferences.js');

function createMockReq({ method = 'GET', headers = {}, query = {}, body = {}, authUser = null, authUserId = null } = {}) {
  return {
    method,
    headers,
    query,
    body,
    auth_user: authUser,
    auth_user_id: authUserId,
    request_id: 'req-test-1',
  };
}

function createMockRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    headers,
    body: undefined,
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
  return res;
}

function createSupabaseStub(resolveQuery) {
  const calls = [];

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

    upsert(payload, options = {}) {
      this.operation = 'upsert';
      this.payload = payload;
      this.options.upsert = options;
      return this;
    }

    eq(field, value) {
      this.filters.push({ operator: 'eq', field, value });
      return this;
    }

    gt(field, value) {
      this.filters.push({ operator: 'gt', field, value });
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

    range(start, end) {
      this.options.range = { start, end };
      return this;
    }

    async single() {
      return this.#resolve({ single: true });
    }

    async maybeSingle() {
      return this.#resolve({ maybeSingle: true });
    }

    then(resolve, reject) {
      return this.#resolve({}).then(resolve, reject);
    }

    #resolve(extra = {}) {
      const query = {
        table: this.table,
        operation: this.operation,
        payload: this.payload,
        filters: this.filters,
        options: {
          ...this.options,
          ...extra,
        },
      };
      calls.push(query);
      return Promise.resolve(resolveQuery(query));
    }
  }

  return {
    calls,
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  jest.clearAllMocks();
});

describe('recommendations production hardening', () => {
  it('keeps owned sources off wildcard CORS and direct auth.getUser usage', () => {
    const files = [
      'api/recommendations/index.js',
      'api/recommendations/learning-data.js',
      'api/recommendations/preferences.js',
      'api/recommendations/algorithm-engine.js',
      'api/recommendations/lib/runtime.js',
      'api/recommendations/lib/recommendation-orchestrator.js',
    ];

    files.forEach((file) => {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).not.toContain("Access-Control-Allow-Origin', '*'");
      expect(source).not.toContain('auth.getUser(');
    });
  });

  it('uses trusted auth, persists production recommendations, and marks cold start explicitly', async () => {
    let cachedPayload = null;

    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'recommendation_cache' && query.operation === 'select') {
        return {
          data: cachedPayload
            ? {
              id: 'cache-1',
              recommendation_data: cachedPayload,
              expires_at: '2099-01-01T00:00:00.000Z',
              hit_count: 1,
            }
            : null,
          error: null,
        };
      }

      if (query.table === 'recommendation_cache' && (query.operation === 'upsert' || query.operation === 'update')) {
        if (query.operation === 'upsert') {
          cachedPayload = query.payload.recommendation_data;
        }
        return { data: null, error: null };
      }

      if (query.table === 'user_learning_profiles') {
        return { data: null, error: null };
      }

      if (query.table === 'user_learning_data') {
        return { data: [], error: null, count: 0 };
      }

      if (query.table === 'recommendation_feedback') {
        return { data: [], error: null };
      }

      if (query.table === 'papers') {
        return {
          data: [
            {
              id: 'paper-1',
              title: 'Sequences and Series',
              abstract: 'Practice on recursive sequences.',
              difficulty_level: 3,
              citation_count: 20,
              publication_date: '2026-02-01T00:00:00.000Z',
              subject_code: '9709',
            },
          ],
          error: null,
        };
      }

      if (query.table === 'recommendations' && query.operation === 'insert') {
        const rows = query.payload.map((row, index) => ({
          ...row,
          id: `db-rec-${index + 1}`,
        }));
        return { data: rows, error: null };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    });

    const trustedUser = { id: 'user-1', email: 'student@example.com' };
    const req1 = createMockReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { subject_code: '9709', type: 'content', limit: '1' },
      authUser: trustedUser,
      authUserId: trustedUser.id,
    });
    const res1 = createMockRes();

    await recommendationsHandler(req1, res1);

    expect(mockRequireAuth).not.toHaveBeenCalled();
    expect(res1.statusCode).toBe(200);
    expect(res1.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res1.headers['access-control-allow-origin']).not.toBe('*');
    expect(res1.body.ok).toBe(true);
    expect(res1.body.meta.version).toBe('post-rag-s1-recommendations-v1');
    expect(res1.body.meta.cold_start.is_cold_start).toBe(true);
    expect(res1.body.meta.cold_start.cold_start_reason).toBe('process_boot');
    expect(res1.body.data.items[0].id).toBe('db-rec-1');
    expect(res1.body.data.items[0].algorithm_version).toBe('post-rag-s1-recommendations-v1');

    const req2 = createMockReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { subject_code: '9709', type: 'content', limit: '1' },
      authUser: trustedUser,
      authUserId: trustedUser.id,
    });
    const res2 = createMockRes();

    await recommendationsHandler(req2, res2);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.meta.cached).toBe(true);
    expect(res2.body.meta.cold_start.is_cold_start).toBe(false);
    expect(res2.body.meta.cold_start.cold_start_reason).toBe('warm_runtime');
    expect(res2.body.data.items[0].id).toBe('db-rec-1');
  });

  it('rejects unsupported recommendation types instead of falling back silently', async () => {
    supabaseStub = createSupabaseStub(() => ({ data: null, error: null }));

    const req = createMockReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { subject_code: '9709', type: 'wildcard' },
      authUser: { id: 'user-1' },
      authUserId: 'user-1',
    });
    const res = createMockRes();

    await recommendationsHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('invalid_recommendation_type');
  });

  it('returns exact pagination totals for learning data and preserves false/zero values on create', async () => {
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_learning_data' && query.operation === 'select') {
        if (query.options.range) {
          return {
            data: [
              {
                id: 'ld-1',
                user_id: 'user-1',
                subject_code: '9709',
                topic_id: 'topic-1',
                paper_id: 'paper-1',
                activity_type: 'quiz',
                activity_data: { is_correct: false, content_id: 'paper-1' },
                time_spent: 120,
                difficulty_rating: 2,
                user_rating: 0,
                session_id: 'session-a',
                created_at: '2026-02-28T00:00:00.000Z',
                updated_at: '2026-02-28T00:00:00.000Z',
              },
            ],
            error: null,
            count: 7,
          };
        }
        return {
          data: [],
          error: null,
          count: 0,
        };
      }

      if (query.table === 'user_learning_data' && query.operation === 'insert') {
        return {
          data: {
            id: 'ld-new',
            ...query.payload,
          },
          error: null,
        };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    });

    const getReq = createMockReq({
      method: 'GET',
      headers: { origin: 'http://localhost:3000' },
      query: { page: '2', limit: '1' },
      authUser: { id: 'user-1' },
      authUserId: 'user-1',
    });
    const getRes = createMockRes();

    await learningDataHandler(getReq, getRes);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.pagination.total).toBe(7);
    expect(getRes.body.data.items[0].is_correct).toBe(false);
    expect(getRes.body.data.items[0].score).toBe(0);

    const postReq = createMockReq({
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: {
        subject_code: '9709',
        topic_id: 'topic-1',
        activity_type: 'quiz',
        content_id: 'paper-1',
        time_spent: 60,
        difficulty_level: 2,
        is_correct: false,
        score: 0,
      },
      authUser: { id: 'user-1' },
      authUserId: 'user-1',
    });
    const postRes = createMockRes();

    await learningDataHandler(postReq, postRes);

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.data.learning_record.is_correct).toBe(false);
    expect(postRes.body.data.learning_record.score).toBe(0);
    expect(postRes.body.data.learning_record.metadata.content_id).toBe('paper-1');
  });

  it('deletes only preference records and leaves learning profiles untouched', async () => {
    supabaseStub = createSupabaseStub((query) => {
      if (query.table === 'user_preferences' && query.operation === 'select') {
        return {
          data: {
            id: 'pref-1',
            user_id: 'user-1',
            subject_code: '9709',
            preference_type: 'recommendations_profile',
            preference_value: {
              learning_style: 'visual',
              preferred_difficulty: 3,
              learning_pace: 'medium',
            },
            last_updated: '2026-02-28T00:00:00.000Z',
            created_at: '2026-02-28T00:00:00.000Z',
          },
          error: null,
        };
      }

      if (query.table === 'user_preferences' && query.operation === 'delete') {
        return { data: null, error: null };
      }

      if (query.table === 'user_learning_profiles' && query.operation === 'delete') {
        throw new Error('unexpected learning profile delete');
      }

      return { data: null, error: null };
    });

    const req = createMockReq({
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000' },
      query: { subject_code: '9709' },
      authUser: { id: 'user-1' },
      authUserId: 'user-1',
    });
    const res = createMockRes();

    await preferencesHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.subject_code).toBe('9709');
    expect(
      supabaseStub.calls.some((call) => call.table === 'user_learning_profiles' && call.operation === 'delete'),
    ).toBe(false);
  });
});
