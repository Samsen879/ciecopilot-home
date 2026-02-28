import { executeAskAI } from '../lib/ask-service.js';

function createSupabaseStub() {
  return {
    from(table) {
      if (table !== 'curriculum_nodes') throw new Error(`Unexpected table: ${table}`);
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return {
                    data: {
                      node_id: 'node-1',
                      topic_path: '9709.P1',
                      syllabus_code: '9709',
                      title: 'Pure Mathematics 1',
                      description: 'Paper 1',
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
    async rpc(name, params) {
      if (name !== 'hybrid_search_v2') throw new Error(`Unexpected rpc: ${name}`);
      if (params.p_w_sem === 1) {
        return {
          data: [
            { id: 101, snippet: 'Pure Mathematics 1 title', topic_path: '9709.P1', rank_sem: 1, score: 0.9 },
          ],
          error: null,
        };
      }
      return {
        data: [
          { id: 101, snippet: 'Pure Mathematics 1 title', topic_path: '9709.P1', rank_key: 1, score: 0.9 },
        ],
        error: null,
      };
    },
  };
}

function createFetchStub() {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    if (String(url).includes('/embeddings')) {
      return {
        ok: true,
        async json() {
          return {
            data: [{ embedding: [0.1, 0.2, 0.3] }],
            usage: { total_tokens: 10 },
          };
        },
      };
    }
    if (String(url).includes('/chat/completions')) {
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { content: 'Pure Mathematics 1' } }],
            usage: { prompt_tokens: 20, completion_tokens: 10 },
          };
        },
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };
  fn.calls = calls;
  return fn;
}

describe('ask service', () => {
  it('returns valid grounded response', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'What is the title of this node?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-1', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: {
          retrievalVersion: 'test',
          retrieval: { k_key: 30, k_sem: 30, rrf_k: 60, fused_top_k: 8, w_key: 0.7, w_sem: 0.3 },
          embedding: {
            baseUrl: 'https://example.com/v1',
            apiKey: 'k',
            model: 'm',
            dimensions: 3,
            timeoutMs: 5000,
          },
          chat: {
            baseUrl: 'https://example.com/v1',
            apiKey: 'k',
            model: 'm',
            timeoutMs: 5000,
          },
          pricing: {
            chat_prompt_per_1k: 0.001,
            chat_completion_per_1k: 0.002,
            embedding_per_1k: 0.0001,
          },
        },
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.topic_leakage_flag).toBe(false);
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].source_ref.asset_id).toBeDefined();
  });
});

