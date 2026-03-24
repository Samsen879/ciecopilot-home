import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WorkspaceShell from '../WorkspaceShell.js';
import { buildWorkspaceViewModel } from '../view-models/workspace-view-model.js';

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
    expect(html).toContain('Review queue');
    expect(html).toContain('redo variant');
  });
});
