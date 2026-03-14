import { jest } from '@jest/globals';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

let authResponse = { data: { user: { id: 'moderator-1' } }, error: null };
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
    sql(strings, ...values) {
      return { text: String.raw({ raw: strings }, ...values) };
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

const { default: questionsHandler } = await import('../questions.js');
const { default: answersHandler } = await import('../answers.js');

function createReq({ method = 'DELETE', query = {}, headers = {} } = {}) {
  return {
    method,
    query,
    headers,
    body: {},
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
  authResponse = { data: { user: { id: 'moderator-1' } }, error: null };
  queryResolver = () => {
    throw new Error('Unhandled Supabase query');
  };
  calls.length = 0;
  jest.clearAllMocks();
});

describe('community content counter consistency', () => {
  it('decrements the deleted question author counter instead of the acting moderator', async () => {
    queryResolver = (query) => {
      if (query.table === 'community_questions' && query.operation === 'select') {
        return { data: { id: 'question-1', author_id: 'author-1' }, error: null };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'select') {
        return { data: { user_id: 'moderator-1', role: 'moderator', reputation_score: 100 }, error: null };
      }
      if (query.table === 'community_questions' && query.operation === 'update') {
        return { data: null, error: null };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'upsert') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      query: { question_id: 'question-1' },
      headers: { origin: 'http://localhost:3000', authorization: 'Bearer token' },
    });
    const res = createRes();

    await questionsHandler(req, res);

    expect(res.statusCode).toBe(200);
    const counterUpdate = calls.find((call) => call.table === 'user_community_profiles' && call.operation === 'upsert');
    expect(counterUpdate.payload.user_id).toBe('author-1');
  });

  it('decrements the deleted answer author counter instead of the acting moderator', async () => {
    queryResolver = (query) => {
      if (query.table === 'community_answers' && query.operation === 'select') {
        return {
          data: { id: 'answer-1', author_id: 'answerer-1', question_id: 'question-1', is_best_answer: false },
          error: null,
        };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'select') {
        return { data: { user_id: 'moderator-1', role: 'moderator', reputation_score: 100 }, error: null };
      }
      if (query.table === 'community_answers' && query.operation === 'delete') {
        return { data: null, error: null };
      }
      if (query.table === 'community_questions' && query.operation === 'update') {
        return { data: null, error: null };
      }
      if (query.table === 'user_community_profiles' && query.operation === 'upsert') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      query: { answer_id: 'answer-1' },
      headers: { origin: 'http://localhost:3000', authorization: 'Bearer token' },
    });
    const res = createRes();

    await answersHandler(req, res);

    expect(res.statusCode).toBe(200);
    const counterUpdate = calls.find((call) => call.table === 'user_community_profiles' && call.operation === 'upsert');
    expect(counterUpdate.payload.user_id).toBe('answerer-1');
  });
});
