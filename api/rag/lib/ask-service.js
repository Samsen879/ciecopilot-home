import { getServiceClient } from '../../lib/supabase/client.js';
import { safeLog } from '../../lib/security/redaction.js';
import { decideAnswerPolicy } from './answer-policy.js';
import { resolveBoundary } from './boundary-resolver.js';
import { generateGroundedAnswer } from './chat-client.js';
import { getRagConfig } from './config.js';
import { computeRequestCostAudit } from './cost.js';
import { assembleEvidence } from './evidence-assembler.js';
import { generateEmbedding } from './embedding-client.js';
import { toRagError } from './errors.js';
import { normalizeQuery } from './query-normalizer.js';
import { retrieveDenseCandidates } from './retrievers/dense-retriever.js';
import { retrieveLexicalCandidates } from './retrievers/lexical-retriever.js';
import { assertAskResponseSchema } from './response-schema-validator.js';
import { evaluateTopicLeakage } from './topic-leakage-guard.js';
import { fuseWeightedRrf } from './weighted-rrf.js';

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

  const normalized = normalizeQuery(parsed.query);
  let embeddingUsage = null;
  let chatUsage = null;
  let retrievalError = null;

  const { vector, usage } = await generateEmbedding(normalized.normalized_query || parsed.query, {
    config: effectiveConfig.embedding,
    fetchImpl,
  });
  embeddingUsage = usage;

  let denseRows = [];
  let lexicalRows = [];
  try {
    denseRows = await retrieveDenseCandidates(
      {
        query: normalized.keyword_query || normalized.normalized_query || parsed.query,
        queryEmbedding: vector,
        currentTopicPath: boundary.current_topic_path,
        k_sem: effectiveConfig.retrieval.k_sem,
        rrf_k: effectiveConfig.retrieval.rrf_k,
      },
      { supabase: client },
    );
    lexicalRows = await retrieveLexicalCandidates(
      {
        query: normalized.keyword_query || normalized.normalized_query || parsed.query,
        queryEmbedding: vector,
        currentTopicPath: boundary.current_topic_path,
        k_key: effectiveConfig.retrieval.k_key,
        rrf_k: effectiveConfig.retrieval.rrf_k,
      },
      { supabase: client },
    );
  } catch (error) {
    retrievalError = toRagError(error, {
      status: 502,
      code: 'RAG_RETRIEVER_ERROR',
      message: 'retriever failed',
    });
  }

  const fusedRows = retrievalError
    ? []
    : fuseWeightedRrf({
      denseRows,
      lexicalRows,
      w_sem: effectiveConfig.retrieval.w_sem,
      w_key: effectiveConfig.retrieval.w_key,
      rrf_k: effectiveConfig.retrieval.rrf_k,
      fused_top_k: effectiveConfig.retrieval.fused_top_k,
    });

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
    } else if (!effectiveConfig.chat?.apiKey) {
      retrievalError = toRagError(null, {
        status: 503,
        code: 'RAG_CHAT_DISABLED',
        message: 'chat generation is disabled because no chat API key is configured',
      });
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
      latency_ms: Date.now() - started,
    },
    request_id: requestId,
  };

  assertAskResponseSchema(response);

  if (!policy.uncertain && parsed.internal_debug) {
    response.debug = {
      normalized_query: normalized,
      retrieval: {
        dense_count: denseRows.length,
        lexical_count: lexicalRows.length,
        k_key: effectiveConfig.retrieval.k_key,
        k_sem: effectiveConfig.retrieval.k_sem,
        rrf_k: effectiveConfig.retrieval.rrf_k,
        w_key: effectiveConfig.retrieval.w_key,
        w_sem: effectiveConfig.retrieval.w_sem,
        fused_top_k: effectiveConfig.retrieval.fused_top_k,
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
