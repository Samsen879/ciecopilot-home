import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LearningSessionShell from '../LearningSessionShell.js';
import { buildSessionViewModel } from '../view-models/session-view-model.js';
import {
  createSessionLaunchDraft,
  mergeAskResponseIntoSessionPayload,
} from '../view-models/session-live-state.js';

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

function createContinuitySessionPayload() {
  const payload = createQuestionlessSessionPayload();

  return {
    ...payload,
    session: {
      ...payload.session,
      sessionId: 'sess-handoff-1',
      state: 'handoff_suggested',
      lineage: {
        parentSessionId: 'sess-parent-1',
        handoffKind: 'explicit_new_session',
        summarySnapshot: {
          recap: 'Carry forward the compacted recap before opening another full thread.',
        },
      },
      handoff: {
        supported: true,
        suggestedHandoff: {
          shouldHandoff: true,
          handoffKind: 'internal_compaction',
          reasonCode: 'session_turn_limit',
          message: 'Compact the runtime context before the next return.',
          questionless: true,
        },
        internalCompaction: {
          supported: true,
          shouldHandoff: true,
          summarySnapshot: {
            recap: 'Carry forward the compacted recap before opening another full thread.',
          },
        },
        explicitNewSession: {
          supported: true,
          carryForwardSummary: {
            recap: 'Carry forward the compacted recap before opening another full thread.',
          },
        },
      },
      resumeGuidance: {
        title: 'Resume this concept session',
        message: 'Re-enter through the concept anchor without inventing a question id.',
        summary: 'Carry forward the compacted recap before opening another full thread.',
        questionless: true,
        anchorKind: 'concept',
        currentQuestionId: null,
        currentQuestionTypeId: '9709.trigonometry.identities',
        parentSessionId: 'sess-parent-1',
        handoffKind: 'explicit_new_session',
      },
    },
  };
}

function createPostMortemSessionPayload() {
  return {
    session: {
      sessionId: 'sess-post-mortem-1',
      mode: 'post_mortem_review',
      state: 'handoff_suggested',
      sessionGoal: 'Review the scored attempt before starting repair',
      currentQuestionId: 'question-trig-1',
      currentQuestionTypeId: '9709.trigonometry.equations',
      currentQuestion: {
        kind: 'question',
        questionId: 'question-trig-1',
      },
      currentQuestionType: {
        kind: 'question_type',
        questionTypeId: '9709.trigonometry.equations',
      },
      activeScope: {
        primaryTopicId: 'topic-trig-equations',
        primaryTopicPath: '9709/trigonometry/equations',
        currentAnchorKind: 'artifact',
        currentAnchor: {
          kind: 'artifact',
          artifactId: 'artifact-misconception-1',
        },
      },
      keyArtifactRefs: [
        {
          kind: 'artifact',
          artifactId: 'artifact-misconception-1',
        },
      ],
      misconceptionsInFocus: ['domain:interval', 'sign:inverse'],
      summaryState: {
        postMortemReview: {
          scoringPosture: {
            releaseScopeStatus: 'non_released_fallback',
            authoritativeScoringAllowed: false,
            fallbackReasonCode: 'non_released_fallback',
          },
          diagnosticFocus: {
            title: 'Interval restrictions drove the miss',
            summary: 'The scored attempt lost marks on the interval restriction and inverse-sign handling.',
            sourceQuestionId: 'question-trig-1',
            sourceAttemptRef: {
              kind: 'attempt',
              attemptId: 'attempt-trig-1',
            },
            sourceMarkRunRef: {
              kind: 'mark_run',
              markRunId: 'mark-run-trig-1',
            },
          },
          artifactCandidates: [
            {
              artifactId: 'artifact-misconception-1',
              artifactKind: 'misconception_card',
              canonicalHomeTopicId: 'topic-trig-equations',
              targetQuestionTypeId: '9709.trigonometry.equations',
              trustStatus: 'unverified',
              placementStatus: 'inbox',
              lifecycleStatus: 'active',
              slotKey: 'common_traps',
            },
          ],
          repairHandoff: {
            title: 'Start the repair session',
            message: 'Use the projected review task to retry the misconception inside canonical runtime flows.',
            actionLabel: 'Launch repair session',
            launchPayload: {
              anchorKind: 'review_task',
              reviewTaskId: 'review-task-1',
              mode: 'spaced_review',
              topicId: 'topic-trig-equations',
              topicPath: '9709/trigonometry/equations',
              currentQuestionTypeId: '9709.trigonometry.equations',
            },
          },
        },
      },
      createdAt: '2026-03-22T00:00:00.000Z',
      updatedAt: '2026-03-22T00:05:00.000Z',
    },
    canonicalHomeContext: {
      sourceAnchorKind: 'artifact',
      topicRef: {
        kind: 'topic',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
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

  test('renders launcher loading and request-error states before a session exists', () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningSessionShell, {
        viewModel: buildSessionViewModel({}, {
          launcher: {
            draft: createSessionLaunchDraft({
              sessionGoal: 'Warm up trig identities',
            }),
            status: 'submitting',
            errorMessage: 'This mode is not allowed for the anchor kind.',
          },
        }),
      }),
    );

    expect(html).toContain('Launch a learning session');
    expect(html).toContain('Warm up trig identities');
    expect(html).toContain('Launching session...');
    expect(html).toContain('This mode is not allowed for the anchor kind.');
  });

  test('renders ask composer, live turns, and fallback posture for active sessions', () => {
    const sessionPayload = mergeAskResponseIntoSessionPayload(
      createQuestionlessSessionPayload(),
      {
        assistantMessage: 'Start with the double-angle identity for sine.',
        evidenceSummary: {
          sourceTopicPath: '9709/trigonometry/identities',
          retrievedEvidenceCount: 2,
        },
        fallbackPosture: {
          fallbackMode: 'non_released_fallback',
          authoritativeScoringAllowed: false,
          fallbackReasonCode: 'non_pilot_question_type',
          classificationConfidence: null,
          learningSignalPosture: 'conservative_fallback',
        },
        sessionDelta: {
          clientTurnId: 'local-turn-3',
          currentQuestion: null,
          currentQuestionType: {
            kind: 'question_type',
            questionTypeId: '9709.trigonometry.identities',
          },
        },
      },
    );

    const html = renderToStaticMarkup(
      React.createElement(LearningSessionShell, {
        viewModel: buildSessionViewModel(sessionPayload, {
          turnHistory: [
            {
              clientTurnId: 'local-turn-3',
              userMessage: 'Give me the next hint only.',
              response: sessionPayload.latestResponse,
            },
          ],
          composer: {
            message: 'Give me the next hint only.',
            status: 'submitting',
            errorMessage: 'Session update is still in flight.',
          },
        }),
      }),
    );

    expect(html).toContain('Runtime fallback is active');
    expect(html).toContain('non_released_fallback');
    expect(html).toContain('Give me the next hint only.');
    expect(html).toContain('Start with the double-angle identity for sine.');
    expect(html).toContain('Sending follow-up...');
    expect(html).toContain('Session update is still in flight.');
  });

  test('renders resume guidance and handoff suggestions for questionless continuity states', () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningSessionShell, {
        viewModel: buildSessionViewModel(createContinuitySessionPayload()),
      }),
    );

    expect(html).toContain('Resume this concept session');
    expect(html).toContain('Re-enter through the concept anchor without inventing a question id.');
    expect(html).toContain('sess-parent-1');
    expect(html).toContain('internal compaction');
    expect(html).toContain('session_turn_limit');
    expect(html).not.toContain('Current question');
  });

  test('renders a dedicated post-mortem review section with diagnosis, misconception focus, evidence, and repair handoff', () => {
    const html = renderToStaticMarkup(
      React.createElement(LearningSessionShell, {
        viewModel: buildSessionViewModel(createPostMortemSessionPayload()),
      }),
    );

    expect(html).toContain('Post-mortem review');
    expect(html).toContain('Interval restrictions drove the miss');
    expect(html).toContain('domain interval');
    expect(html).toContain('sign inverse');
    expect(html).toContain('attempt-trig-1');
    expect(html).toContain('mark-run-trig-1');
    expect(html).toContain('artifact-misconception-1');
    expect(html).toContain('Launch repair session');
    expect(html).toContain('Use the projected review task to retry the misconception inside canonical runtime flows.');
  });
});
