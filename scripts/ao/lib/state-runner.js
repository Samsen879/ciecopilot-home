import { createCheckpointStore } from './checkpoint-store.js';
import {
  inspectAllCompletionReviewGates,
  summarizeCompletionReviewStatuses,
} from './completion-review.js';
import { createHandoffProtocol } from './handoff-protocol.js';
import { buildPolicyGovernanceReport } from './policy-engine.js';
import { inspectRepoKnowledgeRecordState } from './repo-knowledge.js';
import { buildAoMetricsReport, resolveAoMetricsArtifactPaths } from './run-metrics.js';
import * as fs from 'node:fs';
import path from 'node:path';

import { resolveControlPlanePaths } from './state-migrations.js';
import { createStateRepository } from './state-repository.js';

export const DEFAULT_PROJECT_ID = 'ciecopilot-home';
export const AO_STATE_SCHEMA_VERSION = 'ao.state.v1alpha1';
export const AO_STATE_REPORT_FORMAT = 'ao_state_report';
export const AO_EVENT_REPORT_SCHEMA_VERSION = 'ao.events.v1alpha1';
export const AO_EVENT_REPORT_FORMAT = 'ao_event_report';
export const AO_ACTION_REPORT_SCHEMA_VERSION = 'ao.actions.v1alpha1';
export const AO_ACTION_REPORT_FORMAT = 'ao_action_report';

function resolveNow(now) {
  if (typeof now === 'function') return resolveNow(now());
  if (typeof now === 'string' && now.trim() !== '') return now.trim();
  return new Date().toISOString();
}

function findRepoRoot(startCwd) {
  let currentPath = path.resolve(startCwd);

  while (true) {
    if (fs.existsSync(path.join(currentPath, '.git'))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return null;
    currentPath = parentPath;
  }
}

function summarizeControllerModes(controllerModes) {
  return [...(controllerModes ?? [])]
    .map((record) => `${record.controller_id}=${record.mode}`)
    .sort((left, right) => left.localeCompare(right));
}

function summarizeWorktreeContinuity(worktreeBindings) {
  const counts = {};

  for (const binding of worktreeBindings ?? []) {
    const continuityStatus = binding?.continuity_status ?? 'unobserved';
    counts[continuityStatus] = (counts[continuityStatus] ?? 0) + 1;
  }

  return counts;
}

function summarizeActiveReleaseGuardStatuses(releaseGuards) {
  const counts = {
    ready: 0,
    waiting: 0,
    blocked: 0,
    ambiguous: 0,
    not_applicable: 0,
  };

  for (const guard of releaseGuards ?? []) {
    if (guard?.validity_status !== 'active') continue;
    if (!Object.hasOwn(counts, guard?.status ?? '')) continue;
    counts[guard.status] += 1;
  }

  return counts;
}

function buildArtifactPointer(pathValue) {
  return {
    path: pathValue,
    exists: fs.existsSync(pathValue),
  };
}

function compareByRecentTimestamp(left, right) {
  const leftTimestamp = String(
    left?.updated_at
      ?? left?.recorded_at
      ?? left?.observed_at
      ?? left?.created_at
      ?? '',
  );
  const rightTimestamp = String(
    right?.updated_at
      ?? right?.recorded_at
      ?? right?.observed_at
      ?? right?.created_at
      ?? '',
  );
  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp.localeCompare(leftTimestamp);
  }
  return JSON.stringify(right ?? {}).localeCompare(JSON.stringify(left ?? {}));
}

function matchesFilter(record, {
  taskId = null,
  prNumber = null,
} = {}) {
  if (taskId != null && record?.task_id !== taskId) return false;
  if (prNumber != null && record?.pr_number !== Number(prNumber)) return false;
  return true;
}

function summarizeGovernance(records = []) {
  const replayDecisionCounts = {
    accepted: 0,
    replayed: 0,
    suppressed: 0,
    executed: 0,
    blocked: 0,
  };
  const backpressureStatusCounts = {
    open: 0,
    suppressed: 0,
    exhausted: 0,
  };

  for (const record of records ?? []) {
    const lastDecision = record?.governance?.last_decision ?? null;
    const backpressureStatus = record?.governance?.backpressure_status ?? null;
    if (lastDecision && Object.hasOwn(replayDecisionCounts, lastDecision)) {
      replayDecisionCounts[lastDecision] += 1;
    }
    if (backpressureStatus && Object.hasOwn(backpressureStatusCounts, backpressureStatus)) {
      backpressureStatusCounts[backpressureStatus] += 1;
    }
  }

  return {
    replay_decision_counts: replayDecisionCounts,
    backpressure_status_counts: backpressureStatusCounts,
  };
}

function summarizeDeliveryEvents(deliveryEvents = []) {
  const familyCounts = {};
  const triggerCounts = {};

  for (const event of deliveryEvents ?? []) {
    const family = event?.event_family ?? 'unknown';
    const trigger = event?.lifecycle_trigger ?? 'manual';
    familyCounts[family] = (familyCounts[family] ?? 0) + 1;
    triggerCounts[trigger] = (triggerCounts[trigger] ?? 0) + 1;
  }

  return {
    family_counts: familyCounts,
    trigger_counts: triggerCounts,
    unique_dedupe_key_count: new Set((deliveryEvents ?? []).map((record) => record?.dedupe_key).filter(Boolean)).size,
  };
}

function summarizeActions(actions = []) {
  const statusCounts = {
    proposed: 0,
    blocked: 0,
    executed: 0,
    cancelled: 0,
  };
  const visibilityCounts = {
    proposed: 0,
    executed: 0,
    blocked: 0,
    denied: 0,
    downgraded: 0,
  };
  const policyDecisionCounts = {
    allow: 0,
    deny: 0,
    downgrade: 0,
  };

  for (const action of actions ?? []) {
    if (Object.hasOwn(statusCounts, action?.status ?? '')) {
      statusCounts[action.status] += 1;
    }
    if (action?.status === 'proposed') visibilityCounts.proposed += 1;
    if (action?.status === 'executed') visibilityCounts.executed += 1;
    if (action?.status === 'blocked') visibilityCounts.blocked += 1;

    const policyDecision = action?.payload?.policy?.decision ?? null;
    if (policyDecision && Object.hasOwn(policyDecisionCounts, policyDecision)) {
      policyDecisionCounts[policyDecision] += 1;
      if (policyDecision === 'deny') visibilityCounts.denied += 1;
      if (policyDecision === 'downgrade') visibilityCounts.downgraded += 1;
    }
  }

  return {
    status_counts: statusCounts,
    visibility_counts: visibilityCounts,
    policy_decision_counts: policyDecisionCounts,
  };
}

export function buildAoEventReport({
  projectId = DEFAULT_PROJECT_ID,
  repoRoot = null,
  stateRoot = null,
  snapshot,
  limit = 5,
  taskId = null,
  prNumber = null,
} = {}) {
  const deliveryEvents = (snapshot?.state?.delivery_events ?? [])
    .filter((record) => matchesFilter(record, { taskId, prNumber }))
    .sort(compareByRecentTimestamp);
  const controllerCursors = (snapshot?.state?.controller_cursors ?? [])
    .filter((record) => taskId == null || record?.task_id === taskId)
    .sort(compareByRecentTimestamp);
  const eventGovernance = summarizeGovernance(deliveryEvents);
  const cursorGovernance = summarizeGovernance(controllerCursors);

  return {
    schema_version: AO_EVENT_REPORT_SCHEMA_VERSION,
    report_format: AO_EVENT_REPORT_FORMAT,
    project_id: projectId,
    repo_root: repoRoot,
    state_root: stateRoot,
    summary: {
      delivery_event_count: deliveryEvents.length,
      controller_cursor_count: controllerCursors.length,
      ...summarizeDeliveryEvents(deliveryEvents),
      replay_decision_counts: {
        delivery_events: eventGovernance.replay_decision_counts,
        controller_cursors: cursorGovernance.replay_decision_counts,
      },
      backpressure_status_counts: {
        delivery_events: eventGovernance.backpressure_status_counts,
        controller_cursors: cursorGovernance.backpressure_status_counts,
      },
    },
    recent_events: deliveryEvents.slice(0, limit),
    controller_cursors: controllerCursors.slice(0, limit),
  };
}

export function buildAoActionReport({
  projectId = DEFAULT_PROJECT_ID,
  repoRoot = null,
  stateRoot = null,
  snapshot,
  limit = 5,
  taskId = null,
  prNumber = null,
} = {}) {
  const actions = (snapshot?.state?.actions ?? [])
    .filter((record) => matchesFilter(record, { taskId, prNumber }))
    .sort(compareByRecentTimestamp);
  const actionSummary = summarizeActions(actions);
  const actionGovernance = summarizeGovernance(actions);

  return {
    schema_version: AO_ACTION_REPORT_SCHEMA_VERSION,
    report_format: AO_ACTION_REPORT_FORMAT,
    project_id: projectId,
    repo_root: repoRoot,
    state_root: stateRoot,
    summary: {
      action_count: actions.length,
      status_counts: actionSummary.status_counts,
      visibility_counts: actionSummary.visibility_counts,
      policy_decision_counts: actionSummary.policy_decision_counts,
      replay_decision_counts: actionGovernance.replay_decision_counts,
      backpressure_status_counts: actionGovernance.backpressure_status_counts,
    },
    recent_actions: actions.slice(0, limit),
  };
}

export async function loadAoStateReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId = DEFAULT_PROJECT_ID,
  auditLimit = 5,
  now = () => new Date().toISOString(),
} = {}) {
  const resolvedRepoRoot = repoRoot ?? findRepoRoot(cwd);
  if (!resolvedRepoRoot) {
    throw new Error(`Could not locate repo root from ${cwd}`);
  }

  const repository = createStateRepository({
    repoRoot: resolvedRepoRoot,
    projectId,
  });
  const snapshot = repository.getSnapshot();
  const auditEntries = repository.listAuditEntries();
  const recentEntries = auditLimit == null ? auditEntries : auditEntries.slice(-auditLimit);
  const checkpointInspections = createCheckpointStore({
    repository,
  }).inspectAllCheckpoints();
  const handoffInspections = createHandoffProtocol({
    repository,
    now: () => resolveNow(now),
  }).inspectAllHandoffs();
  const validCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'valid').length;
  const staleCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'stale').length;
  const invalidCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'invalid').length;
  const activeHandoffCount = handoffInspections.filter((inspection) => (
    ['open', 'pending_decision', 'accepted'].includes(inspection.top_status)
  )).length;
  const worktreeContinuityCounts = summarizeWorktreeContinuity(snapshot.state.worktree_bindings);
  const activeReleaseGuardStatusCounts = summarizeActiveReleaseGuardStatuses(snapshot.state.release_guards);
  const completionReviewInspections = inspectAllCompletionReviewGates({
    state: snapshot.state,
  });
  const completionReviewStatusCounts = summarizeCompletionReviewStatuses(completionReviewInspections);
  const currentReleaseGuards = [...(snapshot.state.release_guards ?? [])]
    .filter((guard) => guard?.validity_status === 'active')
    .sort((left, right) => {
      if ((left?.pr_number ?? 0) !== (right?.pr_number ?? 0)) {
        return (left?.pr_number ?? 0) - (right?.pr_number ?? 0);
      }
      return String(right?.recorded_at ?? '').localeCompare(String(left?.recorded_at ?? ''));
    });
  const repoKnowledgeRecord = (snapshot.state.repo_knowledge ?? []).find(
    (record) => record?.project_id === projectId,
  ) ?? null;
  const repoKnowledgeInspection = inspectRepoKnowledgeRecordState(repoKnowledgeRecord);
  const governanceReport = buildPolicyGovernanceReport({
    projectId,
    credentialProvenances: snapshot.state.credential_provenances,
    repoKnowledge: repoKnowledgeRecord,
    policyDecisions: snapshot.state.policy_decisions,
    requireRepoKnowledge: snapshot.bootstrapped,
  });
  const metricsReport = buildAoMetricsReport({
    projectId,
    repoRoot: resolvedRepoRoot,
    snapshot,
    traceLimit: auditLimit,
  });
  const evalArtifactPaths = resolveControlPlanePaths({
    repoRoot: resolvedRepoRoot,
    projectId,
  });
  const metricsArtifactPaths = resolveAoMetricsArtifactPaths({
    repoRoot: resolvedRepoRoot,
    projectId,
  });
  const eventReport = buildAoEventReport({
    projectId,
    repoRoot: resolvedRepoRoot,
    stateRoot: snapshot.paths.stateRoot,
    snapshot,
    limit: auditLimit,
  });
  const actionReport = buildAoActionReport({
    projectId,
    repoRoot: resolvedRepoRoot,
    stateRoot: snapshot.paths.stateRoot,
    snapshot,
    limit: auditLimit,
  });

  return {
    schema_version: AO_STATE_SCHEMA_VERSION,
    report_format: AO_STATE_REPORT_FORMAT,
    project_id: projectId,
    bootstrapped: snapshot.bootstrapped,
    repo_root: resolvedRepoRoot,
    state_root: snapshot.paths.stateRoot,
    schema: snapshot.schema,
    state: snapshot.state,
    summary: {
      managed_task_count: snapshot.state.managed_tasks.length,
      pr_binding_count: snapshot.state.pr_bindings.length,
      active_ownership_lease_count: snapshot.state.ownership_leases.filter((lease) => lease.status === 'active').length,
      active_controller_lease_count: snapshot.state.controller_leases.filter((lease) => lease.status === 'active').length,
      worktree_binding_count: snapshot.state.worktree_bindings.length,
      active_worktree_binding_count: snapshot.state.worktree_bindings.filter((binding) => binding.status === 'active').length,
      worktree_continuity_counts: worktreeContinuityCounts,
      release_guard_count: snapshot.state.release_guards.length,
      active_release_guard_count: currentReleaseGuards.length,
      active_release_guard_status_counts: activeReleaseGuardStatusCounts,
      completion_review_count: snapshot.state.completion_reviews.length,
      active_completion_review_count: snapshot.state.completion_reviews.filter(
        (review) => review?.validity_status === 'active',
      ).length,
      current_completion_review_status_counts: completionReviewStatusCounts,
      action_count: snapshot.state.actions.length,
      active_override_count: snapshot.state.overrides.filter((override) => override.status === 'active').length,
      controller_mode_count: snapshot.state.controller_modes.length,
      controller_modes: summarizeControllerModes(snapshot.state.controller_modes),
      observation_count: snapshot.state.observations.length,
      delivery_event_count: eventReport.summary.delivery_event_count,
      delivery_event_family_counts: eventReport.summary.family_counts,
      event_replay_decision_counts: eventReport.summary.replay_decision_counts,
      controller_cursor_count: snapshot.state.controller_cursors.length,
      action_status_counts: actionReport.summary.status_counts,
      action_visibility_counts: actionReport.summary.visibility_counts,
      action_replay_decision_counts: actionReport.summary.replay_decision_counts,
      checkpoint_count: checkpointInspections.length,
      valid_checkpoint_count: validCheckpointCount,
      stale_checkpoint_count: staleCheckpointCount,
      invalid_checkpoint_count: invalidCheckpointCount,
      handoff_request_count: snapshot.state.handoff_requests.length,
      handoff_claim_count: snapshot.state.handoff_claims.length,
      handoff_decision_count: snapshot.state.handoff_decisions.length,
      handoff_transfer_count: snapshot.state.handoff_transfers.length,
      active_handoff_count: activeHandoffCount,
      controller_run_metric_count: snapshot.state.controller_run_metrics.length,
      execution_attempt_metric_count: snapshot.state.execution_attempt_metrics.length,
      repo_knowledge_count: snapshot.state.repo_knowledge.length,
      repo_knowledge_status: repoKnowledgeInspection.status,
      repo_knowledge_profile_version: repoKnowledgeRecord?.profile_version ?? null,
      repo_knowledge_lint_status: repoKnowledgeRecord?.lint_status ?? null,
      governance_status: governanceReport.status,
      governance_policy_version: governanceReport.policy_version,
      governance_tool_allowlist_count: governanceReport.summary.tool_allowlist_count,
      governance_mcp_allowlist_count: governanceReport.summary.mcp_allowlist_count,
      governance_credential_provenance_count: governanceReport.summary.credential_provenance_count,
      governance_provenance_gap_count: governanceReport.summary.provenance_gap_count,
      governance_unknown_tool_count: governanceReport.summary.unknown_tool_count,
      governance_unknown_mcp_server_count: governanceReport.summary.unknown_mcp_server_count,
      governance_repo_knowledge_drift_count: governanceReport.summary.repo_knowledge_drift_count,
      audit_entry_count: auditEntries.length,
    },
    checkpoints: {
      inspections: checkpointInspections,
    },
    handoffs: {
      inspections: handoffInspections,
    },
    worktrees: {
      bindings: snapshot.state.worktree_bindings,
    },
    release: {
      guards: snapshot.state.release_guards,
      current_guards: currentReleaseGuards,
    },
    completion_reviews: {
      records: snapshot.state.completion_reviews,
      inspections: completionReviewInspections,
    },
    events: eventReport,
    actions: actionReport,
    repo_knowledge: {
      record: repoKnowledgeRecord,
      inspection: repoKnowledgeInspection,
    },
    governance: governanceReport,
    metrics: {
      summary: metricsReport.summary,
      recent_traces: metricsReport.recent_traces,
    },
    artifacts: {
      eval: {
        latest_scorecard: buildArtifactPointer(evalArtifactPaths.latestEvalScorecardPath),
        operator_latest_scorecard: buildArtifactPointer(evalArtifactPaths.operatorLatestEvalScorecardPath),
        baseline_root: buildArtifactPointer(evalArtifactPaths.evalBaselineRoot),
        operator_baseline_root: buildArtifactPointer(evalArtifactPaths.operatorEvalBaselineRoot),
      },
      metrics: {
        latest_report: buildArtifactPointer(metricsArtifactPaths.latestMetricsReportPath),
        operator_latest_report: buildArtifactPointer(metricsArtifactPaths.operatorLatestMetricsReportPath),
        report_root: buildArtifactPointer(metricsArtifactPaths.metricsReportRoot),
        operator_report_root: buildArtifactPointer(metricsArtifactPaths.operatorMetricsReportRoot),
      },
    },
    audit: {
      recent_entries: recentEntries,
    },
  };
}

export async function loadAoEventReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId = DEFAULT_PROJECT_ID,
  limit = 5,
  taskId = null,
  prNumber = null,
} = {}) {
  const resolvedRepoRoot = repoRoot ?? findRepoRoot(cwd);
  if (!resolvedRepoRoot) {
    throw new Error(`Could not locate repo root from ${cwd}`);
  }

  const repository = createStateRepository({
    repoRoot: resolvedRepoRoot,
    projectId,
  });
  const snapshot = repository.getSnapshot();

  return buildAoEventReport({
    projectId,
    repoRoot: resolvedRepoRoot,
    stateRoot: snapshot.paths.stateRoot,
    snapshot,
    limit,
    taskId,
    prNumber,
  });
}

export async function loadAoActionReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId = DEFAULT_PROJECT_ID,
  limit = 5,
  taskId = null,
  prNumber = null,
} = {}) {
  const resolvedRepoRoot = repoRoot ?? findRepoRoot(cwd);
  if (!resolvedRepoRoot) {
    throw new Error(`Could not locate repo root from ${cwd}`);
  }

  const repository = createStateRepository({
    repoRoot: resolvedRepoRoot,
    projectId,
  });
  const snapshot = repository.getSnapshot();

  return buildAoActionReport({
    projectId,
    repoRoot: resolvedRepoRoot,
    stateRoot: snapshot.paths.stateRoot,
    snapshot,
    limit,
    taskId,
    prNumber,
  });
}
