import { getServiceClient } from '../../lib/supabase/client.js';
import { sendLearningHttpError, sendLearningJson } from '../lib/http/learning-http.js';
import { patchLearningReviewTask } from '../lib/review/review-task-service.js';
import { validateReviewTaskWritePayload } from '../lib/validators/review-task-write-validator.js';

function getRequestId(req) {
  return req?.request_id ?? req?.headers?.['x-request-id'] ?? null;
}

function getUserId(req) {
  return req?.auth_user_id ?? req?.auth_user?.id ?? null;
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== 'PATCH') {
    return sendLearningHttpError(res, requestId, {
      code: 'invalid_payload',
      status: 405,
      publicMessage: 'Only PATCH is supported for review-task lifecycle updates.',
    });
  }

  const userId = getUserId(req);
  if (!userId) {
    return sendLearningHttpError(res, requestId, {
      code: 'auth_required',
      status: 401,
      publicMessage: 'Authentication is required.',
    });
  }

  try {
    const validated = validateReviewTaskWritePayload(req.body || {});
    const result = await patchLearningReviewTask({
      client: getServiceClient(),
      userId,
      reviewTaskId: req?.query?.id ?? null,
      ...validated,
    });

    return sendLearningJson(res, requestId, result);
  } catch (error) {
    return sendLearningHttpError(res, requestId, error, {
      defaultCode: 'invalid_payload',
      defaultMessage: 'Review-task lifecycle update failed.',
    });
  }
}
