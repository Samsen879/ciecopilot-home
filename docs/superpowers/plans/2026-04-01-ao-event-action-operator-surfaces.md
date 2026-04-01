# AO Event And Action Operator Surfaces Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add operator-visible AO event/action inspection surfaces plus durable replay governance and action backpressure so repeated CI/review/comment observations do not create unbounded churn.

**Architecture:** Keep the existing durable control-plane state as the canonical source, but enrich delivery events, controller cursors, and actions with typed governance and lineage metadata. Use that metadata inside the controller loop to suppress duplicate action churn on the same PR head, surface the state through `ao-state`, and add focused `ao-events` / `ao-actions` inspection CLIs for operators.

**Tech Stack:** Node.js ESM, Jest, repo-local AO control-plane JSON state, existing AO CLI/reporting patterns.

---

## Chunk 1: Red Tests

### Task 1: Event governance and cursor replay tests

**Files:**
- Modify: `tests/ao/event-ingest.test.js`
- Modify: `tests/ao/state-repository.test.js`

- [ ] Add failing expectations that delivery events and controller cursors persist governance metadata, replay keys, and lineage-friendly fields.
- [ ] Add a failing replay case where the same cursor/event is observed repeatedly and the durable governance counters reflect replay/backpressure rather than creating unbounded new records.
- [ ] Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/ao/event-ingest.test.js tests/ao/state-repository.test.js`

### Task 2: Controller loop flapping suppression tests

**Files:**
- Modify: `tests/ao/controller-loop.test.js`

- [ ] Add a failing test that repeated CI/review flapping on the same head does not create unbounded duplicate actions.
- [ ] Add failing expectations for action lineage, replay counts, and suppressed/backpressured action governance.
- [ ] Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/ao/controller-loop.test.js`

### Task 3: Operator surface tests

**Files:**
- Modify: `tests/ao/ao-state-cli.test.js`
- Modify: `tests/ao/ao-metrics-cli.test.js`

- [ ] Add failing expectations for richer event/action visibility in the state surface and replay/backpressure summaries in metrics output.
- [ ] Keep the tests CLI-focused by asserting the report handoff/summary contract instead of raw terminal text formatting minutiae.
- [ ] Run: `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/ao/ao-state-cli.test.js tests/ao/ao-metrics-cli.test.js`

## Chunk 2: Governance Model

### Task 4: Add durable governance and lineage contracts

**Files:**
- Modify: `scripts/ao/lib/state-contracts.js`
- Modify: `scripts/ao/lib/state-migrations.js`

- [ ] Introduce typed governance metadata for delivery events, controller cursors, and actions.
- [ ] Introduce typed action lineage metadata so actions can point back to source events/cursors/derived trigger state.
- [ ] Add a new migration that backfills the governance metadata on older control-plane state.

### Task 5: Add repository helpers for governance updates

**Files:**
- Modify: `scripts/ao/lib/state-repository.js`

- [ ] Add helpers to apply replay/backpressure decisions durably on events, cursors, and actions without duplicating mutation logic in the controller or ingest layers.
- [ ] Ensure each replay/suppression decision is auditable through explicit audit entries.

## Chunk 3: Runtime Behavior

### Task 6: Persist event governance during ingest

**Files:**
- Modify: `scripts/ao/lib/event-ingest.js`

- [ ] Seed governance metadata on new delivery events and controller cursors.
- [ ] On duplicate cursors or duplicate delivery events, update the governance counters instead of creating new records.

### Task 7: Add action replay governance and backpressure

**Files:**
- Modify: `scripts/ao/lib/controller-loop.js`

- [ ] Derive stable action replay keys per task/pr/action kind/current head so repeated flapping reuses governance state.
- [ ] Persist action lineage from current delivery events/cursors/observations.
- [ ] Suppress repeated action churn after the bounded replay budget is exhausted while keeping the decision durable and auditable.

## Chunk 4: Operator Surfaces

### Task 8: Extend AO state and metrics reports

**Files:**
- Modify: `scripts/ao/lib/state-runner.js`
- Modify: `scripts/ao-state.js`
- Modify: `scripts/ao-metrics.js`

- [ ] Extend the state report with first-class event/action inspection summaries, recent records, and governance/backpressure counts.
- [ ] Extend the metrics surface with replay/backpressure visibility relevant to CI/review/comment flapping.

### Task 9: Add dedicated event and action CLIs

**Files:**
- Create: `scripts/ao-events.js`
- Create: `scripts/ao-actions.js`

- [ ] Add focused inspection CLIs that expose recent durable events and actions without making operators read raw JSON files.
- [ ] Keep their argument parsing aligned with the existing AO CLI style.

### Task 10: Document operator replay policy

**Files:**
- Create: `docs/setup/AO_EVENT_REPLAY_RUNBOOK.md`

- [ ] Document the bounded replay semantics, backpressure behavior, and how operators should inspect the new event/action surfaces.

## Chunk 5: Verification And Delivery

### Task 11: Run targeted verification

**Files:**
- Modify: `tests/ao/event-ingest.test.js`
- Modify: `tests/ao/controller-loop.test.js`
- Modify: `tests/ao/state-repository.test.js`
- Modify: `tests/ao/ao-state-cli.test.js`
- Modify: `tests/ao/ao-metrics-cli.test.js`

- [ ] Run the issue verification command exactly:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --runTestsByPath tests/ao/event-ingest.test.js tests/ao/controller-loop.test.js tests/ao/state-repository.test.js tests/ao/ao-state-cli.test.js tests/ao/ao-metrics-cli.test.js
```

- [ ] If broader AO contract tests fail because of the migration/version bump, run the affected focused suites and fix them before delivery.

### Task 12: Commit and PR

**Files:**
- Modify: repo git history only

- [ ] Commit with a conventional message, for example: `feat(ao): add event and action operator governance`
- [ ] Push `feat/128`
- [ ] Open a PR against `ao/mainline` that says `Closes #128` and includes the exact verification command plus its outcome.
