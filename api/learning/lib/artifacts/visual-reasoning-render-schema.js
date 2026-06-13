const RENDER_SCHEMA_VERSION = 'learning_artifact_render.v1';
export const VISUAL_REASONING_SCHEMA_VERSION = 'visual_reasoning_mvp.v1';

const VISUAL_REASONING_OBJECT_KINDS = new Set([
  'derivation_tree',
  'step_reveal_timeline',
  'dependency_graph',
]);

const BOUNDED_SOURCE_POSTURES = new Set([
  'verified',
  'structure_bounded',
]);

const VISUAL_CONFIDENCE_BANDS = new Set([
  'high',
  'medium',
  'low',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readKey(record = {}, snakeKey, camelKey) {
  if (!isPlainObject(record)) {
    return undefined;
  }

  return record[snakeKey] ?? record[camelKey];
}

function normalizeTypedRefs(value) {
  return normalizeArray(value)
    .filter(isPlainObject)
    .map((ref) => ({ ...ref }))
    .filter((ref) =>
      Boolean(normalizeString(ref.kind))
      && Object.entries(ref).some(([key, entry]) => key !== 'kind' && normalizeString(entry)));
}

function normalizeDependsOnStepIds(value) {
  return normalizeArray(value)
    .map((stepId) => normalizeString(stepId))
    .filter(Boolean);
}

function normalizeVisualNode(node = {}) {
  if (!isPlainObject(node)) {
    return null;
  }

  const id = normalizeString(node.id);
  const label = normalizeString(node.label ?? node.body ?? node.title);
  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    source_refs: normalizeTypedRefs(readKey(node, 'source_refs', 'sourceRefs')),
  };
}

function normalizeVisualEdge(edge = {}) {
  if (!isPlainObject(edge)) {
    return null;
  }

  const from = normalizeString(edge.from);
  const to = normalizeString(edge.to);
  if (!from || !to) {
    return null;
  }

  return {
    from,
    to,
    relation: normalizeString(edge.relation, 'depends_on'),
    source_refs: normalizeTypedRefs(readKey(edge, 'source_refs', 'sourceRefs')),
  };
}

function normalizeTimelineStep(step = {}, index = 0) {
  if (!isPlainObject(step)) {
    return null;
  }

  const stepId = normalizeString(readKey(step, 'step_id', 'stepId'), `step-${index + 1}`);
  const body = normalizeString(step.body ?? step.label ?? step.title);
  if (!stepId || !body) {
    return null;
  }

  const revealIndex = Number(readKey(step, 'reveal_index', 'revealIndex'));

  return {
    step_id: stepId,
    title: normalizeString(step.title),
    body,
    reveal_index: Number.isFinite(revealIndex) && revealIndex > 0 ? revealIndex : index + 1,
    depends_on_step_ids: normalizeDependsOnStepIds(
      readKey(step, 'depends_on_step_ids', 'dependsOnStepIds'),
    ),
    source_refs: normalizeTypedRefs(readKey(step, 'source_refs', 'sourceRefs')),
  };
}

function normalizeFallbackStep(step = {}, index = 0) {
  const normalized = normalizeTimelineStep(step, index);
  if (!normalized) {
    return null;
  }

  return {
    step_id: normalized.step_id,
    title: normalized.title,
    body: normalized.body,
    source_refs: normalized.source_refs,
  };
}

function buildFallbackSteps(visualObject = {}) {
  const explicitSteps = normalizeArray(readKey(visualObject, 'steps', 'steps'))
    .map((step, index) => normalizeFallbackStep(step, index))
    .filter(Boolean);

  if (explicitSteps.length > 0) {
    return explicitSteps;
  }

  return normalizeArray(readKey(visualObject, 'nodes', 'nodes'))
    .map((node, index) => normalizeVisualNode(node, index))
    .filter(Boolean)
    .map((node, index) => ({
      step_id: `step-${index + 1}`,
      title: null,
      body: node.label,
      source_refs: node.source_refs,
    }));
}

function buildStepListFallback(visualObject = {}, fallbackReasonCode) {
  return {
    kind: 'step_list',
    fallback_from: normalizeString(visualObject.kind, 'visual_reasoning'),
    fallback_reason_code: fallbackReasonCode,
    source_posture: normalizeString(readKey(visualObject, 'source_posture', 'sourcePosture')),
    confidence: normalizeString(visualObject.confidence),
    source_refs: normalizeTypedRefs(readKey(visualObject, 'source_refs', 'sourceRefs')),
    steps: buildFallbackSteps(visualObject),
  };
}

function normalizeGraphVisualObject(visualObject = {}) {
  const nodes = normalizeArray(readKey(visualObject, 'nodes', 'nodes'))
    .map((node) => normalizeVisualNode(node))
    .filter(Boolean);
  const edges = normalizeArray(readKey(visualObject, 'edges', 'edges'))
    .map((edge) => normalizeVisualEdge(edge))
    .filter(Boolean);

  if (nodes.length === 0 || edges.length === 0) {
    return null;
  }

  return {
    nodes,
    edges,
  };
}

function normalizeStepRevealTimeline(visualObject = {}) {
  const steps = normalizeArray(readKey(visualObject, 'steps', 'steps'))
    .map((step, index) => normalizeTimelineStep(step, index))
    .filter(Boolean);

  return steps.length > 0 ? { steps } : null;
}

function normalizeVisualObject(visualObject = {}) {
  if (!isPlainObject(visualObject)) {
    return {
      visualObject: null,
      fallback: null,
    };
  }

  const kind = normalizeString(visualObject.kind);
  if (!VISUAL_REASONING_OBJECT_KINDS.has(kind)) {
    return {
      visualObject: null,
      fallback: buildStepListFallback(visualObject, 'unsupported_visual_kind'),
    };
  }

  const sourcePosture = normalizeString(readKey(visualObject, 'source_posture', 'sourcePosture'));
  if (!BOUNDED_SOURCE_POSTURES.has(sourcePosture)) {
    return {
      visualObject: null,
      fallback: buildStepListFallback(visualObject, 'unbounded_source'),
    };
  }

  const sourceRefs = normalizeTypedRefs(readKey(visualObject, 'source_refs', 'sourceRefs'));
  if (sourceRefs.length === 0) {
    return {
      visualObject: null,
      fallback: buildStepListFallback(visualObject, 'missing_source_refs'),
    };
  }

  const confidence = normalizeString(visualObject.confidence, 'low');
  if (!VISUAL_CONFIDENCE_BANDS.has(confidence) || confidence === 'low') {
    return {
      visualObject: null,
      fallback: buildStepListFallback(visualObject, 'low_confidence'),
    };
  }

  const structure = kind === 'step_reveal_timeline'
    ? normalizeStepRevealTimeline(visualObject)
    : normalizeGraphVisualObject(visualObject);
  if (!structure) {
    return {
      visualObject: null,
      fallback: buildStepListFallback(visualObject, 'invalid_schema'),
    };
  }

  return {
    visualObject: {
      kind,
      source_posture: sourcePosture,
      confidence,
      source_refs: sourceRefs,
      ...structure,
    },
    fallback: null,
  };
}

function normalizeStepList(stepList = null) {
  if (!isPlainObject(stepList)) {
    return null;
  }

  const steps = normalizeArray(readKey(stepList, 'steps', 'steps'))
    .map((step, index) => normalizeFallbackStep(step, index))
    .filter(Boolean);

  if (steps.length === 0) {
    return null;
  }

  return {
    kind: 'step_list',
    fallback_from: normalizeString(readKey(stepList, 'fallback_from', 'fallbackFrom')),
    fallback_reason_code: normalizeString(readKey(stepList, 'fallback_reason_code', 'fallbackReasonCode')),
    source_posture: normalizeString(readKey(stepList, 'source_posture', 'sourcePosture')),
    confidence: normalizeString(stepList.confidence),
    source_refs: normalizeTypedRefs(readKey(stepList, 'source_refs', 'sourceRefs')),
    steps,
  };
}

export function normalizeVisualReasoningPayload(visualReasoning = null) {
  if (!isPlainObject(visualReasoning)) {
    return null;
  }

  const visualObjects = [];
  const fallbacks = [];

  for (const visualObject of normalizeArray(readKey(visualReasoning, 'visual_objects', 'visualObjects'))) {
    const normalized = normalizeVisualObject(visualObject);
    if (normalized.visualObject) {
      visualObjects.push(normalized.visualObject);
    }
    if (normalized.fallback) {
      fallbacks.push(normalized.fallback);
    }
  }

  return {
    schema_version: VISUAL_REASONING_SCHEMA_VERSION,
    visual_objects: visualObjects,
    step_list:
      fallbacks[0]
      ?? normalizeStepList(readKey(visualReasoning, 'step_list', 'stepList'))
      ?? null,
  };
}

export function normalizeArtifactRenderPayload(renderPayload = {}) {
  if (!isPlainObject(renderPayload)) {
    return {};
  }

  const schemaVersion = normalizeString(readKey(renderPayload, 'schema_version', 'schemaVersion'));
  const title = normalizeString(renderPayload.title);
  const summary = normalizeString(renderPayload.summary);
  const visualReasoning = normalizeVisualReasoningPayload(
    readKey(renderPayload, 'visual_reasoning', 'visualReasoning'),
  );

  if (!schemaVersion && !title && !summary && !visualReasoning) {
    return {};
  }

  const normalized = {
    schema_version: schemaVersion ?? RENDER_SCHEMA_VERSION,
  };

  if (title) {
    normalized.title = title;
  }

  if (summary) {
    normalized.summary = summary;
  }

  if (visualReasoning) {
    normalized.visual_reasoning = visualReasoning;
  }

  return normalized;
}
