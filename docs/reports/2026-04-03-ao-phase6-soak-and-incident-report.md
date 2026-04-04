# AO Phase 6 Soak And Incident Report

Date: `2026-04-03`

## Soak Evidence

Commands run:

```bash
npm run ao:smoke -- --scenario ci-failed-pr
npm run ao:smoke -- --scenario approved-and-green-pr
npm test -- --runInBand tests/ao/ao-lifecycle-acceptance.test.js
```

Observed results:

- `ci-failed-pr` smoke passed with the expected blocked -> blocked -> hold chain
- `approved-and-green-pr` smoke passed with the expected healthy -> healthy -> continue chain
- `tests/ao/ao-lifecycle-acceptance.test.js` passed: `1` suite, `7` tests

## Eval Baseline

Commands run:

```bash
node scripts/ao-eval.js --save-baseline phase6-wave1 --json
node scripts/ao-eval.js --baseline phase6-wave1 --json
```

Observed results:

- baseline alias saved: `phase6-wave1`
- baseline scorecard id: `scorecard-7beff1d0e859`
- comparison scorecard id: `scorecard-00ed40e02c24`
- comparison status: `ok`
- comparison findings: `0`

Persisted paths:

- `.ao-control-plane/ciecopilot-home/eval/baselines/phase6-wave1.json`
- `.ao-control-plane/ciecopilot-home/eval/scorecards/scorecard-7beff1d0e859.json`
- `.ao-control-plane/ciecopilot-home/eval/scorecards/scorecard-00ed40e02c24.json`
- `ao-artifacts/ao-eval/baselines/phase6-wave1.json`
- `ao-artifacts/ao-eval/scorecards/scorecard-7beff1d0e859.json`
- `ao-artifacts/ao-eval/scorecards/scorecard-00ed40e02c24.json`

## Incident Drill Evidence

Additional targeted commands:

```bash
npm test -- --runInBand tests/ao/doctor-engine.test.js tests/ao/doctor-local-state-source.test.js
npm test -- --runInBand tests/ao/controller-loop.test.js -t "reclaims a stale controller lease before starting a new pass"
```

Observed results:

- `dirty_worktree` diagnosis coverage passed through doctor engine and local-state source tests: `2` suites, `19` tests
- stale controller leader reclaim coverage passed through controller loop targeted test: `1` matching test passed

## Real Managed-Task Soak

Synthetic task brief:

- `runs/phase6/ao-phase6-real-task-soak-brief.md`

Lifecycle commands run:

```bash
node scripts/ao-manage.js enroll --issue 9606 --title "AO phase6 real-task soak rehearsal" --branch task/9606-ao-phase6-real-task-soak --worktree /home/samsen/code/ciecopilot-home/.worktrees/task-9606--ao-phase6-real-task-soak --owner-session phase6-soak --task-spec-file runs/phase6/ao-phase6-real-task-soak-brief.md --json
node scripts/ao-manage.js unmanage --issue 9606 --reason phase6_soak_pause --json
node scripts/ao-manage.js adopt --issue 9606 --title "AO phase6 real-task soak rehearsal" --branch task/9606-ao-phase6-real-task-soak --worktree /home/samsen/code/ciecopilot-home/.worktrees/task-9606--ao-phase6-real-task-soak --owner-session phase6-soak --task-spec-file runs/phase6/ao-phase6-real-task-soak-brief.md --json
node scripts/ao-manage.js retire --issue 9606 --reason phase6_real_task_soak_complete --json
npm run workflow:task:closeout -- --id 9606 --slug ao-phase6-real-task-soak --dry-run
git worktree remove /home/samsen/code/ciecopilot-home/.worktrees/task-9606--ao-phase6-real-task-soak
git branch -d task/9606-ao-phase6-real-task-soak
node scripts/ao-state.js --json --audit-limit 8
```

Observed results:

- the first `enroll` surfaced a real contract issue: the initial brief was not a valid TaskSpec until the required section headers were added
- after fixing the brief, the managed task completed a full `enroll -> pause -> adopt -> retire` lifecycle using the normal repo-local AO commands
- `workflow:task:closeout --dry-run` produced the expected retirement and cleanup plan without requiring destructive cleanup
- final `ao-state --json --audit-limit 8` showed:
  - `tasks.summary.closeout_status_counts.retired=1`
  - `continuity.summary.posture_counts.retired=1`
  - `debt.summary.category_counts.archive_candidate=1`
  - `debt.summary.category_counts.cleanup_candidate=0`
- the remaining debt item is durable retired task history for `issue-9606`; the synthetic task branch and worktree no longer appear in debt inspections

## Drill Coverage Map

- controller stale leader: covered by controller-loop reclaim test
- worker crash / stale worker ownership: covered by lifecycle acceptance stale-ownership restoration path
- PR owner ambiguity: covered by lifecycle acceptance ambiguous cross-source path
- dirty worktree diagnosis: covered by doctor engine and local-state source tests

## Current Conclusion

- Phase 6 now has repeatable soak evidence for blocked and healthy PR paths.
- The incident matrix is no longer only roadmap text; it is tied to fresh runnable tests and smoke commands.
- AO eval now also has a named phase-6 baseline and a fresh no-regression compare result.
- Phase 6 now also has one completed real managed-task soak with explicit pause, re-activation, retirement, and post-closeout cleanup evidence.
- The remaining archive candidate is an intentional durable history record, not leftover repo-root noise or stale task residue.
