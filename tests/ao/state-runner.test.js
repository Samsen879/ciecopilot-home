import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import { createCheckpointStore } from '../../scripts/ao/lib/checkpoint-store.js';
import { createHandoffProtocol } from '../../scripts/ao/lib/handoff-protocol.js';
import {
  createControllerModeRecord,
  createManagedTask,
  createOverrideRecord,
  createPrBinding,
  createTaskSpecRecord,
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
      audit_entry_count: 10,
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

  it('includes checkpoint inspection state in the operator-visible AO state report', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-30T10:00:00.000Z',
        '2026-03-30T10:01:00.000Z',
        '2026-03-30T10:02:00.000Z',
        '2026-03-30T10:03:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-110',
      issue_number: 110,
      title: 'feat(ao): add checkpoint schema and explicit resume',
      branch_name: 'feat/110',
      worktree_path: '/tmp/cie-57',
      status: 'active',
      created_at: '2026-03-30T10:00:00.000Z',
      updated_at: '2026-03-30T10:00:00.000Z',
    }));
    repository.upsertPrBinding(createPrBinding({
      binding_id: 'binding-issue-110-pr-110',
      task_id: 'issue-110',
      pr_number: 110,
      branch_name: 'feat/110',
      base_branch: 'main',
      status: 'bound',
      created_at: '2026-03-30T10:00:00.000Z',
      updated_at: '2026-03-30T10:00:00.000Z',
    }));
    repository.upsertControllerMode(createControllerModeRecord({
      controller_id: 'default',
      mode: 'observe',
      updated_at: '2026-03-30T10:01:00.000Z',
      updated_by: 'operator',
      reason: 'Checkpoint inspection setup',
    }));
    repository.upsertTaskSpec(createTaskSpecRecord({
      task_id: 'issue-110',
      source_kind: 'github_issue',
      source_issue_number: 110,
      created_at: '2026-03-30T10:01:00.000Z',
      updated_at: '2026-03-30T10:01:00.000Z',
      snapshot: {
        schema_version: 'ao.task-spec.v1alpha1',
        spec: {
          problem_type: 'issue_delivery',
          acceptance_contract: ['checkpoint-backed resume exists'],
          runtime_ref: 'runtime.github_local',
          policy_ref: 'policy.operator_gated',
          human_gates: ['operator_resume'],
        },
      },
    }));
    repository.ensureRuntimePreflights({
      cwd: repoRoot,
      now: '2026-03-30T10:02:00.000Z',
      probes: {
        commandExists: () => true,
        pathExists: () => true,
        capability: () => true,
      },
    });
    createCheckpointStore({
      repository,
      now: () => '2026-03-30T10:03:00.000Z',
    }).captureCheckpoint({
      taskId: 'issue-110',
      controllerId: 'default',
      derivedTrigger: 'manual',
      observedAt: '2026-03-30T10:03:00.000Z',
      actionIds: [],
    });

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
    });

    expect(report.summary).toMatchObject({
      checkpoint_count: 1,
      valid_checkpoint_count: 1,
      stale_checkpoint_count: 0,
      invalid_checkpoint_count: 0,
    });
    expect(report.checkpoints.inspections).toEqual([
      expect.objectContaining({
        task_id: 'issue-110',
        state: 'valid',
      }),
    ]);
  });

  it('includes successor handoff inspection state in the operator-visible AO state report', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-31T10:00:00.000Z',
        '2026-03-31T10:01:00.000Z',
        '2026-03-31T10:02:00.000Z',
        '2026-03-31T10:03:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-117',
      issue_number: 117,
      title: 'feat(ao): add successor handoff and authority transfer protocol',
      branch_name: 'feat/117',
      worktree_path: '/tmp/cie-58',
      status: 'active',
      created_at: '2026-03-31T10:00:00.000Z',
      updated_at: '2026-03-31T10:00:00.000Z',
    }));
    repository.upsertPrBinding(createPrBinding({
      binding_id: 'binding-issue-117-pr-117',
      task_id: 'issue-117',
      pr_number: 117,
      branch_name: 'feat/117',
      base_branch: 'main',
      status: 'bound',
      created_at: '2026-03-31T10:00:00.000Z',
      updated_at: '2026-03-31T10:00:00.000Z',
    }));
    repository.upsertTaskSpec(createTaskSpecRecord({
      task_id: 'issue-117',
      source_kind: 'github_issue',
      source_issue_number: 117,
      created_at: '2026-03-31T10:00:00.000Z',
      updated_at: '2026-03-31T10:00:00.000Z',
      snapshot: {
        schema_version: 'ao.task-spec.v1alpha1',
        spec: {
          problem_type: 'issue_delivery',
          acceptance_contract: ['successor handoff protocol exists'],
          runtime_ref: 'runtime.github_local',
          policy_ref: 'policy.operator_gated',
          human_gates: ['operator_handoff'],
        },
      },
    }));
    repository.ensureRuntimePreflights({
      cwd: repoRoot,
      now: '2026-03-31T10:01:00.000Z',
      probes: {
        commandExists: () => true,
        pathExists: () => true,
        capability: () => true,
      },
    });
    createCheckpointStore({
      repository,
      now: () => '2026-03-31T10:02:00.000Z',
    }).captureCheckpoint({
      taskId: 'issue-117',
      controllerId: 'default',
      derivedTrigger: 'agent_exited',
      observedAt: '2026-03-31T10:02:00.000Z',
      actionIds: [],
    });

    const handoffProtocol = createHandoffProtocol({
      repository,
      now: () => '2026-03-31T10:03:00.000Z',
    });
    const request = handoffProtocol.requestHandoff({
      taskId: 'issue-117',
      requestedBySessionName: 'operator-1',
      requestedBySessionId: 'operator-1',
      operatorSessionName: 'operator-1',
      operatorSessionId: 'operator-1',
      successorSessionName: 'cie-59',
      successorSessionId: 'cie-59',
      reason: 'owner_stale',
    });
    const claim = handoffProtocol.claimHandoff({
      requestId: request.request_id,
      successorSessionName: 'cie-59',
      successorSessionId: 'cie-59',
      reason: 'continue_issue_117',
    });
    handoffProtocol.acceptHandoff({
      requestId: request.request_id,
      claimId: claim.claim_id,
      operatorSessionName: 'operator-1',
      operatorSessionId: 'operator-1',
      reason: 'approved_successor',
      grantExpiresAt: '2026-03-31T10:20:00.000Z',
    });

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
    });

    expect(report.summary).toMatchObject({
      handoff_request_count: 1,
      handoff_claim_count: 1,
      handoff_decision_count: 1,
      handoff_transfer_count: 0,
      active_handoff_count: 1,
    });
    expect(report.handoffs.inspections).toEqual([
      expect.objectContaining({
        task_id: 'issue-117',
        request_id: request.request_id,
        top_status: 'accepted',
      }),
    ]);
  });
});
