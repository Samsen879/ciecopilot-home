import {
  buildBaselineSyncPlan,
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
      baselineWorktreePath: '/repo/.worktrees/baseline-origin-main-20260402',
    });

    expect(plan).toEqual({
      baselineWorktreePath: '/repo/.worktrees/baseline-origin-main-20260402',
      commands: [
        'git -C /repo fetch origin --prune',
        'git -C /repo/.worktrees/baseline-origin-main-20260402 pull --ff-only',
      ],
    });
  });

  test('creates a closeout plan with worktree removal, branch deletion, and baseline sync', () => {
    const plan = buildTaskCloseoutPlan({
      repoRoot: '/repo',
      baselineWorktreePath: '/repo/.worktrees/baseline-origin-main-20260402',
      branchName: 'task/142-governance-v1',
      worktreeName: 'task-142--governance-v1',
    });

    expect(plan).toEqual({
      branchName: 'task/142-governance-v1',
      worktreePath: '/repo/.worktrees/task-142--governance-v1',
      baselineWorktreePath: '/repo/.worktrees/baseline-origin-main-20260402',
      commands: [
        'git -C /repo worktree remove /repo/.worktrees/task-142--governance-v1',
        'git -C /repo branch -d task/142-governance-v1',
        'git -C /repo fetch origin --prune',
        'git -C /repo/.worktrees/baseline-origin-main-20260402 pull --ff-only',
      ],
    });
  });
});
