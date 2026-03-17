import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { jest } from '@jest/globals';
import { buildRagTelemetryJsonlPath } from '../lib/telemetry-jsonl-sink.js';
import { getRagTelemetrySink } from '../lib/telemetry-sink.js';
import {
  recordRagTelemetryFailure,
  recordRagTelemetrySuccess,
} from '../lib/telemetry-recorder.js';

function createTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rag-telemetry-'));
}

function createSuccessPayload(overrides = {}) {
  return {
    req: {
      request_id: 'req-telemetry-recorder-success',
      headers: {
        'x-client-session-id': 'sess-recorder-1',
      },
    },
    endpoint: '/api/rag/ask',
    method: 'POST',
    input: {
      query: 'Explain this node',
      subject_code: '9702',
      current_topic_path: '9702.5',
      syllabus_node_id: '9702-5-1',
      language: 'en',
    },
    response: {
      request_id: 'req-telemetry-recorder-success',
      answer: 'should not leak',
      uncertain: false,
      uncertain_reason_code: null,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
      evidence: [{ id: 'ev-1', snippet: 'should not leak' }],
      metrics: {
        evidence_traceability_rate: 1,
        latency_ms: 40,
        retrieval_latency_ms: 25,
        llm_latency_ms: 10,
        route_audit: {
          retrieval_route: 's1_default',
          final_execution_route: 's1_default',
          route_stage: 'default_safe',
          route_reason: 'rules_negative_default_s1',
          fallback_triggered: false,
          fallback_reason: null,
          llm_classifier_used: false,
          llm_classifier_status: 'not_enabled',
          s2_hop_count: 0,
          s2_expanded_topic_count: 0,
          route_scores: {},
        },
        retrieval_audit: {
          query_mode: 'hybrid_rpc',
          chat_mode: 'upstream_ok',
          rpc_call_count: 1,
          hybrid_row_count: 3,
          dense_row_count: 3,
          lexical_row_count: 2,
          error_stage: null,
          error_code: null,
          error_status: null,
        },
        cost_audit: {
          request_cost_usd: 0.0001,
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            embedding_tokens: 3,
          },
          call_counts: {
            embedding_calls: 1,
            chat_calls: 1,
          },
          models: {
            embedding_model: 'text-embedding-3-large',
            chat_model: 'qwen-plus',
          },
          price_table_version: 'rag_s1_default_pricing_v1',
        },
      },
    },
    ...overrides,
  };
}

function createFailurePayload(overrides = {}) {
  return {
    req: {
      request_id: 'req-telemetry-recorder-failure',
      headers: {},
    },
    endpoint: '/api/rag/search',
    method: 'POST',
    input: {
      query: 'Failure query',
      subject_code: '9231',
      current_topic_path: '9231.2',
      syllabus_node_id: null,
      language: 'en',
    },
    ragError: {
      status: 502,
      code: 'RAG_RETRIEVER_ERROR',
      message: 'retriever failed',
      details: null,
    },
    partialResponse: {
      answer: 'should not leak',
      evidence: [{ id: 'ev-2', snippet: 'should not leak' }],
      metrics: {
        route_audit: {
          retrieval_route: 's1_default',
          final_execution_route: 's1_default',
          route_stage: 'default_safe',
          route_reason: 'rules_negative_default_s1',
          fallback_triggered: false,
          fallback_reason: null,
          llm_classifier_used: false,
          llm_classifier_status: 'not_enabled',
          s2_hop_count: 0,
          s2_expanded_topic_count: 0,
          route_scores: {},
        },
        retrieval_audit: {
          query_mode: 'hybrid_rpc',
          chat_mode: 'not_attempted',
          rpc_call_count: 1,
          hybrid_row_count: 0,
          dense_row_count: 0,
          lexical_row_count: 0,
          error_stage: 'hybrid_rpc',
          error_code: 'RAG_RETRIEVER_RPC_ERROR',
          error_status: 502,
        },
        cost_audit: {
          request_cost_usd: 0.000003,
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            embedding_tokens: 3,
          },
          call_counts: {
            embedding_calls: 1,
            chat_calls: 0,
          },
          models: {
            embedding_model: 'text-embedding-3-large',
            chat_model: null,
          },
          price_table_version: 'rag_s1_default_pricing_v1',
        },
      },
    },
    ...overrides,
  };
}

describe('rag telemetry recorder', () => {
  it('writes append-only jsonl events under the UTC date-based telemetry path', async () => {
    const rootDir = createTempRoot();
    const now = () => new Date('2026-03-17T23:55:10.000Z');
    const sink = getRagTelemetrySink({ cwd: rootDir, now });
    const outputPath = buildRagTelemetryJsonlPath({ cwd: rootDir, now });

    expect(outputPath).toBe(
      path.join(rootDir, 'runs', 'backend', 'telemetry', 'rag_request_events_2026-03-17.jsonl'),
    );

    await recordRagTelemetrySuccess(createSuccessPayload(), { sink });
    await recordRagTelemetryFailure(createFailurePayload(), { sink });

    expect(fs.existsSync(outputPath)).toBe(true);
    const lines = fs
      .readFileSync(outputPath, 'utf8')
      .trim()
      .split('\n');

    expect(lines).toHaveLength(2);
    const firstEvent = JSON.parse(lines[0]);
    const secondEvent = JSON.parse(lines[1]);
    expect(firstEvent.request_id).toBe('req-telemetry-recorder-success');
    expect(firstEvent.success).toBe(true);
    expect(secondEvent.request_id).toBe('req-telemetry-recorder-failure');
    expect(secondEvent.success).toBe(false);
  });

  it('swallows sink failures and emits a redacted warning without payload leakage', async () => {
    const logger = jest.fn();
    const sink = {
      type: 'broken',
      async writeEvent() {
        throw new Error('sink exploded');
      },
    };

    await expect(
      recordRagTelemetrySuccess(
        createSuccessPayload({
          input: {
            query: 'LEAK_QUERY_SENTINEL',
            subject_code: '9702',
            current_topic_path: '9702.5',
            syllabus_node_id: '9702-5-1',
            language: 'en',
          },
          response: {
            ...createSuccessPayload().response,
            answer: 'LEAK_ANSWER_SENTINEL',
            evidence: [{ id: 'ev-leak', snippet: 'LEAK_SNIPPET_SENTINEL' }],
          },
        }),
        { sink, logger },
      ),
    ).resolves.toBeNull();

    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0][0]).toBe('warn');
    expect(logger.mock.calls[0][1]).toBe('rag_request_telemetry_sink_failed');
    const serializedMeta = JSON.stringify(logger.mock.calls[0][2]);
    expect(serializedMeta).not.toContain('LEAK_QUERY_SENTINEL');
    expect(serializedMeta).not.toContain('LEAK_ANSWER_SENTINEL');
    expect(serializedMeta).not.toContain('LEAK_SNIPPET_SENTINEL');
    expect(serializedMeta).not.toContain('schema_version');
  });
});
