// api/evidence/context.js
// Context Query API — provides structured learning context for AI tutoring.
// GET /api/evidence/context?topic_path=xxx&limit=10

import { getServiceClient } from '../lib/supabase/client.js';
import { resolveUserId, AuthError } from '../marking/lib/auth-helper.js';

// ── Lazy Supabase client ────────────────────────────────────────────────────
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

/** @internal — test-only reset */
export function _resetClient() {
  _client = null;
  _contextCache.clear();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract subject_code from topic_path (first segment).
 * e.g. '9709.p1.algebra.quadratics' → '9709'
 */
function extractSubjectCode(topicPath) {
  if (!topicPath || typeof topicPath !== 'string') return null;
  const dot = topicPath.indexOf('.');
  return dot > 0 ? topicPath.slice(0, dot) : topicPath;
}

/**
 * Check if a topic_path is a descendant-or-self of the prefix.
 * Simulates ltree @> (ancestor-or-self) in application code.
 */
function isSubtreeMatch(candidatePath, prefix) {
  if (!candidatePath || !prefix) return false;
  return candidatePath === prefix || candidatePath.startsWith(prefix + '.');
}

/**
 * Parse query string from a raw Node.js request URL.
 */
function parseQuery(reqUrl) {
  try {
    const u = new URL(reqUrl, 'http://localhost');
    return u.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

/**
 * GET /api/evidence/context?topic_path=xxx&limit=10
 *
 * Returns structured learning context for AI tutoring:
 * - mastery: aggregated mastery score for the topic node
 * - recent_decisions: recent mark decisions in the topic subtree
 * - misconception_tags: top misconception tags by weighted_count
 * - recent_errors: recent error events in the topic subtree
 */
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const params = parseQuery(req.url);
  const topicPath = params.get('topic_path');

  // topic_path is required
  if (!topicPath) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'topic_path query parameter is required' }));
  }

  // Parse and clamp limit
  let limit = parseInt(params.get('limit'), 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  if (limit > 50) limit = 50;

  // Authenticate via JWT — always required for this endpoint
  let userId;
  try {
    const auth = await resolveUserId(req, { requireJwt: true });
    userId = auth.user_id;
  } catch (err) {
    if (err instanceof AuthError) {
      res.statusCode = err.status || 401;
      return res.end(JSON.stringify({ error: err.message }));
    }
    console.error('[evidence/context] Unexpected auth error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
  }

  try {
    const cacheKey = `${userId}:${topicPath}:${limit}`;
    const cached = readContextCache(cacheKey);
    if (cached) {
      res.statusCode = 200;
      return res.end(JSON.stringify(cached));
    }

    const supabase = getClient();
    const fastPath = await fetchContextViaRpc(supabase, userId, topicPath, limit);
    if (fastPath) {
      writeContextCache(cacheKey, fastPath);
      res.statusCode = 200;
      return res.end(JSON.stringify(fastPath));
    }

    // Fallback path (legacy query composition) when RPC is unavailable.
    const subjectCode = extractSubjectCode(topicPath);
    const [mastery, recentDecisions, recentErrors] = await Promise.all([
      fetchMastery(supabase, userId, subjectCode, topicPath),
      fetchRecentDecisions(supabase, userId, subjectCode, topicPath, limit),
      fetchRecentErrors(supabase, userId, topicPath),
    ]);

    const misconceptionTags = mastery._misconceptionTags;
    delete mastery._misconceptionTags;

    const responsePayload = {
      mastery: mastery.data,
      recent_decisions: recentDecisions,
      misconception_tags: misconceptionTags,
      recent_errors: recentErrors,
    };

    writeContextCache(cacheKey, responsePayload);
    res.statusCode = 200;
    return res.end(JSON.stringify(responsePayload));
  } catch (err) {
    console.error('[evidence/context] Query error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
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
      // Function missing / type mismatch / deployment lag => fallback.
      if (error.code === '42883' || error.code === '42P01') {
        return null;
      }
      console.error('[evidence/context] get_evidence_context RPC error:', error);
      return null;
    }

    const payload = data || {};
    return {
      mastery: payload.mastery ?? null,
      recent_decisions: Array.isArray(payload.recent_decisions) ? payload.recent_decisions : [],
      misconception_tags: Array.isArray(payload.misconception_tags) ? payload.misconception_tags : [],
      recent_errors: Array.isArray(payload.recent_errors) ? payload.recent_errors : [],
    };
  } catch (err) {
    console.error('[evidence/context] get_evidence_context RPC exception:', err);
    return null;
  }
}

// ── Query functions ─────────────────────────────────────────────────────────

/**
 * Fetch mastery data and misconception_frequencies from user_learning_profiles.
 * Returns mastery for the specific topic_path node + top 10 misconception tags.
 */
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

  // Extract mastery for the specific topic_path node.
  // mastery_by_node is keyed by node_id, so we need to find the matching node.
  // For simplicity, we look for a node whose path matches topicPath in the JSONB.
  // The aggregation stores by node_id, but we can also match by iterating.
  // Since we don't have a direct topic_path→node_id mapping in the JSONB,
  // we return the first matching node or search by topic_path prefix.
  let masteryData = null;
  const masteryByNode = data.mastery_by_node || {};

  // Try to find a node matching the exact topic_path
  // The JSONB keys are node_ids; we need to query curriculum_nodes to map.
  // For performance, we do a separate lookup.
  const nodeResult = await supabase
    .from('curriculum_nodes')
    .select('node_id')
    .eq('topic_path', topicPath)
    .maybeSingle();

  if (nodeResult.data?.node_id && masteryByNode[nodeResult.data.node_id]) {
    const m = masteryByNode[nodeResult.data.node_id];
    masteryData = {
      score: m.score,
      sample_count: m.sample_count,
      weighted_sample_count: m.weighted_sample_count,
      low_confidence: m.low_confidence,
    };
  }

  // Extract top 10 misconception tags sorted by weighted_count DESC
  const misconceptionFreqs = data.misconception_frequencies || {};
  const misconceptionTags = Object.entries(misconceptionFreqs)
    .map(([tag, info]) => ({
      tag,
      weighted_count: info.weighted_count,
      last_seen: info.last_seen,
    }))
    .sort((a, b) => b.weighted_count - a.weighted_count)
    .slice(0, 10);

  return { data: masteryData, _misconceptionTags: misconceptionTags };
}

/**
 * Fetch recent mark_decisions for the user within the topic_path subtree.
 * Uses: mark_decisions JOIN mark_runs JOIN attempts, filtered by user + topic_path prefix.
 */
async function fetchRecentDecisions(supabase, userId, subjectCode, topicPath, limit) {
  // Query attempts for this user, then join through mark_runs to mark_decisions.
  // Since Supabase JS doesn't support ltree operators, we fetch by user_id
  // and filter topic_path in application code.
  const { data: attempts, error: attError } = await supabase
    .from('attempts')
    .select('attempt_id, topic_path')
    .eq('user_id', userId)
    .eq('syllabus_code', subjectCode);

  if (attError || !attempts || attempts.length === 0) {
    return [];
  }

  // Filter attempts by topic_path subtree
  const matchingAttemptIds = attempts
    .filter(a => isSubtreeMatch(a.topic_path, topicPath))
    .map(a => a.attempt_id);

  if (matchingAttemptIds.length === 0) return [];

  // Get mark_runs for matching attempts
  const { data: runs, error: runError } = await supabase
    .from('mark_runs')
    .select('mark_run_id')
    .in('attempt_id', matchingAttemptIds);

  if (runError || !runs || runs.length === 0) return [];

  const runIds = runs.map(r => r.mark_run_id);

  // Get mark_decisions for those runs, ordered by created_at DESC, limited
  const { data: decisions, error: decError } = await supabase
    .from('mark_decisions')
    .select('rubric_id, mark_label, awarded, reason, created_at')
    .in('mark_run_id', runIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (decError) {
    console.error('[evidence/context] mark_decisions query error:', decError);
    return [];
  }

  return decisions || [];
}

/**
 * Fetch recent 5 error_events for the user within the topic_path subtree.
 */
async function fetchRecentErrors(supabase, userId, topicPath) {
  // Fetch recent error_events by user_id, filter topic_path in app code
  const { data, error } = await supabase
    .from('error_events')
    .select('misconception_tag, severity, topic_path, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50); // fetch more than needed, filter in app

  if (error) {
    console.error('[evidence/context] error_events query error:', error);
    return [];
  }

  if (!data) return [];

  // Filter by topic_path subtree and take first 5
  return data
    .filter(e => isSubtreeMatch(e.topic_path, topicPath))
    .slice(0, 5);
}
