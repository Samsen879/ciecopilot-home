# Phase B Production Evidence Gates Design

Date: 2026-03-13
Scope: backend RAG only
Status: approved-by-user-direction

## Goal

Extend the Phase B governance skeleton into a minimal executable control path:

- a checked-in whitelist
- a release gate status artifact
- an ingest preflight that blocks non-whitelisted or non-release-ready bundles

This slice still does not build a writer, does not modify live retrieval, and does not change database schema.

## Context

The first Phase B slice already created:

- the `production_evidence` source policy
- the manifest validator
- a tiny governance seed bundle
- a runbook for the layer

What is still missing is the operational control path that answers:

1. which bundles are even eligible to be considered
2. which bundles are governance-valid but still not release-ready
3. what should happen before any future ingest is attempted

## Approaches Considered

### Option A: Independent Phase B Gate Chain

Create a dedicated `production_evidence` whitelist, release gate, and ingest preflight without touching existing S2 C4 release checkpoints.

Pros:

- clean separation from S2
- no overlap with the separate S2 polish thread
- matches the current reality that `production_evidence` is still offline

Cons:

- introduces a new small gate chain
- later integration into broader release reporting will still be needed

### Option B: Bolt Phase B Into Existing S2 C4

Inject `production_evidence` checks into `run_s2_c4_release_checkpoint.js`.

Pros:

- fewer scripts
- central release narrative

Cons:

- wrong abstraction boundary right now
- couples offline Phase B governance to S2 advisory routing
- increases conflict risk with the parallel S2 polish work

### Option C: Ingest-Only Guard

Skip whitelist/release status and add only a preflight blocker in front of future ingest.

Pros:

- minimum code

Cons:

- weak traceability
- no checked-in approval source of truth
- no artifact that distinguishes "valid but not release-ready" from "invalid"

## Recommended Design

Choose Option A.

The minimal control chain should be:

1. `whitelist` says which bundle ids / manifest paths are recognized and what their intended rollout posture is
2. `release gate` says whether a recognized bundle is governance-valid and release-ready
3. `ingest preflight` blocks any bundle that is not both whitelisted and explicitly ingest-allowed

This keeps Phase B self-contained and avoids polluting the S2 release checkpoints.

## Contracts

### 1. Production Evidence Whitelist

Add a checked-in whitelist file under `data/evidence/production/`.

The whitelist must declare:

- `manifest_role = production_evidence_whitelist`
- `evidence_layer = production_evidence`
- `policy_mode = production_evidence`
- version metadata
- top-level `allowed_bundle_ids`
- top-level `allowed_manifest_paths`
- top-level `allowed_source_types`
- top-level `reserved_source_types`
- `required_restricted_official_posture = internal_context_only`
- entries keyed by `bundle_id`
- `manifest_path`
- `subject_scope` and `subject_codes`
- `allowed_source_types`
- `release_channel`
- `ingest_allowed`
- `release_ready_expected`

The v1 seed bundle should be present in the whitelist, but marked:

- `release_channel = offline_governance_only`
- `ingest_allowed = false`
- `release_ready_expected = false`

This is intentional. The seed proves the gate chain works, not that the bundle is ready for serving.

### 2. Release Gate

Add a dedicated release gate runner for `production_evidence`.

The release gate should combine:

- manifest validation
- whitelist match
- source-type stability
- restricted-official posture
- rollout posture from the whitelist

The release gate must distinguish:

- `status = pass/fail` for whether the gate itself executed and validated the bundle contract
- `release_ready = true/false` for whether the bundle is actually ready for later rollout

For the current seed bundle, the correct result is:

- `status = pass`
- `release_ready = false`

### 3. Ingest Preflight

Add a dedicated ingest preflight runner for `production_evidence`.

This preflight should consume:

- the manifest
- the whitelist
- the release gate result

The preflight must fail closed when:

- the bundle is not on the whitelist
- the bundle is whitelist-listed but `ingest_allowed = false`
- the release gate says `release_ready = false`

For the current seed bundle, the correct result is:

- contract validation succeeds
- ingest preflight blocks the bundle

That blocked result is a success condition for the guardrail.

## File Strategy

Add new focused units instead of mutating large existing files:

- `scripts/rag/lib/production-evidence-whitelist.js`
- `scripts/rag/lib/production-evidence-release-gate.js`
- `scripts/rag/lib/production-evidence-ingest-preflight.js`
- `scripts/rag/run_production_evidence_whitelist_check.js`
- `scripts/rag/run_production_evidence_release_gate.js`
- `scripts/rag/run_production_evidence_ingest_preflight.js`
- `scripts/rag/__tests__/*`
- `data/evidence/production/whitelist_v1.json`

Extend the existing runbook instead of creating a second Phase B governance narrative.

## Non-Goals

- no live retrieval integration
- no production evidence writer
- no `supabase/migrations/*.sql` changes
- no frontend work
- no relabeling of `restricted_official` as public production evidence
- no admission of `note_md` / `data-notes`
