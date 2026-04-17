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

const LEGACY_ARTIFACT_INTENTS = new Set([
  'set_placement_status',
  'mark_contested',
  'attach_superseded_by',
]);

const FLAGGED_ARTIFACT_INTENTS = new Set([
  ...LEGACY_ARTIFACT_INTENTS,
  'mark_verified',
  'mark_released',
]);

const PLACEMENT_STATUSES = new Set(['inbox', 'pinned', 'archived']);

export const ARTIFACT_LIFECYCLE_FLAG = 'LEARNING_ARTIFACT_LIFECYCLE_ENABLED';

const ARTIFACT_STATE_TRANSITIONS = Object.freeze({
  unverified: new Set(['verified']),
  verified: new Set(['released', 'contested', 'superseded']),
  released: new Set(['contested', 'superseded']),
  contested: new Set(['verified', 'released']),
  superseded: new Set(),
});

const ARTIFACT_CAPABILITY_MATRIX = Object.freeze({
  unverified: Object.freeze({
    shell_visible: true,
    body_visible: false,
    resident_eligible: false,
    authoritative_automation_eligible: false,
  }),
  verified: Object.freeze({
    shell_visible: true,
    body_visible: true,
    resident_eligible: true,
    authoritative_automation_eligible: false,
  }),
  released: Object.freeze({
    shell_visible: true,
    body_visible: true,
    resident_eligible: true,
    authoritative_automation_eligible: true,
  }),
  contested: Object.freeze({
    shell_visible: true,
    body_visible: false,
    resident_eligible: false,
    authoritative_automation_eligible: false,
  }),
  superseded: Object.freeze({
    shell_visible: false,
    body_visible: false,
    resident_eligible: false,
    authoritative_automation_eligible: false,
  }),
});

export function isArtifactLifecycleEnabled(env = process.env) {
  return env?.[ARTIFACT_LIFECYCLE_FLAG] === 'true';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasTypedRef(value) {
  return isPlainObject(value) && typeof value.kind === 'string' && value.kind.length > 0;
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

export function buildArtifactCandidate(input = {}, timestamp) {
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
    artifact_state: 'unverified',
    trust_status: 'unverified',
    placement_status: 'inbox',
    lifecycle_status: 'active',
    verified_by: null,
    verified_at: null,
    verification_evidence_ref: null,
    released_by: null,
    released_at: null,
    release_evidence_ref: null,
    contested_by: null,
    contested_at: null,
    contested_reason: null,
    superseded_by_artifact_id: null,
    superseded_at: null,
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

async function materializeArtifactCandidate({
  candidate,
  artifactRepository,
  lifecycleFlagEnabled,
} = {}) {
  if (!candidate || !candidate.canonical_home_topic_id) {
    return [];
  }

  if (!artifactRepository?.insertArtifact) {
    return [normalizeArtifactResult(candidate, lifecycleFlagEnabled)];
  }

  const stored = await artifactRepository.insertArtifact(candidate);
  return [
    normalizeArtifactResult({
      ...stored,
      canonical_home_topic_path: candidate.canonical_home_topic_path,
      misconception_tags: candidate.misconception_tags,
    }, lifecycleFlagEnabled),
  ];
}

function hasVerificationAuditEvidence(artifact = {}) {
  return (
    typeof artifact.verified_by === 'string'
    && typeof artifact.verified_at === 'string'
    && hasTypedRef(artifact.verification_evidence_ref)
  );
}

function hasReleaseAuditEvidence(artifact = {}) {
  return (
    typeof artifact.released_by === 'string'
    && typeof artifact.released_at === 'string'
    && hasTypedRef(artifact.release_evidence_ref)
  );
}

function hasContestedMarkers(artifact = {}) {
  return (
    artifact.artifact_state === 'contested'
    || artifact.trust_status === 'contested'
    || typeof artifact.contested_by === 'string'
    || typeof artifact.contested_at === 'string'
    || (typeof artifact.contested_reason === 'string' && artifact.contested_reason.trim().length > 0)
  );
}

function hasSupersededMarkers(artifact = {}) {
  return (
    artifact.artifact_state === 'superseded'
    || artifact.lifecycle_status === 'superseded'
    || typeof artifact.superseded_by_artifact_id === 'string'
    || typeof artifact.superseded_at === 'string'
  );
}

function resolveArtifactLifecycleState(artifact = {}) {
  if (hasSupersededMarkers(artifact)) {
    return 'superseded';
  }

  if (hasContestedMarkers(artifact)) {
    return 'contested';
  }

  if (hasReleaseAuditEvidence(artifact)) {
    return 'released';
  }

  if (hasVerificationAuditEvidence(artifact)) {
    return 'verified';
  }

  if (typeof artifact.artifact_state === 'string' && ARTIFACT_CAPABILITY_MATRIX[artifact.artifact_state]) {
    return artifact.artifact_state;
  }

  return 'unverified';
}

export function getArtifactLifecycleCapabilities(artifactState = 'unverified') {
  const capabilities = ARTIFACT_CAPABILITY_MATRIX[artifactState] || ARTIFACT_CAPABILITY_MATRIX.unverified;
  return {
    shell_visible: capabilities.shell_visible,
    body_visible: capabilities.body_visible,
    resident_eligible: capabilities.resident_eligible,
    authoritative_automation_eligible: capabilities.authoritative_automation_eligible,
  };
}

export function normalizeArtifactLifecycleArtifact(artifact) {
  if (!artifact) {
    return artifact;
  }

  const cloned = cloneArtifact(artifact);
  const artifactState = resolveArtifactLifecycleState(cloned);

  return {
    ...cloned,
    artifact_state: artifactState,
    capabilities: getArtifactLifecycleCapabilities(artifactState),
  };
}

function normalizeArtifactResult(artifact, lifecycleFlagEnabled) {
  return lifecycleFlagEnabled ? normalizeArtifactLifecycleArtifact(artifact) : artifact;
}

function assertLifecycleTransition(artifact, nextState) {
  const currentState = artifact.artifact_state ?? resolveArtifactLifecycleState(artifact);
  const allowedTransitions = ARTIFACT_STATE_TRANSITIONS[currentState] || new Set();

  if (!allowedTransitions.has(nextState)) {
    throw buildArtifactConflict(`Artifact cannot transition from ${currentState} to ${nextState}.`, {
      artifact_id: artifact.artifact_id,
      current_state: currentState,
      next_state: nextState,
    });
  }
}

function requireActorUserId(userId, field) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw buildInvalidPayload(`${field} requires an authenticated operator actor.`, {
      field,
    });
  }
}

function requireEvidenceRef(value, field, message) {
  if (!hasTypedRef(value)) {
    throw buildInvalidPayload(message, {
      field,
    });
  }
}

function requireContestedReason(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw buildInvalidPayload('mark_contested requires a contested_reason.', {
      field: 'contested_reason',
    });
  }

  return value.trim();
}

export function createArtifactService({
  artifactRepository = null,
  now = () => new Date(),
  lifecycleFlagEnabled = isArtifactLifecycleEnabled(),
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
      return materializeArtifactCandidate({
        candidate,
        artifactRepository,
        lifecycleFlagEnabled,
      });
    },

    async materializeProposedArtifactSuggestion(candidate = {}) {
      return materializeArtifactCandidate({
        candidate,
        artifactRepository,
        lifecycleFlagEnabled,
      });
    },

    async patchArtifact({
      userId,
      artifactId,
      intent,
      placementStatus = null,
      successorArtifactRef = null,
      verificationEvidenceRef = null,
      releaseEvidenceRef = null,
      contestedReason = null,
    } = {}) {
      const allowedIntents = lifecycleFlagEnabled ? FLAGGED_ARTIFACT_INTENTS : LEGACY_ARTIFACT_INTENTS;

      if (!allowedIntents.has(intent)) {
        throw buildInvalidPayload('Artifact lifecycle writes must use explicit intents.', {
          field: 'intent',
        });
      }

      const storedArtifact = cloneArtifact(await artifactRepository?.getArtifactById(artifactId));
      if (!storedArtifact) {
        throw buildArtifactNotFound();
      }

      const artifact = normalizeArtifactResult(storedArtifact, lifecycleFlagEnabled);

      if (intent === 'set_placement_status') {
        return handlePlacementIntent({
          artifactRepository,
          artifact,
          now,
          userId,
          placementStatus,
          lifecycleFlagEnabled,
        });
      }

      if (lifecycleFlagEnabled && intent === 'mark_verified') {
        return handleVerifyIntent({
          artifactRepository,
          artifact,
          now,
          userId,
          verificationEvidenceRef,
        });
      }

      if (lifecycleFlagEnabled && intent === 'mark_released') {
        return handleReleaseIntent({
          artifactRepository,
          artifact,
          now,
          userId,
          releaseEvidenceRef,
        });
      }

      if (intent === 'mark_contested') {
        return handleContestedIntent({
          artifactRepository,
          artifact,
          now,
          userId,
          contestedReason,
          lifecycleFlagEnabled,
        });
      }

      return handleSupersedeIntent({
        artifactRepository,
        artifact,
        now,
        userId,
        successorArtifactRef,
        lifecycleFlagEnabled,
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
  lifecycleFlagEnabled,
}) {
  if (!PLACEMENT_STATUSES.has(placementStatus)) {
    throw buildInvalidPayload('placement_status must be inbox, pinned, or archived.', {
      field: 'placement_status',
    });
  }

  if (artifact.lifecycle_status === 'superseded' || artifact.artifact_state === 'superseded') {
    throw buildArtifactConflict('Superseded artifacts cannot change placement.', {
      artifact_id: artifact.artifact_id,
    });
  }

  if (placementStatus === 'pinned' && lifecycleFlagEnabled && !artifact.capabilities.resident_eligible) {
    throw buildArtifactConflict('Artifact is not eligible for stable residency.', {
      artifact_id: artifact.artifact_id,
      artifact_state: artifact.artifact_state,
    });
  }

  if (!lifecycleFlagEnabled && placementStatus === 'pinned' && artifact.trust_status === 'contested') {
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
  const timestamp = now().toISOString();
  const topic = artifact.slot_key
    ? await artifactRepository?.getTopicById?.(artifact.canonical_home_topic_id)
    : null;
  const existingSlot = artifact.slot_key
    ? await artifactRepository?.getWorkspaceSlotByTopicAndKey?.({
      userId,
      topicId: artifact.canonical_home_topic_id,
      slotKey: artifact.slot_key,
    })
    : null;

  if (artifact.slot_key && placementStatus === 'pinned') {
    const priorPrimaryArtifactId = existingSlot?.primary_artifact_ref?.artifact_id ?? null;

    if (priorPrimaryArtifactId && priorPrimaryArtifactId !== artifact.artifact_id) {
      const priorPrimaryArtifact = await artifactRepository?.getArtifactById?.(priorPrimaryArtifactId);
      if (priorPrimaryArtifact?.placement_status === 'pinned') {
        await artifactRepository.updateArtifact(priorPrimaryArtifactId, {
          placement_status: 'inbox',
          updated_at: timestamp,
        });
      }
    }

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
    updated_at: timestamp,
  });

  return {
    artifact: normalizeArtifactResult(updated, lifecycleFlagEnabled),
    slot_transition: slotTransition,
  };
}

async function handleVerifyIntent({
  artifactRepository,
  artifact,
  now,
  userId,
  verificationEvidenceRef,
}) {
  requireActorUserId(userId, 'verified_by');
  requireEvidenceRef(
    verificationEvidenceRef,
    'verification_evidence_ref',
    'mark_verified requires a valid verification_evidence_ref.',
  );
  assertLifecycleTransition(artifact, 'verified');

  const timestamp = now().toISOString();
  const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
    artifact_state: 'verified',
    trust_status: 'grounded',
    lifecycle_status: 'active',
    verified_by: userId,
    verified_at: timestamp,
    verification_evidence_ref: verificationEvidenceRef,
    released_by: null,
    released_at: null,
    release_evidence_ref: null,
    contested_by: null,
    contested_at: null,
    contested_reason: null,
    updated_at: timestamp,
  });

  return {
    artifact: normalizeArtifactLifecycleArtifact(updated),
    slot_transition: null,
  };
}

async function handleReleaseIntent({
  artifactRepository,
  artifact,
  now,
  userId,
  releaseEvidenceRef,
}) {
  requireActorUserId(userId, 'released_by');
  requireEvidenceRef(
    releaseEvidenceRef,
    'release_evidence_ref',
    'mark_released requires a valid release_evidence_ref.',
  );
  assertLifecycleTransition(artifact, 'released');

  if (!hasVerificationAuditEvidence(artifact)) {
    throw buildArtifactConflict('Released artifacts require explicit verification evidence first.', {
      artifact_id: artifact.artifact_id,
      artifact_state: artifact.artifact_state,
    });
  }

  const timestamp = now().toISOString();
  const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
    artifact_state: 'released',
    trust_status: 'grounded',
    lifecycle_status: 'active',
    released_by: userId,
    released_at: timestamp,
    release_evidence_ref: releaseEvidenceRef,
    contested_by: null,
    contested_at: null,
    contested_reason: null,
    updated_at: timestamp,
  });

  return {
    artifact: normalizeArtifactLifecycleArtifact(updated),
    slot_transition: null,
  };
}

async function handleContestedIntent({
  artifactRepository,
  artifact,
  now,
  userId,
  contestedReason,
  lifecycleFlagEnabled,
}) {
  if (artifact.placement_status === 'pinned') {
    throw buildArtifactConflict('Pinned artifacts cannot be marked contested without unpinning first.', {
      artifact_id: artifact.artifact_id,
    });
  }

  const timestamp = now().toISOString();

  if (!lifecycleFlagEnabled) {
    const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
      trust_status: 'contested',
      updated_at: timestamp,
    });

    return {
      artifact: updated,
      slot_transition: null,
    };
  }

  requireActorUserId(userId, 'contested_by');
  const normalizedReason = requireContestedReason(contestedReason);
  assertLifecycleTransition(artifact, 'contested');

  const updated = await artifactRepository.updateArtifact(artifact.artifact_id, {
    artifact_state: 'contested',
    trust_status: 'contested',
    lifecycle_status: 'active',
    contested_by: userId,
    contested_at: timestamp,
    contested_reason: normalizedReason,
    updated_at: timestamp,
  });

  return {
    artifact: normalizeArtifactLifecycleArtifact(updated),
    slot_transition: null,
  };
}

async function handleSupersedeIntent({
  artifactRepository,
  artifact,
  now,
  userId,
  successorArtifactRef,
  lifecycleFlagEnabled,
}) {
  if (successorArtifactRef?.kind !== 'artifact' || !successorArtifactRef?.artifact_id) {
    throw buildInvalidPayload('attach_superseded_by requires a valid successor_artifact_ref.', {
      field: 'successor_artifact_ref',
    });
  }

  if (artifact.lifecycle_status === 'superseded' || artifact.artifact_state === 'superseded') {
    throw buildArtifactConflict('Artifact is already superseded.', {
      artifact_id: artifact.artifact_id,
    });
  }

  if (lifecycleFlagEnabled) {
    assertLifecycleTransition(artifact, 'superseded');
  }

  const successor = normalizeArtifactResult(cloneArtifact(
    await artifactRepository?.getArtifactById(successorArtifactRef.artifact_id),
  ), lifecycleFlagEnabled);

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

  if (lifecycleFlagEnabled && !successor.capabilities.resident_eligible) {
    throw buildArtifactConflict('Successor artifact is not eligible for stable residency.', {
      artifact_id: artifact.artifact_id,
      successor_artifact_id: successor.artifact_id,
      successor_artifact_state: successor.artifact_state,
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
    const successorCanHoldPin = lifecycleFlagEnabled
      ? successor.capabilities.resident_eligible && successor.placement_status !== 'archived'
      : successor.lifecycle_status !== 'superseded'
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
    ...(lifecycleFlagEnabled ? { artifact_state: 'superseded', superseded_at: timestamp } : {}),
    lifecycle_status: 'superseded',
    superseded_by_artifact_id: successor.artifact_id,
    placement_status: artifact.placement_status === 'pinned' ? 'archived' : artifact.placement_status,
    updated_at: timestamp,
  });

  return {
    artifact: normalizeArtifactResult(updated, lifecycleFlagEnabled),
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
  verificationEvidenceRef = null,
  releaseEvidenceRef = null,
  contestedReason = null,
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
    verificationEvidenceRef,
    releaseEvidenceRef,
    contestedReason,
  });
}
