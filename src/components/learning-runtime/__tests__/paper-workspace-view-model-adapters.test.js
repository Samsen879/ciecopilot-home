import fs from 'node:fs';

import { buildWorkspaceViewModel } from '../view-models/workspace-view-model.js';

const fixturesDir = new URL('../__fixtures__/paper-workspace-contract/', import.meta.url);

function readFixture(name) {
  return JSON.parse(fs.readFileSync(new URL(name, fixturesDir), 'utf8'));
}

describe('paper workspace view-model adapters', () => {
  test('normalizes the paper workspace envelope without inventing a local queue identity', () => {
    const vm = buildWorkspaceViewModel(readFixture('paper-workspace-envelope.json'), {
      now: '2026-06-11T00:00:00.000Z',
    });

    expect(vm.surface).toEqual(expect.objectContaining({
      kind: 'paper_workspace',
      paperScope: '9709:paper:p1',
      workspaceId: 'paper-workspace-1',
      reviewQueueScope: 'paper_workspace_review_projection',
      queueIdentity: 'global_review_queue',
      topicSectionsAreProjections: true,
      isPaperWorkspace: true,
      isPaperTopicSection: false,
      isLegacyTopicWorkspace: false,
    }));
    expect(vm.paperWorkspace).toEqual(expect.objectContaining({
      paperWorkspaceId: 'paper-workspace-1',
      paperScope: '9709:paper:p1',
      subjectCode: '9709',
      workspaceKind: 'paper_main',
      topicSections: expect.any(Array),
      stableSlots: expect.any(Object),
    }));
    expect(vm.paperWorkspace.topicSections.map((section) => section.topicId)).toEqual([
      'topic-1',
      'topic-2',
    ]);
    expect(vm.paperWorkspace.stableSlots.common_traps).toEqual(expect.objectContaining({
      slotKey: 'common_traps',
      topicSections: expect.arrayContaining([
        expect.objectContaining({
          topicId: 'topic-1',
          workspaceSlotId: 'slot-topic-1-common-traps',
        }),
      ]),
      artifactSummaries: expect.arrayContaining([
        expect.objectContaining({
          artifactId: 'artifact-primary',
          topicSectionId: 'section-topic-1',
        }),
      ]),
    }));
    expect(vm.reviewQueue).toEqual(expect.objectContaining({
      scope: 'paper_workspace_review_projection',
      scopeLabel: 'Paper workspace review projection',
      paperScope: '9709:paper:p1',
      queueIdentity: 'global_review_queue',
    }));
  });

  test('normalizes a paper topic-section subview as a focused projection', () => {
    const vm = buildWorkspaceViewModel(readFixture('paper-topic-section-subview.json'), {
      now: '2026-06-11T00:00:00.000Z',
    });

    expect(vm.surface).toEqual(expect.objectContaining({
      kind: 'paper_topic_section_workspace',
      paperScope: '9709:paper:p1',
      workspaceId: 'workspace-1',
      reviewQueueScope: 'paper_topic_section_review_projection',
      queueIdentity: 'global_review_queue',
      isPaperWorkspace: false,
      isPaperTopicSection: true,
      isLegacyTopicWorkspace: false,
    }));
    expect(vm.paperWorkspace).toEqual(expect.objectContaining({
      paperWorkspaceId: 'paper-workspace-1',
      paperScope: '9709:paper:p1',
    }));
    expect(vm.topicSection).toEqual(expect.objectContaining({
      paperWorkspaceTopicSectionId: 'section-topic-1',
      topicId: 'topic-1',
      topicWorkspaceId: 'workspace-1',
      topicPath: '9709/trigonometry/equations',
      ownerKind: 'topic',
    }));
    expect(vm.workspace).toEqual(expect.objectContaining({
      workspaceId: 'workspace-1',
      topicId: 'topic-1',
      topicPath: '9709/trigonometry/equations',
      paperScope: '9709:paper:p1',
    }));
    expect(vm.slots.common_traps.primaryArtifactCard).toEqual(expect.objectContaining({
      artifactId: 'artifact-primary',
      title: 'Interval restriction trap',
    }));
    expect(vm.reviewQueue).toEqual(expect.objectContaining({
      scope: 'paper_topic_section_review_projection',
      scopeLabel: 'Paper topic-section review projection',
      topicId: 'topic-1',
      topicPath: '9709/trigonometry/equations',
      questionTypeId: '9709.trigonometry.equations',
      queueIdentity: 'global_review_queue',
    }));
  });

  test('keeps legacy topic workspace fallback distinct from paper projections', () => {
    const vm = buildWorkspaceViewModel(readFixture('legacy-topic-workspace-fallback.json'), {
      now: '2026-06-11T00:00:00.000Z',
    });

    expect(vm.surface).toEqual(expect.objectContaining({
      kind: 'legacy_topic_workspace',
      paperScope: null,
      workspaceId: 'workspace-1',
      reviewQueueScope: 'global_queue_projection',
      queueIdentity: 'global_review_queue',
      isPaperWorkspace: false,
      isPaperTopicSection: false,
      isLegacyTopicWorkspace: true,
    }));
    expect(vm.paperWorkspace).toBeNull();
    expect(vm.topicSection).toEqual(expect.objectContaining({
      topicId: 'topic-1',
      topicPath: '9709/trigonometry/equations',
      workspaceId: 'workspace-1',
    }));
    expect(vm.reviewQueue).toEqual(expect.objectContaining({
      scope: 'global_queue_projection',
      scopeLabel: 'Global review queue projection',
      topicId: 'topic-1',
      queueIdentity: 'global_review_queue',
    }));
  });
});
