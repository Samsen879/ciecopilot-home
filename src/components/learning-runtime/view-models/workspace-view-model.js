const SLOT_DEFINITIONS = Object.freeze([
  {
    key: 'overview_map',
    camelKey: 'overviewMap',
    title: 'Overview map',
    description: 'Canonical summary coverage for this topic.',
  },
  {
    key: 'core_method_derivation',
    camelKey: 'coreMethodDerivation',
    title: 'Core method derivation',
    description: 'Pinned derivations and formula cards that stay canonical to this topic.',
  },
  {
    key: 'canonical_worked_example',
    camelKey: 'canonicalWorkedExample',
    title: 'Canonical worked example',
    description: 'Stable worked-example residency for this topic workspace.',
  },
  {
    key: 'common_traps',
    camelKey: 'commonTraps',
    title: 'Common traps',
    description: 'Misconceptions pinned to this canonical-home topic.',
  },
  {
    key: 'my_notes',
    camelKey: 'myNotes',
    title: 'My notes',
    description: 'User-authored notes that belong to this workspace.',
  },
  {
    key: 'review_queue',
    camelKey: 'reviewQueue',
    title: 'Review queue',
    description: 'Filtered review projection for this topic.',
  },
]);

function normalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function labelFromToken(token, fallback = 'unknown') {
  return normalizeString(token, fallback).replace(/_/g, ' ');
}

function getIdentifierKey(ref) {
  return Object.keys(ref || {}).find((key) => key !== 'kind') || null;
}

function normalizeRef(ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) || !normalizeString(ref.kind)) {
    return null;
  }

  const identifierKey = getIdentifierKey(ref);
  const label = identifierKey ? normalizeString(ref[identifierKey], ref.kind) : ref.kind;

  return {
    ...ref,
    label,
  };
}

function normalizeRefList(refs) {
  return (Array.isArray(refs) ? refs : [])
    .map((ref) => normalizeRef(ref))
    .filter(Boolean);
}

function readSlotRecord(slots, definition) {
  if (!slots || typeof slots !== 'object') {
    return {};
  }

  return slots[definition.camelKey] || slots[definition.key] || {};
}

function readSlotState(slotState, definition) {
  if (!slotState || typeof slotState !== 'object') {
    return null;
  }

  return slotState[definition.camelKey] || slotState[definition.key] || null;
}

function buildSlotViewModel(definition, slots, slotState) {
  const slot = readSlotRecord(slots, definition);

  return {
    slotKey: definition.key,
    title: definition.title,
    description: definition.description,
    workspaceSlotId: slot.workspaceSlotId ?? slot.workspace_slot_id ?? null,
    primaryArtifact: normalizeRef(slot.primaryArtifactRef ?? slot.primary_artifact_ref ?? null),
    linkedReferences: normalizeRefList(slot.linkedReferences ?? slot.linked_references),
    updatedAt: slot.updatedAt ?? slot.updated_at ?? null,
    surfaceState: readSlotState(slotState, definition),
  };
}

function buildReviewQueueViewModel(reviewQueue) {
  const items = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];

  return {
    scope: normalizeString(reviewQueue?.scope),
    topicId: normalizeString(reviewQueue?.topicId ?? reviewQueue?.topic_id),
    items: items.map((item) => ({
      ...item,
      reviewTaskId: normalizeString(item.reviewTaskId ?? item.review_task_id),
      targetQuestionTypeTitle: normalizeString(
        item.targetQuestionTypeTitle ?? item.target_question_type_title,
        null,
      ),
      targetTopicPath: normalizeString(item.targetTopicPath ?? item.target_topic_path, null),
      modeLabel: labelFromToken(item.mode),
      statusLabel: labelFromToken(item.status),
      dueAtLabel: normalizeString(item.dueAt ?? item.due_at, 'unscheduled'),
      estimatedMinutesLabel: `${item.estimatedMinutes ?? item.estimated_minutes ?? 0} min`,
    })),
  };
}

function buildArtifactInboxViewModel(workspace, slotList) {
  const linkedReferenceSummary =
    workspace?.linkedReferenceSummary
    || workspace?.linked_reference_summary
    || {};

  return {
    items: [],
    pinnedSlotCount: slotList.filter((slot) => slot.primaryArtifact).length,
    openSlotCount: slotList.filter((slot) => !slot.primaryArtifact).length,
    totalLinkedReferences:
      linkedReferenceSummary.totalLinkedReferences
      ?? linkedReferenceSummary.total_linked_references
      ?? 0,
  };
}

export function buildWorkspaceViewModel(payload = {}) {
  const workspace = payload.workspace || {};
  const slotState = workspace.slotState || workspace.slot_state || {};
  const stableSlots = Object.fromEntries(
    SLOT_DEFINITIONS.map((definition) => [
      definition.key,
      buildSlotViewModel(definition, workspace.slots || {}, slotState),
    ]),
  );
  const slotList = SLOT_DEFINITIONS
    .filter((definition) => definition.key !== 'review_queue')
    .map((definition) => stableSlots[definition.key]);

  return {
    workspace: {
      workspaceId: normalizeString(workspace.workspaceId ?? workspace.workspace_id),
      topicId: normalizeString(workspace.topicId ?? workspace.topic_id),
      topicPath: normalizeString(workspace.topicPath ?? workspace.topic_path, ''),
      updatedAt: workspace.updatedAt ?? workspace.updated_at ?? null,
    },
    slots: stableSlots,
    slotList,
    artifactInbox: buildArtifactInboxViewModel(workspace, slotList),
    reviewQueue: buildReviewQueueViewModel(payload.reviewQueue || payload.review_queue || {}),
    featureFlags: payload.featureFlags || payload.feature_flags || {},
  };
}

export default buildWorkspaceViewModel;
