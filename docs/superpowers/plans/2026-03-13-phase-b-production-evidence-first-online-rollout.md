# Phase B Production Evidence First Online Rollout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `phase_b_pilot_ready_v1` for `9702` into online retrieval through the existing rollout gate, while proving `9231` stays blocked, `evidence_reserved` stays excluded, and both `S1` and `S2` paths honor the promotion contract.

**Architecture:** Reuse the existing rollout gate, runtime resolver, and ask-service entrypoints in `codex-rag-route-a`. First rewrite the checked-in contract tests from offline-default to promoted-state expectations, then promote the checked-in gate entry, add focused `S1` and `S2` regression coverage, and finally generate fixed-path rollout artifacts.

**Tech Stack:** Node.js, Jest, checked-in JSON contracts, existing ask-service retrieval path, existing rollout gate CLI

---

## Chunk 1: Checked-In Contract And Runtime Guardrails

### Task 1: Rewrite checked-in rollout gate expectations for the promoted state

**Files:**
- Modify: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`

- [ ] **Step 1: Replace the existing checked-in offline-default assertion with the promoted checked-in assertion**

Update the first checked-in gate test so it expects:

- `online_bundle_ids = ["phase_b_pilot_ready_v1"]`
- `online_subject_codes = ["9702"]`
- `online_corpus_versions = ["rag_production_evidence_pilot_20260313"]`
- `offline_bundle_ids = []`

Do not add a second contradictory checked-in assertion. The existing offline-default expectation must be rewritten in place.

- [ ] **Step 2: Run the gate test to verify it fails before the JSON gate edit**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-rollout-gate.test.js
```

Expected:

- FAIL because the checked-in gate is still `offline_default`

### Task 2: Tighten runtime resolver coverage for reserved-type blocking

**Files:**
- Modify: `api/rag/__tests__/production-evidence-rollout.test.js`
- Test: `api/rag/__tests__/production-evidence-rollout.test.js`

- [ ] **Step 1: Add a promoted-state runtime assertion that only authored/transformed are unblocked**

Extend the runtime rollout test coverage so an online-enabled matching subject proves:

- `audit.active = true`
- `audit.unblocked_source_types = ["evidence_authored", "evidence_transformed"]`
- `excludedSourceTypes` still contains exactly `["evidence_reserved"]`
- promoted `corpusVersions` include both the baseline corpus and `rag_production_evidence_pilot_20260313`

- [ ] **Step 2: Run the runtime rollout test to verify the new assertion fails before implementation changes, if any are needed**

Run:

```bash
npm test -- api/rag/__tests__/production-evidence-rollout.test.js
```

Expected:

- PASS if current fail-closed runtime already satisfies the stricter contract
- otherwise FAIL on the newly tightened `evidence_reserved` expectation

## Chunk 2: Ask-Service Retrieval Path Coverage

### Task 3: Add promoted-state `S1` coverage for target, control, and reserved filtering

**Files:**
- Modify: `api/rag/__tests__/ask-service.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [ ] **Step 1: Tighten the existing promoted `9702` S1 test instead of adding a duplicate**

Update the current promoted `9702` `S1` test so its stub rows include:

- one `evidence_authored` row
- one `evidence_reserved` row
- one restricted-official control row

Assert that:

- the answer remains grounded
- returned evidence includes `evidence_authored`
- returned evidence does not include `evidence_reserved`
- the merged `p_corpus_versions` include `rag_production_evidence_pilot_20260313`

- [ ] **Step 2: Add or tighten a non-target `9231` control assertion**

Add a focused `9231` test that proves:

- the same promoted gate entry does not activate for `9231`
- returned evidence does not include promoted production evidence rows
- the request corpus allowlist does not regain `rag_production_evidence_pilot_20260313`

- [ ] **Step 3: Run the focused `ask-service` tests to verify promoted-state expectations fail before the gate edit**

Run:

```bash
npm test -- api/rag/__tests__/ask-service.test.js
```

Expected:

- FAIL on the rewritten promoted-state checked-in expectations or the tightened reserved/control assertions

### Task 4: Add promoted-state `S2` coverage

**Files:**
- Modify: `api/rag/__tests__/ask-service.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [ ] **Step 1: Add a focused `9702` S2 test that captures the retrieval config passed to `s2Retriever`**

Use a custom injected `s2Retriever` so the test can assert that promoted `9702` traffic on the `S2` path receives:

- `retrievalConfig.corpusVersions = ["rag_step3_9702_question_aware_v1", "rag_production_evidence_pilot_20260313"]`
- `retrievalConfig.excludedSourceTypes = ["evidence_reserved"]`

The stubbed `s2Retriever` should return at least one `evidence_authored` row so the test can also assert:

- `route_audit.final_execution_route = "s2_augmentation"`
- `retrieval_audit.query_mode = "s2_multi_hop"`
- returned evidence includes the promoted authored row

- [ ] **Step 2: Run the focused `S2` test to verify the promoted-state expectation fails before the gate edit**

Run:

```bash
npm test -- api/rag/__tests__/ask-service.test.js
```

Expected:

- FAIL on the new promoted-state `S2` assertion before the gate edit

## Chunk 3: Promote The Checked-In Gate

### Task 5: Promote the rollout entry in `rollout_gate_v1.json`

**Files:**
- Modify: `data/evidence/production/rollout_gate_v1.json`

- [ ] **Step 1: Change the `9702` pilot entry from `offline_default` to `online_enabled`**

The entry must stay:

- `bundle_id = phase_b_pilot_ready_v1`
- `subject_codes = ["9702"]`
- `corpus_versions = ["rag_production_evidence_pilot_20260313"]`
- `allowed_source_types = ["evidence_authored", "evidence_transformed"]`

- [ ] **Step 2: Update notes in the gate file so the promoted checked-in state is explicit**

Record that:

- this is the first online rollout
- the scope is only `9702`
- `evidence_reserved` remains blocked
- rollback is to return the entry to `offline_default`

## Chunk 4: Fixed-Path Rollout Artifacts

### Task 6: Make the promoted tests pass

**Files:**
- Modify: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Modify: `api/rag/__tests__/production-evidence-rollout.test.js`
- Modify: `api/rag/__tests__/ask-service.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Test: `api/rag/__tests__/production-evidence-rollout.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [ ] **Step 1: Run the focused promoted-state test set after the gate edit**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-rollout-gate.test.js api/rag/__tests__/production-evidence-rollout.test.js api/rag/__tests__/ask-service.test.js
```

Expected:

- PASS with `9702` online-enabled
- PASS with `9231` still blocked
- PASS with `evidence_reserved` still excluded
- PASS with both `S1` and `S2` paths honoring the promoted contract

### Task 7: Create a deterministic focused verification artifact generator

**Files:**
- Create: `scripts/rag/run_production_evidence_first_online_rollout_verification.js`
- Create or Modify: `runs/backend/rag_phase_b_first_online_rollout_9702.json`
- Create or Modify: `docs/reports/rag_phase_b_first_online_rollout_9702.md`

- [ ] **Step 1: Add a focused verification CLI with fixed output names**

Create a dedicated script that records:

- promoted gate summary for `9702`
- `9702` target verification result
- `9231` control verification result
- `evidence_reserved` exclusion result
- `S1` verification result
- `S2` verification result
- rollback instruction summary

- [ ] **Step 2: Run the focused rollout verification CLI**

Run:

```bash
node scripts/rag/run_production_evidence_first_online_rollout_verification.js --out-json runs/backend/rag_phase_b_first_online_rollout_9702.json --out-md docs/reports/rag_phase_b_first_online_rollout_9702.md
```

Expected:

- the JSON and Markdown artifacts are generated at the fixed paths above
- the artifact explicitly records `9702` promoted, `9231` blocked, `evidence_reserved` blocked, and `S1` / `S2` checks passing

- [ ] **Step 3: Re-run the rollout gate CLI against the promoted gate**

Run:

```bash
node scripts/rag/run_production_evidence_rollout_gate.js --rollout-gate data/evidence/production/rollout_gate_v1.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_rollout_gate.json --out-md docs/reports/rag_phase_b_production_evidence_rollout_gate.md
```

Expected:

- `online_bundle_ids = ["phase_b_pilot_ready_v1"]`
- `online_subject_codes = ["9702"]`
- `offline_bundle_ids = []`

## Chunk 5: Docs And Completion Gate

### Task 8: Update docs for the promoted state

**Files:**
- Modify: `docs/superpowers/specs/2026-03-13-phase-b-production-evidence-first-online-rollout-design.md`
- Modify: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`

- [ ] **Step 1: Update the runbook to distinguish offline-default state from promoted first-rollout state**

- [ ] **Step 2: Add the rollback instruction to the runbook**

The rollback instruction must say:

- set `rollout_state` back to `offline_default`
- rerun rollout gate validation
- rerun `rag_phase_b_first_online_rollout_9702` verification

### Task 9: Fresh verification before completion

**Files:**
- Test: `scripts/rag/__tests__/production-evidence-whitelist.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Test: `scripts/rag/__tests__/run-production-evidence-rollout-gate.test.js`
- Test: `api/rag/__tests__/production-evidence-rollout.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [ ] **Step 1: Run the full focused verification matrix**

Run:

```bash
npm test -- scripts/rag/__tests__/production-evidence-whitelist.test.js scripts/rag/__tests__/production-evidence-rollout-gate.test.js scripts/rag/__tests__/run-production-evidence-rollout-gate.test.js api/rag/__tests__/production-evidence-rollout.test.js api/rag/__tests__/ask-service.test.js
```

Expected:

- all suites pass

- [ ] **Step 2: Re-run both fixed-path artifacts**

Run:

```bash
node scripts/rag/run_production_evidence_rollout_gate.js --rollout-gate data/evidence/production/rollout_gate_v1.json --whitelist data/evidence/production/whitelist_v1.json --out-json runs/backend/rag_phase_b_production_evidence_rollout_gate.json --out-md docs/reports/rag_phase_b_production_evidence_rollout_gate.md
node scripts/rag/run_production_evidence_first_online_rollout_verification.js --out-json runs/backend/rag_phase_b_first_online_rollout_9702.json --out-md docs/reports/rag_phase_b_first_online_rollout_9702.md
```

Expected:

- both artifact pairs regenerate successfully

- [ ] **Step 3: Verify `git status --short` is clean except for intentional rollout-slice files**
