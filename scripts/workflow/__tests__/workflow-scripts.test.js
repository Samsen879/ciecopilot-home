import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const BASELINE_SYNC_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/baseline-sync.sh');
const CODEX_PREFLIGHT_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/codex-preflight.sh');
const TASK_CREATE_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/task-create.sh');
const TASK_CLOSEOUT_SCRIPT = path.join(PROJECT_ROOT, 'scripts/workflow/task-closeout.sh');
const HOOK_INSTALL_SCRIPT = path.join(PROJECT_ROOT, 'scripts/git-hooks/install.sh');
const BASELINE_BRANCH_NAME = 'baseline/origin-main';

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
  fs.mkdirSync(path.join(repoDir, '.git', 'ao-hooks'), { recursive: true });
  runGit(['config', 'user.name', 'Codex Test'], repoDir);
  runGit(['config', 'user.email', 'codex@example.com'], repoDir);
  runGit(['config', 'core.hooksPath', path.join(repoDir, '.git', 'ao-hooks')], repoDir);
  runGit(['add', 'README.md', 'package.json'], repoDir);
  runGit(['commit', '-m', 'chore: seed repo'], repoDir);
  runGit(['push', '-u', 'origin', 'main'], repoDir);
  runGit(['switch', '-c', BASELINE_BRANCH_NAME, '--track', 'origin/main'], repoDir);

  return {
    tempRoot,
    repoDir,
    baselineRootPath: repoDir,
  };
}

function copyProjectFile(relativePath, targetRoot) {
  const sourcePath = path.join(PROJECT_ROOT, relativePath);
  const targetPath = path.join(targetRoot, relativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

describe('workflow scripts', () => {
  test('codex preflight wrapper runs against a fixture repo', () => {
    const fixture = createRepoFixture();

    try {
      expect(fs.statSync(CODEX_PREFLIGHT_SCRIPT).mode & 0o111).not.toBe(0);

      const result = runCommand('bash', [CODEX_PREFLIGHT_SCRIPT, '--json'], {
        cwd: fixture.repoDir,
      });

      expect(result.status).toBe(0);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });

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
      copyProjectFile('.githooks/pre-commit', fixture.baselineRootPath);
      copyProjectFile('.githooks/pre-push', fixture.baselineRootPath);
      copyProjectFile('scripts/git-hooks/guardrails.js', fixture.baselineRootPath);
      copyProjectFile('scripts/git-hooks/install.sh', fixture.baselineRootPath);

      const installResult = runCommand('bash', [HOOK_INSTALL_SCRIPT], {
        cwd: fixture.baselineRootPath,
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

  test('task closeout retires the managed AO task before git cleanup when ao-manage exists', () => {
    const fixture = createRepoFixture();

    try {
      runGit(
        ['worktree', 'add', '.worktrees/task-142--governance-v1', '-b', 'task/142-governance-v1', 'origin/main'],
        fixture.repoDir,
      );
      fs.mkdirSync(path.join(fixture.repoDir, 'scripts'), { recursive: true });
      fs.writeFileSync(
        path.join(fixture.repoDir, 'scripts', 'ao-manage.js'),
        [
          "import fs from 'node:fs';",
          "fs.writeFileSync('.ao-manage-invocation.json', JSON.stringify(process.argv.slice(2)));",
        ].join('\n'),
        'utf8',
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
      expect(JSON.parse(fs.readFileSync(path.join(fixture.repoDir, '.ao-manage-invocation.json'), 'utf8'))).toEqual([
        'retire',
        '--issue',
        '142',
        '--reason',
        'workflow_task_closeout',
      ]);
    } finally {
      fs.rmSync(fixture.tempRoot, { recursive: true, force: true });
    }
  });
});
