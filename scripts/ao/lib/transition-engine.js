import {
  CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
  createControllerLease,
  createManagedTask,
  createOwnershipLease,
  createPrBinding,
} from './state-contracts.js';

export const DEFAULT_OWNERSHIP_LEASE_DURATION_MS = 20 * 60 * 1000;
export const DEFAULT_CONTROLLER_LEASE_DURATION_MS = 5 * 60 * 1000;

function resolveNow(now) {
  if (typeof now === 'function') return resolveNow(now());
  if (typeof now === 'string' && now.trim() !== '') return now.trim();
  return new Date().toISOString();
}

function sanitizeToken(value) {
  return String(value)
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_');
}

function addMilliseconds(isoTimestamp, durationMs) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${isoTimestamp}`);
  }

  return new Date(date.getTime() + durationMs).toISOString();
}

function illegalTransition(kind, fromStatus, intent) {
  throw new Error(`Illegal ${kind} transition from ${fromStatus ?? 'missing'} via ${intent}`);
}

export function deriveManagedTaskId({ taskId = null, issueNumber = null } = {}) {
  if (typeof taskId === 'string' && taskId.trim() !== '') {
    return taskId.trim();
  }

  const normalizedIssueNumber = Number(issueNumber);
  if (Number.isInteger(normalizedIssueNumber) && normalizedIssueNumber > 0) {
    return `issue-${normalizedIssueNumber}`;
  }

  throw new Error('Missing managed-task identity');
}

export function buildPrBindingId({ taskId, prNumber } = {}) {
  return `binding-${sanitizeToken(taskId)}-pr-${Number(prNumber)}`;
}

export function buildOwnershipLeaseId({ taskId, ownerSessionName } = {}) {
  return `ownership-${sanitizeToken(taskId)}-${sanitizeToken(ownerSessionName)}`;
}

export function buildControllerLeaseId({
  controllerId = CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
  holderId,
} = {}) {
  return `controller-${sanitizeToken(controllerId)}-${sanitizeToken(holderId)}`;
}

export function transitionManagedTask({
  intent,
  existingTask = null,
  now = new Date().toISOString(),
  taskId = null,
  issueNumber = null,
  title = null,
  branchName = null,
  worktreePath = null,
  metadata = null,
} = {}) {
  const timestamp = resolveNow(now);
  const resolvedTaskId = existingTask?.task_id ?? deriveManagedTaskId({
    taskId,
    issueNumber: issueNumber ?? existingTask?.issue_number ?? null,
  });
  const resolvedIssueNumber = issueNumber ?? existingTask?.issue_number ?? null;
  const resolvedTitle = title ?? existingTask?.title ?? (resolvedIssueNumber != null ? `Issue #${resolvedIssueNumber}` : resolvedTaskId);
  const nextBranchName = branchName ?? existingTask?.branch_name ?? null;
  const nextWorktreePath = worktreePath ?? existingTask?.worktree_path ?? null;
  const nextMetadata = metadata ?? existingTask?.metadata ?? {};
  const currentStatus = existingTask?.status ?? null;

  switch (intent) {
    case 'enroll':
      if (currentStatus === 'retired') illegalTransition('managed-task', currentStatus, intent);
      return createManagedTask({
        task_id: resolvedTaskId,
        issue_number: resolvedIssueNumber,
        title: resolvedTitle,
        branch_name: nextBranchName,
        worktree_path: nextWorktreePath,
        status: 'active',
        created_at: existingTask?.created_at ?? timestamp,
        updated_at: timestamp,
        metadata: nextMetadata,
      });
    case 'adopt':
      if (!existingTask) illegalTransition('managed-task', currentStatus, intent);
      if (currentStatus === 'retired') illegalTransition('managed-task', currentStatus, intent);
      return createManagedTask({
        task_id: resolvedTaskId,
        issue_number: resolvedIssueNumber,
        title: resolvedTitle,
        branch_name: nextBranchName,
        worktree_path: nextWorktreePath,
        status: 'active',
        created_at: existingTask.created_at,
        updated_at: timestamp,
        metadata: nextMetadata,
      });
    case 'unmanage':
      if (!existingTask || currentStatus === 'retired') illegalTransition('managed-task', currentStatus, intent);
      return createManagedTask({
        task_id: resolvedTaskId,
        issue_number: resolvedIssueNumber,
        title: resolvedTitle,
        branch_name: nextBranchName,
        worktree_path: nextWorktreePath,
        status: 'paused',
        created_at: existingTask.created_at,
        updated_at: timestamp,
        metadata: nextMetadata,
      });
    case 'retire':
      if (!existingTask) illegalTransition('managed-task', currentStatus, intent);
      return createManagedTask({
        task_id: resolvedTaskId,
        issue_number: resolvedIssueNumber,
        title: resolvedTitle,
        branch_name: nextBranchName,
        worktree_path: nextWorktreePath,
        status: 'retired',
        created_at: existingTask.created_at,
        updated_at: timestamp,
        metadata: nextMetadata,
      });
    default:
      throw new Error(`Unsupported managed-task intent: ${intent}`);
  }
}

export function transitionPrBinding({
  intent,
  existingBinding = null,
  now = new Date().toISOString(),
  bindingId = null,
  taskId,
  prNumber = null,
  branchName = null,
  baseBranch = null,
  metadata = null,
  reason = null,
} = {}) {
  const timestamp = resolveNow(now);
  const currentStatus = existingBinding?.status ?? null;

  switch (intent) {
    case 'bind':
      if (currentStatus === 'closed') illegalTransition('pr-binding', currentStatus, intent);
      return createPrBinding({
        binding_id: bindingId ?? existingBinding?.binding_id ?? buildPrBindingId({
          taskId: taskId ?? existingBinding?.task_id,
          prNumber: prNumber ?? existingBinding?.pr_number,
        }),
        task_id: taskId ?? existingBinding?.task_id,
        pr_number: prNumber ?? existingBinding?.pr_number,
        branch_name: branchName ?? existingBinding?.branch_name ?? null,
        base_branch: baseBranch ?? existingBinding?.base_branch ?? null,
        status: 'bound',
        created_at: existingBinding?.created_at ?? timestamp,
        updated_at: timestamp,
        metadata: metadata ?? existingBinding?.metadata ?? {},
      });
    case 'release':
      if (!existingBinding || currentStatus !== 'bound') illegalTransition('pr-binding', currentStatus, intent);
      return createPrBinding({
        ...existingBinding,
        status: 'released',
        updated_at: timestamp,
        metadata: {
          ...(existingBinding.metadata ?? {}),
          release_reason: reason ?? null,
        },
      });
    default:
      throw new Error(`Unsupported PR binding intent: ${intent}`);
  }
}

function transitionLease({
  kind,
  intent,
  existingLease = null,
  factory,
  now = new Date().toISOString(),
  defaultDurationMs,
  reason = null,
  ...fields
} = {}) {
  const timestamp = resolveNow(now);
  const currentStatus = existingLease?.status ?? null;

  switch (intent) {
    case 'acquire':
      if (currentStatus === 'active') illegalTransition(`${kind} lease`, currentStatus, intent);
      return factory({
        ...existingLease,
        ...fields,
        status: 'active',
        acquired_at: timestamp,
        expires_at: fields.expiresAt ?? existingLease?.expires_at ?? addMilliseconds(timestamp, defaultDurationMs),
        released_at: null,
        release_reason: null,
        metadata: fields.metadata ?? existingLease?.metadata ?? {},
      });
    case 'release':
      if (!existingLease || currentStatus !== 'active') illegalTransition(`${kind} lease`, currentStatus, intent);
      return factory({
        ...existingLease,
        status: 'released',
        released_at: timestamp,
        release_reason: reason ?? 'released',
        metadata: existingLease.metadata ?? {},
      });
    case 'expire':
      if (!existingLease || currentStatus !== 'active') illegalTransition(`${kind} lease`, currentStatus, intent);
      return factory({
        ...existingLease,
        status: 'expired',
        released_at: timestamp,
        release_reason: reason ?? 'expired',
        metadata: existingLease.metadata ?? {},
      });
    default:
      throw new Error(`Unsupported ${kind} lease intent: ${intent}`);
  }
}

export function transitionOwnershipLease({
  intent,
  existingLease = null,
  now = new Date().toISOString(),
  leaseId = null,
  taskId = null,
  ownerSessionName = null,
  ownerSessionId = null,
  expiresAt = null,
  metadata = null,
  reason = null,
} = {}) {
  return transitionLease({
    kind: 'ownership',
    intent,
    existingLease,
    factory: createOwnershipLease,
    now,
    defaultDurationMs: DEFAULT_OWNERSHIP_LEASE_DURATION_MS,
    reason,
    lease_id: leaseId ?? existingLease?.lease_id,
    task_id: taskId ?? existingLease?.task_id,
    owner_session_name: ownerSessionName ?? existingLease?.owner_session_name,
    owner_session_id: ownerSessionId ?? existingLease?.owner_session_id ?? null,
    expiresAt,
    metadata,
  });
}

export function transitionControllerLease({
  intent,
  existingLease = null,
  now = new Date().toISOString(),
  leaseId = null,
  controllerId = CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
  holderId = null,
  holderType = 'session',
  expiresAt = null,
  metadata = null,
  reason = null,
} = {}) {
  return transitionLease({
    kind: 'controller',
    intent,
    existingLease,
    factory: createControllerLease,
    now,
    defaultDurationMs: DEFAULT_CONTROLLER_LEASE_DURATION_MS,
    reason,
    lease_id: leaseId ?? existingLease?.lease_id,
    controller_id: controllerId ?? existingLease?.controller_id,
    holder_id: holderId ?? existingLease?.holder_id,
    holder_type: holderType ?? existingLease?.holder_type ?? 'session',
    expiresAt,
    metadata,
  });
}
