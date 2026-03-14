# Phase B Production Evidence Gates Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal executable `production_evidence` control chain: whitelist, release gate, and ingest preflight.

**Architecture:** Keep Phase B independent from S2 checkpoints. Add one checked-in whitelist file plus three small validators/runners that consume the existing production-evidence manifest contract. The current seed bundle must validate successfully while still being blocked from ingest because it is governance-only.

**Tech Stack:** Node.js ESM, Jest, JSON manifests, Markdown reports, existing `scripts/rag/*` governance utilities

---

## Chunk 1: Whitelist Contract

### Task 1: Add whitelist tests and implementation

**Files:**
- Create: `scripts/rag/lib/production-evidence-whitelist.js`
- Create: `scripts/rag/__tests__/production-evidence-whitelist.test.js`
- Create: `data/evidence/production/whitelist_v1.json`

- [ ] **Step 1: Write the failing test**

Add Jest coverage for:
- a valid whitelist entry matching the seed bundle passes
- missing or mismatched `bundle_id` / `manifest_path` fails
- whitelist cannot enable `ingest_allowed = true` for the current governance seed
- whitelist cannot expand `allowed_source_types` beyond the manifest contract

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-whitelist.test.js`
Expected: FAIL because the whitelist helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a whitelist helper that:
- validates whitelist identity fields
- matches a manifest to a whitelist entry
- checks subject scope and source-type consistency
- exposes rollout posture (`release_channel`, `ingest_allowed`, `release_ready_expected`)

Add a checked-in whitelist with the current seed bundle marked as governance-only.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-whitelist.test.js`
Expected: PASS

## Chunk 2: Release Gate

### Task 2: Add release gate tests and implementation

**Files:**
- Create: `scripts/rag/lib/production-evidence-release-gate.js`
- Create: `scripts/rag/run_production_evidence_whitelist_check.js`
- Create: `scripts/rag/run_production_evidence_release_gate.js`
- Create: `scripts/rag/__tests__/production-evidence-release-gate.test.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- a governance-valid whitelist-matched seed bundle yields `status = pass` and `release_ready = false`
- a bundle with a broken whitelist match fails
- a bundle with an invalid manifest fails
- release gate output includes blocked reasons when rollout posture forbids release

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-release-gate.test.js`
Expected: FAIL because the release gate helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create helpers/runners that:
- reuse the manifest validator
- reuse the whitelist helper
- emit JSON and Markdown artifacts
- separate gate execution status from `release_ready`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-release-gate.test.js`
Expected: PASS

## Chunk 3: Ingest Preflight

### Task 3: Add ingest preflight tests and implementation

**Files:**
- Create: `scripts/rag/lib/production-evidence-ingest-preflight.js`
- Create: `scripts/rag/run_production_evidence_ingest_preflight.js`
- Create: `scripts/rag/__tests__/production-evidence-ingest-preflight.test.js`
- Modify: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- the current governance seed is blocked from ingest
- a non-whitelisted manifest is blocked
- a whitelist-matched but non-release-ready bundle is blocked
- ingest preflight can report why it blocked without mutating any ingest path

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-ingest-preflight.test.js`
Expected: FAIL because the ingest preflight helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a preflight helper/runner that:
- consumes manifest + whitelist + release gate
- blocks closed when ingest is not permitted
- writes JSON and Markdown artifacts
- exits nonzero only when called as an ingest blocker and the bundle is not permitted

Update the existing runbook with:
- whitelist command
- release gate command
- ingest preflight command
- explanation that the current seed should validate but still be blocked from ingest

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-ingest-preflight.test.js`
Expected: PASS

## Chunk 4: Focused Verification

### Task 4: Run the Phase B gate chain end-to-end

**Files:**
- Output: `runs/backend/rag_phase_b_production_evidence_whitelist_check.json`
- Output: `docs/reports/rag_phase_b_production_evidence_whitelist_check.md`
- Output: `runs/backend/rag_phase_b_production_evidence_release_gate.json`
- Output: `docs/reports/rag_phase_b_production_evidence_release_gate.md`
- Output: `runs/backend/rag_phase_b_production_evidence_ingest_preflight.json`
- Output: `docs/reports/rag_phase_b_production_evidence_ingest_preflight.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-manifest.test.js scripts/rag/__tests__/production-evidence-whitelist.test.js scripts/rag/__tests__/production-evidence-release-gate.test.js scripts/rag/__tests__/production-evidence-ingest-preflight.test.js
```

Expected: PASS

- [ ] **Step 2: Run whitelist check**

Run:

```bash
node scripts/rag/run_production_evidence_whitelist_check.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_whitelist_check.json --out-md docs/reports/rag_phase_b_production_evidence_whitelist_check.md
```

Expected: PASS with a matched governance-only whitelist entry.

- [ ] **Step 3: Run release gate**

Run:

```bash
node scripts/rag/run_production_evidence_release_gate.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_release_gate.json --out-md docs/reports/rag_phase_b_production_evidence_release_gate.md
```

Expected: PASS with `release_ready = false`.

- [ ] **Step 4: Run ingest preflight**

Run:

```bash
node scripts/rag/run_production_evidence_ingest_preflight.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_ingest_preflight.json --out-md docs/reports/rag_phase_b_production_evidence_ingest_preflight.md
```

Expected: nonzero exit or blocked status because the current seed is intentionally not ingest-allowed.

## Execution Notes

- Do not touch `supabase/migrations/*.sql`.
- Do not wire `production_evidence` into live retrieval in this slice.
- Do not modify frontend code.
- Do not convert the governance seed into a production-ready bundle.
- Keep `note_md` / `data-notes` excluded from active evidence and provenance origins.
