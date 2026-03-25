import { buildSessionViewModel } from '../view-models/session-view-model.js';
import {
  buildSessionLaunchPayload,
  createSessionLaunchDraft,
  mergeAskResponseIntoSessionPayload,
  shouldApplyAskResponse,
  shouldApplyLaunchSuccess,
} from '../view-models/session-live-state.js';
import { buildWorkspaceViewModel } from '../view-models/workspace-view-model.js';

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

function createWorkspacePayload() {
  return {
    workspace: {
      workspaceId: 'workspace-1',
      userId: 'student-1',
      topicId: 'topic-trig-equations',
      topicPath: '9709/trigonometry/equations',
      slotState: {
        overviewMap: 'stale',
        coreMethodDerivation: 'missing_content',
        commonTraps: 'active',
        reviewQueue: 'active',
      },
      linkedReferenceSummary: {
        totalLinkedReferences: 3,
      },
      artifactInbox: {
        items: [
          {
            artifactId: 'artifact-successor',
            artifactKind: 'misconception_card',
            canonicalHomeTopicId: 'topic-trig-equations',
            slotKey: 'common_traps',
            placementStatus: 'inbox',
            trustStatus: 'grounded',
            lifecycleStatus: 'active',
            updatedAt: '2026-03-22T07:56:00.000Z',
            summary: 'Candidate successor for the canonical misconception slot.',
          },
          {
            artifactId: 'artifact-note-1',
            artifactKind: 'free_note',
            canonicalHomeTopicId: 'topic-trig-equations',
            slotKey: 'my_notes',
            placementStatus: 'inbox',
            trustStatus: 'user_confirmed',
            lifecycleStatus: 'active',
            updatedAt: '2026-03-22T07:57:00.000Z',
            title: 'My note candidate',
          },
          {
            artifactId: 'artifact-cross-topic',
            artifactKind: 'misconception_card',
            canonicalHomeTopicId: 'topic-trig-identities',
            slotKey: 'common_traps',
            placementStatus: 'inbox',
            trustStatus: 'grounded',
            lifecycleStatus: 'active',
            updatedAt: '2026-03-22T07:55:00.000Z',
          },
          {
            artifactId: 'artifact-contested',
            artifactKind: 'misconception_card',
            canonicalHomeTopicId: 'topic-trig-equations',
            slotKey: 'common_traps',
            placementStatus: 'inbox',
            trustStatus: 'contested',
            lifecycleStatus: 'active',
            updatedAt: '2026-03-22T07:54:00.000Z',
          },
        ],
      },
      updatedAt: '2026-03-22T08:00:00.000Z',
      slots: {
        overviewMap: {
          workspaceSlotId: 'slot-overview-map',
          primaryArtifactRef: {
            kind: 'artifact',
            artifactId: 'artifact-overview',
          },
          linkedReferences: [],
          updatedAt: '2026-03-22T07:58:00.000Z',
        },
        coreMethodDerivation: {
          workspaceSlotId: 'slot-core-derivation',
          primaryArtifactRef: {
            kind: 'artifact',
            artifactId: 'artifact-derivation-missing',
          },
          linkedReferences: [
            {
              kind: 'artifact',
              artifactId: 'artifact-formula-linked',
            },
          ],
          updatedAt: '2026-03-22T07:59:00.000Z',
        },
        canonicalWorkedExample: {
          workspaceSlotId: 'slot-worked-example',
          primaryArtifactRef: {
            kind: 'artifact',
            artifactId: 'artifact-worked-example',
          },
          linkedReferences: [],
          updatedAt: null,
        },
        commonTraps: {
          workspaceSlotId: 'slot-common-traps',
          primaryArtifactRef: {
            kind: 'artifact',
            artifactId: 'artifact-primary',
          },
          linkedReferences: [
            {
              kind: 'artifact',
              artifactId: 'artifact-linked-1',
            },
          ],
          updatedAt: '2026-03-22T08:00:00.000Z',
        },
        myNotes: {
          workspaceSlotId: 'slot-my-notes',
          primaryArtifactRef: null,
          linkedReferences: [],
          updatedAt: null,
        },
        reviewQueue: {
          workspaceSlotId: 'slot-review-queue',
          primaryArtifactRef: null,
          linkedReferences: [
            {
              kind: 'review_task',
              reviewTaskId: 'review-task-1',
            },
          ],
          updatedAt: '2026-03-22T08:05:00.000Z',
        },
      },
    },
    reviewQueue: {
      scope: 'global_queue_projection',
      policy: {
        dailyRecommendationCap: 3,
        maxHighPriorityOpenPerType: 1,
      },
      topicId: 'topic-trig-equations',
      items: [
        {
          reviewTaskId: 'review-task-1',
          targetTopicId: 'topic-trig-equations',
          targetTopicPath: '9709/trigonometry/equations',
          targetQuestionTypeId: '9709.trigonometry.equations',
          targetQuestionTypeTitle: 'Trigonometric equations',
          mode: 'redo_variant',
          status: 'open',
          dueAt: '2026-03-21T00:00:00.000Z',
          estimatedMinutes: 15,
          schedulerState: {
            value: 'escalated',
            label: 'Escalated',
            tone: 'danger',
            reasonCode: 'fresh_immediate_repair',
          },
          schedulerPolicy: {
            route: 'immediate_repair',
            freshnessBucket: 'fresh',
          },
          schedulerReasons: [
            {
              code: 'fresh_immediate_repair',
              summary: 'Fresh repair evidence should be retried before it is spaced.',
            },
          ],
        },
        {
          reviewTaskId: 'review-task-2',
          targetTopicId: 'topic-trig-equations',
          targetTopicPath: '9709/trigonometry/equations',
          targetQuestionTypeId: '9709.trigonometry.equations',
          targetQuestionTypeTitle: 'Trigonometric equations',
          mode: 'spaced_review',
          status: 'open',
          dueAt: '2026-03-24T00:00:00.000Z',
          estimatedMinutes: 20,
          schedulerState: {
            value: 'deferred',
            label: 'Deferred',
            tone: 'neutral',
            reasonCode: 'freshness_window',
          },
          schedulerPolicy: {
            route: 'spaced_review',
            freshnessBucket: 'cooling',
          },
          schedulerReasons: [
            {
              code: 'freshness_window',
              summary: 'Deferred until the next spaced-review freshness window opens.',
            },
          ],
        },
        {
          reviewTaskId: 'review-task-3',
          targetTopicId: 'topic-trig-equations',
          targetTopicPath: '9709/trigonometry/equations',
          targetQuestionTypeId: '9709.trigonometry.equations',
          targetQuestionTypeTitle: 'Trigonometric equations',
          mode: 'redo_variant',
          status: 'completed',
          dueAt: '2026-03-20T00:00:00.000Z',
          estimatedMinutes: 12,
          completionEvidence: {
            summary: 'Solved a clean follow-up variant.',
            outcome: 'completed',
          },
        },
      ],
    },
    revisit: {
      lastVisitAt: '2026-03-22T07:55:00.000Z',
      lastSession: {
        sessionId: 'session-topic-1-current',
        mode: 'post_mortem_review',
        state: 'active',
        updatedAt: '2026-03-22T07:55:00.000Z',
        resumeGuidance: {
          title: 'Continue interval repair',
          message: 'Resume from the misconception artifact anchored to this workspace.',
          summary: 'Carry the misconception recap into the next pass.',
          anchorKind: 'artifact',
          anchorRef: {
            kind: 'artifact',
            artifactId: 'artifact-primary',
          },
          currentQuestionTypeId: '9709.trigonometry.equations',
        },
      },
      changesSinceLastVisit: {
        slotUpdates: [
          {
            slotKey: 'common_traps',
            updatedAt: '2026-03-22T08:00:00.000Z',
          },
        ],
        reviewUpdates: [
          {
            reviewTaskId: 'review-task-3',
            status: 'completed',
            updatedAt: '2026-03-22T08:04:00.000Z',
            targetQuestionTypeTitle: 'Trigonometric equations',
            completionEvidence: {
              summary: 'Solved a clean follow-up variant.',
              outcome: 'completed',
            },
          },
        ],
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
        lineage: {
          parentSessionId: 'sess-parent-1',
          handoffKind: 'explicit_new_session',
          summarySnapshot: {
            recap: 'Carry forward the compacted recap before opening another full thread.',
          },
        },
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
          recommendedMode: 'learn_concept',
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
            partResults: [
              {
                partId: 'b',
                scoreAwarded: 0,
                scoreMax: 2,
              },
            ],
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
      handoff: {
        supported: true,
        suggestedHandoff: {
          shouldHandoff: true,
          handoffKind: 'explicit_new_session',
          reasonCode: 'post_mortem_repair_ready',
          message: 'Start the repair session from the projected review task.',
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

  test('surfaces lineage handoff metadata and questionless resume guidance for continuity flows', () => {
    const vm = buildSessionViewModel(createContinuitySessionPayload());

    expect(vm.session.lineage).toEqual(expect.objectContaining({
      parentSessionId: 'sess-parent-1',
      handoffKind: 'explicit_new_session',
    }));
    expect(vm.session.handoff).toEqual(expect.objectContaining({
      supported: true,
      suggestedHandoff: expect.objectContaining({
        shouldHandoff: true,
        handoffKind: 'internal_compaction',
        reasonCode: 'session_turn_limit',
      }),
    }));
    expect(vm.continuity).toEqual(expect.objectContaining({
      showContinuity: true,
      resumeGuidance: expect.objectContaining({
        questionless: true,
        currentQuestionId: null,
        currentQuestionTypeId: '9709.trigonometry.identities',
      }),
      suggestedHandoff: expect.objectContaining({
        shouldHandoff: true,
        handoffKind: 'internal_compaction',
      }),
      lineage: expect.objectContaining({
        parentSessionId: 'sess-parent-1',
      }),
    }));
    expect(vm.timeline.some((entry) => entry.kind === 'question')).toBe(false);
  });

  test('builds a dedicated post-mortem surface from diagnostic, misconception, artifact, and repair-handoff data', () => {
    const vm = buildSessionViewModel(createPostMortemSessionPayload());

    expect(vm.postMortem).toEqual(expect.objectContaining({
      visible: true,
      title: 'Post-mortem review',
      misconceptions: [
        expect.objectContaining({
          tag: 'domain:interval',
          label: 'domain interval',
        }),
        expect.objectContaining({
          tag: 'sign:inverse',
          label: 'sign inverse',
        }),
      ],
      diagnosticFocus: expect.objectContaining({
        title: 'Interval restrictions drove the miss',
        sourceQuestionId: 'question-trig-1',
        sourceAttemptId: 'attempt-trig-1',
        sourceMarkRunId: 'mark-run-trig-1',
      }),
      scoringPosture: expect.objectContaining({
        releaseScopeStatus: 'non_released_fallback',
        authoritativeScoringAllowed: false,
      }),
      artifactCandidates: [
        expect.objectContaining({
          artifactId: 'artifact-misconception-1',
          artifactKind: 'misconception_card',
          launch: expect.objectContaining({
            launchPayload: expect.objectContaining({
              anchorKind: 'artifact',
              artifactId: 'artifact-misconception-1',
              mode: 'post_mortem_review',
            }),
          }),
        }),
      ],
      repairHandoff: expect.objectContaining({
        actionLabel: 'Launch repair session',
        launchPayload: expect.objectContaining({
          anchorKind: 'review_task',
          reviewTaskId: 'review-task-1',
          mode: 'spaced_review',
        }),
      }),
    }));
  });

  test('builds launch payloads that keep concept sessions questionless', () => {
    const payload = buildSessionLaunchPayload(createSessionLaunchDraft({
      mode: 'learn_concept',
      sessionGoal: 'Warm up trig identities',
      anchorKind: 'concept',
      topicId: 'topic-trig-identities',
      topicPath: '9709/trigonometry/identities',
      currentQuestionTypeId: '9709.trigonometry.identities',
    }));

    expect(payload).toEqual({
      subject_code: '9709',
      mode: 'learn_concept',
      session_goal: 'Warm up trig identities',
      anchor_kind: 'concept',
      anchor_ref: {
        kind: 'concept',
        topic_id: 'topic-trig-identities',
        topic_path: '9709/trigonometry/identities',
      },
      current_question_id: null,
      current_question_type_id: '9709.trigonometry.identities',
    });
  });

  test('preserves non-whitelisted workspace topics across launch route handoff', () => {
    const draft = createSessionLaunchDraft({
      anchorKind: 'workspace_slot',
      mode: 'learn_concept',
      workspaceId: 'workspace-custom-1',
      slotKey: 'common_traps',
      topicId: 'topic-custom-sequences',
      topicPath: '9709/sequences-and-series/recurrence',
      currentQuestionTypeId: '9709.sequences.recurrence',
    });

    expect(draft).toEqual(expect.objectContaining({
      anchorKind: 'workspace_slot',
      workspaceId: 'workspace-custom-1',
      slotKey: 'common_traps',
      topicId: 'topic-custom-sequences',
      topicPath: '9709/sequences-and-series/recurrence',
      currentQuestionTypeId: '9709.sequences.recurrence',
    }));

    expect(buildSessionLaunchPayload(draft)).toEqual(expect.objectContaining({
      anchor_kind: 'workspace_slot',
      anchor_ref: {
        kind: 'workspace_slot',
        workspace_id: 'workspace-custom-1',
        slot_key: 'common_traps',
      },
      current_question_type_id: '9709.sequences.recurrence',
    }));
  });

  test('merges ask responses without inventing question ids for questionless sessions', () => {
    const sessionPayload = mergeAskResponseIntoSessionPayload(
      createQuestionlessSessionPayload(),
      {
        assistantMessage: 'Start by turning the left side into a single sine term.',
        evidenceSummary: {
          sourceTopicPath: '9709/trigonometry/identities',
          retrievedEvidenceCount: 1,
        },
        fallbackPosture: {
          fallbackMode: 'non_released_fallback',
          authoritativeScoringAllowed: false,
          fallbackReasonCode: 'non_pilot_question_type',
          classificationConfidence: null,
          learningSignalPosture: 'conservative_fallback',
        },
        sessionDelta: {
          clientTurnId: 'local-turn-1',
          currentQuestion: null,
          currentQuestionType: {
            kind: 'question_type',
            questionTypeId: '9709.trigonometry.identities',
          },
        },
      },
    );

    expect(sessionPayload.session.currentQuestion).toBeNull();
    expect(sessionPayload.session.currentQuestionId).toBeNull();
    expect(sessionPayload.session.currentQuestionTypeId).toBe('9709.trigonometry.identities');
    expect(sessionPayload.session.activeScope.currentQuestion).toBeNull();
    expect(sessionPayload.latestResponse.assistantMessage).toBe(
      'Start by turning the left side into a single sine term.',
    );
  });

  test('builds timeline entries from completed live turns', () => {
    const updatedPayload = mergeAskResponseIntoSessionPayload(
      createQuestionlessSessionPayload(),
      {
        assistantMessage: 'Rewrite the left-hand side with a double-angle identity first.',
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
          clientTurnId: 'local-turn-2',
          currentQuestion: null,
          currentQuestionType: {
            kind: 'question_type',
            questionTypeId: '9709.trigonometry.identities',
          },
        },
      },
    );

    const vm = buildSessionViewModel(updatedPayload, {
      turnHistory: [
        {
          clientTurnId: 'local-turn-2',
          userMessage: 'Give me the next hint only.',
          response: updatedPayload.latestResponse,
        },
      ],
    });

    expect(vm.timeline[0]).toEqual(expect.objectContaining({
      kind: 'user_turn',
      message: 'Give me the next hint only.',
    }));
    expect(vm.timeline[1]).toEqual(expect.objectContaining({
      kind: 'assistant_response',
      message: 'Rewrite the left-hand side with a double-angle identity first.',
      fallbackReasonCode: 'non_pilot_question_type',
    }));
    expect(vm.timeline[2]).toEqual(expect.objectContaining({
      kind: 'questionless_state',
    }));
  });

  test('ignores stale launch completions after the launcher route stops being active', () => {
    expect(shouldApplyLaunchSuccess({
      requestKey: 'launch-1',
      activeRequestKey: 'launch-1',
      isLauncherSurface: false,
      isMounted: true,
    })).toBe(false);

    expect(shouldApplyLaunchSuccess({
      requestKey: 'launch-1',
      activeRequestKey: 'launch-2',
      isLauncherSurface: true,
      isMounted: true,
    })).toBe(false);

    expect(shouldApplyLaunchSuccess({
      requestKey: 'launch-2',
      activeRequestKey: 'launch-2',
      isLauncherSurface: true,
      isMounted: true,
    })).toBe(true);
  });

  test('ignores stale ask responses after the route switches to a different session', () => {
    expect(shouldApplyAskResponse({
      requestSessionId: 'sess-a',
      activeRouteSessionId: 'sess-b',
      currentSessionId: 'sess-b',
      isMounted: true,
    })).toBe(false);

    expect(shouldApplyAskResponse({
      requestSessionId: 'sess-a',
      activeRouteSessionId: 'sess-a',
      currentSessionId: 'sess-b',
      isMounted: true,
    })).toBe(false);

    expect(shouldApplyAskResponse({
      requestSessionId: 'sess-a',
      activeRouteSessionId: 'sess-a',
      currentSessionId: 'sess-a',
      isMounted: true,
    })).toBe(true);
  });

  test('workspace view-model separates canonical slot artifacts from linked references', () => {
    const vm = buildWorkspaceViewModel(createWorkspacePayload(), {
      now: '2026-03-22T12:00:00.000Z',
    });

    expect(vm.workspace.topicPath).toBe('9709/trigonometry/equations');
    expect(vm.slots.common_traps.primaryArtifact).toEqual({
      kind: 'artifact',
      artifactId: 'artifact-primary',
      label: 'artifact-primary',
    });
    expect(vm.slots.common_traps.linkedReferences).toEqual([
      {
        kind: 'artifact',
        artifactId: 'artifact-linked-1',
        label: 'artifact-linked-1',
      },
    ]);
    expect(vm.slotList.map((slot) => slot.slotKey)).toEqual([
      'overview_map',
      'core_method_derivation',
      'canonical_worked_example',
      'common_traps',
      'my_notes',
    ]);
    expect(vm.reviewQueue.items[0]).toEqual(expect.objectContaining({
      reviewTaskId: 'review-task-1',
      modeLabel: 'redo variant',
      queueState: expect.objectContaining({
        value: 'escalated',
        label: 'Escalated',
      }),
      schedulerExplanation: expect.objectContaining({
        summary: 'Fresh repair evidence should be retried before it is spaced.',
      }),
      launchPayload: {
        anchorKind: 'review_task',
        reviewTaskId: 'review-task-1',
        mode: 'spaced_review',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
        currentQuestionTypeId: '9709.trigonometry.equations',
      },
    }));
    expect(vm.reviewQueue.items[1].queueState).toEqual({
      value: 'deferred',
      label: 'Deferred',
      tone: 'neutral',
      reasonCode: 'freshness_window',
      reasonSummary: null,
    });
    expect(vm.reviewQueue.items[2]).toEqual(expect.objectContaining({
      queueState: {
        value: 'completed',
        label: 'Completed',
        tone: 'success',
      },
      resultFeedback: {
        label: 'Completed',
        summary: 'Solved a clean follow-up variant.',
      },
    }));
    expect(vm.reviewQueue.summary).toEqual({
      total: 3,
      escalated: 1,
      due: 0,
      open: 0,
      deferred: 1,
      completed: 1,
      blocked: 0,
    });
  });

  test('workspace revisit model surfaces continuity, changes, and next-step entry points', () => {
    const vm = buildWorkspaceViewModel(createWorkspacePayload(), {
      now: '2026-03-22T12:00:00.000Z',
    });

    expect(vm.revisit.lastVisitLabel).toBe('Last runtime visit 2026-03-22T07:55:00.000Z');
    expect(vm.revisit.progressSummary).toBe('4 of 5 canonical slots populated and 1 review outcome completed.');
    expect(vm.revisit.continuation).toEqual(expect.objectContaining({
      title: 'Continue interval repair',
      summary: 'Carry the misconception recap into the next pass.',
      detail: 'Resume from the misconception artifact anchored to this workspace.',
      ctaLabel: 'Continue runtime',
      launchPayload: {
        anchorKind: 'artifact',
        artifactId: 'artifact-primary',
        mode: 'post_mortem_review',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
        currentQuestionTypeId: '9709.trigonometry.equations',
      },
    }));
    expect(vm.revisit.changes).toEqual([
      {
        key: 'slot:common_traps',
        label: 'Common traps slot updated',
        summary: 'Canonical slot content changed after your previous runtime visit.',
      },
      {
        key: 'review:review-task-3',
        label: 'Review task completed',
        summary: 'Solved a clean follow-up variant.',
      },
    ]);
    expect(vm.revisit.nextStep).toEqual(expect.objectContaining({
      title: 'Recommended next step',
      summary: '1 escalated review task is ready in the canonical queue.',
      ctaLabel: 'Start spaced review',
      launchPayload: {
        anchorKind: 'review_task',
        reviewTaskId: 'review-task-1',
        mode: 'spaced_review',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
        currentQuestionTypeId: '9709.trigonometry.equations',
      },
    }));
    expect(vm.revisit.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'review_queue',
        label: 'Escalated review ready',
        ctaLabel: 'Start spaced review',
      }),
      expect.objectContaining({
        key: 'overview_map',
        label: 'Stale slot',
        ctaLabel: 'Open overview map',
      }),
      expect.objectContaining({
        key: 'core_method_derivation',
        label: 'Missing content',
        ctaLabel: 'Open core method derivation',
      }),
    ]));
  });

  test('launcher view-model includes custom workspace topics that are outside the entry whitelist', () => {
    const vm = buildSessionViewModel({}, {
      launcher: {
        draft: createSessionLaunchDraft({
          anchorKind: 'workspace_slot',
          workspaceId: 'workspace-custom-1',
          slotKey: 'common_traps',
          topicId: 'topic-custom-sequences',
          topicPath: '9709/sequences-and-series/recurrence',
        }),
      },
    });

    expect(vm.launcher.draft.topicId).toBe('topic-custom-sequences');
    expect(vm.launcher.draft.topicPath).toBe('9709/sequences-and-series/recurrence');
    expect(vm.launcher.topicOptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        topicId: 'topic-custom-sequences',
        topicPath: '9709/sequences-and-series/recurrence',
      }),
    ]));
  });

  test('workspace view-model builds launch payloads for canonical slot residents and cards', () => {
    const vm = buildWorkspaceViewModel(createWorkspacePayload(), {
      now: '2026-03-22T12:00:00.000Z',
    });

    expect(vm.slots.common_traps.slotLaunch).toEqual({
      ctaLabel: 'Open slot',
      launchPayload: {
        anchorKind: 'workspace_slot',
        mode: 'learn_concept',
        slotKey: 'common_traps',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
        workspaceId: 'workspace-1',
      },
    });
    expect(vm.slots.common_traps.primaryArtifactCard.launch).toEqual({
      ctaLabel: 'Start post-mortem review',
      launchPayload: {
        anchorKind: 'artifact',
        artifactId: 'artifact-primary',
        mode: 'post_mortem_review',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
      },
    });
    expect(vm.slots.common_traps.linkedReferenceCards[0].launch).toEqual({
      ctaLabel: 'Start post-mortem review',
      launchPayload: {
        anchorKind: 'artifact',
        artifactId: 'artifact-linked-1',
        mode: 'post_mortem_review',
        topicId: 'topic-trig-equations',
        topicPath: '9709/trigonometry/equations',
      },
    });
  });

  test('workspace view-model surfaces explicit empty, stale, and missing-content states', () => {
    const vm = buildWorkspaceViewModel(createWorkspacePayload(), {
      now: '2026-03-22T12:00:00.000Z',
    });

    expect(vm.slots.overview_map.surfaceState).toEqual({
      value: 'stale',
      label: 'Stale projection',
      tone: 'warning',
      message: 'This slot projection may be out of date. Reload to confirm the latest canonical content.',
    });
    expect(vm.slots.core_method_derivation.contentState).toEqual({
      value: 'missing_content',
      label: 'Missing artifact content',
      tone: 'warning',
      message: 'The workspace knows which artifact belongs here, but its rendered content is missing from this projection.',
    });
    expect(vm.slots.my_notes.emptyState).toEqual({
      label: 'Empty slot',
      message: 'No canonical artifact is pinned to this slot yet.',
    });
    expect(vm.artifactInbox).toEqual({
      populatedSlotCount: 4,
      emptySlotCount: 1,
      staleSlotCount: 1,
      missingContentCount: 1,
      totalLinkedReferences: 3,
      items: expect.any(Array),
    });
    expect(vm.artifactInbox.items.map((card) => card.artifactId)).toEqual([
      'artifact-successor',
      'artifact-note-1',
      'artifact-cross-topic',
      'artifact-contested',
    ]);
    expect(vm.artifactInbox.items[0].availableActions.canPin).toBe(true);
    expect(vm.artifactInbox.items[1].availableActions.canPin).toBe(true);
    expect(vm.artifactInbox.items[2].availableActions.canPin).toBe(false);
    expect(vm.artifactInbox.items[2].availableActions.pinBlockedReason)
      .toBe('Secondary-topic artifacts cannot be pinned into this workspace.');
    expect(vm.artifactInbox.items[3].availableActions.canPin).toBe(false);
    expect(vm.artifactInbox.items[3].state).toEqual({
      value: 'contested',
      label: 'Contested artifact',
      tone: 'warning',
      message: 'This artifact is contested and cannot be pinned until the conflict is resolved.',
    });
  });

  test('builds queue action drafts that preserve canonical launch and scheduling defaults', () => {
    const vm = buildWorkspaceViewModel(createWorkspacePayload(), {
      now: '2026-03-22T12:00:00.000Z',
    });

    expect(vm.reviewQueue.actionDrafts['review-task-1']).toEqual({
      completionSummary: '',
      dueAt: '2026-03-23T12:00',
    });
    expect(vm.reviewQueue.actionDrafts['review-task-2']).toEqual({
      completionSummary: '',
      dueAt: '2026-03-24T00:00',
    });
  });
});
