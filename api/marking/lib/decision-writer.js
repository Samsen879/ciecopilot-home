// api/marking/lib/decision-writer.js
// Decision Writer — batch writes mark_decisions via Supabase RPC
// (insert_mark_decisions) for transactional atomicity.
// Requirements: 2.1, 2.2, 2.3, 2.4

/**
 * Batch write mark_decisions in a single database transaction.
 * Uses the Supabase RPC function `insert_mark_decisions` which performs
 * an atomic INSERT of all decisions for a given mark_run.
 *
 * @param {object} params
 * @param {object} params.supabase - Supabase client (service-role)
 * @param {string} params.mark_run_id - UUID of the parent mark_run
 * @param {object[]} params.decisions - Decision Engine output array
 *   Each element: {
 *     rubric_id, mark_label, awarded, awarded_marks, reason,
 *     alignment_confidence?, evidence_spans?
 *   }
 * @returns {Promise<{status: 'success'|'failed', count: number, decisions?: object[], error?: string}>}
 */
export async function writeDecisions({ supabase, mark_run_id, decisions }) {
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return { status: 'success', count: 0, decisions: [] };
  }

  try {
    const { data, error } = await supabase.rpc('insert_mark_decisions', {
      p_mark_run_id: mark_run_id,
      p_decisions: decisions,
    });

    if (error) {
      console.error(JSON.stringify({
        event: 'decision_writer_rpc_error',
        mark_run_id,
        decision_count: decisions.length,
        error_code: error.code || 'unknown',
        error: error.message,
        ts: new Date().toISOString(),
      }));
      return { status: 'failed', count: 0, error: error.message };
    }

    const rows = Array.isArray(data) ? data : [];

    // Backward/forward compatibility:
    // - New RPC returns full decision fields
    // - Older RPC may return only {mark_decision_id, rubric_id}
    // Fill missing fields from input decisions by rubric_id so downstream
    // error-event extraction still has awarded/reason.
    const sourceByRubricId = new Map(
      decisions.map((d) => [String(d.rubric_id), d]),
    );

    const normalizedRows = rows.map((r) => {
      const source = sourceByRubricId.get(String(r.rubric_id)) || {};
      return {
        mark_decision_id: r.mark_decision_id,
        rubric_id: r.rubric_id ?? source.rubric_id ?? null,
        mark_label: r.mark_label ?? source.mark_label ?? null,
        awarded: r.awarded ?? source.awarded ?? null,
        awarded_marks: r.awarded_marks ?? source.awarded_marks ?? 0,
        reason: r.reason ?? source.reason ?? null,
        alignment_confidence: r.alignment_confidence ?? source.alignment_confidence ?? null,
        evidence_spans: r.evidence_spans ?? source.evidence_spans ?? [],
      };
    });

    return { status: 'success', count: normalizedRows.length, decisions: normalizedRows };
  } catch (err) {
    console.error(JSON.stringify({
      event: 'decision_writer_exception',
      mark_run_id,
      decision_count: decisions.length,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    return { status: 'failed', count: 0, error: err?.message || String(err) };
  }
}
