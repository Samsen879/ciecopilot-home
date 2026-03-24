import { applyLearningEffects } from '../lib/mastery/mastery-orchestrator.js';

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
});
