import { RagError } from './errors.js';

export async function generateEmbedding(query, { config, fetchImpl = fetch } = {}) {
  if (!config?.apiKey) {
    throw new RagError({
      status: 500,
      code: 'RAG_EMBEDDING_KEY_MISSING',
      message: 'Embedding API key is missing',
    });
  }

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
    if (error?.name === 'AbortError') {
      throw new RagError({
        status: 504,
        code: 'RAG_EMBEDDING_TIMEOUT',
        message: 'Embedding request timed out',
      });
    }
    if (error instanceof RagError) throw error;
    throw new RagError({
      status: 502,
      code: 'RAG_EMBEDDING_NETWORK_ERROR',
      message: error?.message || 'Embedding request failed',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

