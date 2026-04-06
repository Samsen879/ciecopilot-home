import fs from 'node:fs';
import { jest } from '@jest/globals';

function createSpyService(methodName, implementation) {
  return {
    async [methodName](input) {
      return implementation(input);
    },
  };
}

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('mastery-orchestrator', () => {
  test('does not re-read released-family evidence on already-authoritative learning effects', async () => {
    const readFileSpy = jest.spyOn(fs, 'readFileSync');
    const { applyLearningEffects } = await import('../lib/mastery/mastery-orchestrator.js');
    const readsAfterImport = readFileSpy.mock.calls.length;

    const reviewTaskService = createSpyService('generateTasksFromOutcome', async () => []);
    const artifactService = createSpyService('buildArtifactCandidates', async () => []);
    const reconciliationService = createSpyService('reconcileDerivedState', async ({ derivedState }) => ({
      reconciliation_run_id: 'recon-hot-path',
      status: 'completed',
      derived_state: derivedState,
    }));

    await applyLearningEffects(
      {
        user_id: 'student-1',
        question_id: 'question-1',
        question_context: {
          family_id: '9709.trigonometry_manipulation_equations',
          question_type_id: '9709.trigonometry.equations',
          question_type_release_state: 'released',
          primary_topic_id: 'topic-trig-equations',
          classification_confidence: 0.93,
          candidate_rubric_refs: [
            {
              kind: 'rubric_release',
              rubric_version_id: 'trig-eq-v1',
              release_state: 'released',
            },
          ],
        },
        decisions: [
          {
            awarded: true,
            awarded_marks: 2,
            alignment_confidence: 0.94,
          },
        ],
        uncertainty_validated: true,
        release_scope_posture: {
          release_scope_status: 'released_scoring',
          authoritative_scoring_allowed: true,
          fallback_mode: null,
          fallback_reason_code: null,
          classification_confidence: 0.93,
          learning_signal_posture: 'authoritative_scoring',
        },
      },
      {
        reviewTaskService,
        artifactService,
        reconciliationService,
      },
    );

    expect(readFileSpy.mock.calls.length).toBe(readsAfterImport);
  });
});
