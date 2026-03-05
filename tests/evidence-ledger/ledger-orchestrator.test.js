// tests/evidence-ledger/ledger-orchestrator.test.js
// Unit tests for api/marking/lib/ledger-orchestrator.js
// Covers: writeLedger — full orchestration flow, run reuse, decision failure
// degradation, error event failure tolerance, structured logging.

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mock all downstream modules ─────────────────────────────────────────────

const mockCreateOrReuseAttempt = jest.fn();
const mockCreateOrReuseMarkRun = jest.fn();
const mockUpdateMarkRunStatus = jest.fn();
const mockWriteDecisions = jest.fn();
const mockWriteErrorEvents = jest.fn();

jest.unstable_mockModule('../../api/marking/lib/attempt-repository.js', () => ({
  createOrReuseAttempt: mockCreateOrReuseAttempt,
}));

jest.unstable_mockModule('../../api/marking/lib/mark-run-repository-v2.js', () => ({
  createOrReuseMarkRun: mockCreateOrReuseMarkRun,
  updateMarkRunStatus: mockUpdateMarkRunStatus,
}));

jest.unstable_mockModule('../../api/marking/lib/decision-writer.js', () => ({
  writeDecisions: mockWriteDecisions,
}));

jest.unstable_mockModule('../../api/marking/lib/error-event-writer.js', () => ({
  writeErrorEvents: mockWriteErrorEvents,
}));

const { writeLedger } = await import('../../api/marking/lib/ledger-orchestrator.js');

// ── Fixtures ────────────────────────────────────────────────────────────────

const ATTEMPT_ID = 'att-uuid-001';
const MARK_RUN_ID = 'mr-uuid-001';
const USER_ID = 'user-uuid-001';
const QUESTION_ID = 'q-uuid-001';

const baseParams = {
  supabase: {},
  user_id: USER_ID,
  question_id: QUESTION_ID,
  paper_id: null,
  storage_key: '9709/s22/qp11/q01.png',
  q_number: 1,
  subpart: null,
  student_steps: [{ step_id: 's1', text: 'x=2' }],
  idempotency_key: 'idem-001',
  run_idempotency_key: null,
  engine_version: 'v1.0',
  rubric_version: 'r1.0',
  rubric_points: [{ marks: 2 }, { marks: 1 }],
  decisions: [
    { rubric_id: 'r1', mark_label: 'M1', awarded: true, awarded_marks: 2, reason: 'best_match' },
    { rubric_id: 'r2', mark_label: 'A1', awarded: false, awarded_marks: 0, reason: 'below_threshold' },
  ],
  request_summary: { q: 1 },
  response_summary: { score: 2 },
};

function setupSuccessPath() {
  mockCreateOrReuseAttempt.mockResolvedValue({
    attempt_id: ATTEMPT_ID,
    topic_path: '9709.p1.algebra',
    node_id: 'node-001',
    topic_source: 'ai_agent_reclassify',
    topic_confidence: 0.95,
    topic_resolved_at: '2025-01-01T00:00:00Z',
    is_new: true,
  });

  mockCreateOrReuseMarkRun.mockResolvedValue({
    mark_run_id: MARK_RUN_ID,
    is_new: true,
  });

  mockWriteDecisions.mockResolvedValue({
    status: 'success',
    count: 2,
    decisions: [
      { mark_decision_id: 'md-1', rubric_id: 'r1', awarded: true, awarded_marks: 2, reason: 'best_match' },
      { mark_decision_id: 'md-2', rubric_id: 'r2', awarded: false, awarded_marks: 0, reason: 'below_threshold' },
    ],
  });

  mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });

  mockWriteErrorEvents.mockResolvedValue({
    count: 1,
    unclassified_count: 1,
    status: 'success',
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('writeLedger()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path — full orchestration', () => {
    it('calls all stages in order and returns correct result', async () => {
      setupSuccessPath();

      const result = await writeLedger(baseParams);

      // Verify stage order
      expect(mockCreateOrReuseAttempt).toHaveBeenCalledTimes(1);
      expect(mockCreateOrReuseMarkRun).toHaveBeenCalledTimes(1);
      expect(mockWriteDecisions).toHaveBeenCalledTimes(1);
      expect(mockUpdateMarkRunStatus).toHaveBeenCalledWith(
        baseParams.supabase, MARK_RUN_ID, 'completed', 'success',
      );
      expect(mockWriteErrorEvents).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result).toEqual({
        attempt_id: ATTEMPT_ID,
        mark_run_id: MARK_RUN_ID,
        decision_write_status: 'success',
        error_event_count: 1,
        is_reused_run: false,
      });
    });

    it('passes correct params to createOrReuseAttempt', async () => {
      setupSuccessPath();
      await writeLedger(baseParams);

      expect(mockCreateOrReuseAttempt).toHaveBeenCalledWith({
        supabase: baseParams.supabase,
        user_id: USER_ID,
        question_id: QUESTION_ID,
        paper_id: null,
        storage_key: '9709/s22/qp11/q01.png',
        q_number: 1,
        subpart: null,
        submitted_steps: baseParams.student_steps,
        idempotency_key: 'idem-001',
      });
    });

    it('passes correct params to createOrReuseMarkRun', async () => {
      setupSuccessPath();
      await writeLedger(baseParams);

      expect(mockCreateOrReuseMarkRun).toHaveBeenCalledWith({
        supabase: baseParams.supabase,
        attempt_id: ATTEMPT_ID,
        run_idempotency_key: null,
        engine_version: 'v1.0',
        rubric_version: 'r1.0',
        decisions: baseParams.decisions,
        rubric_points: baseParams.rubric_points,
        request_summary: baseParams.request_summary,
        response_summary: baseParams.response_summary,
      });
    });

    it('passes topic_path and node_id from attempt to writeErrorEvents', async () => {
      setupSuccessPath();
      await writeLedger(baseParams);

      expect(mockWriteErrorEvents).toHaveBeenCalledWith({
        supabase: baseParams.supabase,
        attempt_id: ATTEMPT_ID,
        topic_path: '9709.p1.algebra',
        node_id: 'node-001',
        mark_decisions: expect.any(Array),
      });
    });
  });

  describe('run reuse — skip decisions and error_events', () => {
    it('returns immediately when run_idempotency_key is set and is_new=false', async () => {
      mockCreateOrReuseAttempt.mockResolvedValue({
        attempt_id: ATTEMPT_ID,
        topic_path: '9709.p1.algebra',
        node_id: 'node-001',
        is_new: false,
      });
      mockCreateOrReuseMarkRun.mockResolvedValue({
        mark_run_id: MARK_RUN_ID,
        is_new: false,
      });

      const result = await writeLedger({
        ...baseParams,
        run_idempotency_key: 'run-001',
      });

      expect(result).toEqual({
        attempt_id: ATTEMPT_ID,
        mark_run_id: MARK_RUN_ID,
        decision_write_status: 'skipped',
        error_event_count: 0,
        is_reused_run: true,
      });

      // Decisions and error events should NOT be called
      expect(mockWriteDecisions).not.toHaveBeenCalled();
      expect(mockWriteErrorEvents).not.toHaveBeenCalled();
      expect(mockUpdateMarkRunStatus).not.toHaveBeenCalled();
    });

    it('proceeds normally when run_idempotency_key is set but is_new=true', async () => {
      setupSuccessPath();
      mockCreateOrReuseMarkRun.mockResolvedValue({
        mark_run_id: MARK_RUN_ID,
        is_new: true,
      });

      const result = await writeLedger({
        ...baseParams,
        run_idempotency_key: 'run-002',
      });

      expect(result.is_reused_run).toBe(false);
      expect(result.decision_write_status).toBe('success');
      expect(mockWriteDecisions).toHaveBeenCalledTimes(1);
    });

    it('proceeds normally when run_idempotency_key is null even if is_new=false', async () => {
      // This shouldn't happen in practice (null key always creates new),
      // but the guard only triggers when run_idempotency_key is truthy.
      setupSuccessPath();
      mockCreateOrReuseMarkRun.mockResolvedValue({
        mark_run_id: MARK_RUN_ID,
        is_new: false,
      });

      const result = await writeLedger({
        ...baseParams,
        run_idempotency_key: null,
      });

      expect(result.is_reused_run).toBe(false);
      expect(mockWriteDecisions).toHaveBeenCalledTimes(1);
    });
  });

  describe('decision write failure — degradation', () => {
    it('updates mark_run to failed when writeDecisions returns failed status', async () => {
      mockCreateOrReuseAttempt.mockResolvedValue({
        attempt_id: ATTEMPT_ID,
        topic_path: null,
        node_id: null,
        is_new: true,
      });
      mockCreateOrReuseMarkRun.mockResolvedValue({
        mark_run_id: MARK_RUN_ID,
        is_new: true,
      });
      mockWriteDecisions.mockResolvedValue({
        status: 'failed',
        count: 0,
        error: 'duplicate key violation',
      });
      mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });

      const result = await writeLedger(baseParams);

      expect(result.decision_write_status).toBe('failed');
      expect(result.error_event_count).toBe(0);
      expect(result.is_reused_run).toBe(false);
      expect(mockUpdateMarkRunStatus).toHaveBeenCalledWith(
        baseParams.supabase, MARK_RUN_ID, 'failed', 'failed',
      );
      // Error events should NOT be called after decision failure
      expect(mockWriteErrorEvents).not.toHaveBeenCalled();
    });

    it('updates mark_run to failed when writeDecisions throws an exception', async () => {
      mockCreateOrReuseAttempt.mockResolvedValue({
        attempt_id: ATTEMPT_ID,
        topic_path: null,
        node_id: null,
        is_new: true,
      });
      mockCreateOrReuseMarkRun.mockResolvedValue({
        mark_run_id: MARK_RUN_ID,
        is_new: true,
      });
      mockWriteDecisions.mockRejectedValue(new Error('network timeout'));
      mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });

      const result = await writeLedger(baseParams);

      expect(result.decision_write_status).toBe('failed');
      expect(result.error_event_count).toBe(0);
      expect(mockUpdateMarkRunStatus).toHaveBeenCalledWith(
        baseParams.supabase, MARK_RUN_ID, 'failed', 'failed',
      );
      expect(mockWriteErrorEvents).not.toHaveBeenCalled();
    });
  });

  describe('error event failure — non-blocking', () => {
    it('returns success with error_event_count=0 when writeErrorEvents returns failed', async () => {
      setupSuccessPath();
      mockWriteErrorEvents.mockResolvedValue({
        count: 0,
        unclassified_count: 0,
        status: 'failed',
        error: 'trigger failure',
      });

      const result = await writeLedger(baseParams);

      expect(result.decision_write_status).toBe('success');
      expect(result.error_event_count).toBe(0);
      expect(result.is_reused_run).toBe(false);
      // mark_run should still be completed
      expect(mockUpdateMarkRunStatus).toHaveBeenCalledWith(
        baseParams.supabase, MARK_RUN_ID, 'completed', 'success',
      );
    });

    it('returns success with error_event_count=0 when writeErrorEvents throws', async () => {
      setupSuccessPath();
      mockWriteErrorEvents.mockRejectedValue(new Error('unexpected crash'));

      const result = await writeLedger(baseParams);

      expect(result.decision_write_status).toBe('success');
      expect(result.error_event_count).toBe(0);
      expect(result.is_reused_run).toBe(false);
    });
  });

  describe('attempt creation failure — propagates', () => {
    it('throws when createOrReuseAttempt throws', async () => {
      mockCreateOrReuseAttempt.mockRejectedValue(new Error('attempt insert failed'));

      await expect(writeLedger(baseParams)).rejects.toThrow('attempt insert failed');

      expect(mockCreateOrReuseMarkRun).not.toHaveBeenCalled();
      expect(mockWriteDecisions).not.toHaveBeenCalled();
      expect(mockWriteErrorEvents).not.toHaveBeenCalled();
    });
  });

  describe('mark run creation failure — propagates', () => {
    it('throws when createOrReuseMarkRun throws', async () => {
      mockCreateOrReuseAttempt.mockResolvedValue({
        attempt_id: ATTEMPT_ID,
        topic_path: null,
        node_id: null,
        is_new: true,
      });
      mockCreateOrReuseMarkRun.mockRejectedValue(new Error('mark_run insert failed'));

      await expect(writeLedger(baseParams)).rejects.toThrow('mark_run insert failed');

      expect(mockWriteDecisions).not.toHaveBeenCalled();
      expect(mockWriteErrorEvents).not.toHaveBeenCalled();
    });
  });

  describe('default parameter handling', () => {
    it('handles missing optional params with defaults', async () => {
      setupSuccessPath();

      const minimalParams = {
        supabase: {},
        user_id: USER_ID,
        question_id: QUESTION_ID,
        storage_key: '9709/s22/qp11/q01.png',
        q_number: 1,
        idempotency_key: 'idem-002',
        engine_version: 'v1.0',
        rubric_version: 'r1.0',
        decisions: [],
        request_summary: {},
        response_summary: {},
      };

      const result = await writeLedger(minimalParams);

      expect(result.attempt_id).toBe(ATTEMPT_ID);
      expect(result.mark_run_id).toBe(MARK_RUN_ID);

      // Verify defaults were applied
      const attemptCall = mockCreateOrReuseAttempt.mock.calls[0][0];
      expect(attemptCall.paper_id).toBeNull();
      expect(attemptCall.subpart).toBeNull();
      expect(attemptCall.submitted_steps).toEqual([]);

      const runCall = mockCreateOrReuseMarkRun.mock.calls[0][0];
      expect(runCall.run_idempotency_key).toBeNull();
      expect(runCall.rubric_points).toEqual([]);
    });
  });
});
