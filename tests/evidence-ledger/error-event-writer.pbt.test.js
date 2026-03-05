// tests/evidence-ledger/error-event-writer.pbt.test.js
// Property-based tests for api/marking/lib/error-event-writer.js
// Feature: learning-evidence-ledger
// Properties 10, 11: Error Event consistency (DB Trigger), Misconception Tag mapping priority
// **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6**

import { describe, it, expect, jest } from '@jest/globals';
import fc from 'fast-check';

import {
  isErrorCandidate,
  resolveMisconceptionTag,
  writeErrorEvents,
} from '../../api/marking/lib/error-event-writer.js';

// ── Generators ──────────────────────────────────────────────────────────────

const arbUuid = fc.uuid().map(u => u.toString());

const VALID_REASONS = [
  'best_match', 'below_threshold', 'borderline_score',
  'dependency_not_met', 'dependency_error', 'no_match',
];

/** Reasons that are error candidates (awarded=false AND not excluded) */
const ERROR_CANDIDATE_REASONS = ['best_match', 'below_threshold', 'borderline_score', 'no_match'];
const EXCLUDED_REASONS = ['dependency_not_met', 'dependency_error'];

const arbValidReason = fc.constantFrom(...VALID_REASONS);
const arbErrorCandidateReason = fc.constantFrom(...ERROR_CANDIDATE_REASONS);
const arbExcludedReason = fc.constantFrom(...EXCLUDED_REASONS);

const arbMarks = fc.integer({ min: 0, max: 20 });
const arbMarkLabel = fc.constantFrom('M1', 'A1', 'B1', 'M2', 'A2', 'B2', 'M3', 'A3');
const arbRubricId = fc.string({ minLength: 1, maxLength: 8 })
  .map(s => `r_${s.replace(/[^a-z0-9]/gi, 'x') || 'x'}`);

const KNOWN_TAGS = [
  'unclassified', 'calculation_error', 'sign_error',
  'missing_prerequisite_step', 'premature_approximation',
  'skipped_justification', 'wrong_formula', 'unit_error',
];
const arbTag = fc.constantFrom(...KNOWN_TAGS);
const arbSeverity = fc.constantFrom('minor', 'major', 'critical');
const arbPriority = fc.integer({ min: 0, max: 100 });

/** A mark_decision that IS an error candidate (awarded=false, non-excluded reason) */
const arbErrorDecision = fc.record({
  mark_decision_id: arbUuid,
  rubric_id: arbRubricId,
  mark_label: arbMarkLabel,
  awarded: fc.constant(false),
  awarded_marks: fc.constant(0),
  reason: arbErrorCandidateReason,
});

/** A mark_decision that is NOT an error candidate */
const arbNonErrorDecision = fc.oneof(
  // awarded=true
  fc.record({
    mark_decision_id: arbUuid,
    rubric_id: arbRubricId,
    mark_label: arbMarkLabel,
    awarded: fc.constant(true),
    awarded_marks: arbMarks,
    reason: arbValidReason,
  }),
  // awarded=false but excluded reason
  fc.record({
    mark_decision_id: arbUuid,
    rubric_id: arbRubricId,
    mark_label: arbMarkLabel,
    awarded: fc.constant(false),
    awarded_marks: fc.constant(0),
    reason: arbExcludedReason,
  }),
);

/** A reason_to_tag_mapping row */
const arbMapping = fc.record({
  mapping_id: arbUuid,
  reason: arbValidReason,
  misconception_tag: arbTag,
  priority: arbPriority,
});

/** Array of 1+ mappings for a specific reason, with distinct priorities */
const arbMappingsForReason = (reason) =>
  fc.array(
    fc.record({
      misconception_tag: arbTag.filter(t => t !== 'unclassified'),
      priority: arbPriority,
    }),
    { minLength: 1, maxLength: 8 },
  ).map(mappings => {
    // Ensure unique priorities
    const seen = new Set();
    return mappings
      .filter(m => { if (seen.has(m.priority)) return false; seen.add(m.priority); return true; })
      .map(m => ({ ...m, reason }));
  }).filter(arr => arr.length >= 1);

// ── Mock Supabase helpers ───────────────────────────────────────────────────

/**
 * Build a mock Supabase that simulates:
 * - error_events INSERT with DB trigger (user_id sync from attempts)
 * - reason_to_tag_mapping queries
 * - misconception_taxonomy queries
 *
 * @param {object} opts
 * @param {Map<string, string>} opts.attemptUserMap - attempt_id → user_id
 * @param {object[]} opts.tagMappings - reason_to_tag_mapping rows
 * @param {Map<string, string>} opts.taxonomySeverity - tag → default_severity
 */
function buildErrorEventSupabase({ attemptUserMap = new Map(), tagMappings = [], taxonomySeverity = new Map() } = {}) {
  const insertedRows = [];

  const supabase = {
    from: jest.fn().mockImplementation((table) => {
      if (table === 'reason_to_tag_mapping') {
        return buildTagMappingChain(tagMappings);
      }
      if (table === 'misconception_taxonomy') {
        return buildTaxonomyChain(taxonomySeverity);
      }
      if (table === 'error_events') {
        return buildInsertChain(attemptUserMap, insertedRows);
      }
      // fallback
      return buildFallbackChain();
    }),
    _insertedRows: insertedRows,
  };

  return supabase;
}

function buildTagMappingChain(tagMappings) {
  let filterReason = null;

  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((_col, val) => { filterReason = val; return chain; }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockImplementation(() => {
      // Filter mappings by reason, sort by priority DESC, take first
      const matches = tagMappings
        .filter(m => m.reason === filterReason)
        .sort((a, b) => b.priority - a.priority);

      if (matches.length === 0) {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({
        data: { misconception_tag: matches[0].misconception_tag },
        error: null,
      });
    }),
  };
  return chain;
}

function buildTaxonomyChain(taxonomySeverity) {
  let filterTag = null;

  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation((_col, val) => { filterTag = val; return chain; }),
    maybeSingle: jest.fn().mockImplementation(() => {
      const severity = taxonomySeverity.get(filterTag);
      if (!severity) {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: { default_severity: severity }, error: null });
    }),
  };
  return chain;
}

function buildInsertChain(attemptUserMap, insertedRows) {
  return {
    insert: jest.fn().mockImplementation((rows) => {
      // Simulate DB trigger: for each row, check attempt_id exists
      for (const row of rows) {
        const userId = attemptUserMap.get(row.attempt_id);
        if (!userId) {
          // Trigger raises exception: attempt_id not found
          return Promise.resolve({
            error: {
              code: 'P0001',
              message: `attempt_id ${row.attempt_id} not found when writing error_events`,
            },
          });
        }
      }

      // All rows valid — simulate trigger setting user_id
      for (const row of rows) {
        const userId = attemptUserMap.get(row.attempt_id);
        insertedRows.push({ ...row, user_id: userId });
      }

      return Promise.resolve({ error: null });
    }),
  };
}

function buildFallbackChain() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockResolvedValue({ error: null }),
  };
  return chain;
}


// ── Property 10: Error Event 一致性（含 DB Trigger）──────────────────────────

describe('Property 10: Error Event 一致性（含 DB Trigger）', () => {
  // Feature: learning-evidence-ledger, Property 10: Error Event 一致性（含 DB Trigger）
  // For any error_events INSERT/UPDATE, the persisted user_id MUST equal attempts.user_id;
  // when attempt_id does not exist, the write MUST fail.
  // **Validates: Requirements 4.1, 4.2**

  it('persisted user_id equals attempts.user_id for all inserted error_events', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,  // attempt_id
        arbUuid,  // user_id (the "real" user from attempts table)
        fc.option(fc.string({ minLength: 3, maxLength: 30 }).map(s => `9709.p1.${s.replace(/[^a-z0-9.]/gi, 'x')}`), { nil: null }),  // topic_path
        fc.option(arbUuid, { nil: null }),  // node_id
        fc.array(arbErrorDecision, { minLength: 1, maxLength: 10 }),
        async (attemptId, userId, topicPath, nodeId, errorDecisions) => {
          const attemptUserMap = new Map([[attemptId, userId]]);
          const sb = buildErrorEventSupabase({
            attemptUserMap,
            tagMappings: [],  // all will resolve to 'unclassified'
            taxonomySeverity: new Map([['unclassified', 'major']]),
          });

          const result = await writeErrorEvents({
            supabase: sb,
            attempt_id: attemptId,
            topic_path: topicPath,
            node_id: nodeId,
            mark_decisions: errorDecisions,
          });

          expect(result.status).toBe('success');
          expect(result.count).toBe(errorDecisions.length);

          // Verify every inserted row has user_id === attempts.user_id
          for (const row of sb._insertedRows) {
            expect(row.user_id).toBe(userId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('write MUST fail when attempt_id does not exist in attempts table', async () => {
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,  // non-existent attempt_id
          fc.array(arbErrorDecision, { minLength: 1, maxLength: 5 }),
          async (fakeAttemptId, errorDecisions) => {
            // Empty attemptUserMap — no attempt exists
            const sb = buildErrorEventSupabase({
              attemptUserMap: new Map(),
              tagMappings: [],
              taxonomySeverity: new Map([['unclassified', 'major']]),
            });

            const result = await writeErrorEvents({
              supabase: sb,
              attempt_id: fakeAttemptId,
              topic_path: null,
              node_id: null,
              mark_decisions: errorDecisions,
            });

            // Must fail — trigger rejects missing attempt_id
            expect(result.status).toBe('failed');
            expect(result.count).toBe(0);
            expect(result.error).toContain('not found');

            // No rows should be persisted
            expect(sb._insertedRows.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });

  it('user_id is NOT set by application code — only by DB trigger', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,  // attempt_id
        arbUuid,  // user_id
        arbErrorDecision,
        async (attemptId, userId, decision) => {
          const attemptUserMap = new Map([[attemptId, userId]]);
          let capturedRows = null;

          const sb = {
            from: jest.fn().mockImplementation((table) => {
              if (table === 'reason_to_tag_mapping') {
                return buildTagMappingChain([]);
              }
              if (table === 'misconception_taxonomy') {
                return buildTaxonomyChain(new Map([['unclassified', 'major']]));
              }
              if (table === 'error_events') {
                return {
                  insert: jest.fn().mockImplementation((rows) => {
                    capturedRows = rows;
                    // Simulate trigger success
                    return Promise.resolve({ error: null });
                  }),
                };
              }
              return buildFallbackChain();
            }),
          };

          await writeErrorEvents({
            supabase: sb,
            attempt_id: attemptId,
            topic_path: null,
            node_id: null,
            mark_decisions: [decision],
          });

          // Application code must NOT include user_id in the insert payload
          expect(capturedRows).toBeDefined();
          expect(capturedRows.length).toBe(1);
          expect(capturedRows[0]).not.toHaveProperty('user_id');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('error_events inherit topic_path and node_id from attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbUuid,
        fc.option(fc.string({ minLength: 3, maxLength: 30 }).map(s => `9709.p1.${s.replace(/[^a-z0-9.]/gi, 'x')}`), { nil: null }),
        fc.option(arbUuid, { nil: null }),
        fc.array(arbErrorDecision, { minLength: 1, maxLength: 5 }),
        async (attemptId, userId, topicPath, nodeId, decisions) => {
          const attemptUserMap = new Map([[attemptId, userId]]);
          const sb = buildErrorEventSupabase({
            attemptUserMap,
            tagMappings: [],
            taxonomySeverity: new Map([['unclassified', 'major']]),
          });

          const result = await writeErrorEvents({
            supabase: sb,
            attempt_id: attemptId,
            topic_path: topicPath,
            node_id: nodeId,
            mark_decisions: decisions,
          });

          expect(result.status).toBe('success');

          // Every inserted row must carry the same topic_path and node_id
          for (const row of sb._insertedRows) {
            expect(row.topic_path).toBe(topicPath);
            expect(row.node_id).toBe(nodeId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('only error candidates are written — non-candidates are filtered out', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbUuid,
        fc.array(arbErrorDecision, { minLength: 0, maxLength: 5 }),
        fc.array(arbNonErrorDecision, { minLength: 0, maxLength: 5 }),
        async (attemptId, userId, errorDecs, nonErrorDecs) => {
          const mixed = [...errorDecs, ...nonErrorDecs];
          // Skip if no decisions at all
          fc.pre(mixed.length > 0);

          const attemptUserMap = new Map([[attemptId, userId]]);
          const sb = buildErrorEventSupabase({
            attemptUserMap,
            tagMappings: [],
            taxonomySeverity: new Map([['unclassified', 'major']]),
          });

          const result = await writeErrorEvents({
            supabase: sb,
            attempt_id: attemptId,
            topic_path: null,
            node_id: null,
            mark_decisions: mixed,
          });

          expect(result.status).toBe('success');
          // Count must equal the number of error candidates
          expect(result.count).toBe(errorDecs.length);
          expect(sb._insertedRows.length).toBe(errorDecs.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 11: Misconception Tag 映射优先级 ────────────────────────────────

describe('Property 11: Misconception Tag 映射优先级', () => {
  // Feature: learning-evidence-ledger, Property 11: Misconception Tag 映射优先级
  // For any reason and a set of reason_to_tag_mapping rows, resolveMisconceptionTag
  // MUST return the highest-priority match; when no match exists, return 'unclassified'.
  // **Validates: Requirements 4.4, 4.5, 4.6**

  it('returns highest-priority tag for a given reason', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidReason,
        fc.array(
          fc.record({
            misconception_tag: arbTag.filter(t => t !== 'unclassified'),
            priority: arbPriority,
          }),
          { minLength: 1, maxLength: 8 },
        ).map(mappings => {
          // Ensure unique priorities
          const seen = new Set();
          return mappings.filter(m => {
            if (seen.has(m.priority)) return false;
            seen.add(m.priority);
            return true;
          });
        }).filter(arr => arr.length >= 1),
        async (reason, mappingsData) => {
          // Build full mapping rows with the target reason
          const tagMappings = mappingsData.map(m => ({
            ...m,
            reason,
          }));

          // Expected: highest priority mapping
          const expected = tagMappings.reduce((best, m) =>
            m.priority > best.priority ? m : best
          );

          const sb = buildErrorEventSupabase({ tagMappings });
          const tag = await resolveMisconceptionTag(sb, reason);

          expect(tag).toBe(expected.misconception_tag);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "unclassified" when no mapping exists for the reason', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidReason,
        fc.array(
          fc.record({
            reason: arbValidReason,
            misconception_tag: arbTag,
            priority: arbPriority,
          }),
          { minLength: 0, maxLength: 5 },
        ),
        async (targetReason, otherMappings) => {
          // Filter out any mappings that match the target reason
          const nonMatchingMappings = otherMappings.filter(m => m.reason !== targetReason);

          const sb = buildErrorEventSupabase({ tagMappings: nonMatchingMappings });
          const tag = await resolveMisconceptionTag(sb, targetReason);

          expect(tag).toBe('unclassified');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "unclassified" on query error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidReason,
        fc.string({ minLength: 1, maxLength: 40 }),
        async (reason, errorMsg) => {
          // Build a mock that returns an error from the query
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: errorMsg },
            }),
          };
          const sb = { from: jest.fn().mockReturnValue(chain) };

          const origError = console.error;
          console.error = jest.fn();
          try {
            const tag = await resolveMisconceptionTag(sb, reason);
            expect(tag).toBe('unclassified');
          } finally {
            console.error = origError;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "unclassified" on thrown exception', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidReason,
        fc.string({ minLength: 1, maxLength: 40 }),
        async (reason, errorMsg) => {
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockRejectedValue(new Error(errorMsg)),
          };
          const sb = { from: jest.fn().mockReturnValue(chain) };

          const origError = console.error;
          console.error = jest.fn();
          try {
            const tag = await resolveMisconceptionTag(sb, reason);
            expect(tag).toBe('unclassified');
          } finally {
            console.error = origError;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('priority ordering is strictly descending — highest priority wins', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbValidReason,
        arbTag.filter(t => t !== 'unclassified'),  // low priority tag
        arbTag.filter(t => t !== 'unclassified'),  // high priority tag
        fc.integer({ min: 0, max: 49 }),   // low priority value
        fc.integer({ min: 50, max: 100 }), // high priority value
        async (reason, lowTag, highTag, lowPri, highPri) => {
          fc.pre(lowPri < highPri);

          const tagMappings = [
            { reason, misconception_tag: lowTag, priority: lowPri },
            { reason, misconception_tag: highTag, priority: highPri },
          ];

          const sb = buildErrorEventSupabase({ tagMappings });
          const tag = await resolveMisconceptionTag(sb, reason);

          expect(tag).toBe(highTag);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mappings for other reasons do not affect the result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('below_threshold', 'no_match'),  // target reason
        fc.constantFrom('best_match', 'borderline_score'),  // other reason
        arbTag.filter(t => t !== 'unclassified'),
        arbTag.filter(t => t !== 'unclassified'),
        async (targetReason, otherReason, targetTag, otherTag) => {
          fc.pre(targetReason !== otherReason);

          const tagMappings = [
            { reason: targetReason, misconception_tag: targetTag, priority: 10 },
            { reason: otherReason, misconception_tag: otherTag, priority: 999 },
          ];

          const sb = buildErrorEventSupabase({ tagMappings });
          const tag = await resolveMisconceptionTag(sb, targetReason);

          // Must return the target reason's tag, not the other reason's high-priority tag
          expect(tag).toBe(targetTag);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('end-to-end: writeErrorEvents uses resolved tags from mappings', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,  // attempt_id
        arbUuid,  // user_id
        arbErrorDecision,
        arbTag.filter(t => t !== 'unclassified'),
        arbPriority,
        async (attemptId, userId, decision, expectedTag, priority) => {
          const attemptUserMap = new Map([[attemptId, userId]]);
          const tagMappings = [
            { reason: decision.reason, misconception_tag: expectedTag, priority },
          ];
          const taxonomySeverity = new Map([[expectedTag, 'minor'], ['unclassified', 'major']]);

          const sb = buildErrorEventSupabase({
            attemptUserMap,
            tagMappings,
            taxonomySeverity,
          });

          const result = await writeErrorEvents({
            supabase: sb,
            attempt_id: attemptId,
            topic_path: null,
            node_id: null,
            mark_decisions: [decision],
          });

          expect(result.status).toBe('success');
          expect(result.count).toBe(1);

          // The inserted row should have the resolved tag
          expect(sb._insertedRows.length).toBe(1);
          expect(sb._insertedRows[0].misconception_tag).toBe(expectedTag);
        },
      ),
      { numRuns: 100 },
    );
  });
});
