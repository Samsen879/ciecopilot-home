import { createCheckpointStore } from './checkpoint-store.js';
import { createHandoffProtocol } from './handoff-protocol.js';
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

export async function loadAoStateReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId = DEFAULT_PROJECT_ID,
  auditLimit = 5,
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
  }).inspectAllHandoffs();
  const validCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'valid').length;
  const staleCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'stale').length;
  const invalidCheckpointCount = checkpointInspections.filter((inspection) => inspection.state === 'invalid').length;
  const activeHandoffCount = handoffInspections.filter((inspection) => (
    ['open', 'pending_decision', 'accepted'].includes(inspection.top_status)
  )).length;

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
      audit_entry_count: auditEntries.length,
    },
    checkpoints: {
      inspections: checkpointInspections,
    },
    handoffs: {
      inspections: handoffInspections,
    },
    audit: {
      recent_entries: recentEntries,
    },
  };
}
