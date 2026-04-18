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
  markArtifactContested,
  normalizeAskResponse,
  normalizeArtifactResponse,
  normalizeImportQuestionResponse,
  normalizeQuestionSearchResponse,
  normalizeReviewTaskResponse,
  normalizeSessionResponse,
  pinArtifact,
  searchQuestions,
  supersedeArtifact,
  unpinArtifact,
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
      lineage: {
        parent_session_id: 'sess-parent-1',
        handoff_kind: 'explicit_new_session',
        summary_snapshot: {
          recap: 'Carry the recap into a fresh session.',
        },
      },
      handoff: {
        supported: true,
        lineage: {
          parent_session_id: 'sess-parent-1',
          handoff_kind: 'explicit_new_session',
          summary_snapshot: {
            recap: 'Carry the recap into a fresh session.',
          },
        },
        suggested_handoff: {
          supported: true,
          should_handoff: true,
          handoff_kind: 'internal_compaction',
          reason_code: 'session_turn_limit',
          message: 'Compact the current runtime state before the next return.',
          questionless: true,
        },
      },
      summary_state: {
        post_mortem_review: {
          scoring_posture: {
            release_scope_status: 'non_released_fallback',
            authoritative_scoring_allowed: false,
            fallback_reason_code: 'non_released_fallback',
          },
          diagnostic_focus: {
            title: 'Misconception-focused diagnostic',
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
              review_task_id: 'review-task-1',
              mode: 'spaced_review',
            },
          },
        },
      },
      resume_guidance: {
        title: 'Resume this session',
        message: 'Re-enter through the review-task anchor without inventing a question.',
        summary: 'Carry the recap into a fresh session.',
        questionless: true,
        anchor_kind: 'review_task',
        current_question_id: null,
        current_question_type_id: '9709.trigonometry.equations',
        parent_session_id: 'sess-parent-1',
        handoff_kind: 'explicit_new_session',
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
      learning_runtime_9709_enabled: true,
    },
    request_id: 'req-session-1',
  };
}

function createAskEnvelope() {
  return {
    assistant_message: 'Start by isolating sin(2x) before you expand anything else.',
    evidence_summary: {
      source_topic_path: '9709/trigonometry/equations',
      retrieved_evidence_count: 2,
    },
    fallback_posture: {
      fallback_mode: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'non_pilot_question_type',
      classification_confidence: null,
      learning_signal_posture: 'conservative_fallback',
    },
    session_delta: {
      client_turn_id: 'local-turn-002',
      current_question_ref: null,
      current_question_type_ref: {
        kind: 'question_type',
        question_type_id: '9709.trigonometry.equations',
      },
    },
    suggested_actions: [
      {
        kind: 'review_workspace',
        workspace_id: 'workspace-1',
      },
    ],
    request_id: 'req-ask-2',
  };
}

function createImportEnvelope() {
  return {
    question: {
      question_id: 'question-import-1',
      source_kind: 'imported_question',
      subject_code: '9709',
      primary_topic_id: 'topic-integration-1',
      family_id: '9709.integration_techniques',
      primary_question_type_id: '9709.integration.application',
      release_scope_status: 'non_released_fallback',
      prompt_representation: {
        type: 'text',
        value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
      },
      provenance_summary: {
        import_source: 'manual_paste',
      },
    },
    scoring_scope_posture: {
      release_scope_status: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'non_pilot_question_type',
      classification_confidence: 0.77,
      learning_signal_posture: 'conservative_fallback',
    },
    request_id: 'req-import-1',
  };
}

function createReviewTaskEnvelope() {
  return {
    review_task: {
      review_task_id: 'review-task-1',
      target_topic_id: 'topic-trig-equations',
      target_topic_path: '9709/trigonometry/equations',
      target_question_type_id: '9709.trigonometry.equations',
      target_question_type_title: 'Trigonometric equations',
      mode: 'redo_variant',
      status: 'completed',
      due_at: '2026-03-23T00:00:00.000Z',
      estimated_minutes: 15,
      completion_evidence: {
        summary: 'Solved a fresh repair variant.',
        outcome: 'completed',
      },
    },
    request_id: 'req-review-task-1',
  };
}

function createQuestionSearchEnvelope() {
  return {
    items: [
      {
        question_id: 'question-paper-1',
        source_kind: 'paper_question',
        subject_code: '9709',
        primary_topic_title: 'Trigonometric equations',
        primary_question_type_id: '9709.trigonometry.equations',
        q_number: 6,
        product_posture: {
          code: 'paper_backed',
          label: 'Paper-backed',
          is_provisional: false,
        },
        product_card: {
          title: 'S19 P1 Q6',
          meta_line: 'Trigonometric equations',
          summary_line: 'Prove a trigonometric identity and solve the resulting equation.',
        },
      },
      {
        question_id: 'question-imported-1',
        source_kind: 'imported_question',
        subject_code: '9709',
        primary_topic_title: 'Trigonometric equations',
        primary_question_type_id: '9709.trigonometry.equations',
        q_number: 91,
        product_posture: {
          code: 'imported_provisional',
          label: 'Imported / provisional',
          is_provisional: true,
        },
        product_card: {
          title: 'Imported question',
          meta_line: 'Trigonometric equations',
          summary_line: null,
        },
      },
    ],
    total: 2,
    page: 1,
    page_size: 20,
    feature_flags: {
      question_search_product_enabled: true,
    },
    request_id: 'req-question-search-1',
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
      'markArtifactContested',
      'pinArtifact',
      'searchQuestions',
      'supersedeArtifact',
      'unpinArtifact',
      'updateReviewTask',
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
    expect(payload.session.lineage).toEqual(expect.objectContaining({
      parentSessionId: 'sess-parent-1',
      handoffKind: 'explicit_new_session',
    }));
    expect(payload.session.handoff).toEqual(expect.objectContaining({
      supported: true,
      suggestedHandoff: expect.objectContaining({
        shouldHandoff: true,
        handoffKind: 'internal_compaction',
      }),
    }));
    expect(payload.session.resumeGuidance).toEqual(expect.objectContaining({
      questionless: true,
      parentSessionId: 'sess-parent-1',
      handoffKind: 'explicit_new_session',
    }));
    expect(payload.featureFlags).toEqual({
      learningRuntimeEnabled: true,
      learningRuntime9709Enabled: true,
    });
    expect(payload.session.summaryState.postMortemReview).toEqual({
      scoringPosture: {
        releaseScopeStatus: 'non_released_fallback',
        authoritativeScoringAllowed: false,
        fallbackReasonCode: 'non_released_fallback',
      },
      diagnosticFocus: {
        title: 'Misconception-focused diagnostic',
        sourceAttemptRef: {
          kind: 'attempt',
          attemptId: 'attempt-trig-1',
        },
        sourceMarkRunRef: {
          kind: 'mark_run',
          markRunId: 'mark-run-trig-1',
        },
      },
      artifactCandidates: [
        {
          artifactId: 'artifact-misconception-1',
          artifactKind: 'misconception_card',
        },
      ],
      repairHandoff: {
        actionLabel: 'Launch repair session',
        launchPayload: {
          anchorKind: 'review_task',
          reviewTaskId: 'review-task-1',
          mode: 'spaced_review',
        },
      },
    });
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

  test('normalizes imported question envelopes and explicit scoring posture', () => {
    const payload = normalizeImportQuestionResponse(createImportEnvelope());

    expect(payload.question).toEqual(expect.objectContaining({
      questionId: 'question-import-1',
      sourceKind: 'imported_question',
      primaryTopicId: 'topic-integration-1',
      primaryQuestionTypeId: '9709.integration.application',
      releaseScopeStatus: 'non_released_fallback',
    }));
    expect(payload.question.promptRepresentation).toEqual({
      type: 'text',
      value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
    });
    expect(payload.scoringScopePosture).toEqual({
      releaseScopeStatus: 'non_released_fallback',
      authoritativeScoringAllowed: false,
      fallbackMode: 'non_released_fallback',
      fallbackReasonCode: 'non_pilot_question_type',
      classificationConfidence: 0.77,
      learningSignalPosture: 'conservative_fallback',
    });
  });

  test('normalizes question-search envelopes and preserves product posture/card fields', () => {
    const payload = normalizeQuestionSearchResponse(createQuestionSearchEnvelope());

    expect(payload.items.map((item) => item.questionId)).toEqual([
      'question-paper-1',
      'question-imported-1',
    ]);
    expect(payload.items[0].productPosture).toEqual({
      code: 'paper_backed',
      label: 'Paper-backed',
      isProvisional: false,
    });
    expect(payload.items[0].productCard).toEqual({
      title: 'S19 P1 Q6',
      metaLine: 'Trigonometric equations',
      summaryLine: 'Prove a trigonometric identity and solve the resulting equation.',
    });
    expect(payload.items[1].productPosture).toEqual({
      code: 'imported_provisional',
      label: 'Imported / provisional',
      isProvisional: true,
    });
    expect(payload.items[1].productCard.summaryLine).toBeNull();
    expect(payload.featureFlags).toEqual({
      questionSearchProductEnabled: true,
    });
  });

  test('normalizes review-task write envelopes for actionable queue feedback', () => {
    const payload = normalizeReviewTaskResponse(createReviewTaskEnvelope());

    expect(payload.reviewTask).toEqual(expect.objectContaining({
      reviewTaskId: 'review-task-1',
      targetTopicId: 'topic-trig-equations',
      targetQuestionTypeTitle: 'Trigonometric equations',
      status: 'completed',
      completionEvidence: {
        summary: 'Solved a fresh repair variant.',
        outcome: 'completed',
      },
    }));
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

  test('askInSession posts follow-up turns and normalizes the live session delta', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createAskEnvelope(),
    });

    const response = await learningRuntimeApi.askInSession('sess-1', {
      message: 'Give me the next hint only.',
      client_turn_id: 'local-turn-002',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/learning/sessions/sess-1/ask');

    const init = global.fetch.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body)).toEqual({
      message: 'Give me the next hint only.',
      client_turn_id: 'local-turn-002',
    });
    expect(response.fallbackPosture).toEqual(expect.objectContaining({
      fallbackMode: 'non_released_fallback',
      fallbackReasonCode: 'non_pilot_question_type',
    }));
    expect(response.sessionDelta).toEqual(expect.objectContaining({
      clientTurnId: 'local-turn-002',
      currentQuestion: null,
      currentQuestionType: {
        kind: 'question_type',
        questionTypeId: '9709.trigonometry.equations',
      },
    }));
  });

  test('importQuestion posts imported-question payloads to the shared learning route', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createImportEnvelope(),
    });

    const response = await learningRuntimeApi.importQuestion({
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
      },
      provenance_summary: {
        import_source: 'manual_paste',
      },
      classification: {
        primary_question_type_id: '9709.integration.application',
        primary_topic_id: 'topic-integration-1',
      },
    }, {
      idempotencyKey: 'import-question-45',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/learning/questions/import');

    const init = global.fetch.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'import-question-45',
    });
    expect(JSON.parse(init.body)).toMatchObject({
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
      },
      classification: {
        primary_question_type_id: '9709.integration.application',
        primary_topic_id: 'topic-integration-1',
      },
    });
    expect(response.question.questionId).toBe('question-import-1');
    expect(response.scoringScopePosture.fallbackMode).toBe('non_released_fallback');
  });

  test('searchQuestions encodes the shared query contract and normalizes product search results', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createQuestionSearchEnvelope(),
    });

    const response = await searchQuestions({
      subjectCode: '9709',
      primaryQuestionTypeId: '9709.trigonometry.equations',
      query: 'identity solve equation',
      page: 1,
      pageSize: 20,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe(
      '/api/learning/questions?subject_code=9709&primary_question_type_id=9709.trigonometry.equations&query=identity+solve+equation&page=1&page_size=20',
    );
    expect(global.fetch.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-123',
      },
    });
    expect(response.items[0].productCard.title).toBe('S19 P1 Q6');
    expect(response.items[1].productPosture.label).toBe('Imported / provisional');
    expect(response.featureFlags.questionSearchProductEnabled).toBe(true);
  });

  test('createSession throws structured learning runtime errors for actionable UI states', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({
        request_id: 'req-create-error-1',
        error: {
          code: 'unsupported_mode_for_anchor',
          message: 'This mode is not allowed for the anchor kind.',
          retryable: false,
          details: {
            anchor_kind: 'concept',
            mode: 'spaced_review',
          },
        },
      }),
    });

    await expect(learningRuntimeApi.createSession({
      subject_code: '9709',
      mode: 'spaced_review',
      anchor_kind: 'concept',
      anchor_ref: {
        kind: 'concept',
        topic_id: 'topic-trig-identities',
        topic_path: '9709/trigonometry/identities',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
    })).rejects.toMatchObject({
      name: 'LearningRuntimeApiError',
      status: 409,
      code: 'unsupported_mode_for_anchor',
      retryable: false,
      requestId: 'req-create-error-1',
      details: {
        anchor_kind: 'concept',
        mode: 'spaced_review',
      },
    });
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

  test('pinArtifact and unpinArtifact send explicit placement intents and normalize slot transitions', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifact: {
            artifact_id: 'artifact-note-1',
            artifact_kind: 'free_note',
            slot_key: 'my_notes',
            placement_status: 'pinned',
            lifecycle_status: 'active',
          },
          slot_transition: {
            outcome: 'pinned_to_slot',
            slot_key: 'my_notes',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifact: {
            artifact_id: 'artifact-note-1',
            artifact_kind: 'free_note',
            slot_key: 'my_notes',
            placement_status: 'inbox',
            lifecycle_status: 'active',
          },
          slot_transition: {
            outcome: 'slot_cleared',
            slot_key: 'my_notes',
          },
        }),
      });

    const pinned = await pinArtifact('artifact-note-1');
    const unpinned = await unpinArtifact('artifact-note-1');

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      intent: 'set_placement_status',
      placement_status: 'pinned',
    });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      intent: 'set_placement_status',
      placement_status: 'inbox',
    });
    expect(pinned.slotTransition).toEqual({
      outcome: 'pinned_to_slot',
      slotKey: 'my_notes',
    });
    expect(unpinned.slotTransition).toEqual({
      outcome: 'slot_cleared',
      slotKey: 'my_notes',
    });
  });

  test('markArtifactContested and supersedeArtifact use explicit lifecycle intents', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifact: {
            artifact_id: 'artifact-contested',
            artifact_kind: 'misconception_card',
            slot_key: 'common_traps',
            trust_status: 'contested',
            placement_status: 'inbox',
            lifecycle_status: 'active',
          },
          slot_transition: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          artifact: {
            artifact_id: 'artifact-primary',
            artifact_kind: 'misconception_card',
            slot_key: 'common_traps',
            placement_status: 'archived',
            lifecycle_status: 'superseded',
            superseded_by_artifact_id: 'artifact-successor',
          },
          slot_transition: {
            outcome: 'moved_to_successor',
            slot_key: 'common_traps',
          },
        }),
      });

    const contested = await markArtifactContested('artifact-contested');
    const superseded = await supersedeArtifact('artifact-primary', {
      kind: 'artifact',
      artifact_id: 'artifact-successor',
    });

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      intent: 'mark_contested',
    });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      intent: 'attach_superseded_by',
      successor_artifact_ref: {
        kind: 'artifact',
        artifact_id: 'artifact-successor',
      },
    });
    expect(contested.artifact.trustStatus).toBe('contested');
    expect(superseded.artifact.supersededByArtifactId).toBe('artifact-successor');
    expect(superseded.slotTransition).toEqual({
      outcome: 'moved_to_successor',
      slotKey: 'common_traps',
    });
  });

  test('normalizeArtifactResponse camelizes artifact lifecycle payloads', () => {
    const payload = normalizeArtifactResponse({
      artifact: {
        artifact_id: 'artifact-primary',
        slot_key: 'common_traps',
        superseded_by_artifact_id: 'artifact-successor',
      },
      slot_transition: {
        outcome: 'slot_cleared_pending_confirmation',
        slot_key: 'common_traps',
      },
    });

    expect(payload.artifact).toEqual({
      artifactId: 'artifact-primary',
      slotKey: 'common_traps',
      supersededByArtifactId: 'artifact-successor',
    });
    expect(payload.slotTransition).toEqual({
      outcome: 'slot_cleared_pending_confirmation',
      slotKey: 'common_traps',
    });
  });

  test('updateReviewTask posts explicit write intents to the runtime queue endpoint', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => createReviewTaskEnvelope(),
    });

    const payload = await learningRuntimeApi.updateReviewTask('review-task-1', {
      intent: 'complete',
      completionOutcome: 'completed',
      completionEvidence: {
        summary: 'Solved a fresh repair variant.',
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/learning/review-tasks/review-task-1',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          intent: 'complete',
          completion_outcome: 'completed',
          completion_evidence: {
            summary: 'Solved a fresh repair variant.',
          },
        }),
      }),
    );
    expect(payload.reviewTask).toEqual(expect.objectContaining({
      reviewTaskId: 'review-task-1',
      status: 'completed',
    }));
  });
});
