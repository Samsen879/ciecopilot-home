# Issue #263 Scheduler Convergence Re-entry Report

## Scope shipped

This re-entry was reconciled against the current `main` line, the `#259-#262`
audit baseline, and the already-landed `#232` scheduler-core work before any
code changes.

Truthful remaining delta for `#263` on this branch:

- keep the already-landed bounded factor model intact on the real `9709`
  scheduler path
- keep stable-target active-task dedupe behavior intact
- land the missing explicit runtime state-machine seam that the audit still
  reported as absent
- add focused direct state-transition coverage without widening into unrelated
  released-scope orchestration fixes

Shipped changes:

- extracted runtime review-task state derivation into
  `api/learning/lib/orchestration/learning-runtime-state-machine.js`
- wired `api/learning/lib/review/review-scheduler-policy.js` through that seam
  for both active-state derivation and blocked-state construction
- added focused direct coverage in
  `api/learning/__tests__/learning-runtime-state-machine.test.js`
- re-verified the existing bounded-factor ranking and stable-target dedupe paths
  with focused scheduler and generation tests

Changed files:

- `api/learning/lib/orchestration/learning-runtime-state-machine.js`
- `api/learning/lib/review/review-scheduler-policy.js`
- `api/learning/__tests__/learning-runtime-state-machine.test.js`

## Verification

1. `npm run workflow:baseline:sync`

Outcome:

```text
> cie-copilot@0.0.1 workflow:baseline:sync
> bash scripts/workflow/baseline-sync.sh

+ (cd /home/samsen/code/ciecopilot-home && git -C /home/samsen/code/ciecopilot-home fetch origin --prune)
+ (cd /home/samsen/code/ciecopilot-home && git -C /home/samsen/code/ciecopilot-home pull --ff-only)
hint: Diverging branches can't be fast-forwarded, you need to either:
hint:
hint:   git merge --no-ff
hint:
hint: or:
hint:
hint:   git rebase
hint:
hint: Disable this message with "git config advice.diverging false"
fatal: Not possible to fast-forward, aborting.
git failed with exit code 128
```

This was recorded as environment truth only. No repair was attempted from this
task worktree.

2. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand --runTestsByPath api/learning/__tests__/learning-runtime-state-machine.test.js --verbose`

Outcome:

```text
PASS api/learning/__tests__/learning-runtime-state-machine.test.js
  learning runtime state machine
    ✓ immediate repair due now escalates into the repair-critical state
    ✓ overdue spaced work becomes due instead of escalating
    ✓ future review work stays deferred until its window opens
    ✓ completed lifecycle status stays completed for projection reads
    ✓ projection overload reasons can block an otherwise active task

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

3. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand --runTestsByPath api/learning/__tests__/review-scheduler-policy.test.js api/learning/__tests__/learning-runtime-state-machine.test.js --verbose`

Outcome:

```text
PASS api/learning/__tests__/learning-runtime-state-machine.test.js
PASS api/learning/__tests__/review-scheduler-policy.test.js

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
```

4. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand --runTestsByPath api/learning/__tests__/review-task-service.test.js --testNamePattern "review task service generation" --verbose`

Outcome:

```text
PASS api/learning/__tests__/review-task-service.test.js
  review task service generation
    ✓ fallback review tasks now route through immediate repair with explicit scheduler policy
    ✓ generated review tasks carry low-band vulnerability into the bounded factor profile
    ✓ fallback review tasks fold into an existing active repair task instead of growing the queue
    ✓ stable-target dedupe keeps the stronger bounded factor profile after merge
    ✓ fallback review tasks keep explicit part/subpart scope in success criteria

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

## Residual risks / follow-up debt

- The full `api/learning/__tests__/review-task-service.test.js` file still has
  unrelated released-scope orchestration failures on the current repo line. I
  did not claim those were fixed here because `#263` owns scheduler convergence,
  not the released-scope posture regression already recorded in the `#259`
  audit.
- `#261` / PR `#268` is still open on GitHub. It did not block this narrow
  scheduler-state extraction because its write scope is the runtime bridge
  retry path, not the review scheduler files changed here.
