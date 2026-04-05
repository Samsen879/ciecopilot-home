import {
  LEARNING_ERROR_CODES,
  buildLearningError,
  getLearningErrorStatus,
} from '../lib/contracts/error-contract.js';

test('error envelope uses the frozen request_id + error shape', () => {
  const details = {
    anchor_kind: 'question',
    anchor_ref: {
      kind: 'question',
      question_id: 'q-1',
    },
  };
  const error = buildLearningError('req-1', LEARNING_ERROR_CODES.INVALID_ANCHOR_REF, {
    details,
  });

  expect(error).toEqual({
    error: {
      code: 'invalid_anchor_ref',
      message: expect.any(String),
      retryable: false,
      details,
    },
    request_id: 'req-1',
  });
  expect(error.error.details).not.toBe(details);
  expect(Object.isFrozen(error)).toBe(true);
  expect(Object.isFrozen(error.error)).toBe(true);
  expect(Object.isFrozen(error.error.details)).toBe(true);
});

test('learning error registry exposes the frozen stage codes', () => {
  expect(LEARNING_ERROR_CODES).toEqual({
    AUTH_REQUIRED: 'auth_required',
    AUTH_FORBIDDEN: 'auth_forbidden',
    INVALID_PAYLOAD: 'invalid_payload',
    INVALID_ANCHOR_KIND: 'invalid_anchor_kind',
    INVALID_ANCHOR_REF: 'invalid_anchor_ref',
    ANCHOR_TARGET_NOT_FOUND: 'anchor_target_not_found',
    UNSUPPORTED_MODE_FOR_ANCHOR: 'unsupported_mode_for_anchor',
    SESSION_NOT_FOUND: 'session_not_found',
    SESSION_STATE_CONFLICT: 'session_state_conflict',
    QUESTION_NOT_FOUND: 'question_not_found',
    WORKSPACE_NOT_FOUND: 'workspace_not_found',
    ARTIFACT_NOT_FOUND: 'artifact_not_found',
    ARTIFACT_STATE_CONFLICT: 'artifact_state_conflict',
    IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
  });
});

test('learning error status defaults match the frozen API contract', () => {
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.INVALID_PAYLOAD)).toBe(400);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.AUTH_REQUIRED)).toBe(401);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.AUTH_FORBIDDEN)).toBe(403);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.SESSION_NOT_FOUND)).toBe(404);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.WORKSPACE_NOT_FOUND)).toBe(404);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.ARTIFACT_NOT_FOUND)).toBe(404);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.ARTIFACT_STATE_CONFLICT)).toBe(409);
  expect(getLearningErrorStatus(LEARNING_ERROR_CODES.IDEMPOTENCY_CONFLICT)).toBe(409);
});
