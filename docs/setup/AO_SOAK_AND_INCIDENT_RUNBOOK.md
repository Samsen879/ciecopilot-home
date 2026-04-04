# AO Soak And Incident Runbook

## Scope

This runbook defines the phase-6 minimum soak loop and incident drill matrix for repo-local AO.

The goal is not one perfect run. The goal is repeatable operator evidence.

## Minimum Soak Loop

Run at least:

- `npm run ao:smoke -- --scenario ci-failed-pr`
- `npm run ao:smoke -- --scenario approved-and-green-pr`
- `npm test -- --runInBand tests/ao/ao-lifecycle-acceptance.test.js`
- `npm test -- --runInBand tests/ao`

What to record:

- which scenarios were run
- whether the outputs stayed stable across reruns
- whether any human-gate, continuity, or cleanup signals changed unexpectedly
- which incidents had to be investigated manually

## Incident Drill Matrix

The minimum phase-6 drill set is:

- controller stale leader
- worker crash / stale worker ownership
- PR owner ambiguity
- dirty worktree diagnosis

Suggested mapping:

- controller stale leader: inspect `ao-state` for `controller_health=stale`, then verify a clean reclaim path
- worker crash / stale worker ownership: use the stale-worker continuity and handoff acceptance fixtures
- PR owner ambiguity: use the ambiguous cross-source acceptance fixture and confirm human-gate posture
- dirty worktree diagnosis: use `ao:doctor` and confirm `dirty_worktree` remains a visible warning instead of silent drift

## Evidence Rule

- keep the command output or summarized findings in a report
- do not claim soak confidence from a single happy-path run
- when a drill fails, record the failure mode before changing code
