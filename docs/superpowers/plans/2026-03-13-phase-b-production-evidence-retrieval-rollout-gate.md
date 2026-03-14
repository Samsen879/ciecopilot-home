# Phase B Production Evidence Retrieval Rollout Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit, subject-scoped retrieval rollout gate so a ready-for-ingest production evidence bundle can be promoted into online retrieval without opening the whole layer by default.

**Architecture:** Keep retrieval default-off, validate the checked-in rollout gate against the existing whitelist, and resolve promotion at request time by merging approved production-evidence corpus versions into the retrieval allowlist only when subject match and rollout state both permit it.

**Tech Stack:** Node.js, Jest, checked-in JSON contracts, existing ask-service hybrid RPC path

---

## Chunk 1: Contract And Runtime

### Task 1: Add failing tests for the rollout gate contract and request-time opt-in

**Files:**
- Modify: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Modify: `api/rag/__tests__/ask-service.test.js`

- [x] Step 1: Write the failing rollout gate contract test
- [x] Step 2: Run the rollout gate contract test and confirm it fails because the validator does not exist yet
- [x] Step 3: Add request-time ask-service tests for matching-subject activation and no-baseline blocking
- [x] Step 4: Run the ask-service test and confirm the online rollout case fails while the feature is still missing

### Task 2: Implement the rollout gate validator and checked-in gate file

**Files:**
- Create: `scripts/rag/lib/production-evidence-rollout-gate.js`
- Create: `scripts/rag/run_production_evidence_rollout_gate.js`
- Create: `data/evidence/production/rollout_gate_v1.json`

- [x] Step 1: Add the validator that ties rollout entries back to whitelist posture
- [x] Step 2: Add the CLI/report command for generating JSON and Markdown artifacts
- [x] Step 3: Check in an offline-by-default rollout gate entry for `phase_b_pilot_ready_v1`

### Task 3: Implement request-time rollout resolution

**Files:**
- Create: `api/rag/lib/production-evidence-rollout.js`
- Modify: `api/rag/lib/config.js`
- Modify: `api/rag/lib/ask-service.js`

- [x] Step 1: Add runtime config knobs for gate enablement, gate path, and baseline allowlist requirement
- [x] Step 2: Add a subject-aware rollout resolver that merges corpus versions and relaxes exclusions only for matching online entries
- [x] Step 3: Thread the resolved retrieval params into the existing S1/S2 retrieval path through `ask-service`

### Task 4: Re-run focused tests until green

**Files:**
- Test: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`
- Test: `api/rag/__tests__/ask-service.test.js`

- [x] Step 1: Run the focused tests after implementation
- [x] Step 2: Confirm the rollout gate contract passes and the matching-subject ask-service test activates the promoted corpus allowlist

## Chunk 2: Docs And Reports

### Task 5: Update checked-in docs and contract notes

**Files:**
- Modify: `data/evidence/production/pilot_ready_v1/manifest.json`
- Modify: `data/evidence/production/whitelist_v1.json`
- Modify: `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md`
- Create: `docs/superpowers/specs/2026-03-13-phase-b-production-evidence-retrieval-rollout-gate-design.md`
- Create: `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-retrieval-rollout-gate.md`

- [x] Step 1: Replace stale “not wired” wording with “blocked until rollout gate promotion”
- [x] Step 2: Add the rollout gate command and env knobs to the runbook
- [x] Step 3: Save the retrieval rollout gate spec and execution plan

### Task 6: Generate a checked-in rollout gate validation artifact

**Files:**
- Create: `runs/backend/rag_phase_b_production_evidence_rollout_gate.json`
- Create: `docs/reports/rag_phase_b_production_evidence_rollout_gate.md`

- [ ] Step 1: Run the rollout gate CLI against the checked-in offline gate
- [ ] Step 2: Verify the artifact shows `online_bundle_ids = []` and `offline_bundle_ids = [phase_b_pilot_ready_v1]`

## Chunk 3: Final Verification

### Task 7: Fresh verification and review

**Files:**
- Test: `api/rag/__tests__/ask-service.test.js`
- Test: `scripts/rag/__tests__/production-evidence-rollout-gate.test.js`

- [ ] Step 1: Run the focused Jest suite
- [ ] Step 2: Run the rollout gate CLI to regenerate report artifacts
- [ ] Step 3: Request code review and address any issues before claiming completion
