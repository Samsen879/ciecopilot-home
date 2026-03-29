import {
  FALLBACK_REASON_CODES,
  LEARNING_FALLBACK_MODES,
  LEARNING_SIGNAL_POSTURES,
  RELEASE_SCOPE_STATUSES,
  isSeededPilotQuestionType,
  resolveReleasedScoringPosture,
} from '../lib/contracts/released-scope.js';

test('released scoring membership is registry-backed rather than JS-only type ids', () => {
  expect(
    isSeededPilotQuestionType(
      '9709.trigonometry.identities',
      'released',
    ),
  ).toBe(true);
  expect(
    isSeededPilotQuestionType(
      '9709.integration.application',
      'released',
    ),
  ).toBe(true);
  expect(
    isSeededPilotQuestionType(
      '9709.differential_equations.separable',
      'released',
    ),
  ).toBe(true);
  expect(
    isSeededPilotQuestionType(
      '9709.integration.volume_of_revolution',
      'validated',
    ),
  ).toBe(false);
  expect(
    isSeededPilotQuestionType(
      '9709.differential_equations.modelling',
      'validated',
    ),
  ).toBe(false);
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

test('promoted differential equations separable can unlock authoritative scoring once all gates pass', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.differential_equations.separable',
      questionTypeReleaseState: 'released',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.differential_equations.separable',
          rubric_version_id: 'diff-eq-v1',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.92,
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: 0.92,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  });
});

test('pilot type with a released rubric and validated uncertainty unlocks authoritative scoring', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.trigonometry.identities',
      questionTypeReleaseState: 'released',
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
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: 0.94,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  });
});

test('pilot type with released rubric still falls back when classification confidence is missing', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.trigonometry.identities',
      questionTypeReleaseState: 'released',
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
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.MISSING_CLASSIFICATION_CONFIDENCE,
    classification_confidence: null,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});

test('promoted integration application can unlock authoritative scoring once all gates pass', () => {
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
    release_scope_status: RELEASE_SCOPE_STATUSES.RELEASED_SCORING,
    authoritative_scoring_allowed: true,
    fallback_mode: null,
    fallback_reason_code: null,
    classification_confidence: 0.89,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.AUTHORITATIVE_SCORING,
  });
});

test('non-promoted integration question types remain fallback only even with a released rubric', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.integration.volume_of_revolution',
      questionTypeReleaseState: 'validated',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.integration.volume_of_revolution',
          rubric_version_id: 'v2',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.77,
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
    classification_confidence: 0.77,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});

test('non-promoted differential equations question types remain fallback only even with a released rubric', () => {
  expect(
    resolveReleasedScoringPosture({
      questionTypeId: '9709.differential_equations.modelling',
      questionTypeReleaseState: 'validated',
      candidateRubricRefs: [
        {
          kind: 'rubric_release',
          rubric_set_id: '9709.differential_equations.modelling',
          rubric_version_id: 'diff-eq-modelling-v1',
          scope_level: 'question_type',
          release_state: 'released',
        },
      ],
      uncertaintyValidated: true,
      classificationConfidence: 0.78,
    }),
  ).toMatchObject({
    release_scope_status: RELEASE_SCOPE_STATUSES.NON_RELEASED_FALLBACK,
    authoritative_scoring_allowed: false,
    fallback_mode: LEARNING_FALLBACK_MODES.NON_RELEASED_FALLBACK,
    fallback_reason_code: FALLBACK_REASON_CODES.NON_PILOT_QUESTION_TYPE,
    classification_confidence: 0.78,
    learning_signal_posture: LEARNING_SIGNAL_POSTURES.CONSERVATIVE_FALLBACK,
  });
});

test('released-scope posture exposes factorized explainability for fallback and authoritative states', () => {
  const fallback = resolveReleasedScoringPosture({
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
    uncertaintyValidated: false,
    classificationConfidence: 0.78,
  });
  const authoritative = resolveReleasedScoringPosture({
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
  });

  expect(fallback).toMatchObject({
    fallback_reason_code: 'unvalidated_uncertainty_posture',
    explanation: {
      posture: 'conservative_fallback',
      summary: expect.stringContaining('uncertainty'),
      factors: expect.arrayContaining([
        expect.objectContaining({
          code: 'released_question_type',
          status: 'met',
        }),
        expect.objectContaining({
          code: 'released_family_evidence',
          status: 'met',
        }),
        expect.objectContaining({
          code: 'released_rubric',
          status: 'met',
        }),
        expect.objectContaining({
          code: 'classification_confidence',
          status: 'met',
          value: 0.78,
        }),
        expect.objectContaining({
          code: 'uncertainty_validation',
          status: 'missing',
        }),
      ]),
    },
  });
  expect(authoritative).toMatchObject({
    authoritative_scoring_allowed: true,
    explanation: {
      posture: 'released_authoritative',
      summary: expect.stringContaining('authoritative'),
      factors: expect.arrayContaining([
        expect.objectContaining({
          code: 'uncertainty_validation',
          status: 'met',
        }),
      ]),
    },
  });
});
