import { jest } from '@jest/globals';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

let authResponse = { data: { user: { id: 'user-1' } }, error: null };
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

    eq(field, value) {
      this.filters.push({ operator: 'eq', field, value });
      return this;
    }

    in(field, value) {
      this.filters.push({ operator: 'in', field, value });
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

jest.unstable_mockModule('../badges.js', () => ({
  checkAndAwardBadges: jest.fn(async () => []),
}));

jest.unstable_mockModule('../reputation.js', () => ({
  updateUserReputation: jest.fn(async () => ({})),
  REPUTATION_CONFIG: {},
}));

const { default: interactionsHandler } = await import('../interactions.js');

function createReq({
  method = 'POST',
  query = {},
  headers = {},
  body = {},
} = {}) {
  return {
    method,
    query,
    headers,
    body,
  };
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
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

beforeEach(() => {
  authResponse = { data: { user: { id: 'user-1' } }, error: null };
  queryResolver = () => {
    throw new Error('Unhandled Supabase query');
  };
  calls.length = 0;
  jest.clearAllMocks();
});

describe('community interactions contract', () => {
  it('rejects duplicate bookmark creation without inserting a second row', async () => {
    queryResolver = (query) => {
      if (query.table === 'community_questions' && query.operation === 'select') {
        return { data: { id: 'question-1' }, error: null };
      }

      if (query.table === 'user_community_profiles' && query.operation === 'select') {
        return {
          data: {
            user_id: 'user-1',
            role: 'student',
            reputation_score: 100,
          },
          error: null,
        };
      }

      if (query.table === 'community_interactions' && query.operation === 'select') {
        const typeFilter = query.filters.find((filter) => filter.field === 'interaction_type');
        if (typeFilter?.operator === 'eq' && typeFilter.value === 'bookmark') {
          return {
            data: {
              id: 'bookmark-1',
              interaction_type: 'bookmark',
              content_type: 'question',
              content_id: 'question-1',
            },
            error: null,
          };
        }

        return { data: null, error: null };
      }

      if (query.table === 'community_interactions' && query.operation === 'insert') {
        return {
          data: {
            id: 'new-bookmark',
          },
          error: null,
        };
      }

      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer trusted-token',
      },
      body: {
        content_type: 'question',
        content_id: 'question-1',
        interaction_type: 'bookmark',
      },
    });
    const res = createRes();

    await interactionsHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('INTERACTION_EXISTS');

    const duplicateCheck = calls.find(
      (call) =>
        call.table === 'community_interactions' &&
        call.operation === 'select' &&
        call.filters.some(
          (filter) => filter.operator === 'eq' && filter.field === 'interaction_type' && filter.value === 'bookmark'
        )
    );
    expect(duplicateCheck).toBeDefined();

    const inserts = calls.filter(
      (call) => call.table === 'community_interactions' && call.operation === 'insert'
    );
    expect(inserts).toHaveLength(0);
  });
});
