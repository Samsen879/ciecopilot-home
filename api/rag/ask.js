import { errorResponse } from '../lib/http/respond.js';
import { executeAskAI } from './lib/ask-service.js';
import { toRagError } from './lib/errors.js';
import { recordRagTelemetryFailure, recordRagTelemetrySuccess } from './lib/telemetry-recorder.js';

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
    const payload = await executeAskAI(req.body || {}, { req });
    await recordRagTelemetrySuccess({
      req,
      endpoint: '/api/rag/ask',
      method: req.method,
      input: req.body || {},
      response: payload,
    });
    return res.status(200).json(payload);
  } catch (error) {
    const ragError = toRagError(error);
    await recordRagTelemetryFailure({
      req,
      endpoint: '/api/rag/ask',
      method: req.method,
      input: req.body || {},
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

