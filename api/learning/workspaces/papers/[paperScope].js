import { requireAuth } from '../../../lib/security/auth-guard.js';
import { getServiceClient } from '../../../lib/supabase/client.js';
import { LEARNING_ERROR_CODES } from '../../lib/contracts/error-contract.js';
import {
  LearningHttpError,
  sendLearningError,
  sendLearningHttpError,
  sendLearningJson,
} from '../../lib/http/learning-http.js';
import {
  ensurePaperWorkspaceView,
  getPaperWorkspaceView,
} from '../../lib/workspaces/workspace-read-service.js';
import {
  buildPaperWorkspaceCompatibilityEnvelope,
  normalizePaperScope,
} from '../../lib/workspaces/paper-workspace-contract.js';

async function ensureLearningAuth(req) {
  if (req?.auth_user_id) {
    return {
      ok: true,
      userId: req.auth_user_id,
    };
  }

  const auth = await requireAuth(req);
  if (!auth.ok) {
    return auth;
  }

  return {
    ok: true,
    userId: auth.user?.id || req?.auth_user_id || null,
  };
}

function normalizeSummaryObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return sendLearningError(
      res,
      req?.request_id || null,
      LEARNING_ERROR_CODES.INVALID_PAYLOAD,
      {
        status: 405,
        message: 'Method not allowed.',
      },
    );
  }

  const auth = await ensureLearningAuth(req);
  if (!auth.ok || !auth.userId) {
    return sendLearningError(
      res,
      req?.request_id || null,
      auth.code || LEARNING_ERROR_CODES.AUTH_REQUIRED,
      {
        status: auth.status || 401,
        message: auth.message || 'Authentication required.',
      },
    );
  }

  try {
    if (req.method === 'POST' && req?.body?.action !== 'ensure') {
      return sendLearningError(
        res,
        req?.request_id || null,
        LEARNING_ERROR_CODES.INVALID_PAYLOAD,
        {
          status: 400,
          message: 'POST /api/learning/workspaces/papers/:paperScope requires action "ensure".',
          details: { field: 'action' },
        },
      );
    }

    const client = getServiceClient();
    const paperScope = normalizePaperScope(req?.query?.paperScope);
    const payload = req.method === 'POST'
      ? await ensurePaperWorkspaceView(client, {
        userId: auth.userId,
        paperScope,
        visibleOrganizationSummary: normalizeSummaryObject(req?.body?.visible_organization_summary),
        linkedTopicSummary: normalizeSummaryObject(req?.body?.linked_topic_summary),
      })
      : await getPaperWorkspaceView(client, {
        userId: auth.userId,
        paperScope,
      });

    return sendLearningJson(
      res,
      req?.request_id || null,
      buildPaperWorkspaceCompatibilityEnvelope(payload),
    );
  } catch (error) {
    if (error instanceof LearningHttpError) {
      return sendLearningHttpError(res, req?.request_id || null, error);
    }

    return sendLearningError(res, req?.request_id || null, 'internal_error', {
      status: 500,
      message: 'Internal server error.',
    });
  }
}
