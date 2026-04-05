import {
  sendLearningError,
  sendLearningSuccess,
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

test('learning http helper emits request_id on success responses', () => {
  const res = createResponse();
  sendLearningSuccess(res, 'req-1', {
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
