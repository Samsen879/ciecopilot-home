import { buildSessionViewModel } from '../view-models/session-view-model.js';

function createQuestionlessSessionPayload() {
  return {
    session: {
      sessionId: 'sess-concept-1',
      mode: 'learn_concept',
      state: 'active',
      sessionGoal: 'Build trig identity intuition',
      currentQuestion: null,
      currentQuestionId: null,
      currentQuestionTypeId: '9709.trigonometry.identities',
      currentQuestionType: {
        kind: 'question_type',
        questionTypeId: '9709.trigonometry.identities',
      },
      activeScope: {
        primaryTopicId: 'topic-trig-identities',
        primaryTopicPath: '9709/trigonometry/identities',
        currentAnchorKind: 'concept',
        currentAnchor: {
          kind: 'concept',
          topicId: 'topic-trig-identities',
          topicPath: '9709/trigonometry/identities',
        },
      },
      lineageRef: {
        parentSessionId: null,
        handoffKind: null,
      },
      openQuestions: [],
      keyArtifactRefs: [],
      misconceptionsInFocus: [],
      createdAt: '2026-03-22T00:00:00.000Z',
      updatedAt: '2026-03-22T00:05:00.000Z',
    },
    canonicalHomeContext: {
      sourceAnchorKind: 'concept',
      topicRef: {
        kind: 'topic',
        topicId: 'topic-trig-identities',
        topicPath: '9709/trigonometry/identities',
      },
    },
    featureFlags: {
      learningRuntimeEnabled: true,
    },
  };
}

describe('learning runtime session view model', () => {
  test('preserves questionless runtime state without placeholder ids', () => {
    const vm = buildSessionViewModel(createQuestionlessSessionPayload());

    expect(vm.session.currentQuestion).toBeNull();
    expect(vm.session.currentQuestionId).toBeNull();
    expect(vm.session.currentQuestionTypeId).toBe('9709.trigonometry.identities');
    expect(vm.session.hasQuestion).toBe(false);
    expect(vm.header.modeLabel).toBe('learn concept');
    expect(vm.header.anchorKind).toBe('concept');
    expect(vm.header.topicPath).toBe('9709/trigonometry/identities');
    expect(vm.timeline.some((entry) => entry.kind === 'question')).toBe(false);
  });

  test('surfaces explicit fallback posture instead of synthesizing score state', () => {
    const vm = buildSessionViewModel({
      ...createQuestionlessSessionPayload(),
      latestResponse: {
        assistantMessage: 'Let us stay in concept mode before scoring.',
        fallbackPosture: {
          fallbackMode: 'non_released_fallback',
          authoritativeScoringAllowed: false,
          fallbackReasonCode: 'non_pilot_question_type',
          classificationConfidence: null,
          learningSignalPosture: 'conservative_fallback',
        },
        evidenceSummary: {
          sourceTopicPath: '9709/trigonometry/identities',
          retrievedEvidenceCount: 0,
        },
      },
    });

    expect(vm.header.fallbackMode).toBe('non_released_fallback');
    expect(vm.header.authoritativeScoringAllowed).toBe(false);
    expect(vm.timeline[0]).toEqual(expect.objectContaining({
      kind: 'assistant_response',
      fallbackReasonCode: 'non_pilot_question_type',
      learningSignalPosture: 'conservative_fallback',
    }));
  });
});
