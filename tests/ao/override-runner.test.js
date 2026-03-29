import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import { runOverrideCommand } from '../../scripts/ao/lib/override-runner.js';

const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-override-runner-'));
  tempDirs.push(repoRoot);
  return repoRoot;
}

function createIdGenerator(prefix) {
  let index = 0;
  return () => {
    index += 1;
    return `${prefix}-${index}`;
  };
}

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('ao override runner', () => {
  it('creates, lists, and clears durable overrides', async () => {
    const repoRoot = createTempRepo();

    const created = await runOverrideCommand({
      repoRoot,
      projectId: PROJECT_ID,
      command: 'create',
      scopeKind: 'task',
      scopeId: 'issue-90',
      overrideKind: 'hold_autonomy',
      value: { enabled: true },
      createdBy: 'operator',
      now: '2026-03-29T07:20:00.000Z',
      overrideIdGenerator: createIdGenerator('override'),
    });

    expect(created.override).toMatchObject({
      override_id: 'override-1',
      scope_kind: 'task',
      scope_id: 'issue-90',
      override_kind: 'hold_autonomy',
      status: 'active',
      created_by: 'operator',
    });

    const listed = await runOverrideCommand({
      repoRoot,
      projectId: PROJECT_ID,
      command: 'list',
      status: 'active',
      scopeKind: 'task',
      scopeId: 'issue-90',
    });

    expect(listed.overrides).toEqual([
      expect.objectContaining({
        override_id: 'override-1',
        status: 'active',
      }),
    ]);

    const cleared = await runOverrideCommand({
      repoRoot,
      projectId: PROJECT_ID,
      command: 'clear',
      overrideId: 'override-1',
      reason: 'resume_assist_mode',
      now: '2026-03-29T07:21:00.000Z',
    });

    expect(cleared.override).toMatchObject({
      override_id: 'override-1',
      status: 'cleared',
      cleared_at: '2026-03-29T07:21:00.000Z',
      cleared_reason: 'resume_assist_mode',
    });
  });

  it('rejects clearing unknown overrides', async () => {
    await expect(runOverrideCommand({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
      command: 'clear',
      overrideId: 'missing-override',
      reason: 'resume_assist_mode',
      now: '2026-03-29T07:21:00.000Z',
    })).rejects.toThrow(/override not found/i);
  });
});
