import { executeAskAI } from '../lib/ask-service.js';

const RETRIEVAL_AUDIT_KEYS = Object.freeze([
  'query_mode',
  'short_circuit_label',
  'rpc_call_count',
  'hybrid_row_count',
  'dense_row_count',
  'lexical_row_count',
  'error_stage',
  'error_code',
  'error_status',
  'error_message',
  'error_details',
  'chat_mode',
]);

const ROUTE_AUDIT_KEYS = Object.freeze([
  'retrieval_route',
  'route_reason',
  'route_stage',
  'route_scores',
  'final_execution_route',
  'fallback_triggered',
  'fallback_reason',
  's2_hop_count',
  's2_expanded_topic_count',
  'llm_classifier_used',
  'llm_classifier_status',
]);

function expectStableRetrievalAuditShape(audit) {
  expect(audit).toBeTruthy();
  for (const key of RETRIEVAL_AUDIT_KEYS) {
    expect(Object.hasOwn(audit, key)).toBe(true);
  }
  expect(typeof audit.query_mode).toBe('string');
  expect(typeof audit.rpc_call_count).toBe('number');
  expect(typeof audit.hybrid_row_count).toBe('number');
  expect(typeof audit.dense_row_count).toBe('number');
  expect(typeof audit.lexical_row_count).toBe('number');
  expect(audit.error_status === null || typeof audit.error_status === 'number').toBe(true);
  expect(audit.error_details === null || typeof audit.error_details === 'object').toBe(true);
  expect(typeof audit.chat_mode).toBe('string');
}

function expectStableRouteAuditShape(audit) {
  expect(audit).toBeTruthy();
  for (const key of ROUTE_AUDIT_KEYS) {
    expect(Object.hasOwn(audit, key)).toBe(true);
  }
  expect(typeof audit.retrieval_route).toBe('string');
  expect(typeof audit.route_stage).toBe('string');
  expect(audit.route_reason === null || typeof audit.route_reason === 'string').toBe(true);
  expect(audit.route_scores === null || typeof audit.route_scores === 'object').toBe(true);
  expect(typeof audit.final_execution_route).toBe('string');
  expect(typeof audit.fallback_triggered).toBe('boolean');
  expect(audit.fallback_reason === null || typeof audit.fallback_reason === 'string').toBe(true);
  expect(typeof audit.s2_hop_count).toBe('number');
  expect(typeof audit.s2_expanded_topic_count).toBe('number');
  expect(typeof audit.llm_classifier_used).toBe('boolean');
  expect(audit.llm_classifier_status === null || typeof audit.llm_classifier_status === 'string').toBe(true);
}

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

function createSupabaseRouteMapStub({ rowsByTopicPath = {}, defaultRows = [] } = {}) {
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
      const topicPath = String(params?.p_topic_path || '');
      const rows = rowsByTopicPath[topicPath] || defaultRows;
      return {
        data: rows,
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
      enabled: true,
      baseUrl: 'https://example.com/v1',
      apiKey: 'k',
      model: 'm',
      timeoutMs: 5000,
    },
    s2: {
      enabled: false,
      routeKillSwitch: false,
      routeRulesOnly: false,
      llmClassifierEnabled: false,
      llmClassifierBaseUrl: '',
      llmClassifierApiKey: null,
      llmClassifierModel: 'm',
      llmClassifierTimeoutMs: 4000,
      timeoutMs: 8000,
      maxExpandedTopics: 6,
      readinessGuardEnabled: false,
      readinessSummaryPath: 'runs/backend/rag_corpus_source_coverage_summary.json',
      readinessProfilePath: 'runs/backend/rag_s2_readiness_profile.json',
      readinessMaxTopicDepth: 1,
      readinessMaxTopicDepthBySubject: {},
      readinessSubjectAllowlist: [],
      readinessEnforceSummaryCoverage: false,
      routeClassifierModelPath: 'runs/backend/__missing_s2_route_classifier_model__.json',
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
    expectStableRetrievalAuditShape(result.metrics.retrieval_audit);
    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_reason).toBe('short_circuit_query_intent');
    expectStableRouteAuditShape(result.metrics.route_audit);
    expect(result.metrics.evidence_traceability_rate).toBe(1);
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

  it('short-circuits S1.2 definition and concept explanation queries', async () => {
    const fetchStub = createFetchStub();

    const definition = await executeAskAI(
      {
        query: 'What definition, named idea, or core concept does this syllabus node introduce?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-2a', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    const explanation = await executeAskAI(
      {
        query: 'Explain the core mathematical concept of this syllabus node in one grounded sentence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-2b', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(definition.uncertain).toBe(false);
    expect(definition.metrics.retrieval_audit.short_circuit_label).toBe('definition');
    expect(explanation.uncertain).toBe(false);
    expect(explanation.metrics.retrieval_audit.short_circuit_label).toBe('concept_explanation');
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('returns insufficient evidence for worked-example probes without calling embedding or chat', async () => {
    const fetchStub = createFetchStub();
    const result = await executeAskAI(
      {
        query: 'Give a full worked solution, with all intermediate steps and a final numeric answer, for the syllabus node "Pure Mathematics 1".',
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

  it('short-circuits S1.2 misconception, formula-noisy, and bilingual queries', async () => {
    const fetchStub = createFetchStub();

    const misconception = await executeAskAI(
      {
        query:
          'A student says this syllabus node is mainly about matrices. Within the current node only, can you confirm that claim?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-4a', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    const formula = await executeAskAI(
      {
        query:
          'Using noisy notation like d/dx, which syllabus topic inside the current node does this refer to? Keep the answer grounded to this node only.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-4b', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    const bilingual = await executeAskAI(
      {
        query: '请用简短中文说明 this syllabus node is about what concept or skill, and stay inside the current node.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-4c', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(misconception.uncertain).toBe(true);
    expect(misconception.uncertain_reason_code).toBe('QUERY_OUT_OF_SCOPE');
    expect(misconception.metrics.retrieval_audit.short_circuit_label).toBe('misconception_probe');
    expect(formula.uncertain).toBe(false);
    expect(formula.metrics.retrieval_audit.short_circuit_label).toBe('formula_or_latex_noisy_query');
    expect(bilingual.uncertain).toBe(false);
    expect(bilingual.metrics.retrieval_audit.short_circuit_label).toBe('bilingual_or_mixed_language_query');
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
    expectStableRetrievalAuditShape(result.metrics.retrieval_audit);
    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_reason).toBe('s2_disabled');
    expect(result.metrics.route_audit.route_stage).toBe('default_safe');
    expectStableRouteAuditShape(result.metrics.route_audit);
    expect(result.metrics.evidence_traceability_rate).toBe(1);
    expect(fetchStub.calls.filter((url) => String(url).includes('/embeddings'))).toHaveLength(1);
    expect(fetchStub.calls.filter((url) => String(url).includes('/chat/completions'))).toHaveLength(1);
  });

  it('passes retrieval corpus version allowlist to s1 hybrid rpc', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.retrieval.corpusVersions = ['rag_step3_9709_question_aware_v1'];

    await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6a-corpus-version-s1', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(supabase.__rpcCalls).toHaveLength(1);
    expect(supabase.__rpcCalls[0].params.p_corpus_versions).toEqual([
      'rag_step3_9709_question_aware_v1',
    ]);
  });

  it('records rules-based s2 route eligibility audit when s2 is enabled', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6b', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.route_stage).toBe('rules');
    expect(result.metrics.route_audit.route_reason).toBe('rules_positive_signal');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.retrieval_audit.query_mode).toBe('s2_multi_hop');
    expect(result.metrics.route_audit.s2_hop_count).toBeGreaterThanOrEqual(1);
    expect(result.metrics.route_audit.route_scores.rules_version).toBe('s2_route_rules_v1');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('downgrades s2 route to s1 when readiness guard blocks execution', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.readinessGuardEnabled = true;
    config.s2.readinessMaxTopicDepth = 1;
    config.s2.readinessSummaryPath = 'runs/backend/rag_corpus_source_coverage_summary.json';
    config.s2.readinessProfilePath = 'runs/backend/__missing_s2_readiness_profile__.json';

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6b-guard', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_stage).toBe('readiness_guard');
    expect(result.metrics.route_audit.route_reason).toBe('s2_readiness_guard_default_s1');
    expect(result.metrics.route_audit.fallback_triggered).toBe(false);
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc');
    expect(result.metrics.route_audit.route_scores.readiness_guard_enabled).toBe(true);
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('uses subject-specific readiness depth override to keep eligible s2 traffic', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.readinessGuardEnabled = true;
    config.s2.readinessMaxTopicDepth = 1;
    config.s2.readinessMaxTopicDepthBySubject = {
      '9709': 2,
    };

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6b-guard-depth-override', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.route_scores.readiness_effective_depth_source).toBe('config_subject_override');
    expect(result.metrics.route_audit.route_scores.readiness_guard_reason).toBe('readiness_guard_ok');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('blocks subject outside readiness allowlist before s2 execution', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.readinessGuardEnabled = true;
    config.s2.readinessMaxTopicDepth = 3;
    config.s2.readinessSubjectAllowlist = ['9231'];

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6b-guard-allowlist', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_stage).toBe('readiness_guard');
    expect(result.metrics.route_audit.route_reason).toBe('s2_readiness_guard_default_s1');
    expect(result.metrics.route_audit.route_scores.readiness_guard_reason).toBe('subject_not_covered');
    expect(result.metrics.route_audit.route_scores.readiness_subject_coverage_source).toBe('config_allowlist');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('uses compact grounded fallback answer for successful s2 execution when chat is disabled', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.chat.enabled = false;
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6b-compact', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.retrieval_audit.chat_mode).toBe('disabled_fallback');
    expect(result.answer).toBe('Pure Mathematics 1. 9709.P1');
  });

  it('uses local classifier on rules-ambiguous query when s2 is enabled', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.routeClassifierModel = {
      model_version: 'test_local_nb_v1',
      prior_log_odds: 0.1,
      thresholds: {
        s2_min_prob: 0.7,
        s1_max_prob: 0.35,
      },
      token_log_odds: {
        explain: 1.4,
        concept: 1.2,
        briefly: 0.9,
      },
    };

    const result = await executeAskAI(
      {
        query: 'Can you explain this concept briefly?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6c', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.route_stage).toBe('local_classifier');
    expect(result.metrics.route_audit.route_reason).toBe('local_classifier_positive');
    expect(result.metrics.route_audit.route_scores.model_version).toBe('test_local_nb_v1');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.retrieval_audit.query_mode).toBe('s2_multi_hop');
    expect(result.metrics.route_audit.s2_hop_count).toBeGreaterThanOrEqual(1);
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('keeps s1 default when rules are ambiguous and local classifier is unavailable', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseStub();
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Can you explain this concept briefly?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6d', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_stage).toBe('default_safe');
    expect(result.metrics.route_audit.route_reason).toBe('rules_ambiguous_local_unavailable_default_s1');
    expect(result.metrics.route_audit.route_scores.local_classifier_available).toBe(false);
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('uses llm classifier fallback when local classifier is unavailable and llm classifier is enabled', async () => {
    const fetchStub = async (url) => {
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
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      retrieval_route: 's2_augmentation',
                      confidence: 0.86,
                      reason: 'cross topic inferred',
                    }),
                  },
                },
              ],
            };
          },
        };
      }
      throw new Error(`Unexpected url: ${url}`);
    };

    const supabase = createSupabaseStub();
    const config = createConfig();
    config.chat.enabled = false;
    config.s2.enabled = true;
    config.s2.llmClassifierEnabled = true;
    config.s2.llmClassifierBaseUrl = 'https://example.com/v1';
    config.s2.llmClassifierApiKey = 'k';
    config.s2.llmClassifierModel = 'm';
    config.s2.routeClassifierModelPath = 'runs/backend/__missing_s2_route_classifier_model__.json';

    const result = await executeAskAI(
      {
        query: 'Can you explain this concept briefly?',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6e', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.route_stage).toBe('llm_classifier');
    expect(result.metrics.route_audit.route_reason).toBe('llm_classifier_positive');
    expect(result.metrics.route_audit.llm_classifier_used).toBe(true);
    expect(result.metrics.route_audit.llm_classifier_status).toBe('upstream_ok');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.retrieval_audit.query_mode).toBe('s2_multi_hop');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('falls back to s1 with S2_EMPTY_EVIDENCE when s2 retrieval returns no rows', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      rowsByTopicPath: {
        '9709.P1': [],
        '9709': [],
      },
      defaultRows: [],
    });
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6f', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_EMPTY_EVIDENCE');
    expect(result.metrics.route_audit.s2_expanded_topic_count).toBeGreaterThanOrEqual(1);
    expect(result.metrics.route_audit.route_scores.s2_empty_evidence_reason).toBe('seed_empty_and_expansion_empty');
    expect(result.metrics.route_audit.route_scores.s2_hop_0_row_count).toBe(0);
    expect(result.metrics.route_audit.route_scores.s2_hop_1_row_count).toBe(0);
    expect(result.metrics.route_audit.route_scores.s2_merged_row_count).toBe(0);
    expect(result.metrics.route_audit.route_scores.s2_expanded_topic_paths).toEqual(expect.arrayContaining(['9709']));
    expect(result.metrics.retrieval_audit.error_details.s2_empty_evidence_reason).toBe('seed_empty_and_expansion_empty');
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc_s2_fallback');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('keeps s2 execution when evidence stays within expanded topic allowlist', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      rowsByTopicPath: {
        '9709.P1': [
          {
            id: 101,
            snippet: 'Within P1',
            topic_path: '9709.P1',
            rank_sem: 1,
            rank_key: 1,
            score: 0.9,
          },
        ],
        '9709': [
          {
            id: 201,
            snippet: 'Outside P1 boundary',
            topic_path: '9709.P2',
            rank_sem: 1,
            rank_key: 1,
            score: 0.95,
          },
        ],
      },
      defaultRows: [],
    });
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6g', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.fallback_triggered).toBe(false);
    expect(result.metrics.route_audit.fallback_reason).toBeNull();
    expect(result.metrics.route_audit.s2_hop_count).toBeGreaterThanOrEqual(1);
    expect(result.metrics.route_audit.route_scores.s2_allowed_topic_paths).toEqual(
      expect.arrayContaining(['9709.P1', '9709']),
    );
    expect(result.metrics.route_audit.route_scores.s2_leakage_evaluation_mode).toBe(
      'expanded_topic_allowlist',
    );
    expect(result.topic_leakage_flag).toBe(false);
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('passes retrieval corpus version allowlist to every s2 hop rpc call', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      rowsByTopicPath: {
        '9709.P1': [
          {
            id: 101,
            snippet: 'Within P1',
            topic_path: '9709.P1',
            rank_sem: 1,
            rank_key: 1,
            score: 0.9,
          },
        ],
        '9709': [
          {
            id: 201,
            snippet: 'Expanded root support',
            topic_path: '9709.P2',
            rank_sem: 1,
            rank_key: 1,
            score: 0.95,
          },
        ],
      },
      defaultRows: [],
    });
    const config = createConfig();
    config.s2.enabled = true;
    config.retrieval.corpusVersions = ['rag_step3_9709_question_aware_v1'];

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6g-corpus-version-s2', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(supabase.__rpcCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of supabase.__rpcCalls) {
      expect(call.params.p_corpus_versions).toEqual(['rag_step3_9709_question_aware_v1']);
    }
  });

  it('falls back to s1 with S2_CONTRACT_INVALID when s2 evidence escapes expanded topic allowlist', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      rowsByTopicPath: {
        '9709.P1': [
          {
            id: 101,
            snippet: 'Within P1',
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
      defaultRows: [],
    });
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6g-allowlist-block', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_CONTRACT_INVALID');
    expect(result.metrics.route_audit.route_scores.s2_allowed_topic_paths).toEqual(
      expect.arrayContaining(['9709.P1', '9709']),
    );
    expect(result.metrics.retrieval_audit.error_details.s2_contract_violation).toBe(
      'topic_leakage_guard',
    );
    expect(result.metrics.retrieval_audit.error_details.s2_leaked_ids).toContain('301');
    expect(result.topic_leakage_flag).toBe(false);
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('logs final execution route for s2 fallbacks in completion event', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      rowsByTopicPath: {
        '9709.P1': [
          {
            id: 101,
            snippet: 'Within P1',
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
      defaultRows: [],
    });
    const config = createConfig();
    config.s2.enabled = true;
    const logs = [];
    const logger = (...args) => logs.push(args);

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6g-log-final-route', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger,
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    const completionEvent = logs.find((entry) => entry[1] === 'rag_ask_completed');
    expect(completionEvent).toBeTruthy();
    expect(completionEvent[2].retrieval_route).toBe('s2_augmentation');
    expect(completionEvent[2].final_execution_route).toBe('s1_default');
  });

  it('records route kill switch as explicit fallback reason while keeping s1 execution', async () => {
    const fetchStub = createFetchStub();
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.routeKillSwitch = true;

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6h', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_reason).toBe('s2_route_kill_switch');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_ROUTE_KILL_SWITCH');
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('falls back with S2_TIMEOUT when s2 execution exceeds timeout budget', async () => {
    const fetchStub = createFetchStub();
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.timeoutMs = 5;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6i', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config,
        s2Retriever: async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                rows: [{ id: 301, topic_path: '9709.P1', snippet: 'slow', score: 0.9 }],
                audit: { s2_hop_count: 1, s2_expanded_topic_count: 0 },
              });
            }, 30);
          }),
      },
    );

    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_TIMEOUT');
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc_s2_fallback');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('falls back with S2_INFRA_ERROR when s2 retriever throws infra error', async () => {
    const fetchStub = createFetchStub();
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6j', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config,
        s2Retriever: async () => {
          throw new Error('infra down');
        },
      },
    );

    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_INFRA_ERROR');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc_s2_fallback');
    expectStableRouteAuditShape(result.metrics.route_audit);
  });

  it('falls back with S2_MODEL_UNAVAILABLE when s2 retriever reports model unavailable', async () => {
    const fetchStub = createFetchStub();
    const config = createConfig();
    config.s2.enabled = true;

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6k', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config,
        s2Retriever: async () => {
          const error = new Error('model unavailable');
          error.code = 'S2_MODEL_UNAVAILABLE';
          throw error;
        },
      },
    );

    expect(result.metrics.route_audit.fallback_triggered).toBe(true);
    expect(result.metrics.route_audit.fallback_reason).toBe('S2_MODEL_UNAVAILABLE');
    expect(result.metrics.route_audit.final_execution_route).toBe('s1_default');
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc_s2_fallback');
    expectStableRouteAuditShape(result.metrics.route_audit);
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
    expectStableRetrievalAuditShape(result.metrics.retrieval_audit);
    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expectStableRouteAuditShape(result.metrics.route_audit);
    expect(typeof result.metrics.evidence_traceability_rate).toBe('number');
    expect(result.topic_leakage_flag).toBe(false);
    expect(result.topic_leakage_reason).toBeNull();
    expect(supabase.__rpcCalls).toHaveLength(1);
  });
});
