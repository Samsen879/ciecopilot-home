import { jest } from '@jest/globals';

describe('learning event service', () => {
  test('synthetic pipeline preserves strict phase ordering and completes attempt state', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const flow = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-1',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    const results = flow.map((event) => appendLearningEvent(store, event));

    expect(results.every((result) => result.inserted)).toBe(true);
    expect(store.pipelineStateByAttempt.get('attempt-1')).toMatchObject({
      attempt_id: 'attempt-1',
      current_stage: 'ArtifactSuggestionsCreated',
      current_status: 'completed',
      last_sequence_no: 7,
    });
  });

  test('dedupe blocks duplicate emissions for the same event_type and dedupe_key', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const [attemptSubmitted] = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-dup',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    expect(appendLearningEvent(store, attemptSubmitted)).toMatchObject({ inserted: true });
    expect(appendLearningEvent(store, attemptSubmitted)).toMatchObject({
      inserted: false,
      reason_code: 'duplicate_dedupe_key',
    });
  });

  test('out-of-order append is rejected inside the same attempt stream', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const [attemptSubmitted, , markingCompleted] = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-order',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    appendLearningEvent(store, attemptSubmitted);

    expect(() => appendLearningEvent(store, markingCompleted)).toThrow(
      'out_of_order_event',
    );
  });

  test('replay with the same effect_key stays idempotent in the effect ledger', async () => {
    const {
      appendLearningEvent,
      buildReplayLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
      markLearningEventEffectStatus,
      tryStartLearningEventEffect,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const flow = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-replay',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });
    flow.forEach((event) => appendLearningEvent(store, event));
    const originalEvent = flow.at(-1);
    const replayEvent = buildReplayLearningEvent(originalEvent, {
      truthRevision: 2,
      sequenceNo: 8,
      emittedBy: 'jest-replay',
    });

    const first = tryStartLearningEventEffect(store, {
      eventId: originalEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:stable-output',
      aggregateId: originalEvent.aggregate_id,
      truthRevision: originalEvent.truth_revision,
    });
    const completed = markLearningEventEffectStatus(store, {
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:stable-output',
      status: 'succeeded',
      resultRefType: 'artifact_suggestion_version',
      resultRefId: 'artifact-suggestion-1',
    });
    const replay = tryStartLearningEventEffect(store, {
      eventId: replayEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:stable-output',
      aggregateId: replayEvent.aggregate_id,
      truthRevision: replayEvent.truth_revision,
    });

    expect(first).toMatchObject({ inserted: true, reason_code: null });
    expect(completed).toMatchObject({
      status: 'succeeded',
      result_ref_type: 'artifact_suggestion_version',
      result_ref_id: 'artifact-suggestion-1',
    });
    expect(replay).toMatchObject({
      inserted: false,
      reason_code: 'duplicate_effect_key',
      effect: {
        status: 'succeeded',
        result_ref_id: 'artifact-suggestion-1',
      },
    });
    expect(store.effects).toHaveLength(1);
  });

  test('replay can append a new truth revision that restarts sequence numbering', async () => {
    const {
      appendLearningEvent,
      buildReplayLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const flow = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-revision-replay',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    flow.forEach((event) => appendLearningEvent(store, event));

    const replayFlow = flow.map((sourceEvent) => buildReplayLearningEvent(sourceEvent, {
      truthRevision: 2,
      sequenceNo: sourceEvent.sequence_no,
      emittedBy: 'jest-replay',
      replayOfEventId: sourceEvent.event_id,
      supersedesEventId: sourceEvent.event_id,
      causationEventId: sourceEvent.event_id,
      reconciliationId: 'reconciliation-run-1',
      dedupeKey: `${sourceEvent.aggregate_id}:2:${sourceEvent.event_type}:replay`,
    }));

    const replayResults = replayFlow.map((event) => appendLearningEvent(store, event));

    expect(replayResults.every((result) => result.inserted)).toBe(true);
    expect(store.pipelineStateByAttempt.get('attempt-revision-replay')).toMatchObject({
      attempt_id: 'attempt-revision-replay',
      current_truth_revision: 2,
      current_stage: 'ArtifactSuggestionsCreated',
      current_status: 'completed',
      last_sequence_no: 7,
    });
    expect(store.events).toHaveLength(14);
  });

  test('attempt stream lock rejects re-entry and can be acquired again after release', async () => {
    const {
      acquireAttemptStreamLock,
      createEmptyLearningEventStore,
      releaseAttemptStreamLock,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();

    expect(acquireAttemptStreamLock(store, 'attempt-lock')).toMatchObject({
      acquired: true,
      reason_code: null,
      attempt_id: 'attempt-lock',
    });
    expect(acquireAttemptStreamLock(store, 'attempt-lock')).toMatchObject({
      acquired: false,
      reason_code: 'attempt_stream_locked',
      attempt_id: 'attempt-lock',
    });
    expect(releaseAttemptStreamLock(store, 'attempt-lock')).toBe(true);
    expect(acquireAttemptStreamLock(store, 'attempt-lock')).toMatchObject({
      acquired: true,
      reason_code: null,
      attempt_id: 'attempt-lock',
    });
  });

  test('effect start rejects unknown event ids that are not present in the stream', async () => {
    const {
      createEmptyLearningEventStore,
      tryStartLearningEventEffect,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();

    expect(() => tryStartLearningEventEffect(store, {
      eventId: 'missing-event-id',
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:stable-output',
      aggregateId: 'attempt-missing-event',
      truthRevision: 1,
    })).toThrow('unknown_effect_event_id');
  });

  test('delivery reservation reuses one stable idempotency key and exposes the pending row contract', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
      reserveLearningEventDelivery,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const [attemptSubmitted] = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-delivery-reserve',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    appendLearningEvent(store, attemptSubmitted);

    const input = {
      eventId: attemptSubmitted.event_id,
      handlerName: 'bridge:attempt-events',
      effectKey: 'attempt-delivery:attempt-delivery-reserve:submitted',
      aggregateId: attemptSubmitted.aggregate_id,
      truthRevision: attemptSubmitted.truth_revision,
    };

    const first = reserveLearningEventDelivery(store, input);
    const second = reserveLearningEventDelivery(store, input);

    expect(first.delivery).toMatchObject({
      delivery_state: 'pending',
      retry_count: 0,
      last_attempted_at: null,
      last_error: null,
    });
    expect(second.delivery.delivery_id).toBe(first.delivery.delivery_id);
    expect(second.delivery.stable_idempotency_key).toBe(first.delivery.stable_idempotency_key);
    expect(store.deliveries).toHaveLength(1);
  });

  test('delivery execution dedupes downstream side effects across repeated attempts', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
      runLearningEventDelivery,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const flow = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-delivery-dedupe',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    flow.forEach((event) => appendLearningEvent(store, event));
    const targetEvent = flow.at(-1);
    const execute = jest.fn(async () => ({
      status: 'succeeded',
      resultRefType: 'artifact_suggestion_version',
      resultRefId: 'artifact-suggestion-1',
    }));

    const first = await runLearningEventDelivery(store, {
      eventId: targetEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:stable-output',
      aggregateId: targetEvent.aggregate_id,
      truthRevision: targetEvent.truth_revision,
      execute,
    });
    const second = await runLearningEventDelivery(store, {
      eventId: targetEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:stable-output',
      aggregateId: targetEvent.aggregate_id,
      truthRevision: targetEvent.truth_revision,
      execute,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(first.delivery).toMatchObject({
      delivery_state: 'persisted',
      retry_count: 0,
      last_error: null,
    });
    expect(second.delivery.delivery_id).toBe(first.delivery.delivery_id);
    expect(second.reason_code).toBe('duplicate_effect_key');
    expect(store.effects).toHaveLength(1);
  });

  test('delivery failures record retry metadata and reconciliation can move rows into terminal outcomes', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
      reconcileLearningEventDelivery,
      runLearningEventDelivery,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const flow = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-delivery-reconcile',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    flow.forEach((event) => appendLearningEvent(store, event));

    const retrying = await runLearningEventDelivery(store, {
      eventId: flow[3].event_id,
      handlerName: 'bridge:learning-update',
      effectKey: 'proposal:attempt-delivery-reconcile',
      aggregateId: flow[3].aggregate_id,
      truthRevision: flow[3].truth_revision,
      execute: async () => {
        throw new Error('temporary bridge failure');
      },
    });

    expect(retrying.delivery).toMatchObject({
      delivery_state: 'retrying',
      retry_count: 1,
      last_attempted_at: expect.any(String),
      last_error: {
        code: 'delivery_failed',
        message: 'temporary bridge failure',
      },
    });

    const manualReview = reconcileLearningEventDelivery(store, {
      stableIdempotencyKey: retrying.delivery.stable_idempotency_key,
      deliveryState: 'needs_manual_review',
      reconciliationId: 'recon-manual-1',
    });

    expect(manualReview).toMatchObject({
      delivery_state: 'needs_manual_review',
      reconciliation_id: 'recon-manual-1',
    });

    const persisted = await runLearningEventDelivery(store, {
      eventId: flow[4].event_id,
      handlerName: 'bridge:mastery-update',
      effectKey: 'mastery:attempt-delivery-reconcile',
      aggregateId: flow[4].aggregate_id,
      truthRevision: flow[4].truth_revision,
      execute: async () => ({
        status: 'succeeded',
        resultRefType: 'mastery_update',
        resultRefId: 'mastery-1',
      }),
    });

    const reconciled = reconcileLearningEventDelivery(store, {
      stableIdempotencyKey: persisted.delivery.stable_idempotency_key,
      deliveryState: 'reconciled',
      reconciliationId: 'recon-auto-1',
    });

    expect(reconciled).toMatchObject({
      delivery_state: 'reconciled',
      reconciliation_id: 'recon-auto-1',
    });
  });

  test('duplicate replay preserves terminal reconciliation delivery states', async () => {
    const {
      appendLearningEvent,
      buildSyntheticAttemptEventFlow,
      createEmptyLearningEventStore,
      reconcileLearningEventDelivery,
      runLearningEventDelivery,
    } = await import('../lib/events/event-service.js');

    const store = createEmptyLearningEventStore();
    const flow = buildSyntheticAttemptEventFlow({
      attemptId: 'attempt-terminal-replay',
      learnerId: 'learner-1',
      sessionId: 'session-1',
      subjectCode: '9709',
      emittedBy: 'jest',
    });

    flow.forEach((event) => appendLearningEvent(store, event));
    const targetEvent = flow.at(-1);
    const execute = jest.fn(async () => ({
      status: 'succeeded',
      resultRefType: 'artifact_suggestion_version',
      resultRefId: 'artifact-suggestion-1',
    }));

    const first = await runLearningEventDelivery(store, {
      eventId: targetEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:terminal-replay',
      aggregateId: targetEvent.aggregate_id,
      truthRevision: targetEvent.truth_revision,
      execute,
    });

    const reconciled = reconcileLearningEventDelivery(store, {
      stableIdempotencyKey: first.delivery.stable_idempotency_key,
      deliveryState: 'reconciled',
      reconciliationId: 'recon-keep-1',
    });
    const replayAfterReconciled = await runLearningEventDelivery(store, {
      eventId: targetEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:terminal-replay',
      aggregateId: targetEvent.aggregate_id,
      truthRevision: targetEvent.truth_revision,
      execute,
    });

    expect(reconciled.delivery_state).toBe('reconciled');
    expect(replayAfterReconciled.reason_code).toBe('duplicate_effect_key');
    expect(replayAfterReconciled.delivery).toMatchObject({
      delivery_state: 'reconciled',
      reconciliation_id: 'recon-keep-1',
    });

    const manualReview = reconcileLearningEventDelivery(store, {
      stableIdempotencyKey: first.delivery.stable_idempotency_key,
      deliveryState: 'needs_manual_review',
      reconciliationId: 'recon-keep-2',
    });
    const replayAfterManualReview = await runLearningEventDelivery(store, {
      eventId: targetEvent.event_id,
      handlerName: 'project:artifact-suggestions',
      effectKey: 'artifact-slot:review_queue:terminal-replay',
      aggregateId: targetEvent.aggregate_id,
      truthRevision: targetEvent.truth_revision,
      execute,
    });

    expect(manualReview.delivery_state).toBe('needs_manual_review');
    expect(replayAfterManualReview.reason_code).toBe('duplicate_effect_key');
    expect(replayAfterManualReview.delivery).toMatchObject({
      delivery_state: 'needs_manual_review',
      reconciliation_id: 'recon-keep-2',
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
