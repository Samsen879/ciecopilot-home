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
        commonTraps: 'active',
        reviewQueue: 'active',
      },
      linkedReferenceSummary: {
        totalLinkedReferences: 2,
      },
      updatedAt: '2026-03-22T08:00:00.000Z',
      slots: {
        overviewMap: {
          workspaceSlotId: null,
          primaryArtifactRef: null,
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
  test('renders stable slots and linked references as separate surfaces', () => {
    const workspaceVm = buildWorkspaceViewModel(createWorkspacePayload());
    const html = renderToStaticMarkup(
      React.createElement(WorkspaceShell, {
        viewModel: workspaceVm,
      }),
    );

    expect(html).toContain('Common traps');
    expect(html).toContain('Pinned artifact');
    expect(html).toContain('Linked references');
    expect(html).toContain('artifact-linked-1');
    expect(html).toContain('Artifact inbox');
    expect(html).toContain('Review queue');
    expect(html).toContain('redo variant');
  });
});
