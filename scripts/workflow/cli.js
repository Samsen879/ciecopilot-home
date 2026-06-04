import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  buildCodexPreflightReport,
  collectCodexPreflightObservation,
  renderCodexPreflightText,
  resolveStrictExitCode,
} from './lib/codex-preflight.js';
import {
  buildBaselineSyncPlan,
  buildTaskCloseoutPlan,
  buildTaskNames,
  buildTaskPaths,
  parseTaskIdentifier,
} from './lib/workflow-helper.js';

const DEFAULT_BASELINE_BRANCH_NAME = 'baseline/origin-main';
const DEFAULT_TASK_BASE_REF = DEFAULT_BASELINE_BRANCH_NAME;
const CONFIRMATION_TEXT = 'closeout';

function printUsage() {
  console.error(`Usage:
  node scripts/workflow/cli.js codex-preflight [--json] [--strict]
  node scripts/workflow/cli.js baseline-sync [--dry-run]
  node scripts/workflow/cli.js task-create --id <id> --slug <slug> [--base <ref>] [--dry-run]
  node scripts/workflow/cli.js task-closeout (--id <id> --slug <slug> | --branch <branch>) [--dry-run]`);
}

function runGit(args, cwd) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
}

function trimText(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function resolveRepoRoot(cwd = process.cwd()) {
  return path.dirname(resolveGitCommonDir(cwd));
}

function resolveGitCommonDir(cwd = process.cwd()) {
  const commonDirResult = runGit(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd);
  if (commonDirResult.status !== 0) {
    throw new Error(trimText(commonDirResult.stderr) ?? 'failed to resolve git common dir');
  }

  const commonDir = trimText(commonDirResult.stdout);
  if (commonDir == null) {
    throw new Error('git common dir is empty');
  }

  return commonDir;
}

function printCommand(args, cwd) {
  const renderedCwd = trimText(cwd);
  const renderedArgs = args.map((arg) => (/[\s"]/u.test(arg) ? JSON.stringify(arg) : arg)).join(' ');
  if (renderedCwd) {
    console.log(`+ (cd ${renderedCwd} && ${renderedArgs})`);
    return;
  }

  console.log(`+ ${renderedArgs}`);
}

function execOrPreview(args, cwd, dryRun) {
  printCommand(args, cwd);
  if (dryRun) return;

  const [command, ...rest] = args;
  const result = spawnSync(command, rest, {
    cwd,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    json: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--dry-run':
        parsed.dryRun = true;
        break;
      case '--json':
        parsed.json = true;
        break;
      case '--strict':
        parsed.strict = true;
        break;
      case '--id':
        parsed.id = argv[index + 1];
        index += 1;
        break;
      case '--slug':
        parsed.slug = argv[index + 1];
        index += 1;
        break;
      case '--branch':
        parsed.branchName = argv[index + 1];
        index += 1;
        break;
      case '--base':
        parsed.baseRef = argv[index + 1];
        index += 1;
        break;
      case '--baseline-branch':
        parsed.baselineBranchName = argv[index + 1];
        index += 1;
        break;
      case '--confirm':
        parsed.confirm = argv[index + 1];
        index += 1;
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  return parsed;
}

async function handleCodexPreflight(options) {
  const observation = collectCodexPreflightObservation();
  const report = buildCodexPreflightReport(observation);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(renderCodexPreflightText(report));
  }

  if (options.strict) {
    process.exitCode = resolveStrictExitCode(report);
    return;
  }

  process.exitCode = report.top_status === 'source_failure' ? 1 : 0;
}

function ensureHooksInstalled() {
  const repoRoot = resolveRepoRoot();
  const gitCommonDir = resolveGitCommonDir();
  const hooksPathResult = runGit(['config', '--get', 'core.hooksPath'], repoRoot);
  const hooksPath = trimText(hooksPathResult.stdout);
  const expectedHooksPath = path.join(gitCommonDir, 'ao-hooks');

  if (hooksPath !== expectedHooksPath || !fs.existsSync(expectedHooksPath)) {
    throw new Error('git hooks are not installed; run `npm run git:hooks:install` from the repo root first');
  }
}

async function handleBaselineSync(options) {
  const repoRoot = resolveRepoRoot();
  ensureHooksInstalled();

  const plan = buildBaselineSyncPlan({
    repoRoot,
  });

  execOrPreview(['git', '-C', repoRoot, 'fetch', 'origin', '--prune'], repoRoot, options.dryRun);
  execOrPreview(['git', '-C', plan.baselineRootPath, 'pull', '--ff-only'], repoRoot, options.dryRun);
}

function resolveTaskIdentity(options) {
  if (trimText(options.branchName)) {
    return parseTaskIdentifier({
      branchName: options.branchName,
    });
  }

  const names = buildTaskNames({
    id: options.id,
    slug: options.slug,
  });

  return {
    id: String(options.id).trim(),
    slug: String(options.slug).trim(),
    ...names,
  };
}

async function handleTaskCreate(options) {
  const repoRoot = resolveRepoRoot();
  ensureHooksInstalled();

  const identity = resolveTaskIdentity(options);
  const taskPaths = buildTaskPaths({
    repoRoot,
    branchName: identity.branchName,
    worktreeName: identity.worktreeName,
  });

  if (fs.existsSync(taskPaths.worktreePath)) {
    throw new Error(`task worktree already exists: ${taskPaths.worktreePath}`);
  }

  const baseRef = trimText(options.baseRef) ?? trimText(options.baselineBranchName) ?? DEFAULT_TASK_BASE_REF;

  execOrPreview(['git', 'fetch', 'origin', '--prune'], repoRoot, options.dryRun);
  execOrPreview(
    ['git', 'worktree', 'add', taskPaths.worktreePath, '-b', taskPaths.branchName, baseRef],
    repoRoot,
    options.dryRun,
  );

  console.log(`task branch: ${taskPaths.branchName}`);
  console.log(`task worktree: ${taskPaths.worktreePath}`);
  console.log('next: write a very short brief with goal / done / non-goal');
}

function renderCloseoutPlan(plan) {
  console.log('Closeout plan:');
  console.log(`- branch: ${plan.branchName}`);
  console.log(`- worktree: ${plan.worktreePath}`);
  console.log(`- baseline: ${plan.baselineRootPath}`);
  console.log('- commands:');
  for (const command of plan.commands) {
    console.log(`  ${command}`);
  }
}

async function confirmCloseout(explicitConfirmation = null) {
  if (trimText(explicitConfirmation) != null) {
    return trimText(explicitConfirmation) === CONFIRMATION_TEXT;
  }

  if (!input.isTTY) {
    output.write(`Type \`${CONFIRMATION_TEXT}\` to continue: `);
    const captured = fs.readFileSync(0, 'utf8');
    const firstLine = String(captured ?? '').split(/\r?\n/, 1)[0];
    return trimText(firstLine) === CONFIRMATION_TEXT;
  }

  const rl = readline.createInterface({
    input,
    output,
  });

  try {
    const answer = await rl.question(`Type \`${CONFIRMATION_TEXT}\` to continue: `);
    return trimText(answer) === CONFIRMATION_TEXT;
  } finally {
    rl.close();
  }
}

function currentWorktreePath(cwd = process.cwd()) {
  const result = runGit(['rev-parse', '--show-toplevel'], cwd);
  if (result.status !== 0) return null;
  return trimText(result.stdout);
}

function resolveAoRetireCommand(repoRoot, identity) {
  const aoManageScript = path.join(repoRoot, 'scripts', 'ao-manage.js');
  if (!fs.existsSync(aoManageScript)) {
    return null;
  }

  const issueNumber = Number.parseInt(String(identity?.id ?? '').trim(), 10);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    return null;
  }

  return ['node', 'scripts/ao-manage.js', 'retire', '--issue', String(issueNumber), '--reason', 'workflow_task_closeout'];
}

async function handleTaskCloseout(options) {
  const repoRoot = resolveRepoRoot();
  ensureHooksInstalled();
  const identity = resolveTaskIdentity(options);
  const aoRetireCommand = resolveAoRetireCommand(repoRoot, identity);

  const plan = buildTaskCloseoutPlan({
    repoRoot,
    branchName: identity.branchName,
    worktreeName: identity.worktreeName,
    aoRetireCommand: aoRetireCommand == null ? null : aoRetireCommand.join(' '),
  });

  if (!fs.existsSync(plan.worktreePath)) {
    throw new Error(`task worktree does not exist: ${plan.worktreePath}`);
  }

  const activeWorktree = currentWorktreePath();
  if (activeWorktree === plan.worktreePath) {
    throw new Error('cannot close out the current active worktree; switch to repo root or baseline first');
  }

  renderCloseoutPlan(plan);

  if (options.dryRun) {
    return;
  }

  const confirmed = await confirmCloseout(options.confirm);
  if (!confirmed) {
    console.error('closeout aborted');
    process.exitCode = 1;
    return;
  }

  if (aoRetireCommand) {
    execOrPreview(aoRetireCommand, repoRoot, false);
  }
  execOrPreview(['git', 'worktree', 'remove', plan.worktreePath], repoRoot, false);
  execOrPreview(['git', 'branch', '-d', plan.branchName], repoRoot, false);
  execOrPreview(['git', 'fetch', 'origin', '--prune'], repoRoot, false);
  execOrPreview(['git', '-C', plan.baselineRootPath, 'pull', '--ff-only'], repoRoot, false);
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  if (!subcommand) {
    printUsage();
    process.exitCode = 2;
    return;
  }

  let options;
  try {
    options = parseArgs(rest);
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exitCode = 2;
    return;
  }

  try {
    if (subcommand === 'codex-preflight') {
      await handleCodexPreflight(options);
      return;
    }

    if (subcommand === 'baseline-sync') {
      await handleBaselineSync(options);
      return;
    }

    if (subcommand === 'task-create') {
      await handleTaskCreate(options);
      return;
    }

    if (subcommand === 'task-closeout') {
      await handleTaskCloseout(options);
      return;
    }

    throw new Error(`unknown subcommand: ${subcommand}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

await main();
