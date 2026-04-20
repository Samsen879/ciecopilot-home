# 2026-04-21 Issue 260 Runtime Effects Re-entry Verification

## Scope

Issue `#260` requires truthful reconciliation against the current repo line and
the fresh `#259` audit baseline before any new implementation work.

This report records that reconciliation for the runtime-effects core only:

- consuming persisted `LearningUpdateProposed` payloads
- materializing durable effect receipts
- preserving idempotent effect identity
- recording retry debt on partial failure

This report does not widen into request-path invocation semantics, pilot adapter
execution, scheduler redesign, artifact rendering, or the final release gate.

## Current-Line Reconciliation

The runtime-effects slice requested by `#260` is already present on `main`.

The landing commit on the current line is:

- `b7a9196` `feat(learning): materialize LearningUpdateProposed receipts (#234)`

The current-line proof surfaces for this slice are:

- `api/learning/lib/events/learning-effect-engine.js`
- `api/learning/lib/repositories/learning-event-effect-repository.js`
- `api/learning/lib/events/event-service.js`
- `api/learning/lib/events/attempt-event-service.js`
- `supabase/migrations/20260417120000_create_learning_runtime_effect_receipts.sql`
- `api/learning/__tests__/learning-effect-engine.test.js`
- `api/learning/__tests__/event-service.test.js`
- `api/learning/__tests__/attempt-event-service.test.js`
- `api/learning/__tests__/schema-contract.test.js`

The fresh `#259` re-entry audit on PR `#266` classifies the corresponding
runtime-effects slice as `landed` and does not name any remaining delta inside
this effect-engine core. The remaining honest blocker seam is currently in the
`#232` / `#233` surfaces, not here.

## Environment Note

The AO worktree does not contain a local `node_modules`, so worktree-local
`npm test` fails before product code loads.

Fresh verification therefore reused the shared root install at:

- `/home/samsen/code/ciecopilot-home/node_modules`

This is the same bootstrap pattern documented in the `#259` audit baseline.

## Fresh Verification

Command run from the AO task worktree:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/learning-effect-engine.test.js \
  api/learning/__tests__/event-service.test.js \
  api/learning/__tests__/attempt-event-service.test.js \
  api/learning/__tests__/schema-contract.test.js \
  --verbose
```

Observed result:

- `PASS`
- `4` suites passed
- `33` tests passed

## What The Passing Proof Covers

`api/learning/__tests__/learning-effect-engine.test.js` proves:

- a persisted `LearningUpdateProposed` payload can drive mastery, review-task,
  and artifact materialization
- re-running the same proposal converges on stored durable receipts instead of
  duplicating downstream writes
- later truth revisions execute as new effect identities instead of colliding
  with prior receipts
- partial failure keeps successful receipts persisted while failed work records
  retry debt
- review-task domain status does not corrupt the effect-receipt status enum

`api/learning/__tests__/event-service.test.js` proves:

- effect-key replay stays idempotent in the event-side effect ledger
- delivery rows expose durable retry metadata
- reconciliation can move delivery rows into terminal
  `reconciled` / `needs_manual_review` outcomes without losing receipt state

`api/learning/__tests__/attempt-event-service.test.js` proves:

- the persisted bridge path stores normalized `LearningUpdateProposed` payloads
  with stable effect keys
- downstream effects only execute after persistence succeeds
- retrying failed downstream receipts can reload the persisted proposal event
  and converge to durable success without duplicating already-persisted effects

`api/learning/__tests__/schema-contract.test.js` proves:

- the receipt migration adds `proposal_key`
- receipt rows track `receipt_state`, `retry_count`, `last_attempted_at`,
  `last_error`, and `completed_at`
- retry-attention indexes exist for durable debt scanning

## Conclusion

Issue `#260` is already materially landed on the current repo line.

The honest closeout for this issue is evidence-first reporting, not new runtime
effect-engine code. The remaining re-entry work stays outside this slice:

- `#232` still has the missing runtime-state-machine module/test and a current
  released-scope review-task failure
- `#233` still needs a stronger authoritative proof surface for the real line

This report should be used as the checked-in closeout record for `#260`.
