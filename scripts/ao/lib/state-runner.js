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

export async function loadAoStateReport({
  cwd = process.cwd(),
  repoRoot = null,
  projectId = DEFAULT_PROJECT_ID,
  auditLimit = 5,
  now = null,
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
      controller_run_metric_count: snapshot.state.controller_run_metrics.length,
      execution_attempt_metric_count: snapshot.state.execution_attempt_metrics.length,
      repo_knowledge_count: snapshot.state.repo_knowledge.length,
      repo_knowledge_status: repoKnowledgeInspection.status,
      repo_knowledge_profile_version: repoKnowledgeRecord?.profile_version ?? null,
      repo_knowledge_lint_status: repoKnowledgeRecord?.lint_status ?? null,
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
