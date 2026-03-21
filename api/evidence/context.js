import { getServiceClient } from '../lib/supabase/client.js';
import { resolveUserId, AuthError } from '../marking/lib/auth-helper.js';
import { getSession } from '../learning/lib/repositories/session-repository.js';
import { getWorkspaceView } from '../learning/lib/workspaces/workspace-read-service.js';
import { sendContextError, sendContextJson } from './lib/evidence-context-http.js';
import { serializeEvidenceContextPayload } from './lib/evidence-context-contract.js';
import {
  EvidenceContextValidationError,
  parseEvidenceContextRequest,
} from './lib/evidence-context-validator.js';

let _client = null;
const _contextCache = new Map();
const CONTEXT_CACHE_MAX_SIZE = 500;
const CONTEXT_CACHE_TTL_MS = 30_000;
const CONTEXT_CACHE_ENABLED =
  process.env.NODE_ENV !== 'test' &&
  process.env.EVIDENCE_CONTEXT_CACHE_ENABLED !== 'false';

function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  _client = getServiceClient();
  return _client;
}

export function _resetClient() {
  _client = null;
  _contextCache.clear();
}

function extractSubjectCode(topicPath) {
  if (!topicPath || typeof topicPath !== 'string') return null;
  const dot = topicPath.indexOf('.');
  return dot > 0 ? topicPath.slice(0, dot) : topicPath;
}

function isSubtreeMatch(candidatePath, prefix) {
  if (!candidatePath || !prefix) return false;
  return candidatePath === prefix || candidatePath.startsWith(prefix + '.');
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function buildQuestionRef(questionId) {
  return normalizeString(questionId)
    ? { kind: 'question', question_id: normalizeString(questionId) }
    : null;
}

function buildQuestionTypeRef(questionTypeId) {
  return normalizeString(questionTypeId)
    ? { kind: 'question_type', question_type_id: normalizeString(questionTypeId) }
    : null;
}

function buildLearningRuntimeSummary({ session, workspace } = {}) {
  if (!session && !workspace) {
    return null;
  }

  const bundle =
    session?.active_scope_bundle && typeof session.active_scope_bundle === 'object'
      ? session.active_scope_bundle
      : {};

  const currentAnchorRef = bundle.current_anchor_ref ?? session?.current_anchor_ref ?? null;
  const currentQuestionRef =
    bundle.current_question_ref ?? buildQuestionRef(session?.current_question_id ?? null);
  const currentQuestionTypeRef =
    bundle.current_question_type_ref ??
    buildQuestionTypeRef(session?.current_question_type_id ?? null);

  return {
    session_id: session?.session_id ?? null,
    current_anchor_kind: bundle.current_anchor_kind ?? session?.current_anchor_kind ?? null,
    current_anchor_ref: currentAnchorRef,
    current_question_ref: currentQuestionRef,
    current_question_type_ref: currentQuestionTypeRef,
    workspace: workspace ?? null,
  };
}

async function maybeLoadLearningWorkspace(
  loadWorkspace,
  client,
  {
    userId,
    topicId,
  } = {},
) {
  if (!normalizeString(topicId)) {
    return null;
  }

  try {
    const payload = await loadWorkspace(client, {
      userId,
      topicId,
    });
    return payload?.workspace ?? null;
  } catch (error) {
    if (error?.code === 'workspace_not_found') {
      return null;
    }
    throw error;
  }
}

export async function getEvidenceContext(
  {
    client = getClient(),
    loadSession = getSession,
    loadWorkspace = getWorkspaceView,
  } = {},
  {
    userId,
    topicPath,
    topicId = null,
    sessionId = null,
    limit = 10,
  } = {},
) {
  const fastPath = await fetchContextViaRpc(client, userId, topicPath, limit);
  let source = 'rpc';
  let mastery;
  let recentDecisions;
  let misconceptionTags;
  let recentErrors;

  if (fastPath) {
    mastery = fastPath.mastery;
    recentDecisions = fastPath.recentDecisions;
    misconceptionTags = fastPath.misconceptionTags;
    recentErrors = fastPath.recentErrors;
  } else {
    source = 'fallback';
    const subjectCode = extractSubjectCode(topicPath);
    const [masteryPayload, decisions, errors] = await Promise.all([
      fetchMastery(client, userId, subjectCode, topicPath),
      fetchRecentDecisions(client, userId, subjectCode, topicPath, limit),
      fetchRecentErrors(client, userId, topicPath),
    ]);

    mastery = masteryPayload.data;
    recentDecisions = decisions;
    misconceptionTags = masteryPayload._misconceptionTags;
    recentErrors = errors;
  }

  const session = normalizeString(sessionId)
    ? await loadSession(client, {
      sessionId: sessionId,
      userId,
    })
    : null;
  const resolvedTopicId =
    normalizeString(topicId)
    || bundleTopicId(session?.active_scope_bundle)
    || null;
  const workspace = await maybeLoadLearningWorkspace(loadWorkspace, client, {
    userId,
    topicId: resolvedTopicId,
  });

  return serializeEvidenceContextPayload({
    mastery,
    recentDecisions,
    misconceptionTags,
    recentErrors,
    topicPath,
    limit,
    source,
    learningRuntime: buildLearningRuntimeSummary({
      session,
      workspace,
    }),
  });
}

function bundleTopicId(bundle) {
  if (!bundle || typeof bundle !== 'object') {
    return null;
  }

  return normalizeString(bundle.primary_topic_id);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendContextError(req, res, {
      status: 405,
      code: 'method_not_allowed',
      message: 'Method not allowed. Only GET is supported on this endpoint.',
    });
  }

  let requestParams;
  try {
    requestParams = parseEvidenceContextRequest(req);
  } catch (err) {
    if (err instanceof EvidenceContextValidationError) {
      return sendContextError(req, res, {
        status: err.status,
        code: err.code,
        message: err.message,
        details: err.details,
      });
    }
    throw err;
  }

  const {
    topic_path: topicPath,
    topic_id: topicId,
    session_id: sessionId,
    limit,
  } = requestParams;

  let userId;
  try {
    const auth = await resolveUserId(req, { requireJwt: true });
    userId = auth.user_id;
  } catch (err) {
    if (err instanceof AuthError) {
      return sendContextError(req, res, {
        status: err.status || 401,
        code: err.status === 403 ? 'auth_forbidden' : 'auth_required',
        message: err.message,
      });
    }
    console.error('[evidence/context] Unexpected auth error:', err);
    return sendContextError(req, res, {
      status: 500,
      code: 'internal_error',
      message: 'Internal server error',
      details: { cause: err?.message || String(err) },
    });
  }

  try {
    const cacheKey = `${userId}:${topicPath}:${topicId || ''}:${sessionId || ''}:${limit}`;
    const cached = readContextCache(cacheKey);
    if (cached) {
      return sendContextJson(res, cached);
    }

    const payload = await getEvidenceContext(
      { client: getClient() },
      {
        userId,
        topicPath,
        topicId,
        sessionId,
        limit,
      },
    );
    writeContextCache(cacheKey, payload);
    return sendContextJson(res, payload);
  } catch (err) {
    console.error('[evidence/context] Query error:', err);
    return sendContextError(req, res, {
      status: 500,
      code: 'context_query_failed',
      message: 'Internal server error',
      details: { cause: err?.message || String(err) },
    });
  }
}

function readContextCache(key) {
  if (!CONTEXT_CACHE_ENABLED) return null;
  const entry = _contextCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    _contextCache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeContextCache(key, payload) {
  if (!CONTEXT_CACHE_ENABLED) return;
  if (_contextCache.size >= CONTEXT_CACHE_MAX_SIZE) {
    const firstKey = _contextCache.keys().next().value;
    if (firstKey) _contextCache.delete(firstKey);
  }
  _contextCache.set(key, {
    payload,
    expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS,
  });
}

async function fetchContextViaRpc(supabase, userId, topicPath, limit) {
  if (typeof supabase.rpc !== 'function') return null;

  try {
    const { data, error } = await supabase.rpc('get_evidence_context', {
      p_user_id: userId,
      p_topic_path: topicPath,
      p_limit: limit,
    });

    if (error) {
      if (error.code === '42883' || error.code === '42P01') {
        return null;
      }
      console.error('[evidence/context] get_evidence_context RPC error:', error);
      return null;
    }

    const payload = data || {};
    return {
      mastery: payload.mastery ?? null,
      recentDecisions: Array.isArray(payload.recent_decisions) ? payload.recent_decisions : [],
      misconceptionTags: Array.isArray(payload.misconception_tags) ? payload.misconception_tags : [],
      recentErrors: Array.isArray(payload.recent_errors) ? payload.recent_errors : [],
    };
  } catch (err) {
    console.error('[evidence/context] get_evidence_context RPC exception:', err);
    return null;
  }
}

async function fetchMastery(supabase, userId, subjectCode, topicPath) {
  const { data, error } = await supabase
    .from('user_learning_profiles')
    .select('mastery_by_node, misconception_frequencies')
    .eq('user_id', userId)
    .eq('subject_code', subjectCode)
    .maybeSingle();

  if (error) {
    console.error('[evidence/context] user_learning_profiles query error:', error);
    return { data: null, _misconceptionTags: [] };
  }

  if (!data) {
    return { data: null, _misconceptionTags: [] };
  }

  let masteryData = null;
  const masteryByNode = data.mastery_by_node || {};
  const nodeResult = await supabase
    .from('curriculum_nodes')
    .select('node_id')
    .eq('topic_path', topicPath)
    .maybeSingle();

  if (nodeResult.data?.node_id && masteryByNode[nodeResult.data.node_id]) {
    const mastery = masteryByNode[nodeResult.data.node_id];
    masteryData = {
      score: mastery.score,
      sample_count: mastery.sample_count,
      weighted_sample_count: mastery.weighted_sample_count,
      low_confidence: mastery.low_confidence,
    };
  }

  const misconceptionFreqs = data.misconception_frequencies || {};
  const misconceptionTags = Object.entries(misconceptionFreqs)
    .map(([tag, info]) => ({
      tag,
      weighted_count: info.weighted_count,
      last_seen: info.last_seen,
    }))
    .sort((left, right) => right.weighted_count - left.weighted_count)
    .slice(0, 10);

  return { data: masteryData, _misconceptionTags: misconceptionTags };
}

async function fetchRecentDecisions(supabase, userId, subjectCode, topicPath, limit) {
  const { data: attempts, error: attemptError } = await supabase
    .from('attempts')
    .select('attempt_id, topic_path')
    .eq('user_id', userId)
    .eq('syllabus_code', subjectCode);

  if (attemptError || !attempts || attempts.length === 0) {
    return [];
  }

  const matchingAttemptIds = attempts
    .filter((attempt) => isSubtreeMatch(attempt.topic_path, topicPath))
    .map((attempt) => attempt.attempt_id);

  if (matchingAttemptIds.length === 0) {
    return [];
  }

  const { data: runs, error: runError } = await supabase
    .from('mark_runs')
    .select('mark_run_id')
    .in('attempt_id', matchingAttemptIds);

  if (runError || !runs || runs.length === 0) {
    return [];
  }

  const runIds = runs.map((run) => run.mark_run_id);
  const { data: decisions, error: decisionError } = await supabase
    .from('mark_decisions')
    .select('rubric_id, mark_label, awarded, reason, created_at')
    .in('mark_run_id', runIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (decisionError) {
    console.error('[evidence/context] mark_decisions query error:', decisionError);
    return [];
  }

  return decisions || [];
}

async function fetchRecentErrors(supabase, userId, topicPath) {
  const { data, error } = await supabase
    .from('error_events')
    .select('misconception_tag, severity, topic_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[evidence/context] error_events query error:', error);
    return [];
  }

  if (!data) return [];

  return data
    .filter((entry) => isSubtreeMatch(entry.topic_path, topicPath))
    .slice(0, 5);
}
