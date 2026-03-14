# Phase B Production Evidence Rollout Observability And Rollback Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend-only rollout observability layer that reports current rollout health, explicit rollback requirements, stable runtime audit fields, and CLI-level verification coverage for the existing `9702` online rollout.

**Architecture:** Reuse the current checked-in rollout gate artifact plus an explicit verification-artifact input list, with the current default pointing at the focused `9702` rollout verification artifact. Build one merged `rollout status` surface on top, embed runtime-audit-contract results inside that status payload, keep observability scoped to `route_audit.route_scores` rather than the production completion-log schema, and explicitly treat unmapped future online entries as unsafe.

**Tech Stack:** Node.js, Jest, checked-in JSON artifacts, existing `production_evidence` lib/CLI pattern, existing `ask-service` route audit contract

---

## Chunk 1: Coverage Floor For The Existing First-Online-Rollout Surface

### Task 1: Tighten the existing first-online-rollout report assertions

**Files:**
- Modify: `scripts/rag/__tests__/production-evidence-first-online-rollout-verification.test.js`
- Test: `scripts/rag/__tests__/production-evidence-first-online-rollout-verification.test.js`

- [ ] **Step 1: Add failing Markdown assertions for gate summary and rollback text**

Extend the existing report test so it also asserts:

- the report includes `online_bundle_ids`
- the report includes `online_subject_codes`
- the report includes `online_corpus_versions`
- the report includes the rollback action text

- [ ] **Step 2: Run the verification-helper test to confirm the new assertions fail if the report contract is incomplete**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-first-online-rollout-verification.test.js
```

Expected:

- FAIL if the Markdown report is missing gate summary or rollback lines

- [ ] **Step 3: Make the tightened report test pass with the minimal report change**

- [ ] **Step 4: Re-run the test to confirm green**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-first-online-rollout-verification.test.js
```

Expected:

- PASS

### Task 2: Add CLI-level coverage for the existing first-online-rollout command

**Files:**
- Create: `scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js`
- Modify: `scripts/rag/run_production_evidence_first_online_rollout_verification.js`
- Test: `scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js`

- [ ] **Step 1: Write failing CLI tests for path handling and exit behavior**

Add tests that cover:

- `resolveCliPath` preserves absolute Windows paths
- `resolveCliPath` resolves relative paths from `process.cwd()`
- `main()` writes explicit output paths
- `main()` sets nonzero exit code when payload status is `fail`

- [ ] **Step 2: Run the new CLI test and verify it fails**

Run:

```bash
npm test -- scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js
```

Expected:

- FAIL because the CLI currently lacks direct coverage hooks or the expected behavior is not fully asserted yet

- [ ] **Step 3: Add the minimal CLI changes needed to satisfy the test**

- [ ] **Step 4: Re-run the CLI test to confirm green**

Run:

```bash
npm test -- scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js
```

Expected:

- PASS

## Chunk 2: Single Rollout Status Surface

### Task 3: Write failing tests for the merged rollout-status surface

**Files:**
- Create: `scripts/rag/lib/production-evidence-rollout-status.js`
- Create: `scripts/rag/__tests__/production-evidence-rollout-status.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-status.test.js`

- [ ] **Step 1: Write a failing single-rollout status test**

The test should build status from:

- `rag_phase_b_production_evidence_rollout_gate.json`
- `rag_phase_b_first_online_rollout_9702.json`

and assert:

- `online_bundle_ids = ["phase_b_pilot_ready_v1"]`
- `rollout_healthy = true`
- `rollback_required = false`
- `rollback_reasons = []`
- `recommended_action = "keep_online"`
- `target_promoted = true`
- `control_blocked = true`
- `evidence_reserved_blocked = true`
- `s1_passed = true`
- `s2_passed = true`
- `runtime_audit_contract.promoted_path = pass`
- `runtime_audit_contract.control_path = pass`

- [ ] **Step 2: Write a failing multi-entry-limit test**

Use a synthetic gate summary with more than one online entry but only one explicit verification-artifact mapping and assert:

- no crash
- the status payload remains structurally valid
- `rollout_healthy = false`
- `rollback_required = true`
- `rollback_reasons` includes an explicit unmapped-online-entry reason
- the payload clearly marks that this slice only supports explicit verification-artifact mappings

- [ ] **Step 3: Run the status-lib test and verify it fails**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-rollout-status.test.js
```

Expected:

- FAIL because the status builder does not exist yet

### Task 4: Implement the rollout-status builder and report renderer

**Files:**
- Create: `scripts/rag/lib/production-evidence-rollout-status.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-status.test.js`

- [ ] **Step 1: Implement the merged status builder**

The builder should:

- consume rollout-gate artifact payload plus an explicit verification-artifact input list
- compute online bundle / subject / corpus summaries
- compute explicit verification mappings for the current online entries
- compute `rollout_healthy`
- compute `rollback_required`
- compute `rollback_reasons`
- compute `recommended_action`
- compute `runtime_audit_contract`
- expose explicit mapping / single-active limitation metadata

- [ ] **Step 2: Implement the Markdown renderer**

The report should include:

- online bundle ids
- online subject codes
- online corpus versions
- focused verification paths or bundle ids
- runtime audit-contract summary
- `rollout_healthy`
- `rollback_required`
- `rollback_reasons`
- `recommended_action`

- [ ] **Step 3: Run the status-lib test to confirm green**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-rollout-status.test.js
```

Expected:

- PASS

### Task 5: Add the rollout-status CLI and its tests

**Files:**
- Create: `scripts/rag/run_production_evidence_rollout_status.js`
- Create: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`
- Create or Modify: `runs/backend/rag_phase_b_production_evidence_rollout_status.json`
- Create or Modify: `docs/reports/rag_phase_b_production_evidence_rollout_status.md`
- Test: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`

- [ ] **Step 1: Write failing CLI tests**

Cover:

- default output paths
- explicit output paths
- path resolution behavior
- nonzero exit on unhealthy status payload

- [ ] **Step 2: Run the CLI test and verify it fails**

Run:

```bash
npm test -- scripts/rag/__tests__/run-production-evidence-rollout-status.test.js
```

Expected:

- FAIL because the CLI does not exist yet

- [ ] **Step 3: Implement the CLI wrapper**

The CLI should default to:

- `runs/backend/rag_phase_b_production_evidence_rollout_status.json`
- `docs/reports/rag_phase_b_production_evidence_rollout_status.md`

and read:

- `runs/backend/rag_phase_b_production_evidence_rollout_gate.json`
- `runs/backend/rag_phase_b_first_online_rollout_9702.json`

For future expansion, the CLI may accept explicit `--verification-artifact` overrides, but this slice must keep the current default mapping fixed and obvious.

- [ ] **Step 4: Re-run the CLI test to confirm green**

Run:

```bash
npm test -- scripts/rag/__tests__/run-production-evidence-rollout-status.test.js
```

Expected:

- PASS

- [ ] **Step 5: Generate the checked-in status artifact**

Run:

```bash
node scripts/rag/run_production_evidence_rollout_status.js --out-json runs/backend/rag_phase_b_production_evidence_rollout_status.json --out-md docs/reports/rag_phase_b_production_evidence_rollout_status.md
```

Expected:

- `rollout_healthy = true`
- `rollback_required = false`
- `recommended_action = "keep_online"`
- `runtime_audit_contract.promoted_path = pass`
- `runtime_audit_contract.control_path = pass`

## Chunk 3: Runtime Audit Contract And Documentation

### Task 6: Add `ask-service` route-audit contract tests for promoted and control paths

**Files:**
- Modify: `api/rag/__tests__/ask-service.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [ ] **Step 1: Write failing promoted-path audit assertions**

Extend the promoted `9702` rollout test so it explicitly asserts:

- `route_audit.route_scores.production_evidence_rollout_active = true`
- `route_audit.route_scores.production_evidence_rollout_reason = "online_enabled_subject_match"`
- `route_audit.route_scores.production_evidence_rollout_bundle_ids = ["phase_b_pilot_ready_v1"]`
- `route_audit.route_scores.production_evidence_rollout_corpus_versions = ["rag_production_evidence_pilot_20260313"]`
- `route_audit.route_scores.production_evidence_rollout_source_types = ["evidence_authored", "evidence_transformed"]`

- [ ] **Step 2: Write failing control-path audit assertions**

Extend the `9231` control test so it explicitly asserts:

- `route_audit.route_scores.production_evidence_rollout_active = false`
- `route_audit.route_scores.production_evidence_rollout_reason = "no_subject_match"`
- `route_audit.route_scores.production_evidence_rollout_bundle_ids = []`
- `route_audit.route_scores.production_evidence_rollout_corpus_versions = []`
- `route_audit.route_scores.production_evidence_rollout_source_types = []`

- [ ] **Step 3: Run the focused `ask-service` test and verify the new contract is enforced**

Run:

```bash
npm test -- api/rag/__tests__/ask-service.test.js
```

Expected:

- FAIL if the route-audit contract is not stable enough yet

- [ ] **Step 4: Make the audit-contract test pass with the minimal code or assertion updates**

- [ ] **Step 5: Re-run the test to confirm green**

Run:

```bash
npm test -- api/rag/__tests__/ask-service.test.js
```

Expected:

- PASS

### Task 7: Update docs for the merged status surface

**Files:**
- Modify: `docs/superpowers/specs/2026-03-14-phase-b-production-evidence-rollout-observability-rollback-design.md`
- Modify: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`

- [ ] **Step 1: Update the runbook with the new rollout-status command**

- [ ] **Step 2: Remove any wording that implies a separate rollback-gate public surface**

- [ ] **Step 3: Document that runtime observability in this slice is sourced from `route_audit.route_scores`, not from a changed completion-log schema**

- [ ] **Step 4: Document the post-rollback steady state**

The runbook must say that after a successful manual rollback:

- `online_bundle_ids = []`
- `rollout_healthy = true`
- `rollback_required = false`
- `recommended_action = "hold_offline"`

### Task 8: Fresh verification before completion

**Files:**
- Test: `scripts/rag/__tests__/production-evidence-first-online-rollout-verification.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-status.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-rollout-gate.test.js`

- [ ] **Step 1: Run the full focused verification matrix**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-first-online-rollout-verification.test.js scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js scripts/rag/__tests__/production-evidence-rollout-status.test.js scripts/rag/__tests__/run-production-evidence-rollout-status.test.js api/rag/__tests__/ask-service.test.js scripts/rag/__tests__/production-evidence-rollout-gate.test.js scripts/rag/__tests__/run-production-evidence-rollout-gate.test.js
```

Expected:

- all suites pass

- [ ] **Step 2: Re-generate the fixed-path artifacts**

Run:

```bash
node scripts/rag/run_production_evidence_rollout_gate.js --rollout-gate data/evidence/production/rollout_gate_v1.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_rollout_gate.json --out-md docs/reports/rag_phase_b_production_evidence_rollout_gate.md
node scripts/rag/run_production_evidence_first_online_rollout_verification.js --out-json runs/backend/rag_phase_b_first_online_rollout_9702.json --out-md docs/reports/rag_phase_b_first_online_rollout_9702.md
node scripts/rag/run_production_evidence_rollout_status.js --out-json runs/backend/rag_phase_b_production_evidence_rollout_status.json --out-md docs/reports/rag_phase_b_production_evidence_rollout_status.md
```

Expected:

- all three commands exit `0`
- rollout gate stays online for `9702`
- focused rollout artifact remains `pass`
- rollout status artifact reports `rollout_healthy = true` and `rollback_required = false`

- [ ] **Step 3: Verify `git status --short` shows only intentional observability-slice files**
