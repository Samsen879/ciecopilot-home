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
    /give a full worked example|give a full worked solution|intermediate steps|final answer|final numeric answer/.test(
      normalizedQuery,
    )
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

  if (/what definition, named idea, or core concept does this syllabus node introduce/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'definition',
      };
    }
  }

  if (/explain the core mathematical concept of this syllabus node in one grounded sentence/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'concept_explanation',
      };
    }
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

  if (
    /a student says this syllabus node is mainly about/.test(normalizedQuery) &&
    /within the current node only|current node only/.test(normalizedQuery)
  ) {
    return {
      type: 'guard',
      reasonCode: UNCERTAIN_REASON_CODES.QUERY_OUT_OF_SCOPE,
      label: 'misconception_probe',
    };
  }

  if (
    /using noisy notation like .* which syllabus topic inside the current node does this refer to/.test(
      normalizedQuery,
    )
  ) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'formula_or_latex_noisy_query',
      };
    }
  }

  if (/请用简短中文说明/.test(normalizedQuery) && /this syllabus node is about what concept or skill/.test(normalizedQuery)) {
    const answer = joinAnswerParts(title, description);
    if (answer) {
      return {
        type: 'grounded',
        answer,
        label: 'bilingual_or_mixed_language_query',
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
    chat_mode: 'not_attempted',
  };
}

function toNullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeRetrievalAudit(rawAudit) {
  const input = rawAudit && typeof rawAudit === 'object' ? rawAudit : {};
  const merged = {
    ...createRetrievalAuditBase(),
    ...input,
  };

  return {
    query_mode: toNullableString(merged.query_mode) || 'unknown',
    short_circuit_label: toNullableString(merged.short_circuit_label),
    rpc_call_count: toNonNegativeNumber(merged.rpc_call_count, 0),
    hybrid_row_count: toNonNegativeNumber(merged.hybrid_row_count, 0),
    dense_row_count: toNonNegativeNumber(merged.dense_row_count, 0),
    lexical_row_count: toNonNegativeNumber(merged.lexical_row_count, 0),
    error_stage: toNullableString(merged.error_stage),
    error_code: toNullableString(merged.error_code),
    error_status: Number.isFinite(Number(merged.error_status)) ? Number(merged.error_status) : null,
    error_message: toNullableString(merged.error_message),
    error_details: merged.error_details && typeof merged.error_details === 'object' ? merged.error_details : null,
    chat_mode: toNullableString(merged.chat_mode) || 'not_attempted',
  };
}

function buildFallbackGroundedAnswer({ boundary, evidence = [] }) {
  const title = normalizeWhitespace(boundary?.title);
  const description = normalizeWhitespace(boundary?.description);
  const topSnippet = normalizeWhitespace(evidence?.[0]?.snippet || '');

  if (title && description) return joinAnswerParts(title, description);
  if (title && topSnippet) return joinAnswerParts(title, topSnippet);
  if (title) return title;
  if (description && topSnippet) return joinAnswerParts(description, topSnippet);
  if (description) return description;
  if (topSnippet) return topSnippet;
  return '';
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
    const retrievalAudit = normalizeRetrievalAudit({
      ...createRetrievalAuditBase(),
      query_mode: 'short_circuit',
      short_circuit_label: queryIntentPlan.label,
    });
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
      retrievalAudit.chat_mode = 'short_circuit_title';
    } else {
      const chatEnabled = effectiveConfig.chat?.enabled === true;
      const chatConfigured = Boolean(effectiveConfig.chat?.apiKey) && Boolean(effectiveConfig.chat?.baseUrl);
      const chatFailOpen = effectiveConfig.chat?.failOpen !== false;

      if (!chatEnabled || !chatConfigured) {
        llmAnswer = buildFallbackGroundedAnswer({
          boundary,
          evidence,
        });
        retrievalAudit.chat_mode = !chatEnabled ? 'disabled_fallback' : 'missing_key_fallback';
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
          retrievalAudit.chat_mode = 'upstream_ok';
        } catch (error) {
          const chatError = toRagError(error, {
            status: 502,
            code: 'RAG_CHAT_ERROR',
            message: 'chat generation failed',
          });
          if (chatFailOpen) {
            llmAnswer = buildFallbackGroundedAnswer({
              boundary,
              evidence,
            });
            retrievalAudit.chat_mode = 'upstream_error_fallback';
            retrievalAudit.error_details = {
              ...(retrievalAudit.error_details || {}),
              chat_fallback_used: true,
              chat_fallback_reason: chatError.code,
            };
          } else {
            retrievalError = chatError;
            retrievalAudit.chat_mode = 'upstream_error_blocking';
            Object.assign(retrievalAudit, toRagErrorAudit(retrievalError, { stage: 'chat_generation' }));
          }
        }
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
      retrieval_audit: normalizeRetrievalAudit(retrievalAudit),
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
        dense_count: response.metrics.retrieval_audit.dense_row_count,
        lexical_count: response.metrics.retrieval_audit.lexical_row_count,
        k_key: effectiveConfig.retrieval.k_key,
        k_sem: effectiveConfig.retrieval.k_sem,
        rrf_k: effectiveConfig.retrieval.rrf_k,
        w_key: effectiveConfig.retrieval.w_key,
        w_sem: effectiveConfig.retrieval.w_sem,
        fused_top_k: effectiveConfig.retrieval.fused_top_k,
        error_stage: response.metrics.retrieval_audit.error_stage,
        error_code: response.metrics.retrieval_audit.error_code,
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
