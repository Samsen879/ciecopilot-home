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

export function getRagConfig() {
  const embeddingBaseUrl =
    process.env.VECTOR_EMBEDDING_BASE_URL ||
    process.env.EMBEDDING_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1';
  const embeddingApiKey =
    process.env.VECTOR_EMBEDDING_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_TOKEN ||
    process.env.OPENAI_KEY;
  const embeddingModel =
    process.env.VECTOR_EMBEDDING_MODEL ||
    process.env.EMBEDDING_MODEL ||
    'text-embedding-3-large';
  const embeddingDimensions = toPositiveNumber(
    process.env.VECTOR_EMBEDDING_DIMENSIONS || process.env.EMBEDDING_DIMENSIONS,
    1536,
  );

  const chatBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const chatApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY;
  const chatModel = process.env.CHAT_MODEL || 'gpt-4o-mini';

  return {
    retrievalVersion: process.env.RAG_RETRIEVAL_VERSION || RETRIEVAL_VERSION,
    retrieval: {
      k_key: toPositiveNumber(process.env.RAG_K_KEY, DEFAULT_RETRIEVAL_CONFIG.k_key),
      k_sem: toPositiveNumber(process.env.RAG_K_SEM, DEFAULT_RETRIEVAL_CONFIG.k_sem),
      rrf_k: toPositiveNumber(process.env.RAG_RRF_K, DEFAULT_RETRIEVAL_CONFIG.rrf_k),
      fused_top_k: toPositiveNumber(process.env.RAG_FUSED_TOP_K, DEFAULT_RETRIEVAL_CONFIG.fused_top_k),
      w_key: toNonNegativeNumber(process.env.RAG_W_KEY, DEFAULT_RETRIEVAL_CONFIG.w_key),
      w_sem: toNonNegativeNumber(process.env.RAG_W_SEM, DEFAULT_RETRIEVAL_CONFIG.w_sem),
    },
    embedding: {
      baseUrl: embeddingBaseUrl.replace(/\/$/, ''),
      apiKey: embeddingApiKey,
      model: embeddingModel,
      dimensions: embeddingDimensions,
      timeoutMs: toPositiveNumber(process.env.RAG_EMBEDDING_TIMEOUT_MS, 12000),
    },
    chat: {
      baseUrl: chatBaseUrl.replace(/\/$/, ''),
      apiKey: chatApiKey,
      model: chatModel,
      timeoutMs: toPositiveNumber(process.env.RAG_CHAT_TIMEOUT_MS, 18000),
    },
    pricing: {
      version: process.env.RAG_PRICE_TABLE_VERSION || 'rag_s1_default_pricing_v1',
      chat_prompt_per_1k: toNonNegativeNumber(process.env.RAG_CHAT_PROMPT_PRICE_PER_1K, 0.00015),
      chat_completion_per_1k: toNonNegativeNumber(process.env.RAG_CHAT_COMPLETION_PRICE_PER_1K, 0.0006),
      embedding_per_1k: toNonNegativeNumber(process.env.RAG_EMBEDDING_PRICE_PER_1K, 0.0001),
    },
  };
}
