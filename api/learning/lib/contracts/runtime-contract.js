function freezeList(values) {
  return Object.freeze([...values]);
}

function freezeCompatibilityMap(map) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(map).map(([slotKey, artifactKinds]) => [slotKey, freezeList(artifactKinds)]),
    ),
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const ANCHOR_KINDS = freezeList([
  'concept',
  'question',
  'review_task',
  'artifact',
  'workspace_slot',
]);

export const SESSION_MODES = freezeList([
  'learn_concept',
  'guided_solve',
  'timed_practice',
  'post_mortem_review',
  'spaced_review',
]);

export const SESSION_STATES = freezeList([
  'active',
  'handoff_suggested',
  'handed_off',
  'closed',
]);

export const STABLE_SLOT_KEYS = freezeList([
  'overview_map',
  'core_method_derivation',
  'canonical_worked_example',
  'common_traps',
  'my_notes',
  'review_queue',
]);

export const ARTIFACT_KINDS = freezeList([
  'summary_card',
  'derivation_card',
  'worked_example_card',
  'misconception_card',
  'formula_card',
  'free_note',
]);

export const SLOT_COMPATIBILITY = freezeCompatibilityMap({
  overview_map: ['summary_card'],
  core_method_derivation: ['derivation_card', 'formula_card'],
  canonical_worked_example: ['worked_example_card'],
  common_traps: ['misconception_card'],
  my_notes: ['free_note'],
  review_queue: [],
});

export function isAnchorKind(value) {
  return ANCHOR_KINDS.includes(value);
}

export function isSessionMode(value) {
  return SESSION_MODES.includes(value);
}

export function isSessionState(value) {
  return SESSION_STATES.includes(value);
}

export function isStableSlotKey(value) {
  return STABLE_SLOT_KEYS.includes(value);
}

export function isArtifactKind(value) {
  return ARTIFACT_KINDS.includes(value);
}

export function isCompatibleArtifactKindForSlot(slotKey, artifactKind) {
  return Boolean(SLOT_COMPATIBILITY[slotKey]?.includes(artifactKind));
}

export function buildQuestionRef(questionId) {
  return { kind: 'question', question_id: questionId };
}

export function buildQuestionTypeRef(questionTypeId) {
  return { kind: 'question_type', question_type_id: questionTypeId };
}

export function buildAttemptRef(attemptId) {
  return { kind: 'attempt', attempt_id: attemptId };
}

export function buildMarkRunRef(markRunId) {
  return { kind: 'mark_run', mark_run_id: markRunId };
}

export function buildArtifactRef(artifactId) {
  return { kind: 'artifact', artifact_id: artifactId };
}

export function buildReviewTaskRef(reviewTaskId) {
  return { kind: 'review_task', review_task_id: reviewTaskId };
}

export function buildClassificationSnapshotRef(classificationSnapshotId) {
  return {
    kind: 'classification_snapshot',
    classification_snapshot_id: classificationSnapshotId,
  };
}

export function buildTopicRef(topicId, topicPath) {
  return {
    kind: 'topic',
    topic_id: topicId,
    topic_path: topicPath,
  };
}

export function buildConceptAnchorRef(topicId, topicPath) {
  return {
    kind: 'concept',
    topic_id: topicId,
    topic_path: topicPath,
  };
}

export function buildWorkspaceSlotAnchorRef(workspaceId, slotKey) {
  return {
    kind: 'workspace_slot',
    workspace_id: workspaceId,
    slot_key: slotKey,
  };
}

export function buildSessionLineageRef({
  parentSessionId = null,
  handoffKind = null,
} = {}) {
  return {
    parent_session_id: parentSessionId,
    handoff_kind: handoffKind,
  };
}

export function isTypedRefOfKind(value, expectedKind, idKey) {
  return isPlainObject(value) && value.kind === expectedKind && typeof value[idKey] === 'string';
}
