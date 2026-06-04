import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCHEMA_VERSION = 'codex_preflight_v1';
const STATUS_RANK = {
  healthy: 0,
  warning: 1,
  blocked: 2,
  source_failure: 3,
};

function trimText(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function runGit(args, cwd) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
}

function readGitText(args, cwd, sourceErrors, options = {}) {
  const result = runGit(args, cwd);
  if (result.status !== 0) {
    if (!options.optional) {
      sourceErrors.push({
        source: 'git',
        command: `git ${args.join(' ')}`,
        message: trimText(result.stderr) ?? trimText(result.stdout) ?? 'git command failed',
      });
    }
    return null;
  }

  return trimText(result.stdout);
}

function readGitRaw(args, cwd, sourceErrors, options = {}) {
  const result = runGit(args, cwd);
  if (result.status !== 0) {
    if (!options.optional) {
      sourceErrors.push({
        source: 'git',
        command: `git ${args.join(' ')}`,
        message: trimText(result.stderr) ?? trimText(result.stdout) ?? 'git command failed',
      });
    }
    return null;
  }

  return String(result.stdout ?? '');
}

function readPackageScripts(repoRoot, sourceErrors) {
  if (!repoRoot) return {};

  const packageJsonPath = path.join(repoRoot, 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.scripts ?? {};
  } catch (error) {
    sourceErrors.push({
      source: 'package_json',
      command: `read ${packageJsonPath}`,
      message: error.message,
    });
    return {};
  }
}

export function parsePorcelainStatus(stdout) {
  return String(stdout ?? '')
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .map((line) => ({
      indexStatus: line[0] ?? ' ',
      worktreeStatus: line[1] ?? ' ',
      path: line.slice(3).trim(),
    }));
}

export function parseWorktreePorcelain(stdout) {
  const worktrees = [];
  let current = null;

  for (const line of String(stdout ?? '').split(/\r?\n/u)) {
    if (line.startsWith('worktree ')) {
      if (current) worktrees.push(current);
      current = {
        path: line.slice('worktree '.length).trim(),
        head: null,
        branch: null,
        detached: false,
      };
      continue;
    }

    if (!current) continue;
    if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length).trim();
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).trim();
    } else if (line === 'detached') {
      current.detached = true;
    }
  }

  if (current) worktrees.push(current);
  return worktrees;
}

function parseUpstreamCounts(value) {
  const [aheadText, behindText] = String(value ?? '').trim().split(/\s+/u);
  return {
    ahead: Number.parseInt(aheadText ?? '0', 10) || 0,
    behind: Number.parseInt(behindText ?? '0', 10) || 0,
  };
}

export function collectCodexPreflightObservation({ cwd = process.cwd() } = {}) {
  const sourceErrors = [];
  const repoRoot = readGitText(['rev-parse', '--show-toplevel'], cwd, sourceErrors);
  const gitCommonDir = readGitText(
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    cwd,
    sourceErrors,
  );
  const branchName = readGitText(['rev-parse', '--abbrev-ref', 'HEAD'], cwd, sourceErrors);
  const headSha = readGitText(['rev-parse', '--short', 'HEAD'], cwd, sourceErrors, { optional: true });
  const upstreamName = readGitText(
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    cwd,
    sourceErrors,
    { optional: true },
  );
  const upstreamCounts = upstreamName
    ? parseUpstreamCounts(readGitText(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], cwd, sourceErrors))
    : { ahead: 0, behind: 0 };

  const statusOutput = readGitRaw(['status', '--porcelain=v1'], cwd, sourceErrors) ?? '';
  const worktreeOutput = readGitRaw(['worktree', 'list', '--porcelain'], cwd, sourceErrors, { optional: true }) ?? '';

  return {
    repoRoot,
    gitCommonDir,
    currentWorktreePath: repoRoot,
    branchName,
    headSha,
    upstreamName,
    upstreamAhead: upstreamCounts.ahead,
    upstreamBehind: upstreamCounts.behind,
    isDetachedHead: branchName === 'HEAD',
    statusEntries: parsePorcelainStatus(statusOutput),
    worktrees: parseWorktreePorcelain(worktreeOutput),
    packageScripts: readPackageScripts(repoRoot, sourceErrors),
    sourceErrors,
  };
}

function isProtectedBranch(branchName) {
  return branchName === 'main' || branchName === 'master' || String(branchName ?? '').startsWith('baseline/');
}

function isOwnedTaskBranch(branchName) {
  return String(branchName ?? '').startsWith('task/') || String(branchName ?? '').startsWith('codex/');
}

function classifyStatusEntries(entries) {
  const files = {
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: [],
  };

  for (const entry of entries) {
    const indexStatus = entry.indexStatus ?? ' ';
    const worktreeStatus = entry.worktreeStatus ?? ' ';
    const filePath = entry.path;

    if (indexStatus === '?' && worktreeStatus === '?') {
      files.untracked.push(filePath);
      continue;
    }

    if (indexStatus === 'U' || worktreeStatus === 'U' || (indexStatus === 'A' && worktreeStatus === 'A')) {
      files.conflicted.push(filePath);
      continue;
    }

    if (indexStatus !== ' ') {
      files.staged.push(filePath);
    }
    if (worktreeStatus !== ' ') {
      files.unstaged.push(filePath);
    }
  }

  return {
    dirty: entries.length > 0,
    counts: {
      staged: files.staged.length,
      unstaged: files.unstaged.length,
      untracked: files.untracked.length,
      conflicted: files.conflicted.length,
    },
    files,
  };
}

function makeCheck(id, status, summary, details = {}) {
  return {
    id,
    status,
    summary,
    ...details,
  };
}

function hasScript(packageScripts, name) {
  return Object.prototype.hasOwnProperty.call(packageScripts ?? {}, name);
}

function buildChecks(observation, worktreeState) {
  const checks = [];

  if (observation.sourceErrors.length > 0) {
    checks.push(makeCheck('source_observation', 'source_failure', 'one or more preflight probes failed', {
      errors: observation.sourceErrors,
    }));
  } else {
    checks.push(makeCheck('source_observation', 'healthy', 'git and package metadata were observable'));
  }

  if (observation.isDetachedHead) {
    checks.push(makeCheck('branch_safety', 'blocked', 'detached HEAD has ambiguous branch ownership'));
  } else if (isProtectedBranch(observation.branchName)) {
    checks.push(makeCheck('branch_safety', 'warning', 'protected branch requires a task or codex branch before commit'));
  } else if (isOwnedTaskBranch(observation.branchName)) {
    checks.push(makeCheck('branch_safety', 'healthy', 'branch name is suitable for Codex-owned work'));
  } else {
    checks.push(makeCheck('branch_safety', 'warning', 'branch is not protected but also not task/ or codex/-scoped'));
  }

  if (worktreeState.counts.conflicted > 0) {
    checks.push(makeCheck('worktree_cleanliness', 'blocked', 'merge conflicts are present', {
      counts: worktreeState.counts,
    }));
  } else if (worktreeState.dirty) {
    checks.push(makeCheck('worktree_cleanliness', 'warning', 'worktree has existing changes to classify', {
      counts: worktreeState.counts,
    }));
  } else {
    checks.push(makeCheck('worktree_cleanliness', 'healthy', 'worktree is clean'));
  }

  if (!observation.upstreamName) {
    checks.push(makeCheck('upstream_sync', 'warning', 'branch has no upstream tracking ref'));
  } else if (observation.upstreamBehind > 0) {
    checks.push(makeCheck('upstream_sync', 'warning', 'branch is behind upstream', {
      ahead: observation.upstreamAhead,
      behind: observation.upstreamBehind,
    }));
  } else if (observation.upstreamAhead > 0) {
    checks.push(makeCheck('upstream_sync', 'warning', 'branch has local commits not present upstream', {
      ahead: observation.upstreamAhead,
      behind: observation.upstreamBehind,
    }));
  } else {
    checks.push(makeCheck('upstream_sync', 'healthy', 'branch is synchronized with upstream', {
      ahead: 0,
      behind: 0,
    }));
  }

  const requiredScripts = ['workflow:task:create', 'workflow:task:closeout', 'ao:doctor'];
  const missingScripts = requiredScripts.filter((scriptName) => !hasScript(observation.packageScripts, scriptName));
  checks.push(missingScripts.length === 0
    ? makeCheck('workflow_entrypoints', 'healthy', 'workflow and AO entrypoints are present')
    : makeCheck('workflow_entrypoints', 'warning', 'some workflow or AO entrypoints are missing', {
      missing_scripts: missingScripts,
    }));

  return checks;
}

function resolveTopStatus(checks) {
  return checks.reduce((topStatus, check) => (
    STATUS_RANK[check.status] > STATUS_RANK[topStatus] ? check.status : topStatus
  ), 'healthy');
}

function buildGuidance({ observation, worktreeState, topStatus }) {
  if (topStatus === 'source_failure') {
    return {
      decision: 'inspect_source_failures',
      summary: 'Preflight could not observe all required repo state; inspect source errors before editing.',
      commands: ['git status --short'],
    };
  }

  if (observation.isDetachedHead) {
    return {
      decision: 'stop_and_fix_branch',
      summary: 'Do not edit from detached HEAD; switch to an owned branch first.',
      commands: ['git branch --show-current', 'git switch <branch>'],
    };
  }

  if (worktreeState.counts.conflicted > 0) {
    return {
      decision: 'resolve_conflicts_before_editing',
      summary: 'Resolve merge conflicts before Codex edits this workspace.',
      commands: ['git status --short'],
    };
  }

  if (worktreeState.dirty) {
    return {
      decision: 'classify_or_isolate_changes',
      summary: 'Classify existing changes as related or unrelated before editing.',
      commands: ['git status --short', 'git diff --stat', 'git diff --cached --stat'],
    };
  }

  if (observation.upstreamBehind > 0) {
    return {
      decision: 'sync_or_rebase_before_editing',
      summary: 'Bring the branch up to date before starting new work.',
      commands: ['git pull --ff-only'],
    };
  }

  if (isProtectedBranch(observation.branchName)) {
    return {
      decision: 'create_task_branch_before_commit',
      summary: 'Small edits may be inspected here, but commits need a task/ or codex/ branch.',
      commands: ['npm run workflow:task:create -- --id <id> --slug <slug>'],
    };
  }

  if (!isOwnedTaskBranch(observation.branchName)) {
    return {
      decision: 'confirm_branch_ownership',
      summary: 'Branch is editable, but it is not clearly Codex-owned.',
      commands: ['git branch --show-current', 'git status --short'],
    };
  }

  return {
    decision: 'safe_to_edit',
    summary: 'Workspace is clean, synced, and on an owned task branch.',
    commands: ['git status --short'],
  };
}

export function buildCodexPreflightReport(observation) {
  const worktreeState = classifyStatusEntries(observation.statusEntries ?? []);
  const checks = buildChecks(observation, worktreeState);
  const topStatus = resolveTopStatus(checks);

  return {
    schema_version: SCHEMA_VERSION,
    top_status: topStatus,
    repo: {
      root: observation.repoRoot,
      git_common_dir: observation.gitCommonDir,
      worktree: observation.currentWorktreePath,
      branch: observation.branchName,
      head: observation.headSha,
      protected_branch: isProtectedBranch(observation.branchName),
      upstream: {
        name: observation.upstreamName,
        ahead: observation.upstreamAhead,
        behind: observation.upstreamBehind,
      },
      detached_head: observation.isDetachedHead,
      worktree_count: (observation.worktrees ?? []).length,
    },
    worktree: worktreeState,
    checks,
    guidance: buildGuidance({
      observation,
      worktreeState,
      topStatus,
    }),
  };
}

export function renderCodexPreflightText(report) {
  const lines = [
    `codex preflight: ${report.top_status}`,
    `decision: ${report.guidance.decision}`,
    `summary: ${report.guidance.summary}`,
    `branch: ${report.repo.branch ?? '(unknown)'}`,
    `worktree: ${report.repo.worktree ?? '(unknown)'}`,
    `upstream: ${report.repo.upstream.name ?? '(none)'} ahead=${report.repo.upstream.ahead} behind=${report.repo.upstream.behind}`,
    `dirty: ${report.worktree.dirty ? 'yes' : 'no'} staged=${report.worktree.counts.staged} unstaged=${report.worktree.counts.unstaged} untracked=${report.worktree.counts.untracked} conflicted=${report.worktree.counts.conflicted}`,
    'checks:',
    ...report.checks.map((check) => `- ${check.id}: ${check.status} - ${check.summary}`),
    'next commands:',
    ...report.guidance.commands.map((command) => `- ${command}`),
  ];

  return `${lines.join('\n')}\n`;
}

export function resolveStrictExitCode(report) {
  if (report.top_status === 'healthy') return 0;
  if (report.top_status === 'warning') return 20;
  if (report.top_status === 'blocked') return 30;
  return 40;
}
