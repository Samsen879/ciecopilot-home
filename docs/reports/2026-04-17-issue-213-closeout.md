# Issue 213 Closeout

## Scope Shipped

- restacked `feat/213` onto `feat/211` so the posture work builds on the runtime bridge foundation instead of `main`
- introduced a shared runtime-authority posture contract for imported-question attempts
- forced imported attempts into explicit `non_authoritative` posture before ledger/event/materialization handoff
- kept imported attempts durable in the mark ledger and attempt-scoped event stream
- blocked non-authoritative imported attempts from durable mastery mutation, default review-queue writes, and stable-slot residency writes
- preserved session-local feedback, artifact candidate generation, and audit/reconciliation visibility

## Runtime Authority Posture Matrix

| Surface / write path | Standard released attempt | Imported-question attempt |
| --- | --- | --- |
| Mark ledger `mark_runs.response_summary.authority_posture` | allowed, `default_durable` | allowed, `non_authoritative` |
| Attempt event stream (`AttemptSubmitted` -> `LearningUpdateProposed`) | allowed | allowed |
| Event/provenance posture payload | authoritative or fallback posture | explicit `runtime_authority_posture = non_authoritative` |
| Type/family mastery updates | allowed per released-scope contract | blocked |
| Default durable review-task writes | allowed per review contract | blocked |
| Artifact candidate generation | allowed | allowed |
| Stable-slot residency / pin writes | allowed per artifact rules | blocked |
| Reconciliation / audit visibility | allowed | allowed |

## Files Changed

- `api/learning/lib/contracts/runtime-authority-posture.js`
- `api/marking/evaluate-v1.js`
- `api/learning/lib/events/attempt-event-service.js`
- `api/learning/lib/mastery/mastery-orchestrator.js`
- `api/learning/lib/review/review-task-service.js`
- `api/learning/lib/artifacts/artifact-service.js`
- `api/marking/__tests__/evaluate-v1.test.js`
- `api/learning/__tests__/attempt-event-service.test.js`
- `api/learning/__tests__/review-task-service.test.js`
- `api/learning/__tests__/artifact-service.test.js`

## Verification

### Focused Jest suites

Command:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/mastery-orchestrator.test.js \
  api/learning/__tests__/attempt-event-service.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/marking/__tests__/evaluate-v1.test.js
```

Outcome:

- Passed.
- Test suites: `5 passed, 5 total`
- Tests: `53 passed, 53 total`

### Diff hygiene

Command:

```bash
git diff --check
```

Outcome:

- Passed with no diff hygiene errors.

## Notes / Risks

- The AO-referenced decision file `docs/reports/2026-04-16-ao-execution-decision-alignment.md` is still absent on this branch, so implementation aligned to the issue body, frozen runtime docs present in-tree, and the AO continuation note that required restacking onto `feat/211`.
- Two pre-existing review-task fixtures were below the frozen `0.8` released-scoring confidence threshold while still expecting released-scoring behavior. Their fixture confidence was corrected to keep the focused verification set aligned to the current contract.
