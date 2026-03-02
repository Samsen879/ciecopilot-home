// tests/evidence-ledger/aggregation.pbt.test.js
// Property-based tests for scripts/aggregation/aggregate-learner-profiles.js
// Feature: learning-evidence-ledger
// Properties 14, 15, 16: Mastery score aggregation, misconception frequency, ltree subtree mastery
// **Validates: Requirements 6.1, 6.2, 6.4**

import { describe, it, expect } from '@jest/globals';
import fc from 'fast-check';
import {
  computeMasteryByNode,
  computeMisconceptionFrequencies,
} from '../../scripts/aggregation/aggregate-learner-profiles.js';

// ── Constants (mirrored from implementation) ────────────────────────────────

const EXCLUDED_MASTERY_REASONS = new Set(['borderline_score', 'dependency_error']);
const VALID_REASONS = [
  'best_match', 'below_threshold', 'borderline_score',
  'dependency_not_met', 'dependency_error', 'no_match',
];
const INCLUDED_REASONS = VALID_REASONS.filter(r => !EXCLUDED_MASTERY_REASONS.has(r));
const DECAY_WINDOWS = [
  { maxDays: 30, weight: 1.0 },
  { maxDays: 90, weight: 0.5 },
  { maxDays: Infinity, weight: 0.2 },
];
const RECENT_COUNT = 5;
const RECENT_WEIGHT = 2.0;
const DEFAULT_WEIGHT = 1.0;
const MAX_ATTEMPTS = 20;
const LOW_CONFIDENCE_THRESHOLD = 3;

// ── Reference time ──────────────────────────────────────────────────────────

const NOW = new Date('2026-02-17T10:00:00Z');

// ── Generators ──────────────────────────────────────────────────────────────

/** Random node_id (non-null string) */
const arbNodeId = fc.stringMatching(/^[a-p0-9]{3,10}$/)
  .map(s => `node-${s}`);

/** Random reason from the full valid set */
const arbReason = fc.constantFrom(...VALID_REASONS);

/** Random reason that is NOT excluded from mastery */
const arbIncludedReason = fc.constantFrom(...INCLUDED_REASONS);

/** Random reason that IS excluded from mastery */
const arbExcludedReason = fc.constantFrom('borderline_score', 'dependency_error');

/** Random attempt_id */
const arbAttemptId = fc.uuid().map(u => `att-${u}`);

/** Random ISO date string within the last 365 days from NOW */
const arbRecentDate = fc.integer({ min: 0, max: 365 * 24 * 3600 * 1000 })
  .map(offset => new Date(NOW.getTime() - offset).toISOString());

/** A single decision with a non-null node_id and any valid reason */
const arbDecision = fc.record({
  attempt_id: arbAttemptId,
  node_id: arbNodeId,
  awarded: fc.boolean(),
  reason: arbReason,
  created_at: arbRecentDate,
});

/** A single decision with a non-null node_id and an included (non-excluded) reason */
const arbIncludedDecision = fc.record({
  attempt_id: arbAttemptId,
  node_id: arbNodeId,
  awarded: fc.boolean(),
  reason: arbIncludedReason,
  created_at: arbRecentDate,
});

/** A decision with null node_id */
const arbNullNodeDecision = fc.record({
  attempt_id: arbAttemptId,
  node_id: fc.constant(null),
  awarded: fc.boolean(),
  reason: arbReason,
  created_at: arbRecentDate,
});

/** A decision with an excluded reason */
const arbExcludedDecision = fc.record({
  attempt_id: arbAttemptId,
  node_id: arbNodeId,
  awarded: fc.boolean(),
  reason: arbExcludedReason,
  created_at: arbRecentDate,
});

/** Random misconception tag */
const arbMisconceptionTag = fc.stringMatching(/^[a-p_]{3,15}$/)
  .map(s => `misc_${s}`);

/** A single error event with a non-null tag */
const arbErrorEvent = fc.record({
  misconception_tag: arbMisconceptionTag,
  created_at: arbRecentDate,
});

/** An error event with null tag */
const arbNullTagEvent = fc.record({
  misconception_tag: fc.constant(null),
  created_at: arbRecentDate,
});

/** Topic path segments for ltree-style paths */
const arbPathSegment = fc.constantFrom(
  'algebra', 'calculus', 'trigonometry', 'statistics', 'mechanics',
  'quadratics', 'differentiation', 'integration', 'vectors', 'probability',
);

/** Topic path like '9709.p1.algebra' or '9709.p1.algebra.quadratics' */
const arbTopicPath = fc.tuple(
  fc.constantFrom('9709', '9231', '9702'),
  fc.constantFrom('p1', 'p2', 'p3', 'p4', 'p5'),
  fc.array(arbPathSegment, { minLength: 1, maxLength: 3 }),
).map(([subject, paper, segments]) => [subject, paper, ...segments].join('.'));

// ── Helper: reference mastery computation ───────────────────────────────────

/**
 * Reference implementation of mastery computation for a single node.
 * Mirrors attempt-level aggregation in production code.
 * Used to verify the real implementation against.
 */
function referenceMasteryForNode(decisions) {
  const byAttempt = new Map();
  for (const d of decisions) {
    if (!d.attempt_id) continue;
    if (!byAttempt.has(d.attempt_id)) {
      byAttempt.set(d.attempt_id, {
        latest_created_at: d.created_at,
        awarded_true: 0,
        total: 0,
      });
    }

    const agg = byAttempt.get(d.attempt_id);
    agg.total += 1;
    if (d.awarded === true) agg.awarded_true += 1;
    if (new Date(d.created_at) > new Date(agg.latest_created_at)) {
      agg.latest_created_at = d.created_at;
    }
  }

  const sortedAttempts = Array.from(byAttempt.values())
    .map(a => ({
      created_at: a.latest_created_at,
      attempt_score: a.total > 0 ? (a.awarded_true / a.total) : 0,
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const recent = sortedAttempts.slice(0, MAX_ATTEMPTS);

  let weightedScore = 0;
  let weightedTotal = 0;

  for (let i = 0; i < recent.length; i++) {
    const w = i < RECENT_COUNT ? RECENT_WEIGHT : DEFAULT_WEIGHT;
    weightedTotal += w;
    weightedScore += w * recent[i].attempt_score;
  }

  const score = weightedTotal > 0 ? weightedScore / weightedTotal : 0;
  return {
    score: Math.round(score * 10000) / 10000,
    sample_count: recent.length,
    weighted_sample_count: weightedTotal,
    low_confidence: recent.length < LOW_CONFIDENCE_THRESHOLD,
  };
}

/**
 * Reference implementation of time-decay weight for a single event.
 */
function referenceDecayWeight(eventDate, now) {
  const daysDiff = (now.getTime() - new Date(eventDate).getTime()) / (1000 * 60 * 60 * 24);
  for (const window of DECAY_WINDOWS) {
    if (daysDiff <= window.maxDays) return window.weight;
  }
  return 0.2;
}

// ── Property 14: Mastery Score Aggregation Correctness ──────────────────────

describe('Property 14: Mastery Score Aggregation Correctness', () => {
  // Feature: learning-evidence-ledger, Property 14
  // For any user and curriculum_node, mastery_score must be computed correctly
  // by filtering excluded reasons, skipping null node_ids, capping at 20 attempts,
  // applying recency weighting, and flagging low confidence.
  // **Validates: Requirements 6.1**

  it('score matches reference computation for arbitrary included decisions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1-30 decisions all for the same node with included reasons
        arbNodeId,
        fc.array(
          fc.record({
            attempt_id: arbAttemptId,
            awarded: fc.boolean(),
            reason: arbIncludedReason,
            created_at: arbRecentDate,
          }),
          { minLength: 1, maxLength: 30 },
        ),
        async (nodeId, partials) => {
          const decisions = partials.map(p => ({ ...p, node_id: nodeId }));
          const result = computeMasteryByNode(decisions, NOW);

          expect(result[nodeId]).toBeDefined();

          const ref = referenceMasteryForNode(decisions);
          expect(result[nodeId].score).toBe(ref.score);
          expect(result[nodeId].sample_count).toBe(ref.sample_count);
          expect(result[nodeId].weighted_sample_count).toBe(ref.weighted_sample_count);
          expect(result[nodeId].low_confidence).toBe(ref.low_confidence);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('decisions with excluded reasons are never counted', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.array(arbExcludedDecision, { minLength: 1, maxLength: 10 }),
        fc.array(arbIncludedDecision, { minLength: 0, maxLength: 10 }),
        async (nodeId, excluded, included) => {
          // Force all decisions to the same node
          const allDecisions = [
            ...excluded.map(d => ({ ...d, node_id: nodeId })),
            ...included.map(d => ({ ...d, node_id: nodeId })),
          ];

          const result = computeMasteryByNode(allDecisions, NOW);

          if (included.length === 0) {
            // All excluded → node should not appear
            expect(result[nodeId]).toBeUndefined();
          } else {
            // Only included decisions should be counted
            expect(result[nodeId]).toBeDefined();
            const uniqueIncludedAttempts = new Set(included.map(d => d.attempt_id)).size;
            expect(result[nodeId].sample_count).toBeLessThanOrEqual(
              Math.min(uniqueIncludedAttempts, MAX_ATTEMPTS),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('decisions with null node_id are skipped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbNullNodeDecision, { minLength: 1, maxLength: 10 }),
        fc.array(arbIncludedDecision, { minLength: 0, maxLength: 5 }),
        async (nullNodeDecs, validDecs) => {
          const allDecisions = [...nullNodeDecs, ...validDecs];
          const result = computeMasteryByNode(allDecisions, NOW);

          // null node_id decisions should never appear as keys
          expect(result[null]).toBeUndefined();
          expect(result['null']).toBeUndefined();

          // Only non-null node_ids should appear
          const nodeIds = new Set(validDecs.map(d => d.node_id));
          for (const key of Object.keys(result)) {
            expect(nodeIds.has(key)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('at most 20 attempts per node are used', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.integer({ min: 21, max: 40 }),
        async (nodeId, count) => {
          const decisions = Array.from({ length: count }, (_, i) => ({
            attempt_id: `att-${nodeId}-${i}`,
            node_id: nodeId,
            awarded: i % 2 === 0,
            reason: 'best_match',
            created_at: new Date(NOW.getTime() - i * 3600000).toISOString(),
          }));
          const result = computeMasteryByNode(decisions, NOW);

          expect(result[nodeId]).toBeDefined();
          expect(result[nodeId].sample_count).toBe(MAX_ATTEMPTS);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('most recent 5 get weight 2.0, rest get weight 1.0', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.integer({ min: 1, max: 20 }),
        async (nodeId, count) => {
          // Generate decisions with distinct timestamps
          const decisions = Array.from({ length: count }, (_, i) => ({
            attempt_id: `att-${nodeId}-${i}`,
            node_id: nodeId,
            awarded: true,
            reason: 'best_match',
            created_at: new Date(NOW.getTime() - i * 3600000).toISOString(),
          }));

          const result = computeMasteryByNode(decisions, NOW);
          const recentCount = Math.min(count, RECENT_COUNT);
          const olderCount = count - recentCount;
          const expectedWeightedTotal = recentCount * RECENT_WEIGHT + olderCount * DEFAULT_WEIGHT;

          expect(result[nodeId].weighted_sample_count).toBe(expectedWeightedTotal);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('low_confidence is true iff sample_count < 3', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.integer({ min: 1, max: 25 }),
        async (nodeId, count) => {
          const decisions = Array.from({ length: count }, (_, i) => ({
            attempt_id: `att-${nodeId}-${i}`,
            node_id: nodeId,
            awarded: true,
            reason: 'best_match',
            created_at: new Date(NOW.getTime() - i * 3600000).toISOString(),
          }));

          const result = computeMasteryByNode(decisions, NOW);
          const effectiveCount = Math.min(count, MAX_ATTEMPTS);

          expect(result[nodeId].low_confidence).toBe(effectiveCount < LOW_CONFIDENCE_THRESHOLD);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('score is always in [0, 1]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDecision, { minLength: 1, maxLength: 30 }),
        async (decisions) => {
          const result = computeMasteryByNode(decisions, NOW);

          for (const nodeId of Object.keys(result)) {
            expect(result[nodeId].score).toBeGreaterThanOrEqual(0);
            expect(result[nodeId].score).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('grouping by node_id is correct — each node gets only its own decisions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbIncludedDecision, { minLength: 2, maxLength: 20 }),
        async (decisions) => {
          const result = computeMasteryByNode(decisions, NOW);

          // Group decisions manually
          const byNode = new Map();
          for (const d of decisions) {
            if (!d.node_id) continue;
            if (!byNode.has(d.node_id)) byNode.set(d.node_id, []);
            byNode.get(d.node_id).push(d);
          }

          // Each node in result should match reference
          for (const [nodeId, nodeDecs] of byNode) {
            expect(result[nodeId]).toBeDefined();
            const ref = referenceMasteryForNode(nodeDecs);
            expect(result[nodeId].score).toBe(ref.score);
            expect(result[nodeId].sample_count).toBe(ref.sample_count);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 15: Misconception Frequency Aggregation Correctness ────────────

describe('Property 15: Misconception Frequency Aggregation Correctness', () => {
  // Feature: learning-evidence-ledger, Property 15
  // For any user and set of error events, misconception_frequencies.weighted_count
  // must equal the sum of time-decayed weights. Events with null misconception_tag
  // are skipped. last_seen tracks the most recent event date per tag.
  // **Validates: Requirements 6.2**

  it('weighted_count matches sum of time-decayed weights per tag', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbErrorEvent, { minLength: 1, maxLength: 30 }),
        async (events) => {
          const result = computeMisconceptionFrequencies(events, NOW);

          // Group events by tag manually
          const byTag = new Map();
          for (const e of events) {
            if (!e.misconception_tag) continue;
            if (!byTag.has(e.misconception_tag)) byTag.set(e.misconception_tag, []);
            byTag.get(e.misconception_tag).push(e);
          }

          for (const [tag, tagEvents] of byTag) {
            expect(result[tag]).toBeDefined();

            // Compute expected weighted_count
            let expectedWeighted = 0;
            for (const e of tagEvents) {
              expectedWeighted += referenceDecayWeight(e.created_at, NOW);
            }
            expectedWeighted = Math.round(expectedWeighted * 10000) / 10000;

            expect(result[tag].weighted_count).toBe(expectedWeighted);
            expect(result[tag].count).toBe(tagEvents.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with null misconception_tag are skipped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbNullTagEvent, { minLength: 1, maxLength: 10 }),
        fc.array(arbErrorEvent, { minLength: 0, maxLength: 5 }),
        async (nullTagEvents, validEvents) => {
          const allEvents = [...nullTagEvents, ...validEvents];
          const result = computeMisconceptionFrequencies(allEvents, NOW);

          // null tags should never appear
          expect(result[null]).toBeUndefined();
          expect(result['null']).toBeUndefined();

          // Only valid tags should appear
          const validTags = new Set(validEvents.map(e => e.misconception_tag).filter(Boolean));
          for (const key of Object.keys(result)) {
            expect(validTags.has(key)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('last_seen is the most recent event date per tag', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbErrorEvent, { minLength: 1, maxLength: 20 }),
        async (events) => {
          const result = computeMisconceptionFrequencies(events, NOW);

          // Group by tag and find max date
          const byTag = new Map();
          for (const e of events) {
            if (!e.misconception_tag) continue;
            if (!byTag.has(e.misconception_tag)) byTag.set(e.misconception_tag, []);
            byTag.get(e.misconception_tag).push(e);
          }

          for (const [tag, tagEvents] of byTag) {
            const maxDate = tagEvents.reduce((max, e) => {
              const d = new Date(e.created_at);
              return d > max ? d : max;
            }, new Date(0));

            expect(result[tag].last_seen).toBe(maxDate.toISOString());
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('count is the raw count of events per tag', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbErrorEvent, { minLength: 1, maxLength: 25 }),
        async (events) => {
          const result = computeMisconceptionFrequencies(events, NOW);

          const byTag = new Map();
          for (const e of events) {
            if (!e.misconception_tag) continue;
            byTag.set(e.misconception_tag, (byTag.get(e.misconception_tag) || 0) + 1);
          }

          for (const [tag, count] of byTag) {
            expect(result[tag].count).toBe(count);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('time decay weights are correctly applied per window boundary', async () => {
    // Generate events at specific day offsets to test each decay window
    await fc.assert(
      fc.asyncProperty(
        arbMisconceptionTag,
        fc.integer({ min: 0, max: 29 }),   // within 30 days → 1.0
        fc.integer({ min: 31, max: 89 }),   // 30-90 days → 0.5
        fc.integer({ min: 91, max: 365 }),  // 90+ days → 0.2
        async (tag, recentDays, midDays, oldDays) => {
          const events = [
            { misconception_tag: tag, created_at: new Date(NOW.getTime() - recentDays * 86400000).toISOString() },
            { misconception_tag: tag, created_at: new Date(NOW.getTime() - midDays * 86400000).toISOString() },
            { misconception_tag: tag, created_at: new Date(NOW.getTime() - oldDays * 86400000).toISOString() },
          ];

          const result = computeMisconceptionFrequencies(events, NOW);
          const expected = Math.round((1.0 + 0.5 + 0.2) * 10000) / 10000;

          expect(result[tag].weighted_count).toBe(expected);
          expect(result[tag].count).toBe(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('weighted_count is always >= 0.2 * count (minimum possible weight)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbErrorEvent, { minLength: 1, maxLength: 20 }),
        async (events) => {
          const result = computeMisconceptionFrequencies(events, NOW);

          for (const tag of Object.keys(result)) {
            const minPossible = Math.round(0.2 * result[tag].count * 10000) / 10000;
            expect(result[tag].weighted_count).toBeGreaterThanOrEqual(minPossible);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('weighted_count is always <= 1.0 * count (maximum possible weight)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbErrorEvent, { minLength: 1, maxLength: 20 }),
        async (events) => {
          const result = computeMisconceptionFrequencies(events, NOW);

          for (const tag of Object.keys(result)) {
            // Maximum weight per event is 1.0, so max weighted_count = count * 1.0
            expect(result[tag].weighted_count).toBeLessThanOrEqual(result[tag].count);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 16: Ltree Subtree Mastery Query ────────────────────────────────

describe('Property 16: Ltree Subtree Mastery Query', () => {
  // Feature: learning-evidence-ledger, Property 16
  // For any topic_path prefix, when computeMasteryByNode returns results with
  // various node_ids that have associated topic_paths, filtering by a prefix
  // should only return nodes under that prefix subtree.
  // Since computeMasteryByNode works with node_ids (not topic_paths directly),
  // this property tests that the aggregation correctly groups by node_id and
  // that the mastery data can be correctly filtered by topic_path prefix when
  // the caller maps node_ids to topic_paths.
  // **Validates: Requirements 6.4**

  it('mastery grouped by node_id can be filtered by topic_path prefix', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a mapping of node_id → topic_path
        fc.array(
          fc.tuple(arbNodeId, arbTopicPath),
          { minLength: 2, maxLength: 10 },
        ),
        // Generate a prefix to filter by
        fc.tuple(
          fc.constantFrom('9709', '9231', '9702'),
          fc.constantFrom('p1', 'p2', 'p3', 'p4', 'p5'),
        ),
        async (nodePathPairs, [prefixSubject, prefixPaper]) => {
          // Deduplicate node_ids
          const nodeToPath = new Map();
          for (const [nodeId, topicPath] of nodePathPairs) {
            if (!nodeToPath.has(nodeId)) {
              nodeToPath.set(nodeId, topicPath);
            }
          }

          // Generate decisions for each node
          const decisions = [];
          for (const [nodeId] of nodeToPath) {
            // 3 decisions per node to avoid low_confidence
            for (let i = 0; i < 3; i++) {
              decisions.push({
                attempt_id: `att-${nodeId}-${i}`,
                node_id: nodeId,
                awarded: true,
                reason: 'best_match',
                created_at: new Date(NOW.getTime() - i * 3600000).toISOString(),
              });
            }
          }

          const mastery = computeMasteryByNode(decisions, NOW);

          // Verify all node_ids are present in mastery result
          for (const [nodeId] of nodeToPath) {
            expect(mastery[nodeId]).toBeDefined();
          }

          // Filter by prefix (simulating what a caller would do)
          const prefix = `${prefixSubject}.${prefixPaper}`;
          const filtered = {};
          for (const [nodeId, topicPath] of nodeToPath) {
            if (topicPath.startsWith(prefix + '.') || topicPath === prefix) {
              filtered[nodeId] = mastery[nodeId];
            }
          }

          // Verify: all filtered nodes have topic_paths under the prefix
          for (const nodeId of Object.keys(filtered)) {
            const tp = nodeToPath.get(nodeId);
            expect(tp.startsWith(prefix)).toBe(true);
          }

          // Verify: no nodes outside the prefix are included
          for (const [nodeId, topicPath] of nodeToPath) {
            if (!topicPath.startsWith(prefix + '.') && topicPath !== prefix) {
              expect(filtered[nodeId]).toBeUndefined();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('mastery data is correctly keyed by node_id regardless of topic_path structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple nodes with hierarchical topic paths
        fc.tuple(
          fc.constantFrom('9709', '9231', '9702'),
          fc.constantFrom('p1', 'p3'),
          fc.array(arbPathSegment, { minLength: 1, maxLength: 2 }),
        ),
        fc.integer({ min: 2, max: 5 }),
        async ([subject, paper, segments], nodeCount) => {
          // Create nodes at different depths under the same prefix
          const basePath = [subject, paper, ...segments].join('.');
          const nodes = [];
          const childSegments = ['quadratics', 'differentiation', 'integration', 'vectors', 'probability'];

          for (let i = 0; i < nodeCount; i++) {
            nodes.push({
              nodeId: `node-${subject}-${i}`,
              topicPath: i === 0 ? basePath : `${basePath}.${childSegments[i % childSegments.length]}`,
            });
          }

          // Generate decisions for each node
          const decisions = [];
          for (const { nodeId } of nodes) {
            for (let j = 0; j < 4; j++) {
              decisions.push({
                attempt_id: `att-${nodeId}-${j}`,
                node_id: nodeId,
                awarded: j % 2 === 0,
                reason: 'best_match',
                created_at: new Date(NOW.getTime() - j * 3600000).toISOString(),
              });
            }
          }

          const mastery = computeMasteryByNode(decisions, NOW);

          // Each node should have its own mastery entry
          expect(Object.keys(mastery).length).toBe(nodes.length);

          for (const { nodeId } of nodes) {
            expect(mastery[nodeId]).toBeDefined();
            expect(mastery[nodeId].sample_count).toBe(4);
            expect(mastery[nodeId].low_confidence).toBe(false);
          }

          // Filter by basePath prefix — all nodes should be included
          const filteredCount = nodes.filter(n =>
            n.topicPath.startsWith(basePath),
          ).length;
          expect(filteredCount).toBe(nodes.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('disjoint subtrees produce independent mastery results', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Two different subject codes → disjoint subtrees
        fc.constantFrom('9709', '9231', '9702'),
        fc.constantFrom('9709', '9231', '9702'),
        fc.array(
          fc.record({
            attempt_id: arbAttemptId,
            awarded: fc.boolean(),
            reason: arbIncludedReason,
            created_at: arbRecentDate,
          }),
          { minLength: 3, maxLength: 10 },
        ),
        fc.array(
          fc.record({
            attempt_id: arbAttemptId,
            awarded: fc.boolean(),
            reason: arbIncludedReason,
            created_at: arbRecentDate,
          }),
          { minLength: 3, maxLength: 10 },
        ),
        async (subject1, subject2, partials1, partials2) => {
          fc.pre(subject1 !== subject2);

          const nodeA = `node-${subject1}-subtree`;
          const nodeB = `node-${subject2}-subtree`;
          const pathA = `${subject1}.p1.algebra`;
          const pathB = `${subject2}.p1.calculus`;

          const decisions = [
            ...partials1.map(p => ({ ...p, node_id: nodeA })),
            ...partials2.map(p => ({ ...p, node_id: nodeB })),
          ];

          const mastery = computeMasteryByNode(decisions, NOW);

          // Both nodes should exist
          expect(mastery[nodeA]).toBeDefined();
          expect(mastery[nodeB]).toBeDefined();

          // Filtering by subject1 prefix should only get nodeA
          const nodeToPath = new Map([[nodeA, pathA], [nodeB, pathB]]);
          const prefix1 = `${subject1}.`;
          const filtered1 = Object.keys(mastery).filter(nid => {
            const tp = nodeToPath.get(nid);
            return tp && tp.startsWith(prefix1);
          });
          expect(filtered1).toContain(nodeA);
          expect(filtered1).not.toContain(nodeB);

          // Filtering by subject2 prefix should only get nodeB
          const prefix2 = `${subject2}.`;
          const filtered2 = Object.keys(mastery).filter(nid => {
            const tp = nodeToPath.get(nid);
            return tp && tp.startsWith(prefix2);
          });
          expect(filtered2).toContain(nodeB);
          expect(filtered2).not.toContain(nodeA);
        },
      ),
      { numRuns: 100 },
    );
  });
});
