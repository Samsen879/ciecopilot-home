// tests/evidence-ledger/context-query.pbt.test.js
// Property-based tests for api/evidence/context.js
// Feature: learning-evidence-ledger, Property 18: Context Query Correctness
// **Validates: Requirements 9.1, 9.2, 9.3**

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fc from 'fast-check';

// ── Mock resolveUserId ──────────────────────────────────────────────────────

const mockResolveUserId = jest.fn();

class MockAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

jest.unstable_mockModule('../../api/marking/lib/auth-helper.js', () => ({
  resolveUserId: mockResolveUserId,
  AuthError: MockAuthError,
}));

// ── Mock Supabase client ────────────────────────────────────────────────────

let mockFromHandlers = {};

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn((table) => {
      if (mockFromHandlers[table]) return mockFromHandlers[table]();
      return buildChain({ data: null, error: null }, 'maybeSingle');
    }),
  }),
}));

// ── Import module under test (after mocks) ──────────────────────────────────

const { default: handler, _resetClient } = await import('../../api/evidence/context.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-pbt-001';

function makeReq(queryString = '', method = 'GET') {
  return {
    method,
    url: `/api/evidence/context${queryString}`,
    headers: { authorization: 'Bearer test-token' },
  };
}

function makeRes() {
  let body = '';
  const res = {
    statusCode: 200,
    setHeader: jest.fn(),
    end: jest.fn((data) => { body = data; }),
    getBody: () => JSON.parse(body),
  };
  return res;
}

function buildChain(resolvedValue, terminalMethod = 'then') {
  const chain = {};
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  if (terminalMethod === 'maybeSingle') {
    chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  }
  chain.then = (resolve, reject) => {
    try { resolve(resolvedValue); } catch (e) { if (reject) reject(e); else throw e; }
  };
  return chain;
}

function setupMocks({
  profileData = null,
  nodeData = null,
  attempts = [],
  runs = [],
  decisions = [],
  errors = [],
} = {}) {
  mockFromHandlers = {
    user_learning_profiles: () => buildChain(
      { data: profileData, error: null }, 'maybeSingle',
    ),
    curriculum_nodes: () => buildChain(
      { data: nodeData, error: null }, 'maybeSingle',
    ),
    attempts: () => buildChain({ data: attempts, error: null }),
    mark_runs: () => buildChain({ data: runs, error: null }),
    mark_decisions: () => buildChain({ data: decisions, error: null }),
    error_events: () => buildChain({ data: errors, error: null }),
  };
}

// ── Generators ──────────────────────────────────────────────────────────────

const arbTopicPath = fc.tuple(
  fc.constantFrom('9709', '9231', '9702'),
  fc.constantFrom('p1', 'p2', 'p3'),
  fc.array(fc.constantFrom('algebra', 'calculus', 'trig', 'stats', 'mechanics'), { minLength: 1, maxLength: 3 }),
).map(([s, p, segs]) => [s, p, ...segs].join('.'));

const arbMisconceptionFreqs = fc.dictionary(
  fc.stringMatching(/^[a-z_]{3,12}$/),
  fc.record({
    count: fc.integer({ min: 1, max: 100 }),
    weighted_count: fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
    last_seen: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-02-17'), noInvalidDate: true }).map(d => d.toISOString()),
  }),
);

const arbTimestamp = fc.date({ min: new Date('2025-01-01'), max: new Date('2026-02-17'), noInvalidDate: true })
  .map(d => d.toISOString());

const arbSeverity = fc.constantFrom('minor', 'major', 'critical');

const arbMisconceptionTag = fc.stringMatching(/^[a-z_]{3,15}$/);

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Property 18: Context Query Correctness', () => {
  // Feature: learning-evidence-ledger, Property 18: Context Query Correctness
  // **Validates: Requirements 9.1, 9.2, 9.3**

  beforeEach(() => {
    _resetClient();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    mockResolveUserId.mockResolvedValue({ user_id: USER_ID, auth_source: 'jwt' });
  });

  // ── 18a: Subtree filtering correctness ──────────────────────────────────

  describe('18a: subtree filtering — only matching topic_paths appear in results', () => {
    it('recent_errors contains only entries whose topic_path is descendant-or-self of the query prefix', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          fc.array(
            fc.record({
              misconception_tag: arbMisconceptionTag,
              severity: arbSeverity,
              topic_path: arbTopicPath,
              created_at: arbTimestamp,
            }),
            { minLength: 0, maxLength: 20 },
          ),
          async (queryPath, allErrors) => {
            // The handler fetches up to 50 errors from Supabase, then filters
            // in application code. We supply all errors as the DB result.
            setupMocks({ errors: allErrors });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            const body = res.getBody();

            // Every returned error must be in the subtree
            for (const e of body.recent_errors) {
              const inSubtree = e.topic_path === queryPath ||
                e.topic_path.startsWith(queryPath + '.');
              expect(inSubtree).toBe(true);
            }

            // Compute expected matching set (capped at 5)
            const expectedMatching = allErrors.filter(
              e => e.topic_path === queryPath || e.topic_path.startsWith(queryPath + '.'),
            );
            expect(body.recent_errors.length).toBeLessThanOrEqual(5);
            expect(body.recent_errors.length).toBe(Math.min(expectedMatching.length, 5));
          },
        ),
        { numRuns: 100 },
      );
    });

    it('recent_decisions only includes decisions from attempts in the topic_path subtree', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          fc.array(
            fc.record({
              attempt_id: fc.uuid().map(u => u.toString()),
              topic_path: arbTopicPath,
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (queryPath, allAttempts) => {
            // Deduplicate attempt_ids
            const seen = new Set();
            const uniqueAttempts = allAttempts.filter(a => {
              if (seen.has(a.attempt_id)) return false;
              seen.add(a.attempt_id);
              return true;
            });

            const matchingAttemptIds = uniqueAttempts
              .filter(a => a.topic_path === queryPath || a.topic_path.startsWith(queryPath + '.'))
              .map(a => a.attempt_id);

            // Build mock decisions — one per matching attempt
            const mockDecisions = matchingAttemptIds.map((_, i) => ({
              rubric_id: `r-${i}`,
              mark_label: 'M1',
              awarded: true,
              reason: 'best_match',
              created_at: new Date(2025, 0, i + 1).toISOString(),
            }));

            // Build mock runs — one per matching attempt
            const mockRuns = matchingAttemptIds.map((_id, i) => ({
              mark_run_id: `mr-${i}`,
            }));

            setupMocks({
              attempts: uniqueAttempts,
              runs: mockRuns,
              decisions: mockDecisions,
            });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            const body = res.getBody();

            if (matchingAttemptIds.length === 0) {
              // No matching attempts → empty decisions
              expect(body.recent_decisions).toEqual([]);
            } else {
              // Decisions returned should match what the mock provided
              expect(body.recent_decisions).toEqual(mockDecisions);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 18b: Misconception tag sorting ──────────────────────────────────────

  describe('18b: misconception_tags sorted by weighted_count DESC, limited to 10', () => {
    it('returned tags are sorted DESC by weighted_count and capped at 10', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          arbMisconceptionFreqs,
          async (queryPath, freqs) => {
            setupMocks({
              profileData: {
                mastery_by_node: {},
                misconception_frequencies: freqs,
              },
            });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            const tags = res.getBody().misconception_tags;

            // Must be at most 10
            const totalEntries = Object.keys(freqs).length;
            expect(tags.length).toBe(Math.min(totalEntries, 10));

            // Must be sorted by weighted_count DESC
            for (let i = 1; i < tags.length; i++) {
              expect(tags[i - 1].weighted_count).toBeGreaterThanOrEqual(tags[i].weighted_count);
            }

            // Each tag must correspond to an entry in the input
            for (const t of tags) {
              expect(freqs).toHaveProperty(t.tag);
              expect(t.weighted_count).toBe(freqs[t.tag].weighted_count);
            }

            // If more than 10 entries, the returned tags must be the top 10
            if (totalEntries > 10) {
              const allSorted = Object.entries(freqs)
                .map(([tag, info]) => ({ tag, weighted_count: info.weighted_count }))
                .sort((a, b) => b.weighted_count - a.weighted_count);
              const minReturnedWeight = tags[tags.length - 1].weighted_count;
              // The 11th entry (if exists) must have weight <= the smallest returned
              expect(allSorted[10].weighted_count).toBeLessThanOrEqual(minReturnedWeight);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 18c: Decision ordering ──────────────────────────────────────────────

  describe('18c: recent_decisions ordered by created_at DESC', () => {
    it('decisions are returned in created_at DESC order as provided by the DB mock', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          fc.array(arbTimestamp, { minLength: 1, maxLength: 15 }),
          async (queryPath, timestamps) => {
            // Sort timestamps DESC to simulate DB ORDER BY created_at DESC
            const sortedDesc = [...timestamps].sort((a, b) => b.localeCompare(a));

            const mockDecisions = sortedDesc.map((ts, i) => ({
              rubric_id: `r-${i}`,
              mark_label: 'M1',
              awarded: true,
              reason: 'best_match',
              created_at: ts,
            }));

            // Single matching attempt so decisions flow through
            setupMocks({
              attempts: [{ attempt_id: 'att-1', topic_path: queryPath }],
              runs: [{ mark_run_id: 'mr-1' }],
              decisions: mockDecisions,
            });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            const returned = res.getBody().recent_decisions;

            // Verify DESC ordering is preserved
            for (let i = 1; i < returned.length; i++) {
              expect(returned[i - 1].created_at >= returned[i].created_at).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 18d: Error limit ───────────────────────────────────────────────────

  describe('18d: recent_errors capped at 5', () => {
    it('at most 5 errors are returned regardless of how many match the subtree', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          fc.integer({ min: 0, max: 30 }),
          async (queryPath, errorCount) => {
            // Generate errors all within the query subtree
            const allErrors = Array.from({ length: errorCount }, (_, i) => ({
              misconception_tag: `tag_${i}`,
              severity: 'minor',
              topic_path: queryPath, // exact match → always in subtree
              created_at: new Date(2025, 0, i + 1).toISOString(),
            }));

            setupMocks({ errors: allErrors });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            const returned = res.getBody().recent_errors;

            expect(returned.length).toBeLessThanOrEqual(5);
            expect(returned.length).toBe(Math.min(errorCount, 5));
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 18e: Mastery lookup ────────────────────────────────────────────────

  describe('18e: mastery lookup returns correct entry for matching node_id', () => {
    it('returns mastery data when node_id exists in mastery_by_node', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          fc.uuid().map(u => u.toString()),
          fc.record({
            score: fc.float({ min: 0, max: 1, noNaN: true }),
            sample_count: fc.integer({ min: 0, max: 500 }),
            weighted_sample_count: fc.integer({ min: 0, max: 1000 }),
            low_confidence: fc.boolean(),
            last_updated: arbTimestamp,
          }),
          async (queryPath, nodeId, masteryEntry) => {
            setupMocks({
              profileData: {
                mastery_by_node: { [nodeId]: masteryEntry },
                misconception_frequencies: {},
              },
              nodeData: { node_id: nodeId },
            });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            const body = res.getBody();

            expect(body.mastery).toEqual({
              score: masteryEntry.score,
              sample_count: masteryEntry.sample_count,
              weighted_sample_count: masteryEntry.weighted_sample_count,
              low_confidence: masteryEntry.low_confidence,
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns null mastery when node_id is not in mastery_by_node', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          fc.uuid().map(u => u.toString()),
          fc.uuid().map(u => u.toString()),
          async (queryPath, nodeIdInProfile, nodeIdFromCurriculum) => {
            // Ensure the two node IDs differ
            fc.pre(nodeIdInProfile !== nodeIdFromCurriculum);

            setupMocks({
              profileData: {
                mastery_by_node: {
                  [nodeIdInProfile]: {
                    score: 0.8,
                    sample_count: 5,
                    weighted_sample_count: 10,
                    low_confidence: false,
                  },
                },
                misconception_frequencies: {},
              },
              nodeData: { node_id: nodeIdFromCurriculum },
            });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.getBody().mastery).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns null mastery when no profile exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbTopicPath,
          async (queryPath) => {
            setupMocks({ profileData: null });

            const req = makeReq(`?topic_path=${encodeURIComponent(queryPath)}`);
            const res = makeRes();
            await handler(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.getBody().mastery).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
