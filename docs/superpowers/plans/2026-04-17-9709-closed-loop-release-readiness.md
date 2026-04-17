# 9709 Closed-Loop Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a feature-flagged, gate-backed `9709` single-subject closed loop that is ready to release after `#211-#218` are complete.

**Architecture:** Start from the assumed-complete attempt-event bridge and close the remaining runtime gap by making `LearningUpdateProposed` drive real idempotent downstream effects, then connect pilot `adapter_method` execution, artifact content materialization, and a bounded P1-style scheduler upgrade. Finish with one closed-loop release gate and rollout package that proves the whole `9709` loop is shippable behind flags.

**Tech Stack:** Node learning API/services, Supabase SQL migrations, Jest, existing runtime repositories, existing release/gate scripts, browser closed-loop fixtures where already available.

---

## Read This First

Before implementing, read:

- `docs/superpowers/specs/2026-04-17-9709-closed-loop-release-readiness-design.md`
- `docs/reports/2026-04-11-ao-next-phase-execution-roadmap.md`
- `docs/reports/2026-04-16-ao-execution-decision-alignment.md`
- `docs/reports/2026-04-16-ao-issue-slice-round1.md`
- `docs/reports/2026-04-14-phase-a-reassessment-report.md`

Assumptions for this plan:

- `#211-#218` are already merged and gated
- graph / explainability expansion / second-subject rollout remain out of scope
- the end-state is `flagged + release-ready`, not default-on

## File Structure

### Existing Files To Extend

- `api/learning/lib/events/attempt-event-service.js`
  - assumed bridge entry point after `#211/#212`
- `api/learning/lib/events/event-service.js`
  - in-memory ordering / validation / pipeline-state source
- `api/learning/lib/events/event-contract.js`
  - canonical event types and stage ordering
- `api/learning/lib/mastery/mastery-orchestrator.js`
  - authoritative/conservative mastery mutation surface
- `api/learning/lib/review/review-task-service.js`
  - durable review task write surface
- `api/learning/lib/review/review-scheduler-policy.js`
  - current simplified scheduler that must be upgraded
- `api/learning/lib/artifacts/artifact-service.js`
  - lifecycle/residency-aware artifact write surface
- `api/learning/lib/repositories/artifact-repository.js`
  - artifact persistence layer
- `api/learning/lib/repositories/review-task-repository.js`
  - review persistence layer
- `api/learning/lib/repositories/workspace-repository.js`
  - workspace/read projection compatibility
- `api/marking/evaluate-v1.js`
  - request-path marking/orchestration entry point
- `api/marking/lib/rubric-resolver-v1.js`
  - rubric lookup path that must connect to executable pilot templates
- `api/learning/lib/marking/adapter-method-dispatcher.js`
  - existing narrow dispatcher skeleton
- `api/learning/lib/subjects/subject-adapter-registry.js`
  - runtime capability boundary for `9709`
- `api/learning/lib/session-runtime/session-service.js`
  - feature-flag exposure and minimal runtime state surfacing
- `src/components/learning-runtime/view-models/workspace-view-model.js`
  - current workspace projection contract, including `missing_artifact_content`
- `scripts/learning/lib/event-pipeline-gate.js`
  - existing event-pipeline gate surface
- `scripts/learning/lib/browser-closed-loop-fixture.js`
  - existing browser closed-loop fixture helper

### New Files To Create

- `api/learning/lib/events/learning-effect-engine.js`
  - idempotent downstream effect materialization from `LearningUpdateProposed`
- `api/learning/lib/repositories/learning-event-effect-repository.js`
  - persistence wrapper for effect receipts / retries / debt
- `api/learning/lib/repositories/artifact-content-repository.js`
  - body/version/rendered artifact content persistence
- `api/learning/lib/orchestration/learning-runtime-state-machine.js`
  - bounded `phase + mode` runtime state for this stage
- `api/learning/__tests__/learning-effect-engine.test.js`
- `api/learning/__tests__/artifact-content-repository.test.js`
- `api/learning/__tests__/learning-runtime-state-machine.test.js`
- `scripts/learning/lib/closed-loop-release-gate.js`
- `scripts/learning/run_closed_loop_release_gate.js`
- `scripts/learning/__tests__/closed-loop-release-gate.test.js`
- `docs/reports/2026-04-17-9709-closed-loop-release-readiness-report.md`
- `supabase/migrations/20260417090000_create_learning_runtime_effect_receipts.sql`
- `supabase/migrations/20260417093000_create_learning_artifact_content_versions.sql`

### Explicitly Out Of Scope

- `api/learning/lib/graph/*`
- new `9702` / `9231` runtime wiring
- broad frontend redesign under `src/pages/`
- graph-driven recommendation / mastery inflation

## Chunk 1: Runtime Effects Base

### Task 1: Add the failing downstream effect-engine tests

**Files:**
- Create: `api/learning/__tests__/learning-effect-engine.test.js`
- Modify: `api/learning/__tests__/attempt-event-service.test.js`
- Reference: `api/learning/lib/events/attempt-event-service.js`
- Reference: `api/learning/lib/mastery/mastery-orchestrator.js`
- Reference: `api/learning/lib/review/review-task-service.js`
- Reference: `api/learning/lib/artifacts/artifact-service.js`

- [ ] **Step 1: Write the failing happy-path effect-materialization test**
  - Assert that a persisted `LearningUpdateProposed` payload can drive:
    - mastery write requests
    - review task write requests
    - artifact candidate write requests
  - Keep the fixture limited to one approved `9709` pilot question type.

- [ ] **Step 2: Write the failing idempotency test**
  - Re-run the same effect proposal twice.
  - Assert that downstream writes are deduped by persisted receipt state rather than duplicated by re-entry.

- [ ] **Step 3: Write the failing partial-failure debt test**
  - Force one downstream handler to throw.
  - Assert that:
    - successful handlers still record completion
    - the failed handler records retry/debt state
    - no silent success is reported

- [ ] **Step 4: Run the new focused Jest file and confirm failure**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/learning-effect-engine.test.js
```

Expected:
- FAIL with module-not-found or missing export errors for the new effect engine.

- [ ] **Step 5: Commit the failing-test slice**

```bash
git add api/learning/__tests__/learning-effect-engine.test.js api/learning/__tests__/attempt-event-service.test.js
git commit -m "test: add learning effect engine contract coverage"
```

### Task 2: Implement the effect engine and persisted effect receipts

**Files:**
- Create: `api/learning/lib/events/learning-effect-engine.js`
- Create: `api/learning/lib/repositories/learning-event-effect-repository.js`
- Create: `supabase/migrations/20260417090000_create_learning_runtime_effect_receipts.sql`
- Modify: `api/learning/lib/events/attempt-event-service.js`
- Modify: `api/learning/lib/mastery/mastery-orchestrator.js`
- Modify: `api/learning/lib/review/review-task-service.js`
- Modify: `api/learning/lib/artifacts/artifact-service.js`
- Test: `api/learning/__tests__/learning-effect-engine.test.js`

- [ ] **Step 1: Add the receipt repository for effect execution state**
  - Persist at least:
    - effect key
    - handler name
    - status
    - retry count
    - last error
    - last attempted at

- [ ] **Step 2: Implement `applyLearningUpdateProposal()` in the new effect engine**
  - Consume one normalized proposal payload.
  - Call mastery/review/artifact handlers through one orchestrated entry point.
  - Record per-handler receipts.

- [ ] **Step 3: Add dedupe and replay guards**
  - Deduplicate by stable proposal/effect identity.
  - Make repeat execution converge to the same stored outcome instead of duplicating writes.

- [ ] **Step 4: Re-run the focused Jest file and confirm green**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/learning-effect-engine.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the effect-engine slice**

```bash
git add api/learning/lib/events/learning-effect-engine.js \
  api/learning/lib/repositories/learning-event-effect-repository.js \
  api/learning/lib/events/attempt-event-service.js \
  api/learning/lib/mastery/mastery-orchestrator.js \
  api/learning/lib/review/review-task-service.js \
  api/learning/lib/artifacts/artifact-service.js \
  supabase/migrations/20260417090000_create_learning_runtime_effect_receipts.sql \
  api/learning/__tests__/learning-effect-engine.test.js
git commit -m "feat: materialize learning update effects with receipts"
```

## Chunk 2: Request-Path And Reconciliation Wiring

### Task 3: Wire effect execution into the bridge path without breaking best-effort response rules

**Files:**
- Modify: `api/marking/evaluate-v1.js`
- Modify: `api/learning/lib/events/attempt-event-service.js`
- Modify: `api/marking/__tests__/evaluate-v1.test.js`
- Modify: `api/learning/__tests__/attempt-event-service.test.js`
- Reference: `docs/reports/2026-04-16-ao-execution-decision-alignment.md`

- [ ] **Step 1: Add the failing `evaluate-v1` integration test for downstream effect invocation**
  - Assert that the bridge path triggers effect execution only after the first four events persist cleanly.

- [ ] **Step 2: Add the failing non-blocking partial-failure test**
  - Force downstream effect execution to fail after event persistence.
  - Assert that the API still returns success for the scoring path while surfacing effect debt.

- [ ] **Step 3: Wire the effect engine into the bridge path**
  - Keep bridge semantics best-effort.
  - Do not regress the request-path success posture defined in the decision freeze.

- [ ] **Step 4: Add or extend a reconciliation entry point if synchronous effect execution leaves debt rows**
  - Prefer a narrow, deterministic retry entry instead of ad hoc logging.

- [ ] **Step 5: Re-run the targeted tests and confirm green**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/marking/__tests__/evaluate-v1.test.js \
  api/learning/__tests__/attempt-event-service.test.js
```

Expected:
- PASS

- [ ] **Step 6: Commit the wiring slice**

```bash
git add api/marking/evaluate-v1.js api/marking/__tests__/evaluate-v1.test.js \
  api/learning/lib/events/attempt-event-service.js api/learning/__tests__/attempt-event-service.test.js
git commit -m "feat: wire downstream effect execution into runtime bridge"
```

## Chunk 3: 9709 Adapter Runtime Execution

### Task 4: Add failing dispatcher and pilot-runtime tests

**Files:**
- Modify: `api/learning/lib/marking/adapter-method-dispatcher.js`
- Modify: `api/marking/__tests__/rubric-resolver-v1.test.js`
- Modify: `api/marking/__tests__/evaluate-v1.test.js`
- Reference: `data/learning_runtime/pilot_rubrics/*.json`

- [ ] **Step 1: Add the failing dispatcher coverage for the pilot `adapter_method` set**
  - Cover only methods actually used by the 4 approved `9709` pilot families.

- [ ] **Step 2: Add the failing integration test that proves a pilot rubric template is not only schema-valid but runtime-executable**
  - Assert dispatch selection from the rubric template into the marking path.

- [ ] **Step 3: Run the targeted tests and confirm failure**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/marking/__tests__/rubric-resolver-v1.test.js \
  api/marking/__tests__/evaluate-v1.test.js
```

Expected:
- FAIL because the dispatcher skeleton is still too narrow or not integrated.

- [ ] **Step 4: Commit the failing-test slice**

```bash
git add api/learning/lib/marking/adapter-method-dispatcher.js \
  api/marking/__tests__/rubric-resolver-v1.test.js \
  api/marking/__tests__/evaluate-v1.test.js
git commit -m "test: cover pilot adapter method runtime execution"
```

### Task 5: Implement pilot `adapter_method` execution and bind it into marking

**Files:**
- Modify: `api/learning/lib/marking/adapter-method-dispatcher.js`
- Modify: `api/marking/lib/rubric-resolver-v1.js`
- Modify: `api/marking/evaluate-v1.js`
- Modify: `api/learning/lib/subjects/subject-adapter-registry.js`
- Test: `api/marking/__tests__/rubric-resolver-v1.test.js`
- Test: `api/marking/__tests__/evaluate-v1.test.js`

- [ ] **Step 1: Expand the dispatcher only for the approved pilot execution paths**
  - Do not introduce a speculative universal adapter abstraction.

- [ ] **Step 2: Bind rubric-template adapter metadata into the runtime marking path**
  - Ensure resolved templates can choose the correct handler deterministically.

- [ ] **Step 3: Keep authoritative vs conservative posture explicit**
  - Runtime execution must still honor the released-scope and confidence constraints already frozen.

- [ ] **Step 4: Re-run the targeted tests and confirm green**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/marking/__tests__/rubric-resolver-v1.test.js \
  api/marking/__tests__/evaluate-v1.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the adapter-execution slice**

```bash
git add api/learning/lib/marking/adapter-method-dispatcher.js \
  api/marking/lib/rubric-resolver-v1.js api/marking/evaluate-v1.js \
  api/learning/lib/subjects/subject-adapter-registry.js \
  api/marking/__tests__/rubric-resolver-v1.test.js \
  api/marking/__tests__/evaluate-v1.test.js
git commit -m "feat: execute pilot adapter methods in 9709 marking runtime"
```

## Chunk 4: Artifact Content Activation

### Task 6: Add failing schema/repository tests for artifact body and version storage

**Files:**
- Create: `api/learning/__tests__/artifact-content-repository.test.js`
- Modify: `api/learning/__tests__/artifact-service.test.js`
- Modify: `api/learning/__tests__/workspace-read-service.test.js`
- Modify: `src/components/learning-runtime/__tests__/workspace-contract-boundary.test.js`
- Reference: `src/components/learning-runtime/view-models/workspace-view-model.js`

- [ ] **Step 1: Write the failing repository test for artifact body/version persistence**
  - Assert one primary current version and historical lineage preservation.

- [ ] **Step 2: Write the failing service test for candidate artifact materialization**
  - Assert that runtime-generated artifact candidates can persist body/version content.

- [ ] **Step 3: Write the failing workspace/read-model test**
  - Assert that a verified/released pilot artifact renders content instead of staying in `missing_artifact_content`.

- [ ] **Step 4: Run the focused tests and confirm failure**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  src/components/learning-runtime/__tests__/workspace-contract-boundary.test.js
```

Expected:
- FAIL with missing repository/module behavior.

- [ ] **Step 5: Commit the failing-test slice**

```bash
git add api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  src/components/learning-runtime/__tests__/workspace-contract-boundary.test.js
git commit -m "test: cover artifact content and version persistence"
```

### Task 7: Implement artifact content/version persistence and runtime materialization

**Files:**
- Create: `api/learning/lib/repositories/artifact-content-repository.js`
- Create: `supabase/migrations/20260417093000_create_learning_artifact_content_versions.sql`
- Modify: `api/learning/lib/artifacts/artifact-service.js`
- Modify: `api/learning/lib/repositories/artifact-repository.js`
- Modify: `api/learning/lib/repositories/workspace-repository.js`
- Modify: `src/components/learning-runtime/view-models/workspace-view-model.js`
- Test: `api/learning/__tests__/artifact-content-repository.test.js`

- [ ] **Step 1: Add body/version schema for learning artifacts**
  - Store content separately from lifecycle metadata.
  - Preserve a stable current version plus historical lineage.

- [ ] **Step 2: Extend artifact service/repository behavior**
  - Materialize candidate artifact content from the runtime effect engine.
  - Preserve compatibility with lifecycle/residency semantics assumed complete from `#214/#215`.

- [ ] **Step 3: Update workspace projection compatibility**
  - Ensure pilot slots resolve renderable content once the artifact is resident-eligible.

- [ ] **Step 4: Re-run the focused tests and confirm green**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  src/components/learning-runtime/__tests__/workspace-contract-boundary.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the artifact-content slice**

```bash
git add api/learning/lib/repositories/artifact-content-repository.js \
  supabase/migrations/20260417093000_create_learning_artifact_content_versions.sql \
  api/learning/lib/artifacts/artifact-service.js \
  api/learning/lib/repositories/artifact-repository.js \
  api/learning/lib/repositories/workspace-repository.js \
  src/components/learning-runtime/view-models/workspace-view-model.js \
  api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  src/components/learning-runtime/__tests__/workspace-contract-boundary.test.js
git commit -m "feat: activate artifact content and versioned workspace projection"
```

## Chunk 5: Scheduler Core Upgrade And Minimal Orchestration

### Task 8: Add failing P1-factor scheduler tests

**Files:**
- Modify: `api/learning/__tests__/review-scheduler-policy.test.js`
- Modify: `api/learning/__tests__/review-task-service.test.js`
- Create: `api/learning/__tests__/learning-runtime-state-machine.test.js`
- Reference: `api/learning/lib/review/review-scheduler-policy.js`

- [ ] **Step 1: Add the failing scheduler ranking fixtures**
  - Cover at least:
    - freshness
    - overdue pressure
    - trigger urgency
    - regression severity
    - exam proximity

- [ ] **Step 2: Add the failing active-task dedupe fixture**
  - Assert one active durable task per stable target identity under the new factor model.

- [ ] **Step 3: Add the failing minimal state-machine test**
  - Cover only the bounded path needed for this stage:
    - `MARKING`
    - `LEARNING_UPDATE`
    - `REVIEW_READY`

- [ ] **Step 4: Run the focused tests and confirm failure**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/learning-runtime-state-machine.test.js
```

Expected:
- FAIL because the current scheduler is still route-weight-based and the state machine does not exist.

- [ ] **Step 5: Commit the failing-test slice**

```bash
git add api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/learning-runtime-state-machine.test.js
git commit -m "test: cover bounded P1 scheduler and runtime state transitions"
```

### Task 9: Implement the bounded scheduler-core upgrade

**Files:**
- Create: `api/learning/lib/orchestration/learning-runtime-state-machine.js`
- Modify: `api/learning/lib/review/review-scheduler-policy.js`
- Modify: `api/learning/lib/review/review-task-service.js`
- Modify: `api/learning/lib/session-runtime/session-service.js`
- Test: `api/learning/__tests__/review-scheduler-policy.test.js`
- Test: `api/learning/__tests__/review-task-service.test.js`
- Test: `api/learning/__tests__/learning-runtime-state-machine.test.js`

- [ ] **Step 1: Replace the real scheduler baseline for the `9709` release slice**
  - Keep compatibility mapping only where necessary.
  - Do not leave route-weight heuristics as the real decision engine.

- [ ] **Step 2: Implement the minimal runtime state machine**
  - Only the states required to support this stage's closed loop.

- [ ] **Step 3: Bind review generation to the new factor model and stable target identity**
  - Preserve lineage/dedupe contracts already assumed complete from `#216/#217`.

- [ ] **Step 4: Re-run the focused tests and confirm green**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/learning-runtime-state-machine.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the scheduler/orchestration slice**

```bash
git add api/learning/lib/orchestration/learning-runtime-state-machine.js \
  api/learning/lib/review/review-scheduler-policy.js \
  api/learning/lib/review/review-task-service.js \
  api/learning/lib/session-runtime/session-service.js \
  api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/learning-runtime-state-machine.test.js
git commit -m "feat: upgrade 9709 scheduler core and bounded runtime orchestration"
```

## Chunk 6: Closed-Loop Gate And Rollout Package

### Task 10: Add the failing closed-loop release gate

**Files:**
- Create: `scripts/learning/lib/closed-loop-release-gate.js`
- Create: `scripts/learning/run_closed_loop_release_gate.js`
- Create: `scripts/learning/__tests__/closed-loop-release-gate.test.js`
- Modify: `scripts/learning/lib/browser-closed-loop-fixture.js`
- Modify: `scripts/learning/seed_browser_closed_loop_fixture.js`
- Reference: `scripts/learning/run_event_pipeline_gate.js`

- [ ] **Step 1: Add the failing gate fixture for one gold `9709` scenario**
  - Cover:
    - attempt intake
    - marking
    - attempt event flow
    - downstream effects
    - review output
    - workspace artifact projection

- [ ] **Step 2: Add the failing degraded-path assertion**
  - Force one retry/debt case and ensure the gate reports it explicitly rather than hiding it.

- [ ] **Step 3: Run the new gate test and confirm failure**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  scripts/learning/__tests__/closed-loop-release-gate.test.js
```

Expected:
- FAIL because the gate runner does not exist yet.

- [ ] **Step 4: Commit the failing gate slice**

```bash
git add scripts/learning/lib/closed-loop-release-gate.js \
  scripts/learning/run_closed_loop_release_gate.js \
  scripts/learning/__tests__/closed-loop-release-gate.test.js \
  scripts/learning/lib/browser-closed-loop-fixture.js \
  scripts/learning/seed_browser_closed_loop_fixture.js
git commit -m "test: add closed-loop release gate contract"
```

### Task 11: Implement the gate, rollout flags, and release report

**Files:**
- Modify: `scripts/learning/lib/closed-loop-release-gate.js`
- Modify: `scripts/learning/run_closed_loop_release_gate.js`
- Modify: `api/learning/lib/session-runtime/session-service.js`
- Modify: `src/api/__tests__/learningRuntimeApi.test.js`
- Create: `docs/reports/2026-04-17-9709-closed-loop-release-readiness-report.md`
- Test: `scripts/learning/__tests__/closed-loop-release-gate.test.js`

- [ ] **Step 1: Implement the gate runner**
  - Emit pass/fail plus residual-risk details.
  - Keep the output deterministic and machine-readable.

- [ ] **Step 2: Surface the new release-readiness flags in the runtime/session response**
  - Expose only the flags needed to keep the loop gated.

- [ ] **Step 3: Write the phase report**
  - Record exact commands
  - actual outcomes
  - residual risks
  - why the slice is `flag-ready` instead of default-on

- [ ] **Step 4: Re-run the gate tests and confirm green**

Run:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  scripts/learning/__tests__/closed-loop-release-gate.test.js \
  src/api/__tests__/learningRuntimeApi.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the rollout package**

```bash
git add scripts/learning/lib/closed-loop-release-gate.js \
  scripts/learning/run_closed_loop_release_gate.js \
  api/learning/lib/session-runtime/session-service.js \
  src/api/__tests__/learningRuntimeApi.test.js \
  docs/reports/2026-04-17-9709-closed-loop-release-readiness-report.md
git commit -m "feat: add 9709 closed-loop release gate and rollout package"
```

## Focused Verification

After all chunks are merged into the task branch, run the full focused slice:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/attempt-event-service.test.js \
  api/learning/__tests__/learning-effect-engine.test.js \
  api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/learning-runtime-state-machine.test.js \
  api/marking/__tests__/rubric-resolver-v1.test.js \
  api/marking/__tests__/evaluate-v1.test.js \
  scripts/learning/__tests__/event-pipeline-gate.test.js \
  scripts/learning/__tests__/closed-loop-release-gate.test.js \
  src/components/learning-runtime/__tests__/workspace-contract-boundary.test.js
```

Expected:
- PASS

Then run the gate itself:

```bash
node scripts/learning/run_closed_loop_release_gate.js
```

Expected:
- PASS with machine-readable output and a residual-risk summary.

Finally, run diff hygiene:

```bash
git diff --check
```

Expected:
- PASS with no whitespace or patch-format errors.

## Acceptance Boundary

This implementation plan is complete when:

- `LearningUpdateProposed` drives real downstream materialization
- pilot `9709` rubric templates are runtime-executable
- pilot artifacts are renderable/versioned instead of metadata-only
- the `9709` review loop uses the bounded factor scheduler
- one explicit release gate proves the end-to-end loop is shippable behind flags

## Final Interpretation

This stage should be read as:

- not a generic runtime rewrite
- not a Phase D/E preview
- not a pure frontend milestone

It is the smallest next stage that turns the existing frozen contracts into one auditable `9709` release-ready loop.
