# AO Independent Reviewer Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a durable AO-native independent reviewer gate so implementation workers must pass a separate read-only reviewer session before AO can advance a finished slice to `notify_human_ready`.

**Architecture:** Extend the repo-local AO control plane with a new `ao-review` surface, durable review records, review-freeze state, and controller gating tied to target SHA. Keep the first release narrow: explicit `ready_for_review` requests only, no automatic reviewer spawning, no reviewer writes, and fail-closed controller behavior when review has not passed for the current target.

**Tech Stack:** Node 18 ESM, existing AO state contracts/repository/migrations, Jest, repo-local AO CLI surfaces, Markdown runbooks.

---

## Source Spec

- [2026-04-03-ao-independent-reviewer-gate-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-04-03-ao-independent-reviewer-gate-design.md)
- [AO Control Plane Operations](/home/samsen/code/ciecopilot-home/docs/setup/AO_CONTROL_PLANE_OPERATIONS.md)
- [AO Controller Runbook](/home/samsen/code/ciecopilot-home/docs/setup/AO_CONTROLLER_RUNBOOK.md)
- [AO Lifecycle Runbook](/home/samsen/code/ciecopilot-home/docs/setup/AO_LIFECYCLE_RUNBOOK.md)

## Execution Rules

- Preserve phase 1-6 semantics unless this plan explicitly changes them.
- Do not weaken the current phase-4 assist boundary while adding review gating.
- Keep reviewer authority read-only in the first release.
- Treat reviewer read-only restrictions as convention-enforced in the first release through orchestrator/runbook guidance and review-contract checks, not OS- or git-sandbox enforcement.
- Treat review gating as a durable control-plane contract, not prompt text.
- Follow TDD: write failing tests first for every new contract slice.
- Use `apply_patch` for all file edits.
- Run focused verification after each chunk; do not defer all validation to the end.

## File Map

### Review state contracts and storage

- Modify: `scripts/ao/lib/state-contracts.js`
- Modify: `scripts/ao/lib/state-migrations.js`
- Modify: `scripts/ao/lib/state-repository.js`
- Create: `scripts/ao/lib/review-contracts.js`
- Create: `scripts/ao/lib/review-protocol.js`

### Review CLI and task integration

- Create: `scripts/ao-review.js`
- Modify: `scripts/ao/lib/manage-runner.js`
- Modify: `scripts/ao-manage.js`

### Controller, lifecycle, and reporting integration

- Modify: `scripts/ao/lib/controller-loop.js`
- Modify: `scripts/ao/lib/lifecycle-engine.js`
- Modify: `scripts/ao/lib/state-runner.js`
- Modify: `scripts/ao/lib/state-report.js`

### Tests

- Create: `tests/ao/review-contracts.test.js`
- Create: `tests/ao/review-protocol.test.js`
- Create: `tests/ao/ao-review-cli.test.js`
- Modify: `tests/ao/state-contracts.test.js`
- Modify: `tests/ao/state-migrations.test.js`
- Modify: `tests/ao/state-repository.test.js`
- Modify: `tests/ao/manage-runner.test.js`
- Modify: `tests/ao/controller-loop.test.js`
- Modify: `tests/ao/controller-policy-gating.test.js`
- Modify: `tests/ao/state-runner.test.js`
- Modify: `tests/ao/state-report.test.js`
- Modify: `tests/ao/ao-state-cli.test.js`
- Modify: `tests/ao/ao-lifecycle-acceptance.test.js`

### Documentation and operator evidence

- Modify: `agent-orchestrator.yaml`
- Modify: `docs/setup/AO_CONTROL_PLANE_OPERATIONS.md`
- Modify: `docs/setup/AO_CONTROLLER_RUNBOOK.md`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- Create: `docs/setup/AO_REVIEW_RUNBOOK.md`
- Create: `docs/reports/2026-04-03-ao-reviewer-gate-rehearsal.md`

## Chunk 1: Lock The Review Contract In Tests

### Task 1: Add review schema and verdict contract tests

**Files:**
- Create: `tests/ao/review-contracts.test.js`
- Modify: `tests/ao/state-contracts.test.js`

- [ ] **Step 1: Write failing tests for review enums and record builders**

Lock the first-release contract for:

- review record schema identity
- allowed statuses: `open`, `claimed`, `passed`, `changes_required`, `escalated`, `cancelled`
- allowed verdicts: `pass`, `changes_required`, `escalate_human`
- required target SHA, implementation session, and review baseline fields
- same-session reviewer independence guard inputs

- [ ] **Step 2: Run the contract slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/review-contracts.test.js tests/ao/state-contracts.test.js
```

Expected:
- FAIL because review contracts do not exist yet

### Task 2: Add state migration and repository tests for review collections

**Files:**
- Modify: `tests/ao/state-migrations.test.js`
- Modify: `tests/ao/state-repository.test.js`

- [ ] **Step 1: Write failing tests for the new review collections and migration**

Require:

- control-plane schema version bump for the review migration
- new review collections in bootstrap state
- repository upsert/list behavior for review records
- audit entries for review request / claim / verdict persistence

- [ ] **Step 2: Run the focused storage slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/state-migrations.test.js tests/ao/state-repository.test.js
```

Expected:
- FAIL because review collections and migration support do not exist yet

## Chunk 2: Implement Durable Review Contracts And Protocol

### Task 3: Add review contracts, migration, and repository support

**Files:**
- Create: `scripts/ao/lib/review-contracts.js`
- Modify: `scripts/ao/lib/state-contracts.js`
- Modify: `scripts/ao/lib/state-migrations.js`
- Modify: `scripts/ao/lib/state-repository.js`
- Test: `tests/ao/review-contracts.test.js`
- Test: `tests/ao/state-contracts.test.js`
- Test: `tests/ao/state-migrations.test.js`
- Test: `tests/ao/state-repository.test.js`

- [ ] **Step 1: Add review schema builders and collection defaults**

Implement:

- review schema/version constants
- review status/verdict enums
- builders for one unified review record shape
- `createEmptyControlPlaneState` support for review collections

- [ ] **Step 2: Add a new control-plane migration for review state**

Implement:

- increment `CONTROL_PLANE_LATEST_VERSION`
- add `0010_review_gate_v1`
- bootstrap and migration handling for new review collections
- update the hardcoded `buildBootstrapState` collection key list in `state-migrations.js` to keep bootstrap and empty-state defaults in sync
- matching migration audit summary

- [ ] **Step 3: Add repository persistence helpers**

Implement:

- upsert/read/list helpers for review records
- audit persistence for review record mutations
- deterministic sorting alongside existing collections

- [ ] **Step 4: Re-run the contract and storage slice**

Run:

```bash
npm test -- --runInBand tests/ao/review-contracts.test.js tests/ao/state-contracts.test.js tests/ao/state-migrations.test.js tests/ao/state-repository.test.js
```

Expected:
- PASS

### Task 4: Build the review protocol with same-session fail-closed rules

**Files:**
- Create: `scripts/ao/lib/review-protocol.js`
- Create: `tests/ao/review-protocol.test.js`
- Modify: `tests/ao/manage-runner.test.js`

- [ ] **Step 1: Write failing protocol tests**

Lock protocol behavior for:

- explicit review request creation
- one active review per task
- fixed `target_head_sha`
- review posture is derived from the latest review record status, not stored as mutable task state
- review requests reject empty or missing `verification_baseline`
- same-session reviewer claim rejection
- verdict transitions for `pass`, `changes_required`, and `escalate_human`
- `pass` requires baseline execution evidence or reviewer-attested baseline execution summary on the verdict input
- cancellation when target SHA drifts

- [ ] **Step 2: Run the protocol slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/review-protocol.test.js tests/ao/manage-runner.test.js
```

Expected:
- FAIL because the review protocol does not exist yet

- [ ] **Step 3: Implement the minimal review protocol**

Implement:

- request / claim / verdict / inspect operations
- derived review freeze posture from the latest review record
- same-session fail-closed checks
- verification baseline presence and `pass`-path baseline execution enforcement
- target SHA drift invalidation

- [ ] **Step 4: Re-run the protocol slice**

Run:

```bash
npm test -- --runInBand tests/ao/review-protocol.test.js tests/ao/manage-runner.test.js
```

Expected:
- PASS

## Chunk 3: Add The `ao-review` CLI And Task Freeze Semantics

### Task 5: Add the `ao-review` CLI surface

**Files:**
- Create: `scripts/ao-review.js`
- Create: `tests/ao/ao-review-cli.test.js`

- [ ] **Step 1: Write failing CLI tests**

Require:

- `request`, `claim`, `verdict`, and `inspect` commands
- JSON output for machine-readable review posture
- human summary output for operators
- invalid verdict rejection
- same-session claim rejection surfacing through the CLI

- [ ] **Step 2: Run the new CLI slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/ao-review-cli.test.js
```

Expected:
- FAIL because `scripts/ao-review.js` does not exist yet

- [ ] **Step 3: Implement the CLI with the same ergonomics as `ao-handoff`**

Implement:

- repo-root discovery
- argument parsing
- JSON and human summary output
- protocol operation dispatch

- [ ] **Step 4: Re-run the CLI slice**

Run:

```bash
npm test -- --runInBand tests/ao/ao-review-cli.test.js
```

Expected:
- PASS

### Task 6: Wire task freeze semantics into task management and state inspection

**Files:**
- Modify: `scripts/ao/lib/manage-runner.js`
- Modify: `scripts/ao-manage.js`
- Modify: `tests/ao/manage-runner.test.js`
- Modify: `tests/ao/ao-state-cli.test.js`

- [ ] **Step 1: Write failing expectations for review-frozen tasks**

Require:

- task inspection surfaces can distinguish active work from review-frozen work
- management output includes review posture when a task is waiting on review
- implementation progression is blocked while review is active

- [ ] **Step 2: Run the focused task/state slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/manage-runner.test.js tests/ao/ao-state-cli.test.js
```

Expected:
- FAIL because review freeze is not yet surfaced

- [ ] **Step 3: Implement minimal integration**

Implement:

- read review posture alongside continuity in management outputs
- prevent normal implementation continuation semantics from bypassing active review freeze
- keep ownership continuity intact while task progress is frozen for review

- [ ] **Step 4: Re-run the focused task/state slice**

Run:

```bash
npm test -- --runInBand tests/ao/manage-runner.test.js tests/ao/ao-state-cli.test.js
```

Expected:
- PASS

## Chunk 4: Gate Controller And Lifecycle On Review Pass

### Task 7: Add review-aware lifecycle and controller gating tests

**Files:**
- Modify: `tests/ao/controller-loop.test.js`
- Modify: `tests/ao/controller-policy-gating.test.js`
- Modify: `tests/ao/ao-lifecycle-acceptance.test.js`

- [ ] **Step 1: Write failing tests for hard review gating**

Require:

- `notify_human_ready` is blocked when the task requires review and no matching `review_passed` exists for the target SHA
- `changes_required` returns the task to implementation flow rather than human-ready flow
- `review_escalated` becomes a human gate / hold condition
- controller still honors phase-4 assist policy decisions after review gate is evaluated

- [ ] **Step 2: Run the controller/lifecycle slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/controller-loop.test.js tests/ao/controller-policy-gating.test.js tests/ao/ao-lifecycle-acceptance.test.js
```

Expected:
- FAIL because controller and lifecycle do not yet know about review gating

### Task 8: Implement review-aware release gating

**Files:**
- Modify: `scripts/ao/lib/lifecycle-engine.js`
- Modify: `scripts/ao/lib/controller-loop.js`
- Test: `tests/ao/controller-loop.test.js`
- Test: `tests/ao/controller-policy-gating.test.js`
- Test: `tests/ao/ao-lifecycle-acceptance.test.js`

- [ ] **Step 1: Add review-gated release findings and action reasoning**

Implement:

- lifecycle findings or release-disposition overlays that explain review-pending / review-escalated blockers
- stable operator-facing reasons for “why notify_human_ready is blocked”

- [ ] **Step 2: Add controller enforcement**

Implement:

- review-pass prerequisite for release-facing advancement
- fail-closed behavior when review is required but missing, stale, or mismatched to target SHA
- insert the review gate in the controller release-facing advancement path after lifecycle and policy evaluation but before final action emission / `notify_human_ready` proposal

- [ ] **Step 3: Re-run the controller/lifecycle slice**

Run:

```bash
npm test -- --runInBand tests/ao/controller-loop.test.js tests/ao/controller-policy-gating.test.js tests/ao/ao-lifecycle-acceptance.test.js
```

Expected:
- PASS

## Chunk 5: Expose Review State In `ao-state` And Human Summaries

### Task 9: Add review reporting tests

**Files:**
- Modify: `tests/ao/state-runner.test.js`
- Modify: `tests/ao/state-report.test.js`
- Modify: `tests/ao/ao-state-cli.test.js`

- [ ] **Step 1: Write failing tests for review summary and inspections**

Require:

- `ao-state --json` exposes `reviews.summary`
- `ao-state --json` exposes `reviews.inspections[*]`
- human summary output explains review posture, reviewer session, target SHA, freeze status, and why advancement is blocked

- [ ] **Step 2: Run the reporting slice and verify it fails**

Run:

```bash
npm test -- --runInBand tests/ao/state-runner.test.js tests/ao/state-report.test.js tests/ao/ao-state-cli.test.js
```

Expected:
- FAIL because review reporting is not implemented yet

### Task 10: Implement `ao-state` review reporting

**Files:**
- Modify: `scripts/ao/lib/state-runner.js`
- Modify: `scripts/ao/lib/state-report.js`
- Test: `tests/ao/state-runner.test.js`
- Test: `tests/ao/state-report.test.js`
- Test: `tests/ao/ao-state-cli.test.js`

- [ ] **Step 1: Add review inspection builders**

Implement:

- review summary count rollups
- per-task review inspections
- additive `ao-state --json` top-level `reviews` fields without renaming or reshaping existing fields
- task closeout and debt views that remain coherent when review is active

- [ ] **Step 2: Add human-readable state summary lines**

Implement:

- compact review posture summary
- task-level review lines that answer who is reviewing what and why it is blocked

- [ ] **Step 3: Re-run the reporting slice**

Run:

```bash
npm test -- --runInBand tests/ao/state-runner.test.js tests/ao/state-report.test.js tests/ao/ao-state-cli.test.js
```

Expected:
- PASS

## Chunk 6: Update Docs And Capture Operator Rehearsal

### Task 11: Update runbooks and orchestrator contract

**Files:**
- Modify: `agent-orchestrator.yaml`
- Modify: `docs/setup/AO_CONTROL_PLANE_OPERATIONS.md`
- Modify: `docs/setup/AO_CONTROLLER_RUNBOOK.md`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- Create: `docs/setup/AO_REVIEW_RUNBOOK.md`

- [ ] **Step 1: Document the independent reviewer gate as a first-class control-plane surface**

Update docs to cover:

- explicit `ready_for_review`
- read-only reviewer authority
- first-release reviewer read-only is convention-enforced, not platform-enforced
- review freeze
- hard gate before `notify_human_ready`
- operator-facing explanation fields in `ao-state`

- [ ] **Step 2: Align orchestrator guidance with the new gate**

Update `agent-orchestrator.yaml` so orchestration guidance no longer treats implementation completion as directly human-ready when review is required.

- [ ] **Step 3: Run the doc-alignment test slice**

Run:

```bash
npm test -- --runInBand tests/ao/control-plane-assist-contract.test.js tests/ao/controller-policy-gating.test.js tests/ao/ao-state-cli.test.js
```

Expected:
- PASS

### Task 12: Capture one real repo-local rehearsal

**Files:**
- Create: `docs/reports/2026-04-03-ao-reviewer-gate-rehearsal.md`

- [ ] **Step 1: Rehearse the control loop with one synthetic managed task**

Use a real repo-local task rehearsal to demonstrate:

- implementation-side `ao-review request`
- independent reviewer `claim`
- one verdict path
- `ao-state` before and after the verdict

- [ ] **Step 2: Record actual commands and actual outcomes**

The report must include:

- command sequence
- observed review posture changes
- explanation of how the gate blocked or released progression

## Chunk 7: Final Verification

### Task 13: Run the reviewer-gate verification matrix

**Files:**
- Test: `tests/ao/review-contracts.test.js`
- Test: `tests/ao/review-protocol.test.js`
- Test: `tests/ao/ao-review-cli.test.js`
- Test: `tests/ao/state-migrations.test.js`
- Test: `tests/ao/state-repository.test.js`
- Test: `tests/ao/manage-runner.test.js`
- Test: `tests/ao/controller-loop.test.js`
- Test: `tests/ao/controller-policy-gating.test.js`
- Test: `tests/ao/state-runner.test.js`
- Test: `tests/ao/state-report.test.js`
- Test: `tests/ao/ao-state-cli.test.js`
- Test: `tests/ao/ao-lifecycle-acceptance.test.js`

- [ ] **Step 1: Run the focused reviewer-gate slice**

Run:

```bash
npm test -- --runInBand tests/ao/review-contracts.test.js tests/ao/review-protocol.test.js tests/ao/ao-review-cli.test.js tests/ao/state-migrations.test.js tests/ao/state-repository.test.js tests/ao/manage-runner.test.js tests/ao/controller-loop.test.js tests/ao/controller-policy-gating.test.js tests/ao/state-runner.test.js tests/ao/state-report.test.js tests/ao/ao-state-cli.test.js tests/ao/ao-lifecycle-acceptance.test.js
```

Expected:
- PASS

- [ ] **Step 2: Run the full AO regression**

Run:

```bash
npm test -- --runInBand tests/ao
```

Expected:
- PASS

- [ ] **Step 3: Run one operator-facing smoke after docs and controller updates**

Run:

```bash
npm run ao:smoke -- --scenario approved-and-green-pr
```

Expected:
- PASS
- existing `approved-and-green-pr` smoke scenario still exists and is updated or extended to reflect review-aware release gating where applicable
