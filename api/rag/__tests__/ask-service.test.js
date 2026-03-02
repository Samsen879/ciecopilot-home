import { executeAskAI } from '../lib/ask-service.js';

function createSupabaseStub() {
  const rpcCalls = [];
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
      rpcCalls.push({ name, params });
      if (name !== 'hybrid_search_v2') throw new Error(`Unexpected rpc: ${name}`);
      return {
        data: [
          {
            id: 101,
            snippet: 'Pure Mathematics 1 title',
            topic_path: '9709.P1',
            rank_sem: 1,
            rank_key: 1,
            score: 0.9,
          },
        ],
        error: null,
      };
    },
    __rpcCalls: rpcCalls,
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

function createConfig() {
  return {
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
  };
}

function createSupabaseRpcErrorStub() {
  const rpcCalls = [];
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
      rpcCalls.push({ name, params });
      return {
        data: null,
        error: {
          message: 'statement timeout',
          code: '57014',
        },
      };
    },
    __rpcCalls: rpcCalls,
  };
}

describe('ask service', () => {
  it('returns valid grounded response for concept lookup without calling embedding or chat', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'Which named concept or skill is this syllabus node about?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-1', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.topic_leakage_flag).toBe(false);
    expect(result.answer).toBe('Pure Mathematics 1');
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].source_ref.asset_id).toBeDefined();
    expect(result.metrics.retrieval_audit.query_mode).toBe('short_circuit');
    expect(result.metrics.retrieval_audit.short_circuit_label).toBe('concept_lookup');
    expect(result.metrics.retrieval_audit.rpc_call_count).toBe(0);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('returns node summary answer without calling embedding or chat', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'What mathematical focus does this syllabus node cover?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-2', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.answer).toContain('Pure Mathematics 1');
    expect(result.answer).toContain('Paper 1');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('returns insufficient evidence for worked-example probes without calling embedding or chat', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'Give a full worked example, including all intermediate steps and a final answer, for this syllabus node.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-3', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(true);
    expect(result.uncertain_reason_code).toBe('INSUFFICIENT_EVIDENCE');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('returns query out of scope for explicit out-of-scope probes without calling embedding or chat', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'Beyond the current syllabus node, does this node also teach matrices, complex numbers, or numerical methods?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-4', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(true);
    expect(result.uncertain_reason_code).toBe('QUERY_OUT_OF_SCOPE');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('returns conflicting evidence for explicit conflict probes without calling embedding or chat', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'Identify any conflicting interpretation or contradictory statement inside the evidence for this syllabus node. If there is conflict, say so.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-5', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(true);
    expect(result.uncertain_reason_code).toBe('CONFLICTING_EVIDENCE');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('uses a single hybrid rpc call for non-short-circuit requests', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
        internal_debug: true,
      },
      {
        req: { request_id: 'req-6', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.debug.retrieval.hybrid_row_count).toBe(1);
    expect(result.debug.retrieval.rpc_call_count).toBe(1);
    expect(result.debug.retrieval.dense_count).toBe(1);
    expect(result.debug.retrieval.lexical_count).toBe(1);
    expect(supabase.__rpcCalls).toHaveLength(1);
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc');
    expect(result.metrics.retrieval_audit.rpc_call_count).toBe(1);
    expect(result.metrics.retrieval_audit.error_code).toBeNull();
    expect(fetchStub.calls.filter((url) => String(url).includes('/embeddings'))).toHaveLength(1);
    expect(fetchStub.calls.filter((url) => String(url).includes('/chat/completions'))).toHaveLength(1);
  });

  it('surfaces hybrid rpc error diagnostics in retrieval audit', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRpcErrorStub();
    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-7', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(true);
    expect(result.uncertain_reason_code).toBe('RETRIEVER_ERROR');
    expect(result.metrics.retrieval_audit.error_stage).toBe('hybrid_rpc');
    expect(result.metrics.retrieval_audit.error_code).toBe('RAG_RETRIEVER_RPC_ERROR');
    expect(result.metrics.retrieval_audit.error_details.db_code).toBe('57014');
    expect(supabase.__rpcCalls).toHaveLength(1);
  });
});
