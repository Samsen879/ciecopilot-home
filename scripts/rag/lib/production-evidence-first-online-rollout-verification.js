import { executeAskAI } from '../../../api/rag/lib/ask-service.js';
import { resolveProductionEvidenceRetrievalRollout } from '../../../api/rag/lib/production-evidence-rollout.js';
import { validateProductionEvidenceRolloutGate } from './production-evidence-rollout-gate.js';

const TARGET_SUBJECT = '9702';
const CONTROL_SUBJECT = '9231';
const TARGET_BASELINE_CORPUS = 'rag_step3_9702_question_aware_v1';
const CONTROL_BASELINE_CORPUS = 'rag_step3_9231_question_aware_v1';
const PILOT_CORPUS = 'rag_production_evidence_pilot_20260313';
const PILOT_BUNDLE = 'phase_b_pilot_ready_v1';
const PRODUCTION_EVIDENCE_SOURCE_TYPES = Object.freeze([
  'evidence_authored',
  'evidence_transformed',
  'evidence_reserved',
]);

function toArray(values) {
  return Array.isArray(values) ? values : [];
}

function createSupabaseRouteMapStub({
  rowsByTopicPath = {},
  defaultRows = [],
  nodeData,
} = {}) {
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
                    data: nodeData,
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
    if (String(url).includes('/chat/completions')) {
      return {
        ok: true,
        async json() {
          return {
            choices: [{ message: { content: 'Grounded answer' } }],
            usage: { prompt_tokens: 20, completion_tokens: 10 },
          };
        },
      };
    }
    throw new Error(`Unexpected url: ${url}`);
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
      excludedSourceTypes: [...PRODUCTION_EVIDENCE_SOURCE_TYPES],
      excludedCorpusVersions: [],
      productionEvidenceRolloutEnabled: true,
      productionEvidenceRolloutRequireBaseCorpusVersions: true,
      productionEvidenceRolloutGate: null,
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

function buildResolutionSummary(result = {}) {
  return {
    active: Boolean(result.audit?.active),
    reason: result.audit?.reason || null,
    bundle_ids: toArray(result.audit?.online_bundle_ids),
    corpus_versions: toArray(result.corpusVersions),
    excluded_source_types: toArray(result.excludedSourceTypes),
    excluded_corpus_versions: toArray(result.excludedCorpusVersions),
  };
}

function buildRuntimeAuditExcerpt(result = {}) {
  return {
    route_scores: {
      production_evidence_rollout_active: result.metrics?.route_audit?.route_scores?.production_evidence_rollout_active === true,
      production_evidence_rollout_reason:
        result.metrics?.route_audit?.route_scores?.production_evidence_rollout_reason || null,
      production_evidence_rollout_bundle_ids: toArray(
        result.metrics?.route_audit?.route_scores?.production_evidence_rollout_bundle_ids,
      ),
      production_evidence_rollout_corpus_versions: toArray(
        result.metrics?.route_audit?.route_scores?.production_evidence_rollout_corpus_versions,
      ),
      production_evidence_rollout_source_types: toArray(
        result.metrics?.route_audit?.route_scores?.production_evidence_rollout_source_types,
      ),
    },
    final_execution_route: result.metrics?.route_audit?.final_execution_route || null,
    query_mode: result.metrics?.retrieval_audit?.query_mode || null,
  };
}

async function runS1Verification({ rolloutGate }) {
  const supabase = createSupabaseRouteMapStub({
    nodeData: {
      node_id: 'node-9702-s1',
      topic_path: '9702.P1',
      syllabus_code: TARGET_SUBJECT,
      title: 'Mechanics 1',
      description: 'Paper 1',
    },
    defaultRows: [
      {
        id: 904,
        snippet: 'Pilot authored row',
        topic_path: '9702.P1',
        source_type: 'evidence_authored',
        corpus_version: PILOT_CORPUS,
        rank_sem: 1,
        rank_key: 1,
        score: 0.95,
      },
      {
        id: 905,
        snippet: 'Pilot reserved row',
        topic_path: '9702.P1',
        source_type: 'evidence_reserved',
        corpus_version: PILOT_CORPUS,
        rank_sem: 2,
        rank_key: 2,
        score: 0.92,
      },
      {
        id: 906,
        snippet: 'Restricted official row',
        topic_path: '9702.P1',
        source_type: 'past_paper_pdf',
        corpus_version: TARGET_BASELINE_CORPUS,
        rank_sem: 3,
        rank_key: 3,
        score: 0.9,
      },
    ],
  });
  const config = createConfig();
  config.retrieval.corpusVersions = [TARGET_BASELINE_CORPUS];
  config.retrieval.productionEvidenceRolloutGate = rolloutGate;

  const result = await executeAskAI(
    {
      query: 'Explain this node using the available evidence.',
      syllabus_node_id: 'node-9702-s1',
    },
    {
      req: { request_id: 'rollout-verification-s1', auth_user: null },
      supabase,
      fetchImpl: createFetchStub(),
      logger: () => {},
      config,
    },
  );

  const evidenceSourceTypes = result.evidence.map((item) => item.source_type);
  const rpcCorpusVersions = toArray(supabase.__rpcCalls[0]?.params?.p_corpus_versions);
  const reservedBlocked = !evidenceSourceTypes.includes('evidence_reserved');
  const passed =
    result.uncertain === false
    && result.metrics?.retrieval_audit?.hybrid_row_count === 2
    && JSON.stringify(evidenceSourceTypes) === JSON.stringify(['evidence_authored', 'past_paper_pdf'])
    && JSON.stringify(rpcCorpusVersions) === JSON.stringify([TARGET_BASELINE_CORPUS, PILOT_CORPUS])
    && reservedBlocked;

  return {
    status: passed ? 'pass' : 'fail',
    evidence_source_types: evidenceSourceTypes,
    hybrid_row_count: result.metrics?.retrieval_audit?.hybrid_row_count ?? null,
    rpc_corpus_versions: rpcCorpusVersions,
    reserved_blocked: reservedBlocked,
  };
}

async function runS2Verification({ rolloutGate }) {
  const supabase = createSupabaseRouteMapStub({
    nodeData: {
      node_id: 'node-9702-s2',
      topic_path: '9702.P1',
      syllabus_code: TARGET_SUBJECT,
      title: 'Mechanics 1',
      description: 'Paper 1',
    },
    defaultRows: [],
  });
  const config = createConfig();
  config.retrieval.corpusVersions = [TARGET_BASELINE_CORPUS];
  config.retrieval.productionEvidenceRolloutGate = rolloutGate;
  config.s2.enabled = true;
  const s2Calls = [];

  const result = await executeAskAI(
    {
      query: 'Create a cross-topic study plan across chapters with prerequisite chain.',
      syllabus_node_id: 'node-9702-s2',
    },
    {
      req: { request_id: 'rollout-verification-s2', auth_user: null },
      supabase,
      fetchImpl: createFetchStub(),
      logger: () => {},
      config,
      s2Retriever: async (payload) => {
        s2Calls.push(payload);
        const corpusVersions = toArray(payload?.retrievalConfig?.corpusVersions);
        const excludedSourceTypes = toArray(payload?.retrievalConfig?.excludedSourceTypes);
        const promoted =
          JSON.stringify(corpusVersions) === JSON.stringify([TARGET_BASELINE_CORPUS, PILOT_CORPUS])
          && JSON.stringify(excludedSourceTypes) === JSON.stringify(['evidence_reserved']);

        return promoted
          ? {
            rows: [
              {
                id: 912,
                snippet: 'Pilot authored row from s2',
                topic_path: '9702.P1',
                source_type: 'evidence_authored',
                corpus_version: PILOT_CORPUS,
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

  const retrievalConfig = s2Calls[0]?.retrievalConfig || {};
  const evidenceSourceTypes = result.evidence.map((item) => item.source_type);
  const routeAuditExcerpt = buildRuntimeAuditExcerpt(result);
  const reservedBlocked = !toArray(retrievalConfig.excludedSourceTypes).includes('evidence_authored')
    && JSON.stringify(toArray(retrievalConfig.excludedSourceTypes)) === JSON.stringify(['evidence_reserved']);
  const passed =
    s2Calls.length === 1
    && JSON.stringify(toArray(retrievalConfig.corpusVersions)) === JSON.stringify([TARGET_BASELINE_CORPUS, PILOT_CORPUS])
    && JSON.stringify(toArray(retrievalConfig.excludedSourceTypes)) === JSON.stringify(['evidence_reserved'])
    && result.metrics?.route_audit?.final_execution_route === 's2_augmentation'
    && result.metrics?.retrieval_audit?.query_mode === 's2_multi_hop'
    && routeAuditExcerpt.route_scores.production_evidence_rollout_active === true
    && routeAuditExcerpt.route_scores.production_evidence_rollout_reason === 'online_enabled_subject_match'
    && JSON.stringify(routeAuditExcerpt.route_scores.production_evidence_rollout_bundle_ids) === JSON.stringify([PILOT_BUNDLE])
    && JSON.stringify(routeAuditExcerpt.route_scores.production_evidence_rollout_corpus_versions) === JSON.stringify([PILOT_CORPUS])
    && JSON.stringify(routeAuditExcerpt.route_scores.production_evidence_rollout_source_types)
      === JSON.stringify(['evidence_authored', 'evidence_transformed'])
    && evidenceSourceTypes.includes('evidence_authored');

  return {
    status: passed ? 'pass' : 'fail',
    retrieval_config: {
      corpus_versions: toArray(retrievalConfig.corpusVersions),
      excluded_source_types: toArray(retrievalConfig.excludedSourceTypes),
    },
    evidence_source_types: evidenceSourceTypes,
    final_execution_route: result.metrics?.route_audit?.final_execution_route || null,
    query_mode: result.metrics?.retrieval_audit?.query_mode || null,
    reserved_blocked: reservedBlocked,
    route_audit_excerpt: routeAuditExcerpt,
  };
}

async function runControlRuntimeVerification({ rolloutGate }) {
  const supabase = createSupabaseRouteMapStub({
    nodeData: {
      node_id: 'node-9231-control',
      topic_path: '9231.P1',
      syllabus_code: CONTROL_SUBJECT,
      title: 'Further Pure Mathematics 1',
      description: 'Paper 1',
    },
    defaultRows: [
      {
        id: 910,
        snippet: 'Pilot authored row',
        topic_path: '9231.P1',
        source_type: 'evidence_authored',
        corpus_version: PILOT_CORPUS,
        rank_sem: 1,
        rank_key: 1,
        score: 0.95,
      },
      {
        id: 911,
        snippet: 'Restricted official row',
        topic_path: '9231.P1',
        source_type: 'past_paper_pdf',
        corpus_version: CONTROL_BASELINE_CORPUS,
        rank_sem: 2,
        rank_key: 2,
        score: 0.9,
      },
    ],
  });
  const config = createConfig();
  config.retrieval.corpusVersions = [CONTROL_BASELINE_CORPUS];
  config.retrieval.productionEvidenceRolloutGate = rolloutGate;

  const result = await executeAskAI(
    {
      query: 'Explain this node using the available evidence.',
      syllabus_node_id: 'node-9231-control',
    },
    {
      req: { request_id: 'rollout-verification-control-9231', auth_user: null },
      supabase,
      fetchImpl: createFetchStub(),
      logger: () => {},
      config,
    },
  );

  const evidenceSourceTypes = result.evidence.map((item) => item.source_type);
  const rpcCorpusVersions = toArray(supabase.__rpcCalls[0]?.params?.p_corpus_versions);
  const routeAuditExcerpt = buildRuntimeAuditExcerpt(result);
  const passed =
    result.uncertain === false
    && result.metrics?.retrieval_audit?.hybrid_row_count === 1
    && JSON.stringify(evidenceSourceTypes) === JSON.stringify(['past_paper_pdf'])
    && JSON.stringify(rpcCorpusVersions) === JSON.stringify([CONTROL_BASELINE_CORPUS])
    && routeAuditExcerpt.route_scores.production_evidence_rollout_active === false
    && routeAuditExcerpt.route_scores.production_evidence_rollout_reason === 'no_subject_match'
    && JSON.stringify(routeAuditExcerpt.route_scores.production_evidence_rollout_bundle_ids) === JSON.stringify([])
    && JSON.stringify(routeAuditExcerpt.route_scores.production_evidence_rollout_corpus_versions) === JSON.stringify([])
    && JSON.stringify(routeAuditExcerpt.route_scores.production_evidence_rollout_source_types) === JSON.stringify([]);

  return {
    status: passed ? 'pass' : 'fail',
    evidence_source_types: evidenceSourceTypes,
    rpc_corpus_versions: rpcCorpusVersions,
    route_audit_excerpt: routeAuditExcerpt,
  };
}

export async function buildProductionEvidenceFirstOnlineRolloutVerification({
  rolloutGate = null,
  whitelist = null,
} = {}) {
  const gateValidation = validateProductionEvidenceRolloutGate({
    rolloutGate,
    whitelist,
  });

  const targetResolution = buildResolutionSummary(
    resolveProductionEvidenceRetrievalRollout({
      retrievalConfig: {
        corpusVersions: [TARGET_BASELINE_CORPUS],
        excludedSourceTypes: [],
        excludedCorpusVersions: [],
        productionEvidenceRolloutEnabled: true,
        productionEvidenceRolloutRequireBaseCorpusVersions: true,
        productionEvidenceRolloutGate: rolloutGate,
      },
      subjectCode: TARGET_SUBJECT,
    }),
  );

  const controlResolution = buildResolutionSummary(
    resolveProductionEvidenceRetrievalRollout({
      retrievalConfig: {
        corpusVersions: [CONTROL_BASELINE_CORPUS],
        excludedSourceTypes: [],
        excludedCorpusVersions: [],
        productionEvidenceRolloutEnabled: true,
        productionEvidenceRolloutRequireBaseCorpusVersions: true,
        productionEvidenceRolloutGate: rolloutGate,
      },
      subjectCode: CONTROL_SUBJECT,
    }),
  );

  const s1Verification = await runS1Verification({ rolloutGate });
  const s2Verification = await runS2Verification({ rolloutGate });
  const controlRuntimeVerification = await runControlRuntimeVerification({ rolloutGate });
  const targetPromoted =
    gateValidation.ok === true
    && JSON.stringify(gateValidation.summary?.online_bundle_ids || []) === JSON.stringify([PILOT_BUNDLE])
    && targetResolution.active === true
    && JSON.stringify(targetResolution.corpus_versions) === JSON.stringify([TARGET_BASELINE_CORPUS, PILOT_CORPUS]);
  const controlBlocked =
    controlResolution.active === false
    && JSON.stringify(controlResolution.corpus_versions) === JSON.stringify([CONTROL_BASELINE_CORPUS]);
  const evidenceReservedBlocked =
    JSON.stringify(targetResolution.excluded_source_types) === JSON.stringify(['evidence_reserved'])
    && s1Verification.reserved_blocked === true
    && s2Verification.reserved_blocked === true;
  const s1Passed = s1Verification.status === 'pass';
  const s2Passed = s2Verification.status === 'pass';
  const rollbackReady =
    gateValidation.ok === true
    && JSON.stringify(gateValidation.summary?.online_bundle_ids || []) === JSON.stringify([PILOT_BUNDLE]);
  const runtimeAuditContract = {
    source: 'route_audit.route_scores',
    promoted_path: {
      status: s2Verification.status === 'pass' ? 'pass' : 'fail',
      ...s2Verification.route_audit_excerpt,
    },
    control_path: {
      status: controlRuntimeVerification.status,
      ...controlRuntimeVerification.route_audit_excerpt,
    },
  };
  const runtimeAuditPassed =
    runtimeAuditContract.promoted_path.status === 'pass'
    && runtimeAuditContract.control_path.status === 'pass';

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_first_online_rollout_9702',
    target_subject: TARGET_SUBJECT,
    control_subject: CONTROL_SUBJECT,
    gate_validation: gateValidation,
    target_resolution: targetResolution,
    control_resolution: controlResolution,
    s1_verification: s1Verification,
    s2_verification: s2Verification,
    summary: {
      target_promoted: targetPromoted,
      control_blocked: controlBlocked,
      evidence_reserved_blocked: evidenceReservedBlocked,
      s1_passed: s1Passed,
      s2_passed: s2Passed,
      runtime_audit_contract_passed: runtimeAuditPassed,
      rollback_ready: rollbackReady,
    },
    runtime_audit_contract: runtimeAuditContract,
    rollback: {
      bundle_id: PILOT_BUNDLE,
      action: 'set rollout_state back to offline_default and rerun gate plus focused verification artifacts',
    },
    status:
      targetPromoted
      && controlBlocked
      && evidenceReservedBlocked
      && s1Passed
      && s2Passed
      && runtimeAuditPassed
      && rollbackReady
        ? 'pass'
        : 'fail',
  };
}

export function renderProductionEvidenceFirstOnlineRolloutVerificationReport(result = {}) {
  const lines = [
    '# Phase B First Online Rollout Verification',
    '',
    `- status: \`${result.status || 'unknown'}\``,
    `- target_subject: \`${result.target_subject || TARGET_SUBJECT}\``,
    `- control_subject: \`${result.control_subject || CONTROL_SUBJECT}\``,
    `- target_promoted: \`${Boolean(result.summary?.target_promoted)}\``,
    `- control_blocked: \`${Boolean(result.summary?.control_blocked)}\``,
    `- evidence_reserved_blocked: \`${Boolean(result.summary?.evidence_reserved_blocked)}\``,
    `- s1_passed: \`${Boolean(result.summary?.s1_passed)}\``,
    `- s2_passed: \`${Boolean(result.summary?.s2_passed)}\``,
    `- runtime_audit_contract_passed: \`${Boolean(result.summary?.runtime_audit_contract_passed)}\``,
    `- rollback_ready: \`${Boolean(result.summary?.rollback_ready)}\``,
    '',
    '## Gate Summary',
    '',
    `- online_bundle_ids: \`${toArray(result.gate_validation?.summary?.online_bundle_ids).join(', ') || 'none'}\``,
    `- online_subject_codes: \`${toArray(result.gate_validation?.summary?.online_subject_codes).join(', ') || 'none'}\``,
    `- online_corpus_versions: \`${toArray(result.gate_validation?.summary?.online_corpus_versions).join(', ') || 'none'}\``,
    '',
    '## S1 Verification',
    '',
    `- status: \`${result.s1_verification?.status || 'unknown'}\``,
    `- evidence_source_types: \`${toArray(result.s1_verification?.evidence_source_types).join(', ') || 'none'}\``,
    `- rpc_corpus_versions: \`${toArray(result.s1_verification?.rpc_corpus_versions).join(', ') || 'none'}\``,
    '',
    '## S2 Verification',
    '',
    `- status: \`${result.s2_verification?.status || 'unknown'}\``,
    `- evidence_source_types: \`${toArray(result.s2_verification?.evidence_source_types).join(', ') || 'none'}\``,
    `- retrieval_corpus_versions: \`${toArray(result.s2_verification?.retrieval_config?.corpus_versions).join(', ') || 'none'}\``,
    `- retrieval_excluded_source_types: \`${toArray(result.s2_verification?.retrieval_config?.excluded_source_types).join(', ') || 'none'}\``,
    '',
    '## Runtime Audit Contract',
    '',
    `- runtime_audit_contract.promoted_path: \`${result.runtime_audit_contract?.promoted_path?.status || 'unknown'}\``,
    `- runtime_audit_contract.control_path: \`${result.runtime_audit_contract?.control_path?.status || 'unknown'}\``,
    '',
    '## Rollback',
    '',
    `- ${result.rollback?.action || 'set rollout_state back to offline_default and rerun verification'}`,
  ];

  return `${lines.join('\n')}\n`;
}
