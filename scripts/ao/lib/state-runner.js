import { createCheckpointStore } from './checkpoint-store.js';
import {
  inspectAllCompletionReviewGates,
  summarizeCompletionReviewStatuses,
} from './completion-review.js';
import { createHandoffProtocol } from './handoff-protocol.js';
import { inspectRepoKnowledgeRecordState } from './repo-knowledge.js';
import { buildAoMetricsReport, resolveAoMetricsArtifactPaths } from './run-metrics.js';
import * as fs from 'node:fs';
import path from 'node:path';

import { resolveControlPlanePaths } from './state-migrations.js';
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
    release: {
      guards: snapshot.state.release_guards,
      current_guards: currentReleaseGuards,
    },
    completion_reviews: {
      records: snapshot.state.completion_reviews,
      inspections: completionReviewInspections,
    },
    repo_knowledge: {
      record: repoKnowledgeRecord,
      inspection: repoKnowledgeInspection,
    },
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
