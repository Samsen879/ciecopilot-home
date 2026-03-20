import {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  isSeededPilotQuestionType,
  resolveReleasedScoringPosture,
} from '../lib/contracts/released-scope.js';

test('seeded pilot question-type membership is trigonometry only', () => {
  expect(isSeededPilotQuestionType('9709.trigonometry.identities')).toBe(true);
  expect(isSeededPilotQuestionType('9709.integration.application')).toBe(false);
});

test('pilot type membership alone does not unlock authoritative scoring', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.trigonometry.identities',
      candidateRubricRefs: [],
      uncertaintyValidated: false,
      classificationConfidence: 0.81,
    }),
  ).toEqual({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.MISSING_RELEASED_RUBRIC,
    classification_confidence: 0.81,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});

test('pilot type with a released rubric and validated uncertainty unlocks authoritative scoring', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.trigonometry.identities',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: 'trig-identities',
          rubric_version_id: 'v1',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.94,
    }),
  ).toEqual({
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: 0.94,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  });
});

test('non-pilot question types remain fallback only even with a released rubric', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.integration.application',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: 'integration',
          rubric_version_id: 'v2',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.77,
    }),
  ).toEqual({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
    classification_confidence: 0.77,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});
