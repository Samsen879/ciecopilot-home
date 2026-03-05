// tests/evidence-ledger/evaluate-v1-integration.test.js
// Integration tests for evaluate-v1.js with Evidence Ledger.
// Covers: ledger write, JWT auth, question_id 422,
// ledger write failure degradation, X-Run-Id reuse.

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import crypto from 'node:crypto';

// ── Mock all downstream modules ─────────────────────────────────────────────

// Auth helper
const mockResolveUserId = jest.fn();

class MockAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

jest.unstable_mockModule('../../api/marking/lib/auth-helper.js', () => ({
  resolveUserId: mockResolveUserId,
  AuthError: MockAuthError,
}));

// Attempt repository
const mockResolveQuestionId = jest.fn();

class MockValidationError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

jest.unstable_mockModule('../../api/marking/lib/attempt-repository.js', () => ({
  resolveQuestionId: mockResolveQuestionId,
  ValidationError: MockValidationError,
}));

// Ledger orchestrator
const mockWriteLedger = jest.fn();

jest.unstable_mockModule('../../api/marking/lib/ledger-orchestrator.js', () => ({
  writeLedger: mockWriteLedger,
}));

// Rubric resolver
const mockResolveRubric = jest.fn();

class MockRubricNotReadyError extends Error {
  constructor(msg) { super(msg); this.name = 'RubricNotReadyError'; }
}
class MockRubricContractInvalidError extends Error {
  constructor(msg, details) { super(msg); this.name = 'RubricContractInvalidError'; this.details = details; }
}

jest.unstable_mockModule('../../api/marking/lib/rubric-resolver-v1.js', () => ({
  resolveRubric: mockResolveRubric,
  RubricNotReadyError: MockRubricNotReadyError,
  RubricContractInvalidError: MockRubricContractInvalidError,
}));

// Decision engine
const mockRunDecisionEngine = jest.fn();

jest.unstable_mockModule('../../api/marking/lib/decision-engine-v1.js', () => ({
  runDecisionEngine: mockRunDecisionEngine,
  SCORING_ENGINE_VERSION: 'test-v1.0',
}));

// Supabase client
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: () => ({ mock: true }),
}));

// ── Import handler after all mocks ──────────────────────────────────────────
const { default: handler } = await import('../../api/marking/evaluate-v1.js');

// ── Test helpers ────────────────────────────────────────────────────────────

function makeReq(overrides = {}) {
  return {
    method: 'POST',
    headers: {},
    body: {
      storage_key: '9709/s22/qp11/q01.png',
      q_number: 1,
      student_steps: [{ step_id: 's1', text: 'x=2' }],
    },
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
  };
  return res;
}

const DECISIONS = [
  { rubric_id: 'r1', mark_label: 'M1', awarded: true, awarded_marks: 2, reason: 'best_match' },
  { rubric_id: 'r2', mark_label: 'A1', awarded: false, awarded_marks: 0, reason: 'below_threshold' },
];

function setupDefaults() {
  mockResolveUserId.mockResolvedValue({ user_id: 'user-001', auth_source: 'jwt' });

  mockResolveRubric.mockResolvedValue({
    rubric_source_version: 'v2.0',
    rubric_points: [{ marks: 2 }, { marks: 1 }],
    rubric_rows_used: 2,
  });

  mockRunDecisionEngine.mockReturnValue({ decisions: DECISIONS });

  mockWriteLedger.mockResolvedValue({
    attempt_id: 'att-001',
    mark_run_id: 'mr-001',
    decision_write_status: 'success',
    error_event_count: 1,
    is_reused_run: false,
  });

  mockResolveQuestionId.mockResolvedValue({
    question_id: 'q-uuid-001',
    paper_id: 'p-uuid-001',
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('evaluate-v1 Evidence Ledger integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MARKING_V1_ENABLED = 'true';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    setupDefaults();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── 1. Normal scoring flow ──────────────────────────────────────────────
  describe('normal scoring flow', () => {
    it('calls writeLedger and returns 200 with ledger_write_status', async () => {
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(mockWriteLedger).toHaveBeenCalledTimes(1);
      expect(res._json.ledger_write_status).toBe('success');
      expect(res._json.decisions).toEqual(DECISIONS);
    });

    it('resolves question_id before calling writeLedger', async () => {
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(mockResolveQuestionId).toHaveBeenCalledTimes(1);
      expect(mockWriteLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          question_id: 'q-uuid-001',
          paper_id: 'p-uuid-001',
        }),
      );
    });

    it('passes idempotency headers to writeLedger', async () => {
      const req = makeReq({
        headers: {
          'x-request-id': 'req-id-123',
          'x-run-id': 'run-id-456',
        },
      });
      const res = makeRes();
      await handler(req, res);

      expect(mockWriteLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotency_key: 'req-id-123',
          run_idempotency_key: 'run-id-456',
        }),
      );
    });

    it('generates UUID for idempotency_key when X-Request-Id is absent', async () => {
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      const call = mockWriteLedger.mock.calls[0][0];
      expect(call.idempotency_key).toBeDefined();
      expect(typeof call.idempotency_key).toBe('string');
      expect(call.idempotency_key.length).toBe(36);
    });

    it('sets run_idempotency_key to null when X-Run-Id is absent', async () => {
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(mockWriteLedger).toHaveBeenCalledWith(
        expect.objectContaining({ run_idempotency_key: null }),
      );
    });

    it('response does NOT contain legacy error_book fields', async () => {
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._json).not.toHaveProperty('error_book_write_status');
      expect(res._json).not.toHaveProperty('error_book_write_counts');
    });
  });

  // ── 2. Ledger write failure degradation ─────────────────────────────────
  describe('ledger write failure degradation', () => {
    it('returns 200 with ledger_write_status=failed when writeLedger throws', async () => {
      mockWriteLedger.mockRejectedValue(new Error('ledger DB down'));

      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ledger_write_status).toBe('failed');
      expect(res._json.decisions).toEqual(DECISIONS);
    });

    it('returns 200 with ledger_write_status=failed when writeLedger returns failed status', async () => {
      mockWriteLedger.mockResolvedValue({
        attempt_id: 'att-001',
        mark_run_id: 'mr-001',
        decision_write_status: 'failed',
        error_event_count: 0,
        is_reused_run: false,
      });

      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ledger_write_status).toBe('failed');
    });
  });

  // ── 3. JWT auth ─────────────────────────────────────────────────────────
  describe('JWT auth', () => {
    it('returns 401 when resolveUserId throws AuthError', async () => {
      mockResolveUserId.mockRejectedValue(new MockAuthError('Invalid JWT'));

      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(401);
      expect(res._json.error).toBe('auth_failed');
      expect(mockWriteLedger).not.toHaveBeenCalled();
    });

    it('uses JWT user_id in writeLedger call', async () => {
      mockResolveUserId.mockResolvedValue({ user_id: 'jwt-user-999', auth_source: 'jwt' });

      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(mockWriteLedger).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'jwt-user-999' }),
      );
    });
  });

  // ── 4. X-Run-Id reuse ──────────────────────────────────────────────────
  describe('X-Run-Id reuse', () => {
    it('passes run_idempotency_key through to writeLedger for reuse detection', async () => {
      mockWriteLedger.mockResolvedValue({
        attempt_id: 'att-001',
        mark_run_id: 'mr-existing',
        decision_write_status: 'skipped',
        error_event_count: 0,
        is_reused_run: true,
      });

      const req = makeReq({
        headers: { 'x-run-id': 'reuse-run-id' },
      });
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._json.ledger_write_status).toBe('skipped');
      expect(mockWriteLedger).toHaveBeenCalledWith(
        expect.objectContaining({ run_idempotency_key: 'reuse-run-id' }),
      );
    });
  });

  // ── 5. question_id missing → 422 ──────────────────────────────────────
  describe('question_id resolution failure', () => {
    it('returns 422 when resolveQuestionId throws ValidationError', async () => {
      mockResolveQuestionId.mockRejectedValue(
        new MockValidationError('No question mapping found'),
      );

      const req = makeReq();
      const res = makeRes();
      await handler(req, res);

      expect(res._status).toBe(422);
      expect(res._json.error).toBe('question_not_found');
      expect(mockWriteLedger).not.toHaveBeenCalled();
    });
  });

  // ── 6. Backward compatibility ──────────────────────────────────────────
  describe('backward compatibility', () => {
    it('rejects non-POST methods', async () => {
      const req = makeReq({ method: 'GET' });
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(405);
    });

    it('returns 503 when MARKING_V1_ENABLED is not true', async () => {
      process.env.MARKING_V1_ENABLED = 'false';
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(503);
    });

    it('returns 400 when required fields are missing', async () => {
      const req = makeReq({ body: {} });
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(400);
      expect(res._json.error).toBe('missing_required_fields');
    });

    it('returns 400 when rubric_points is supplied', async () => {
      const req = makeReq({
        body: {
          storage_key: '9709/s22/qp11/q01.png',
          q_number: 1,
          student_steps: [{ step_id: 's1', text: 'x' }],
          rubric_points: [{ marks: 1 }],
        },
      });
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(400);
      expect(res._json.error).toBe('rubric_input_forbidden');
    });

    it('response includes run_id in all cases', async () => {
      const req = makeReq();
      const res = makeRes();
      await handler(req, res);
      expect(res._json.run_id).toBeDefined();
      expect(typeof res._json.run_id).toBe('string');
    });
  });
});
