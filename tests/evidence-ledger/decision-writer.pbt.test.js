// tests/evidence-ledger/decision-writer.pbt.test.js
// Property-based tests for api/marking/lib/decision-writer.js
// Feature: learning-evidence-ledger
// Properties 4, 5, 6: Decision persistence integrity, uniqueness constraint, write atomicity
// **Validates: Requirements 2.1, 2.2, 2.3**

import { describe, it, expect, jest } from '@jest/globals';
import fc from 'fast-check';

import { writeDecisions } from '../../api/marking/lib/decision-writer.js';

// ── Generators ──────────────────────────────────────────────────────────────

/** Random UUID v4 string */
const arbUuid = fc.uuid().map(u => u.toString());

/** Valid reason values from the Decision Engine contract (CHECK constraint) */
const VALID_REASONS = [
  'best_match', 'below_threshold', 'borderline_score',
  'dependency_not_met', 'dependency_error', 'no_match',
];
const arbValidReason = fc.constantFrom(...VALID_REASONS);

/** Invalid reason values — strings NOT in the allowed set */
const arbInvalidReason = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => !VALID_REASONS.includes(s));

/** Random non-negative integer for marks (0–20) */
const arbMarks = fc.integer({ min: 0, max: 20 });

/** Mark label values */
const arbMarkLabel = fc.constantFrom('M1', 'A1', 'B1', 'M2', 'A2', 'B2', 'M3', 'A3');

/** Unique rubric_id generator (prefixed to avoid collisions) */
const arbRubricId = fc.string({ minLength: 1, maxLength: 8 })
  .map(s => `r_${s.replace(/[^a-z0-9]/gi, 'x') || 'x'}`);

/** A single decision with a VALID reason */
const arbValidDecision = fc.record({
  rubric_id: arbRubricId,
  mark_label: arbMarkLabel,
  awarded: fc.boolean(),
  awarded_marks: arbMarks,
  reason: arbValidReason,
});

/** Array of 1+ decisions with UNIQUE rubric_ids and valid reasons */
const arbValidDecisions = fc.array(arbValidDecision, { minLength: 1, maxLength: 15 })
  .map(decisions => {
    // Deduplicate by rubric_id — keep first occurrence
    const seen = new Set();
    return decisions.filter(d => {
      if (seen.has(d.rubric_id)) return false;
      seen.add(d.rubric_id);
      return true;
    });
  })
  .filter(arr => arr.length >= 1);

/** A single decision with an INVALID reason (for negative testing) */
const arbInvalidDecision = fc.record({
  rubric_id: arbRubricId,
  mark_label: arbMarkLabel,
  awarded: fc.boolean(),
  awarded_marks: arbMarks,
  reason: arbInvalidReason,
});

// ── Mock Supabase helpers ───────────────────────────────────────────────────

/**
 * Build a mock Supabase client that simulates the insert_mark_decisions RPC.
 * Tracks inserted decisions per mark_run_id and enforces:
 * - unique(mark_run_id, rubric_id) constraint
 * - reason CHECK constraint (only VALID_REASONS allowed)
 * - Transactional atomicity (all-or-nothing)
 */
function buildDecisionSupabase() {
  // In-memory store: mark_run_id → Map<rubric_id, decision_row>
  const store = new Map();
  let idCounter = 0;

  return {
    rpc: jest.fn().mockImplementation((fnName, params) => {
      if (fnName !== 'insert_mark_decisions') {
        return Promise.resolve({ data: null, error: { message: `unknown rpc: ${fnName}` } });
      }

      const { p_mark_run_id, p_decisions } = params;
      const decisions = Array.isArray(p_decisions) ? p_decisions : [];

      // Pre-validate all rows before inserting (transactional: all-or-nothing)
      const batchRubricIds = new Set();
      for (const d of decisions) {
        // CHECK constraint: reason must be in allowed set
        if (!VALID_REASONS.includes(d.reason)) {
          return Promise.resolve({
            data: null,
            error: {
              code: '23514',
              message: `new row violates check constraint "chk_mark_decisions_reason"`,
            },
          });
        }

        // UNIQUE constraint: (mark_run_id, rubric_id) — check against store
        const runStore = store.get(p_mark_run_id);
        if (runStore && runStore.has(d.rubric_id)) {
          return Promise.resolve({
            data: null,
            error: {
              code: '23505',
              message: `duplicate key value violates unique constraint "uq_mark_decisions_run_rubric"`,
            },
          });
        }

        // UNIQUE constraint: intra-batch duplicate rubric_id
        if (batchRubricIds.has(d.rubric_id)) {
          return Promise.resolve({
            data: null,
            error: {
              code: '23505',
              message: `duplicate key value violates unique constraint "uq_mark_decisions_run_rubric"`,
            },
          });
        }
        batchRubricIds.add(d.rubric_id);
      }

      // All validations passed — insert atomically
      if (!store.has(p_mark_run_id)) {
        store.set(p_mark_run_id, new Map());
      }
      const runStore = store.get(p_mark_run_id);
      const inserted = [];

      for (const d of decisions) {
        const row = {
          mark_decision_id: `md-${++idCounter}`,
          rubric_id: d.rubric_id,
        };
        runStore.set(d.rubric_id, { ...d, ...row, mark_run_id: p_mark_run_id });
        inserted.push(row);
      }

      return Promise.resolve({ data: inserted, error: null });
    }),
    _store: store,
  };
}

/**
 * Build a mock Supabase that simulates atomic failure:
 * if ANY row in the batch fails, the entire batch is rolled back.
 * Accepts a predicate to decide which row triggers the failure.
 */
function buildFailingSupabase(shouldFail) {
  const store = new Map();

  return {
    rpc: jest.fn().mockImplementation((fnName, params) => {
      const { p_mark_run_id, p_decisions } = params;
      const decisions = Array.isArray(p_decisions) ? p_decisions : [];

      // Check if any row triggers failure
      for (const d of decisions) {
        if (shouldFail(d)) {
          // Transaction rolled back — nothing written
          return Promise.resolve({
            data: null,
            error: {
              code: '23514',
              message: 'batch insert failed — transaction rolled back',
            },
          });
        }
      }

      // All passed — insert
      if (!store.has(p_mark_run_id)) {
        store.set(p_mark_run_id, new Map());
      }
      const runStore = store.get(p_mark_run_id);
      const inserted = [];
      let idCounter = 0;
      for (const d of decisions) {
        const row = { mark_decision_id: `md-${++idCounter}`, rubric_id: d.rubric_id };
        runStore.set(d.rubric_id, d);
        inserted.push(row);
      }
      return Promise.resolve({ data: inserted, error: null });
    }),
    _store: store,
  };
}


// ── Property 4: Decision 持久化完整性与 reason 域约束 ───────────────────────

describe('Property 4: Decision 持久化完整性与 reason 域约束', () => {
  // Feature: learning-evidence-ledger, Property 4: Decision 持久化完整性与 reason 域约束
  // For any Decision_Engine output decisions array (length >= 1), after writeDecisions
  // succeeds, mark_decisions should contain an equal-length record set with rubric_id,
  // mark_label, awarded, awarded_marks, reason matching one-to-one.
  // When reason is NOT in the allowed set, the write MUST fail.
  // **Validates: Requirements 2.1, 2.3**

  it('successful write produces equal-length record set with 1:1 field correspondence', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,             // mark_run_id
        arbValidDecisions,   // decisions with valid reasons and unique rubric_ids
        async (markRunId, decisions) => {
          const sb = buildDecisionSupabase();

          const result = await writeDecisions({
            supabase: sb,
            mark_run_id: markRunId,
            decisions,
          });

          // Must succeed
          expect(result.status).toBe('success');

          // Count must match input length
          expect(result.count).toBe(decisions.length);

          // Verify stored records match input 1:1
          const runStore = sb._store.get(markRunId);
          expect(runStore).toBeDefined();
          expect(runStore.size).toBe(decisions.length);

          for (const d of decisions) {
            const stored = runStore.get(d.rubric_id);
            expect(stored).toBeDefined();
            expect(stored.rubric_id).toBe(d.rubric_id);
            expect(stored.mark_label).toBe(d.mark_label);
            expect(stored.awarded).toBe(d.awarded);
            expect(stored.awarded_marks).toBe(d.awarded_marks);
            expect(stored.reason).toBe(d.reason);
            expect(stored.mark_run_id).toBe(markRunId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('each returned decision row has a unique mark_decision_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbValidDecisions,
        async (markRunId, decisions) => {
          const sb = buildDecisionSupabase();

          const result = await writeDecisions({
            supabase: sb,
            mark_run_id: markRunId,
            decisions,
          });

          expect(result.status).toBe('success');

          // All returned mark_decision_ids must be unique
          const ids = result.decisions.map(r => r.mark_decision_id);
          expect(new Set(ids).size).toBe(ids.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('write MUST fail when any decision has an invalid reason', async () => {
    // Suppress console.error from structured logging
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbValidDecisions,
          arbInvalidDecision,
          fc.integer({ min: 0, max: 14 }),
          async (markRunId, validDecisions, invalidDecision, insertPos) => {
            const sb = buildDecisionSupabase();

            // Insert the invalid decision at a random position in the array
            const mixed = [...validDecisions];
            // Ensure invalid decision has a unique rubric_id
            invalidDecision = {
              ...invalidDecision,
              rubric_id: `invalid_${insertPos}_${invalidDecision.rubric_id}`,
            };
            const pos = Math.min(insertPos, mixed.length);
            mixed.splice(pos, 0, invalidDecision);

            const result = await writeDecisions({
              supabase: sb,
              mark_run_id: markRunId,
              decisions: mixed,
            });

            // Must fail due to CHECK constraint violation
            expect(result.status).toBe('failed');
            expect(result.count).toBe(0);
            expect(result.error).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });

  it('all six valid reasons are accepted without error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbValidReason,
        arbMarkLabel,
        fc.boolean(),
        arbMarks,
        async (markRunId, reason, markLabel, awarded, awardedMarks) => {
          const sb = buildDecisionSupabase();

          const result = await writeDecisions({
            supabase: sb,
            mark_run_id: markRunId,
            decisions: [{
              rubric_id: `r_test_${reason}`,
              mark_label: markLabel,
              awarded,
              awarded_marks: awardedMarks,
              reason,
            }],
          });

          expect(result.status).toBe('success');
          expect(result.count).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 5: Decision 唯一性约束 ─────────────────────────────────────────

describe('Property 5: Decision 唯一性约束', () => {
  // Feature: learning-evidence-ledger, Property 5: Decision 唯一性约束
  // For any mark_run_id + rubric_id, a second insert of the same (mark_run_id, rubric_id)
  // decision must be rejected by the unique constraint.
  // **Validates: Requirements 2.2**

  it('second insert of same (mark_run_id, rubric_id) is rejected', async () => {
    // Suppress console.error from structured logging
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,            // mark_run_id
          arbValidDecision,   // first decision
          async (markRunId, decision) => {
            const sb = buildDecisionSupabase();

            // First write — should succeed
            const first = await writeDecisions({
              supabase: sb,
              mark_run_id: markRunId,
              decisions: [decision],
            });
            expect(first.status).toBe('success');
            expect(first.count).toBe(1);

            // Second write with same mark_run_id + rubric_id — must fail
            const second = await writeDecisions({
              supabase: sb,
              mark_run_id: markRunId,
              decisions: [decision],
            });
            expect(second.status).toBe('failed');
            expect(second.error).toContain('unique constraint');

            // Store should still have exactly 1 record for this rubric_id
            const runStore = sb._store.get(markRunId);
            expect(runStore.size).toBe(1);
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });

  it('same rubric_id under different mark_run_ids does NOT conflict', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,            // mark_run_id_1
        arbUuid,            // mark_run_id_2
        arbValidDecision,   // shared decision (same rubric_id)
        async (markRunId1, markRunId2, decision) => {
          fc.pre(markRunId1 !== markRunId2);

          const sb = buildDecisionSupabase();

          const first = await writeDecisions({
            supabase: sb,
            mark_run_id: markRunId1,
            decisions: [decision],
          });
          expect(first.status).toBe('success');

          const second = await writeDecisions({
            supabase: sb,
            mark_run_id: markRunId2,
            decisions: [decision],
          });
          expect(second.status).toBe('success');

          // Both mark_runs should have the record
          expect(sb._store.get(markRunId1).size).toBe(1);
          expect(sb._store.get(markRunId2).size).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('batch with duplicate rubric_ids within same call is rejected', async () => {
    // Suppress console.error from structured logging
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbValidDecision,
          async (markRunId, decision) => {
            const sb = buildDecisionSupabase();

            // Create a batch with the same rubric_id appearing twice
            const duplicateBatch = [
              decision,
              { ...decision, awarded: !decision.awarded }, // same rubric_id, different data
            ];

            const result = await writeDecisions({
              supabase: sb,
              mark_run_id: markRunId,
              decisions: duplicateBatch,
            });

            // The RPC function runs in a transaction — the DB unique constraint
            // on (mark_run_id, rubric_id) will reject the duplicate.
            // Our mock simulates this: the second row with same rubric_id fails.
            expect(result.status).toBe('failed');
            expect(result.error).toContain('unique constraint');
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });
});


// ── Property 6: Decision 写入原子性与失败状态 ───────────────────────────────

describe('Property 6: Decision 写入原子性与失败状态', () => {
  // Feature: learning-evidence-ledger, Property 6: Decision 写入原子性与失败状态
  // For any decisions array, if any single row in the batch fails, then NO rows
  // should be written for that mark_run_id, and the result status must be 'failed'.
  // This validates transactional atomicity of the RPC call.
  // **Validates: Requirements 2.4, 5.1**

  it('when one row fails, no rows are persisted for that mark_run_id', async () => {
    // Suppress console.error from structured logging
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbValidDecisions,
          fc.integer({ min: 0, max: 14 }),
          async (markRunId, validDecisions, failIndex) => {
            // Pick a position to inject the poison row
            const poisonRubricId = `poison_${failIndex}`;

            // Build a mock that fails when it sees the poison rubric_id
            const sb = buildFailingSupabase(d => d.rubric_id === poisonRubricId);

            // Inject poison row at a random position
            const mixed = [...validDecisions];
            const pos = Math.min(failIndex, mixed.length);
            mixed.splice(pos, 0, {
              rubric_id: poisonRubricId,
              mark_label: 'M1',
              awarded: false,
              awarded_marks: 0,
              reason: 'best_match', // valid reason, but the mock will fail on rubric_id
            });

            const result = await writeDecisions({
              supabase: sb,
              mark_run_id: markRunId,
              decisions: mixed,
            });

            // Must fail
            expect(result.status).toBe('failed');
            expect(result.count).toBe(0);

            // No rows should exist for this mark_run_id (atomicity)
            const runStore = sb._store.get(markRunId);
            expect(runStore).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });

  it('successful batch writes all rows; failed batch writes zero rows', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbValidDecisions,
        async (markRunId, decisions) => {
          // Scenario A: all valid → all written
          const sbSuccess = buildDecisionSupabase();
          const successResult = await writeDecisions({
            supabase: sbSuccess,
            mark_run_id: markRunId,
            decisions,
          });

          expect(successResult.status).toBe('success');
          const successStore = sbSuccess._store.get(markRunId);
          expect(successStore).toBeDefined();
          expect(successStore.size).toBe(decisions.length);

          // Scenario B: inject invalid reason → zero written
          const origError = console.error;
          console.error = jest.fn();
          try {
            const sbFail = buildDecisionSupabase();
            const badDecisions = [
              ...decisions,
              {
                rubric_id: `r_bad_${markRunId.slice(0, 6)}`,
                mark_label: 'M1',
                awarded: false,
                awarded_marks: 0,
                reason: 'totally_invalid_reason',
              },
            ];

            const failResult = await writeDecisions({
              supabase: sbFail,
              mark_run_id: markRunId,
              decisions: badDecisions,
            });

            expect(failResult.status).toBe('failed');
            expect(failResult.count).toBe(0);

            // No rows persisted (atomicity)
            const failStore = sbFail._store.get(markRunId);
            expect(failStore).toBeUndefined();
          } finally {
            console.error = origError;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('RPC exception (network error) results in failed status with zero rows', async () => {
    // Suppress console.error from structured logging
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbValidDecisions,
          fc.string({ minLength: 1, maxLength: 40 }),
          async (markRunId, decisions, errorMsg) => {
            // Mock that throws an exception (simulating network failure)
            const sb = {
              rpc: jest.fn().mockRejectedValue(new Error(errorMsg)),
            };

            const result = await writeDecisions({
              supabase: sb,
              mark_run_id: markRunId,
              decisions,
            });

            // Must fail gracefully
            expect(result.status).toBe('failed');
            expect(result.count).toBe(0);
            expect(result.error).toBe(errorMsg);
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });
});
