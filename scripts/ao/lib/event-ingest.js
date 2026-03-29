import { createHash } from 'node:crypto';

import {
  createControllerCursorRecord,
  createObservationRecord,
} from './state-contracts.js';

function hashPayload(payload) {
  return createHash('sha1')
    .update(JSON.stringify(payload))
    .digest('hex');
}

function sortWorkers(workers = []) {
  return [...workers]
    .map((worker) => ({
      session_name: worker.session_name ?? null,
      session_runtime_id: worker.session_runtime_id ?? null,
      issue_number: worker.issue_number ?? null,
      branch_name: worker.branch_name ?? null,
      pr_number: worker.pr_number ?? null,
      lifecycle_state: worker.lifecycle_state ?? null,
      last_seen_at: worker.last_seen_at ?? null,
      freshness_status: worker.freshness?.status ?? null,
    }))
    .sort((left, right) => String(left.session_name ?? '').localeCompare(String(right.session_name ?? '')));
}

function sortPrs(prs = []) {
  return [...prs]
    .map((pr) => ({
      pr_number: pr.pr_number ?? null,
      state: pr.state ?? null,
      head_branch: pr.head_branch ?? null,
      head_sha: pr.head_sha ?? null,
      review_status: pr.review_status ?? null,
      ci_status: pr.ci_status ?? null,
      mergeability: pr.mergeability ?? null,
      is_draft: pr.is_draft ?? null,
      url: pr.url ?? null,
    }))
    .sort((left, right) => Number(left.pr_number ?? 0) - Number(right.pr_number ?? 0));
}

export function matchAoWorkers(task, prBindings = [], aoObservation = {}) {
  const activePrNumbers = new Set((prBindings ?? [])
    .filter((binding) => binding.status === 'bound')
    .map((binding) => binding.pr_number));

  return (aoObservation.workers ?? []).filter((worker) => (
    (task.issue_number != null && worker.issue_number === task.issue_number)
      || (task.branch_name && worker.branch_name === task.branch_name)
      || (worker.pr_number != null && activePrNumbers.has(worker.pr_number))
  ));
}

export function matchGitHubPrs(task, prBindings = [], githubObservation = {}) {
  const activePrNumbers = new Set((prBindings ?? [])
    .filter((binding) => binding.status === 'bound')
    .map((binding) => binding.pr_number));

  return (githubObservation.prs ?? []).filter((pr) => (
    activePrNumbers.has(pr.pr_number)
      || (task.branch_name && pr.head_branch === task.branch_name)
  ));
}

function buildAoPayload(task, matchedWorkers) {
  return {
    task_id: task.task_id,
    issue_number: task.issue_number ?? null,
    branch_name: task.branch_name ?? null,
    worktree_path: task.worktree_path ?? null,
    workers: sortWorkers(matchedWorkers),
  };
}

function buildGitHubPayload(task, matchedPrs) {
  return {
    task_id: task.task_id,
    issue_number: task.issue_number ?? null,
    branch_name: task.branch_name ?? null,
    prs: sortPrs(matchedPrs),
  };
}

function ingestSingleObservation({
  repository,
  controllerId,
  task,
  sourceKind,
  observedAt,
  payload,
  now,
  summary,
} = {}) {
  const cursor = hashPayload(payload);
  const observationId = `${task.task_id}:${sourceKind}:${cursor}`;
  const cursorId = `${controllerId}:${task.task_id}:${sourceKind}`;
  const snapshot = repository.getSnapshot();
  const existingCursor = snapshot.state.controller_cursors.find((record) => record.cursor_id === cursorId) ?? null;

  if (existingCursor?.last_cursor === cursor) {
    return {
      ingested: false,
      observationId,
      cursorId,
    };
  }

  const existingObservation = snapshot.state.observations.find((record) => record.observation_id === observationId) ?? null;

  if (!existingObservation) {
    repository.upsertObservation(createObservationRecord({
      observation_id: observationId,
      task_id: task.task_id,
      source_kind: sourceKind,
      cursor,
      observed_at: observedAt,
      recorded_at: now,
      summary,
      payload,
    }));
  }

  repository.upsertControllerCursor(createControllerCursorRecord({
    cursor_id: cursorId,
    controller_id: controllerId,
    task_id: task.task_id,
    source_kind: sourceKind,
    last_cursor: cursor,
    observed_at: observedAt,
    updated_at: now,
  }));

  return {
    ingested: !existingObservation,
    observationId,
    cursorId,
  };
}

export function ingestManagedTaskPollEvents({
  repository,
  controllerId = 'default',
  task,
  prBindings = [],
  aoObservation = {},
  githubObservation = {},
  now = new Date().toISOString(),
} = {}) {
  const matchedAoWorkers = matchAoWorkers(task, prBindings, aoObservation);
  const matchedPrs = matchGitHubPrs(task, prBindings, githubObservation);
  const aoResult = ingestSingleObservation({
    repository,
    controllerId,
    task,
    sourceKind: 'ao_poll',
    observedAt: aoObservation.observed_at ?? now,
    payload: buildAoPayload(task, matchedAoWorkers),
    now,
    summary: `Observed ${matchedAoWorkers.length} AO worker snapshot(s) for ${task.task_id}.`,
  });
  const githubResult = ingestSingleObservation({
    repository,
    controllerId,
    task,
    sourceKind: 'github_poll',
    observedAt: githubObservation.observed_at ?? now,
    payload: buildGitHubPayload(task, matchedPrs),
    now,
    summary: `Observed ${matchedPrs.length} GitHub PR snapshot(s) for ${task.task_id}.`,
  });

  const ingestedCount = [aoResult, githubResult].filter((result) => result.ingested).length;

  return {
    task_id: task.task_id,
    ingested_count: ingestedCount,
    skipped_count: 2 - ingestedCount,
    created_observation_ids: [aoResult, githubResult]
      .filter((result) => result.ingested)
      .map((result) => result.observationId),
    updated_cursor_ids: [aoResult.cursorId, githubResult.cursorId],
    matchedAoWorkers,
    matchedPrs,
  };
}
