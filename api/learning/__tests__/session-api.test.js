import { jest } from '@jest/globals';
import http from 'node:http';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const clientState = {
  calls: [],
  nextSessionId: 1,
  reviewTasks: new Map(),
  sessions: new Map(),
  lineage: new Map(),
};

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
    this.filters.push({ field, value });
    return this;
  }

  single() {
    return this.#resolve({ single: true });
  }

  maybeSingle() {
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
      filters: [...this.filters],
      options: {
        ...this.options,
        ...extra,
      },
    };
    clientState.calls.push(query);
    return Promise.resolve(resolveQuery(query));
  }
}

const mockGetServiceClient = jest.fn(() => ({
  from(table) {
    return new QueryBuilder(table);
  },
}));

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

const { default: apiHandler } = await import('../../index.js');

function findFilter(query, field) {
  return query.filters.find((filter) => filter.field === field)?.value ?? null;
}

function createSessionRow(payload) {
  const sessionId = `session-${clientState.nextSessionId++}`;
  const now = '2026-03-21T13:30:00.000Z';
  return {
    session_id: sessionId,
    created_at: now,
    updated_at: now,
    ...payload,
  };
}

function buildResumeProjection(sessionId) {
  const session = clientState.sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const lineage = clientState.lineage.get(sessionId) || {
    parent_session_id: null,
    handoff_kind: null,
    summary_snapshot: session.summary_state || {},
  };

  return {
    ...session,
    parent_session_id: lineage.parent_session_id,
    handoff_kind: lineage.handoff_kind,
    summary_snapshot: lineage.summary_snapshot,
  };
}

function resolveQuery(query) {
  if (query.table === 'learning_review_queue_projection' && query.operation === 'select') {
    const reviewTaskId = findFilter(query, 'review_task_id');
    const row = clientState.reviewTasks.get(reviewTaskId) || null;
    return { data: row, error: null };
  }

  if (query.table === 'learning_sessions' && query.operation === 'insert') {
    const row = createSessionRow(query.payload);
    clientState.sessions.set(row.session_id, row);
    return { data: row, error: null };
  }

  if (query.table === 'learning_session_lineage' && query.operation === 'insert') {
    const row = {
      lineage_id: `lineage-${query.payload.child_session_id}`,
      created_at: '2026-03-21T13:30:00.000Z',
      ...query.payload,
    };
    clientState.lineage.set(query.payload.child_session_id, row);
    return { data: row, error: null };
  }

  if (query.table === 'learning_session_resume_projection' && query.operation === 'select') {
    const sessionId = findFilter(query, 'session_id');
    const userId = findFilter(query, 'user_id');
    const row = buildResumeProjection(sessionId);

    if (!row) {
      return { data: null, error: null };
    }

    if (userId && row.user_id !== userId) {
      return { data: null, error: null };
    }

    return { data: row, error: null };
  }

  throw new Error(`Unhandled learning query: ${query.table}:${query.operation}`);
}

function buildReviewTask(overrides = {}) {
  return {
    review_task_id: 'review-task-1',
    user_id: 'student-1',
    target_kind: 'question_type',
    target_topic_id: 'topic-trig-equations',
    target_topic_path: '9709.trigonometry.equations',
    target_family_id: '9709.trigonometry_manipulation_equations',
    target_family_title: 'Trigonometric manipulation / equations',
    target_question_type_id: '9709.trigonometry.equations',
    target_question_type_title: 'Trigonometric equations',
    target_misconception_tags: [],
    related_artifact_refs: [],
    source_question_id: null,
    source_attempt_ref: null,
    trigger_type: 'manual',
    mode: 'redo_variant',
    due_at: '2026-03-22T00:00:00.000Z',
    priority: 'normal',
    estimated_minutes: 15,
    success_criteria: {},
    completion_evidence: {},
    status: 'open',
    created_at: '2026-03-21T13:00:00.000Z',
    updated_at: '2026-03-21T13:00:00.000Z',
    ...overrides,
  };
}

function buildSessionPayload(overrides = {}) {
  return {
    subject_code: '9709',
    mode: 'spaced_review',
    session_goal: 'Repair trigonometric equation solving',
    anchor_kind: 'review_task',
    anchor_ref: {
      kind: 'review_task',
      review_task_id: 'review-task-1',
    },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.equations',
    ...overrides,
  };
}

describe('learning session api', () => {
  let server;

  beforeAll(() => {
    server = http.createServer(apiHandler);
  });

  afterAll((done) => {
    if (!server || !server.listening) {
      done();
      return;
    }
    server.close(done);
  });

  beforeEach(() => {
    clientState.calls = [];
    clientState.nextSessionId = 1;
    clientState.reviewTasks = new Map([
      ['review-task-1', buildReviewTask()],
      ['review-task-foreign', buildReviewTask({
        review_task_id: 'review-task-foreign',
        user_id: 'other-user',
      })],
    ]);
    clientState.sessions = new Map();
    clientState.lineage = new Map();
    jest.clearAllMocks();
  });

  test('POST /api/learning/sessions returns persisted active_scope_bundle and typed anchor', async () => {
    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload());

    expect(res.status).toBe(200);
    expect(res.body.session.active_scope_bundle.current_anchor_ref.kind).toBe('review_task');
    expect(res.body.session.active_scope_bundle.current_question_type_ref).toEqual({
      kind: 'question_type',
      question_type_id: '9709.trigonometry.equations',
    });
    expect(res.body.session.current_question_id).toBeNull();
    expect(res.body.anchor_validity).toMatchObject({
      ok: true,
      anchor_kind: 'review_task',
    });
    expect(res.body.canonical_home_context).toMatchObject({
      topic_ref: {
        kind: 'topic',
        topic_id: 'topic-trig-equations',
        topic_path: '9709.trigonometry.equations',
      },
    });
    expect(res.body.feature_flags.learning_runtime_enabled).toBe(true);
  });

  test('POST /api/learning/sessions returns 404 anchor_target_not_found when the anchor object is missing', async () => {
    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        anchor_ref: {
          kind: 'review_task',
          review_task_id: 'missing-review-task',
        },
      }));

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        code: 'anchor_target_not_found',
        retryable: false,
      },
      request_id: expect.any(String),
    });
  });

  test('POST /api/learning/sessions returns 403 auth_forbidden when the anchor belongs to another user', async () => {
    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        anchor_ref: {
          kind: 'review_task',
          review_task_id: 'review-task-foreign',
        },
      }));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('auth_forbidden');
  });

  test('POST /api/learning/sessions returns 400 invalid_payload for malformed anchor refs', async () => {
    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        anchor_ref: {
          kind: 'review_task',
        },
      }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_payload');
  });

  test('POST /api/learning/sessions returns 400 invalid_anchor_kind for unknown anchors', async () => {
    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        anchor_kind: 'mystery_anchor',
        anchor_ref: {
          kind: 'mystery_anchor',
          id: 'mystery-1',
        },
      }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_anchor_kind');
  });

  test('POST /api/learning/sessions returns 409 unsupported_mode_for_anchor for illegal create combinations', async () => {
    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        mode: 'guided_solve',
      }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('unsupported_mode_for_anchor');
  });

  test('POST /api/learning/sessions returns 409 idempotency_conflict on conflicting replay', async () => {
    const first = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-create-1')
      .send(buildSessionPayload());

    const second = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-create-1')
      .send(buildSessionPayload({
        session_goal: 'Different payload',
      }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('idempotency_conflict');
  });

  test('GET /api/learning/sessions/:id resolves the dynamic route', async () => {
    const created = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload());

    const sessionId = created.body.session.session_id;
    const res = await request(server)
      .get(`/api/learning/sessions/${sessionId}`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(res.status).toBe(200);
    expect(res.body.session.active_scope_bundle.current_anchor_ref.kind).toBe('review_task');
    expect(res.body.session.active_scope_bundle.current_question_type_ref).toEqual({
      kind: 'question_type',
      question_type_id: '9709.trigonometry.equations',
    });
  });

  test('GET /api/learning/sessions/:id returns 404 session_not_found with the frozen envelope', async () => {
    const res = await request(server)
      .get('/api/learning/sessions/missing-session')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'session_not_found',
      retryable: false,
    });
    expect(res.body.request_id).toEqual(expect.any(String));
  });
});
