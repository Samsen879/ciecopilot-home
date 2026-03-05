// tests/evidence-ledger/attempt-repository.pbt.test.js
// Property-based tests for api/marking/lib/attempt-repository.js
// Feature: learning-evidence-ledger
// Properties 1–3: Attempt field integrity, idempotency, topic path resolution priority
// **Validates: Requirements 1.1, 1.2, 1.3, 5.2**

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import fc from 'fast-check';

import {
  ValidationError,
  parseSyllabusCode,
  resolveTopicPath,
  createOrReuseAttempt,
} from '../../api/marking/lib/attempt-repository.js';

// ── Generators ──────────────────────────────────────────────────────────────

/** Random UUID v4 string */
const arbUuid = fc.uuid().map(u => u.toString());

/** Syllabus codes used in CIE */
const arbSyllabusCode = fc.constantFrom('9709', '9231', '9702', '8001', '1234');

/** Session codes like s22, w21, m23 */
const arbSession = fc.tuple(
  fc.constantFrom('s', 'w', 'm'),
  fc.integer({ min: 18, max: 30 }),
).map(([prefix, yr]) => `${prefix}${yr}`);

/** Paper component like qp11, qp31, qp42 */
const arbPaperComponent = fc.tuple(
  fc.constantFrom('qp', 'ms'),
  fc.integer({ min: 1, max: 6 }),
  fc.integer({ min: 1, max: 3 }),
).map(([prefix, paper, variant]) => `${prefix}${paper}${variant}`);

/** Question file like q01.png, q12.png */
const arbQuestionFile = fc.integer({ min: 1, max: 20 }).map(n => {
  const padded = String(n).padStart(2, '0');
  return `q${padded}.png`;
});

/** Full storage_key: "{syllabus}/{session}/{paper}/{question}" */
const arbStorageKey = fc.tuple(arbSyllabusCode, arbSession, arbPaperComponent, arbQuestionFile)
  .map(([syl, sess, paper, q]) => `${syl}/${sess}/${paper}/${q}`);

/** Random q_number (1–20) */
const arbQNumber = fc.integer({ min: 1, max: 20 });

/** Random subpart (nullable) */
const arbSubpart = fc.option(fc.constantFrom('a', 'b', 'c', 'i', 'ii', 'iii'), { nil: null });

/** Random submitted_steps array */
const arbSubmittedSteps = fc.array(
  fc.record({
    step_id: fc.string({ minLength: 2, maxLength: 6 }).map(s => s.replace(/[^a-z0-9]/gi, 'x') || 'sx'),
    text: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  { minLength: 0, maxLength: 5 },
);

/** Source values for question_concept_links */
const arbSource = fc.constantFrom('ai_agent_reclassify', 'a1_keyword_mapper_v1', 'manual_review', 'legacy_import');

/** Confidence value (0–1) */
const arbConfidence = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true })
  .map(v => Math.round(v * 10000) / 10000);

/** Random ISO date string within a reasonable range */
const arbIsoDate = fc.integer({
  min: new Date('2023-01-01T00:00:00Z').getTime(),
  max: new Date('2025-12-31T23:59:59Z').getTime(),
}).map(ts => new Date(ts).toISOString());

/** Random topic_path in ltree format */
const arbTopicPath = fc.tuple(
  arbSyllabusCode,
  fc.constantFrom('p1', 'p3', 'p4', 'p5', 'fp1', 'fp2'),
  fc.constantFrom('algebra', 'calculus', 'mechanics', 'statistics', 'vectors', 'trigonometry'),
  fc.constantFrom('quadratics', 'integration', 'differentiation', 'kinematics', 'probability'),
).map(parts => parts.join('.'));

/** A single question_concept_links record */
const arbConceptLink = fc.record({
  node_id: arbUuid,
  source: arbSource,
  confidence: arbConfidence,
  updated_at: arbIsoDate,
  topic_path: arbTopicPath,
});

/** Array of 1+ concept links for a given storage_key */
const arbConceptLinks = fc.array(arbConceptLink, { minLength: 1, maxLength: 8 });

// ── Mock Supabase helpers ───────────────────────────────────────────────────

function buildChain(result) {
  const chain = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.insert = jest.fn().mockReturnValue(chain);
  return chain;
}

/**
 * Build a mock Supabase that tracks attempt rows and simulates
 * deterministic idempotency semantics for attempts.
 */
function buildAttemptSupabase({
  topicRows = [],
  questionId = null,
  paperId = null,
} = {}) {
  // In-memory store keyed by `${user_id}::${idempotency_key}`
  const store = new Map();

  // question_concept_links chain
  const qclChain = buildChain({});
  qclChain.select = jest.fn().mockReturnValue(qclChain);
  qclChain.eq = jest.fn().mockReturnValue(qclChain);
  qclChain.then = (resolve) => resolve({
    data: topicRows.map(r => ({
      ...r,
      curriculum_nodes: { topic_path: r.topic_path },
    })),
    error: null,
  });

  // question_bank chain
  const qbChain = buildChain({});
  qbChain.select = jest.fn().mockReturnValue(qbChain);
  qbChain.eq = jest.fn().mockReturnValue(qbChain);
  qbChain.limit = jest.fn().mockReturnValue(qbChain);
  qbChain.maybeSingle = jest.fn().mockResolvedValue({
    data: questionId ? { question_id: questionId, paper_id: paperId } : null,
    error: null,
  });

  // attempts chain — dynamic behavior based on store
  const makeAttemptsChain = () => {
    const chain = {};
    let eqFilters = {};

    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockImplementation((col, val) => {
      eqFilters[col] = val;
      return chain;
    });

    chain.maybeSingle = jest.fn().mockImplementation(() => {
      const userId = eqFilters['user_id'];
      const idemKey = eqFilters['idempotency_key'];
      const key = `${userId}::${idemKey}`;
      const stored = store.get(key);
      if (stored) {
        return Promise.resolve({ data: stored, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    chain.insert = jest.fn().mockImplementation((row) => {
      const insertChain = {};
      insertChain.select = jest.fn().mockReturnValue(insertChain);
      insertChain.single = jest.fn().mockImplementation(() => {
        const key = `${row.user_id}::${row.idempotency_key}`;
        if (store.has(key)) {
          return Promise.resolve({
            data: null,
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint',
            },
          });
        }

        const created = {
          attempt_id: `att-${Math.random().toString(36).slice(2)}`,
          ...row,
        };
        store.set(key, created);
        return Promise.resolve({ data: created, error: null });
      });
      return insertChain;
    });

    chain.single = jest.fn().mockImplementation(() => {
      const userId = eqFilters['user_id'];
      const idemKey = eqFilters['idempotency_key'];
      const key = `${userId}::${idemKey}`;
      const stored = store.get(key);
      if (stored) {
        return Promise.resolve({ data: stored, error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'not found' } });
    });

    return chain;
  };

  return {
    from: jest.fn((table) => {
      if (table === 'question_concept_links') return qclChain;
      if (table === 'attempts') return makeAttemptsChain();
      return buildChain({ data: null, error: null });
    }),
    _store: store,
  };
}

// ── Source priority constant (mirrors implementation) ───────────────────────
const SOURCE_PRIORITY = ['ai_agent_reclassify', 'a1_keyword_mapper_v1'];

function sourcePriorityIndex(source) {
  const idx = SOURCE_PRIORITY.indexOf(source);
  return idx === -1 ? SOURCE_PRIORITY.length : idx;
}

/**
 * Reference sort implementation for concept links — used to verify
 * resolveTopicPath picks the correct winner.
 */
function referenceSortLinks(links) {
  return [...links].sort((a, b) => {
    const prioA = sourcePriorityIndex(a.source);
    const prioB = sourcePriorityIndex(b.source);
    if (prioA !== prioB) return prioA - prioB;

    const confA = a.confidence ?? -1;
    const confB = b.confidence ?? -1;
    if (confB !== confA) return confB - confA;

    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  });
}

// ── Property 1: Attempt 创建字段完整性 ──────────────────────────────────────

describe('Property 1: Attempt 创建字段完整性', () => {
  // Feature: learning-evidence-ledger, Property 1: Attempt 创建字段完整性
  // For any valid scoring request, the created attempt record should contain:
  // auth.uid() as user_id, non-null question_id, optional paper_id,
  // syllabus_code parsed from storage_key, and storage_key/q_number/subpart/submitted_steps
  // matching the request.
  // **Validates: Requirements 1.1, 1.6**

  it('created attempt contains all required fields matching the input', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // user_id
        arbUuid,           // question_id
        fc.option(arbUuid, { nil: null }), // paper_id
        arbStorageKey,     // storage_key
        arbQNumber,        // q_number
        arbSubpart,        // subpart
        arbSubmittedSteps, // submitted_steps
        arbUuid,           // idempotency_key
        async (userId, questionId, paperId, storageKey, qNumber, subpart, submittedSteps, idemKey) => {
          const sb = buildAttemptSupabase({ questionId, paperId });

          const result = await createOrReuseAttempt({
            supabase: sb,
            user_id: userId,
            question_id: questionId,
            paper_id: paperId,
            storage_key: storageKey,
            q_number: qNumber,
            subpart,
            submitted_steps: submittedSteps,
            idempotency_key: idemKey,
          });

          // attempt_id must be non-null
          expect(result.attempt_id).toBeTruthy();

          // Verify the stored row has correct fields
          const storeKey = `${userId}::${idemKey}`;
          const stored = sb._store.get(storeKey);
          expect(stored).toBeDefined();

          // user_id matches auth.uid()
          expect(stored.user_id).toBe(userId);

          // question_id is non-null and matches input
          expect(stored.question_id).toBe(questionId);

          // paper_id matches input (may be null)
          expect(stored.paper_id).toBe(paperId);

          // syllabus_code parsed from storage_key
          const expectedSyllabus = storageKey.split('/')[0];
          expect(stored.syllabus_code).toBe(expectedSyllabus);

          // storage_key, q_number, subpart, submitted_steps match input
          expect(stored.storage_key).toBe(storageKey);
          expect(stored.q_number).toBe(qNumber);
          expect(stored.subpart).toBe(subpart);
          expect(stored.submitted_steps).toEqual(submittedSteps);

          // idempotency_key matches input
          expect(stored.idempotency_key).toBe(idemKey);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('parseSyllabusCode always returns the first segment of a valid storage_key', () => {
    fc.assert(
      fc.property(
        arbStorageKey,
        (storageKey) => {
          const code = parseSyllabusCode(storageKey);
          expect(code).toBe(storageKey.split('/')[0]);
          expect(code.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws ValidationError when question_id is falsy', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        fc.constantFrom(null, undefined, ''),
        arbStorageKey,
        arbQNumber,
        arbUuid,
        async (userId, badQuestionId, storageKey, qNumber, idemKey) => {
          const sb = buildAttemptSupabase({});
          await expect(
            createOrReuseAttempt({
              supabase: sb,
              user_id: userId,
              question_id: badQuestionId,
              storage_key: storageKey,
              q_number: qNumber,
              subpart: null,
              submitted_steps: [],
              idempotency_key: idemKey,
            }),
          ).rejects.toThrow(ValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 2: Attempt 幂等性（X-Request-Id）──────────────────────────────

describe('Property 2: Attempt 幂等性（X-Request-Id）', () => {
  // Feature: learning-evidence-ledger, Property 2: Attempt 幂等性（X-Request-Id）
  // For any attempt input and any idempotency_key, calling createOrReuseAttempt
  // twice with the same user_id + idempotency_key should return the same attempt_id;
  // the attempts store should contain exactly one record for (user_id, idempotency_key).
  // Different user_ids with the same idempotency_key should not conflict.
  // **Validates: Requirements 1.2, 5.2**

  it('same user_id + idempotency_key returns same attempt_id on second call', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbUuid,
        arbStorageKey,
        arbQNumber,
        arbSubmittedSteps,
        arbUuid,
        async (userId, questionId, storageKey, qNumber, steps, idemKey) => {
          const sb = buildAttemptSupabase({ questionId });

          const params = {
            supabase: sb,
            user_id: userId,
            question_id: questionId,
            paper_id: null,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            submitted_steps: steps,
            idempotency_key: idemKey,
          };

          const first = await createOrReuseAttempt(params);
          const second = await createOrReuseAttempt(params);

          // Same attempt_id returned
          expect(second.attempt_id).toBe(first.attempt_id);

          // Only one record in store for this (user_id, idempotency_key)
          const storeKey = `${userId}::${idemKey}`;
          expect(sb._store.has(storeKey)).toBe(true);

          // Count entries with this user_id + idemKey
          let count = 0;
          for (const [k] of sb._store) {
            if (k === storeKey) count++;
          }
          expect(count).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('different user_ids with same idempotency_key do not conflict', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,
        arbUuid,
        arbUuid,
        arbStorageKey,
        arbQNumber,
        arbUuid,
        async (userId1, userId2, questionId, storageKey, qNumber, idemKey) => {
          // Ensure distinct user_ids
          fc.pre(userId1 !== userId2);

          const sb = buildAttemptSupabase({ questionId });

          const baseParams = {
            supabase: sb,
            question_id: questionId,
            paper_id: null,
            storage_key: storageKey,
            q_number: qNumber,
            subpart: null,
            submitted_steps: [],
            idempotency_key: idemKey,
          };

          const result1 = await createOrReuseAttempt({ ...baseParams, user_id: userId1 });
          const result2 = await createOrReuseAttempt({ ...baseParams, user_id: userId2 });

          // Different attempt_ids for different users
          expect(result1.attempt_id).not.toBe(result2.attempt_id);

          // Both entries exist in store
          expect(sb._store.has(`${userId1}::${idemKey}`)).toBe(true);
          expect(sb._store.has(`${userId2}::${idemKey}`)).toBe(true);
          expect(sb._store.size).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 3: Topic Path 解析优先级与元数据 ──────────────────────────────

describe('Property 3: Topic Path 解析优先级与元数据', () => {
  // Feature: learning-evidence-ledger, Property 3: Topic Path 解析优先级与元数据
  // For any storage_key and a set of question_concept_links records (varying
  // source/confidence/updated_at), resolveTopicPath must return the first result
  // sorted by: ai_agent_reclassify > a1_keyword_mapper_v1 > confidence DESC > updated_at DESC,
  // and populate topic_source, topic_confidence, topic_resolved_at.
  // When no matches exist, all fields should be NULL.
  // **Validates: Requirements 1.3, 1.4, 1.5**

  it('returns the highest-priority link according to sort rules', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbStorageKey,
        arbConceptLinks,
        async (storageKey, links) => {
          // Build mock that returns these links
          const qclChain = buildChain({});
          qclChain.select = jest.fn().mockReturnValue(qclChain);
          qclChain.eq = jest.fn().mockReturnValue(qclChain);
          qclChain.then = (resolve) => resolve({
            data: links.map(l => ({
              node_id: l.node_id,
              source: l.source,
              confidence: l.confidence,
              updated_at: l.updated_at,
              curriculum_nodes: { topic_path: l.topic_path },
            })),
            error: null,
          });

          const sb = { from: jest.fn().mockReturnValue(qclChain) };

          const result = await resolveTopicPath(sb, storageKey);

          // Compute expected winner using reference sort
          const sorted = referenceSortLinks(links);
          const expected = sorted[0];

          expect(result.node_id).toBe(expected.node_id || null);
          expect(result.topic_path).toBe(expected.topic_path);
          expect(result.topic_source).toBe(expected.source || null);
          expect(result.topic_confidence).toBe(expected.confidence ?? null);
          expect(result.topic_resolved_at).toBe(expected.updated_at || null);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ai_agent_reclassify always beats a1_keyword_mapper_v1 regardless of confidence', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbStorageKey,
        arbUuid,
        arbUuid,
        arbConfidence,
        arbConfidence,
        arbIsoDate,
        arbIsoDate,
        arbTopicPath,
        arbTopicPath,
        async (storageKey, nodeId1, nodeId2, conf1, conf2, date1, date2, tp1, tp2) => {
          // Ensure a1 has higher confidence than ai to test priority override
          const highConf = Math.max(conf1, conf2, 0.5);
          const lowConf = Math.min(conf1, conf2, 0.3);

          const links = [
            { node_id: nodeId1, source: 'a1_keyword_mapper_v1', confidence: highConf, updated_at: date1, topic_path: tp1 },
            { node_id: nodeId2, source: 'ai_agent_reclassify', confidence: lowConf, updated_at: date2, topic_path: tp2 },
          ];

          const qclChain = buildChain({});
          qclChain.select = jest.fn().mockReturnValue(qclChain);
          qclChain.eq = jest.fn().mockReturnValue(qclChain);
          qclChain.then = (resolve) => resolve({
            data: links.map(l => ({
              ...l,
              curriculum_nodes: { topic_path: l.topic_path },
            })),
            error: null,
          });

          const sb = { from: jest.fn().mockReturnValue(qclChain) };
          const result = await resolveTopicPath(sb, storageKey);

          // ai_agent_reclassify should always win
          expect(result.topic_source).toBe('ai_agent_reclassify');
          expect(result.node_id).toBe(nodeId2);
          expect(result.topic_path).toBe(tp2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all NULLs when no matching records exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbStorageKey,
        async (storageKey) => {
          const qclChain = buildChain({});
          qclChain.select = jest.fn().mockReturnValue(qclChain);
          qclChain.eq = jest.fn().mockReturnValue(qclChain);
          qclChain.then = (resolve) => resolve({ data: [], error: null });

          const sb = { from: jest.fn().mockReturnValue(qclChain) };
          const result = await resolveTopicPath(sb, storageKey);

          expect(result.node_id).toBeNull();
          expect(result.topic_path).toBeNull();
          expect(result.topic_source).toBeNull();
          expect(result.topic_confidence).toBeNull();
          expect(result.topic_resolved_at).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all NULLs on query error (non-blocking)', async () => {
    // Suppress console.error from the implementation's structured logging during this test
    const origError = console.error;
    console.error = jest.fn();
    try {
      await fc.assert(
        fc.asyncProperty(
          arbStorageKey,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (storageKey, errorMsg) => {
            const qclChain = buildChain({});
            qclChain.select = jest.fn().mockReturnValue(qclChain);
            qclChain.eq = jest.fn().mockReturnValue(qclChain);
            qclChain.then = (resolve) => resolve({ data: null, error: { message: errorMsg } });

            const sb = { from: jest.fn().mockReturnValue(qclChain) };
            const result = await resolveTopicPath(sb, storageKey);

            expect(result.node_id).toBeNull();
            expect(result.topic_path).toBeNull();
            expect(result.topic_source).toBeNull();
            expect(result.topic_confidence).toBeNull();
            expect(result.topic_resolved_at).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      console.error = origError;
    }
  });
});
