# Phase B Production Evidence Status And Preflight Design

Date: 2026-03-13
Scope: backend RAG only
Status: approved-by-user-direction

## Goal

Attach the existing Phase B gate chain to the next higher layer with two new outputs:

- a consolidated `governance status` artifact for top-level reporting
- a unified `governance preflight` entrypoint for future ingest callers

This slice still remains offline and does not wire `production_evidence` into live retrieval.

## Context

Phase B already has four lower-level artifacts:

- manifest check
- whitelist check
- release gate
- ingest preflight

Those artifacts already prove the seed bundle is governance-valid but not rollout-ready:

- whitelist passes
- release gate passes
- `release_ready = false`
- ingest preflight blocks the bundle

What is still missing is an upper layer that:

1. summarizes the whole governance state in one place
2. gives future ingest entrypoints a single hook to call

## Approaches Considered

### Option A: Summary Only

Add only a top-level summary artifact and leave callers to invoke lower gates individually.

Pros:

- smallest code change

Cons:

- future ingest callers still need to know the internal gate chain

### Option B: Unified Preflight Only

Add only one umbrella preflight runner and skip a separate summary artifact.

Pros:

- simplest future hook for callers

Cons:

- weak top-level traceability
- no single report that says governance-valid vs release-ready vs ingest-permitted

### Option C: Summary + Unified Preflight

Add both:

- `governance status` for top-level reporting
- `governance preflight` for future ingest callers

Pros:

- clean separation of read-model vs gate hook
- summary can feed future release reporting
- preflight can become the future mandatory ingest hook

Cons:

- two small new runners instead of one

## Recommended Design

Choose Option C.

This is the smallest complete upper-layer attachment that preserves current boundaries.

## Design

### 1. Governance Status

Add a dedicated top-level status runner that reads the lower artifacts and produces:

- `governance_valid`
- `release_ready`
- `ingest_permitted`

The runner should also report:

- required artifact presence
- bundle ids covered
- blocked reasons inherited from release gate / ingest preflight

For the current seed bundle, the correct result is:

- `governance_valid = true`
- `release_ready = false`
- `ingest_permitted = false`
- overall status should still be `pass`, because the governance chain is behaving correctly

### 2. Unified Governance Preflight

Add one umbrella preflight runner for future callers.

The runner should:

- load the bundle manifest and items
- load the whitelist
- run manifest validation
- run whitelist validation
- run release gate evaluation
- run ingest preflight evaluation
- emit one JSON artifact and one Markdown report

This runner is the future ingest hook shape. It should fail closed when `ingest_permitted = false`.

For the current seed bundle:

- governance preflight should execute successfully
- governance preflight should return nonzero because ingest remains blocked

### 3. Integration Boundary

Do not attach this slice to `run_s2_c4_release_checkpoint.js`.

`production_evidence` is still an offline backend governance layer, not an S2 routing release concern.

The correct upper-layer attachment here is:

- Phase B top-level summary artifact
- Phase B top-level unified preflight hook

## File Strategy

Add focused files:

- `scripts/rag/lib/production-evidence-governance-status.js`
- `scripts/rag/run_production_evidence_governance_status.js`
- `scripts/rag/run_production_evidence_governance_preflight.js`
- `scripts/rag/__tests__/production-evidence-governance-status.test.js`
- `scripts/rag/__tests__/production-evidence-governance-preflight.test.js`

Reuse existing lower-level helpers instead of duplicating validation logic.

## Non-Goals

- no live retrieval integration
- no DB writes
- no `supabase/migrations/*.sql`
- no frontend
- no conversion of the governance seed into a release-ready bundle
