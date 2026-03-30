import { createHash } from 'node:crypto';

import {
  CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
  createActionRecord,
  createControllerModeRecord,
} from './state-contracts.js';
import { createStateRepository } from './state-repository.js';
import {
  buildControllerLeaseId,
  transitionControllerLease,
} from './transition-engine.js';
import {
  ingestManagedTaskPollEvents,
} from './event-ingest.js';
import { loadAoProjectObservation } from './ao-observation-source.js';
import { createDoctorPrScope, createDoctorProjectScope } from './doctor-contracts.js';
import { buildDoctorReport as buildDoctorReportModel } from './doctor-engine.js';
import { loadDoctorLocalState } from './doctor-local-state-source.js';
import { loadGitHubObservationSet } from './github-observation-source.js';
import {
  LIFECYCLE_DELIVERY_TRIGGER_PRIORITY,
  createLifecyclePrScope,
  createLifecycleProjectScope,
} from './lifecycle-contracts.js';
import { buildLifecycleReport as buildLifecycleReportModel } from './lifecycle-engine.js';
import {
  buildAssistActionModel,
  executeAssistActions,
} from './action-executor.js';
import {
  createPrScope,
  createProjectScope,
} from './reconciliation-contracts.js';
import { reconcileObservations as reconcileObservationModels } from './reconciliation-engine.js';

export const DEFAULT_PROJECT_ID = 'ciecopilot-home';
export const CONTROLLER_MUTATION_MODES = ['observe', 'shadow', 'assist'];

function resolveNow(now) {
  if (typeof now === 'function') return resolveNow(now());
  if (typeof now === 'string' && now.trim() !== '') return now.trim();
  return new Date().toISOString();
}

function hashText(value) {
  return createHash('sha1').update(value).digest('hex');
}

function uniquePrNumbers(prBindings = [], matchedPrs = []) {
  return [...new Set([
    ...(prBindings ?? []).filter((binding) => binding.status === 'bound').map((binding) => binding.pr_number),
    ...(matchedPrs ?? []).map((pr) => pr.pr_number),
  ])].filter((value) => Number.isInteger(value)).sort((left, right) => left - right);
}

function buildGitHubScope(task, prBindings = []) {
  const prNumbers = uniquePrNumbers(prBindings, []);
  const selectionBasis = [];
  if (prNumbers.length) selectionBasis.push('managed_task_pr_binding');
  if (task.branch_name) selectionBasis.push('managed_task_branch');

  return createProjectScope({
    prNumbers,
    selectionBasis,
    notes: task.branch_name ? [`branch:${task.branch_name}`] : [],
  });
}

function resolveLifecyclePrNumber(prBindings = [], matchedPrs = []) {
  const prNumbers = uniquePrNumbers(prBindings, matchedPrs);
  return prNumbers.length === 1 ? prNumbers[0] : null;
}

function compareDeliveryEventOrder(left, right) {
  const leftObservedAt = String(left?.observed_at ?? '');
  const rightObservedAt = String(right?.observed_at ?? '');
  if (leftObservedAt !== rightObservedAt) {
    return leftObservedAt.localeCompare(rightObservedAt);
  }
  return String(left?.event_id ?? '').localeCompare(String(right?.event_id ?? ''));
}

function isDeliveryEventCurrentForPr(event, pr) {
  if (!pr || event?.pr_number !== pr.pr_number) return false;

  const payload = event.payload ?? {};
  const currentHeadSha = pr.head_sha ?? null;
  const eventHeadSha = event.event_family === 'review_comment'
    ? (payload.commit_oid ?? payload.head_sha ?? null)
    : (payload.head_sha ?? null);

  if (!currentHeadSha || !eventHeadSha) return true;
  return eventHeadSha === currentHeadSha;
}

function selectCurrentDeliveryEvents({
  matchedPrs = [],
  deliveryEvents = [],
} = {}) {
  const latestByFamily = new Map();

  for (const pr of matchedPrs ?? []) {
    const prEvents = (deliveryEvents ?? [])
      .filter((event) => isDeliveryEventCurrentForPr(event, pr))
      .sort(compareDeliveryEventOrder);
    const latestReviewCommentEvent = prEvents
      .filter((event) => event.event_family === 'review_comment')
      .at(-1) ?? null;

    for (const family of ['pr', 'check', 'review']) {
      const latestEvent = prEvents.filter((event) => event.event_family === family).at(-1) ?? null;
      if (!latestEvent) continue;
      latestByFamily.set(`${pr.pr_number}:${family}`, latestEvent);
    }

    if (latestReviewCommentEvent) {
      latestByFamily.set(`${pr.pr_number}:review_comment`, latestReviewCommentEvent);
    }
  }

  return [...latestByFamily.values()].sort(compareDeliveryEventOrder);
}

export function deriveLifecycleTriggerForTask({
  matchedAoWorkers = [],
  matchedPrs = [],
  deliveryEvents = [],
} = {}) {
  if (
    matchedAoWorkers.length === 0
    || matchedAoWorkers.some((worker) => worker.freshness?.status === 'stale')
  ) {
    return 'agent_exited';
  }

  const activeDeliveryTriggers = new Set(selectCurrentDeliveryEvents({
    matchedPrs,
    deliveryEvents,
  })
    .map((event) => event.lifecycle_trigger)
    .filter((trigger) => typeof trigger === 'string' && trigger !== '' && trigger !== 'manual'));

  for (const trigger of LIFECYCLE_DELIVERY_TRIGGER_PRIORITY) {
    if (activeDeliveryTriggers.has(trigger)) {
      return trigger;
    }
  }

  if (matchedPrs.some((pr) => pr.review_status === 'changes_requested')) {
    return 'changes_requested';
  }

  if (matchedPrs.some((pr) => pr.ci_status === 'failing')) {
    return 'ci_failed';
  }

  if (matchedPrs.some((pr) => pr.mergeability === 'conflicting')) {
    return 'merge_conflicts';
  }

  if (matchedPrs.some((pr) => (
    pr.review_status === 'approved'
      && pr.ci_status === 'passing'
      && pr.mergeability === 'mergeable'
      && pr.is_draft === false
  ))) {
    return 'approved_and_green';
  }

  return 'manual';
}

async function persistShadowActions({
  repository,
  task,
  controllerId,
  mode = 'shadow',
  derivedTrigger,
  lifecycleReport,
  prNumber,
  now,
} = {}) {
  const signature = JSON.stringify({
    controllerId,
    derivedTrigger,
    prNumber,
    top_status: lifecycleReport.top_status,
    routing_decision: lifecycleReport.routing_decision,
    release_decision: lifecycleReport.release_decision,
    actions: lifecycleReport.actions.map((action) => ({
      id: action.id,
      action_class: action.action_class,
      commands: action.commands,
      rationale: action.rationale,
    })),
  });
  const fingerprint = await hashText(signature);
  const knownActionIds = new Set(repository.getSnapshot().state.actions.map((record) => record.action_id));
  const createdActionIds = [];
  const actionIds = [];
  const requestedBy = mode === 'assist' ? 'assist_controller' : 'shadow_controller';

  for (const action of lifecycleReport.actions) {
    const actionId = `proposal-${task.task_id}-${action.id}-${fingerprint.slice(0, 12)}`;
    actionIds.push(actionId);
    if (knownActionIds.has(actionId)) {
      continue;
    }
    knownActionIds.add(actionId);

    const actionModel = buildAssistActionModel({
      controllerId,
      task,
      prNumber,
      derivedTrigger,
      lifecycleTopStatus: lifecycleReport.top_status ?? null,
      action,
    });

    repository.upsertAction(createActionRecord({
      action_id: actionId,
      task_id: task.task_id,
      action_kind: action.id,
      status: 'proposed',
      requested_by: requestedBy,
      reason: action.summary,
      created_at: now,
      updated_at: now,
      payload: {
        controller_id: controllerId,
        derived_trigger: derivedTrigger,
        fingerprint,
        pr_number: prNumber,
        top_status: lifecycleReport.top_status,
        routing_decision: lifecycleReport.routing_decision,
        release_decision: lifecycleReport.release_decision,
        action_class: action.action_class,
        commands: action.commands,
        rationale: action.rationale,
        action_model: actionModel,
      },
    }));
    repository.appendAuditEntry({
      entityKind: 'action',
      entityId: actionId,
      operation: 'proposed',
      actor: requestedBy,
      summary: `Recorded proposed action ${actionId}.`,
      details: {
        action_id: actionId,
        action_kind: action.id,
        task_id: task.task_id,
        controller_id: controllerId,
        pr_number: prNumber,
        risk_class: actionModel.risk_class,
      },
      recordedAt: now,
    });
    createdActionIds.push(actionId);
  }

  return {
    count: createdActionIds.length,
    actionIds,
    createdActionIds,
  };
}

async function resolveLifecycleReportForTask({
  task,
  prNumber,
  derivedTrigger,
  aoObservation,
  githubObservation,
  cwd,
  projectId,
  deps,
} = {}) {
  const reconciliationScope = prNumber != null
    ? createPrScope(prNumber)
    : createProjectScope({
        prNumbers: [],
        selectionBasis: task.branch_name ? ['managed_task_branch'] : [],
        notes: task.branch_name ? [`branch:${task.branch_name}`] : [],
      });
  const reconciliationReport = deps.reconcileObservations({
    scope: reconciliationScope,
    aoObservation,
    githubObservation,
  });
  const localState = await deps.loadDoctorLocalState({
    cwd,
  });
  const doctorReport = deps.buildDoctorReport({
    scope: prNumber != null
      ? createDoctorPrScope({ projectId, prNumber })
      : createDoctorProjectScope({ projectId }),
    reconciliationReport,
    localState,
  });
  const lifecycleReport = deps.buildLifecycleReport({
    scope: prNumber != null
      ? createLifecyclePrScope({ projectId, prNumber, trigger: derivedTrigger })
      : createLifecycleProjectScope({ projectId, trigger: derivedTrigger }),
    reconciliationReport,
    doctorReport,
  });

  return {
    lifecycleReport,
    reconciliationReport,
    doctorReport,
  };
}

function resolveLoopMode(repository, controllerId, mode, now) {
  if (mode != null) {
    if (!CONTROLLER_MUTATION_MODES.includes(mode)) {
      throw new Error(`Unsupported controller mode: ${mode}`);
    }
    repository.upsertControllerMode(createControllerModeRecord({
      controller_id: controllerId,
      mode,
      updated_at: now,
      updated_by: 'ao_controller',
      reason: 'Controller loop mode override.',
    }));
    return mode;
  }

  const snapshot = repository.getSnapshot();
  const currentMode = snapshot.state.controller_modes.find((record) => record.controller_id === controllerId)?.mode ?? 'off';
  if (!CONTROLLER_MUTATION_MODES.includes(currentMode)) {
    throw new Error(`Controller ${controllerId} must be set to observe, shadow, or assist`);
  }

  return currentMode;
}

function assertNoActiveControllerLease(repository, controllerId) {
  const activeLease = repository.getSnapshot().state.controller_leases.find((lease) => (
    lease.controller_id === controllerId && lease.status === 'active'
  ));

  if (activeLease) {
    throw new Error(
      `Controller ${controllerId} already has an active lease held by ${activeLease.holder_id}.`,
    );
  }
}

export async function runControllerLoop({
  repoRoot,
  cwd = repoRoot,
  projectId = DEFAULT_PROJECT_ID,
  controllerId = CONTROL_PLANE_DEFAULT_CONTROLLER_ID,
  mode = null,
  issueNumber = null,
  now = new Date().toISOString(),
  deps = {},
} = {}) {
  const services = {
    loadAoProjectObservation,
    loadGitHubObservationSet,
    loadDoctorLocalState,
    reconcileObservations: reconcileObservationModels,
    buildDoctorReport: buildDoctorReportModel,
    buildLifecycleReport: buildLifecycleReportModel,
    resolveLifecycleReport: null,
    ...deps,
  };
  const timestamp = resolveNow(now);
  const repository = createStateRepository({
    repoRoot,
    projectId,
  });
  const resolvedMode = resolveLoopMode(repository, controllerId, mode, timestamp);
  assertNoActiveControllerLease(repository, controllerId);
  const holderId = process.env.AO_SESSION_NAME ?? process.env.AO_SESSION_ID ?? 'controller-loop';
  const holderType = process.env.AO_CALLER_TYPE ?? 'session';
  const leaseId = buildControllerLeaseId({
    controllerId,
    holderId,
  });
  const existingLease = repository.getSnapshot().state.controller_leases.find((lease) => lease.lease_id === leaseId) ?? null;
  const activeLease = transitionControllerLease({
    intent: 'acquire',
    existingLease,
    now: timestamp,
    leaseId,
    controllerId,
    holderId,
    holderType,
  });
  repository.upsertControllerLease(activeLease);

  const aoObservation = await services.loadAoProjectObservation({
    projectId,
    now: timestamp,
  });
  const snapshot = repository.getSnapshot();
  const activeTasks = snapshot.state.managed_tasks.filter((task) => (
    task.status === 'active'
      && (issueNumber == null || task.issue_number === Number(issueNumber))
  ));
  const taskResults = [];
  let ingestedObservationCount = 0;
  let deliveryEventCount = 0;
  let proposedActionCount = 0;
  let executedActionCount = 0;
  let blockedActionCount = 0;

  try {
    for (const task of activeTasks) {
      const currentSnapshot = repository.getSnapshot();
      const prBindings = currentSnapshot.state.pr_bindings.filter((binding) => binding.task_id === task.task_id);
      const githubObservation = await services.loadGitHubObservationSet({
        scope: buildGitHubScope(task, prBindings),
        now: timestamp,
      });
      const ingestResult = ingestManagedTaskPollEvents({
        repository,
        controllerId,
        task,
        prBindings,
        aoObservation,
        githubObservation,
        now: timestamp,
      });
      ingestedObservationCount += ingestResult.ingested_count;
      deliveryEventCount += ingestResult.delivery_event_count ?? 0;
      const derivedTrigger = deriveLifecycleTriggerForTask({
        matchedAoWorkers: ingestResult.matchedAoWorkers,
        matchedPrs: ingestResult.matchedPrs,
        deliveryEvents: ingestResult.deliveryEvents,
      });

      let lifecycleTopStatus = null;
      let proposedActionIds = [];
      let executedActionIds = [];
      let blockedActionIds = [];

      if (resolvedMode === 'shadow' || resolvedMode === 'assist') {
        const prNumber = resolveLifecyclePrNumber(prBindings, ingestResult.matchedPrs);
        const resolvedLifecycle = services.resolveLifecycleReport
          ? await services.resolveLifecycleReport({
              task,
              prNumber,
              derivedTrigger,
              aoObservation,
              githubObservation,
              cwd,
              projectId,
            })
          : await resolveLifecycleReportForTask({
              task,
              prNumber,
              derivedTrigger,
              aoObservation,
              githubObservation,
              cwd,
              projectId,
              deps: services,
            });
        const lifecycleReport = resolvedLifecycle.lifecycleReport ?? resolvedLifecycle;
        lifecycleTopStatus = lifecycleReport.top_status ?? null;
        const proposalResult = await persistShadowActions({
          repository,
          task,
          controllerId,
          mode: resolvedMode,
          derivedTrigger,
          lifecycleReport,
          prNumber,
          now: timestamp,
        });
        proposedActionIds = proposalResult.actionIds;
        proposedActionCount += proposalResult.count;

        if (resolvedMode === 'assist') {
          const executionResult = await executeAssistActions({
            repository,
            controllerId,
            task,
            actionIds: proposalResult.actionIds,
            now: timestamp,
          });
          executedActionIds = executionResult.executedActionIds;
          blockedActionIds = executionResult.blockedActionIds;
          executedActionCount += executedActionIds.length;
          blockedActionCount += blockedActionIds.length;
        }
      }

      taskResults.push({
        task_id: task.task_id,
        issue_number: task.issue_number,
        derived_trigger: derivedTrigger,
        new_observation_count: ingestResult.ingested_count,
        new_delivery_event_count: ingestResult.delivery_event_count ?? 0,
        proposed_action_count: proposedActionIds.length,
        proposed_action_ids: proposedActionIds,
        executed_action_count: executedActionIds.length,
        executed_action_ids: executedActionIds,
        blocked_action_count: blockedActionIds.length,
        blocked_action_ids: blockedActionIds,
        lifecycle_top_status: lifecycleTopStatus,
      });
    }
  } finally {
    const currentLease = repository.getSnapshot().state.controller_leases.find((lease) => lease.lease_id === leaseId) ?? null;
    if (currentLease?.status === 'active') {
      repository.upsertControllerLease(transitionControllerLease({
        intent: 'release',
        existingLease: currentLease,
        now: timestamp,
        reason: 'controller_loop_complete',
      }));
    }
  }

  return {
    project_id: projectId,
    controller_id: controllerId,
    mode: resolvedMode,
    observed_at: timestamp,
    managed_task_count: activeTasks.length,
    processed_task_count: taskResults.length,
    ingested_observation_count: ingestedObservationCount,
    delivery_event_count: deliveryEventCount,
    proposed_action_count: proposedActionCount,
    executed_action_count: executedActionCount,
    blocked_action_count: blockedActionCount,
    task_results: taskResults,
  };
}
