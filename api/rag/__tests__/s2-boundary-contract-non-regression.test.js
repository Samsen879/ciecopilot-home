import { executeAskAI } from '../lib/ask-service.js';
import {
  TOPIC_LEAKAGE_REASON_CODES,
  UNCERTAIN_REASON_CODES,
} from '../lib/constants.js';
import { validateAskResponseSchema } from '../lib/response-schema-validator.js';

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
      enabled: false,
      baseUrl: '',
      apiKey: null,
      model: 'm',
      timeoutMs: 5000,
    },
    s2: {
      enabled: true,
      routeKillSwitch: false,
      routeRulesOnly: true,
      llmClassifierEnabled: false,
      llmClassifierBaseUrl: '',
      llmClassifierApiKey: null,
      llmClassifierModel: 'm',
      llmClassifierTimeoutMs: 3000,
      timeoutMs: 8000,
      maxExpandedTopics: 6,
      routeClassifierModelPath: 'runs/backend/__missing_s2_route_classifier_model__.json',
    },
    pricing: {
      chat_prompt_per_1k: 0.001,
      chat_completion_per_1k: 0.002,
      embedding_per_1k: 0.0001,
    },
  };
}

function createFetchStub() {
  return async (url) => {
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
    throw new Error(`Unexpected url: ${url}`);
  };
}

function createSupabaseRouteMapStub({ rowsByTopicPath = {}, defaultRows = [] } = {}) {
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
      const topicPath = String(params?.p_topic_path || '');
      return {
        data: rowsByTopicPath[topicPath] || defaultRows,
        error: null,
      };
    },
  };
}

describe('s2 boundary and contract non-regression', () => {
  it('keeps schema valid when s2 route is executed', async () => {
    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 's2-reg-1', auth_user: null },
        supabase: createSupabaseRouteMapStub({
          defaultRows: [
            {
              id: 101,
              snippet: 'Pure Mathematics 1 title',
              topic_path: '9709.P1',
              rank_sem: 1,
              rank_key: 1,
              score: 0.9,
            },
          ],
        }),
        fetchImpl: createFetchStub(),
        logger: () => {},
        config: createConfig(),
      },
    );

    const contract = validateAskResponseSchema(result);
    expect(contract.valid).toBe(true);
    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.fallback_triggered).toBe(false);
  });

  it('keeps s2 execution when evidence stays inside the expanded topic allowlist', async () => {
    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 's2-reg-2', auth_user: null },
        supabase: createSupabaseRouteMapStub({
          rowsByTopicPath: {
            '9709.P1': [
              {
                id: 101,
                snippet: 'P1 scoped row',
                topic_path: '9709.P1',
                rank_sem: 1,
                rank_key: 1,
                score: 0.9,
              },
            ],
            '9709': [
              {
                id: 201,
                snippet: 'P2 expanded row',
                topic_path: '9709.P2',
                rank_sem: 1,
                rank_key: 1,
                score: 0.95,
              },
            ],
          },
        }),
        fetchImpl: createFetchStub(),
        logger: () => {},
        config: createConfig(),
      },
    );

    const contract = validateAskResponseSchema(result);
    expect(contract.valid).toBe(true);
    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.fallback_triggered).toBe(false);
    expect(result.metrics.route_audit.fallback_reason).toBeNull();
    expect(result.metrics.route_audit.route_scores.s2_allowed_topic_paths).toEqual(
      expect.arrayContaining(['9709.P1', '9709']),
    );
    expect(result.metrics.route_audit.route_scores.s2_leakage_evaluation_mode).toBe(
      'expanded_topic_allowlist',
    );
    expect(result.topic_leakage_flag).toBe(false);
  });

  it('still falls back to s1 when s2 evidence exits the expanded topic allowlist', async () => {
    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 's2-reg-3', auth_user: null },
        supabase: createSupabaseRouteMapStub({
          rowsByTopicPath: {
            '9709.P1': [
              {
                id: 101,
                snippet: 'P1 scoped row',
                topic_path: '9709.P1',
                rank_sem: 1,
                rank_key: 1,
                score: 0.9,
              },
            ],
            '9709': [
              {
                id: 301,
                snippet: 'Cross-subject leaked row',
                topic_path: '9702.P1',
                rank_sem: 1,
                rank_key: 1,
                score: 0.96,
              },
            ],
          },
        }),
        fetchImpl: createFetchStub(),
        logger: () => {},
        config: createConfig(),
      },
    );

    const contract = validateAskResponseSchema(result);
    expect(contract.valid).toBe(true);
    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_CONTRACT_INVALID');
    expect(result.metrics.retrieval_audit.error_details.s2_contract_violation).toBe(
      'topic_leakage_guard',
    );
    expect(result.metrics.retrieval_audit.error_details.s2_leaked_ids).toContain('301');
    expect(result.topic_leakage_flag).toBe(false);
  });

  it('keeps topic leakage and uncertain enum sets unchanged', () => {
    expect(Object.keys(TOPIC_LEAKAGE_REASON_CODES).sort()).toEqual([
      'APP_LAYER_BUG',
      'CLIENT_INJECTED_PATH',
      'DATA_BAD_TOPIC_PATH',
      'ROUTER_BUG',
      'RPC_BUG',
    ]);
    expect(Object.keys(UNCERTAIN_REASON_CODES).sort()).toEqual([
      'CONFLICTING_EVIDENCE',
      'INSUFFICIENT_EVIDENCE',
      'QUERY_OUT_OF_SCOPE',
      'RETRIEVER_ERROR',
      'TOPIC_LEAKAGE_BLOCKED',
    ]);
  });
});
