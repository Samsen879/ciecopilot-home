import { createCheckpointStore } from './checkpoint-store.js';
import { createHandoffProtocol } from './handoff-protocol.js';
import { normalizeIssueIntake } from './issue-intake.js';
import {
  buildManagedTaskExecutionAttemptMetric,
  completeManagedTaskExecutionAttemptMetric,
} from './run-metrics.js';
import { createStateRepository } from './state-repository.js';
import { createTaskSpecRecord } from './state-contracts.js';
import {
  buildOwnershipLeaseId,
  buildPrBindingId,
  buildWorktreeBindingId,
  deriveManagedTaskId,
  transitionManagedTask,
  transitionOwnershipLease,
  transitionPrBinding,
  transitionWorktreeBinding,
} from './transition-engine.js';

export const DEFAULT_PROJECT_ID = 'ciecopilot-home';

function resolveNow(now) {
  if (typeof now === 'function') return resolveNow(now());
  if (typeof now === 'string' && now.trim() !== '') return now.trim();
  return new Date().toISOString();
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function matchesTaskIdentity(task, { taskId = null, issueNumber = null } = {}) {
  if (!task) return false;
  if (taskId && task.task_id === taskId) return true;
  if (issueNumber != null && task.issue_number === Number(issueNumber)) return true;
  return false;
}

function latestActiveManagedExecutionAttempt(snapshot, taskId) {
  return [...(snapshot?.state?.execution_attempt_metrics ?? [])]
    .filter((record) => (
      record?.attempt_kind === 'managed_task'
        && record?.task_id === taskId
        && record?.status === 'active'
    ))
    .sort((left, right) => String(right?.started_at ?? '').localeCompare(String(left?.started_at ?? '')))[0] ?? null;
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
  return releaseConflictingOwnershipLeasesWithReason(
    repository,
    taskId,
    ownerSessionName,
    now,
    'ownership_replaced',
  );
}

function releaseConflictingOwnershipLeasesWithReason(repository, taskId, ownerSessionName, now, reason) {
  const snapshot = repository.getSnapshot();
  const activeLeases = snapshot.state.ownership_leases.filter(
    (lease) => lease.task_id === taskId && lease.status === 'active' && lease.owner_session_name !== ownerSessionName,
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

function latestTaskOwnershipLease(snapshot, taskId) {
  return [...snapshot.state.ownership_leases]
    .filter((lease) => lease.task_id === taskId)
    .sort((left, right) => String(right?.acquired_at ?? '').localeCompare(String(left?.acquired_at ?? '')))[0] ?? null;
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

function latestTaskWorktreeBinding(snapshot, taskId) {
  return [...(snapshot?.state?.worktree_bindings ?? [])]
    .filter((binding) => binding?.task_id === taskId)
    .sort((left, right) => String(right?.updated_at ?? '').localeCompare(String(left?.updated_at ?? '')))[0] ?? null;
}

function findConflictingWorktreeBindings(snapshot, {
  taskId,
  branchName = null,
  worktreePath = null,
} = {}) {
  return (snapshot?.state?.worktree_bindings ?? []).filter((binding) => (
    binding?.status === 'active'
      && binding?.task_id !== taskId
      && (
        (branchName && binding?.branch_name === branchName)
        || (worktreePath && binding?.worktree_path === worktreePath)
      )
  ));
}

function assertResumeWorktreeContinuity(binding, taskId) {
  if (!binding || binding.status !== 'active') {
    throw new Error(`Cannot resume ${taskId} without a durable worktree binding`);
  }

  switch (binding.continuity_status) {
    case 'safe_resume':
    case 'stale_local_occupancy':
      return;
    case 'dirty_worktree_hold':
      throw new Error(`Cannot resume ${taskId} while the durable binding reports a dirty worktree hold`);
    case 'detached_head_hold':
      throw new Error(`Cannot resume ${taskId} while the durable binding reports a detached head hold`);
    case 'branch_mismatch_hold':
      throw new Error(`Cannot resume ${taskId} while the durable binding reports a branch mismatch hold`);
    case 'conflicting_local_occupancy':
      throw new Error(`Cannot resume ${taskId} while the durable binding reports conflicting worktree occupancy`);
    default:
      throw new Error(`Cannot resume ${taskId} without a safe durable worktree observation`);
  }
}

function buildExplicitWorktreeObservation({
  branchName = null,
  worktreePath = null,
} = {}) {
  return {
    branch_name: branchName,
    worktree_path: worktreePath,
    head_sha: null,
    upstream_branch: null,
    worktree_dirty: false,
    staged_changes: false,
    unstaged_changes: false,
  };
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
  taskSpecBody = null,
  taskSpecSourceKind = 'github_issue',
  reason = null,
  now = new Date().toISOString(),
} = {}) {
  const timestamp = resolveNow(now);
  const repository = createStateRepository({
    repoRoot,
    projectId,
  });
  const checkpointStore = createCheckpointStore({
    repository,
    now: () => timestamp,
  });
  const handoffProtocol = createHandoffProtocol({
    repository,
    now: () => timestamp,
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
  const existingWorktreeBinding = latestTaskWorktreeBinding(snapshot, resolvedTaskId);
  const preflightBranchName = branchName ?? existingTask?.branch_name ?? existingWorktreeBinding?.branch_name ?? null;
  const preflightWorktreePath = worktreePath ?? existingTask?.worktree_path ?? existingWorktreeBinding?.worktree_path ?? null;
  const conflictingWorktreeBindings = ['enroll', 'adopt', 'resume'].includes(command)
    ? findConflictingWorktreeBindings(snapshot, {
        taskId: resolvedTaskId,
        branchName: preflightBranchName,
        worktreePath: preflightWorktreePath,
      })
    : [];

  if (conflictingWorktreeBindings.length > 0) {
    throw new Error(`Cannot ${command} ${resolvedTaskId} with conflicting worktree occupancy`);
  }

  if (command === 'resume') {
    assertResumeWorktreeContinuity(existingWorktreeBinding, resolvedTaskId);
  }

  const resumeCheckpoint = command === 'resume'
    ? checkpointStore.loadCheckpointForResume({
        taskId: resolvedTaskId,
      })
    : null;
  const checkpointTaskRef = resumeCheckpoint?.record?.snapshot?.task_ref ?? null;
  const checkpointPrBinding = checkpointTaskRef?.pr_binding ?? null;
  const resolvedIssueNumber = issueNumber ?? existingTask?.issue_number ?? checkpointTaskRef?.issue_number ?? null;
  const resolvedTitle = title ?? checkpointTaskRef?.title ?? existingTask?.title ?? (resolvedIssueNumber != null ? `Issue #${resolvedIssueNumber}` : resolvedTaskId);
  const resolvedBranchName = branchName ?? checkpointTaskRef?.branch_name ?? existingTask?.branch_name ?? existingWorktreeBinding?.branch_name ?? null;
  const resolvedWorktreePath = worktreePath ?? checkpointTaskRef?.worktree_path ?? existingTask?.worktree_path ?? existingWorktreeBinding?.worktree_path ?? null;
  const resolvedPrNumber = prNumber ?? checkpointPrBinding?.pr_number ?? null;
  const resolvedBaseBranch = baseBranch ?? checkpointPrBinding?.base_branch ?? 'main';

  const nextMetadata = command === 'resume'
    ? {
        ...(isPlainObject(existingTask?.metadata) ? existingTask.metadata : {}),
        resume: {
          last_resume_checkpoint_id: resumeCheckpoint?.checkpoint_id ?? null,
          resume_kind: 'explicit_checkpoint',
          resumed_at: timestamp,
          checkpoint_recorded_at: resumeCheckpoint?.record?.recorded_at ?? null,
          runtime_preflight_replay_key: resumeCheckpoint?.record?.snapshot?.verification_ref?.runtime_preflight?.replay_key ?? null,
        },
      }
    : existingTask?.metadata ?? null;

  const task = transitionManagedTask({
    intent: command === 'resume' ? 'adopt' : command,
    existingTask,
    now: timestamp,
    taskId: resolvedTaskId,
    issueNumber: resolvedIssueNumber,
    title: resolvedTitle,
    branchName: resolvedBranchName,
    worktreePath: resolvedWorktreePath,
    metadata: nextMetadata,
  });
  repository.upsertManagedTask(task);

  let taskSpec = null;
  if (['enroll', 'adopt', 'resume'].includes(command)) {
    const postTaskSnapshot = repository.getSnapshot();
    const existingTaskSpec = postTaskSnapshot.state.task_specs.find(
      (record) => record.task_id === task.task_id,
    ) ?? null;

    if (existingTaskSpec && taskSpecBody == null) {
      taskSpec = existingTaskSpec;
    } else {
      const { task_spec_snapshot: taskSpecSnapshot } = normalizeIssueIntake({
        issueNumber: task.issue_number,
        title: resolvedTitle,
        body: taskSpecBody ?? '',
        sourceKind: taskSpecSourceKind,
      });
      taskSpec = createTaskSpecRecord({
        task_id: task.task_id,
        source_kind: taskSpecSourceKind,
        source_issue_number: task.issue_number,
        created_at: existingTaskSpec?.created_at ?? timestamp,
        updated_at: timestamp,
        snapshot: taskSpecSnapshot,
      });
      repository.upsertTaskSpec(taskSpec);
    }
  }

  let prBinding = null;
  let ownershipLease = null;
  let worktreeBinding = null;
  let handoffTransfer = null;
  let releasedOwnershipLeaseIds = [];
  let releasedPrBindingIds = [];
  let acceptedHandoff = null;

  if (ownerSessionName && ['enroll', 'adopt', 'resume'].includes(command)) {
    if (command === 'resume') {
      const resumeSnapshot = repository.getSnapshot();
      const activeOwnershipLeases = resumeSnapshot.state.ownership_leases.filter(
        (lease) => lease.task_id === task.task_id && lease.status === 'active',
      );
      const latestOwnershipLease = latestTaskOwnershipLease(resumeSnapshot, task.task_id);
      const sameOwnerResume = latestOwnershipLease?.owner_session_name === ownerSessionName
        || activeOwnershipLeases.some((lease) => lease.owner_session_name === ownerSessionName);
      acceptedHandoff = sameOwnerResume
        ? null
        : handoffProtocol.resolveAcceptedHandoff({
            taskId: task.task_id,
            successorSessionName: ownerSessionName,
          });

      if (activeOwnershipLeases.length > 1) {
        throw new Error(`Cannot resume ${task.task_id} with conflicting active owners`);
      }
      if (!sameOwnerResume && !acceptedHandoff) {
        throw new Error(`Cannot resume ${task.task_id} without an accepted handoff`);
      }
      if (acceptedHandoff?.reason_codes?.includes('conflicting_active_owner')) {
        throw new Error(`Cannot resume ${task.task_id} with conflicting active owners`);
      }

      releasedOwnershipLeaseIds = acceptedHandoff
        ? releaseConflictingOwnershipLeasesWithReason(
            repository,
            task.task_id,
            ownerSessionName,
            timestamp,
            'accepted_handoff_transfer',
          )
        : releaseConflictingOwnershipLeases(repository, task.task_id, ownerSessionName, timestamp);
    } else {
      releasedOwnershipLeaseIds = releaseConflictingOwnershipLeases(repository, task.task_id, ownerSessionName, timestamp);
    }

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

    if (command === 'resume') {
      handoffTransfer = handoffProtocol.completeAcceptedHandoff({
        taskId: task.task_id,
        successorSessionName: ownerSessionName,
        successorSessionId: ownerSessionId,
        successorOwnershipLeaseId: ownershipLease.lease_id,
        successorOwnershipLease: ownershipLease,
        transferredBy: 'manage_runner',
        reason: 'accepted_handoff_resume',
      });
    }
  }

  if (['enroll', 'adopt', 'resume'].includes(command)) {
    const explicitObservation = buildExplicitWorktreeObservation({
      branchName: resolvedBranchName ?? task.branch_name,
      worktreePath: resolvedWorktreePath ?? task.worktree_path,
    });
    worktreeBinding = transitionWorktreeBinding({
      intent: existingWorktreeBinding ? 'observe' : 'bind',
      existingBinding: existingWorktreeBinding,
      now: timestamp,
      bindingId: buildWorktreeBindingId({
        taskId: task.task_id,
      }),
      taskId: task.task_id,
      branchName: resolvedBranchName ?? task.branch_name,
      worktreePath: resolvedWorktreePath ?? task.worktree_path,
      ownerSessionName: ownerSessionName ?? ownershipLease?.owner_session_name ?? existingWorktreeBinding?.owner_session_name ?? null,
      ownerSessionId: ownerSessionId ?? ownershipLease?.owner_session_id ?? existingWorktreeBinding?.owner_session_id ?? null,
      status: 'active',
      occupancyStatus: ownerSessionName ? 'occupied' : (existingWorktreeBinding?.occupancy_status ?? 'unknown'),
      cleanlinessStatus: 'clean',
      headStatus: 'attached',
      continuityStatus: 'safe_resume',
      reasonCodes: ['binding_matches_local_state'],
      lastObservedAt: timestamp,
      lastObserved: explicitObservation,
      lastSafeObservedAt: timestamp,
      lastSafeObservation: explicitObservation,
    });
    repository.upsertWorktreeBinding(worktreeBinding);
  }

  if (resolvedPrNumber != null) {
    releasedPrBindingIds = releaseConflictingPrBindings(repository, task.task_id, resolvedPrNumber, timestamp);
    const postReleaseSnapshot = repository.getSnapshot();
    const existingBinding = postReleaseSnapshot.state.pr_bindings.find(
      (binding) => binding.binding_id === buildPrBindingId({
        taskId: task.task_id,
        prNumber: resolvedPrNumber,
      }),
    ) ?? null;

    prBinding = transitionPrBinding({
      intent: 'bind',
      existingBinding,
      now: timestamp,
      bindingId: buildPrBindingId({
        taskId: task.task_id,
        prNumber: resolvedPrNumber,
      }),
      taskId: task.task_id,
      prNumber: resolvedPrNumber,
      branchName: resolvedBranchName ?? task.branch_name,
      baseBranch: resolvedBaseBranch,
    });
    repository.upsertPrBinding(prBinding);
  }

  if (ownerSessionName && ['enroll', 'adopt', 'resume'].includes(command)) {
    repository.upsertExecutionAttemptMetric(buildManagedTaskExecutionAttemptMetric({
      task,
      ownerSessionName,
      ownerSessionId,
      prNumber: resolvedPrNumber,
      command,
      acceptedHandoff: acceptedHandoff != null,
      now: timestamp,
    }));
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

    const currentWorktreeBinding = latestTaskWorktreeBinding(repository.getSnapshot(), task.task_id);
    if (currentWorktreeBinding?.status === 'active') {
      if (command === 'retire') {
        worktreeBinding = transitionWorktreeBinding({
          intent: 'release',
          existingBinding: currentWorktreeBinding,
          now: timestamp,
          reason: reason ?? 'task_retired',
        });
      } else {
        worktreeBinding = transitionWorktreeBinding({
          intent: 'observe',
          existingBinding: currentWorktreeBinding,
          now: timestamp,
          status: 'active',
          occupancyStatus: currentWorktreeBinding.owner_session_name ? 'stale' : currentWorktreeBinding.occupancy_status,
          cleanlinessStatus: currentWorktreeBinding.cleanliness_status,
          headStatus: currentWorktreeBinding.head_status,
          continuityStatus: currentWorktreeBinding.continuity_status === 'safe_resume'
            ? 'stale_local_occupancy'
            : currentWorktreeBinding.continuity_status,
          reasonCodes: currentWorktreeBinding.continuity_status === 'safe_resume'
            ? ['owner_lease_not_active']
            : currentWorktreeBinding.reason_codes,
        });
      }
      repository.upsertWorktreeBinding(worktreeBinding);
    }

    const activeExecutionAttempt = latestActiveManagedExecutionAttempt(
      repository.getSnapshot(),
      task.task_id,
    );
    if (activeExecutionAttempt) {
      repository.upsertExecutionAttemptMetric(completeManagedTaskExecutionAttemptMetric({
        attemptRecord: activeExecutionAttempt,
        status: command === 'retire' ? 'retired' : 'paused',
        reason,
        now: timestamp,
      }));
    }
  }

  return {
    project_id: projectId,
    cwd,
    command,
    task,
    taskSpec,
    prBinding,
    ownershipLease,
    worktreeBinding,
    handoffTransfer,
    resume: resumeCheckpoint == null ? null : {
      checkpoint_id: resumeCheckpoint.checkpoint_id,
      state: resumeCheckpoint.state,
      reason_codes: resumeCheckpoint.reason_codes,
    },
    releasedOwnershipLeaseIds,
    releasedPrBindingIds,
  };
}
