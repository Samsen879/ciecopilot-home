# Phase B Production Evidence Rollout Observability And Rollback Design

Date: 2026-03-14
Scope: backend RAG only
Status: proposed
Worktree: `codex-rag-route-a`

## Goal

Turn the current `9702` first online rollout into an observable, auditable, and reversible backend-controlled release slice, while defining a reusable contract for future subject or bundle rollouts.

This slice is not about adding new evidence bundles or expanding frontend exposure.
It is about answering four backend questions with fixed-path evidence:

- what rollout is currently online
- whether runtime behavior still matches the rollout contract
- whether rollback is currently required
- how future rollouts will reuse the same control plane

## Locked Context

- `9702` is already online-enabled for `phase_b_pilot_ready_v1`, and the checked-in gate currently reflects that state.
- The current focused verification artifact already proves:
  - target subject `9702` promoted
  - control subject `9231` blocked
  - `evidence_reserved` blocked
  - `S1` and `S2` checks passing
  - rollback remains one gate edit away
- These claims are fixed in:
  - [rag_phase_b_production_evidence_rollout_gate.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/runs/backend/rag_phase_b_production_evidence_rollout_gate.json)
  - [rag_phase_b_first_online_rollout_9702.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/runs/backend/rag_phase_b_first_online_rollout_9702.json)
  - [rag_phase_b_production_evidence_runbook_20260313.md](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/docs/reports/rag_phase_b_production_evidence_runbook_20260313.md)
- Current backend runtime already emits rollout-related audit fields through `ask-service`, but this slice has not yet packaged them into a durable rollout-status operator surface.
- Review also found one small gap in the current slice: the first-online-rollout verification helper has library tests, but not CLI-level tests.

## Why This Is The Right Next Step

The current rollout line has crossed from “offline-ready” into “checked-in online-enabled”.
That changes the right backend question.

The key question is no longer “can we promote one bundle?”.
It is now:

- can we prove the active rollout still conforms to contract
- can we surface that state with stable artifacts
- can we decide, with stable backend policy, whether rollback is required

Without this slice, the project would have an online-enabled rollout but no clean backend control-plane layer for observing and governing it.

## Scope Boundary

This slice stays strictly inside backend RAG:

- fixed-path artifacts
- runtime audit contract
- rollback policy evaluation
- runbook updates
- CLI coverage for the new observability surface

This slice explicitly does not include:

- frontend status display
- external alerting or pager integration
- automatic rollback execution
- new evidence authoring
- new subject rollout activation
- `supabase/migrations/*.sql`

Rollback remains a manual operator action, but this slice should make the decision boundary explicit and reproducible.

## Recommended Approach

Use the current `9702` rollout as the only active real instance, but design the observability and rollback layer as a generic rollout-control template.

That means:

- current artifacts must name and validate the live `9702` rollout
- new status contract must be generic enough to support future online entries without redesign
- this slice should implement single-active-rollout correctness first
- future multi-entry support in this slice only needs schema compatibility and non-crashing aggregation
- this slice should not hardcode the assumption that only one rollout will exist forever

This is the same hybrid pattern used successfully in the previous rollout step: one narrow active case, one reusable backend contract.

## Design Overview

The slice adds two backend surfaces plus one test/coverage cleanup:

1. `rollout status` artifact
2. `runtime audit contract` verification
3. `CLI coverage` for the existing first-online-rollout verification command

The first is the operator-facing report surface.
The second is the runtime evidence layer that the report surface depends on.
The third closes the current verification gap before additional release-control logic is stacked on top.

## Surface 1: Rollout Status Artifact

Add a new generic status builder and CLI that answer:

- which rollout entries are currently online
- which verification artifacts back those entries
- whether target/control/reserved-path checks are currently passing
- whether the current rollout set is observationally healthy
- whether rollback is currently required
- if rollback is required, why and what manual operator action is recommended

Expected fixed-path outputs:

- `runs/backend/rag_phase_b_production_evidence_rollout_status.json`
- `docs/reports/rag_phase_b_production_evidence_rollout_status.md`

Default input paths for this slice should be explicit:

- `runs/backend/rag_phase_b_production_evidence_rollout_gate.json`
- `runs/backend/rag_phase_b_first_online_rollout_9702.json`

This slice must not attempt to auto-discover per-entry verification artifacts from the rollout-gate artifact.
Instead, the status runner should use an explicit verification-artifact input list.
For the current checked-in state, that list has one default member: `rag_phase_b_first_online_rollout_9702.json`.
If a future online entry has no explicit verification-artifact mapping, the status surface must mark that as unsafe rather than guessing.

For the current single-rollout state, the status artifact should summarize:

- online bundle ids
- online subject codes
- online corpus versions
- focused verification artifact path
- target promoted status
- control blocked status
- reserved blocked status
- `S1` and `S2` pass status
- runtime audit-contract pass status
- overall rollout health status
- `rollback_required`
- `rollback_reasons`
- `recommended_action`

For future rollout states, the same contract should allow multiple online entries and multiple per-rollout verification records, but this slice only needs to guarantee:

- single online entry is fully evaluated and correct
- multiple online entries do not crash aggregation
- unsupported multi-entry detail is reported as explicit unmapped / unsupported status
- an online entry without explicit verification-artifact mapping forces `rollback_required = true`

The rollback decision should be policy-based, not log-noise-based.
For this slice, rollback should be required when any of the following are false for an online rollout:

- gate contract is valid
- target rollout is still active
- control subject still blocked
- `evidence_reserved` still blocked
- `S1` check passes
- `S2` check passes

The artifact should also expose:

This is a backend decision field set inside the status artifact, not a second public surface.

The post-rollback steady state must also be explicit.
When rollback has already been completed and there are no online entries:

- `rollout_healthy = true`
- `rollback_required = false`
- `rollback_reasons = []`
- `recommended_action = "hold_offline"`

This is not an error condition. It is the expected safe offline state after a completed manual rollback.

## Surface 2: Runtime Audit Contract

This slice should make the runtime observability contract explicit and tested.

The requirement is not “invent new logging everywhere”.
The requirement is:

- confirm that `route_audit.route_scores` carries the rollout-relevant fields for promoted and control paths
- keep those fields stable enough for future operational inspection

This slice should not change the top-level `rag_ask_completed` logger schema.
If completion-log schema expansion is ever desired, that should be handled in a separate slice.

The minimum runtime contract for promoted traffic should cover:

- rollout active flag
- rollout reason
- rollout bundle ids
- rollout corpus versions
- rollout source types
- final execution route
- query mode

The minimum runtime contract for control traffic should prove the inverse:

- rollout active false
- no promoted bundle ids
- production evidence remains blocked

This should be verified by tests against `route_audit.route_scores`, not by introducing an external log sink.
Its durable fixed-path evidence in this slice should be emitted as a `runtime_audit_contract` section inside the rollout-status artifact, rather than as a separate public artifact surface.

## Surface 3: CLI Coverage Cleanup

The current focused verification helper already exists, but its CLI wrapper still lacks dedicated coverage.

This slice should add a CLI-level test for:

- default output path behavior
- explicit output path behavior
- path resolution behavior
- nonzero exit on failed payload status

This is required because the new rollout-status CLI will follow the same pattern.

## Artifact Topology

After this slice, the rollout backend control chain should look like this:

1. checked-in rollout gate contract
2. focused rollout verification artifact
3. rollout status artifact
4. runbook operator guidance

For the current active rollout, the evidence chain should be:

- [rollout_gate_v1.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/data/evidence/production/rollout_gate_v1.json)
- [rag_phase_b_production_evidence_rollout_gate.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/runs/backend/rag_phase_b_production_evidence_rollout_gate.json)
- [rag_phase_b_first_online_rollout_9702.json](C:/Users/Samsen/cie-copilot/.worktrees/codex-rag-route-a/runs/backend/rag_phase_b_first_online_rollout_9702.json)
- `rag_phase_b_production_evidence_rollout_status.json`

## Testing Strategy

This slice should be implemented with the following test layers:

- unit tests for the new rollout-status lib
- CLI tests for:
  - existing `run_production_evidence_first_online_rollout_verification.js`
  - new rollout-status CLI
- `ask-service` audit-contract tests for:
  - promoted `9702` path
  - control `9231` path
  - single-active-rollout fields correct
  - multiple-online-entry aggregation does not crash and remains explicitly limited

The fresh verification matrix should include:

- existing rollout tests
- new status tests
- new CLI tests
- regeneration of the new status artifact plus existing focused rollout artifacts

## Non-Goals

- no frontend exposure
- no external alerting integration
- no automatic rollback execution
- no new bundle promotion
- no `9231` activation in this slice
- no new ingest work
- no benchmark redesign
