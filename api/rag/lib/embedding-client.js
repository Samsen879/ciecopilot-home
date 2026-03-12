import { RagError } from './errors.js';

const EMBEDDING_MAX_ATTEMPTS = 3;
const EMBEDDING_RETRY_DELAYS_MS = [100, 300];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableEmbeddingError(error) {
  return error?.code === 'RAG_EMBEDDING_NETWORK_ERROR' || error?.code === 'RAG_EMBEDDING_TIMEOUT';
}

export async function generateEmbedding(query, { config, fetchImpl = fetch } = {}) {
  if (!config?.apiKey) {
    throw new RagError({
      status: 500,
      code: 'RAG_EMBEDDING_KEY_MISSING',
      message: 'Embedding API key is missing',
    });
  }

  for (let attempt = 1; attempt <= EMBEDDING_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), config.timeoutMs || 12000);
    try {
      const response = await fetchImpl(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          input: String(query || '').slice(0, 4000),
          ...(config.dimensions ? { dimensions: config.dimensions } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = 'Embedding request failed';
        try {
          const body = await response.json();
          message = body?.error?.message || message;
        } catch {
          // ignore
        }
        throw new RagError({
          status: 502,
          code: 'RAG_EMBEDDING_UPSTREAM_ERROR',
          message,
        });
      }

      const payload = await response.json();
      const vector = payload?.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new RagError({
          status: 502,
          code: 'RAG_EMBEDDING_INVALID_RESPONSE',
          message: 'Embedding response did not include vector data',
        });
      }

      return {
        vector,
        usage: payload?.usage || null,
      };
    } catch (error) {
      const normalizedError =
        error?.name === 'AbortError'
          ? new RagError({
            status: 504,
            code: 'RAG_EMBEDDING_TIMEOUT',
            message: 'Embedding request timed out',
          })
          : error instanceof RagError
            ? error
            : new RagError({
              status: 502,
              code: 'RAG_EMBEDDING_NETWORK_ERROR',
              message: error?.message || 'Embedding request failed',
            });

      if (attempt >= EMBEDDING_MAX_ATTEMPTS || !isRetryableEmbeddingError(normalizedError)) {
        throw normalizedError;
      }
      await sleep(EMBEDDING_RETRY_DELAYS_MS[attempt - 1] || 0);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new RagError({
    status: 502,
    code: 'RAG_EMBEDDING_NETWORK_ERROR',
    message: 'Embedding request failed',
  });
}

