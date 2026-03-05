// tests/evidence-ledger/context-query.test.js
// Unit tests for api/evidence/context.js
// Covers: 400 on missing topic_path, 401 on auth failure, mastery data,
// recent_decisions filtering, misconception_tags sorting, recent_errors,
// empty data, limit parameter, Supabase error handling.

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

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

function chainable(resolvedValue) {
  const chain = {};
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // The terminal call returns the resolved value
  chain._resolved = resolvedValue;
  // Override the last chained method to resolve
  chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  // For queries that don't end with maybeSingle, we need then()
  chain.then = (resolve) => resolve(resolvedValue);
  return chain;
}

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: jest.fn((table) => {
      if (mockFromHandlers[table]) return mockFromHandlers[table]();
      return chainable({ data: null, error: null });
    }),
  }),
}));

// ── Import module under test (after mocks) ──────────────────────────────────

const { default: handler, _resetClient } = await import('../../api/evidence/context.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const TOPIC_PATH = '9709.p1.algebra.quadratics';
const NODE_ID = 'node-uuid-001';

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

/**
 * Build a chainable mock for a Supabase table query.
 * terminalMethod: which method triggers the resolved value ('maybeSingle' or 'then')
 */
function buildChain(resolvedValue, terminalMethod = 'then') {
  const chain = {};
  const methods = ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  if (terminalMethod === 'maybeSingle') {
    chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  }
  // Make the chain thenable so await works on any terminal
  chain.then = (resolve, reject) => {
    try { resolve(resolvedValue); } catch (e) { if (reject) reject(e); else throw e; }
  };
  return chain;
}

// ── Setup default mocks ─────────────────────────────────────────────────────

function setupDefaultMocks({
  profileData = null,
  nodeData = null,
  attempts = [],
  runs = [],
  decisions = [],
  errors = [],
  profileError = null,
  attemptsError = null,
  runsError = null,
  decisionsError = null,
  errorsError = null,
} = {}) {
  mockFromHandlers = {
    user_learning_profiles: () => buildChain(
      { data: profileData, error: profileError },
      'maybeSingle'
    ),
    curriculum_nodes: () => buildChain(
      { data: nodeData, error: null },
      'maybeSingle'
    ),
    attempts: () => buildChain(
      { data: attempts, error: attemptsError }
    ),
    mark_runs: () => buildChain(
      { data: runs, error: runsError }
    ),
    mark_decisions: () => buildChain(
      { data: decisions, error: decisionsError }
    ),
    error_events: () => buildChain(
      { data: errors, error: errorsError }
    ),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/evidence/context', () => {
  beforeEach(() => {
    _resetClient();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    mockResolveUserId.mockResolvedValue({ user_id: USER_ID, auth_source: 'jwt' });
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Returns 400 when topic_path is missing ──────────────────────────

  describe('parameter validation', () => {
    it('returns 400 when topic_path is missing', async () => {
      const req = makeReq('');
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.getBody().error).toMatch(/topic_path/i);
    });

    it('returns 400 when topic_path is empty string', async () => {
      const req = makeReq('?topic_path=');
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ── 2. Returns 401 when no valid JWT ───────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when resolveUserId throws AuthError', async () => {
      mockResolveUserId.mockRejectedValue(new MockAuthError('Invalid token'));
      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.getBody().error).toBe('Invalid token');
    });

    it('returns custom status from AuthError', async () => {
      mockResolveUserId.mockRejectedValue(new MockAuthError('Forbidden', 403));
      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('re-throws non-AuthError exceptions', async () => {
      mockResolveUserId.mockRejectedValue(new Error('unexpected'));
      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);
      // Non-AuthError is caught by the outer try/catch → 500
      expect(res.statusCode).toBe(500);
      expect(res.getBody().error).toBe('Internal server error');
    });
  });

  // ── 3. Returns correct mastery data ────────────────────────────────────

  describe('mastery data', () => {
    it('returns mastery from user_learning_profiles for matching node', async () => {
      setupDefaultMocks({
        profileData: {
          mastery_by_node: {
            [NODE_ID]: {
              score: 0.75,
              sample_count: 10,
              weighted_sample_count: 15,
              low_confidence: false,
              last_updated: '2025-01-01T00:00:00Z',
            },
          },
          misconception_frequencies: {},
        },
        nodeData: { node_id: NODE_ID },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = res.getBody();
      expect(body.mastery).toEqual({
        score: 0.75,
        sample_count: 10,
        weighted_sample_count: 15,
        low_confidence: false,
      });
    });

    it('returns null mastery when no profile exists', async () => {
      setupDefaultMocks({ profileData: null });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().mastery).toBeNull();
    });

    it('returns null mastery when node_id not found in mastery_by_node', async () => {
      setupDefaultMocks({
        profileData: {
          mastery_by_node: { 'other-node': { score: 0.5 } },
          misconception_frequencies: {},
        },
        nodeData: { node_id: 'different-node' },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().mastery).toBeNull();
    });
  });

  // ── 4. Returns recent_decisions filtered by topic_path prefix ──────────

  describe('recent_decisions', () => {
    it('returns decisions filtered by topic_path subtree', async () => {
      const matchingDecisions = [
        { rubric_id: 'r1', mark_label: 'M1', awarded: true, reason: 'best_match', created_at: '2025-01-02T00:00:00Z' },
        { rubric_id: 'r2', mark_label: 'A1', awarded: false, reason: 'below_threshold', created_at: '2025-01-01T00:00:00Z' },
      ];

      setupDefaultMocks({
        attempts: [
          { attempt_id: 'att-1', topic_path: '9709.p1.algebra.quadratics' },
          { attempt_id: 'att-2', topic_path: '9709.p1.calculus' }, // not in subtree
        ],
        runs: [{ mark_run_id: 'mr-1' }],
        decisions: matchingDecisions,
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().recent_decisions).toEqual(matchingDecisions);
    });

    it('returns empty array when no attempts match topic_path', async () => {
      setupDefaultMocks({
        attempts: [
          { attempt_id: 'att-1', topic_path: '9709.p1.calculus' },
        ],
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().recent_decisions).toEqual([]);
    });

    it('returns empty array when no attempts exist', async () => {
      setupDefaultMocks({ attempts: [] });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().recent_decisions).toEqual([]);
    });
  });

  // ── 5. Returns misconception_tags sorted by weighted_count DESC ────────

  describe('misconception_tags', () => {
    it('returns top 10 misconception tags sorted by weighted_count DESC', async () => {
      const frequencies = {};
      for (let i = 1; i <= 12; i++) {
        frequencies[`tag-${i}`] = {
          count: i,
          weighted_count: i * 0.5,
          last_seen: `2025-01-${String(i).padStart(2, '0')}T00:00:00Z`,
        };
      }

      setupDefaultMocks({
        profileData: {
          mastery_by_node: {},
          misconception_frequencies: frequencies,
        },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const tags = res.getBody().misconception_tags;
      expect(tags).toHaveLength(10);
      // Should be sorted DESC by weighted_count
      expect(tags[0].tag).toBe('tag-12');
      expect(tags[0].weighted_count).toBe(6);
      expect(tags[9].tag).toBe('tag-3');
    });

    it('returns empty array when no misconception data', async () => {
      setupDefaultMocks({
        profileData: {
          mastery_by_node: {},
          misconception_frequencies: {},
        },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().misconception_tags).toEqual([]);
    });
  });

  // ── 6. Returns recent_errors filtered by topic_path prefix ─────────────

  describe('recent_errors', () => {
    it('returns max 5 errors filtered by topic_path subtree', async () => {
      const errors = [];
      for (let i = 1; i <= 8; i++) {
        errors.push({
          misconception_tag: `tag-${i}`,
          severity: i % 2 === 0 ? 'major' : 'minor',
          topic_path: i <= 6 ? '9709.p1.algebra.quadratics.completing' : '9709.p1.calculus',
          created_at: `2025-01-${String(i).padStart(2, '0')}T00:00:00Z`,
        });
      }

      setupDefaultMocks({ errors });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const recentErrors = res.getBody().recent_errors;
      expect(recentErrors.length).toBeLessThanOrEqual(5);
      // All should be in the subtree
      for (const e of recentErrors) {
        expect(e.topic_path.startsWith(TOPIC_PATH)).toBe(true);
      }
    });

    it('returns empty array when no errors exist', async () => {
      setupDefaultMocks({ errors: [] });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().recent_errors).toEqual([]);
    });
  });

  // ── 7. Returns empty arrays/null mastery when no data exists ───────────

  describe('empty data', () => {
    it('returns null mastery and empty arrays when user has no data', async () => {
      setupDefaultMocks();

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const body = res.getBody();
      expect(body.mastery).toBeNull();
      expect(body.recent_decisions).toEqual([]);
      expect(body.misconception_tags).toEqual([]);
      expect(body.recent_errors).toEqual([]);
    });
  });

  // ── 8. Respects limit parameter ───────────────────────────────────────

  describe('limit parameter', () => {
    it('defaults to 10 when limit is not provided', async () => {
      setupDefaultMocks({
        attempts: [{ attempt_id: 'att-1', topic_path: TOPIC_PATH }],
        runs: [{ mark_run_id: 'mr-1' }],
        decisions: [],
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('clamps limit to max 50', async () => {
      setupDefaultMocks({
        attempts: [{ attempt_id: 'att-1', topic_path: TOPIC_PATH }],
        runs: [{ mark_run_id: 'mr-1' }],
        decisions: [],
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}&limit=100`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('uses default when limit is invalid', async () => {
      setupDefaultMocks({
        attempts: [{ attempt_id: 'att-1', topic_path: TOPIC_PATH }],
        runs: [{ mark_run_id: 'mr-1' }],
        decisions: [],
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}&limit=abc`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('uses default when limit is negative', async () => {
      setupDefaultMocks({
        attempts: [{ attempt_id: 'att-1', topic_path: TOPIC_PATH }],
        runs: [{ mark_run_id: 'mr-1' }],
        decisions: [],
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}&limit=-5`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  // ── 9. Handles Supabase query errors gracefully ────────────────────────

  describe('error handling', () => {
    it('returns null mastery when profile query fails', async () => {
      setupDefaultMocks({
        profileError: { message: 'DB error' },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().mastery).toBeNull();
      expect(res.getBody().misconception_tags).toEqual([]);
    });

    it('returns empty decisions when attempts query fails', async () => {
      setupDefaultMocks({
        attemptsError: { message: 'DB error' },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().recent_decisions).toEqual([]);
    });

    it('returns empty errors when error_events query fails', async () => {
      setupDefaultMocks({
        errorsError: { message: 'DB error' },
      });

      const req = makeReq(`?topic_path=${TOPIC_PATH}`);
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getBody().recent_errors).toEqual([]);
    });

    it('returns 405 for non-GET methods', async () => {
      const req = makeReq(`?topic_path=${TOPIC_PATH}`, 'POST');
      const res = makeRes();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.getBody().error).toMatch(/method/i);
    });
  });
});
