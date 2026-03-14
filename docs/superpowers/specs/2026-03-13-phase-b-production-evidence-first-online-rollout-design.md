# Phase B Production Evidence First Online Rollout Design

Date: 2026-03-13
Scope: backend RAG only
Status: implemented
Worktree: `codex-rag-route-a`

## Goal

Run the first real online rollout for `production_evidence` by promoting exactly one ready bundle for exactly one subject:

- subject: `9702`
- bundle: `phase_b_pilot_ready_v1`
- corpus version: `rag_production_evidence_pilot_20260313`

This slice is not about broad activation. It is about proving that the explicit rollout gate can safely promote one narrow target into online retrieval while preserving clean rollback, subject isolation, and fail-closed behavior.

## Locked Context

- This rollout must be designed and executed in `codex-rag-route-a`, not `codex-rag-snapshot-integration`.
- The latest rollout runtime, rollout gate validator, checked-in `rollout_gate_v1.json`, checked-in `whitelist_v1.json`, and the fail-closed review fixes all live in `codex-rag-route-a`.
- `Phase A` cross-subject backend replication is complete for `9702 / 9231`.
- `9709` is the original S2 victory line, not a separate `Phase A` cross-subject replication target.
- `Phase B` governance, ready-ingest pilot, live write, post-write audit, and explicit rollout gate infrastructure are already complete.
- Current checked-in rollout gate state in `codex-rag-route-a` is:
  - `bundle_id = phase_b_pilot_ready_v1`
  - `subject_codes = ["9702"]`
  - `rollout_state = online_enabled`
  - `corpus_versions = ["rag_production_evidence_pilot_20260313"]`
  - `allowed_source_types = ["evidence_authored", "evidence_transformed"]`

That means this slice should change checked-in release state and prove behavior on top of the latest fail-closed gate implementation. It must not be planned against an older snapshot worktree.

## Why This Rollout Is The Right Next Step

The current backend stack has already proven five things:

- the pilot bundle is governance-valid
- the pilot bundle is release-ready
- the pilot bundle is ingestable
- the pilot bundle has already been written to `public.chunks`
- the runtime gate can keep promoted evidence offline by default

The missing proof is controlled online retrieval behavior after checked-in promotion.

If this slice is skipped, Phase B remains “governed and ingested, but not yet behaviorally proven in online retrieval”.

## Rollout Shape

The rollout is intentionally minimal:

- only one entry in `data/evidence/production/rollout_gate_v1.json` changes
- only `9702` is promoted
- only the single approved production evidence corpus version is re-added
- only `evidence_authored` and `evidence_transformed` are unblocked
- `evidence_reserved` stays blocked even after promotion
- all other subjects remain blocked
- `9231` remains the control subject

This is a subject-scoped release, not a layer-wide release.

## Runtime Behavior After Promotion

Once the `9702` entry is changed to `online_enabled`, request-time retrieval should behave as follows:

- `9702` requests with baseline `RAG_CORPUS_VERSIONS` configured should:
  - merge `rag_production_evidence_pilot_20260313` into `p_corpus_versions`
  - remove `evidence_authored` / `evidence_transformed` from the per-request exclusion list
  - keep `evidence_reserved` blocked
- non-`9702` requests should remain blocked
- if rollout enforcement is disabled, the gate is bypassed exactly as configured today
- if the gate file is missing or baseline corpus preconditions are not met, runtime still fails closed

This behavior must hold for both retrieval entry paths:

- `S1` path via `runS1Retrieval`
- `S2` path via `s2Retriever` retrieval config

## Verification Strategy

This rollout must create fixed-path evidence for five claims:

1. `9702` is now online-enabled in the checked-in gate
2. `9231` remains offline
3. promoted requests still keep `evidence_reserved` blocked
4. both `S1` and `S2` retrieval paths honor the promoted rollout contract
5. rollback is still one gate edit away

The minimum verification set is:

- updated rollout gate contract test against the checked-in promoted state
- runtime resolver test that proves promoted state still excludes `evidence_reserved`
- focused `ask-service` verification for promoted `9702` on the `S1` path
- focused `ask-service` verification for promoted `9702` on the `S2` path
- focused `ask-service` verification for non-target `9231`
- fixed-path rollout gate artifact after promotion
- fixed-path focused rollout verification artifact after promotion
- runbook update that records the promoted state and rollback method

## Artifacts To Produce

This slice should generate these fixed-path artifacts:

- [rag_phase_b_production_evidence_rollout_gate.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/runs/backend/rag_phase_b_production_evidence_rollout_gate.json)
- [rag_phase_b_production_evidence_rollout_gate.md](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/docs/reports/rag_phase_b_production_evidence_rollout_gate.md)
- [rag_phase_b_first_online_rollout_9702.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/runs/backend/rag_phase_b_first_online_rollout_9702.json)
- [rag_phase_b_first_online_rollout_9702.md](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/docs/reports/rag_phase_b_first_online_rollout_9702.md)

The focused rollout artifact must explicitly record:

- target subject `9702` promoted
- control subject `9231` blocked
- `evidence_reserved` still blocked
- `S1` and `S2` promotion checks both passed

## Rollback

Rollback must remain trivial:

- change `rollout_state` from `online_enabled` back to `offline_default`
- regenerate the rollout gate artifact
- regenerate the focused rollout verification artifact
- confirm `9702` returns to blocked status

No schema rollback, no ingest rollback, and no corpus rewrite should be required.

## Non-Goals

- no frontend integration
- no `supabase/migrations/*.sql` changes
- no new production evidence bundle authoring
- no `9231` rollout in the same slice
- no benchmark protocol redesign
- no router/guard retuning unless verification proves a new bottleneck
