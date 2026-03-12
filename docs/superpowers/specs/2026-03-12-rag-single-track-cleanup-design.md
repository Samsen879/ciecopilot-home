# RAG Single-Track Cleanup Design

**Date:** 2026-03-12

## Goal

Collapse the repository to a single active RAG backend track: the current `api/rag` runtime plus the current `scripts/rag` canonical/chunks/S2 toolchain. Remove obsolete runtime code, legacy-table governance scripts, and misleading documentation that keep the repository in a dual-track state.

## Scope

This cleanup will keep:

- `api/index.js`
- `api/rag/**`
- the RAG internals still used by active routes after cleanup
- the current `scripts/rag/**` path that supports canonical chunks, `hybrid_search_v2`, S1/S2 evaluation, corpus coverage, and current ingestion
- `scripts/rag_ingest.js`, but only after simplifying it to canonical-only behavior
- current schema history required by the active canonical/chunks search path

This cleanup will remove:

- obsolete RAG runtime under `apps/api-node/api/rag/**`
- obsolete tutor compatibility runtime under `api/ai/tutor/chat.js`
- obsolete operational scripts that still target `rag_documents`, `rag_chunks`, and `rag_embeddings`
- obsolete tests that only validate removed runtime behavior
- misleading docs that present old endpoints, old runtime, or old table chains as active

This cleanup will not:

- redesign the current RAG architecture
- rebaseline all database migrations into a new squashed history
- change frontend integration beyond removing references to deleted legacy endpoints

## Problem Statement

The repository currently carries two parallel RAG stories:

1. The active gateway/runtime in `api/` using `api/rag/**`.
2. A historical Express-based RAG implementation under `apps/api-node/api/rag/**`.

There is also a lingering compatibility route under `api/ai/tutor/chat.js` that still serves legacy RAG behavior and prevents the repository from having one clean runtime story.

There is a similar split in tooling:

1. Current canonical/chunks/S2 scripts under `scripts/rag/**`.
2. Legacy-table and bridge/audit scripts still centered on `rag_documents`, `rag_chunks`, and `rag_embeddings`.

This creates three risks:

- engineers can modify or validate the wrong path
- docs and checks can report stale or contradictory status
- future changes keep paying compatibility tax for code we no longer intend to run

## Recommended Approach

Use a mainline-only cleanup with historical schema retention.

Why this approach:

- It removes the operational dual-track problem immediately.
- It avoids the much riskier step of deleting foundational migration history in the same change.
- It still leaves a future path open for a dedicated schema rebaseline if we want one later.

## File Groups

### Group A: Remove Obsolete Runtime

Delete the legacy RAG runtime tree under `apps/api-node/api/rag/**`.
Retire the compatibility tutor route under `api/ai/tutor/chat.js`.

Expected result:

- only `api/rag/**` remains as the active RAG backend runtime surface
- the repository no longer carries two runnable RAG server implementations

### Group B: Remove Legacy-Table / Bridge Tooling

Delete scripts whose purpose is to inspect, govern, reconcile, or preflight the old `rag_*` table chain rather than the active canonical/chunks path.

Examples already identified:

- `scripts/check-rag-status.js`
- `scripts/rag/run_legacy_route_governance.js`
- `scripts/rag/run_corpus_unification_preflight.js`
- `scripts/rag/run_corpus_reconciliation.js`
- `scripts/rag/run_corpus_chain_inventory.js`
- `scripts/rag/lib/corpus-reconciliation.js`
- `scripts/rag/lib/corpus-unification.js`

Potentially remove or simplify additional files only if their primary purpose is legacy bridge analysis rather than active runtime support.

In addition, simplify `scripts/rag_ingest.js` so the active ingestion entrypoint no longer exposes `legacy` or `bridge` write modes.

Expected result:

- tooling surface reflects a single canonical/chunks-based chain

### Group C: Remove Obsolete Tests

Delete tests that only exercise removed runtime or removed bridge tooling.

Keep tests for:

- `api/rag/**`
- current `scripts/rag/**`
- current `hybrid_search_v2` compatibility checks needed by the active chain

Expected result:

- test suite no longer preserves removed code as an implicit contract

### Group D: Rewrite Active Documentation

Update docs so they describe one active RAG path only.

Expected result:

- no doc points engineers toward `apps/api-node/api/rag/**`
- no doc presents `rag_documents/rag_chunks/rag_embeddings` as the active search chain
- `/api/routes` no longer exposes `/api/ai/tutor/chat`

## Migration Policy

Do not mass-delete foundational migration history in this cleanup.

Instead:

- keep migration files that define or evolve the currently active canonical/chunks search path
- only remove migration files if they are clearly duplicate, dead, and not part of current environment bootstrap expectations

Rationale:

- deleting runtime dual-track is a code cleanup
- deleting broad migration history is a database-history rebaseline
- combining both in one change unnecessarily increases rollback risk

## Verification Plan

Run verification after each deletion group, not only at the end.

Minimum checks:

- targeted Jest tests for `api/rag/**`
- targeted Jest tests for current `scripts/rag/**`
- route sanity for `api/index.js` and route registry
- documentation grep to confirm deleted runtime paths are no longer presented as active

Final check:

- `rg` no longer finds active references to removed runtime/doc/script paths except in intentional historical reports or archive notes

## Rollback Strategy

This work is isolated in a dedicated worktree/branch.

If a deletion group breaks the active chain:

- revert the last deletion group only
- keep the rest of the cleanup intact
- re-run the minimal verification set before proceeding

## Success Criteria

The cleanup is successful when all of the following are true:

- `api/rag/**` is the only active RAG runtime path in the repository
- obsolete `apps/api-node/api/rag/**` code is gone
- obsolete `api/ai/tutor/chat.js` compatibility route is gone or hard-disabled
- obsolete legacy-table governance scripts are gone
- `scripts/rag_ingest.js` no longer offers legacy/bridge write modes
- active docs describe only the current runtime and current data chain
- the current backend RAG tests still pass
- no active command, doc, or check encourages engineers to use removed legacy paths
