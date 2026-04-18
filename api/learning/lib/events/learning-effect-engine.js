import { createArtifactService } from '../artifacts/artifact-service.js';
import { createMasteryOrchestrator } from '../mastery/mastery-orchestrator.js';
import { createArtifactRepository } from '../repositories/artifact-repository.js';
import { createArtifactContentRepository } from '../repositories/artifact-content-repository.js';
import { createLearningEventEffectRepository } from '../repositories/learning-event-effect-repository.js';
import {
  createDefaultReviewTaskService,
  createReviewTaskService,
} from '../review/review-task-service.js';

const HANDLER_CONFIG = Object.freeze([
  {
    payloadKey: 'proposed_mastery_effects',
    handlerName: 'mastery',
  },
  {
    payloadKey: 'proposed_review_tasks',
    handlerName: 'review_tasks',
  },
  {
    payloadKey: 'proposed_artifact_suggestions',
    handlerName: 'artifact_suggestions',
  },
]);

const EFFECT_RECEIPT_SUCCESS_STATUSES = new Set(['succeeded', 'noop', 'superseded']);

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildReceiptSummary(receipts = []) {
  return {
    total: receipts.length,
    persisted: receipts.filter((receipt) => receipt?.receipt_state === 'persisted').length,
    retrying: receipts.filter((receipt) => receipt?.receipt_state === 'retrying').length,
    needs_manual_review: receipts.filter((receipt) => receipt?.receipt_state === 'needs_manual_review').length,
  };
}

function normalizeHandlerResult(result = {}, fallback = {}) {
  const effectStatusCandidate =
    normalizeString(result?.effect_status)
    || normalizeString(result?.effectStatus)
    || normalizeString(result?.status);

  return {
    effect_status: EFFECT_RECEIPT_SUCCESS_STATUSES.has(effectStatusCandidate)
      ? effectStatusCandidate
      : (fallback.effect_status || 'succeeded'),
    result_ref_type:
      normalizeString(result?.result_ref_type)
      || normalizeString(result?.resultRefType)
      || fallback.result_ref_type
      || null,
    result_ref_id:
      normalizeString(result?.result_ref_id)
      || normalizeString(result?.resultRefId)
      || fallback.result_ref_id
      || null,
  };
}

function assertProposalEvent(proposalEvent = {}) {
  if (!proposalEvent || typeof proposalEvent !== 'object' || Array.isArray(proposalEvent)) {
    throw new Error('invalid_learning_update_event');
  }

  if (!normalizeString(proposalEvent.event_id)) {
    throw new Error('missing_learning_update_event_id');
  }

  if (!normalizeString(proposalEvent.aggregate_id)) {
    throw new Error('missing_learning_update_aggregate_id');
  }

  if (!Number.isInteger(Number(proposalEvent.truth_revision)) || Number(proposalEvent.truth_revision) < 1) {
    throw new Error('invalid_learning_update_truth_revision');
  }

  const payload = proposalEvent.payload && typeof proposalEvent.payload === 'object'
    ? proposalEvent.payload
    : null;

  if (!payload) {
    throw new Error('missing_learning_update_payload');
  }

  if (!normalizeString(payload.proposal_key)) {
    throw new Error('missing_learning_update_proposal_key');
  }

  return {
    proposalEvent,
    payload,
  };
}

function buildDefaultHandlers({
  supabase,
  reviewTaskService,
  artifactService,
  masteryOrchestrator,
} = {}) {
  const resolvedReviewTaskService = reviewTaskService
    || (supabase ? createDefaultReviewTaskService(supabase) : createReviewTaskService());
  const resolvedArtifactService = artifactService
    || createArtifactService({
      artifactRepository: supabase ? createArtifactRepository(supabase) : null,
      artifactContentRepository: supabase ? createArtifactContentRepository(supabase) : null,
    });
  const resolvedMasteryOrchestrator = masteryOrchestrator
    || createMasteryOrchestrator({
      supabase,
      reviewTaskService: resolvedReviewTaskService,
      artifactService: resolvedArtifactService,
    });

  return {
    mastery: async (effect) => {
      const stored = await resolvedMasteryOrchestrator.materializeProposedMasteryEffect(effect);
      return normalizeHandlerResult(stored, {
        result_ref_type: effect.level === 'question_type' ? 'type_mastery' : 'family_mastery',
        result_ref_id:
          effect.level === 'question_type'
            ? stored?.type_mastery_id ?? null
            : stored?.family_mastery_id ?? null,
      });
    },
    review_tasks: async (effect) => {
      const [task] = await resolvedReviewTaskService.materializeProposedTask(effect);
      return normalizeHandlerResult(task, {
        result_ref_type: 'review_task',
        result_ref_id: task?.review_task_id ?? null,
      });
    },
    artifact_suggestions: async (effect) => {
      const [artifact] = await resolvedArtifactService.materializeProposedArtifactSuggestion(effect);
      return normalizeHandlerResult(artifact, {
        result_ref_type: 'artifact',
        result_ref_id: artifact?.artifact_id ?? null,
      });
    },
  };
}

export function createLearningEffectEngine({
  effectRepository,
  handlers = {},
  supabase = null,
  reviewTaskService = null,
  artifactService = null,
  masteryOrchestrator = null,
} = {}) {
  const resolvedEffectRepository = effectRepository
    || (supabase ? createLearningEventEffectRepository(supabase) : null);
  if (!resolvedEffectRepository) {
    throw new Error('effectRepository is required for learning-effect execution.');
  }

  const resolvedHandlers = {
    ...buildDefaultHandlers({
      supabase,
      reviewTaskService,
      artifactService,
      masteryOrchestrator,
    }),
    ...handlers,
  };

  return {
    async applyLearningUpdateProposal({
      proposalEvent,
    } = {}) {
      const { payload } = assertProposalEvent(proposalEvent);
      const receipts = [];
      let failedCount = 0;
      let dedupedCount = 0;

      for (const config of HANDLER_CONFIG) {
        const effects = normalizeArray(payload[config.payloadKey]);
        const handler = resolvedHandlers[config.handlerName];

        if (effects.length > 0 && typeof handler !== 'function') {
          throw new Error(`missing_effect_handler:${config.handlerName}`);
        }

        for (const effect of effects) {
          const reservation = await resolvedEffectRepository.reserveEffectReceipt({
            proposal_key: payload.proposal_key,
            event_id: proposalEvent.event_id,
            aggregate_id: proposalEvent.aggregate_id,
            truth_revision: Number(proposalEvent.truth_revision),
            handler_name: config.handlerName,
            effect_key: effect.effect_key,
            reconciliation_id: proposalEvent.reconciliation_id ?? null,
          });

          if (!reservation.inserted && reservation.reason_code === 'duplicate_effect_key') {
            dedupedCount += 1;
            receipts.push(reservation.receipt);
            continue;
          }

          try {
            const handlerResult = await handler(effect, {
              proposalEvent,
              proposalPayload: payload,
            });
            const normalizedResult = normalizeHandlerResult(handlerResult);
            const receipt = await resolvedEffectRepository.markEffectReceiptSucceeded({
              handler_name: config.handlerName,
              effect_key: effect.effect_key,
              status: normalizedResult.effect_status,
              result_ref_type: normalizedResult.result_ref_type,
              result_ref_id: normalizedResult.result_ref_id,
            });
            receipts.push(receipt);
          } catch (error) {
            failedCount += 1;
            const receipt = await resolvedEffectRepository.markEffectReceiptFailed({
              handler_name: config.handlerName,
              effect_key: effect.effect_key,
              error_code: 'effect_execution_failed',
              error_message: error?.message || String(error),
              receipt_state: error?.receipt_state ?? 'retrying',
            });
            receipts.push(receipt);
          }
        }
      }

      const receiptSummary = buildReceiptSummary(receipts);
      const status = failedCount > 0
        ? 'partial_failure'
        : (dedupedCount === receipts.length && receipts.length > 0 ? 'deduped' : 'applied');

      return {
        ok: failedCount === 0,
        status,
        proposal_key: payload.proposal_key,
        receipts,
        receipt_summary: receiptSummary,
      };
    },
  };
}

export async function applyLearningUpdateProposal(input = {}, dependencies = {}) {
  const engine = createLearningEffectEngine({
    ...dependencies,
    supabase: dependencies.supabase || input.supabase || null,
  });

  return engine.applyLearningUpdateProposal(input);
}
