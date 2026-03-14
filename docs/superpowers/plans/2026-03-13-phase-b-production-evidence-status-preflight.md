# Phase B Production Evidence Status And Preflight Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first upper-layer Phase B attachment: a governance status summary plus a unified governance preflight hook.

**Architecture:** Reuse the existing manifest / whitelist / release-gate / ingest-preflight chain instead of introducing another parallel validator. One new summary runner will read lower artifacts and summarize governance-valid vs release-ready vs ingest-permitted. One new unified preflight runner will call the lower chain directly and act as the future ingest hook.

**Tech Stack:** Node.js ESM, Jest, JSON governance artifacts, Markdown reports, existing `scripts/rag/*` gate helpers

---

## Chunk 1: Governance Status Summary

### Task 1: Add status summary tests and implementation

**Files:**
- Create: `scripts/rag/lib/production-evidence-governance-status.js`
- Create: `scripts/rag/__tests__/production-evidence-governance-status.test.js`
- Create: `scripts/rag/run_production_evidence_governance_status.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- governance-valid but non-release-ready seed yields `status=pass`, `governance_valid=true`, `release_ready=false`, `ingest_permitted=false`
- missing required lower artifacts fails
- failed release gate or invalid whitelist causes `governance_valid=false`

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-governance-status.test.js`
Expected: FAIL because the status helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a status helper/runner that:
- reads lower artifact payloads
- checks required artifact presence
- summarizes `governance_valid`, `release_ready`, and `ingest_permitted`
- writes JSON and Markdown outputs

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-governance-status.test.js`
Expected: PASS

## Chunk 2: Unified Governance Preflight

### Task 2: Add governance preflight tests and implementation

**Files:**
- Create: `scripts/rag/__tests__/production-evidence-governance-preflight.test.js`
- Create: `scripts/rag/run_production_evidence_governance_preflight.js`
- Modify: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- governance preflight reports the full lower chain and blocks the current seed
- governance preflight fails when whitelist validation fails
- governance preflight fails when manifest validation fails

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-governance-preflight.test.js`
Expected: FAIL because the unified preflight runner does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a runner that:
- loads manifest + items + whitelist
- evaluates manifest validation, whitelist validation, release gate, and ingest preflight
- writes JSON and Markdown outputs
- exits nonzero when `ingest_permitted=false`

Update the runbook with:
- governance status command
- unified governance preflight command
- expected current-seed behavior

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-governance-preflight.test.js`
Expected: PASS

## Chunk 3: Focused Verification

### Task 3: Run the upper-layer chain end-to-end

**Files:**
- Output: `runs/backend/rag_phase_b_production_evidence_governance_status.json`
- Output: `docs/reports/rag_phase_b_production_evidence_governance_status.md`
- Output: `runs/backend/rag_phase_b_production_evidence_governance_preflight.json`
- Output: `docs/reports/rag_phase_b_production_evidence_governance_preflight.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-governance-status.test.js scripts/rag/__tests__/production-evidence-governance-preflight.test.js scripts/rag/__tests__/production-evidence-whitelist.test.js scripts/rag/__tests__/production-evidence-release-gate.test.js scripts/rag/__tests__/production-evidence-ingest-preflight.test.js scripts/rag/__tests__/production-evidence-manifest.test.js
```

Expected: PASS

- [ ] **Step 2: Regenerate lower artifacts**

Run:

```bash
node scripts/rag/run_production_evidence_manifest_check.js --manifest data/evidence/production/seed_v1/manifest.json --out-json runs/backend/rag_phase_b_production_evidence_seed_check.json --out-md docs/reports/rag_phase_b_production_evidence_seed_check.md
node scripts/rag/run_production_evidence_whitelist_check.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_whitelist_check.json --out-md docs/reports/rag_phase_b_production_evidence_whitelist_check.md
node scripts/rag/run_production_evidence_release_gate.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_release_gate.json --out-md docs/reports/rag_phase_b_production_evidence_release_gate.md
node scripts/rag/run_production_evidence_ingest_preflight.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_ingest_preflight.json --out-md docs/reports/rag_phase_b_production_evidence_ingest_preflight.md
```

Expected: lower chain stays consistent.

- [ ] **Step 3: Run governance status**

Run:

```bash
node scripts/rag/run_production_evidence_governance_status.js
```

Expected: PASS with `governance_valid=true`, `release_ready=false`, `ingest_permitted=false`.

- [ ] **Step 4: Run unified governance preflight**

Run:

```bash
node scripts/rag/run_production_evidence_governance_preflight.js --manifest data/evidence/production/seed_v1/manifest.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_governance_preflight.json --out-md docs/reports/rag_phase_b_production_evidence_governance_preflight.md
```

Expected: nonzero exit because the current seed is intentionally blocked from ingest, but artifact contents remain correct.

## Execution Notes

- Do not touch `supabase/migrations/*.sql`.
- Do not wire `production_evidence` into live retrieval.
- Keep `restricted_official` and `production_evidence` separate.
- Keep `note_md` / `data-notes` out of active evidence and provenance origins.
