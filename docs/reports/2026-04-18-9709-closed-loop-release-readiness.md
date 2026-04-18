# 2026-04-18 9709 Closed-Loop Release Readiness

## Scope

This report records the final release-gate slice for issue `#233`.

The implementation stays inside the approved boundary:

- add one reusable gold `9709` closed-loop fixture
- prove request intake, marking, attempt-event persistence, downstream materialization, scheduler output, and workspace artifact projection in one machine-readable gate
- surface only the rollout flags needed to keep the `9709` slice gated
- record degraded-path retry debt explicitly instead of hiding it

This slice does not make the runtime default-on and does not widen into browser-flow redesign, graph expansion, or second-subject rollout.

## Delivered Outputs

- Reusable fixture seed:
  `data/learning_runtime/fixtures/9709-browser-closed-loop-gold.v1.json`
- Machine-readable gate receipt:
  `data/learning_runtime/release_evidence/9709-closed-loop-release-gate-receipt.v1.json`
- Gate markdown output:
  `docs/reports/2026-04-18-9709-closed-loop-release-gate.md`

The receipt passed with:

- `status = pass`
- `release_ready = true`
- `feature_flags.learning_runtime_enabled = true`
- `feature_flags.learning_runtime_9709_enabled = true`
- gold-path gates green for `request_intake`, `marking`, `attempt_event_persistence`, `downstream_materialization`, `scheduler_output`, and `workspace_projection`
- degraded path recorded as `debt_recorded` with `failed_handlers = review_tasks`

## Commands And Outcomes

1. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand scripts/learning/__tests__/closed-loop-release-gate.test.js api/learning/__tests__/session-api.test.js src/api/__tests__/learningRuntimeApi.test.js`
   Outcome: `PASS` for all 3 suites, `41 passed, 41 total`

2. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/review-task-service.test.js api/learning/__tests__/attempt-event-service.test.js api/learning/__tests__/workspace-read-service.test.js -t "marking effect -> review task -> workspace projection -> artifact patch keeps lifecycle and ownership consistent|review task service|attempt-event-service"`
   Outcome: `PASS` for all 3 suites, `25 passed, 22 skipped, 47 total`

3. `node scripts/learning/seed_browser_closed_loop_fixture.js`
   Outcome: wrote `data/learning_runtime/fixtures/9709-browser-closed-loop-gold.v1.json`

4. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node scripts/learning/run_closed_loop_release_gate.js`
   Outcome: wrote `data/learning_runtime/release_evidence/9709-closed-loop-release-gate-receipt.v1.json` and `docs/reports/2026-04-18-9709-closed-loop-release-gate.md`; receipt recorded `status = pass` and `release_ready = true`

## Residual Risks

- The gate proves one gold `9709.trigonometry.equations` scenario. It is explicit release evidence for the flagged slice, not blanket proof for every future `9709` question type or every environment permutation.
- Degraded-path effect debt is intentionally still present. The gate proves that retry debt is surfaced as machine-readable evidence instead of being hidden, but it does not implement automatic debt recovery.
- The fixture is an in-memory runtime proof over the real session, event-bridge, review-task, artifact, and workspace services. Final merge authority still depends on live GitHub checks and review state.

## Tracker Note

If this PR merges with green required checks and no unresolved review blockers, tracker `#227` can be closed afterward.
It should remain open until this issue lands on `main`.
