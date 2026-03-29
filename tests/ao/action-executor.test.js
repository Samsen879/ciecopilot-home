import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import {
  buildAssistActionModel,
  executeAssistActions,
} from '../../scripts/ao/lib/action-executor.js';
import {
  createActionRecord,
  createManagedTask,
  createOverrideRecord,
} from '../../scripts/ao/lib/state-contracts.js';
import { createStateRepository } from '../../scripts/ao/lib/state-repository.js';

const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-action-executor-'));
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

function seedActiveTask(repository) {
  repository.upsertManagedTask(createManagedTask({
    task_id: 'issue-90',
    issue_number: 90,
    title: 'Assist-mode Class A executor and override controls',
    branch_name: 'feat/90',
    worktree_path: '/tmp/cie-90',
    status: 'active',
    created_at: '2026-03-29T07:10:00.000Z',
    updated_at: '2026-03-29T07:10:00.000Z',
  }));
}

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('ao action executor', () => {
  it('builds typed assist action models with risk classes and preconditions', () => {
    const notifyModel = buildAssistActionModel({
      controllerId: 'default',
      task: {
        task_id: 'issue-90',
        status: 'active',
      },
      prNumber: 101,
      derivedTrigger: 'approved_and_green',
      lifecycleTopStatus: 'continue',
      action: {
        id: 'notify_human_ready',
        action_class: 'notify_human',
        summary: 'Notify the human that the PR appears ready.',
        commands: ['gh pr view 101 --json mergeable,reviewDecision,isDraft,url'],
        rationale: 'Human approval remains required even when the PR appears ready.',
      },
    });

    expect(notifyModel).toMatchObject({
      action_kind: 'notify_human_ready',
      action_class: 'notify_human',
      risk_class: 'class_a',
      phase4_assist: {
        executable: true,
        reason: 'class_a_allowlist',
      },
    });
    expect(notifyModel.preconditions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'task_active',
        satisfied: true,
      }),
      expect.objectContaining({
        code: 'pr_scope_required',
        satisfied: true,
      }),
    ]));

    const restoreModel = buildAssistActionModel({
      controllerId: 'default',
      task: {
        task_id: 'issue-90',
        status: 'active',
      },
      prNumber: 101,
      derivedTrigger: 'agent_exited',
      lifecycleTopStatus: 'human_gate',
      action: {
        id: 'restore_worker',
        action_class: 'restore_worker',
        summary: 'Restore the previously identified worker.',
        commands: ['ao status -p ciecopilot-home --json'],
        rationale: 'The prior owner is still identifiable, but continuity is stale.',
      },
    });

    expect(restoreModel).toMatchObject({
      action_kind: 'restore_worker',
      risk_class: 'class_c',
      phase4_assist: {
        executable: false,
        reason: 'runtime_ownership_change_forbidden',
      },
    });
  });

  it('executes only class A actions and writes explicit execution audit entries', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
      auditIdGenerator: createIdGenerator('audit'),
    });
    seedActiveTask(repository);

    const actionModel = buildAssistActionModel({
      controllerId: 'default',
      task: repository.getSnapshot().state.managed_tasks[0],
      prNumber: 101,
      derivedTrigger: 'manual',
      lifecycleTopStatus: 'continue',
      action: {
        id: 'continue_worker',
        action_class: 'continue_worker',
        summary: 'Continue the current worker owner.',
        commands: ['ao status -p ciecopilot-home --json'],
        rationale: 'Ownership continuity is clear enough to continue the current worker.',
      },
    });

    repository.upsertAction(createActionRecord({
      action_id: 'action-1',
      task_id: 'issue-90',
      action_kind: 'continue_worker',
      status: 'proposed',
      requested_by: 'shadow_controller',
      reason: 'Continue the current worker owner.',
      created_at: '2026-03-29T07:11:00.000Z',
      updated_at: '2026-03-29T07:11:00.000Z',
      payload: {
        action_model: actionModel,
      },
    }));

    const result = await executeAssistActions({
      repository,
      controllerId: 'default',
      task: repository.getSnapshot().state.managed_tasks[0],
      actionIds: ['action-1'],
      now: '2026-03-29T07:12:00.000Z',
    });

    expect(result).toEqual({
      executedActionIds: ['action-1'],
      blockedActionIds: [],
    });

    expect(repository.getSnapshot().state.actions).toEqual([
      expect.objectContaining({
        action_id: 'action-1',
        status: 'executed',
        payload: expect.objectContaining({
          execution: expect.objectContaining({
            outcome: 'executed',
            executed_at: '2026-03-29T07:12:00.000Z',
            executor: 'assist_controller',
          }),
        }),
      }),
    ]);

    expect(repository.listAuditEntries().filter((entry) => (
      entry.entity_kind === 'action' && entry.entity_id === 'action-1'
    ))).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: 'executed',
        actor: 'assist_controller',
      }),
    ]));
  });

  it('honors active autonomy-hold overrides without executing class A actions', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
      auditIdGenerator: createIdGenerator('audit'),
    });
    seedActiveTask(repository);

    repository.upsertOverride(createOverrideRecord({
      override_id: 'override-1',
      scope_kind: 'task',
      scope_id: 'issue-90',
      override_kind: 'hold_autonomy',
      value: { enabled: true },
      status: 'active',
      created_at: '2026-03-29T07:11:00.000Z',
      expires_at: null,
      cleared_at: null,
      cleared_reason: null,
      created_by: 'operator',
    }));

    const actionModel = buildAssistActionModel({
      controllerId: 'default',
      task: repository.getSnapshot().state.managed_tasks[0],
      prNumber: 101,
      derivedTrigger: 'approved_and_green',
      lifecycleTopStatus: 'continue',
      action: {
        id: 'notify_human_ready',
        action_class: 'notify_human',
        summary: 'Notify the human that the PR appears ready.',
        commands: ['gh pr view 101 --json mergeable,reviewDecision,isDraft,url'],
        rationale: 'Human approval remains required even when the PR appears ready.',
      },
    });

    repository.upsertAction(createActionRecord({
      action_id: 'action-1',
      task_id: 'issue-90',
      action_kind: 'notify_human_ready',
      status: 'proposed',
      requested_by: 'shadow_controller',
      reason: 'Notify the human that the PR appears ready.',
      created_at: '2026-03-29T07:11:00.000Z',
      updated_at: '2026-03-29T07:11:00.000Z',
      payload: {
        action_model: actionModel,
      },
    }));

    const result = await executeAssistActions({
      repository,
      controllerId: 'default',
      task: repository.getSnapshot().state.managed_tasks[0],
      actionIds: ['action-1'],
      now: '2026-03-29T07:12:00.000Z',
    });

    expect(result).toEqual({
      executedActionIds: [],
      blockedActionIds: ['action-1'],
    });

    expect(repository.getSnapshot().state.actions).toEqual([
      expect.objectContaining({
        action_id: 'action-1',
        status: 'proposed',
        payload: expect.objectContaining({
          execution: expect.objectContaining({
            outcome: 'blocked',
            reason: 'override_hold_autonomy',
          }),
        }),
      }),
    ]);

    expect(repository.listAuditEntries().filter((entry) => (
      entry.entity_kind === 'action' && entry.entity_id === 'action-1'
    ))).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: 'execution_blocked',
        actor: 'assist_controller',
      }),
    ]));
  });
});
