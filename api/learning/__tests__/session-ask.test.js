import { jest } from '@jest/globals';
import { createLoopbackHttpTestClient } from './loopback-test-client.js';

process.env.NODE_ENV = 'test';
process.env.AUTH_LOCAL_TEST_MODE = 'true';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const clientState = {
  sessions: new Map(),
};

const SESSION_ID = '33333333-3333-4333-8333-333333333333';

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
  }

  select() {
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  maybeSingle() {
    return Promise.resolve(resolveQuery(this.table, this.filters));
  }
}

function findFilter(filters, field) {
  return filters.find((filter) => filter.field === field)?.value ?? null;
}

function resolveQuery(table, filters) {
  if (table === 'learning_session_resume_projection') {
    const sessionId = findFilter(filters, 'session_id');
    const userId = findFilter(filters, 'user_id');
    const row = clientState.sessions.get(sessionId) || null;

    if (!row || (userId && row.user_id !== userId)) {
      return { data: null, error: null };
    }

    return { data: row, error: null };
  }

  throw new Error(`Unhandled learning query: ${table}`);
}

const mockGetServiceClient = jest.fn(() => ({
  from(table) {
    return new QueryBuilder(table);
  },
}));

const mockAskWithinLearningSession = jest.fn();

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

jest.unstable_mockModule('../../rag/lib/ask-service.js', () => ({
  askWithinLearningSession: mockAskWithinLearningSession,
}));

const { default: apiHandler } = await import('../../index.js');

function buildStoredSession(overrides = {}) {
  return {
    session_id: SESSION_ID,
    user_id: 'student-1',
    subject_code: '9709',
    session_goal: 'Repair integration setup',
    mode: 'spaced_review',
    state: 'active',
    active_scope_bundle: {
      primary_topic_id: 'topic-integration-1',
      primary_topic_path: '9709.integration.application',
      secondary_topics_in_scope: [],
      allowed_prerequisites: [],
      paper_context: null,
      mode: 'spaced_review',
      session_goal: 'Repair integration setup',
      current_anchor_kind: 'workspace_slot',
      current_anchor_ref: {
        kind: 'workspace_slot',
        workspace_id: 'workspace-1',
        slot_key: 'review_queue',
      },
      current_question_ref: null,
      current_question_type_ref: {
        kind: 'question_type',
        question_type_id: '9709.integration.application',
      },
    },
    current_anchor_kind: 'workspace_slot',
    current_anchor_ref: {
      kind: 'workspace_slot',
      workspace_id: 'workspace-1',
      slot_key: 'review_queue',
    },
    current_question_id: null,
    current_question_type_id: '9709.integration.application',
    summary_state: {},
    open_questions: [],
    key_artifact_refs: [],
    misconceptions_in_focus: [],
    parent_session_id: null,
    handoff_kind: null,
    summary_snapshot: {},
    created_at: '2026-03-21T13:30:00.000Z',
    updated_at: '2026-03-21T13:30:00.000Z',
    ...overrides,
  };
}

describe('learning session ask api', () => {
  let harness;

  beforeAll(async () => {
    harness = await createLoopbackHttpTestClient(apiHandler);
  });

  afterAll(async () => {
    await harness?.close();
  });

  beforeEach(() => {
    clientState.sessions = new Map([
      [SESSION_ID, buildStoredSession()],
    ]);
    mockAskWithinLearningSession.mockReset();
    mockGetServiceClient.mockClear();
  });

  test('POST /api/learning/sessions/:id/ask returns the frozen session-ask response fields', async () => {
    mockAskWithinLearningSession.mockResolvedValue({
      assistant_message: 'I can help with a conservative walkthrough here.',
      evidence_summary: {
        source_topic_path: '9709.integration.application',
        retrieved_evidence_count: 0,
      },
      fallback_posture: {
        fallback_mode: 'non_released_fallback',
        authoritative_scoring_allowed: false,
        fallback_reason_code: 'non_pilot_question_type',
        classification_confidence: null,
        learning_signal_posture: 'conservative_fallback',
      },
      session_delta: {
        client_turn_id: 'local-turn-001',
        current_question_ref: null,
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.integration.application',
        },
      },
      suggested_actions: [
        {
          kind: 'review_workspace',
          workspace_id: 'workspace-1',
        },
      ],
    });

    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Can you give me the next hint only?',
        client_turn_id: 'local-turn-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.assistant_message).toBeDefined();
    expect(res.body.evidence_summary).toBeDefined();
    expect(res.body.fallback_posture).toBeDefined();
    expect(res.body.session_delta).toBeDefined();
    expect(res.body.suggested_actions).toBeDefined();
    expect(mockAskWithinLearningSession).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: expect.any(Object),
        req: expect.any(Object),
      }),
      expect.objectContaining({
        message: 'Can you give me the next hint only?',
        clientTurnId: 'local-turn-001',
        clientContext: {},
        session: expect.objectContaining({
          session_id: SESSION_ID,
          active_scope_bundle: expect.objectContaining({
            current_question_ref: null,
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.integration.application',
            },
          }),
        }),
      }),
    );
  });

  test('POST /api/learning/sessions/:id/ask forwards the persisted active_scope_bundle without collapsing compatibility refs', async () => {
    const persistedBundle = {
      primary_topic_id: 'topic-trig-equations',
      primary_topic_path: '9709.trigonometry.equations',
      secondary_topics_in_scope: [
        {
          kind: 'topic',
          topic_id: 'topic-trig-identities',
          topic_path: '9709.trigonometry.identities',
        },
      ],
      allowed_prerequisites: [
        {
          kind: 'topic',
          topic_id: 'topic-basic-angles',
          topic_path: '9709.trigonometry.basic_angles',
        },
      ],
      paper_context: {
        paper_scope: '9709:paper:p1',
        paper_workspace_ref: {
          kind: 'paper_workspace',
          paper_workspace_id: 'paper-workspace-p1',
        },
        topic_section_ref: {
          kind: 'paper_workspace_topic_section',
          paper_workspace_topic_section_id: 'section-topic-trig-equations',
          topic_id: 'topic-trig-equations',
        },
      },
      mode: 'learn_concept',
      session_goal: 'Continue from a paper workspace overview slot',
      current_anchor_kind: 'workspace_slot',
      current_anchor_ref: {
        kind: 'workspace_slot',
        workspace_id: 'workspace-topic-trig-equations',
        slot_key: 'overview_map',
      },
      current_question_ref: null,
      current_question_type_ref: null,
    };
    clientState.sessions.set(SESSION_ID, buildStoredSession({
      session_goal: 'Continue from a paper workspace overview slot',
      mode: 'learn_concept',
      active_scope_bundle: persistedBundle,
      current_anchor_kind: 'workspace_slot',
      current_anchor_ref: persistedBundle.current_anchor_ref,
      current_question_id: null,
      current_question_type_id: null,
    }));
    mockAskWithinLearningSession.mockResolvedValue({
      assistant_message: 'Use the overview slot to choose the next worked example.',
      evidence_summary: {
        source_topic_path: '9709.trigonometry.equations',
        retrieved_evidence_count: 0,
      },
      fallback_posture: {
        fallback_mode: 'non_released_fallback',
        authoritative_scoring_allowed: false,
        fallback_reason_code: 'non_pilot_question_type',
        classification_confidence: null,
        learning_signal_posture: 'conservative_fallback',
      },
      session_delta: {
        client_turn_id: 'local-turn-bundle-001',
        current_question_ref: null,
        current_question_type_ref: null,
      },
      suggested_actions: [
        {
          kind: 'continue_session',
          anchor_kind: 'workspace_slot',
        },
      ],
    });

    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'What should I focus on next?',
        client_turn_id: 'local-turn-bundle-001',
      });

    expect(res.status).toBe(200);
    expect(mockAskWithinLearningSession).toHaveBeenCalledTimes(1);
    expect(mockAskWithinLearningSession.mock.calls[0][1].session).toMatchObject({
      session_id: SESSION_ID,
      current_question_id: null,
      current_question_type_id: null,
      active_scope_bundle: persistedBundle,
    });
    expect(
      mockAskWithinLearningSession.mock.calls[0][1].session.active_scope_bundle.secondary_topics_in_scope,
    ).toHaveLength(1);
    expect(
      mockAskWithinLearningSession.mock.calls[0][1].session.active_scope_bundle.allowed_prerequisites,
    ).toHaveLength(1);
  });

  test('POST /api/learning/sessions/:id/ask rejects topic drift before AskAI becomes authoritative', async () => {
    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Can we continue from the paper section?',
        client_turn_id: 'local-turn-drift-001',
        client_context: {
          active_scope_bundle: {
            primary_topic_path: '9709.trigonometry.equations',
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.trigonometry.equations',
            },
          },
        },
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'session_state_conflict',
      details: {
        reason_code: 'topic_drift_detected',
        context_health: {
          status: 'handoff_required',
          authoritative_active_scope: false,
          reason_code: 'topic_drift_detected',
        },
        topic_drift: {
          detected: true,
          reason_code: 'primary_topic_path_mismatch',
          stored_primary_topic_path: '9709.integration.application',
          requested_primary_topic_path: '9709.trigonometry.equations',
        },
        suggested_handoff: {
          should_handoff: true,
          handoff_kind: 'explicit_new_session',
          reason_code: 'topic_drift_detected',
        },
        resume_validation: {
          valid: false,
          safe_continuation: false,
          reason_code: 'topic_drift_detected',
        },
      },
    });
    expect(mockAskWithinLearningSession).not.toHaveBeenCalled();
  });

  test('POST /api/learning/sessions/:id/ask rejects client placeholder question ids for questionless sessions', async () => {
    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Continue on this question.',
        client_turn_id: 'local-turn-placeholder-001',
        client_context: {
          active_scope_bundle: {
            primary_topic_path: '9709.integration.application',
            current_question_ref: {
              kind: 'question',
              question_id: 'client-placeholder-question',
            },
          },
        },
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'session_state_conflict',
      details: {
        reason_code: 'topic_drift_detected',
        topic_drift: {
          detected: true,
          reason_code: 'current_question_mismatch',
          stored_current_question_id: null,
          requested_current_question_id: 'client-placeholder-question',
        },
      },
    });
    expect(mockAskWithinLearningSession).not.toHaveBeenCalled();
  });

  test('POST /api/learning/sessions/:id/ask rejects incomplete active scope before AskAI runs', async () => {
    clientState.sessions.set(SESSION_ID, buildStoredSession({
      active_scope_bundle: {
        primary_topic_id: 'topic-integration-1',
        primary_topic_path: '9709.integration.application',
        secondary_topics_in_scope: [],
        allowed_prerequisites: [],
        paper_context: null,
        mode: 'spaced_review',
        session_goal: 'Repair integration setup',
        current_question_ref: null,
        current_question_type_ref: {
          kind: 'question_type',
          question_type_id: '9709.integration.application',
        },
      },
      current_anchor_kind: null,
      current_anchor_ref: null,
    }));

    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Can we continue?',
        client_turn_id: 'local-turn-incomplete-001',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'session_state_conflict',
      details: {
        reason_code: 'active_scope_bundle_incomplete',
        context_health: {
          status: 'handoff_required',
          authoritative_active_scope: false,
          reason_code: 'active_scope_bundle_incomplete',
        },
        topic_drift: {
          detected: false,
        },
        suggested_handoff: {
          should_handoff: true,
          handoff_kind: 'explicit_new_session',
          reason_code: 'active_scope_bundle_incomplete',
        },
        resume_validation: {
          valid: false,
          safe_continuation: false,
          reason_code: 'active_scope_bundle_incomplete',
        },
      },
    });
    expect(mockAskWithinLearningSession).not.toHaveBeenCalled();
  });

  test('POST /api/learning/sessions/:id/ask maps unknown ask failures to internal_error with 500', async () => {
    mockAskWithinLearningSession.mockRejectedValue(new Error('workspace projection crashed'));

    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Can you give me the next hint only?',
        client_turn_id: 'local-turn-002',
      });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      request_id: expect.any(String),
      error: {
        code: 'internal_error',
        retryable: false,
      },
    });
  });

  test('POST /api/learning/sessions/:id/ask preserves typed session_state_conflict failures', async () => {
    const error = new Error('session became terminal');
    error.code = 'session_state_conflict';
    error.status = 409;
    error.retryable = false;
    error.details = { state: 'completed' };
    mockAskWithinLearningSession.mockRejectedValue(error);

    const res = await harness.request
      .post(`/api/learning/sessions/${SESSION_ID}/ask`)
      .set('Origin', 'http://localhost:3000')
      .set('Authorization', 'Bearer test-user:student-1:student')
      .send({
        message: 'Can you give me the next hint only?',
        client_turn_id: 'local-turn-003',
      });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      request_id: expect.any(String),
      error: {
        code: 'session_state_conflict',
        retryable: false,
        details: { state: 'completed' },
      },
    });
  });
});
