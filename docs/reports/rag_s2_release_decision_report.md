# RAG S2 Release Decision Report

- Generated at: `2026-03-28T18:25:58.730Z`
- Decision: `stay_advisory_only`
- Release mode: `advisory_only`
- Effective default production route: `b_simplified_retrieval_s1_v1`
- Advisory candidate ready: `false`
- Default-route promotion ready: `false`
- Legacy release posture: `hold_s2_keep_s1_default`

## Blocker Categories

- release_evidence
- release_policy

## Concrete Blockers

- [release_evidence] release_eval_summary_missing: release eval summary missing
- [release_policy] s2_advisory_workflow_missing: the S2 advisory workflow file is missing, so the non-blocking release contract cannot be verified
- [release_policy] s2_advisory_workflow_not_non_blocking: the S2 advisory workflow no longer proves a non-blocking advisory-only release posture

## Input Evidence

- advisory_gate: `runs/backend/rag_s2_advisory_gate_summary.json`
- s1_contract_gate: `runs/backend/rag_s1_contract_gate_summary.json`
- s1_metric_gate: `runs/backend/rag_s1_metric_gate_summary.json`
- workflow_invariant: `runs/backend/rag_s2_workflow_invariant_check.json`

