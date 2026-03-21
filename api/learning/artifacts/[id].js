import { sendLearningReservedResponse } from '../lib/session-runtime/session-service.js';

export default async function handler(req, res) {
  return sendLearningReservedResponse(req, res, {
    payload: {
      endpoint: 'PATCH /api/learning/artifacts/:id',
      artifact_id: req?.query?.id || null,
      artifact: null,
    },
  });
}
