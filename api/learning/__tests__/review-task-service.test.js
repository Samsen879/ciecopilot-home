import { applyLearningEffects } from '../lib/mastery/mastery-orchestrator.js';
import { createReviewTaskService } from '../lib/review/review-task-service.js';

function createSpyService(methodName, implementation) {
  const calls = [];
  return {
    calls,
    async [methodName](input) {
      calls.push(input);
      return implementation(input);
    },
  };
}

function buildStoredReviewTask(overrides = {}) {
  return {
    review_task_id: 'review-task-1',
    user_id: 'student-1',
    target_kind: 'question_type',
    target_topic_id: 'topic-1',
    target_family_id: '9709.trigonometry_manipulation_equations',
    target_question_type_id: '9709.trigonometry.equations',
    target_misconception_tags: [],
    related_artifact_refs: [],
    source_question_id: 'question-1',
    source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
    trigger_type: 'marking_outcome',
    mode: 'redo_variant',
    due_at: '2026-03-25T00:00:00.000Z',
    priority: 'normal',
    estimated_minutes: 15,
    success_criteria: {},
    completion_evidence: {},
    status: 'open',
    created_at: '2026-03-24T09:00:00.000Z',
    updated_at: '2026-03-24T09:00:00.000Z',
    ...overrides,
  };
}

describe('learning orchestration', () => {
  test('part-local released scoring emits local signals instead of whole-question positive mastery', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => []);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-part-1',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-part-1',
        question_context: {
          family_id: '9709.trigonometry_manipulation_equations',
          question_type_id: '9709.trigonometry.equations',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-trig-equations',
          primary_topic_path: '9709/trigonometry/equations',
          classification_confidence: 0.93,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'trig-eq-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-part-1' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-part-1' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 1,
            alignment_confidence: 0.94,
          },
        ],
        marking_result: {
          marking_summary: {
            coverage_scope: 'subpart',
            local_signal_only: true,
            ambiguous_rubric_point_result_count: 0,
          },
          part_results: [
            {
              part_id: 'a',
              subpart_id: 'a_i',
              score_awarded: 1,
              score_max: 2,
              rubric_point_results: [
                {
                  rubric_id: 'rubric-1',
                  awarded: true,
                  awarded_marks: 1,
                  part_id: 'a',
                  subpart_id: 'a_i',
                },
              ],
            },
          ],
        },
        uncertainty_validated: true,
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.mastery_updates).toEqual([]);
    expect(result.local_signals).toEqual([
      expect.objectContaining({
        scope_kind: 'subpart',
        part_id: 'a',
        subpart_id: 'a_i',
        question_type_id: '9709.trigonometry.equations',
        signal_direction: 'positive',
      }),
    ]);
    expect(reviewTaskService.calls).toHaveLength(0);
    expect(reconciliationService.calls[0].derivedState.local_signals).toEqual([
      expect.objectContaining({
        part_id: 'a',
        subpart_id: 'a_i',
      }),
    ]);
  });

  test('pilot scoring run can create a type-level positive update', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => []);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-1',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-1',
        question_context: {
          family_id: '9709.trigonometry_manipulation_equations',
          question_type_id: '9709.trigonometry.equations',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-trig-equations',
          primary_topic_path: '9709/trigonometry/equations',
          classification_confidence: 0.93,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'trig-eq-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 2,
            alignment_confidence: 0.94,
          },
        ],
        uncertainty_validated: true,
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.release_scope_status).toBe('released_scoring');
    expect(result.mastery_updates[0]).toMatchObject({
      level: 'question_type',
      topic_id: 'topic-trig-equations',
      family_id: '9709.trigonometry_manipulation_equations',
      question_type_id: '9709.trigonometry.equations',
      signal_direction: 'positive',
    });
    expect(reviewTaskService.calls).toHaveLength(0);
    expect(artifactService.calls).toHaveLength(1);
    expect(reconciliationService.calls).toHaveLength(1);
  });

  test('promoted integration scoring run can create a type-level positive update', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => []);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-1b',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-1b',
        question_context: {
          family_id: '9709.integration_techniques',
          question_type_id: '9709.integration.application',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-integration-1',
          primary_topic_path: '9709/integration/application',
          classification_confidence: 0.89,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'integration-application-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1b' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1b' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 3,
            alignment_confidence: 0.91,
          },
        ],
        uncertainty_validated: true,
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.release_scope_status).toBe('released_scoring');
    expect(result.mastery_updates[0]).toMatchObject({
      level: 'question_type',
      topic_id: 'topic-integration-1',
      family_id: '9709.integration_techniques',
      question_type_id: '9709.integration.application',
      signal_direction: 'positive',
    });
    expect(reviewTaskService.calls).toHaveLength(0);
    expect(artifactService.calls).toHaveLength(1);
    expect(reconciliationService.calls).toHaveLength(1);
  });

  test('promoted differential-equations scoring run can create a type-level positive update', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => []);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-1c',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-1c',
        question_context: {
          family_id: '9709.differential_equations',
          question_type_id: '9709.differential_equations.separable',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-differential-1',
          primary_topic_path: '9709/differential_equations/separable',
          classification_confidence: 0.91,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'differential-separable-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1c' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-1c' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 4,
            alignment_confidence: 0.93,
          },
        ],
        uncertainty_validated: true,
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.release_scope_status).toBe('released_scoring');
    expect(result.mastery_updates[0]).toMatchObject({
      level: 'question_type',
      topic_id: 'topic-differential-1',
      family_id: '9709.differential_equations',
      question_type_id: '9709.differential_equations.separable',
      signal_direction: 'positive',
    });
    expect(reviewTaskService.calls).toHaveLength(0);
    expect(artifactService.calls).toHaveLength(1);
    expect(reconciliationService.calls).toHaveLength(1);
  });

  test('learning effects fail closed for 9702 without reusing math mastery defaults', async () => {
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-9702',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        subject_code: '9702',
        question_id: 'question-physics-1',
        question_context: {
          family_id: '9702.mechanics_dynamics',
          question_type_id: '9702.mechanics.force_balance',
          question_type_release_state: 'released',
          classification_confidence: 0.74,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: '9702.mechanics.force_balance.v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-physics-1' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-physics-1' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 3,
            alignment_confidence: 0.93,
          },
        ],
        uncertainty_validated: true,
      },
      {
        artifactService,
        reconciliationService,
      },
    );

    expect(result).toMatchObject({
      release_scope_status: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_mode: 'non_released_fallback',
      fallback_reason_code: 'subject_adapter_capability_not_enabled',
      learning_signal_posture: 'conservative_fallback',
      mastery_updates: [],
      local_signals: [],
      review_tasks: [],
    });
    expect(artifactService.calls).toHaveLength(1);
    expect(reconciliationService.calls).toHaveLength(1);
    expect(reconciliationService.calls[0].derivedState).toMatchObject({
      family_masteries: [],
      type_masteries: [],
      review_tasks: [],
      local_signals: [],
    });
  });

  test('weak-evidence promoted integration creates review tasks without authoritative score effects', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async (input) => [
      {
        review_task_id: 'review-task-1',
        target_kind: 'question_type',
        target_topic_id: input.repair_target_topic_id,
        target_question_type_id: input.repair_target_question_type_id,
        status: 'open',
      },
    ]);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-2',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-2',
        question_context: {
          family_id: '9709.integration_techniques',
          question_type_id: '9709.integration.application',
          question_type_release_state: 'released',
          primary_topic_id: 'source-topic',
          primary_topic_path: '9709/integration/source',
          classification_confidence: 0.86,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'integration-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-2' },
        decisions: [
          {
            awarded: false,
            awarded_marks: 0,
            alignment_confidence: 0.71,
          },
        ],
        uncertainty_validated: false,
        repair_target_topic_id: 'repair-target-topic',
        repair_target_topic_path: '9709/integration/repair',
        repair_target_question_type_id: '9709.integration.application',
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.release_scope_status).toBe('non_released_fallback');
    expect(result.review_tasks).toHaveLength(1);
    expect(result.review_tasks[0]).toMatchObject({
      review_task_id: 'review-task-1',
      target_topic_id: 'repair-target-topic',
      target_question_type_id: '9709.integration.application',
    });
    expect(result.mastery_updates.every((item) => item.level !== 'question_type')).toBe(true);
    expect(reviewTaskService.calls).toHaveLength(1);
    expect(reviewTaskService.calls[0]).toMatchObject({
      authoritative_scoring_allowed: false,
      repair_target_topic_id: 'repair-target-topic',
    });
  });

  test('imported-question attempts keep local feedback and artifact candidates but suppress durable mastery and review writes', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => [
      {
        review_task_id: 'review-task-imported',
      },
    ]);
    const artifactService = createSpyService('buildArtifactCandidates', async () => [
      {
        artifact_id: 'artifact-imported-1',
        artifact_kind: 'misconception_card',
      },
    ]);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-imported-1',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-imported-1',
        question_context: {
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
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-imported-1' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-imported-1' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 1,
            alignment_confidence: 0.94,
          },
        ],
        misconception_tags: ['identity:rewrite'],
        marking_result: {
          marking_summary: {
            coverage_scope: 'subpart',
            local_signal_only: true,
            ambiguous_rubric_point_result_count: 0,
          },
          part_results: [
            {
              part_id: 'a',
              subpart_id: 'a_i',
              score_awarded: 1,
              score_max: 1,
            },
          ],
        },
        uncertainty_validated: true,
        release_scope_posture: {
          release_scope_status: 'released_scoring',
          authoritative_scoring_allowed: true,
          fallback_mode: null,
          fallback_reason_code: null,
          classification_confidence: 0.95,
          learning_signal_posture: 'authoritative_scoring',
        },
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result).toMatchObject({
      release_scope_status: 'released_scoring',
      authoritative_scoring_allowed: false,
      runtime_authority_posture: 'non_authoritative',
      runtime_authority_reason_code: 'imported_question_attempt',
      mastery_updates: [],
      review_tasks: [],
      artifact_candidates: [
        {
          artifact_id: 'artifact-imported-1',
        },
      ],
      local_signals: [
        expect.objectContaining({
          scope_kind: 'subpart',
          part_id: 'a',
          subpart_id: 'a_i',
        }),
      ],
    });
    expect(reviewTaskService.calls).toHaveLength(0);
    expect(artifactService.calls).toHaveLength(1);
    expect(reconciliationService.calls[0].derivedState).toMatchObject({
      family_masteries: [],
      type_masteries: [],
      review_tasks: [],
      artifacts: [
        {
          artifact_id: 'artifact-imported-1',
        },
      ],
    });
  });

  test('incorrect released-scoring outcomes still emit repair tasks without positive type mastery', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async (input) => [
      {
        review_task_id: 'review-task-1',
        target_kind: 'question_type',
        target_topic_id: input.repair_target_topic_id,
        target_question_type_id: input.repair_target_question_type_id,
        status: 'open',
      },
    ]);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-3',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-3',
        question_context: {
          family_id: '9709.integration_techniques',
          question_type_id: '9709.integration.application',
          question_type_release_state: 'released',
          primary_topic_id: 'source-topic',
          primary_topic_path: '9709/integration/source',
          classification_confidence: 0.86,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'integration-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-3' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-3' },
        decisions: [
          {
            awarded: false,
            awarded_marks: 0,
            alignment_confidence: 0.86,
          },
        ],
        uncertainty_validated: true,
        misconception_tags: ['domain:interval'],
        repair_target_topic_id: 'repair-target-topic',
        repair_target_topic_path: '9709/integration/repair',
        repair_target_question_type_id: '9709.integration.application',
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.release_scope_status).toBe('released_scoring');
    expect(result.authoritative_scoring_allowed).toBe(true);
    expect(result.review_tasks).toHaveLength(1);
    expect(result.review_tasks[0]).toMatchObject({
      review_task_id: 'review-task-1',
      target_topic_id: 'repair-target-topic',
      target_question_type_id: '9709.integration.application',
    });
    expect(result.mastery_updates.every((item) => item.level !== 'question_type')).toBe(true);
    expect(reviewTaskService.calls).toHaveLength(1);
    expect(reviewTaskService.calls[0]).toMatchObject({
      authoritative_scoring_allowed: true,
      repair_target_topic_id: 'repair-target-topic',
      misconception_tags: ['domain:interval'],
    });
  });

  test('released-scoring outcomes with conservative mapping ambiguity still emit repair tasks', async () => {
    const reviewTaskService = createSpyService('generateTasksFromOutcome', async (input) => [
      {
        review_task_id: 'review-task-ambiguous-1',
        target_kind: 'question_type',
        target_topic_id: input.repair_target_topic_id,
        target_question_type_id: input.repair_target_question_type_id,
        status: 'open',
      },
    ]);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-4',
      status: 'completed',
      derived_state: derivedState,
    }));

    const result = await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-4',
        question_context: {
          family_id: '9709.integration_techniques',
          question_type_id: '9709.integration.application',
          question_type_release_state: 'released',
          primary_topic_id: 'source-topic',
          primary_topic_path: '9709/integration/source',
          classification_confidence: 0.86,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'integration-v1',
              release_state: 'released',
            },
          ],
        },
        source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-4' },
        source_mark_run_ref: { kind: 'mark_run', mark_run_id: 'mark-run-4' },
        decisions: [
          {
            awarded: true,
            awarded_marks: 1,
            alignment_confidence: 0.74,
          },
        ],
        marking_result: {
          marking_summary: {
            coverage_scope: 'question',
            local_signal_only: false,
            conservative_part_mapping: true,
            ambiguous_rubric_point_result_count: 1,
          },
        },
        uncertainty_validated: true,
        repair_target_topic_id: 'repair-target-topic',
        repair_target_topic_path: '9709/integration/repair',
        repair_target_question_type_id: '9709.integration.application',
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(result.release_scope_status).toBe('released_scoring');
    expect(result.authoritative_scoring_allowed).toBe(true);
    expect(result.review_tasks).toHaveLength(1);
    expect(result.review_tasks[0]).toMatchObject({
      review_task_id: 'review-task-ambiguous-1',
      target_topic_id: 'repair-target-topic',
      target_question_type_id: '9709.integration.application',
    });
    expect(result.mastery_updates.every((item) => item.level !== 'question_type')).toBe(true);
    expect(reviewTaskService.calls).toHaveLength(1);
    expect(reviewTaskService.calls[0]).toMatchObject({
      authoritative_scoring_allowed: true,
      repair_target_topic_id: 'repair-target-topic',
      marking_result: {
        marking_summary: {
          conservative_part_mapping: true,
          ambiguous_rubric_point_result_count: 1,
        },
      },
    });
  });
});

describe('review task service generation', () => {
  test('non-authoritative imported attempts do not enqueue default durable review tasks', async () => {
    const service = createReviewTaskService({
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const tasks = await service.generateTasksFromOutcome({
      user_id: 'student-1',
      question_id: 'question-imported-queue-1',
      authoritative_scoring_allowed: false,
      runtime_authority_posture: 'non_authoritative',
      runtime_authority_reason_code: 'imported_question_attempt',
      question_source_kind: 'imported_question',
      fallback_reason_code: 'imported_question_attempt',
      repair_target_topic_id: 'topic-1',
      repair_target_topic_path: '9709/trigonometry/identities',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-imported-queue-1' },
      misconception_tags: ['identity:rewrite'],
      question_context: {
        source_kind: 'imported_question',
        family_id: '9709.trigonometry_manipulation_equations',
        question_type_id: '9709.trigonometry.identities',
      },
    });

    expect(tasks).toEqual([]);
  });

  test('fallback review tasks now route through immediate repair with explicit scheduler policy', async () => {
    const service = createReviewTaskService({
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const [task] = await service.generateTasksFromOutcome({
      user_id: 'student-1',
      question_id: 'question-1',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'non_released_fallback',
      repair_target_topic_id: 'topic-1',
      repair_target_topic_path: '9709/trigonometry/equations',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
      misconception_tags: ['domain:interval'],
      question_context: {
        family_id: '9709.trigonometry_manipulation_equations',
        question_type_id: '9709.trigonometry.equations',
      },
      marking_result: {
        marking_summary: {
          coverage_scope: 'question',
          local_signal_only: true,
        },
      },
    });

    expect(task).toMatchObject({
      trigger_type: 'immediate_repair',
      mode: 'trap_fix',
      due_at: '2026-03-24T10:00:00.000Z',
      priority: 'high',
      success_criteria: {
        scheduler_policy: expect.objectContaining({
          route: 'immediate_repair',
          freshness_bucket: 'fresh',
          fallback_reason_code: 'non_released_fallback',
          immediate_repair_max_deferral_at: '2026-03-24T22:00:00.000Z',
        }),
      },
      explanation: {
        posture: 'conservative_fallback',
        summary: 'Queued from interval-repair evidence while authoritative mastery stays conservative.',
        freshness: {
          bucket: 'fresh',
          route: 'immediate_repair',
        },
        attempt_history: {
          attempt_count: 1,
          latest_source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
        },
        evidence: {
          source_question_id: 'question-1',
          source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
          misconception_tags: ['domain:interval'],
        },
      },
    });
  });

  test('fallback review tasks fold into an existing active repair task instead of growing the queue', async () => {
    let storedTask = buildStoredReviewTask({
      review_task_id: 'review-task-existing',
      trigger_type: 'immediate_repair',
      mode: 'trap_fix',
      priority: 'high',
      due_at: '2026-03-24T10:00:00.000Z',
      target_misconception_tags: ['domain:interval'],
      success_criteria: {
        scheduler_policy: {
          route: 'immediate_repair',
          freshness_bucket: 'fresh',
          immediate_repair_max_deferral_at: '2026-03-24T22:00:00.000Z',
        },
        explainability: {
          attempt_history: {
            attempt_count: 1,
            latest_source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-existing' },
            source_attempt_refs: [{ kind: 'attempt', attempt_id: 'attempt-existing' }],
            source_question_ids: ['question-existing'],
          },
        },
      },
    });
    const reviewTaskRepository = {
      insertCalls: [],
      updateCalls: [],
      async listReviewTaskProjectionsByUser() {
        return [storedTask];
      },
      async insertReviewTask(input) {
        this.insertCalls.push(input);
        return input;
      },
      async updateReviewTask(reviewTaskId, patch) {
        this.updateCalls.push({ reviewTaskId, patch });
        storedTask = {
          ...storedTask,
          ...patch,
        };
        return storedTask;
      },
    };
    const service = createReviewTaskService({
      reviewTaskRepository,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const [task] = await service.generateTasksFromOutcome({
      user_id: 'student-1',
      question_id: 'question-1',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'non_released_fallback',
      repair_target_topic_id: 'topic-1',
      repair_target_topic_path: '9709/trigonometry/equations',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
      misconception_tags: ['domain:interval', 'identity:rewrite'],
      question_context: {
        family_id: '9709.trigonometry_manipulation_equations',
        question_type_id: '9709.trigonometry.equations',
      },
    });

    expect(reviewTaskRepository.insertCalls).toEqual([]);
    expect(reviewTaskRepository.updateCalls).toHaveLength(1);
    expect(task).toMatchObject({
      review_task_id: 'review-task-existing',
      target_misconception_tags: ['domain:interval', 'identity:rewrite'],
      success_criteria: {
        scheduler_policy: expect.objectContaining({
          route: 'immediate_repair',
        }),
        explainability: {
          attempt_history: {
            attempt_count: 2,
            latest_source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
            source_attempt_refs: expect.arrayContaining([
              { kind: 'attempt', attempt_id: 'attempt-existing' },
              { kind: 'attempt', attempt_id: 'attempt-1' },
            ]),
          },
        },
      },
      explanation: {
        attempt_history: {
          attempt_count: 2,
        },
      },
    });
  });

  test('fallback review tasks keep explicit part/subpart scope in success criteria', async () => {
    const service = createReviewTaskService({
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const [task] = await service.generateTasksFromOutcome({
      user_id: 'student-1',
      question_id: 'question-1',
      authoritative_scoring_allowed: false,
      repair_target_topic_id: 'topic-1',
      repair_target_topic_path: '9709/trigonometry/equations',
      question_context: {
        family_id: '9709.trigonometry_manipulation_equations',
        question_type_id: '9709.trigonometry.equations',
      },
      marking_result: {
        marking_summary: {
          coverage_scope: 'subpart',
          local_signal_only: true,
          ambiguous_rubric_point_result_count: 0,
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
    });

    expect(task).toMatchObject({
      target_kind: 'question_type',
      target_question_type_id: '9709.trigonometry.equations',
      success_criteria: {
        posture: 'conservative_fallback',
        authoritative_scoring_allowed: false,
        coverage_scope: 'subpart',
        local_signal_only: true,
        ambiguous_part_mapping_count: 0,
        part_results: [
          {
            part_id: 'a',
            subpart_id: 'a_i',
            score_awarded: 1,
            score_max: 2,
          },
        ],
      },
    });
  });
});

describe('review task service write semantics', () => {
  test('complete intent records completion evidence and a governed completion outcome', async () => {
    let storedTask = buildStoredReviewTask();
    const reviewTaskRepository = {
      async getReviewTaskById() {
        return storedTask;
      },
      async updateReviewTask(reviewTaskId, patch) {
        storedTask = {
          ...storedTask,
          review_task_id: reviewTaskId,
          ...patch,
        };
        return storedTask;
      },
      async getReviewTaskProjectionById() {
        return storedTask;
      },
    };
    const service = createReviewTaskService({
      reviewTaskRepository,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const result = await service.patchReviewTask({
      userId: 'student-1',
      reviewTaskId: 'review-task-1',
      intent: 'complete',
      completionOutcome: 'completed',
      completionEvidence: {
        summary: 'Solved a fresh interval variant cleanly.',
        attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
      },
    });

    expect(result.review_task).toMatchObject({
      review_task_id: 'review-task-1',
      status: 'completed',
      completion_evidence: {
        summary: 'Solved a fresh interval variant cleanly.',
        attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
        outcome: 'completed',
        recorded_at: '2026-03-24T10:00:00.000Z',
      },
    });
  });

  test('complete intent rejects evidence-free completion payloads', async () => {
    const service = createReviewTaskService({
      reviewTaskRepository: {
        async getReviewTaskById() {
          return buildStoredReviewTask();
        },
        async updateReviewTask(reviewTaskId, patch) {
          return {
            ...buildStoredReviewTask(),
            review_task_id: reviewTaskId,
            ...patch,
          };
        },
      },
    });

    await expect(
      service.patchReviewTask({
        userId: 'student-1',
        reviewTaskId: 'review-task-1',
        intent: 'complete',
        completionOutcome: 'completed',
        completionEvidence: {},
      }),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
      status: 400,
      details: { field: 'completion_evidence' },
    });
  });

  test('schedule intents validate due_at semantics instead of mutating state generically', async () => {
    const service = createReviewTaskService({
      reviewTaskRepository: {
        async getReviewTaskById() {
          return buildStoredReviewTask({
            due_at: '2026-03-25T00:00:00.000Z',
          });
        },
        async updateReviewTask(reviewTaskId, patch) {
          return {
            ...buildStoredReviewTask({
              due_at: '2026-03-25T00:00:00.000Z',
            }),
            review_task_id: reviewTaskId,
            ...patch,
          };
        },
      },
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    await expect(
      service.patchReviewTask({
        userId: 'student-1',
        reviewTaskId: 'review-task-1',
        intent: 'snooze',
        dueAt: '2026-03-24T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
      status: 400,
      details: { field: 'due_at' },
    });
  });

  test('immediate-repair tasks cannot be deferred beyond the freshness window', async () => {
    const service = createReviewTaskService({
      reviewTaskRepository: {
        async getReviewTaskById() {
          return buildStoredReviewTask({
            trigger_type: 'immediate_repair',
            mode: 'trap_fix',
            priority: 'high',
            due_at: '2026-03-24T10:00:00.000Z',
            success_criteria: {
              scheduler_policy: {
                route: 'immediate_repair',
                freshness_bucket: 'fresh',
                immediate_repair_max_deferral_at: '2026-03-24T22:00:00.000Z',
              },
            },
          });
        },
        async updateReviewTask(reviewTaskId, patch) {
          return {
            ...buildStoredReviewTask(),
            review_task_id: reviewTaskId,
            ...patch,
          };
        },
      },
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    await expect(
      service.patchReviewTask({
        userId: 'student-1',
        reviewTaskId: 'review-task-1',
        intent: 'reschedule',
        dueAt: '2026-03-25T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
      status: 400,
      details: { field: 'due_at' },
    });
  });

  test('write intents enforce task ownership', async () => {
    const service = createReviewTaskService({
      reviewTaskRepository: {
        async getReviewTaskById() {
          return buildStoredReviewTask();
        },
        async updateReviewTask(reviewTaskId, patch) {
          return {
            ...buildStoredReviewTask(),
            review_task_id: reviewTaskId,
            ...patch,
          };
        },
      },
    });

    await expect(
      service.patchReviewTask({
        userId: 'student-2',
        reviewTaskId: 'review-task-1',
        intent: 'reschedule',
        dueAt: '2026-03-25T12:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      code: 'auth_forbidden',
      status: 403,
    });
  });

  test('reopen rejects already-open tasks with a stable conflict code', async () => {
    const service = createReviewTaskService({
      reviewTaskRepository: {
        async getReviewTaskById() {
          return buildStoredReviewTask({
            status: 'open',
          });
        },
        async updateReviewTask(reviewTaskId, patch) {
          return {
            ...buildStoredReviewTask({
              status: 'open',
            }),
            review_task_id: reviewTaskId,
            ...patch,
          };
        },
      },
    });

    await expect(
      service.patchReviewTask({
        userId: 'student-1',
        reviewTaskId: 'review-task-1',
        intent: 'reopen',
      }),
    ).rejects.toMatchObject({
      code: 'review_task_state_conflict',
      status: 409,
    });
  });
});

describe('review task service review-action contract', () => {
  test('review target key includes authority posture so fallback and released scoring stay distinct', async () => {
    let storedTask = buildStoredReviewTask({
      review_task_id: 'review-task-fallback',
      success_criteria: {
        posture: 'conservative_fallback',
      },
      trigger_type: 'immediate_repair',
      mode: 'trap_fix',
      priority: 'high',
      target_misconception_tags: ['domain:interval'],
    });
    const reviewTaskRepository = {
      insertCalls: [],
      updateCalls: [],
      async listReviewTaskProjectionsByUser() {
        return [storedTask];
      },
      async insertReviewTask(input) {
        this.insertCalls.push(input);
        return {
          review_task_id: 'review-task-released',
          ...input,
        };
      },
      async updateReviewTask(reviewTaskId, patch) {
        this.updateCalls.push({ reviewTaskId, patch });
        storedTask = {
          ...storedTask,
          ...patch,
        };
        return storedTask;
      },
    };
    const service = createReviewTaskService({
      reviewTaskRepository,
      reviewActionContractEnabled: true,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const [task] = await service.generateTasksFromOutcome({
      user_id: 'student-1',
      question_id: 'question-1',
      authoritative_scoring_allowed: true,
      repair_target_topic_id: 'topic-1',
      repair_target_topic_path: '9709/trigonometry/equations',
      source_attempt_ref: { kind: 'attempt', attempt_id: 'attempt-1' },
      misconception_tags: ['domain:interval'],
      question_context: {
        family_id: '9709.trigonometry_manipulation_equations',
        question_type_id: '9709.trigonometry.equations',
      },
    });

    expect(reviewTaskRepository.updateCalls).toEqual([]);
    expect(reviewTaskRepository.insertCalls).toHaveLength(1);
    expect(task).toMatchObject({
      review_task_id: 'review-task-released',
      success_criteria: expect.objectContaining({
        posture: 'released_scoring_repair',
        review_target_key:
          'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
      }),
    });
    expect(reviewTaskRepository.insertCalls[0].success_criteria.review_target_key)
      .not.toBe('question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|conservative_fallback');
  });

  test('partial creates an open successor and expires the current task as merged_into_successor', async () => {
    let storedTask = buildStoredReviewTask({
      review_task_id: 'review-task-1',
      due_at: '2026-03-25T00:00:00.000Z',
      success_criteria: {
        posture: 'released_scoring_repair',
        review_target_key:
          'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
      },
    });
    const reviewTaskRepository = {
      insertCalls: [],
      updateCalls: [],
      async getReviewTaskById() {
        return storedTask;
      },
      async listReviewTaskProjectionsByUser() {
        return [storedTask];
      },
      async insertReviewTask(input) {
        this.insertCalls.push(input);
        return {
          review_task_id: 'review-task-successor',
          created_at: '2026-03-24T10:00:00.000Z',
          updated_at: '2026-03-24T10:00:00.000Z',
          ...input,
        };
      },
      async updateReviewTask(reviewTaskId, patch) {
        this.updateCalls.push({ reviewTaskId, patch });
        if (reviewTaskId === storedTask.review_task_id) {
          storedTask = {
            ...storedTask,
            ...patch,
          };
          return storedTask;
        }

        return {
          review_task_id: reviewTaskId,
          ...patch,
        };
      },
      async getReviewTaskProjectionById(reviewTaskId) {
        if (reviewTaskId === 'review-task-successor') {
          return {
            review_task_id: 'review-task-successor',
            user_id: 'student-1',
            status: 'open',
            due_at: '2026-03-24T10:00:00.000Z',
            success_criteria: {
              review_target_key:
                'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
            },
          };
        }

        return storedTask;
      },
    };
    const service = createReviewTaskService({
      reviewTaskRepository,
      reviewActionContractEnabled: true,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const result = await service.patchReviewTask({
      userId: 'student-1',
      reviewTaskId: 'review-task-1',
      intent: 'complete',
      completionOutcome: 'partial',
      completionEvidence: {
        summary: 'Need one more interval check.',
        attempt_ref: { kind: 'attempt', attempt_id: 'attempt-2' },
      },
    });

    expect(reviewTaskRepository.insertCalls).toHaveLength(1);
    expect(reviewTaskRepository.insertCalls[0]).toMatchObject({
      status: 'open',
      due_at: '2026-03-24T10:00:00.000Z',
      success_criteria: expect.objectContaining({
        review_target_key:
          'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
        review_action_contract: expect.objectContaining({
          last_lineage_action: 'partial',
        }),
      }),
    });
    expect(reviewTaskRepository.updateCalls[0]).toMatchObject({
      reviewTaskId: 'review-task-1',
      patch: {
        status: 'expired',
        completion_evidence: expect.objectContaining({
          outcome: 'partial',
          backend_disposition: 'merged_into_successor',
          successor_review_task_ref: {
            kind: 'review_task',
            review_task_id: 'review-task-successor',
          },
        }),
      },
    });
    expect(result.review_task).toMatchObject({
      review_task_id: 'review-task-successor',
      status: 'open',
    });
  });

  test('reschedule updates due_at while retaining schedule provenance', async () => {
    let storedTask = buildStoredReviewTask({
      due_at: '2026-03-25T00:00:00.000Z',
      success_criteria: {
        posture: 'released_scoring_repair',
        review_target_key:
          'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
      },
    });
    const reviewTaskRepository = {
      async getReviewTaskById() {
        return storedTask;
      },
      async updateReviewTask(reviewTaskId, patch) {
        storedTask = {
          ...storedTask,
          review_task_id: reviewTaskId,
          ...patch,
        };
        return storedTask;
      },
      async getReviewTaskProjectionById() {
        return storedTask;
      },
    };
    const service = createReviewTaskService({
      reviewTaskRepository,
      reviewActionContractEnabled: true,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const result = await service.patchReviewTask({
      userId: 'student-1',
      reviewTaskId: 'review-task-1',
      intent: 'reschedule',
      dueAt: '2026-03-25T12:00:00.000Z',
    });

    expect(result.review_task).toMatchObject({
      review_task_id: 'review-task-1',
      due_at: '2026-03-25T12:00:00.000Z',
      success_criteria: {
        review_action_contract: {
          last_lineage_action: 'reschedule',
          schedule_provenance: [
            {
              intent: 'reschedule',
              previous_due_at: '2026-03-25T00:00:00.000Z',
              next_due_at: '2026-03-25T12:00:00.000Z',
              changed_at: '2026-03-24T10:00:00.000Z',
            },
          ],
        },
      },
    });
  });

  test('skip_once rejects consecutive lineage skips for the current active successor', async () => {
    const service = createReviewTaskService({
      reviewTaskRepository: {
        async getReviewTaskById() {
          return buildStoredReviewTask({
            review_task_id: 'review-task-successor',
            due_at: '2026-03-24T10:00:00.000Z',
            success_criteria: {
              posture: 'released_scoring_repair',
              review_target_key:
                'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
              review_action_contract: {
                lineage_key: 'lineage-1',
                predecessor_review_task_ref: {
                  kind: 'review_task',
                  review_task_id: 'review-task-1',
                },
                last_lineage_action: 'skip_once',
              },
            },
          });
        },
        async updateReviewTask(reviewTaskId, patch) {
          return {
            ...buildStoredReviewTask(),
            review_task_id: reviewTaskId,
            ...patch,
          };
        },
      },
      reviewActionContractEnabled: true,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    await expect(
      service.patchReviewTask({
        userId: 'student-1',
        reviewTaskId: 'review-task-successor',
        intent: 'snooze',
      }),
    ).rejects.toMatchObject({
      code: 'review_task_state_conflict',
      status: 409,
      details: {
        lineage_key: 'lineage-1',
      },
    });
  });

  test.each([
    ['invalidate', 'invalidated'],
    ['withdraw', 'withdrawn_by_policy'],
  ])('%s records backend disposition without pretending completion', async (intent, backendDisposition) => {
    let storedTask = buildStoredReviewTask({
      success_criteria: {
        posture: 'released_scoring_repair',
        review_target_key:
          'question_type|topic-1|9709.trigonometry_manipulation_equations|9709.trigonometry.equations|released_scoring_repair',
      },
    });
    const reviewTaskRepository = {
      async getReviewTaskById() {
        return storedTask;
      },
      async updateReviewTask(reviewTaskId, patch) {
        storedTask = {
          ...storedTask,
          review_task_id: reviewTaskId,
          ...patch,
        };
        return storedTask;
      },
      async getReviewTaskProjectionById() {
        return storedTask;
      },
    };
    const service = createReviewTaskService({
      reviewTaskRepository,
      reviewActionContractEnabled: true,
      now: () => new Date('2026-03-24T10:00:00.000Z'),
    });

    const result = await service.patchReviewTask({
      userId: 'student-1',
      reviewTaskId: 'review-task-1',
      intent,
      completionEvidence: {
        note: 'Operator reconciliation closed this task.',
      },
    });

    expect(result.review_task).toMatchObject({
      review_task_id: 'review-task-1',
      status: 'expired',
      completion_evidence: expect.objectContaining({
        backend_disposition: backendDisposition,
        note: 'Operator reconciliation closed this task.',
      }),
    });
    expect(result.review_task.completion_evidence.outcome).toBeUndefined();
  });
});
