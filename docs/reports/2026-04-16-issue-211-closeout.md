# Issue 211 Closeout

## Scope Shipped

- wired `evaluate-v1` into a dedicated attempt-event bridge behind `MARKING_V1_RUNTIME_BRIDGE_ENABLED`
- persisted ordered attempt-scoped learning events through `LearningUpdateProposed`
- projected and upserted `attempt_pipeline_state` from the same ordered event flow
- froze `attempt_id` as the aggregate identity for the bridge write path
- carried explicit authority posture on persisted bridge events and on durable bridge warning metadata
- kept bridge failures non-blocking for the student request path and recorded them durably

## Files Changed

- `api/marking/evaluate-v1.js`
- `api/learning/lib/events/attempt-event-service.js`
- `api/learning/lib/events/event-service.js`
- `api/learning/__tests__/attempt-event-service.test.js`
- `api/marking/__tests__/evaluate-v1.test.js`

## Verification

### Required baseline sync

Command:

```bash
npm run workflow:baseline:sync
```

Outcome:

- Passed.
- `git -C /home/samsen/code/ciecopilot-home fetch origin --prune`
- `git -C /home/samsen/code/ciecopilot-home pull --ff-only`
- root baseline reported `Already up to date.`

### Required focused test command

Command:

```bash
npm test -- --runInBand api/learning/__tests__/attempt-event-service.test.js api/marking/__tests__/evaluate-v1.test.js
```

Outcome:

- Failed in this worktree because `node_modules/jest/bin/jest.js` does not exist locally.
- Failure was environmental, not code-level.

Fallback command actually used:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/attempt-event-service.test.js \
  api/marking/__tests__/evaluate-v1.test.js
```

Fallback outcome:

- Passed.
- Test suites: `2 passed, 2 total`
- Tests: `25 passed, 25 total`

### Extra focused test for indirect touch

Command:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/event-service.test.js
```

Outcome:

- Passed.
- Test suites: `1 passed, 1 total`
- Tests: `7 passed, 7 total`

### Diff hygiene

Command:

```bash
git diff --check
```

Outcome:

- Passed with no diff hygiene errors.

## Residual Risks / Debt

- The AO-referenced docs `docs/reports/2026-04-16-ao-execution-decision-alignment.md` and `docs/reports/2026-04-16-ao-issue-slice-round1.md` were not present on this branch, so implementation aligned to the live issue body plus AO continuation notes instead.
- The durable bridge warning surface uses an attempt-scoped `error_events` row with structured metadata. That is durable and auditable, but it is not yet a dedicated runtime-bridge debt table or reconciliation queue.
- `attempt_pipeline_state` remains a stage/status projection. The explicit authority posture is persisted on the ordered bridge events and warning metadata, not on a separate projection column.
- When the bridge records a warning, the existing `applyLearningEffects` path still proceeds so the student request remains non-blocking. That preserves current request-path behavior, but it means downstream materialized effects can temporarily diverge from the canonical attempt-event bridge until later reconciliation work lands.
