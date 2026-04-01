import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from '@jest/globals';

import { createCheckpointStore } from '../../scripts/ao/lib/checkpoint-store.js';
import { createHandoffProtocol } from '../../scripts/ao/lib/handoff-protocol.js';
import {
  buildAoMetricsReport,
  persistAoMetricsReport,
} from '../../scripts/ao/lib/run-metrics.js';
import {
  buildAoEvalScorecard,
  persistAoEvalScorecard,
} from '../../scripts/ao/lib/scorecard.js';
import {
  createCompletionReviewRecord,
  createControllerModeRecord,
  createControllerRunMetricRecord,
  createExecutionAttemptMetricRecord,
  createManagedTask,
  createOverrideRecord,
  createPrBinding,
  createReleaseGuardRecord,
  createTaskSpecRecord,
  createWorktreeBinding,
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
        controller_run_metric_count: 0,
        execution_attempt_metric_count: 0,
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
      now: '2026-03-31T10:03:00.000Z',
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
      audit_entry_count: 16,
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
      now: '2026-03-31T10:03:00.000Z',
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
      now: '2026-03-31T10:05:00.000Z',
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

  it('includes measurement summaries and recent traces in the operator-visible AO state report', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-31T12:00:00.000Z',
        '2026-03-31T12:01:00.000Z',
        '2026-03-31T12:02:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-118',
      issue_number: 118,
      title: 'feat(ao): add trace, cost, and failure taxonomy',
      branch_name: 'feat/118',
      worktree_path: '/tmp/cie-59',
      status: 'active',
      created_at: '2026-03-31T12:00:00.000Z',
      updated_at: '2026-03-31T12:00:00.000Z',
    }));
    repository.upsertControllerRunMetric(createControllerRunMetricRecord({
      controller_run_metric_id: 'controller-run-1',
      task_id: 'issue-118',
      issue_number: 118,
      pr_number: 128,
      controller_id: 'default',
      controller_mode: 'assist',
      trigger_kind: 'approved_and_green',
      lifecycle_top_status: 'continue',
      failure_class: 'policy_block',
      started_at: '2026-03-31T12:00:00.000Z',
      completed_at: '2026-03-31T12:00:03.000Z',
      duration_ms: 3000,
      observation_count: 2,
      delivery_event_count: 3,
      proposed_action_count: 2,
      executed_action_count: 1,
      blocked_action_count: 1,
      policy_decision_count: 2,
      policy_blocked_action_count: 1,
      denied_action_count: 1,
      downgraded_action_count: 0,
      action_class_counts: {
        continue_worker: 1,
        notify_human: 1,
      },
      intervention_counts: {
        human_gate: 0,
        override: 0,
        explicit_resume: 0,
        successor_handoff: 0,
        policy_block: 1,
        preflight_block: 0,
      },
      token_usage: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
      },
      cost: {
        usd: null,
      },
    }));
    repository.upsertExecutionAttemptMetric(createExecutionAttemptMetricRecord({
      execution_attempt_metric_id: 'execution-attempt-1',
      attempt_kind: 'managed_task',
      task_id: 'issue-118',
      issue_number: 118,
      pr_number: 128,
      controller_id: null,
      owner_session_name: 'cie-59',
      owner_session_id: 'cie-59',
      action_id: null,
      action_kind: null,
      action_class: null,
      command: 'resume',
      status: 'active',
      retry_cause: 'explicit_resume',
      failure_class: 'none',
      reason: null,
      started_at: '2026-03-31T12:01:00.000Z',
      completed_at: null,
      duration_ms: null,
      intervention_counts: {
        human_gate: 0,
        override: 0,
        explicit_resume: 1,
        successor_handoff: 0,
        policy_block: 0,
        preflight_block: 0,
      },
      token_usage: {
        input_tokens: null,
        output_tokens: null,
        total_tokens: null,
      },
      cost: {
        usd: null,
      },
    }));

    const scorecard = buildAoEvalScorecard({
      projectId: PROJECT_ID,
      generatedAt: '2026-03-31T12:03:00.000Z',
      harnessResult: {
        schema_version: 'ao.eval-harness-run.v1alpha1',
        format: 'ao_eval_harness_run',
        project_id: PROJECT_ID,
        pack_ids: ['parity'],
        scenario_ids: ['issue-118-measurement'],
        scenario_results: [
          {
            scenario_id: 'issue-118-measurement',
            pack_id: 'parity',
            runner: 'state-runner-artifact-fixture',
            title: 'State runner artifact fixture',
            status: 'passed',
            verification: {
              status: 'passed',
              findings: [],
            },
            replay: {
              stable: true,
              fingerprint: 'state-runner-artifact-fixture',
            },
            continuity: {
              kind: 'none',
              status: 'not_applicable',
              outcome: 'none',
            },
            metrics: {
              controller_run_count: 1,
              execution_attempt_count: 1,
              measurement_count: 2,
              intervened_measurement_count: 1,
              intervention_counts: {
                human_gate: 0,
                override: 0,
                explicit_resume: 1,
                successor_handoff: 0,
                policy_block: 0,
                preflight_block: 0,
              },
              failure_class_counts: {
                none: 1,
                ci_failure: 0,
                review_blocked: 0,
                merge_conflict: 0,
                source_failure: 0,
                human_gate: 0,
                override: 0,
                policy_block: 1,
                preflight_block: 0,
                worker_exit: 0,
                successor_handoff: 0,
                unknown: 0,
              },
            },
          },
        ],
      },
    });
    const persistedScorecard = persistAoEvalScorecard({
      repoRoot,
      projectId: PROJECT_ID,
      scorecard,
      baselineName: 'ao/mainline',
      baselineAction: 'bless',
    });
    const persistedMetrics = persistAoMetricsReport({
      repoRoot,
      projectId: PROJECT_ID,
      report: buildAoMetricsReport({
        projectId: PROJECT_ID,
        repoRoot,
        snapshot: repository.getSnapshot(),
        traceLimit: 2,
        generatedAt: '2026-03-31T12:04:00.000Z',
      }),
    });

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
    });

    expect(report.summary).toMatchObject({
      controller_run_metric_count: 1,
      execution_attempt_metric_count: 1,
    });
    expect(report.metrics.summary).toMatchObject({
      controller_run_count: 1,
      execution_attempt_count: 1,
      intervention_counts: expect.objectContaining({
        explicit_resume: 1,
        policy_block: 1,
      }),
      failure_class_counts: expect.objectContaining({
        none: 1,
        policy_block: 1,
      }),
    });
    expect(report.metrics.recent_traces).toMatchObject({
      controller_runs: [
        expect.objectContaining({
          controller_run_metric_id: 'controller-run-1',
          failure_class: 'policy_block',
        }),
      ],
      execution_attempts: [
        expect.objectContaining({
          execution_attempt_metric_id: 'execution-attempt-1',
          retry_cause: 'explicit_resume',
        }),
      ],
    });
    expect(report.artifacts).toMatchObject({
      eval: {
        latest_scorecard: {
          exists: true,
          path: persistedScorecard.scorecard_path.replace(/scorecards\/[^/]+\.json$/, 'latest.json'),
        },
        operator_latest_scorecard: {
          exists: true,
          path: persistedScorecard.operator_scorecard_path.replace(/scorecards\/[^/]+\.json$/, 'latest.json'),
        },
        baseline_root: {
          exists: true,
        },
        operator_baseline_root: {
          exists: true,
        },
      },
      metrics: {
        latest_report: {
          exists: true,
          path: persistedMetrics.latest_report_path,
        },
        operator_latest_report: {
          exists: true,
          path: persistedMetrics.operator_latest_report_path,
        },
        report_root: {
          exists: true,
        },
        operator_report_root: {
          exists: true,
        },
      },
    });
  });

  it('includes durable worktree registry state and continuity counts in the operator-visible AO state report', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-03-31T13:00:00.000Z',
        '2026-03-31T13:01:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-126',
      issue_number: 126,
      title: 'feat(ao): add worktree registry and bounded continuity repair',
      branch_name: 'feat/126',
      worktree_path: '/tmp/cie-66',
      status: 'active',
      created_at: '2026-03-31T13:00:00.000Z',
      updated_at: '2026-03-31T13:00:00.000Z',
    }));
    repository.upsertWorktreeBinding(createWorktreeBinding({
      binding_id: 'worktree-issue-126',
      task_id: 'issue-126',
      branch_name: 'feat/126',
      worktree_path: '/tmp/cie-66',
      owner_session_name: 'cie-66',
      owner_session_id: 'cie-66',
      status: 'active',
      occupancy_status: 'stale',
      cleanliness_status: 'dirty',
      head_status: 'attached',
      continuity_status: 'dirty_worktree_hold',
      reason_codes: ['dirty_worktree'],
      created_at: '2026-03-31T13:00:00.000Z',
      updated_at: '2026-03-31T13:01:00.000Z',
      last_observed_at: '2026-03-31T13:01:00.000Z',
      last_safe_observed_at: '2026-03-31T13:00:00.000Z',
      last_observed: {
        branch_name: 'feat/126',
        worktree_path: '/tmp/cie-66',
        head_sha: 'abc123',
        upstream_branch: 'origin/feat/126',
        worktree_dirty: true,
        staged_changes: true,
        unstaged_changes: false,
      },
      last_safe_observation: {
        branch_name: 'feat/126',
        worktree_path: '/tmp/cie-66',
        head_sha: 'abc123',
        upstream_branch: 'origin/feat/126',
        worktree_dirty: false,
        staged_changes: false,
        unstaged_changes: false,
      },
    }));

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
    });

    expect(report.summary).toMatchObject({
      worktree_binding_count: 1,
      active_worktree_binding_count: 1,
      worktree_continuity_counts: expect.objectContaining({
        dirty_worktree_hold: 1,
      }),
    });
    expect(report.worktrees.bindings).toEqual([
      expect.objectContaining({
        binding_id: 'worktree-issue-126',
        continuity_status: 'dirty_worktree_hold',
        occupancy_status: 'stale',
        cleanliness_status: 'dirty',
      }),
    ]);
  });

  it('surfaces active release guards and their typed status counts in the AO state report', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-04-01T08:00:00.000Z',
        '2026-04-01T08:01:00.000Z',
        '2026-04-01T08:02:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-127',
      issue_number: 127,
      title: 'feat(ao): add typed release guard and PR promotion surface',
      branch_name: 'feat/127',
      worktree_path: '/tmp/cie-69',
      status: 'active',
      created_at: '2026-04-01T08:00:00.000Z',
      updated_at: '2026-04-01T08:00:00.000Z',
    }));
    repository.upsertPrBinding(createPrBinding({
      binding_id: 'binding-issue-127-pr-137',
      task_id: 'issue-127',
      pr_number: 137,
      branch_name: 'feat/127',
      base_branch: 'ao/mainline',
      status: 'bound',
      created_at: '2026-04-01T08:00:00.000Z',
      updated_at: '2026-04-01T08:00:00.000Z',
    }));
    repository.upsertReleaseGuard(createReleaseGuardRecord({
      guard_id: 'release-guard-pr-137-ready',
      pr_number: 137,
      branch_name: 'feat/127',
      head_sha: 'abc123',
      status: 'ready',
      validity_status: 'active',
      recorded_at: '2026-04-01T08:01:00.000Z',
      truth_fingerprint: 'truth-ready',
      basis: ['all_release_signals_clear'],
      blocker_codes: [],
      reason_codes: [],
      gates: {
        ownership: { name: 'ownership', state: 'open', blocker_codes: [], reason_codes: [] },
        review: { name: 'review', state: 'open', blocker_codes: [], reason_codes: [] },
        ci: { name: 'ci', state: 'open', blocker_codes: [], reason_codes: [] },
        mergeability: { name: 'mergeability', state: 'open', blocker_codes: [], reason_codes: [] },
        release: { name: 'release', state: 'open', blocker_codes: [], reason_codes: ['all_release_signals_clear'] },
      },
      truth: {
        pr_state: 'OPEN',
        is_draft: false,
        review_status: 'approved',
        ci_status: 'passing',
        mergeability: 'mergeable',
        ownership_status: 'clear',
        owner_session_name: 'cie-69',
      },
      promotion: {
        disposition: 'notify_human_ready',
        signal: 'notify_human_ready',
        authoritative: true,
        basis: ['ready_for_human_notification'],
      },
    }));
    repository.upsertReleaseGuard(createReleaseGuardRecord({
      guard_id: 'release-guard-pr-137-stale',
      pr_number: 137,
      branch_name: 'feat/127',
      head_sha: 'old111',
      status: 'ready',
      validity_status: 'invalidated',
      recorded_at: '2026-04-01T08:00:30.000Z',
      truth_fingerprint: 'truth-old',
      basis: ['all_release_signals_clear'],
      blocker_codes: [],
      reason_codes: [],
      gates: {
        ownership: { name: 'ownership', state: 'open', blocker_codes: [], reason_codes: [] },
        review: { name: 'review', state: 'open', blocker_codes: [], reason_codes: [] },
        ci: { name: 'ci', state: 'open', blocker_codes: [], reason_codes: [] },
        mergeability: { name: 'mergeability', state: 'open', blocker_codes: [], reason_codes: [] },
        release: { name: 'release', state: 'open', blocker_codes: [], reason_codes: ['all_release_signals_clear'] },
      },
      truth: {
        pr_state: 'OPEN',
        is_draft: false,
        review_status: 'approved',
        ci_status: 'passing',
        mergeability: 'mergeable',
        ownership_status: 'clear',
        owner_session_name: 'cie-69',
      },
      promotion: {
        disposition: 'notify_human_ready',
        signal: 'notify_human_ready',
        authoritative: true,
        basis: ['ready_for_human_notification'],
      },
      invalidated_at: '2026-04-01T08:01:00.000Z',
      invalidation_reason_codes: ['head_sha_changed'],
      superseded_by_guard_id: 'release-guard-pr-137-ready',
    }));

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
      now: '2026-04-01T08:02:00.000Z',
    });

    expect(report.summary).toMatchObject({
      release_guard_count: 2,
      active_release_guard_count: 1,
      active_release_guard_status_counts: {
        ready: 1,
        waiting: 0,
        blocked: 0,
        ambiguous: 0,
        not_applicable: 0,
      },
    });
    expect(report.release.current_guards).toEqual([
      expect.objectContaining({
        guard_id: 'release-guard-pr-137-ready',
        pr_number: 137,
        head_sha: 'abc123',
        status: 'ready',
        validity_status: 'active',
        promotion: expect.objectContaining({
          signal: 'notify_human_ready',
        }),
      }),
    ]);
    expect(report.release.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        guard_id: 'release-guard-pr-137-stale',
        validity_status: 'invalidated',
        invalidation_reason_codes: ['head_sha_changed'],
      }),
    ]));
  });

  it('surfaces current completion-review posture and evidence in the AO state report', async () => {
    const repoRoot = createTempRepo();
    const repository = createStateRepository({
      repoRoot,
      projectId: PROJECT_ID,
      clock: createClock(
        '2026-04-01T09:00:00.000Z',
        '2026-04-01T09:01:00.000Z',
        '2026-04-01T09:02:00.000Z',
      ),
      auditIdGenerator: createIdGenerator('audit'),
    });

    repository.upsertManagedTask(createManagedTask({
      task_id: 'issue-131',
      issue_number: 131,
      title: 'feat(ao): add completion review protocol and independent reviewer gate',
      branch_name: 'feat/131',
      worktree_path: '/tmp/cie-70-ao131',
      status: 'active',
      created_at: '2026-04-01T09:00:00.000Z',
      updated_at: '2026-04-01T09:00:00.000Z',
    }));
    repository.upsertPrBinding(createPrBinding({
      binding_id: 'binding-issue-131-pr-141',
      task_id: 'issue-131',
      pr_number: 141,
      branch_name: 'feat/131',
      base_branch: 'ao/mainline',
      status: 'bound',
      created_at: '2026-04-01T09:00:00.000Z',
      updated_at: '2026-04-01T09:00:00.000Z',
    }));
    repository.upsertReleaseGuard(createReleaseGuardRecord({
      guard_id: 'release-guard-pr-141-ready',
      pr_number: 141,
      branch_name: 'feat/131',
      head_sha: 'abc131',
      status: 'ready',
      validity_status: 'active',
      recorded_at: '2026-04-01T09:01:00.000Z',
      truth_fingerprint: 'truth-ready-131',
      basis: ['all_release_signals_clear'],
      blocker_codes: [],
      reason_codes: ['all_release_signals_clear'],
      gates: {
        ownership: { name: 'ownership', state: 'open', blocker_codes: [], reason_codes: [] },
        review: { name: 'review', state: 'open', blocker_codes: [], reason_codes: [] },
        ci: { name: 'ci', state: 'open', blocker_codes: [], reason_codes: [] },
        mergeability: { name: 'mergeability', state: 'open', blocker_codes: [], reason_codes: [] },
        release: { name: 'release', state: 'open', blocker_codes: [], reason_codes: ['all_release_signals_clear'] },
      },
      truth: {
        pr_state: 'OPEN',
        is_draft: false,
        review_status: 'approved',
        ci_status: 'passing',
        mergeability: 'mergeable',
        ownership_status: 'clear',
        owner_session_name: 'cie-70',
      },
      promotion: {
        disposition: 'notify_human_ready',
        signal: 'notify_human_ready',
        authoritative: true,
        basis: ['ready_for_human_notification'],
      },
    }));
    repository.upsertCompletionReview(createCompletionReviewRecord({
      review_id: 'completion-review-pr-141-accepted',
      task_id: 'issue-131',
      pr_number: 141,
      branch_name: 'feat/131',
      head_sha: 'abc131',
      status: 'accepted',
      validity_status: 'active',
      requested_at: '2026-04-01T09:00:00.000Z',
      updated_at: '2026-04-01T09:01:00.000Z',
      reviewed_at: '2026-04-01T09:01:00.000Z',
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
    }));
    repository.upsertCompletionReview(createCompletionReviewRecord({
      review_id: 'completion-review-pr-141-stale',
      task_id: 'issue-131',
      pr_number: 141,
      branch_name: 'feat/131',
      head_sha: 'old131',
      status: 'accepted',
      validity_status: 'invalidated',
      requested_at: '2026-04-01T08:45:00.000Z',
      updated_at: '2026-04-01T08:50:00.000Z',
      reviewed_at: '2026-04-01T08:50:00.000Z',
      reviewer_session_name: 'cie-reviewer-0',
      reviewer_session_id: 'cie-reviewer-0',
      implementation_owner_session_name: 'cie-70',
      implementation_owner_session_id: 'cie-70',
      verdict: 'accepted',
      reason_codes: ['completion_review_accepted'],
      findings: [],
      evidence_refs: [{
        source: 'github',
        kind: 'review',
        id: 'rvw-140',
        summary: 'Old completion review before new commits.',
      }],
      invalidated_at: '2026-04-01T09:01:00.000Z',
      invalidation_reason_codes: ['head_sha_changed'],
      superseded_by_review_id: 'completion-review-pr-141-accepted',
    }));

    const report = await loadAoStateReport({
      repoRoot,
      projectId: PROJECT_ID,
      auditLimit: 2,
      now: '2026-04-01T09:02:00.000Z',
    });

    expect(report.summary).toMatchObject({
      completion_review_count: 2,
      active_completion_review_count: 1,
      current_completion_review_status_counts: {
        accepted: 1,
        waived: 0,
        rejected: 0,
        requested: 0,
        in_review: 0,
        expired: 0,
        missing_review: 0,
        self_review: 0,
      },
    });
    expect(report.completion_reviews.inspections).toEqual([
      expect.objectContaining({
        pr_number: 141,
        task_id: 'issue-131',
        head_sha: 'abc131',
        status: 'accepted',
        satisfied: true,
        review_id: 'completion-review-pr-141-accepted',
        reviewer_session_name: 'cie-reviewer-1',
        evidence_refs: [
          expect.objectContaining({
            source: 'github',
            kind: 'review',
            id: 'rvw-141',
          }),
        ],
      }),
    ]);
    expect(report.completion_reviews.records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        review_id: 'completion-review-pr-141-stale',
        validity_status: 'invalidated',
        invalidation_reason_codes: ['head_sha_changed'],
      }),
    ]));
  });
});
