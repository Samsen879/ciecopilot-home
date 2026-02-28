import { errorResponse } from '../lib/http/respond.js';
import { executeAskAI } from './lib/ask-service.js';
import { toRagError } from './lib/errors.js';

function normalizeInput(body = {}) {
  return {
    query: body.q || body.query || '',
    syllabus_node_id: body.syllabus_node_id || body.topic_id || null,
    subject_code: body.subject_code || null,
    language: body.lang || 'en',
    internal_debug: Boolean(body.internal_debug),
  };
}

function mapItemsFromEvidence(evidence = []) {
  return evidence.map((item) => ({
    id: item.id,
    chunk_id: item.id,
    topic_path: item.topic_path,
    source_type: item.source_type,
    snippet: item.snippet,
    score: item.score,
    source_ref: item.source_ref,
    rank_key: item.rank_key,
    rank_sem: item.rank_sem,
    fused_rank: item.fused_rank,
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, {
      status: 405,
      code: 'method_not_allowed',
      message: 'Method not allowed.',
      request_id: req.request_id,
    });
  }

  try {
    const started = Date.now();
    const input = normalizeInput(req.body || {});
    const response = await executeAskAI(input, { req });
    const items = mapItemsFromEvidence(response.evidence);

    return res.status(200).json({
      query: input.query,
      syllabus_node_id: input.syllabus_node_id,
      total: items.length,
      items,
      elapsed_ms: Date.now() - started,
      topic_leakage_flag: response.topic_leakage_flag,
      topic_leakage_reason: response.topic_leakage_reason,
      uncertain: response.uncertain,
      uncertain_reason_code: response.uncertain_reason_code,
      retrieval_version: response.retrieval_version,
    });
  } catch (error) {
    const ragError = toRagError(error);
    return errorResponse(res, {
      status: ragError.status,
      code: ragError.code,
      message: ragError.message,
      request_id: req.request_id,
      details: ragError.details,
    });
  }
}

