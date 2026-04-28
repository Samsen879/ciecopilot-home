import { errorResponse } from '../lib/http/respond.js';
import { executeAskAI } from './lib/ask-service.js';
import { toRagError } from './lib/errors.js';
import { recordRagTelemetryFailure, recordRagTelemetrySuccess } from './lib/telemetry-recorder.js';

function normalizePublicAskInput(body = {}) {
  const {
    internal_debug: _internalDebug,
    current_topic_path: _currentTopicPath,
    boundary_title: _boundaryTitle,
    boundary_description: _boundaryDescription,
    ...safeBody
  } = body || {};
  return safeBody;
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

  const input = normalizePublicAskInput(req.body || {});

  try {
    const payload = await executeAskAI(input, { req });
    await recordRagTelemetrySuccess({
      req,
      endpoint: '/api/rag/ask',
      method: req.method,
      input,
      response: payload,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const ragError = toRagError(error);
    await recordRagTelemetryFailure({
      req,
      endpoint: '/api/rag/ask',
      method: req.method,
      input,
      ragError,
      partialResponse: null,
    });
    return errorResponse(res, {
      status: ragError.status,
      code: ragError.code,
      message: ragError.message,
      request_id: req.request_id,
      details: ragError.details,
    });
  }
}
