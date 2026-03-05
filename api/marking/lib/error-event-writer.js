// api/marking/lib/error-event-writer.js
// Error Event Writer — extracts error candidates from mark_decisions,
// resolves misconception_tag via reason_to_tag_mapping, and writes error_events.
// user_id is NOT set by application code — the DB trigger trg_sync_error_event_user_id
// forces user_id = attempts.user_id on INSERT.
// Requirements: 4.1, 4.2, 4.4, 4.5, 4.6

// ── Reasons that represent structural dependencies, not student errors ──────
const EXCLUDED_REASONS = new Set(['dependency_not_met', 'dependency_error']);

/**
 * Determine if a mark_decision is an error candidate.
 * Error candidates: awarded === false, excluding structural dependency reasons.
 *
 * @param {object} decision
 * @returns {boolean}
 */
export function isErrorCandidate(decision) {
  if (decision.awarded !== false) return false;
  if (EXCLUDED_REASONS.has(decision.reason)) return false;
  return true;
}

/**
 * Resolve misconception_tag from reason_to_tag_mapping table.
 * Queries by reason, orders by priority DESC, takes the first match.
 * Returns 'unclassified' when no mapping is found.
 *
 * @param {object} supabase - Supabase client
 * @param {string} reason - Decision Engine reason value
 * @returns {Promise<string>} misconception_tag
 */
export async function resolveMisconceptionTag(supabase, reason) {
  try {
    const { data, error } = await supabase
      .from('reason_to_tag_mapping')
      .select('misconception_tag')
      .eq('reason', reason)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(JSON.stringify({
        event: 'error_event_writer_tag_query_error',
        reason,
        error: error.message,
        ts: new Date().toISOString(),
      }));
      return 'unclassified';
    }

    return data?.misconception_tag || 'unclassified';
  } catch (err) {
    console.error(JSON.stringify({
      event: 'error_event_writer_tag_resolve_error',
      reason,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    return 'unclassified';
  }
}


/**
 * Resolve default_severity from misconception_taxonomy for a given tag.
 * Falls back to 'major' if not found.
 *
 * @param {object} supabase
 * @param {string} tag
 * @returns {Promise<string>}
 */
async function resolveSeverity(supabase, tag) {
  try {
    const { data, error } = await supabase
      .from('misconception_taxonomy')
      .select('default_severity')
      .eq('tag', tag)
      .maybeSingle();

    if (error || !data) return 'major';
    return data.default_severity || 'major';
  } catch {
    return 'major';
  }
}

/**
 * Extract error candidates from mark_decisions and write error_events.
 * Reuses isErrorCandidate logic to filter decisions.
 * user_id is synced by DB trigger — application layer does NOT set it.
 *
 * @param {object} params
 * @param {object} params.supabase - Supabase client (service-role)
 * @param {string} params.attempt_id - UUID of the parent attempt
 * @param {string|null} params.topic_path - from attempt record
 * @param {string|null} params.node_id - from attempt record
 * @param {object[]} params.mark_decisions - written mark_decision rows
 *   Each: { mark_decision_id, rubric_id, awarded, awarded_marks, reason, ... }
 * @returns {Promise<{count: number, unclassified_count: number, status: 'success'|'failed', error?: string}>}
 */
export async function writeErrorEvents({ supabase, attempt_id, topic_path, node_id, mark_decisions }) {
  const failedResult = (error) => ({
    count: 0,
    unclassified_count: 0,
    status: 'failed',
    error,
  });

  if (!Array.isArray(mark_decisions) || mark_decisions.length === 0) {
    return { count: 0, unclassified_count: 0, status: 'success' };
  }

  try {
    // ── 1. Filter error candidates ────────────────────────────────────────
    const candidates = mark_decisions.filter(isErrorCandidate);

    if (candidates.length === 0) {
      return { count: 0, unclassified_count: 0, status: 'success' };
    }

    // ── 2. Build error_event rows ─────────────────────────────────────────
    let unclassified_count = 0;
    const rows = [];

    for (const decision of candidates) {
      const tag = await resolveMisconceptionTag(supabase, decision.reason);
      const severity = await resolveSeverity(supabase, tag);

      if (tag === 'unclassified') {
        unclassified_count += 1;
      }

      rows.push({
        attempt_id,
        mark_decision_id: decision.mark_decision_id || null,
        topic_path: topic_path || null,
        node_id: node_id || null,
        misconception_tag: tag,
        severity,
        // user_id intentionally omitted — DB trigger handles it
        metadata: {
          reason: decision.reason,
          rubric_id: decision.rubric_id,
        },
      });
    }

    // ── 3. Batch insert ───────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('error_events')
      .insert(rows);

    if (insertError) {
      // Trigger failure (e.g. attempt_id not found) surfaces here
      console.error(JSON.stringify({
        event: 'error_event_writer_insert_error',
        attempt_id,
        candidate_count: candidates.length,
        error_code: insertError.code || 'unknown',
        error: insertError.message,
        ts: new Date().toISOString(),
      }));
      return failedResult(insertError.message);
    }

    console.log(JSON.stringify({
      event: 'error_event_write_complete',
      attempt_id,
      count: rows.length,
      unclassified_count,
      ts: new Date().toISOString(),
    }));

    return { count: rows.length, unclassified_count, status: 'success' };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'error_event_writer_exception',
      attempt_id,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    return failedResult(err?.message || String(err));
  }
}
