// tests/evidence-ledger/error-event-writer.test.js
// Unit tests for api/marking/lib/error-event-writer.js
// Covers: isErrorCandidate, resolveMisconceptionTag, writeErrorEvents

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  isErrorCandidate,
  resolveMisconceptionTag,
  writeErrorEvents,
} from '../../api/marking/lib/error-event-writer.js';

// ── Sample data ─────────────────────────────────────────────────────────────

const ATTEMPT_ID = 'att-uuid-001';
const TOPIC_PATH = '9709.p1.algebra.quadratics';
const NODE_ID = 'node-uuid-001';

const sampleDecisions = [
  { mark_decision_id: 'md-1', rubric_id: 'r1', awarded: true, awarded_marks: 1, reason: 'best_match' },
  { mark_decision_id: 'md-2', rubric_id: 'r2', awarded: false, awarded_marks: 0, reason: 'below_threshold' },
  { mark_decision_id: 'md-3', rubric_id: 'r3', awarded: false, awarded_marks: 0, reason: 'no_match' },
  { mark_decision_id: 'md-4', rubric_id: 'r4', awarded: false, awarded_marks: 0, reason: 'dependency_not_met' },
  { mark_decision_id: 'md-5', rubric_id: 'r5', awarded: false, awarded_marks: 0, reason: 'dependency_error' },
  { mark_decision_id: 'md-6', rubric_id: 'r6', awarded: true, awarded_marks: 2, reason: 'borderline_score' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockSupabase({ tagMapping = null, taxonomy = null, insertError = null } = {}) {
  const chainable = (resolvedValue) => {
    const chain = {};
    const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert'];
    for (const m of methods) {
      chain[m] = jest.fn().mockReturnValue(chain);
    }
    chain.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
    chain.insert = jest.fn().mockResolvedValue({ error: insertError });
    return chain;
  };

  const tagChain = chainable({ data: tagMapping, error: null });
  const taxChain = chainable({ data: taxonomy, error: null });
  const insertChain = chainable({ error: insertError });

  const fromMap = {
    reason_to_tag_mapping: tagChain,
    misconception_taxonomy: taxChain,
    error_events: insertChain,
  };

  return {
    from: jest.fn((table) => fromMap[table] || chainable({ data: null, error: null })),
  };
}


// ── isErrorCandidate ────────────────────────────────────────────────────────

describe('isErrorCandidate()', () => {
  it('returns true when awarded=false and reason is not excluded', () => {
    expect(isErrorCandidate({ awarded: false, reason: 'below_threshold' })).toBe(true);
    expect(isErrorCandidate({ awarded: false, reason: 'no_match' })).toBe(true);
    expect(isErrorCandidate({ awarded: false, reason: 'best_match' })).toBe(true);
    expect(isErrorCandidate({ awarded: false, reason: 'borderline_score' })).toBe(true);
  });

  it('returns false when awarded=true', () => {
    expect(isErrorCandidate({ awarded: true, reason: 'best_match' })).toBe(false);
    expect(isErrorCandidate({ awarded: true, reason: 'below_threshold' })).toBe(false);
  });

  it('returns false for dependency_not_met even when awarded=false', () => {
    expect(isErrorCandidate({ awarded: false, reason: 'dependency_not_met' })).toBe(false);
  });

  it('returns false for dependency_error even when awarded=false', () => {
    expect(isErrorCandidate({ awarded: false, reason: 'dependency_error' })).toBe(false);
  });

  it('returns false when awarded is undefined or null', () => {
    expect(isErrorCandidate({ reason: 'below_threshold' })).toBe(false);
    expect(isErrorCandidate({ awarded: null, reason: 'no_match' })).toBe(false);
  });
});

// ── resolveMisconceptionTag ─────────────────────────────────────────────────

describe('resolveMisconceptionTag()', () => {
  it('returns the mapped tag when a match is found', async () => {
    const sb = mockSupabase({ tagMapping: { misconception_tag: 'calculation_error' } });
    const tag = await resolveMisconceptionTag(sb, 'below_threshold');
    expect(tag).toBe('calculation_error');
    expect(sb.from).toHaveBeenCalledWith('reason_to_tag_mapping');
  });

  it('returns "unclassified" when no mapping is found', async () => {
    const sb = mockSupabase({ tagMapping: null });
    const tag = await resolveMisconceptionTag(sb, 'unknown_reason');
    expect(tag).toBe('unclassified');
  });

  it('returns "unclassified" on query error', async () => {
    const chain = {};
    const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle'];
    for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const tag = await resolveMisconceptionTag(sb, 'below_threshold');
    expect(tag).toBe('unclassified');
  });

  it('returns "unclassified" on thrown exception', async () => {
    const chain = {};
    const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle'];
    for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = jest.fn().mockRejectedValue(new Error('network fail'));

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const tag = await resolveMisconceptionTag(sb, 'below_threshold');
    expect(tag).toBe('unclassified');
  });
});

// ── writeErrorEvents ────────────────────────────────────────────────────────

describe('writeErrorEvents()', () => {
  describe('success path', () => {
    it('filters candidates, resolves tags, and inserts error_events', async () => {
      // Only md-2 (below_threshold) and md-3 (no_match) are candidates
      // md-1 awarded=true, md-4 dependency_not_met, md-5 dependency_error, md-6 awarded=true
      const tagChain = {};
      const taxChain = {};
      const insertChain = {};
      const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert'];
      for (const m of methods) {
        tagChain[m] = jest.fn().mockReturnValue(tagChain);
        taxChain[m] = jest.fn().mockReturnValue(taxChain);
        insertChain[m] = jest.fn().mockReturnValue(insertChain);
      }
      tagChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { misconception_tag: 'unclassified' },
        error: null,
      });
      taxChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { default_severity: 'major' },
        error: null,
      });
      insertChain.insert = jest.fn().mockResolvedValue({ error: null });

      const sb = {
        from: jest.fn((table) => {
          if (table === 'reason_to_tag_mapping') return tagChain;
          if (table === 'misconception_taxonomy') return taxChain;
          if (table === 'error_events') return insertChain;
          return tagChain;
        }),
      };

      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: sampleDecisions,
      });

      expect(result.status).toBe('success');
      expect(result.count).toBe(2); // md-2 and md-3
      expect(result.unclassified_count).toBe(2);

      // Verify insert was called with 2 rows
      const insertCall = insertChain.insert.mock.calls[0][0];
      expect(insertCall).toHaveLength(2);
      expect(insertCall[0].attempt_id).toBe(ATTEMPT_ID);
      expect(insertCall[0].topic_path).toBe(TOPIC_PATH);
      expect(insertCall[0].node_id).toBe(NODE_ID);
      expect(insertCall[0].misconception_tag).toBe('unclassified');
      // user_id should NOT be in the rows
      expect(insertCall[0]).not.toHaveProperty('user_id');
      expect(insertCall[1]).not.toHaveProperty('user_id');
    });

    it('returns count=0 for empty decisions', async () => {
      const sb = { from: jest.fn() };
      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: [],
      });
      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
    });

    it('returns count=0 when all decisions are awarded=true', async () => {
      const sb = { from: jest.fn() };
      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: [
          { mark_decision_id: 'md-1', rubric_id: 'r1', awarded: true, reason: 'best_match' },
        ],
      });
      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
    });

    it('returns count=0 when all false decisions are excluded reasons', async () => {
      const sb = { from: jest.fn() };
      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: [
          { mark_decision_id: 'md-4', rubric_id: 'r4', awarded: false, reason: 'dependency_not_met' },
          { mark_decision_id: 'md-5', rubric_id: 'r5', awarded: false, reason: 'dependency_error' },
        ],
      });
      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
    });

    it('handles null/undefined mark_decisions gracefully', async () => {
      const sb = { from: jest.fn() };
      const r1 = await writeErrorEvents({ supabase: sb, attempt_id: ATTEMPT_ID, mark_decisions: null });
      expect(r1.status).toBe('success');
      expect(r1.count).toBe(0);

      const r2 = await writeErrorEvents({ supabase: sb, attempt_id: ATTEMPT_ID, mark_decisions: undefined });
      expect(r2.status).toBe('success');
      expect(r2.count).toBe(0);
    });
  });

  describe('metadata and row structure', () => {
    it('includes reason and rubric_id in metadata', async () => {
      const tagChain = {};
      const taxChain = {};
      const insertChain = {};
      const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert'];
      for (const m of methods) {
        tagChain[m] = jest.fn().mockReturnValue(tagChain);
        taxChain[m] = jest.fn().mockReturnValue(taxChain);
        insertChain[m] = jest.fn().mockReturnValue(insertChain);
      }
      tagChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { misconception_tag: 'sign_error' },
        error: null,
      });
      taxChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { default_severity: 'minor' },
        error: null,
      });
      insertChain.insert = jest.fn().mockResolvedValue({ error: null });

      const sb = {
        from: jest.fn((table) => {
          if (table === 'reason_to_tag_mapping') return tagChain;
          if (table === 'misconception_taxonomy') return taxChain;
          if (table === 'error_events') return insertChain;
          return tagChain;
        }),
      };

      await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: null,
        node_id: null,
        mark_decisions: [
          { mark_decision_id: 'md-10', rubric_id: 'r10', awarded: false, reason: 'below_threshold' },
        ],
      });

      const insertCall = insertChain.insert.mock.calls[0][0];
      expect(insertCall[0].metadata).toEqual({ reason: 'below_threshold', rubric_id: 'r10' });
      expect(insertCall[0].misconception_tag).toBe('sign_error');
      expect(insertCall[0].severity).toBe('minor');
      expect(insertCall[0].topic_path).toBeNull();
      expect(insertCall[0].node_id).toBeNull();
    });
  });

  describe('failure paths', () => {
    it('returns failed when insert returns an error (trigger failure)', async () => {
      const tagChain = {};
      const taxChain = {};
      const insertChain = {};
      const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert'];
      for (const m of methods) {
        tagChain[m] = jest.fn().mockReturnValue(tagChain);
        taxChain[m] = jest.fn().mockReturnValue(taxChain);
        insertChain[m] = jest.fn().mockReturnValue(insertChain);
      }
      tagChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { misconception_tag: 'unclassified' },
        error: null,
      });
      taxChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { default_severity: 'major' },
        error: null,
      });
      insertChain.insert = jest.fn().mockResolvedValue({
        error: { code: 'P0001', message: 'attempt_id att-bad not found when writing error_events' },
      });

      const sb = {
        from: jest.fn((table) => {
          if (table === 'reason_to_tag_mapping') return tagChain;
          if (table === 'misconception_taxonomy') return taxChain;
          if (table === 'error_events') return insertChain;
          return tagChain;
        }),
      };

      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: 'att-bad',
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: [
          { mark_decision_id: 'md-2', rubric_id: 'r2', awarded: false, reason: 'below_threshold' },
        ],
      });

      expect(result.status).toBe('failed');
      expect(result.count).toBe(0);
      expect(result.error).toContain('attempt_id att-bad not found');
    });

    it('returns failed on thrown exception during insert', async () => {
      const tagChain = {};
      const taxChain = {};
      const insertChain = {};
      const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert'];
      for (const m of methods) {
        tagChain[m] = jest.fn().mockReturnValue(tagChain);
        taxChain[m] = jest.fn().mockReturnValue(taxChain);
        insertChain[m] = jest.fn().mockReturnValue(insertChain);
      }
      tagChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { misconception_tag: 'unclassified' },
        error: null,
      });
      taxChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { default_severity: 'major' },
        error: null,
      });
      insertChain.insert = jest.fn().mockRejectedValue(new Error('connection lost'));

      const sb = {
        from: jest.fn((table) => {
          if (table === 'reason_to_tag_mapping') return tagChain;
          if (table === 'misconception_taxonomy') return taxChain;
          if (table === 'error_events') return insertChain;
          return tagChain;
        }),
      };

      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: [
          { mark_decision_id: 'md-2', rubric_id: 'r2', awarded: false, reason: 'below_threshold' },
        ],
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('connection lost');
    });
  });

  describe('unclassified counting', () => {
    it('counts unclassified tags correctly when mixed', async () => {
      let callCount = 0;
      const tagChain = {};
      const taxChain = {};
      const insertChain = {};
      const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert'];
      for (const m of methods) {
        tagChain[m] = jest.fn().mockReturnValue(tagChain);
        taxChain[m] = jest.fn().mockReturnValue(taxChain);
        insertChain[m] = jest.fn().mockReturnValue(insertChain);
      }
      // First call returns a real tag, second returns unclassified
      tagChain.maybeSingle = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { misconception_tag: 'sign_error' }, error: null });
        }
        return Promise.resolve({ data: { misconception_tag: 'unclassified' }, error: null });
      });
      taxChain.maybeSingle = jest.fn().mockResolvedValue({
        data: { default_severity: 'major' },
        error: null,
      });
      insertChain.insert = jest.fn().mockResolvedValue({ error: null });

      const sb = {
        from: jest.fn((table) => {
          if (table === 'reason_to_tag_mapping') return tagChain;
          if (table === 'misconception_taxonomy') return taxChain;
          if (table === 'error_events') return insertChain;
          return tagChain;
        }),
      };

      const result = await writeErrorEvents({
        supabase: sb,
        attempt_id: ATTEMPT_ID,
        topic_path: TOPIC_PATH,
        node_id: NODE_ID,
        mark_decisions: [
          { mark_decision_id: 'md-a', rubric_id: 'ra', awarded: false, reason: 'below_threshold' },
          { mark_decision_id: 'md-b', rubric_id: 'rb', awarded: false, reason: 'no_match' },
        ],
      });

      expect(result.status).toBe('success');
      expect(result.count).toBe(2);
      expect(result.unclassified_count).toBe(1);
    });
  });
});
