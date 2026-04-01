import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import {
  createActionRecord,
  createCompletionReviewRecord,
  createControllerLease,
  createControllerModeRecord,
  createCredentialProvenanceRecord,
  createDeliveryEventRecord,
  createManagedTask,
  createOverrideRecord,
  createOwnershipLease,
  createPolicyDecisionRecord,
  createPrBinding,
  createTaskSpecRecord,
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
      delivery_events: [],
      policy_decisions: [],
      credential_provenances: [],
      task_specs: [],
      runtime_preflights: [],
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
        '2026-03-29T04:58:00.000Z',
        '2026-03-29T04:59:00.000Z',
        '2026-03-29T05:00:00.000Z',
        '2026-03-29T05:01:00.000Z',
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
    repository.upsertCompletionReview(createCompletionReviewRecord({
      review_id: 'completion-review-pr-101-accepted',
      task_id: 'task-1',
      pr_number: 101,
      branch_name: 'feat/88',
      head_sha: 'abc101',
      status: 'accepted',
      validity_status: 'active',
      requested_at: '2026-03-29T04:54:30.000Z',
      updated_at: '2026-03-29T04:54:30.000Z',
      reviewed_at: '2026-03-29T04:54:30.000Z',
      reviewer_session_name: 'cie-reviewer-1',
      reviewer_session_id: 'cie-reviewer-1',
      implementation_owner_session_name: 'cie-48',
      implementation_owner_session_id: 'cie-48',
      verdict: 'accepted',
      reason_codes: ['completion_review_accepted'],
      findings: [],
      evidence_refs: [{
        source: 'github',
        kind: 'review',
        id: 'rvw-101',
        summary: 'Independent completion review accepted.',
      }],
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
    repository.upsertTaskSpec(createTaskSpecRecord({
      task_id: 'task-1',
      source_kind: 'github_issue',
      source_issue_number: 88,
      created_at: '2026-03-29T04:57:00.000Z',
      updated_at: '2026-03-29T04:57:00.000Z',
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
    }));
    repository.upsertDeliveryEvent(createDeliveryEventRecord({
      event_id: 'delivery-1',
      task_id: 'task-1',
      pr_number: 101,
      source_kind: 'github_poll',
      event_family: 'review_comment',
      event_type: 'review_comment_state',
      dedupe_key: 'github_poll:review_comment:101:review-1',
      lifecycle_trigger: 'bugbot_comments',
      controller_action_hint: 'hold_review',
      observed_at: '2026-03-29T04:58:00.000Z',
      recorded_at: '2026-03-29T04:58:00.000Z',
      lineage: {
        source_observation_id: 'obs-1',
        source_cursor: 'cursor-1',
      },
      payload: {
        head_sha: 'abc123',
        review_id: 'review-1',
      },
    }));
    repository.upsertCredentialProvenance(createCredentialProvenanceRecord({
      provenance_id: 'cred-gh-cli',
      credential_kind: 'github_token',
      source_kind: 'gh_cli_auth',
      scope: 'github.com',
      created_at: '2026-03-29T04:59:00.000Z',
      updated_at: '2026-03-29T04:59:00.000Z',
    }));
    repository.upsertPolicyDecision(createPolicyDecisionRecord({
      decision_id: 'policy-1',
      task_id: 'task-1',
      action_id: 'action-1',
      action_kind: 'notify_human_ready',
      subject_kind: 'action',
      decision: 'allow',
      policy_version: 'ao.policy.v1',
      input_fingerprint: 'fingerprint-1',
      recorded_at: '2026-03-29T05:00:00.000Z',
      summary: 'Allow low-risk GitHub inspection.',
      findings: [],
      input: {
        tools: ['gh'],
      },
      result: {
        decision: 'allow',
      },
    }));

    const snapshot = repository.getSnapshot();
    const auditEntries = repository.listAuditEntries();

    expect(snapshot.bootstrapped).toBe(true);
    expect(snapshot.state).toMatchObject({
      managed_tasks: [expect.objectContaining({ task_id: 'task-1', status: 'active' })],
      pr_bindings: [expect.objectContaining({ binding_id: 'binding-1', pr_number: 101 })],
      ownership_leases: [expect.objectContaining({ lease_id: 'ownership-1', status: 'active' })],
      controller_leases: [expect.objectContaining({ lease_id: 'controller-1', status: 'active' })],
      completion_reviews: [expect.objectContaining({ review_id: 'completion-review-pr-101-accepted', status: 'accepted' })],
      actions: [expect.objectContaining({ action_id: 'action-1', action_kind: 'notify_human_ready' })],
      overrides: [expect.objectContaining({ override_id: 'override-1', override_kind: 'hold_autonomy' })],
      controller_modes: [expect.objectContaining({ controller_id: 'default', mode: 'observe' })],
      delivery_events: [expect.objectContaining({ event_id: 'delivery-1', event_family: 'review_comment' })],
      credential_provenances: [expect.objectContaining({ provenance_id: 'cred-gh-cli', credential_kind: 'github_token' })],
      policy_decisions: [expect.objectContaining({ decision_id: 'policy-1', decision: 'allow' })],
      task_specs: [expect.objectContaining({ task_id: 'task-1', state: 'valid' })],
    });
    expect(auditEntries.map((entry) => `${entry.entity_kind}:${entry.operation}:${entry.entity_id}`)).toEqual([
      'schema:bootstrap:v1',
      'schema:migrate:v2',
      'schema:migrate:v3',
      'schema:migrate:v4',
      'schema:migrate:v5',
      'schema:migrate:v6',
      'schema:migrate:v7',
      'schema:migrate:v8',
      'schema:migrate:v9',
      'schema:migrate:v10',
      'schema:migrate:v11',
      'schema:migrate:v12',
      'managed_task:upsert:task-1',
      'pr_binding:upsert:binding-1',
      'ownership_lease:upsert:ownership-1',
      'controller_lease:upsert:controller-1',
      'action:upsert:action-1',
      'completion_review:upsert:completion-review-pr-101-accepted',
      'override:upsert:override-1',
      'controller_mode:upsert:default',
      'task_spec:upsert:task-1',
      'delivery_event:upsert:delivery-1',
      'credential_provenance:upsert:cred-gh-cli',
      'policy_decision:upsert:policy-1',
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

  it('persists durable action replay and backpressure decisions with lineage updates', () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-04-01T08:00:00.000Z',
        '2026-04-01T08:01:00.000Z',
        '2026-04-01T08:02:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertAction(createActionRecord({
      action_id: 'action-128',
      task_id: 'issue-128',
      action_kind: 'hold_ci',
      status: 'proposed',
      requested_by: 'shadow_controller',
      reason: 'Hold until CI stabilizes.',
      created_at: '2026-04-01T08:00:00.000Z',
      updated_at: '2026-04-01T08:00:00.000Z',
      payload: {
        pr_number: 128,
        derived_trigger: 'ci_failed',
      },
    }));

    repository.recordActionGovernanceDecision({
      actionId: 'action-128',
      now: '2026-04-01T08:01:00.000Z',
      decision: 'replayed',
      backpressureStatus: 'open',
      reasonCodes: ['ci_flapping_same_head'],
      replayKey: 'action:issue-128:128:hold_ci:abc123',
      replayLimit: 2,
      sourceDeliveryEventIds: ['delivery-check-128'],
      sourceObservationIds: ['obs-github-128'],
      sourceCursorIds: ['cursor-github-128'],
      derivedTrigger: 'manual',
      prHeadSha: 'abc123',
      policyDecisionId: 'policy-action-128',
    });
    repository.recordActionGovernanceDecision({
      actionId: 'action-128',
      now: '2026-04-01T08:02:00.000Z',
      decision: 'suppressed',
      backpressureStatus: 'suppressed',
      reasonCodes: ['ci_flapping_same_head', 'replay_budget_exhausted'],
      replayKey: 'action:issue-128:128:hold_ci:abc123',
      replayLimit: 2,
      sourceDeliveryEventIds: ['delivery-check-128'],
      sourceObservationIds: ['obs-github-128'],
      sourceCursorIds: ['cursor-github-128'],
      derivedTrigger: 'manual',
      prHeadSha: 'abc123',
      policyDecisionId: 'policy-action-128',
    });

    const action = repository.getSnapshot().state.actions.find((record) => record.action_id === 'action-128');
    const auditEntries = repository.listAuditEntries().filter((entry) => entry.entity_kind === 'action');

    expect(action).toMatchObject({
      action_id: 'action-128',
      status: 'proposed',
      lineage: {
        source_delivery_event_ids: ['delivery-check-128'],
        source_observation_ids: ['obs-github-128'],
        source_cursor_ids: ['cursor-github-128'],
        derived_trigger: 'manual',
        pr_head_sha: 'abc123',
        policy_decision_id: 'policy-action-128',
      },
      governance: {
        replay_key: 'action:issue-128:128:hold_ci:abc123',
        replay_limit: 2,
        replay_count: 2,
        suppressed_count: 1,
        last_decision: 'suppressed',
        backpressure_status: 'suppressed',
        reason_codes: ['ci_flapping_same_head', 'replay_budget_exhausted'],
      },
    });
    expect(auditEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operation: 'replayed',
        entity_id: 'action-128',
      }),
      expect.objectContaining({
        operation: 'replay_suppressed',
        entity_id: 'action-128',
      }),
    ]));
  });
});
