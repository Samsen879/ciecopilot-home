import crypto from 'node:crypto';
import { normalizeQuery } from './query-normalizer.js';

const SCHEMA_VERSION = 'rag_request_telemetry_v1';
const ALLOWED_ROUTE_SCORE_KEYS = Object.freeze([
  'readiness_guard_reason',
  'readiness_effective_depth_source',
  'production_evidence_rollout_active',
  'production_evidence_rollout_reason',
  'production_evidence_rollout_bundle_ids',
  'production_evidence_rollout_corpus_versions',
  'production_evidence_rollout_source_types',
  's2_empty_evidence_reason',
  's2_allowed_topic_paths',
  's2_leakage_evaluation_mode',
]);

function toNullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function toOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function getHeaderValue(headers = {}, name) {
  if (!headers || typeof headers !== 'object') return null;
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === String(name).toLowerCase()) {
      return toNullableString(Array.isArray(value) ? value[0] : value);
    }
  }
  return null;
}

function resolveClientTrace(req = {}) {
  const clientSessionId = getHeaderValue(req?.headers, 'x-client-session-id');
  if (clientSessionId) {
    return {
      client_session_id: clientSessionId,
      client_trace_source: 'x-client-session-id',
    };
  }

  const traceId = getHeaderValue(req?.headers, 'x-trace-id');
  if (traceId) {
    return {
      client_session_id: traceId,
      client_trace_source: 'x-trace-id',
    };
  }

  return {
    client_session_id: null,
    client_trace_source: null,
  };
}

function estimateQueryTokens(query) {
  const normalized = String(query || '').trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function buildQueryIdentity(input = {}) {
  const rawQuery = String(input?.query || input?.q || '').trim();
  const normalized = normalizeQuery(rawQuery);
  const hashSource = String(normalized.normalized_query || rawQuery || '')
    .trim()
    .toLowerCase();

  return {
    subject_code: input?.subject_code || null,
    current_topic_path: input?.current_topic_path || null,
    syllabus_node_id: input?.syllabus_node_id || null,
    language: toNullableString(input?.language || input?.lang) || 'en',
    query_capture_mode: 'normalized_hash',
    query_hash: crypto.createHash('sha256').update(hashSource).digest('hex'),
    query_length: String(normalized.normalized_query || '').length,
    query_token_estimate: estimateQueryTokens(normalized.normalized_query),
  };
}

function sanitizeRouteScoreExcerpt(routeScores = {}) {
  const source = routeScores && typeof routeScores === 'object' ? routeScores : {};
  return {
    readiness_guard_reason: toNullableString(source.readiness_guard_reason),
    readiness_effective_depth_source: toNullableString(source.readiness_effective_depth_source),
    production_evidence_rollout_active: Boolean(source.production_evidence_rollout_active),
    production_evidence_rollout_reason: toNullableString(source.production_evidence_rollout_reason),
    production_evidence_rollout_bundle_ids: toStringArray(source.production_evidence_rollout_bundle_ids),
    production_evidence_rollout_corpus_versions: toStringArray(source.production_evidence_rollout_corpus_versions),
    production_evidence_rollout_source_types: toStringArray(source.production_evidence_rollout_source_types),
    s2_empty_evidence_reason: toNullableString(source.s2_empty_evidence_reason),
    s2_allowed_topic_paths: toStringArray(source.s2_allowed_topic_paths),
    s2_leakage_evaluation_mode: toNullableString(source.s2_leakage_evaluation_mode),
  };
}

function buildRouteSnapshot(routeAudit = {}) {
  const route = routeAudit && typeof routeAudit === 'object' ? routeAudit : {};
  return {
    retrieval_route: toNullableString(route.retrieval_route) || 's1_default',
    final_execution_route: toNullableString(route.final_execution_route) || 's1_default',
    route_stage: toNullableString(route.route_stage),
    route_reason: toNullableString(route.route_reason),
    fallback_triggered: Boolean(route.fallback_triggered),
    fallback_reason: toNullableString(route.fallback_reason),
    llm_classifier_used: Boolean(route.llm_classifier_used),
    llm_classifier_status: toNullableString(route.llm_classifier_status),
    s2_hop_count: toNonNegativeNumber(route.s2_hop_count, 0),
    s2_expanded_topic_count: toNonNegativeNumber(route.s2_expanded_topic_count, 0),
    route_score_excerpt: sanitizeRouteScoreExcerpt(route.route_scores),
  };
}

function buildRetrievalSnapshot(retrievalAudit = {}) {
  const retrieval = retrievalAudit && typeof retrievalAudit === 'object' ? retrievalAudit : {};
  return {
    query_mode: toNullableString(retrieval.query_mode),
    chat_mode: toNullableString(retrieval.chat_mode),
    rpc_call_count: toNonNegativeNumber(retrieval.rpc_call_count, 0),
    hybrid_row_count: toNonNegativeNumber(retrieval.hybrid_row_count, 0),
    dense_row_count: toNonNegativeNumber(retrieval.dense_row_count, 0),
    lexical_row_count: toNonNegativeNumber(retrieval.lexical_row_count, 0),
    error_stage: toNullableString(retrieval.error_stage),
    error_code: toNullableString(retrieval.error_code),
    error_status: toOptionalNumber(retrieval.error_status),
  };
}

function buildOutcomeSnapshot(payload = {}, metrics = {}) {
  return {
    uncertain: Boolean(payload?.uncertain),
    uncertain_reason_code: toNullableString(payload?.uncertain_reason_code),
    topic_leakage_flag: Boolean(payload?.topic_leakage_flag),
    topic_leakage_reason: toNullableString(payload?.topic_leakage_reason),
    evidence_count: Array.isArray(payload?.evidence) ? payload.evidence.length : 0,
    evidence_traceability_rate: toNonNegativeNumber(metrics?.evidence_traceability_rate, 0),
    retrieval_latency_ms: toNonNegativeNumber(metrics?.retrieval_latency_ms, 0),
    llm_latency_ms: toNonNegativeNumber(metrics?.llm_latency_ms, 0),
    latency_ms: toNonNegativeNumber(metrics?.latency_ms, 0),
  };
}

function buildCostSnapshot(costAudit = {}) {
  const cost = costAudit && typeof costAudit === 'object' ? costAudit : {};
  return {
    request_cost_usd: toNonNegativeNumber(cost.request_cost_usd, 0),
    prompt_tokens: toNonNegativeNumber(cost?.usage?.prompt_tokens, 0),
    completion_tokens: toNonNegativeNumber(cost?.usage?.completion_tokens, 0),
    embedding_tokens: toNonNegativeNumber(cost?.usage?.embedding_tokens, 0),
    embedding_calls: toNonNegativeNumber(cost?.call_counts?.embedding_calls, 0),
    chat_calls: toNonNegativeNumber(cost?.call_counts?.chat_calls, 0),
    embedding_model: toNullableString(cost?.models?.embedding_model),
    chat_model: toNullableString(cost?.models?.chat_model),
    price_table_version: toNullableString(cost.price_table_version),
  };
}

function buildBaseEnvelope({ req, endpoint, method, success, statusCode, ragErrorCode, failureStage }) {
  return {
    schema_version: SCHEMA_VERSION,
    captured_at: new Date().toISOString(),
    request_id: req?.request_id || null,
    endpoint: toNullableString(endpoint),
    method: toNullableString(method),
    success: Boolean(success),
    status_code: toOptionalNumber(statusCode),
    rag_error_code: toNullableString(ragErrorCode),
    failure_stage: toNullableString(failureStage),
    ...resolveClientTrace(req),
  };
}

function buildEvent({ req, input, endpoint, method, payload, success, statusCode, ragErrorCode, failureStage }) {
  const metrics = payload?.metrics && typeof payload.metrics === 'object' ? payload.metrics : {};
  const routeSnapshot = buildRouteSnapshot(metrics.route_audit);
  const retrievalSnapshot = buildRetrievalSnapshot(metrics.retrieval_audit);

  return {
    ...buildBaseEnvelope({
      req,
      endpoint,
      method,
      success,
      statusCode,
      ragErrorCode,
      failureStage: failureStage || retrievalSnapshot.error_stage,
    }),
    ...buildQueryIdentity(input),
    ...routeSnapshot,
    ...retrievalSnapshot,
    ...buildOutcomeSnapshot(payload, metrics),
    ...buildCostSnapshot(metrics.cost_audit),
  };
}

export function buildRagRequestTelemetrySuccessEvent({ req, input, response, endpoint, method }) {
  return buildEvent({
    req,
    input,
    endpoint,
    method,
    payload: response,
    success: true,
    statusCode: 200,
    ragErrorCode: null,
    failureStage: null,
  });
}

export function buildRagRequestTelemetryFailureEvent({
  req,
  input,
  ragError,
  partialResponse,
  endpoint,
  method,
}) {
  return buildEvent({
    req,
    input,
    endpoint,
    method,
    payload: partialResponse || {},
    success: false,
    statusCode: ragError?.status || 500,
    ragErrorCode: ragError?.code || 'RAG_INTERNAL_ERROR',
    failureStage: partialResponse?.metrics?.retrieval_audit?.error_stage || null,
  });
}

export { ALLOWED_ROUTE_SCORE_KEYS, SCHEMA_VERSION };
