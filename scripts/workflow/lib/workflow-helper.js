import path from 'node:path';

const PROTECTED_BRANCHES = new Set(['main', 'master']);
const PROTECTED_BRANCH_PREFIXES = ['baseline/'];

export function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export function buildTaskNames({
  id,
  slug,
} = {}) {
  const normalizedId = String(id ?? '').trim();
  const normalizedSlug = normalizeSlug(slug);

  if (normalizedId === '') {
    throw new Error('task id is required');
  }

  if (normalizedSlug === '') {
    throw new Error('task slug is required');
  }

  return {
    branchName: `task/${normalizedId}-${normalizedSlug}`,
    worktreeName: `task-${normalizedId}--${normalizedSlug}`,
  };
}

export function parseTaskIdentifier({
  branchName,
} = {}) {
  const normalizedBranchName = String(branchName ?? '').trim();
  const match = /^task\/(.+?)-([a-z0-9][a-z0-9-]*)$/.exec(normalizedBranchName);

  if (!match) {
    throw new Error(`unsupported task branch: ${normalizedBranchName}`);
  }

  const [, id, slug] = match;

  return {
    id,
    slug,
    branchName: normalizedBranchName,
    worktreeName: `task-${id}--${slug}`,
  };
}

export function buildTaskPaths({
  repoRoot,
  branchName,
  worktreeName,
} = {}) {
  const normalizedRepoRoot = String(repoRoot ?? '').trim();
  const normalizedBranchName = String(branchName ?? '').trim();
  const normalizedWorktreeName = String(worktreeName ?? '').trim();

  if (normalizedRepoRoot === '') {
    throw new Error('repo root is required');
  }

  if (normalizedBranchName === '') {
    throw new Error('branch name is required');
  }

  if (normalizedWorktreeName === '') {
    throw new Error('worktree name is required');
  }

  return {
    branchName: normalizedBranchName,
    worktreeName: normalizedWorktreeName,
    worktreePath: path.join(normalizedRepoRoot, '.worktrees', normalizedWorktreeName),
  };
}

export function buildBaselineSyncPlan({
  repoRoot,
} = {}) {
  const normalizedRepoRoot = String(repoRoot ?? '').trim();

  if (normalizedRepoRoot === '') {
    throw new Error('repo root is required');
  }

  return {
    baselineRootPath: normalizedRepoRoot,
    commands: [
      `git -C ${normalizedRepoRoot} fetch origin --prune`,
      `git -C ${normalizedRepoRoot} pull --ff-only`,
    ],
  };
}

function trimText(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function isProtectedBranchName(branchName) {
  const normalizedBranch = trimText(branchName);
  if (normalizedBranch == null) return false;
  if (PROTECTED_BRANCHES.has(normalizedBranch)) return true;
  return PROTECTED_BRANCH_PREFIXES.some((prefix) => normalizedBranch.startsWith(prefix));
}

function normalizeStatusSummary(statusSummary = {}) {
  const untrackedFileCount = Number.isInteger(statusSummary.untrackedFileCount)
    ? statusSummary.untrackedFileCount
    : 0;
  const stagedChanges = Boolean(statusSummary.stagedChanges);
  const unstagedChanges = Boolean(statusSummary.unstagedChanges);
  const untrackedFileSamples = Array.isArray(statusSummary.untrackedFileSamples)
    ? statusSummary.untrackedFileSamples
    : [];

  return {
    stagedChanges,
    unstagedChanges,
    untrackedFileCount,
    untrackedFileSamples,
    worktreeDirty: Boolean(statusSummary.worktreeDirty)
      || stagedChanges
      || unstagedChanges
      || untrackedFileCount > 0,
  };
}

export function buildCodexPreflightReport({
  branchName,
  upstreamName = null,
  aheadCount = 0,
  behindCount = 0,
  statusSummary = {},
} = {}) {
  const normalizedBranch = trimText(branchName);
  const normalizedUpstream = trimText(upstreamName);
  const normalizedAhead = Number.isInteger(aheadCount) ? aheadCount : 0;
  const normalizedBehind = Number.isInteger(behindCount) ? behindCount : 0;
  const normalizedStatus = normalizeStatusSummary(statusSummary);
  const protectedBranch = isProtectedBranchName(normalizedBranch);
  const requiredActions = [];

  if (normalizedStatus.worktreeDirty) {
    requiredActions.push('classify existing dirty files as related or unrelated before editing');
    requiredActions.push('stash or commit unrelated dirty files before editing');
  }

  if (normalizedBehind > 0) {
    requiredActions.push(
      protectedBranch
        ? 'sync the protected baseline branch before creating long-lived work'
        : 'rebase, merge, or explicitly defer upstream sync before continuing',
    );
  }

  if (protectedBranch) {
    requiredActions.push('create a codex/* or task/* branch before committing');
  }

  return {
    ok: requiredActions.length === 0,
    branch: normalizedBranch,
    upstream: normalizedUpstream,
    ahead_count: normalizedAhead,
    behind_count: normalizedBehind,
    branch_policy: protectedBranch
      ? 'protected_branch_requires_codex_or_task_branch_before_commit'
      : 'current_branch_allowed',
    sync_policy: normalizedBehind > 0
      ? 'behind_upstream_requires_sync_or_stash_before_work'
      : 'up_to_date',
    worktree_policy: normalizedStatus.worktreeDirty
      ? 'dirty_requires_classify_stash_commit_or_clean'
      : 'clean',
    status_summary: normalizedStatus,
    required_actions: requiredActions,
  };
}

export function buildTaskCloseoutPlan({
  repoRoot,
  branchName,
  worktreeName,
  aoRetireCommand = null,
} = {}) {
  const taskPaths = buildTaskPaths({
    repoRoot,
    branchName,
    worktreeName,
  });

  return {
    branchName: taskPaths.branchName,
    worktreePath: taskPaths.worktreePath,
    baselineRootPath: repoRoot,
    commands: [
      ...(aoRetireCommand ? [aoRetireCommand] : []),
      `git -C ${repoRoot} worktree remove ${taskPaths.worktreePath}`,
      `git -C ${repoRoot} branch -d ${taskPaths.branchName}`,
      `git -C ${repoRoot} fetch origin --prune`,
      `git -C ${repoRoot} pull --ff-only`,
    ],
  };
}
