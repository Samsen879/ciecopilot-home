import { errorResponse } from '../lib/http/respond.js';
import { executeAskAI } from './lib/ask-service.js';
import { toRagError } from './lib/errors.js';

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
    return res.status(200).json(payload);
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

