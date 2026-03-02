// tests/evidence-ledger/backfill.test.js
// Unit tests for scripts/migration/backfill-mark-decisions.js
// Covers: runBackfill, legacyQuestionMapper, parseSyllabusCode, parseArgs
// Validates: Requirements 8.4, 8.5

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  runBackfill,
  legacyQuestionMapper,
  parseSyllabusCode,
  parseArgs,
} from '../../scripts/migration/backfill-mark-decisions.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeLegacyRun(overrides = {}) {
  return {
    run_id: 'legacy-run-001',
    user_id: 'user-001',
    storage_key: '9709/s22/qp11/q01.png',
    q_number: 1,
    subpart: null,
    rubric_source_version: 'v1.0',
    scoring_engine_version: 'v2.0',
    request_json: { prompt: 'test' },
    response_json: {
      decisions: [
        { rubric_id: 'r1', mark_label: 'M1', awarded: true, awarded_marks: 1, reason: 'best_match' },
        { rubric_id: 'r2', mark_label: 'A1', awarded: false, awarded_marks: 0, reason: 'below_threshold' },
      ],
    },
    error_book_write_status: 'success',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create a chainable query builder mock.
 * Every method returns `this` (the builder) except terminal calls.
 */
function chainBuilder(resolvedValue = { data: null, error: null }) {
  const b = {
    _resolved: resolvedValue,
    select: jest.fn().mockImplementation(() => b),
    order: jest.fn().mockImplementation(() => b),
    limit: jest.fn().mockImplementation(() => b),
    gte: jest.fn().mockImplementation(() => b),
    gt: jest.fn().mockImplementation(() => b),
    eq: jest.fn().mockImplementation(() => b),
    upsert: jest.fn().mockImplementation(() => b),
    insert: jest.fn().mockImplementation(() => b),
    update: jest.fn().mockImplementation(() => b),
    single: jest.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    maybeSingle: jest.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    // Make the builder thenable for non-.single() terminal usage
    then: (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return b;
}

/**
 * Build a mock Supabase client.
 *
 * The backfill script calls supabase.from() for three tables:
 *   - marking_runs_v1 (SELECT batch)
 *   - attempts (UPSERT)
 *   - mark_runs (INSERT then UPDATE)
 * And supabase.rpc() for insert_mark_decisions.
 *
 * Each option lets you override the resolved value for that table's chain.
 */
function createMockSupabase({
  batchRows = [makeLegacyRun()],
  fetchError = null,
  attemptData = { attempt_id: 'att-001' },
  attemptError = null,
  markRunLookupData = null,
  markRunLookupError = null,
  markRunData = { mark_run_id: 'mr-001' },
  markRunError = null,
  markDecisionLookupData = null,
  markDecisionLookupError = null,
  rpcError = null,
  updateError = null,
} = {}) {
  // marking_runs_v1 SELECT chain
  const selectBuilder = chainBuilder({ data: batchRows, error: fetchError });

  // attempts UPSERT chain — terminal is .single()
  const attemptBuilder = chainBuilder({ data: attemptData, error: attemptError });

  // mark_runs LOOKUP chain — terminal is .maybeSingle()
  const markRunLookupBuilder = chainBuilder({ data: markRunLookupData, error: markRunLookupError });

  // mark_runs INSERT chain — terminal is .single()
  const markRunInsertBuilder = chainBuilder({ data: markRunData, error: markRunError });

  // mark_runs UPDATE chain — terminal is .eq() (thenable)
  const markRunUpdateBuilder = chainBuilder({ data: null, error: updateError });

  // mark_decisions lookup chain (used when mark_run is reused)
  const markDecisionLookupBuilder = chainBuilder({
    data: markDecisionLookupData,
    error: markDecisionLookupError,
  });

  // Track which mark_runs operation we're on (lookup -> insert -> update)
  let markRunCallCount = 0;

  const fromFn = jest.fn((table) => {
    if (table === 'marking_runs_v1') return selectBuilder;
    if (table === 'attempts') return attemptBuilder;
    if (table === 'mark_runs') {
      markRunCallCount++;
      if (markRunCallCount % 3 === 1) return markRunLookupBuilder;
      if (markRunCallCount % 3 === 2) return markRunInsertBuilder;
      return markRunUpdateBuilder;
    }
    if (table === 'mark_decisions') return markDecisionLookupBuilder;
    return chainBuilder();
  });

  return {
    from: fromFn,
    rpc: jest.fn().mockResolvedValue({ data: [], error: rpcError }),
    _selectBuilder: selectBuilder,
    _attemptBuilder: attemptBuilder,
    _markRunLookupBuilder: markRunLookupBuilder,
    _markRunInsertBuilder: markRunInsertBuilder,
    _markRunUpdateBuilder: markRunUpdateBuilder,
    _markDecisionLookupBuilder: markDecisionLookupBuilder,
  };
}

// Suppress console.log/error during tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// ── legacyQuestionMapper ────────────────────────────────────────────────────

describe('legacyQuestionMapper()', () => {
  it('generates a deterministic UUID from storage_key + q_number', () => {
    const id1 = legacyQuestionMapper('9709/s22/qp11/q01.png', 1);
    const id2 = legacyQuestionMapper('9709/s22/qp11/q01.png', 1);
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different inputs', () => {
    const id1 = legacyQuestionMapper('9709/s22/qp11/q01.png', 1);
    const id2 = legacyQuestionMapper('9709/s22/qp11/q01.png', 2);
    const id3 = legacyQuestionMapper('9709/s22/qp12/q01.png', 1);
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
  });

  it('returns UUID-formatted string (8-4-4-4-12)', () => {
    const id = legacyQuestionMapper('9709/s22/qp11/q01.png', 1);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

// ── parseSyllabusCode ───────────────────────────────────────────────────────

describe('parseSyllabusCode()', () => {
  it('extracts 4-digit code from storage_key', () => {
    expect(parseSyllabusCode('9709/s22/qp11/q01.png')).toBe('9709');
    expect(parseSyllabusCode('9231/w21/qp12/q03.png')).toBe('9231');
    expect(parseSyllabusCode('9702/s23/qp11/q05.png')).toBe('9702');
  });

  it('returns null for invalid inputs', () => {
    expect(parseSyllabusCode(null)).toBeNull();
    expect(parseSyllabusCode(undefined)).toBeNull();
    expect(parseSyllabusCode('')).toBeNull();
    expect(parseSyllabusCode(123)).toBeNull();
    expect(parseSyllabusCode('abc/test')).toBeNull();
  });
});

// ── parseArgs ───────────────────────────────────────────────────────────────

describe('parseArgs()', () => {
  it('returns defaults when no args', () => {
    expect(parseArgs(['node', 'script.js'])).toEqual({
      dryRun: false, batchSize: 100, since: null, cursor: null,
    });
  });

  it('parses --dry-run', () => {
    expect(parseArgs(['node', 'script.js', '--dry-run']).dryRun).toBe(true);
  });

  it('parses --batch-size N', () => {
    expect(parseArgs(['node', 'script.js', '--batch-size', '50']).batchSize).toBe(50);
  });

  it('parses --batch-size=N', () => {
    expect(parseArgs(['node', 'script.js', '--batch-size=200']).batchSize).toBe(200);
  });

  it('parses --since ISO_DATE', () => {
    expect(parseArgs(['node', 'script.js', '--since', '2026-01-01']).since).toBe('2026-01-01');
  });

  it('parses --cursor CURSOR_ID', () => {
    expect(parseArgs(['node', 'script.js', '--cursor', 'abc-123']).cursor).toBe('abc-123');
  });
});

// ── runBackfill ─────────────────────────────────────────────────────────────

describe('runBackfill()', () => {
  // 1. Processes a valid legacy run end-to-end
  it('processes a valid legacy run end-to-end (attempt + mark_run + decisions)', async () => {
    const sb = createMockSupabase();
    const result = await runBackfill({ supabase: sb, batchSize: 100 });

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);

    // Verify attempt upsert was called
    expect(sb.from).toHaveBeenCalledWith('attempts');
    expect(sb._attemptBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-001',
        idempotency_key: 'legacy:legacy-run-001',
        storage_key: '9709/s22/qp11/q01.png',
        q_number: 1,
        syllabus_code: '9709',
        submitted_steps: [],
      }),
      { onConflict: 'user_id,idempotency_key' },
    );

    // Verify mark_run insert was called
    expect(sb.from).toHaveBeenCalledWith('mark_runs');
    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt_id: 'att-001',
        engine_version: 'v2.0',
        rubric_version: 'v1.0',
        status: 'completed',
        decision_write_status: 'pending',
      }),
    );

    // Verify RPC was called for decisions
    expect(sb.rpc).toHaveBeenCalledWith('insert_mark_decisions', {
      p_mark_run_id: 'mr-001',
      p_decisions: expect.arrayContaining([
        expect.objectContaining({ rubric_id: 'r1', awarded: true }),
        expect.objectContaining({ rubric_id: 'r2', awarded: false }),
      ]),
    });
  });

  // 2. Skips runs with missing user_id (logs failure)
  it('skips runs with missing user_id and increments failed count', async () => {
    const sb = createMockSupabase({
      batchRows: [makeLegacyRun({ user_id: null })],
    });
    const result = await runBackfill({ supabase: sb });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
    // Should NOT call attempts upsert
    expect(sb._attemptBuilder.upsert).not.toHaveBeenCalled();
  });

  // 3. Skips runs with no decisions in response_json
  it('skips runs with empty decisions array', async () => {
    const sb = createMockSupabase({
      batchRows: [makeLegacyRun({ response_json: { decisions: [] } })],
    });
    const result = await runBackfill({ supabase: sb });

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  // 4. Handles response_json being null/undefined
  it('skips runs with null response_json', async () => {
    const sb = createMockSupabase({
      batchRows: [makeLegacyRun({ response_json: null })],
    });
    const result = await runBackfill({ supabase: sb });

    expect(result.skipped).toBe(1);
  });

  it('skips runs with undefined response_json', async () => {
    const sb = createMockSupabase({
      batchRows: [makeLegacyRun({ response_json: undefined })],
    });
    const result = await runBackfill({ supabase: sb });

    expect(result.skipped).toBe(1);
  });

  it('skips runs with response_json missing decisions key', async () => {
    const sb = createMockSupabase({
      batchRows: [makeLegacyRun({ response_json: { score: 5 } })],
    });
    const result = await runBackfill({ supabase: sb });

    expect(result.skipped).toBe(1);
  });

  // 5. Generates deterministic question_id from storage_key + q_number
  it('generates deterministic question_id in attempt upsert', async () => {
    const run = makeLegacyRun({ storage_key: '9709/s22/qp11/q01.png', q_number: 3 });
    const expectedQid = legacyQuestionMapper('9709/s22/qp11/q01.png', 3);
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._attemptBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ question_id: expectedQid }),
      expect.any(Object),
    );
  });

  // 6. Uses idempotency_key = `legacy:${run_id}`
  it('uses idempotency_key = legacy:${run_id}', async () => {
    const run = makeLegacyRun({ run_id: 'my-special-run-id' });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._attemptBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: 'legacy:my-special-run-id' }),
      expect.any(Object),
    );
  });

  // 7. Preserves legacy_run_id in request_summary and response_summary
  it('preserves legacy_run_id in request_summary and response_summary', async () => {
    const run = makeLegacyRun({ run_id: 'trace-run-42', request_json: { foo: 'bar' } });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_summary: expect.objectContaining({ legacy_run_id: 'trace-run-42', foo: 'bar' }),
        response_summary: expect.objectContaining({ legacy_run_id: 'trace-run-42' }),
      }),
    );
  });

  // 8. Infers status from error_book_write_status
  it('infers status=failed when error_book_write_status is failed', async () => {
    const run = makeLegacyRun({ error_book_write_status: 'failed' });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('infers status=completed when error_book_write_status is success', async () => {
    const run = makeLegacyRun({ error_book_write_status: 'success' });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('infers status=completed when error_book_write_status is partial', async () => {
    const run = makeLegacyRun({ error_book_write_status: 'partial' });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
  });

  // 9. Respects --dry-run (no writes)
  it('does not write to DB when dryRun=true', async () => {
    const sb = createMockSupabase();
    const result = await runBackfill({ supabase: sb, dryRun: true });

    expect(result.succeeded).toBe(1);
    expect(result.processed).toBe(1);
    // Should NOT call upsert, insert, or rpc
    expect(sb._attemptBuilder.upsert).not.toHaveBeenCalled();
    expect(sb._markRunInsertBuilder.insert).not.toHaveBeenCalled();
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  // 10. Respects --batch-size
  it('passes batchSize as limit to the query', async () => {
    const sb = createMockSupabase({ batchRows: [] });
    await runBackfill({ supabase: sb, batchSize: 25 });

    expect(sb._selectBuilder.limit).toHaveBeenCalledWith(25);
  });

  // 11. Respects --since filter
  it('applies since filter via .gte()', async () => {
    const sb = createMockSupabase({ batchRows: [] });
    await runBackfill({ supabase: sb, since: '2026-01-01T00:00:00Z' });

    expect(sb._selectBuilder.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z');
  });

  // 12. Respects --cursor for resume
  it('applies cursor filter via .gt()', async () => {
    const sb = createMockSupabase({ batchRows: [] });
    await runBackfill({ supabase: sb, cursor: 'resume-run-id' });

    expect(sb._selectBuilder.gt).toHaveBeenCalledWith('run_id', 'resume-run-id');
  });

  // 13. Handles attempt upsert errors gracefully
  it('increments failed count on attempt upsert error', async () => {
    const sb = createMockSupabase({
      attemptData: null,
      attemptError: { message: 'constraint violation' },
    });
    // Override .single() to return the error
    sb._attemptBuilder.single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'constraint violation' },
    });

    const result = await runBackfill({ supabase: sb });

    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  // 14. Handles mark_run insert errors gracefully
  it('increments failed count on mark_run insert error', async () => {
    const sb = createMockSupabase({
      markRunData: null,
      markRunError: { message: 'insert failed' },
    });
    sb._markRunInsertBuilder.single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    });

    const result = await runBackfill({ supabase: sb });

    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  // 15. Handles decisions RPC errors gracefully
  it('increments failed count on decisions RPC error', async () => {
    const sb = createMockSupabase({
      rpcError: { message: 'rpc timeout' },
    });

    const result = await runBackfill({ supabase: sb });

    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  // 16. Returns correct counts
  it('returns correct counts for mixed batch (success + skip + fail)', async () => {
    const validRun = makeLegacyRun({ run_id: 'run-ok' });
    const noUserRun = makeLegacyRun({ run_id: 'run-no-user', user_id: null });
    const noDecRun = makeLegacyRun({ run_id: 'run-no-dec', response_json: { decisions: [] } });

    const sb = createMockSupabase({
      batchRows: [validRun, noUserRun, noDecRun],
    });

    const result = await runBackfill({ supabase: sb });

    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.nextCursor).toBe('run-no-dec');
  });

  // Edge: empty batch returns zeros
  it('returns zeros when no legacy runs exist', async () => {
    const sb = createMockSupabase({ batchRows: [] });
    const result = await runBackfill({ supabase: sb });

    expect(result).toEqual({
      processed: 0, succeeded: 0, failed: 0, skipped: 0, nextCursor: null,
    });
  });

  // Edge: fetch error breaks the loop
  it('breaks on fetch error and returns partial counts', async () => {
    const sb = createMockSupabase({ fetchError: { message: 'connection refused' } });
    const result = await runBackfill({ supabase: sb });

    expect(result.processed).toBe(0);
  });

  // Edge: decisions with missing fields get defaults
  it('applies defaults for missing decision fields', async () => {
    const run = makeLegacyRun({
      response_json: {
        decisions: [{ /* all fields missing */ }],
      },
    });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb.rpc).toHaveBeenCalledWith('insert_mark_decisions', {
      p_mark_run_id: 'mr-001',
      p_decisions: [
        expect.objectContaining({
          rubric_id: 'unknown',
          mark_label: null,
          awarded: false,
          awarded_marks: 0,
          reason: 'no_match',
        }),
      ],
    });
  });

  // Edge: computes total_awarded correctly
  it('computes total_awarded from decisions', async () => {
    const run = makeLegacyRun({
      response_json: {
        decisions: [
          { rubric_id: 'r1', awarded: true, awarded_marks: 2, reason: 'best_match' },
          { rubric_id: 'r2', awarded: true, awarded_marks: 3, reason: 'best_match' },
          { rubric_id: 'r3', awarded: false, awarded_marks: 0, reason: 'no_match' },
        ],
      },
    });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        total_awarded: 5,
        total_available: 3,
      }),
    );
  });

  // Edge: null request_json doesn't crash spread
  it('handles null request_json without crashing', async () => {
    const run = makeLegacyRun({ request_json: null });
    const sb = createMockSupabase({ batchRows: [run] });

    const result = await runBackfill({ supabase: sb });
    expect(result.succeeded).toBe(1);
  });

  // Edge: missing engine/rubric versions default to 'legacy'
  it('defaults engine_version and rubric_version to legacy', async () => {
    const run = makeLegacyRun({
      scoring_engine_version: null,
      rubric_source_version: null,
    });
    const sb = createMockSupabase({ batchRows: [run] });

    await runBackfill({ supabase: sb });

    expect(sb._markRunInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        engine_version: 'legacy',
        rubric_version: 'legacy',
      }),
    );
  });
});
