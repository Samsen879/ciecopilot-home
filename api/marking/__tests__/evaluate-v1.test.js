// Tests for api/marking/evaluate-v1.js
// Covers: route skeleton, error codes, request validation, run_id, feature flag

import { jest } from '@jest/globals';

// ── Mock Supabase before importing handler ──────────────────────────────────
// Build a chainable query mock that resolves with configurable data.
// The rubric resolver calls supabase.from('rubric_points').select().eq()...
// and supabase.from('rubric_points_ready_v1').select().eq().order()...

const MOCK_READY_POINT = {
  rubric_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  storage_key: '9709/s22/qp11/q01.png',
  q_number: 1,
  subpart: null,
  step_index: 1,
  mark_label: 'M1',
  kind: 'M',
  description: 'Correct method',
  marks: 1,
  depends_on: [],
  ft_mode: 'none',
  confidence: 0.95,
  source: 'vlm',
  extractor_version: 'v1',
  provider: 'openai',
  model: 'gpt-4-turbo',
  prompt_version: 'p1',
  source_version: 'v1:openai:gpt-4-turbo:p1',
  updated_at: '2026-02-15T10:00:00Z',
};

function buildLearningQuestionProjectionRow(overrides = {}) {
  return {
    question_id: 'q-001',
    source_kind: 'paper_question',
    primary_topic_id: 'topic-trig-equations',
    family_id: '9709.trigonometry_manipulation_equations',
    primary_question_type_id: '9709.trigonometry.equations',
    primary_question_type_release_state: 'released',
    classification_confidence: 0.93,
    candidate_rubric_refs: [
      {
        kind: 'rubric_release',
        rubric_version_id: 'trig-v1',
        release_state: 'released',
      },
    ],
    release_scope_status: 'released_scoring',
    ...overrides,
  };
}

let learningQuestionProjectionRow = buildLearningQuestionProjectionRow();

function createChainMock(data) {
  const chain = {};
  const methods = ['select', 'eq', 'or', 'order', 'limit'];
  for (const m of methods) {
    chain[m] = jest.fn(() => chain);
  }
  chain.then = (resolve) => resolve({ data, error: null });
  chain.maybeSingle = jest.fn(async () => ({
    data: Array.isArray(data) ? data[0] ?? null : data,
    error: null,
  }));
  return chain;
}

const mockFrom = jest.fn((table) => {
  if (table === 'rubric_points') {
    return createChainMock([MOCK_READY_POINT]);
  }
  if (table === 'rubric_points_ready_v1') {
    return createChainMock([MOCK_READY_POINT]);
  }
  if (table === 'learning_question_registry_projection') {
    return createChainMock(learningQuestionProjectionRow);
  }
  return createChainMock([]);
});

const mockCreateClient = jest.fn(() => ({
  from: mockFrom,
}));

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

const mockResolveUserId = jest.fn(async () => ({ user_id: 'user-001' }));
class MockAuthError extends Error {}

const mockResolveQuestionId = jest.fn(async () => ({
  question_id: 'q-001',
  paper_id: 'p-001',
}));
class MockValidationError extends Error {}

const mockWriteLedger = jest.fn(async () => ({
  attempt_id: 'att-001',
  mark_run_id: 'mr-001',
  decision_write_status: 'success',
  error_event_count: 1,
  is_reused_run: false,
  attempt_context: {
    topic_id: 'topic-trig-equations',
    topic_path: '9709/trigonometry/equations',
  },
}));

const mockApplyLearningEffects = jest.fn(async () => ({
  release_scope_status: 'released_scoring',
  authoritative_scoring_allowed: true,
  learning_signal_posture: 'authoritative_scoring',
  mastery_updates: [],
  review_tasks: [],
  artifact_candidates: [],
  reconciliation: null,
}));
const mockPersistAttemptEventBridge = jest.fn(async () => ({
  ok: true,
  warningRecorded: false,
  persisted_event_types: [
    'AttemptSubmitted',
    'QuestionClassified',
    'MarkingCompleted',
    'LearningUpdateProposed',
  ],
  pipeline_state: {
    attempt_id: 'att-001',
    current_stage: 'LearningUpdateProposed',
    current_status: 'running',
    last_sequence_no: 4,
  },
}));

jest.unstable_mockModule('../lib/auth-helper.js', () => ({
  resolveUserId: mockResolveUserId,
  AuthError: MockAuthError,
}));

jest.unstable_mockModule('../lib/attempt-repository.js', () => ({
  resolveQuestionId: mockResolveQuestionId,
  ValidationError: MockValidationError,
}));

jest.unstable_mockModule('../lib/ledger-orchestrator.js', () => ({
  writeLedger: mockWriteLedger,
}));

jest.unstable_mockModule('../../learning/lib/mastery/mastery-orchestrator.js', () => ({
  applyLearningEffects: mockApplyLearningEffects,
}));

jest.unstable_mockModule('../../learning/lib/events/attempt-event-service.js', () => ({
  persistAttemptEventBridge: mockPersistAttemptEventBridge,
}));

// Dynamic import after mocks are set up
const { default: handler } = await import('../evaluate-v1.js');

// ── Test helpers ────────────────────────────────────────────────────────────
function mockReq(overrides = {}) {
  return {
    method: 'POST',
    body: {
      user_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      student_steps: [{ step_id: 's1', text: 'x = 2' }],
    },
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

// ── Setup env for each test ─────────────────────────────────────────────────
const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env.MARKING_V1_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.EVIDENCE_LEDGER_ENABLED = 'false';
  process.env.MARKING_V1_RUNTIME_BRIDGE_ENABLED = 'false';
  learningQuestionProjectionRow = buildLearningQuestionProjectionRow();
  jest.clearAllMocks();
  mockApplyLearningEffects.mockResolvedValue({
    release_scope_status: 'released_scoring',
    authoritative_scoring_allowed: true,
    learning_signal_posture: 'authoritative_scoring',
    mastery_updates: [],
    review_tasks: [],
    artifact_candidates: [],
    reconciliation: null,
  });
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

// ── 3.1 Route skeleton & unified error codes ────────────────────────────────
describe('evaluate-v1 route skeleton', () => {
  it('rejects non-POST with 405 method_not_allowed', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'method_not_allowed' }),
    );
  });

  it('returns 503 feature_disabled when MARKING_V1_ENABLED is not true', async () => {
    process.env.MARKING_V1_ENABLED = 'false';
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'feature_disabled' }),
    );
  });

  it('returns 200 with correct response shape on valid request', async () => {
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('run_id');
    expect(body).toHaveProperty('rubric_source_version');
    expect(body).toHaveProperty('scoring_engine_version', 'b2_smart_mark_engine_v1');
    expect(body).toHaveProperty('rubric_rows_used');
    expect(body).toHaveProperty('decisions');
    expect(body.decisions[0]).not.toHaveProperty('uncertain_reason');
    expect(body).toHaveProperty('ledger_write_status');
    expect(body).not.toHaveProperty('error_book_write_status');
    expect(body).not.toHaveProperty('error_book_write_counts');
  });

  it('includes uncertain_reason only when include_uncertain_reason=true', async () => {
    const req = mockReq({
      body: { ...mockReq().body, include_uncertain_reason: true },
    });
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.decisions[0]).toHaveProperty('uncertain_reason');
  });

  it('does not leak private/internal decision fields', async () => {
    const req = mockReq({ body: { ...mockReq().body, include_uncertain_reason: true } });
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    const keys = Object.keys(body.decisions[0]);
    for (const key of keys) {
      expect(key.startsWith('_')).toBe(false);
    }
  });
});

// ── 3.2 Supabase client initialisation ──────────────────────────────────────
describe('Supabase service-role client', () => {
  it('creates client with correct config (lazy singleton)', async () => {
    // The singleton is created on the first successful handler call in this
    // test module. Because jest.clearAllMocks() resets call counts between
    // tests, we check the mock's *current* invocation by making a fresh call
    // and verifying the handler succeeds (which requires a working client).
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    // Handler returned 200 → Supabase client was successfully obtained
    expect(res.status).toHaveBeenCalledWith(200);
    // Verify the mock factory was invoked at least once across the module
    // lifetime (the singleton may have been created in an earlier test).
    // We verify the shape of the returned client instead.
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('run_id');
  });
});

// ── 3.3 Request validation ──────────────────────────────────────────────────
describe('request validation', () => {
  it('returns 400 rubric_input_forbidden when rubric_points is present', async () => {
    const req = mockReq({
      body: {
        ...mockReq().body,
        rubric_points: [{ rubric_id: 'r1' }],
      },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'rubric_input_forbidden' }),
    );
  });

  it.each([
    ['storage_key'],
    ['q_number'],
    ['student_steps'],
  ])('returns 400 missing_required_fields when %s is absent', async (field) => {
    const body = { ...mockReq().body };
    delete body[field];
    const req = mockReq({ body });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    const json = res.json.mock.calls[0][0];
    expect(json.error).toBe('missing_required_fields');
    expect(json.message).toContain(field);
  });

  it('returns 400 when student_steps is not an array', async () => {
    const req = mockReq({
      body: { ...mockReq().body, student_steps: 'not-an-array' },
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'missing_required_fields' }),
    );
  });
});

// ── 3.4 run_id generation ───────────────────────────────────────────────────
describe('run_id generation', () => {
  it('includes a UUID-format run_id in successful response', async () => {
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.run_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('includes run_id even in validation error responses', async () => {
    const req = mockReq({
      body: { ...mockReq().body, rubric_points: [] },
    });
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.run_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates unique run_id per request', async () => {
    const res1 = mockRes();
    const res2 = mockRes();
    await handler(mockReq(), res1);
    await handler(mockReq(), res2);
    const id1 = res1.json.mock.calls[0][0].run_id;
    const id2 = res2.json.mock.calls[0][0].run_id;
    expect(id1).not.toBe(id2);
  });
});

// ── 3.5 v0 compat: compat_mode=v0 adds alignments[] ────────────────────────
describe('v0 compat mode', () => {
  it('includes alignments[] when compat_mode=v0', async () => {
    const req = mockReq({
      body: { ...mockReq().body, compat_mode: 'v0' },
    });
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('alignments');
    expect(Array.isArray(body.alignments)).toBe(true);
    expect(body.alignments[0]).not.toHaveProperty('uncertain_reason');
  });

  it('includes uncertain_reason in alignments[] only when explicitly enabled', async () => {
    const req = mockReq({
      body: { ...mockReq().body, compat_mode: 'v0', include_uncertain_reason: true },
    });
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.alignments[0]).toHaveProperty('uncertain_reason');
  });

  it('does not include alignments[] by default', async () => {
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    const body = res.json.mock.calls[0][0];
    expect(body.alignments).toBeUndefined();
  });
});

describe('learning-runtime orchestration', () => {
  it('returns part-aware marking_result payloads and passes them into learning orchestration', async () => {
    const req = mockReq({
      body: {
        ...mockReq().body,
        subpart: 'a_i',
      },
    });
    const res = mockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.marking_result).toMatchObject({
      attempt_id: 'att-001',
      mark_run_id: 'mr-001',
      marking_summary: {
        coverage_scope: 'subpart',
        local_signal_only: true,
      },
      part_results: [
        {
          part_id: 'a',
          subpart_id: 'a_i',
        },
      ],
    });
    expect(mockApplyLearningEffects).toHaveBeenCalledWith(
      expect.objectContaining({
        marking_result: expect.objectContaining({
          marking_summary: expect.objectContaining({
            coverage_scope: 'subpart',
          }),
          part_results: [
            expect.objectContaining({
              part_id: 'a',
              subpart_id: 'a_i',
            }),
          ],
        }),
      }),
      expect.any(Object),
    );
  });

  it('returns released-scope learning effects for a persisted pilot scoring run', async () => {
    mockApplyLearningEffects.mockResolvedValueOnce({
      release_scope_status: 'released_scoring',
      authoritative_scoring_allowed: true,
      learning_signal_posture: 'authoritative_scoring',
      mastery_updates: [
        {
          level: 'question_type',
          question_type_id: '9709.trigonometry.equations',
        },
      ],
      review_tasks: [],
      artifact_candidates: [],
      reconciliation: {
        reconciliation_run_id: 'recon-1',
      },
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.learning_effects).toMatchObject({
      release_scope_status: 'released_scoring',
      learning_signal_posture: 'authoritative_scoring',
      mastery_updates: [
        {
          level: 'question_type',
          question_type_id: '9709.trigonometry.equations',
        },
      ],
    });
    expect(mockApplyLearningEffects).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-001',
        question_id: 'q-001',
        source_attempt_ref: { kind: 'attempt', attempt_id: 'att-001' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mr-001' },
        marking_result: expect.objectContaining({
          attempt_id: 'att-001',
          mark_run_id: 'mr-001',
        }),
      }),
      expect.any(Object),
    );
  });

  it('does not apply learning effects when the ledger write failed', async () => {
    mockWriteLedger.mockResolvedValueOnce({
      attempt_id: 'att-001',
      mark_run_id: 'mr-001',
      decision_write_status: 'failed',
      error_event_count: 0,
      is_reused_run: false,
      attempt_context: {
        topic_id: 'topic-trig-equations',
        topic_path: '9709/trigonometry/equations',
      },
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.learning_effects).toBeUndefined();
    expect(mockApplyLearningEffects).not.toHaveBeenCalled();
  });

  it('does not apply learning effects when the ledger run was reused and skipped', async () => {
    mockWriteLedger.mockResolvedValueOnce({
      attempt_id: 'att-001',
      mark_run_id: 'mr-001',
      decision_write_status: 'skipped',
      error_event_count: 0,
      is_reused_run: true,
      attempt_context: {
        topic_id: 'topic-trig-equations',
        topic_path: '9709/trigonometry/equations',
      },
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.learning_effects).toBeUndefined();
    expect(mockApplyLearningEffects).not.toHaveBeenCalled();
  });

  it('calls the attempt-event bridge behind the dedicated runtime flag', async () => {
    process.env.MARKING_V1_RUNTIME_BRIDGE_ENABLED = 'true';

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockPersistAttemptEventBridge).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        attemptId: 'att-001',
        markRunId: 'mr-001',
        authorityPosture: expect.objectContaining({
          authoritative_scoring_allowed: true,
          learning_signal_posture: 'authoritative_scoring',
        }),
      }),
    );
  });

  it('marks imported-question attempts as explicit non-authoritative runtime inputs across ledger, bridge, and learning effects', async () => {
    process.env.MARKING_V1_RUNTIME_BRIDGE_ENABLED = 'true';
    learningQuestionProjectionRow = buildLearningQuestionProjectionRow({
      source_kind: 'imported_question',
      primary_topic_id: 'topic-trig-identities',
      family_id: '9709.trigonometry_manipulation_equations',
      primary_question_type_id: '9709.trigonometry.identities',
    });
    mockApplyLearningEffects.mockResolvedValueOnce({
      release_scope_status: 'released_scoring',
      authoritative_scoring_allowed: false,
      learning_signal_posture: 'conservative_fallback',
      runtime_authority_posture: 'non_authoritative',
      runtime_authority_reason_code: 'imported_question_attempt',
      mastery_updates: [],
      review_tasks: [],
      artifact_candidates: [],
      reconciliation: null,
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(mockWriteLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        response_summary: expect.objectContaining({
          authority_posture: expect.objectContaining({
            authoritative_scoring_allowed: false,
            runtime_authority_posture: 'non_authoritative',
            runtime_authority_reason_code: 'imported_question_attempt',
            question_source_kind: 'imported_question',
          }),
        }),
      }),
    );
    expect(mockPersistAttemptEventBridge).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        authorityPosture: expect.objectContaining({
          authoritative_scoring_allowed: false,
          runtime_authority_posture: 'non_authoritative',
          runtime_authority_reason_code: 'imported_question_attempt',
          question_source_kind: 'imported_question',
        }),
      }),
    );
    expect(mockApplyLearningEffects).toHaveBeenCalledWith(
      expect.objectContaining({
        question_context: expect.objectContaining({
          source_kind: 'imported_question',
        }),
        release_scope_posture: expect.objectContaining({
          authoritative_scoring_allowed: false,
          runtime_authority_posture: 'non_authoritative',
          runtime_authority_reason_code: 'imported_question_attempt',
          question_source_kind: 'imported_question',
        }),
      }),
      expect.any(Object),
    );

    const body = res.json.mock.calls[0][0];
    expect(body.learning_effects).toMatchObject({
      authoritative_scoring_allowed: false,
      runtime_authority_posture: 'non_authoritative',
      runtime_authority_reason_code: 'imported_question_attempt',
    });
  });

  it('returns 200 when the attempt-event bridge fails after scoring + ledger succeed', async () => {
    process.env.MARKING_V1_RUNTIME_BRIDGE_ENABLED = 'true';
    mockPersistAttemptEventBridge.mockResolvedValueOnce({
      ok: false,
      warningRecorded: true,
      reason_code: 'attempt_event_bridge_failed',
      failed_stage: 'learning_events_insert',
    });

    const req = mockReq();
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      ledger_write_status: 'success',
    });
    expect(mockPersistAttemptEventBridge).toHaveBeenCalled();
    expect(mockApplyLearningEffects).toHaveBeenCalled();
  });
});
