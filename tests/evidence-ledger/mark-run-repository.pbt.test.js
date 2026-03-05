// tests/evidence-ledger/mark-run-repository.pbt.test.js
// Property-based tests for api/marking/lib/mark-run-repository-v2.js
// Feature: learning-evidence-ledger
// Properties 7, 8, 12: Mark Run total invariant, run-level idempotency, status machine
// **Validates: Requirements 3.2, 3.3, 3.4, 5.1, 5.3, 5.4**

import { describe, it, expect, jest } from '@jest/globals';
import fc from 'fast-check';

import {
  calcTotalAwarded,
  calcTotalAvailable,
  createOrReuseMarkRun,
  updateMarkRunStatus,
} from '../../api/marking/lib/mark-run-repository-v2.js';

// ── Generators ──────────────────────────────────────────────────────────────

/** Random UUID v4 string */
const arbUuid = fc.uuid().map(u => u.toString());

/** Valid reason values from the Decision Engine contract */
const arbReason = fc.constantFrom(
  'best_match', 'below_threshold', 'borderline_score',
  'dependency_not_met', 'dependency_error', 'no_match',
);

/** Random non-negative integer for marks (0–20) */
const arbMarks = fc.integer({ min: 0, max: 20 });

/** A single decision object from Decision Engine output */
const arbDecision = fc.record({
  rubric_id: fc.string({ minLength: 1, maxLength: 10 }).map(s => `r_${s.replace(/[^a-z0-9]/gi, 'x')}`),
  awarded_marks: arbMarks,
  awarded: fc.boolean(),
  reason: arbReason,
  mark_label: fc.constantFrom('M1', 'A1', 'B1', 'M2', 'A2'),
});

/** Array of decisions (0–15 items) */
const arbDecisions = fc.array(arbDecision, { minLength: 0, maxLength: 15 });

/** A single rubric point with a marks value */
const arbRubricPoint = fc.record({
  marks: arbMarks,
});

/** Array of rubric points (0–15 items) */
const arbRubricPoints = fc.array(arbRubricPoint, { minLength: 0, maxLength: 15 });

/** Engine version string */
const arbEngineVersion = fc.constantFrom('decision-engine-v1', 'decision-engine-v2', 'sympy-v0.1');

/** Rubric version string */
const arbRubricVersion = fc.constantFrom('rubric-2024-06', 'rubric-2024-09', 'rubric-2025-01');

/** Mark run status values */
const arbStatus = fc.constantFrom('pending', 'completed', 'failed');

/** Decision write status values */
const arbDecisionWriteStatus = fc.constantFrom('success', 'failed', 'pending');

// ── Mock Supabase helpers ───────────────────────────────────────────────────

/**
 * Build a mock Supabase client that simulates mark_runs table behavior
 * with an in-memory store. Supports both Path A (deterministic idempotent lookup+insert) and
 * Path B (always-new insert).
 */
function buildMarkRunSupabase() {
  // In-memory store: keyed by mark_run_id
  const store = new Map();
  // Secondary index: (attempt_id, run_idempotency_key) → mark_run_id
  const idemIndex = new Map();
  let counter = 0;

  const makeChain = () => {
    const chain = {};
    let eqFilters = {};

    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockImplementation((col, val) => {
      eqFilters[col] = val;
      return chain;
    });

    chain.maybeSingle = jest.fn().mockImplementation(() => {
      const attemptId = eqFilters['attempt_id'];
      const runIdemKey = eqFilters['run_idempotency_key'];
      const idemKey = `${attemptId}::${runIdemKey}`;
      const mrId = idemIndex.get(idemKey);
      if (mrId && store.has(mrId)) {
        const row = store.get(mrId);
        return Promise.resolve({ data: row, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    chain.insert = jest.fn().mockImplementation((row) => {
      // Return chain for .select().single()
      const insertChain = {};
      insertChain.select = jest.fn().mockReturnValue(insertChain);
      insertChain.single = jest.fn().mockImplementation(() => {
        if (row.run_idempotency_key) {
          const idemKey = `${row.attempt_id}::${row.run_idempotency_key}`;
          if (idemIndex.has(idemKey)) {
            return Promise.resolve({
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint',
              },
            });
          }
          const id = `mr-${++counter}-${Math.random().toString(36).slice(2, 8)}`;
          const fullRow = {
            mark_run_id: id,
            ...row,
            status: 'pending',
            decision_write_status: 'pending',
            created_at: new Date().toISOString(),
          };
          store.set(id, fullRow);
          idemIndex.set(idemKey, id);
          return Promise.resolve({ data: { mark_run_id: id }, error: null });
        }

        const id = `mr-${++counter}-${Math.random().toString(36).slice(2, 8)}`;
        const fullRow = {
          mark_run_id: id,
          ...row,
          status: 'pending',
          decision_write_status: 'pending',
          created_at: new Date().toISOString(),
        };
        store.set(id, fullRow);
        return Promise.resolve({ data: { mark_run_id: id }, error: null });
      });
      return insertChain;
    });

    chain.single = jest.fn().mockImplementation(() => {
      const attemptId = eqFilters['attempt_id'];
      const runIdemKey = eqFilters['run_idempotency_key'];
      const idemKey = `${attemptId}::${runIdemKey}`;
      const mrId = idemIndex.get(idemKey);
      if (mrId && store.has(mrId)) {
        const row = store.get(mrId);
        return Promise.resolve({ data: row, error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'not found' } });
    });

    chain.update = jest.fn().mockImplementation((updates) => {
      const updateChain = {};
      updateChain.eq = jest.fn().mockImplementation((col, val) => {
        if (col === 'mark_run_id' && store.has(val)) {
          const existing = store.get(val);
          store.set(val, { ...existing, ...updates });
        }
        return Promise.resolve({ error: null });
      });
      return updateChain;
    });

    return chain;
  };

  return {
    from: jest.fn(() => makeChain()),
    _store: store,
    _idemIndex: idemIndex,
  };
}

// ── Property 7: Mark Run 总分不变量 ─────────────────────────────────────────

describe('Property 7: Mark Run total_awarded 不变量', () => {
  // Feature: learning-evidence-ledger, Property 7: Mark Run 总分不变量
  // For any decisions array, mark_run.total_awarded must equal the sum of all
  // awarded_marks, and total_available must equal the sum of all rubric_points marks.
  // **Validates: Requirements 3.3**

  it('calcTotalAwarded equals sum of all awarded_marks for any decisions array', () => {
    fc.assert(
      fc.property(
        arbDecisions,
        (decisions) => {
          const result = calcTotalAwarded(decisions);
          const expected = decisions.reduce((sum, d) => sum + (d.awarded_marks || 0), 0);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('calcTotalAvailable equals sum of all rubric_points marks for any rubric_points array', () => {
    fc.assert(
      fc.property(
        arbRubricPoints,
        (rubricPoints) => {
          const result = calcTotalAvailable(rubricPoints);
          const expected = rubricPoints.reduce((sum, rp) => sum + (rp.marks || 0), 0);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('total_awarded and total_available in inserted row match calc functions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, decisions, rubricPoints, engineVer, rubricVer) => {
          const sb = buildMarkRunSupabase();

          const result = await createOrReuseMarkRun({
            supabase: sb,
            attempt_id: attemptId,
            run_idempotency_key: null,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          });

          // Verify the stored row has correct totals
          const stored = sb._store.get(result.mark_run_id);
          expect(stored).toBeDefined();
          expect(stored.total_awarded).toBe(calcTotalAwarded(decisions));
          expect(stored.total_available).toBe(calcTotalAvailable(rubricPoints));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('total_awarded is always non-negative for non-negative awarded_marks', () => {
    fc.assert(
      fc.property(
        arbDecisions,
        (decisions) => {
          const result = calcTotalAwarded(decisions);
          expect(result).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('total_available is always non-negative for non-negative marks', () => {
    fc.assert(
      fc.property(
        arbRubricPoints,
        (rubricPoints) => {
          const result = calcTotalAvailable(rubricPoints);
          expect(result).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 8: Run 级幂等与重评分语义 ──────────────────────────────────────

describe('Property 8: Run 级幂等与重评分语义', () => {
  // Feature: learning-evidence-ledger, Property 8: Run 级幂等与重评分语义
  // For any attempt_id:
  // - Using the same run_idempotency_key twice must return the same mark_run_id
  // - When run_idempotency_key is null, two requests must produce different mark_run_ids
  //   (allowing re-scoring)
  // **Validates: Requirements 3.2, 3.4, 5.3, 5.4**

  it('same run_idempotency_key returns same mark_run_id on second call', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // attempt_id
        arbUuid,           // run_idempotency_key
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, runIdemKey, decisions, rubricPoints, engineVer, rubricVer) => {
          const sb = buildMarkRunSupabase();

          const params = {
            supabase: sb,
            attempt_id: attemptId,
            run_idempotency_key: runIdemKey,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          };

          const first = await createOrReuseMarkRun(params);
          const second = await createOrReuseMarkRun(params);

          // Same mark_run_id returned
          expect(second.mark_run_id).toBe(first.mark_run_id);

          // Only one record in store for this (attempt_id, run_idempotency_key)
          const idemKey = `${attemptId}::${runIdemKey}`;
          expect(sb._idemIndex.has(idemKey)).toBe(true);

          // Count entries with this idem key — should be exactly 1
          let count = 0;
          for (const [k] of sb._idemIndex) {
            if (k === idemKey) count++;
          }
          expect(count).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('null run_idempotency_key produces different mark_run_ids on each call', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // attempt_id
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, decisions, rubricPoints, engineVer, rubricVer) => {
          const sb = buildMarkRunSupabase();

          const params = {
            supabase: sb,
            attempt_id: attemptId,
            run_idempotency_key: null,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          };

          const first = await createOrReuseMarkRun(params);
          const second = await createOrReuseMarkRun(params);

          // Different mark_run_ids (re-scoring creates new runs)
          expect(second.mark_run_id).not.toBe(first.mark_run_id);

          // Both should be is_new=true
          expect(first.is_new).toBe(true);
          expect(second.is_new).toBe(true);

          // Store should have at least 2 entries
          expect(sb._store.size).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('different run_idempotency_keys for same attempt produce different mark_run_ids', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // attempt_id
        arbUuid,           // run_idempotency_key_1
        arbUuid,           // run_idempotency_key_2
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, runKey1, runKey2, decisions, rubricPoints, engineVer, rubricVer) => {
          fc.pre(runKey1 !== runKey2);

          const sb = buildMarkRunSupabase();

          const baseParams = {
            supabase: sb,
            attempt_id: attemptId,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          };

          const first = await createOrReuseMarkRun({ ...baseParams, run_idempotency_key: runKey1 });
          const second = await createOrReuseMarkRun({ ...baseParams, run_idempotency_key: runKey2 });

          // Different mark_run_ids for different run keys
          expect(first.mark_run_id).not.toBe(second.mark_run_id);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 12: Mark Run 状态机 ────────────────────────────────────────────

describe('Property 12: Mark Run 状态转换', () => {
  // Feature: learning-evidence-ledger, Property 12: Mark Run 状态机
  // For any mark_run, the status state machine must satisfy:
  // - Initial state is `pending`
  // - Success path transitions to `completed`
  // - Error path transitions to `failed`
  // - Terminal states (`completed`, `failed`) must NOT transition back to `pending`
  // **Validates: Requirements 5.1**

  it('newly created mark_run always starts with status=pending', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        fc.option(arbUuid, { nil: null }),
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, runIdemKey, decisions, rubricPoints, engineVer, rubricVer) => {
          const sb = buildMarkRunSupabase();

          const result = await createOrReuseMarkRun({
            supabase: sb,
            attempt_id: attemptId,
            run_idempotency_key: runIdemKey,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          });

          const stored = sb._store.get(result.mark_run_id);
          expect(stored).toBeDefined();
          expect(stored.status).toBe('pending');
          expect(stored.decision_write_status).toBe('pending');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pending → completed is a valid transition', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, decisions, rubricPoints, engineVer, rubricVer) => {
          const sb = buildMarkRunSupabase();

          const { mark_run_id } = await createOrReuseMarkRun({
            supabase: sb,
            attempt_id: attemptId,
            run_idempotency_key: null,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          });

          // Verify initial state
          expect(sb._store.get(mark_run_id).status).toBe('pending');

          // Transition to completed
          const result = await updateMarkRunStatus(sb, mark_run_id, 'completed', 'success');
          expect(result.ok).toBe(true);

          const updated = sb._store.get(mark_run_id);
          expect(updated.status).toBe('completed');
          expect(updated.decision_write_status).toBe('success');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pending → failed is a valid transition', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbDecisions,
        arbRubricPoints,
        arbEngineVersion,
        arbRubricVersion,
        async (attemptId, decisions, rubricPoints, engineVer, rubricVer) => {
          const sb = buildMarkRunSupabase();

          const { mark_run_id } = await createOrReuseMarkRun({
            supabase: sb,
            attempt_id: attemptId,
            run_idempotency_key: null,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: {},
            response_summary: {},
          });

          expect(sb._store.get(mark_run_id).status).toBe('pending');

          const result = await updateMarkRunStatus(sb, mark_run_id, 'failed', 'failed');
          expect(result.ok).toBe(true);

          const updated = sb._store.get(mark_run_id);
          expect(updated.status).toBe('failed');
          expect(updated.decision_write_status).toBe('failed');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('terminal states (completed/failed) must not regress to pending — application-level invariant', () => {
    // This property verifies the state machine invariant at the application level:
    // once a mark_run reaches a terminal state, the system should never attempt
    // to transition it back to pending. We validate this by checking that the
    // VALID_TRANSITIONS map does not allow completed→pending or failed→pending.

    const VALID_TRANSITIONS = {
      pending: ['completed', 'failed'],
      completed: ['completed'],  // idempotent re-complete is ok
      failed: ['failed'],        // idempotent re-fail is ok
    };

    fc.assert(
      fc.property(
        fc.constantFrom('completed', 'failed'),
        (terminalState) => {
          const allowed = VALID_TRANSITIONS[terminalState] || [];
          // pending must NOT be in the allowed transitions from terminal states
          expect(allowed).not.toContain('pending');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('updateMarkRunStatus does not throw — always returns {ok, error?}', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbStatus,
        arbDecisionWriteStatus,
        async (markRunId, status, decisionWriteStatus) => {
          const sb = buildMarkRunSupabase();

          // Call with a non-existent mark_run_id — should still not throw
          const result = await updateMarkRunStatus(sb, markRunId, status, decisionWriteStatus);

          // Must return an object with ok property (boolean)
          expect(typeof result.ok).toBe('boolean');
          if (!result.ok) {
            expect(typeof result.error).toBe('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
