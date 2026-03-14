# Phase B Production Evidence Governance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first offline governance skeleton for the `production_evidence` layer without mixing it with `restricted_official`.

**Architecture:** Reuse the existing source-policy / coverage / inventory posture machinery instead of creating a parallel framework. First add a new `production_evidence` policy contract with explicit enabled vs allowed vs reserved source types. Then add a dedicated manifest schema, validator, and tiny seed bundle so the governance path is testable before any future live ingest work. The validator must also enforce provenance-origin boundaries so `restricted_official` can appear only as provenance context and `note_md` / `data-notes` cannot be relabeled as transformed evidence.

**Tech Stack:** Node.js ESM, Jest, JSON manifests, Markdown reports, existing `scripts/rag/*` governance utilities

---

## Chunk 1: Source Policy Contract

### Task 1: Add failing tests for the new production_evidence policy

**Files:**
- Create: `scripts/rag/__tests__/source-policy.test.js`
- Modify: `scripts/rag/lib/source-policy.js`
- Test: `scripts/rag/__tests__/source-policy.test.js`

- [ ] **Step 1: Write the failing test**

Add Jest coverage for:
- `resolveSourcePolicy('production_evidence')` returns a distinct policy mode
- enabled source types are exactly `evidence_authored` and `evidence_transformed`
- reserved source type metadata includes `evidence_reserved`
- official PDF types and `note_md` are not allowed in the new mode

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/source-policy.test.js`
Expected: FAIL because `production_evidence` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Update `scripts/rag/lib/source-policy.js` to:
- add `production_evidence` mode
- expose `enabled_source_types` and `reserved_source_types`
- keep `allowed_source_types` limited to the enabled set
- add notes that the reserved slot is declared but inactive in v1

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/source-policy.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/rag/lib/source-policy.js scripts/rag/__tests__/source-policy.test.js
git commit -m "feat: add production evidence source policy"
```

## Chunk 2: Manifest Schema And Validator

### Task 2: Add failing tests for production evidence manifest validation

**Files:**
- Create: `scripts/rag/__tests__/production-evidence-manifest.test.js`
- Create: `scripts/rag/lib/production-evidence-manifest.js`
- Create: `docs/schemas/rag_production_evidence_manifest.schema.json`
- Create: `scripts/rag/run_production_evidence_manifest_check.js`
- Test: `scripts/rag/__tests__/production-evidence-manifest.test.js`

- [ ] **Step 1: Write the failing test**

Add coverage for:
- valid manifest with `evidence_authored` / `evidence_transformed` passes
- manifest using `note_md` fails
- manifest using `past_paper_pdf` or `mark_scheme_pdf` fails
- manifest that activates `evidence_reserved` fails
- manifest that activates `evidence_reserved` through `enabled_source_types` or `allowed_source_types` fails
- transformed item that references `note_md` / `data-notes` in provenance fails
- transformed item that uses official refs as `active_evidence` instead of `provenance_context` fails
- manifest with missing `items_file`, wrong `bundle_item_count`, or missing `restricted_official_posture` fails
- manifest with inconsistent subject scope fails

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-manifest.test.js`
Expected: FAIL because the validator helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/rag/lib/production-evidence-manifest.js` with helpers to:
- normalize source types
- validate declared / enabled / allowed / reserved source type metadata
- validate item-level source types and provenance
- validate manifest-to-items linkage via `items_file` and `bundle_item_count`
- validate transformed provenance refs so only official PDF refs may appear, and only with `usage = provenance_context`
- summarize manifest scope for audit output

Add `docs/schemas/rag_production_evidence_manifest.schema.json` as the checked-in schema reference.

Add `scripts/rag/run_production_evidence_manifest_check.js` to:
- read a manifest
- require `items_file` to resolve successfully when declared
- run validation
- write JSON and Markdown audit artifacts

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scripts/rag/__tests__/production-evidence-manifest.test.js`
Expected: PASS

- [ ] **Step 5: Run targeted governance regression**

Run: `npm test -- scripts/rag/__tests__/source-policy.test.js scripts/rag/__tests__/production-evidence-manifest.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/rag/lib/production-evidence-manifest.js scripts/rag/run_production_evidence_manifest_check.js docs/schemas/rag_production_evidence_manifest.schema.json scripts/rag/__tests__/production-evidence-manifest.test.js
git commit -m "feat: add production evidence manifest validator"
```

## Chunk 3: Seed Bundle And Runbook

### Task 3: Add a tiny governance seed and runbook

**Files:**
- Create: `data/evidence/production/seed_v1/manifest.json`
- Create: `data/evidence/production/seed_v1/items.json`
- Create: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`
- Test: `scripts/rag/run_production_evidence_manifest_check.js`

- [ ] **Step 1: Write the failing test**

Extend the manifest validator test or add file-based assertions that the checked-in seed bundle:
- loads successfully
- uses only enabled source types
- declares the reserved slot but does not activate it

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/rag/__tests__/production-evidence-manifest.test.js`
Expected: FAIL because the seed bundle does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a tiny seed bundle with:
- `manifest.json`
- `items.json`

The seed must:
- be explicitly labeled as governance validation data
- keep official PDF refs in provenance only, never as active item `source_type`
- avoid `note_md`
- avoid `src/data/data-notes` as provenance origin
- stay small and non-authoritative

Write a runbook that explains:
- layer boundaries
- source types
- manifest-to-items linkage and required posture fields
- provenance contract for authored vs transformed items
- reserved slot behavior
- validation command
- explicit non-goals

- [ ] **Step 4: Run validator on the seed**

Run:

```bash
node scripts/rag/run_production_evidence_manifest_check.js --manifest data/evidence/production/seed_v1/manifest.json --out-json runs/backend/rag_phase_b_production_evidence_seed_check.json --out-md docs/reports/rag_phase_b_production_evidence_seed_check.md
```

Expected: PASS with zero invalid items and zero active reserved source types.

- [ ] **Step 5: Run final focused verification**

Run:

```bash
npm test -- scripts/rag/__tests__/source-policy.test.js scripts/rag/__tests__/production-evidence-manifest.test.js
node scripts/rag/run_production_evidence_manifest_check.js --manifest data/evidence/production/seed_v1/manifest.json --out-json runs/backend/rag_phase_b_production_evidence_seed_check.json --out-md docs/reports/rag_phase_b_production_evidence_seed_check.md
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add data/evidence/production/seed_v1/manifest.json data/evidence/production/seed_v1/items.json docs/reports/rag_phase_b_production_evidence_runbook_20260313.md runs/backend/rag_phase_b_production_evidence_seed_check.json docs/reports/rag_phase_b_production_evidence_seed_check.md
git commit -m "feat: add phase b production evidence governance seed"
```

## Execution Notes

- Do not modify `supabase/migrations/*.sql`.
- Do not wire `production_evidence` into live retrieval in this slice.
- Do not label `restricted_official` as a public production corpus.
- Do not allow `note_md` or `data-notes` into the new layer.
- Keep the reserved slot declared but inactive.
