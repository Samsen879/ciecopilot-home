import { sendLearningReservedResponse } from '../lib/session-runtime/session-service.js';

export default async function handler(req, res) {
  return sendLearningReservedResponse(req, res, {
    status: 200,
    payload: {
      endpoint: 'GET /api/learning/workspaces/:topicId',
      workspace: null,
      topic_id: req?.query?.topicId || null,
    },
  });
}
