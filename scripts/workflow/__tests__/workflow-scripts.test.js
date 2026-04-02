import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const BASELINE_SYNC_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/baseline-sync.sh');
const TASK_CREATE_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/task-create.sh');
const TASK_CLOSEOUT_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/task-closeout.sh');
const HOOK_INSTALL_SCRIPT = path.join(PROJECT_ROOT, 'scripts/git-hooks/install.sh');
const BASELINE_WORKTREE_NAME = 'baseline-origin-main-20260402';
const BASELINE_BRANCH_NAME = 'baseline/origin-main-20260402';

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 5000,
    ...options,
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runGit(args, cwd) {
  const result = runCommand('git', args, { cwd });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function createRepoFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-fixture-'));
  const remoteDir = path.join(tempRoot, 'remote.git');
  const repoDir = path.join(tempRoot, 'repo');

  runGit(['init', '--bare', '--initial-branch=main', remoteDir], tempRoot);
  runGit(['clone', remoteDir, repoDir], tempRoot);

  fs.writeFileSync(path.join(repoDir, 'README.md'), '# temp repo\n');
  fs.writeFileSync(path.join(repoDir, 'package.json'), JSON.stringify({
    name: 'workflow-fixture',
    private: true,
    type: 'module',
  }, null, 2));
  copyProjectFile('.githooks/pre-commit', repoDir);
  copyProjectFile('.githooks/pre-push', repoDir);
  copyProjectFile('scripts/git-hooks/guardrails.js', repoDir);
  copyProjectFile('scripts/git-hooks/install.sh', repoDir);
  copyProjectFile('scripts/workflow/lib/workflow-mode.js', repoDir);
  fs.mkdirSync(path.join(repoDir, '.git', 'ao-hooks'), { recursive: true });
  runGit(['config', 'user.name', 'Codex Test'], repoDir);
  runGit(['config', 'user.email', 'codex@example.com'], repoDir);
  runGit(['config', 'core.hooksPath', path.join(repoDir, '.git', 'ao-hooks')], repoDir);
  runGit(['add', '.'], repoDir);
  runGit(['commit', '-m', 'chore: seed repo'], repoDir);
  runGit(['push', '-u', 'origin', 'main'], repoDir);
  runGit(
    ['worktree', 'add', `.worktrees/${BASELINE_WORKTREE_NAME}`, '-b', BASELINE_BRANCH_NAME, 'origin/main'],
    repoDir,
  );

  return {
    tempRoot,
    repoDir,
    remoteDir,
    baselineWorktreePath: path.join(repoDir, '.worktrees', BASELINE_WORKTREE_NAME),
  };
}

function copyProjectFile(relativePath, targetRoot) {
  const sourcePath = path.join(PROJECT_ROOT, relativePath);
  const targetPath = path.join(targetRoot, relativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

describe('workflow scripts', () => {
  test('baseline sync dry-run prints the intended sync commands', () => {
    const fixture = createRepoFixture();

    try {
      const result = runCommand('bash', [BASELINE_SYNC_SCRIPT, '--dry-run'], {
        cwd: fixture.repoDir,
      });

      expect(result.status).toBe(0);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  test('task create creates a task branch and worktree', () => {
    const fixture = createRepoFixture();

    try {
      const result = runCommand('bash', [TASK_CREATE_SCRIPT, '--id', '142', '--slug', 'governance-v1'], {
        cwd: fixture.repoDir,
      });

      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(fixture.repoDir, '.worktrees', 'task-142--governance-v1'))).toBe(true);

      const branchList = runGit(['branch', '--list', 'task/142-governance-v1'], fixture.repoDir);
      expect(branchList.stdout).toContain('task/142-governance-v1');
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  test('hook install enables protected-branch commit blocking across worktrees', () => {
    const fixture = createRepoFixture();

    try {
      copyProjectFile('.githooks/pre-commit', fixture.baselineWorktreePath);
      copyProjectFile('.githooks/pre-push', fixture.baselineWorktreePath);
      copyProjectFile('scripts/git-hooks/guardrails.js', fixture.baselineWorktreePath);
      copyProjectFile('scripts/git-hooks/install.sh', fixture.baselineWorktreePath);
      copyProjectFile('scripts/workflow/lib/workflow-mode.js', fixture.baselineWorktreePath);

      const installResult = runCommand('bash', [HOOK_INSTALL_SCRIPT], {
        cwd: fixture.baselineWorktreePath,
      });

      expect(installResult.status).toBe(0);
      const hooksPath = runGit(['config', '--get', 'core.hooksPath'], fixture.repoDir);
      expect(hooksPath.stdout.trim()).toBe(path.join(fixture.repoDir, '.git', 'ao-hooks'));

      runGit(
        ['worktree', 'add', '.worktrees/baseline-test', '-b', 'baseline/test', 'origin/main'],
        fixture.repoDir,
      );

      const protectedWorktree = path.join(fixture.repoDir, '.worktrees', 'baseline-test');
      copyProjectFile('scripts/git-hooks/guardrails.js', protectedWorktree);
      copyProjectFile('scripts/workflow/lib/workflow-mode.js', protectedWorktree);
      fs.writeFileSync(path.join(protectedWorktree, 'guardrail.txt'), 'blocked\n');
      runGit(['add', 'guardrail.txt'], protectedWorktree);

      const commitResult = runCommand('git', ['commit', '-m', 'test: blocked baseline commit'], {
        cwd: protectedWorktree,
      });

      expect(commitResult.status).toBe(1);
      const blockedCommit = runGit(['log', '--oneline', '--grep', 'test: blocked baseline commit'], protectedWorktree);
      expect(blockedCommit.stdout.trim()).toBe('');
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  test('hook install allows light-direct-minimal report docs to commit and push from baseline', () => {
    const fixture = createRepoFixture();

    try {
      copyProjectFile('.githooks/pre-commit', fixture.baselineWorktreePath);
      copyProjectFile('.githooks/pre-push', fixture.baselineWorktreePath);
      copyProjectFile('scripts/git-hooks/guardrails.js', fixture.baselineWorktreePath);
      copyProjectFile('scripts/git-hooks/install.sh', fixture.baselineWorktreePath);
      copyProjectFile('scripts/workflow/lib/workflow-mode.js', fixture.baselineWorktreePath);

      const installResult = runCommand('bash', [HOOK_INSTALL_SCRIPT], {
        cwd: fixture.baselineWorktreePath,
      });

      expect(installResult.status).toBe(0);

      const reportsDir = path.join(fixture.baselineWorktreePath, 'docs', 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(path.join(reportsDir, '2026-04-02-status.md'), '# status\n');

      runGit(['add', 'docs/reports/2026-04-02-status.md'], fixture.baselineWorktreePath);

      const commitResult = runCommand('git', ['commit', '-m', 'docs: add status report'], {
        cwd: fixture.baselineWorktreePath,
      });
      expect(commitResult.status).toBe(0);

      const pushResult = runCommand('git', ['push', 'origin', 'HEAD:main'], {
        cwd: fixture.baselineWorktreePath,
      });
      expect(pushResult.status).toBe(0);

      const remoteLog = runCommand('git', ['--git-dir', fixture.remoteDir, 'log', '--oneline', '--max-count=1', 'main']);
      expect(remoteLog.stdout).toContain('docs: add status report');
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  test('task closeout aborts when confirmation text does not match', () => {
    const fixture = createRepoFixture();

    try {
      runGit(
        ['worktree', 'add', '.worktrees/task-142--governance-v1', '-b', 'task/142-governance-v1', 'origin/main'],
        fixture.repoDir,
      );

      const result = runCommand('bash', [
        TASK_CLOSEOUT_SCRIPT,
        '--id',
        '142',
        '--slug',
        'governance-v1',
        '--confirm',
        'no',
      ], {
        cwd: fixture.repoDir,
      });

      expect(result.status).toBe(1);
      expect(fs.existsSync(path.join(fixture.repoDir, '.worktrees', 'task-142--governance-v1'))).toBe(true);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

  test('task closeout removes the task worktree and branch after explicit confirmation', () => {
    const fixture = createRepoFixture();

    try {
      runGit(
        ['worktree', 'add', '.worktrees/task-142--governance-v1', '-b', 'task/142-governance-v1', 'origin/main'],
        fixture.repoDir,
      );

      const result = runCommand('bash', [
        TASK_CLOSEOUT_SCRIPT,
        '--id',
        '142',
        '--slug',
        'governance-v1',
        '--confirm',
        'closeout',
      ], {
        cwd: fixture.repoDir,
      });

      expect(result.status).toBe(0);
      expect(fs.existsSync(path.join(fixture.repoDir, '.worktrees', 'task-142--governance-v1'))).toBe(false);

      const branchList = runGit(['branch', '--list', 'task/142-governance-v1'], fixture.repoDir);
      expect(branchList.stdout.trim()).toBe('');
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });
});
