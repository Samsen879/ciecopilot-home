import {
  buildCodexPreflightReport,
  parsePorcelainStatus,
  renderCodexPreflightText,
  resolveStrictExitCode,
} from '../lib/codex-preflight.js';

function makeObservation(overrides = {}) {
  return {
    repoRoot: '/repo',
    gitCommonDir: '/repo/.git',
    currentWorktreePath: '/repo/.worktrees/task-142--feature',
    branchName: 'task/142-feature',
    headSha: 'abc1234',
    upstreamName: 'origin/task/142-feature',
    upstreamAhead: 0,
    upstreamBehind: 0,
    isDetachedHead: false,
    statusEntries: [],
    worktrees: [
      {
        path: '/repo',
        head: 'base1234',
        branch: 'refs/heads/baseline/origin-main',
      },
      {
        path: '/repo/.worktrees/task-142--feature',
        head: 'abc1234',
        branch: 'refs/heads/task/142-feature',
      },
    ],
    packageScripts: {
      'workflow:task:create': 'bash scripts/workflow/task-create.sh',
      'workflow:task:closeout': 'bash scripts/workflow/task-closeout.sh',
      'ao:doctor': 'node scripts/ao-doctor.js',
    },
    sourceErrors: [],
    ...overrides,
  };
}

describe('codex preflight report', () => {
  test('parses porcelain paths without trimming away the leading status column', () => {
    expect(parsePorcelainStatus([
      ' M package.json',
      'M  scripts/workflow/cli.js',
      '?? notes/local.md',
    ].join('\n'))).toEqual([
      { indexStatus: ' ', worktreeStatus: 'M', path: 'package.json' },
      { indexStatus: 'M', worktreeStatus: ' ', path: 'scripts/workflow/cli.js' },
      { indexStatus: '?', worktreeStatus: '?', path: 'notes/local.md' },
    ]);
  });

  test('allows editing on a clean task branch with synced upstream', () => {
    const report = buildCodexPreflightReport(makeObservation());

    expect(report.top_status).toBe('healthy');
    expect(report.guidance.decision).toBe('safe_to_edit');
    expect(report.repo.branch).toBe('task/142-feature');
    expect(report.worktree.dirty).toBe(false);
    expect(report.checks.map((check) => [check.id, check.status])).toEqual(
      expect.arrayContaining([
        ['branch_safety', 'healthy'],
        ['worktree_cleanliness', 'healthy'],
        ['upstream_sync', 'healthy'],
      ]),
    );
    expect(resolveStrictExitCode(report)).toBe(0);
  });

  test('warns and classifies staged unstaged and untracked files', () => {
    const report = buildCodexPreflightReport(makeObservation({
      statusEntries: [
        { indexStatus: 'M', worktreeStatus: ' ', path: 'package.json' },
        { indexStatus: ' ', worktreeStatus: 'M', path: 'scripts/workflow/cli.js' },
        { indexStatus: '?', worktreeStatus: '?', path: 'notes/local.md' },
      ],
    }));

    expect(report.top_status).toBe('warning');
    expect(report.guidance.decision).toBe('classify_or_isolate_changes');
    expect(report.worktree.dirty).toBe(true);
    expect(report.worktree.files.staged).toEqual(['package.json']);
    expect(report.worktree.files.unstaged).toEqual(['scripts/workflow/cli.js']);
    expect(report.worktree.files.untracked).toEqual(['notes/local.md']);
    expect(report.guidance.commands).toContain('git status --short');
    expect(resolveStrictExitCode(report)).toBe(20);
  });

  test('warns on a protected branch even when the worktree is clean', () => {
    const report = buildCodexPreflightReport(makeObservation({
      branchName: 'baseline/origin-main',
      currentWorktreePath: '/repo',
      upstreamName: 'origin/main',
    }));

    expect(report.top_status).toBe('warning');
    expect(report.repo.protected_branch).toBe(true);
    expect(report.guidance.decision).toBe('create_task_branch_before_commit');
    expect(report.guidance.commands).toContain('npm run workflow:task:create -- --id <id> --slug <slug>');
  });

  test('blocks detached HEAD because branch ownership is ambiguous', () => {
    const report = buildCodexPreflightReport(makeObservation({
      branchName: 'HEAD',
      isDetachedHead: true,
      upstreamName: null,
    }));

    expect(report.top_status).toBe('blocked');
    expect(report.guidance.decision).toBe('stop_and_fix_branch');
    expect(resolveStrictExitCode(report)).toBe(30);
  });

  test('warns when the branch is behind upstream', () => {
    const report = buildCodexPreflightReport(makeObservation({
      upstreamBehind: 2,
    }));

    expect(report.top_status).toBe('warning');
    expect(report.guidance.decision).toBe('sync_or_rebase_before_editing');
    expect(report.repo.upstream.behind).toBe(2);
    expect(report.guidance.commands).toContain('git pull --ff-only');
  });

  test('renders a compact human-readable summary', () => {
    const report = buildCodexPreflightReport(makeObservation({
      statusEntries: [
        { indexStatus: ' ', worktreeStatus: 'M', path: 'scripts/workflow/cli.js' },
      ],
    }));

    const text = renderCodexPreflightText(report);

    expect(text).toContain('codex preflight: warning');
    expect(text).toContain('decision: classify_or_isolate_changes');
    expect(text).toContain('branch: task/142-feature');
    expect(text).toContain('dirty: yes');
    expect(text).toContain('git status --short');
  });
});
