import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import {
  createManagedTask,
  createPrBinding,
} from '../../scripts/ao/lib/state-contracts.js';
import { ingestManagedTaskPollEvents } from '../../scripts/ao/lib/event-ingest.js';
import { createStateRepository } from '../../scripts/ao/lib/state-repository.js';

const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-event-ingest-'));
  tempDirs.push(repoRoot);
  return repoRoot;
}

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('ao event ingest', () => {
  it('persists new poll-derived observations once and dedupes repeated cursors', () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-89',
      issue_number: 89,
      title: 'Managed-task enrollment and shadow controller loop',
      branch_name: 'feat/89',
      worktree_path: '/tmp/cie-50',
      status: 'active',
      created_at: '2026-03-29T06:30:00.000Z',
      updated_at: '2026-03-29T06:30:00.000Z',
    }));
    repository.upsertPrBinding(createPrBinding({
      binding_id: 'binding-issue-89-pr-109',
      task_id: 'issue-89',
      pr_number: 109,
      branch_name: 'feat/89',
      base_branch: 'main',
      status: 'bound',
      created_at: '2026-03-29T06:30:00.000Z',
      updated_at: '2026-03-29T06:30:00.000Z',
    }));

    const task = repository.getSnapshot().state.managed_tasks[0];
    const prBindings = repository.getSnapshot().state.pr_bindings;
    const aoObservation = {
      observed_at: '2026-03-29T06:31:00.000Z',
      workers: [
        {
          session_name: 'cie-50',
          session_runtime_id: 'cie-50',
          issue_number: 89,
          branch_name: 'feat/89',
          pr_number: 109,
          lifecycle_state: 'idle',
          last_seen_at: '2026-03-29T06:30:45.000Z',
          freshness: { status: 'fresh' },
        },
      ],
    };
    const githubObservation = {
      observed_at: '2026-03-29T06:31:00.000Z',
      prs: [
        {
          pr_number: 109,
          state: 'OPEN',
          head_branch: 'feat/89',
          head_sha: 'abc123',
          review_status: 'pending',
          ci_status: 'pending',
          mergeability: 'mergeable',
          is_draft: false,
          url: 'https://example.test/pr/109',
        },
      ],
    };

    const firstResult = ingestManagedTaskPollEvents({
      repository,
      controllerId: 'default',
      task,
      prBindings,
      aoObservation,
      githubObservation,
      now: '2026-03-29T06:31:00.000Z',
    });
    const secondResult = ingestManagedTaskPollEvents({
      repository,
      controllerId: 'default',
      task,
      prBindings,
      aoObservation,
      githubObservation,
      now: '2026-03-29T06:32:00.000Z',
    });
    const thirdResult = ingestManagedTaskPollEvents({
      repository,
      controllerId: 'default',
      task,
      prBindings,
      aoObservation,
      githubObservation: {
        ...githubObservation,
        observed_at: '2026-03-29T06:33:00.000Z',
        prs: [
          {
            ...githubObservation.prs[0],
            ci_status: 'failing',
            head_sha: 'def456',
          },
        ],
      },
      now: '2026-03-29T06:33:00.000Z',
    });

    expect(firstResult).toMatchObject({
      task_id: 'issue-89',
      ingested_count: 2,
      skipped_count: 0,
    });
    expect(secondResult).toMatchObject({
      ingested_count: 0,
      skipped_count: 2,
    });
    expect(thirdResult).toMatchObject({
      ingested_count: 1,
      skipped_count: 1,
    });

    const snapshot = repository.getSnapshot().state;
    expect(snapshot.observations).toHaveLength(3);
    expect(snapshot.controller_cursors).toHaveLength(2);
    expect(snapshot.controller_cursors.find((record) => record.source_kind === 'github_poll')).toMatchObject({
      task_id: 'issue-89',
      source_kind: 'github_poll',
      observed_at: '2026-03-29T06:33:00.000Z',
    });
  });
});
