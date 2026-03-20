import { ensureResponseHelpers } from '../../../lib/http/respond.js';
import {
  LEARNING_ERROR_CODES,
  buildLearningError,
  getLearningErrorStatus,
} from '../contracts/error-contract.js';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function withRequestId(requestId, payload) {
  if (isPlainObject(payload)) {
    return {
      ...payload,
      request_id: requestId ?? null,
    };
  }

  return {
    request_id: requestId ?? null,
    data: payload ?? null,
  };
}

function setRequestIdHeader(res, requestId) {
  if (requestId) {
    res.setHeader('X-Request-Id', requestId);
  }
}

export class LearningHttpError extends Error {
  constructor(
    code,
    publicMessage,
    {
      status,
      details,
      retryable,
      cause,
    } = {},
  ) {
    super(`${code}: ${publicMessage}`, cause ? { cause } : undefined);
    this.name = 'LearningHttpError';
    this.code = code;
    this.status = status ?? getLearningErrorStatus(code);
    this.details = details;
    this.retryable = retryable;
    this.publicMessage = publicMessage;
  }
}

export function sendLearningJson(res, requestId, payload = {}, status = 200) {
  ensureResponseHelpers(res);
  setRequestIdHeader(res, requestId);
  return res.status(status).json(withRequestId(requestId, payload));
}

export function sendLearningCreated(res, requestId, payload = {}) {
  return sendLearningJson(res, requestId, payload, 201);
}

export function sendLearningError(res, requestId, code, options = {}) {
  ensureResponseHelpers(res);
  setRequestIdHeader(res, requestId);

  const status = options.status ?? getLearningErrorStatus(code);
  const payload = buildLearningError(requestId, code, {
    message: options.message,
    retryable: options.retryable,
    details: options.details,
  });

  return res.status(status).json(payload);
}

export function sendLearningHttpError(
  res,
  requestId,
  error,
  {
    defaultCode = LEARNING_ERROR_CODES.INVALID_PAYLOAD,
    defaultMessage,
  } = {},
) {
  const code = typeof error?.code === 'string' ? error.code : defaultCode;
  const message = error?.publicMessage
    || (typeof error?.message === 'string' && error.message.trim())
    || defaultMessage;

  return sendLearningError(res, requestId, code, {
    status: Number.isInteger(error?.status) ? error.status : undefined,
    message,
    retryable: typeof error?.retryable === 'boolean' ? error.retryable : undefined,
    details: typeof error?.details === 'undefined' ? undefined : error.details,
  });
}
