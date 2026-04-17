# Issue #215 Closeout

## Scope Shipped

- Enforced single-resident slot behavior in the artifact service so pinning a new resident-eligible artifact demotes the prior primary instead of leaving multiple pinned residents.
- Rejected `attach_superseded_by` when the successor is not resident-eligible under `LEARNING_ARTIFACT_LIFECYCLE_ENABLED`, keeping the current resident pointer stable.
- Added topic-artifact workspace projection reads behind `LEARNING_ARTIFACT_LIFECYCLE_ENABLED` so slot residency resolves from resident-eligible artifacts only and pending unverified artifacts stay in `artifact_inbox`.
- Derived `slot_state = awaiting_verification` only when a slot has no displayable resident but does have a pending unverified candidate.
- Updated workspace view-model and shell behavior so unverified candidates cannot be pinned or offered as supersede successors, and the placeholder does not hide a still-valid resident.

## Residency Matrix

| Scenario | Projected primary resident | Slot state | Candidate surface |
| --- | --- | --- | --- |
| Verified resident + unverified successor | Existing verified resident stays primary | `active` | Unverified successor stays in `artifact_inbox` |
| No resident + unverified candidate | No primary resident | `awaiting_verification` | Candidate stays in `artifact_inbox` |
| Verified inbox candidate pinned into occupied slot | New verified artifact becomes sole resident | `active` | Prior pinned resident is demoted out of primary residency |
| Pinned resident supersede request with unverified successor | Existing resident stays primary | `active` | Request is rejected with `409 artifact_state_conflict` |

## Verification

1. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/artifact-service.test.js`
   Outcome: `PASS`, 24 tests passed.

2. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/workspace-read-service.test.js -t "workspace returns stable slots plus linked references from secondary topics|workspace residency matrix|marking effect -> review task -> workspace projection -> artifact patch keeps lifecycle and ownership consistent|GET /api/learning/workspaces/:topicId returns stable slots and linked references"`
   Outcome: `PASS`, 5 selected tests passed and 7 were skipped by the test filter.

3. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand src/components/learning-runtime/__tests__/view-models.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js`
   Outcome: `PASS`, 26 tests passed.

## Additional Observation

- Running the full `api/learning/__tests__/workspace-read-service.test.js` file still reports one unrelated pre-existing failure in `review-task writes update topic projections and active review-queue references`, where the released-scope expectation is `released_scoring` but the current branch returns `non_released_fallback`. This issue was not changed in `#215`.

## Residual Risks

- The residency projection rewrite is intentionally gated by `LEARNING_ARTIFACT_LIFECYCLE_ENABLED`; with the flag off, legacy workspace behavior remains unchanged.
- Topic artifact projection still reads by canonical-home topic because the frozen schema does not add a separate artifact owner column in this batch.
