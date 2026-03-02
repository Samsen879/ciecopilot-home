// /api/marking/evaluate-v1.js
// Smart Mark Engine v1 — DB-backed online scoring endpoint.
// Consumes B1 ready rubric from Supabase; does NOT accept client-supplied rubric_points.
// All scoring evidence is persisted via the Evidence Ledger (attempts → mark_runs → mark_decisions → error_events).

import crypto from 'node:crypto';
import { getServiceClient } from '../lib/supabase/client.js';
import { resolveRubric, RubricNotReadyError, RubricContractInvalidError } from './lib/rubric-resolver-v1.js';
import { runDecisionEngine, SCORING_ENGINE_VERSION as ENGINE_VERSION } from './lib/decision-engine-v1.js';
import { resolveUserId, AuthError } from './lib/auth-helper.js';
import { resolveQuestionId, ValidationError } from './lib/attempt-repository.js';
import { writeLedger } from './lib/ledger-orchestrator.js';

// ── Feature flag (evaluated per-request so env changes take effect) ──────────
function isV1Enabled() {
  return process.env.MARKING_V1_ENABLED === 'true';
}

// ── Unified error codes ─────────────────────────────────────────────────────
const ErrorCodes = Object.freeze({
  METHOD_NOT_ALLOWED:       { status: 405, code: 'method_not_allowed' },
  FEATURE_DISABLED:         { status: 503, code: 'feature_disabled' },
  MISSING_FIELDS:           { status: 400, code: 'missing_required_fields' },
  RUBRIC_INPUT_FORBIDDEN:   { status: 400, code: 'rubric_input_forbidden' },
  AUTH_FAILED:              { status: 401, code: 'auth_failed' },
  QUESTION_NOT_FOUND:       { status: 422, code: 'question_not_found' },
  RUBRIC_NOT_READY:         { status: 409, code: 'rubric_not_ready' },
  RUBRIC_CONTRACT_INVALID:  { status: 422, code: 'rubric_contract_invalid' },
  DECISION_ENGINE_FAILED:   { status: 500, code: 'decision_engine_failed' },
  INTERNAL_ERROR:           { status: 500, code: 'internal_error' },
});

// ── Supabase service-role client (lazy singleton) ───────────────────────────
let _supabase = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _supabase = getServiceClient();
  return _supabase;
}

// ── Request validation ──────────────────────────────────────────────────────
const REQUIRED_FIELDS = ['storage_key', 'q_number', 'student_steps'];

function validateRequest(body) {
  // Check forbidden field: rubric_points
  if (body.rubric_points !== undefined) {
    return {
      valid: false,
      error: ErrorCodes.RUBRIC_INPUT_FORBIDDEN,
      message: 'rubric_points must not be supplied to v1 endpoint; rubric is resolved server-side.',
    };
  }

  // Check required fields
  const missing = REQUIRED_FIELDS.filter((f) => {
    const val = body[f];
    if (val === undefined || val === null) return true;
    if (f === 'student_steps' && !Array.isArray(val)) return true;
    return false;
  });

  if (missing.length > 0) {
    return {
      valid: false,
      error: ErrorCodes.MISSING_FIELDS,
      message: `Missing required fields: ${missing.join(', ')}`,
    };
  }

  return { valid: true };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function errorResponse(res, errorDef, message, extra = {}) {
  return res.status(errorDef.status).json({
    error: errorDef.code,
    message,
    ...extra,
  });
}

// ── Scoring engine version constant (re-exported from decision engine) ──────
const SCORING_ENGINE_VERSION = ENGINE_VERSION;

// ── Main handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return errorResponse(res, ErrorCodes.METHOD_NOT_ALLOWED, 'Only POST is accepted.');
  }

  // Feature flag guard
  if (!isV1Enabled()) {
    return errorResponse(res, ErrorCodes.FEATURE_DISABLED, 'evaluate-v1 is not enabled. Set MARKING_V1_ENABLED=true.');
  }

  // Generate run_id early so it appears in every log & response
  const run_id = crypto.randomUUID();

  try {
    const body = req.body || {};

    // ── Validate request ──────────────────────────────────────────────────
    // user_id trust is handled by auth-helper (JWT first, legacy fallback to body.user_id).
    const validation = validateRequest(body);
    if (!validation.valid) {
      return errorResponse(res, validation.error, validation.message, { run_id });
    }

    const {
      storage_key,
      q_number,
      subpart = null,
      student_steps,
      rubric_source_version: requestedVersion = null,
      compat_mode = null,
    } = body;

    // ── Resolve trusted user_id (JWT required) ─────────────────────────────
    let user_id;
    try {
      const authResult = await resolveUserId(req);
      user_id = authResult.user_id;
    } catch (authErr) {
      if (authErr instanceof AuthError) {
        return errorResponse(res, ErrorCodes.AUTH_FAILED, authErr.message, { run_id });
      }
      throw authErr;
    }

    // ── Read idempotency headers ──────────────────────────────────────────
    const idempotency_key = req?.headers?.['x-request-id'] || crypto.randomUUID();
    const run_idempotency_key = req?.headers?.['x-run-id'] || null;

    // Ensure Supabase client is available
    const supabase = getSupabaseClient();

    // ── Resolve question_id ───────────────────────────────────────────────
    let question_id = null;
    let paper_id = null;

    try {
      const qResult = await resolveQuestionId(supabase, storage_key, q_number);
      question_id = qResult.question_id;
      paper_id = qResult.paper_id;
    } catch (qErr) {
      if (qErr instanceof ValidationError) {
        return errorResponse(res, ErrorCodes.QUESTION_NOT_FOUND, qErr.message, { run_id });
      }
      throw qErr;
    }

    // ── Audit log (structured) ────────────────────────────────────────────
    console.log(JSON.stringify({
      event: 'evaluate_v1_request',
      run_id,
      user_id,
      storage_key,
      q_number,
      subpart,
      rubric_source_version_requested: requestedVersion,
      student_steps_count: student_steps.length,
      ts: new Date().toISOString(),
    }));

    // ── Rubric Resolver (Task 4) ─────────────────────────────────────────
    const {
      rubric_source_version,
      rubric_points,
      rubric_rows_used,
    } = await resolveRubric({
      supabase,
      storage_key,
      q_number,
      subpart,
      rubric_source_version: requestedVersion,
    });

    // ── Decision Engine (Task 5) ─────────────────────────────────────────
    let decisions = [];
    let alignments;
    try {
      const engineResult = runDecisionEngine({
        student_steps,
        rubric_points,
        options: { compat_mode: compat_mode },
      });
      decisions = engineResult.decisions;
      if (engineResult.alignments) {
        alignments = engineResult.alignments;
      }
    } catch (engineError) {
      console.error(JSON.stringify({
        event: 'evaluate_v1_decision_engine_error',
        run_id,
        error: engineError?.message || String(engineError),
        ts: new Date().toISOString(),
      }));
      return errorResponse(res, ErrorCodes.DECISION_ENGINE_FAILED, engineError?.message || String(engineError), { run_id });
    }

    // ── Evidence Ledger write ─────────────────────────────────────────────
    let ledger_write_status = null;

    try {
      const ledgerResult = await writeLedger({
        supabase,
        user_id,
        question_id,
        paper_id,
        storage_key,
        q_number,
        subpart,
        student_steps,
        idempotency_key,
        run_idempotency_key,
        engine_version: SCORING_ENGINE_VERSION,
        rubric_version: rubric_source_version,
        rubric_points,
        decisions,
        request_summary: {
          student_steps_count: student_steps.length,
          rubric_source_version_requested: requestedVersion,
          compat_mode,
        },
        response_summary: {
          decisions,
          rubric_rows_used,
        },
      });

      ledger_write_status = ledgerResult.decision_write_status;

      console.log(JSON.stringify({
        event: 'evaluate_v1_ledger_write_done',
        run_id,
        attempt_id: ledgerResult.attempt_id,
        mark_run_id: ledgerResult.mark_run_id,
        decision_write_status: ledgerResult.decision_write_status,
        error_event_count: ledgerResult.error_event_count,
        is_reused_run: ledgerResult.is_reused_run,
        ts: new Date().toISOString(),
      }));
    } catch (ledgerErr) {
      // Ledger write failure must NOT block the scoring response
      ledger_write_status = 'failed';
      console.error(JSON.stringify({
        event: 'evaluate_v1_ledger_write_error',
        run_id,
        error: ledgerErr?.message || String(ledgerErr),
        ts: new Date().toISOString(),
      }));
    }

    // ── Build response ────────────────────────────────────────────────────
    const response = {
      run_id,
      rubric_source_version,
      scoring_engine_version: SCORING_ENGINE_VERSION,
      rubric_rows_used,
      decisions,
      ledger_write_status,
    };

    // Compat mode: attach alignments[] when requested
    if (compat_mode === 'v0' && alignments) {
      response.alignments = alignments;
    }

    // ── Audit log (response summary) ──────────────────────────────────────
    console.log(JSON.stringify({
      event: 'evaluate_v1_response',
      run_id,
      rubric_source_version,
      rubric_rows_used,
      decisions_count: decisions.length,
      ledger_write_status,
      ts: new Date().toISOString(),
    }));

    return res.status(200).json(response);
  } catch (error) {
    // Handle auth errors
    if (error instanceof AuthError) {
      return errorResponse(res, ErrorCodes.AUTH_FAILED, error.message, { run_id });
    }

    // Handle question_id resolution errors
    if (error instanceof ValidationError) {
      return errorResponse(res, ErrorCodes.QUESTION_NOT_FOUND, error.message, { run_id });
    }

    // Handle rubric resolver errors with proper status codes
    if (error instanceof RubricNotReadyError) {
      console.log(JSON.stringify({
        event: 'evaluate_v1_rubric_not_ready',
        run_id,
        error: error.message,
        ts: new Date().toISOString(),
      }));
      return errorResponse(res, ErrorCodes.RUBRIC_NOT_READY, error.message, { run_id });
    }

    if (error instanceof RubricContractInvalidError) {
      console.log(JSON.stringify({
        event: 'evaluate_v1_rubric_contract_invalid',
        run_id,
        error: error.message,
        details: error.details,
        ts: new Date().toISOString(),
      }));
      return errorResponse(res, ErrorCodes.RUBRIC_CONTRACT_INVALID, error.message, {
        run_id,
        details: error.details,
      });
    }

    console.error(JSON.stringify({
      event: 'evaluate_v1_error',
      run_id,
      error: error?.message || String(error),
      ts: new Date().toISOString(),
    }));

    return errorResponse(res, ErrorCodes.INTERNAL_ERROR, error?.message || String(error), { run_id });
  }
}
