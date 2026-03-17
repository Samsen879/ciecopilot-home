import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockExecuteAskAI = jest.fn();
const mockToRagError = jest.fn();
const mockRecordRagTelemetrySuccess = jest.fn();
const mockRecordRagTelemetryFailure = jest.fn();

jest.unstable_mockModule('../lib/ask-service.js', () => ({
  executeAskAI: mockExecuteAskAI,
}));

jest.unstable_mockModule('../lib/errors.js', () => ({
  toRagError: mockToRagError,
}));

jest.unstable_mockModule('../lib/telemetry-recorder.js', () => ({
  recordRagTelemetrySuccess: mockRecordRagTelemetrySuccess,
  recordRagTelemetryFailure: mockRecordRagTelemetryFailure,
}));

const { default: handler } = await import('../ask.js');

function createRes() {
  const res = {
    statusCode: 200,
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.payload = payload;
      return this;
    }),
  };
  return res;
}

describe('/api/rag/ask telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordRagTelemetrySuccess.mockResolvedValue(null);
    mockRecordRagTelemetryFailure.mockResolvedValue(null);
  });

  it('records one success telemetry event after a successful ask response', async () => {
    const req = {
      method: 'POST',
      request_id: 'req-ask-telemetry-success',
      headers: {
        'x-client-session-id': 'sess-ask-1',
      },
      body: {
        query: 'Explain this node',
        subject_code: '9702',
        current_topic_path: '9702.5',
        syllabus_node_id: '9702-5-1',
        language: 'en',
      },
    };
    const res = createRes();
    const payload = {
      request_id: 'req-ask-telemetry-success',
      answer: 'grounded answer',
      uncertain: false,
      uncertain_reason_code: null,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
      evidence: [{ id: 'ev-1' }],
      metrics: {
        latency_ms: 100,
        retrieval_latency_ms: 70,
        llm_latency_ms: 20,
        route_audit: {
          retrieval_route: 's2_augmentation',
          final_execution_route: 's2_augmentation',
          fallback_reason: null,
        },
        cost_audit: {
          usage: {
            prompt_tokens: 50,
            completion_tokens: 20,
            embedding_tokens: 10,
          },
        },
      },
    };
    mockExecuteAskAI.mockResolvedValue(payload);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(mockRecordRagTelemetrySuccess).toHaveBeenCalledTimes(1);
    expect(mockRecordRagTelemetryFailure).not.toHaveBeenCalled();
    expect(mockRecordRagTelemetrySuccess).toHaveBeenCalledWith({
      req,
      endpoint: '/api/rag/ask',
      method: 'POST',
      input: req.body,
      response: payload,
    });
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.request_id).toBe(
      'req-ask-telemetry-success',
    );
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.route_audit.retrieval_route).toBe(
      's2_augmentation',
    );
    expect(
      mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.route_audit.final_execution_route,
    ).toBe('s2_augmentation');
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.route_audit.fallback_reason).toBeNull();
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.retrieval_latency_ms).toBe(70);
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.llm_latency_ms).toBe(20);
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.cost_audit.usage).toEqual({
      prompt_tokens: 50,
      completion_tokens: 20,
      embedding_tokens: 10,
    });
  });

  it('records one failure telemetry event after handler-level rag errors', async () => {
    const req = {
      method: 'POST',
      request_id: 'req-ask-telemetry-failure',
      headers: {
        'x-client-session-id': 'sess-ask-2',
      },
      body: {
        query: 'Find support for this node',
        subject_code: '9231',
        current_topic_path: '9231.2',
        syllabus_node_id: '9231-2-1',
        language: 'en',
      },
    };
    const res = createRes();
    const thrown = new Error('boom');
    const ragError = {
      status: 502,
      code: 'RAG_RETRIEVER_ERROR',
      message: 'retriever failed',
      details: { stage: 'hybrid_rpc' },
    };
    mockExecuteAskAI.mockRejectedValue(thrown);
    mockToRagError.mockReturnValue(ragError);

    await handler(req, res);

    expect(mockToRagError).toHaveBeenCalledWith(thrown);
    expect(mockRecordRagTelemetrySuccess).not.toHaveBeenCalled();
    expect(mockRecordRagTelemetryFailure).toHaveBeenCalledTimes(1);
    expect(mockRecordRagTelemetryFailure).toHaveBeenCalledWith({
      req,
      endpoint: '/api/rag/ask',
      method: 'POST',
      input: req.body,
      ragError,
      partialResponse: null,
    });
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      code: 'RAG_RETRIEVER_ERROR',
      message: 'retriever failed',
      request_id: 'req-ask-telemetry-failure',
      details: { stage: 'hybrid_rpc' },
    });
  });
});
