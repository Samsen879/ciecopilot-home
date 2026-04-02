import path from 'node:path';

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
  baselineWorktreePath,
} = {}) {
  const normalizedRepoRoot = String(repoRoot ?? '').trim();
  const normalizedBaselineWorktreePath = String(baselineWorktreePath ?? '').trim();

  if (normalizedRepoRoot === '') {
    throw new Error('repo root is required');
  }

  if (normalizedBaselineWorktreePath === '') {
    throw new Error('baseline worktree path is required');
  }

  return {
    baselineWorktreePath: normalizedBaselineWorktreePath,
    commands: [
      `git -C ${normalizedRepoRoot} fetch origin --prune`,
      `git -C ${normalizedBaselineWorktreePath} pull --ff-only`,
    ],
  };
}

export function buildTaskCloseoutPlan({
  repoRoot,
  baselineWorktreePath,
  branchName,
  worktreeName,
} = {}) {
  const taskPaths = buildTaskPaths({
    repoRoot,
    branchName,
    worktreeName,
  });

  const normalizedBaselineWorktreePath = String(baselineWorktreePath ?? '').trim();
  if (normalizedBaselineWorktreePath === '') {
    throw new Error('baseline worktree path is required');
  }

  return {
    branchName: taskPaths.branchName,
    worktreePath: taskPaths.worktreePath,
    baselineWorktreePath: normalizedBaselineWorktreePath,
    commands: [
      `git -C ${repoRoot} worktree remove ${taskPaths.worktreePath}`,
      `git -C ${repoRoot} branch -d ${taskPaths.branchName}`,
      `git -C ${repoRoot} fetch origin --prune`,
      `git -C ${normalizedBaselineWorktreePath} pull --ff-only`,
    ],
  };
}
