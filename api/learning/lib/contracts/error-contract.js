export const LEARNING_ERROR_CODES = Object.freeze({
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

const DEFAULT_ERROR_DEFINITION = Object.freeze({
  status: 500,
  message: 'Learning runtime error.',
  retryable: false,
});

const LEARNING_ERROR_DEFINITIONS = Object.freeze({
  [LEARNING_ERROR_CODES.AUTH_REQUIRED]: Object.freeze({
    status: 401,
    message: 'Authentication is required.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.AUTH_FORBIDDEN]: Object.freeze({
    status: 403,
    message: 'You do not have access to this learning resource.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.INVALID_PAYLOAD]: Object.freeze({
    status: 400,
    message: 'The learning request payload is invalid.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.INVALID_ANCHOR_KIND]: Object.freeze({
    status: 400,
    message: 'The anchor kind is not part of the frozen learning contract.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.INVALID_ANCHOR_REF]: Object.freeze({
    status: 400,
    message: 'The anchor ref is malformed.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.ANCHOR_TARGET_NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Anchor target not found.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.UNSUPPORTED_MODE_FOR_ANCHOR]: Object.freeze({
    status: 409,
    message: 'The requested mode is not allowed for this anchor.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.SESSION_NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Learning session not found.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.SESSION_STATE_CONFLICT]: Object.freeze({
    status: 409,
    message: 'The session state conflicts with this request.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.QUESTION_NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Question not found.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.WORKSPACE_NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Workspace not found.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.ARTIFACT_NOT_FOUND]: Object.freeze({
    status: 404,
    message: 'Artifact not found.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.ARTIFACT_STATE_CONFLICT]: Object.freeze({
    status: 409,
    message: 'The artifact state conflicts with this request.',
    retryable: false,
  }),
  [LEARNING_ERROR_CODES.IDEMPOTENCY_CONFLICT]: Object.freeze({
    status: 409,
    message: 'Idempotency replay payload does not match the original request.',
    retryable: false,
  }),
});

export function getLearningErrorDefinition(code) {
  return LEARNING_ERROR_DEFINITIONS[code] || DEFAULT_ERROR_DEFINITION;
}

export function getLearningErrorStatus(code) {
  return getLearningErrorDefinition(code).status;
}

export function buildLearningError(requestId, code, options = {}) {
  const definition = getLearningErrorDefinition(code);
  return {
    request_id: requestId ?? null,
    error: {
      code,
      message: options.message || definition.message,
      retryable: options.retryable ?? definition.retryable,
      details: options.details || {},
    },
  };
}
