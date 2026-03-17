# RAG Request Telemetry Audit

- total_requests: `8`
- success_count: `7`
- failure_count: `1`

## Route Share

- retrieval_routes: `s2_augmentation: 5, s1_default: 3`
- final_execution_routes: `s2_augmentation: 1, s1_default: 7`
- s2_fallback_count: `4`

## Fallback Reasons

- S2_EMPTY_EVIDENCE: 2
- S2_TIMEOUT: 2

## Knowledge-Hole Groups

- 9231 9231.2 /api/rag/ask: 2 events, zero_hit=2, low_hit=0, uncertain=2
- 9231 9231.3 /api/rag/search: 1 events, zero_hit=1, low_hit=0, uncertain=1
- 9702 9702.6 /api/rag/ask: 1 events, zero_hit=0, low_hit=1, uncertain=0
- 9702 9702.6 /api/rag/search: 1 events, zero_hit=0, low_hit=1, uncertain=0
- 9702 9702.7 /api/rag/ask: 1 events, zero_hit=0, low_hit=1, uncertain=1

## Latency And Cost

- latency_ms: `p50=130, p90=220, p99=220`
- retrieval_latency_ms: `p50=90, p90=210, p99=210`
- llm_latency_ms: `p50=0, p90=40, p99=40`
- mean_request_cost_usd: `0.000071`
- highest_cost_route_bucket: `s2_augmentation`
- highest_latency_route_bucket: `s2_augmentation`

## Rollout Exposure

- active_count: `2`
- by_subject: `9231: 1, 9702: 1`
- phase_b_pilot_ready_9231_v1: 1
- phase_b_pilot_ready_v1: 1

## Top Recommended Actions

1. [runtime_budget] Repeated S2 timeouts are concentrating on 9702 9702.6. target=9702 9702.6
2. [evidence_gap] Repeated empty-evidence fallbacks suggest a real evidence gap for 9231 9231.2. target=9231 9231.2
3. [benchmark_followup] Retriever transport failures are visible for 9231 9231.3. target=9231 9231.3
