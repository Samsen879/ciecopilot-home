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
  sessions: new Map(),
};

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
    session_id: 'sess-1',
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
    clientState.sessions = new Map([
      ['sess-1', buildStoredSession()],
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

    const res = await request(server)
      .post('/api/learning/sessions/sess-1/ask')
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
        session: expect.objectContaining({
          session_id: 'sess-1',
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
});
