# AO Event Replay And Backpressure Runbook

## Purpose

Issue `#128` adds operator-facing AO surfaces for the event/action layer and makes replay/backpressure decisions durable instead of leaving them implicit in raw state JSON.

Use these surfaces when CI, review, or comment loops start flapping and you need to answer:

- what durable delivery events were seen most recently
- which dedupe keys and source cursors produced them
- which actions are still proposed, blocked, executed, denied, or downgraded
- whether AO is replaying a signal, suppressing it, or already under backpressure

## Surfaces

Project-wide state overview:

```bash
node scripts/ao-state.js
node scripts/ao-state.js --json
```

Focused event and cursor inspection:

```bash
node scripts/ao-events.js
node scripts/ao-events.js --task issue-128
node scripts/ao-events.js --pr 128 --json
```

Focused action inspection:

```bash
node scripts/ao-actions.js
node scripts/ao-actions.js --task issue-128
node scripts/ao-actions.js --pr 128 --json
```

Governance and churn rollups:

```bash
node scripts/ao-metrics.js
node scripts/ao-metrics.js --json
```

## Durable Replay Semantics

### Delivery events

- A delivery event is keyed by its durable `dedupe_key`.
- Re-observing the same event does not create another event row.
- Instead, AO updates the event governance snapshot:
  - `replay_count` increments for each replay of the same durable event
  - `suppressed_count` increments once the replay budget is exhausted
  - `last_decision` moves between `replayed` and `suppressed`
  - `backpressure_status` becomes `suppressed` once the event replay budget is exceeded

### Controller cursors

- A cursor tracks the latest upstream cursor per controller/task/source.
- Re-observing the exact same cursor is treated as a suppressed duplicate, not a fresh observation.
- Cursor governance remains durable even after the cursor later advances, so operators can still see prior duplicate pressure.

### Actions

- AO assigns a stable replay key per `task + pr + action_kind + head_sha`.
- Repeated CI/review/comment churn on the same head updates the existing action governance instead of minting a fresh action row every run.
- Once the action replay budget is exhausted, AO records a durable `suppressed` decision and stops growing action churn for that replay key.

## Reading The State

Relevant governance fields:

- `governance.replay_key`: stable durable identity for replay suppression
- `governance.replay_limit`: bounded replay budget
- `governance.replay_count`: replay attempts recorded against that key
- `governance.suppressed_count`: attempts suppressed under backpressure
- `governance.last_decision`: latest governance outcome
- `governance.backpressure_status`: whether the surface is open or suppressed
- `lineage.source_delivery_event_ids`: delivery events that sourced an action
- `lineage.source_observation_ids`: durable observations that sourced an action
- `lineage.source_cursor_ids`: cursor records used when AO proposed or replayed an action
- `lineage.pr_head_sha`: PR head AO tied the action replay key to

## Operator Guidance

- If a PR head changed, expect a new action replay key. That is intentional: AO suppresses churn per head, not across unrelated commits.
- If events are replaying but actions are not, inspect the action replay key and policy decision to see whether AO is suppressing churn intentionally.
- If cursor governance is suppressed but event governance is still open, AO is seeing repeated identical polls before the underlying delivery state changes.
- If action governance is suppressed for `hold_ci` or `hold_review`, the controller has already seen enough same-head churn and is preserving the existing durable action instead of creating more.

## Audit Expectations

Replay/backpressure decisions are durable and auditable. Look for audit operations such as:

- `delivery_event.replayed`
- `delivery_event.replay_suppressed`
- `controller_cursor.replay_suppressed`
- `action.replayed`
- `action.replay_suppressed`

These entries should line up with the governance counters shown by the operator CLIs above.
