import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LearningSessionShell from '../LearningSessionShell.js';
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
      createdAt: '2026-03-22T00:00:00.000Z',
      updatedAt: '2026-03-22T00:05:00.000Z',
      openQuestions: [],
      keyArtifactRefs: [],
      misconceptionsInFocus: [],
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

describe('LearningSessionShell', () => {
  test('renders questionless sessions without placeholder question chrome', () => {
    const questionlessSessionVm = buildSessionViewModel(createQuestionlessSessionPayload());
    const html = renderToStaticMarkup(
      React.createElement(LearningSessionShell, {
        viewModel: questionlessSessionVm,
      }),
    );

    expect(html).toContain('learn concept');
    expect(html).toContain('Questionless entry');
    expect(html).toContain('9709/trigonometry/identities');
    expect(html).not.toContain('Current question');
    expect(html).not.toContain('placeholder-question-id');
  });
});
