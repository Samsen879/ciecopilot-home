# AO Reconciliation Runbook

## Scope

This runbook covers only the phase-1 AO reconciliation foundation in this repo.

It explains how to:

- run the repo-local reconciliation command
- interpret PR-scoped strict automation results
- interpret project-scoped operator summaries
- understand what phase 1 can and cannot decide

It does not document doctor/runtime repair or lifecycle/control-plane recovery. Those are later AO phases.

## Commands

### Human/operator summary mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:reconcile
```

Use this when you want an aggregate AO-linked summary of the PRs currently visible through AO worker evidence.

This mode is:

- project-scoped
- advisory
- suitable for operator inspection
- not the authoritative release gate

### Human/operator JSON mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:reconcile:json
```

Use this when you want the machine-readable report but do not need strict automation exit codes.

### Authoritative PR-scoped automation mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-reconcile.js --pr <number> --json --strict
```

Use this when:

- the orchestrator is deciding what to do for one known PR
- you need deterministic exit codes
- you need the fixed `automation_disposition` contract

This is the only authoritative phase-1 automation mode.

If you use the npm wrapper, pass the PR explicitly:

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:reconcile:strict -- --pr <number>
```

## Scope Model

### PR-scoped mode

`--pr <number>` means:

- reconcile exactly one PR
- compute PR-level ownership and release-readiness for that PR
- use fixed strict-mode exit codes

### Project-scoped mode

Default project mode means:

- aggregate only AO-linked PRs
- do not scan arbitrary unrelated repo PRs
- use AO worker evidence to choose which PRs are in scope

This is for inspection and prioritization, not as the sole release gate.

## Top-Level Status

`top_status` uses this precedence:

1. `source_failure`
2. `blocked`
3. `ambiguous`
4. `warning`
5. `healthy`

Interpretation:

- `healthy`: no blockers, no ambiguity, no warnings
- `warning`: non-blocking continuity or runtime concerns
- `blocked`: clear blocker exists
- `ambiguous`: evidence is incomplete or conflicting
- `source_failure`: AO or GitHub observation failed

## Automation Disposition

`automation_disposition` is the machine-level action posture:

- `continue`: no ambiguous or blocked condition requiring intervention
- `pause`: blockers exist; do not continue autonomous delivery
- `human_gate`: ambiguity exists; inspect before acting
- `source_failure`: observation failed; refresh inputs first

## Strict Exit Codes

PR-scoped strict mode uses the fixed exit-code mapping:

- `0`: healthy
- `10`: warning
- `11`: blocked
- `12`: ambiguous
- `13`: source failure or observation failure
- `14`: invalid CLI usage

Default human mode is permissive:

- `0`: healthy, warning, blocked, or ambiguous
- `3`: source failure
- `4`: invalid CLI usage

## Reading The Report

### Source health

`source_health` tells you whether AO and GitHub observations were:

- `ok`
- `degraded`
- `failed`

If either source is `failed`, do not treat the result as authoritative for release decisions.

### Ownership

PR ownership can be:

- `clear`
- `stale`
- `orphaned`
- `ambiguous`
- `unknown`

Operational interpretation:

- `clear`: exactly one healthy worker matched the PR
- `stale`: only stale worker continuity exists
- `orphaned`: open PR with no healthy AO owner
- `ambiguous`: more than one candidate worker matched the winning linkage tier
- `unknown`: not enough linkage or freshness evidence

### Release readiness

PR-level release readiness can be:

- `ready`
- `blocked`
- `ambiguous`
- `not_applicable`

Important phase-1 rules:

- draft PRs are `not_applicable`
- non-open PRs are `not_applicable`
- merge conflicts are `blocked`
- unknown mergeability is `ambiguous`
- no healthy owner prevents `ready`

## Recommended Usage

### When the orchestrator knows the PR number

Run:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

Read:

- `top_status`
- `automation_disposition`
- `pr_assessments[0].ownership`
- `pr_assessments[0].release_readiness`

### When a human wants a global AO-linked picture

Run:

```bash
npm run ao:reconcile
```

Read:

- `top_status`
- aggregate project summary
- any blocker or ambiguous findings

## What Phase 1 Does Not Do

Phase 1 does not:

- repair AO runtime automatically
- reassign PR ownership
- merge PRs
- act as a durable task state authority
- run a transition/state plane
- replace live GitHub truth for PR/review/check state

If you need repair, recovery, or lifecycle control, that is later AO work.

## Relationship To Later AO Work

Phase 1 produces the normalized truth layer that later phases should consume.

Expected later use:

- doctor/runtime repair consumes reconciliation output instead of rebuilding normalization
- lifecycle/control-plane logic consumes ownership and readiness contracts instead of parsing shell output directly

## Failure Handling

If the reconciliation command returns source failure:

1. check whether `ao status -p ciecopilot-home --json` works directly
2. check whether `gh pr view` / `gh pr checks` work directly
3. treat the result as non-authoritative until source health is restored
