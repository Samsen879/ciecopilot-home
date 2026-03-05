// tests/evidence-ledger/decision-writer.test.js
// Unit tests for api/marking/lib/decision-writer.js
// Covers: writeDecisions — RPC call, success path, error path, empty input

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { writeDecisions } from '../../api/marking/lib/decision-writer.js';

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleDecisions = [
  { rubric_id: 'r1', mark_label: 'M1', awarded: true, awarded_marks: 1, reason: 'best_match' },
  { rubric_id: 'r2', mark_label: 'A1', awarded: false, awarded_marks: 0, reason: 'below_threshold' },
  { rubric_id: 'r3', mark_label: 'B1', awarded: true, awarded_marks: 2, reason: 'best_match' },
];

const MARK_RUN_ID = 'mr-uuid-001';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('writeDecisions()', () => {
  describe('success path', () => {
    it('calls supabase.rpc with correct parameters', async () => {
      const rpcData = [
        { mark_decision_id: 'md-1', rubric_id: 'r1' },
        { mark_decision_id: 'md-2', rubric_id: 'r2' },
        { mark_decision_id: 'md-3', rubric_id: 'r3' },
      ];
      const sb = { rpc: jest.fn().mockResolvedValue({ data: rpcData, error: null }) };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: sampleDecisions,
      });

      expect(sb.rpc).toHaveBeenCalledWith('insert_mark_decisions', {
        p_mark_run_id: MARK_RUN_ID,
        p_decisions: sampleDecisions,
      });
      expect(result.status).toBe('success');
      expect(result.count).toBe(3);
      expect(result.decisions).toEqual([
        expect.objectContaining({ mark_decision_id: 'md-1', rubric_id: 'r1', reason: 'best_match' }),
        expect.objectContaining({ mark_decision_id: 'md-2', rubric_id: 'r2', reason: 'below_threshold' }),
        expect.objectContaining({ mark_decision_id: 'md-3', rubric_id: 'r3', reason: 'best_match' }),
      ]);
    });

    it('returns count matching the number of returned rows', async () => {
      const rpcData = [{ mark_decision_id: 'md-1', rubric_id: 'r1' }];
      const sb = { rpc: jest.fn().mockResolvedValue({ data: rpcData, error: null }) };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: [sampleDecisions[0]],
      });

      expect(result.count).toBe(1);
    });
  });

  describe('empty / missing decisions', () => {
    it('returns success with count=0 for empty array', async () => {
      const sb = { rpc: jest.fn() };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: [],
      });

      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
      expect(result.decisions).toEqual([]);
      expect(sb.rpc).not.toHaveBeenCalled();
    });

    it('returns success with count=0 for null decisions', async () => {
      const sb = { rpc: jest.fn() };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: null,
      });

      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
      expect(sb.rpc).not.toHaveBeenCalled();
    });

    it('returns success with count=0 for undefined decisions', async () => {
      const sb = { rpc: jest.fn() };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: undefined,
      });

      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
      expect(sb.rpc).not.toHaveBeenCalled();
    });
  });

  describe('RPC error path', () => {
    it('returns failed status when RPC returns an error', async () => {
      const sb = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }),
      };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: sampleDecisions,
      });

      expect(result.status).toBe('failed');
      expect(result.count).toBe(0);
      expect(result.error).toContain('duplicate key');
    });

    it('returns failed status when reason CHECK constraint is violated', async () => {
      const sb = {
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23514', message: 'new row violates check constraint "chk_mark_decisions_reason"' },
        }),
      };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: [{ rubric_id: 'r1', mark_label: 'M1', awarded: true, awarded_marks: 1, reason: 'invalid_reason' }],
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('chk_mark_decisions_reason');
    });
  });

  describe('exception path', () => {
    it('catches thrown exceptions and returns failed status', async () => {
      const sb = {
        rpc: jest.fn().mockRejectedValue(new Error('network timeout')),
      };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: sampleDecisions,
      });

      expect(result.status).toBe('failed');
      expect(result.count).toBe(0);
      expect(result.error).toContain('network timeout');
    });

    it('handles non-Error thrown values', async () => {
      const sb = {
        rpc: jest.fn().mockRejectedValue('string error'),
      };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: sampleDecisions,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('string error');
    });
  });

  describe('data handling edge cases', () => {
    it('handles RPC returning non-array data gracefully', async () => {
      const sb = { rpc: jest.fn().mockResolvedValue({ data: null, error: null }) };

      const result = await writeDecisions({
        supabase: sb,
        mark_run_id: MARK_RUN_ID,
        decisions: sampleDecisions,
      });

      expect(result.status).toBe('success');
      expect(result.count).toBe(0);
      expect(result.decisions).toEqual([]);
    });
  });
});
