import React from 'react';
import { isCompatibleArtifactKindForSlot } from '../../../api/learning/lib/contracts/runtime-contract.js';
import {
  markArtifactContested,
  pinArtifact,
  supersedeArtifact,
  unpinArtifact,
} from '../../api/learningRuntimeApi.js';
import ArtifactInboxPanel from './ArtifactInboxPanel.js';
import ArtifactSupersedeSheet from './ArtifactSupersedeSheet.js';
import ReviewQueuePanel from './ReviewQueuePanel.js';
import StableSlotPanel from './StableSlotPanel.js';

const h = React.createElement;

function labelFromToken(token, fallback = 'workspace') {
  if (typeof token !== 'string') {
    return fallback;
  }

  const trimmed = token.trim();
  return (trimmed || fallback).replace(/_/g, ' ');
}

function toneClassName(tone) {
  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function cloneViewModel(viewModel) {
  if (!viewModel) {
    return viewModel;
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(viewModel);
  }

  return JSON.parse(JSON.stringify(viewModel));
}

function getSlotDescription(slotKey) {
  return labelFromToken(slotKey, 'workspace slot');
}

function buildArtifactState(card) {
  if (card?.lifecycleStatus === 'superseded') {
    return {
      value: 'superseded',
      label: 'Superseded artifact',
      tone: 'warning',
      message: 'This artifact is historical lineage and no longer occupies an active slot.',
    };
  }

  if (card?.trustStatus === 'contested') {
    return {
      value: 'contested',
      label: 'Contested artifact',
      tone: 'warning',
      message: 'This artifact is contested and cannot be pinned until the conflict is resolved.',
    };
  }

  if (card?.placementStatus === 'archived') {
    return {
      value: 'archived',
      label: 'Archived artifact',
      tone: 'neutral',
      message: 'Archived artifacts stay visible for lineage but do not occupy a stable slot.',
    };
  }

  return card?.state?.value === 'missing_content' ? card.state : null;
}

function buildAvailableActions(card, workspaceTopicId) {
  const sameCanonicalHome =
    !card?.canonicalHomeTopicId || card.canonicalHomeTopicId === workspaceTopicId;
  const hasCompatibleSlotMetadata =
    Boolean(card?.slotKey)
    && Boolean(card?.artifactKind)
    && isCompatibleArtifactKindForSlot(card.slotKey, card.artifactKind);
  const canPin =
    card?.source === 'artifact_inbox'
    && sameCanonicalHome
    && card?.placementStatus !== 'pinned'
    && card?.lifecycleStatus !== 'superseded'
    && card?.trustStatus !== 'contested'
    && Boolean(card?.slotKey)
    && card?.slotKey !== 'review_queue'
    && hasCompatibleSlotMetadata;

  return {
    canPin,
    canUnpin: card?.placementStatus === 'pinned',
    canMarkContested:
      card?.lifecycleStatus !== 'superseded'
      && card?.trustStatus !== 'contested'
      && card?.placementStatus !== 'pinned',
    canSupersede: Boolean(card?.artifactId) && card?.lifecycleStatus !== 'superseded',
    pinBlockedReason:
      canPin
        ? null
        : !sameCanonicalHome
          ? 'Secondary-topic artifacts cannot be pinned into this workspace.'
          : card?.trustStatus === 'contested'
            ? 'Contested artifacts cannot be pinned.'
            : card?.lifecycleStatus === 'superseded'
              ? 'Superseded artifacts cannot be pinned.'
              : card?.slotKey === 'review_queue'
                ? 'Review queue does not accept artifact residency.'
                : card?.source === 'artifact_inbox' && !hasCompatibleSlotMetadata
                  ? 'This artifact is not compatible with its slot contract.'
                  : card?.placementStatus === 'pinned'
                    ? 'This artifact is already pinned.'
                    : null,
    contestedBlockedReason:
      card?.placementStatus === 'pinned' ? 'Unpin before marking contested.' : null,
  };
}

function refreshCard(card, artifact = {}, viewModel, overrides = {}) {
  const workspaceTopicId = viewModel?.workspace?.topicId ?? null;
  const updatedAtLabel = artifact.updatedAt
    ? `Updated ${artifact.updatedAt}`
    : overrides.updatedAtLabel ?? card?.updatedAtLabel ?? null;
  const nextCard = {
    ...card,
    ...overrides,
    artifactId: artifact.artifactId ?? overrides.artifactId ?? card?.artifactId,
    artifactKind: artifact.artifactKind ?? overrides.artifactKind ?? card?.artifactKind ?? null,
    canonicalHomeTopicId:
      artifact.canonicalHomeTopicId
      ?? overrides.canonicalHomeTopicId
      ?? card?.canonicalHomeTopicId
      ?? workspaceTopicId,
    placementStatus:
      artifact.placementStatus ?? overrides.placementStatus ?? card?.placementStatus ?? 'inbox',
    trustStatus: artifact.trustStatus ?? overrides.trustStatus ?? card?.trustStatus ?? null,
    lifecycleStatus:
      artifact.lifecycleStatus ?? overrides.lifecycleStatus ?? card?.lifecycleStatus ?? 'active',
    slotKey: artifact.slotKey ?? overrides.slotKey ?? card?.slotKey ?? null,
    source: overrides.source ?? card?.source ?? 'artifact_inbox',
    updatedAtLabel,
  };

  nextCard.state = overrides.state ?? buildArtifactState(nextCard);
  nextCard.availableActions = buildAvailableActions(nextCard, workspaceTopicId);
  return nextCard;
}

function buildFallbackCard(viewModel, artifactId, slotKey, overrides = {}) {
  return refreshCard({
    artifactId,
    title: artifactId,
    kindLabel: 'Artifact',
    placementLabel: 'Canonical resident',
    description: `Pinned to the canonical ${getSlotDescription(slotKey)} slot for this topic.`,
    slotKey,
    slotTitle: labelFromToken(slotKey),
    source: 'slot_primary',
    placementStatus: 'pinned',
    lifecycleStatus: 'active',
    canonicalHomeTopicId: viewModel?.workspace?.topicId ?? null,
  }, {}, viewModel, overrides);
}

function assignSlot(nextViewModel, slotKey, nextSlot) {
  if (!slotKey || !nextViewModel?.slots) {
    return;
  }

  nextViewModel.slots[slotKey] = nextSlot;
  if (Array.isArray(nextViewModel.slotList)) {
    nextViewModel.slotList = nextViewModel.slotList.map((slot) => (
      slot?.slotKey === slotKey ? nextSlot : slot
    ));
  }
}

function removeInboxArtifact(items, artifactId) {
  return (Array.isArray(items) ? items : []).filter((card) => card.artifactId !== artifactId);
}

function upsertInboxArtifact(items, card) {
  const nextItems = removeInboxArtifact(items, card.artifactId);
  return [...nextItems, card];
}

function recalcArtifactInbox(nextViewModel) {
  if (!nextViewModel?.artifactInbox) {
    return nextViewModel;
  }

  nextViewModel.artifactInbox.populatedSlotCount = nextViewModel.slotList.filter((slot) => slot.primaryArtifact).length;
  nextViewModel.artifactInbox.emptySlotCount = nextViewModel.slotList.filter((slot) => !slot.primaryArtifact).length;
  nextViewModel.artifactInbox.staleSlotCount = nextViewModel.slotList.filter((slot) => slot.surfaceState?.value === 'stale').length;
  nextViewModel.artifactInbox.missingContentCount = nextViewModel.slotList.filter((slot) => slot.contentState).length;
  return nextViewModel;
}

function resetSlotTransitions(nextViewModel) {
  if (!nextViewModel?.slots) {
    return nextViewModel;
  }

  Object.entries(nextViewModel.slots).forEach(([slotKey, slot]) => {
    assignSlot(nextViewModel, slotKey, {
      ...slot,
      transitionState: null,
    });
  });

  return nextViewModel;
}

function buildTransitionState(slotTransition, artifact) {
  switch (slotTransition?.outcome) {
    case 'pinned_to_slot':
      return {
        value: 'pinned_to_slot',
        label: 'Slot updated',
        tone: 'neutral',
        message: `Pinned ${artifact?.artifactId} to ${getSlotDescription(slotTransition.slotKey)}.`,
      };
    case 'slot_cleared':
      return {
        value: 'slot_cleared',
        label: 'Slot cleared',
        tone: 'neutral',
        message: `${getSlotDescription(slotTransition.slotKey)} no longer has a pinned resident.`,
      };
    case 'moved_to_successor':
      return {
        value: 'moved_to_successor',
        label: 'Slot updated',
        tone: 'neutral',
        message: `Pinned residency moved to ${artifact?.supersededByArtifactId}.`,
      };
    case 'slot_cleared_pending_confirmation':
      return {
        value: 'slot_cleared_pending_confirmation',
        label: 'Slot cleared',
        tone: 'warning',
        message: 'The pinned resident was superseded and the slot now needs an explicit replacement.',
      };
    default:
      return null;
  }
}

function findArtifactCard(viewModel, artifactId) {
  if (!artifactId || !viewModel) {
    return null;
  }

  const slotCard = Object.values(viewModel.slots || {}).find(
    (slot) => slot?.primaryArtifactCard?.artifactId === artifactId,
  )?.primaryArtifactCard;
  if (slotCard) {
    return slotCard;
  }

  return (Array.isArray(viewModel.artifactInbox?.items) ? viewModel.artifactInbox.items : []).find(
    (card) => card.artifactId === artifactId,
  ) || null;
}

export function getArtifactSupersedeCandidates(viewModel, artifactCard) {
  const workspaceTopicId = viewModel?.workspace?.topicId ?? null;
  const items = Array.isArray(viewModel?.artifactInbox?.items) ? viewModel.artifactInbox.items : [];

  return items.filter((card) => (
    card.artifactId !== artifactCard?.artifactId
    && card.slotKey === artifactCard?.slotKey
    && (card.canonicalHomeTopicId ?? workspaceTopicId) === (artifactCard?.canonicalHomeTopicId ?? workspaceTopicId)
    && card.lifecycleStatus !== 'superseded'
    && card.trustStatus !== 'contested'
    && card.placementStatus !== 'archived'
  ));
}

export function applyArtifactLifecycleUpdate(viewModel, payload = {}) {
  const nextViewModel = recalcArtifactInbox(resetSlotTransitions(cloneViewModel(viewModel)));
  const artifact = payload.artifact || null;
  const slotTransition = payload.slotTransition || null;
  const slotKey = slotTransition?.slotKey ?? artifact?.slotKey ?? null;
  const currentSlot = slotKey ? nextViewModel?.slots?.[slotKey] : null;
  const currentPrimaryCard = currentSlot?.primaryArtifactCard || null;
  const currentInboxItems = Array.isArray(nextViewModel?.artifactInbox?.items)
    ? nextViewModel.artifactInbox.items
    : [];

  if (artifact && artifact.artifactId) {
    nextViewModel.artifactInbox.items = currentInboxItems.map((card) => (
      card.artifactId === artifact.artifactId
        ? refreshCard(card, artifact, nextViewModel)
        : card
    ));
  }

  if (!slotKey || !currentSlot) {
    return recalcArtifactInbox(nextViewModel);
  }

  const transitionState = buildTransitionState(slotTransition, artifact);

  if (slotTransition?.outcome === 'pinned_to_slot') {
    const pinnedCard = refreshCard(
      findArtifactCard(nextViewModel, artifact?.artifactId) || buildFallbackCard(nextViewModel, artifact?.artifactId, slotKey),
      artifact,
      nextViewModel,
      {
        placementLabel: 'Canonical resident',
        description: 'Pinned to the canonical slot for this topic.',
        placementStatus: 'pinned',
        source: 'slot_primary',
      },
    );

    assignSlot(nextViewModel, slotKey, {
      ...currentSlot,
      primaryArtifact: {
        kind: 'artifact',
        artifactId: pinnedCard.artifactId,
        label: pinnedCard.title,
      },
      primaryArtifactCard: pinnedCard,
      emptyState: null,
      transitionState,
    });
    nextViewModel.artifactInbox.items = removeInboxArtifact(nextViewModel.artifactInbox.items, pinnedCard.artifactId);
  } else if (slotTransition?.outcome === 'slot_cleared') {
    const inboxCard = refreshCard(currentPrimaryCard, artifact, nextViewModel, {
      placementLabel: 'Artifact inbox',
      description: `Eligible for ${getSlotDescription(slotKey)} residency.`,
      placementStatus: 'inbox',
      source: 'artifact_inbox',
    });

    assignSlot(nextViewModel, slotKey, {
      ...currentSlot,
      primaryArtifact: null,
      primaryArtifactCard: null,
      emptyState: {
        label: 'Empty slot',
        message: 'No canonical artifact is pinned to this slot yet.',
      },
      transitionState,
    });
    nextViewModel.artifactInbox.items = upsertInboxArtifact(nextViewModel.artifactInbox.items, inboxCard);
  } else if (slotTransition?.outcome === 'moved_to_successor') {
    const successorId = artifact?.supersededByArtifactId;
    const successorCard = refreshCard(
      findArtifactCard(nextViewModel, successorId) || buildFallbackCard(nextViewModel, successorId, slotKey),
      {
        artifactId: successorId,
        canonicalHomeTopicId: artifact?.canonicalHomeTopicId,
        placementStatus: 'pinned',
        lifecycleStatus: 'active',
        slotKey,
      },
      nextViewModel,
      {
        placementLabel: 'Canonical resident',
        description: 'Pinned to the canonical slot for this topic.',
        source: 'slot_primary',
      },
    );

    assignSlot(nextViewModel, slotKey, {
      ...currentSlot,
      primaryArtifact: {
        kind: 'artifact',
        artifactId: successorCard.artifactId,
        label: successorCard.title,
      },
      primaryArtifactCard: successorCard,
      emptyState: null,
      transitionState,
    });
    nextViewModel.artifactInbox.items = removeInboxArtifact(nextViewModel.artifactInbox.items, successorId);
    nextViewModel.artifactInbox.items = removeInboxArtifact(nextViewModel.artifactInbox.items, artifact?.artifactId);
  } else if (slotTransition?.outcome === 'slot_cleared_pending_confirmation') {
    assignSlot(nextViewModel, slotKey, {
      ...currentSlot,
      primaryArtifact: null,
      primaryArtifactCard: null,
      emptyState: {
        label: 'Empty slot',
        message: 'No canonical artifact is pinned to this slot yet.',
      },
      transitionState,
    });
    nextViewModel.artifactInbox.items = removeInboxArtifact(nextViewModel.artifactInbox.items, artifact?.artifactId);
  } else if (artifact?.trustStatus === 'contested') {
    nextViewModel.artifactInbox.items = nextViewModel.artifactInbox.items.map((card) => (
      card.artifactId === artifact.artifactId
        ? refreshCard(card, artifact, nextViewModel)
        : card
    ));
  }

  return recalcArtifactInbox(nextViewModel);
}

export function applyArtifactLifecycleError(viewModel, artifactCard, error = {}) {
  const nextViewModel = resetSlotTransitions(cloneViewModel(viewModel));
  const slotKey = artifactCard?.slotKey;
  const currentSlot = slotKey ? nextViewModel?.slots?.[slotKey] : null;

  if (!slotKey || !currentSlot) {
    return nextViewModel;
  }

  assignSlot(nextViewModel, slotKey, {
    ...currentSlot,
    transitionState: {
      value: error?.code ?? 'runtime_error',
      label: error?.code === 'artifact_state_conflict' ? 'Runtime conflict' : 'Runtime error',
      tone: 'warning',
      message: error?.message || 'The artifact lifecycle update failed.',
    },
  });

  return nextViewModel;
}

function renderWorkspaceHeader(workspace) {
  return h('section', {
    key: 'header',
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('p', {
      key: 'eyebrow',
      className: 'text-sm font-medium uppercase tracking-[0.24em] text-slate-500',
    }, 'Topic workspace'),
    h('h1', {
      key: 'title',
      className: 'mt-3 text-3xl font-semibold tracking-tight text-slate-950',
    }, workspace?.topicPath || 'Workspace'),
    h('p', {
      key: 'body',
      className: 'mt-3 text-sm leading-6 text-slate-600',
    }, 'Canonical slot artifacts stay separate from linked references and the topic-filtered review queue.'),
  ]);
}

export default function WorkspaceShell({
  onCompleteReviewTask = () => {},
  onLaunch = () => {},
  onOpenGlobalQueue = null,
  onReviewQueueDraftChange = () => {},
  onRescheduleReviewTask = () => {},
  reviewQueueDrafts = {},
  reviewQueueMutationStateByTaskId = {},
  viewModel,
}) {
  const [localViewModel, setLocalViewModel] = React.useState(viewModel);
  const [feedback, setFeedback] = React.useState(null);
  const [pendingMutation, setPendingMutation] = React.useState(null);
  const [supersedeState, setSupersedeState] = React.useState(null);

  React.useEffect(() => {
    setLocalViewModel(viewModel);
    setFeedback(null);
    setPendingMutation(null);
    setSupersedeState(null);
  }, [viewModel]);

  const slotList = Array.isArray(localViewModel?.slotList) ? localViewModel.slotList : [];

  async function runLifecycleMutation(intent, artifactCard, options = {}) {
    if (!artifactCard?.artifactId) {
      return;
    }

    setPendingMutation({
      artifactId: artifactCard.artifactId,
      intent,
    });
    setFeedback(null);

    try {
      let result;
      if (intent === 'pin') {
        result = await pinArtifact(artifactCard.artifactId);
      } else if (intent === 'unpin') {
        result = await unpinArtifact(artifactCard.artifactId);
      } else if (intent === 'mark_contested') {
        result = await markArtifactContested(artifactCard.artifactId);
      } else {
        result = await supersedeArtifact(artifactCard.artifactId, options.successorArtifactRef);
      }

      setLocalViewModel((current) => applyArtifactLifecycleUpdate(current, result));
      setFeedback({
        tone: result?.slotTransition?.outcome === 'slot_cleared_pending_confirmation' ? 'warning' : 'neutral',
        label: result?.slotTransition ? 'Workspace updated' : 'Artifact updated',
        message:
          result?.slotTransition?.outcome === 'moved_to_successor'
            ? `Superseded ${artifactCard.title || artifactCard.artifactId}; pinned residency moved to ${result.artifact?.supersededByArtifactId}.`
            : result?.slotTransition?.outcome === 'slot_cleared_pending_confirmation'
              ? `Superseded ${artifactCard.title || artifactCard.artifactId}; the slot is now empty pending an explicit replacement.`
              : result?.slotTransition?.outcome === 'slot_cleared'
                ? `Unpinned ${artifactCard.title || artifactCard.artifactId}; the slot is now empty.`
                : result?.slotTransition?.outcome === 'pinned_to_slot'
                  ? `Pinned ${artifactCard.title || artifactCard.artifactId} into ${getSlotDescription(result.slotTransition.slotKey)}.`
                  : result?.artifact?.trustStatus === 'contested'
                    ? `Marked ${artifactCard.title || artifactCard.artifactId} contested.`
                    : 'Artifact lifecycle update applied.',
      });
      if (intent === 'attach_superseded_by') {
        setSupersedeState(null);
      }
    } catch (error) {
      setLocalViewModel((current) => applyArtifactLifecycleError(current, artifactCard, error));
      setFeedback({
        tone: error?.code === 'artifact_state_conflict' ? 'warning' : 'error',
        label: error?.code === 'artifact_state_conflict' ? 'Runtime conflict' : 'Runtime error',
        message: error?.message || 'Artifact lifecycle update failed.',
      });

      if (intent === 'attach_superseded_by') {
        setSupersedeState((current) => (
          current
            ? {
              ...current,
              errorMessage: error?.message || 'Artifact lifecycle update failed.',
            }
            : current
        ));
      }
    } finally {
      setPendingMutation(null);
    }
  }

  function handleOpenSupersede(artifactCard) {
    const candidates = getArtifactSupersedeCandidates(localViewModel, artifactCard);
    setSupersedeState({
      artifactId: artifactCard.artifactId,
      selectedArtifactId: candidates[0]?.artifactId ?? '',
      manualArtifactId: '',
      errorMessage: null,
    });
  }

  function handleConfirmSupersede() {
    const artifactCard = findArtifactCard(localViewModel, supersedeState?.artifactId);
    const successorArtifactId = (supersedeState?.manualArtifactId || supersedeState?.selectedArtifactId || '').trim();

    if (!artifactCard) {
      setSupersedeState(null);
      return;
    }

    if (!successorArtifactId) {
      setSupersedeState((current) => ({
        ...current,
        errorMessage: 'Select a successor or enter an artifact ID before confirming.',
      }));
      return;
    }

    runLifecycleMutation('attach_superseded_by', artifactCard, {
      successorArtifactRef: {
        kind: 'artifact',
        artifact_id: successorArtifactId,
      },
    });
  }
  const slotList = Array.isArray(localViewModel?.slotList) ? localViewModel.slotList : [];

  return h('div', { className: 'grid gap-6' }, [
    renderWorkspaceHeader(viewModel?.workspace || {}),
    feedback
      ? h('section', {
        key: 'feedback',
        className: `rounded-3xl border px-5 py-4 text-sm ${toneClassName(feedback.tone)}`,
      }, [
        h('p', {
          key: 'label',
          className: 'font-semibold',
        }, feedback.label),
        h('p', {
          key: 'message',
          className: 'mt-1 leading-6',
        }, feedback.message),
      ])
      : null,
    supersedeState
      ? h(ArtifactSupersedeSheet, {
        key: 'supersede-sheet',
        artifact: findArtifactCard(localViewModel, supersedeState.artifactId),
        candidates: getArtifactSupersedeCandidates(
          localViewModel,
          findArtifactCard(localViewModel, supersedeState.artifactId),
        ),
        errorMessage: supersedeState.errorMessage,
        manualArtifactId: supersedeState.manualArtifactId,
        onCancel: () => setSupersedeState(null),
        onConfirm: handleConfirmSupersede,
        onManualArtifactIdChange: (manualArtifactId) => setSupersedeState((current) => ({
          ...current,
          manualArtifactId,
          errorMessage: null,
        })),
        onSelectCandidate: (selectedArtifactId) => setSupersedeState((current) => ({
          ...current,
          selectedArtifactId,
          errorMessage: null,
        })),
        pending:
          pendingMutation?.artifactId === supersedeState.artifactId
          && pendingMutation?.intent === 'attach_superseded_by',
        selectedArtifactId: supersedeState.selectedArtifactId,
      })
      : null,
    h('section', { key: 'slots', className: 'grid gap-4 lg:grid-cols-2' }, slotList.map((slot) => h(
      StableSlotPanel,
      {
        key: slot.slotKey,
        onLaunch,
        onMarkContested: (artifactCard) => runLifecycleMutation('mark_contested', artifactCard),
        onPin: (artifactCard) => runLifecycleMutation('pin', artifactCard),
        onSupersede: handleOpenSupersede,
        onUnpin: (artifactCard) => runLifecycleMutation('unpin', artifactCard),
        pendingArtifactId: pendingMutation?.artifactId ?? null,
        pendingIntent: pendingMutation?.intent ?? null,
        slot,
      },
    ))),
    h('div', { key: 'secondary', className: 'grid gap-4 lg:grid-cols-2' }, [
      h(ArtifactInboxPanel, {
        key: 'artifact-inbox',
        artifactInbox: localViewModel?.artifactInbox || {},
        onLaunch,
        onMarkContested: (artifactCard) => runLifecycleMutation('mark_contested', artifactCard),
        onPin: (artifactCard) => runLifecycleMutation('pin', artifactCard),
        onSupersede: handleOpenSupersede,
        onUnpin: (artifactCard) => runLifecycleMutation('unpin', artifactCard),
        pendingArtifactId: pendingMutation?.artifactId ?? null,
        pendingIntent: pendingMutation?.intent ?? null,
      }),
      h(ReviewQueuePanel, {
        key: 'review-queue',
        reviewQueue: localViewModel?.reviewQueue || {},
        drafts: reviewQueueDrafts,
        mutationStateByTaskId: reviewQueueMutationStateByTaskId,
        onLaunch,
        onDraftChange: onReviewQueueDraftChange,
        onComplete: onCompleteReviewTask,
        onReschedule: onRescheduleReviewTask,
        onOpenGlobalQueue,
      }),
    ]),
  ]);
}
