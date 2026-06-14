import { jest } from '@jest/globals';

import {
  createLearningRuntimePageHarness,
  createDeferred,
  getLatestCapture,
  textContent,
} from './page-route-test-harness.js';

function createSessionPayload(overrides = {}) {
  const sessionId = overrides.sessionId || 'sess-route-1';
  const currentQuestionId = Object.prototype.hasOwnProperty.call(overrides, 'currentQuestionId')
    ? overrides.currentQuestionId
    : 'question-route-1';
  const currentQuestionTypeId = overrides.currentQuestionTypeId || '9709.trigonometry.equations';

  return {
    session: {
      sessionId,
      mode: overrides.mode || 'guided_solve',
      state: 'active',
      sessionGoal: 'Stay inside the routed runtime session',
      currentQuestionId,
      currentQuestionTypeId,
      currentQuestion: currentQuestionId
        ? {
          kind: 'question',
          questionId: currentQuestionId,
        }
        : null,
      currentQuestionType: currentQuestionTypeId
        ? {
          kind: 'question_type',
          questionTypeId: currentQuestionTypeId,
        }
        : null,
      activeScope: {
        primaryTopicId: 'topic-trig-equations',
        primaryTopicPath: '9709/trigonometry/equations',
        currentAnchorKind: overrides.anchorKind || 'question',
        currentAnchor: overrides.currentAnchor || {
          kind: 'question',
          questionId: currentQuestionId,
        },
        currentQuestion: currentQuestionId
          ? {
            kind: 'question',
            questionId: currentQuestionId,
          }
          : null,
        currentQuestionType: currentQuestionTypeId
          ? {
            kind: 'question_type',
            questionTypeId: currentQuestionTypeId,
          }
          : null,
      },
      createdAt: '2026-06-14T00:00:00.000Z',
      updatedAt: '2026-06-14T00:05:00.000Z',
      openQuestions: [],
      keyArtifactRefs: [],
      misconceptionsInFocus: [],
    },
    canonicalHomeContext: {
      sourceAnchorKind: overrides.anchorKind || 'question',
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

function createWorkspacePayload(overrides = {}) {
  const topicId = overrides.topicId || 'topic-trig-equations';
  const topicPath = overrides.topicPath || '9709/trigonometry/equations';

  return {
    workspace: {
      workspaceId: overrides.workspaceId || 'workspace-route-1',
      userId: 'student-route-1',
      topicId,
      topicPath,
      slotState: {
        reviewQueue: 'active',
      },
      linkedReferenceSummary: {
        totalLinkedReferences: 0,
      },
      artifactInbox: {
        items: [],
      },
      slots: {
        reviewQueue: {
          workspaceSlotId: 'slot-review-route-1',
          primaryArtifactRef: null,
          linkedReferences: [
            {
              kind: 'review_task',
              reviewTaskId: 'review-route-1',
            },
          ],
          updatedAt: '2026-06-14T00:00:00.000Z',
        },
      },
      updatedAt: '2026-06-14T00:00:00.000Z',
    },
    reviewQueue: {
      scope: 'global_queue_projection',
      topicId,
      items: [
        {
          reviewTaskId: 'review-route-1',
          targetTopicId: topicId,
          targetTopicPath: topicPath,
          targetQuestionTypeId: '9709.trigonometry.equations',
          mode: 'spaced_review',
          status: 'open',
          dueAt: '2026-06-14T00:00:00.000Z',
          schedulerState: {
            value: 'due',
            label: 'Due',
            tone: 'warning',
          },
        },
      ],
    },
    featureFlags: {
      learningRuntimeEnabled: true,
    },
  };
}

describe('learning runtime page route transitions', () => {
  test('loads /learn/session/:sessionId route state into the session page', async () => {
    const harness = await createLearningRuntimePageHarness();
    harness.api.getSession.mockResolvedValueOnce(createSessionPayload({
      sessionId: 'sess-route-state-1',
    }));

    await harness.renderSessionRoute({
      sessionId: 'sess-route-state-1',
      pathname: '/learn/session/sess-route-state-1',
    });

    expect(harness.api.getSession).toHaveBeenCalledWith('sess-route-state-1');
    expect(getLatestCapture(harness, 'LearningSessionShell').viewModel.session.sessionId)
      .toBe('sess-route-state-1');
  });

  test('preserves /learn/workspace/:topicId route contract and launches through session route state', async () => {
    const harness = await createLearningRuntimePageHarness();
    const launchPayload = {
      anchorKind: 'review_task',
      reviewTaskId: 'review-route-1',
      topicId: 'topic-route-contract',
      topicPath: '9709/trigonometry/equations',
    };
    harness.api.getWorkspace.mockResolvedValueOnce(createWorkspacePayload({
      topicId: 'topic-route-contract',
    }));

    await harness.renderWorkspaceRoute({
      topicId: 'topic-route-contract',
      pathname: '/learn/workspace/topic-route-contract',
    });

    expect(harness.api.getWorkspace).toHaveBeenCalledWith('topic-route-contract');
    expect(getLatestCapture(harness, 'WorkspaceShell').viewModel.workspace.topicId)
      .toBe('topic-route-contract');

    getLatestCapture(harness, 'WorkspaceShell').onLaunch(launchPayload);

    expect(harness.navigate).toHaveBeenCalledWith('/learn/session/new', {
      state: {
        launchPayload,
      },
    });
  });

  test('does not double-submit launch, import, or ask requests while a route request is pending', async () => {
    const launchHarness = await createLearningRuntimePageHarness();
    const launchRequest = createDeferred();
    launchHarness.api.createSession.mockReturnValueOnce(launchRequest.promise);
    await launchHarness.renderSessionRoute({
      sessionId: 'new',
      pathname: '/learn/session/new',
      state: {
        launchPayload: {
          anchorKind: 'review_task',
          reviewTaskId: 'review-dedupe-1',
          currentQuestionTypeId: '9709.trigonometry.equations',
        },
      },
    });

    getLatestCapture(launchHarness, 'LearningSessionShell').onLaunch();
    await launchHarness.flush();
    getLatestCapture(launchHarness, 'LearningSessionShell').onLaunch();
    expect(launchHarness.api.createSession).toHaveBeenCalledTimes(1);
    launchRequest.resolve(createSessionPayload({ sessionId: 'sess-launch-created' }));
    await launchHarness.flush();

    const importHarness = await createLearningRuntimePageHarness();
    const importRequest = createDeferred();
    importHarness.api.importQuestion.mockReturnValueOnce(importRequest.promise);
    await importHarness.renderSessionRoute({
      sessionId: 'new',
      pathname: '/learn/session/new',
      search: '?entry=imported_question',
    });

    getLatestCapture(importHarness, 'ImportedQuestionIntake').onChange({
      promptValue: 'Solve 2sinx = 1 for 0 <= x <= 360.',
    });
    await importHarness.flush();
    getLatestCapture(importHarness, 'ImportedQuestionIntake').onSubmit();
    await importHarness.flush();
    getLatestCapture(importHarness, 'ImportedQuestionIntake').onSubmit();
    expect(importHarness.api.importQuestion).toHaveBeenCalledTimes(1);
    importRequest.resolve({
      question: {
        questionId: 'question-import-dedupe',
        primaryQuestionTypeId: '9709.trigonometry.equations',
      },
      scoringScopePosture: {
        releaseScopeStatus: 'non_released_fallback',
      },
    });
    await importHarness.flush();

    const askHarness = await createLearningRuntimePageHarness();
    const askRequest = createDeferred();
    askHarness.api.getSession.mockResolvedValueOnce(createSessionPayload({
      sessionId: 'sess-ask-dedupe',
    }));
    askHarness.api.askInSession.mockReturnValueOnce(askRequest.promise);
    await askHarness.renderSessionRoute({
      sessionId: 'sess-ask-dedupe',
      pathname: '/learn/session/sess-ask-dedupe',
    });

    getLatestCapture(askHarness, 'LearningSessionShell').onAskChange('Explain the next step.');
    await askHarness.flush();
    getLatestCapture(askHarness, 'LearningSessionShell').onAsk();
    await askHarness.flush();
    getLatestCapture(askHarness, 'LearningSessionShell').onAsk();
    expect(askHarness.api.askInSession).toHaveBeenCalledTimes(1);
    askRequest.resolve({
      assistantMessage: 'Use inverse sine, then apply the interval symmetry.',
      sessionDelta: {},
    });
    await askHarness.flush();
  });

  test('launch route-state fallback preserves current_question_id and current_question_type_id', async () => {
    const harness = await createLearningRuntimePageHarness();
    harness.api.createSession.mockResolvedValueOnce(createSessionPayload({
      sessionId: 'sess-preserved-question-state',
      currentQuestionId: 'question-route-fallback-1',
      currentQuestionTypeId: '9709.trigonometry.equations',
      anchorKind: 'artifact',
      currentAnchor: {
        kind: 'artifact',
        artifactId: 'artifact-route-fallback-1',
      },
    }));

    await harness.renderSessionRoute({
      sessionId: 'new',
      pathname: '/learn/session/new',
      state: {
        launchPayload: {
          anchor_kind: 'artifact',
          artifact_id: 'artifact-route-fallback-1',
          topic_id: 'topic-trig-equations',
          topic_path: '9709/trigonometry/equations',
          current_question_id: 'question-route-fallback-1',
          current_question_type_id: '9709.trigonometry.equations',
        },
      },
    });

    getLatestCapture(harness, 'LearningSessionShell').onLaunch();
    await harness.flush();

    expect(harness.api.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor_kind: 'artifact',
        anchor_ref: {
          kind: 'artifact',
          artifact_id: 'artifact-route-fallback-1',
        },
        current_question_id: 'question-route-fallback-1',
        current_question_type_id: '9709.trigonometry.equations',
      }),
      expect.any(Object),
    );
  });

  test('shows a route load error and recovers when the session route changes', async () => {
    const harness = await createLearningRuntimePageHarness();
    harness.api.getSession.mockRejectedValueOnce(new Error('Session route failed to load.'));

    await harness.renderSessionRoute({
      sessionId: 'sess-error-state',
      pathname: '/learn/session/sess-error-state',
    });

    expect(textContent(harness.tree())).toContain('Session route failed to load.');

    harness.api.getSession.mockResolvedValueOnce(createSessionPayload({
      sessionId: 'sess-error-recovered',
    }));
    await harness.renderSessionRoute({
      sessionId: 'sess-error-recovered',
      pathname: '/learn/session/sess-error-recovered',
    });

    expect(textContent(harness.tree())).not.toContain('Session route failed to load.');
    expect(getLatestCapture(harness, 'LearningSessionShell').viewModel.session.sessionId)
      .toBe('sess-error-recovered');
  });
});
