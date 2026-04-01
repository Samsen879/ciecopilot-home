import { createGate } from './gate-model.js';
import { createCompletionReviewRecord } from './state-contracts.js';

const CURRENT_COMPLETION_REVIEW_STATUSES = Object.freeze([
  'accepted',
  'waived',
  'rejected',
  'requested',
  'in_review',
  'expired',
  'missing_review',
  'self_review',
]);

function uniqueStrings(values) {
  return [...new Set((values ?? [])
    .filter((value) => value != null)
    .map((value) => String(value))
    .filter((value) => value !== ''))];
}

function sortByMostRecent(left, right) {
  const leftUpdatedAt = String(left?.updated_at ?? left?.reviewed_at ?? left?.requested_at ?? '');
  const rightUpdatedAt = String(right?.updated_at ?? right?.reviewed_at ?? right?.requested_at ?? '');
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt.localeCompare(leftUpdatedAt);
  }

  return String(right?.review_id ?? '').localeCompare(String(left?.review_id ?? ''));
}

function inferDefaultReasonCode(status) {
  switch (status) {
    case 'accepted':
      return 'completion_review_accepted';
    case 'waived':
      return 'completion_review_waived';
    case 'rejected':
      return 'completion_review_rejected';
    case 'requested':
      return 'completion_review_requested';
    case 'in_review':
      return 'completion_review_in_review';
    case 'expired':
      return 'completion_review_expired';
    case 'self_review':
      return 'completion_review_self_review';
    case 'missing_review':
      return 'completion_review_missing';
    default:
      return 'completion_review_unknown';
  }
}

function isReviewerDistinct({
  reviewerSessionName,
  reviewerSessionId,
  ownerSessionName,
  ownerSessionId,
} = {}) {
  if (reviewerSessionId && ownerSessionId) {
    return reviewerSessionId !== ownerSessionId;
  }
  if (reviewerSessionName && ownerSessionName) {
    return reviewerSessionName !== ownerSessionName;
  }
  return null;
}

function selectCurrentCompletionReview(records = []) {
  return [...records]
    .sort(sortByMostRecent)[0] ?? null;
}

function normalizeInspectionStatus(record, { ownerSessionName = null, ownerSessionId = null } = {}) {
  if (!record) {
    return {
      status: 'missing_review',
      satisfied: false,
      reviewer_distinct: null,
      reason_codes: ['completion_review_missing'],
    };
  }

  const reviewerDistinct = isReviewerDistinct({
    reviewerSessionName: record.reviewer_session_name,
    reviewerSessionId: record.reviewer_session_id,
    ownerSessionName,
    ownerSessionId,
  });

  if (record.status === 'accepted') {
    if (reviewerDistinct === false) {
      return {
        status: 'self_review',
        satisfied: false,
        reviewer_distinct: false,
        reason_codes: uniqueStrings([
          ...(record.reason_codes ?? []),
          'completion_review_self_review',
        ]),
      };
    }

    if (reviewerDistinct == null && !record.reviewer_session_name && !record.reviewer_session_id) {
      return {
        status: 'rejected',
        satisfied: false,
        reviewer_distinct: null,
        reason_codes: uniqueStrings([
          ...(record.reason_codes ?? []),
          'completion_review_identity_missing',
        ]),
      };
    }

    return {
      status: 'accepted',
      satisfied: true,
      reviewer_distinct: reviewerDistinct,
      reason_codes: uniqueStrings([
        ...(record.reason_codes ?? []),
        'completion_review_accepted',
      ]),
    };
  }

  if (record.status === 'waived') {
    return {
      status: 'waived',
      satisfied: true,
      reviewer_distinct: reviewerDistinct,
      reason_codes: uniqueStrings([
        ...(record.reason_codes ?? []),
        'completion_review_waived',
      ]),
    };
  }

  return {
    status: record.status,
    satisfied: false,
    reviewer_distinct: reviewerDistinct,
    reason_codes: uniqueStrings([
      ...(record.reason_codes ?? []),
      inferDefaultReasonCode(record.status),
    ]),
  };
}

export function inspectCompletionReviewGate({
  state = {},
  taskId = null,
  prNumber = null,
  branchName = null,
  headSha = null,
  ownerSessionName = null,
  ownerSessionId = null,
} = {}) {
  const relevantRecords = (state?.completion_reviews ?? [])
    .filter((record) => record?.validity_status === 'active')
    .filter((record) => (
      (prNumber != null && record?.pr_number === prNumber)
        || (taskId != null && record?.task_id === taskId)
    ));
  const currentHeadRecords = headSha == null
    ? relevantRecords
    : relevantRecords.filter((record) => record?.head_sha === headSha);
  const selectedRecord = selectCurrentCompletionReview(currentHeadRecords);
  const effectiveHeadSha = headSha ?? selectedRecord?.head_sha ?? null;

  if (taskId == null && prNumber == null && effectiveHeadSha == null && !selectedRecord) {
    return {
      task_id: null,
      pr_number: null,
      branch_name: null,
      head_sha: null,
      review_id: null,
      status: 'not_applicable',
      satisfied: false,
      reviewer_distinct: null,
      reviewer_session_name: null,
      reviewer_session_id: null,
      implementation_owner_session_name: ownerSessionName,
      implementation_owner_session_id: ownerSessionId,
      verdict: null,
      reason_codes: ['completion_review_not_applicable'],
      findings: [],
      evidence_refs: [],
      reviewed_at: null,
    };
  }

  const statusDetails = normalizeInspectionStatus(selectedRecord, {
    ownerSessionName,
    ownerSessionId,
  });

  return {
    task_id: taskId ?? selectedRecord?.task_id ?? null,
    pr_number: prNumber ?? selectedRecord?.pr_number ?? null,
    branch_name: branchName ?? selectedRecord?.branch_name ?? null,
    head_sha: effectiveHeadSha,
    review_id: selectedRecord?.review_id ?? null,
    status: statusDetails.status,
    satisfied: statusDetails.satisfied,
    reviewer_distinct: statusDetails.reviewer_distinct,
    reviewer_session_name: selectedRecord?.reviewer_session_name ?? null,
    reviewer_session_id: selectedRecord?.reviewer_session_id ?? null,
    implementation_owner_session_name: ownerSessionName ?? selectedRecord?.implementation_owner_session_name ?? null,
    implementation_owner_session_id: ownerSessionId ?? selectedRecord?.implementation_owner_session_id ?? null,
    verdict: selectedRecord?.verdict ?? null,
    reason_codes: statusDetails.reason_codes,
    findings: selectedRecord?.findings ?? [],
    evidence_refs: selectedRecord?.evidence_refs ?? [],
    reviewed_at: selectedRecord?.reviewed_at ?? null,
  };
}

export function buildCompletionReviewGate(inspection) {
  const status = inspection?.status ?? 'missing_review';
  if (['accepted', 'waived'].includes(status)) {
    return createGate({
      name: 'completion_review',
      state: 'open',
      blocker_codes: [],
      reason_codes: inspection?.reason_codes ?? [],
    });
  }

  if (['rejected', 'expired', 'self_review'].includes(status)) {
    return createGate({
      name: 'completion_review',
      state: 'blocked',
      blocker_codes: [],
      reason_codes: inspection?.reason_codes ?? [],
    });
  }

  return createGate({
    name: 'completion_review',
    state: 'pending',
    blocker_codes: [],
    reason_codes: inspection?.reason_codes ?? [],
  });
}

function buildInspectionContexts(state = {}) {
  const contexts = new Map();

  const activeGuards = [...(state?.release_guards ?? [])]
    .filter((guard) => guard?.validity_status === 'active')
    .sort((left, right) => String(right?.recorded_at ?? '').localeCompare(String(left?.recorded_at ?? '')));
  const prBindings = state?.pr_bindings ?? [];

  for (const guard of activeGuards) {
    const key = guard?.pr_number == null ? null : `pr:${guard.pr_number}`;
    if (!key || contexts.has(key)) continue;

    const prBinding = prBindings.find((binding) => binding?.pr_number === guard.pr_number && binding?.status === 'bound') ?? null;
    contexts.set(key, {
      taskId: prBinding?.task_id ?? null,
      prNumber: guard.pr_number,
      branchName: guard.branch_name ?? prBinding?.branch_name ?? null,
      headSha: guard.head_sha ?? null,
      ownerSessionName: guard?.truth?.owner_session_name ?? null,
      ownerSessionId: null,
    });
  }

  const activeReviews = [...(state?.completion_reviews ?? [])]
    .filter((record) => record?.validity_status === 'active')
    .sort(sortByMostRecent);
  for (const review of activeReviews) {
    const key = review?.pr_number != null
      ? `pr:${review.pr_number}`
      : `task:${review.task_id}`;
    if (!key || contexts.has(key)) continue;

    const prBinding = prBindings.find((binding) => binding?.task_id === review.task_id && binding?.status === 'bound') ?? null;
    contexts.set(key, {
      taskId: review.task_id ?? prBinding?.task_id ?? null,
      prNumber: review.pr_number ?? prBinding?.pr_number ?? null,
      branchName: review.branch_name ?? prBinding?.branch_name ?? null,
      headSha: review.head_sha ?? null,
      ownerSessionName: review.implementation_owner_session_name ?? null,
      ownerSessionId: review.implementation_owner_session_id ?? null,
    });
  }

  return [...contexts.values()];
}

export function inspectAllCompletionReviewGates({
  state = {},
} = {}) {
  return buildInspectionContexts(state)
    .map((context) => inspectCompletionReviewGate({
      state,
      ...context,
    }))
    .filter((inspection) => inspection.status !== 'not_applicable')
    .sort((left, right) => {
      if ((left?.pr_number ?? 0) !== (right?.pr_number ?? 0)) {
        return (left?.pr_number ?? 0) - (right?.pr_number ?? 0);
      }
      return String(left?.task_id ?? '').localeCompare(String(right?.task_id ?? ''));
    });
}

export function createCompletionReviewStatusCounts() {
  return CURRENT_COMPLETION_REVIEW_STATUSES.reduce((result, status) => {
    result[status] = 0;
    return result;
  }, {});
}

export function summarizeCompletionReviewStatuses(inspections = []) {
  const counts = createCompletionReviewStatusCounts();

  for (const inspection of inspections ?? []) {
    if (!Object.hasOwn(counts, inspection?.status ?? '')) continue;
    counts[inspection.status] += 1;
  }

  return counts;
}

export function invalidateStaleCompletionReviews({
  repository,
  taskId = null,
  prNumber = null,
  headSha = null,
  now,
} = {}) {
  if (!repository || !headSha) return [];

  const snapshot = repository.getSnapshot();
  const staleReviews = (snapshot.state.completion_reviews ?? [])
    .filter((record) => record?.validity_status === 'active')
    .filter((record) => (
      (prNumber != null && record?.pr_number === prNumber)
        || (taskId != null && record?.task_id === taskId)
    ))
    .filter((record) => record?.head_sha !== headSha);

  const invalidated = [];
  for (const record of staleReviews) {
    const nextRecord = createCompletionReviewRecord({
      ...record,
      validity_status: 'invalidated',
      invalidated_at: now,
      invalidation_reason_codes: uniqueStrings([
        ...(record.invalidation_reason_codes ?? []),
        'head_sha_changed',
      ]),
    });
    repository.upsertCompletionReview(nextRecord);
    invalidated.push(nextRecord);
  }

  return invalidated;
}
