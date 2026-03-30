import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  createControllerLease,
  createControllerModeRecord,
  createManagedTask,
  createPrBinding,
  createRuntimePreflightRecord,
  createTaskSpecRecord,
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
