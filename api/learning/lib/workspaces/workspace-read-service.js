import { buildArtifactRef, STABLE_SLOT_KEYS } from '../contracts/runtime-contract.js';
import { LearningHttpError } from '../http/learning-http.js';
import { LEARNING_ERROR_CODES } from '../contracts/error-contract.js';
import {
  isArtifactLifecycleEnabled,
  normalizeArtifactLifecycleArtifact,
} from '../artifacts/artifact-service.js';
import {
  hasNonAuthoritativeAttemptGrounding,
} from '../contracts/runtime-authority-posture.js';
import { listArtifactsByTopic } from '../repositories/artifact-repository.js';
import {
  ensurePaperWorkspaceExists,
  ensureWorkspaceExists,
  fetchPaperWorkspaceProjection,
  fetchWorkspaceProjection,
} from '../repositories/workspace-repository.js';
import {
  LEGACY_TOPIC_WORKSPACE_ROUTE,
  PAPER_WORKSPACE_ROUTE,
  getSubjectCodeForPaperScope,
  normalizePaperScope,
} from './paper-workspace-contract.js';
import {
  compareReviewTaskProjectionItems,
  deriveReviewQueueProjection,
  summarizeReviewQueueItems,
} from '../review/review-scheduler-policy.js';
import {
  buildSubjectRuntimePostureOrNull,
  resolveSubjectCodeFromRuntimeInput,
} from '../subjects/subject-adapter-registry.js';
import {
  buildSessionResumeGuidance,
  createSessionHandoff,
} from '../session-runtime/session-handoff.js';

const ACTIVE_REVIEW_TASK_STATUSES = new Set(['open', 'partial']);
const ARTIFACT_SLOT_KEYS = new Set(STABLE_SLOT_KEYS.filter((slotKey) => slotKey !== 'review_queue'));

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

function getCanonicalQueueIdentity(item = {}) {
  const targetTopicId = normalizeString(item?.target_topic_id);
  if (!targetTopicId) {
    return null;
  }

  return {
    target_topic_id: targetTopicId,
    target_family_id: normalizeString(item?.target_family_id),
    target_question_type_id: normalizeString(item?.target_question_type_id),
  };
}

function getCanonicalQueueIdentityKey(item = {}) {
  const identity = getCanonicalQueueIdentity(item);
  return identity ? JSON.stringify(identity) : null;
}

function dedupeStrings(values = []) {
  const seen = new Set();

  return (Array.isArray(values) ? values : []).flatMap((value) => {
    const normalized = normalizeString(value);
    if (!normalized || seen.has(normalized)) {
      return [];
    }

    seen.add(normalized);
    return [normalized];
  });
}

function dedupeReviewTaskRefs(refs = []) {
  return dedupeBy(refs, (ref) => normalizeString(ref?.review_task_id));
}

function collectReviewTaskSourceQuestionIds(item = {}) {
  const explanation = isPlainObject(item?.explanation) ? item.explanation : {};
  const attemptHistory = isPlainObject(explanation.attempt_history)
    ? explanation.attempt_history
    : {};
  const evidence = isPlainObject(explanation.evidence) ? explanation.evidence : {};

  return [
    ...(Array.isArray(attemptHistory.source_question_ids) ? attemptHistory.source_question_ids : []),
    evidence.source_question_id,
    item.source_question_id,
  ];
}

function collectReviewTaskSourceAttemptRefs(item = {}) {
  const explanation = isPlainObject(item?.explanation) ? item.explanation : {};
  const attemptHistory = isPlainObject(explanation.attempt_history)
    ? explanation.attempt_history
    : {};
  const evidence = isPlainObject(explanation.evidence) ? explanation.evidence : {};

  return [
    ...(Array.isArray(attemptHistory.source_attempt_refs) ? attemptHistory.source_attempt_refs : []),
    attemptHistory.latest_source_attempt_ref,
    evidence.source_attempt_ref,
    item.source_attempt_ref,
  ];
}

function buildProjectionAttribution(item = {}, foldedItems = []) {
  const canonicalQueueIdentity = getCanonicalQueueIdentity(item);

  return {
    canonical_queue_identity: canonicalQueueIdentity,
    source_question_ids: dedupeStrings(
      foldedItems.flatMap((foldedItem) => collectReviewTaskSourceQuestionIds(foldedItem)),
    ),
    source_attempt_refs: dedupeTypedReferences(
      foldedItems.flatMap((foldedItem) => collectReviewTaskSourceAttemptRefs(foldedItem)),
    ),
    folded_review_task_refs: dedupeReviewTaskRefs(
      foldedItems.map((foldedItem) => ({
        kind: 'review_task',
        review_task_id: foldedItem.review_task_id ?? null,
      })),
    ),
  };
}

function withProjectionAttribution(item = {}, foldedItems = [item]) {
  return {
    ...item,
    projection_attribution: buildProjectionAttribution(item, foldedItems),
  };
}

function foldReviewQueueItemsByCanonicalIdentity(items = []) {
  const groupsByKey = new Map();
  const slots = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = ACTIVE_REVIEW_TASK_STATUSES.has(item?.status)
      ? getCanonicalQueueIdentityKey(item)
      : null;

    if (!key) {
      slots.push({
        item,
        foldedItems: [item],
      });
      continue;
    }

    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        items: [],
        slot: {
          item: null,
          foldedItems: [],
        },
      };
      groupsByKey.set(key, group);
      slots.push(group.slot);
    }

    group.items.push(item);
  }

  for (const group of groupsByKey.values()) {
    const winner = [...group.items].sort(compareReviewTaskProjectionItems)[0] ?? null;
    group.slot.item = winner;
    group.slot.foldedItems = group.items;
  }

  return slots
    .flatMap((slot) => (slot.item ? [withProjectionAttribution(slot.item, slot.foldedItems)] : []))
    .sort(compareReviewTaskProjectionItems);
}

function createEmptySlot() {
  return {
    workspace_slot_id: null,
    primary_artifact_ref: null,
    primary_artifact: null,
    linked_references: [],
    updated_at: null,
  };
}

function buildStableSlotMap(fillValue) {
  return Object.fromEntries(STABLE_SLOT_KEYS.map((slotKey) => [slotKey, fillValue(slotKey)]));
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
          primary_artifact: slot.primary_artifact ?? null,
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

function compareArtifactsForProjection(left = {}, right = {}) {
  const leftUpdatedAt = parseTimestamp(left.updated_at)?.getTime() ?? 0;
  const rightUpdatedAt = parseTimestamp(right.updated_at)?.getTime() ?? 0;
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  const leftCreatedAt = parseTimestamp(left.created_at)?.getTime() ?? 0;
  const rightCreatedAt = parseTimestamp(right.created_at)?.getTime() ?? 0;
  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return String(left.artifact_id ?? '').localeCompare(String(right.artifact_id ?? ''));
}

function normalizeTopicArtifacts(artifacts = []) {
  return (Array.isArray(artifacts) ? artifacts : [])
    .map((artifact) => normalizeArtifactLifecycleArtifact(artifact))
    .sort(compareArtifactsForProjection);
}

function groupArtifactsBySlot(artifacts = []) {
  return (Array.isArray(artifacts) ? artifacts : []).reduce((acc, artifact) => {
    const slotKey = normalizeString(artifact?.slot_key);
    if (!slotKey || !ARTIFACT_SLOT_KEYS.has(slotKey)) {
      return acc;
    }

    if (!acc[slotKey]) {
      acc[slotKey] = [];
    }

    acc[slotKey].push(artifact);
    return acc;
  }, {});
}

function isActiveArtifact(artifact = {}) {
  return artifact.lifecycle_status !== 'superseded'
    && artifact.artifact_state !== 'superseded'
    && artifact.placement_status !== 'archived';
}

function hasGroundedArtifactTrust(artifact = {}) {
  return artifact.trust_status === 'grounded' || artifact.trust_status === 'user_confirmed';
}

function isPinnedLearningTruthArtifact(artifact = {}) {
  return isActiveArtifact(artifact)
    && artifact.placement_status === 'pinned'
    && artifact.capabilities?.resident_eligible
    && hasGroundedArtifactTrust(artifact)
    && !hasNonAuthoritativeAttemptGrounding(artifact.grounding_refs);
}

function isResidentArtifact(artifact = {}) {
  return isPinnedLearningTruthArtifact(artifact);
}

function isPendingVerificationArtifact(artifact = {}) {
  return isActiveArtifact(artifact)
    && artifact.artifact_state === 'unverified';
}

function hasRenderableResidentContent(artifact = {}) {
  return Boolean(
    artifact?.has_renderable_content
    || normalizeString(artifact?.title)
    || normalizeString(artifact?.summary)
    || normalizeString(artifact?.body_markdown),
  );
}

function buildResidentArtifactProjection(artifact = {}) {
  return {
    artifact_id: artifact.artifact_id ?? null,
    artifact_kind: artifact.artifact_kind ?? null,
    title: normalizeString(artifact.title),
    summary: normalizeString(artifact.summary),
    body_markdown: normalizeString(artifact.body_markdown),
    content_format: normalizeString(artifact.content_format, 'markdown'),
    render_payload: artifact.render_payload ?? {},
    current_content_version_id: artifact.current_content_version_id ?? null,
    current_content_version_number: artifact.current_content_version_number ?? null,
    capabilities: artifact.capabilities ?? null,
    placement_status: artifact.placement_status ?? null,
    trust_status: artifact.trust_status ?? null,
    lifecycle_status: artifact.lifecycle_status ?? null,
    artifact_state: artifact.artifact_state ?? null,
    slot_key: artifact.slot_key ?? null,
    target_question_type_id: artifact.target_question_type_id ?? null,
    updated_at: artifact.updated_at ?? null,
  };
}

function shouldResetSlotStateToActive(currentState) {
  const normalizedState = normalizeString(currentState);
  return !normalizedState
    || normalizedState === 'idle'
    || normalizedState === 'awaiting_verification'
    || normalizedState === 'active';
}

function resolveResidentArtifact(slot = null, slotArtifacts = []) {
  const residentArtifacts = (Array.isArray(slotArtifacts) ? slotArtifacts : []).filter(isResidentArtifact);
  const primaryArtifactId = slot?.primary_artifact_ref?.artifact_id ?? null;

  if (primaryArtifactId) {
    const pointerResident = residentArtifacts.find((artifact) => artifact.artifact_id === primaryArtifactId);
    if (pointerResident) {
      return pointerResident;
    }
  }

  return residentArtifacts[0] ?? null;
}

function buildProjectedArtifactInboxItem(artifact = {}, residentArtifactIds = new Set()) {
  return {
    ...artifact,
    placement_status: residentArtifactIds.has(artifact.artifact_id)
      ? 'pinned'
      : artifact.placement_status === 'pinned'
        ? 'inbox'
        : artifact.placement_status,
  };
}

function buildArtifactInboxProjection(topicArtifacts = [], residentArtifactIds = new Set()) {
  return {
    items: (Array.isArray(topicArtifacts) ? topicArtifacts : [])
      .filter((artifact) =>
        ARTIFACT_SLOT_KEYS.has(normalizeString(artifact?.slot_key))
        && isActiveArtifact(artifact)
        && artifact.capabilities?.shell_visible
        && !residentArtifactIds.has(artifact.artifact_id))
      .map((artifact) => buildProjectedArtifactInboxItem(artifact, residentArtifactIds)),
  };
}

function projectWorkspaceResidency(workspaceProjection, topicArtifacts = []) {
  const normalizedArtifacts = normalizeTopicArtifacts(topicArtifacts);
  const artifactsBySlot = groupArtifactsBySlot(normalizedArtifacts);
  const projectedSlots = {
    ...(workspaceProjection?.slots ?? {}),
  };
  const projectedSlotState = {
    ...(workspaceProjection?.slot_state ?? {}),
  };
  const residentArtifactIds = new Set();

  ARTIFACT_SLOT_KEYS.forEach((slotKey) => {
    const slot = projectedSlots[slotKey] ?? null;
    const slotArtifacts = artifactsBySlot[slotKey] ?? [];
    const residentArtifact = resolveResidentArtifact(slot, slotArtifacts);

    if (slot) {
      projectedSlots[slotKey] = {
        ...slot,
        primary_artifact_ref: residentArtifact ? buildArtifactRef(residentArtifact.artifact_id) : null,
        primary_artifact:
          residentArtifact && hasRenderableResidentContent(residentArtifact)
            ? buildResidentArtifactProjection(residentArtifact)
            : null,
      };
    }

    if (residentArtifact) {
      residentArtifactIds.add(residentArtifact.artifact_id);
    }

    if (!residentArtifact && slotArtifacts.some(isPendingVerificationArtifact)) {
      projectedSlotState[slotKey] = 'awaiting_verification';
      return;
    }

    if (residentArtifact && !hasRenderableResidentContent(residentArtifact)) {
      if (shouldResetSlotStateToActive(projectedSlotState[slotKey])) {
        projectedSlotState[slotKey] = 'missing_artifact_content';
      }
      return;
    }

    if (residentArtifact && shouldResetSlotStateToActive(projectedSlotState[slotKey])) {
      projectedSlotState[slotKey] = 'active';
    }
  });

  return {
    workspaceProjection: {
      ...workspaceProjection,
      slot_state: projectedSlotState,
      slots: projectedSlots,
    },
    artifactInbox: buildArtifactInboxProjection(normalizedArtifacts, residentArtifactIds),
  };
}

function buildWorkspaceNotFound(topicId) {
  return new LearningHttpError('workspace_not_found', 'Workspace not found.', {
    status: 404,
    details: { topic_id: topicId ?? null },
  });
}

function buildPaperWorkspaceNotFound(paperScope) {
  return new LearningHttpError('workspace_not_found', 'Paper workspace not found.', {
    status: 404,
    details: { paper_scope: paperScope ?? null },
  });
}

function buildPaperTopicSectionNotFound({ paperScope, topicId = null, topicPath = null } = {}) {
  return new LearningHttpError('workspace_not_found', 'Paper workspace topic section not found.', {
    status: 404,
    details: {
      paper_scope: paperScope ?? null,
      topic_id: topicId ?? null,
      topic_path: topicPath ?? null,
    },
  });
}

function buildInvalidWorkspaceEnsurePayload(message, details = {}) {
  return new LearningHttpError(LEARNING_ERROR_CODES.INVALID_PAYLOAD, message, {
    status: 400,
    details,
  });
}

function buildWorkspaceTopicNotFound(topicId) {
  return new LearningHttpError(
    LEARNING_ERROR_CODES.ANCHOR_TARGET_NOT_FOUND,
    'Workspace topic not found.',
    {
      status: 404,
      details: { topic_id: topicId ?? null },
    },
  );
}

async function loadCanonicalWorkspaceTopic(client, {
  topicId,
  topicPath = null,
} = {}) {
  const normalizedTopicId = normalizeString(topicId);
  const normalizedTopicPath = normalizeString(topicPath);

  if (!normalizedTopicId) {
    throw buildInvalidWorkspaceEnsurePayload('topicId is required.', {
      field: 'topic_id',
    });
  }

  const { data, error } = await client
    .from('curriculum_nodes')
    .select('node_id, topic_path')
    .eq('node_id', normalizedTopicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace curriculum node: ${error.message}`);
  }

  if (!data) {
    throw buildWorkspaceTopicNotFound(normalizedTopicId);
  }

  if (normalizedTopicPath && normalizedTopicPath !== data.topic_path) {
    throw buildInvalidWorkspaceEnsurePayload(
      'topic_path must match the canonical curriculum node.',
      {
        field: 'topic_path',
        topic_id: normalizedTopicId,
      },
    );
  }

  return {
    topicId: data.node_id,
    topicPath: data.topic_path,
  };
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

function buildWorkspaceRuntimePosture(workspaceProjection = null) {
  const subjectCode = resolveSubjectCodeFromRuntimeInput({
    question_context: {
      primary_topic_path: workspaceProjection?.topic_path ?? null,
    },
  });

  return buildSubjectRuntimePostureOrNull(subjectCode);
}

function createEmptyPaperSlot(slotKey) {
  return {
    slot_key: slotKey,
    topic_sections: [],
    artifact_summaries: [],
    linked_references: [],
    updated_at: null,
  };
}

function buildEmptyPaperStableSlots() {
  return Object.fromEntries(STABLE_SLOT_KEYS.map((slotKey) => [slotKey, createEmptyPaperSlot(slotKey)]));
}

function compareTopicSections(left = {}, right = {}) {
  const pathCompare = String(left.topic_path ?? '').localeCompare(String(right.topic_path ?? ''));
  if (pathCompare !== 0) {
    return pathCompare;
  }

  return String(left.topic_id ?? '').localeCompare(String(right.topic_id ?? ''));
}

function compareArtifactSummaries(left = {}, right = {}) {
  const leftSlotIndex = STABLE_SLOT_KEYS.indexOf(left.slot_key);
  const rightSlotIndex = STABLE_SLOT_KEYS.indexOf(right.slot_key);
  if (leftSlotIndex !== rightSlotIndex) {
    return leftSlotIndex - rightSlotIndex;
  }

  const topicCompare = String(left.topic_path ?? '').localeCompare(String(right.topic_path ?? ''));
  if (topicCompare !== 0) {
    return topicCompare;
  }

  const leftUpdatedAt = parseTimestamp(left.updated_at)?.getTime() ?? 0;
  const rightUpdatedAt = parseTimestamp(right.updated_at)?.getTime() ?? 0;
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  return String(left.artifact_id ?? '').localeCompare(String(right.artifact_id ?? ''));
}

function dedupeBy(items = [], getKey) {
  const seen = new Set();

  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeTypedReferences(refs = []) {
  return dedupeBy(refs, getTypedRefKey)
    .sort((left, right) => String(getTypedRefKey(left)).localeCompare(String(getTypedRefKey(right))));
}

function dedupeArtifactSummaries(summaries = []) {
  return dedupeBy(summaries, (summary) => normalizeString(summary?.artifact_id))
    .sort(compareArtifactSummaries);
}

function dedupeReviewQueueItems(items = []) {
  return dedupeBy(items, (item) => normalizeString(item?.review_task_id));
}

function maxTimestamp(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function buildFallbackTopicWorkspaceProjection(section = {}, userId = null) {
  return {
    workspace_id: section.topic_workspace_id ?? null,
    user_id: userId,
    topic_id: section.topic_id ?? null,
    topic_path: section.topic_path ?? null,
    slot_state: {},
    linked_reference_summary: {},
    updated_at: section.updated_at ?? null,
    slots: buildStableSlotMap(() => null),
    linked_references: buildStableSlotMap(() => []),
  };
}

function isPinnedArtifactSummaryCandidate(artifact = {}) {
  return isPinnedLearningTruthArtifact(artifact);
}

function buildArtifactSummary(artifact = {}, section = {}) {
  return {
    artifact_id: artifact.artifact_id ?? null,
    artifact_kind: artifact.artifact_kind ?? null,
    canonical_home_topic_id: artifact.canonical_home_topic_id ?? section.topic_id ?? null,
    topic_section_id: section.paper_workspace_topic_section_id ?? null,
    topic_id: section.topic_id ?? null,
    topic_path: section.topic_path ?? null,
    slot_key: artifact.slot_key ?? null,
    placement_status: artifact.placement_status ?? null,
    trust_status: artifact.trust_status ?? null,
    lifecycle_status: artifact.lifecycle_status ?? null,
    artifact_state: artifact.artifact_state ?? null,
    target_question_type_id: artifact.target_question_type_id ?? null,
    title: normalizeString(artifact.title),
    summary: normalizeString(artifact.summary),
    updated_at: artifact.updated_at ?? null,
  };
}

function buildArtifactSummariesBySlot(artifactSummaries = []) {
  const grouped = Object.fromEntries(STABLE_SLOT_KEYS.map((slotKey) => [slotKey, []]));

  for (const summary of artifactSummaries) {
    if (!ARTIFACT_SLOT_KEYS.has(summary.slot_key)) {
      continue;
    }

    grouped[summary.slot_key].push(summary);
  }

  return Object.fromEntries(
    Object.entries(grouped).map(([slotKey, summaries]) => [
      slotKey,
      dedupeArtifactSummaries(summaries),
    ]),
  );
}

function collectStableSlotLinkedReferences(stableSlots = {}) {
  return dedupeTypedReferences(
    STABLE_SLOT_KEYS.flatMap((slotKey) => stableSlots?.[slotKey]?.linked_references ?? []),
  );
}

function buildPaperReviewQueueProjection({
  paperScope,
  reviewQueue,
  topicSections,
  reviewQuestionTypeId = null,
} = {}) {
  const sortedSections = [...(Array.isArray(topicSections) ? topicSections : [])].sort(compareTopicSections);
  const topicIds = sortedSections
    .map((section) => normalizeString(section.topic_id))
    .filter(Boolean);
  const topicIdSet = new Set(topicIds);
  const paperItems = dedupeReviewQueueItems(
    (Array.isArray(reviewQueue?.items) ? reviewQueue.items : [])
      .filter((item) => topicIdSet.has(item?.target_topic_id)),
  );

  return {
    scope: 'paper_workspace_review_projection',
    paper_scope: normalizeString(paperScope),
    topic_ids: topicIds,
    question_type_id: normalizeString(reviewQuestionTypeId),
    status: normalizeString(reviewQueue?.status),
    due_before: normalizeString(reviewQueue?.due_before),
    policy: reviewQueue?.policy ?? null,
    items: paperItems,
    summary: summarizeReviewQueueItems(paperItems),
    topic_sections: sortedSections.map((section) => {
      const sectionItems = paperItems.filter((item) => item.target_topic_id === section.topic_id);
      return {
        topic_id: section.topic_id ?? null,
        topic_path: section.topic_path ?? null,
        items: sectionItems,
        summary: summarizeReviewQueueItems(sectionItems),
      };
    }),
  };
}

function buildPaperTopicSectionProjection({
  section,
  workspaceProjection,
  topicArtifacts,
  reviewQueueItems,
  reviewQuestionTypeId = null,
} = {}) {
  const normalizedArtifacts = normalizeTopicArtifacts(topicArtifacts);
  const pinnedArtifactSummaries = dedupeArtifactSummaries(
    normalizedArtifacts
      .filter(isPinnedArtifactSummaryCandidate)
      .map((artifact) => buildArtifactSummary(artifact, section)),
  );
  const artifactSummariesBySlot = buildArtifactSummariesBySlot(pinnedArtifactSummaries);
  const stableSlots = buildStableSlots(workspaceProjection, {
    reviewQueueItems,
  });

  return {
    paper_workspace_topic_section_id: section.paper_workspace_topic_section_id ?? null,
    topic_id: section.topic_id ?? null,
    topic_workspace_id: section.topic_workspace_id ?? null,
    topic_path: section.topic_path ?? null,
    section_state: isPlainObject(section.section_state) ? section.section_state : {},
    created_at: section.created_at ?? null,
    updated_at: section.updated_at ?? null,
    canonical_ownership: {
      owner_kind: 'topic',
      topic_id: section.topic_id ?? null,
      topic_path: section.topic_path ?? null,
    },
    workspace: {
      workspace_id: workspaceProjection?.workspace_id ?? section.topic_workspace_id ?? null,
      slot_state: workspaceProjection?.slot_state ?? {},
      linked_reference_summary: workspaceProjection?.linked_reference_summary ?? {},
      updated_at: workspaceProjection?.updated_at ?? null,
    },
    stable_slots: stableSlots,
    artifact_summaries_by_slot: artifactSummariesBySlot,
    pinned_artifacts: pinnedArtifactSummaries,
    linked_references: collectStableSlotLinkedReferences(stableSlots),
    review_queue: {
      scope: 'paper_topic_section_review_projection',
      topic_id: section.topic_id ?? null,
      topic_path: section.topic_path ?? null,
      question_type_id: normalizeString(reviewQuestionTypeId),
      items: reviewQueueItems,
      summary: summarizeReviewQueueItems(reviewQueueItems),
    },
  };
}

function findTopicSectionView(topicSections = [], { topicId = null, topicPath = null } = {}) {
  const normalizedTopicId = normalizeString(topicId);
  const normalizedTopicPath = normalizeString(topicPath);

  if (!normalizedTopicId && !normalizedTopicPath) {
    throw buildInvalidWorkspaceEnsurePayload('topicId or topicPath is required.', {
      field: 'topic_section',
    });
  }

  return (Array.isArray(topicSections) ? topicSections : []).find((section) =>
    (!normalizedTopicId || section.topic_id === normalizedTopicId)
    && (!normalizedTopicPath || section.topic_path === normalizedTopicPath)) ?? null;
}

function buildTopicSectionWorkspaceSummary(section = {}, { userId = null } = {}) {
  return {
    workspace_id: section.workspace?.workspace_id ?? section.topic_workspace_id ?? null,
    user_id: userId,
    topic_id: section.topic_id ?? null,
    topic_path: section.topic_path ?? null,
    slot_state: section.workspace?.slot_state ?? {},
    linked_reference_summary: section.workspace?.linked_reference_summary ?? {},
    updated_at: section.workspace?.updated_at ?? section.updated_at ?? null,
    slots: section.stable_slots ?? buildStableSlotMap(() => createEmptySlot()),
  };
}

function buildPaperStableSlots(topicSectionViews = []) {
  const paperSlots = buildEmptyPaperStableSlots();

  for (const section of topicSectionViews) {
    for (const slotKey of STABLE_SLOT_KEYS) {
      const sectionSlot = section.stable_slots?.[slotKey] ?? createEmptySlot();
      const slotArtifactSummaries = section.artifact_summaries_by_slot?.[slotKey] ?? [];
      const paperSlot = paperSlots[slotKey];

      paperSlot.topic_sections.push({
        paper_workspace_topic_section_id: section.paper_workspace_topic_section_id,
        topic_id: section.topic_id,
        topic_path: section.topic_path,
        workspace_slot_id: sectionSlot.workspace_slot_id ?? null,
        primary_artifact_ref: sectionSlot.primary_artifact_ref ?? null,
        slot_state: section.workspace?.slot_state?.[slotKey] ?? null,
        updated_at: sectionSlot.updated_at ?? null,
      });
      paperSlot.artifact_summaries.push(...slotArtifactSummaries);
      paperSlot.linked_references.push(...(sectionSlot.linked_references ?? []));
      paperSlot.updated_at = maxTimestamp([
        paperSlot.updated_at,
        sectionSlot.updated_at,
        ...slotArtifactSummaries.map((summary) => summary.updated_at),
      ]);
    }
  }

  return Object.fromEntries(
    STABLE_SLOT_KEYS.map((slotKey) => {
      const slot = paperSlots[slotKey];
      return [
        slotKey,
        {
          ...slot,
          topic_sections: slot.topic_sections.sort(compareTopicSections),
          artifact_summaries: dedupeArtifactSummaries(slot.artifact_summaries),
          linked_references: dedupeTypedReferences(slot.linked_references),
        },
      ];
    }),
  );
}

function filterReviewQueueItems(items, {
  topicId = null,
  questionTypeId = null,
  status = null,
  dueBefore = null,
} = {}) {
  const normalizedTopicId = normalizeString(topicId);
  const normalizedQuestionTypeId = normalizeString(questionTypeId);
  const normalizedStatus = normalizeString(status);
  const normalizedDueBefore = normalizeString(dueBefore);

  return (Array.isArray(items) ? items : []).filter((item) => {
    if (normalizedTopicId && item?.target_topic_id !== normalizedTopicId) {
      return false;
    }

    if (normalizedQuestionTypeId && item?.target_question_type_id !== normalizedQuestionTypeId) {
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
    questionTypeId = null,
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
    questionTypeId,
    status,
    dueBefore,
  });
  const projectedItems = foldReviewQueueItemsByCanonicalIdentity(filteredItems);

  return {
    scope: 'global_queue_projection',
    topic_id: normalizeString(topicId),
    question_type_id: normalizeString(questionTypeId),
    status: normalizeString(status),
    due_before: normalizeString(dueBefore),
    policy: derivedProjection.policy,
    items: projectedItems,
    summary: summarizeReviewQueueItems(projectedItems),
  };
}

export async function getPaperWorkspaceView(
  client,
  {
    userId,
    paperScope,
    reviewStatus = null,
    reviewDueBefore = null,
    reviewQuestionTypeId = null,
    residencyFlagEnabled = isArtifactLifecycleEnabled(),
  } = {},
) {
  const paperProjection = await fetchPaperWorkspaceProjection(client, {
    userId,
    paperScope,
  });

  if (!paperProjection) {
    throw buildPaperWorkspaceNotFound(paperScope);
  }

  const topicSections = [...(paperProjection.topic_sections ?? [])].sort(compareTopicSections);
  const [reviewQueue, topicSectionInputs] = await Promise.all([
    listReviewTasks(client, {
      userId,
      status: reviewStatus,
      dueBefore: reviewDueBefore,
      questionTypeId: reviewQuestionTypeId,
    }),
    Promise.all(
      topicSections.map(async (section) => {
        const [workspaceProjection, topicArtifacts] = await Promise.all([
          fetchWorkspaceProjection(client, {
            userId,
            topicId: section.topic_id,
          }),
          residencyFlagEnabled
            ? listArtifactsByTopic(client, { topicId: section.topic_id })
            : Promise.resolve([]),
        ]);

        const projectedWorkspace = residencyFlagEnabled && workspaceProjection
          ? projectWorkspaceResidency(workspaceProjection, topicArtifacts).workspaceProjection
          : workspaceProjection ?? buildFallbackTopicWorkspaceProjection(section, userId);

        return {
          section,
          workspaceProjection: projectedWorkspace,
          topicArtifacts,
        };
      }),
    ),
  ]);

  const paperReviewQueue = buildPaperReviewQueueProjection({
    paperScope,
    reviewQueue,
    topicSections,
    reviewQuestionTypeId,
  });
  const reviewItemsByTopicId = new Map(
    paperReviewQueue.topic_sections.map((section) => [section.topic_id, section.items]),
  );
  const topicSectionViews = topicSectionInputs
    .map((input) => buildPaperTopicSectionProjection({
      ...input,
      reviewQueueItems: reviewItemsByTopicId.get(input.section.topic_id) ?? [],
      reviewQuestionTypeId,
    }))
    .sort(compareTopicSections);
  const stableSlots = buildPaperStableSlots(topicSectionViews);
  const pinnedArtifacts = dedupeArtifactSummaries(
    topicSectionViews.flatMap((section) => section.pinned_artifacts),
  );
  const linkedReferences = dedupeTypedReferences(
    STABLE_SLOT_KEYS.flatMap((slotKey) => stableSlots[slotKey].linked_references),
  );

  // Paper Workspace owns the visible organization layer only; authoritative
  // artifact and ReviewTask homes remain the canonical topic sections.
  return {
    paper_workspace: {
      paper_workspace_id: paperProjection.paper_workspace_id,
      user_id: paperProjection.user_id,
      subject_code: paperProjection.subject_code,
      paper_scope: paperProjection.paper_scope,
      workspace_kind: paperProjection.workspace_kind,
      visible_organization_summary: paperProjection.visible_organization_summary ?? {},
      linked_topic_summary: paperProjection.linked_topic_summary ?? {},
      created_at: paperProjection.created_at ?? null,
      updated_at: paperProjection.updated_at ?? null,
      stable_slots: stableSlots,
      pinned_artifacts: pinnedArtifacts,
      linked_references: linkedReferences,
    },
    topic_sections: topicSectionViews,
    review_queue: paperReviewQueue,
  };
}

export async function ensurePaperWorkspaceView(
  client,
  {
    userId,
    paperScope,
    reviewStatus = null,
    reviewDueBefore = null,
    reviewQuestionTypeId = null,
    residencyFlagEnabled = isArtifactLifecycleEnabled(),
    visibleOrganizationSummary = {},
    linkedTopicSummary = {},
  } = {},
) {
  const normalizedPaperScope = normalizePaperScope(paperScope);

  await ensurePaperWorkspaceExists(client, {
    userId,
    subjectCode: getSubjectCodeForPaperScope(normalizedPaperScope),
    paperScope: normalizedPaperScope,
    visibleOrganizationSummary,
    linkedTopicSummary,
  });

  return getPaperWorkspaceView(client, {
    userId,
    paperScope: normalizedPaperScope,
    reviewStatus,
    reviewDueBefore,
    reviewQuestionTypeId,
    residencyFlagEnabled,
  });
}

export async function getTopicSectionWorkspaceView(
  client,
  {
    userId,
    paperScope,
    topicId = null,
    topicPath = null,
    reviewStatus = null,
    reviewDueBefore = null,
    reviewQuestionTypeId = null,
    residencyFlagEnabled = isArtifactLifecycleEnabled(),
  } = {},
) {
  const normalizedPaperScope = normalizePaperScope(paperScope);
  const paperView = await getPaperWorkspaceView(client, {
    userId,
    paperScope: normalizedPaperScope,
    reviewStatus,
    reviewDueBefore,
    reviewQuestionTypeId,
    residencyFlagEnabled,
  });
  const topicSection = findTopicSectionView(paperView.topic_sections, {
    topicId,
    topicPath,
  });

  if (!topicSection) {
    throw buildPaperTopicSectionNotFound({
      paperScope: normalizedPaperScope,
      topicId,
      topicPath,
    });
  }

  return {
    paper_workspace: paperView.paper_workspace,
    topic_section: topicSection,
    workspace: buildTopicSectionWorkspaceSummary(topicSection, {
      userId,
    }),
    review_queue: topicSection.review_queue,
    compatibility: {
      surface: 'paper_topic_section_workspace',
      paper_workspace_route: PAPER_WORKSPACE_ROUTE,
      legacy_topic_fallback: {
        route: LEGACY_TOPIC_WORKSPACE_ROUTE,
        status: 'preserved',
      },
      canonical_owner_kind: 'topic',
      topic_sections_are_projections: true,
      paper_scope: normalizedPaperScope,
    },
  };
}

export async function getWorkspaceView(
  client,
  {
    userId,
    topicId,
    reviewQuestionTypeId = null,
    reviewStatus = null,
    reviewDueBefore = null,
    residencyFlagEnabled = isArtifactLifecycleEnabled(),
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
  const [topicArtifacts, reviewQueue, unfilteredTopicReviewQueue, lastSession] = await Promise.all([
    residencyFlagEnabled
      ? listArtifactsByTopic(client, { topicId })
      : Promise.resolve([]),
    listReviewTasks(client, {
      userId,
      topicId,
      questionTypeId: reviewQuestionTypeId,
      status: reviewStatus,
      dueBefore: reviewDueBefore,
    }),
    shouldLoadUnfilteredTopicQueue
      ? listReviewTasks(client, {
        userId,
        topicId,
        questionTypeId: reviewQuestionTypeId,
      })
      : Promise.resolve(null),
    getLatestWorkspaceSession(client, {
      userId,
      topicId,
      topicPath: workspaceProjection.topic_path,
    }),
  ]);
  const projectedWorkspace = residencyFlagEnabled
    ? projectWorkspaceResidency(workspaceProjection, topicArtifacts)
    : {
      workspaceProjection,
      artifactInbox: {
        items: [],
      },
    };
  const reviewQueueSlotItems = shouldLoadUnfilteredTopicQueue
    ? unfilteredTopicReviewQueue?.items ?? []
    : reviewQueue.items;

  return {
    workspace: {
      workspace_id: projectedWorkspace.workspaceProjection.workspace_id,
      user_id: projectedWorkspace.workspaceProjection.user_id,
      topic_id: projectedWorkspace.workspaceProjection.topic_id,
      topic_path: projectedWorkspace.workspaceProjection.topic_path,
      slot_state: projectedWorkspace.workspaceProjection.slot_state ?? {},
      linked_reference_summary: projectedWorkspace.workspaceProjection.linked_reference_summary ?? {},
      ...(residencyFlagEnabled ? { artifact_inbox: projectedWorkspace.artifactInbox } : {}),
      updated_at: projectedWorkspace.workspaceProjection.updated_at ?? null,
      slots: buildStableSlots(projectedWorkspace.workspaceProjection, {
        reviewQueueItems: reviewQueueSlotItems,
      }),
    },
    runtime_posture: buildWorkspaceRuntimePosture(projectedWorkspace.workspaceProjection),
    review_queue: reviewQueue,
    revisit: buildWorkspaceRevisit({
      lastSession,
      reviewQueueItems: reviewQueueSlotItems,
      workspaceProjection: projectedWorkspace.workspaceProjection,
    }),
  };
}

export async function ensureWorkspaceView(
  client,
  {
    userId,
    topicId,
    topicPath = null,
    reviewStatus = null,
    reviewDueBefore = null,
    reviewQuestionTypeId = null,
    residencyFlagEnabled = isArtifactLifecycleEnabled(),
  } = {},
) {
  const canonicalTopic = await loadCanonicalWorkspaceTopic(client, {
    topicId,
    topicPath,
  });

  await ensureWorkspaceExists(client, {
    userId,
    topicId: canonicalTopic.topicId,
    topicPath: canonicalTopic.topicPath,
  });

  return getWorkspaceView(client, {
    userId,
    topicId: canonicalTopic.topicId,
    reviewQuestionTypeId,
    reviewStatus,
    reviewDueBefore,
    residencyFlagEnabled,
  });
}
