# Issue 216 Closeout

## Scope Shipped

- added a feature-gated review-action contract in `review-task-service` behind `LEARNING_REVIEW_ACTION_CONTRACT`
- made `review_target_key` stable and posture-aware so `conservative_fallback` tasks do not merge into `released_scoring_repair`
- changed `partial` writes to expire the current row with `backend_disposition = merged_into_successor` and create or update an open successor on the same lineage
- changed `reschedule` to retain schedule provenance on the durable task record
- changed `skip_once` (`snooze` under the flag) to compute a minimal route-based deferral without the legacy caller-supplied shape and reject consecutive lineage skips
- added backend/operator dispositions `invalidated` and `withdrawn_by_policy` without recording fake completion outcomes

## Action-State Transition Table

| Action | Starting state | Durable result | Active-lineage effect |
| --- | --- | --- | --- |
| Outcome generation, same `review_target_key` | `open` / `partial` | existing row is updated in place | keeps at most one active durable task per posture-aware target key |
| `partial` | `open` / `partial` | current row becomes `expired` with `completion_evidence.outcome = partial` and `backend_disposition = merged_into_successor` | successor remains `open`, inherits lineage, and gets the nearer due time |
| `reschedule` | `open` / `partial` | current row keeps active status with new `due_at` | appends `schedule_provenance` and preserves lineage |
| `skip_once` (`snooze`) | `open` / `partial` | current row keeps active status with computed deferral | records `last_lineage_action = skip_once` and rejects consecutive skips on the same lineage |
| `invalidate` | `open` / `partial` | row becomes `expired` with `backend_disposition = invalidated` | removes the active task without a fake completion outcome |
| `withdraw` | `open` / `partial` | row becomes `expired` with `backend_disposition = withdrawn_by_policy` | removes the active task without a fake completion outcome |

## Files Changed

- `api/learning/lib/review/review-task-service.js`
- `api/learning/lib/review/review-scheduler-policy.js`
- `api/learning/__tests__/review-task-service.test.js`
- `docs/reports/2026-04-17-issue-216-closeout.md`

## Verification

### Focused Jest suite

Command:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/review-task-service.test.js \
  --verbose
```

Outcome:

- Passed.
- Test suites: `1 passed, 1 total`
- Tests: `25 passed, 25 total`

### Diff hygiene

Command:

```bash
git diff --check
```

Outcome:

- Passed with no diff hygiene errors.

## Notes / Risks

- The issue references `docs/reports/2026-04-16-ao-execution-decision-alignment.md`, but that file is not present on this branch. Implementation therefore followed the issue body, the AO continuation notes, and the focused service-test contract.
- This batch intentionally stops at service/helper semantics. The API validator and UI do not yet expose backend-only intents or a dedicated `skip_once` control.
