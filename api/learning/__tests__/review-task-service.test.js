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

  test('fallback-only family creates review tasks without authoritative score effects', async () => {
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
          primary_topic_id: 'source-topic',
          primary_topic_path: '9709/integration/source',
          classification_confidence: 0.78,
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
