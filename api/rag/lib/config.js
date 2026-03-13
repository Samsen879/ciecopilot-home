import path from 'node:path';
import { DEFAULT_RETRIEVAL_CONFIG, RETRIEVAL_VERSION } from './constants.js';

function toPositiveNumber(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function toNonNegativeNumber(raw, fallback) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

function toBoolean(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const value = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(value)) return false;
  return fallback;
}

function toCsvList(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPositiveDepthMap(raw) {
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed)
      .map(([key, value]) => [String(key).trim(), toPositiveNumber(value, 0)])
      .filter(([key, value]) => key.length > 0 && value > 0),
  );
}

export function getRagConfig() {
  const allowOpenAiFallback = toBoolean(process.env.RAG_ALLOW_OPENAI_FALLBACK, false);

  const embeddingApiKey =
    process.env.VECTOR_EMBEDDING_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    (allowOpenAiFallback
      ? process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY
      : null);

  const embeddingBaseUrl =
    process.env.VECTOR_EMBEDDING_BASE_URL ||
    process.env.EMBEDDING_BASE_URL ||
    process.env.DASHSCOPE_BASE_URL ||
    (allowOpenAiFallback ? process.env.OPENAI_BASE_URL : null) ||
    (allowOpenAiFallback && embeddingApiKey ? 'https://api.openai.com/v1' : '');
  const embeddingModel =
    process.env.VECTOR_EMBEDDING_MODEL ||
    process.env.EMBEDDING_MODEL ||
    'text-embedding-3-large';
  const embeddingDimensions = toPositiveNumber(
    process.env.VECTOR_EMBEDDING_DIMENSIONS || process.env.EMBEDDING_DIMENSIONS,
    1536,
  );

  const chatEnabled = toBoolean(process.env.RAG_CHAT_ENABLED, false);
  const chatFailOpen = toBoolean(process.env.RAG_CHAT_FAIL_OPEN, true);
  const chatBaseUrl =
    process.env.RAG_CHAT_BASE_URL ||
    process.env.CHAT_BASE_URL ||
    process.env.VECTOR_CHAT_BASE_URL ||
    process.env.DASHSCOPE_BASE_URL ||
    (allowOpenAiFallback ? process.env.OPENAI_BASE_URL : null) ||
    process.env.VECTOR_EMBEDDING_BASE_URL ||
    '';
  const chatApiKey =
    process.env.RAG_CHAT_API_KEY ||
    process.env.CHAT_API_KEY ||
    process.env.VECTOR_CHAT_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    (allowOpenAiFallback
      ? process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY
      : null) ||
    null;
  const chatModel =
    process.env.RAG_CHAT_MODEL ||
    process.env.CHAT_MODEL ||
    process.env.VECTOR_CHAT_MODEL ||
    process.env.QWEN_CHAT_MODEL ||
    process.env.OPENAI_CHAT_MODEL ||
    'qwen-plus';

  const s2Enabled = toBoolean(process.env.RAG_S2_ENABLED, false);
  const s2RouteKillSwitch = toBoolean(process.env.RAG_S2_ROUTE_KILL_SWITCH, false);
  const s2RouteRulesOnly = toBoolean(process.env.RAG_S2_ROUTE_RULES_ONLY, false);
  const s2LlmClassifierEnabled = toBoolean(process.env.RAG_S2_LLM_CLASSIFIER_ENABLED, false);
  const s2LlmClassifierBaseUrl = (
    process.env.RAG_S2_LLM_CLASSIFIER_BASE_URL ||
    process.env.RAG_CHAT_BASE_URL ||
    process.env.CHAT_BASE_URL ||
    process.env.VECTOR_CHAT_BASE_URL ||
    process.env.DASHSCOPE_BASE_URL ||
    (allowOpenAiFallback ? process.env.OPENAI_BASE_URL : null) ||
    ''
  ).replace(/\/$/, '');
  const s2LlmClassifierApiKey =
    process.env.RAG_S2_LLM_CLASSIFIER_API_KEY ||
    process.env.RAG_CHAT_API_KEY ||
    process.env.CHAT_API_KEY ||
    process.env.VECTOR_CHAT_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    (allowOpenAiFallback
      ? process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY
      : null) ||
    null;
  const s2LlmClassifierModel =
    process.env.RAG_S2_LLM_CLASSIFIER_MODEL ||
    process.env.RAG_CHAT_MODEL ||
    process.env.CHAT_MODEL ||
    process.env.VECTOR_CHAT_MODEL ||
    process.env.QWEN_CHAT_MODEL ||
    process.env.OPENAI_CHAT_MODEL ||
    'qwen-plus';
  const s2LlmClassifierTimeoutMs = toPositiveNumber(process.env.RAG_S2_LLM_CLASSIFIER_TIMEOUT_MS, 4000);
  const s2TimeoutMs = toPositiveNumber(process.env.RAG_S2_TIMEOUT_MS, 8000);
  const s2MaxExpandedTopics = toPositiveNumber(process.env.RAG_S2_MAX_EXPANDED_TOPICS, 6);
  const s2ReadinessGuardEnabled = toBoolean(process.env.RAG_S2_READINESS_GUARD_ENABLED, true);
  const s2ReadinessSummaryPath =
    process.env.RAG_S2_READINESS_SUMMARY_PATH ||
    path.join(process.cwd(), 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
  const s2ReadinessMaxTopicDepth = toPositiveNumber(process.env.RAG_S2_READINESS_MAX_TOPIC_DEPTH, 1);
  const s2ReadinessProfilePath =
    process.env.RAG_S2_READINESS_PROFILE_PATH ||
    path.join(process.cwd(), 'runs', 'backend', 'rag_s2_readiness_profile.json');
  const s2ReadinessMaxTopicDepthBySubject = toPositiveDepthMap(
    process.env.RAG_S2_READINESS_MAX_TOPIC_DEPTH_BY_SUBJECT,
  );
  const s2ReadinessSubjectAllowlist = toCsvList(process.env.RAG_S2_READINESS_SUBJECT_ALLOWLIST);
  const s2ReadinessEnforceSummaryCoverage = toBoolean(
    process.env.RAG_S2_READINESS_ENFORCE_SUMMARY_COVERAGE,
    false,
  );
  const s2RouteClassifierModelPath =
    process.env.RAG_S2_ROUTE_CLASSIFIER_MODEL_PATH ||
    path.join(process.cwd(), 'runs', 'backend', 'rag_s2_route_classifier_model.json');
  return {
    retrievalVersion: process.env.RAG_RETRIEVAL_VERSION || RETRIEVAL_VERSION,
    retrieval: {
      k_key: toPositiveNumber(process.env.RAG_K_KEY, DEFAULT_RETRIEVAL_CONFIG.k_key),
      k_sem: toPositiveNumber(process.env.RAG_K_SEM, DEFAULT_RETRIEVAL_CONFIG.k_sem),
      rrf_k: toPositiveNumber(process.env.RAG_RRF_K, DEFAULT_RETRIEVAL_CONFIG.rrf_k),
      fused_top_k: toPositiveNumber(process.env.RAG_FUSED_TOP_K, DEFAULT_RETRIEVAL_CONFIG.fused_top_k),
      w_key: toNonNegativeNumber(process.env.RAG_W_KEY, DEFAULT_RETRIEVAL_CONFIG.w_key),
      w_sem: toNonNegativeNumber(process.env.RAG_W_SEM, DEFAULT_RETRIEVAL_CONFIG.w_sem),
      corpusVersions: toCsvList(process.env.RAG_CORPUS_VERSIONS),
    },
    embedding: {
      baseUrl: embeddingBaseUrl.replace(/\/$/, ''),
      apiKey: embeddingApiKey,
      model: embeddingModel,
      dimensions: embeddingDimensions,
      timeoutMs: toPositiveNumber(process.env.RAG_EMBEDDING_TIMEOUT_MS, 12000),
    },
    chat: {
      enabled: chatEnabled,
      failOpen: chatFailOpen,
      baseUrl: chatBaseUrl ? chatBaseUrl.replace(/\/$/, '') : '',
      apiKey: chatApiKey,
      model: chatModel,
      timeoutMs: toPositiveNumber(process.env.RAG_CHAT_TIMEOUT_MS, 18000),
    },
    s2: {
      enabled: s2Enabled,
      routeKillSwitch: s2RouteKillSwitch,
      routeRulesOnly: s2RouteRulesOnly,
      llmClassifierEnabled: s2LlmClassifierEnabled,
      llmClassifierBaseUrl: s2LlmClassifierBaseUrl,
      llmClassifierApiKey: s2LlmClassifierApiKey,
      llmClassifierModel: s2LlmClassifierModel,
      llmClassifierTimeoutMs: s2LlmClassifierTimeoutMs,
      timeoutMs: s2TimeoutMs,
      maxExpandedTopics: s2MaxExpandedTopics,
      readinessGuardEnabled: s2ReadinessGuardEnabled,
      readinessSummaryPath: s2ReadinessSummaryPath,
      readinessMaxTopicDepth: s2ReadinessMaxTopicDepth,
      readinessProfilePath: s2ReadinessProfilePath,
      readinessMaxTopicDepthBySubject: s2ReadinessMaxTopicDepthBySubject,
      readinessSubjectAllowlist: s2ReadinessSubjectAllowlist,
      readinessEnforceSummaryCoverage: s2ReadinessEnforceSummaryCoverage,
      routeClassifierModelPath: s2RouteClassifierModelPath,
    },
    pricing: {
      version: process.env.RAG_PRICE_TABLE_VERSION || 'rag_s1_default_pricing_v1',
      chat_prompt_per_1k: toNonNegativeNumber(process.env.RAG_CHAT_PROMPT_PRICE_PER_1K, 0.00015),
      chat_completion_per_1k: toNonNegativeNumber(process.env.RAG_CHAT_COMPLETION_PRICE_PER_1K, 0.0006),
      embedding_per_1k: toNonNegativeNumber(process.env.RAG_EMBEDDING_PRICE_PER_1K, 0.0001),
    },
  };
}
