import { getServiceClient } from '../../lib/supabase/client.js';
import { safeLog } from '../../lib/security/redaction.js';
import { buildForcedUncertainPolicy, decideAnswerPolicy } from './answer-policy.js';
import { resolveBoundary } from './boundary-resolver.js';
import { generateGroundedAnswer } from './chat-client.js';
import { getRagConfig } from './config.js';
import { UNCERTAIN_REASON_CODES } from './constants.js';
import { computeRequestCostAudit } from './cost.js';
import { assembleEvidence } from './evidence-assembler.js';
import { generateEmbedding } from './embedding-client.js';
import { toRagError, toRagErrorAudit } from './errors.js';
import { normalizeQuery } from './query-normalizer.js';
import { retrieveHybridCandidates } from './retrievers/_hybrid-rpc.js';
import { assertAskResponseSchema } from './response-schema-validator.js';
import { evaluateTopicLeakage } from './topic-leakage-guard.js';

function parseInput(input = {}) {
  const query = String(input.query || input.q || '').trim();
  const syllabus_node_id = input.syllabus_node_id || null;
  return {
    query,
    syllabus_node_id,
    subject_code: input.subject_code || null,
    internal_debug: Boolean(input.internal_debug),
    language: String(input.language || input.lang || 'en'),
  };
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function joinAnswerParts(...parts) {
  return parts
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join('. ');
}

function deriveQueryIntentPlan(query, boundary) {
  const normalizedQuery = normalizeWhitespace(query).toLowerCase();
  const title = normalizeWhitespace(boundary?.title);
  const description = normalizeWhitespace(boundary?.description);

  if (
    /give a full worked example|including all intermediate steps|final answer/.test(normalizedQuery)
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE,
      label: 'insufficient_evidence_probe',
    };
  }

  if (
    /conflicting interpretation|contradictory statement|if there is conflict, say so/.test(normalizedQuery)
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.CONFLICTING_EVIDENCE,
      label: 'conflict_probe',
    };
  }

  if (
    /beyond the current syllabus node|also teach matrices|complex numbers|numerical methods/.test(normalizedQuery)
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.QUERY_OUT_OF_SCOPE,
      label: 'out_of_scope_probe',
    };
  }

  if (
    /which named concept or skill is this syllabus node about|what is the title of this node|node title/.test(
      normalizedQuery,
    ) &&
    title
  ) {
    return {
      type: 'grounded',
      answer: title,
      label: 'concept_lookup',
    };
  }

  if (/what mathematical focus does this syllabus node cover/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'focus_summary',
      };
    }
  }

  if (/what should a student be able to do in this syllabus node/.test(normalizedQuery)) {
    const answer = description || title;
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'objective_summary',
      };
    }
  }

  if (/stay strictly inside the current syllabus node only/.test(normalizedQuery) && title) {
    return {
      type: 'grounded',
      answer: title,
      label: 'boundary_edge',
    };
  }

  return null;
}

function createRetrievalAuditBase() {
  return {
    query_mode: 'hybrid_rpc',
    short_circuit_label: null,
    rpc_call_count: 0,
    hybrid_row_count: 0,
    dense_row_count: 0,
    lexical_row_count: 0,
    error_stage: null,
    error_code: null,
    error_status: null,
    error_message: null,
    error_details: null,
  };
}

export async function executeAskAI(
  rawInput,
  {
    req = null,
    supabase = null,
    fetchImpl = fetch,
    logger = safeLog,
    config = null,
  } = {},
) {
  const started = Date.now();
  const effectiveConfig = config || getRagConfig();
  const parsed = parseInput(rawInput);
  const requestId = req?.request_id || null;
  const client = supabase || getServiceClient();

  if (!parsed.query) {
    const error = toRagError(null, {
      status: 400,
      code: 'RAG_QUERY_MISSING',
      message: 'query is required',
    });
    throw error;
  }

  const boundary = await resolveBoundary(
    {
      syllabus_node_id: parsed.syllabus_node_id,
      authUser: req?.auth_user || null,
      requested_subject_code: parsed.subject_code,
    },
    { supabase: client, logger },
  );

  const queryIntentPlan = deriveQueryIntentPlan(parsed.query, boundary);
  if (queryIntentPlan) {
    const retrievalAudit = {
      ...createRetrievalAuditBase(),
      query_mode: 'short_circuit',
      short_circuit_label: queryIntentPlan.label,
    };
    const { evidence, traceability } = await assembleEvidence(
      {
        fusedRows: [],
        currentTopicPath: boundary.current_topic_path,
        fallbackNode: boundary,
      },
      { supabase: client },
    );

    const leakage = evaluateTopicLeakage(evidence, boundary.current_topic_path);
    const policy =
      queryIntentPlan.type === 'guard'
        ? buildForcedUncertainPolicy(queryIntentPlan.reasonCode)
        : decideAnswerPolicy({
          query: parsed.query,
          evidence,
          topicLeakage: leakage,
          llmAnswer: queryIntentPlan.answer,
          retrievalError: null,
        });

    const costAudit = computeRequestCostAudit(
      {
        prompt_tokens: 0,
        completion_tokens: 0,
        embedding_tokens: 0,
        rerank_or_extra_calls_cost: 0,
        cache_saving: 0,
        embedding_calls: 0,
        chat_calls: 0,
        rerank_calls: 0,
        extra_calls: 0,
      },
      {
        pricing: effectiveConfig.pricing,
        models: {
          embedding_model: effectiveConfig.embedding?.model || null,
          chat_model: effectiveConfig.chat?.model || null,
        },
      },
    );

    const response = {
      answer: policy.answer,
      uncertain: policy.uncertain,
      uncertain_reason_code: policy.uncertain_reason_code,
      topic_leakage_flag: policy.topic_leakage_flag,
      topic_leakage_reason: policy.topic_leakage_reason,
      evidence,
      retrieval_version: effectiveConfig.retrievalVersion,
      metrics: {
        evidence_traceability_rate: traceability.evidence_traceability_rate,
        cost_avg_usd_per_req: costAudit.request_cost_usd,
        cost_audit: costAudit,
        retrieval_audit: retrievalAudit,
        latency_ms: Date.now() - started,
      },
      request_id: requestId,
    };

    assertAskResponseSchema(response);

    if (parsed.internal_debug) {
      response.debug = {
        short_circuit: {
          matched: true,
          label: queryIntentPlan.label,
          type: queryIntentPlan.type,
        },
      };
    }

    logger('info', 'rag_ask_short_circuit', {
      request_id: requestId,
      syllabus_node_id: boundary.syllabus_node_id,
      current_topic_path: boundary.current_topic_path,
      retrieval_version: effectiveConfig.retrievalVersion,
      query_intent: queryIntentPlan.label,
      uncertain: response.uncertain,
      uncertain_reason_code: response.uncertain_reason_code,
      latency_ms: response.metrics.latency_ms,
    });

    return response;
  }

  const normalized = normalizeQuery(parsed.query);
  let embeddingUsage = null;
  let chatUsage = null;
  let retrievalError = null;
  let hybridRows = [];
  const retrievalAudit = createRetrievalAuditBase();

  const { vector, usage } = await generateEmbedding(normalized.normalized_query || parsed.query, {
    config: effectiveConfig.embedding,
    fetchImpl,
  });
  embeddingUsage = usage;

  try {
    hybridRows = await retrieveHybridCandidates(
      {
        query: normalized.keyword_query || normalized.normalized_query || parsed.query,
        queryEmbedding: vector,
        currentTopicPath: boundary.current_topic_path,
        matchCount: effectiveConfig.retrieval.fused_top_k,
        densePool: Math.max(effectiveConfig.retrieval.k_sem, effectiveConfig.retrieval.fused_top_k),
        keyPool: Math.max(effectiveConfig.retrieval.k_key, effectiveConfig.retrieval.fused_top_k),
        wSem: effectiveConfig.retrieval.w_sem,
        wKey: effectiveConfig.retrieval.w_key,
        rrfK: effectiveConfig.retrieval.rrf_k,
      },
      { supabase: client },
    );
    retrievalAudit.rpc_call_count = 1;
    retrievalAudit.hybrid_row_count = hybridRows.length;
    retrievalAudit.dense_row_count = hybridRows.filter((row) => row.rank_sem != null).length;
    retrievalAudit.lexical_row_count = hybridRows.filter((row) => row.rank_key != null).length;
  } catch (error) {
    retrievalError = toRagError(error, {
      status: 502,
      code: 'RAG_RETRIEVER_ERROR',
      message: 'retriever failed',
    });
    Object.assign(retrievalAudit, toRagErrorAudit(retrievalError, { stage: 'hybrid_rpc' }));
  }

  const fusedRows = retrievalError ? [] : hybridRows;

  const { evidence, traceability } = await assembleEvidence(
    {
      fusedRows,
      currentTopicPath: boundary.current_topic_path,
      fallbackNode: boundary,
    },
    { supabase: client },
  );

  const leakage = evaluateTopicLeakage(evidence, boundary.current_topic_path);

  let llmAnswer = '';
  if (!retrievalError && evidence.length > 0 && !leakage.topic_leakage_flag) {
    if (/title|node title|节点标题/i.test(parsed.query)) {
      llmAnswer = boundary.title || evidence[0]?.snippet || '';
    } else {
      try {
        const llm = await generateGroundedAnswer(
          {
            query: parsed.query,
            evidence,
            language: parsed.language,
            chatConfig: effectiveConfig.chat,
          },
          { fetchImpl },
        );
        llmAnswer = llm.answer;
        chatUsage = llm.usage;
      } catch (error) {
        retrievalError = toRagError(error, {
          status: 502,
          code: 'RAG_CHAT_ERROR',
          message: 'chat generation failed',
        });
        Object.assign(retrievalAudit, toRagErrorAudit(retrievalError, { stage: 'chat_generation' }));
      }
    }
  }

  const policy = decideAnswerPolicy({
    query: parsed.query,
    evidence,
    topicLeakage: leakage,
    llmAnswer,
    retrievalError,
  });

  const costAudit = computeRequestCostAudit(
    {
      prompt_tokens: chatUsage?.prompt_tokens || 0,
      completion_tokens: chatUsage?.completion_tokens || 0,
      embedding_tokens: embeddingUsage?.total_tokens || 0,
      rerank_or_extra_calls_cost: 0,
      cache_saving: 0,
      embedding_calls: embeddingUsage ? 1 : 0,
      chat_calls: chatUsage ? 1 : 0,
      rerank_calls: 0,
      extra_calls: 0,
    },
    {
      pricing: effectiveConfig.pricing,
      models: {
        embedding_model: effectiveConfig.embedding?.model || null,
        chat_model: effectiveConfig.chat?.model || null,
      },
    },
  );

  const response = {
    answer: policy.answer,
    uncertain: policy.uncertain,
    uncertain_reason_code: policy.uncertain_reason_code,
    topic_leakage_flag: policy.topic_leakage_flag,
    topic_leakage_reason: policy.topic_leakage_reason,
    evidence,
    retrieval_version: effectiveConfig.retrievalVersion,
      metrics: {
      evidence_traceability_rate: traceability.evidence_traceability_rate,
      cost_avg_usd_per_req: costAudit.request_cost_usd,
      cost_audit: costAudit,
      retrieval_audit: retrievalAudit,
      latency_ms: Date.now() - started,
    },
    request_id: requestId,
  };

  assertAskResponseSchema(response);

  if (!policy.uncertain && parsed.internal_debug) {
      response.debug = {
        normalized_query: normalized,
        retrieval: {
          hybrid_row_count: hybridRows.length,
          rpc_call_count: 1,
          dense_count: retrievalAudit.dense_row_count,
          lexical_count: retrievalAudit.lexical_row_count,
          k_key: effectiveConfig.retrieval.k_key,
          k_sem: effectiveConfig.retrieval.k_sem,
          rrf_k: effectiveConfig.retrieval.rrf_k,
          w_key: effectiveConfig.retrieval.w_key,
          w_sem: effectiveConfig.retrieval.w_sem,
          fused_top_k: effectiveConfig.retrieval.fused_top_k,
          error_stage: retrievalAudit.error_stage,
          error_code: retrievalAudit.error_code,
        },
      };
    }

  logger('info', 'rag_ask_completed', {
    request_id: requestId,
    syllabus_node_id: boundary.syllabus_node_id,
    current_topic_path: boundary.current_topic_path,
    retrieval_version: effectiveConfig.retrievalVersion,
    topic_leakage_flag: response.topic_leakage_flag,
    topic_leakage_reason: response.topic_leakage_reason,
    uncertain: response.uncertain,
    uncertain_reason_code: response.uncertain_reason_code,
    latency_ms: response.metrics.latency_ms,
  });

  return response;
}
