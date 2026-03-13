import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_MODEL_PATH = path.join(process.cwd(), 'runs', 'backend', 'rag_s2_route_classifier_model.json');
const DEFAULT_S2_MIN_PROB = 0.7;
const DEFAULT_S1_MAX_PROB = 0.35;

let modelCache = {
  path: null,
  mtimeMs: null,
  model: null,
};

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toProbability(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function isValidModelPayload(model) {
  if (!model || typeof model !== 'object') return false;
  if (!model.token_log_odds || typeof model.token_log_odds !== 'object') return false;
  return Number.isFinite(Number(model.prior_log_odds));
}

function normalizeModelPayload(rawModel = null) {
  if (!isValidModelPayload(rawModel)) return null;
  return {
    model_version: String(rawModel.model_version || 'unknown'),
    prior_log_odds: toFiniteNumber(rawModel.prior_log_odds, 0),
    token_log_odds: rawModel.token_log_odds || {},
    thresholds: {
      s2_min_prob: toProbability(rawModel?.thresholds?.s2_min_prob, DEFAULT_S2_MIN_PROB),
      s1_max_prob: toProbability(rawModel?.thresholds?.s1_max_prob, DEFAULT_S1_MAX_PROB),
    },
  };
}

function readModelFromPath(modelPath) {
  const absolutePath = path.resolve(process.cwd(), modelPath || DEFAULT_MODEL_PATH);
  if (!fs.existsSync(absolutePath)) return null;

  let stat = null;
  try {
    stat = fs.statSync(absolutePath);
  } catch {
    return null;
  }

  if (
    modelCache.path === absolutePath &&
    modelCache.mtimeMs === stat.mtimeMs &&
    modelCache.model
  ) {
    return modelCache.model;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const normalized = normalizeModelPayload(parsed);
    modelCache = {
      path: absolutePath,
      mtimeMs: stat.mtimeMs,
      model: normalized,
    };
    return normalized;
  } catch {
    return null;
  }
}

function sigmoid(value) {
  if (value > 20) return 1;
  if (value < -20) return 0;
  return 1 / (1 + Math.exp(-value));
}

export function tokenizeRouteQuery(query) {
  const normalized = String(query || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u4e00-\u9fff]+/gu, ' ')
    .trim();
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 96);
}

export function classifyS2RouteByLocalModel(
  query,
  {
    model = null,
    modelPath = DEFAULT_MODEL_PATH,
  } = {},
) {
  const normalizedModel = normalizeModelPayload(model) || readModelFromPath(modelPath);
  if (!normalizedModel) {
    return {
      available: false,
      retrieval_route: 's1_default',
      route_reason: 'local_classifier_unavailable_default_s1',
      route_stage: 'default_safe',
      route_scores: null,
    };
  }

  const tokens = tokenizeRouteQuery(query);
  let rawScore = normalizedModel.prior_log_odds;
  for (const token of tokens) {
    rawScore += toFiniteNumber(normalizedModel.token_log_odds[token], 0);
  }
  const pS2 = sigmoid(rawScore);

  let retrievalRoute = 's1_default';
  let routeReason = 'local_classifier_ambiguous_default_s1';
  if (pS2 >= normalizedModel.thresholds.s2_min_prob) {
    retrievalRoute = 's2_augmentation';
    routeReason = 'local_classifier_positive';
  } else if (pS2 <= normalizedModel.thresholds.s1_max_prob) {
    retrievalRoute = 's1_default';
    routeReason = 'local_classifier_negative';
  }

  return {
    available: true,
    retrieval_route: retrievalRoute,
    route_reason: routeReason,
    route_stage: 'local_classifier',
    route_scores: {
      p_s2: Number(pS2.toFixed(6)),
      raw_score: Number(rawScore.toFixed(6)),
      token_count: tokens.length,
      model_version: normalizedModel.model_version,
      s2_min_prob: normalizedModel.thresholds.s2_min_prob,
      s1_max_prob: normalizedModel.thresholds.s1_max_prob,
    },
  };
}
