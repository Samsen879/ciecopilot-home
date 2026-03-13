import { jest } from '@jest/globals';
import { generateEmbedding } from '../lib/embedding-client.js';

function createResponse(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    },
  };
}

describe('generateEmbedding', () => {
  it('retries transient network failures and returns embedding vector', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        createResponse({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
          usage: { total_tokens: 8 },
        }),
      );

    const result = await generateEmbedding('integration', {
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.com/v1',
        model: 'test-embedding',
        timeoutMs: 1000,
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      vector: [0.1, 0.2, 0.3],
      usage: { total_tokens: 8 },
    });
  });
});
