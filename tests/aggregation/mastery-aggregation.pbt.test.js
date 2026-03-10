import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { aggregateMasteryEvidence } from '../../scripts/aggregation/aggregate-learner-profiles.js';

const NOW = new Date('2026-03-10T10:00:00Z');
const NODE_ID = 'node-stable';

const arbRecentDate = fc.integer({ min: 0, max: 60 * 24 * 3600 * 1000 })
  .map((offset) => new Date(NOW.getTime() - offset).toISOString());

const arbAttemptId = fc.uuid().map((value) => `att-${value}`);

const arbCountedDecision = fc.oneof(
  fc.record({
    attempt_id: arbAttemptId,
    node_id: fc.constant(NODE_ID),
    awarded: fc.constant(true),
    reason: fc.constant('best_match'),
    created_at: arbRecentDate,
  }),
  fc.record({
    attempt_id: arbAttemptId,
    node_id: fc.constant(NODE_ID),
    awarded: fc.constant(false),
    reason: fc.constantFrom('below_threshold', 'no_match'),
    created_at: arbRecentDate,
  }),
);

const arbExcludedReason = fc.constantFrom(
  'uncertain',
  'borderline_score',
  'dependency_error',
  'dependency_not_met',
  'dependency_blocked',
  'sympy_parse_fail: invalid syntax',
);

function stableMasteryShape(node) {
  if (!node) return null;
  return {
    score: node.score,
    sample_count: node.sample_count,
    weighted_sample_count: node.weighted_sample_count,
    low_confidence: node.low_confidence,
  };
}

describe('mastery aggregation non-signal stability', () => {
  it('adding excluded-only attempts never changes the mastery score window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbCountedDecision, { minLength: 1, maxLength: 25 }),
        fc.array(
          fc.record({
            attempt_id: arbAttemptId,
            node_id: fc.constant(NODE_ID),
            awarded: fc.constant(false),
            reason: arbExcludedReason,
            created_at: arbRecentDate,
          }),
          { minLength: 1, maxLength: 15 },
        ),
        async (countedDecisions, excludedDecisions) => {
          const base = aggregateMasteryEvidence(countedDecisions, NOW);
          const augmented = aggregateMasteryEvidence(
            [...countedDecisions, ...excludedDecisions],
            NOW,
          );

          expect(stableMasteryShape(augmented.mastery_by_node[NODE_ID]))
            .toEqual(stableMasteryShape(base.mastery_by_node[NODE_ID]));
        },
      ),
      { numRuns: 75 },
    );
  });

  it('adding excluded decisions onto already-counted attempts never changes attempt scoring', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbCountedDecision, { minLength: 1, maxLength: 20 }),
        fc.array(arbExcludedReason, { minLength: 1, maxLength: 20 }),
        async (countedDecisions, excludedReasons) => {
          const shadowExcluded = countedDecisions.map((decision, index) => ({
            attempt_id: decision.attempt_id,
            node_id: decision.node_id,
            awarded: false,
            reason: excludedReasons[index % excludedReasons.length],
            created_at: decision.created_at,
          }));

          const base = aggregateMasteryEvidence(countedDecisions, NOW);
          const augmented = aggregateMasteryEvidence(
            [...countedDecisions, ...shadowExcluded],
            NOW,
          );

          expect(stableMasteryShape(augmented.mastery_by_node[NODE_ID]))
            .toEqual(stableMasteryShape(base.mastery_by_node[NODE_ID]));
        },
      ),
      { numRuns: 75 },
    );
  });
});
