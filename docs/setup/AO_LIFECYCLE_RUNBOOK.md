# AO Lifecycle Runbook

## Scope

This runbook covers the phase-3 repo-local AO lifecycle layer in this repo.

Lifecycle is decide-only:

- it does not recreate AO sessions
- it does not mutate git state
- it does not reassign ownership automatically
- it does not merge PRs
- it does not act as a repair plane

Lifecycle exists to answer the next control question after phase-1 reconciliation and phase-2 doctor:

- continue the current worker
- restore the prior worker
- hand off to a successor
- hold
- human gate
- notify the human that a PR appears ready

## When To Run Lifecycle

Run lifecycle when:

- reconciliation truth is already known
- doctor has already covered local continuity posture when needed
- you need deterministic next-step control reasoning
- a trigger such as `ci_failed`, `approved_and_green`, `agent_stuck`, or `agent_exited` needs stable routing

Do not use lifecycle as a substitute for phase-1 truth or phase-2 diagnosis.

## Command Forms

### Project mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js
```

Use this for advisory project-wide triage only.

### Project JSON mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --json
```

### PR mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --pr <number>
```

### Triggered PR mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --pr <number> --trigger ci_failed
```

### Strict mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-lifecycle.js --pr <number> --trigger approved_and_green --json --strict
```

Equivalent npm wrappers:

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:lifecycle:strict -- --pr <number> --trigger approved_and_green
```

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:lifecycle:strict:pr -- <number> --trigger approved_and_green
```

Strict mode is still decide-only. It does not create repair or merge authority.

Wrapper note:

- `ao:lifecycle:strict` remains valid in project mode and in PR mode when you forward `--pr <number>`
- `ao:lifecycle:strict:pr` exists to make the PR-scoped strict form explicit without changing lifecycle's underlying strict contract

## Phase Relationship

### Phase 1 reconciliation

Use reconciliation for:

- AO/GitHub truth comparison
- ownership continuity truth
- PR release-readiness truth
- authoritative PR-scoped automation posture

Authoritative PR command:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

### Phase 2 doctor

Use doctor for:

- local git/worktree diagnosis
- branch/upstream posture checks
- AO artifact review
- suggested local inspection commands

Doctor command:

```bash
node scripts/ao-doctor.js --pr <number>
```

### Phase 3 lifecycle

Use lifecycle for:

- worker routing decisions
- restore-vs-successor decisions
- release-facing hold vs human-ready notification decisions
- trigger-specific control reasoning

Lifecycle consumes reconciliation and doctor. It must not replace them.

## Trigger Vocabulary

Supported triggers:

- `manual`
- `ci_failed`
- `changes_requested`
- `bugbot_comments`
- `merge_conflicts`
- `approved_and_green`
- `agent_stuck`
- `agent_needs_input`
- `agent_exited`

Use underscore names in the CLI, not raw reaction names with hyphens.

## Interpreting Lifecycle Status

Lifecycle `top_status` uses:

1. `source_failure`
2. `human_gate`
3. `handoff`
4. `hold`
5. `observe`
6. `continue`

Interpretation:

- `continue`: lifecycle has a specific next step without a hold or handoff barrier
- `observe`: advisory-only project posture
- `hold`: stop and wait on a known blocking condition
- `handoff`: a successor worker is likely required
- `human_gate`: ambiguity remains too high for safe autonomous control
- `source_failure`: required inputs were not usable enough to decide safely

## Worker Routing vs Release Control

Lifecycle reports two separate decisions:

### Routing decision

This answers:

- continue the current worker
- restore the previous worker
- hand off to a successor
- hold for human

### Release decision

This answers:

- no release action
- wait for CI
- wait for review
- wait for mergeability
- notify the human that the PR appears ready
- human gate

Important:

- `notify_human_ready` is not auto-merge
- human approval remains required
- GitHub remains canonical for mergeability, review, and CI truth

## Suggested Workflow

### For one known PR

1. Run:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

2. If local continuity is relevant, run:

```bash
node scripts/ao-doctor.js --pr <number>
```

3. Run lifecycle for the real trigger:

```bash
node scripts/ao-lifecycle.js --pr <number> --trigger <trigger>
```

4. Follow the reported routing and release decisions.

### For broad operator triage

1. Run:

```bash
node scripts/ao-lifecycle.js
```

2. Inspect:

- `top_status`
- `routing_decision`
- `release_decision`
- `key_findings`
- `suggested_actions`

Remember that project mode is advisory only.

## Strict Exit Codes

Phase-3 strict mode uses:

- `0`: continue
- `30`: observe
- `31`: hold
- `32`: handoff
- `33`: human gate
- `34`: source failure
- `35`: invalid CLI usage

Default human mode is permissive:

- `0`: continue, observe, hold, handoff, or human gate
- `3`: source failure
- `4`: invalid CLI usage

## What Phase 3 Still Does Not Solve

Phase 3 does not:

- spawn workers automatically
- restore sessions automatically
- mutate AO runtime automatically
- merge PRs automatically
- replace GitHub truth
- provide durable lifecycle state storage
- implement a full repo-local control daemon

Those remain later AO work, if they are ever approved for this branch at all.
