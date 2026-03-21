import {
  LEARNING_ERROR_CODES,
} from '../lib/contracts/error-contract.js';
import {
  sendLearningCreated,
  sendLearningError,
  sendLearningJson,
  sendLearningHttpError,
} from '../lib/http/learning-http.js';

function createResponse() {
  return {
    statusCode: 200,
    jsonPayload: null,
    headers: {},
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    },
  };
}

test('learning http helper emits request_id on successful JSON responses', () => {
  const res = createResponse();
  sendLearningJson(res, 'req-1', {
    session_id: 'session-1',
    mode: 'learn_concept',
  });

  expect(res.statusCode).toBe(200);
  expect(res.jsonPayload).toEqual({
    request_id: 'req-1',
    session_id: 'session-1',
    mode: 'learn_concept',
  });
});

test('learning http helper emits created responses with request_id', () => {
  const res = createResponse();
  sendLearningCreated(res, 'req-1', {
    question_id: 'question-1',
  });

  expect(res.statusCode).toBe(201);
  expect(res.jsonPayload).toEqual({
    request_id: 'req-1',
    question_id: 'question-1',
  });
});

test('learning http helper emits the frozen error envelope', () => {
  const res = createResponse();
  sendLearningError(res, 'req-2', 'invalid_payload');

  expect(res.statusCode).toBe(400);
  expect(res.jsonPayload).toEqual({
    request_id: 'req-2',
    error: {
      code: 'invalid_payload',
      message: 'The learning request payload is invalid.',
      retryable: false,
      details: {},
    },
  });
});

test('learning http helper maps structured validator failures through the frozen envelope', () => {
  const res = createResponse();
  const error = Object.assign(new Error('question anchor mismatch'), {
    code: 'invalid_payload',
    status: 400,
    details: { field: 'current_question_id' },
  });

  sendLearningHttpError(res, 'req-3', error);

  expect(res.statusCode).toBe(400);
  expect(res.jsonPayload).toEqual({
    request_id: 'req-3',
    error: {
      code: 'invalid_payload',
      message: 'question anchor mismatch',
      retryable: false,
      details: { field: 'current_question_id' },
    },
  });
});

test('learning http helper falls back to frozen error codes for unknown upstream codes', () => {
  const res = createResponse();
  const error = Object.assign(new Error('connection reset by peer'), {
    code: 'ECONNRESET',
    status: 503,
    details: { source: 'db' },
  });

  sendLearningHttpError(res, 'req-4', error, {
    defaultCode: LEARNING_ERROR_CODES.SESSION_STATE_CONFLICT,
  });

  expect(res.statusCode).toBe(503);
  expect(res.jsonPayload).toEqual({
    request_id: 'req-4',
    error: {
      code: 'session_state_conflict',
      message: 'connection reset by peer',
      retryable: false,
      details: { source: 'db' },
    },
  });
});
