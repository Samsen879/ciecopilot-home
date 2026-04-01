import { describe, expect, it } from '@jest/globals';

import {
  ACTION_STATUSES,
  CONTROLLER_LEASE_STATUSES,
  CONTROLLER_MODES,
  CONTROL_PLANE_LATEST_VERSION,
  CREDENTIAL_PROVENANCE_TRUST_DECISIONS,
  DELIVERY_EVENT_FAMILIES,
  MANAGED_TASK_STATUSES,
  OVERRIDE_SCOPE_KINDS,
  OVERRIDE_STATUSES,
  POLICY_DECISIONS,
  PR_BINDING_STATUSES,
  OWNERSHIP_LEASE_STATUSES,
  createActionRecord,
  createCompletionReviewRecord,
  createControlPlaneAuditEntry,
  createControlPlaneSchema,
  createControllerLease,
  createControllerModeRecord,
  createCredentialProvenanceRecord,
  createDeliveryEventRecord,
  createEmptyControlPlaneState,
  createHandoffClaimRecord,
  createHandoffDecisionRecord,
  createHandoffRequestRecord,
  createHandoffTransferRecord,
  createManagedTask,
  createOverrideRecord,
  createOwnershipLease,
  createPolicyDecisionRecord,
  createPrBinding,
  createRuntimePreflightRecord,
  createTaskSpecRecord,
} from '../../scripts/ao/lib/state-contracts.js';

const NOW = '2026-03-29T04:40:00.000Z';

describe('ao state contracts', () => {
  it('exports frozen durable control-plane enums', () => {
    expect(MANAGED_TASK_STATUSES).toEqual(['active', 'paused', 'retired']);
    expect(PR_BINDING_STATUSES).toEqual(['bound', 'released', 'closed']);
    expect(OWNERSHIP_LEASE_STATUSES).toEqual(['active', 'released', 'expired']);
    expect(CONTROLLER_LEASE_STATUSES).toEqual(['active', 'released', 'expired']);
    expect(ACTION_STATUSES).toEqual(['proposed', 'blocked', 'executed', 'cancelled']);
    expect(DELIVERY_EVENT_FAMILIES).toEqual(['pr', 'check', 'review', 'review_comment']);
    expect(OVERRIDE_SCOPE_KINDS).toEqual(['global', 'task', 'pr', 'controller']);
    expect(OVERRIDE_STATUSES).toEqual(['active', 'cleared', 'expired']);
    expect(CONTROLLER_MODES).toEqual(['off', 'observe', 'shadow', 'assist']);
    expect(POLICY_DECISIONS).toEqual(['allow', 'deny', 'downgrade']);
    expect(CREDENTIAL_PROVENANCE_TRUST_DECISIONS).toEqual(['trusted', 'untrusted']);
    expect(CONTROL_PLANE_LATEST_VERSION).toBe(13);
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
      lineage: {
        source_delivery_event_ids: [],
        source_observation_ids: [],
        source_cursor_ids: [],
        derived_trigger: 'manual',
        pr_head_sha: null,
        policy_decision_id: null,
      },
      governance: {
        replay_key: 'action:action-1',
        replay_limit: 2,
        replay_count: 0,
        suppressed_count: 0,
        last_decision: 'accepted',
        backpressure_status: 'open',
        first_recorded_at: NOW,
        last_decision_at: NOW,
        reason_codes: [],
      },
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

    expect(createTaskSpecRecord({
      task_id: 'task-1',
      source_kind: 'github_issue',
      source_issue_number: 88,
      created_at: NOW,
      updated_at: NOW,
      snapshot: {
        schema_version: 'ao.task-spec.v1alpha1',
        valid: true,
        findings: [],
        spec: {
          problem_type: 'issue_delivery',
          acceptance_contract: ['fixture-backed tests exist'],
          runtime_ref: 'runtime.github_local',
          policy_ref: 'policy.operator_gated',
          human_gates: ['operator_enroll'],
        },
      },
    })).toEqual({
      task_id: 'task-1',
      source_kind: 'github_issue',
      source_issue_number: 88,
      state: 'valid',
      created_at: NOW,
      updated_at: NOW,
      snapshot: {
        schema_version: 'ao.task-spec.v1alpha1',
        valid: true,
        findings: [],
        spec: {
          problem_type: 'issue_delivery',
          acceptance_contract: ['fixture-backed tests exist'],
          runtime_ref: 'runtime.github_local',
          policy_ref: 'policy.operator_gated',
          human_gates: ['operator_enroll'],
        },
      },
    });

    const runtimePreflightRecord = createRuntimePreflightRecord({
      recorded_at: NOW,
      snapshot: {
        schema_version: 'ao.runtime-preflight.v1alpha1',
        format: 'ao_runtime_preflight',
        runtime_ref: 'runtime.github_local',
        provider_id: 'github_local',
        status: 'clean',
        observed_at: NOW,
        replay_key: 'runtime_preflight:abc123',
        contract: {
          schema_version: 'ao.runtime-provider.v1alpha1',
          runtime_ref: 'runtime.github_local',
          provider_id: 'github_local',
          provider_kind: 'github_local',
          display_name: 'GitHub local workspace',
          bootstrap_requirements: [],
          metadata: {},
        },
        checks: [],
      },
    });
    expect(runtimePreflightRecord.replay_key).toMatch(/^runtime_preflight:/);
    expect(runtimePreflightRecord.snapshot.replay_key).toBe(runtimePreflightRecord.replay_key);
    expect(runtimePreflightRecord).toMatchObject({
      runtime_ref: 'runtime.github_local',
      provider_id: 'github_local',
      status: 'clean',
      observed_at: NOW,
      recorded_at: NOW,
      replay_key: expect.stringMatching(/^runtime_preflight:/),
      snapshot: {
        schema_version: 'ao.runtime-preflight.v1alpha1',
        format: 'ao_runtime_preflight',
        runtime_ref: 'runtime.github_local',
        provider_id: 'github_local',
        status: 'clean',
        observed_at: NOW,
        replay_key: expect.stringMatching(/^runtime_preflight:/),
        contract: {
          schema_version: 'ao.runtime-provider.v1alpha1',
          runtime_ref: 'runtime.github_local',
          provider_id: 'github_local',
          provider_kind: 'github_local',
          display_name: 'GitHub local workspace',
          bootstrap_requirements: [],
          metadata: {},
        },
        checks: [],
      },
    });

    expect(createCredentialProvenanceRecord({
      provenance_id: 'cred-gh-cli',
      credential_kind: 'github_token',
      source_kind: 'gh_cli_auth',
      scope: 'github.com',
      created_at: NOW,
      updated_at: NOW,
    })).toEqual({
      provenance_id: 'cred-gh-cli',
      credential_kind: 'github_token',
      source_kind: 'gh_cli_auth',
      trust_decision: 'trusted',
      scope: 'github.com',
      created_at: NOW,
      updated_at: NOW,
      metadata: {},
    });

    expect(createPolicyDecisionRecord({
      decision_id: 'policy-1',
      task_id: 'task-1',
      action_id: 'action-1',
      action_kind: 'notify_human_ready',
      subject_kind: 'action',
      decision: 'allow',
      policy_version: 'ao.policy.v1',
      input_fingerprint: 'fingerprint-1',
      recorded_at: NOW,
      summary: 'Allow low-risk GitHub inspection.',
      findings: [],
      input: {
        tools: ['gh'],
      },
      result: {
        decision: 'allow',
      },
    })).toEqual({
      decision_id: 'policy-1',
      task_id: 'task-1',
      action_id: 'action-1',
      action_kind: 'notify_human_ready',
      subject_kind: 'action',
      decision: 'allow',
      policy_version: 'ao.policy.v1',
      input_fingerprint: 'fingerprint-1',
      recorded_at: NOW,
      summary: 'Allow low-risk GitHub inspection.',
      findings: [],
      input: {
        tools: ['gh'],
      },
      result: {
        decision: 'allow',
      },
    });

    expect(createDeliveryEventRecord({
      event_id: 'delivery-1',
      task_id: 'task-1',
      pr_number: 101,
      source_kind: 'github_poll',
      event_family: 'review_comment',
      event_type: 'review_comment_state',
      dedupe_key: 'github_poll:review_comment:101:review-1',
      lifecycle_trigger: 'bugbot_comments',
      controller_action_hint: 'hold_review',
      observed_at: NOW,
      recorded_at: NOW,
      lineage: {
        source_observation_id: 'obs-1',
        source_cursor: 'cursor-1',
      },
      payload: {
        head_sha: 'abc123',
        review_id: 'review-1',
        review_state: 'commented',
        author_login: 'chatgpt-codex-connector',
      },
    })).toEqual({
      event_id: 'delivery-1',
      task_id: 'task-1',
      pr_number: 101,
      source_kind: 'github_poll',
      event_family: 'review_comment',
      event_type: 'review_comment_state',
      dedupe_key: 'github_poll:review_comment:101:review-1',
      lifecycle_trigger: 'bugbot_comments',
      controller_action_hint: 'hold_review',
      observed_at: NOW,
      recorded_at: NOW,
      lineage: {
        source_observation_id: 'obs-1',
        source_cursor: 'cursor-1',
      },
      payload: {
        head_sha: 'abc123',
        review_id: 'review-1',
        review_state: 'commented',
        author_login: 'chatgpt-codex-connector',
      },
      governance: {
        replay_key: 'github_poll:review_comment:101:review-1',
        replay_limit: 2,
        replay_count: 0,
        suppressed_count: 0,
        last_decision: 'accepted',
        backpressure_status: 'open',
        first_recorded_at: NOW,
        last_decision_at: NOW,
        reason_codes: [],
      },
    });

    expect(createHandoffRequestRecord({
      request_id: 'handoff-task-1-1',
      task_id: 'task-1',
      status: 'open',
      created_at: NOW,
      updated_at: NOW,
      requested_by_session_name: 'operator-1',
      requested_by_session_id: 'operator-1',
      operator_session_name: 'operator-1',
      operator_session_id: 'operator-1',
      successor_session_name: 'cie-59',
      successor_session_id: 'cie-59',
      reason: 'owner_stale',
      expires_at: '2026-03-29T05:10:00.000Z',
      selected_claim_id: null,
      accepted_decision_id: null,
      completed_transfer_id: null,
      reason_codes: [],
      lineage: {
        checkpoint_id: 'checkpoint-task-1',
        checkpoint_recorded_at: NOW,
        checkpoint_state: 'valid',
        prior_ownership_lease_id: 'lease-1',
        prior_owner_session_name: 'cie-48',
        prior_owner_session_id: 'session-48',
        prior_ownership_status: 'expired',
        pr_binding_id: 'binding-1',
        pr_number: 101,
      },
    })).toMatchObject({
      schema_version: 'ao.handoff-request.v1alpha1',
      format: 'ao_handoff_request',
      request_id: 'handoff-task-1-1',
      task_id: 'task-1',
      status: 'open',
      successor_session_name: 'cie-59',
      lineage: {
        checkpoint_id: 'checkpoint-task-1',
        prior_ownership_lease_id: 'lease-1',
      },
    });

    expect(createHandoffClaimRecord({
      claim_id: 'claim-handoff-task-1-1',
      request_id: 'handoff-task-1-1',
      task_id: 'task-1',
      status: 'pending',
      created_at: NOW,
      updated_at: NOW,
      successor_session_name: 'cie-59',
      successor_session_id: 'cie-59',
    })).toMatchObject({
      schema_version: 'ao.handoff-claim.v1alpha1',
      format: 'ao_handoff_claim',
      claim_id: 'claim-handoff-task-1-1',
      status: 'pending',
      successor_session_name: 'cie-59',
    });

    expect(createHandoffDecisionRecord({
      decision_id: 'decision-handoff-task-1-1',
      request_id: 'handoff-task-1-1',
      claim_id: 'claim-handoff-task-1-1',
      task_id: 'task-1',
      outcome: 'accept',
      decided_at: NOW,
      operator_session_name: 'operator-1',
      operator_session_id: 'operator-1',
      successor_session_name: 'cie-59',
      successor_session_id: 'cie-59',
      grant_expires_at: '2026-03-29T05:00:00.000Z',
      reason: 'approved_successor',
    })).toMatchObject({
      schema_version: 'ao.handoff-decision.v1alpha1',
      format: 'ao_handoff_decision',
      decision_id: 'decision-handoff-task-1-1',
      outcome: 'accept',
      operator_session_name: 'operator-1',
      successor_session_name: 'cie-59',
    });

    expect(createHandoffTransferRecord({
      transfer_id: 'transfer-handoff-task-1-1',
      request_id: 'handoff-task-1-1',
      claim_id: 'claim-handoff-task-1-1',
      decision_id: 'decision-handoff-task-1-1',
      task_id: 'task-1',
      checkpoint_id: 'checkpoint-task-1',
      previous_ownership_lease_id: 'lease-1',
      previous_owner_session_name: 'cie-48',
      previous_owner_session_id: 'session-48',
      successor_ownership_lease_id: 'lease-2',
      successor_session_name: 'cie-59',
      successor_session_id: 'cie-59',
      transferred_at: NOW,
      transferred_by: 'manage_runner',
      reason: 'accepted_handoff_resume',
    })).toMatchObject({
      schema_version: 'ao.handoff-transfer.v1alpha1',
      format: 'ao_handoff_transfer',
      transfer_id: 'transfer-handoff-task-1-1',
      request_id: 'handoff-task-1-1',
      successor_session_name: 'cie-59',
      successor_ownership_lease_id: 'lease-2',
    });
  });

  it('creates durable completion-review records', () => {
    expect(createCompletionReviewRecord({
      review_id: 'completion-review-pr-141-accepted',
      task_id: 'issue-131',
      pr_number: 141,
      branch_name: 'feat/131',
      head_sha: 'abc131',
      status: 'accepted',
      validity_status: 'active',
      requested_at: NOW,
      updated_at: NOW,
      reviewed_at: NOW,
      reviewer_session_name: 'cie-reviewer-1',
      reviewer_session_id: 'cie-reviewer-1',
      implementation_owner_session_name: 'cie-70',
      implementation_owner_session_id: 'cie-70',
      verdict: 'accepted',
      reason_codes: ['completion_review_accepted'],
      findings: [],
      evidence_refs: [{
        source: 'github',
        kind: 'review',
        id: 'rvw-141',
        summary: 'Independent completion review accepted.',
      }],
    })).toEqual({
      review_id: 'completion-review-pr-141-accepted',
      task_id: 'issue-131',
      pr_number: 141,
      branch_name: 'feat/131',
      head_sha: 'abc131',
      status: 'accepted',
      validity_status: 'active',
      requested_at: NOW,
      updated_at: NOW,
      reviewed_at: NOW,
      reviewer_session_name: 'cie-reviewer-1',
      reviewer_session_id: 'cie-reviewer-1',
      implementation_owner_session_name: 'cie-70',
      implementation_owner_session_id: 'cie-70',
      verdict: 'accepted',
      reason_codes: ['completion_review_accepted'],
      findings: [],
      evidence_refs: [{
        source: 'github',
        kind: 'review',
        id: 'rvw-141',
        summary: 'Independent completion review accepted.',
      }],
      invalidated_at: null,
      invalidation_reason_codes: [],
      superseded_by_review_id: null,
      metadata: {},
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
      worktree_bindings: [],
      release_guards: [],
      completion_reviews: [],
      actions: [],
      overrides: [],
      controller_modes: [],
      observations: [],
      delivery_events: [],
      controller_cursors: [],
      policy_decisions: [],
      credential_provenances: [],
      task_specs: [],
      runtime_preflights: [],
      repo_knowledge: [],
      checkpoints: [],
      handoff_requests: [],
      handoff_claims: [],
      handoff_decisions: [],
      handoff_transfers: [],
      controller_run_metrics: [],
      execution_attempt_metrics: [],
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
