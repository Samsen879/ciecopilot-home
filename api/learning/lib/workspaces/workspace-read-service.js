import { STABLE_SLOT_KEYS } from '../contracts/runtime-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import { fetchWorkspaceProjection } from '../repositories/workspace-repository.js';
import {
  deriveReviewQueueProjection,
  summarizeReviewQueueItems,
} from '../review/review-scheduler-policy.js';
import {
  buildSessionResumeGuidance,
  createSessionHandoff,
} from '../session-runtime/session-handoff.js';

const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseTimestamp(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isAfterTimestamp(value, baseline) {
  const valueDate = parseTimestamp(value);
  const baselineDate = parseTimestamp(baseline);

  return Boolean(valueDate && baselineDate && valueDate.getTime() > baselineDate.getTime());
}

function isTypedRef(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && typeof value.kind === 'string';
}

function getTypedRefKey(ref) {
  if (!isTypedRef(ref)) {
    return null;
  }

  const idEntry = Object.entries(ref).find(([key]) => key !== 'kind');
  if (!idEntry) {
    return ref.kind;
  }

  return `${ref.kind}:${idEntry[1]}`;
}

function createEmptySlot() {
  return {
    workspace_slot_id: null,
    primary_artifact_ref: null,
    linked_references: [],
    updated_at: null,
  };
}

function normalizeLinkedReferences(linkedReferences, primaryArtifactRef) {
  const primaryKey = getTypedRefKey(primaryArtifactRef);
  const seen = new Set();

  return (Array.isArray(linkedReferences) ? linkedReferences : []).filter((ref) => {
    const refKey = getTypedRefKey(ref);
    if (!refKey || refKey === primaryKey || seen.has(refKey)) {
      return false;
    }

    seen.add(refKey);
    return true;
  });
}

function buildActiveReviewTaskLinkedReferences(reviewQueueItems) {
  const seen = new Set();

  return (Array.isArray(reviewQueueItems) ? reviewQueueItems : []).flatMap((item) => {
    const reviewTaskId = normalizeString(item?.review_task_id);
    if (
      !reviewTaskId
      || !ACTIVE_REVIEW_TASK_STATUSES.has(item?.status)
      || seen.has(reviewTaskId)
    ) {
      return [];
    }

    seen.add(reviewTaskId);
    return [{ kind: 'review_task', review_task_id: reviewTaskId }];
  });
}

function buildStableSlots(workspaceProjection, { reviewQueueItems = [] } = {}) {
  const activeReviewTaskRefs = buildActiveReviewTaskLinkedReferences(reviewQueueItems);

  return Object.fromEntries(
    STABLE_SLOT_KEYS.map((slotKey) => {
      const slot = workspaceProjection?.slots?.[slotKey] ?? null;
      const linkedReferences = slotKey === 'review_queue'
        ? activeReviewTaskRefs
        : workspaceProjection?.linked_references?.[slotKey] ?? [];

      if (!slot) {
        return [
          slotKey,
          slotKey === 'review_queue'
            ? {
              ...createEmptySlot(),
              linked_references: activeReviewTaskRefs,
            }
            : createEmptySlot(),
        ];
      }

      return [
        slotKey,
        {
          workspace_slot_id: slot.workspace_slot_id ?? null,
          primary_artifact_ref: slot.primary_artifact_ref ?? null,
          linked_references: normalizeLinkedReferences(
            linkedReferences,
            slot.primary_artifact_ref ?? null,
          ),
          updated_at: slot.updated_at ?? null,
        },
      ];
    }),
  );
}

function buildWorkspaceNotFound(topicId) {
  return new LearningHttpError('workspace_not_found', 'Workspace not found.', {
    status: 404,
    details: { topic_id: topicId ?? null },
  });
}

function readTopicFromSession(session = {}) {
  const bundle = isPlainObject(session?.active_scope_bundle)
    ? session.active_scope_bundle
    : isPlainObject(session?.activeScopeBundle)
      ? session.activeScopeBundle
      : {};

  return {
    topicId: normalizeString(bundle.primary_topic_id ?? bundle.primaryTopicId),
    topicPath: normalizeString(bundle.primary_topic_path ?? bundle.primaryTopicPath),
  };
}

function sessionMatchesWorkspaceTopic(session = {}, { topicId = null, topicPath = null } = {}) {
  const sessionTopic = readTopicFromSession(session);

  if (topicId && sessionTopic.topicId === topicId) {
    return true;
  }

  return Boolean(topicPath && sessionTopic.topicPath === topicPath);
}

function buildRevisitSession(session = null) {
  if (!session) {
    return null;
  }

  return {
    session_id: session.session_id ?? null,
    session_goal: session.session_goal ?? null,
    mode: session.mode ?? null,
    state: session.state ?? null,
    updated_at: session.updated_at ?? null,
    current_anchor_kind: session.current_anchor_kind ?? null,
    current_anchor_ref: session.current_anchor_ref ?? null,
    current_question_id: session.current_question_id ?? null,
    current_question_type_id: session.current_question_type_id ?? null,
    resume_guidance: buildSessionResumeGuidance(session),
    handoff: createSessionHandoff(session),
  };
}

async function getLatestWorkspaceSession(
  client,
  {
    userId,
    topicId,
    topicPath,
  } = {},
) {
  let query = client
    .from('learning_session_resume_projection')
    .select('*')
    .eq('user_id', userId);

  if (typeof query?.order === 'function') {
    query = query.order('updated_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load learning session continuity for workspace revisit: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : [];

  return rows
    .filter((session) => sessionMatchesWorkspaceTopic(session, {
      topicId,
      topicPath,
    }))
    .sort((left, right) => {
      const leftTime = parseTimestamp(left?.updated_at)?.getTime() ?? 0;
      const rightTime = parseTimestamp(right?.updated_at)?.getTime() ?? 0;
      return rightTime - leftTime;
    })[0] ?? null;
}

function buildRevisitChanges({
  lastVisitAt = null,
  reviewQueueItems = [],
  workspaceProjection = null,
} = {}) {
  if (!lastVisitAt) {
    return {
      slot_updates: [],
      review_updates: [],
    };
  }

  const slotUpdates = Object.entries(workspaceProjection?.slots ?? {})
    .flatMap(([slotKey, slot]) => {
      if (slotKey === 'review_queue' || !isAfterTimestamp(slot?.updated_at, lastVisitAt)) {
        return [];
      }

      return [{
        slot_key: slotKey,
        updated_at: slot.updated_at,
      }];
    });

  const reviewUpdates = (Array.isArray(reviewQueueItems) ? reviewQueueItems : [])
    .filter((item) => isAfterTimestamp(item?.updated_at, lastVisitAt))
    .map((item) => ({
      review_task_id: item.review_task_id ?? null,
      target_question_type_title: item.target_question_type_title ?? null,
      mode: item.mode ?? null,
      status: item.status ?? null,
      due_at: item.due_at ?? null,
      updated_at: item.updated_at ?? null,
      completion_evidence: item.completion_evidence ?? null,
      scheduler_state: item.scheduler_state ?? null,
    }));

  return {
    slot_updates: slotUpdates,
    review_updates: reviewUpdates,
  };
}

function buildWorkspaceRevisit({
  lastSession = null,
  reviewQueueItems = [],
  workspaceProjection = null,
} = {}) {
  const lastVisitAt = normalizeString(lastSession?.updated_at);

  return {
    last_visit_at: lastVisitAt,
    last_session: buildRevisitSession(lastSession),
    changes_since_last_visit: buildRevisitChanges({
      lastVisitAt,
      reviewQueueItems,
      workspaceProjection,
    }),
  };
}

function filterReviewQueueItems(items, {
  topicId = null,
  status = null,
  dueBefore = null,
} = {}) {
  const normalizedTopicId = normalizeString(topicId);
  const normalizedStatus = normalizeString(status);
  const normalizedDueBefore = normalizeString(dueBefore);

  return (Array.isArray(items) ? items : []).filter((item) => {
    if (normalizedTopicId && item?.target_topic_id !== normalizedTopicId) {
      return false;
    }

    if (normalizedStatus && item?.status !== normalizedStatus) {
      return false;
    }

    if (normalizedDueBefore) {
      const itemDueAt = normalizeString(item?.due_at);
      if (!itemDueAt || itemDueAt > normalizedDueBefore) {
        return false;
      }
    }

    return true;
  });
}

export async function listReviewTasks(
  client,
  {
    userId,
    topicId = null,
    status = null,
    dueBefore = null,
  } = {},
) {
  let query = client
    .from('learning_review_queue_projection')
    .select('*')
    .eq('user_id', userId);

  if (typeof query?.order === 'function') {
    query = query
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load learning review queue projection: ${error.message}`);
  }

  const derivedProjection = deriveReviewQueueProjection(Array.isArray(data) ? data : []);
  const filteredItems = filterReviewQueueItems(derivedProjection.items, {
    topicId,
    status,
    dueBefore,
  });

  return {
    scope: 'global_queue_projection',
    topic_id: normalizeString(topicId),
    status: normalizeString(status),
    due_before: normalizeString(dueBefore),
    policy: derivedProjection.policy,
    items: filteredItems,
    summary: summarizeReviewQueueItems(filteredItems),
  };
}

export async function getWorkspaceView(
  client,
  {
    userId,
    topicId,
    reviewStatus = null,
    reviewDueBefore = null,
  } = {},
) {
  const workspaceProjection = await fetchWorkspaceProjection(client, {
    userId,
    topicId,
  });

  if (!workspaceProjection) {
    throw buildWorkspaceNotFound(topicId);
  }

  const shouldLoadUnfilteredTopicQueue = Boolean(reviewStatus || reviewDueBefore);
  const [reviewQueue, unfilteredTopicReviewQueue, lastSession] = await Promise.all([
    listReviewTasks(client, {
      userId,
      topicId,
      status: reviewStatus,
      dueBefore: reviewDueBefore,
    }),
    shouldLoadUnfilteredTopicQueue
      ? listReviewTasks(client, {
        userId,
        topicId,
      })
      : Promise.resolve(null),
    getLatestWorkspaceSession(client, {
      userId,
      topicId,
      topicPath: workspaceProjection.topic_path,
    }),
  ]);
  const reviewQueueSlotItems = shouldLoadUnfilteredTopicQueue
    ? unfilteredTopicReviewQueue?.items ?? []
    : reviewQueue.items;

  return {
    workspace: {
      workspace_id: workspaceProjection.workspace_id,
      user_id: workspaceProjection.user_id,
      topic_id: workspaceProjection.topic_id,
      topic_path: workspaceProjection.topic_path,
      slot_state: workspaceProjection.slot_state ?? {},
      linked_reference_summary: workspaceProjection.linked_reference_summary ?? {},
      updated_at: workspaceProjection.updated_at ?? null,
      slots: buildStableSlots(workspaceProjection, {
        reviewQueueItems: reviewQueueSlotItems,
      }),
    },
    review_queue: reviewQueue,
    revisit: buildWorkspaceRevisit({
      lastSession,
      reviewQueueItems: reviewQueueSlotItems,
      workspaceProjection,
    }),
  };
}
