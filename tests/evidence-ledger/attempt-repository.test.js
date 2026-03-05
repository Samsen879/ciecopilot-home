// tests/evidence-ledger/attempt-repository.test.js
// Unit tests for api/marking/lib/attempt-repository.js
// Covers: parseSyllabusCode, resolveTopicPath, resolveQuestionId, createOrReuseAttempt, ValidationError

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import {
  ValidationError,
  parseSyllabusCode,
  resolveTopicPath,
  resolveQuestionId,
  createOrReuseAttempt,
} from '../../api/marking/lib/attempt-repository.js';

// ── Helpers: mock Supabase client builder ───────────────────────────────────

/**
 * Build a chainable mock Supabase client.
 * Usage: const sb = mockSupabase({ from: { 'table': { select: ..., data, error } } })
 */
function mockSupabase(overrides = {}) {
  const chains = {};

  return {
    from(table) {
      if (overrides[table]) return overrides[table];
      // Default: return a chainable that resolves to empty
      if (!chains[table]) {
        chains[table] = buildChain({ data: null, error: null });
      }
      return chains[table];
    },
  };
}

function buildChain(result) {
  const chain = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.upsert = jest.fn().mockResolvedValue({ error: null });
  return chain;
}

// ── ValidationError ─────────────────────────────────────────────────────────
describe('ValidationError', () => {
  it('has name "ValidationError" and default status 422', () => {
    const err = new ValidationError('test');
    expect(err.name).toBe('ValidationError');
    expect(err.status).toBe(422);
    expect(err.message).toBe('test');
    expect(err instanceof Error).toBe(true);
  });

  it('accepts custom status', () => {
    const err = new ValidationError('bad', 400);
    expect(err.status).toBe(400);
  });
});

// ── parseSyllabusCode ───────────────────────────────────────────────────────
describe('parseSyllabusCode()', () => {
  it('extracts syllabus code from a typical storage_key', () => {
    expect(parseSyllabusCode('9709/s22/qp11/q01.png')).toBe('9709');
  });

  it('extracts code from a key with no file extension', () => {
    expect(parseSyllabusCode('9231/w21/qp31/q05')).toBe('9231');
  });

  it('extracts code from a key with only one segment', () => {
    expect(parseSyllabusCode('9702')).toBe('9702');
  });

  it('throws ValidationError for null/undefined', () => {
    expect(() => parseSyllabusCode(null)).toThrow(ValidationError);
    expect(() => parseSyllabusCode(undefined)).toThrow(ValidationError);
  });

  it('throws ValidationError for empty string', () => {
    expect(() => parseSyllabusCode('')).toThrow(ValidationError);
  });

  it('throws ValidationError for non-string input', () => {
    expect(() => parseSyllabusCode(123)).toThrow(ValidationError);
  });

  it('throws ValidationError when first segment is empty (leading slash)', () => {
    expect(() => parseSyllabusCode('/s22/qp11')).toThrow(ValidationError);
  });
});

// ── resolveTopicPath ────────────────────────────────────────────────────────
describe('resolveTopicPath()', () => {
  it('returns the best match sorted by source priority', async () => {
    const rows = [
      { node_id: 'n1', source: 'a1_keyword_mapper_v1', confidence: 0.9, updated_at: '2024-01-01T00:00:00Z', curriculum_nodes: { topic_path: '9709.p1.algebra' } },
      { node_id: 'n2', source: 'ai_agent_reclassify', confidence: 0.8, updated_at: '2024-01-01T00:00:00Z', curriculum_nodes: { topic_path: '9709.p1.calculus' } },
    ];

    const chain = buildChain({ data: rows, error: null });
    // Override the chain so .eq returns the chain and final await resolves data
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    // Make the chain itself resolve when awaited
    chain.then = (resolve) => resolve({ data: rows, error: null });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await resolveTopicPath(sb, '9709/s22/qp11/q01.png');

    expect(result.node_id).toBe('n2'); // ai_agent_reclassify wins
    expect(result.topic_path).toBe('9709.p1.calculus');
    expect(result.topic_source).toBe('ai_agent_reclassify');
    expect(result.topic_confidence).toBe(0.8);
  });

  it('breaks ties by confidence DESC', async () => {
    const rows = [
      { node_id: 'n1', source: 'a1_keyword_mapper_v1', confidence: 0.7, updated_at: '2024-01-01T00:00:00Z', curriculum_nodes: { topic_path: 'path.a' } },
      { node_id: 'n2', source: 'a1_keyword_mapper_v1', confidence: 0.95, updated_at: '2024-01-01T00:00:00Z', curriculum_nodes: { topic_path: 'path.b' } },
    ];

    const chain = buildChain({});
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.then = (resolve) => resolve({ data: rows, error: null });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await resolveTopicPath(sb, 'key');

    expect(result.node_id).toBe('n2');
    expect(result.topic_confidence).toBe(0.95);
  });

  it('breaks ties by updated_at DESC when source and confidence are equal', async () => {
    const rows = [
      { node_id: 'n1', source: 'a1_keyword_mapper_v1', confidence: 0.9, updated_at: '2024-01-01T00:00:00Z', curriculum_nodes: { topic_path: 'path.old' } },
      { node_id: 'n2', source: 'a1_keyword_mapper_v1', confidence: 0.9, updated_at: '2024-06-15T00:00:00Z', curriculum_nodes: { topic_path: 'path.new' } },
    ];

    const chain = buildChain({});
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.then = (resolve) => resolve({ data: rows, error: null });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await resolveTopicPath(sb, 'key');

    expect(result.node_id).toBe('n2');
    expect(result.topic_path).toBe('path.new');
  });

  it('returns all nulls when no matching records', async () => {
    const chain = buildChain({});
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.then = (resolve) => resolve({ data: [], error: null });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await resolveTopicPath(sb, 'nonexistent/key');

    expect(result).toEqual({
      node_id: null,
      topic_path: null,
      topic_source: null,
      topic_confidence: null,
      topic_resolved_at: null,
    });
  });

  it('returns all nulls on query error (non-blocking)', async () => {
    const chain = buildChain({});
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.then = (resolve) => resolve({ data: null, error: { message: 'db error' } });

    const sb = { from: jest.fn().mockReturnValue(chain) };
    const result = await resolveTopicPath(sb, 'key');

    expect(result.node_id).toBeNull();
    expect(result.topic_path).toBeNull();
  });
});

// ── resolveQuestionId ───────────────────────────────────────────────────────
describe('resolveQuestionId()', () => {
  it('returns question_id and paper_id when mapping exists', async () => {
    const qbChain = buildChain({});
    qbChain.select = jest.fn().mockReturnValue(qbChain);
    qbChain.eq = jest.fn().mockReturnValue(qbChain);
    qbChain.limit = jest.fn().mockReturnValue(qbChain);
    qbChain.maybeSingle = jest.fn().mockResolvedValue({
      data: { question_id: 'q-uuid-1', paper_id: 'p-uuid-1' },
      error: null,
    });

    const sb = {
      from: jest.fn((table) => {
        if (table === 'question_bank') return qbChain;
        return buildChain({ data: null, error: null });
      }),
    };
    const result = await resolveQuestionId(sb, '9709/s22/qp11/q01.png', 1);

    expect(result.question_id).toBe('q-uuid-1');
    expect(result.paper_id).toBe('p-uuid-1');
  });

  it('returns paper_id as null when mapping has no paper_id', async () => {
    const qbChain = buildChain({});
    qbChain.select = jest.fn().mockReturnValue(qbChain);
    qbChain.eq = jest.fn().mockReturnValue(qbChain);
    qbChain.limit = jest.fn().mockReturnValue(qbChain);
    qbChain.maybeSingle = jest.fn().mockResolvedValue({
      data: { question_id: 'q-uuid-2', paper_id: null },
      error: null,
    });

    const sb = {
      from: jest.fn((table) => {
        if (table === 'question_bank') return qbChain;
        return buildChain({ data: null, error: null });
      }),
    };
    const result = await resolveQuestionId(sb, '9709/s22/qp11/q02.png', 2);

    expect(result.question_id).toBe('q-uuid-2');
    expect(result.paper_id).toBeNull();
  });

  it('throws ValidationError (422) when no mapping found', async () => {
    const qbChain = buildChain({});
    qbChain.select = jest.fn().mockReturnValue(qbChain);
    qbChain.eq = jest.fn().mockReturnValue(qbChain);
    qbChain.limit = jest.fn().mockReturnValue(qbChain);
    qbChain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    const afChain = buildChain({});
    afChain.select = jest.fn().mockReturnValue(afChain);
    afChain.eq = jest.fn().mockReturnValue(afChain);
    afChain.limit = jest.fn().mockReturnValue(afChain);
    afChain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    const sb = {
      from: jest.fn((table) => {
        if (table === 'question_bank') return qbChain;
        if (table === 'asset_files') return afChain;
        return buildChain({ data: null, error: null });
      }),
    };

    await expect(resolveQuestionId(sb, 'unknown/key', 99))
      .rejects.toThrow(ValidationError);
    await expect(resolveQuestionId(sb, 'unknown/key', 99))
      .rejects.toMatchObject({ status: 422 });
  });

  it('throws ValidationError on database error', async () => {
    const qbChain = buildChain({});
    qbChain.select = jest.fn().mockReturnValue(qbChain);
    qbChain.eq = jest.fn().mockReturnValue(qbChain);
    qbChain.limit = jest.fn().mockReturnValue(qbChain);
    qbChain.maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'connection refused' },
    });

    const sb = {
      from: jest.fn((table) => {
        if (table === 'question_bank') return qbChain;
        return buildChain({ data: null, error: null });
      }),
    };

    await expect(resolveQuestionId(sb, '9709/s22/qp11/q01.png', 1))
      .rejects.toThrow(ValidationError);
  });

  it('falls back to asset_files when question_bank table is absent', async () => {
    const qbChain = buildChain({});
    qbChain.select = jest.fn().mockReturnValue(qbChain);
    qbChain.eq = jest.fn().mockReturnValue(qbChain);
    qbChain.limit = jest.fn().mockReturnValue(qbChain);
    qbChain.maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation "question_bank" does not exist' },
    });

    const afChain = buildChain({});
    afChain.select = jest.fn().mockReturnValue(afChain);
    afChain.eq = jest.fn().mockReturnValue(afChain);
    afChain.limit = jest.fn().mockReturnValue(afChain);
    afChain.maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'asset-q-1', paper_id: 'paper-1', q_number: 1 },
      error: null,
    });

    const sb = {
      from: jest.fn((table) => {
        if (table === 'question_bank') return qbChain;
        if (table === 'asset_files') return afChain;
        return buildChain({ data: null, error: null });
      }),
    };

    const result = await resolveQuestionId(sb, '9709/s22/qp11/q01.png', 1);
    expect(result).toEqual({ question_id: 'asset-q-1', paper_id: 'paper-1' });
  });
});

// ── createOrReuseAttempt ────────────────────────────────────────────────────
describe('createOrReuseAttempt()', () => {
  const baseParams = {
    user_id: 'user-abc',
    question_id: 'q-uuid-1',
    paper_id: 'p-uuid-1',
    storage_key: '9709/s22/qp11/q01.png',
    q_number: 1,
    subpart: null,
    submitted_steps: [{ step_id: 's1', text: '2x+1=0' }],
    idempotency_key: 'req-id-001',
  };

  function buildMultiTableSupabase({
    topicRows = [],
    lookupResult = null,
    insertError = null,
    insertResult = null,
    raceResult = null,
  } = {}) {
    // question_concept_links chain (for resolveTopicPath)
    const qclChain = buildChain({});
    qclChain.select = jest.fn().mockReturnValue(qclChain);
    qclChain.eq = jest.fn().mockReturnValue(qclChain);
    qclChain.then = (resolve) => resolve({ data: topicRows, error: null });

    // attempts chain (for upsert + select)
    const attemptsChain = buildChain({});
    attemptsChain.select = jest.fn().mockReturnValue(attemptsChain);
    attemptsChain.eq = jest.fn().mockReturnValue(attemptsChain);
    attemptsChain.maybeSingle = jest.fn().mockResolvedValue(
      lookupResult || { data: null, error: null },
    );
    attemptsChain.insert = jest.fn().mockReturnValue(attemptsChain);
    attemptsChain.single = jest.fn().mockResolvedValue(
      insertResult || {
        data: {
          attempt_id: 'att-uuid-1',
          node_id: null,
          topic_path: null,
          topic_source: null,
          topic_confidence: null,
          topic_resolved_at: null,
        },
        error: insertError,
      },
    );

    return {
      from: jest.fn((table) => {
        if (table === 'question_concept_links') return qclChain;
        if (table === 'attempts') return attemptsChain;
        return buildChain({ data: null, error: null });
      }),
      _attemptsChain: attemptsChain,
    };
  }

  it('throws ValidationError (422) when question_id is missing', async () => {
    const sb = buildMultiTableSupabase();
    await expect(
      createOrReuseAttempt({ ...baseParams, question_id: null, supabase: sb }),
    ).rejects.toThrow(ValidationError);

    await expect(
      createOrReuseAttempt({ ...baseParams, question_id: '', supabase: sb }),
    ).rejects.toThrow(ValidationError);
  });

  it('creates an attempt and returns attempt_id with is_new=true', async () => {
    const sb = buildMultiTableSupabase();
    const result = await createOrReuseAttempt({ ...baseParams, supabase: sb });

    expect(result.attempt_id).toBe('att-uuid-1');
    expect(result.is_new).toBe(true);
    expect(sb.from).toHaveBeenCalledWith('attempts');
  });

  it('includes topic data when resolveTopicPath finds a match', async () => {
    const topicRows = [
      {
        node_id: 'node-1',
        source: 'ai_agent_reclassify',
        confidence: 0.92,
        updated_at: '2024-06-01T00:00:00Z',
        curriculum_nodes: { topic_path: '9709.p1.algebra.quadratics' },
      },
    ];

    const sb = buildMultiTableSupabase({
      topicRows,
      insertResult: {
        data: {
          attempt_id: 'att-uuid-2',
          node_id: 'node-1',
          topic_path: '9709.p1.algebra.quadratics',
          topic_source: 'ai_agent_reclassify',
          topic_confidence: 0.92,
          topic_resolved_at: '2024-06-01T00:00:00Z',
        },
        error: null,
      },
    });

    const result = await createOrReuseAttempt({ ...baseParams, supabase: sb });

    expect(result.topic_path).toBe('9709.p1.algebra.quadratics');
    expect(result.node_id).toBe('node-1');
    expect(result.topic_source).toBe('ai_agent_reclassify');
    expect(result.topic_confidence).toBe(0.92);
  });

  it('returns is_new=false when existing attempt is found by idempotency lookup', async () => {
    const sb = buildMultiTableSupabase({
      lookupResult: {
        data: {
          attempt_id: 'att-existing',
          node_id: null,
          topic_path: null,
          topic_source: null,
          topic_confidence: null,
          topic_resolved_at: null,
        },
        error: null,
      },
    });

    const result = await createOrReuseAttempt({ ...baseParams, supabase: sb });

    expect(result.attempt_id).toBe('att-existing');
    expect(result.is_new).toBe(false);
  });

  it('throws on insert database error (non-conflict)', async () => {
    const sb = buildMultiTableSupabase({
      insertError: { code: '42P01', message: 'relation does not exist' },
    });

    await expect(
      createOrReuseAttempt({ ...baseParams, supabase: sb }),
    ).rejects.toThrow('Failed to create attempt');
  });

  it('throws when insert returns no data', async () => {
    const sb = buildMultiTableSupabase({
      insertResult: { data: null, error: null },
    });

    await expect(
      createOrReuseAttempt({ ...baseParams, supabase: sb }),
    ).rejects.toThrow('no data returned');
  });

  it('calls parseSyllabusCode internally (invalid storage_key throws)', async () => {
    const sb = buildMultiTableSupabase();
    await expect(
      createOrReuseAttempt({ ...baseParams, storage_key: '', supabase: sb }),
    ).rejects.toThrow(ValidationError);
  });
});
