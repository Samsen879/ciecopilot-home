const DEFAULT_TIMEOUT_MS = 4000;

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toProbability(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function normalizeRoute(rawRoute) {
  const route = String(rawRoute || '').trim().toLowerCase();
  if (route === 's2' || route === 's2_augmentation' || route === 'augmentation') return 's2_augmentation';
  return 's1_default';
}

function parseClassifierPayload(rawContent) {
  if (typeof rawContent !== 'string' || !rawContent.trim()) return null;
  try {
    const parsed = JSON.parse(rawContent);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      retrieval_route: normalizeRoute(parsed.retrieval_route),
      confidence: toProbability(parsed.confidence, 0.5),
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
    };
  } catch {
    return null;
  }
}

function buildPrompt(query) {
  return [
    'You are a strict router classifier for RAG retrieval.',
    'Classify whether the query should use s2_augmentation or s1_default.',
    'Use s2_augmentation only for cross-topic/cross-chapter/global planning/prerequisite-chain reasoning.',
    'Use s1_default for single-node definition/factoid/current-node bounded questions.',
    'Return JSON only: {"retrieval_route":"s1_default|s2_augmentation","confidence":0..1,"reason":"short"}',
    `query: ${query}`,
  ].join('\n');
}

export async function classifyS2RouteByLlm(
  query,
  {
    s2Config = null,
    fetchImpl = fetch,
  } = {},
) {
  const enabled = s2Config?.llmClassifierEnabled === true;
  if (!enabled) {
    return {
      available: false,
      retrieval_route: 's1_default',
      route_reason: 'llm_classifier_not_enabled_default_s1',
      route_stage: 'default_safe',
      route_scores: null,
      llm_classifier_used: false,
      llm_classifier_status: 'not_enabled',
    };
  }

  const baseUrl = String(s2Config?.llmClassifierBaseUrl || '').replace(/\/$/, '');
  const apiKey = String(s2Config?.llmClassifierApiKey || '');
  const model = String(s2Config?.llmClassifierModel || '');
  const timeoutMs = toFiniteNumber(s2Config?.llmClassifierTimeoutMs, DEFAULT_TIMEOUT_MS);
  if (!baseUrl || !apiKey || !model) {
    return {
      available: false,
      retrieval_route: 's1_default',
      route_reason: 'llm_classifier_not_configured_default_s1',
      route_stage: 'default_safe',
      route_scores: null,
      llm_classifier_used: false,
      llm_classifier_status: 'not_configured',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: buildPrompt(query),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        available: false,
        retrieval_route: 's1_default',
        route_reason: 'llm_classifier_error_default_s1',
        route_stage: 'default_safe',
        route_scores: {
          llm_status_code: response.status,
        },
        llm_classifier_used: true,
        llm_classifier_status: 'upstream_error',
      };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseClassifierPayload(content);
    if (!parsed) {
      return {
        available: false,
        retrieval_route: 's1_default',
        route_reason: 'llm_classifier_parse_error_default_s1',
        route_stage: 'default_safe',
        route_scores: null,
        llm_classifier_used: true,
        llm_classifier_status: 'parse_error',
      };
    }

    return {
      available: true,
      retrieval_route: parsed.retrieval_route,
      route_reason:
        parsed.retrieval_route === 's2_augmentation'
          ? 'llm_classifier_positive'
          : 'llm_classifier_negative',
      route_stage: 'llm_classifier',
      route_scores: {
        llm_confidence: parsed.confidence,
        llm_reason: parsed.reason,
        llm_model: model,
      },
      llm_classifier_used: true,
      llm_classifier_status: 'upstream_ok',
    };
  } catch {
    return {
      available: false,
      retrieval_route: 's1_default',
      route_reason: 'llm_classifier_error_default_s1',
      route_stage: 'default_safe',
      route_scores: null,
      llm_classifier_used: true,
      llm_classifier_status: 'upstream_error',
    };
  } finally {
    clearTimeout(timer);
  }
}
