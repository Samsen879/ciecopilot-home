import { isCompatibleArtifactKindForSlot } from '../../../../api/learning/lib/contracts/runtime-contract.js';
import { buildReviewQueueViewModel } from './review-queue-view-model.js';

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

const SLOT_DEFINITION_BY_KEY = Object.freeze(
  Object.fromEntries(SLOT_DEFINITIONS.map((definition) => [definition.key, definition])),
);

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

function kindLabelForArtifactKind(artifactKind) {
  return artifactKind ? labelFromToken(artifactKind) : 'Artifact';
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

function defaultArtifactKindForSlot(slotKey) {
  switch (slotKey) {
    case 'overview_map':
      return 'summary_card';
    case 'core_method_derivation':
      return 'derivation_card';
    case 'canonical_worked_example':
      return 'worked_example_card';
    case 'common_traps':
      return 'misconception_card';
    case 'my_notes':
      return 'free_note';
    default:
      return null;
  }
}

function buildArtifactLaunch(record, workspace) {
  if (!record?.artifactId) {
    return null;
  }

  const isPostMortemArtifact = record.artifactKind === 'misconception_card';
  const launchPayload = {
    anchorKind: 'artifact',
    artifactId: record.artifactId,
    mode: isPostMortemArtifact ? 'post_mortem_review' : 'learn_concept',
    topicId: workspace.topicId,
    topicPath: workspace.topicPath,
  };

  if (record.targetQuestionTypeId) {
    launchPayload.currentQuestionTypeId = record.targetQuestionTypeId;
  }

  return {
    ctaLabel: isPostMortemArtifact ? 'Start post-mortem review' : 'Open artifact',
    launchPayload,
  };
}

function readArtifactInbox(workspace = {}) {
  return workspace.artifactInbox || workspace.artifact_inbox || {};
}

function normalizeArtifactRecord(artifact = {}, { source = 'artifact_inbox' } = {}) {
  const artifactId = normalizeString(artifact.artifactId ?? artifact.artifact_id);
  if (!artifactId) {
    return null;
  }

  return {
    artifactId,
    title: normalizeString(artifact.title, artifactId),
    summary: normalizeString(artifact.summary ?? artifact.description, null),
    artifactKind: normalizeString(artifact.artifactKind ?? artifact.artifact_kind, null),
    canonicalHomeTopicId: normalizeString(
      artifact.canonicalHomeTopicId ?? artifact.canonical_home_topic_id,
      null,
    ),
    placementStatus: normalizeString(
      artifact.placementStatus ?? artifact.placement_status,
      source === 'slot_primary' ? 'pinned' : 'inbox',
    ),
    trustStatus: normalizeString(artifact.trustStatus ?? artifact.trust_status, null),
    lifecycleStatus: normalizeString(artifact.lifecycleStatus ?? artifact.lifecycle_status, 'active'),
    slotKey: normalizeString(artifact.slotKey ?? artifact.slot_key, null),
    targetQuestionTypeId: normalizeString(
      artifact.targetQuestionTypeId ?? artifact.target_question_type_id,
      null,
    ),
    updatedAt: artifact.updatedAt ?? artifact.updated_at ?? null,
    source,
  };
}

function buildArtifactStatusState(record, fallbackState = null) {
  if (record?.lifecycleStatus === 'superseded') {
    return {
      value: 'superseded',
      label: 'Superseded artifact',
      tone: 'warning',
      message: 'This artifact is historical lineage and no longer occupies an active slot.',
    };
  }

  if (record?.trustStatus === 'contested') {
    return {
      value: 'contested',
      label: 'Contested artifact',
      tone: 'warning',
      message: 'This artifact is contested and cannot be pinned until the conflict is resolved.',
    };
  }

  if (record?.placementStatus === 'archived') {
    return {
      value: 'archived',
      label: 'Archived artifact',
      tone: 'neutral',
      message: 'Archived artifacts stay visible for lineage but do not occupy a stable slot.',
    };
  }

  return fallbackState;
}

function buildArtifactActionState(record, workspace) {
  const sameCanonicalHome =
    !record?.canonicalHomeTopicId || record.canonicalHomeTopicId === workspace?.topicId;
  const hasCompatibleSlotMetadata =
    Boolean(record?.slotKey)
    && Boolean(record?.artifactKind)
    && isCompatibleArtifactKindForSlot(record.slotKey, record.artifactKind);

  const canPin =
    record?.source === 'artifact_inbox'
    && record?.placementStatus !== 'pinned'
    && record?.lifecycleStatus !== 'superseded'
    && record?.trustStatus !== 'contested'
    && record?.slotKey !== 'review_queue'
    && sameCanonicalHome
    && hasCompatibleSlotMetadata;

  return {
    canPin,
    canUnpin: record?.placementStatus === 'pinned',
    canMarkContested:
      record?.lifecycleStatus !== 'superseded'
      && record?.trustStatus !== 'contested'
      && record?.placementStatus !== 'pinned',
    canSupersede: Boolean(record?.artifactId) && record?.lifecycleStatus !== 'superseded',
    pinBlockedReason:
      canPin
        ? null
        : !sameCanonicalHome
          ? 'Secondary-topic artifacts cannot be pinned into this workspace.'
          : record?.trustStatus === 'contested'
            ? 'Contested artifacts cannot be pinned.'
            : record?.lifecycleStatus === 'superseded'
              ? 'Superseded artifacts cannot be pinned.'
              : record?.placementStatus === 'pinned'
                ? 'This artifact is already pinned.'
                : record?.slotKey === 'review_queue'
                  ? 'Review queue does not accept artifact residency.'
                  : record?.source === 'artifact_inbox' && !hasCompatibleSlotMetadata
                    ? 'This artifact is not compatible with its slot contract.'
                    : null,
    contestedBlockedReason:
      record?.placementStatus === 'pinned' ? 'Unpin before marking contested.' : null,
  };
}

function buildArtifactCard(record, {
  description,
  fallbackState = null,
  placementLabel,
  slotTitle = null,
  workspace,
} = {}) {
  if (!record) {
    return null;
  }

  return {
    artifactId: record.artifactId,
    artifactKind: record.artifactKind,
    canonicalHomeTopicId: record.canonicalHomeTopicId,
    placementStatus: record.placementStatus,
    trustStatus: record.trustStatus,
    lifecycleStatus: record.lifecycleStatus,
    slotKey: record.slotKey,
    slotTitle: slotTitle || SLOT_DEFINITION_BY_KEY[record.slotKey]?.title || null,
    source: record.source,
    title: record.title,
    kindLabel: kindLabelForArtifactKind(record.artifactKind),
    placementLabel,
    description,
    updatedAtLabel: buildUpdatedAtLabel(record.updatedAt),
    state: buildArtifactStatusState(record, fallbackState),
    launch: buildArtifactLaunch(record, workspace),
    availableActions: buildArtifactActionState(record, workspace),
  };
}

function buildCardViewModel(ref, {
  placementLabel,
  description,
  updatedAt,
  state,
  launch = null,
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
    launch: launch || buildReferenceLaunch(ref, workspace),
  };
}

function buildSlotViewModel(definition, slots, slotState, workspace) {
  const slot = readSlotRecord(slots, definition);
  const primaryArtifact = normalizeRef(slot.primaryArtifactRef ?? slot.primary_artifact_ref ?? null);
  const primaryArtifactRecord = primaryArtifact
    ? normalizeArtifactRecord({
      artifactId: primaryArtifact.artifactId ?? primaryArtifact.artifact_id,
      artifactKind: defaultArtifactKindForSlot(definition.key),
      canonicalHomeTopicId: workspace.topicId,
      lifecycleStatus: 'active',
      placementStatus: 'pinned',
      slotKey: definition.key,
      title: primaryArtifact.label,
    }, {
      source: 'slot_primary',
    })
    : null;
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
    primaryArtifactCard: buildArtifactCard(primaryArtifactRecord, {
      placementLabel: 'Canonical resident',
      description: 'Pinned to the canonical slot for this topic.',
      fallbackState: contentState,
      slotTitle: definition.title,
      workspace,
    }) || buildCardViewModel(primaryArtifact, {
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
      launch:
        definition.key === 'common_traps' && reference.kind === 'artifact'
          ? {
            ctaLabel: 'Start post-mortem review',
            launchPayload: {
              anchorKind: 'artifact',
              artifactId: normalizeString(reference.artifactId ?? reference.artifact_id),
              mode: 'post_mortem_review',
              topicId: workspace.topicId,
              topicPath: workspace.topicPath,
            },
          }
          : null,
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

function buildArtifactInboxViewModel(workspace, slotList) {
  const artifactInbox = readArtifactInbox(workspace);
  const linkedReferenceSummary =
    workspace?.linkedReferenceSummary
    || workspace?.linked_reference_summary
    || {};
  const items = (Array.isArray(artifactInbox.items) ? artifactInbox.items : [])
    .map((artifact) => normalizeArtifactRecord(artifact, {
      source: 'artifact_inbox',
    }))
    .filter(Boolean)
    .map((record) => buildArtifactCard(record, {
      placementLabel: record.placementStatus === 'pinned' ? 'Pinned artifact' : 'Artifact inbox',
      description:
        record.summary
        || (
          record.slotKey
            ? `Eligible for ${SLOT_DEFINITION_BY_KEY[record.slotKey]?.title || 'workspace'} residency.`
            : 'Visible from the workspace artifact inbox.'
        ),
      slotTitle: SLOT_DEFINITION_BY_KEY[record.slotKey]?.title || null,
      workspace,
    }));

  return {
    populatedSlotCount: slotList.filter((slot) => slot.primaryArtifact).length,
    emptySlotCount: slotList.filter((slot) => !slot.primaryArtifact).length,
    staleSlotCount: slotList.filter((slot) => slot.surfaceState?.value === 'stale').length,
    missingContentCount: slotList.filter((slot) => slot.contentState).length,
    totalLinkedReferences:
      linkedReferenceSummary.totalLinkedReferences
      ?? linkedReferenceSummary.total_linked_references
      ?? 0,
    items,
  };
}

export function buildWorkspaceViewModel(payload = {}, options = {}) {
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
    reviewQueue: buildReviewQueueViewModel(payload.reviewQueue || payload.review_queue || {}, {
      now: options.now,
    }),
    featureFlags: payload.featureFlags || payload.feature_flags || {},
  };
}

export default buildWorkspaceViewModel;
