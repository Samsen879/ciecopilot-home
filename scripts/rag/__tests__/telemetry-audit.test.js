import path from 'node:path';
import {
  buildRagRequestTelemetryAudit,
  loadRagRequestTelemetryEvents,
} from '../lib/telemetry_audit.js';

const FIXTURE_PATH = path.join(
  process.cwd(),
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'telemetry',
  'rag_request_events_fixture.jsonl',
);

describe('rag telemetry audit', () => {
  it('aggregates traffic mix, route mix, clusters, rollout exposure, and recommended actions', () => {
    const events = loadRagRequestTelemetryEvents([FIXTURE_PATH]);
    const summary = buildRagRequestTelemetryAudit({ events, lowRetrievalThreshold: 1 });

    expect(events).toHaveLength(8);
    expect(summary.traffic_mix.total_requests).toBe(8);
    expect(summary.traffic_mix.success_count).toBe(7);
    expect(summary.traffic_mix.failure_count).toBe(1);
    expect(summary.traffic_mix.endpoint_counts).toEqual({
      '/api/rag/ask': 6,
      '/api/rag/search': 2,
    });
    expect(summary.traffic_mix.subject_counts).toEqual({
      '9702': 4,
      '9231': 4,
    });

    expect(summary.route_mix.retrieval_route_counts).toEqual({
      s2_augmentation: 5,
      s1_default: 3,
    });
    expect(summary.route_mix.final_execution_route_counts).toEqual({
      s2_augmentation: 1,
      s1_default: 7,
    });
    expect(summary.route_mix.s2_fallback_count).toBe(4);

    expect(summary.fallback_clusters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'S2_TIMEOUT', count: 2 }),
        expect.objectContaining({ reason: 'S2_EMPTY_EVIDENCE', count: 2 }),
      ]),
    );
    expect(summary.error_clusters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RAG_RETRIEVER_RPC_ERROR', count: 1 }),
      ]),
    );
    expect(summary.failure_stage_clusters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'hybrid_rpc', count: 1 }),
      ]),
    );

    expect(summary.knowledge_hole_groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject_code: '9231',
          current_topic_path: '9231.2',
          endpoint: '/api/rag/ask',
          event_count: 2,
          zero_hit_count: 2,
          uncertain_count: 2,
        }),
      ]),
    );

    expect(summary.latency_cost.latency_ms).toEqual({ p50: 130, p90: 220, p99: 220 });
    expect(summary.latency_cost.retrieval_latency_ms).toEqual({ p50: 90, p90: 210, p99: 210 });
    expect(summary.latency_cost.llm_latency_ms).toEqual({ p50: 0, p90: 40, p99: 40 });
    expect(summary.latency_cost.highest_cost_route_bucket.route).toBe('s2_augmentation');
    expect(summary.latency_cost.highest_latency_route_bucket.route).toBe('s2_augmentation');

    expect(summary.rollout_exposure.active_count).toBe(2);
    expect(summary.rollout_exposure.by_subject).toEqual({
      '9702': 1,
      '9231': 1,
    });
    expect(summary.rollout_exposure.bundle_ids).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'phase_b_pilot_ready_v1', count: 1 }),
        expect.objectContaining({ value: 'phase_b_pilot_ready_9231_v1', count: 1 }),
      ]),
    );

    expect(summary.repeat_friction_sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          client_session_id: 'sess-repeat-1',
          repeated_fallback_count: 2,
        }),
      ]),
    );

    expect(summary.recommended_actions[0]).toMatchObject({
      action_type: 'runtime_budget',
      target_subject: '9702',
      target_topic_path: '9702.6',
      suggested_owner_surface: 'api/rag',
    });
    expect(summary.recommended_actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action_type: 'evidence_gap',
          target_subject: '9231',
          target_topic_path: '9231.2',
        }),
      ]),
    );
  });
});
