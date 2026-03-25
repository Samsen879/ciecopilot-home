# AO Operator Smoke Guide

This repo now carries a fixture-backed AO smoke path for the real repo-local commands:

- `node scripts/ao-reconcile.js`
- `node scripts/ao-doctor.js`
- `node scripts/ao-lifecycle.js`

The smoke flow is diagnose-only and decide-only. It does not mutate AO state, restore workers, hand off workers, or merge PRs.

## Default smoke flow

Run the default CI-failed operator scenario:

```bash
npm run ao:smoke
```

That command shells the real CLI entrypoints with `AO_FIXTURE_ROOT` pointed at the captured fixture payloads under `tests/ao/fixtures/acceptance/ci-failed-pr`.

It verifies all three steps in order:

1. `reconcile` reports the PR as `blocked` while preserving clear worker continuity.
2. `doctor` reports the same PR as `blocked` without losing the local branch context.
3. `lifecycle` keeps the current worker owner and classifies the next step as `await_ci`.

## Alternate smoke flow

Run the approved-and-green notification scenario:

```bash
npm run ao:smoke -- --scenario approved-and-green-pr
```

That verifies the positive operator path:

1. `reconcile` returns `healthy`.
2. `doctor` returns `healthy`.
3. `lifecycle` returns `continue` with `notify_human_ready`.

## Acceptance coverage

Run the bundled acceptance-style AO matrix:

```bash
npm run ao:test:acceptance
```

The acceptance fixtures cover:

- clean PR continuity
- stale worker ownership
- orphaned ownership
- CI-failed PRs
- approved-and-green PRs
- ambiguous AO/GitHub branch disagreement

The raw AO and GitHub fixture payloads live under `tests/ao/fixtures/acceptance/*`.

## Notes

- GitHub remains canonical for PR, review, check, and mergeability truth.
- `doctor` remains diagnose-only even when it preserves reconciliation blockers.
- `lifecycle` remains decide-only and does not execute worker restoration, handoff, or merge actions.
