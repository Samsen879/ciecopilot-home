// Tests for api/marking/lib/rubric-resolver-v1.js
// Covers: version selection, ready data fetch, contract validation, error handling, audit log

import { jest } from '@jest/globals';
import {
  resolveRubric,
  validateContract,
  RubricNotReadyError,
  RubricContractInvalidError,
} from '../lib/rubric-resolver-v1.js';

// ── Test fixtures ───────────────────────────────────────────────────────────

function makePoint(overrides = {}) {
  return {
    rubric_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    storage_key: '9709/s22/qp11/q01.png',
    q_number: 1,
    subpart: null,
    step_index: 1,
    mark_label: 'M1',
    kind: 'M',
    description: 'Correct method',
    marks: 1,
    depends_on: [],
    ft_mode: 'none',
    confidence: 0.95,
    source: 'vlm',
    extractor_version: 'v1',
    provider: 'openai',
    model: 'gpt-4-turbo',
    prompt_version: 'p1',
    source_version: 'v1:openai:gpt-4-turbo:p1',
    ...overrides,
  };
}

function makeVersionRow(overrides = {}) {
  return {
    extractor_version: 'v1',
    provider: 'openai',
    model: 'gpt-4-turbo',
    prompt_version: 'p1',
    updated_at: '2026-02-15T10:00:00Z',
    subpart: null,
    ...overrides,
  };
}

// ── Mock Supabase builder ───────────────────────────────────────────────────

function createMockSupabase({ rubricPointsData = [], readyViewData = [], rubricPointsError = null, readyViewError = null } = {}) {
  // Build a chainable query mock
  function createChain(resolvedData, resolvedError) {
    const chain = {};
    const methods = ['select', 'eq', 'or', 'order'];
    for (const m of methods) {
      chain[m] = jest.fn(() => chain);
    }
    // Terminal: when awaited or .then() called, resolve with data/error
    chain.then = (resolve) => resolve({ data: resolvedData, error: resolvedError });
    return chain;
  }

  const supabase = {
    from: jest.fn((table) => {
      if (table === 'rubric_points') {
        return createChain(rubricPointsData, rubricPointsError);
      }
      if (table === 'rubric_points_ready_v1') {
        return createChain(readyViewData, readyViewError);
      }
      return createChain([], null);
    }),
  };

  return supabase;
}

// ── Contract validation ─────────────────────────────────────────────────────

describe('validateContract', () => {
  it('passes when all required fields are present', () => {
    const points = [makePoint()];
    const result = validateContract(points);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('fails when rubric_id is missing', () => {
    const points = [makePoint({ rubric_id: undefined })];
    const result = validateContract(points);
    expect(result.valid).toBe(false);
    expect(result.violations[0].missing_fields).toContain('rubric_id');
  });

  it('fails when mark_label is null', () => {
    const points = [makePoint({ mark_label: null })];
    const result = validateContract(points);
    expect(result.valid).toBe(false);
    expect(result.violations[0].missing_fields).toContain('mark_label');
  });

  it('fails when kind is missing', () => {
    const points = [makePoint({ kind: undefined })];
    const result = validateContract(points);
    expect(result.valid).toBe(false);
    expect(result.violations[0].missing_fields).toContain('kind');
  });

  it('fails when depends_on is missing', () => {
    const points = [makePoint({ depends_on: undefined })];
    const result = validateContract(points);
    expect(result.valid).toBe(false);
    expect(result.violations[0].missing_fields).toContain('depends_on');
  });

  it('fails when marks is null', () => {
    const points = [makePoint({ marks: null })];
    const result = validateContract(points);
    expect(result.valid).toBe(false);
    expect(result.violations[0].missing_fields).toContain('marks');
  });

  it('reports multiple violations across points', () => {
    const points = [
      makePoint({ rubric_id: undefined, marks: null }),
      makePoint({ kind: undefined }),
    ];
    const result = validateContract(points);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(2);
  });

  it('passes with empty depends_on array (not null)', () => {
    const points = [makePoint({ depends_on: [] })];
    const result = validateContract(points);
    expect(result.valid).toBe(true);
  });
});

// ── resolveRubric: version auto-selection ───────────────────────────────────

describe('resolveRubric — version selection', () => {
  it('selects the version with the latest updated_at', async () => {
    const versionRows = [
      makeVersionRow({ extractor_version: 'v1', updated_at: '2026-02-14T10:00:00Z' }),
      makeVersionRow({ extractor_version: 'v2', updated_at: '2026-02-15T10:00:00Z' }),
    ];
    const readyPoints = [
      makePoint({ extractor_version: 'v2', source_version: 'v2:openai:gpt-4-turbo:p1' }),
    ];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: readyPoints,
    });

    const result = await resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    });

    expect(result.rubric_source_version).toBe('v2:openai:gpt-4-turbo:p1');
    expect(result.rubric_points).toHaveLength(1);
    expect(result.rubric_rows_used).toBe(1);
  });

  it('uses source_version DESC as tie-breaker when updated_at is equal', async () => {
    const ts = '2026-02-15T10:00:00Z';
    const versionRows = [
      makeVersionRow({ extractor_version: 'v1', updated_at: ts }),
      makeVersionRow({ extractor_version: 'v2', updated_at: ts }),
    ];
    const readyPoints = [
      makePoint({ extractor_version: 'v2', source_version: 'v2:openai:gpt-4-turbo:p1' }),
    ];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: readyPoints,
    });

    const result = await resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    });

    // 'v2:...' > 'v1:...' lexicographically
    expect(result.rubric_source_version).toBe('v2:openai:gpt-4-turbo:p1');
  });

  it('uses pinned rubric_source_version when provided', async () => {
    const readyPoints = [
      makePoint({ source_version: 'v1:openai:gpt-4-turbo:p1' }),
    ];

    const supabase = createMockSupabase({
      readyViewData: readyPoints,
    });

    const result = await resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
      rubric_source_version: 'v1:openai:gpt-4-turbo:p1',
    });

    expect(result.rubric_source_version).toBe('v1:openai:gpt-4-turbo:p1');
    // Should NOT have queried rubric_points base table for version selection
    const fromCalls = supabase.from.mock.calls.map((c) => c[0]);
    expect(fromCalls).not.toContain('rubric_points');
  });
});

// ── resolveRubric: subpart handling ─────────────────────────────────────────

describe('resolveRubric — subpart handling', () => {
  it('handles null subpart (COALESCE to empty string)', async () => {
    const versionRows = [makeVersionRow({ subpart: null })];
    const readyPoints = [makePoint({ subpart: null })];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: readyPoints,
    });

    const result = await resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    });

    expect(result.rubric_points).toHaveLength(1);
  });

  it('handles explicit subpart value', async () => {
    const versionRows = [makeVersionRow({ subpart: 'a' })];
    const readyPoints = [makePoint({ subpart: 'a' })];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: readyPoints,
    });

    const result = await resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: 'a',
    });

    expect(result.rubric_points).toHaveLength(1);
  });
});

// ── resolveRubric: error handling ───────────────────────────────────────────

describe('resolveRubric — error handling', () => {
  it('throws RubricNotReadyError (409) when no ready rows exist', async () => {
    const supabase = createMockSupabase({
      rubricPointsData: [],
      readyViewData: [],
    });

    await expect(resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    })).rejects.toThrow(RubricNotReadyError);

    try {
      await resolveRubric({ supabase, storage_key: 'x', q_number: 1, subpart: null });
    } catch (e) {
      expect(e.statusCode).toBe(409);
      expect(e.code).toBe('rubric_not_ready');
    }
  });

  it('throws RubricNotReadyError when version selected but no ready view rows', async () => {
    const versionRows = [makeVersionRow()];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: [], // no rows in ready view
    });

    await expect(resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    })).rejects.toThrow(RubricNotReadyError);
  });

  it('throws RubricContractInvalidError (422) when contract fields missing', async () => {
    const versionRows = [makeVersionRow()];
    const badPoint = makePoint({ marks: null, kind: undefined });

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: [badPoint],
    });

    await expect(resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    })).rejects.toThrow(RubricContractInvalidError);

    try {
      await resolveRubric({
        supabase,
        storage_key: '9709/s22/qp11/q01.png',
        q_number: 1,
        subpart: null,
      });
    } catch (e) {
      expect(e.statusCode).toBe(422);
      expect(e.code).toBe('rubric_contract_invalid');
      expect(e.details).toHaveLength(1);
      expect(e.details[0].missing_fields).toContain('marks');
      expect(e.details[0].missing_fields).toContain('kind');
    }
  });

  it('throws Error when rubric_points query fails', async () => {
    const supabase = createMockSupabase({
      rubricPointsError: { message: 'connection refused' },
    });

    await expect(resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    })).rejects.toThrow('rubric_points version query failed');
  });

  it('throws Error when rubric_points_ready_v1 query fails', async () => {
    const versionRows = [makeVersionRow()];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewError: { message: 'timeout' },
    });

    await expect(resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    })).rejects.toThrow('rubric_points_ready_v1 query failed');
  });
});

// ── resolveRubric: audit log ────────────────────────────────────────────────

describe('resolveRubric — audit log', () => {
  it('logs rubric_resolved event with version and row count', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const versionRows = [makeVersionRow()];
    const readyPoints = [makePoint(), makePoint({ rubric_id: 'bbbbbbbb-0000-0000-0000-000000000002', mark_label: 'A1', step_index: 2 })];

    const supabase = createMockSupabase({
      rubricPointsData: versionRows,
      readyViewData: readyPoints,
    });

    await resolveRubric({
      supabase,
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      subpart: null,
    });

    const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
    const auditLog = logCalls.find((l) => l.includes('rubric_resolved'));
    expect(auditLog).toBeDefined();

    const parsed = JSON.parse(auditLog);
    expect(parsed.event).toBe('rubric_resolved');
    expect(parsed.rubric_source_version).toBe('v1:openai:gpt-4-turbo:p1');
    expect(parsed.rubric_rows_used).toBe(2);
    expect(parsed.storage_key).toBe('9709/s22/qp11/q01.png');

    consoleSpy.mockRestore();
  });
});
