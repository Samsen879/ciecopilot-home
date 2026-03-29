import { createStateRepository } from './state-repository.js';
import {
  buildOwnershipLeaseId,
  buildPrBindingId,
  deriveManagedTaskId,
  transitionManagedTask,
  transitionOwnershipLease,
  transitionPrBinding,
} from './transition-engine.js';

export const DEFAULT_PROJECT_ID = 'ciecopilot-home';

function resolveNow(now) {
  if (typeof now === 'function') return resolveNow(now());
  if (typeof now === 'string' && now.trim() !== '') return now.trim();
  return new Date().toISOString();
}

function matchesTaskIdentity(task, { taskId = null, issueNumber = null } = {}) {
  if (!task) return false;
  if (taskId && task.task_id === taskId) return true;
  if (issueNumber != null && task.issue_number === Number(issueNumber)) return true;
  return false;
}

function releaseActiveOwnershipLeases(repository, taskId, now, reason) {
  const snapshot = repository.getSnapshot();
  const activeLeases = snapshot.state.ownership_leases.filter(
    (lease) => lease.task_id === taskId && lease.status === 'active',
  );

  for (const lease of activeLeases) {
    repository.upsertOwnershipLease(transitionOwnershipLease({
      intent: 'release',
      existingLease: lease,
      now,
      reason,
    }));
  }

  return activeLeases.map((lease) => lease.lease_id);
}

function releaseConflictingOwnershipLeases(repository, taskId, ownerSessionName, now) {
  const snapshot = repository.getSnapshot();
  const activeLeases = snapshot.state.ownership_leases.filter(
    (lease) => lease.task_id === taskId && lease.status === 'active' && lease.owner_session_name !== ownerSessionName,
  );

  for (const lease of activeLeases) {
    repository.upsertOwnershipLease(transitionOwnershipLease({
      intent: 'release',
      existingLease: lease,
      now,
      reason: 'ownership_replaced',
    }));
  }

  return activeLeases.map((lease) => lease.lease_id);
}

function releaseBoundPrBindings(repository, taskId, now, reason) {
  const snapshot = repository.getSnapshot();
  const activeBindings = snapshot.state.pr_bindings.filter(
    (binding) => binding.task_id === taskId && binding.status === 'bound',
  );

  for (const binding of activeBindings) {
    repository.upsertPrBinding(transitionPrBinding({
      intent: 'release',
      existingBinding: binding,
      now,
      reason,
    }));
  }

  return activeBindings.map((binding) => binding.binding_id);
}

function releaseConflictingPrBindings(repository, taskId, prNumber, now) {
  const snapshot = repository.getSnapshot();
  const activeBindings = snapshot.state.pr_bindings.filter(
    (binding) => binding.task_id === taskId && binding.status === 'bound' && binding.pr_number !== prNumber,
  );

  for (const binding of activeBindings) {
    repository.upsertPrBinding(transitionPrBinding({
      intent: 'release',
      existingBinding: binding,
      now,
      reason: 'binding_replaced',
    }));
  }

  return activeBindings.map((binding) => binding.binding_id);
}

export async function runManageCommand({
  repoRoot,
  cwd = repoRoot,
  projectId = DEFAULT_PROJECT_ID,
  command,
  taskId = null,
  issueNumber = null,
  title = null,
  branchName = null,
  worktreePath = null,
  prNumber = null,
  baseBranch = 'main',
  ownerSessionName = null,
  ownerSessionId = null,
  reason = null,
  now = new Date().toISOString(),
} = {}) {
  const timestamp = resolveNow(now);
  const repository = createStateRepository({
    repoRoot,
    projectId,
  });
  const snapshot = repository.getSnapshot();
  const existingTask = snapshot.state.managed_tasks.find((task) => matchesTaskIdentity(task, {
    taskId,
    issueNumber,
  })) ?? null;
  const resolvedTaskId = existingTask?.task_id ?? deriveManagedTaskId({
    taskId,
    issueNumber,
  });
  const resolvedTitle = title ?? existingTask?.title ?? (issueNumber != null ? `Issue #${issueNumber}` : resolvedTaskId);

  const task = transitionManagedTask({
    intent: command,
    existingTask,
    now: timestamp,
    taskId: resolvedTaskId,
    issueNumber,
    title: resolvedTitle,
    branchName,
    worktreePath,
  });
  repository.upsertManagedTask(task);

  let prBinding = null;
  let ownershipLease = null;
  let releasedOwnershipLeaseIds = [];
  let releasedPrBindingIds = [];

  if (ownerSessionName && ['enroll', 'adopt'].includes(command)) {
    releasedOwnershipLeaseIds = releaseConflictingOwnershipLeases(repository, task.task_id, ownerSessionName, timestamp);
    const postReleaseSnapshot = repository.getSnapshot();
    const existingOwnershipLease = postReleaseSnapshot.state.ownership_leases.find(
      (lease) => lease.lease_id === buildOwnershipLeaseId({
        taskId: task.task_id,
        ownerSessionName,
      }),
    ) ?? null;

    if (existingOwnershipLease?.status === 'active') {
      ownershipLease = existingOwnershipLease;
    } else {
      ownershipLease = transitionOwnershipLease({
        intent: 'acquire',
        existingLease: existingOwnershipLease,
        now: timestamp,
        leaseId: buildOwnershipLeaseId({
          taskId: task.task_id,
          ownerSessionName,
        }),
        taskId: task.task_id,
        ownerSessionName,
        ownerSessionId,
      });
      repository.upsertOwnershipLease(ownershipLease);
    }
  }

  if (prNumber != null) {
    releasedPrBindingIds = releaseConflictingPrBindings(repository, task.task_id, prNumber, timestamp);
    const postReleaseSnapshot = repository.getSnapshot();
    const existingBinding = postReleaseSnapshot.state.pr_bindings.find(
      (binding) => binding.binding_id === buildPrBindingId({
        taskId: task.task_id,
        prNumber,
      }),
    ) ?? null;

    prBinding = transitionPrBinding({
      intent: 'bind',
      existingBinding,
      now: timestamp,
      bindingId: buildPrBindingId({
        taskId: task.task_id,
        prNumber,
      }),
      taskId: task.task_id,
      prNumber,
      branchName: branchName ?? task.branch_name,
      baseBranch,
    });
    repository.upsertPrBinding(prBinding);
  }

  if (command === 'unmanage' || command === 'retire') {
    releasedOwnershipLeaseIds = releaseActiveOwnershipLeases(
      repository,
      task.task_id,
      timestamp,
      reason ?? (command === 'retire' ? 'task_retired' : 'task_unmanaged'),
    );
    if (command === 'retire') {
      releasedPrBindingIds = releaseBoundPrBindings(
        repository,
        task.task_id,
        timestamp,
        reason ?? 'task_retired',
      );
    }
  }

  return {
    project_id: projectId,
    cwd,
    command,
    task,
    prBinding,
    ownershipLease,
    releasedOwnershipLeaseIds,
    releasedPrBindingIds,
  };
}
