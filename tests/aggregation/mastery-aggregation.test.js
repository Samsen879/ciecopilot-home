import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  aggregateForUser,
  aggregateMasteryEvidence,
  classifyMasteryDecision,
} from '../../scripts/aggregation/aggregate-learner-profiles.js';

const NOW = new Date('2026-03-10T10:00:00Z');

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
    created_at: '2026-03-10T09:00:00Z',
    ...overrides,
  };
}

function makeDecisionRow(overrides = {}) {
  const decision = makeDecision(overrides);
  return {
    awarded: decision.awarded,
    awarded_marks: decision.awarded ? 1 : 0,
    reason: decision.reason,
    created_at: decision.created_at,
    mark_runs: {
      attempt_id: decision.attempt_id,
      attempts: {
        attempt_id: decision.attempt_id,
        node_id: decision.node_id,
        user_id: 'user-001',
        syllabus_code: '9709',
      },
    },
  };
}

function mockSupabase({ decisions = [], errorEvents = [], upsertError = null } = {}) {
  const markDecisionsChain = {
    eq: jest.fn().mockReturnThis(),
    then: (resolve) => resolve({ data: decisions, error: null }),
  };

  const errorEventsChain = {
    eq: jest.fn().mockReturnThis(),
    then: (resolve) => resolve({ data: errorEvents, error: null }),
  };

  const profileChain = {
    upsert: jest.fn().mockResolvedValue({ error: upsertError }),
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };

  return {
    from: jest.fn((table) => {
      if (table === 'mark_decisions') {
        return { select: jest.fn().mockReturnValue(markDecisionsChain) };
      }
      if (table === 'error_events') {
        return { select: jest.fn().mockReturnValue(errorEventsChain) };
      }
      if (table === 'user_learning_profiles') {
        return profileChain;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
    _profileChain: profileChain,
  };
}

describe('classifyMasteryDecision()', () => {
  it('treats uncertain and structural reasons as non-scoring evidence', () => {
    expect(classifyMasteryDecision({ awarded: false, reason: 'uncertain' })).toMatchObject({
      counted: false,
      category: 'uncertain',
      normalized_reason: 'uncertain',
    });

    expect(classifyMasteryDecision({ awarded: false, reason: 'borderline_score' })).toMatchObject({
      counted: false,
      category: 'uncertain',
      normalized_reason: 'borderline',
    });

    expect(classifyMasteryDecision({ awarded: false, reason: 'dependency_error' })).toMatchObject({
      counted: false,
      category: 'structural_gating',
      normalized_reason: 'dependency_error',
    });

    expect(classifyMasteryDecision({ awarded: false, reason: 'dependency_not_met' })).toMatchObject({
      counted: false,
      category: 'structural_gating',
      normalized_reason: 'dependency_not_met',
    });
  });
});

describe('aggregateMasteryEvidence()', () => {
  it('does not turn uncertain-only evidence into a zero-score mastery sample', () => {
    const { mastery_by_node: mastery, diagnostics } = aggregateMasteryEvidence([
      makeDecision({ awarded: false, reason: 'uncertain' }),
      makeDecision({ awarded: false, reason: 'dependency_error', attempt_id: 'att-structural' }),
    ], NOW);

    expect(mastery).toEqual({});
    expect(diagnostics.node_count).toBe(1);
    expect(diagnostics.excluded_only_node_count).toBe(1);
    expect(diagnostics.uncertain_decision_count).toBe(1);
    expect(diagnostics.structural_gating_decision_count).toBe(1);
    expect(diagnostics.excluded_reason_counts).toEqual({
      dependency_error: 1,
      uncertain: 1,
    });
  });

  it('separates structural gating from genuine ability gaps in node diagnostics', () => {
    const { mastery_by_node: mastery, diagnostics } = aggregateMasteryEvidence([
      makeDecision({
        attempt_id: 'att-awarded',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-03-10T09:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-gated',
        awarded: false,
        reason: 'dependency_not_met',
        created_at: '2026-03-10T08:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-gap',
        awarded: false,
        reason: 'below_threshold',
        created_at: '2026-03-10T07:00:00Z',
      }),
    ], NOW);

    expect(mastery['node-001']).toMatchObject({
      score: 0.5,
      sample_count: 2,
      weighted_sample_count: 4,
      low_confidence: true,
    });
    expect(mastery['node-001'].diagnostics).toMatchObject({
      counted_attempt_count: 2,
      positive_decision_count: 1,
      negative_decision_count: 1,
      structural_gating_decision_count: 1,
      uncertain_decision_count: 0,
      excluded_only_attempt_count: 1,
      mixed_signal_attempt_count: 0,
      excluded_reason_counts: {
        dependency_not_met: 1,
      },
    });
    expect(diagnostics.scored_node_count).toBe(1);
    expect(diagnostics.structural_gating_decision_count).toBe(1);
    expect(diagnostics.negative_decision_count).toBe(1);
  });

  it('excludes borderline and uncertain decisions without erasing positive evidence', () => {
    const { mastery_by_node: mastery } = aggregateMasteryEvidence([
      makeDecision({
        attempt_id: 'att-awarded',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-03-10T09:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-borderline',
        awarded: false,
        reason: 'borderline_score',
        created_at: '2026-03-10T08:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-uncertain',
        awarded: false,
        reason: 'uncertain',
        created_at: '2026-03-10T07:00:00Z',
      }),
    ], NOW);

    expect(mastery['node-001']).toMatchObject({
      score: 1,
      sample_count: 1,
      weighted_sample_count: 2,
      low_confidence: true,
    });
    expect(mastery['node-001'].diagnostics).toMatchObject({
      positive_decision_count: 1,
      negative_decision_count: 0,
      uncertain_decision_count: 2,
      excluded_only_attempt_count: 2,
      excluded_reason_counts: {
        borderline_score: 1,
        uncertain: 1,
      },
    });
  });

  it('is stable across input order changes and same-timestamp attempts', () => {
    const decisions = [
      makeDecision({
        attempt_id: 'att-b',
        node_id: 'node-b',
        awarded: false,
        reason: 'below_threshold',
        created_at: '2026-03-10T09:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-a',
        node_id: 'node-a',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-03-10T09:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-a-uncertain',
        node_id: 'node-a',
        awarded: false,
        reason: 'uncertain',
        created_at: '2026-03-10T09:00:00Z',
      }),
      makeDecision({
        attempt_id: 'att-b2',
        node_id: 'node-b',
        awarded: true,
        reason: 'best_match',
        created_at: '2026-03-10T09:00:00Z',
      }),
    ];

    const forward = aggregateMasteryEvidence(decisions, NOW);
    const reversed = aggregateMasteryEvidence([...decisions].reverse(), NOW);

    expect(reversed).toEqual(forward);
  });
});

describe('aggregateForUser()', () => {
  it('returns mastery diagnostics in dry-run mode for auditability', async () => {
    const sb = mockSupabase({
      decisions: [
        makeDecisionRow({
          attempt_id: 'att-awarded',
          awarded: true,
          reason: 'best_match',
          created_at: '2026-03-10T09:00:00Z',
        }),
        makeDecisionRow({
          attempt_id: 'att-uncertain',
          awarded: false,
          reason: 'uncertain',
          created_at: '2026-03-10T08:00:00Z',
        }),
        makeDecisionRow({
          attempt_id: 'att-gated',
          awarded: false,
          reason: 'dependency_error',
          created_at: '2026-03-10T07:00:00Z',
        }),
      ],
    });

    const result = await aggregateForUser({
      supabase: sb,
      userId: 'user-001',
      subjectCode: '9709',
      dryRun: true,
      now: NOW,
    });

    expect(result.status).toBe('success');
    expect(result.mastery_nodes).toBe(1);
    expect(result.diagnostics.mastery).toMatchObject({
      scored_node_count: 1,
      uncertain_decision_count: 1,
      structural_gating_decision_count: 1,
      excluded_reason_counts: {
        dependency_error: 1,
        uncertain: 1,
      },
    });
    expect(sb._profileChain.upsert).not.toHaveBeenCalled();
  });
});
