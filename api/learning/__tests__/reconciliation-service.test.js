import { createReconciliationService } from '../lib/reconciliation/reconciliation-service.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

describe('reconciliation-service', () => {
  test('reconciliation updates derived state without mutating historical attempt/mark-run truth', async () => {
    const runs = [];
    const service = createReconciliationService({
      reconciliationRepository: {
        async insertRun(payload) {
          runs.push(payload);
          return {
            reconciliation_run_id: 'recon-1',
            ...payload,
          };
        },
      },
    });

    const historical = {
      attempts: [
        {
          attempt_id: 'attempt-1',
          awarded_marks: 0,
        },
      ],
      mark_runs: [
        {
          mark_run_id: 'mark-run-1',
          rubric_version: 'trig-v1',
        },
      ],
    };
    const historicalSnapshot = clone(historical);

    const result = await service.reconcileDerivedState({
      triggerSource: 'marking_correction',
      sourceRef: {
        kind: 'mark_run',
        mark_run_id: 'mark-run-1',
      },
      historical,
      derivedState: {
        family_masteries: [
          {
            family_id: '9709.trigonometry_manipulation_equations',
            mastery_state: { score: 0.2 },
          },
        ],
        type_masteries: [
          {
            question_type_id: '9709.trigonometry.equations',
            mastery_state: { score: 0.9, posture: 'retracted' },
          },
        ],
        review_tasks: [
          {
            review_task_id: 'review-1',
            status: 'expired',
          },
        ],
        artifacts: [
          {
            artifact_id: 'artifact-1',
            trust_status: 'contested',
            lifecycle_status: 'revised',
          },
        ],
      },
      oldSnapshotRefs: [
        {
          kind: 'attempt',
          attempt_id: 'attempt-1',
        },
      ],
      newSnapshotRefs: [
        {
          kind: 'mark_run',
          mark_run_id: 'mark-run-1',
        },
      ],
    });

    expect(historical).toEqual(historicalSnapshot);
    expect(result.historical).toEqual(historicalSnapshot);
    expect(result.derived_state.type_masteries[0]).toMatchObject({
      question_type_id: '9709.trigonometry.equations',
      mastery_state: { score: 0.9, posture: 'retracted' },
    });
    expect(runs[0]).toMatchObject({
      trigger_source: 'marking_correction',
      source_ref: {
        kind: 'mark_run',
        mark_run_id: 'mark-run-1',
      },
      result_summary: {
        revised_derived_objects: 4,
        historical_attempt_count: 1,
        historical_mark_run_count: 1,
      },
    });
  });

  test('reconciliation preserves local part signals and summarizes ambiguous mappings', async () => {
    const runs = [];
    const service = createReconciliationService({
      reconciliationRepository: {
        async insertRun(payload) {
          runs.push(payload);
          return {
            reconciliation_run_id: 'recon-2',
            ...payload,
          };
        },
      },
    });

    const result = await service.reconcileDerivedState({
      triggerSource: 'marking_correction',
      sourceRef: {
        kind: 'mark_run',
        mark_run_id: 'mark-run-2',
      },
      historical: {},
      derivedState: {
        local_signals: [
          {
            scope_kind: 'subpart',
            question_type_id: '9709.trigonometry.equations',
            part_id: 'a',
            subpart_id: 'a_i',
            signal_direction: 'positive',
          },
        ],
        marking_result: {
          marking_summary: {
            ambiguous_rubric_point_result_count: 1,
          },
          part_results: [
            {
              part_id: 'a',
              subpart_id: 'a_i',
              score_awarded: 1,
              score_max: 2,
            },
          ],
        },
      },
    });

    expect(result.derived_state.local_signals).toEqual([
      expect.objectContaining({
        part_id: 'a',
        subpart_id: 'a_i',
      }),
    ]);
    expect(runs[0].result_summary).toMatchObject({
      revised_derived_objects: 1,
      local_signal_count: 1,
      part_result_count: 1,
      ambiguous_part_mapping_count: 1,
    });
  });
});
