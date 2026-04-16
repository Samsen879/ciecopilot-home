# Issue 212 Closeout

## Scope

Issue `#212` adds delivery reliability on top of the stacked `#211` attempt-event bridge without reopening request-path bridge semantics.

## Final Delivery Contract

- Stable delivery row key: `attempt_event_bridge:${mark_run_id || attempt_id}`.
- Durable delivery table: `public.learning_event_deliveries`.
- Frozen delivery states:
  - `pending`
  - `persisted`
  - `retrying`
  - `reconciled`
  - `needs_manual_review`
- Frozen minimum retry fields:
  - `retry_count`
  - `last_attempted_at`
  - `last_error`
- Bridge success path:
  - appends ordered attempt events through `LearningUpdateProposed`
  - upserts `attempt_pipeline_state`
  - finalizes the delivery row to `persisted`
- Bridge failure path:
  - keeps the request path non-blocking
  - records the existing durable warning/debt row in `error_events`
  - updates the delivery row to `retrying` with `retry_count`, `last_attempted_at`, and `last_error`
- Replay / dedupe path:
  - if the delivery row is already `persisted` or `reconciled`, bridge replay returns a deduped success result and does not append duplicate attempt events
  - unique delivery-key conflicts recover by reloading the existing row instead of creating a second delivery row
- Reconciliation path:
  - `reconcileAttemptEventBridgeDelivery()` can move a failed row into `reconciled` or `needs_manual_review`
- Observability surface:
  - delivery rows are queryable by `delivery_state`
  - indexes prioritize stale or repeated rows via `(delivery_state, last_attempted_at)` and `(retry_count, updated_at)`

## Verification

Environment note:

- This AO worktree did not have a local `node_modules`, so verification used the repo install already present at `/home/samsen/code/ciecopilot-home/node_modules` via a local symlink:
  - `ln -s /home/samsen/code/ciecopilot-home/node_modules node_modules`

Commands and outcomes:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/event-service.test.js \
  api/learning/__tests__/attempt-event-service.test.js \
  api/learning/__tests__/schema-contract.test.js \
  api/marking/__tests__/evaluate-v1.test.js --verbose
```

- Outcome: PASS
- Detail: `4` suites passed, `42` tests passed, `0` failed

```bash
git diff --check
```

- Outcome: PASS

## Residual Risks

- There is still no automated retry worker in this slice. `retrying` and `needs_manual_review` rows are the durable reconciliation surface, but replay/remediation still requires an explicit follow-up actor.
- Observability is DB-surface only in this batch. The new indexes make stuck or repeated deliveries queryable, but there is no dedicated CLI/dashboard in this issue.
- Deduped replays return the durable delivery row and persisted event types, but they do not rebuild and return a fresh `attempt_pipeline_state` snapshot when short-circuiting.
