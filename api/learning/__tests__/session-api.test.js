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
  sessionInsertGate: null,
};

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitForCondition(predicate, { attempts = 50, delayMs = 0 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('Condition not reached in time.');
}

function dispatch(testRequest) {
  return new Promise((resolve, reject) => {
    testRequest.end((error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });
}

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
    return (async () => {
      if (clientState.sessionInsertGate) {
        await clientState.sessionInsertGate.promise;
      }

      const row = createSessionRow(query.payload);
      clientState.sessions.set(row.session_id, row);
      return { data: row, error: null };
    })();
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

function buildStoredSession(overrides = {}) {
  return {
    session_id: overrides.session_id ?? 'session-parent-1',
    user_id: overrides.user_id ?? 'student-1',
    subject_code: '9709',
    session_goal: 'Repair trigonometric equation solving',
    mode: 'spaced_review',
    state: 'active',
    active_scope_bundle: {
      primary_topic_id: 'topic-trig-equations',
      primary_topic_path: '9709.trigonometry.equations',
      secondary_topics_in_scope: [],
      allowed_prerequisites: [],
      paper_context: null,
      mode: 'spaced_review',
      session_goal: 'Repair trigonometric equation solving',
      current_anchor_kind: 'review_task',
      current_anchor_ref: {
        kind: 'review_task',
        review_task_id: 'review-task-1',
      },
      current_question_ref: null,
      current_question_type_ref: {
        kind: 'question_type',
        question_type_id: '9709.trigonometry.equations',
      },
      ...(overrides.active_scope_bundle || {}),
    },
    current_anchor_kind: 'review_task',
    current_anchor_ref: {
      kind: 'review_task',
      review_task_id: 'review-task-1',
    },
    current_question_id: null,
    current_question_type_id: '9709.trigonometry.equations',
    summary_state: {
      recap: 'Repair the factoring and angle-isolation mistakes before speeding up.',
      ...(overrides.summary_state || {}),
    },
    open_questions: [],
    key_artifact_refs: [],
    misconceptions_in_focus: [],
    lineage_ref: {
      parent_session_id: null,
      handoff_kind: null,
      ...(overrides.lineage_ref || {}),
    },
    created_at: '2026-03-21T13:30:00.000Z',
    updated_at: '2026-03-21T13:30:00.000Z',
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
    clientState.sessionInsertGate = null;
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
    expect(res.body.session.handoff).toMatchObject({
      supported: true,
      session_id: res.body.session.session_id,
    });
    expect(res.body.session.resume_guidance).toMatchObject({
      questionless: true,
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.equations',
    });
  });

  test('POST /api/learning/sessions persists explicit child-session handoff lineage from a parent session', async () => {
    clientState.sessions.set('session-parent-1', buildStoredSession({
      session_id: 'session-parent-1',
      summary_state: {
        recap: 'The review thread is too long; continue from a clean concept session.',
        suggested_handoff_kind: 'explicit_new_session',
        suggested_handoff_reason_code: 'topic_shift',
        suggested_handoff_message: 'Carry the recap into a fresh concept session.',
      },
    }));
    clientState.lineage.set('session-parent-1', {
      lineage_id: 'lineage-session-parent-1',
      parent_session_id: null,
      child_session_id: 'session-parent-1',
      handoff_kind: null,
      summary_snapshot: {
        recap: 'The review thread is too long; continue from a clean concept session.',
      },
      created_at: '2026-03-21T13:30:00.000Z',
    });

    const res = await request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        subject_code: '9709',
        mode: 'spaced_review',
        session_goal: 'Resume the review in a clean child session',
        anchor_kind: 'review_task',
        anchor_ref: {
          kind: 'review_task',
          review_task_id: 'review-task-1',
        },
        current_question_id: null,
        current_question_type_id: '9709.trigonometry.equations',
        parent_session_id: 'session-parent-1',
        handoff_kind: 'explicit_new_session',
      });

    expect(res.status).toBe(200);
    expect(res.body.session.lineage_ref).toEqual({
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
    });
    expect(res.body.session.lineage).toMatchObject({
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
      summary_snapshot: {
        recap: 'The review thread is too long; continue from a clean concept session.',
      },
    });
    expect(res.body.session.handoff).toMatchObject({
      supported: true,
      lineage: {
        parent_session_id: 'session-parent-1',
        handoff_kind: 'explicit_new_session',
      },
      explicit_new_session: {
        supported: true,
        carry_forward_summary: {
          recap: 'The review thread is too long; continue from a clean concept session.',
        },
      },
    });
    expect(res.body.session.resume_guidance).toMatchObject({
      parent_session_id: 'session-parent-1',
      handoff_kind: 'explicit_new_session',
      questionless: true,
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.equations',
    });
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

  test('POST /api/learning/sessions reserves the idempotency key before async create work', async () => {
    const gate = createDeferred();
    clientState.sessionInsertGate = gate;

    const firstRequest = dispatch(request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-race-1')
      .send(buildSessionPayload()));

    const secondRequest = dispatch(request(server)
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-race-1')
      .send(buildSessionPayload()));

    await waitForCondition(
      () =>
        clientState.calls.some(
          (call) => call.table === 'learning_sessions' && call.operation === 'insert',
        ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const blockedInsertCalls = clientState.calls.filter(
      (call) => call.table === 'learning_sessions' && call.operation === 'insert',
    );
    expect(blockedInsertCalls).toHaveLength(1);

    gate.resolve();
    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.session.session_id).toBe(first.body.session.session_id);

    const insertCalls = clientState.calls.filter(
      (call) => call.table === 'learning_sessions' && call.operation === 'insert',
    );
    expect(insertCalls).toHaveLength(1);
  });

  test('POST /api/learning/sessions/extra segments does not hit create-session', async () => {
    const res = await request(server)
      .post('/api/learning/sessions/session-1/extra')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload());

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('endpoint_not_found');
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

  test('GET /api/learning/sessions/:id returns suggested handoff metadata and questionless resume guidance', async () => {
    clientState.sessions.set('session-suggested-1', buildStoredSession({
      session_id: 'session-suggested-1',
      mode: 'learn_concept',
      state: 'handoff_suggested',
      session_goal: 'Summarise trig identities before returning later',
      active_scope_bundle: {
        primary_topic_id: 'topic-trig-identities',
        primary_topic_path: '9709.trigonometry.identities',
        mode: 'learn_concept',
        session_goal: 'Summarise trig identities before returning later',
        current_anchor_kind: 'concept',
        current_anchor_ref: {
          kind: 'concept',
          topic_id: 'topic-trig-identities',
          topic_path: '9709.trigonometry.identities',
        },
        current_question_ref: null,
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.identities',
        },
      },
      current_anchor_kind: 'concept',
      current_anchor_ref: {
        kind: 'concept',
        topic_id: 'topic-trig-identities',
        topic_path: '9709.trigonometry.identities',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
      summary_state: {
        recap: 'Worked through multiple identities and need a compact restart point.',
        suggested_handoff_kind: 'internal_compaction',
        suggested_handoff_reason_code: 'session_turn_limit',
        suggested_handoff_message: 'Compact the runtime context before the next session.',
      },
    }));
    clientState.lineage.set('session-suggested-1', {
      lineage_id: 'lineage-session-suggested-1',
      parent_session_id: null,
      child_session_id: 'session-suggested-1',
      handoff_kind: null,
      summary_snapshot: {
        recap: 'Worked through multiple identities and need a compact restart point.',
      },
      created_at: '2026-03-21T13:30:00.000Z',
    });

    const res = await request(server)
      .get('/api/learning/sessions/session-suggested-1')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(res.status).toBe(200);
    expect(res.body.session.handoff).toMatchObject({
      supported: true,
      suggested_handoff: {
        should_handoff: true,
        handoff_kind: 'internal_compaction',
        reason_code: 'session_turn_limit',
        questionless: true,
      },
      internal_compaction: {
        supported: true,
        should_handoff: true,
        summary_snapshot: {
          recap: 'Worked through multiple identities and need a compact restart point.',
        },
      },
    });
    expect(res.body.session.resume_guidance).toMatchObject({
      questionless: true,
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
      anchor_kind: 'concept',
    });
    expect(res.body.session.active_scope_bundle.current_question_ref).toBeNull();
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
