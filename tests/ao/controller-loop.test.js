import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  createCompletionReviewRecord,
  createControllerLease,
  createControllerModeRecord,
  createManagedTask,
  createPrBinding,
  createRuntimePreflightRecord,
  createTaskSpecRecord,
  createWorktreeBinding,
} from '../../scripts/ao/lib/state-contracts.js';
import { runControllerLoop } from '../../scripts/ao/lib/controller-loop.js';
import { runRuntimeBootstrapPreflight } from '../../scripts/ao/lib/runtime-preflight.js';
import { createStateRepository } from '../../scripts/ao/lib/state-repository.js';

const PROJECT_ID = 'ciecopilot-home';
const tempDirs = [];

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-controller-loop-'));
  tempDirs.push(repoRoot);
  return repoRoot;
}

function seedActiveTask(repository, mode) {
  repository.upsertManagedTask(createManagedTask({
    task_id: 'issue-92',
    issue_number: 92,
    title: 'CI failed parity scenario',
    branch_name: 'feat/issue-92',
    worktree_path: '/tmp/cie-92',
    status: 'active',
    created_at: '2026-03-29T06:40:00.000Z',
    updated_at: '2026-03-29T06:40:00.000Z',
  }));
  repository.upsertPrBinding(createPrBinding({
    binding_id: 'binding-issue-92-pr-92',
    task_id: 'issue-92',
    pr_number: 92,
    branch_name: 'feat/issue-92',
    base_branch: 'main',
    status: 'bound',
    created_at: '2026-03-29T06:40:00.000Z',
    updated_at: '2026-03-29T06:40:00.000Z',
  }));
  repository.upsertControllerMode(createControllerModeRecord({
    controller_id: 'default',
    mode,
    updated_at: '2026-03-29T06:40:00.000Z',
    updated_by: 'operator',
    reason: 'Issue #89 test setup',
  }));
}

function seedCleanRuntimePreflight(repository, {
  taskId = 'issue-92',
  issueNumber = 92,
  runtimeRef = 'runtime.github_local',
} = {}) {
  repository.upsertTaskSpec(createTaskSpecRecord({
    task_id: taskId,
    source_kind: 'github_issue',
    source_issue_number: issueNumber,
    created_at: '2026-03-29T06:40:00.000Z',
    updated_at: '2026-03-29T06:40:00.000Z',
    snapshot: {
      schema_version: 'ao.task-spec.v1alpha1',
      spec: {
        problem_type: 'issue_delivery',
        acceptance_contract: ['Assist only executes after clean runtime preflight.'],
        runtime_ref: runtimeRef,
        policy_ref: 'policy.operator_gated',
        human_gates: ['operator_review'],
      },
    },
  }));

  repository.upsertRuntimePreflight(createRuntimePreflightRecord({
    recorded_at: '2026-03-29T06:40:00.000Z',
    snapshot: runRuntimeBootstrapPreflight({
      runtimeRef,
      cwd: repository.getSnapshot().paths.repoRoot,
      now: '2026-03-29T06:40:00.000Z',
      probes: {
        commandExists: () => true,
        pathExists: () => true,
        capability: () => true,
      },
    }),
  }));
}

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('ao controller loop', () => {
  it('observe mode persists observations without proposing actions', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'observe');
    seedCleanRuntimePreflight(repository);
    const resolveLifecycleReport = jest.fn();

    const result = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        ensureRuntimePreflights: ({ repository: activeRepository, cwd, now }) => activeRepository.ensureRuntimePreflights({
          cwd,
          now,
          probes: {
            commandExists: () => true,
            pathExists: () => true,
            capability: () => true,
          },
        }),
        loadAoProjectObservation: async () => ({
          project_id: PROJECT_ID,
          observed_at: '2026-03-29T06:41:00.000Z',
          source_ok: true,
          source_error: null,
          orchestrator: null,
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
          raw_summary: {
            session_count: 1,
            orchestrator_count: 0,
            orchestrator_session_names: [],
            worker_count: 1,
            branch_count: 1,
            pr_count: 1,
          },
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          source_ok: true,
          source_error: null,
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'pending',
              ci_status: 'pending',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        resolveLifecycleReport,
      },
    });

    expect(resolveLifecycleReport).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      mode: 'observe',
      processed_task_count: 1,
      ingested_observation_count: 2,
      proposed_action_count: 0,
      task_results: [
        expect.objectContaining({
          task_id: 'issue-92',
          derived_trigger: 'manual',
          new_observation_count: 2,
          proposed_action_count: 0,
        }),
      ],
    });

    const snapshot = repository.getSnapshot().state;
    expect(snapshot.observations).toHaveLength(2);
    expect(snapshot.actions).toEqual([]);
    expect(snapshot.controller_run_metrics).toEqual([
      expect.objectContaining({
        task_id: 'issue-92',
        controller_id: 'default',
        controller_mode: 'observe',
        trigger_kind: 'manual',
        failure_class: 'none',
        lifecycle_top_status: null,
        observation_count: 2,
        delivery_event_count: 3,
        proposed_action_count: 0,
        executed_action_count: 0,
        blocked_action_count: 0,
        intervention_counts: expect.objectContaining({
          human_gate: 0,
          override: 0,
          explicit_resume: 0,
          successor_handoff: 0,
          policy_block: 0,
          preflight_block: 0,
        }),
        token_usage: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null,
        },
        cost: {
          usd: null,
        },
      }),
    ]);
    expect(snapshot.checkpoints).toEqual([
      expect.objectContaining({
        task_id: 'issue-92',
        snapshot: expect.objectContaining({
          schema_version: 'ao.checkpoint.v1alpha1',
          verification_ref: expect.objectContaining({
            task_spec: expect.objectContaining({
              task_id: 'issue-92',
              state: 'valid',
            }),
            runtime_preflight: expect.objectContaining({
              runtime_ref: 'runtime.github_local',
              status: 'clean',
            }),
          }),
          execution_ref: expect.objectContaining({
            controller_id: 'default',
            controller_mode: 'observe',
            derived_trigger: 'manual',
          }),
        }),
      }),
    ]);
    expect(snapshot.controller_leases).toEqual([
      expect.objectContaining({
        controller_id: 'default',
        status: 'released',
      }),
    ]);
  });

  it('shadow mode records proposed lifecycle actions without executing them', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');

    const lifecycleReport = {
      top_status: 'hold',
      routing_decision: {
        action: 'continue_current_worker',
      },
      release_decision: {
        disposition: 'await_ci',
      },
      actions: [
        {
          id: 'continue_worker',
          action_class: 'continue_worker',
          summary: 'Continue the current worker owner.',
          commands: ['ao status -p ciecopilot-home --json'],
          rationale: 'Ownership continuity is clear enough to continue the current worker.',
        },
        {
          id: 'hold_ci',
          action_class: 'hold',
          summary: 'Hold until CI is green.',
          commands: ['gh pr checks 92'],
          rationale: 'Required CI state is not yet ready.',
        },
      ],
    };

    const result = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'pending',
              ci_status: 'failing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        resolveLifecycleReport: async ({ derivedTrigger }) => {
          expect(derivedTrigger).toBe('ci_failed');
          return lifecycleReport;
        },
      },
    });

    expect(result).toMatchObject({
      mode: 'shadow',
      processed_task_count: 1,
      ingested_observation_count: 2,
      delivery_event_count: 3,
      proposed_action_count: 2,
      task_results: [
        expect.objectContaining({
          task_id: 'issue-92',
          derived_trigger: 'ci_failed',
          new_delivery_event_count: 3,
          proposed_action_count: 2,
          lifecycle_top_status: 'hold',
        }),
      ],
    });

    const snapshot = repository.getSnapshot().state;
    expect(snapshot.delivery_events.map((record) => record.event_family)).toEqual(expect.arrayContaining([
      'check',
      'pr',
      'review',
    ]));
    expect(snapshot.controller_run_metrics).toEqual([
      expect.objectContaining({
        task_id: 'issue-92',
        trigger_kind: 'ci_failed',
        failure_class: 'ci_failure',
        action_class_counts: expect.objectContaining({
          continue_worker: 1,
          hold: 1,
        }),
      }),
    ]);
    expect(snapshot.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        task_id: 'issue-92',
        action_kind: 'continue_worker',
        status: 'proposed',
        requested_by: 'shadow_controller',
        payload: expect.objectContaining({
          action_class: 'continue_worker',
          commands: ['ao status -p ciecopilot-home --json'],
        }),
      }),
      expect.objectContaining({
        task_id: 'issue-92',
        action_kind: 'hold_ci',
        status: 'proposed',
        requested_by: 'shadow_controller',
        payload: expect.objectContaining({
          action_class: 'hold',
          commands: ['gh pr checks 92'],
        }),
      }),
    ]));
    expect(repository.listAuditEntries().filter((entry) => entry.entity_kind === 'action')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: 'proposed',
          actor: 'shadow_controller',
        }),
      ]),
    );
  });

  it('persists an active release guard snapshot for a ready PR without granting merge authority', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');
    seedCleanRuntimePreflight(repository);

    await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'approved',
              ci_status: 'passing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        resolveLifecycleReport: async () => ({
          reconciliationReport: {
            pr_assessments: [{
              pr_number: 92,
              release_guard: {
                pr_number: 92,
                branch_name: 'feat/issue-92',
                head_sha: 'abc123',
                status: 'ready',
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
                  owner_session_name: 'cie-92',
                },
              },
            }],
          },
          lifecycleReport: {
            top_status: 'continue',
            routing_decision: {
              action: 'continue_current_worker',
              owner_session: 'cie-92',
              authoritative: true,
            },
            release_decision: {
              disposition: 'notify_human_ready',
              basis: ['ready_for_human_notification'],
              authoritative: true,
            },
            actions: [],
          },
          doctorReport: null,
        }),
      },
    });

    expect(repository.getSnapshot().state.release_guards).toEqual([
      expect.objectContaining({
        pr_number: 92,
        head_sha: 'abc123',
        status: 'ready',
        validity_status: 'active',
        promotion: expect.objectContaining({
          signal: 'notify_human_ready',
          disposition: 'notify_human_ready',
          authoritative: true,
        }),
        blocker_codes: [],
        basis: ['all_release_signals_clear'],
      }),
    ]);
  });

  it('invalidates stale ready release guards when the PR head sha changes', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');
    seedCleanRuntimePreflight(repository);
    const githubStates = [
      {
        observed_at: '2026-03-29T06:41:00.000Z',
        source_ok: true,
        source_error: null,
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'abc123',
            review_status: 'approved',
            ci_status: 'passing',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
      {
        observed_at: '2026-03-29T06:46:00.000Z',
        source_ok: true,
        source_error: null,
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'def456',
            review_status: 'approved',
            ci_status: 'pending',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
    ];

    const loadGitHubObservationSet = jest.fn(async () => githubStates.shift());
    const lifecycleStates = [
      {
        reconciliationReport: {
          pr_assessments: [{
            pr_number: 92,
            release_guard: {
              pr_number: 92,
              branch_name: 'feat/issue-92',
              head_sha: 'abc123',
              status: 'ready',
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
                owner_session_name: 'cie-92',
              },
            },
          }],
        },
        lifecycleReport: {
          top_status: 'continue',
          routing_decision: {
            action: 'continue_current_worker',
            owner_session: 'cie-92',
            authoritative: true,
          },
          release_decision: {
            disposition: 'notify_human_ready',
            basis: ['ready_for_human_notification'],
            authoritative: true,
          },
          actions: [],
        },
        doctorReport: null,
      },
      {
        reconciliationReport: {
          pr_assessments: [{
            pr_number: 92,
            release_guard: {
              pr_number: 92,
              branch_name: 'feat/issue-92',
              head_sha: 'def456',
              status: 'waiting',
              basis: ['ci_pending'],
              blocker_codes: [],
              reason_codes: ['ci_pending'],
              gates: {
                ownership: { name: 'ownership', state: 'open', blocker_codes: [], reason_codes: [] },
                review: { name: 'review', state: 'open', blocker_codes: [], reason_codes: [] },
                ci: { name: 'ci', state: 'pending', blocker_codes: [], reason_codes: ['ci_pending'] },
                mergeability: { name: 'mergeability', state: 'open', blocker_codes: [], reason_codes: [] },
                release: { name: 'release', state: 'pending', blocker_codes: [], reason_codes: ['ci_pending'] },
              },
              truth: {
                pr_state: 'OPEN',
                is_draft: false,
                review_status: 'approved',
                ci_status: 'pending',
                mergeability: 'mergeable',
                ownership_status: 'clear',
                owner_session_name: 'cie-92',
              },
            },
          }],
        },
        lifecycleReport: {
          top_status: 'hold',
          routing_decision: {
            action: 'continue_current_worker',
            owner_session: 'cie-92',
            authoritative: true,
          },
          release_decision: {
            disposition: 'await_ci',
            basis: ['ci_pending'],
            authoritative: true,
          },
          actions: [],
        },
        doctorReport: null,
      },
    ];
    const resolveLifecycleReport = jest.fn(async () => lifecycleStates.shift());

    const commonDeps = {
      loadAoProjectObservation: async () => ({
        project_id: PROJECT_ID,
        observed_at: '2026-03-29T06:41:00.000Z',
        source_ok: true,
        source_error: null,
        orchestrator: null,
        workers: [
          {
            session_name: 'cie-92',
            session_runtime_id: 'cie-92',
            issue_number: 92,
            branch_name: 'feat/issue-92',
            pr_number: 92,
            lifecycle_state: 'idle',
            last_seen_at: '2026-03-29T06:40:45.000Z',
            freshness: { status: 'fresh' },
          },
        ],
        raw_summary: {
          session_count: 1,
          orchestrator_count: 0,
          orchestrator_session_names: [],
          worker_count: 1,
          branch_count: 1,
          pr_count: 1,
        },
      }),
      loadGitHubObservationSet,
      resolveLifecycleReport,
    };

    await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: commonDeps,
    });
    await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:46:00.000Z',
      deps: commonDeps,
    });

    expect(repository.getSnapshot().state.release_guards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        pr_number: 92,
        head_sha: 'abc123',
        status: 'ready',
        validity_status: 'invalidated',
        invalidation_reason_codes: expect.arrayContaining(['head_sha_changed']),
      }),
      expect.objectContaining({
        pr_number: 92,
        head_sha: 'def456',
        status: 'waiting',
        validity_status: 'active',
        promotion: expect.objectContaining({
          signal: null,
          disposition: 'await_ci',
        }),
      }),
    ]));
  });

  it('invalidates stale accepted completion reviews when the PR head sha changes', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');
    seedCleanRuntimePreflight(repository);
    repository.upsertCompletionReview(createCompletionReviewRecord({
      review_id: 'completion-review-pr-92-accepted',
      task_id: 'issue-92',
      pr_number: 92,
      branch_name: 'feat/issue-92',
      head_sha: 'abc123',
      status: 'accepted',
      validity_status: 'active',
      requested_at: '2026-03-29T06:40:00.000Z',
      updated_at: '2026-03-29T06:41:00.000Z',
      reviewed_at: '2026-03-29T06:41:00.000Z',
      reviewer_session_name: 'cie-reviewer-1',
      reviewer_session_id: 'cie-reviewer-1',
      implementation_owner_session_name: 'cie-92',
      implementation_owner_session_id: 'cie-92',
      verdict: 'accepted',
      reason_codes: ['completion_review_accepted'],
      findings: [],
      evidence_refs: [{
        source: 'github',
        kind: 'review',
        id: 'rvw-92',
        summary: 'Independent reviewer accepted the completion review.',
      }],
    }));

    const githubStates = [
      {
        observed_at: '2026-03-29T06:41:00.000Z',
        source_ok: true,
        source_error: null,
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'abc123',
            review_status: 'approved',
            ci_status: 'passing',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
      {
        observed_at: '2026-03-29T06:46:00.000Z',
        source_ok: true,
        source_error: null,
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'def456',
            review_status: 'approved',
            ci_status: 'passing',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
    ];
    const loadGitHubObservationSet = jest.fn(async () => githubStates.shift());
    const lifecycleStates = [
      {
        reconciliationReport: {
          pr_assessments: [{
            pr_number: 92,
            release_guard: {
              pr_number: 92,
              branch_name: 'feat/issue-92',
              head_sha: 'abc123',
              status: 'ready',
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
                owner_session_name: 'cie-92',
              },
            },
          }],
        },
        lifecycleReport: {
          top_status: 'continue',
          routing_decision: {
            action: 'continue_current_worker',
            owner_session: 'cie-92',
            authoritative: true,
          },
          release_decision: {
            disposition: 'notify_human_ready',
            basis: ['ready_for_human_notification'],
            authoritative: true,
          },
          completion_review: {
            status: 'accepted',
            satisfied: true,
            review_id: 'completion-review-pr-92-accepted',
            head_sha: 'abc123',
            reason_codes: ['completion_review_accepted'],
          },
          actions: [],
        },
        doctorReport: null,
      },
      {
        reconciliationReport: {
          pr_assessments: [{
            pr_number: 92,
            release_guard: {
              pr_number: 92,
              branch_name: 'feat/issue-92',
              head_sha: 'def456',
              status: 'ready',
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
                owner_session_name: 'cie-92',
              },
            },
          }],
        },
        lifecycleReport: {
          top_status: 'hold',
          routing_decision: {
            action: 'continue_current_worker',
            owner_session: 'cie-92',
            authoritative: true,
          },
          release_decision: {
            disposition: 'await_review',
            basis: ['completion_review_missing'],
            authoritative: true,
          },
          completion_review: {
            status: 'missing_review',
            satisfied: false,
            review_id: null,
            head_sha: 'def456',
            reason_codes: ['completion_review_missing'],
          },
          actions: [],
        },
        doctorReport: null,
      },
    ];
    const resolveLifecycleReport = jest.fn(async () => lifecycleStates.shift());

    const commonDeps = {
      loadAoProjectObservation: async () => ({
        project_id: PROJECT_ID,
        observed_at: '2026-03-29T06:41:00.000Z',
        source_ok: true,
        source_error: null,
        orchestrator: null,
        workers: [
          {
            session_name: 'cie-92',
            session_runtime_id: 'cie-92',
            issue_number: 92,
            branch_name: 'feat/issue-92',
            pr_number: 92,
            lifecycle_state: 'idle',
            last_seen_at: '2026-03-29T06:40:45.000Z',
            freshness: { status: 'fresh' },
          },
        ],
        raw_summary: {
          session_count: 1,
          orchestrator_count: 0,
          orchestrator_session_names: [],
          worker_count: 1,
          branch_count: 1,
          pr_count: 1,
        },
      }),
      loadGitHubObservationSet,
      resolveLifecycleReport,
    };

    await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: commonDeps,
    });
    await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:46:00.000Z',
      deps: commonDeps,
    });

    expect(repository.getSnapshot().state.completion_reviews).toEqual(expect.arrayContaining([
      expect.objectContaining({
        review_id: 'completion-review-pr-92-accepted',
        head_sha: 'abc123',
        status: 'accepted',
        validity_status: 'invalidated',
        invalidation_reason_codes: ['head_sha_changed'],
      }),
    ]));
    expect(repository.getSnapshot().state.release_guards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        pr_number: 92,
        head_sha: 'def456',
        status: 'waiting',
        validity_status: 'active',
        basis: expect.arrayContaining(['completion_review_missing']),
        promotion: expect.objectContaining({
          signal: null,
          disposition: 'await_review',
        }),
      }),
    ]));
  });

  it('passes the control-plane snapshot into doctor resolution for lifecycle handoff analysis', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');
    seedCleanRuntimePreflight(repository);
    const buildDoctorReport = jest.fn(() => ({
      top_status: 'healthy',
      source_health: {
        reconciliation: 'ok',
        ao: 'ok',
        github: 'ok',
        git: 'ok',
        worktree: 'ok',
      },
      reconciliation_summary: {
        top_status: 'healthy',
        selected_pr_numbers: [92],
      },
      local_state: {
        current_branch: 'feat/issue-92',
        upstream_branch: 'origin/feat/issue-92',
        worktree_dirty: false,
        ao_artifact_paths: [],
      },
      findings: [],
      suggestions: [],
    }));
    const buildLifecycleReport = jest.fn(() => ({
      top_status: 'continue',
      routing_decision: {
        action: 'continue_current_worker',
      },
      release_decision: {
        disposition: 'continue_current_worker',
      },
      actions: [],
    }));

    await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'pending',
              ci_status: 'pending',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        reconcileObservations: () => ({
          top_status: 'healthy',
          source_health: { ao: 'ok', github: 'ok' },
          scope: { selected_pr_numbers: [92] },
          pr_assessments: [],
          findings: [],
        }),
        loadDoctorLocalState: async () => ({
          git_observable: true,
          repo_root: repository.getSnapshot().paths.repoRoot,
          head_sha: 'abc123',
          current_branch: 'feat/issue-92',
          upstream_branch: 'origin/feat/issue-92',
          upstream_tracking: 'present',
          worktree_dirty: false,
          staged_changes: false,
          unstaged_changes: false,
          untracked_file_count: 0,
          untracked_file_samples: [],
          ao_artifact_paths: [],
        }),
        buildDoctorReport,
        buildLifecycleReport,
      },
    });

    expect(buildDoctorReport).toHaveBeenCalledWith(expect.objectContaining({
      controlPlaneSnapshot: expect.objectContaining({
        bootstrapped: true,
        state: expect.objectContaining({
          handoff_requests: expect.any(Array),
        }),
      }),
    }));
  });

  it('persists doctor-derived worktree safety facts into the durable registry and task result', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');
    seedCleanRuntimePreflight(repository);
    repository.upsertWorktreeBinding(createWorktreeBinding({
      binding_id: 'worktree-issue-92',
      task_id: 'issue-92',
      branch_name: 'feat/issue-92',
      worktree_path: '/tmp/cie-92',
      owner_session_name: 'cie-92',
      owner_session_id: 'cie-92',
      status: 'active',
      occupancy_status: 'occupied',
      cleanliness_status: 'clean',
      head_status: 'attached',
      continuity_status: 'safe_resume',
      reason_codes: ['binding_matches_local_state'],
      created_at: '2026-03-29T06:40:00.000Z',
      updated_at: '2026-03-29T06:40:00.000Z',
      last_observed_at: '2026-03-29T06:40:00.000Z',
      last_safe_observed_at: '2026-03-29T06:40:00.000Z',
      last_observed: {
        branch_name: 'feat/issue-92',
        worktree_path: '/tmp/cie-92',
        head_sha: 'abc123',
        upstream_branch: 'origin/feat/issue-92',
        worktree_dirty: false,
        staged_changes: false,
        unstaged_changes: false,
      },
      last_safe_observation: {
        branch_name: 'feat/issue-92',
        worktree_path: '/tmp/cie-92',
        head_sha: 'abc123',
        upstream_branch: 'origin/feat/issue-92',
        worktree_dirty: false,
        staged_changes: false,
        unstaged_changes: false,
      },
    }));

    const result = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'pending',
              ci_status: 'pending',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        reconcileObservations: () => ({
          top_status: 'healthy',
          source_health: { ao: 'ok', github: 'ok' },
          scope: { selected_pr_numbers: [92] },
          pr_assessments: [{
            pr_number: 92,
            branch_name: 'feat/issue-92',
            ownership: {
              status: 'clear',
              owner_session: 'cie-92',
            },
            release_readiness: { status: 'pending' },
          }],
          findings: [],
        }),
        loadDoctorLocalState: async () => ({
          git_observable: true,
          repo_root: repository.getSnapshot().paths.repoRoot,
          worktree_path: repository.getSnapshot().paths.repoRoot,
          head_sha: 'abc123',
          current_branch: 'feat/issue-92',
          upstream_branch: 'origin/feat/issue-92',
          upstream_tracking: 'present',
          detached_head: false,
          worktree_dirty: true,
          staged_changes: true,
          unstaged_changes: false,
          untracked_file_count: 0,
          untracked_file_samples: [],
          ao_artifact_paths: [],
        }),
        buildDoctorReport: () => ({
          top_status: 'blocked',
          source_health: {
            reconciliation: 'ok',
            ao: 'ok',
            github: 'ok',
            git: 'ok',
            worktree: 'ok',
          },
          reconciliation_summary: {
            top_status: 'healthy',
            selected_pr_numbers: [92],
          },
          local_state: {
            current_branch: 'feat/issue-92',
            worktree_path: repository.getSnapshot().paths.repoRoot,
            worktree_dirty: true,
          },
          worktree_safety: {
            task_id: 'issue-92',
            binding_id: 'worktree-issue-92',
            continuity_status: 'dirty_worktree_hold',
            occupancy_status: 'occupied',
            cleanliness_status: 'dirty',
            head_status: 'attached',
            owner_session_name: 'cie-92',
            expected_branch_name: 'feat/issue-92',
            expected_worktree_path: '/tmp/cie-92',
            observed_branch_name: 'feat/issue-92',
            observed_worktree_path: repository.getSnapshot().paths.repoRoot,
            reason_codes: ['dirty_worktree'],
            conflicting_binding_ids: [],
            last_observed_at: '2026-03-29T06:41:00.000Z',
            last_safe_observed_at: '2026-03-29T06:40:00.000Z',
            last_observed: {
              branch_name: 'feat/issue-92',
              worktree_path: repository.getSnapshot().paths.repoRoot,
              head_sha: 'abc123',
              upstream_branch: 'origin/feat/issue-92',
              worktree_dirty: true,
              staged_changes: true,
              unstaged_changes: false,
            },
            last_safe_observation: {
              branch_name: 'feat/issue-92',
              worktree_path: '/tmp/cie-92',
              head_sha: 'abc123',
              upstream_branch: 'origin/feat/issue-92',
              worktree_dirty: false,
              staged_changes: false,
              unstaged_changes: false,
            },
          },
          findings: [
            {
              code: 'dirty_worktree_hold',
              severity: 'blocker',
              origin: 'doctor',
              source_area: 'worktree',
              subject_type: 'worktree',
              subject_id: 'issue-92',
              summary: 'Dirty worktree blocks continuity repair.',
              details: ['dirty_worktree'],
              evidence_refs: [],
              suggestion_ids: ['git_status'],
            },
          ],
          suggestions: [],
        }),
        buildLifecycleReport: () => ({
          top_status: 'hold',
          routing_decision: {
            action: 'hold_for_human',
          },
          release_decision: {
            disposition: 'human_gate',
          },
          actions: [],
        }),
      },
    });

    expect(result.task_results).toEqual([
      expect.objectContaining({
        task_id: 'issue-92',
        worktree_continuity_status: 'dirty_worktree_hold',
      }),
    ]);
    expect(repository.getSnapshot().state.worktree_bindings).toEqual([
      expect.objectContaining({
        binding_id: 'worktree-issue-92',
        continuity_status: 'dirty_worktree_hold',
        cleanliness_status: 'dirty',
      }),
    ]);
  });

  it('derives bugbot comment follow-up from protocolized review-comment delivery events', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');

    const result = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-30T08:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-30T08:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-30T08:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-30T08:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'approved',
              ci_status: 'passing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
              reviews: [
                {
                  review_id: 'review-comment-1',
                  state: 'commented',
                  author_login: 'chatgpt-codex-connector',
                  submitted_at: '2026-03-30T08:40:50.000Z',
                  commit_oid: 'abc123',
                },
              ],
            },
          ],
        }),
        resolveLifecycleReport: async ({ derivedTrigger }) => {
          expect(derivedTrigger).toBe('bugbot_comments');
          return {
            top_status: 'hold',
            routing_decision: {
              action: 'continue_current_worker',
            },
            release_decision: {
              disposition: 'await_review',
            },
            actions: [
              {
                id: 'hold_review',
                action_class: 'hold',
                summary: 'Hold until review is resolved.',
                commands: ['gh pr view 92 --json reviewDecision,url'],
                rationale: 'Automated review comments remain unresolved for this head SHA.',
              },
            ],
          };
        },
      },
    });

    expect(result).toMatchObject({
      delivery_event_count: 4,
      task_results: [
        expect.objectContaining({
          derived_trigger: 'bugbot_comments',
          new_delivery_event_count: 4,
        }),
      ],
    });
    expect(repository.getSnapshot().state.delivery_events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event_family: 'review_comment',
        lifecycle_trigger: 'bugbot_comments',
        payload: expect.objectContaining({
          review_id: 'review-comment-1',
          commit_oid: 'abc123',
        }),
      }),
    ]));
  });

  it('ignores superseded failing delivery events once a later approved-and-green state is observed on the same head', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'observe');

    const firstResult = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-30T09:00:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-30T09:00:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-30T08:59:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-30T09:00:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'changes_requested',
              ci_status: 'failing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
      },
    });

    const secondResult = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-30T09:05:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-30T09:05:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-30T09:04:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-30T09:05:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'approved',
              ci_status: 'passing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
      },
    });

    expect(firstResult.task_results[0]).toMatchObject({
      derived_trigger: 'changes_requested',
      new_delivery_event_count: 3,
    });
    expect(secondResult.task_results[0]).toMatchObject({
      derived_trigger: 'approved_and_green',
      new_delivery_event_count: 3,
    });
  });

  it('produces deterministic delivery envelopes and routing decisions for the same seeded state', async () => {
    const createRepositoryAndRun = async () => {
      const repository = createStateRepository({
        repoRoot: createTempRepo(),
        projectId: PROJECT_ID,
      });
      seedActiveTask(repository, 'shadow');

      const result = await runControllerLoop({
        repoRoot: repository.getSnapshot().paths.repoRoot,
        cwd: repository.getSnapshot().paths.repoRoot,
        projectId: PROJECT_ID,
        controllerId: 'default',
        now: '2026-03-30T08:45:00.000Z',
        deps: {
          loadAoProjectObservation: async () => ({
            observed_at: '2026-03-30T08:45:00.000Z',
            workers: [
              {
                session_name: 'cie-92',
                session_runtime_id: 'cie-92',
                issue_number: 92,
                branch_name: 'feat/issue-92',
                pr_number: 92,
                lifecycle_state: 'idle',
                last_seen_at: '2026-03-30T08:44:45.000Z',
                freshness: { status: 'fresh' },
              },
            ],
          }),
          loadGitHubObservationSet: async () => ({
            observed_at: '2026-03-30T08:45:00.000Z',
            prs: [
              {
                pr_number: 92,
                state: 'OPEN',
                head_branch: 'feat/issue-92',
                head_sha: 'abc123',
                review_status: 'changes_requested',
                ci_status: 'failing',
                mergeability: 'mergeable',
                is_draft: false,
                url: 'https://example.test/pr/92',
              },
            ],
          }),
          resolveLifecycleReport: async ({ derivedTrigger }) => ({
            top_status: 'hold',
            routing_decision: {
              action: 'continue_current_worker',
            },
            release_decision: {
              disposition: 'await_ci',
            },
            actions: [
              {
                id: `hold-${derivedTrigger}`,
                action_class: 'hold',
                summary: `Hold on ${derivedTrigger}.`,
                commands: ['gh pr checks 92'],
                rationale: 'Deterministic shadow routing must be stable for identical state.',
              },
            ],
          }),
        },
      });

      return {
        result,
        deliveryEvents: repository.getSnapshot().state.delivery_events,
        actions: repository.getSnapshot().state.actions,
      };
    };

    const left = await createRepositoryAndRun();
    const right = await createRepositoryAndRun();

    expect(left.result.task_results).toEqual(right.result.task_results);
    expect(left.deliveryEvents).toEqual(right.deliveryEvents);
    expect(left.actions).toEqual(right.actions);
  });

  it('suppresses repeated CI flapping actions on the same head once replay pressure is exhausted', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'shadow');
    seedCleanRuntimePreflight(repository);

    const githubStates = [
      {
        observed_at: '2026-04-01T09:00:00.000Z',
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'abc123',
            review_status: 'approved',
            ci_status: 'failing',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
      {
        observed_at: '2026-04-01T09:01:00.000Z',
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'abc123',
            review_status: 'approved',
            ci_status: 'pending',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
      {
        observed_at: '2026-04-01T09:02:00.000Z',
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'abc123',
            review_status: 'approved',
            ci_status: 'failing',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
      {
        observed_at: '2026-04-01T09:03:00.000Z',
        prs: [
          {
            pr_number: 92,
            state: 'OPEN',
            head_branch: 'feat/issue-92',
            head_sha: 'abc123',
            review_status: 'approved',
            ci_status: 'pending',
            mergeability: 'mergeable',
            is_draft: false,
            url: 'https://example.test/pr/92',
          },
        ],
      },
    ];
    const loadGitHubObservationSet = jest.fn(async () => githubStates.shift());
    const resolveLifecycleReport = jest.fn(async ({ derivedTrigger }) => ({
      top_status: derivedTrigger === 'ci_failed' ? 'hold' : 'continue',
      routing_decision: {
        action: 'continue_current_worker',
      },
      release_decision: {
        disposition: derivedTrigger === 'ci_failed' ? 'await_ci' : 'await_ci_pending',
      },
      actions: [
        {
          id: 'continue_worker',
          action_class: 'continue_worker',
          summary: 'Continue the current worker owner.',
          commands: ['ao status -p ciecopilot-home --json'],
          rationale: 'Ownership continuity is still clear.',
        },
        {
          id: 'hold_ci',
          action_class: 'hold',
          summary: 'Hold until CI stabilizes.',
          commands: ['gh pr checks 92'],
          rationale: `CI state ${derivedTrigger} is not stable enough to create more churn.`,
        },
      ],
    }));

    const commonDeps = {
      loadAoProjectObservation: async () => ({
        observed_at: '2026-04-01T09:00:00.000Z',
        workers: [
          {
            session_name: 'cie-92',
            session_runtime_id: 'cie-92',
            issue_number: 92,
            branch_name: 'feat/issue-92',
            pr_number: 92,
            lifecycle_state: 'idle',
            last_seen_at: '2026-04-01T08:59:45.000Z',
            freshness: { status: 'fresh' },
          },
        ],
      }),
      loadGitHubObservationSet,
      resolveLifecycleReport,
    };

    const first = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-04-01T09:00:00.000Z',
      deps: commonDeps,
    });
    const second = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-04-01T09:01:00.000Z',
      deps: commonDeps,
    });
    const third = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-04-01T09:02:00.000Z',
      deps: commonDeps,
    });
    const fourth = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-04-01T09:03:00.000Z',
      deps: commonDeps,
    });

    expect(first).toMatchObject({
      proposed_action_count: 2,
      replayed_action_count: 0,
      suppressed_action_count: 0,
    });
    expect(second).toMatchObject({
      proposed_action_count: 0,
      replayed_action_count: 2,
      suppressed_action_count: 0,
    });
    expect(third).toMatchObject({
      proposed_action_count: 0,
      replayed_action_count: 2,
      suppressed_action_count: 0,
    });
    expect(fourth).toMatchObject({
      proposed_action_count: 0,
      replayed_action_count: 0,
      suppressed_action_count: 2,
    });

    const governedActions = repository.getSnapshot().state.actions.filter((record) => (
      ['continue_worker', 'hold_ci'].includes(record.action_kind)
    ));
    expect(governedActions).toHaveLength(2);
    expect(governedActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action_kind: 'hold_ci',
        lineage: expect.objectContaining({
          derived_trigger: 'manual',
          pr_head_sha: 'abc123',
          source_delivery_event_ids: expect.arrayContaining([
            expect.stringContaining('delivery'),
          ]),
        }),
        governance: expect.objectContaining({
          replay_limit: 2,
          replay_count: 3,
          suppressed_count: 1,
          last_decision: 'suppressed',
          backpressure_status: 'suppressed',
          reason_codes: expect.arrayContaining(['ci_flapping_same_head']),
        }),
      }),
    ]));
  });

  it('assist mode executes only explicit class A actions and keeps higher-risk actions gated', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'assist');
    seedCleanRuntimePreflight(repository);

    const lifecycleReport = {
      top_status: 'continue',
      routing_decision: {
        action: 'continue_current_worker',
      },
      release_decision: {
        disposition: 'notify_human_ready',
      },
      actions: [
        {
          id: 'continue_worker',
          action_class: 'continue_worker',
          summary: 'Continue the current worker owner.',
          commands: ['ao status -p ciecopilot-home --json'],
          rationale: 'Ownership continuity is clear enough to continue the current worker.',
        },
        {
          id: 'restore_worker',
          action_class: 'restore_worker',
          summary: 'Restore the previously identified worker.',
          commands: ['ao status -p ciecopilot-home --json', 'node scripts/ao-reconcile.js --pr 92 --json --strict'],
          rationale: 'The prior owner is still identifiable, but continuity is stale.',
        },
        {
          id: 'hold_ci',
          action_class: 'hold',
          summary: 'Hold until CI is green.',
          commands: ['gh pr checks 92'],
          rationale: 'Required CI state is not yet ready.',
        },
        {
          id: 'notify_human_ready',
          action_class: 'notify_human',
          summary: 'Notify the human that the PR appears ready.',
          commands: ['terraform plan'],
          rationale: 'This should be blocked by policy because terraform is not an allowlisted tool.',
        },
      ],
    };

    const result = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'approved',
              ci_status: 'passing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        resolveLifecycleReport: async () => lifecycleReport,
        ensureRuntimePreflights: () => repository.getSnapshot().state.runtime_preflights,
      },
    });

    expect(result).toMatchObject({
      mode: 'assist',
      proposed_action_count: 4,
      executed_action_count: 1,
      blocked_action_count: 2,
      policy_blocked_action_count: 1,
      task_results: [
        expect.objectContaining({
          proposed_action_count: 4,
          executed_action_count: 1,
          blocked_action_count: 2,
          policy_blocked_action_count: 1,
        }),
      ],
    });

    expect(repository.getSnapshot().state.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action_kind: 'continue_worker',
        status: 'executed',
        payload: expect.objectContaining({
          action_model: expect.objectContaining({
            risk_class: 'class_a',
          }),
        }),
      }),
      expect.objectContaining({
        action_kind: 'restore_worker',
        status: 'blocked',
        payload: expect.objectContaining({
          action_model: expect.objectContaining({
            risk_class: 'class_c',
          }),
          execution: expect.objectContaining({
            outcome: 'blocked',
          }),
        }),
      }),
      expect.objectContaining({
        action_kind: 'hold_ci',
        status: 'blocked',
        payload: expect.objectContaining({
          action_model: expect.objectContaining({
            risk_class: 'class_b',
          }),
          execution: expect.objectContaining({
            outcome: 'blocked',
          }),
        }),
      }),
      expect.objectContaining({
        action_kind: 'notify_human_ready',
        status: 'blocked',
        payload: expect.objectContaining({
          policy: expect.objectContaining({
            decision: 'deny',
          }),
        }),
      }),
    ]));
    expect(repository.getSnapshot().state.controller_run_metrics).toEqual([
      expect.objectContaining({
        task_id: 'issue-92',
        controller_mode: 'assist',
        trigger_kind: 'approved_and_green',
        failure_class: 'policy_block',
        intervention_counts: expect.objectContaining({
          human_gate: 0,
          override: 0,
          explicit_resume: 0,
          successor_handoff: 0,
          policy_block: 1,
          preflight_block: 0,
        }),
      }),
    ]);
  });

  it('assist mode blocks class A actions until runtime preflight has passed', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'assist');

    const result = await runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [
            {
              session_name: 'cie-92',
              session_runtime_id: 'cie-92',
              issue_number: 92,
              branch_name: 'feat/issue-92',
              pr_number: 92,
              lifecycle_state: 'idle',
              last_seen_at: '2026-03-29T06:40:45.000Z',
              freshness: { status: 'fresh' },
            },
          ],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [
            {
              pr_number: 92,
              state: 'OPEN',
              head_branch: 'feat/issue-92',
              head_sha: 'abc123',
              review_status: 'approved',
              ci_status: 'passing',
              mergeability: 'mergeable',
              is_draft: false,
              url: 'https://example.test/pr/92',
            },
          ],
        }),
        resolveLifecycleReport: async () => ({
          top_status: 'continue',
          routing_decision: {
            action: 'continue_current_worker',
          },
          release_decision: {
            disposition: 'continue_current_worker',
          },
          actions: [
            {
              id: 'continue_worker',
              action_class: 'continue_worker',
              summary: 'Continue the current worker owner.',
              commands: ['ao status -p ciecopilot-home --json'],
              rationale: 'Ownership continuity is clear enough to continue the current worker.',
            },
          ],
        }),
      },
    });

    expect(result).toMatchObject({
      mode: 'assist',
      proposed_action_count: 1,
      executed_action_count: 0,
      blocked_action_count: 1,
      task_results: [
        expect.objectContaining({
          proposed_action_count: 1,
          executed_action_count: 0,
          blocked_action_count: 1,
        }),
      ],
    });

    expect(repository.getSnapshot().state.actions).toEqual([
      expect.objectContaining({
        action_kind: 'continue_worker',
        status: 'blocked',
        payload: expect.objectContaining({
          action_model: expect.objectContaining({
            phase4_assist: expect.objectContaining({
              executable: false,
              reason: 'runtime_preflight_clean',
            }),
          }),
          execution: expect.objectContaining({
            outcome: 'blocked',
            reason: 'runtime_preflight_clean',
          }),
        }),
      }),
    ]);
    expect(repository.getSnapshot().state.controller_run_metrics).toEqual([
      expect.objectContaining({
        task_id: 'issue-92',
        trigger_kind: 'approved_and_green',
        failure_class: 'preflight_block',
        intervention_counts: expect.objectContaining({
          preflight_block: 1,
        }),
      }),
    ]);
  });

  it('blocks when another active lease already exists for the same controller', async () => {
    const repository = createStateRepository({
      repoRoot: createTempRepo(),
      projectId: PROJECT_ID,
    });
    seedActiveTask(repository, 'observe');
    repository.upsertControllerLease(createControllerLease({
      lease_id: 'controller-default-other-holder',
      controller_id: 'default',
      holder_id: 'other-holder',
      holder_type: 'session',
      status: 'active',
      acquired_at: '2026-03-29T06:40:30.000Z',
      expires_at: '2026-03-29T06:45:30.000Z',
    }));

    await expect(runControllerLoop({
      repoRoot: repository.getSnapshot().paths.repoRoot,
      cwd: repository.getSnapshot().paths.repoRoot,
      projectId: PROJECT_ID,
      controllerId: 'default',
      now: '2026-03-29T06:41:00.000Z',
      deps: {
        loadAoProjectObservation: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          workers: [],
        }),
        loadGitHubObservationSet: async () => ({
          observed_at: '2026-03-29T06:41:00.000Z',
          prs: [],
        }),
      },
    })).rejects.toThrow(/active lease/i);

    const snapshot = repository.getSnapshot().state;
    expect(snapshot.observations).toEqual([]);
    expect(snapshot.controller_leases).toEqual([
      expect.objectContaining({
        lease_id: 'controller-default-other-holder',
        status: 'active',
      }),
    ]);
  });
});
