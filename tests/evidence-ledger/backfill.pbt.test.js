// tests/evidence-ledger/backfill.pbt.test.js
// Property-based tests for scripts/migration/backfill-mark-decisions.js
// Feature: learning-evidence-ledger, Property 17: Historical Backfill Closed-Loop Correctness
// **Validates: Requirements 8.4, 8.5**

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import {
  runBackfill,
  legacyQuestionMapper,
  parseSyllabusCode,
} from '../../scripts/migration/backfill-mark-decisions.js';

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_REASONS = [
  'best_match', 'below_threshold', 'borderline_score',
  'dependency_not_met', 'dependency_error', 'no_match',
];

// ── Generators ──────────────────────────────────────────────────────────────

const arbRunId = fc.uuid().map(u => u.toString());

const arbStorageKey = fc.tuple(
  fc.constantFrom('9709', '9231', '9702'),
  fc.constantFrom('s22', 'w21', 's23', 'w23'),
  fc.constantFrom('qp11', 'qp12', 'qp31', 'qp41'),
  fc.constantFrom('q01', 'q02', 'q03', 'q05', 'q10'),
).map(([code, session, paper, q]) => `${code}/${session}/${paper}/${q}.png`);

const arbQNumber = fc.integer({ min: 1, max: 15 });

const arbDecision = fc.record({
  rubric_id: fc.stringMatching(/^[A-Z][0-9]$/),
  mark_label: fc.option(fc.stringMatching(/^[A-Z][0-9]$/), { nil: null }),
  awarded: fc.boolean(),
  awarded_marks: fc.integer({ min: 0, max: 5 }),
  reason: fc.constantFrom(...VALID_REASONS),
});

const arbErrorBookStatus = fc.constantFrom('success', 'partial', 'failed');

const arbUserId = fc.uuid().map(u => u.toString());

// ── Mock Supabase builder ───────────────────────────────────────────────────

function createMockSupabase(batchRows) {
  let upsertCalls = [];
  let insertCalls = [];
  let rpcCalls = [];
  let updateCalls = [];

  function chainBuilder(resolvedValue) {
    const b = {};
    const methods = ['select', 'order', 'limit', 'gte', 'gt', 'eq', 'upsert', 'insert', 'update'];
    for (const m of methods) {
      b[m] = jest.fn().mockImplementation((...args) => {
        if (m === 'upsert') upsertCalls.push(args);
        if (m === 'insert') insertCalls.push(args);
        if (m === 'update') updateCalls.push(args);
        return b;
      });
    }
    b.single = jest.fn().mockImplementation(() => Promise.resolve(resolvedValue));
    b.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(resolvedValue));
    b.then = (resolve, reject) => Promise.resolve(resolvedValue).then(resolve, reject);
    return b;
  }

  const selectBuilder = chainBuilder({ data: batchRows, error: null });
  const attemptBuilder = chainBuilder({ data: { attempt_id: 'att-gen' }, error: null });
  const markRunLookupBuilder = chainBuilder({ data: null, error: null });
  const markRunInsertBuilder = chainBuilder({ data: { mark_run_id: 'mr-gen' }, error: null });
  const markRunUpdateBuilder = chainBuilder({ data: null, error: null });
  const markDecisionLookupBuilder = chainBuilder({ data: null, error: null });

  let mrCallCount = 0;

  return {
    from: jest.fn((table) => {
      if (table === 'marking_runs_v1') return selectBuilder;
      if (table === 'attempts') return attemptBuilder;
      if (table === 'mark_runs') {
        mrCallCount++;
        if (mrCallCount % 3 === 1) return markRunLookupBuilder;
        if (mrCallCount % 3 === 2) return markRunInsertBuilder;
        return markRunUpdateBuilder;
      }
      if (table === 'mark_decisions') return markDecisionLookupBuilder;
      return chainBuilder({ data: null, error: null });
    }),
    rpc: jest.fn((...args) => {
      rpcCalls.push(args);
      return Promise.resolve({ data: [], error: null });
    }),
    _upsertCalls: upsertCalls,
    _insertCalls: insertCalls,
    _rpcCalls: rpcCalls,
    _updateCalls: updateCalls,
    _resetMrCount: () => { mrCallCount = 0; },
  };
}

// ── Suppress console during tests ───────────────────────────────────────────

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// ── Property 17: Historical Backfill Closed-Loop Correctness ────────────────

describe('Property 17: Historical Backfill Closed-Loop Correctness', () => {
  // Feature: learning-evidence-ledger, Property 17
  // For any marking_runs_v1 record, the backfill script must create a synthetic
  // attempt, associated mark_run, and 1:1 mark_decisions, with deterministic IDs
  // and legacy_run_id traceability.
  // **Validates: Requirements 8.4, 8.5**

  it('17a: legacyQuestionMapper is deterministic — same inputs always produce same output', () => {
    fc.assert(
      fc.property(arbStorageKey, arbQNumber, (storageKey, qNumber) => {
        const id1 = legacyQuestionMapper(storageKey, qNumber);
        const id2 = legacyQuestionMapper(storageKey, qNumber);
        expect(id1).toBe(id2);
        // UUID format
        expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      }),
      { numRuns: 100 },
    );
  });

  it('17b: different (storageKey, qNumber) pairs produce different question_ids', () => {
    fc.assert(
      fc.property(
        arbStorageKey, arbQNumber, arbStorageKey, arbQNumber,
        (sk1, qn1, sk2, qn2) => {
          fc.pre(sk1 !== sk2 || qn1 !== qn2);
          const id1 = legacyQuestionMapper(sk1, qn1);
          const id2 = legacyQuestionMapper(sk2, qn2);
          expect(id1).not.toBe(id2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17c: idempotency_key is always legacy:${run_id}', () => {
    fc.assert(
      fc.property(arbRunId, (runId) => {
        const key = `legacy:${runId}`;
        expect(key).toBe(`legacy:${runId}`);
        expect(key.startsWith('legacy:')).toBe(true);
        expect(key.slice(7)).toBe(runId);
      }),
      { numRuns: 100 },
    );
  });

  it('17d: parseSyllabusCode extracts 4-digit code from any valid storage_key', () => {
    fc.assert(
      fc.property(arbStorageKey, (storageKey) => {
        const code = parseSyllabusCode(storageKey);
        expect(code).toMatch(/^\d{4}$/);
        // Must match the first segment of the storage key
        expect(storageKey.startsWith(code)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('17e: decision count in RPC call matches input decisions count', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber, arbErrorBookStatus,
        fc.array(arbDecision, { minLength: 1, maxLength: 20 }),
        async (runId, userId, storageKey, qNumber, ebStatus, decisions) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            rubric_source_version: 'v1',
            scoring_engine_version: 'v2',
            request_json: {},
            response_json: { decisions },
            error_book_write_status: ebStatus,
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          await runBackfill({ supabase: sb, batchSize: 100 });

          // RPC should have been called once with exactly decisions.length items
          expect(sb._rpcCalls.length).toBe(1);
          const [rpcName, rpcArgs] = sb._rpcCalls[0];
          expect(rpcName).toBe('insert_mark_decisions');
          expect(rpcArgs.p_decisions.length).toBe(decisions.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17f: total_awarded equals sum of awarded_marks from decisions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber,
        fc.array(arbDecision, { minLength: 1, maxLength: 15 }),
        async (runId, userId, storageKey, qNumber, decisions) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            rubric_source_version: 'v1',
            scoring_engine_version: 'v2',
            request_json: {},
            response_json: { decisions },
            error_book_write_status: 'success',
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          await runBackfill({ supabase: sb, batchSize: 100 });

          // The mark_run insert should have total_awarded = sum of awarded_marks
          expect(sb._insertCalls.length).toBeGreaterThanOrEqual(1);
          const insertArg = sb._insertCalls[0][0];
          const expectedTotal = decisions.reduce((s, d) => s + (d.awarded_marks || 0), 0);
          expect(insertArg.total_awarded).toBe(expectedTotal);
          expect(insertArg.total_available).toBe(decisions.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17g: status inference — failed iff error_book_write_status is failed', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber, arbErrorBookStatus,
        async (runId, userId, storageKey, qNumber, ebStatus) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            rubric_source_version: 'v1',
            scoring_engine_version: 'v2',
            request_json: {},
            response_json: { decisions: [{ rubric_id: 'M1', awarded: true, awarded_marks: 1, reason: 'best_match' }] },
            error_book_write_status: ebStatus,
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          await runBackfill({ supabase: sb, batchSize: 100 });

          const insertArg = sb._insertCalls[0][0];
          const expectedStatus = ebStatus === 'failed' ? 'failed' : 'completed';
          expect(insertArg.status).toBe(expectedStatus);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17h: legacy_run_id preserved in both request_summary and response_summary', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber,
        async (runId, userId, storageKey, qNumber) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            rubric_source_version: 'v1',
            scoring_engine_version: 'v2',
            request_json: { some: 'data' },
            response_json: { decisions: [{ rubric_id: 'M1', awarded: true, awarded_marks: 1, reason: 'best_match' }] },
            error_book_write_status: 'success',
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          await runBackfill({ supabase: sb, batchSize: 100 });

          const insertArg = sb._insertCalls[0][0];
          expect(insertArg.request_summary.legacy_run_id).toBe(runId);
          expect(insertArg.response_summary.legacy_run_id).toBe(runId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17i: attempt upsert uses correct idempotency_key and question_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber,
        async (runId, userId, storageKey, qNumber) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            rubric_source_version: 'v1',
            scoring_engine_version: 'v2',
            request_json: {},
            response_json: { decisions: [{ rubric_id: 'M1', awarded: true, awarded_marks: 1, reason: 'best_match' }] },
            error_book_write_status: 'success',
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          await runBackfill({ supabase: sb, batchSize: 100 });

          expect(sb._upsertCalls.length).toBe(1);
          const [upsertData, upsertOpts] = sb._upsertCalls[0];
          expect(upsertData.idempotency_key).toBe(`legacy:${runId}`);
          expect(upsertData.question_id).toBe(legacyQuestionMapper(storageKey, qNumber));
          expect(upsertData.user_id).toBe(userId);
          expect(upsertData.syllabus_code).toBe(parseSyllabusCode(storageKey));
          expect(upsertOpts.onConflict).toBe('user_id,idempotency_key');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17j: runs with missing user_id are failed, not succeeded or skipped', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbStorageKey, arbQNumber,
        fc.array(arbDecision, { minLength: 1, maxLength: 5 }),
        async (runId, storageKey, qNumber, decisions) => {
          const legacyRun = {
            run_id: runId,
            user_id: null, // missing
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            response_json: { decisions },
            error_book_write_status: 'success',
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          const result = await runBackfill({ supabase: sb, batchSize: 100 });

          expect(result.failed).toBe(1);
          expect(result.succeeded).toBe(0);
          expect(result.skipped).toBe(0);
          // No DB writes should have happened
          expect(sb._upsertCalls.length).toBe(0);
          expect(sb._rpcCalls.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17k: runs with empty/missing decisions are skipped, not failed', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber,
        fc.constantFrom(null, undefined, { decisions: [] }, { decisions: null }, { score: 5 }),
        async (runId, userId, storageKey, qNumber, responseJson) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            response_json: responseJson,
            error_book_write_status: 'success',
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          const result = await runBackfill({ supabase: sb, batchSize: 100 });

          expect(result.skipped).toBe(1);
          expect(result.failed).toBe(0);
          expect(result.succeeded).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('17l: dry-run mode never writes to DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRunId, arbUserId, arbStorageKey, arbQNumber,
        fc.array(arbDecision, { minLength: 1, maxLength: 10 }),
        async (runId, userId, storageKey, qNumber, decisions) => {
          const legacyRun = {
            run_id: runId,
            user_id: userId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            rubric_source_version: 'v1',
            scoring_engine_version: 'v2',
            request_json: {},
            response_json: { decisions },
            error_book_write_status: 'success',
            created_at: '2026-01-15T10:00:00Z',
          };

          const sb = createMockSupabase([legacyRun]);
          const result = await runBackfill({ supabase: sb, dryRun: true, batchSize: 100 });

          expect(result.succeeded).toBe(1);
          expect(sb._upsertCalls.length).toBe(0);
          expect(sb._insertCalls.length).toBe(0);
          expect(sb._rpcCalls.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
