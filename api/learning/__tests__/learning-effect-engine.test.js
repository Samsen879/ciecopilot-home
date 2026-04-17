import { jest } from '@jest/globals';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createInMemoryEffectRepository() {
  const receipts = new Map();

  function keyFor(handlerName, effectKey) {
    return `${handlerName}::${effectKey}`;
  }

  function cloneReceipt(receipt) {
    return clone(receipt);
  }

  return {
    receipts,
    async reserveEffectReceipt(input = {}) {
      const key = keyFor(input.handler_name, input.effect_key);
      const existing = receipts.get(key) ?? null;
      const attemptedAt = '2026-04-17T10:00:00.000Z';

      if (!existing) {
        const receipt = {
          effect_id: `effect-${receipts.size + 1}`,
          proposal_key: input.proposal_key,
          event_id: input.event_id,
          aggregate_id: input.aggregate_id,
          truth_revision: input.truth_revision,
          handler_name: input.handler_name,
          effect_key: input.effect_key,
          status: 'started',
          receipt_state: 'pending',
          retry_count: 0,
          attempt_count: 1,
          last_attempted_at: attemptedAt,
          last_error: null,
          result_ref_type: null,
          result_ref_id: null,
        };
        receipts.set(key, receipt);
        return {
          inserted: true,
          reason_code: null,
          receipt: cloneReceipt(receipt),
        };
      }

      if (existing.receipt_state === 'retrying' && existing.status === 'failed') {
        existing.status = 'started';
        existing.receipt_state = 'pending';
        existing.attempt_count += 1;
        existing.last_attempted_at = attemptedAt;
        existing.last_error = null;
        return {
          inserted: true,
          reason_code: 'retry_failed_effect',
          receipt: cloneReceipt(existing),
        };
      }

      return {
        inserted: false,
        reason_code: 'duplicate_effect_key',
        receipt: cloneReceipt(existing),
      };
    },

    async markEffectReceiptSucceeded({
      handler_name: handlerName,
      effect_key: effectKey,
      status = 'succeeded',
      result_ref_type: resultRefType = null,
      result_ref_id: resultRefId = null,
    } = {}) {
      const receipt = receipts.get(keyFor(handlerName, effectKey));
      receipt.status = status;
      receipt.receipt_state = 'persisted';
      receipt.result_ref_type = resultRefType;
      receipt.result_ref_id = resultRefId;
      receipt.last_error = null;
      return cloneReceipt(receipt);
    },

    async markEffectReceiptFailed({
      handler_name: handlerName,
      effect_key: effectKey,
      error_code: errorCode = 'effect_failed',
      error_message: errorMessage = 'effect failed',
      receipt_state: receiptState = 'retrying',
    } = {}) {
      const receipt = receipts.get(keyFor(handlerName, effectKey));
      receipt.status = 'failed';
      receipt.receipt_state = receiptState;
      receipt.retry_count += 1;
      receipt.last_error = {
        code: errorCode,
        message: errorMessage,
      };
      return cloneReceipt(receipt);
    },

    async listEffectReceiptsByEventId(eventId) {
      return [...receipts.values()]
        .filter((receipt) => receipt.event_id === eventId)
        .map((receipt) => cloneReceipt(receipt));
    },
  };
}

function buildProposalEvent() {
  return {
    event_id: 'learning-update-event-1',
    aggregate_id: 'attempt-1',
    truth_revision: 1,
    payload: {
      attempt_id: 'attempt-1',
      proposal_key: 'mark-run:mark-run-1',
      guardrail_decisions: {
        authoritative_scoring_allowed: true,
        release_scope_status: 'released_scoring',
      },
      proposed_mastery_effects: [
        {
          effect_key: 'mastery:family:user-1:topic-1:9709.trigonometry_manipulation_equations',
          user_id: 'user-1',
          level: 'family',
          topic_id: 'topic-1',
          family_id: '9709.trigonometry_manipulation_equations',
          question_type_id: null,
          mastery_state: {
            signal_direction: 'diagnostic',
            signal_weight: 'conservative',
          },
          signal_summary: {
            source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
          },
        },
      ],
      proposed_review_tasks: [
        {
          effect_key: 'review:user-1:topic-1:9709.trigonometry.equations:sign_error',
          user_id: 'user-1',
          target_kind: 'question_type',
          target_topic_id: 'topic-1',
          target_topic_path: '9709/trigonometry/equations',
          target_family_id: '9709.trigonometry_manipulation_equations',
          target_question_type_id: '9709.trigonometry.equations',
          target_misconception_tags: ['sign_error'],
          source_question_id: 'question-1',
          source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
          trigger_type: 'repair',
          mode: 'redo_variant',
          due_at: '2026-04-18T10:00:00.000Z',
          priority: 'high',
          estimated_minutes: 15,
          success_criteria: { posture: 'released_scoring_repair' },
          completion_evidence: {},
          status: 'open',
        },
      ],
      proposed_artifact_suggestions: [
        {
          effect_key: 'artifact:user-1:topic-1:misconception_card:sign_error',
          artifact_kind: 'misconception_card',
          canonical_home_topic_id: 'topic-1',
          canonical_home_topic_path: '9709/trigonometry/equations',
          source_session_id: null,
          source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
          source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1' },
          target_family_id: '9709.trigonometry_manipulation_equations',
          target_question_type_id: '9709.trigonometry.equations',
          slot_key: 'common_traps',
          misconception_tags: ['sign_error'],
        },
      ],
    },
  };
}

describe('learning-effect-engine', () => {
  test('a persisted LearningUpdateProposed payload can drive mastery, review, and artifact handlers with persisted receipts', async () => {
    const { applyLearningUpdateProposal } = await import('../lib/events/learning-effect-engine.js');
    const effectRepository = createInMemoryEffectRepository();
    const masteryHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'family_mastery',
      result_ref_id: 'family-mastery-1',
    }));
    const reviewHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'review_task',
      result_ref_id: 'review-task-1',
    }));
    const artifactHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'artifact',
      result_ref_id: 'artifact-1',
    }));

    const result = await applyLearningUpdateProposal(
      {
        proposalEvent: buildProposalEvent(),
      },
      {
        effectRepository,
        handlers: {
          mastery: masteryHandler,
          review_tasks: reviewHandler,
          artifact_suggestions: artifactHandler,
        },
      },
    );

    expect(result).toMatchObject({
      ok: true,
      status: 'applied',
      proposal_key: 'mark-run:mark-run-1',
      receipt_summary: {
        total: 3,
        persisted: 3,
        retrying: 0,
      },
    });
    expect(masteryHandler).toHaveBeenCalledTimes(1);
    expect(reviewHandler).toHaveBeenCalledTimes(1);
    expect(artifactHandler).toHaveBeenCalledTimes(1);
    expect(await effectRepository.listEffectReceiptsByEventId('learning-update-event-1')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          handler_name: 'mastery',
          status: 'succeeded',
          receipt_state: 'persisted',
          result_ref_type: 'family_mastery',
          result_ref_id: 'family-mastery-1',
        }),
        expect.objectContaining({
          handler_name: 'review_tasks',
          status: 'succeeded',
          receipt_state: 'persisted',
          result_ref_type: 'review_task',
          result_ref_id: 'review-task-1',
        }),
        expect.objectContaining({
          handler_name: 'artifact_suggestions',
          status: 'succeeded',
          receipt_state: 'persisted',
          result_ref_type: 'artifact',
          result_ref_id: 'artifact-1',
        }),
      ]),
    );
  });

  test('re-running the same proposal converges to the stored receipt outcome instead of duplicating downstream writes', async () => {
    const { applyLearningUpdateProposal } = await import('../lib/events/learning-effect-engine.js');
    const effectRepository = createInMemoryEffectRepository();
    const masteryHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'family_mastery',
      result_ref_id: 'family-mastery-1',
    }));
    const reviewHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'review_task',
      result_ref_id: 'review-task-1',
    }));
    const artifactHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'artifact',
      result_ref_id: 'artifact-1',
    }));

    const first = await applyLearningUpdateProposal(
      { proposalEvent: buildProposalEvent() },
      {
        effectRepository,
        handlers: {
          mastery: masteryHandler,
          review_tasks: reviewHandler,
          artifact_suggestions: artifactHandler,
        },
      },
    );
    const second = await applyLearningUpdateProposal(
      { proposalEvent: buildProposalEvent() },
      {
        effectRepository,
        handlers: {
          mastery: masteryHandler,
          review_tasks: reviewHandler,
          artifact_suggestions: artifactHandler,
        },
      },
    );

    expect(first.status).toBe('applied');
    expect(second).toMatchObject({
      ok: true,
      status: 'deduped',
      receipt_summary: {
        total: 3,
        persisted: 3,
        retrying: 0,
      },
    });
    expect(masteryHandler).toHaveBeenCalledTimes(1);
    expect(reviewHandler).toHaveBeenCalledTimes(1);
    expect(artifactHandler).toHaveBeenCalledTimes(1);
  });

  test('partial handler failure keeps successful receipts persisted and records retry debt for the failed handler', async () => {
    const { applyLearningUpdateProposal } = await import('../lib/events/learning-effect-engine.js');
    const effectRepository = createInMemoryEffectRepository();
    const masteryHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'family_mastery',
      result_ref_id: 'family-mastery-1',
    }));
    const reviewHandler = jest.fn(async () => {
      throw new Error('review task write failed');
    });
    const artifactHandler = jest.fn(async () => ({
      status: 'succeeded',
      result_ref_type: 'artifact',
      result_ref_id: 'artifact-1',
    }));

    const result = await applyLearningUpdateProposal(
      { proposalEvent: buildProposalEvent() },
      {
        effectRepository,
        handlers: {
          mastery: masteryHandler,
          review_tasks: reviewHandler,
          artifact_suggestions: artifactHandler,
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      status: 'partial_failure',
      receipt_summary: {
        total: 3,
        persisted: 2,
        retrying: 1,
      },
    });
    expect(await effectRepository.listEffectReceiptsByEventId('learning-update-event-1')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          handler_name: 'mastery',
          status: 'succeeded',
          receipt_state: 'persisted',
        }),
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
        expect.objectContaining({
          handler_name: 'artifact_suggestions',
          status: 'succeeded',
          receipt_state: 'persisted',
        }),
      ]),
    );
  });
});
