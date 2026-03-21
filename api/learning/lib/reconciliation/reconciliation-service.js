import {
  buildArtifactRef,
  buildQuestionTypeRef,
  buildReviewTaskRef,
} from '../contracts/runtime-contract.js';
import { createReconciliationRepository } from '../repositories/reconciliation-repository.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function countDerivedObjects(derivedState = {}) {
  return Object.values(derivedState).reduce((count, value) => {
    if (Array.isArray(value)) {
      return count + value.length;
    }
    return count;
  }, 0);
}

function buildAffectedObjectRefs(derivedState = {}) {
  return [
    ...normalizeArray(derivedState.type_masteries).flatMap((item) =>
      item?.question_type_id ? [buildQuestionTypeRef(item.question_type_id)] : []),
    ...normalizeArray(derivedState.review_tasks).flatMap((item) =>
      item?.review_task_id ? [buildReviewTaskRef(item.review_task_id)] : []),
    ...normalizeArray(derivedState.artifacts).flatMap((item) =>
      item?.artifact_id ? [buildArtifactRef(item.artifact_id)] : []),
  ];
}

export function createReconciliationService({
  reconciliationRepository = null,
  now = () => new Date(),
} = {}) {
  return {
    async reconcileDerivedState({
      triggerSource,
      sourceRef,
      historical = {},
      derivedState = {},
      oldSnapshotRefs = [],
      newSnapshotRefs = [],
    } = {}) {
      const historicalSnapshot = clone(historical);
      const nextDerivedState = clone(derivedState) || {};
      const resultSummary = {
        revised_derived_objects: countDerivedObjects(nextDerivedState),
        historical_attempt_count: normalizeArray(historicalSnapshot?.attempts).length,
        historical_mark_run_count: normalizeArray(historicalSnapshot?.mark_runs).length,
      };

      let run = null;
      if (reconciliationRepository) {
        const timestamp = now().toISOString();
        run = await reconciliationRepository.insertRun({
          trigger_source: triggerSource,
          source_ref: sourceRef,
          affected_object_refs: buildAffectedObjectRefs(nextDerivedState),
          old_snapshot_refs: oldSnapshotRefs,
          new_snapshot_refs: newSnapshotRefs,
          status: 'completed',
          result_summary: resultSummary,
          started_at: timestamp,
          completed_at: timestamp,
        });
      }

      return {
        reconciliation_run_id: run?.reconciliation_run_id ?? null,
        status: 'completed',
        historical: historicalSnapshot,
        derived_state: nextDerivedState,
        result_summary: resultSummary,
      };
    },
  };
}

export function createDefaultReconciliationService(client, options = {}) {
  return createReconciliationService({
    ...options,
    reconciliationRepository: createReconciliationRepository(client),
  });
}
