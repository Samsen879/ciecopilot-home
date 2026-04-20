# 2026-04-21 9709 Closed-Loop Release Readiness

## Scope

Issue `#265` is the final proof slice under tracker `#258`.

This branch stays inside the assigned scope only:

- keep the reusable gold `9709` closed-loop fixture
- harden the machine-readable gate runner so it does not hide released-scope regressions
- keep degraded-path / retry-debt evidence explicit
- publish a checked-in release-readiness report with actual command outcomes and residual risks

This branch does not widen into new `9709` expansion, Wave B work, question-bank growth, or unrelated runtime redesign.

## Truthful Start Posture

The required preflight command was run from the AO task worktree:

```bash
npm run workflow:baseline:sync
```

Observed result:

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

That means the preserved root baseline checkout is still diverged and could not be
used as a fast-forward sync point. Following the re-entry handoff, this issue
therefore uses an explicit integration baseline instead of pretending alignment
with `main`.

## Integration Baseline

The AO task branch started from current `origin/main` commit `52519a3`
(`docs: add 9709 Wave A full-round retrospective (#257)`), then pulled in the
real unmerged prerequisite code that `#265` depends on:

- `#261` / PR `#268`
  - `c9f427f` `fix(learning): persist downstream effect retry state`
  - `0eec475` `fix(learning): preserve manual review retry state`
- `#263` / PR `#271`
  - `471d35c` `feat(learning): extract runtime scheduler state machine`

The adjacent open PRs were reconciled but not merged into this branch because
they are report-only closeouts rather than runtime-code deltas:

- `#262` / PR `#269`
- `#264` / PR `#270`

This is the honest proof line for `#265`: current `origin/main` plus the open
runtime-code prerequisites from `#261` and `#263`.

## What Changed Here

The prior closed-loop gate on `main` could still pass while hiding the real
released-scope repair regression because the gold fixture injected precomputed
authoritative posture into the bridge input.

This branch hardens that proof surface by:

- keeping the existing trigonometry gold-path gate intact
- keeping degraded retry-debt evidence intact
- adding a released-scope repair guard for
  `9709.integration.application` that uses runtime-derived posture rather than
  injected authoritative posture
- blocking overall release readiness when that guard falls back
  conservatively

Checked-in outputs from this branch:

- `data/learning_runtime/release_evidence/9709-closed-loop-release-gate-receipt.v1.json`
- `docs/reports/2026-04-21-9709-closed-loop-release-gate.md`

## Verification

1. Gate test suite

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  scripts/learning/__tests__/closed-loop-release-gate.test.js \
  --verbose
```

Observed result:

- `PASS`
- `1` suite passed
- `4` tests passed

2. Integrated prerequisite proof surfaces

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/attempt-event-service.test.js \
  api/learning/__tests__/learning-runtime-state-machine.test.js \
  api/learning/__tests__/review-scheduler-policy.test.js \
  --verbose
```

Observed result:

- `PASS`
- `3` suites passed
- `25` tests passed

3. Released-scope repair regression proof

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand --runTestsByPath \
  api/learning/__tests__/review-task-service.test.js \
  --testNamePattern "incorrect released-scoring outcomes still emit repair tasks without positive type mastery|released-scoring outcomes with conservative mapping ambiguity still emit repair tasks" \
  --verbose
```

Observed result:

- `FAIL`
- `2` targeted assertions failed
- both failures expected `release_scope_status = released_scoring`
- both failures received `release_scope_status = non_released_fallback`
- both failures target `9709.integration.application`

4. Gate runner on the explicit integration baseline

```bash
node scripts/learning/run_closed_loop_release_gate.js \
  --out-json data/learning_runtime/release_evidence/9709-closed-loop-release-gate-receipt.v1.json \
  --out-md docs/reports/2026-04-21-9709-closed-loop-release-gate.md
```

Observed result:

- command exited nonzero as designed because the receipt stayed blocked
- wrote `data/learning_runtime/release_evidence/9709-closed-loop-release-gate-receipt.v1.json`
- wrote `docs/reports/2026-04-21-9709-closed-loop-release-gate.md`
- receipt recorded:
  - `status = fail`
  - `release_ready = false`
  - `blocked_reasons = ["released_scope_repair_guard_failed"]`

## What The Evidence Now Proves

The hardened gate still proves the original gold path:

- request intake
- marking
- attempt-event persistence
- downstream materialization
- scheduler output
- workspace artifact projection

Those gates remain green for the `9709.trigonometry.equations` gold scenario.

The degraded path also still records retry debt explicitly:

- `status = debt_recorded`
- `failed_handlers = ["review_tasks"]`
- `receipt_summary.retrying = 1`

The new released-scope repair guard is the critical addition. On the current
integration baseline it records:

- `status = fail`
- `release_scope_status = non_released_fallback`
- `authoritative_scoring_allowed = false`
- `fallback_reason_code = low_classification_confidence`
- `review_task_count = 1`

That means the proof surface no longer masks the `9709.integration.application`
repair-path regression that the `#259` audit called out. The gate is stricter
and more honest now, but the line is still not release-ready.

## Residual Risks And Blockers

- The real blocker is unchanged: the released-scope repair path for
  `9709.integration.application` still falls back conservatively where the
  current contract expects released-scoring repair behavior.
- The gold closed-loop proof still runs on a focused in-memory runtime harness.
  That is acceptable for this issue's machine-readable gate, but it is not a
  substitute for live GitHub review and CI truth.
- PRs `#268`, `#269`, `#270`, and `#271` were still open during this work. This
  report is explicit that the proof ran on a branch-local integration baseline,
  not on `main`.

## Conclusion

Issue `#265` is partially complete on this branch:

- the proof surface is hardened
- the gate now catches the released-scope regression instead of hiding it
- the checked-in receipt and markdown report are fresh and truthful

But the final release-ready claim is still blocked:

- `release_ready` remains `false`
- tracker `#258` must stay open
- the remaining runtime delta is outside this issue's gate/report scope and must
  be resolved before the closed loop can honestly be declared green
