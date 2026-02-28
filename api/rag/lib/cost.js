export const COST_FORMULA_VERSION = 'rag_s1_cost_v1';

function roundUsd(value) {
  return Number(Math.max(Number(value) || 0, 0).toFixed(6));
}

export function computeRequestCostAudit(
  {
    prompt_tokens = 0,
    completion_tokens = 0,
    embedding_tokens = 0,
    rerank_or_extra_calls_cost = 0,
    cache_saving = 0,
    embedding_calls = 0,
    chat_calls = 0,
    rerank_calls = 0,
    extra_calls = 0,
  },
  {
    pricing,
    models = {},
  },
) {
  const chat_prompt_tokens = Number(prompt_tokens) || 0;
  const chat_completion_tokens = Number(completion_tokens) || 0;
  const embedding_total_tokens = Number(embedding_tokens) || 0;
  const chat_prompt_cost_usd = (chat_prompt_tokens / 1000) * Number(pricing.chat_prompt_per_1k || 0);
  const chat_completion_cost_usd = (chat_completion_tokens / 1000) * Number(pricing.chat_completion_per_1k || 0);
  const embedding_cost_usd = (embedding_total_tokens / 1000) * Number(pricing.embedding_per_1k || 0);
  const rerank_or_extra_cost_usd = Number(rerank_or_extra_calls_cost || 0);
  const cache_saving_usd = Number(cache_saving || 0);
  const request_cost_usd = roundUsd(
    chat_prompt_cost_usd +
      chat_completion_cost_usd +
      embedding_cost_usd +
      rerank_or_extra_cost_usd -
      cache_saving_usd,
  );

  return {
    formula_version: COST_FORMULA_VERSION,
    price_table_version: pricing.version || 'rag_s1_default_pricing_v1',
    pricing: {
      chat_prompt_per_1k: Number(pricing.chat_prompt_per_1k || 0),
      chat_completion_per_1k: Number(pricing.chat_completion_per_1k || 0),
      embedding_per_1k: Number(pricing.embedding_per_1k || 0),
    },
    models: {
      embedding_model: models.embedding_model || null,
      chat_model: models.chat_model || null,
    },
    usage: {
      prompt_tokens: chat_prompt_tokens,
      completion_tokens: chat_completion_tokens,
      embedding_tokens: embedding_total_tokens,
    },
    component_costs_usd: {
      chat_prompt: roundUsd(chat_prompt_cost_usd),
      chat_completion: roundUsd(chat_completion_cost_usd),
      embedding: roundUsd(embedding_cost_usd),
      rerank_or_extra_calls: roundUsd(rerank_or_extra_cost_usd),
      cache_saving: roundUsd(cache_saving_usd),
    },
    call_counts: {
      embedding_calls: Number(embedding_calls) || 0,
      chat_calls: Number(chat_calls) || 0,
      rerank_calls: Number(rerank_calls) || 0,
      extra_calls: Number(extra_calls) || 0,
    },
    request_cost_usd,
  };
}

export function computeRequestCostUsd(input, options) {
  return computeRequestCostAudit(input, options).request_cost_usd;
}
