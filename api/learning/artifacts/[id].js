import { getServiceClient } from '../../lib/supabase/client.js';
import { sendLearningHttpError, sendLearningJson } from '../lib/http/learning-http.js';
import { patchLearningArtifact } from '../lib/artifacts/artifact-service.js';

const ARTIFACT_INTENTS = new Set([
  'set_placement_status',
  'mark_contested',
  'attach_superseded_by',
]);

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
      publicMessage: 'Only PATCH is supported for artifact lifecycle updates.',
    });
  }

  if (!getUserId(req)) {
    return sendLearningHttpError(res, requestId, {
      code: 'auth_required',
      status: 401,
      publicMessage: 'Authentication is required.',
    });
  }

  const body = req.body || {};
  if (Object.prototype.hasOwnProperty.call(body, 'state')) {
    return sendLearningHttpError(res, requestId, {
      code: 'invalid_payload',
      status: 400,
      publicMessage: 'Artifact lifecycle writes must use explicit intents.',
      details: { field: 'state' },
    });
  }

  if (!ARTIFACT_INTENTS.has(body.intent)) {
    return sendLearningHttpError(res, requestId, {
      code: 'invalid_payload',
      status: 400,
      publicMessage: 'Artifact lifecycle writes must use explicit intents.',
      details: { field: 'intent' },
    });
  }

  try {
    const result = await patchLearningArtifact({
      client: getServiceClient(),
      userId: getUserId(req),
      artifactId: req?.query?.id ?? null,
      intent: body.intent,
      placementStatus: body.placement_status ?? null,
      successorArtifactRef: body.successor_artifact_ref ?? null,
    });

    return sendLearningJson(res, requestId, {
      artifact: result.artifact,
      slot_transition: result.slot_transition ?? null,
    });
  } catch (error) {
    return sendLearningHttpError(res, requestId, error, {
      defaultCode: 'invalid_payload',
      defaultMessage: 'Artifact lifecycle update failed.',
    });
  }
}
