import { jest } from '@jest/globals';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

let authResponse = { data: { user: { id: 'viewer-user' } }, error: null };
let queryResolver = () => {
  throw new Error('Unhandled Supabase query');
};
const calls = [];

function createSupabaseStub() {
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

    limit(value) {
      this.options.limit = value;
      return this;
    }

    single() {
      const snapshot = this.snapshot({ single: true });
      calls.push(snapshot);
      return Promise.resolve(queryResolver(snapshot));
    }

    maybeSingle() {
      const snapshot = this.snapshot({ maybeSingle: true });
      calls.push(snapshot);
      return Promise.resolve(queryResolver(snapshot));
    }

    then(resolve, reject) {
      const snapshot = this.snapshot();
      calls.push(snapshot);
      return Promise.resolve(queryResolver(snapshot)).then(resolve, reject);
    }

    snapshot(extra = {}) {
      return {
        table: this.table,
        operation: this.operation,
        payload: this.payload,
        filters: [...this.filters],
        options: {
          ...this.options,
          ...extra,
        },
      };
    }
  }

  return {
    auth: {
      getUser: jest.fn(async () => authResponse),
    },
    from(table) {
      return new QueryBuilder(table);
    },
  };
}

const supabaseStub = createSupabaseStub();
const mockGetServiceClient = jest.fn(() => supabaseStub);

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { default: profilesHandler } = await import('../profiles.js');
const { default: reputationHandler } = await import('../reputation.js');

function createReq({ method = 'GET', query = {}, headers = {}, body = {} } = {}) {
  return {
    method,
    query,
    headers,
    body,
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

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  authResponse = { data: { user: { id: 'viewer-user' } }, error: null };
  queryResolver = () => {
    throw new Error('Unhandled Supabase query');
  };
  calls.length = 0;
  jest.clearAllMocks();
});

describe('community profiles and reputation hardening', () => {
  it('does not create a missing third-party profile during a read', async () => {
    queryResolver = (query) => {
      if (
        query.table === 'user_community_profiles' &&
        query.operation === 'select' &&
        query.options.columns === 'visibility'
      ) {
        return { data: null, error: { code: 'PGRST116' } };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'select') {
        return { data: null, error: { code: 'PGRST116' } };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'insert') {
        return {
          data: {
            user_id: query.payload.user_id,
            visibility: 'public',
          },
          error: null,
        };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      method: 'GET',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer trusted-token',
      },
      query: { user_id: 'target-user' },
    });
    const res = createRes();

    await profilesHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('PROFILE_NOT_FOUND');
    const insertCalls = calls.filter((call) => call.table === 'user_community_profiles' && call.operation === 'insert');
    expect(insertCalls).toHaveLength(0);
  });

  it('does not treat friends_only profiles as public', async () => {
    queryResolver = (query) => {
      if (
        query.table === 'user_community_profiles' &&
        query.operation === 'select' &&
        query.options.columns === 'visibility'
      ) {
        return { data: { visibility: 'friends_only' }, error: null };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'select') {
        return {
          data: {
            user_id: 'target-user',
            visibility: 'friends_only',
            preferred_subjects: [],
            learning_goals: [],
            expertise_areas: [],
            user_profiles: {
              id: 'target-user',
              username: 'target',
              display_name: 'Target User',
              avatar_url: null,
              bio: null,
              created_at: '2026-03-01T00:00:00.000Z',
              updated_at: '2026-03-01T00:00:00.000Z',
            },
          },
          error: null,
        };
      }
      if (['community_questions', 'community_answers', 'community_interactions', 'user_badges', 'reputation_history'].includes(query.table)) {
        if (query.options.columns === '*' || query.options.columns?.includes('count')) {
          return { count: 0, error: null };
        }
        return { data: [], error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      method: 'GET',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer trusted-token',
      },
      query: { user_id: 'target-user' },
    });
    const res = createRes();

    await profilesHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('PROFILE_ACCESS_DENIED');
  });

  it('blocks non-owners from requesting another user history detail', async () => {
    queryResolver = (query) => {
      if (query.table === 'user_community_profiles' && query.operation === 'select') {
        const userFilter = query.filters.find((filter) => filter.field === 'user_id')?.value;
        if (userFilter === 'target-user') {
          return {
            data: {
              user_id: 'target-user',
              reputation_score: 42,
              level: 'NEWCOMER',
              role: 'student',
            },
            error: null,
          };
        }
        return {
          data: {
            user_id: 'viewer-user',
            reputation_score: 10,
            level: 'NEWCOMER',
            role: 'student',
          },
          error: null,
        };
      }
      if (query.table === 'reputation_history') {
        return { data: [], error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      method: 'GET',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer trusted-token',
      },
      query: {
        user_id: 'target-user',
        include_history: 'true',
      },
    });
    const res = createRes();

    await reputationHandler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('REPUTATION_HISTORY_ACCESS_DENIED');
    const historyCalls = calls.filter((call) => call.table === 'reputation_history');
    expect(historyCalls).toHaveLength(0);
  });
});