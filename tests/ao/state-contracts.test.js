import { describe, expect, it } from '@jest/globals';

import {
  ACTION_STATUSES,
  CONTROLLER_LEASE_STATUSES,
  CONTROLLER_MODES,
  MANAGED_TASK_STATUSES,
  OVERRIDE_SCOPE_KINDS,
  OVERRIDE_STATUSES,
  PR_BINDING_STATUSES,
  OWNERSHIP_LEASE_STATUSES,
  createActionRecord,
  createControlPlaneAuditEntry,
  createControlPlaneSchema,
  createControllerLease,
  createControllerModeRecord,
  createEmptyControlPlaneState,
  createManagedTask,
  createOverrideRecord,
  createOwnershipLease,
  createPrBinding,
} from '../../scripts/ao/lib/state-contracts.js';

const NOW = '2026-03-29T04:40:00.000Z';

describe('ao state contracts', () => {
  it('exports frozen durable control-plane enums', () => {
    expect(MANAGED_TASK_STATUSES).toEqual(['active', 'paused', 'retired']);
    expect(PR_BINDING_STATUSES).toEqual(['bound', 'released', 'closed']);
    expect(OWNERSHIP_LEASE_STATUSES).toEqual(['active', 'released', 'expired']);
    expect(CONTROLLER_LEASE_STATUSES).toEqual(['active', 'released', 'expired']);
    expect(ACTION_STATUSES).toEqual(['proposed', 'blocked', 'executed', 'cancelled']);
    expect(OVERRIDE_SCOPE_KINDS).toEqual(['global', 'task', 'pr', 'controller']);
    expect(OVERRIDE_STATUSES).toEqual(['active', 'cleared', 'expired']);
    expect(CONTROLLER_MODES).toEqual(['off', 'observe', 'shadow', 'assist']);
  });

  it('creates durable managed-task, binding, lease, action, override, and controller-mode records', () => {
    expect(createManagedTask({
      task_id: 'task-1',
      issue_number: 88,
      title: 'Durable AO control-plane state',
      branch_name: 'feat/88',
      worktree_path: '/tmp/cie-48',
      status: 'active',
      created_at: NOW,
      updated_at: NOW,
    })).toEqual({
      task_id: 'task-1',
      issue_number: 88,
      title: 'Durable AO control-plane state',
      branch_name: 'feat/88',
      worktree_path: '/tmp/cie-48',
      status: 'active',
      created_at: NOW,
      updated_at: NOW,
      metadata: {},
    });

    expect(createPrBinding({
      binding_id: 'binding-1',
      task_id: 'task-1',
      pr_number: 101,
      branch_name: 'feat/88',
      base_branch: 'main',
      status: 'bound',
      created_at: NOW,
      updated_at: NOW,
    })).toEqual({
      binding_id: 'binding-1',
      task_id: 'task-1',
      pr_number: 101,
      branch_name: 'feat/88',
      base_branch: 'main',
      status: 'bound',
      created_at: NOW,
      updated_at: NOW,
      metadata: {},
    });

    expect(createOwnershipLease({
      lease_id: 'lease-1',
      task_id: 'task-1',
      owner_session_name: 'cie-48',
      owner_session_id: 'session-48',
      status: 'active',
      acquired_at: NOW,
      expires_at: '2026-03-29T05:10:00.000Z',
    })).toEqual({
      lease_id: 'lease-1',
      task_id: 'task-1',
      owner_session_name: 'cie-48',
      owner_session_id: 'session-48',
      status: 'active',
      acquired_at: NOW,
      expires_at: '2026-03-29T05:10:00.000Z',
      released_at: null,
      release_reason: null,
      metadata: {},
    });

    expect(createControllerLease({
      lease_id: 'controller-lease-1',
      controller_id: 'default',
      holder_id: 'cie-orchestrator',
      holder_type: 'session',
      status: 'active',
      acquired_at: NOW,
      expires_at: '2026-03-29T05:10:00.000Z',
    })).toEqual({
      lease_id: 'controller-lease-1',
      controller_id: 'default',
      holder_id: 'cie-orchestrator',
      holder_type: 'session',
      status: 'active',
      acquired_at: NOW,
      expires_at: '2026-03-29T05:10:00.000Z',
      released_at: null,
      release_reason: null,
      metadata: {},
    });

    expect(createActionRecord({
      action_id: 'action-1',
      task_id: 'task-1',
      action_kind: 'notify_human_ready',
      status: 'proposed',
      requested_by: 'lifecycle',
      reason: 'Release posture is ready for operator review.',
      created_at: NOW,
      updated_at: NOW,
      payload: { pr_number: 101 },
    })).toEqual({
      action_id: 'action-1',
      task_id: 'task-1',
      action_kind: 'notify_human_ready',
      status: 'proposed',
      requested_by: 'lifecycle',
      reason: 'Release posture is ready for operator review.',
      created_at: NOW,
      updated_at: NOW,
      payload: { pr_number: 101 },
    });

    expect(createOverrideRecord({
      override_id: 'override-1',
      scope_kind: 'task',
      scope_id: 'task-1',
      override_kind: 'hold_autonomy',
      value: { enabled: true },
      status: 'active',
      created_at: NOW,
      expires_at: null,
      cleared_at: null,
      cleared_reason: null,
      created_by: 'operator',
    })).toEqual({
      override_id: 'override-1',
      scope_kind: 'task',
      scope_id: 'task-1',
      override_kind: 'hold_autonomy',
      value: { enabled: true },
      status: 'active',
      created_at: NOW,
      expires_at: null,
      cleared_at: null,
      cleared_reason: null,
      created_by: 'operator',
    });

    expect(createControllerModeRecord({
      controller_id: 'default',
      mode: 'observe',
      updated_at: NOW,
      updated_by: 'operator',
      reason: 'Phase-4 foundation is read-only.',
    })).toEqual({
      controller_id: 'default',
      mode: 'observe',
      updated_at: NOW,
      updated_by: 'operator',
      reason: 'Phase-4 foundation is read-only.',
    });
  });

  it('creates empty schema, state, and audit envelopes for repo-local bootstrap', () => {
    expect(createControlPlaneSchema({
      project_id: 'ciecopilot-home',
      current_version: 1,
      latest_version: 1,
      created_at: NOW,
      updated_at: NOW,
      applied_migrations: [
        {
          version: 1,
          key: '0001_bootstrap_control_plane_v1',
          applied_at: NOW,
        },
      ],
    })).toMatchObject({
      schema_version: 'ao.control-plane.schema.v1alpha1',
      format: 'ao_control_plane_schema',
      project_id: 'ciecopilot-home',
      current_version: 1,
      latest_version: 1,
      created_at: NOW,
      updated_at: NOW,
      applied_migrations: [
        {
          version: 1,
          key: '0001_bootstrap_control_plane_v1',
          applied_at: NOW,
        },
      ],
    });

    expect(createEmptyControlPlaneState({
      project_id: 'ciecopilot-home',
      created_at: NOW,
      updated_at: NOW,
    })).toEqual({
      schema_version: 'ao.control-plane.state.v1alpha1',
      format: 'ao_control_plane_state',
      project_id: 'ciecopilot-home',
      created_at: NOW,
      updated_at: NOW,
      managed_tasks: [],
      pr_bindings: [],
      ownership_leases: [],
      controller_leases: [],
      actions: [],
      overrides: [],
      controller_modes: [],
      observations: [],
      controller_cursors: [],
    });

    expect(createControlPlaneAuditEntry({
      audit_id: 'audit-1',
      project_id: 'ciecopilot-home',
      recorded_at: NOW,
      entity_kind: 'managed_task',
      entity_id: 'task-1',
      operation: 'upsert',
      actor: 'state_repository',
      summary: 'Persisted managed task task-1.',
      details: { task_id: 'task-1' },
    })).toEqual({
      schema_version: 'ao.control-plane.audit.v1alpha1',
      format: 'ao_control_plane_audit_entry',
      audit_id: 'audit-1',
      project_id: 'ciecopilot-home',
      recorded_at: NOW,
      entity_kind: 'managed_task',
      entity_id: 'task-1',
      operation: 'upsert',
      actor: 'state_repository',
      summary: 'Persisted managed task task-1.',
      details: { task_id: 'task-1' },
    });
  });
});
