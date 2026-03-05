// api/marking/lib/mark-run-repository-v2.js
// Mark Run Repository v2 — creates/reuses mark_run records with optional
// run-level idempotency (X-Run-Id), calculates total_awarded/total_available,
// and supports status updates for the Evidence Ledger pipeline.

/**
 * Calculate total_awarded from Decision Engine output.
 * @param {object[]} decisions
 * @returns {number}
 */
export function calcTotalAwarded(decisions) {
  if (!Array.isArray(decisions)) return 0;
  return decisions.reduce((sum, d) => sum + (d.awarded_marks || 0), 0);
}

/**
 * Calculate total_available from resolved rubric points.
 * @param {object[]} rubricPoints
 * @returns {number}
 */
export function calcTotalAvailable(rubricPoints) {
  if (!Array.isArray(rubricPoints)) return 0;
  return rubricPoints.reduce((sum, rp) => sum + (rp.marks || 0), 0);
}

/**
 * Create or reuse a mark_run record.
 *
 * - When run_idempotency_key is provided: deterministic idempotency semantics.
 *   1) Look up existing row by (attempt_id, run_idempotency_key)
 *   2) If found, return {mark_run_id, is_new: false}
 *   3) Else insert a new row
 *   4) If insert hits unique conflict (concurrent writer), SELECT back and return reused row
 *   returning {mark_run_id, is_new}.
 * - When run_idempotency_key is null/undefined: always INSERT a new row,
 *   returning {mark_run_id, is_new: true}.
 *
 * @param {object} params
 * @param {object} params.supabase - Supabase client (service-role)
 * @param {string} params.attempt_id
 * @param {string|null} params.run_idempotency_key
 * @param {string} params.engine_version
 * @param {string} params.rubric_version
 * @param {object[]} params.decisions - Decision Engine output (for total_awarded)
 * @param {object[]} params.rubric_points - Resolved rubric points (for total_available)
 * @param {object} params.request_summary
 * @param {object} params.response_summary
 * @returns {Promise<{mark_run_id: string, is_new: boolean}>}
 */
export async function createOrReuseMarkRun({
  supabase,
  attempt_id,
  run_idempotency_key = null,
  engine_version,
  rubric_version,
  decisions = [],
  rubric_points = [],
  request_summary = {},
  response_summary = {},
}) {
  const total_awarded = calcTotalAwarded(decisions);
  const total_available = calcTotalAvailable(rubric_points);

  const row = {
    attempt_id,
    run_idempotency_key: run_idempotency_key || null,
    engine_version,
    rubric_version,
    total_awarded,
    total_available,
    request_summary,
    response_summary,
  };

  // ── Path A: run_idempotency_key provided → idempotent upsert ────────────
  if (run_idempotency_key) {
    // 1) Pre-check existing row for deterministic reuse semantics
    const { data: existing, error: existingError } = await supabase
      .from('mark_runs')
      .select('mark_run_id')
      .eq('attempt_id', attempt_id)
      .eq('run_idempotency_key', run_idempotency_key)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error(JSON.stringify({
        event: 'mark_run_repo_lookup_error',
        attempt_id,
        run_idempotency_key,
        error_code: existingError.code || 'unknown',
        error: existingError.message,
        ts: new Date().toISOString(),
      }));
      throw new Error(`Failed to lookup mark_run: ${existingError.message}`);
    }

    if (existing?.mark_run_id) {
      return { mark_run_id: existing.mark_run_id, is_new: false };
    }

    // 2) No existing row → insert new
    const { data: inserted, error: insertError } = await supabase
      .from('mark_runs')
      .insert(row)
      .select('mark_run_id')
      .single();

    if (insertError) {
      // Concurrent insert path: unique violation means another writer won the race
      if (insertError.code === '23505') {
        const { data: raced, error: racedError } = await supabase
          .from('mark_runs')
          .select('mark_run_id')
          .eq('attempt_id', attempt_id)
          .eq('run_idempotency_key', run_idempotency_key)
          .single();

        if (racedError || !raced?.mark_run_id) {
          throw new Error(
            `Failed to retrieve mark_run after unique conflict: ${racedError?.message || 'no data returned'}`,
          );
        }
        return { mark_run_id: raced.mark_run_id, is_new: false };
      }

      console.error(JSON.stringify({
        event: 'mark_run_repo_insert_error',
        attempt_id,
        run_idempotency_key,
        error_code: insertError.code || 'unknown',
        error: insertError.message,
        ts: new Date().toISOString(),
      }));
      throw new Error(`Failed to create mark_run: ${insertError.message}`);
    }

    return { mark_run_id: inserted.mark_run_id, is_new: true };
  }

  // ── Path B: no run_idempotency_key → always create new ─────────────────
  const { data: inserted, error: insertError } = await supabase
    .from('mark_runs')
    .insert(row)
    .select('mark_run_id')
    .single();

  if (insertError || !inserted) {
    console.error(JSON.stringify({
      event: 'mark_run_repo_insert_error',
      attempt_id,
      error_code: insertError?.code || 'unknown',
      error: insertError?.message || 'no data returned',
      ts: new Date().toISOString(),
    }));
    throw new Error(
      `Failed to create mark_run: ${insertError?.message || 'no data returned'}`,
    );
  }

  return { mark_run_id: inserted.mark_run_id, is_new: true };
}


/**
 * Update mark_run status and decision_write_status.
 * Logs errors but does not throw — used in degradation paths.
 *
 * @param {object} supabase - Supabase client (service-role)
 * @param {string} markRunId
 * @param {string} status - 'pending'|'completed'|'failed'
 * @param {string} decisionWriteStatus - 'success'|'failed'|'pending'
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function updateMarkRunStatus(supabase, markRunId, status, decisionWriteStatus) {
  try {
    const { error } = await supabase
      .from('mark_runs')
      .update({ status, decision_write_status: decisionWriteStatus })
      .eq('mark_run_id', markRunId);

    if (error) {
      console.error(JSON.stringify({
        event: 'mark_run_repo_status_update_error',
        mark_run_id: markRunId,
        status,
        decision_write_status: decisionWriteStatus,
        error_code: error.code || 'unknown',
        error: error.message,
        ts: new Date().toISOString(),
      }));
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'mark_run_repo_status_update_exception',
      mark_run_id: markRunId,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    return { ok: false, error: err?.message || String(err) };
  }
}
