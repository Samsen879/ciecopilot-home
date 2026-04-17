import { jest } from '@jest/globals';

const mockSearchQuestions = jest.fn();
const mockServiceClient = { kind: 'service-client' };
const mockGetServiceClient = jest.fn(() => mockServiceClient);
const mockRequireAuth = jest.fn();

jest.unstable_mockModule('../../lib/supabase/client.js', () => ({
  getServiceClient: mockGetServiceClient,
}));

jest.unstable_mockModule('../../lib/security/auth-guard.js', () => ({
  requireAuth: mockRequireAuth,
}));

jest.unstable_mockModule('../lib/questions/question-search-service.js', () => ({
  getQuestionSearchProductFlagStatus: () => ({ enabled: true }),
  searchQuestions: mockSearchQuestions,
}));

const { default: handler } = await import('../questions/index.js');

function createReq({
  method = 'GET',
  query = { subject_code: '9709' },
  authUserId = 'student-1',
  requestId = 'req-question-search-api',
} = {}) {
  return {
    method,
    query,
    auth_user_id: authUserId,
    request_id: requestId,
    path: '/api/learning/questions',
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
  mockRequireAuth.mockResolvedValue({
    ok: true,
    user: {
      id: 'student-1',
    },
  });
});

describe('question-search-api', () => {
  test('GET /api/learning/questions returns the paginated service payload without inventing a second response shape', async () => {
    mockSearchQuestions.mockResolvedValueOnce({
      items: [
        {
          question_id: 'question-1',
          subject_code: '9709',
          search_text: 'Use a trigonometric identity.',
          product_posture: {
            code: 'paper_backed',
            label: 'Paper-backed',
            is_provisional: false,
          },
          product_card: {
            title: 'S19 P1 Q6',
            summary_line: 'Use a trigonometric identity.',
          },
          match_context: {
            filters_applied: ['subject_code'],
            text_query_used: false,
          },
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
      feature_flags: {
        question_search_product_enabled: true,
      },
    });

    const req = createReq({
      query: {
        subject_code: '9709',
        family_id: 'family-1',
        page: '1',
        page_size: '10',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockGetServiceClient).toHaveBeenCalledTimes(1);
    expect(mockSearchQuestions).toHaveBeenCalledWith(mockServiceClient, req.query, {
      productMode: true,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      request_id: 'req-question-search-api',
      items: [
        {
          question_id: 'question-1',
          subject_code: '9709',
          search_text: 'Use a trigonometric identity.',
          product_posture: {
            code: 'paper_backed',
            label: 'Paper-backed',
            is_provisional: false,
          },
          product_card: {
            title: 'S19 P1 Q6',
            summary_line: 'Use a trigonometric identity.',
          },
          match_context: {
            filters_applied: ['subject_code'],
            text_query_used: false,
          },
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
      feature_flags: {
        question_search_product_enabled: true,
      },
    });
  });

  test('GET /api/learning/questions rejects non-GET methods', async () => {
    const req = createReq({ method: 'POST' });
    const res = createRes();

    await handler(req, res);

    expect(mockSearchQuestions).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({
      request_id: 'req-question-search-api',
      error: {
        code: 'invalid_payload',
        message: 'Method not allowed.',
        retryable: false,
        details: {},
      },
    });
  });

  test('GET /api/learning/questions surfaces deterministic validation failures from the search service', async () => {
    const error = new Error('invalid_payload');
    error.code = 'invalid_payload';
    error.status = 400;
    error.publicMessage = 'subject_code is required.';
    error.details = { field: 'subject_code' };
    mockSearchQuestions.mockRejectedValueOnce(error);

    const req = createReq({
      query: {
        page: '1',
        page_size: '10',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockSearchQuestions).toHaveBeenCalledWith(mockServiceClient, req.query, {
      productMode: true,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      request_id: 'req-question-search-api',
      error: {
        code: 'invalid_payload',
        message: 'subject_code is required.',
        retryable: false,
        details: { field: 'subject_code' },
      },
    });
  });
});
