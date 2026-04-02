import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROTECTED_BRANCHES = new Set(['main', 'master']);
const PROTECTED_BRANCH_PREFIXES = ['baseline/'];

function trimText(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function createResult(ok, code, messageLines, details = {}) {
  return {
    ok,
    code,
    messageLines,
    details,
  };
}

export function isProtectedBranchName(branchName) {
  const normalizedBranch = trimText(branchName);
  if (normalizedBranch == null) return false;
  if (PROTECTED_BRANCHES.has(normalizedBranch)) return true;
  return PROTECTED_BRANCH_PREFIXES.some((prefix) => normalizedBranch.startsWith(prefix));
}

function branchNameFromRef(refName) {
  const normalizedRef = trimText(refName);
  if (normalizedRef == null) return null;
  if (normalizedRef.startsWith('refs/heads/')) return normalizedRef.slice('refs/heads/'.length);
  return normalizedRef;
}

export function isProtectedRemoteRef(refName) {
  return isProtectedBranchName(branchNameFromRef(refName));
}

export function parsePrePushStdin(stdinText) {
  return String(stdinText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/, 4);
      return {
        localRef,
        localSha,
        remoteRef,
        remoteSha,
      };
    })
    .filter((update) => update.localRef && update.localSha && update.remoteRef && update.remoteSha);
}

export function parseStatusPorcelain(stdout) {
  const lines = String(stdout ?? '')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter(Boolean);

  let stagedChanges = false;
  let unstagedChanges = false;
  const untrackedFiles = [];

  for (const line of lines) {
    if (line.startsWith('## ')) continue;
    if (line.startsWith('?? ')) {
      untrackedFiles.push(line.slice(3));
      continue;
    }

    const indexStatus = line[0] ?? ' ';
    const worktreeStatus = line[1] ?? ' ';
    if (indexStatus !== ' ') stagedChanges = true;
    if (worktreeStatus !== ' ') unstagedChanges = true;
  }

  return {
    stagedChanges,
    unstagedChanges,
    untrackedFileCount: untrackedFiles.length,
    untrackedFileSamples: untrackedFiles.slice(0, 5).sort((left, right) => left.localeCompare(right)),
    worktreeDirty: stagedChanges || unstagedChanges || untrackedFiles.length > 0,
  };
}

export function evaluatePreCommitGuardrail({
  currentBranch,
} = {}) {
  if (trimText(currentBranch) == null) {
    return createResult(false, 'branch_unavailable', [
      '[git guardrails] 当前分支不可识别，已阻止 commit。',
      '请先切到一个明确的任务分支后再提交。',
    ]);
  }

  if (isProtectedBranchName(currentBranch)) {
    return createResult(false, 'protected_branch_commit_blocked', [
      `[git guardrails] 已阻止在受保护分支 \`${currentBranch}\` 上直接 commit。`,
      '请从干净 baseline 新开 task branch + worktree，再在任务分支里提交。',
    ], {
      currentBranch,
    });
  }

  return createResult(true, 'ok', []);
}

function formatDirtySummary(statusSummary) {
  const parts = [];
  if (statusSummary?.stagedChanges) parts.push('有 staged 变更');
  if (statusSummary?.unstagedChanges) parts.push('有 unstaged 变更');
  if ((statusSummary?.untrackedFileCount ?? 0) > 0) {
    parts.push(`有 ${statusSummary.untrackedFileCount} 个未跟踪文件`);
  }
  return parts.join('，');
}

export function evaluatePrePushGuardrail({
  currentBranch,
  worktreeDirty,
  pushUpdates = [],
  statusSummary = null,
} = {}) {
  if (trimText(currentBranch) == null) {
    return createResult(false, 'branch_unavailable', [
      '[git guardrails] 当前分支不可识别，已阻止 push。',
      '请先切到一个明确的任务分支后再推送。',
    ]);
  }

  if (isProtectedBranchName(currentBranch)) {
    return createResult(false, 'protected_branch_push_blocked', [
      `[git guardrails] 已阻止从受保护分支 \`${currentBranch}\` 直接 push。`,
      '受保护分支只作为 baseline 或远端主线镜像使用，不作为日常开发分支。',
    ], {
      currentBranch,
    });
  }

  const protectedTarget = pushUpdates.find((update) => isProtectedRemoteRef(update.remoteRef));
  if (protectedTarget) {
    return createResult(false, 'protected_branch_push_blocked', [
      `[git guardrails] 已阻止把内容直接推到受保护分支 \`${branchNameFromRef(protectedTarget.remoteRef)}\`。`,
      '请先推到任务分支并通过 PR 合入主线。',
    ], {
      currentBranch,
      protectedRemoteRef: protectedTarget.remoteRef,
    });
  }

  if (worktreeDirty) {
    const dirtySummary = formatDirtySummary(statusSummary);
    const dirtySamples = statusSummary?.untrackedFileSamples?.length > 0
      ? `未跟踪样例：${statusSummary.untrackedFileSamples.join(', ')}`
      : null;

    return createResult(false, 'dirty_worktree_push_blocked', [
      '[git guardrails] 当前 worktree 仍然是脏的，已阻止 push。',
      dirtySummary ? `检测结果：${dirtySummary}。` : '请先把当前工作区收干净。',
      dirtySamples,
      '请先 commit、stash 或清理剩余改动，再执行 push。',
    ].filter(Boolean), {
      currentBranch,
      statusSummary,
    });
  }

  return createResult(true, 'ok', []);
}

function runGit(args, cwd) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
}

function readCurrentBranch(cwd) {
  const result = runGit(['branch', '--show-current'], cwd);
  if (result.status !== 0) return null;
  return trimText(result.stdout);
}

function readStatusSummary(cwd) {
  const result = runGit(['status', '--porcelain=v1', '--branch'], cwd);
  if (result.status !== 0) {
    return {
      stagedChanges: false,
      unstagedChanges: false,
      untrackedFileCount: 0,
      untrackedFileSamples: [],
      worktreeDirty: false,
    };
  }

  return parseStatusPorcelain(result.stdout);
}

export function runPreCommitGuardrail({ cwd = process.cwd() } = {}) {
  const currentBranch = readCurrentBranch(cwd);
  return evaluatePreCommitGuardrail({ currentBranch });
}

export function runPrePushGuardrail({
  cwd = process.cwd(),
  stdinText = readFileSync(0, 'utf8'),
} = {}) {
  const currentBranch = readCurrentBranch(cwd);
  const statusSummary = readStatusSummary(cwd);
  const pushUpdates = parsePrePushStdin(stdinText);

  return evaluatePrePushGuardrail({
    currentBranch,
    worktreeDirty: statusSummary.worktreeDirty,
    pushUpdates,
    statusSummary,
  });
}

export function formatGuardrailOutput(result) {
  return result.messageLines.join('\n');
}

function parseCliArgs(argv) {
  const args = { hook: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--hook') {
      args.hook = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return args;
}

export function main(argv = process.argv.slice(2)) {
  const { hook } = parseCliArgs(argv);

  if (hook !== 'pre-commit' && hook !== 'pre-push') {
    console.error('Usage: node scripts/git-hooks/guardrails.js --hook <pre-commit|pre-push>');
    process.exitCode = 2;
    return;
  }

  const result = hook === 'pre-commit'
    ? runPreCommitGuardrail()
    : runPrePushGuardrail();

  if (!result.ok) {
    console.error(formatGuardrailOutput(result));
    process.exitCode = 1;
    return;
  }

  process.exitCode = 0;
}

const entryScriptUrl = process.argv[1] != null ? new URL(`file://${process.argv[1]}`).href : null;
if (import.meta.url === entryScriptUrl) {
  main();
}
