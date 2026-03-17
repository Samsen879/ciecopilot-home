import {
  buildRagRequestTelemetryFailureEvent,
  buildRagRequestTelemetrySuccessEvent,
} from '../lib/telemetry-schema.js';

describe('rag telemetry schema', () => {
  it('builds a sanitized success event from an ask-service style payload', () => {
    const event = buildRagRequestTelemetrySuccessEvent({
      req: {
        request_id: 'req-telemetry-success-1',
        headers: {
          'x-client-session-id': 'sess-123',
          authorization: 'Bearer secret',
        },
      },
      endpoint: '/api/rag/ask',
      method: 'POST',
      input: {
        query: '  Explain the current node briefly  ',
        subject_code: '9702',
        current_topic_path: '9702.5',
        syllabus_node_id: '9702-5-1',
        language: 'en',
      },
      response: {
        request_id: 'req-telemetry-success-1',
        answer: 'answer text should never be stored',
        uncertain: false,
        uncertain_reason_code: null,
        topic_leakage_flag: false,
        topic_leakage_reason: null,
        evidence: [
          {
            id: 'ev-1',
            snippet: 'snippet should never be stored',
          },
        ],
        metrics: {
          evidence_traceability_rate: 1,
          latency_ms: 120,
          retrieval_latency_ms: 80,
          llm_latency_ms: 30,
          route_audit: {
            retrieval_route: 's2_augmentation',
            final_execution_route: 's2_augmentation',
            route_stage: 'local_classifier',
            route_reason: 'local_classifier_positive',
            fallback_triggered: false,
            fallback_reason: null,
            llm_classifier_used: false,
            llm_classifier_status: 'not_enabled',
            s2_hop_count: 1,
            s2_expanded_topic_count: 1,
            route_scores: {
              readiness_guard_reason: 'readiness_guard_ok',
              readiness_effective_depth_source: 'config_subject_override',
              production_evidence_rollout_active: true,
              production_evidence_rollout_reason: 'online_enabled_subject_match',
              production_evidence_rollout_bundle_ids: ['phase_b_pilot_ready_v1'],
              production_evidence_rollout_corpus_versions: ['rag_production_evidence_pilot_20260313'],
              production_evidence_rollout_source_types: ['evidence_authored', 'evidence_transformed'],
              s2_empty_evidence_reason: null,
              s2_allowed_topic_paths: ['9702.5', '9702'],
              s2_leakage_evaluation_mode: 'expanded_topic_allowlist',
              model_version: 'should_not_be_copied',
              s2_expanded_topic_paths: ['9702'],
            },
          },
          retrieval_audit: {
            query_mode: 's2_multi_hop',
            chat_mode: 'upstream_ok',
            rpc_call_count: 2,
            hybrid_row_count: 5,
            dense_row_count: 5,
            lexical_row_count: 3,
            error_stage: null,
            error_code: null,
            error_status: null,
          },
          cost_audit: {
            request_cost_usd: 0.000321,
            usage: {
              prompt_tokens: 120,
              completion_tokens: 80,
              embedding_tokens: 30,
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
    });

    expect(event.schema_version).toBe('rag_request_telemetry_v1');
    expect(typeof event.captured_at).toBe('string');
    expect(event.request_id).toBe('req-telemetry-success-1');
    expect(event.endpoint).toBe('/api/rag/ask');
    expect(event.method).toBe('POST');
    expect(event.success).toBe(true);
    expect(event.status_code).toBe(200);
    expect(event.rag_error_code).toBeNull();
    expect(event.failure_stage).toBeNull();
    expect(event.client_session_id).toBe('sess-123');
    expect(event.client_trace_source).toBe('x-client-session-id');
    expect(event.subject_code).toBe('9702');
    expect(event.current_topic_path).toBe('9702.5');
    expect(event.syllabus_node_id).toBe('9702-5-1');
    expect(event.language).toBe('en');
    expect(event.query_capture_mode).toBe('normalized_hash');
    expect(event.query_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(event.query_length).toBe('Explain the current node briefly'.length);
    expect(event.query_token_estimate).toBeGreaterThan(0);
    expect(event).not.toHaveProperty('query');
    expect(event).not.toHaveProperty('answer');
    expect(event).not.toHaveProperty('evidence');

    expect(event.route_score_excerpt).toEqual({
      readiness_guard_reason: 'readiness_guard_ok',
      readiness_effective_depth_source: 'config_subject_override',
      production_evidence_rollout_active: true,
      production_evidence_rollout_reason: 'online_enabled_subject_match',
      production_evidence_rollout_bundle_ids: ['phase_b_pilot_ready_v1'],
      production_evidence_rollout_corpus_versions: ['rag_production_evidence_pilot_20260313'],
      production_evidence_rollout_source_types: ['evidence_authored', 'evidence_transformed'],
      s2_empty_evidence_reason: null,
      s2_allowed_topic_paths: ['9702.5', '9702'],
      s2_leakage_evaluation_mode: 'expanded_topic_allowlist',
    });

    expect(event.retrieval_route).toBe('s2_augmentation');
    expect(event.final_execution_route).toBe('s2_augmentation');
    expect(event.fallback_reason).toBeNull();
    expect(event.query_mode).toBe('s2_multi_hop');
    expect(event.chat_mode).toBe('upstream_ok');
    expect(event.evidence_count).toBe(1);
    expect(event.evidence_traceability_rate).toBe(1);
    expect(event.retrieval_latency_ms).toBe(80);
    expect(event.llm_latency_ms).toBe(30);
    expect(event.latency_ms).toBe(120);
    expect(event.request_cost_usd).toBe(0.000321);
    expect(event.prompt_tokens).toBe(120);
    expect(event.completion_tokens).toBe(80);
    expect(event.embedding_tokens).toBe(30);
    expect(event.embedding_calls).toBe(1);
    expect(event.chat_calls).toBe(1);
    expect(event.embedding_model).toBe('text-embedding-3-large');
    expect(event.chat_model).toBe('qwen-plus');
    expect(event.price_table_version).toBe('rag_s1_default_pricing_v1');

    const sameMeaningEvent = buildRagRequestTelemetrySuccessEvent({
      req: { request_id: 'req-telemetry-success-2', headers: {} },
      endpoint: '/api/rag/ask',
      method: 'POST',
      input: {
        query: 'explain the current node briefly',
        subject_code: '9702',
        current_topic_path: '9702.5',
        syllabus_node_id: '9702-5-1',
        language: 'en',
      },
      response: {
        request_id: 'req-telemetry-success-2',
        uncertain: false,
        uncertain_reason_code: null,
        topic_leakage_flag: false,
        topic_leakage_reason: null,
        evidence: [],
        metrics: {
          evidence_traceability_rate: 1,
          latency_ms: 10,
          retrieval_latency_ms: 10,
          llm_latency_ms: 0,
          route_audit: {},
          retrieval_audit: {},
          cost_audit: {},
        },
      },
    });

    expect(sameMeaningEvent.query_hash).toBe(event.query_hash);
    expect(sameMeaningEvent.client_session_id).toBeNull();
    expect(sameMeaningEvent.client_trace_source).toBeNull();
  });

  it('builds a sanitized failure event from a rag error and partial response', () => {
    const event = buildRagRequestTelemetryFailureEvent({
      req: {
        request_id: 'req-telemetry-failure-1',
        headers: {
          'x-trace-id': 'trace-123',
        },
      },
      endpoint: '/api/rag/search',
      method: 'POST',
      input: {
        query: 'Find support for this topic',
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
        answer: 'should_not_leak',
        evidence: [{ id: 'ev-2', snippet: 'should_not_leak' }],
        metrics: {
          route_audit: {
            retrieval_route: 's1_default',
            final_execution_route: 's1_default',
            route_stage: 'default_safe',
            route_reason: 'rules_negative_default_s1',
            fallback_triggered: true,
            fallback_reason: 'S2_EMPTY_EVIDENCE',
            llm_classifier_used: false,
            llm_classifier_status: 'not_enabled',
            s2_hop_count: 0,
            s2_expanded_topic_count: 0,
            route_scores: {
              readiness_guard_reason: 'subject_not_covered',
              readiness_effective_depth_source: 'config_global_default',
              production_evidence_rollout_active: false,
              production_evidence_rollout_reason: 'no_subject_match',
              production_evidence_rollout_bundle_ids: [],
              production_evidence_rollout_corpus_versions: [],
              production_evidence_rollout_source_types: [],
              s2_empty_evidence_reason: 'seed_empty_and_expansion_empty',
              s2_allowed_topic_paths: ['9231.2'],
              s2_leakage_evaluation_mode: 'expanded_topic_allowlist',
            },
          },
          retrieval_audit: {
            query_mode: 'hybrid_rpc_s2_fallback',
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
              embedding_tokens: 30,
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
    });

    expect(event.success).toBe(false);
    expect(event.status_code).toBe(502);
    expect(event.rag_error_code).toBe('RAG_RETRIEVER_ERROR');
    expect(event.failure_stage).toBe('hybrid_rpc');
    expect(event.client_session_id).toBe('trace-123');
    expect(event.client_trace_source).toBe('x-trace-id');
    expect(event.endpoint).toBe('/api/rag/search');
    expect(event.retrieval_route).toBe('s1_default');
    expect(event.final_execution_route).toBe('s1_default');
    expect(event.fallback_reason).toBe('S2_EMPTY_EVIDENCE');
    expect(event.error_stage).toBe('hybrid_rpc');
    expect(event.error_code).toBe('RAG_RETRIEVER_RPC_ERROR');
    expect(event.error_status).toBe(502);
    expect(event.prompt_tokens).toBe(0);
    expect(event.completion_tokens).toBe(0);
    expect(event.embedding_tokens).toBe(30);
    expect(event).not.toHaveProperty('query');
    expect(event).not.toHaveProperty('answer');
    expect(event).not.toHaveProperty('evidence');
  });
});
