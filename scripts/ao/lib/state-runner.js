import { createCheckpointStore } from './checkpoint-store.js';
import { createHandoffProtocol } from './handoff-protocol.js';
import { inspectRepoKnowledgeRecordState } from './repo-knowledge.js';
import { buildAoMetricsReport } from './run-metrics.js';
import * as fs from 'node:fs';
import path from 'node:path';

import { createStateRepository } from './state-repository.js';

export const DEFAULT_PROJECT_ID = 'ciecopilot-home';
export const AO_STATE_SCHEMA_VERSION = 'ao.state.v1alpha1';
export const AO_STATE_REPORT_FORMAT = 'ao_state_report';

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

function compareTimestampDescending(left, right) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function buildControllerRuntimeSummary({
  snapshot,
  projectId,
  now,
} = {}) {
  const controllerModes = snapshot.state.controller_modes ?? [];
  const controllerLeases = snapshot.state.controller_leases ?? [];
  const controllerIds = [...new Set([
    ...controllerModes.map((record) => record.controller_id),
    ...controllerLeases.map((record) => record.controller_id),
  ])].sort((left, right) => left.localeCompare(right));

  const currentTime = new Date(now).getTime();
  const controllers = controllerIds.map((controllerId) => {
    const modeRecord = controllerModes.find((record) => record.controller_id === controllerId) ?? null;
    const leases = controllerLeases
      .filter((record) => record.controller_id === controllerId)
      .sort((left, right) => compareTimestampDescending(
        left.heartbeat_at ?? left.released_at ?? left.acquired_at ?? null,
        right.heartbeat_at ?? right.released_at ?? right.acquired_at ?? null,
      ));
    const activeLease = leases.find((record) => record.status === 'active') ?? null;
    const latestLease = activeLease ?? leases[0] ?? null;
    const activeLeaseFresh = activeLease != null && new Date(activeLease.expires_at).getTime() > currentTime;

    let healthStatus = 'idle';
    if (modeRecord?.mode === 'off' && !activeLease) {
      healthStatus = 'off';
    } else if (activeLease) {
      healthStatus = activeLeaseFresh ? 'healthy' : 'stale';
    }

    return {
      project_id: projectId,
      controller_id: controllerId,
      configured_mode: modeRecord?.mode ?? 'off',
      runtime_kind: latestLease?.runtime_kind ?? null,
      health_status: healthStatus,
      lease_status: latestLease?.status ?? 'none',
      holder_id: latestLease?.holder_id ?? null,
      holder_type: latestLease?.holder_type ?? null,
      incarnation_id: latestLease?.incarnation_id ?? null,
      heartbeat_at: latestLease?.heartbeat_at ?? null,
      expires_at: latestLease?.expires_at ?? null,
      lease_timeout_ms: latestLease?.lease_timeout_ms ?? null,
      poll_interval_ms: latestLease?.poll_interval_ms ?? null,
      shutdown_timeout_ms: latestLease?.shutdown_timeout_ms ?? null,
      last_run_started_at: latestLease?.last_run_started_at ?? null,
      last_run_completed_at: latestLease?.last_run_completed_at ?? null,
      last_run_status: latestLease?.last_run_status ?? null,
    };
  });

  return {
    controllers,
    controllerHealth: controllers.map((controller) => (
      `${controller.controller_id}:${controller.health_status}:${controller.runtime_kind ?? 'none'}`
    )),
  };
}

export async function loadAoStateReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId = DEFAULT_PROJECT_ID,
  auditLimit = 5,
  now = new Date().toISOString(),
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
    now,
  }).inspectAllHandoffs();
  const validCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'valid').length;
  const staleCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'stale').length;
  const invalidCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'invalid').length;
  const activeHandoffCount = snapshot.state.handoff_requests.filter((request) => (
    ['open', 'accepted'].includes(request.status)
  )).length;
  const repoKnowledgeRecord = (snapshot.state.repo_knowledge ?? []).find(
    (record) => record?.project_id === projectId,
  ) ?? null;
  const repoKnowledgeInspection = inspectRepoKnowledgeRecordState(repoKnowledgeRecord);
  const metricsReport = buildAoMetricsReport({
    projectId,
    repoRoot: resolvedRepoRoot,
    snapshot,
    traceLimit: auditLimit,
  });
  const controllerRuntime = buildControllerRuntimeSummary({
    snapshot,
    projectId,
    now,
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
      action_count: snapshot.state.actions.length,
      active_override_count: snapshot.state.overrides.filter((override) => override.status === 'active').length,
      controller_mode_count: snapshot.state.controller_modes.length,
      controller_modes: summarizeControllerModes(snapshot.state.controller_modes),
      controller_health: controllerRuntime.controllerHealth,
      observation_count: snapshot.state.observations.length,
      controller_cursor_count: snapshot.state.controller_cursors.length,
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
      audit_entry_count: auditEntries.length,
    },
    controllers: controllerRuntime.controllers,
    checkpoints: {
      inspections: checkpointInspections,
    },
    handoffs: {
      inspections: handoffInspections,
    },
    repo_knowledge: {
      record: repoKnowledgeRecord,
      inspection: repoKnowledgeInspection,
    },
    metrics: {
      summary: metricsReport.summary,
      recent_traces: metricsReport.recent_traces,
    },
    audit: {
      recent_entries: recentEntries,
    },
  };
}
