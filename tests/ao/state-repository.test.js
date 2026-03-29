import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import {
  createActionRecord,
  createControllerLease,
  createControllerModeRecord,
  createManagedTask,
  createOverrideRecord,
  createOwnershipLease,
  createPrBinding,
} from '../../scripts/ao/lib/state-contracts.js';
import { createStateRepository } from '../../scripts/ao/lib/state-repository.js';

const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-state-repository-'));
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

describe('ao state repository', () => {
  it('returns a virtual empty snapshot before bootstrap without mutating the repo', () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
    });

    const snapshot = repository.getSnapshot();

    expect(snapshot.bootstrapped).toBe(false);
    expect(snapshot.state).toMatchObject({
      project_id: PROJECT_ID,
      managed_tasks: [],
      pr_bindings: [],
      ownership_leases: [],
      controller_leases: [],
      actions: [],
      overrides: [],
      controller_modes: [],
    });
    expect(repository.listAuditEntries()).toEqual([]);
    expect(fs.existsSync(path.join(repoRoot, '.ao-control-plane'))).toBe(false);
  });

  it('writes and reads durable control-plane records for every foundation collection', () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-29T04:50:00.000Z',
        '2026-03-29T04:51:00.000Z',
        '2026-03-29T04:52:00.000Z',
        '2026-03-29T04:53:00.000Z',
        '2026-03-29T04:54:00.000Z',
        '2026-03-29T04:55:00.000Z',
        '2026-03-29T04:56:00.000Z',
        '2026-03-29T04:57:00.000Z',
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
      created_at: '2026-03-29T04:50:00.000Z',
      updated_at: '2026-03-29T04:50:00.000Z',
    }));
    repository.upsertPrBinding(createPrBinding({
      binding_id: 'binding-1',
      task_id: 'task-1',
      pr_number: 101,
      branch_name: 'feat/88',
      base_branch: 'main',
      status: 'bound',
      created_at: '2026-03-29T04:51:00.000Z',
      updated_at: '2026-03-29T04:51:00.000Z',
    }));
    repository.upsertOwnershipLease(createOwnershipLease({
      lease_id: 'ownership-1',
      task_id: 'task-1',
      owner_session_name: 'cie-48',
      owner_session_id: 'session-48',
      status: 'active',
      acquired_at: '2026-03-29T04:52:00.000Z',
      expires_at: '2026-03-29T05:12:00.000Z',
    }));
    repository.upsertControllerLease(createControllerLease({
      lease_id: 'controller-1',
      controller_id: 'default',
      holder_id: 'cie-orchestrator',
      holder_type: 'session',
      status: 'active',
      acquired_at: '2026-03-29T04:53:00.000Z',
      expires_at: '2026-03-29T05:13:00.000Z',
    }));
    repository.upsertAction(createActionRecord({
      action_id: 'action-1',
      task_id: 'task-1',
      action_kind: 'notify_human_ready',
      status: 'proposed',
      requested_by: 'lifecycle',
      reason: 'Release posture is ready for operator review.',
      created_at: '2026-03-29T04:54:00.000Z',
      updated_at: '2026-03-29T04:54:00.000Z',
      payload: { pr_number: 101 },
    }));
    repository.upsertOverride(createOverrideRecord({
      override_id: 'override-1',
      scope_kind: 'task',
      scope_id: 'task-1',
      override_kind: 'hold_autonomy',
      value: { enabled: true },
      status: 'active',
      created_at: '2026-03-29T04:55:00.000Z',
      expires_at: null,
      cleared_at: null,
      cleared_reason: null,
      created_by: 'operator',
    }));
    repository.upsertControllerMode(createControllerModeRecord({
      controller_id: 'default',
      mode: 'observe',
      updated_at: '2026-03-29T04:56:00.000Z',
      updated_by: 'operator',
      reason: 'Phase-4 foundation is inspect-only.',
    }));

    const snapshot = repository.getSnapshot();
    const auditEntries = repository.listAuditEntries();

    expect(snapshot.bootstrapped).toBe(true);
    expect(snapshot.state).toMatchObject({
      managed_tasks: [expect.objectContaining({ task_id: 'task-1', status: 'active' })],
      pr_bindings: [expect.objectContaining({ binding_id: 'binding-1', pr_number: 101 })],
      ownership_leases: [expect.objectContaining({ lease_id: 'ownership-1', status: 'active' })],
      controller_leases: [expect.objectContaining({ lease_id: 'controller-1', status: 'active' })],
      actions: [expect.objectContaining({ action_id: 'action-1', action_kind: 'notify_human_ready' })],
      overrides: [expect.objectContaining({ override_id: 'override-1', override_kind: 'hold_autonomy' })],
      controller_modes: [expect.objectContaining({ controller_id: 'default', mode: 'observe' })],
    });
    expect(auditEntries.map((entry) => `${entry.entity_kind}:${entry.operation}:${entry.entity_id}`)).toEqual([
      'schema:bootstrap:v1',
      'managed_task:upsert:task-1',
      'pr_binding:upsert:binding-1',
      'ownership_lease:upsert:ownership-1',
      'controller_lease:upsert:controller-1',
      'action:upsert:action-1',
      'override:upsert:override-1',
      'controller_mode:upsert:default',
    ]);
  });

  it('keeps state upserts idempotent while audit log writes remain append-only', () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-29T05:00:00.000Z',
        '2026-03-29T05:01:00.000Z',
        '2026-03-29T05:02:00.000Z',
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
      created_at: '2026-03-29T05:00:00.000Z',
      updated_at: '2026-03-29T05:00:00.000Z',
    }));
    const beforeAudit = repository.listAuditEntries();

    repository.upsertManagedTask(createManagedTask({
      task_id: 'task-1',
      issue_number: 88,
      title: 'Durable AO control-plane state',
      branch_name: 'feat/88',
      worktree_path: '/tmp/cie-48',
      status: 'paused',
      created_at: '2026-03-29T05:00:00.000Z',
      updated_at: '2026-03-29T05:02:00.000Z',
    }));
    const afterAudit = repository.listAuditEntries();

    expect(repository.getSnapshot().state.managed_tasks).toEqual([
      expect.objectContaining({
        task_id: 'task-1',
        status: 'paused',
        updated_at: '2026-03-29T05:02:00.000Z',
      }),
    ]);
    expect(afterAudit).toHaveLength(beforeAudit.length + 1);
    expect(afterAudit.slice(0, beforeAudit.length)).toEqual(beforeAudit);
    expect(afterAudit.at(-1)).toMatchObject({
      entity_kind: 'managed_task',
      operation: 'upsert',
      entity_id: 'task-1',
    });
  });
});
