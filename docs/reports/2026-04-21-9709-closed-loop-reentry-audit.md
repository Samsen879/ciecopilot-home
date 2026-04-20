# 2026-04-21 9709 Closed-Loop Re-entry Audit

## Freeze

This document is the authoritative truth baseline for the `#258` re-entry tranche.

No new `9709` expansion, Wave B work, or broader question-bank growth should start until [`#258`](https://github.com/Samsen879/ciecopilot-home/issues/258) closes.

## Purpose

This audit reconciles the originally closed [`#227`](https://github.com/Samsen879/ciecopilot-home/issues/227)-[`#233`](https://github.com/Samsen879/ciecopilot-home/issues/233) tranche against the current repo line on `2026-04-21`, using checked-in code, checked-in reports, and fresh focused verification.

The goal is not to re-open design. The goal is to freeze what is actually evidenced now, what is only partially evidenced, and what exact runtime delta still blocks an honest `9709` closed loop.

## Current-Line Baseline

### Repo surfaces that are present now

The current line does contain several runtime files that [`#258`](https://github.com/Samsen879/ciecopilot-home/issues/258) calls out as "not visibly present":

- [`api/learning/lib/events/learning-effect-engine.js`](../../api/learning/lib/events/learning-effect-engine.js)
- [`api/learning/lib/marking/adapter-method-dispatcher.js`](../../api/learning/lib/marking/adapter-method-dispatcher.js)
- [`scripts/learning/lib/closed-loop-release-gate.js`](../../scripts/learning/lib/closed-loop-release-gate.js)
- [`scripts/learning/run_closed_loop_release_gate.js`](../../scripts/learning/run_closed_loop_release_gate.js)

The one file from that list that is still absent on the current line is:

- `api/learning/lib/orchestration/learning-runtime-state-machine.js`

Its paired planned test file is also absent:

- `api/learning/__tests__/learning-runtime-state-machine.test.js`

### Current checked-in proof surfaces

- Runtime effects base:
  [`api/learning/lib/events/learning-effect-engine.js`](../../api/learning/lib/events/learning-effect-engine.js),
  [`api/learning/lib/repositories/learning-event-effect-repository.js`](../../api/learning/lib/repositories/learning-event-effect-repository.js),
  [`supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql`](../../supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql)
- Bridge + reconciliation:
  [`api/marking/evaluate-v1.js`](../../api/marking/evaluate-v1.js),
  [`api/learning/lib/events/attempt-event-service.js`](../../api/learning/lib/events/attempt-event-service.js),
  [`api/learning/lib/reconciliation/reconciliation-service.js`](../../api/learning/lib/reconciliation/reconciliation-service.js)
- Pilot adapter runtime:
  [`api/learning/lib/marking/adapter-method-dispatcher.js`](../../api/learning/lib/marking/adapter-method-dispatcher.js),
  [`api/learning/lib/subjects/subject-adapter-registry.js`](../../api/learning/lib/subjects/subject-adapter-registry.js),
  [`docs/reports/2026-04-18-issue-230-pilot-adapter-runtime-coverage-note.md`](./2026-04-18-issue-230-pilot-adapter-runtime-coverage-note.md)
- Artifact content activation:
  [`api/learning/lib/repositories/artifact-content-repository.js`](../../api/learning/lib/repositories/artifact-content-repository.js),
  [`api/learning/lib/artifacts/artifact-service.js`](../../api/learning/lib/artifacts/artifact-service.js),
  [`supabase/migrations/20260417123000_create_learning_artifact_content_versions.sql`](../../supabase/migrations/20260417123000_create_learning_artifact_content_versions.sql)
- Scheduler and projection:
  [`api/learning/lib/review/review-scheduler-policy.js`](../../api/learning/lib/review/review-scheduler-policy.js),
  [`api/learning/lib/review/review-task-service.js`](../../api/learning/lib/review/review-task-service.js),
  [`docs/reports/2026-04-18-issue-232-scheduler-factor-coverage-report.md`](./2026-04-18-issue-232-scheduler-factor-coverage-report.md)
- Closed-loop gate:
  [`scripts/learning/lib/closed-loop-release-gate.js`](../../scripts/learning/lib/closed-loop-release-gate.js),
  [`scripts/learning/lib/browser-closed-loop-fixture.js`](../../scripts/learning/lib/browser-closed-loop-fixture.js),
  [`scripts/learning/__tests__/closed-loop-release-gate.test.js`](../../scripts/learning/__tests__/closed-loop-release-gate.test.js),
  [`docs/reports/2026-04-18-9709-closed-loop-release-gate.md`](./2026-04-18-9709-closed-loop-release-gate.md),
  [`docs/reports/2026-04-18-9709-closed-loop-release-readiness.md`](./2026-04-18-9709-closed-loop-release-readiness.md)

### Important scope distinction

Later `9709` work demonstrably shifted into question-search / Wave A execution, as recorded in [`docs/reports/2026-04-16-9709-minimal-complete-loop-current-state.md`](./2026-04-16-9709-minimal-complete-loop-current-state.md). That document is real evidence for question-search recovery, but it is not authoritative proof that the original runtime-closure tranche remained fully closed on the later repo line.

## Fresh 2026-04-21 Verification

### Environment note

The AO worktree does not contain a local `node_modules`, so the worktree-local `npm test` bootstrap path fails before product code loads. To avoid confusing environment bootstrap with product truth, the fresh verification below reused the shared root install at `/home/samsen/code/ciecopilot-home/node_modules`, matching the pattern already used in [`docs/reports/2026-04-06-learning-runtime-closeout-matrix.md`](./2026-04-06-learning-runtime-closeout-matrix.md).

### Command outcomes

1. Runtime effects + bridge + reconciliation + marking bridge

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/learning-effect-engine.test.js \
  api/learning/__tests__/attempt-event-service.test.js \
  api/learning/__tests__/reconciliation-service.test.js \
  api/marking/__tests__/evaluate-v1.test.js
```

Outcome: `PASS`

- `4` suites passed
- `49` tests passed

2. Pilot adapter runtime

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/adapter-method-dispatcher.test.js \
  api/learning/__tests__/subject-adapter-registry.test.js \
  api/marking/__tests__/rubric-resolver-v1.test.js
```

Outcome: `PASS`

- `3` suites passed
- `30` tests passed

3. Artifact content activation + workspace projection

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/artifact-content-repository.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/workspace-read-service.test.js
```

Outcome: `PASS`

- `3` suites passed
- `45` tests passed

4. Scheduler / review generation

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/review-task-service.test.js
```

Outcome: `FAIL`

- `api/learning/__tests__/review-scheduler-policy.test.js`: `PASS`
- `api/learning/__tests__/review-task-service.test.js`: `FAIL`
- failing current-line assertions:
  - `incorrect released-scoring outcomes still emit repair tasks without positive type mastery`
  - `released-scoring outcomes with conservative mapping ambiguity still emit repair tasks`
- both failures expected `release_scope_status = released_scoring` and received `non_released_fallback`
- both failures use `9709.integration.application`

5. Closed-loop release gate test

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  scripts/learning/__tests__/closed-loop-release-gate.test.js
```

Outcome: `PASS`

- `1` suite passed
- `4` tests passed

6. Closed-loop release gate runner

```bash
node scripts/learning/run_closed_loop_release_gate.js \
  --out-json tmp/closed-loop-release-gate.audit.json \
  --out-md tmp/closed-loop-release-gate.audit.md
```

Outcome: `PASS`

- wrote `tmp/closed-loop-release-gate.audit.json`
- wrote `tmp/closed-loop-release-gate.audit.md`
- receipt recorded `status = pass`
- receipt recorded `release_ready = true`
- the generated markdown repeats the existing checked-in caveat that the proof runs against an in-memory runtime harness, not a live DB-backed line

7. Explicit missing-file checks

```bash
test -f api/learning/lib/orchestration/learning-runtime-state-machine.js && echo present || echo missing
test -f api/learning/__tests__/learning-runtime-state-machine.test.js && echo present || echo missing
```

Outcome: both returned `missing`

## Reconciliation Matrix

| Issue | Status on current line | Evidence on current line | Exact remaining delta |
| --- | --- | --- | --- |
| [`#227`](https://github.com/Samsen879/ciecopilot-home/issues/227) | `partially landed` | The tracker closed on `2026-04-18`, and the child slices behind runtime effects, bridge wiring, adapter runtime, artifact content, scheduler work, and release-gate artifacts are all visible in the repo. | The tracker cannot be treated as authoritative now because `#232` is still incomplete on the current line and `#233` is too narrow to certify the whole runtime slice honestly. |
| [`#228`](https://github.com/Samsen879/ciecopilot-home/issues/228) | `landed` | Runtime effect files, receipt migration, and focused tests all exist and passed fresh verification: [`api/learning/lib/events/learning-effect-engine.js`](../../api/learning/lib/events/learning-effect-engine.js), [`api/learning/lib/repositories/learning-event-effect-repository.js`](../../api/learning/lib/repositories/learning-event-effect-repository.js), [`supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql`](../../supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql), [`api/learning/__tests__/learning-effect-engine.test.js`](../../api/learning/__tests__/learning-effect-engine.test.js). | No current re-entry work is required for the `#228` slice itself beyond carrying it forward as a dependency. |
| [`#229`](https://github.com/Samsen879/ciecopilot-home/issues/229) | `landed` | The real marking path imports and calls the bridge in [`api/marking/evaluate-v1.js`](../../api/marking/evaluate-v1.js); downstream retry and reconciliation functions exist in [`api/learning/lib/events/attempt-event-service.js`](../../api/learning/lib/events/attempt-event-service.js); focused tests passed in [`api/learning/__tests__/attempt-event-service.test.js`](../../api/learning/__tests__/attempt-event-service.test.js), [`api/learning/__tests__/reconciliation-service.test.js`](../../api/learning/__tests__/reconciliation-service.test.js), and [`api/marking/__tests__/evaluate-v1.test.js`](../../api/marking/__tests__/evaluate-v1.test.js). | No current re-entry work is required for the `#229` slice itself beyond carrying it forward as a dependency. |
| [`#230`](https://github.com/Samsen879/ciecopilot-home/issues/230) | `landed` | The dispatcher, subject adapter registry, and rubric binding path exist and passed fresh verification: [`api/learning/lib/marking/adapter-method-dispatcher.js`](../../api/learning/lib/marking/adapter-method-dispatcher.js), [`api/learning/lib/subjects/subject-adapter-registry.js`](../../api/learning/lib/subjects/subject-adapter-registry.js), [`api/marking/lib/rubric-resolver-v1.js`](../../api/marking/lib/rubric-resolver-v1.js), [`api/marking/__tests__/rubric-resolver-v1.test.js`](../../api/marking/__tests__/rubric-resolver-v1.test.js), [`api/marking/__tests__/evaluate-v1.test.js`](../../api/marking/__tests__/evaluate-v1.test.js), plus the checked-in coverage note [`docs/reports/2026-04-18-issue-230-pilot-adapter-runtime-coverage-note.md`](./2026-04-18-issue-230-pilot-adapter-runtime-coverage-note.md). | No current re-entry work is required for the `#230` slice itself beyond carrying it forward as a dependency. |
| [`#231`](https://github.com/Samsen879/ciecopilot-home/issues/231) | `landed` | Artifact content/version persistence and workspace projection are present and passed fresh verification: [`api/learning/lib/repositories/artifact-content-repository.js`](../../api/learning/lib/repositories/artifact-content-repository.js), [`api/learning/lib/artifacts/artifact-service.js`](../../api/learning/lib/artifacts/artifact-service.js), [`api/learning/lib/workspaces/workspace-read-service.js`](../../api/learning/lib/workspaces/workspace-read-service.js), [`supabase/migrations/20260417123000_create_learning_artifact_content_versions.sql`](../../supabase/migrations/20260417123000_create_learning_artifact_content_versions.sql), [`api/learning/__tests__/artifact-content-repository.test.js`](../../api/learning/__tests__/artifact-content-repository.test.js), [`api/learning/__tests__/artifact-service.test.js`](../../api/learning/__tests__/artifact-service.test.js), [`api/learning/__tests__/workspace-read-service.test.js`](../../api/learning/__tests__/workspace-read-service.test.js). | No current re-entry work is required for the `#231` slice itself beyond carrying it forward as a dependency. |
| [`#232`](https://github.com/Samsen879/ciecopilot-home/issues/232) | `partially landed` | The bounded factor model is real and the checked-in report exists: [`api/learning/lib/review/review-scheduler-policy.js`](../../api/learning/lib/review/review-scheduler-policy.js), [`docs/reports/2026-04-18-issue-232-scheduler-factor-coverage-report.md`](./2026-04-18-issue-232-scheduler-factor-coverage-report.md), [`api/learning/__tests__/review-scheduler-policy.test.js`](../../api/learning/__tests__/review-scheduler-policy.test.js). | The promised state-machine file is missing: `api/learning/lib/orchestration/learning-runtime-state-machine.js`. The promised test file is missing: `api/learning/__tests__/learning-runtime-state-machine.test.js`. The full current-line review generation surface is not green: [`api/learning/__tests__/review-task-service.test.js`](../../api/learning/__tests__/review-task-service.test.js) now fails two `9709.integration.application` released-scope repair assertions with `released_scoring -> non_released_fallback`. |
| [`#233`](https://github.com/Samsen879/ciecopilot-home/issues/233) | `partially landed` | The gate runner, fixture builder, test file, receipt/report, and fresh rerun all exist: [`scripts/learning/lib/closed-loop-release-gate.js`](../../scripts/learning/lib/closed-loop-release-gate.js), [`scripts/learning/lib/browser-closed-loop-fixture.js`](../../scripts/learning/lib/browser-closed-loop-fixture.js), [`scripts/learning/run_closed_loop_release_gate.js`](../../scripts/learning/run_closed_loop_release_gate.js), [`scripts/learning/__tests__/closed-loop-release-gate.test.js`](../../scripts/learning/__tests__/closed-loop-release-gate.test.js), [`docs/reports/2026-04-18-9709-closed-loop-release-gate.md`](./2026-04-18-9709-closed-loop-release-gate.md), [`docs/reports/2026-04-18-9709-closed-loop-release-readiness.md`](./2026-04-18-9709-closed-loop-release-readiness.md). | The current gate remains a focused in-memory proof and says so explicitly in its own residual risks. It exercises one `9709.trigonometry.equations` gold scenario, not the broader current runtime line. It does not catch the present released-scope review-task failure for `9709.integration.application`, so it cannot be treated as the authoritative final proof for an honest closed loop. |

## Exact Blocking Delta

The remaining honest re-entry delta is narrower than the original `#227-#233` tranche:

1. Runtime effects (`#228`), bridge wiring (`#229`), pilot adapter runtime (`#230`), and artifact content activation (`#231`) are all materially present and freshly verified on the current line.
2. The remaining runtime blocker is the `#232` / `#233` seam:
   - the explicit state-machine file/test promised in `#232` do not exist
   - the full review-task generation surface is not green on the current line for promoted released scope
   - the `#233` gate is too narrow to certify that remaining seam honestly

## Dependency-Ordered Re-entry Sequence

### 1. Re-enter the `#232` scheduler/runtime-state seam first

This must be first because the current line still lacks the promised explicit runtime-state-machine module and because the full review generation surface is not green.

Required re-entry targets:

- restore green behavior in [`api/learning/lib/mastery/mastery-orchestrator.js`](../../api/learning/lib/mastery/mastery-orchestrator.js) -> [`api/learning/lib/review/review-task-service.js`](../../api/learning/lib/review/review-task-service.js) for promoted released-scope repair paths
- make [`api/learning/__tests__/review-task-service.test.js`](../../api/learning/__tests__/review-task-service.test.js) fully green, including the currently failing `9709.integration.application` cases
- land the explicit runtime-state module promised by `#232`, or explicitly replace that promise with an equally strong checked-in contract and matching tests under `#258` before claiming the slice closed

### 2. Re-enter the `#233` proof surface second

Only after the `#232` seam is green should the final gate be treated as authoritative.

Required re-entry targets:

- keep the existing gate runner, but upgrade the authoritative proof surface so it certifies the real current runtime line, not only the in-memory harness
- add gate coverage that would fail if the released-scope repair regression reappears
- keep residual risks explicit instead of silently widening the claim

### 3. Re-run the final closed-loop proof and only then close `#258`

The closure package should include:

- fresh gate receipt
- fresh markdown report
- focused command outcomes
- explicit statement that the re-entry delta is closed

Until that package exists on the current line, `#258` remains open and blocks any new expansion.

## Conclusion

The old tranche was not imaginary. Most of it really did land. But it is no longer honest to treat the closed `#227-#233` tracker as sufficient authority for the present runtime line.

The current repo line says:

- `#228`: landed
- `#229`: landed
- `#230`: landed
- `#231`: landed
- `#232`: partially landed
- `#233`: partially landed
- `#227`: partially landed because its closure overstates the authority of the current line

That is the frozen truth baseline for the `#258` re-entry tranche.
