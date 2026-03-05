// api/marking/lib/ledger-orchestrator.js
// Ledger Orchestrator — orchestrates the full Evidence Ledger write pipeline:
// attempt → mark_run → decisions → error_events
// Handles run-level idempotency reuse and graceful degradation at each stage.
// Requirements: 2.5, 5.1, 5.2, 5.3, 5.4, 8.2

import { createOrReuseAttempt } from './attempt-repository.js';
import { createOrReuseMarkRun, updateMarkRunStatus } from './mark-run-repository-v2.js';
import { writeDecisions } from './decision-writer.js';
import { writeErrorEvents } from './error-event-writer.js';

/**
 * Orchestrate the full Evidence Ledger write pipeline.
 *
 * Flow: attempt → mark_run → decisions → error_events
 *
 * Degradation rules:
 * - Decision write failure → update mark_run status=failed, decision_write_status=failed
 * - Error event write failure → log warning, do not affect scoring response
 * - New table failures never block legacy writes or scoring response
 *
 * @param {object} params
 * @param {object} params.supabase - Supabase service-role client
 * @param {string} params.user_id - from auth.uid()
 * @param {string} params.question_id - stable question entity UUID (required)
 * @param {string|null} params.paper_id - paper entity UUID (optional)
 * @param {string} params.storage_key
 * @param {number} params.q_number
 * @param {string|null} params.subpart
 * @param {object[]} params.student_steps - [{step_id, text}]
 * @param {string} params.idempotency_key - from X-Request-Id (attempt idempotency)
 * @param {string|null} params.run_idempotency_key - from X-Run-Id (run idempotency, optional)
 * @param {string} params.engine_version
 * @param {string} params.rubric_version
 * @param {object[]} params.rubric_points - resolved rubric points
 * @param {object[]} params.decisions - Decision Engine output
 * @param {object} params.request_summary
 * @param {object} params.response_summary
 * @returns {Promise<{attempt_id: string, mark_run_id: string, decision_write_status: string, error_event_count: number, is_reused_run: boolean}>}
 */
export async function writeLedger(params) {
  const {
    supabase,
    user_id,
    question_id,
    paper_id = null,
    storage_key,
    q_number,
    subpart = null,
    student_steps = [],
    idempotency_key,
    run_idempotency_key = null,
    engine_version,
    rubric_version,
    rubric_points = [],
    decisions = [],
    request_summary = {},
    response_summary = {},
  } = params;

  // ── Stage 1: Create or reuse Attempt ────────────────────────────────────
  console.log(JSON.stringify({
    event: 'ledger_orchestrator_start',
    user_id,
    idempotency_key,
    run_idempotency_key,
    ts: new Date().toISOString(),
  }));

  const attemptResult = await createOrReuseAttempt({
    supabase,
    user_id,
    question_id,
    paper_id,
    storage_key,
    q_number,
    subpart,
    submitted_steps: student_steps,
    idempotency_key,
  });

  const { attempt_id, topic_path, node_id } = attemptResult;

  console.log(JSON.stringify({
    event: 'ledger_orchestrator_attempt_done',
    attempt_id,
    is_new_attempt: attemptResult.is_new,
    ts: new Date().toISOString(),
  }));

  // ── Stage 2: Create or reuse Mark Run ───────────────────────────────────
  const markRunResult = await createOrReuseMarkRun({
    supabase,
    attempt_id,
    run_idempotency_key,
    engine_version,
    rubric_version,
    decisions,
    rubric_points,
    request_summary,
    response_summary,
  });

  const { mark_run_id, is_new: is_new_run } = markRunResult;

  console.log(JSON.stringify({
    event: 'ledger_orchestrator_mark_run_done',
    mark_run_id,
    is_new_run,
    ts: new Date().toISOString(),
  }));

  // ── Short-circuit: reused run → skip decisions & error_events ───────────
  if (run_idempotency_key && !is_new_run) {
    console.log(JSON.stringify({
      event: 'ledger_orchestrator_run_reused',
      mark_run_id,
      run_idempotency_key,
      ts: new Date().toISOString(),
    }));

    return {
      attempt_id,
      mark_run_id,
      decision_write_status: 'skipped',
      error_event_count: 0,
      is_reused_run: true,
    };
  }

  // ── Stage 3: Write Decisions ────────────────────────────────────────────
  let decision_write_status = 'pending';
  let writtenDecisions = [];

  try {
    const decisionResult = await writeDecisions({
      supabase,
      mark_run_id,
      decisions,
    });

    if (decisionResult.status === 'failed') {
      decision_write_status = 'failed';

      console.error(JSON.stringify({
        event: 'ledger_orchestrator_decision_write_failed',
        mark_run_id,
        error: decisionResult.error,
        ts: new Date().toISOString(),
      }));

      // Update mark_run to reflect failure
      await updateMarkRunStatus(supabase, mark_run_id, 'failed', 'failed');

      return {
        attempt_id,
        mark_run_id,
        decision_write_status: 'failed',
        error_event_count: 0,
        is_reused_run: false,
      };
    }

    decision_write_status = 'success';
    writtenDecisions = decisionResult.decisions || [];

    // Update mark_run to completed
    await updateMarkRunStatus(supabase, mark_run_id, 'completed', 'success');

    console.log(JSON.stringify({
      event: 'ledger_orchestrator_decisions_done',
      mark_run_id,
      count: decisionResult.count,
      ts: new Date().toISOString(),
    }));
  } catch (err) {
    decision_write_status = 'failed';

    console.error(JSON.stringify({
      event: 'ledger_orchestrator_decision_write_exception',
      mark_run_id,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));

    await updateMarkRunStatus(supabase, mark_run_id, 'failed', 'failed');

    return {
      attempt_id,
      mark_run_id,
      decision_write_status: 'failed',
      error_event_count: 0,
      is_reused_run: false,
    };
  }

  // ── Stage 4: Write Error Events (non-blocking) ─────────────────────────
  let error_event_count = 0;

  try {
    const errorResult = await writeErrorEvents({
      supabase,
      attempt_id,
      topic_path,
      node_id,
      mark_decisions: writtenDecisions,
    });

    if (errorResult.status === 'failed') {
      console.warn(JSON.stringify({
        event: 'ledger_orchestrator_error_events_failed',
        attempt_id,
        error: errorResult.error,
        ts: new Date().toISOString(),
      }));
      // error_event_count stays 0 — does not affect scoring response
    } else {
      error_event_count = errorResult.count || 0;
    }

    console.log(JSON.stringify({
      event: 'ledger_orchestrator_error_events_done',
      attempt_id,
      count: error_event_count,
      ts: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn(JSON.stringify({
      event: 'ledger_orchestrator_error_events_exception',
      attempt_id,
      error: err?.message || String(err),
      ts: new Date().toISOString(),
    }));
    // error_event_count stays 0 — does not affect scoring response
  }

  return {
    attempt_id,
    mark_run_id,
    decision_write_status,
    error_event_count,
    is_reused_run: false,
  };
}
