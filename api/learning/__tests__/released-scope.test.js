import {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  isSeededPilotQuestionType,
  resolveReleasedScoringPosture,
} from '../lib/contracts/released-scope.js';

test('seeded pilot question-type membership is registry-backed and frozen to trigonometry', () => {
  expect(isSeededPilotQuestionType('9709.trigonometry.identities')).toBe(true);
  expect(isSeededPilotQuestionType('9709.trigonometry.equations')).toBe(true);
  expect(isSeededPilotQuestionType('9709.integration.application')).toBe(false);
  expect(isSeededPilotQuestionType('9709.differential_equations.separable')).toBe(false);
});

test('pilot type membership alone does not unlock authoritative scoring', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.trigonometry.identities',
      questionTypeReleaseState: 'released',
      candidateRubricRefs: [],
      uncertaintyValidated: false,
      classificationConfidence: 0.81,
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.MISSING_RELEASED_RUBRIC,
    classification_confidence: 0.81,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});

test('released trigonometry types can unlock authoritative scoring once all gates pass', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.trigonometry.identities',
      questionTypeReleaseState: 'released',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.trigonometry.identities',
          rubric_version_id: 'trig-identities-v1',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.94,
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: 0.94,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  });
});

test('non-pilot released families remain explicit fallback even when other gates pass', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.integration.application',
      questionTypeReleaseState: 'released',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.integration.application',
          rubric_version_id: 'integration-application-v1',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.89,
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
    classification_confidence: 0.89,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
    explanation: {
      posture: 'conservative_fallback',
      summary: expect.stringContaining('outside the released authoritative slice'),
    },
  });
});
