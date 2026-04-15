import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ROUTER_CONTRACT_PATH = path.join(
  REPO_ROOT,
  'data',
  'contracts',
  '9709_qwen_wave1_router_contract_v1.json',
);

const SURFACE_FLAGS = ['diagram_present', 'formula_dense', 'table_heavy'];
const LOW_CONFIDENCE_THRESHOLD = 0.75;

function cloneJson(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => normalizeString(entry)).filter(Boolean))];
}

function normalizeNullableBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return value === null ? null : null;
}

function normalizeEvidenceValue(value) {
  if (Array.isArray(value)) {
    return cloneJson(value);
  }

  if (value && typeof value === 'object') {
    return cloneJson(value);
  }

  return value ?? null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function loadRouterContract() {
  return JSON.parse(fs.readFileSync(ROUTER_CONTRACT_PATH, 'utf8'));
}

function missingRequiredFields(item, contract) {
  return (contract.router_input_required_fields ?? []).filter((field) => !(field in item));
}

function surfaceFlagsUnknown(item) {
  return SURFACE_FLAGS.some((field) => item?.[field] === null || typeof item?.[field] === 'undefined');
}

function buildRouteDecision(route, decisionReasons, contract) {
  const routeContract = contract.routes?.[route];
  const runtime = contract.runtime_freeze ?? {};

  if (!routeContract) {
    throw new Error(`Unknown route "${route}" in router contract.`);
  }

  return {
    route,
    model: routeContract.model ?? null,
    lazy_attach_original_image: Boolean(routeContract.lazy_attach_original_image),
    region: runtime.region ?? null,
    base_url: runtime.base_url ?? null,
    api_key_scope: runtime.api_key_scope ?? null,
    prompt_template_version: 'v1',
    response_schema_version: 'v1',
    decision_reasons: unique(decisionReasons),
  };
}

export function resolveQuestionEvidenceRoute(manifestItem = {}, contract = loadRouterContract()) {
  const missing = missingRequiredFields(manifestItem, contract);
  if (missing.length > 0) {
    throw new Error(`Manifest row missing required router fields: ${missing.join(', ')}`);
  }

  const reasons = [];
  if (manifestItem.gate_critical) {
    reasons.push('gate_critical');
  }
  if (manifestItem.requires_review) {
    reasons.push('requires_review');
  }
  if (surfaceFlagsUnknown(manifestItem)) {
    reasons.push('unknown_surface_flags');
  }

  if (reasons.length > 0) {
    return buildRouteDecision('review_lane', reasons, contract);
  }

  if (manifestItem.diagram_present === true) {
    return buildRouteDecision('diagram_lane', ['diagram_present'], contract);
  }

  if (manifestItem.table_heavy === true) {
    return buildRouteDecision('ocr_lane', ['table_heavy'], contract);
  }

  if (manifestItem.formula_dense === true) {
    return buildRouteDecision('ocr_lane', ['formula_dense'], contract);
  }

  if (manifestItem.route_hint === 'diagram_lane') {
    return buildRouteDecision('diagram_lane', ['route_hint'], contract);
  }

  if (manifestItem.route_hint === 'ocr_lane') {
    return buildRouteDecision('ocr_lane', ['text_dominant'], contract);
  }

  if (manifestItem.diagram_present === false) {
    return buildRouteDecision('ocr_lane', ['text_dominant'], contract);
  }

  return buildRouteDecision('review_lane', ['router_fallback'], contract);
}

function laneEvidenceMap(laneOutput = {}) {
  const entries = Array.isArray(laneOutput?.output?.evidence)
    ? laneOutput.output.evidence
    : [];

  return entries.reduce((accumulator, entry) => {
    if (!entry || typeof entry !== 'object') {
      return accumulator;
    }

    const field = normalizeString(entry.field);
    if (!field) {
      return accumulator;
    }

    accumulator[field] = normalizeEvidenceValue(entry.value);
    return accumulator;
  }, {});
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function pickArray(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return cloneJson(value);
    }
  }

  return [];
}

function firstNonNull(...values) {
  for (const value of values) {
    if (value !== null && typeof value !== 'undefined') {
      return value;
    }
  }

  return null;
}

function buildStructuredEvidence(manifestItem, laneOutputs) {
  const ocrOutput = laneOutputs.find((entry) => entry.route === 'ocr_lane');
  const diagramOutput = laneOutputs.find((entry) => entry.route === 'diagram_lane');
  const reviewOutput = laneOutputs.find((entry) => entry.route === 'review_lane');

  const ocrEvidence = laneEvidenceMap(ocrOutput);
  const diagramEvidence = laneEvidenceMap(diagramOutput);
  const reviewEvidence = laneEvidenceMap(reviewOutput);

  return {
    ocr_text: pickFirstString(ocrEvidence.ocr_text, reviewEvidence.ocr_text),
    formula_latex_list: pickArray(
      ocrEvidence.formula_latex_list,
      reviewEvidence.formula_latex_list,
    ),
    subquestion_blocks: pickArray(
      ocrEvidence.subquestion_blocks,
      reviewEvidence.subquestion_blocks,
    ),
    layout_hints: pickArray(
      ocrEvidence.layout_hints,
      reviewEvidence.layout_hints,
    ),
    diagram_present: firstNonNull(
      normalizeNullableBoolean(diagramEvidence.diagram_present),
      normalizeNullableBoolean(reviewEvidence.diagram_present),
      normalizeNullableBoolean(manifestItem.diagram_present),
    ),
    diagram_elements: pickArray(
      diagramEvidence.diagram_elements,
      reviewEvidence.diagram_elements,
    ),
    spatial_evidence: pickArray(
      diagramEvidence.spatial_evidence,
      reviewEvidence.spatial_evidence,
    ),
  };
}

function buildReviewPosture(manifestItem, laneOutputs) {
  const reviewOutput = laneOutputs.find((entry) => entry.route === 'review_lane');
  const reviewEvidence = laneEvidenceMap(reviewOutput);

  return {
    requires_review: Boolean(
      manifestItem.requires_review
      || reviewEvidence.requires_review
      || reviewOutput?.output?.warnings?.includes?.('requires_review'),
    ),
    gate_critical: Boolean(manifestItem.gate_critical),
    review_reasons: normalizeStringArray(reviewEvidence.review_reasons),
    ambiguity_flags: normalizeStringArray(reviewEvidence.ambiguity_flags),
    review_summary: normalizeNullableString(reviewEvidence.review_summary),
    review_confidence:
      typeof reviewOutput?.confidence === 'number' ? reviewOutput.confidence : null,
  };
}

function buildModelProvenance(laneOutputs) {
  return laneOutputs.map((laneOutput) => ({
    route: normalizeNullableString(laneOutput.route),
    model: normalizeNullableString(laneOutput.model),
    region: normalizeNullableString(laneOutput.region),
    base_url: normalizeNullableString(laneOutput.base_url),
    api_key_scope: normalizeNullableString(laneOutput.api_key_scope),
    prompt_template_version: normalizeNullableString(laneOutput.prompt_template_version),
    response_schema_version: normalizeNullableString(laneOutput.response_schema_version),
    input_asset_id: normalizeNullableString(laneOutput.input_asset_id),
    input_asset_hash: normalizeNullableString(laneOutput.input_asset_hash),
    confidence: typeof laneOutput.confidence === 'number' ? laneOutput.confidence : null,
    failure_reason: normalizeNullableString(laneOutput.failure_reason),
  }));
}

function deriveLazyAttachReasons({
  manifestItem,
  routeDecision,
  structuredEvidence,
  reviewPosture,
  modelProvenance,
} = {}) {
  const reasons = [];

  if (routeDecision?.lazy_attach_original_image) {
    reasons.push('route_requires_original_image');
  }

  if (manifestItem?.gate_critical) {
    reasons.push('gate_critical');
  }

  if (reviewPosture?.requires_review) {
    reasons.push('requires_review');
  }

  if (modelProvenance.some((entry) => typeof entry.confidence === 'number' && entry.confidence < LOW_CONFIDENCE_THRESHOLD)) {
    reasons.push('low_confidence');
  }

  if (modelProvenance.some((entry) => normalizeString(entry.failure_reason))) {
    reasons.push('provider_failure');
  }

  if (
    typeof manifestItem?.diagram_present === 'boolean'
    && typeof structuredEvidence?.diagram_present === 'boolean'
    && manifestItem.diagram_present !== structuredEvidence.diagram_present
  ) {
    reasons.push('diagram_present_conflict');
  }

  return unique(reasons);
}

function buildSelectedRoute(routeDecision, manifestItem, laneOutputs) {
  const selectedOutput = laneOutputs.find((entry) => entry.route === routeDecision.route) ?? null;

  return {
    route: routeDecision.route,
    model: routeDecision.model ?? null,
    region: routeDecision.region ?? null,
    base_url: routeDecision.base_url ?? null,
    api_key_scope: routeDecision.api_key_scope ?? null,
    prompt_template_version:
      routeDecision.prompt_template_version ?? null,
    response_schema_version:
      routeDecision.response_schema_version ?? null,
    input_asset_id: selectedOutput?.input_asset_id ?? manifestItem.storage_key ?? null,
    input_asset_hash: selectedOutput?.input_asset_hash ?? null,
    confidence: typeof selectedOutput?.confidence === 'number' ? selectedOutput.confidence : null,
    failure_reason: normalizeNullableString(selectedOutput?.failure_reason),
    decision_reasons: cloneJson(routeDecision.decision_reasons ?? []),
  };
}

function buildAnalysisHints(manifestItem = {}) {
  const rawHints = manifestItem.analysis_hints ?? manifestItem.analysisHints ?? {};

  return {
    runtime_context_id: normalizeNullableString(rawHints.runtime_context_id),
    question_type_hint_id: normalizeNullableString(rawHints.question_type_hint_id),
    topic_path_hint: normalizeNullableString(
      rawHints.topic_path_hint ?? manifestItem.primary_topic_path,
    ),
  };
}

export function buildQuestionEvidenceBundleV1({
  manifestId = null,
  manifestPosition = null,
  manifestItem,
  laneOutputs = [],
} = {}) {
  if (!manifestItem || typeof manifestItem !== 'object') {
    throw new Error('question evidence bundle requires a manifest item.');
  }

  const routeDecision = resolveQuestionEvidenceRoute(manifestItem);
  const structuredEvidence = buildStructuredEvidence(manifestItem, laneOutputs);
  const reviewPosture = buildReviewPosture(manifestItem, laneOutputs);
  const modelProvenance = buildModelProvenance(laneOutputs);
  const lazyAttachReasons = deriveLazyAttachReasons({
    manifestItem,
    routeDecision,
    structuredEvidence,
    reviewPosture,
    modelProvenance,
  });
  const lazyAttachOriginalImage = lazyAttachReasons.length > 0;
  const selectedRoute = buildSelectedRoute(routeDecision, manifestItem, laneOutputs);

  return {
    schema_version: 'question_evidence_bundle_v1',
    manifest_id: normalizeNullableString(manifestId),
    manifest_position: Number.isInteger(manifestPosition) ? manifestPosition : null,
    storage_key: normalizeNullableString(manifestItem.storage_key),
    question_identity: {
      subject_code: normalizeNullableString(manifestItem.syllabus_code),
      year: manifestItem.year ?? null,
      session: normalizeNullableString(manifestItem.session),
      paper: manifestItem.paper ?? null,
      variant: manifestItem.variant ?? null,
      q_number: manifestItem.q_number ?? null,
      primary_topic_path: normalizeNullableString(manifestItem.primary_topic_path),
    },
    analysis_hints: buildAnalysisHints(manifestItem),
    evidence: structuredEvidence,
    surface_posture: {
      descriptor_required: Boolean(manifestItem.descriptor_required),
      route_hint: normalizeNullableString(manifestItem.route_hint),
      diagram_present: normalizeNullableBoolean(manifestItem.diagram_present),
      formula_dense: normalizeNullableBoolean(manifestItem.formula_dense),
      table_heavy: normalizeNullableBoolean(manifestItem.table_heavy),
      surface_evidence_status: normalizeNullableString(manifestItem.surface_evidence_status),
      gate_critical: Boolean(manifestItem.gate_critical),
      requires_review: Boolean(manifestItem.requires_review),
    },
    review_posture: reviewPosture,
    route: selectedRoute,
    model_provenance: modelProvenance,
    lazy_attach_original_image: lazyAttachOriginalImage,
    lazy_attach_reasons: cloneJson(lazyAttachReasons),
    original_image_asset: lazyAttachOriginalImage
      ? {
        input_asset_id: selectedRoute.input_asset_id,
        input_asset_hash: selectedRoute.input_asset_hash,
      }
      : null,
  };
}

export function buildQuestionEvidenceBundlesV1({
  manifest = {},
  laneOutputs = [],
} = {}) {
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const outputsByAssetId = laneOutputs.reduce((accumulator, laneOutput) => {
    const key = normalizeString(laneOutput?.input_asset_id);
    if (!key) {
      return accumulator;
    }

    if (!accumulator.has(key)) {
      accumulator.set(key, []);
    }
    accumulator.get(key).push(cloneJson(laneOutput));
    return accumulator;
  }, new Map());

  return items.map((manifestItem, index) => buildQuestionEvidenceBundleV1({
    manifestId: manifest.manifest_id ?? null,
    manifestPosition: index,
    manifestItem,
    laneOutputs: outputsByAssetId.get(manifestItem.storage_key) ?? [],
  }));
}

export function summarizeQuestionEvidenceBundlesV1(bundles = []) {
  const routeCounts = {};
  let lazyAttachCount = 0;

  for (const bundle of bundles) {
    const route = bundle?.route?.route ?? 'unknown';
    routeCounts[route] = (routeCounts[route] ?? 0) + 1;
    if (bundle?.lazy_attach_original_image) {
      lazyAttachCount += 1;
    }
  }

  return {
    bundles_planned: bundles.length,
    route_counts: routeCounts,
    lazy_attach_original_image: lazyAttachCount,
  };
}
