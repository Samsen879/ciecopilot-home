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
      topicId: 'topic-trig-equations',
      items: [
        {
          reviewTaskId: 'review-task-1',
          targetTopicId: 'topic-trig-equations',
          targetTopicPath: '9709/trigonometry/equations',
          targetQuestionTypeTitle: 'Trigonometric equations',
          mode: 'redo_variant',
          status: 'open',
          dueAt: '2026-03-23T00:00:00.000Z',
          estimatedMinutes: 15,
        },
      ],
    },
  };
}

describe('WorkspaceShell', () => {
  test('renders slot cards, linked references, launch CTAs, and explicit slot states', () => {
    const workspaceVm = buildWorkspaceViewModel(createWorkspacePayload());
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        viewModel: workspaceVm,
      }),
    );

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
    expect(html).toContain('Unpin');
    expect(html).toContain('Mark contested');
    expect(html).toContain('Supersede');
    expect(html).toContain('Unpin before marking contested.');
    expect(html).toContain('Review queue');
    expect(html).toContain('redo variant');
  });

  test('getArtifactSupersedeCandidates keeps successor choices conservative', () => {
    const workspaceVm = buildWorkspaceViewModel(createWorkspacePayload());

    expect(
      getArtifactSupersedeCandidates(
        workspaceVm,
        workspaceVm.slots.common_traps.primaryArtifactCard,
      ).map((card) => card.artifactId),
    ).toEqual(['artifact-successor']);
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
