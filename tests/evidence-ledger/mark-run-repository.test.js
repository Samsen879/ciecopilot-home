// tests/evidence-ledger/mark-run-repository.test.js
// Unit tests for api/marking/lib/mark-run-repository-v2.js
// Covers: calcTotalAwarded, calcTotalAvailable, createOrReuseMarkRun, updateMarkRunStatus

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import {
  calcTotalAwarded,
  calcTotalAvailable,
  createOrReuseMarkRun,
  updateMarkRunStatus,
} from '../../api/marking/lib/mark-run-repository-v2.js';

// ── Helpers: mock Supabase client builder ───────────────────────────────────

function buildChain(result) {
  const chain = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.upsert = jest.fn().mockResolvedValue({ error: null });
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  return chain;
}

const baseParams = {
  attempt_id: 'att-uuid-1',
  run_idempotency_key: null,
  engine_version: 'decision-engine-v1',
  rubric_version: 'rubric-2024-06',
  decisions: [
    { rubric_id: 'r1', awarded_marks: 2 },
    { rubric_id: 'r2', awarded_marks: 1 },
  ],
  rubric_points: [
    { marks: 2 },
    { marks: 3 },
  ],
  request_summary: { q: 1 },
  response_summary: { score: 3 },
};

// ── calcTotalAwarded ────────────────────────────────────────────────────────
describe('calcTotalAwarded()', () => {
  it('sums awarded_marks from decisions', () => {
    expect(calcTotalAwarded([
      { awarded_marks: 2 },
      { awarded_marks: 3 },
      { awarded_marks: 0 },
    ])).toBe(5);
  });

  it('returns 0 for empty array', () => {
    expect(calcTotalAwarded([])).toBe(0);
  });

  it('returns 0 for non-array input', () => {
    expect(calcTotalAwarded(null)).toBe(0);
    expect(calcTotalAwarded(undefined)).toBe(0);
  });

  it('treats missing awarded_marks as 0', () => {
    expect(calcTotalAwarded([{ rubric_id: 'r1' }, { awarded_marks: 4 }])).toBe(4);
  });
});

// ── calcTotalAvailable ──────────────────────────────────────────────────────
describe('calcTotalAvailable()', () => {
  it('sums marks from rubric points', () => {
    expect(calcTotalAvailable([{ marks: 2 }, { marks: 3 }])).toBe(5);
  });

  it('returns 0 for empty array', () => {
    expect(calcTotalAvailable([])).toBe(0);
  });

  it('returns 0 for non-array input', () => {
    expect(calcTotalAvailable(null)).toBe(0);
    expect(calcTotalAvailable(undefined)).toBe(0);
  });

  it('treats missing marks as 0', () => {
    expect(calcTotalAvailable([{}, { marks: 5 }])).toBe(5);
  });
});

// ── createOrReuseMarkRun ────────────────────────────────────────────────────
describe('createOrReuseMarkRun()', () => {
  describe('when run_idempotency_key is null (Path B: always new)', () => {
    it('inserts a new mark_run and returns is_new=true', async () => {
      const chain = buildChain({});
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue({
        data: { mark_run_id: 'mr-uuid-1' },
        error: null,
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };
      const result = await createOrReuseMarkRun({ ...baseParams, supabase: sb });

      expect(result.mark_run_id).toBe('mr-uuid-1');
      expect(result.is_new).toBe(true);
      expect(sb.from).toHaveBeenCalledWith('mark_runs');
      expect(chain.insert).toHaveBeenCalled();
    });

    it('calculates total_awarded and total_available in the inserted row', async () => {
      const chain = buildChain({});
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue({
        data: { mark_run_id: 'mr-uuid-2' },
        error: null,
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };
      await createOrReuseMarkRun({ ...baseParams, supabase: sb });

      const insertedRow = chain.insert.mock.calls[0][0];
      expect(insertedRow.total_awarded).toBe(3); // 2 + 1
      expect(insertedRow.total_available).toBe(5); // 2 + 3
    });

    it('throws on insert error', async () => {
      const chain = buildChain({});
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };

      await expect(
        createOrReuseMarkRun({ ...baseParams, supabase: sb }),
      ).rejects.toThrow('Failed to create mark_run');
    });
  });

  describe('when run_idempotency_key is provided (Path A: idempotent)', () => {
    const idempotentParams = {
      ...baseParams,
      run_idempotency_key: 'run-id-001',
    };

    it('inserts and returns is_new=true when no existing run matches', async () => {
      const chain = buildChain({});
      chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue({
        data: { mark_run_id: 'mr-uuid-new' },
        error: null,
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };
      const result = await createOrReuseMarkRun({ ...idempotentParams, supabase: sb });

      expect(result.mark_run_id).toBe('mr-uuid-new');
      expect(result.is_new).toBe(true);
      expect(chain.insert).toHaveBeenCalled();
    });

    it('returns is_new=false when lookup finds an existing run', async () => {
      const chain = buildChain({});
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: { mark_run_id: 'mr-uuid-existing' },
        error: null,
      });
      chain.insert = jest.fn();

      const sb = { from: jest.fn().mockReturnValue(chain) };
      const result = await createOrReuseMarkRun({ ...idempotentParams, supabase: sb });

      expect(result.mark_run_id).toBe('mr-uuid-existing');
      expect(result.is_new).toBe(false);
      expect(chain.insert).not.toHaveBeenCalled();
    });

    it('inserts row with run_idempotency_key', async () => {
      const chain = buildChain({});
      chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue({
        data: { mark_run_id: 'mr-uuid-3' },
        error: null,
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };
      await createOrReuseMarkRun({ ...idempotentParams, supabase: sb });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt_id: 'att-uuid-1',
          run_idempotency_key: 'run-id-001',
        }),
      );
    });

    it('throws on lookup error', async () => {
      const chain = buildChain({});
      chain.maybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'XX000', message: 'lookup failed' },
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };

      await expect(
        createOrReuseMarkRun({ ...idempotentParams, supabase: sb }),
      ).rejects.toThrow('Failed to lookup mark_run');
    });

    it('returns existing run when insert hits unique conflict', async () => {
      const chain = buildChain({});
      chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn()
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        })
        .mockResolvedValueOnce({
          data: { mark_run_id: 'mr-raced' },
          error: null,
        });

      const sb = { from: jest.fn().mockReturnValue(chain) };
      const result = await createOrReuseMarkRun({ ...idempotentParams, supabase: sb });

      expect(result).toEqual({ mark_run_id: 'mr-raced', is_new: false });
    });
  });

  describe('total calculation in row payload', () => {
    it('handles empty decisions and rubric_points', async () => {
      const chain = buildChain({});
      chain.insert = jest.fn().mockReturnValue(chain);
      chain.select = jest.fn().mockReturnValue(chain);
      chain.single = jest.fn().mockResolvedValue({
        data: { mark_run_id: 'mr-empty' },
        error: null,
      });

      const sb = { from: jest.fn().mockReturnValue(chain) };
      await createOrReuseMarkRun({
        ...baseParams,
        decisions: [],
        rubric_points: [],
        supabase: sb,
      });

      const insertedRow = chain.insert.mock.calls[0][0];
      expect(insertedRow.total_awarded).toBe(0);
      expect(insertedRow.total_available).toBe(0);
    });
  });
});

// ── updateMarkRunStatus ─────────────────────────────────────────────────────
describe('updateMarkRunStatus()', () => {
  it('updates status and decision_write_status successfully', async () => {
    const chain = buildChain({});
    chain.update = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockResolvedValue({ error: null });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await updateMarkRunStatus(sb, 'mr-uuid-1', 'completed', 'success');

    expect(result.ok).toBe(true);
    expect(chain.update).toHaveBeenCalledWith({
      status: 'completed',
      decision_write_status: 'success',
    });
  });

  it('returns ok=false on update error (does not throw)', async () => {
    const chain = buildChain({});
    chain.update = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockResolvedValue({
      error: { code: '42P01', message: 'table not found' },
    });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await updateMarkRunStatus(sb, 'mr-uuid-1', 'failed', 'failed');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('table not found');
  });

  it('returns ok=false on thrown exception (does not throw)', async () => {
    const sb = {
      from: jest.fn().mockImplementation(() => {
        throw new Error('connection lost');
      }),
    };

    const result = await updateMarkRunStatus(sb, 'mr-uuid-1', 'failed', 'failed');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('connection lost');
  });
});
