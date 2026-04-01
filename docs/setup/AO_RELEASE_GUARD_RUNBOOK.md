# AO Release Guard Runbook

## Purpose

AO release guards give operators a durable, typed release snapshot for a managed PR without granting merge authority.

Each release guard is bound to the PR's exact `head_sha` and stores:

- typed release posture: `waiting`, `blocked`, `ambiguous`, `ready`, or `not_applicable`
- gate snapshot and reason codes
- the GitHub and AO ownership truth that produced the posture
- the promotion signal surface, including `notify_human_ready` when applicable
- invalidation metadata when a later snapshot supersedes an older one

AO still does not auto-merge. GitHub remains canonical for reviews, checks, and mergeability.

## Materialization

Release guards are materialized during PR-scoped shadow or assist controller passes when AO has a managed task and a reconciled PR assessment.

If PR truth changes, AO invalidates the previous active guard automatically and writes a new active guard.

Invalidation reasons include:

- `head_sha_changed`
- `review_truth_changed`
- `ci_truth_changed`
- `mergeability_truth_changed`
- `ownership_truth_changed`
- `pr_truth_changed`

## Inspect One PR

```bash
node scripts/ao-release.js --pr 137 --json
```

This returns the active release guard, recent history for that PR, and the promotion surface derived from the durable record.

Human-readable output is also available:

```bash
node scripts/ao-release.js --pr 137
```

## Inspect Project-Wide Posture

```bash
node scripts/ao-release.js --json
```

This shows all current active release guards and status counts for the project.

## Promotion Surface

Use `--promote` when you want the operator-facing promotion contract for one PR:

```bash
node scripts/ao-release.js --pr 137 --promote --json
```

The promotion surface exposes:

- whether the PR is promotion-eligible
- the typed promotion signal
- the release disposition basis
- advisory commands for operator verification
- `merge_authority: false`

If the PR is not promotion-eligible, `ao-release` exits with code `2`.

## Status Meanings

- `ready`: all typed release gates are open for the current `head_sha`
- `waiting`: no blocker exists, but AO is still waiting on review or CI truth to clear
- `blocked`: AO sees a concrete blocker such as CI failure, review block, merge conflict, or orphaned ownership
- `ambiguous`: AO cannot form a safe typed release conclusion from the current truth
- `not_applicable`: the PR is draft or not open, so release posture is intentionally inactive

## Recommended Operator Flow

1. Run the controller in `shadow` or `assist` mode so the current release guard is materialized.
2. Inspect the PR with `node scripts/ao-release.js --pr <number> --json`.
3. If the guard is `ready`, inspect the promotion surface with `--promote`.
4. Reconfirm live GitHub state before treating `notify_human_ready` as actionable:

```bash
gh pr view <number> --json mergeable,reviewDecision,isDraft,url
ao review-check ciecopilot-home --dry-run
```

5. Notify the human when the promotion surface says `notify_human_ready`. Do not merge automatically.
