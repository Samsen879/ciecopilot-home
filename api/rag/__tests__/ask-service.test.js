import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { askWithinLearningSession, executeAskAI } from '../lib/ask-service.js';

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

function createSupabaseRouteMapStub({
  rowsByTopicPath = {},
  defaultRows = [],
  boundaryData = null,
  nodeData = null,
} = {}) {
  const rpcCalls = [];
  const defaultNodeData = {
    node_id: 'node-1',
    topic_path: '9709.P1',
    syllabus_code: '9709',
    title: 'Pure Mathematics 1',
    description: 'Paper 1',
  };
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
                    data: boundaryData || nodeData || defaultNodeData,
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

function createDelayedFetchStub({ embeddingDelayMs = 5, chatDelayMs = 7 } = {}) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    if (String(url).includes('/embeddings')) {
      await new Promise((resolve) => setTimeout(resolve, embeddingDelayMs));
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
      await new Promise((resolve) => setTimeout(resolve, chatDelayMs));
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

function createLearningAskResult(overrides = {}) {
  return {
    answer: 'Start by rewriting the expression into a standard form.',
    uncertain: false,
    uncertain_reason_code: null,
    topic_leakage_flag: false,
    topic_leakage_reason: null,
    evidence: [],
    retrieval_version: 'test',
    metrics: {
      evidence_traceability_rate: 1,
      cost_avg_usd_per_req: 0,
      cost_audit: {
        request_cost_usd: 0,
      },
      retrieval_audit: {},
      route_audit: {
        retrieval_route: 's1_default',
      },
      retrieval_latency_ms: 1,
      llm_latency_ms: 1,
      latency_ms: 2,
    },
    request_id: 'rag-request-1',
    ...overrides,
  };
}

function createLearningSessionSupabaseStub({
  questionRow = null,
  workspaceRow = null,
  evidenceContext = null,
} = {}) {
  const selects = [];
  const rpcCalls = [];

  function buildSelectQuery(table) {
    const filters = [];
    return {
      eq(field, value) {
        filters.push({ field, value });
        return this;
      },
      async maybeSingle() {
        selects.push({ table, filters: [...filters] });

        if (table === 'learning_question_registry_projection') {
          return { data: questionRow, error: null };
        }

        if (table === 'learning_workspace_projection') {
          return { data: workspaceRow, error: null };
        }

        throw new Error(`Unexpected learning select table: ${table}`);
      },
    };
  }

  return {
    selects,
    rpcCalls,
    from(table) {
      return {
        select() {
          return buildSelectQuery(table);
        },
      };
    },
    async rpc(name, params) {
      rpcCalls.push({ name, params });

      if (name === 'get_evidence_context') {
        return { data: evidenceContext, error: null };
      }

      throw new Error(`Unexpected learning rpc: ${name}`);
    },
  };
}

function createConfig() {
  return {
    retrievalVersion: 'test',
    retrieval: {
      k_key: 30,
      k_sem: 30,
      rrf_k: 60,
      fused_top_k: 8,
      w_key: 0.7,
      w_sem: 0.3,
      corpusVersions: [],
      excludedSourceTypes: ['evidence_authored', 'evidence_transformed', 'evidence_reserved'],
      excludedCorpusVersions: [],
    },
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

function createSupabaseNoBoundaryLookupStub() {
  const rpcCalls = [];
  return {
    from() {
      throw new Error('boundary lookup should be skipped');
    },
    async rpc(name, params) {
      rpcCalls.push({ name, params });
      if (name !== 'hybrid_search_v2') throw new Error(`Unexpected rpc: ${name}`);
      return {
        data: [
          {
            id: 101,
            snippet: 'Integration revision chain',
            topic_path: '9709.P2.Integration',
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

function createProductionEvidenceRolloutGate({ rolloutState = 'online_enabled', subjectCodes = ['9702'] } = {}) {
  return {
    manifest_role: 'production_evidence_rollout_gate',
    evidence_layer: 'production_evidence',
    policy_mode: 'production_evidence',
    schema_version: 'v1',
    generated_at: '2026-03-13T10:30:00.000Z',
    default_retrieval_state: 'blocked',
    entries: [
      {
        bundle_id: 'phase_b_pilot_ready_v1',
        manifest_path: 'data/evidence/production/pilot_ready_v1/manifest.json',
        subject_scope: 'single_subject',
        subject_codes: subjectCodes,
        rollout_state: rolloutState,
        corpus_versions: ['rag_production_evidence_pilot_20260313'],
        allowed_source_types: ['evidence_authored', 'evidence_transformed'],
      },
    ],
  };
}

function loadCheckedInProductionEvidenceRolloutGate() {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'data/evidence/production/rollout_gate_v1.json'),
      'utf8',
    ),
  );
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
        allowInternalDebugBoundary: true,
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
    expect(result.metrics.retrieval_latency_ms).toBe(result.metrics.latency_ms);
    expect(result.metrics.llm_latency_ms).toBe(0);
    expectStableRetrievalAuditShape(result.metrics.retrieval_audit);
    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(result.metrics.route_audit.route_reason).toBe('short_circuit_query_intent');
    expectStableRouteAuditShape(result.metrics.route_audit);
    expect(result.metrics.evidence_traceability_rate).toBe(1);
    expect(result.metrics.cost_audit.usage.prompt_tokens).toBe(0);
    expect(result.metrics.cost_audit.usage.completion_tokens).toBe(0);
    expect(result.metrics.cost_audit.usage.embedding_tokens).toBe(0);
    expect(fetchStub.calls).toHaveLength(0);
  });

  it('surfaces stage latencies and token usage for chat-enabled retrieval flows', async () => {
    const fetchStub = createDelayedFetchStub();
    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-1-stage-latency', auth_user: null },
        supabase: createSupabaseStub(),
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
        allowInternalDebugBoundary: true,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.chat_mode).toBe('upstream_ok');
    expect(result.metrics.latency_ms).toBeGreaterThan(0);
    expect(result.metrics.retrieval_latency_ms).toBeGreaterThan(0);
    expect(result.metrics.llm_latency_ms).toBeGreaterThan(0);
    expect(result.metrics.latency_ms).toBeGreaterThanOrEqual(
      result.metrics.retrieval_latency_ms + result.metrics.llm_latency_ms,
    );
    expect(result.metrics.cost_audit.usage.prompt_tokens).toBe(20);
    expect(result.metrics.cost_audit.usage.completion_tokens).toBe(10);
    expect(result.metrics.cost_audit.usage.embedding_tokens).toBe(10);
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

  it('does not short-circuit cross-topic planning queries inside the same 9709 subject as out of scope', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      boundaryData: {
        node_id: 'node-m1',
        topic_path: '9709.M1.Momentum',
        syllabus_code: '9709',
        title: 'Momentum',
        description: '4.3 Momentum',
      },
      rowsByTopicPath: {
        '9709.M1.Momentum': [
          {
            id: 501,
            snippet: 'Momentum overview',
            topic_path: '9709.M1.Momentum',
            rank_sem: 1,
            rank_key: 1,
            score: 0.9,
          },
        ],
        '9709.M1': [
          {
            id: 502,
            snippet: 'Mechanics relationships',
            topic_path: '9709.M1',
            rank_sem: 1,
            rank_key: 1,
            score: 0.88,
          },
        ],
        '9709.P1': [
          {
            id: 503,
            snippet: 'Complex numbers live in Pure Mathematics 1',
            topic_path: '9709.P1',
            rank_sem: 1,
            rank_key: 1,
            score: 0.87,
          },
        ],
      },
    });
    const config = createConfig();
    config.s2.enabled = true;
    config.s2.readinessGuardEnabled = true;
    config.s2.readinessMaxTopicDepthBySubject = { '9709': 3 };
    const result = await executeAskAI(
      {
        query: 'Across chapters, compare "Momentum" with "Complex Numbers" and explain the cross-topic dependency chain for revision.',
        syllabus_node_id: 'node-m1',
      },
      {
        req: { request_id: 'req-4d', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.uncertain_reason_code).not.toBe('QUERY_OUT_OF_SCOPE');
    expect(result.metrics.retrieval_audit.short_circuit_label).toBeNull();
    expect(result.metrics.route_audit.retrieval_route).toBe('s2_augmentation');
    expect(supabase.__rpcCalls.length).toBeGreaterThanOrEqual(1);
    expect(fetchStub.calls.some((url) => String(url).includes('/embeddings'))).toBe(true);
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
        allowInternalDebugBoundary: true,
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

  it('excludes production evidence source types from s1 retrieval by default', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      defaultRows: [
        {
          id: 901,
          snippet: 'Pilot authored row',
          topic_path: '9709.P1',
          source_type: 'evidence_authored',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 1,
          rank_key: 1,
          score: 0.95,
        },
        {
          id: 902,
          snippet: 'Restricted official row',
          topic_path: '9709.P1',
          source_type: 'past_paper_pdf',
          corpus_version: 'rag_step3_9709_question_aware_v1',
          rank_sem: 2,
          rank_key: 2,
          score: 0.9,
        },
      ],
    });

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-filter-default', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.hybrid_row_count).toBe(1);
    expect(result.evidence.map((item) => item.source_type)).toEqual(['past_paper_pdf']);
  });

  it('allows production evidence retrieval rows only when rollout enforcement is explicitly disabled', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      defaultRows: [
        {
          id: 903,
          snippet: 'Pilot authored row',
          topic_path: '9709.P1',
          source_type: 'evidence_authored',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 1,
          rank_key: 1,
          score: 0.95,
        },
      ],
    });
    const config = createConfig();
    config.retrieval.excludedSourceTypes = [];
    config.retrieval.excludedCorpusVersions = [];
    config.retrieval.productionEvidenceRolloutEnabled = false;

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-1',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-filter-opt-in', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.hybrid_row_count).toBe(1);
    expect(result.evidence.map((item) => item.source_type)).toEqual(['evidence_authored']);
  });

  it('activates production evidence rollout for a matching subject with approved online bundle', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      nodeData: {
        node_id: 'node-9702',
        topic_path: '9702.P1',
        syllabus_code: '9702',
        title: 'Mechanics 1',
        description: 'Paper 1',
      },
      defaultRows: [
        {
          id: 904,
          snippet: 'Pilot authored row',
          topic_path: '9702.P1',
          source_type: 'evidence_authored',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 1,
          rank_key: 1,
          score: 0.95,
        },
        {
          id: 905,
          snippet: 'Pilot reserved row',
          topic_path: '9702.P1',
          source_type: 'evidence_reserved',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 2,
          rank_key: 2,
          score: 0.92,
        },
        {
          id: 906,
          snippet: 'Restricted official row',
          topic_path: '9702.P1',
          source_type: 'past_paper_pdf',
          corpus_version: 'rag_step3_9702_question_aware_v1',
          rank_sem: 3,
          rank_key: 3,
          score: 0.9,
        },
      ],
    });
    const config = createConfig();
    config.retrieval.corpusVersions = ['rag_step3_9702_question_aware_v1'];
    config.retrieval.productionEvidenceRolloutGate = loadCheckedInProductionEvidenceRolloutGate();

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-9702',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-rollout-online', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.hybrid_row_count).toBe(2);
    expect(result.evidence.map((item) => item.source_type)).toEqual([
      'evidence_authored',
      'past_paper_pdf',
    ]);
    expect(result.evidence.map((item) => item.source_type)).not.toContain('evidence_reserved');
    expect(supabase.__rpcCalls).toHaveLength(1);
    expect(supabase.__rpcCalls[0].params.p_corpus_versions).toEqual([
      'rag_step3_9702_question_aware_v1',
      'rag_production_evidence_pilot_20260313',
    ]);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_active).toBe(true);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_reason).toBe(
      'online_enabled_subject_match',
    );
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_bundle_ids).toEqual([
      'phase_b_pilot_ready_v1',
    ]);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_corpus_versions).toEqual([
      'rag_production_evidence_pilot_20260313',
    ]);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_source_types).toEqual([
      'evidence_authored',
      'evidence_transformed',
    ]);
  });

  it('keeps production evidence rollout blocked for non-target subject 9231 even when 9702 is promoted', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      nodeData: {
        node_id: 'node-9231',
        topic_path: '9231.P1',
        syllabus_code: '9231',
        title: 'Further Pure Mathematics 1',
        description: 'Paper 1',
      },
      defaultRows: [
        {
          id: 910,
          snippet: 'Pilot authored row',
          topic_path: '9231.P1',
          source_type: 'evidence_authored',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 1,
          rank_key: 1,
          score: 0.95,
        },
        {
          id: 911,
          snippet: 'Restricted official row',
          topic_path: '9231.P1',
          source_type: 'past_paper_pdf',
          corpus_version: 'rag_step3_9231_question_aware_v1',
          rank_sem: 2,
          rank_key: 2,
          score: 0.9,
        },
      ],
    });
    const config = createConfig();
    config.retrieval.corpusVersions = ['rag_step3_9231_question_aware_v1'];
    config.retrieval.productionEvidenceRolloutGate = loadCheckedInProductionEvidenceRolloutGate();

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-9231',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-rollout-control-9231', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.hybrid_row_count).toBe(1);
    expect(result.evidence.map((item) => item.source_type)).toEqual(['past_paper_pdf']);
    expect(supabase.__rpcCalls).toHaveLength(1);
    expect(supabase.__rpcCalls[0].params.p_corpus_versions).toEqual([
      'rag_step3_9231_question_aware_v1',
    ]);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_active).toBe(false);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_reason).toBe('no_subject_match');
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_bundle_ids).toEqual([]);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_corpus_versions).toEqual([]);
    expect(result.metrics.route_audit.route_scores.production_evidence_rollout_source_types).toEqual([]);
  });

  it('keeps production evidence rollout blocked when no baseline corpus allowlist is configured', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      nodeData: {
        node_id: 'node-9702-no-baseline',
        topic_path: '9702.P1',
        syllabus_code: '9702',
        title: 'Mechanics 1',
        description: 'Paper 1',
      },
      defaultRows: [
        {
          id: 906,
          snippet: 'Pilot authored row',
          topic_path: '9702.P1',
          source_type: 'evidence_authored',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 1,
          rank_key: 1,
          score: 0.95,
        },
        {
          id: 907,
          snippet: 'Restricted official row',
          topic_path: '9702.P1',
          source_type: 'past_paper_pdf',
          corpus_version: 'rag_step3_9702_question_aware_v1',
          rank_sem: 2,
          rank_key: 2,
          score: 0.9,
        },
      ],
    });
    const config = createConfig();
    config.retrieval.productionEvidenceRolloutGate = createProductionEvidenceRolloutGate();

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-9702-no-baseline',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-rollout-no-baseline', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.hybrid_row_count).toBe(1);
    expect(result.evidence.map((item) => item.source_type)).toEqual(['past_paper_pdf']);
    expect(supabase.__rpcCalls).toHaveLength(1);
    expect(supabase.__rpcCalls[0].params.p_corpus_versions).toBeNull();
  });

  it('keeps rollout-gated production evidence corpus versions out of the baseline allowlist until promotion', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      nodeData: {
        node_id: 'node-9702-offline-gate',
        topic_path: '9702.P1',
        syllabus_code: '9702',
        title: 'Mechanics 1',
        description: 'Paper 1',
      },
      defaultRows: [
        {
          id: 908,
          snippet: 'Pilot authored row',
          topic_path: '9702.P1',
          source_type: 'evidence_authored',
          corpus_version: 'rag_production_evidence_pilot_20260313',
          rank_sem: 1,
          rank_key: 1,
          score: 0.95,
        },
        {
          id: 909,
          snippet: 'Restricted official row',
          topic_path: '9702.P1',
          source_type: 'past_paper_pdf',
          corpus_version: 'rag_step3_9702_question_aware_v1',
          rank_sem: 2,
          rank_key: 2,
          score: 0.9,
        },
      ],
    });
    const config = createConfig();
    config.retrieval.corpusVersions = [
      'rag_step3_9702_question_aware_v1',
      'rag_production_evidence_pilot_20260313',
    ];
    config.retrieval.excludedSourceTypes = [];
    config.retrieval.excludedCorpusVersions = [];
    config.retrieval.productionEvidenceRolloutGate = createProductionEvidenceRolloutGate({
      rolloutState: 'offline_default',
    });

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-9702-offline-gate',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-rollout-offline-baseline', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.metrics.retrieval_audit.hybrid_row_count).toBe(1);
    expect(result.evidence.map((item) => item.source_type)).toEqual(['past_paper_pdf']);
    expect(supabase.__rpcCalls).toHaveLength(1);
    expect(supabase.__rpcCalls[0].params.p_corpus_versions).toEqual([
      'rag_step3_9702_question_aware_v1',
    ]);
  });

  it('passes promoted production evidence retrieval config into the s2 path for 9702 while keeping reserved rows blocked', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseRouteMapStub({
      nodeData: {
        node_id: 'node-9702-s2',
        topic_path: '9702.P1',
        syllabus_code: '9702',
        title: 'Mechanics 1',
        description: 'Paper 1',
      },
      defaultRows: [],
    });
    const config = createConfig();
    config.retrieval.corpusVersions = ['rag_step3_9702_question_aware_v1'];
    config.retrieval.productionEvidenceRolloutGate = loadCheckedInProductionEvidenceRolloutGate();
    config.s2.enabled = true;
    const s2Calls = [];

    const result = await executeAskAI(
      {
        query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
        syllabus_node_id: 'node-9702-s2',
      },
      {
        req: { request_id: 'req-6a-prod-evidence-rollout-s2-9702', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config,
        s2Retriever: async (payload) => {
          s2Calls.push(payload);
          const corpusVersions = payload?.retrievalConfig?.corpusVersions || [];
          const excludedSourceTypes = payload?.retrievalConfig?.excludedSourceTypes || [];
          const promoted =
            JSON.stringify(corpusVersions) ===
              JSON.stringify([
                'rag_step3_9702_question_aware_v1',
                'rag_production_evidence_pilot_20260313',
              ]) &&
            JSON.stringify(excludedSourceTypes) === JSON.stringify(['evidence_reserved']);
          return promoted
            ? {
              rows: [
                {
                  id: 912,
                  snippet: 'Pilot authored row from s2',
                  topic_path: '9702.P1',
                  source_type: 'evidence_authored',
                  corpus_version: 'rag_production_evidence_pilot_20260313',
                  rank_sem: 1,
                  rank_key: 1,
                  score: 0.95,
                },
              ],
              audit: {
                s2_hop_count: 1,
                s2_expanded_topic_count: 0,
              },
            }
            : {
              rows: [],
              audit: {
                s2_hop_count: 1,
                s2_expanded_topic_count: 0,
              },
            };
        },
      },
    );

    expect(s2Calls).toHaveLength(1);
    expect(s2Calls[0].retrievalConfig.corpusVersions).toEqual([
      'rag_step3_9702_question_aware_v1',
      'rag_production_evidence_pilot_20260313',
    ]);
    expect(s2Calls[0].retrievalConfig.excludedSourceTypes).toEqual(['evidence_reserved']);
    expect(result.metrics.route_audit.final_execution_route).toBe('s2_augmentation');
    expect(result.metrics.retrieval_audit.query_mode).toBe('s2_multi_hop');
    expect(result.evidence.map((item) => item.source_type)).toContain('evidence_authored');
  });

  it('uses internal boundary override without querying curriculum_nodes', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseNoBoundaryLookupStub();

    const result = await executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-integration',
        subject_code: '9709',
        current_topic_path: '9709.P2.Integration',
        boundary_title: 'Integration',
        boundary_description: '2.5 Integration',
        internal_debug: true,
      },
      {
        req: { request_id: 'req-6a-boundary-override', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
        allowInternalDebugBoundary: true,
      },
    );

    expect(result.uncertain).toBe(false);
    expect(result.evidence[0].topic_path).toBe('9709.P2.Integration');
    expect(result.metrics.retrieval_audit.query_mode).toBe('hybrid_rpc');
    expect(result.metrics.route_audit.retrieval_route).toBe('s1_default');
    expect(supabase.__rpcCalls).toHaveLength(1);
  });

  it('does not trust client-supplied internal_debug boundary without an explicit internal allowance', async () => {
    const fetchStub = createFetchStub();
    const supabase = createSupabaseNoBoundaryLookupStub();

    await expect(executeAskAI(
      {
        query: 'Explain this node using the available evidence.',
        syllabus_node_id: 'node-integration',
        subject_code: '9709',
        current_topic_path: '9709.P2.Integration',
        boundary_title: 'Integration',
        boundary_description: '2.5 Integration',
        internal_debug: true,
      },
      {
        req: { request_id: 'req-6a-public-boundary-override', auth_user: null },
        supabase,
        fetchImpl: fetchStub,
        logger: () => {},
        config: createConfig(),
      },
    )).rejects.toThrow('boundary lookup should be skipped');
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
    expect(supabase.__rpcCalls).toHaveLength(3);
  });
});

describe('askWithinLearningSession', () => {
  test('session ask consumes persisted active_scope_bundle instead of route-only scope', async () => {
    const supabase = createLearningSessionSupabaseStub({
      questionRow: {
        question_id: 'question-1',
        primary_question_type_id: '9709.trigonometry.identities',
        primary_question_type_title: 'Trigonometric identities',
        classification_confidence: 0.91,
        candidate_rubric_refs: [
          {
            kind: 'rubric_release',
            release_state: 'released',
          },
        ],
      },
      workspaceRow: {
        workspace_id: 'workspace-1',
        user_id: 'student-1',
        topic_id: 'topic-1',
        topic_path: '9709.trigonometry.identities',
        slot_state: {},
        linked_reference_summary: {},
        updated_at: '2026-03-21T13:30:00.000Z',
        slots: [],
      },
      evidenceContext: {
        mastery: {
          score: 0.62,
        },
        recent_decisions: [{ attempt_id: 'attempt-1' }],
        misconception_tags: [{ tag: 'sign_error' }],
        recent_errors: [],
      },
    });
    const executeAskAIStub = jest.fn().mockResolvedValue(createLearningAskResult({
      evidence: [{ id: 'evidence-1' }],
    }));

    const result = await askWithinLearningSession(
      {
        supabase,
        executeAskAI: executeAskAIStub,
      },
      {
        session: {
          session_id: 'session-1',
          user_id: 'student-1',
          subject_code: '9709',
          mode: 'guided_solve',
          active_scope_bundle: {
            primary_topic_id: 'topic-1',
            primary_topic_path: '9709.trigonometry.identities',
            secondary_topics_in_scope: [],
            allowed_prerequisites: [],
            paper_context: {
              paper_scope: '9709:paper:p1',
              paper_workspace_ref: {
                kind: 'paper_workspace',
                paper_workspace_id: 'paper-workspace-p1',
              },
              topic_section_ref: {
                kind: 'paper_workspace_topic_section',
                paper_workspace_topic_section_id: 'section-topic-1',
                topic_id: 'topic-1',
              },
            },
            current_anchor_kind: 'review_task',
            current_anchor_ref: {
              kind: 'review_task',
              review_task_id: 'review-task-1',
            },
            current_question_ref: {
              kind: 'question',
              question_id: 'question-1',
            },
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.trigonometry.identities',
            },
          },
        },
        message: 'next hint',
        clientTurnId: 'local-turn-001',
      },
    );

    expect(executeAskAIStub).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'next hint',
        subject_code: '9709',
        current_topic_path: '9709.trigonometry.identities',
        internal_debug: true,
      }),
      expect.objectContaining({
        supabase,
      }),
    );
    expect(executeAskAIStub.mock.calls[0][0].boundary_description).toContain(
      'paper_scope=9709:paper:p1',
    );
    expect(executeAskAIStub.mock.calls[0][0].boundary_description).toContain(
      'topic_section=section-topic-1',
    );
    expect(result.session_delta).toMatchObject({
      client_turn_id: 'local-turn-001',
      current_question_ref: {
        kind: 'question',
        question_id: 'question-1',
      },
    });
    expect(result.context_health).toMatchObject({
      status: 'healthy',
      authoritative_active_scope: true,
      handoff_required: false,
    });
    expect(result.topic_drift).toMatchObject({
      detected: false,
      reason_code: null,
    });
    expect(result.resume_validation).toMatchObject({
      valid: true,
      safe_continuation: true,
      validated_against: 'persisted_active_scope_bundle',
    });
    expect(result.evidence_summary).toMatchObject({
      source_topic_path: '9709.trigonometry.identities',
      retrieved_evidence_count: 1,
      workspace_id: 'workspace-1',
    });
  });

  test('question-type-only ask without released question metadata returns successful fallback posture, not an API error', async () => {
    const supabase = createLearningSessionSupabaseStub({
      workspaceRow: null,
      evidenceContext: null,
    });
    const executeAskAIStub = jest.fn().mockResolvedValue(createLearningAskResult({
      answer: 'I can still guide the method without authoritative scoring here.',
    }));

    const result = await askWithinLearningSession(
      {
        supabase,
        executeAskAI: executeAskAIStub,
      },
      {
        session: {
          session_id: 'session-2',
          user_id: 'student-1',
          subject_code: '9709',
          mode: 'spaced_review',
          active_scope_bundle: {
            primary_topic_id: 'topic-2',
            primary_topic_path: '9709.integration.application',
            secondary_topics_in_scope: [],
            allowed_prerequisites: [],
            paper_context: null,
            current_anchor_kind: 'workspace_slot',
            current_anchor_ref: {
              kind: 'workspace_slot',
              workspace_id: 'workspace-1',
              slot_key: 'review_queue',
            },
            current_question_ref: null,
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.integration.application',
            },
          },
        },
        message: 'mark this',
      },
    );

    expect(result.fallback_posture).toMatchObject({
      fallback_mode: 'non_released_fallback',
      authoritative_scoring_allowed: false,
      fallback_reason_code: 'non_pilot_question_type',
      classification_confidence: null,
      learning_signal_posture: 'conservative_fallback',
    });
    expect(result.session_delta.current_question_ref).toBeNull();
    expect(result.session_delta.current_question_type_ref).toEqual({
      kind: 'question_type',
      question_type_id: '9709.integration.application',
    });
  });

  test('session ask fails closed when client continuation context drifts from the persisted active scope', async () => {
    const supabase = createLearningSessionSupabaseStub({
      workspaceRow: null,
      evidenceContext: null,
    });
    const executeAskAIStub = jest.fn().mockResolvedValue(createLearningAskResult());

    await expect(askWithinLearningSession(
      {
        supabase,
        executeAskAI: executeAskAIStub,
      },
      {
        session: {
          session_id: 'session-3',
          user_id: 'student-1',
          subject_code: '9709',
          mode: 'spaced_review',
          active_scope_bundle: {
            primary_topic_id: 'topic-2',
            primary_topic_path: '9709.integration.application',
            secondary_topics_in_scope: [],
            allowed_prerequisites: [],
            paper_context: null,
            current_anchor_kind: 'workspace_slot',
            current_anchor_ref: {
              kind: 'workspace_slot',
              workspace_id: 'workspace-1',
              slot_key: 'review_queue',
            },
            current_question_ref: null,
            current_question_type_ref: {
              kind: 'question_type',
              question_type_id: '9709.integration.application',
            },
          },
        },
        message: 'continue',
        clientContext: {
          active_scope_bundle: {
            primary_topic_path: '9709.trigonometry.equations',
          },
        },
      },
    )).rejects.toMatchObject({
      code: 'session_state_conflict',
      status: 409,
      details: {
        reason_code: 'topic_drift_detected',
        topic_drift: {
          detected: true,
          reason_code: 'primary_topic_path_mismatch',
          stored_primary_topic_path: '9709.integration.application',
          requested_primary_topic_path: '9709.trigonometry.equations',
        },
        suggested_handoff: {
          should_handoff: true,
          handoff_kind: 'explicit_new_session',
        },
      },
    });
    expect(executeAskAIStub).not.toHaveBeenCalled();
  });
});
