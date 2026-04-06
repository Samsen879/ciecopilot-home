import { jest } from '@jest/globals';
import { buildIdempotencyRequestFingerprint } from '../lib/repositories/request-idempotency-repository.js';
import { createLoopbackHttpTestClient } from './loopback-test-client.js';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const clientState = {
  artifacts: new Map(),
  calls: [],
  idempotencyRows: new Map(),
  nextIdempotencyId: 1,
  nextSessionId: 1,
  reviewTasks: new Map(),
  sessions: new Map(),
  lineage: new Map(),
  sessionInsertGate: null,
};

const PARENT_SESSION_ID = '11111111-1111-4111-8111-111111111111';
const GRANDPARENT_SESSION_ID = '22222222-2222-4222-8222-222222222222';

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

  delete() {
    this.operation = 'delete';
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

function buildIdempotencyKey(userId, requestPath, idempotencyKey) {
  return `${userId}:${requestPath}:${idempotencyKey}`;
}

function createNowTimestamp() {
  return new Date().toISOString();
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
  if (query.table === 'learning_artifacts' && query.operation === 'select') {
    const artifactId = findFilter(query, 'artifact_id');
    return {
      data: artifactId ? clientState.artifacts.get(artifactId) || null : null,
      error: null,
    };
  }

  if (query.table === 'learning_review_queue_projection' && query.operation === 'select') {
    const reviewTaskId = findFilter(query, 'review_task_id');
    const userId = findFilter(query, 'user_id');

    let rows = [...clientState.reviewTasks.values()];
    if (reviewTaskId) {
      rows = rows.filter((row) => row.review_task_id === reviewTaskId);
    }
    if (userId) {
      rows = rows.filter((row) => row.user_id === userId);
    }

    if (query.options?.single || query.options?.maybeSingle) {
      return { data: rows[0] || null, error: null };
    }

    return { data: rows, error: null };
  }

  if (query.table === 'learning_request_idempotency') {
    const userId = query.operation === 'insert'
      ? query.payload?.user_id ?? null
      : findFilter(query, 'user_id');
    const requestPath = query.operation === 'insert'
      ? query.payload?.request_path ?? null
      : findFilter(query, 'request_path');
    const idempotencyKey = query.operation === 'insert'
      ? query.payload?.idempotency_key ?? null
      : findFilter(query, 'idempotency_key');
    const rowKey = buildIdempotencyKey(userId, requestPath, idempotencyKey);

    if (query.operation === 'insert') {
      if (clientState.idempotencyRows.has(rowKey)) {
        return {
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        };
      }

      const now = createNowTimestamp();
      const row = {
        request_idempotency_id: `idem-${clientState.nextIdempotencyId++}`,
        created_at: now,
        updated_at: now,
        completed_at: null,
        ...query.payload,
      };
      clientState.idempotencyRows.set(
        buildIdempotencyKey(row.user_id, row.request_path, row.idempotency_key),
        row,
      );
      return { data: row, error: null };
    }

    if (query.operation === 'select') {
      return {
        data: clientState.idempotencyRows.get(rowKey) || null,
        error: null,
      };
    }

    if (query.operation === 'update') {
      const current = clientState.idempotencyRows.get(rowKey) || null;
      const now = createNowTimestamp();
      const next = current ? {
        ...current,
        ...query.payload,
        updated_at: now,
      } : null;
      if (next) {
        clientState.idempotencyRows.set(rowKey, next);
      }
      return { data: next, error: null };
    }

    if (query.operation === 'delete') {
      clientState.idempotencyRows.delete(rowKey);
      return { data: null, error: null };
    }
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

function buildNormalizedSessionIdempotencyPayload(overrides = {}) {
  const payload = buildSessionPayload(overrides);

  return {
    subjectCode: payload.subject_code,
    mode: payload.mode,
    sessionGoal: payload.session_goal,
    anchorKind: payload.anchor_kind,
    anchorRef: payload.anchor_ref,
    currentQuestionId: payload.current_question_id,
    currentQuestionTypeId: payload.current_question_type_id,
    parentSessionId: payload.parent_session_id ?? null,
    handoffKind: payload.handoff_kind ?? null,
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

function buildArtifact(overrides = {}) {
  return {
    artifact_id: 'artifact-misconception-1',
    artifact_kind: 'misconception_card',
    canonical_home_topic_id: 'topic-trig-equations',
    source_session_id: null,
    source_attempt_id: 'attempt-trig-1',
    source_mark_run_id: 'mark-run-trig-1',
    target_family_id: '9709.trigonometry_manipulation_equations',
    target_question_type_id: '9709.trigonometry.equations',
    slot_key: 'common_traps',
    trust_status: 'unverified',
    placement_status: 'inbox',
    lifecycle_status: 'active',
    grounding_refs: [
      { kind: 'attempt', attempt_id: 'attempt-trig-1' },
      { kind: 'mark_run', mark_run_id: 'mark-run-trig-1' },
    ],
    misconception_tags: ['domain:interval', 'sign:inverse'],
    created_at: '2026-03-21T13:30:00.000Z',
    updated_at: '2026-03-21T13:30:00.000Z',
    ...overrides,
  };
}

describe('learning session api', () => {
  let harness;

  beforeAll(async () => {
    harness = await createLoopbackHttpTestClient(apiHandler);
  });

  afterAll(async () => {
    await harness?.close();
  });

  beforeEach(() => {
    clientState.artifacts = new Map([
      ['artifact-misconception-1', buildArtifact()],
    ]);
    clientState.calls = [];
    clientState.idempotencyRows = new Map();
    clientState.nextIdempotencyId = 1;
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
    const res = await harness.request
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

  test('POST/GET second-subject sessions keep an explicit read-only runtime posture', async () => {
    clientState.reviewTasks.set('review-task-physics-1', buildReviewTask({
      review_task_id: 'review-task-physics-1',
      target_topic_id: 'topic-physics-mechanics',
      target_topic_path: '9702.mechanics.force_balance',
      target_family_id: '9702.mechanics_dynamics',
      target_family_title: 'Mechanics dynamics',
      target_question_type_id: '9702.mechanics.force_balance',
      target_question_type_title: 'Force balance',
      source_question_id: 'question-physics-1',
    }));

    const created = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        subject_code: '9702',
        session_goal: 'Review force balance misconceptions',
        anchor_ref: {
          kind: 'review_task',
          review_task_id: 'review-task-physics-1',
        },
        current_question_type_id: '9702.mechanics.force_balance',
      }));

    expect(created.status).toBe(200);
    expect(created.body.session.subject_code).toBe('9702');
    expect(created.body.session.active_scope_bundle.primary_topic_path).toBe('9702.mechanics.force_balance');
    expect(created.body.runtime_posture).toMatchObject({
      subject_code: '9702',
      read_only: true,
      authoritative_scoring_allowed: false,
      release_scope_status: 'non_released_fallback',
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'subject_adapter_capability_not_enabled',
      supported_capabilities: ['classification'],
      fallback_capabilities: ['marking', 'mastery', 'review'],
    });

    const resumed = await harness.request
      .get(`/api/learning/sessions/${created.body.session.session_id}`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(resumed.status).toBe(200);
    expect(resumed.body.session.subject_code).toBe('9702');
    expect(resumed.body.runtime_posture).toMatchObject({
      subject_code: '9702',
      read_only: true,
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'subject_adapter_capability_not_enabled',
    });
  });

  test('POST/GET sessions tolerate unknown subject codes by omitting runtime posture metadata', async () => {
    clientState.reviewTasks.set('review-task-unregistered-1', buildReviewTask({
      review_task_id: 'review-task-unregistered-1',
      target_topic_id: 'topic-unregistered-1',
      target_topic_path: '9231.experimental.reading',
      target_family_id: '9231.experimental_runtime',
      target_family_title: 'Experimental runtime',
      target_question_type_id: '9231.experimental.reading',
      target_question_type_title: 'Experimental reading',
    }));

    const created = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        subject_code: '9231',
        session_goal: 'Resume an imported unsupported subject session',
        anchor_ref: {
          kind: 'review_task',
          review_task_id: 'review-task-unregistered-1',
        },
        current_question_type_id: '9231.experimental.reading',
      }));

    expect(created.status).toBe(200);
    expect(created.body.session.subject_code).toBe('9231');
    expect(created.body.runtime_posture).toBeNull();
    expect(clientState.sessions.get(created.body.session.session_id)).toMatchObject({
      session_id: created.body.session.session_id,
      subject_code: '9231',
    });

    const resumed = await harness.request
      .get(`/api/learning/sessions/${created.body.session.session_id}`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(resumed.status).toBe(200);
    expect(resumed.body.session.subject_code).toBe('9231');
    expect(resumed.body.runtime_posture).toBeNull();
  });

  test('POST /api/learning/sessions persists explicit child-session handoff lineage from a parent session', async () => {
    clientState.sessions.set(PARENT_SESSION_ID, buildStoredSession({
      session_id: PARENT_SESSION_ID,
      summary_state: {
        recap: 'The review thread is too long; continue from a clean concept session.',
        suggested_handoff_kind: 'explicit_new_session',
        suggested_handoff_reason_code: 'topic_shift',
        suggested_handoff_message: 'Carry the recap into a fresh concept session.',
      },
    }));
    clientState.lineage.set(PARENT_SESSION_ID, {
      lineage_id: `lineage-${PARENT_SESSION_ID}`,
      parent_session_id: null,
      child_session_id: PARENT_SESSION_ID,
      handoff_kind: null,
      summary_snapshot: {
        recap: 'The review thread is too long; continue from a clean concept session.',
      },
      created_at: '2026-03-21T13:30:00.000Z',
    });

    const res = await harness.request
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
        parent_session_id: PARENT_SESSION_ID,
        handoff_kind: 'explicit_new_session',
      });

    expect(res.status).toBe(200);
    expect(res.body.session.lineage_ref).toEqual({
      parent_session_id: PARENT_SESSION_ID,
      handoff_kind: 'explicit_new_session',
    });
    expect(res.body.session.lineage).toMatchObject({
      parent_session_id: PARENT_SESSION_ID,
      handoff_kind: 'explicit_new_session',
      summary_snapshot: {
        recap: 'The review thread is too long; continue from a clean concept session.',
      },
    });
    expect(res.body.session.handoff).toMatchObject({
      supported: true,
      lineage: {
        parent_session_id: PARENT_SESSION_ID,
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
      parent_session_id: PARENT_SESSION_ID,
      handoff_kind: 'explicit_new_session',
      questionless: true,
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.equations',
    });
  });

  test('POST /api/learning/sessions preserves the carried lineage recap across multi-hop child sessions', async () => {
    clientState.sessions.set(PARENT_SESSION_ID, buildStoredSession({
      session_id: PARENT_SESSION_ID,
      summary_state: {},
      lineage_ref: {
        parent_session_id: GRANDPARENT_SESSION_ID,
        handoff_kind: 'explicit_new_session',
      },
    }));
    clientState.lineage.set(PARENT_SESSION_ID, {
      lineage_id: `lineage-${PARENT_SESSION_ID}`,
      parent_session_id: GRANDPARENT_SESSION_ID,
      child_session_id: PARENT_SESSION_ID,
      handoff_kind: 'explicit_new_session',
      summary_snapshot: {
        recap: 'Inherited ancestor recap that should survive the next child handoff.',
      },
      created_at: '2026-03-21T13:30:00.000Z',
    });

    const res = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        ...buildSessionPayload(),
        session_goal: 'Continue the inherited recap in a fresh child session',
        parent_session_id: PARENT_SESSION_ID,
        handoff_kind: 'explicit_new_session',
      });

    expect(res.status).toBe(200);
    expect(res.body.session.lineage.summary_snapshot).toEqual({
      recap: 'Inherited ancestor recap that should survive the next child handoff.',
    });
    expect(res.body.session.handoff.explicit_new_session.carry_forward_summary).toEqual({
      recap: 'Inherited ancestor recap that should survive the next child handoff.',
    });
  });

  test('POST /api/learning/sessions returns invalid_payload when parent_session_id is malformed', async () => {
    const res = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        ...buildSessionPayload(),
        parent_session_id: 'not-a-uuid',
        handoff_kind: 'explicit_new_session',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'invalid_payload',
      details: {
        field: 'parent_session_id',
      },
    });
  });

  test('POST /api/learning/sessions returns 404 anchor_target_not_found when the anchor object is missing', async () => {
    const res = await harness.request
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
    const res = await harness.request
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

  test('POST /api/learning/sessions returns 400 invalid_anchor_ref for malformed anchor refs', async () => {
    const res = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload({
        anchor_ref: {
          kind: 'review_task',
        },
      }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_anchor_ref');
  });

  test('POST /api/learning/sessions returns 400 invalid_anchor_kind for unknown anchors', async () => {
    const res = await harness.request
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
    const res = await harness.request
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
    const first = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-create-1')
      .send(buildSessionPayload());

    const second = await harness.request
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

  test('POST /api/learning/sessions replays the canonical durable response on same-payload retry after completion', async () => {
    const first = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-replay-1')
      .send(buildSessionPayload());

    expect(first.status).toBe(200);

    const sessionId = first.body.session.session_id;
    const storedSession = clientState.sessions.get(sessionId);
    clientState.sessions.set(sessionId, {
      ...storedSession,
      session_goal: 'Mutated after completion',
      summary_state: {
        recap: 'mutated replay state',
      },
      active_scope_bundle: {
        ...storedSession.active_scope_bundle,
        session_goal: 'Mutated after completion',
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.integration.application',
        },
      },
    });

    const second = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-replay-1')
      .send(buildSessionPayload());

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(second.body.session.session_id).toBe(sessionId);
    expect(
      clientState.calls.filter(
        (call) => call.table === 'learning_sessions' && call.operation === 'insert',
      ),
    ).toHaveLength(1);
    expect(
      clientState.calls.filter(
        (call) =>
          call.table === 'learning_session_resume_projection' && call.operation === 'select',
      ),
    ).toHaveLength(0);
  });

  test('POST /api/learning/sessions reserves the idempotency key before async create work', async () => {
    const gate = createDeferred();
    clientState.sessionInsertGate = gate;

    const firstRequest = dispatch(harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-race-1')
      .send(buildSessionPayload()));

    const secondRequest = dispatch(harness.request
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
    expect(clientState.idempotencyRows.size).toBe(1);

    gate.resolve();
    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.session.session_id).toBe(first.body.session.session_id);

    const insertCalls = clientState.calls.filter(
      (call) => call.table === 'learning_sessions' && call.operation === 'insert',
    );
    expect(insertCalls).toHaveLength(1);
    expect(
      clientState.calls.some(
        (call) => call.table === 'learning_request_idempotency' && call.operation === 'update',
      ),
    ).toBe(true);
  });

  test('POST /api/learning/sessions recovers a pending durable reservation when the reserved session already exists', async () => {
    clientState.sessions.set('session-recovered-1', buildStoredSession({
      session_id: 'session-recovered-1',
    }));
    clientState.lineage.set('session-recovered-1', {
      lineage_id: 'lineage-session-recovered-1',
      parent_session_id: null,
      child_session_id: 'session-recovered-1',
      handoff_kind: null,
      summary_snapshot: {
        recap: 'Repair the factoring and angle-isolation mistakes before speeding up.',
      },
      created_at: '2026-03-21T13:30:00.000Z',
    });
    clientState.idempotencyRows.set(
      buildIdempotencyKey('student-1', '/api/learning/sessions', 'sess-recover-1'),
      {
        request_idempotency_id: 'idem-recover-1',
        user_id: 'student-1',
        request_path: '/api/learning/sessions',
        idempotency_key: 'sess-recover-1',
        request_kind: 'create_learning_session',
        request_fingerprint: buildIdempotencyRequestFingerprint(
          buildNormalizedSessionIdempotencyPayload(),
        ),
        request_payload: buildNormalizedSessionIdempotencyPayload(),
        status: 'pending',
        resource_ref: {
          kind: 'learning_session',
          session_id: 'session-recovered-1',
        },
        response_payload: null,
        created_at: '2026-03-21T13:20:00.000Z',
        updated_at: '2026-03-21T13:20:00.000Z',
        completed_at: null,
      },
    );

    const res = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .set('Idempotency-Key', 'sess-recover-1')
      .send(buildSessionPayload());

    expect(res.status).toBe(200);
    expect(res.body.session.session_id).toBe('session-recovered-1');
    expect(
      clientState.calls.filter(
        (call) => call.table === 'learning_sessions' && call.operation === 'insert',
      ),
    ).toHaveLength(0);
  });

  test('POST /api/learning/sessions/extra segments does not hit create-session', async () => {
    const res = await harness.request
      .post('/api/learning/sessions/session-1/extra')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload());

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('endpoint_not_found');
  });

  test('GET /api/learning/sessions/:id resolves the dynamic route', async () => {
    const created = await harness.request
      .post('/api/learning/sessions')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send(buildSessionPayload());

    const sessionId = created.body.session.session_id;
    const res = await harness.request
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

    const res = await harness.request
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

  test('GET /api/learning/sessions/:id derives explicit post-mortem diagnostics, misconception focus, artifacts, and repair handoff from runtime truth', async () => {
    clientState.sessions.set('session-post-mortem-1', buildStoredSession({
      session_id: 'session-post-mortem-1',
      mode: 'post_mortem_review',
      state: 'handoff_suggested',
      session_goal: 'Review the scored attempt before starting repair',
      active_scope_bundle: {
        primary_topic_id: 'topic-trig-equations',
        primary_topic_path: '9709.trigonometry.equations',
        secondary_topics_in_scope: [],
        allowed_prerequisites: [],
        paper_context: null,
        mode: 'post_mortem_review',
        session_goal: 'Review the scored attempt before starting repair',
        current_anchor_kind: 'artifact',
        current_anchor_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-misconception-1',
        },
        current_question_ref: {
          kind: 'question',
          question_id: 'question-trig-1',
        },
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.trigonometry.equations',
        },
      },
      current_anchor_kind: 'artifact',
      current_anchor_ref: {
        kind: 'artifact',
        artifact_id: 'artifact-misconception-1',
      },
      current_question_id: 'question-trig-1',
      current_question_type_id: '9709.trigonometry.equations',
      summary_state: {},
    }));
    clientState.lineage.set('session-post-mortem-1', {
      lineage_id: 'lineage-session-post-mortem-1',
      parent_session_id: null,
      child_session_id: 'session-post-mortem-1',
      handoff_kind: null,
      summary_snapshot: {},
      created_at: '2026-03-21T13:30:00.000Z',
    });
    clientState.reviewTasks.set('review-task-post-mortem-1', buildReviewTask({
      review_task_id: 'review-task-post-mortem-1',
      target_topic_id: 'topic-trig-equations',
      target_topic_path: '9709.trigonometry.equations',
      target_question_type_id: '9709.trigonometry.equations',
      target_misconception_tags: ['domain:interval', 'sign:inverse'],
      source_question_id: 'question-trig-1',
      trigger_type: 'non_released_fallback',
      success_criteria: {
        authoritative_scoring_allowed: false,
        part_results: [
          {
            part_id: 'b',
            score_awarded: 0,
            score_max: 2,
          },
        ],
      },
      status: 'open',
    }));

    const res = await harness.request
      .get('/api/learning/sessions/session-post-mortem-1')
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student');

    expect(res.status).toBe(200);
    expect(res.body.session.misconceptions_in_focus).toEqual([
      'domain:interval',
      'sign:inverse',
    ]);
    expect(res.body.session.key_artifact_refs).toEqual([
      {
        kind: 'artifact',
        artifact_id: 'artifact-misconception-1',
      },
    ]);
    expect(res.body.session.summary_state.post_mortem_review).toMatchObject({
      scoring_posture: {
        release_scope_status: 'non_released_fallback',
        authoritative_scoring_allowed: false,
        fallback_reason_code: 'non_released_fallback',
      },
      diagnostic_focus: {
        title: 'Misconception-focused diagnostic',
        source_question_id: 'question-trig-1',
        source_attempt_ref: {
          kind: 'attempt',
          attempt_id: 'attempt-trig-1',
        },
        source_mark_run_ref: {
          kind: 'mark_run',
          mark_run_id: 'mark-run-trig-1',
        },
      },
      artifact_candidates: [
        {
          artifact_id: 'artifact-misconception-1',
          artifact_kind: 'misconception_card',
        },
      ],
      repair_handoff: {
        action_label: 'Launch repair session',
        launch_payload: {
          anchor_kind: 'review_task',
          review_task_id: 'review-task-post-mortem-1',
          mode: 'spaced_review',
        },
      },
    });
    expect(res.body.session.handoff).toMatchObject({
      suggested_handoff: {
        should_handoff: true,
        handoff_kind: 'explicit_new_session',
        reason_code: 'post_mortem_repair_ready',
      },
      explicit_new_session: {
        recommended_mode: 'spaced_review',
        recommended_anchor_kind: 'review_task',
        recommended_anchor_ref: {
          kind: 'review_task',
          review_task_id: 'review-task-post-mortem-1',
        },
      },
    });
  });

  test('GET /api/learning/sessions/:id returns 404 session_not_found with the frozen envelope', async () => {
    const res = await harness.request
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
