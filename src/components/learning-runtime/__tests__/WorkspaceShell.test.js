import { jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildWorkspaceViewModel } from '../view-models/workspace-view-model.js';

jest.unstable_mockModule('../../../api/learningRuntimeApi.js', () => ({
  markArtifactContested: jest.fn(),
  pinArtifact: jest.fn(),
  supersedeArtifact: jest.fn(),
  unpinArtifact: jest.fn(),
}));

const {
  default: WorkspaceShell,
  applyArtifactLifecycleError,
  applyArtifactLifecycleUpdate,
  getArtifactSupersedeCandidates,
} = await import('../WorkspaceShell.js');

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
            artifactState: 'verified',
            capabilities: {
              shellVisible: true,
              bodyVisible: true,
              residentEligible: true,
              authoritativeAutomationEligible: false,
            },
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
            artifactState: 'verified',
            capabilities: {
              shellVisible: true,
              bodyVisible: true,
              residentEligible: true,
              authoritativeAutomationEligible: false,
            },
            trustStatus: 'grounded',
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
            artifactState: 'verified',
            capabilities: {
              shellVisible: true,
              bodyVisible: true,
              residentEligible: true,
              authoritativeAutomationEligible: false,
            },
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
            artifactState: 'contested',
            capabilities: {
              shellVisible: true,
              bodyVisible: false,
              residentEligible: false,
              authoritativeAutomationEligible: false,
            },
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
          schedulerReasons: [
            {
              code: 'fresh_immediate_repair',
              summary: 'Fresh repair evidence should be retried before it is spaced.',
            },
          ],
          studentExplanation: {
            summary: '你最近在这个题型上出错过，所以先安排一次同题型回补。',
            labels: ['最近出错', '同题型回补'],
            provenance: {
              summaryFactorCodes: ['recent_error', 'same_question_type_repair'],
              labelMappings: [
                {
                  label: '最近出错',
                  factorCode: 'recent_error',
                },
                {
                  label: '同题型回补',
                  factorCode: 'same_question_type_repair',
                },
              ],
            },
          },
          explanation: {
            summary: 'Queued from interval-repair evidence while authoritative mastery stays conservative.',
            posture: 'conservative_fallback',
            freshness: {
              bucket: 'fresh',
              route: 'immediate_repair',
            },
            attemptHistory: {
              attemptCount: 2,
            },
          },
        },
        {
          reviewTaskId: 'review-task-2',
          targetTopicId: 'topic-trig-equations',
          targetTopicPath: '9709/trigonometry/equations',
          targetQuestionTypeId: '9709.trigonometry.equations',
          targetQuestionTypeTitle: 'Trigonometric equations',
          mode: 'spaced_review',
          status: 'completed',
          dueAt: '2026-03-26T00:00:00.000Z',
          estimatedMinutes: 10,
          completionEvidence: {
            summary: 'Closed the interval mistake with a fresh variant.',
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
            reviewTaskId: 'review-task-2',
            status: 'completed',
            updatedAt: '2026-03-22T08:04:00.000Z',
            targetQuestionTypeTitle: 'Trigonometric equations',
            completionEvidence: {
              summary: 'Closed the interval mistake with a fresh variant.',
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

function createReadOnlyPhysicsWorkspacePayload() {
  return {
    workspace: {
      workspaceId: 'workspace-physics-1',
      userId: 'student-1',
      topicId: 'topic-physics-force-balance',
      topicPath: '9702/mechanics/force-balance',
      slotState: {
        commonTraps: 'idle',
        reviewQueue: 'idle',
      },
      linkedReferenceSummary: {
        totalLinkedReferences: 0,
      },
      artifactInbox: {
        items: [],
      },
      updatedAt: '2026-03-22T08:00:00.000Z',
      slots: {
        commonTraps: {
          workspaceSlotId: null,
          primaryArtifactRef: null,
          linkedReferences: [],
          updatedAt: null,
        },
        reviewQueue: {
          workspaceSlotId: null,
          primaryArtifactRef: null,
          linkedReferences: [],
          updatedAt: null,
        },
      },
    },
    reviewQueue: {
      scope: 'global_queue_projection',
      topicId: 'topic-physics-force-balance',
      items: [],
      summary: {
        total: 0,
        escalated: 0,
        due: 0,
        open: 0,
        deferred: 0,
        completed: 0,
        blocked: 0,
      },
    },
    runtimePosture: {
      subjectCode: '9702',
      displayName: 'Physics',
      selectionState: 'selected_next',
      readOnly: true,
      authoritativeScoringAllowed: false,
      releaseScopeStatus: 'non_released_fallback',
      fallbackMode: 'non_released_fallback',
      fallbackReasonCode: 'subject_adapter_capability_not_enabled',
      learningSignalPosture: 'conservative_fallback',
      fallbackCapabilities: ['marking', 'mastery', 'review'],
      summary:
        'Read-only second-subject runtime slice: scoring, mastery, and review automation stay conservative.',
    },
    revisit: {
      lastVisitAt: null,
      changesSinceLastVisit: {
        slotUpdates: [],
        reviewUpdates: [],
      },
    },
  };
}

describe('WorkspaceShell', () => {
  test('renders slot cards, linked references, launch CTAs, and actionable review queue states', () => {
    const workspaceVm = buildWorkspaceViewModel(createWorkspacePayload(), {
      now: '2026-03-22T12:00:00.000Z',
    });
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        viewModel: workspaceVm,
        onOpenGlobalQueue: () => {},
        reviewQueueDrafts: {
          'review-task-1': {
            completionSummary: 'Solved one more repair variant.',
            dueAt: '2026-03-24T09:30',
          },
          'review-task-2': {
            completionSummary: '',
            dueAt: '2026-03-27T09:30',
          },
        },
      }),
    );

    expect(html).toContain('Return with continuity');
    expect(html).toContain('Last runtime visit 2026-03-22T07:55:00.000Z');
    expect(html).toContain('4 of 5 canonical slots populated and 1 review outcome completed.');
    expect(html).toContain('Continue interval repair');
    expect(html).toContain('Carry the misconception recap into the next pass.');
    expect(html).toContain('Recommended next step');
    expect(html).toContain('1 escalated review task is ready in the canonical queue.');
    expect(html).toContain('Common traps slot updated');
    expect(html).toContain('Review task completed');
    expect(html).toContain('Open overview map');
    expect(html).toContain('Open core method derivation');
    expect(html).toContain('Canonical resident');
    expect(html).toContain('Common traps');
    expect(html).toContain('artifact-primary');
    expect(html).toContain('Linked references');
    expect(html).toContain('artifact-linked-1');
    expect(html).toContain('Open slot');
    expect(html).toContain('Open artifact');
    expect(html).toContain('Stale projection');
    expect(html).toContain('This slot projection may be out of date.');
    expect(html).toContain('Missing artifact content');
    expect(html).toContain('No canonical artifact is pinned to this slot yet.');
    expect(html).toContain('Artifact inbox');
    expect(html).toContain('Visible inbox artifacts');
    expect(html).toContain('artifact-successor');
    expect(html).toContain('Pin to slot');
    expect(html).toContain('Start post-mortem review');
    expect(html).toContain('Unpin');
    expect(html).toContain('Mark contested');
    expect(html).toContain('Supersede');
    expect(html).toContain('Unpin before marking contested.');
    expect(html).toContain('Review queue');
    expect(html).toContain('redo variant');
    expect(html).toContain('Escalated');
    expect(html).toContain('Completed');
    expect(html).toContain('Fresh repair evidence should be retried before it is spaced.');
    expect(html).toContain('Queued from interval-repair evidence while authoritative mastery stays conservative.');
    expect(html).toContain('Attempt history');
    expect(html).toContain('2 attempts');
    expect(html).toContain('Fresh evidence');
    expect(html).toContain('Start spaced review');
    expect(html).toContain('Mark complete');
    expect(html).toContain('Reschedule');
    expect(html).toContain('Open canonical queue');
    expect(html).toContain('Closed the interval mistake with a fresh variant.');
  });

  test('renders the compact scheduler explanation contract when the flag is enabled', () => {
    const payload = createWorkspacePayload();
    payload.reviewQueue.featureFlags = {
      schedulerExplanationEnabled: true,
    };

    const workspaceVm = buildWorkspaceViewModel(payload, {
      now: '2026-03-22T12:00:00.000Z',
    });
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        viewModel: workspaceVm,
        onOpenGlobalQueue: () => {},
        reviewQueueDrafts: {
          'review-task-1': {
            completionSummary: 'Solved one more repair variant.',
            dueAt: '2026-03-24T09:30',
          },
        },
      }),
    );

    expect(html).toContain('你最近在这个题型上出错过，所以先安排一次同题型回补。');
    expect(html).toContain('最近出错');
    expect(html).toContain('同题型回补');
    expect(html).not.toContain('Fresh repair evidence should be retried before it is spaced.');
    expect(html).not.toContain('Queued from interval-repair evidence while authoritative mastery stays conservative.');
    expect(html).not.toContain('Attempt history');
    expect(html).not.toContain('Fresh evidence');
  });

  test('renders a read-only second-subject runtime posture banner', () => {
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        viewModel: buildWorkspaceViewModel(createReadOnlyPhysicsWorkspacePayload(), {
          now: '2026-03-22T12:00:00.000Z',
        }),
      }),
    );

    expect(html).toContain('Read-only second-subject runtime slice');
    expect(html).toContain('subject_adapter_capability_not_enabled');
    expect(html).toContain('Read-only');
    expect(html).toContain('marking');
    expect(html).toContain('mastery');
    expect(html).toContain('review');
    expect(html).toContain('9702/mechanics/force-balance');
  });

  test('getArtifactSupersedeCandidates keeps successor choices conservative', () => {
    const payload = createWorkspacePayload();
    payload.workspace.artifactInbox.items.push({
      artifactId: 'artifact-awaiting-verification',
      artifactKind: 'misconception_card',
      canonicalHomeTopicId: 'topic-trig-equations',
      slotKey: 'common_traps',
      placementStatus: 'inbox',
      artifactState: 'unverified',
      capabilities: {
        shellVisible: true,
        bodyVisible: false,
        residentEligible: false,
        authoritativeAutomationEligible: false,
      },
      trustStatus: 'unverified',
      lifecycleStatus: 'active',
      updatedAt: '2026-03-22T08:06:00.000Z',
    });
    const workspaceVm = buildWorkspaceViewModel(payload);

    expect(
      getArtifactSupersedeCandidates(
        workspaceVm,
        workspaceVm.slots.common_traps.primaryArtifactCard,
      ).map((card) => card.artifactId),
    ).toEqual(['artifact-successor']);
  });

  test('renders awaiting verification only when the slot has no resident', () => {
    const payload = createWorkspacePayload();
    payload.workspace.slotState.commonTraps = 'awaiting_verification';
    payload.workspace.slots.commonTraps.primaryArtifactRef = null;
    payload.workspace.artifactInbox.items = [
      {
        artifactId: 'artifact-awaiting-verification',
        artifactKind: 'misconception_card',
        canonicalHomeTopicId: 'topic-trig-equations',
        slotKey: 'common_traps',
        placementStatus: 'inbox',
        artifactState: 'unverified',
        capabilities: {
          shellVisible: true,
          bodyVisible: false,
          residentEligible: false,
          authoritativeAutomationEligible: false,
        },
        trustStatus: 'unverified',
        lifecycleStatus: 'active',
        updatedAt: '2026-03-22T08:06:00.000Z',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        viewModel: buildWorkspaceViewModel(payload, {
          now: '2026-03-22T12:00:00.000Z',
        }),
        onOpenGlobalQueue: () => {},
      }),
    );

    expect(html).toContain('Awaiting verification');
    expect(html).not.toContain('artifact-primary');
  });

  test('applyArtifactLifecycleUpdate moves a pinned slot to the successor and removes the candidate from inbox', () => {
    const workspaceVm = buildWorkspaceViewModel(createWorkspacePayload());

    const next = applyArtifactLifecycleUpdate(workspaceVm, {
      artifact: {
        artifactId: 'artifact-primary',
        artifactKind: 'misconception_card',
        canonicalHomeTopicId: 'topic-trig-equations',
        slotKey: 'common_traps',
        placementStatus: 'archived',
        lifecycleStatus: 'superseded',
        supersededByArtifactId: 'artifact-successor',
      },
      slotTransition: {
        outcome: 'moved_to_successor',
        slotKey: 'common_traps',
      },
    });

    expect(next.slots.common_traps.primaryArtifactCard.artifactId).toBe('artifact-successor');
    expect(next.slots.common_traps.emptyState).toBeNull();
    expect(next.slots.common_traps.transitionState).toEqual({
      value: 'moved_to_successor',
      label: 'Slot updated',
      tone: 'neutral',
      message: 'Pinned residency moved to artifact-successor.',
    });
    expect(next.artifactInbox.items.map((card) => card.artifactId)).not.toContain('artifact-successor');
  });

  test('applyArtifactLifecycleError adds explicit runtime conflict state to the affected slot', () => {
    const workspaceVm = buildWorkspaceViewModel(createWorkspacePayload());

    const next = applyArtifactLifecycleError(
      workspaceVm,
      workspaceVm.slots.common_traps.primaryArtifactCard,
      {
        code: 'artifact_state_conflict',
        message: 'Successor artifact must share the canonical home topic.',
      },
    );

    expect(next.slots.common_traps.transitionState).toEqual({
      value: 'artifact_state_conflict',
      label: 'Runtime conflict',
      tone: 'warning',
      message: 'Successor artifact must share the canonical home topic.',
    });
  });
});
