// tests/evidence-ledger/aggregation.test.js
// Unit tests for scripts/aggregation/aggregate-learner-profiles.js
// Covers: computeMasteryByNode, computeMisconceptionFrequencies, aggregateForUser
// Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  computeMasteryByNode,
  computeMisconceptionFrequencies,
  aggregateForUser,
} from '../../scripts/aggregation/aggregate-learner-profiles.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-02-17T10:00:00Z');
let decisionCounter = 0;
beforeEach(() => {
  decisionCounter = 0;
});

function makeDecision(overrides = {}) {
  return {
    attempt_id: `att-${++decisionCounter}`,
    node_id: 'node-001',
    awarded: true,
    reason: 'best_match',
    created_at: '2026-02-17T09:00:00Z',
    ...overrides,
  };
}

function makeErrorEvent(overrides = {}) {
  return {
    misconception_tag: 'calculation_error',
    created_at: '2026-02-17T09:00:00Z',
    ...overrides,
  };
}

// ── computeMasteryByNode ────────────────────────────────────────────────────

describe('computeMasteryByNode()', () => {
  it('returns empty object for empty input', () => {
    expect(computeMasteryByNode([], NOW)).toEqual({});
    expect(computeMasteryByNode(null, NOW)).toEqual({});
    expect(computeMasteryByNode(undefined, NOW)).toEqual({});
  });

  it('computes correct score for a single node with all awarded', () => {
    const decisions = Array.from({ length: 5 }, (_, i) =>
      makeDecision({ created_at: `2026-02-${17 - i}T09:00:00Z` }),
    );
    const result = computeMasteryByNode(decisions, NOW);

    expect(result['node-001']).toBeDefined();
    expect(result['node-001'].score).toBe(1);
    expect(result['node-001'].sample_count).toBe(5);
    expect(result['node-001'].weighted_sample_count).toBe(10); // 5 * 2.0
    expect(result['node-001'].low_confidence).toBe(false);
  });

  it('computes correct score for a single node with none awarded', () => {
    const decisions = Array.from({ length: 5 }, (_, i) =>
      makeDecision({ awarded: false, created_at: `2026-02-${17 - i}T09:00:00Z` }),
    );
    const result = computeMasteryByNode(decisions, NOW);

    expect(result['node-001'].score).toBe(0);
    expect(result['node-001'].sample_count).toBe(5);
  });

  it('applies weight 2.0 to most recent 5 and 1.0 to the rest', () => {
    // 10 decisions: first 5 (most recent) awarded=true, next 5 awarded=false
    const decisions = [];
    for (let i = 0; i < 10; i++) {
      decisions.push(makeDecision({
        awarded: i < 5, // most recent 5 are awarded
        created_at: new Date(NOW.getTime() - i * 3600000).toISOString(),
      }));
    }

    const result = computeMasteryByNode(decisions, NOW);
    // Recent 5 (awarded=true): 5 * 2.0 = 10.0 weighted awarded
    // Older 5 (awarded=false): 0
    // Total weight: 5*2.0 + 5*1.0 = 15.0
    // Score: 10.0 / 15.0 = 0.6667
    expect(result['node-001'].score).toBeCloseTo(0.6667, 4);
    expect(result['node-001'].weighted_sample_count).toBe(15);
  });

  it('excludes borderline_score and dependency_error reasons', () => {
    const decisions = [
      makeDecision({ awarded: true, reason: 'best_match' }),
      makeDecision({ awarded: false, reason: 'borderline_score' }),
      makeDecision({ awarded: false, reason: 'dependency_error' }),
    ];
    const result = computeMasteryByNode(decisions, NOW);

    // Only 1 decision counted (best_match, awarded=true)
    expect(result['node-001'].score).toBe(1);
    expect(result['node-001'].sample_count).toBe(1);
  });

  it('marks low_confidence when sample_count < 3', () => {
    const decisions = [
      makeDecision({ awarded: true }),
      makeDecision({ awarded: false, created_at: '2026-02-16T09:00:00Z' }),
    ];
    const result = computeMasteryByNode(decisions, NOW);

    expect(result['node-001'].low_confidence).toBe(true);
    expect(result['node-001'].sample_count).toBe(2);
  });

  it('does not mark low_confidence when sample_count >= 3', () => {
    const decisions = Array.from({ length: 3 }, (_, i) =>
      makeDecision({ created_at: `2026-02-${17 - i}T09:00:00Z` }),
    );
    const result = computeMasteryByNode(decisions, NOW);

    expect(result['node-001'].low_confidence).toBe(false);
  });

  it('limits to most recent 20 decisions per node', () => {
    const decisions = Array.from({ length: 25 }, (_, i) =>
      makeDecision({ created_at: new Date(NOW.getTime() - i * 3600000).toISOString() }),
    );
    const result = computeMasteryByNode(decisions, NOW);

    expect(result['node-001'].sample_count).toBe(20);
  });

  it('groups by node_id correctly', () => {
    const decisions = [
      makeDecision({ node_id: 'node-A', awarded: true }),
      makeDecision({ node_id: 'node-B', awarded: false }),
      makeDecision({ node_id: 'node-A', awarded: false, created_at: '2026-02-16T09:00:00Z' }),
    ];
    const result = computeMasteryByNode(decisions, NOW);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['node-A']).toBeDefined();
    expect(result['node-B']).toBeDefined();
    expect(result['node-A'].sample_count).toBe(2);
    expect(result['node-B'].sample_count).toBe(1);
  });

  it('skips decisions with null node_id', () => {
    const decisions = [
      makeDecision({ node_id: null, awarded: true }),
      makeDecision({ node_id: 'node-001', awarded: true }),
    ];
    const result = computeMasteryByNode(decisions, NOW);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['node-001']).toBeDefined();
  });

  it('returns all excluded reasons → empty result', () => {
    const decisions = [
      makeDecision({ reason: 'borderline_score' }),
      makeDecision({ reason: 'dependency_error' }),
    ];
    const result = computeMasteryByNode(decisions, NOW);
    expect(result).toEqual({});
  });
});

// ── computeMisconceptionFrequencies ─────────────────────────────────────────

describe('computeMisconceptionFrequencies()', () => {
  it('returns empty object for empty input', () => {
    expect(computeMisconceptionFrequencies([], NOW)).toEqual({});
    expect(computeMisconceptionFrequencies(null, NOW)).toEqual({});
    expect(computeMisconceptionFrequencies(undefined, NOW)).toEqual({});
  });

  it('applies weight 1.0 for events within 30 days', () => {
    const events = [
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 5 * 86400000).toISOString() }), // 5 days ago
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 10 * 86400000).toISOString() }), // 10 days ago
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(result['calculation_error'].count).toBe(2);
    expect(result['calculation_error'].weighted_count).toBe(2.0);
  });

  it('applies weight 0.5 for events 30-90 days ago', () => {
    const events = [
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 45 * 86400000).toISOString() }), // 45 days ago
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 60 * 86400000).toISOString() }), // 60 days ago
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(result['calculation_error'].count).toBe(2);
    expect(result['calculation_error'].weighted_count).toBe(1.0); // 2 * 0.5
  });

  it('applies weight 0.2 for events older than 90 days', () => {
    const events = [
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 100 * 86400000).toISOString() }), // 100 days ago
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 200 * 86400000).toISOString() }), // 200 days ago
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(result['calculation_error'].count).toBe(2);
    expect(result['calculation_error'].weighted_count).toBe(0.4); // 2 * 0.2
  });

  it('applies mixed time decay weights correctly', () => {
    const events = [
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 5 * 86400000).toISOString() }),   // 5d → 1.0
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 45 * 86400000).toISOString() }),  // 45d → 0.5
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 100 * 86400000).toISOString() }), // 100d → 0.2
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(result['calculation_error'].count).toBe(3);
    expect(result['calculation_error'].weighted_count).toBe(1.7); // 1.0 + 0.5 + 0.2
  });

  it('groups by misconception_tag correctly', () => {
    const events = [
      makeErrorEvent({ misconception_tag: 'sign_error' }),
      makeErrorEvent({ misconception_tag: 'calculation_error' }),
      makeErrorEvent({ misconception_tag: 'sign_error', created_at: '2026-02-16T09:00:00Z' }),
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['sign_error'].count).toBe(2);
    expect(result['calculation_error'].count).toBe(1);
  });

  it('tracks last_seen as the most recent event date', () => {
    const events = [
      makeErrorEvent({ created_at: '2026-02-10T09:00:00Z' }),
      makeErrorEvent({ created_at: '2026-02-15T09:00:00Z' }),
      makeErrorEvent({ created_at: '2026-02-12T09:00:00Z' }),
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(result['calculation_error'].last_seen).toBe('2026-02-15T09:00:00.000Z');
  });

  it('skips events with null misconception_tag', () => {
    const events = [
      makeErrorEvent({ misconception_tag: null }),
      makeErrorEvent({ misconception_tag: 'sign_error' }),
    ];
    const result = computeMisconceptionFrequencies(events, NOW);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result['sign_error']).toBeDefined();
  });

  it('boundary: event exactly at 30 days gets weight 1.0', () => {
    const events = [
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 30 * 86400000).toISOString() }),
    ];
    const result = computeMisconceptionFrequencies(events, NOW);
    expect(result['calculation_error'].weighted_count).toBe(1.0);
  });

  it('boundary: event exactly at 90 days gets weight 0.5', () => {
    const events = [
      makeErrorEvent({ created_at: new Date(NOW.getTime() - 90 * 86400000).toISOString() }),
    ];
    const result = computeMisconceptionFrequencies(events, NOW);
    expect(result['calculation_error'].weighted_count).toBe(0.5);
  });
});

// ── aggregateForUser ────────────────────────────────────────────────────────

describe('aggregateForUser()', () => {
  function mockSupabase({ decisions = [], errorEvents = [], upsertError = null } = {}) {
    // Build a chainable mock for Supabase queries
    const makeChain = (data, error = null) => {
      const chain = {
        select: jest.fn().mockReturnValue(chain),
        eq: jest.fn().mockReturnValue(chain),
        order: jest.fn().mockReturnValue(chain),
        limit: jest.fn().mockReturnValue(chain),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: undefined,
      };
      // Make it thenable so await works
      chain.then = (resolve) => resolve({ data, error });
      return chain;
    };

    const fromMap = {
      mark_decisions: (() => {
        const chain = {
          select: jest.fn().mockReturnValue(null),
          eq: jest.fn(),
        };
        // Build the full chain for mark_decisions query
        const selectChain = {
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ data: decisions, error: null }),
        };
        chain.select = jest.fn().mockReturnValue(selectChain);
        return chain;
      })(),
      error_events: (() => {
        const chain = {
          select: jest.fn().mockReturnValue(null),
          eq: jest.fn(),
        };
        const selectChain = {
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ data: errorEvents, error: null }),
        };
        chain.select = jest.fn().mockReturnValue(selectChain);
        return chain;
      })(),
      user_learning_profiles: (() => {
        const chain = {
          upsert: jest.fn().mockResolvedValue({ error: upsertError }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
        return chain;
      })(),
    };

    return {
      from: jest.fn((table) => fromMap[table] || makeChain(null)),
      _fromMap: fromMap,
    };
  }

  it('returns skipped when no decisions and no error events', async () => {
    const sb = mockSupabase({ decisions: [], errorEvents: [] });
    const result = await aggregateForUser({
      supabase: sb,
      userId: 'user-001',
      subjectCode: '9709',
      now: NOW,
    });

    expect(result.status).toBe('skipped');
    expect(result.mastery_nodes).toBe(0);
    expect(result.misconception_tags).toBe(0);
  });

  it('upserts to user_learning_profiles on success', async () => {
    const decisions = [
      {
        node_id: 'node-001',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-02-17T09:00:00Z',
        mark_runs: {
          attempt_id: 'att-1',
          attempts: { attempt_id: 'att-1', node_id: 'node-001', user_id: 'user-001', syllabus_code: '9709' },
        },
      },
    ];
    const errorEvents = [
      { misconception_tag: 'sign_error', created_at: '2026-02-17T09:00:00Z' },
    ];

    const sb = mockSupabase({ decisions, errorEvents });
    const result = await aggregateForUser({
      supabase: sb,
      userId: 'user-001',
      subjectCode: '9709',
      now: NOW,
    });

    expect(result.status).toBe('success');
    expect(result.mastery_nodes).toBe(1);
    expect(result.misconception_tags).toBe(1);
    expect(sb._fromMap.user_learning_profiles.upsert).toHaveBeenCalled();
  });

  it('does not upsert in dry-run mode', async () => {
    const decisions = [
      {
        node_id: 'node-001',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-02-17T09:00:00Z',
        mark_runs: {
          attempt_id: 'att-1',
          attempts: { attempt_id: 'att-1', node_id: 'node-001', user_id: 'user-001', syllabus_code: '9709' },
        },
      },
    ];

    const sb = mockSupabase({ decisions });
    const result = await aggregateForUser({
      supabase: sb,
      userId: 'user-001',
      subjectCode: '9709',
      dryRun: true,
      now: NOW,
    });

    expect(result.status).toBe('success');
    expect(sb._fromMap.user_learning_profiles.upsert).not.toHaveBeenCalled();
  });

  it('returns failed when upsert errors', async () => {
    const decisions = [
      {
        node_id: 'node-001',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-02-17T09:00:00Z',
        mark_runs: {
          attempt_id: 'att-1',
          attempts: { attempt_id: 'att-1', node_id: 'node-001', user_id: 'user-001', syllabus_code: '9709' },
        },
      },
    ];

    const sb = mockSupabase({ decisions, upsertError: { message: 'upsert failed' } });
    const result = await aggregateForUser({
      supabase: sb,
      userId: 'user-001',
      subjectCode: '9709',
      now: NOW,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('upsert failed');
  });
});
