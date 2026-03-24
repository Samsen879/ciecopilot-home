import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ImportPostureBanner from '../ImportPostureBanner.js';

describe('ImportPostureBanner', () => {
  test('renders explicit fallback posture and handoff controls before entering a session', () => {
    const html = renderToStaticMarkup(
      React.createElement(ImportPostureBanner, {
        question: {
          questionId: 'question-import-1',
          primaryQuestionTypeId: '9709.integration.application',
          releaseScopeStatus: 'non_released_fallback',
        },
        posture: {
          releaseScopeStatus: 'non_released_fallback',
          authoritativeScoringAllowed: false,
          fallbackMode: 'non_released_fallback',
          fallbackReasonCode: 'non_pilot_question_type',
          classificationConfidence: 0.77,
          learningSignalPosture: 'conservative_fallback',
        },
        handoffStatus: 'idle',
        onStartSession: () => {},
      }),
    );

    expect(html).toContain('Imported question ready');
    expect(html).toContain('non_released_fallback');
    expect(html).toContain('non_pilot_question_type');
    expect(html).toContain('question-import-1');
    expect(html).toContain('Enter runtime session');
  });
});
