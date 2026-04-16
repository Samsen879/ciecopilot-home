function createMockClient({
  learningEventsError = null,
  pipelineStateError = null,
  warningError = null,
  existingStreamHead = null,
} = {}) {
  const records = {
    learningEvents: null,
    pipelineState: null,
    bridgeWarning: null,
  };

  return {
    client: {
      from(table) {
        if (table === 'learning_events') {
          const query = {
            select: () => query,
            eq: () => query,
            order: () => query,
            limit: () => query,
            maybeSingle: async () => ({
              data: existingStreamHead,
              error: null,
            }),
          };

          return {
            ...query,
            insert: async (rows) => {
              records.learningEvents = rows;
              return { error: learningEventsError };
            },
          };
        }

        if (table === 'attempt_pipeline_state') {
          return {
            upsert: async (row) => {
              records.pipelineState = row;
              return { error: pipelineStateError };
            },
          };
        }

        if (table === 'error_events') {
          return {
            insert: async (rows) => {
              records.bridgeWarning = rows;
              return { error: warningError };
            },
          };
        }

        throw new Error(`unexpected_table:${table}`);
      },
    },
    records,
  };
}

function buildBridgeInput(overrides = {}) {
  return {
    attemptId: 'att-bridge-1',
    learnerId: 'user-bridge-1',
    subjectCode: '9709',
    markRunId: 'mr-bridge-1',
    questionId: 'question-bridge-1',
    storageKey: '9709/s22/qp11/q01.png',
    qNumber: 1,
    subpart: 'a_i',
    studentSteps: [{ step_id: 's1', text: 'x = 2' }],
    decisions: [
      {
        rubric_id: 'rubric-1',
        awarded: false,
        awarded_marks: 0,
        reason: 'algebra_error',
        alignment_confidence: 0.91,
      },
    ],
    questionContext: {
      source_kind: 'paper_question',
      family_id: '9709.trigonometry_manipulation_equations',
      question_type_id: '9709.trigonometry.equations',
      question_type_release_state: 'released',
      primary_topic_id: 'topic-trig-equations',
      primary_topic_path: '9709/trigonometry/equations',
      classification_confidence: 0.93,
      candidate_rubric_refs: [
        {
          kind: 'rubric_release',
          rubric_version_id: 'trig-v1',
          release_state: 'released',
        },
      ],
      release_scope_status: 'released_scoring',
    },
    attemptContext: {
      topic_id: 'topic-trig-equations',
      topic_path: '9709/trigonometry/equations',
    },
    authorityPosture: {
      release_scope_status: 'released_scoring',
      authoritative_scoring_allowed: true,
      fallback_mode: null,
      fallback_reason_code: null,
      classification_confidence: 0.93,
      learning_signal_posture: 'authoritative_scoring',
    },
    markingResult: {
      attempt_id: 'att-bridge-1',
      mark_run_id: 'mr-bridge-1',
      marking_summary: {
        coverage_scope: 'subpart',
      },
    },
    sourceAttemptRef: {
      kind: 'attempt',
      attempt_id: 'att-bridge-1',
    },
    sourceMarkRunRef: {
      kind: 'mark_run',
      mark_run_id: 'mr-bridge-1',
    },
    correlationId: '11111111-1111-1111-1111-111111111111',
    submittedAt: '2026-04-16T15:00:00.000Z',
    emittedAt: '2026-04-16T15:00:05.000Z',
    emittedBy: 'evaluate-v1',
    ...overrides,
  };
}

describe('attempt-event-service', () => {
  test('persists ordered attempt events through LearningUpdateProposed and upserts pipeline state', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();

    const result = await persistAttemptEventBridge(client, buildBridgeInput());

    expect(result).toMatchObject({
      ok: true,
      warningRecorded: false,
      persisted_event_types: [
        'AttemptSubmitted',
        'QuestionClassified',
        'MarkingCompleted',
        'LearningUpdateProposed',
      ],
      pipeline_state: {
        attempt_id: 'att-bridge-1',
        current_stage: 'LearningUpdateProposed',
        current_status: 'running',
        last_sequence_no: 4,
      },
    });

    expect(records.learningEvents).toHaveLength(4);
    expect(records.learningEvents.map((event) => event.event_type)).toEqual([
      'AttemptSubmitted',
      'QuestionClassified',
      'MarkingCompleted',
      'LearningUpdateProposed',
    ]);

    records.learningEvents.forEach((event, index) => {
      expect(event.aggregate_id).toBe('att-bridge-1');
      expect(event.payload.attempt_id).toBe('att-bridge-1');
      expect(event.sequence_no).toBe(index + 1);
      expect(event.payload.authority_posture).toMatchObject({
        authoritative_scoring_allowed: true,
        learning_signal_posture: 'authoritative_scoring',
      });
      expect(event.provenance.trust.authority_posture).toMatchObject({
        authoritative_scoring_allowed: true,
        learning_signal_posture: 'authoritative_scoring',
      });
    });

    expect(records.pipelineState).toMatchObject({
      attempt_id: 'att-bridge-1',
      learner_id: 'user-bridge-1',
      subject_code: '9709',
      current_stage: 'LearningUpdateProposed',
      current_status: 'running',
      last_sequence_no: 4,
    });
    expect(records.bridgeWarning).toBeNull();
  });

  test('records a durable bridge warning/debt row when persistence fails', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient({
      learningEventsError: { message: 'learning_events insert failed' },
    });

    const result = await persistAttemptEventBridge(client, buildBridgeInput());

    expect(result).toMatchObject({
      ok: false,
      warningRecorded: true,
      reason_code: 'attempt_event_bridge_failed',
      failed_stage: 'learning_events_insert',
    });
    expect(records.pipelineState).toBeNull();
    expect(records.bridgeWarning).toHaveLength(1);
    expect(records.bridgeWarning[0]).toMatchObject({
      attempt_id: 'att-bridge-1',
      mark_decision_id: null,
      severity: 'minor',
      misconception_tag: 'unclassified',
      metadata: {
        kind: 'attempt_event_bridge_warning',
        failed_stage: 'learning_events_insert',
        mark_run_id: 'mr-bridge-1',
        authority_posture: {
          authoritative_scoring_allowed: true,
          learning_signal_posture: 'authoritative_scoring',
        },
      },
    });
  });

  test('increments truth revision when the attempt already has persisted bridge events', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient({
      existingStreamHead: {
        truth_revision: 1,
        sequence_no: 4,
      },
    });

    const result = await persistAttemptEventBridge(client, buildBridgeInput({
      markRunId: 'mr-bridge-2',
      sourceMarkRunRef: {
        kind: 'mark_run',
        mark_run_id: 'mr-bridge-2',
      },
      markingResult: {
        attempt_id: 'att-bridge-1',
        mark_run_id: 'mr-bridge-2',
        marking_summary: {
          coverage_scope: 'subpart',
        },
      },
    }));

    expect(result).toMatchObject({
      ok: true,
      warningRecorded: false,
      pipeline_state: {
        attempt_id: 'att-bridge-1',
        current_truth_revision: 2,
        last_sequence_no: 4,
      },
    });

    expect(records.learningEvents).toHaveLength(4);
    records.learningEvents.forEach((event, index) => {
      expect(event.truth_revision).toBe(2);
      expect(event.sequence_no).toBe(index + 1);
    });
  });

  test('imported-question attempts stay durable while persisting explicit non-authoritative posture', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();

    const result = await persistAttemptEventBridge(client, buildBridgeInput({
      questionContext: {
        source_kind: 'imported_question',
        family_id: '9709.trigonometry_manipulation_equations',
        question_type_id: '9709.trigonometry.identities',
        question_type_release_state: 'released',
        primary_topic_id: 'topic-trig-identities',
        primary_topic_path: '9709/trigonometry/identities',
        classification_confidence: 0.95,
        candidate_rubric_refs: [
          {
            kind: 'rubric_release',
            rubric_version_id: 'trig-identities-v1',
            release_state: 'released',
          },
        ],
        release_scope_status: 'released_scoring',
      },
      authorityPosture: {
        release_scope_status: 'released_scoring',
        authoritative_scoring_allowed: true,
        fallback_mode: null,
        fallback_reason_code: null,
        classification_confidence: 0.95,
        learning_signal_posture: 'authoritative_scoring',
      },
    }));

    expect(result).toMatchObject({
      ok: true,
      warningRecorded: false,
      persisted_event_types: [
        'AttemptSubmitted',
        'QuestionClassified',
        'MarkingCompleted',
        'LearningUpdateProposed',
      ],
    });

    expect(records.learningEvents).toHaveLength(4);
    records.learningEvents.forEach((event) => {
      expect(event.payload.authority_posture).toMatchObject({
        authoritative_scoring_allowed: false,
        runtime_authority_posture: 'non_authoritative',
        runtime_authority_reason_code: 'imported_question_attempt',
        question_source_kind: 'imported_question',
      });
      expect(event.provenance.trust.authority_posture).toMatchObject({
        authoritative_scoring_allowed: false,
        runtime_authority_posture: 'non_authoritative',
        runtime_authority_reason_code: 'imported_question_attempt',
        question_source_kind: 'imported_question',
      });
    });
  });
});
