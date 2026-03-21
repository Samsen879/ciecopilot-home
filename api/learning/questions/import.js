import { sendLearningReservedResponse } from '../lib/session-runtime/session-service.js';

export default async function handler(req, res) {
  return sendLearningReservedResponse(req, res, {
    payload: {
      endpoint: 'POST /api/learning/questions/import',
    },
  });
}
