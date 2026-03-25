import { spawnSync } from 'node:child_process';
import { readAoFixture } from './fixture-support.js';

export const DEFAULT_FRESHNESS_THRESHOLD_MS = 15 * 60 * 1000;

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseRelativeLastActivity(value, now) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'just now') return toIsoString(now);

  const match = normalized.match(/^(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)\s+ago$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unitToken = match[2];
  const nowMs = new Date(now).getTime();

  if (!Number.isFinite(amount) || Number.isNaN(nowMs)) return null;

  let unitMs;
  switch (unitToken) {
    case 's':
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
      unitMs = 1000;
      break;
    case 'm':
    case 'min':
    case 'mins':
    case 'minute':
    case 'minutes':
      unitMs = 60 * 1000;
      break;
    case 'h':
    case 'hr':
    case 'hrs':
    case 'hour':
    case 'hours':
      unitMs = 60 * 60 * 1000;
      break;
    case 'd':
    case 'day':
    case 'days':
      unitMs = 24 * 60 * 60 * 1000;
      break;
    case 'w':
    case 'week':
    case 'weeks':
      unitMs = 7 * 24 * 60 * 60 * 1000;
      break;
    default:
      return null;
  }

  return new Date(nowMs - (amount * unitMs)).toISOString();
}

function normalizeInteger(value) {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const normalized = Number(value);
  return Number.isInteger(normalized) ? normalized : null;
}

function classifyFreshness(lastSeenAt, now, staleAfterMs = DEFAULT_FRESHNESS_THRESHOLD_MS) {
  const normalizedLastSeenAt = toIsoString(lastSeenAt);
  if (!normalizedLastSeenAt) {
    return {
      status: 'unknown',
      observed_at: null,
      stale_after_ms: staleAfterMs,
      reason: 'missing_last_seen_at',
    };
  }

  const nowMs = new Date(now).getTime();
  const lastSeenMs = new Date(normalizedLastSeenAt).getTime();
  if (Number.isNaN(nowMs) || Number.isNaN(lastSeenMs)) {
    return {
      status: 'unknown',
      observed_at: normalizedLastSeenAt,
      stale_after_ms: staleAfterMs,
      reason: 'invalid_timestamp',
    };
  }

  return {
    status: nowMs - lastSeenMs > staleAfterMs ? 'stale' : 'fresh',
    observed_at: normalizedLastSeenAt,
    stale_after_ms: staleAfterMs,
    reason: null,
  };
}

function normalizeSession(session, now, staleAfterMs) {
  const lastSeenAt = session.updatedAt
    ?? session.lastSeenAt
    ?? session.observedAt
    ?? parseRelativeLastActivity(session.lastActivity, now)
    ?? null;
  const issueNumber = session.issueNumber ?? session.issue ?? null;
  const lifecycleState = session.lifecycleState ?? session.status ?? null;
  const linkageBasis = [];
  if (session.prNumber != null) linkageBasis.push('session_pr_number');
  if (session.branch != null) linkageBasis.push('session_branch');
  if (issueNumber != null) linkageBasis.push('issue_metadata');
  if (!linkageBasis.length) linkageBasis.push('unknown');

  return {
    session_name: String(session.name ?? session.sessionName ?? 'unknown-session'),
    session_runtime_id: session.id != null ? String(session.id) : String(session.name ?? session.sessionName ?? 'unknown-session'),
    session_role: session.role === 'orchestrator' || session.role === 'worker' ? session.role : 'unknown',
    issue_number: normalizeInteger(issueNumber),
    branch_name: session.branch != null ? String(session.branch) : null,
    pr_number: normalizeInteger(session.prNumber),
    lifecycle_state: lifecycleState != null ? String(lifecycleState) : null,
    agent_label: session.agent != null ? String(session.agent) : null,
    observed_owner_hint: session.ownerHint != null ? String(session.ownerHint) : null,
    linkage_basis: linkageBasis,
    worktree_path: session.worktreePath != null ? String(session.worktreePath) : null,
    last_seen_at: toIsoString(lastSeenAt),
    freshness: classifyFreshness(lastSeenAt, now, staleAfterMs),
  };
}

function buildEmptyObservation(projectId, now, sourceError = null) {
  return {
    project_id: projectId,
    observed_at: toIsoString(now) ?? new Date().toISOString(),
    source_ok: sourceError == null,
    source_error: sourceError,
    orchestrator: null,
    workers: [],
    raw_summary: {
      session_count: 0,
      orchestrator_count: 0,
      orchestrator_session_names: [],
      worker_count: 0,
      branch_count: 0,
      pr_count: 0,
    },
  };
}

export async function loadAoProjectObservation({
  projectId,
  now = new Date().toISOString(),
  staleAfterMs = DEFAULT_FRESHNESS_THRESHOLD_MS,
} = {}) {
  const fixture = readAoFixture('ao-status.json');
  if (fixture) {
    let parsed;
    try {
      parsed = JSON.parse(fixture.text || '{}');
    } catch (error) {
      return buildEmptyObservation(projectId, now, `invalid ao fixture json: ${error.message}`);
    }

    const sessions = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed.sessions) ? parsed.sessions : []);
    const normalizedSessions = sessions.map((session) => normalizeSession(session, now, staleAfterMs));
    const orchestrators = normalizedSessions.filter((session) => session.session_role === 'orchestrator');
    const workers = normalizedSessions.filter((session) => session.session_role === 'worker');

    return {
      project_id: String(parsed.project?.id ?? parsed.projectId ?? projectId),
      observed_at: toIsoString(now) ?? new Date().toISOString(),
      source_ok: true,
      source_error: null,
      orchestrator: orchestrators[0] ?? null,
      workers,
      raw_summary: {
        session_count: normalizedSessions.length,
        orchestrator_count: orchestrators.length,
        orchestrator_session_names: orchestrators.map((session) => session.session_name),
        worker_count: workers.length,
        branch_count: new Set(normalizedSessions.map((session) => session.branch_name).filter(Boolean)).size,
        pr_count: new Set(normalizedSessions.map((session) => session.pr_number).filter((value) => value != null)).size,
      },
    };
  }

  const result = spawnSync('ao', ['status', '-p', projectId, '--json'], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const errorMessage = (result.stderr || result.stdout || 'ao status failed').trim();
    return buildEmptyObservation(projectId, now, errorMessage);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout || '{}');
  } catch (error) {
    return buildEmptyObservation(projectId, now, `invalid ao json: ${error.message}`);
  }

  const sessions = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed.sessions) ? parsed.sessions : []);
  const normalizedSessions = sessions.map((session) => normalizeSession(session, now, staleAfterMs));
  const orchestrators = normalizedSessions.filter((session) => session.session_role === 'orchestrator');
  const workers = normalizedSessions.filter((session) => session.session_role === 'worker');

  return {
    project_id: String(parsed.project?.id ?? parsed.projectId ?? projectId),
    observed_at: toIsoString(now) ?? new Date().toISOString(),
    source_ok: true,
    source_error: null,
    orchestrator: orchestrators[0] ?? null,
    workers,
    raw_summary: {
      session_count: normalizedSessions.length,
      orchestrator_count: orchestrators.length,
      orchestrator_session_names: orchestrators.map((session) => session.session_name),
      worker_count: workers.length,
      branch_count: new Set(normalizedSessions.map((session) => session.branch_name).filter(Boolean)).size,
      pr_count: new Set(normalizedSessions.map((session) => session.pr_number).filter((value) => value != null)).size,
    },
  };
}
