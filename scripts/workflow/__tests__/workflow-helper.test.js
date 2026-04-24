import {
  buildBaselineSyncPlan,
  buildCodexPreflightReport,
  buildTaskNames,
  buildTaskPaths,
  buildTaskCloseoutPlan,
  normalizeSlug,
  parseTaskIdentifier,
} from '../lib/workflow-helper.js';

describe('workflow helper', () => {
  test('normalizes slug into lowercase dash-separated text', () => {
    expect(normalizeSlug(' Governance V1 ')).toBe('governance-v1');
    expect(normalizeSlug('Fix_learning runtime')).toBe('fix-learning-runtime');
  });

  test('builds task branch and worktree names from id and slug', () => {
    expect(buildTaskNames({ id: '142', slug: 'governance-v1' })).toEqual({
      branchName: 'task/142-governance-v1',
      worktreeName: 'task-142--governance-v1',
    });
  });

  test('parses task identifiers from branch names', () => {
    expect(parseTaskIdentifier({ branchName: 'task/142-governance-v1' })).toEqual({
      id: '142',
      slug: 'governance-v1',
      branchName: 'task/142-governance-v1',
      worktreeName: 'task-142--governance-v1',
    });
  });

  test('builds stable task paths from repo root', () => {
    expect(buildTaskPaths({
      repoRoot: '/repo',
      branchName: 'task/142-governance-v1',
      worktreeName: 'task-142--governance-v1',
    })).toEqual({
      branchName: 'task/142-governance-v1',
      worktreeName: 'task-142--governance-v1',
      worktreePath: '/repo/.worktrees/task-142--governance-v1',
    });
  });

  test('creates a baseline sync plan with fetch and ff-only pull', () => {
    const plan = buildBaselineSyncPlan({
      repoRoot: '/repo',
    });

    expect(plan).toEqual({
      baselineRootPath: '/repo',
      commands: [
        'git -C /repo fetch origin --prune',
        'git -C /repo pull --ff-only',
      ],
    });
  });

  test('creates a closeout plan with worktree removal, branch deletion, and repo-root baseline sync', () => {
    const plan = buildTaskCloseoutPlan({
      repoRoot: '/repo',
      branchName: 'task/142-governance-v1',
      worktreeName: 'task-142--governance-v1',
    });

    expect(plan).toEqual({
      branchName: 'task/142-governance-v1',
      worktreePath: '/repo/.worktrees/task-142--governance-v1',
      baselineRootPath: '/repo',
      commands: [
        'git -C /repo worktree remove /repo/.worktrees/task-142--governance-v1',
        'git -C /repo branch -d task/142-governance-v1',
        'git -C /repo fetch origin --prune',
        'git -C /repo pull --ff-only',
      ],
    });
  });

  test('codex preflight marks a clean current branch as ready for small scoped work', () => {
    expect(buildCodexPreflightReport({
      branchName: 'codex/update-rules',
      upstreamName: 'origin/codex/update-rules',
      aheadCount: 0,
      behindCount: 0,
      statusSummary: {
        stagedChanges: false,
        unstagedChanges: false,
        untrackedFileCount: 0,
        untrackedFileSamples: [],
        worktreeDirty: false,
      },
    })).toMatchObject({
      ok: true,
      branch_policy: 'current_branch_allowed',
      sync_policy: 'up_to_date',
      worktree_policy: 'clean',
    });
  });

  test('codex preflight flags protected branches and dirty worktrees with required cleanup actions', () => {
    const report = buildCodexPreflightReport({
      branchName: 'main',
      upstreamName: 'origin/main',
      aheadCount: 0,
      behindCount: 2,
      statusSummary: {
        stagedChanges: false,
        unstagedChanges: true,
        untrackedFileCount: 1,
        untrackedFileSamples: ['scratch.txt'],
        worktreeDirty: true,
      },
    });

    expect(report.ok).toBe(false);
    expect(report.branch_policy).toBe('protected_branch_requires_codex_or_task_branch_before_commit');
    expect(report.sync_policy).toBe('behind_upstream_requires_sync_or_stash_before_work');
    expect(report.worktree_policy).toBe('dirty_requires_classify_stash_commit_or_clean');
    expect(report.required_actions).toEqual([
      'classify existing dirty files as related or unrelated before editing',
      'stash or commit unrelated dirty files before editing',
      'sync the protected baseline branch before creating long-lived work',
      'create a codex/* or task/* branch before committing',
    ]);
  });
});
