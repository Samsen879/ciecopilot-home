function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeFiniteNumber(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBoolean(value) {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : normalized;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function normalizePresentValue(obj, key, normalizer) {
  if (!hasOwn(obj, key)) {
    return undefined;
  }
  const normalized = normalizer(obj[key]);
  return normalized === undefined ? null : normalized;
}

function serializeMastery(mastery) {
  if (!isObject(mastery)) {
    return null;
  }

  const normalized = compactObject({
    score: normalizePresentValue(mastery, 'score', normalizeFiniteNumber),
    sample_count: normalizePresentValue(mastery, 'sample_count', normalizeFiniteNumber),
    weighted_sample_count: normalizePresentValue(mastery, 'weighted_sample_count', normalizeFiniteNumber),
    low_confidence: normalizePresentValue(mastery, 'low_confidence', normalizeBoolean),
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function serializeDecision(decision) {
  if (!isObject(decision)) {
    return null;
  }

  const normalized = compactObject({
    mark_decision_id: normalizePresentValue(decision, 'mark_decision_id', normalizeString),
    mark_run_id: normalizePresentValue(decision, 'mark_run_id', normalizeString),
    rubric_id: normalizePresentValue(decision, 'rubric_id', normalizeString),
    mark_label: normalizePresentValue(decision, 'mark_label', normalizeString),
    awarded: normalizePresentValue(decision, 'awarded', normalizeBoolean),
    awarded_marks: normalizePresentValue(decision, 'awarded_marks', normalizeFiniteNumber),
    reason: normalizePresentValue(decision, 'reason', normalizeString),
    created_at: normalizePresentValue(decision, 'created_at', normalizeTimestamp),
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function serializeMisconceptionTag(entry) {
  if (!isObject(entry)) {
    return null;
  }

  const normalized = compactObject({
    tag: normalizePresentValue(entry, 'tag', normalizeString),
    weighted_count: normalizePresentValue(entry, 'weighted_count', normalizeFiniteNumber),
    last_seen: normalizePresentValue(entry, 'last_seen', normalizeTimestamp),
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function serializeErrorEvent(entry) {
  if (!isObject(entry)) {
    return null;
  }

  const normalized = compactObject({
    error_event_id: normalizePresentValue(entry, 'error_event_id', normalizeString),
    attempt_id: normalizePresentValue(entry, 'attempt_id', normalizeString),
    mark_decision_id: normalizePresentValue(entry, 'mark_decision_id', normalizeString),
    topic_path: normalizePresentValue(entry, 'topic_path', normalizeString),
    node_id: normalizePresentValue(entry, 'node_id', normalizeString),
    misconception_tag: normalizePresentValue(entry, 'misconception_tag', normalizeString),
    severity: normalizePresentValue(entry, 'severity', normalizeString),
    created_at: normalizePresentValue(entry, 'created_at', normalizeTimestamp),
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function serializeList(items, serializer) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => serializer(item))
    .filter(Boolean);
}

function serializeRef(ref) {
  if (!isObject(ref) || !normalizeString(ref.kind)) {
    return null;
  }

  const normalizedEntries = Object.entries(ref).map(([key, value]) => {
    if (key === 'kind') {
      return [key, normalizeString(value)];
    }

    if (value === null || value === undefined || value === '') {
      return [key, null];
    }

    return [key, normalizeString(value) ?? null];
  });

  return Object.fromEntries(normalizedEntries);
}

function serializeWorkspaceSlot(slot) {
  if (!isObject(slot)) {
    return null;
  }

  return {
    workspace_slot_id: normalizePresentValue(slot, 'workspace_slot_id', normalizeString),
    primary_artifact_ref: serializeRef(slot.primary_artifact_ref),
    linked_references: serializeList(slot.linked_references, serializeRef),
    updated_at: normalizePresentValue(slot, 'updated_at', normalizeTimestamp),
  };
}

function serializeWorkspace(workspace) {
  if (!isObject(workspace)) {
    return null;
  }

  const slots = isObject(workspace.slots)
    ? Object.fromEntries(
      Object.entries(workspace.slots)
        .map(([slotKey, slot]) => [slotKey, serializeWorkspaceSlot(slot)])
        .filter(([, slot]) => slot),
    )
    : undefined;

  const normalized = compactObject({
    workspace_id: normalizePresentValue(workspace, 'workspace_id', normalizeString),
    topic_id: normalizePresentValue(workspace, 'topic_id', normalizeString),
    topic_path: normalizePresentValue(workspace, 'topic_path', normalizeString),
    updated_at: normalizePresentValue(workspace, 'updated_at', normalizeTimestamp),
  });

  if (slots && Object.keys(slots).length > 0) {
    normalized.slots = slots;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function serializeLearningRuntime(learningRuntime) {
  if (!isObject(learningRuntime)) {
    return null;
  }

  const normalized = compactObject({
    session_id: normalizePresentValue(learningRuntime, 'session_id', normalizeString),
    current_anchor_kind: normalizePresentValue(
      learningRuntime,
      'current_anchor_kind',
      normalizeString,
    ),
    current_anchor_ref: serializeRef(learningRuntime.current_anchor_ref),
    current_question_ref: serializeRef(learningRuntime.current_question_ref),
    current_question_type_ref: serializeRef(learningRuntime.current_question_type_ref),
    workspace: serializeWorkspace(learningRuntime.workspace),
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function serializeEvidenceContextPayload({
  mastery,
  recentDecisions,
  misconceptionTags,
  recentErrors,
  topicPath,
  limit,
  source,
  learningRuntime,
} = {}) {
  return {
    mastery: serializeMastery(mastery),
    recent_decisions: serializeList(recentDecisions, serializeDecision),
    misconception_tags: serializeList(misconceptionTags, serializeMisconceptionTag),
    recent_errors: serializeList(recentErrors, serializeErrorEvent),
    learning_runtime: serializeLearningRuntime(learningRuntime),
    meta: compactObject({
      topic_path: normalizeString(topicPath),
      limit: normalizeFiniteNumber(limit),
      source: normalizeString(source),
    }),
  };
}

export function validateEvidenceContextPayload(payload) {
  const errors = [];

  if (!isObject(payload)) {
    return {
      ok: false,
      errors: ['payload must be an object'],
    };
  }

  if (payload.mastery !== null && payload.mastery !== undefined && !isObject(payload.mastery)) {
    errors.push('mastery must be an object or null');
  }
  if (!Array.isArray(payload.recent_decisions)) {
    errors.push('recent_decisions must be an array');
  }
  if (!Array.isArray(payload.misconception_tags)) {
    errors.push('misconception_tags must be an array');
  }
  if (!Array.isArray(payload.recent_errors)) {
    errors.push('recent_errors must be an array');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
