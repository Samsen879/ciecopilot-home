# Issue #217 Closeout

## Scope shipped

Implemented the student-facing scheduler explanation contract for the learning-runtime review queue behind `VITE_LEARNING_RUNTIME_SCHEDULER_EXPLANATION_ENABLED`.

Shipped behavior:

- backend review projection now emits grounded `student_explanation`
- student explanation is fail-closed and only renders when it has exactly `1` summary sentence plus `2-4` frozen labels
- labels are limited to:
  - `最近出错`
  - `间隔已到`
  - `临近考试`
  - `同题型回补`
  - `回归风险`
- provenance is carried from structured explanation factors into:
  - `student_explanation.provenance.summary_factor_codes`
  - `student_explanation.provenance.label_mappings`
- when the flag is enabled, the student-facing queue panel hides the old internal scheduler copy and uses the compact student explanation instead

Changed files:

- `api/learning/lib/review/review-scheduler-policy.js`
- `src/components/learning-runtime/view-models/review-queue-view-model.js`
- `src/components/learning-runtime/ReviewQueuePanel.js`
- `api/learning/__tests__/review-scheduler-policy.test.js`
- `src/components/learning-runtime/__tests__/view-models.test.js`
- `src/components/learning-runtime/__tests__/WorkspaceShell.test.js`

## Verification

1. `npm run workflow:baseline:sync`

Outcome:

```text
> cie-copilot@0.0.1 workflow:baseline:sync
> bash scripts/workflow/baseline-sync.sh

+ (cd /home/samsen/code/ciecopilot-home && git -C /home/samsen/code/ciecopilot-home fetch origin --prune)
+ (cd /home/samsen/code/ciecopilot-home && git -C /home/samsen/code/ciecopilot-home pull --ff-only)
Already up to date.
```

2. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/review-scheduler-policy.test.js src/components/learning-runtime/__tests__/view-models.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js`

Outcome:

```text
PASS src/components/learning-runtime/__tests__/WorkspaceShell.test.js
PASS src/components/learning-runtime/__tests__/view-models.test.js
PASS api/learning/__tests__/review-scheduler-policy.test.js

Test Suites: 3 passed, 3 total
Tests:       30 passed, 30 total
```

## Residual risks / follow-up debt

- The rollout gate is currently frontend-env driven via `VITE_LEARNING_RUNTIME_SCHEDULER_EXPLANATION_ENABLED`; if the product later needs server-driven flagging per user/session, that wiring is still outstanding.
- The compact summary templates only cover grounded factor combinations available in the current scheduler contract. New structured factor families should map through the same frozen label set instead of adding vocabulary.
- Teacher/debug surfaces still retain the richer internal explanation object by design; this change only constrains the student-facing render path.
