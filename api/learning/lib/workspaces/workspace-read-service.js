import { STABLE_SLOT_KEYS } from '../contracts/runtime-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import { fetchWorkspaceProjection } from '../repositories/workspace-repository.js';
import {
  deriveReviewQueueProjection,
  summarizeReviewQueueItems,
} from '../review/review-scheduler-policy.js';

const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
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

  const reviewQueue = await listReviewTasks(client, {
    userId,
    topicId,
    status: reviewStatus,
    dueBefore: reviewDueBefore,
  });
  const reviewQueueSlotItems = (reviewStatus || reviewDueBefore)
    ? (await listReviewTasks(client, {
      userId,
      topicId,
    })).items
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
  };
}
