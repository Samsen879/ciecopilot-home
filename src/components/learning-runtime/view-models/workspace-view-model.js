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

const SLOT_EMPTY_STATE = Object.freeze({
  label: 'Empty slot',
  message: 'No canonical artifact is pinned to this slot yet.',
});

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

function buildWorkspaceSummary(workspace = {}) {
  return {
    workspaceId: normalizeString(workspace.workspaceId ?? workspace.workspace_id),
    topicId: normalizeString(workspace.topicId ?? workspace.topic_id),
    topicPath: normalizeString(workspace.topicPath ?? workspace.topic_path, ''),
    updatedAt: workspace.updatedAt ?? workspace.updated_at ?? null,
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

  return normalizeString(slotState[definition.camelKey] || slotState[definition.key]);
}

function buildSurfaceState(rawState) {
  switch (rawState) {
    case 'stale':
      return {
        value: 'stale',
        label: 'Stale projection',
        tone: 'warning',
        message:
          'This slot projection may be out of date. Reload to confirm the latest canonical content.',
      };
    case 'fresh':
      return {
        value: 'fresh',
        label: 'Fresh projection',
        tone: 'neutral',
        message: null,
      };
    case 'active':
      return {
        value: 'active',
        label: 'Active projection',
        tone: 'neutral',
        message: null,
      };
    default:
      return null;
  }
}

function buildContentState(rawState) {
  switch (rawState) {
    case 'missing_content':
    case 'missing_artifact_content':
      return {
        value: 'missing_content',
        label: 'Missing artifact content',
        tone: 'warning',
        message:
          'The workspace knows which artifact belongs here, but its rendered content is missing from this projection.',
      };
    default:
      return null;
  }
}

function kindLabelForRef(refKind) {
  switch (refKind) {
    case 'artifact':
      return 'Artifact';
    case 'review_task':
      return 'Review task';
    case 'workspace_slot':
      return 'Workspace slot';
    case 'question':
      return 'Question';
    case 'concept':
      return 'Concept';
    default:
      return labelFromToken(refKind || 'reference');
  }
}

function buildUpdatedAtLabel(updatedAt) {
  return normalizeString(updatedAt) ? `Updated ${updatedAt}` : null;
}

function buildSlotLaunch(workspace, slotKey) {
  if (!workspace?.workspaceId || !slotKey) {
    return null;
  }

  return {
    ctaLabel: 'Open slot',
    launchPayload: {
      anchorKind: 'workspace_slot',
      workspaceId: workspace.workspaceId,
      slotKey,
      mode: slotKey === 'review_queue' ? 'spaced_review' : 'learn_concept',
      topicId: workspace.topicId,
      topicPath: workspace.topicPath,
    },
  };
}

function buildReferenceLaunch(ref, workspace) {
  if (!ref?.kind) {
    return null;
  }

  if (ref.kind === 'artifact' && normalizeString(ref.artifactId ?? ref.artifact_id)) {
    return {
      ctaLabel: 'Open artifact',
      launchPayload: {
        anchorKind: 'artifact',
        artifactId: normalizeString(ref.artifactId ?? ref.artifact_id),
        mode: 'learn_concept',
        topicId: workspace.topicId,
        topicPath: workspace.topicPath,
      },
    };
  }

  return null;
}

function buildCardViewModel(ref, {
  placementLabel,
  description,
  updatedAt,
  state,
  workspace,
} = {}) {
  if (!ref) {
    return null;
  }

  return {
    title: ref.label,
    kindLabel: kindLabelForRef(ref.kind),
    placementLabel,
    description,
    updatedAtLabel: buildUpdatedAtLabel(updatedAt),
    state,
    launch: buildReferenceLaunch(ref, workspace),
  };
}

function buildSlotViewModel(definition, slots, slotState, workspace) {
  const slot = readSlotRecord(slots, definition);
  const primaryArtifact = normalizeRef(slot.primaryArtifactRef ?? slot.primary_artifact_ref ?? null);
  const linkedReferences = normalizeRefList(slot.linkedReferences ?? slot.linked_references);
  const rawState = readSlotState(slotState, definition);
  const surfaceState = buildSurfaceState(rawState);
  const contentState = buildContentState(rawState);
  const updatedAt = slot.updatedAt ?? slot.updated_at ?? null;

  return {
    slotKey: definition.key,
    title: definition.title,
    description: definition.description,
    workspaceSlotId: slot.workspaceSlotId ?? slot.workspace_slot_id ?? null,
    primaryArtifact,
    primaryArtifactCard: buildCardViewModel(primaryArtifact, {
      placementLabel: 'Canonical resident',
      description: 'Pinned to the canonical slot for this topic.',
      updatedAt,
      state: contentState,
      workspace,
    }),
    linkedReferences,
    linkedReferenceCards: linkedReferences.map((reference) => buildCardViewModel(reference, {
      placementLabel: 'Linked reference',
      description: 'Linked from another canonical-home topic.',
      updatedAt: null,
      state: null,
      workspace,
    })),
    updatedAt,
    updatedAtLabel: buildUpdatedAtLabel(updatedAt),
    surfaceState,
    contentState,
    emptyState: primaryArtifact ? null : SLOT_EMPTY_STATE,
    slotLaunch: buildSlotLaunch(workspace, definition.key),
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
    populatedSlotCount: slotList.filter((slot) => slot.primaryArtifact).length,
    emptySlotCount: slotList.filter((slot) => !slot.primaryArtifact).length,
    staleSlotCount: slotList.filter((slot) => slot.surfaceState?.value === 'stale').length,
    missingContentCount: slotList.filter((slot) => slot.contentState).length,
    totalLinkedReferences:
      linkedReferenceSummary.totalLinkedReferences
      ?? linkedReferenceSummary.total_linked_references
      ?? 0,
  };
}

export function buildWorkspaceViewModel(payload = {}) {
  const workspace = payload.workspace || {};
  const slotState = workspace.slotState || workspace.slot_state || {};
  const workspaceSummary = buildWorkspaceSummary(workspace);
  const stableSlots = Object.fromEntries(
    SLOT_DEFINITIONS.map((definition) => [
      definition.key,
      buildSlotViewModel(definition, workspace.slots || {}, slotState, workspaceSummary),
    ]),
  );
  const slotList = SLOT_DEFINITIONS
    .filter((definition) => definition.key !== 'review_queue')
    .map((definition) => stableSlots[definition.key]);

  return {
    workspace: workspaceSummary,
    slots: stableSlots,
    slotList,
    artifactInbox: buildArtifactInboxViewModel(workspace, slotList),
    reviewQueue: buildReviewQueueViewModel(payload.reviewQueue || payload.review_queue || {}),
    featureFlags: payload.featureFlags || payload.feature_flags || {},
  };
}

export default buildWorkspaceViewModel;
