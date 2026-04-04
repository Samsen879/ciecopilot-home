# AO Phase 2 Decision Chain Convergence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge AO phase 2 onto one stable repo-local decision-chain contract so orchestrator and controller consume the same `reconcile -> doctor -> lifecycle` semantics instead of relying on prompt text and loosely coupled outputs.

**Architecture:** Keep the existing phase-1/2/3 engines intact, then add a shared phase-2 decision-chain contract layer that classifies scope authority, required stages, key findings, and next actions. Wire that contract into the lifecycle surface and controller result payloads so trigger routing and operator-facing automation outputs stay deterministic across PR-scoped authoritative flows and project-scoped advisory flows.

**Tech Stack:** Node 18 ESM, Jest, existing AO contracts/report builders, markdown runbooks, YAML orchestrator rules.

---

## Source Requirements

- `docs/setup/AO_COMPLETE_STATE_ROADMAP.md` from commit `6762963`
- `docs/superpowers/specs/2026-04-03-ao-phase1-entry-topology-design.md`
- `docs/setup/AO_RECONCILIATION_RUNBOOK.md`
- `docs/setup/AO_DOCTOR_RUNBOOK.md`
- `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- `docs/setup/AO_CONTROLLER_RUNBOOK.md`

## File Map

### Decision-chain contract

- Create: `scripts/ao/lib/decision-chain-contracts.js`
- Create: `scripts/ao/lib/decision-chain.js`
- Modify: `scripts/ao-lifecycle.js`
- Modify: `scripts/ao/lib/controller-loop.js`

### Tests

- Create: `tests/ao/decision-chain-contracts.test.js`
- Create: `tests/ao/decision-chain.test.js`
- Modify: `tests/ao/ao-lifecycle-cli.test.js`
- Modify: `tests/ao/ao-lifecycle-acceptance.test.js`
- Modify: `tests/ao/controller-loop.test.js`

### Documentation and operator contract

- Modify: `agent-orchestrator.yaml`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- Modify: `docs/setup/AO_CONTROLLER_RUNBOOK.md`
- Modify: `docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md`

## Chunk 1: Lock The Phase-2 Decision-Chain Contract In Tests

### Task 1: Add contract tests for stage authority and next-action normalization

**Files:**
- Create: `tests/ao/decision-chain-contracts.test.js`
- Create: `tests/ao/decision-chain.test.js`

- [ ] **Step 1: Write failing tests for the new chain schema and stage plan**

Lock a new contract that asserts:

- PR-scoped chain = authoritative truth + diagnose-only doctor + authoritative lifecycle
- project-scoped manual chain = advisory-only chain with doctor/lifecycle marked non-required
- blocking findings and next commands are normalized into stable arrays

- [ ] **Step 2: Run the new contract slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/decision-chain-contracts.test.js tests/ao/decision-chain.test.js
```

Expected:
- FAIL because the shared decision-chain layer does not exist yet

### Task 2: Expand lifecycle/controller tests to require the new contract surface

**Files:**
- Modify: `tests/ao/ao-lifecycle-cli.test.js`
- Modify: `tests/ao/ao-lifecycle-acceptance.test.js`
- Modify: `tests/ao/controller-loop.test.js`

- [ ] **Step 1: Write failing expectations for lifecycle JSON and controller task results**

Require:

- lifecycle JSON output carries a shared `decision_chain` object
- controller task results preserve the same chain summary
- trigger-specific PR flows expose stable `key_findings`, `next_actions`, and `next_commands`

- [ ] **Step 2: Run the focused AO test slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/ao-lifecycle-cli.test.js tests/ao/ao-lifecycle-acceptance.test.js tests/ao/controller-loop.test.js
```

Expected:
- FAIL because lifecycle/controller do not yet expose the shared chain contract

## Chunk 2: Implement The Shared Decision-Chain Layer

### Task 3: Build reusable phase-2 chain builders

**Files:**
- Create: `scripts/ao/lib/decision-chain-contracts.js`
- Create: `scripts/ao/lib/decision-chain.js`
- Test: `tests/ao/decision-chain-contracts.test.js`
- Test: `tests/ao/decision-chain.test.js`

- [ ] **Step 1: Add the schema, scope classification, and stage-plan builders**

Create a shared contract module that freezes:

- schema identity
- stage ids
- authority modes
- PR authoritative vs project advisory stage requirements

- [ ] **Step 2: Add a report builder that aggregates findings and next actions**

Build a shared report from reconciliation / doctor / lifecycle outputs that includes:

- stage execution contract
- authority posture
- key non-info findings
- deduped next actions
- deduped next commands

- [ ] **Step 3: Re-run the contract tests and verify they pass**

Run:

```bash
npm test -- --runInBand tests/ao/decision-chain-contracts.test.js tests/ao/decision-chain.test.js
```

Expected:
- PASS

## Chunk 3: Wire Lifecycle And Controller To The Shared Contract

### Task 4: Expose the decision chain from lifecycle and controller

**Files:**
- Modify: `scripts/ao-lifecycle.js`
- Modify: `scripts/ao/lib/controller-loop.js`
- Test: `tests/ao/ao-lifecycle-cli.test.js`
- Test: `tests/ao/ao-lifecycle-acceptance.test.js`
- Test: `tests/ao/controller-loop.test.js`

- [ ] **Step 1: Attach the shared chain report to lifecycle output**

`ao-lifecycle` should keep its current top-level report shape but add a stable `decision_chain` field derived from the shared builder.

- [ ] **Step 2: Attach the same chain summary to controller task results**

Controller task results should preserve the chain surface needed by orchestrator/runtime consumers without recomputing prompt-only logic.

- [ ] **Step 3: Re-run the focused AO test slice and verify it passes**

Run:

```bash
npm test -- --runInBand tests/ao/ao-lifecycle-cli.test.js tests/ao/ao-lifecycle-acceptance.test.js tests/ao/controller-loop.test.js
```

Expected:
- PASS

## Chunk 4: Converge Docs And Orchestrator Rules On The Phase-2 Contract

### Task 5: Rewrite operator/orchestrator guidance around the shared chain surface

**Files:**
- Modify: `agent-orchestrator.yaml`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- Modify: `docs/setup/AO_CONTROLLER_RUNBOOK.md`
- Modify: `docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md`

- [ ] **Step 1: Replace prompt-heavy instructions with the shared contract vocabulary**

Update docs and orchestrator guidance so they reference:

- authoritative PR-scoped chain
- advisory project-scoped chain
- `decision_chain.key_findings`
- `decision_chain.next_actions`
- `decision_chain.next_commands`

- [ ] **Step 2: Verify the changed docs stay aligned with the code surface**

Run:

```bash
npm test -- --runInBand tests/ao/ao-lifecycle-cli.test.js tests/ao/ao-lifecycle-acceptance.test.js tests/ao/controller-loop.test.js tests/ao/decision-chain-contracts.test.js tests/ao/decision-chain.test.js
```

Expected:
- PASS

## Chunk 5: Final Verification

### Task 6: Run the phase-2 verification slice and smoke the operator path

**Files:**
- Test: `tests/ao/decision-chain-contracts.test.js`
- Test: `tests/ao/decision-chain.test.js`
- Test: `tests/ao/ao-lifecycle-cli.test.js`
- Test: `tests/ao/ao-lifecycle-acceptance.test.js`
- Test: `tests/ao/controller-loop.test.js`

- [ ] **Step 1: Run the full focused test slice**

Run:

```bash
npm test -- --runInBand tests/ao/decision-chain-contracts.test.js tests/ao/decision-chain.test.js tests/ao/ao-lifecycle-cli.test.js tests/ao/ao-lifecycle-acceptance.test.js tests/ao/controller-loop.test.js
```

Expected:
- PASS

- [ ] **Step 2: Run the existing operator smoke**

Run:

```bash
npm run ao:smoke
```

Expected:
- PASS
- phase-2 chain-facing lifecycle output remains deterministic for `ci_failed` and `approved_and_green`
