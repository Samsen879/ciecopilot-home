// tests/evidence-ledger/ledger-orchestrator.pbt.test.js
// Property-based tests for ledger-orchestrator writeLedger flow.
// Property 13: 审计回放完整性
// **Validates: Requirements 5.5**
//
// NOTE: Property 9 (Feature Flag 双写控制) has been removed — the legacy
// write path (auto-error-writer-v1, run-repository-v1, isLegacyWriteEnabled)
// no longer exists. evaluate-v1 always writes to the Evidence Ledger.

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';

// ── Mock all leaf-level downstream modules ──────────────────────────────────

// Attempt repository
const mockCreateOrReuseAttempt = jest.fn();
const mockResolveQuestionId = jest.fn();

class MockValidationError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
  }
}

jest.unstable_mockModule('../../api/marking/lib/attempt-repository.js', () => ({
  createOrReuseAttempt: mockCreateOrReuseAttempt,
  resolveQuestionId: mockResolveQuestionId,
  ValidationError: MockValidationError,
}));

// Mark run repository v2
const mockCreateOrReuseMarkRun = jest.fn();
const mockUpdateMarkRunStatus = jest.fn();

jest.unstable_mockModule('../../api/marking/lib/mark-run-repository-v2.js', () => ({
  createOrReuseMarkRun: mockCreateOrReuseMarkRun,
  updateMarkRunStatus: mockUpdateMarkRunStatus,
}));

// Decision writer
const mockWriteDecisions = jest.fn();

jest.unstable_mockModule('../../api/marking/lib/decision-writer.js', () => ({
  writeDecisions: mockWriteDecisions,
}));

// Error event writer
const mockWriteErrorEvents = jest.fn();

jest.unstable_mockModule('../../api/marking/lib/error-event-writer.js', () => ({
  writeErrorEvents: mockWriteErrorEvents,
}));

// ── Import module after all mocks ───────────────────────────────────────────
const { writeLedger } = await import('../../api/marking/lib/ledger-orchestrator.js');

// ── Generators ──────────────────────────────────────────────────────────────

const arbUuid = fc.uuid().map(u => u.toString());

const VALID_REASONS = [
  'best_match', 'below_threshold', 'borderline_score',
  'dependency_not_met', 'dependency_error', 'no_match',
];
const arbValidReason = fc.constantFrom(...VALID_REASONS);

const arbMarkLabel = fc.constantFrom('M1', 'A1', 'B1', 'M2', 'A2', 'B2', 'M3', 'A3');

const arbMarks = fc.integer({ min: 0, max: 20 });

const arbRubricId = fc.string({ minLength: 1, maxLength: 8 })
  .map(s => `r_${s.replace(/[^a-z0-9]/gi, 'x') || 'x'}`);

/** A single decision with a valid reason */
const arbDecision = fc.record({
  rubric_id: arbRubricId,
  mark_label: arbMarkLabel,
  awarded: fc.boolean(),
  awarded_marks: arbMarks,
  reason: arbValidReason,
});

/** Array of 1+ decisions with unique rubric_ids */
const arbDecisions = fc.array(arbDecision, { minLength: 1, maxLength: 10 })
  .map(decisions => {
    const seen = new Set();
    return decisions.filter(d => {
      if (seen.has(d.rubric_id)) return false;
      seen.add(d.rubric_id);
      return true;
    });
  })
  .filter(arr => arr.length >= 1);

/** A single rubric point */
const arbRubricPoint = fc.record({
  marks: fc.integer({ min: 1, max: 5 }),
});

/** Array of rubric points */
const arbRubricPoints = fc.array(arbRubricPoint, { minLength: 1, maxLength: 10 });

/** Storage key in valid format */
const arbStorageKey = fc.tuple(
  fc.constantFrom('9709', '9231', '9702'),
  fc.constantFrom('s22', 'w21', 's23', 'w22'),
  fc.constantFrom('qp11', 'qp12', 'qp31', 'qp41'),
  fc.integer({ min: 1, max: 12 }),
).map(([code, session, paper, q]) => `${code}/${session}/${paper}/q${String(q).padStart(2, '0')}.png`);

/** Student steps */
const arbStudentSteps = fc.array(
  fc.record({
    step_id: fc.string({ minLength: 1, maxLength: 5 }).map(s => `s_${s.replace(/[^a-z0-9]/gi, 'x') || 'x'}`),
    text: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  { minLength: 1, maxLength: 5 },
);

/** Engine/rubric version strings */
const arbVersion = fc.constantFrom('v1.0', 'v1.1', 'v2.0', 'v2.1');

/** Topic path (ltree-like) */
const arbTopicPath = fc.constantFrom(
  '9709.p1.algebra', '9709.p1.algebra.quadratics', '9709.p3.calculus',
  '9231.fp1.complex', '9702.as.mechanics', null,
);

// ── Property 13: 审计回放完整性 ─────────────────────────────────────────────

describe('Property 13: 审计回放完整性', () => {
  // Feature: learning-evidence-ledger, Property 13: 审计回放完整性
  // For any mark_run_id, the audit replay query must return complete context:
  // attempt (with submitted_steps), mark_decisions, engine_version, rubric_version,
  // request_summary, response_summary.
  // This property verifies that writeLedger passes all required audit replay fields
  // through to the downstream modules, ensuring data completeness for replay.
  // **Validates: Requirements 5.5**

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createOrReuseAttempt receives submitted_steps for every request', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // user_id
        arbUuid,           // question_id
        arbStorageKey,     // storage_key
        fc.integer({ min: 1, max: 12 }),  // q_number
        arbStudentSteps,   // student_steps
        arbUuid,           // idempotency_key
        arbVersion,        // engine_version
        arbVersion,        // rubric_version
        arbDecisions,      // decisions
        async (userId, questionId, storageKey, qNumber, studentSteps, idemKey, engineVer, rubricVer, decisions) => {
          jest.clearAllMocks();

          const attemptId = `att-${idemKey.slice(0, 8)}`;
          const markRunId = `mr-${idemKey.slice(0, 8)}`;

          mockCreateOrReuseAttempt.mockResolvedValue({
            attempt_id: attemptId,
            topic_path: '9709.p1.algebra',
            node_id: 'node-001',
            is_new: true,
          });

          mockCreateOrReuseMarkRun.mockResolvedValue({
            mark_run_id: markRunId,
            is_new: true,
          });

          mockWriteDecisions.mockResolvedValue({
            status: 'success',
            count: decisions.length,
            decisions: decisions.map((d, i) => ({
              mark_decision_id: `md-${i}`,
              rubric_id: d.rubric_id,
            })),
          });

          mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });

          mockWriteErrorEvents.mockResolvedValue({
            count: 0,
            unclassified_count: 0,
            status: 'success',
          });

          await writeLedger({
            supabase: {},
            user_id: userId,
            question_id: questionId,
            storage_key: storageKey,
            q_number: qNumber,
            student_steps: studentSteps,
            idempotency_key: idemKey,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: [],
            request_summary: {},
            response_summary: {},
          });

          // Verify submitted_steps passed to attempt
          const attemptCall = mockCreateOrReuseAttempt.mock.calls[0][0];
          expect(attemptCall.submitted_steps).toEqual(studentSteps);
          expect(attemptCall.submitted_steps.length).toBe(studentSteps.length);
          // Each step must have step_id and text
          for (const step of attemptCall.submitted_steps) {
            expect(step).toHaveProperty('step_id');
            expect(step).toHaveProperty('text');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createOrReuseMarkRun receives engine_version, rubric_version, request_summary, response_summary', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // user_id
        arbUuid,           // question_id
        arbStorageKey,     // storage_key
        arbUuid,           // idempotency_key
        arbVersion,        // engine_version
        arbVersion,        // rubric_version
        arbDecisions,      // decisions
        arbRubricPoints,   // rubric_points
        async (userId, questionId, storageKey, idemKey, engineVer, rubricVer, decisions, rubricPoints) => {
          jest.clearAllMocks();

          const requestSummary = { steps: decisions.length, ver: engineVer };
          const responseSummary = { score: decisions.filter(d => d.awarded).length };

          mockCreateOrReuseAttempt.mockResolvedValue({
            attempt_id: 'att-test',
            topic_path: null,
            node_id: null,
            is_new: true,
          });

          mockCreateOrReuseMarkRun.mockResolvedValue({
            mark_run_id: 'mr-test',
            is_new: true,
          });

          mockWriteDecisions.mockResolvedValue({
            status: 'success',
            count: decisions.length,
            decisions: decisions.map((d, i) => ({
              mark_decision_id: `md-${i}`,
              rubric_id: d.rubric_id,
            })),
          });

          mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });
          mockWriteErrorEvents.mockResolvedValue({ count: 0, status: 'success' });

          await writeLedger({
            supabase: {},
            user_id: userId,
            question_id: questionId,
            storage_key: storageKey,
            q_number: 1,
            idempotency_key: idemKey,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: requestSummary,
            response_summary: responseSummary,
          });

          // Verify mark run received all audit replay fields
          const runCall = mockCreateOrReuseMarkRun.mock.calls[0][0];
          expect(runCall.engine_version).toBe(engineVer);
          expect(runCall.rubric_version).toBe(rubricVer);
          expect(runCall.request_summary).toEqual(requestSummary);
          expect(runCall.response_summary).toEqual(responseSummary);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('writeDecisions receives all decisions for audit replay', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // user_id
        arbUuid,           // question_id
        arbUuid,           // idempotency_key
        arbDecisions,      // decisions
        async (userId, questionId, idemKey, decisions) => {
          jest.clearAllMocks();

          mockCreateOrReuseAttempt.mockResolvedValue({
            attempt_id: 'att-test',
            topic_path: null,
            node_id: null,
            is_new: true,
          });

          mockCreateOrReuseMarkRun.mockResolvedValue({
            mark_run_id: 'mr-test',
            is_new: true,
          });

          mockWriteDecisions.mockResolvedValue({
            status: 'success',
            count: decisions.length,
            decisions: decisions.map((d, i) => ({
              mark_decision_id: `md-${i}`,
              rubric_id: d.rubric_id,
            })),
          });

          mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });
          mockWriteErrorEvents.mockResolvedValue({ count: 0, status: 'success' });

          await writeLedger({
            supabase: {},
            user_id: userId,
            question_id: questionId,
            storage_key: '9709/s22/qp11/q01.png',
            q_number: 1,
            idempotency_key: idemKey,
            engine_version: 'v1.0',
            rubric_version: 'v1.0',
            decisions,
            rubric_points: [],
            request_summary: {},
            response_summary: {},
          });

          // Verify decisions passed through completely
          const decisionCall = mockWriteDecisions.mock.calls[0][0];
          expect(decisionCall.decisions).toEqual(decisions);
          expect(decisionCall.decisions.length).toBe(decisions.length);

          // Each decision must have all required audit fields
          for (let i = 0; i < decisions.length; i++) {
            expect(decisionCall.decisions[i].rubric_id).toBe(decisions[i].rubric_id);
            expect(decisionCall.decisions[i].mark_label).toBe(decisions[i].mark_label);
            expect(decisionCall.decisions[i].awarded).toBe(decisions[i].awarded);
            expect(decisionCall.decisions[i].awarded_marks).toBe(decisions[i].awarded_marks);
            expect(decisionCall.decisions[i].reason).toBe(decisions[i].reason);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('complete audit context is available after successful writeLedger', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbUuid,           // user_id
        arbUuid,           // question_id
        arbStorageKey,     // storage_key
        fc.integer({ min: 1, max: 12 }),  // q_number
        arbStudentSteps,   // student_steps
        arbUuid,           // idempotency_key
        arbVersion,        // engine_version
        arbVersion,        // rubric_version
        arbDecisions,      // decisions
        arbRubricPoints,   // rubric_points
        arbTopicPath,      // topic_path
        async (userId, questionId, storageKey, qNumber, studentSteps, idemKey, engineVer, rubricVer, decisions, rubricPoints, topicPath) => {
          jest.clearAllMocks();

          const requestSummary = { q: qNumber, steps: studentSteps.length };
          const responseSummary = { decisions, total: decisions.length };

          mockCreateOrReuseAttempt.mockResolvedValue({
            attempt_id: 'att-audit',
            topic_path: topicPath,
            node_id: topicPath ? 'node-audit' : null,
            is_new: true,
          });

          mockCreateOrReuseMarkRun.mockResolvedValue({
            mark_run_id: 'mr-audit',
            is_new: true,
          });

          const decisionRows = decisions.map((d, i) => ({
            mark_decision_id: `md-audit-${i}`,
            rubric_id: d.rubric_id,
            awarded: d.awarded,
            awarded_marks: d.awarded_marks,
            reason: d.reason,
          }));

          mockWriteDecisions.mockResolvedValue({
            status: 'success',
            count: decisions.length,
            decisions: decisionRows,
          });

          mockUpdateMarkRunStatus.mockResolvedValue({ ok: true });
          mockWriteErrorEvents.mockResolvedValue({ count: 0, status: 'success' });

          const result = await writeLedger({
            supabase: {},
            user_id: userId,
            question_id: questionId,
            storage_key: storageKey,
            q_number: qNumber,
            student_steps: studentSteps,
            idempotency_key: idemKey,
            engine_version: engineVer,
            rubric_version: rubricVer,
            decisions,
            rubric_points: rubricPoints,
            request_summary: requestSummary,
            response_summary: responseSummary,
          });

          // Result must contain attempt_id and mark_run_id for audit lookup
          expect(result.attempt_id).toBe('att-audit');
          expect(result.mark_run_id).toBe('mr-audit');
          expect(result.decision_write_status).toBe('success');

          // Verify ALL audit replay components were written:

          // 1. Attempt with submitted_steps
          const attemptCall = mockCreateOrReuseAttempt.mock.calls[0][0];
          expect(attemptCall.submitted_steps).toEqual(studentSteps);
          expect(attemptCall.user_id).toBe(userId);
          expect(attemptCall.question_id).toBe(questionId);

          // 2. Mark run with engine_version, rubric_version, request_summary, response_summary
          const runCall = mockCreateOrReuseMarkRun.mock.calls[0][0];
          expect(runCall.engine_version).toBe(engineVer);
          expect(runCall.rubric_version).toBe(rubricVer);
          expect(runCall.request_summary).toEqual(requestSummary);
          expect(runCall.response_summary).toEqual(responseSummary);

          // 3. Mark decisions written
          const decisionCall = mockWriteDecisions.mock.calls[0][0];
          expect(decisionCall.decisions.length).toBe(decisions.length);
          expect(decisionCall.mark_run_id).toBe('mr-audit');

          // 4. Mark run status updated to completed
          expect(mockUpdateMarkRunStatus).toHaveBeenCalledWith(
            {}, 'mr-audit', 'completed', 'success',
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
