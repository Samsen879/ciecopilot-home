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

const { default: handler } = await import('../search.js');

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

describe('/api/rag/search telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordRagTelemetrySuccess.mockResolvedValue(null);
    mockRecordRagTelemetryFailure.mockResolvedValue(null);
  });

  it('records one success telemetry event from the underlying ask response', async () => {
    const req = {
      method: 'POST',
      request_id: 'req-search-telemetry-success',
      headers: {
        'x-client-session-id': 'sess-search-1',
      },
      body: {
        q: 'Search for support',
        topic_id: '9702-5-1',
        subject_code: '9702',
        lang: 'en',
        internal_debug: true,
      },
    };
    const res = createRes();
    const askResponse = {
      request_id: 'req-search-telemetry-success',
      uncertain: false,
      uncertain_reason_code: null,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
      retrieval_version: 'b_simplified_retrieval_s1_v1',
      evidence: [
        {
          id: 'ev-1',
          topic_path: '9702.5',
          source_type: 'note_md',
          snippet: 'first snippet',
          score: 0.9,
          source_ref: { asset_id: 'asset-1', page_no: 1 },
          rank_key: 1,
          rank_sem: 1,
          fused_rank: 1,
        },
      ],
      metrics: {
        latency_ms: 110,
        retrieval_latency_ms: 75,
        llm_latency_ms: 0,
        route_audit: {
          retrieval_route: 's1_default',
          final_execution_route: 's1_default',
          fallback_reason: null,
        },
        cost_audit: {
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            embedding_tokens: 15,
          },
        },
      },
    };
    mockExecuteAskAI.mockResolvedValue(askResponse);

    await handler(req, res);

    expect(mockExecuteAskAI).toHaveBeenCalledWith(
      {
        query: 'Search for support',
        syllabus_node_id: '9702-5-1',
        subject_code: '9702',
        language: 'en',
        internal_debug: true,
      },
      { req },
    );
    expect(mockRecordRagTelemetrySuccess).toHaveBeenCalledTimes(1);
    expect(mockRecordRagTelemetryFailure).not.toHaveBeenCalled();
    expect(mockRecordRagTelemetrySuccess).toHaveBeenCalledWith({
      req,
      endpoint: '/api/rag/search',
      method: 'POST',
      input: {
        query: 'Search for support',
        syllabus_node_id: '9702-5-1',
        subject_code: '9702',
        language: 'en',
        internal_debug: true,
      },
      response: askResponse,
    });
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.request_id).toBe(
      'req-search-telemetry-success',
    );
    expect(mockRecordRagTelemetrySuccess.mock.calls[0][0].response.metrics.route_audit.retrieval_route).toBe(
      's1_default',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      query: 'Search for support',
      syllabus_node_id: '9702-5-1',
      total: 1,
      items: [
        {
          id: 'ev-1',
          chunk_id: 'ev-1',
          topic_path: '9702.5',
          source_type: 'note_md',
          snippet: 'first snippet',
          score: 0.9,
          source_ref: { asset_id: 'asset-1', page_no: 1 },
          rank_key: 1,
          rank_sem: 1,
          fused_rank: 1,
        },
      ],
      elapsed_ms: expect.any(Number),
      topic_leakage_flag: false,
      topic_leakage_reason: null,
      uncertain: false,
      uncertain_reason_code: null,
      retrieval_version: 'b_simplified_retrieval_s1_v1',
    });
  });

  it('records one failure telemetry event after handler-level search errors', async () => {
    const req = {
      method: 'POST',
      request_id: 'req-search-telemetry-failure',
      headers: {
        'x-client-session-id': 'sess-search-2',
      },
      body: {
        q: 'Search failure',
        topic_id: '9231-2-1',
        subject_code: '9231',
        lang: 'en',
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
      endpoint: '/api/rag/search',
      method: 'POST',
      input: {
        query: 'Search failure',
        syllabus_node_id: '9231-2-1',
        subject_code: '9231',
        language: 'en',
        internal_debug: false,
      },
      ragError,
      partialResponse: null,
    });
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      code: 'RAG_RETRIEVER_ERROR',
      message: 'retriever failed',
      request_id: 'req-search-telemetry-failure',
      details: { stage: 'hybrid_rpc' },
    });
  });
});
