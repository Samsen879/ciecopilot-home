# RAG Single-Track Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove obsolete RAG runtime/tooling/doc paths so the repository exposes one active backend RAG track only: `api/rag` plus the current `scripts/rag` canonical/chunks/S2 toolchain.

**Architecture:** Execute cleanup in an isolated worktree on top of `codex/rag-s2-next`. Remove one obsolete file group at a time, fix active references immediately, and run targeted verification after each group so the current RAG runtime remains intact. Preserve current schema history; do not turn this cleanup into a database rebaseline.

**Tech Stack:** Node.js, Jest, Express-style API handlers, Supabase SQL migrations, PowerShell, ripgrep.

---

## Chunk 1: Runtime Track Removal

### Task 1: Delete obsolete runtime surfaces and tests

**Files:**
- Delete: `apps/api-node/api/rag/index.js`
- Delete: `apps/api-node/api/rag/chat-v2.js`
- Delete or hard-disable: `api/ai/tutor/chat.js`
- Delete: `apps/api-node/api/tests/syllabus-boundary-api-contract.test.js`
- Delete: `apps/api-node/api/tests/syllabus-boundary-leakage.test.js`
- Delete: `apps/api-node/api/tests/syllabus-boundary-rpc.test.js`
- Review for deletion: `apps/api-node/api/services/syllabusSearch.js`
- Modify: `api/_runtime/route-registry.js`
- Modify: `docs/setup/README_API.md`
- Verify references: repository-wide grep for `apps/api-node/api/rag`, `chat-v2`, `/api/rag/chat-v2`, `/api/ai/tutor/chat`

- [ ] **Step 1: Confirm active runtime ownership before deletion**

Run:
```powershell
rg -n "apps/api-node/api/rag|chat-v2|/api/rag/chat-v2|/api/ai/tutor/chat|ai-tutor" -S .
Get-Content api/index.js -TotalCount 120
Get-Content api/_runtime/route-registry.js -TotalCount 220
```

Expected:
- `api/index.js` and `api/_runtime/route-registry.js` show current runtime is `api/rag/**`
- hits under `apps/api-node/api/rag/**` and related tests/docs are legacy-only

- [ ] **Step 2: Remove obsolete runtime files and legacy boundary tests**

Delete only the files listed above, plus `apps/api-node/api/services/syllabusSearch.js` if no remaining active references exist after Step 1. Remove the `/api/ai/tutor/chat` route from the active registry so `/api/routes` no longer exposes it.

- [ ] **Step 3: Rewrite active API documentation**

Update `docs/setup/README_API.md` so it no longer:
- advertises historical compatibility runtime under `apps/api-node/api`
- references `/api/rag/chat-v2`
- references `/api/ai/tutor/chat` as part of the active RAG surface
- presents old migration ordering as the active setup path if it is no longer current

- [ ] **Step 4: Run targeted runtime verification**

Run:
```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js api/rag/__tests__/ask-service.test.js api/rag/__tests__/boundary.contract.test.js --runInBand
```

Expected:
- Jest exits `0`
- active `api/rag` runtime tests still pass

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "refactor: remove obsolete express rag runtime"
```

## Chunk 2: Legacy Table / Bridge Tooling Removal

### Task 2: Delete obsolete legacy-table and bridge cleanup scripts

**Files:**
- Delete: `scripts/check-rag-status.js`
- Delete: `scripts/rag/backfill_legacy_rag_to_chunks.js`
- Delete: `scripts/rag/run_legacy_route_governance.js`
- Delete: `scripts/rag/run_corpus_unification_preflight.js`
- Delete: `scripts/rag/run_corpus_reconciliation.js`
- Delete: `scripts/rag/run_corpus_chain_inventory.js`
- Delete: `scripts/rag/lib/corpus-reconciliation.js`
- Delete: `scripts/rag/lib/corpus-unification.js`
- Delete: `scripts/rag/__tests__/corpus-reconciliation.test.js`
- Delete: `scripts/rag/__tests__/corpus-unification.test.js`
- Modify: `scripts/rag_ingest.js`
- Modify if needed: docs or helper scripts that reference the removed files

- [ ] **Step 1: Prove these scripts are legacy-only**

Run:
```powershell
rg -n "run_legacy_route_governance|run_corpus_unification_preflight|run_corpus_reconciliation|run_corpus_chain_inventory|backfill_legacy_rag_to_chunks|check-rag-status|corpus-reconciliation|corpus-unification" -S .
```

Expected:
- hits are limited to legacy governance/reporting/doc references
- active `api/rag/**` runtime does not import these files
- `scripts/rag_ingest.js` is identified as active and therefore must be simplified, not deleted

- [ ] **Step 2: Remove the legacy-table tooling and their direct tests**

Delete the files listed above.

- [ ] **Step 3: Simplify active ingest entrypoint to canonical-only**

Update `scripts/rag_ingest.js` so active commands no longer expose `legacy` or `bridge` write modes.

Requirements:
- canonical mode remains supported
- removed modes fail fast with a clear error if explicitly requested
- package scripts still point to the retained ingest entrypoint

- [ ] **Step 4: Clean remaining references**

Update or delete docs/report pointers that still present these scripts as required active tooling.

- [ ] **Step 5: Run targeted current-tooling verification**

Run:
```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js scripts/rag/__tests__/corpus-schema-compat.test.js scripts/rag/__tests__/canonical-chunks.test.js scripts/rag/__tests__/s2-augmentation-eval.test.js --runInBand
```

Expected:
- Jest exits `0`
- current canonical/chunks/S2 script chain still passes

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "refactor: remove legacy rag bridge tooling"
```

## Chunk 3: Active Documentation and Command Surface Cleanup

### Task 3: Make current docs and commands single-track only

**Files:**
- Modify: `docs/setup/README_API.md`
- Modify: `docs/DATABASE_MIGRATION_GUIDE.md`
- Modify: any current doc under `docs/` that still instructs engineers to use removed runtime or removed `rag_*` governance scripts
- Review: `package.json`
- Review: active helper scripts under `scripts/` for references to removed files

- [ ] **Step 1: Find all remaining references to removed paths**

Run:
```powershell
rg -n "apps/api-node/api/rag|chat-v2|/api/ai/tutor/chat|rag_documents|rag_chunks|rag_embeddings|run_legacy_route_governance|run_corpus_unification_preflight|run_corpus_reconciliation|run_corpus_chain_inventory|check-rag-status" -S docs package.json scripts api src
```

Expected:
- remaining hits are limited and actionable

- [ ] **Step 2: Rewrite docs to state one active RAG track**

Ensure current docs consistently say:
- active runtime is `api/index.js` + `api/rag/**`
- current backend RAG data path is canonical/chunks + `hybrid_search_v2`
- `/api/ai/tutor/chat` is no longer part of the active RAG surface
- removed legacy runtime/tooling are not part of active setup

- [ ] **Step 3: Keep migration history, but remove misleading setup guidance**

Do not delete foundational migration history in this task.
Do update docs so engineers are not told to bootstrap the old `rag_documents/rag_chunks/rag_embeddings` chain as the active path.

- [ ] **Step 4: Run repository consistency grep**

Run:
```powershell
rg -n "apps/api-node/api/rag|/api/rag/chat-v2|/api/ai/tutor/chat|run_legacy_route_governance|run_corpus_unification_preflight|run_corpus_reconciliation|run_corpus_chain_inventory|check-rag-status" -S .
```

Expected:
- no hits in active code/docs outside historical reports/specs/plans

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "docs: collapse rag guidance to single active track"
```

## Chunk 4: Final Verification and Cleanup Review

### Task 4: Verify active RAG path still works after cleanup

**Files:**
- Verify only; no new files required unless a final report note is needed

- [ ] **Step 1: Run active RAG API regression suite**

Run:
```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js api/rag/__tests__/ask-service.test.js api/rag/__tests__/answer-policy.test.js api/rag/__tests__/boundary.contract.test.js api/rag/__tests__/s2-multi-hop-retriever.test.js --runInBand
```

Expected:
- Jest exits `0`

- [ ] **Step 2: Run current RAG script regression suite**

Run:
```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js scripts/rag/__tests__/canonical-chunks.test.js scripts/rag/__tests__/corpus-schema-compat.test.js scripts/rag/__tests__/question-aware-chunker.test.js scripts/rag/__tests__/s2-augmentation-eval.test.js --runInBand
```

Expected:
- Jest exits `0`

- [ ] **Step 3: Confirm deleted files stay gone and no active references remain**

Run:
```powershell
git status --short
rg -n "apps/api-node/api/rag|/api/rag/chat-v2|rag_documents|rag_chunks|rag_embeddings|run_legacy_route_governance|run_corpus_unification_preflight|run_corpus_reconciliation|run_corpus_chain_inventory|check-rag-status" -S api apps scripts docs src package.json
```

Expected:
- deleted files are absent
- any remaining `rag_documents/rag_chunks/rag_embeddings` hits are either active canonical writer internals that still legitimately bridge old tables, or historical migration files kept intentionally
- no removed runtime/tooling is still advertised as active

- [ ] **Step 4: Request code review**

Review scope:
- all commits on `codex/rag-single-track-cleanup`
- focus on accidental deletion of active RAG runtime/support files

- [ ] **Step 5: Final commit if review fixes were needed**

```powershell
git add -A
git commit -m "chore: finalize rag single-track cleanup"
```
