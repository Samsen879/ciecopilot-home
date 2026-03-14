# Phase B Production Evidence Ready-Ingest Pilot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that one real `production_evidence` pilot bundle can pass the full gate chain, write canonical chunk rows into Supabase, and remain out of live retrieval by default.

**Architecture:** Keep the governance seed unchanged and add one separate ready-for-ingest pilot bundle. Reuse the existing manifest / whitelist / release-gate / governance-preflight chain, then add one dedicated `production_evidence` ingest runner and one post-write audit runner that both operate on the canonical chunk path. Retrieval remains isolated because API retrieval now defaults to excluding `production_evidence` source types unless explicitly cleared.

**Tech Stack:** Node.js ESM, Jest, JSON manifests, Markdown reports, existing Supabase service client, existing canonical chunk helpers

---

**Status:** Implemented and validated on `2026-03-13`. The TDD steps below are retained as the execution record; the expected-fail lines describe the original red phase, not the current repo state.

## Chunk 1: Real Pilot Bundle And Ready-For-Ingest Gate Contract

### Task 1 (completed): Add tests for a real pilot bundle that is allowed to become ingestable

**Files:**
- Create: `scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js`
- Create: `data/evidence/production/pilot_ready_v1/manifest.json`
- Create: `data/evidence/production/pilot_ready_v1/items.json`
- Modify: `data/evidence/production/whitelist_v1.json`
- Modify: `scripts/rag/__tests__/helpers/production-evidence-fixtures.js`
- Modify: `scripts/rag/lib/production-evidence-release-gate.js`
- Modify: `scripts/rag/lib/production-evidence-governance-preflight.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- the governance seed remains `offline_governance_only` and not ingestable
- a new real pilot whitelist entry with `ready_for_ingest` can produce `release_ready = true`
- unified governance preflight returns `ingest_permitted = true` for the new pilot
- transformed pilot items still reject `note_md`, `data-notes`, and active official PDFs

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js`
Observed during red phase: FAIL because the repo did not yet contain a ready-for-ingest pilot contract.

- [ ] **Step 3: Write minimal implementation**

Create a new real pilot bundle:
- single-subject
- `5-20` items
- mixed authored and transformed evidence
- all items `review.status = approved`

Extend the whitelist with one new pilot entry:
- `release_channel = ready_for_ingest`
- `ingest_allowed = true`
- `release_ready_expected = true`

Adjust release-gate / unified-preflight logic only as needed so the ready pilot can become green without weakening the governance seed guardrail.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js scripts/rag/__tests__/production-evidence-release-gate.test.js scripts/rag/__tests__/production-evidence-governance-preflight.test.js scripts/rag/__tests__/production-evidence-manifest.test.js scripts/rag/__tests__/production-evidence-whitelist.test.js`
Expected: PASS

## Chunk 2: Dedicated Production Evidence Ingest Runner

### Task 2 (completed): Add dry-run-first ingest tests and implementation

**Files:**
- Create: `scripts/rag/lib/production-evidence-ingest.js`
- Create: `scripts/rag/run_production_evidence_ingest.js`
- Create: `scripts/rag/__tests__/production-evidence-ingest.test.js`
- Reuse: `scripts/rag/lib/canonical-chunks.js`
- Reuse: `api/lib/supabase/client.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- ingest aborts when unified governance preflight is not fully green
- dry-run builds deterministic canonical rows from pilot bundle items
- one pilot item with multiple `topic_paths` expands into one row per topic path
- `source_ref` includes stable pilot metadata (`bundle_id`, `evidence_id`, `topic_path`, provenance method)
- live mode refuses to run without required service credentials
- live mode does not require `OPENAI_API_KEY`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-ingest.test.js`
Observed during red phase: FAIL because the dedicated ingest writer did not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a dedicated ingest helper/runner that:
- loads manifest + items + whitelist
- runs unified governance preflight first
- aborts unless `governance_valid = true`, `release_ready = true`, `ingest_permitted = true`
- expands items into canonical rows
- supports `--dry-run`
- in live mode writes through the existing `upsertCanonicalChunk` + `getServiceClient` path
- emits JSON and Markdown artifacts

Keep this path isolated from generic `rag_ingest.js` note/pdf flows.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-ingest.test.js`
Expected: PASS

## Chunk 3: Post-Write Audit

### Task 3 (completed): Add write-audit tests and implementation

**Files:**
- Create: `scripts/rag/lib/production-evidence-post-write-audit.js`
- Create: `scripts/rag/run_production_evidence_post_write_audit.js`
- Create: `scripts/rag/__tests__/production-evidence-post-write-audit.test.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- audit summarizes attempted / inserted / updated / skipped rows
- audit can verify readback rows against expected `source_type`, `source_ref`, `topic_path`, and `corpus_version`
- audit fails when any returned row does not match the pilot summary

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-post-write-audit.test.js`
Observed during red phase: FAIL because the audit helper did not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create an audit helper/runner that:
- consumes ingest summary output
- records row counts and returned chunk ids
- optionally re-queries inserted rows by id
- emits JSON and Markdown outputs
- fails when readback does not match the expected pilot rows

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-post-write-audit.test.js`
Expected: PASS

## Chunk 4: Focused Dry-Run And Live Verification

### Task 4 (completed): Run the ready-ingest pilot end to end

**Files:**
- Output: `runs/backend/rag_phase_b_production_evidence_ready_pilot_gate.json`
- Output: `runs/backend/rag_phase_b_production_evidence_ready_pilot_dry_run.json`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_dry_run.md`
- Output: `runs/backend/rag_phase_b_production_evidence_ready_pilot_live_write.json`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_live_write.md`
- Output: `runs/backend/rag_phase_b_production_evidence_ready_pilot_post_write_audit.json`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_post_write_audit.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-ready-ingest-contract.test.js scripts/rag/__tests__/production-evidence-ingest.test.js scripts/rag/__tests__/production-evidence-post-write-audit.test.js scripts/rag/__tests__/production-evidence-governance-preflight.test.js scripts/rag/__tests__/production-evidence-release-gate.test.js scripts/rag/__tests__/production-evidence-manifest.test.js scripts/rag/__tests__/production-evidence-whitelist.test.js
```

Expected: PASS

- [ ] **Step 2: Re-run governance preflight for the new pilot**

Run:

```bash
node scripts/rag/run_production_evidence_governance_preflight.js --manifest data/evidence/production/pilot_ready_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_ready_pilot_gate.json --out-md docs/reports/rag_phase_b_production_evidence_ready_pilot_gate.md
```

Expected: exit code `0`, `governance_valid = true`, `release_ready = true`, `ingest_permitted = true`

- [ ] **Step 3: Run dry-run ingest**

Run:

```bash
node scripts/rag/run_production_evidence_ingest.js --manifest data/evidence/production/pilot_ready_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --corpus-version rag_production_evidence_pilot_20260313 --dry-run --out-json runs/backend/rag_phase_b_production_evidence_ready_pilot_dry_run.json --out-md docs/reports/rag_phase_b_production_evidence_ready_pilot_dry_run.md
```

Expected: exit code `0`, deterministic canonical rows reported, no DB write attempted

- [ ] **Step 4: Run live ingest**

Run:

```bash
node scripts/rag/run_production_evidence_ingest.js --manifest data/evidence/production/pilot_ready_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --corpus-version rag_production_evidence_pilot_20260313 --out-json runs/backend/rag_phase_b_production_evidence_ready_pilot_live_write.json --out-md docs/reports/rag_phase_b_production_evidence_ready_pilot_live_write.md
```

Expected: exit code `0`, rows inserted or updated through the canonical chunk path

- [ ] **Step 5: Run post-write audit**

Run:

```bash
node scripts/rag/run_production_evidence_post_write_audit.js --ingest-json runs/backend/rag_phase_b_production_evidence_ready_pilot_live_write.json --out-json runs/backend/rag_phase_b_production_evidence_ready_pilot_post_write_audit.json --out-md docs/reports/rag_phase_b_production_evidence_ready_pilot_post_write_audit.md
```

Expected: exit code `0`, readback matches the pilot rows that were written

## Chunk 5: Runbook And Boundary Documentation

### Task 5 (completed): Update docs for the first real pilot

**Files:**
- Modify: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_gate.md`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_dry_run.md`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_live_write.md`
- Output: `docs/reports/rag_phase_b_production_evidence_ready_pilot_post_write_audit.md`

- [ ] **Step 1: Document the real-pilot commands**

Add runbook coverage for:
- ready pilot manifest path
- ready pilot whitelist posture
- dry-run command
- live write command
- post-write audit command

- [ ] **Step 2: Document the boundary**

State explicitly:
- Supabase write success does not automatically mean retrieval activation
- `restricted_official` stays separate
- `note_md` / `data-notes` remain excluded
- no `supabase/migrations/*.sql` changes are part of this slice

- [ ] **Step 3: Re-read docs for consistency**

Check that the runbook and pilot artifacts tell one consistent story:
- seed remains blocked
- pilot becomes ready-for-ingest
- live retrieval remains out of scope because retrieval-side exclusion stays enabled by default

## Execution Notes

- Do not touch `supabase/migrations/*.sql`.
- Do not activate the pilot in live retrieval in the same change; keep retrieval-side exclusion enabled by default.
- Do not convert the governance seed into the real pilot bundle.
- Do not make `OPENAI_API_KEY` mandatory.
- Keep `restricted_official` provenance-only inside transformed evidence.
- Keep `note_md` / `data-notes` out of active evidence and provenance origins.
