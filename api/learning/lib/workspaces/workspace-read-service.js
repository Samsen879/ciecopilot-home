import { STABLE_SLOT_KEYS } from '../contracts/runtime-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import { fetchWorkspaceProjection } from '../repositories/workspace-repository.js';

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

function buildStableSlots(workspaceProjection) {
  return Object.fromEntries(
    STABLE_SLOT_KEYS.map((slotKey) => {
      const slot = workspaceProjection?.slots?.[slotKey] ?? null;
      const linkedReferences = workspaceProjection?.linked_references?.[slotKey] ?? [];

      if (!slot) {
        return [slotKey, createEmptySlot()];
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

function applyOptionalFilter(query, methodName, column, value) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue || typeof query?.[methodName] !== 'function') {
    return query;
  }

  return query[methodName](column, normalizedValue);
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

  query = applyOptionalFilter(query, 'eq', 'target_topic_id', topicId);
  query = applyOptionalFilter(query, 'eq', 'status', status);
  query = applyOptionalFilter(query, 'lte', 'due_at', dueBefore);

  if (typeof query?.order === 'function') {
    query = query
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load learning review queue projection: ${error.message}`);
  }

  return {
    scope: 'global_queue_projection',
    topic_id: normalizeString(topicId),
    status: normalizeString(status),
    due_before: normalizeString(dueBefore),
    items: Array.isArray(data) ? data : [],
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

  return {
    workspace: {
      workspace_id: workspaceProjection.workspace_id,
      user_id: workspaceProjection.user_id,
      topic_id: workspaceProjection.topic_id,
      topic_path: workspaceProjection.topic_path,
      slot_state: workspaceProjection.slot_state ?? {},
      linked_reference_summary: workspaceProjection.linked_reference_summary ?? {},
      updated_at: workspaceProjection.updated_at ?? null,
      slots: buildStableSlots(workspaceProjection),
    },
    review_queue: await listReviewTasks(client, {
      userId,
      topicId,
      status: reviewStatus,
      dueBefore: reviewDueBefore,
    }),
  };
}
