import { jest } from '@jest/globals';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-key';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

let authResponse = { data: { user: { id: 'trusted-user' } }, error: null };
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

const { default: deleteNotificationHandler } = await import('../notifications/[id].js');
const { default: markNotificationReadHandler } = await import('../notifications/[id]/read.js');

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
  authResponse = { data: { user: { id: 'trusted-user' } }, error: null };
  queryResolver = () => {
    throw new Error('Unhandled Supabase query');
  };
  calls.length = 0;
  jest.clearAllMocks();
});

describe('community notification contract hardening', () => {
  it('returns 404 when single-notification read does not match the caller', async () => {
    queryResolver = (query) => {
      if (query.table === 'community_notifications') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer trusted-token',
      },
      query: { id: 'notif-missing' },
    });
    const res = createRes();

    await markNotificationReadHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('NOTIFICATION_NOT_FOUND');
  });

  it('preserves first-read semantics by not rewriting an already-read notification', async () => {
    queryResolver = (query) => {
      if (query.table === 'community_notifications' && query.operation === 'select') {
        return {
          data: {
            id: 'notif-read',
            user_id: 'trusted-user',
            is_read: true,
            read_at: '2026-03-01T00:00:00.000Z',
          },
          error: null,
        };
      }
      if (query.table === 'community_notifications' && query.operation === 'update') {
        return {
          data: {
            id: 'notif-read',
            is_read: true,
            read_at: query.payload.read_at,
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
      query: { id: 'notif-read' },
    });
    const res = createRes();

    await markNotificationReadHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const updateCalls = calls.filter((call) => call.operation === 'update');
    expect(updateCalls).toHaveLength(0);
  });

  it('returns 404 when single-notification delete does not match the caller', async () => {
    queryResolver = (query) => {
      if (query.table === 'community_notifications') {
        return { data: null, error: null };
      }
      throw new Error(`Unhandled query: ${query.table} ${query.operation}`);
    };

    const req = createReq({
      method: 'DELETE',
      headers: {
        origin: 'http://localhost:3000',
        authorization: 'Bearer trusted-token',
      },
      query: { id: 'notif-missing' },
    });
    const res = createRes();

    await deleteNotificationHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('NOTIFICATION_NOT_FOUND');
  });
});