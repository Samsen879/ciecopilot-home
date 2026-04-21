# 2026-04-21 Issue 261 Runtime Bridge Re-entry Verification

## Scope

Issue `#261` must be reconciled against the fresh `#259` truth audit and the
`#260` runtime-effects closeout before claiming any remaining bridge work.

This report records the narrow bridge delta only:

- invoke downstream effects only after attempt-event persistence succeeds
- preserve the `evaluate-v1` best-effort success contract for student-visible
  scoring responses
- surface durable retry debt and reconciliation state on the bridge delivery
  row instead of hiding it only inside effect receipts or response payloads
- keep downstream retry deterministic from the persisted
  `LearningUpdateProposed` event

This report does not widen into scheduler redesign, adapter-runtime redesign,
artifact rendering behavior, or the broader `#232` / `#233` surfaces.

## Baseline Reconciliation

The fresh `#259` audit and the `#260` closeout already prove that the
runtime-effects core was materially landed before this branch:

- durable effect receipts already exist on the repo line
- persisted `LearningUpdateProposed` payloads already exist on the bridge path
- the real marking/runtime path already invokes `persistAttemptEventBridge`
  behind the runtime bridge flag
- deterministic downstream effect replay already exists through
  `reconcileAttemptEventBridgeEffects`

Current-line proof surfaces already present before this branch:

- `api/marking/evaluate-v1.js`
- `api/learning/lib/events/attempt-event-service.js`
- `api/learning/lib/events/learning-effect-engine.js`
- `api/learning/lib/repositories/learning-event-effect-repository.js`
- `api/learning/lib/repositories/reconciliation-repository.js`
- `api/learning/__tests__/attempt-event-service.test.js`
- `api/marking/__tests__/evaluate-v1.test.js`

The honest remaining delta was narrower than the original issue body implied.

Before this branch:

- downstream effect failure correctly produced retryable effect receipts
- `evaluate-v1` correctly returned `200` when scoring plus ledger persistence
  succeeded
- but the corresponding `learning_event_deliveries` row could remain
  `persisted` with `last_error = null` after downstream effect execution failed
  or after persisted proposal-event reload failed

That meant retry debt was visible in effect receipts and the response payload,
but the delivery row itself could still look clean. For this issue, that was
the real remaining reconciliation gap.

## Branch Delta

The narrow branch delta is commit:

- `c9f427f` `fix(learning): persist downstream effect retry state`

Files changed for the real remaining delta:

- `api/learning/lib/events/attempt-event-service.js`
- `api/learning/__tests__/attempt-event-service.test.js`

The branch change does three things:

1. initial downstream effect failure now moves the bridge delivery row into a
   durable retry posture instead of leaving it `persisted`
2. replay of a retrying downstream-effect delivery can re-run from the
   persisted `LearningUpdateProposed` event without duplicating bridge events
3. reconciliation retries now stamp the delivery row with either:
   - `reconciled` plus the reconciliation run id on success
   - continued retry debt plus the reconciliation run id on failure
4. an existing `needs_manual_review` delivery stays terminal when
   reconciliation cannot even reload the persisted proposal event

The scoring contract remains unchanged:

- if scoring and ledger persistence succeed, `evaluate-v1` still returns
  success even when downstream effects fail
- bridge failure or partial downstream failure is surfaced as learning-effect
  debt, not as a student-visible scoring failure

## Fresh Verification

Command run from the AO task worktree:

```bash
npm test -- --runInBand \
  api/marking/__tests__/evaluate-v1.test.js \
  api/learning/__tests__/attempt-event-service.test.js \
  --verbose
```

Observed result:

- `PASS`
- `2` suites passed
- `44` tests passed

Live GitHub PR state at verification time:

- PR `#268` is open, non-draft, and mergeable
- all `9` GitHub check runs are passing
- review state is still empty, so the PR is not yet through the human review
  gate

## What The Passing Proof Covers

`api/learning/__tests__/attempt-event-service.test.js` proves:

- downstream effects execute only after bridge persistence succeeds
- initial downstream failures move the delivery row into durable retry state
- proposal-event reload failures also keep retry debt visible on the delivery
  row
- retrying downstream effects reuses the persisted proposal event rather than
  duplicating bridge events
- successful reconciliation moves the row to `reconciled`
- failed reconciliation keeps retry debt visible and records the
  reconciliation run id
- an already-terminal `needs_manual_review` row does not get downgraded back
  to `retrying` when proposal-event reload fails during reconciliation

`api/marking/__tests__/evaluate-v1.test.js` proves:

- the real marking/runtime bridge is still called only after successful ledger
  persistence
- downstream partial failure does not break the `200` scoring response
- full attempt-event bridge failure after scoring plus ledger success still
  does not break the student-visible scoring response

## Conclusion

Issue `#261` was not wholly missing on the current repo line.

The truthful closeout is:

- `#259` and `#260` already covered the landed runtime-effects core
- this branch closes the remaining delivery-state visibility gap for
  downstream effect failure and retry
- no broader runtime, scheduler, or release-gate claim is made here

The remaining honest posture after this branch is:

- PR `#268` is technically green and mergeable
- explicit human review has not yet happened, so the branch should stay parked
  in review-hold posture rather than expand scope
