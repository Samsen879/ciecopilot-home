function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createInMemoryEffectRepository() {
  const receipts = new Map();

  function keyFor(handlerName, effectKey) {
    return `${handlerName}::${effectKey}`;
  }

  return {
    async reserveEffectReceipt(input = {}) {
      const key = keyFor(input.handler_name, input.effect_key);
      const existing = receipts.get(key) ?? null;

      if (existing) {
        if (existing.status === 'failed' && existing.receipt_state === 'retrying') {
          const retried = {
            ...existing,
            event_id: input.event_id,
            aggregate_id: input.aggregate_id,
            truth_revision: input.truth_revision,
            reconciliation_id: input.reconciliation_id ?? null,
            proposal_key: input.proposal_key ?? existing.proposal_key ?? null,
            status: 'started',
            receipt_state: 'pending',
            attempt_count: Number(existing.attempt_count ?? 0) + 1,
            last_attempted_at: '2026-04-17T10:05:00.000Z',
            last_error: null,
          };
          receipts.set(key, retried);
          return {
            inserted: true,
            reason_code: 'retry_failed_effect',
            receipt: clone(retried),
          };
        }

        return {
          inserted: false,
          reason_code: 'duplicate_effect_key',
          receipt: clone(existing),
        };
      }

      const receipt = {
        effect_id: `effect-${receipts.size + 1}`,
        proposal_key: input.proposal_key ?? null,
        event_id: input.event_id,
        aggregate_id: input.aggregate_id,
        truth_revision: input.truth_revision,
        reconciliation_id: input.reconciliation_id ?? null,
        handler_name: input.handler_name,
        effect_key: input.effect_key,
        status: 'started',
        receipt_state: 'pending',
        retry_count: 0,
        attempt_count: 1,
        last_attempted_at: '2026-04-17T10:00:00.000Z',
        last_error: null,
        result_ref_type: null,
        result_ref_id: null,
      };
      receipts.set(key, receipt);

      return {
        inserted: true,
        reason_code: null,
        receipt: clone(receipt),
      };
    },

    async markEffectReceiptSucceeded({
      handler_name: handlerName,
      effect_key: effectKey,
      status = 'succeeded',
      result_ref_type: resultRefType = null,
      result_ref_id: resultRefId = null,
    } = {}) {
      const key = keyFor(handlerName, effectKey);
      const receipt = receipts.get(key);
      const succeeded = {
        ...receipt,
        status,
        receipt_state: 'persisted',
        result_ref_type: resultRefType,
        result_ref_id: resultRefId,
        last_error: null,
      };
      receipts.set(key, succeeded);
      return clone(succeeded);
    },

    async markEffectReceiptFailed({
      handler_name: handlerName,
      effect_key: effectKey,
      error_code: errorCode = 'effect_execution_failed',
      error_message: errorMessage = 'effect execution failed',
      receipt_state: receiptState = 'retrying',
    } = {}) {
      const key = keyFor(handlerName, effectKey);
      const receipt = receipts.get(key);
      const failed = {
        ...receipt,
        status: 'failed',
        receipt_state: receiptState,
        retry_count: Number(receipt?.retry_count ?? 0) + 1,
        last_error: {
          code: errorCode,
          message: errorMessage,
        },
      };
      receipts.set(key, failed);
      return clone(failed);
    },

    async listEffectReceiptsByEventId(eventId) {
      return [...receipts.values()]
        .filter((receipt) => receipt.event_id === eventId)
        .map((receipt) => clone(receipt));
    },
  };
}

function createMockClient({
  learningEventsError = null,
  pipelineStateError = null,
  warningError = null,
  existingStreamHead = null,
  existingDeliveryRow = null,
  existingLearningEvents = [],
  failLearningEventReads = false,
} = {}) {
  const records = {
    learningEvents: null,
    learningEventsInsertCount: 0,
    learningEventsById: Object.fromEntries(
      existingLearningEvents.map((event) => [event.event_id, clone(event)]),
    ),
    pipelineState: null,
    bridgeWarning: null,
    deliveryRow: clone(existingDeliveryRow) ?? null,
    deliveryInsertCount: 0,
    deliveryUpdates: [],
    reconciliationRuns: [],
  };

  return {
    client: {
      from(table) {
        if (table === 'learning_events') {
          const filters = [];
          const query = {
            select: () => query,
            eq: (field, value) => {
              filters.push({ field, value });
              return query;
            },
            order: () => query,
            limit: () => query,
            maybeSingle: async () => {
              const eventId = filters.find((filter) => filter.field === 'event_id')?.value ?? null;
              if (eventId) {
                if (failLearningEventReads) {
                  return {
                    data: null,
                    error: null,
                  };
                }

                return {
                  data: clone(records.learningEventsById[eventId] ?? null),
                  error: null,
                };
              }

              return {
                data: existingStreamHead,
                error: null,
              };
            },
          };

          return {
            ...query,
            insert: async (rows) => {
              records.learningEventsInsertCount += 1;
              records.learningEvents = rows;
              rows.forEach((event) => {
                records.learningEventsById[event.event_id] = clone(event);
              });
              return { error: learningEventsError };
            },
          };
        }

        if (table === 'learning_event_deliveries') {
          const filters = [];
          const query = {
            select: () => query,
            eq: (field, value) => {
              filters.push({ field, value });
              return query;
            },
            maybeSingle: async () => {
              const stableIdempotencyKey =
                filters.find((filter) => filter.field === 'stable_idempotency_key')?.value ?? null;

              if (
                stableIdempotencyKey
                && records.deliveryRow?.stable_idempotency_key === stableIdempotencyKey
              ) {
                return {
                  data: clone(records.deliveryRow),
                  error: null,
                };
              }

              return {
                data: null,
                error: null,
              };
            },
            single: async () => ({
              data: records.deliveryRow ? clone(records.deliveryRow) : null,
              error: null,
            }),
            insert: (row) => {
              records.deliveryInsertCount += 1;
              records.deliveryRow = {
                delivery_id: row.delivery_id ?? 'delivery-1',
                created_at: row.created_at ?? '2026-04-17T00:00:00.000Z',
                updated_at: row.updated_at ?? '2026-04-17T00:00:00.000Z',
                ...clone(row),
              };
              return query;
            },
            update: (payload) => {
              records.deliveryUpdates.push(clone(payload));
              records.deliveryRow = {
                ...records.deliveryRow,
                ...clone(payload),
              };
              return query;
            },
          };

          return query;
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

        if (table === 'learning_reconciliation_runs') {
          const query = {
            select: () => query,
            single: async () => ({
              data: records.reconciliationRuns.at(-1) ?? null,
              error: null,
            }),
            insert: (payload) => {
              records.reconciliationRuns.push({
                reconciliation_run_id: `recon-${records.reconciliationRuns.length + 1}`,
                ...clone(payload),
              });
              return query;
            },
          };

          return query;
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
  test('persists ordered attempt events through LearningUpdateProposed, upserts pipeline state, and finalizes a persisted delivery row', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();

    const result = await persistAttemptEventBridge(client, buildBridgeInput());

    expect(result).toMatchObject({
      ok: true,
      warningRecorded: false,
      deduped: false,
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
      delivery: {
        delivery_state: 'persisted',
        retry_count: 0,
        last_attempted_at: expect.any(String),
        last_error: null,
        stable_idempotency_key: expect.any(String),
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
    expect(records.deliveryRow).toMatchObject({
      delivery_state: 'persisted',
      retry_count: 0,
      last_attempted_at: expect.any(String),
      last_error: null,
      stable_idempotency_key: expect.any(String),
    });
    expect(records.bridgeWarning).toBeNull();
  });

  test('persists normalized downstream effect proposals with stable effect keys inside LearningUpdateProposed', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();

    await persistAttemptEventBridge(client, buildBridgeInput({
      misconceptionTags: ['sign_error'],
    }));

    const learningUpdateEvent = records.learningEvents.at(-1);

    expect(learningUpdateEvent.event_type).toBe('LearningUpdateProposed');
    expect(learningUpdateEvent.payload).toMatchObject({
      proposal_key: 'mark-run:mr-bridge-1',
      proposed_mastery_effects: [
        expect.objectContaining({
          effect_key:
            'mastery:mark-run:mr-bridge-1:r1:family:user-bridge-1:topic-trig-equations:9709.trigonometry_manipulation_equations',
          user_id: 'user-bridge-1',
          level: 'family',
          topic_id: 'topic-trig-equations',
          family_id: '9709.trigonometry_manipulation_equations',
        }),
      ],
      proposed_review_tasks: [
        expect.objectContaining({
          effect_key:
            'review:mark-run:mr-bridge-1:r1:user-bridge-1:topic-trig-equations:9709.trigonometry.equations:sign_error',
          user_id: 'user-bridge-1',
          target_topic_id: 'topic-trig-equations',
          target_question_type_id: '9709.trigonometry.equations',
        }),
      ],
      proposed_artifact_suggestions: [
        expect.objectContaining({
          effect_key:
            'artifact:mark-run:mr-bridge-1:r1:user-bridge-1:topic-trig-equations:misconception_card:sign_error',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-trig-equations',
          target_question_type_id: '9709.trigonometry.equations',
          misconception_tags: ['sign_error'],
        }),
      ],
    });
  });

  test('executes downstream effects only after bridge persistence succeeds and surfaces durable retry debt', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();
    const effectRepository = createInMemoryEffectRepository();
    let masteryCalls = 0;
    let reviewCalls = 0;
    let artifactCalls = 0;

    const result = await persistAttemptEventBridge(
      client,
      buildBridgeInput({
        misconceptionTags: ['sign_error'],
      }),
      {
        applyDownstreamEffects: true,
        effectRepository,
        handlers: {
          mastery: async () => {
            masteryCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'family_mastery',
              result_ref_id: 'family-mastery-1',
            };
          },
          review_tasks: async () => {
            reviewCalls += 1;
            throw new Error('review task write failed');
          },
          artifact_suggestions: async () => {
            artifactCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'artifact',
              result_ref_id: 'artifact-1',
            };
          },
        },
      },
    );

    expect(records.learningEventsInsertCount).toBe(1);
    expect(masteryCalls).toBe(1);
    expect(reviewCalls).toBe(1);
    expect(artifactCalls).toBe(1);
    expect(result.learning_effects).toMatchObject({
      authoritative_scoring_allowed: true,
      release_scope_status: 'released_scoring',
      learning_signal_posture: 'authoritative_scoring',
      effect_execution: {
        ok: false,
        status: 'partial_failure',
        debt_pending: true,
        receipt_summary: {
          total: 3,
          persisted: 2,
          retrying: 1,
        },
      },
    });
    expect(await effectRepository.listEffectReceiptsByEventId(records.learningEvents.at(-1).event_id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          handler_name: 'review_tasks',
          status: 'failed',
          receipt_state: 'retrying',
          retry_count: 1,
          last_error: {
            code: 'effect_execution_failed',
            message: 'review task write failed',
          },
        }),
      ]),
    );
  });

  test('reuses the same bridge delivery row and does not append duplicate events on repeated delivery', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();

    const first = await persistAttemptEventBridge(client, buildBridgeInput());
    const firstLearningEvents = records.learningEvents;

    const second = await persistAttemptEventBridge(client, buildBridgeInput());

    expect(first.delivery.stable_idempotency_key).toBe(second.delivery.stable_idempotency_key);
    expect(second).toMatchObject({
      ok: true,
      warningRecorded: false,
      deduped: true,
      delivery: {
        delivery_state: 'persisted',
        retry_count: 0,
        last_error: null,
      },
    });
    expect(records.deliveryInsertCount).toBe(1);
    expect(records.learningEventsInsertCount).toBe(1);
    expect(records.learningEvents).toBe(firstLearningEvents);
  });

  test('records a durable bridge warning/debt row and retry metadata when persistence fails', async () => {
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
      delivery: {
        delivery_state: 'retrying',
        retry_count: 1,
        last_attempted_at: expect.any(String),
        last_error: {
          code: 'attempt_event_bridge_failed',
          message: 'learning_events insert failed',
        },
      },
    });
    expect(records.pipelineState).toBeNull();
    expect(records.deliveryRow).toMatchObject({
      delivery_state: 'retrying',
      retry_count: 1,
      last_attempted_at: expect.any(String),
      last_error: {
        code: 'attempt_event_bridge_failed',
        message: 'learning_events insert failed',
      },
    });
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
      misconceptionTags: ['sign_error'],
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
      deduped: false,
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

    const learningUpdateEvent = records.learningEvents.at(-1);
    expect(learningUpdateEvent.payload).toMatchObject({
      proposal_key: 'mark-run:mr-bridge-2',
      proposed_mastery_effects: [
        expect.objectContaining({
          effect_key:
            'mastery:mark-run:mr-bridge-2:r2:family:user-bridge-1:topic-trig-equations:9709.trigonometry_manipulation_equations',
        }),
      ],
      proposed_review_tasks: [
        expect.objectContaining({
          effect_key:
            'review:mark-run:mr-bridge-2:r2:user-bridge-1:topic-trig-equations:9709.trigonometry.equations:sign_error',
        }),
      ],
      proposed_artifact_suggestions: [
        expect.objectContaining({
          effect_key:
            'artifact:mark-run:mr-bridge-2:r2:user-bridge-1:topic-trig-equations:misconception_card:sign_error',
        }),
      ],
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

  test('reconciliation can move failed bridge delivery rows into terminal outcomes', async () => {
    const {
      persistAttemptEventBridge,
      reconcileAttemptEventBridgeDelivery,
    } = await import('../lib/events/attempt-event-service.js');
    const { client } = createMockClient({
      learningEventsError: { message: 'learning_events insert failed' },
    });

    const failed = await persistAttemptEventBridge(client, buildBridgeInput());

    const manualReview = await reconcileAttemptEventBridgeDelivery(client, {
      stableIdempotencyKey: failed.delivery.stable_idempotency_key,
      deliveryState: 'needs_manual_review',
      reconciliationId: 'recon-manual-1',
    });
    expect(manualReview).toMatchObject({
      delivery_state: 'needs_manual_review',
      reconciliation_id: 'recon-manual-1',
    });

    const reconciled = await reconcileAttemptEventBridgeDelivery(client, {
      stableIdempotencyKey: failed.delivery.stable_idempotency_key,
      deliveryState: 'reconciled',
      reconciliationId: 'recon-auto-1',
    });
    expect(reconciled).toMatchObject({
      delivery_state: 'reconciled',
      reconciliation_id: 'recon-auto-1',
    });
  });

  test('reconciliation can retry failed downstream effect receipts from the persisted proposal event', async () => {
    const {
      persistAttemptEventBridge,
      reconcileAttemptEventBridgeEffects,
    } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient();
    const effectRepository = createInMemoryEffectRepository();
    let masteryCalls = 0;
    let reviewCalls = 0;
    let artifactCalls = 0;

    const first = await persistAttemptEventBridge(
      client,
      buildBridgeInput({
        misconceptionTags: ['sign_error'],
      }),
      {
        applyDownstreamEffects: true,
        effectRepository,
        handlers: {
          mastery: async () => {
            masteryCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'family_mastery',
              result_ref_id: 'family-mastery-1',
            };
          },
          review_tasks: async () => {
            reviewCalls += 1;
            if (reviewCalls === 1) {
              throw new Error('review task write failed');
            }

            return {
              status: 'succeeded',
              result_ref_type: 'review_task',
              result_ref_id: 'review-task-1',
            };
          },
          artifact_suggestions: async () => {
            artifactCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'artifact',
              result_ref_id: 'artifact-1',
            };
          },
        },
      },
    );

    expect(first.learning_effects?.effect_execution).toMatchObject({
      ok: false,
      status: 'partial_failure',
      debt_pending: true,
    });

    const retried = await reconcileAttemptEventBridgeEffects(
      client,
      {
        stableIdempotencyKey: first.delivery.stable_idempotency_key,
      },
      {
        effectRepository,
        handlers: {
          mastery: async () => {
            masteryCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'family_mastery',
              result_ref_id: 'family-mastery-1',
            };
          },
          review_tasks: async () => {
            reviewCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'review_task',
              result_ref_id: 'review-task-1',
            };
          },
          artifact_suggestions: async () => {
            artifactCalls += 1;
            return {
              status: 'succeeded',
              result_ref_type: 'artifact',
              result_ref_id: 'artifact-1',
            };
          },
        },
      },
    );

    expect(masteryCalls).toBe(1);
    expect(reviewCalls).toBe(2);
    expect(artifactCalls).toBe(1);
    expect(retried).toMatchObject({
      reconciliation_run_id: 'recon-1',
      status: 'completed',
      learning_effects: {
        effect_execution: {
          ok: true,
          status: 'applied',
          debt_pending: false,
          receipt_summary: {
            total: 3,
            persisted: 3,
            retrying: 0,
          },
        },
      },
    });
    expect(records.reconciliationRuns.at(-1)).toMatchObject({
      trigger_source: 'attempt_event_effect_retry',
      source_ref: {
        kind: 'mark_run',
        mark_run_id: 'mr-bridge-1',
      },
      status: 'completed',
      result_summary: {
        retrying_receipt_count: 0,
        persisted_receipt_count: 3,
      },
    });
  });

  test('downstream-effect read failures after persisted event writes do not downgrade the delivery row', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client } = createMockClient({
      failLearningEventReads: true,
    });

    const result = await persistAttemptEventBridge(
      client,
      buildBridgeInput(),
      {
        applyDownstreamEffects: true,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      warningRecorded: false,
      deduped: false,
      delivery: {
        delivery_state: 'persisted',
        retry_count: 0,
        last_error: null,
      },
      learning_effects: {
        effect_execution: {
          ok: false,
          status: 'failed',
          debt_pending: true,
          error: {
            code: 'effect_execution_failed',
            message: 'learning_update_proposed_event_not_found',
          },
        },
      },
    });
  });

  test('retrying a prior pipeline-state failure can recover without re-inserting already-persisted bridge events', async () => {
    const { persistAttemptEventBridge } = await import('../lib/events/attempt-event-service.js');
    const { client, records } = createMockClient({
      existingStreamHead: {
        truth_revision: 1,
        sequence_no: 4,
      },
      existingDeliveryRow: {
        delivery_id: 'delivery-retry-1',
        stable_idempotency_key: 'attempt_event_bridge:mr-bridge-1',
        attempt_id: 'att-bridge-1',
        learner_id: 'user-bridge-1',
        subject_code: '9709',
        mark_run_id: 'mr-bridge-1',
        truth_revision: 1,
        delivery_state: 'retrying',
        retry_count: 1,
        last_attempted_at: '2026-04-16T15:01:00.000Z',
        last_error: {
          code: 'attempt_event_bridge_failed',
          message: 'attempt_pipeline_state upsert failed',
          failed_stage: 'attempt_pipeline_state_upsert',
        },
        persisted_event_types: [
          'AttemptSubmitted',
          'QuestionClassified',
          'MarkingCompleted',
          'LearningUpdateProposed',
        ],
        persisted_event_ids: [
          'event-1',
          'event-2',
          'event-3',
          'event-4',
        ],
        reconciliation_id: null,
      },
    });

    const result = await persistAttemptEventBridge(client, buildBridgeInput());

    expect(result).toMatchObject({
      ok: true,
      warningRecorded: false,
      deduped: false,
      pipeline_state: {
        attempt_id: 'att-bridge-1',
        current_truth_revision: 1,
        last_sequence_no: 4,
      },
      delivery: {
        delivery_state: 'persisted',
        retry_count: 1,
        last_error: null,
      },
    });
    expect(records.learningEventsInsertCount).toBe(0);
    expect(records.learningEvents).toBeNull();
    expect(records.pipelineState).toMatchObject({
      attempt_id: 'att-bridge-1',
      current_truth_revision: 1,
      last_sequence_no: 4,
    });
  });
});
