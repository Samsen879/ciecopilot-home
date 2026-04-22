import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeWindowsProviderPath(value) {
  return normalizeString(value).replace(/^Microsoft\.PowerShell\.Core\\FileSystem::/iu, '');
}

export function buildWindowsHostNodeModulesCandidates(repoRoot) {
  return buildWindowsHostRepoRootCandidates(repoRoot)
    .map((candidate) => path.win32.join(candidate, 'node_modules'));
}

export function buildWindowsHostRepoRootCandidates(repoRoot) {
  const normalizedRepoRoot = normalizeWindowsProviderPath(repoRoot).replace(/[\\/]+$/u, '');
  if (!normalizedRepoRoot) {
    return [];
  }

  const candidates = [normalizedRepoRoot];
  const worktreeMatch = normalizedRepoRoot.match(
    /^(\\\\wsl(?:\.localhost|\$)\\[^\\]+\\home\\[^\\]+)\\\.worktrees\\([^\\]+)\\[^\\]+$/iu,
  );

  if (worktreeMatch) {
    const [, homePrefix, repoName] = worktreeMatch;
    candidates.push(path.win32.join(homePrefix, 'code', repoName));
  }

  return unique(candidates);
}

export function findWindowsHostRepoRoot(repoRoot, pathExists = fs.existsSync) {
  const candidates = buildWindowsHostRepoRootCandidates(repoRoot);
  const preferredCandidates = candidates.length > 1
    ? [...candidates.slice(1), candidates[0]]
    : candidates;

  for (const candidate of preferredCandidates) {
    if (pathExists(path.win32.join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return null;
}

export function findWindowsHostNodeModulesPath(repoRoot, pathExists = fs.existsSync) {
  for (const candidate of buildWindowsHostNodeModulesCandidates(repoRoot)) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    kind: 'node-modules',
    repoRoot: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--kind') {
      options.kind = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === '--repo-root') {
      options.repoRoot = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return options;
}

export function isWindowsHostNodePathEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (isWindowsHostNodePathEntrypoint(process.argv[1], import.meta.url)) {
  const options = parseArgs();
  const resolved = options.kind === 'repo-root'
    ? findWindowsHostRepoRoot(options.repoRoot)
    : findWindowsHostNodeModulesPath(options.repoRoot);
  if (resolved) {
    process.stdout.write(`${resolved}\n`);
  }
}
