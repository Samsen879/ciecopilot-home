# RAG S2 Release Decision Report

- Generated at: `2026-06-04T14:38:30.510Z`
- Decision: `stay_advisory_only`
- Release mode: `advisory_only`
- Effective default production route: `b_simplified_retrieval_s1_v1`
- Advisory candidate ready: `false`
- Default-route promotion ready: `false`
- Safe hold ready: `true`
- Safe to merge governance patch: `true`
- Legacy release posture: `hold_s2_keep_s1_default`

## Blocker Categories

- release_evidence
- runtime_budget
- s2_advisory_readiness

## Concrete Blockers

- [release_evidence] release_eval_summary_not_pass: release eval summary status must be pass, got fail
- [runtime_budget] s2_timeout_present: S2_TIMEOUT fallback occurred 18 time(s)
- [s2_advisory_readiness] fallback_rate_above_threshold: fallback_rate must be <= 0.2, got 0.296875
- [s2_advisory_readiness] target_slice_quality_non_positive: target_slice_quality_vs_s1 must be > 0, got -0.101409

## Input Evidence

- advisory_gate: `runs/backend/rag_s2_advisory_gate_summary.json`
- s1_contract_gate: `runs/backend/rag_s1_contract_gate_summary.json`
- s1_metric_gate: `runs/backend/rag_s1_metric_gate_summary.json`
- workflow_invariant: `runs/backend/rag_s2_workflow_invariant_check.json`

