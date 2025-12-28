/**
 * Syllabus Boundary Search Service
 *
 * Provides syllabus-boundary-aware search using hybrid_search_v2 RPC.
 * All searches are constrained to the current_topic_path subtree.
 *
 * **Feature: syllabus-boundary-system**
 * **Validates: Requirements 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import { createClient } from '@supabase/supabase-js';
import {
  canonicalize,
  isDescendantOf,
  TopicPathError,
} from '../../../../libs/topic-path/index.js';

// ============================================================================
// Error Codes (stable for API contract)
// ============================================================================

export const SyllabusSearchErrorCode = Object.freeze({
  TOPIC_PATH_REQUIRED: 'TOPIC_PATH_REQUIRED',
  TOPIC_PATH_INVALID: 'TOPIC_PATH_INVALID',
  TOPIC_PATH_UNKNOWN: 'TOPIC_PATH_UNKNOWN',
  TOPIC_LEAKAGE_DETECTED: 'TOPIC_LEAKAGE_DETECTED',
  DATABASE_ERROR: 'DATABASE_ERROR',
});

export class SyllabusSearchError extends Error {
  constructor(code, message, httpStatus = 400, incidentId = null) {
    super(message);
    this.name = 'SyllabusSearchError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.incidentId = incidentId;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!key) {
    key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  }
  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(url, key);
}

function generateIncidentId() {
  return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Core Functions
// ============================================================================

export function validateTopicPath(topicPath) {
  if (!topicPath || (typeof topicPath === 'string' && topicPath.trim() === '')) {
    throw new SyllabusSearchError(
      SyllabusSearchErrorCode.TOPIC_PATH_REQUIRED,
      'current_topic_path is required',
      400
    );
  }
  try {
    return canonicalize(topicPath);
  } catch (err) {
    if (err instanceof TopicPathError) {
      throw new SyllabusSearchError(
        SyllabusSearchErrorCode.TOPIC_PATH_INVALID,
        `Invalid topic_path format: ${err.message}`,
        400
      );
    }
    throw err;
  }
}

export async function verifyTopicPathExists(supabase, topicPath) {
  const { data, error } = await supabase
    .from('curriculum_nodes')
    .select('node_id')
    .eq('topic_path', topicPath)
    .maybeSingle();

  if (error) {
    throw new SyllabusSearchError(
      SyllabusSearchErrorCode.DATABASE_ERROR,
      `Failed to verify topic_path: ${error.message}`,
      500
    );
  }
  if (!data) {
    throw new SyllabusSearchError(
      SyllabusSearchErrorCode.TOPIC_PATH_UNKNOWN,
      `unknown topic_path: ${topicPath}`,
      400
    );
  }
  return true;
}


export async function hybridSearchV2({
  query,
  embedding,
  currentTopicPath,
  matchCount = 12,
  densePool = 50,
  keyPool = 50,
  wSem = 0.3,
  wKey = 0.7,
  rrfK = 60,
}) {
  const canonicalPath = validateTopicPath(currentTopicPath);
  const supabase = getSupabaseClient();
  await verifyTopicPathExists(supabase, canonicalPath);

  const { data, error } = await supabase.rpc('hybrid_search_v2', {
    p_query: query || '',
    p_query_embedding: embedding,
    p_topic_path: canonicalPath,
    p_match_count: matchCount,
    p_dense_pool: densePool,
    p_key_pool: keyPool,
    p_w_sem: wSem,
    p_w_key: wKey,
    p_rrf_k: rrfK,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('current_topic_path required')) {
      throw new SyllabusSearchError(
        SyllabusSearchErrorCode.TOPIC_PATH_REQUIRED,
        'current_topic_path is required',
        400
      );
    }
    if (msg.includes('unknown current_topic_path')) {
      throw new SyllabusSearchError(SyllabusSearchErrorCode.TOPIC_PATH_UNKNOWN, msg, 400);
    }
    throw new SyllabusSearchError(
      SyllabusSearchErrorCode.DATABASE_ERROR,
      `Search failed: ${msg}`,
      500
    );
  }

  const results = data || [];
  for (const row of results) {
    const rowPath = String(row.topic_path || '');
    if (!isDescendantOf(rowPath, canonicalPath)) {
      const incidentId = generateIncidentId();
      console.error({
        level: 'critical',
        event: 'TOPIC_LEAKAGE_DETECTED',
        incident_id: incidentId,
        current_topic_path: canonicalPath,
        leaked_chunk_id: row.id,
        leaked_topic_path: rowPath,
      });
      throw new SyllabusSearchError(
        SyllabusSearchErrorCode.TOPIC_LEAKAGE_DETECTED,
        'Topic boundary invariant breach',
        500,
        incidentId
      );
    }
    if (rowPath === 'unmapped') {
      const incidentId = generateIncidentId();
      console.error({
        level: 'critical',
        event: 'TOPIC_LEAKAGE_DETECTED',
        incident_id: incidentId,
        current_topic_path: canonicalPath,
        leaked_chunk_id: row.id,
        leaked_topic_path: 'unmapped',
      });
      throw new SyllabusSearchError(
        SyllabusSearchErrorCode.TOPIC_LEAKAGE_DETECTED,
        'Topic boundary invariant breach',
        500,
        incidentId
      );
    }
  }
  return results;
}

export function formatEvidence(results) {
  return (results || []).map((row) => ({
    id: row.id,
    snippet: row.snippet || '',
    topic_path: String(row.topic_path || ''),
    score: row.score,
  }));
}
