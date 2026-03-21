import { jest } from '@jest/globals';

const mockRequireSessionAccessToken = jest.fn();
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
  },
};

jest.unstable_mockModule('../../services/utils/sessionAccessToken.js', () => ({
  requireSessionAccessToken: mockRequireSessionAccessToken,
}));

jest.unstable_mockModule('../../utils/supabase.js', () => ({
  supabase: mockSupabase,
}));

const {
  learningRuntimeApi,
  normalizeAskResponse,
  normalizeSessionResponse,
} = await import('../learningRuntimeApi.js');

function createSessionEnvelope() {
  return {
    session: {
      session_id: 'sess-1',
      mode: 'spaced_review',
      state: 'active',
      session_goal: 'Repair trigonometric equation solving',
      current_anchor_kind: 'review_task',
      current_anchor_ref: {
        kind: 'review_task',
        review_task_id: 'review-task-1',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.equations',
      active_scope_bundle: {
        primary_topic_id: 'topic-trig-equations',
        primary_topic_path: '9709/trigonometry/equations',
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
      },
      lineage_ref: {
        parent_session_id: null,
        handoff_kind: null,
      },
      open_questions: [],
      key_artifact_refs: [],
      misconceptions_in_focus: [],
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
    },
    anchor_validity: {
      ok: true,
      anchor_kind: 'review_task',
      anchor_ref: {
        kind: 'review_task',
        review_task_id: 'review-task-1',
      },
      canonical_home_topic_ref: {
        kind: 'topic',
        topic_id: 'topic-trig-equations',
        topic_path: '9709/trigonometry/equations',
      },
    },
    canonical_home_context: {
      source_anchor_kind: 'review_task',
      topic_ref: {
        kind: 'topic',
        topic_id: 'topic-trig-equations',
        topic_path: '9709/trigonometry/equations',
      },
    },
    feature_flags: {
      learning_runtime_enabled: true,
      session_create_read_enabled: true,
    },
    request_id: 'req-session-1',
  };
}

describe('learning runtime api', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockRequireSessionAccessToken.mockReset();
    mockRequireSessionAccessToken.mockResolvedValue('token-123');
    mockSupabase.auth.getSession.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('exports the shared session, workspace, import, and artifact contract', () => {
    expect(Object.keys(learningRuntimeApi).sort()).toEqual([
      'askInSession',
      'createSession',
      'getSession',
      'getWorkspace',
      'importQuestion',
      'listReviewTasks',
      'updateArtifact',
    ].sort());
  });

  test('normalizes typed anchor refs from session envelopes into frontend fields', () => {
    const payload = normalizeSessionResponse(createSessionEnvelope());

    expect(payload.session.activeScope.currentAnchor).toEqual({
      kind: 'review_task',
      reviewTaskId: 'review-task-1',
    });
    expect(payload.session.activeScope.currentQuestionType).toEqual({
      kind: 'question_type',
      questionTypeId: '9709.trigonometry.equations',
    });
    expect(payload.anchorValidity.anchorRef.reviewTaskId).toBe('review-task-1');
    expect(payload.canonicalHomeContext.topicRef.topicPath).toBe('9709/trigonometry/equations');
    expect(payload.session.currentQuestion).toBeNull();
    expect(payload.session.currentQuestionTypeId).toBe('9709.trigonometry.equations');
  });

  test('normalizes fallback posture and typed refs from ask responses', () => {
    const payload = normalizeAskResponse({
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
      request_id: 'req-ask-1',
    });

    expect(payload.fallbackPosture).toEqual({
      fallbackMode: 'non_released_fallback',
      authoritativeScoringAllowed: false,
      fallbackReasonCode: 'non_pilot_question_type',
      classificationConfidence: null,
      learningSignalPosture: 'conservative_fallback',
    });
    expect(payload.sessionDelta.currentQuestion).toBeNull();
    expect(payload.sessionDelta.currentQuestionType).toEqual({
      kind: 'question_type',
      questionTypeId: '9709.integration.application',
    });
    expect(payload.suggestedActions[0]).toEqual({
      kind: 'review_workspace',
      workspaceId: 'workspace-1',
    });
  });

  test('createSession posts to the learning runtime route with auth and idempotency headers', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createSessionEnvelope(),
    });

    const response = await learningRuntimeApi.createSession({
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
    }, {
      idempotencyKey: 'session-create-24',
    });

    expect(mockRequireSessionAccessToken).toHaveBeenCalledWith(mockSupabase);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/learning/sessions');

    const init = global.fetch.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'session-create-24',
    });
    expect(JSON.parse(init.body)).toMatchObject({
      anchor_kind: 'review_task',
      current_question_type_id: '9709.trigonometry.equations',
    });

    expect(response.session.activeScope.currentAnchor.reviewTaskId).toBe('review-task-1');
  });

  test('listReviewTasks encodes the frozen query params for the shared client surface', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        scope: 'global_queue_projection',
        topic_id: 'topic-1',
        status: 'queued',
        due_before: '2026-03-22',
        items: [
          {
            review_task_id: 'review-queued-1',
          },
        ],
        request_id: 'req-review-1',
      }),
    });

    const payload = await learningRuntimeApi.listReviewTasks({
      topicId: 'topic-1',
      status: 'queued',
      dueBefore: '2026-03-22',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/learning/review-tasks?topic_id=topic-1&status=queued&due_before=2026-03-22',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
    expect(payload.topicId).toBe('topic-1');
    expect(payload.items[0].reviewTaskId).toBe('review-queued-1');
  });
});
