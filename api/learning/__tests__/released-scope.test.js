import {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  isReleasedScoringQuestionType,
  isSeededPilotQuestionType,
  resolveReleasedScoringPosture,
} from '../lib/contracts/released-scope.js';

test('released authoritative question-type membership is registry-backed across promoted 9709 families', () => {
  expect(isReleasedScoringQuestionType('9709.trigonometry.identities')).toBe(true);
  expect(isReleasedScoringQuestionType('9709.trigonometry.equations')).toBe(true);
  expect(isReleasedScoringQuestionType('9709.integration.application')).toBe(true);
  expect(isReleasedScoringQuestionType('9709.differential_equations.separable')).toBe(true);
  expect(isReleasedScoringQuestionType('9709.integration.substitution')).toBe(false);

  expect(isSeededPilotQuestionType('9709.trigonometry.identities')).toBe(true);
  expect(isSeededPilotQuestionType('9709.trigonometry.equations')).toBe(true);
  expect(isSeededPilotQuestionType('9709.integration.application')).toBe(true);
  expect(isSeededPilotQuestionType('9709.differential_equations.separable')).toBe(true);
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

test('low confidence pilot classifications stay in explicit fallback posture', () => {
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
      classificationConfidence: 0.77,
      confidenceBand: 'low',
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.LOW_CLASSIFICATION_CONFIDENCE,
    classification_confidence: 0.77,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});

test('explicit calibrated confidence bands are honored by the exported released-scope resolver', () => {
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
      classificationConfidence: 0.79,
      confidenceBand: 'medium',
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: 0.79,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  });
});

test.each([
  [
    '9709.trigonometry.identities',
    'trig-identities-v1',
    0.94,
  ],
  [
    '9709.integration.application',
    'integration-application-v1',
    0.89,
  ],
  [
    '9709.differential_equations.separable',
    'differential-separable-v1',
    0.91,
  ],
])(
  'released question type %s can unlock authoritative scoring once all gates pass',
  (questionTypeId, rubricVersionId, classificationConfidence) => {
    expect(
      resolveReleasedScoringPosture({
        questionTypeId,
        questionTypeReleaseState: 'released',
        candidateRubricRefs: [
          {
            kind: 'rubric_release',
            rubric_set_id: questionTypeId,
            rubric_version_id: rubricVersionId,
            scope_level: 'question_type',
            release_state: 'released',
          },
        ],
        uncertaintyValidated: true,
        classificationConfidence,
      }),
    ).toMatchObject({
      release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
      authoritative_scoring_allowed: true,
      fallback_mode: null,
      fallback_reason_code: null,
      classification_confidence: classificationConfidence,
      learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
    });
  },
);

test('non-promoted released families remain explicit fallback even when other gates pass', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.integration.substitution',
      questionTypeReleaseState: 'released',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.integration.substitution',
          rubric_version_id: 'integration-substitution-v1',
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
