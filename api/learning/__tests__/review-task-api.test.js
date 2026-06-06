import { jest } from '@jest/globals';

const mockPatchLearningReviewTask = jest.fn();

jest.unstable_mockModule('../lib/review/review-task-service.js', () => ({
  patchLearningReviewTask: mockPatchLearningReviewTask,
}));

const { default: handler } = await import('../review-tasks/[id].js');

function createReq({
  method = 'PATCH',
  id = 'review-task-1',
  body = {},
  authUserId = 'student-1',
} = {}) {
  return {
    method,
    query: { id },
    body,
    request_id: 'req-review-task-api',
    auth_user_id: authUserId,
  };
}

function createRes() {
  const headers = {};

  return {
    statusCode: 200,
    headers,
    body: null,
    writableEnded: false,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('review task api', () => {
  test('PATCH /api/learning/review-tasks/:id applies explicit intent writes', async () => {
    mockPatchLearningReviewTask.mockResolvedValueOnce({
      review_task: {
        review_task_id: 'review-task-1',
        status: 'completed',
        completion_evidence: {
          summary: 'Solved a fresh variant.',
          outcome: 'completed',
        },
      },
    });

    const req = createReq({
      body: {
        intent: 'complete',
        completion_outcome: 'completed',
        completion_evidence: {
          summary: 'Solved a fresh variant.',
        },
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockPatchLearningReviewTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'student-1',
        reviewTaskId: 'review-task-1',
        intent: 'complete',
        completionOutcome: 'completed',
        completionEvidence: {
          summary: 'Solved a fresh variant.',
        },
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.review_task).toMatchObject({
      review_task_id: 'review-task-1',
      status: 'completed',
    });
  });

  test('PATCH /api/learning/review-tasks/:id rejects generic status payloads', async () => {
    const req = createReq({
      body: {
        status: 'completed',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockPatchLearningReviewTask).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('invalid_payload');
  });

  test.each([
    ['skipped', { skip_reason: 'student skipped this review task.' }],
    ['expired', { expired_reason: 'review window elapsed.' }],
  ])('PATCH /api/learning/review-tasks/:id accepts explicit %s outcomes', async (completionOutcome, completionEvidence) => {
    mockPatchLearningReviewTask.mockResolvedValueOnce({
      review_task: {
        review_task_id: 'review-task-1',
        status: completionOutcome,
        completion_evidence: {
          ...completionEvidence,
          outcome: completionOutcome,
        },
      },
    });

    const req = createReq({
      body: {
        intent: 'complete',
        completion_outcome: completionOutcome,
        completion_evidence: completionEvidence,
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockPatchLearningReviewTask).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'student-1',
        reviewTaskId: 'review-task-1',
        intent: 'complete',
        completionOutcome,
        completionEvidence,
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.review_task).toMatchObject({
      review_task_id: 'review-task-1',
      status: completionOutcome,
    });
  });

  test('PATCH /api/learning/review-tasks/:id preserves stable conflict codes', async () => {
    const error = new Error('review_task_state_conflict');
    error.code = 'review_task_state_conflict';
    error.status = 409;
    error.publicMessage = 'The review task state conflicts with this request.';
    mockPatchLearningReviewTask.mockRejectedValueOnce(error);

    const req = createReq({
      body: {
        intent: 'reopen',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('review_task_state_conflict');
  });
});
