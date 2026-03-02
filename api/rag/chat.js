import { errorResponse } from '../lib/http/respond.js';
import { executeAskAI } from './lib/ask-service.js';
import { toRagError } from './lib/errors.js';

function extractQuestion(messages = []) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (item?.role === 'user' && item?.content) {
      return String(item.content);
    }
  }
  return '';
}

function mapCitations(evidence = []) {
  return evidence.map((item) => ({
    id: item.id,
    topic_path: item.topic_path,
    source_type: item.source_type,
    source_ref: item.source_ref,
    snippet: item.snippet,
    score: item.score,
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
    const body = req.body || {};
    const question = extractQuestion(body.messages);
    const payload = await executeAskAI(
      {
        query: question,
        syllabus_node_id: body.syllabus_node_id || body.topic_id || null,
        subject_code: body.subject_code || null,
        language: body.lang || 'en',
        internal_debug: Boolean(body.internal_debug),
      },
      { req },
    );

    return res.status(200).json({
      answer: payload.answer,
      citations: mapCitations(payload.evidence),
      uncertain: payload.uncertain,
      uncertain_reason_code: payload.uncertain_reason_code,
      topic_leakage_flag: payload.topic_leakage_flag,
      topic_leakage_reason: payload.topic_leakage_reason,
      retrieval_version: payload.retrieval_version,
      request_id: payload.request_id,
      usage: {
        cost_avg_usd_per_req: payload?.metrics?.cost_avg_usd_per_req ?? null,
      },
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

