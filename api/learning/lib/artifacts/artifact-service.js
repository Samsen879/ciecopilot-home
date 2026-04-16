import { LearningHttpError } from '../http/learning-http.js';
import {
  buildArtifactRef,
  isCompatibleArtifactKindForSlot,
} from '../contracts/runtime-contract.js';
import {
  buildAttemptGroundingRef,
  hasNonAuthoritativeAttemptGrounding,
} from '../contracts/runtime-authority-posture.js';
import { createArtifactRepository } from '../repositories/artifact-repository.js';

const ARTIFACT_INTENTS = new Set([
  'set_placement_status',
  'mark_contested',
  'attach_superseded_by',
]);

const PLACEMENT_STATUSES = new Set(['inbox', 'pinned', 'archived']);

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildInvalidPayload(message, details) {
  return new LearningHttpError('invalid_payload', message, {
    status: 400,
    details,
  });
}

function buildArtifactNotFound() {
  return new LearningHttpError('artifact_not_found', 'Artifact not found.', {
    status: 404,
  });
}

function buildArtifactConflict(message, details) {
  return new LearningHttpError('artifact_state_conflict', message, {
    status: 409,
    details,
  });
}

function cloneArtifact(artifact) {
  return artifact ? JSON.parse(JSON.stringify(artifact)) : artifact;
}

function buildCandidateHome(input = {}) {
  if (input.artifact_kind === 'misconception_card' && input.repair_target_topic_id) {
    return {
      topic_id: input.repair_target_topic_id,
      topic_path: input.repair_target_topic_path ?? null,
    };
  }

  return {
    topic_id: input.canonical_home_topic_id ?? null,
    topic_path: input.canonical_home_topic_path ?? null,
  };
}

function buildArtifactCandidate(input = {}, timestamp) {
  const home = buildCandidateHome(input);
  const sourceAttemptGroundingRef = buildAttemptGroundingRef(input.source_attempt_ref, input);

  return {
    artifact_kind: input.artifact_kind || 'misconception_card',
    canonical_home_topic_id: home.topic_id,
    canonical_home_topic_path: home.topic_path,
    source_session_id: input.source_session_id ?? null,
    source_attempt_id: input.source_attempt_ref?.attempt_id ?? input.source_attempt_id ?? null,
    source_mark_run_id: input.source_mark_run_ref?.mark_run_id ?? input.source_mark_run_id ?? null,
    target_family_id: input.target_family_id ?? null,
    target_question_type_id: input.target_question_type_id ?? null,
    slot_key: input.slot_key ?? 'common_traps',
    trust_status: 'unverified',
    placement_status: 'inbox',
    lifecycle_status: 'active',
    grounding_refs: [
      ...normalizeArray(input.grounding_refs),
      ...normalizeArray(sourceAttemptGroundingRef ? [sourceAttemptGroundingRef] : []),
      ...normalizeArray(input.source_mark_run_ref ? [input.source_mark_run_ref] : []),
    ],
    misconception_tags: normalizeArray(input.misconception_tags),
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createArtifactService({
  artifactRepository = null,
  now = () => new Date(),
} = {}) {
  return {
    async buildArtifactCandidates(input = {}) {
      if (
        (input.artifact_kind || 'misconception_card') === 'misconception_card'
        && normalizeArray(input.misconception_tags).length === 0
      ) {
        return [];
      }

      const candidate = buildArtifactCandidate(input, now().toISOString());

      if (!candidate.canonical_home_topic_id) {
        return [];
      }

      if (!artifactRepository?.insertArtifact) {
        return [candidate];
      }

      const stored = await artifactRepository.insertArtifact(candidate);
      return [
        {
          ...stored,
          canonical_home_topic_path: candidate.canonical_home_topic_path,
          misconception_tags: candidate.misconception_tags,
        },
      ];
    },

    async patchArtifact({
      userId,
      artifactId,
      intent,
      placementStatus = null,
      successorArtifactRef = null,
    } = {}) {
      if (!ARTIFACT_INTENTS.has(intent)) {
        throw buildInvalidPayload('Artifact lifecycle writes must use explicit intents.', {
          field: 'intent',
        });
      }

      const artifact = cloneArtifact(await artifactRepository?.getArtifactById(artifactId));
      if (!artifact) {
        throw buildArtifactNotFound();
      }

      if (intent === 'set_placement_status') {
        return handlePlacementIntent({
          artifactRepository,
          artifact,
          now,
          userId,
          placementStatus,
        });
      }

      if (intent === 'mark_contested') {
        return handleContestedIntent({
          artifactRepository,
          artifact,
          now,
        });
      }

      return handleSupersedeIntent({
        artifactRepository,
        artifact,
        now,
        userId,
        successorArtifactRef,
      });
    },
  };
}

async function handlePlacementIntent({
  artifactRepository,
  artifact,
  now,
  userId,
  placementStatus,
}) {
  if (!PLACEMENT_STATUSES.has(placementStatus)) {
    throw buildInvalidPayload('placement_status must be inbox, pinned, or archived.', {
      field: 'placement_status',
    });
  }

  if (artifact.lifecycle_status === 'superseded') {
    throw buildArtifactConflict('Superseded artifacts cannot change placement.', {
      artifact_id: artifact.artifact_id,
    });
  }

  if (placementStatus === 'pinned' && artifact.trust_status === 'contested') {
    throw buildArtifactConflict('Contested artifacts cannot be pinned.', {
      artifact_id: artifact.artifact_id,
    });
  }

  if (placementStatus === 'pinned' && hasNonAuthoritativeAttemptGrounding(artifact.grounding_refs)) {
    throw buildArtifactConflict(
      'Artifacts grounded by non-authoritative imported attempts cannot gain stable-slot residency.',
      {
        artifact_id: artifact.artifact_id,
      },
    );
  }

  if (
    placementStatus === 'pinned'
    && artifact.slot_key
    && !isCompatibleArtifactKindForSlot(artifact.slot_key, artifact.artifact_kind)
  ) {
    throw buildArtifactConflict('Artifact kind is not compatible with the slot.', {
      artifact_id: artifact.artifact_id,
      slot_key: artifact.slot_key,
      artifact_kind: artifact.artifact_kind,
    });
  }

  let slotTransition = null;
  const topic = artifact.slot_key
    ? await artifactRepository?.getTopicById?.(artifact.canonical_home_topic_id)
    : null;

  if (artifact.slot_key && placementStatus === 'pinned') {
    const slot = await artifactRepository?.setWorkspaceSlotPrimaryArtifact?.({
      userId,
      topicId: artifact.canonical_home_topic_id,
      topicPath: topic?.topic_path ?? null,
      slotKey: artifact.slot_key,
      primaryArtifactRef: buildArtifactRef(artifact.artifact_id),
    });

    slotTransition = slot
      ? {
        outcome: 'pinned_to_slot',
        slot_key: artifact.slot_key,
        workspace_slot_id: slot.workspace_slot_id ?? null,
      }
      : null;
  }

  if (artifact.slot_key && placementStatus !== 'pinned' && artifact.placement_status === 'pinned') {
    const slot = await artifactRepository?.setWorkspaceSlotPrimaryArtifact?.({
      userId,
      topicId: artifact.canonical_home_topic_id,
      topicPath: topic?.topic_path ?? null,
      slotKey: artifact.slot_key,
      primaryArtifactRef: null,
    });

    slotTransition = slot
      ? {
        outcome: 'slot_cleared',
        slot_key: artifact.slot_key,
        workspace_slot_id: slot.workspace_slot_id ?? null,
      }
      : null;
  }

  const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
    placement_status: placementStatus,
    updated_at: now().toISOString(),
  });

  return {
    artifact: updated,
    slot_transition: slotTransition,
  };
}

async function handleContestedIntent({
  artifactRepository,
  artifact,
  now,
}) {
  if (artifact.placement_status === 'pinned') {
    throw buildArtifactConflict('Pinned artifacts cannot be marked contested without unpinning first.', {
      artifact_id: artifact.artifact_id,
    });
  }

  const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
    trust_status: 'contested',
    updated_at: now().toISOString(),
  });

  return {
    artifact: updated,
    slot_transition: null,
  };
}

async function handleSupersedeIntent({
  artifactRepository,
  artifact,
  now,
  userId,
  successorArtifactRef,
}) {
  if (successorArtifactRef?.kind !== 'artifact' || !successorArtifactRef?.artifact_id) {
    throw buildInvalidPayload('attach_superseded_by requires a valid successor_artifact_ref.', {
      field: 'successor_artifact_ref',
    });
  }

  if (artifact.lifecycle_status === 'superseded') {
    throw buildArtifactConflict('Artifact is already superseded.', {
      artifact_id: artifact.artifact_id,
    });
  }

  const successor = cloneArtifact(
    await artifactRepository?.getArtifactById(successorArtifactRef.artifact_id),
  );

  if (!successor) {
    throw buildArtifactConflict('Successor artifact must exist.', {
      successor_artifact_id: successorArtifactRef.artifact_id,
    });
  }

  if (artifact.canonical_home_topic_id !== successor.canonical_home_topic_id) {
    throw buildArtifactConflict('Successor artifact must share the canonical home topic.', {
      artifact_id: artifact.artifact_id,
      successor_artifact_id: successor.artifact_id,
    });
  }

  if ((artifact.slot_key ?? null) !== (successor.slot_key ?? null)) {
    throw buildArtifactConflict('Successor artifact must keep the same slot_key.', {
      artifact_id: artifact.artifact_id,
      successor_artifact_id: successor.artifact_id,
    });
  }

  if (
    successor.slot_key
    && !isCompatibleArtifactKindForSlot(successor.slot_key, successor.artifact_kind)
  ) {
    throw buildArtifactConflict('Successor artifact kind is not compatible with the slot.', {
      slot_key: successor.slot_key,
      artifact_kind: successor.artifact_kind,
    });
  }

  if (artifact.placement_status === 'pinned' && hasNonAuthoritativeAttemptGrounding(successor.grounding_refs)) {
    throw buildArtifactConflict(
      'Artifacts grounded by non-authoritative imported attempts cannot gain stable-slot residency.',
      {
        artifact_id: successor.artifact_id,
      },
    );
  }

  const timestamp = now().toISOString();
  const topic = artifact.slot_key
    ? await artifactRepository?.getTopicById?.(artifact.canonical_home_topic_id)
    : null;
  let slotTransition = null;

  if (artifact.placement_status === 'pinned' && artifact.slot_key) {
    const successorCanHoldPin =
      successor.lifecycle_status !== 'superseded'
      && successor.trust_status !== 'contested'
      && successor.placement_status !== 'archived';

    if (successorCanHoldPin) {
      await artifactRepository.updateArtifact(successor.artifact_id, {
        placement_status: 'pinned',
        updated_at: timestamp,
      });
      const slot = await artifactRepository?.setWorkspaceSlotPrimaryArtifact?.({
        userId,
        topicId: artifact.canonical_home_topic_id,
        topicPath: topic?.topic_path ?? null,
        slotKey: artifact.slot_key,
        primaryArtifactRef: buildArtifactRef(successor.artifact_id),
      });
      slotTransition = {
        outcome: 'moved_to_successor',
        slot_key: artifact.slot_key,
        workspace_slot_id: slot?.workspace_slot_id ?? null,
      };
    } else {
      const slot = await artifactRepository?.setWorkspaceSlotPrimaryArtifact?.({
        userId,
        topicId: artifact.canonical_home_topic_id,
        topicPath: topic?.topic_path ?? null,
        slotKey: artifact.slot_key,
        primaryArtifactRef: null,
      });
      slotTransition = {
        outcome: 'slot_cleared_pending_confirmation',
        slot_key: artifact.slot_key,
        workspace_slot_id: slot?.workspace_slot_id ?? null,
      };
    }
  }

  const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
    lifecycle_status: 'superseded',
    superseded_by_artifact_id: successor.artifact_id,
    placement_status: artifact.placement_status === 'pinned' ? 'archived' : artifact.placement_status,
    updated_at: timestamp,
  });

  return {
    artifact: updated,
    slot_transition: slotTransition,
  };
}

export async function patchLearningArtifact({
  client,
  userId,
  artifactId,
  intent,
  placementStatus = null,
  successorArtifactRef = null,
}, options = {}) {
  const artifactService = createArtifactService({
    ...options,
    artifactRepository: options.artifactRepository || createArtifactRepository(client),
  });

  return artifactService.patchArtifact({
    userId,
    artifactId,
    intent,
    placementStatus,
    successorArtifactRef,
  });
}
