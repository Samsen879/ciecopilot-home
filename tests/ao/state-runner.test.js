import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import {
  createControllerModeRecord,
  createManagedTask,
  createOverrideRecord,
} from '../../scripts/ao/lib/state-contracts.js';
import { createStateRepository } from '../../scripts/ao/lib/state-repository.js';
import { loadAoStateReport } from '../../scripts/ao/lib/state-runner.js';

const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-state-runner-'));
  tempDirs.push(repoRoot);
  return repoRoot;
}

function createClock(...values) {
  let index = 0;
  const fallback = values[values.length - 1];
  return () => {
    const value = values[index] ?? fallback;
    index += 1;
    return value;
  };
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

describe('ao state runner', () => {
  it('reports missing repo-local control-plane state without mutating the repo', async () => {
    const repoRoot = createTempRepo();

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 3,
    });

    expect(report).toMatchObject({
      schema_version: 'ao.state.v1alpha1',
      report_format: 'ao_state_report',
      project_id: PROJECT_ID,
      bootstrapped: false,
      summary: {
        managed_task_count: 0,
        pr_binding_count: 0,
        active_ownership_lease_count: 0,
        active_controller_lease_count: 0,
        action_count: 0,
        active_override_count: 0,
        controller_mode_count: 0,
        controller_modes: [],
        audit_entry_count: 0,
      },
    });
    expect(fs.existsSync(path.join(repoRoot, '.ao-control-plane'))).toBe(false);
  });

  it('summarizes bootstrapped durable state and recent audit entries', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-29T05:10:00.000Z',
        '2026-03-29T05:11:00.000Z',
        '2026-03-29T05:12:00.000Z',
        '2026-03-29T05:13:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'task-1',
      issue_number: 88,
      title: 'Durable AO control-plane state',
      branch_name: 'feat/88',
      worktree_path: '/tmp/cie-48',
      status: 'active',
      created_at: '2026-03-29T05:10:00.000Z',
      updated_at: '2026-03-29T05:10:00.000Z',
    }));
    repository.upsertOverride(createOverrideRecord({
      override_id: 'override-1',
      scope_kind: 'task',
      scope_id: 'task-1',
      override_kind: 'hold_autonomy',
      value: { enabled: true },
      status: 'active',
      created_at: '2026-03-29T05:11:00.000Z',
      expires_at: null,
      cleared_at: null,
      cleared_reason: null,
      created_by: 'operator',
    }));
    repository.upsertControllerMode(createControllerModeRecord({
      controller_id: 'default',
      mode: 'observe',
      updated_at: '2026-03-29T05:12:00.000Z',
      updated_by: 'operator',
      reason: 'Phase-4 foundation is inspect-only.',
    }));

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
    });

    expect(report.bootstrapped).toBe(true);
    expect(report.summary).toMatchObject({
      managed_task_count: 1,
      pr_binding_count: 0,
      active_ownership_lease_count: 0,
      active_controller_lease_count: 0,
      action_count: 0,
      active_override_count: 1,
      controller_mode_count: 1,
      controller_modes: ['default=observe'],
      audit_entry_count: 6,
    });
    expect(report.audit.recent_entries).toEqual([
      expect.objectContaining({
        entity_kind: 'override',
        entity_id: 'override-1',
      }),
      expect.objectContaining({
        entity_kind: 'controller_mode',
        entity_id: 'default',
      }),
    ]);
  });
});
