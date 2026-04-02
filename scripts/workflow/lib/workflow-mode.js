export const WORKFLOW_MODE_FORMAL = 'formal';
export const WORKFLOW_MODE_LIGHT_DIRECT_MINIMAL = 'light-direct-minimal';

export const LIGHT_DIRECT_MINIMAL_ALLOWED_PREFIXES = Object.freeze([
  'docs/reports/',
]);

function normalizeRepoPath(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/u, '')
    .replace(/^\/+/u, '')
    .replace(/\/+/g, '/');

  return normalized === '' ? null : normalized;
}

export function isLightDirectMinimalPath(filePath) {
  const normalizedPath = normalizeRepoPath(filePath);
  if (normalizedPath == null) return false;

  return LIGHT_DIRECT_MINIMAL_ALLOWED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

export function classifyWorkflowModeByPaths(filePaths = []) {
  const normalizedPaths = Array.from(
    new Set(
      filePaths
        .map((filePath) => normalizeRepoPath(filePath))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  if (normalizedPaths.length === 0) {
    return {
      mode: WORKFLOW_MODE_FORMAL,
      reason: 'no_paths',
      normalizedPaths,
      disallowedPaths: [],
    };
  }

  const disallowedPaths = normalizedPaths.filter((filePath) => !isLightDirectMinimalPath(filePath));
  if (disallowedPaths.length === 0) {
    return {
      mode: WORKFLOW_MODE_LIGHT_DIRECT_MINIMAL,
      reason: 'light_direct_minimal_allowlist',
      normalizedPaths,
      disallowedPaths,
    };
  }

  return {
    mode: WORKFLOW_MODE_FORMAL,
    reason: 'formal_required',
    normalizedPaths,
    disallowedPaths,
  };
}
