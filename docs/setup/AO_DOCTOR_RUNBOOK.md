# AO Doctor Runbook

## Scope

This runbook covers the phase-2 repo-local AO doctor layer in this repo.

Doctor is diagnose-only:

- it does not repair AO runtime
- it does not mutate git state
- it does not change PR ownership
- it does not act as release or merge authority

Doctor exists to explain what an operator should inspect next after phase-1 reconciliation or when local continuity looks unsafe.

## When To Run Doctor

Run doctor when:

- phase-1 reconciliation shows ambiguity or warnings and you need local diagnosis
- a worker appears stuck, exited, or lost continuity
- you suspect local branch/worktree state is causing AO confusion
- you need one command that combines reconciliation truth with local repo/worktree checks

Do not use doctor as a substitute for the phase-1 authoritative PR-scoped reconciliation gate.

## Command Forms

### Project mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:doctor
```

Use this for a broad AO/local continuity sweep.

### Project JSON mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:doctor:json
```

### PR mode

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-doctor.js --pr <number>
```

Use this when one known PR needs deeper local continuity diagnosis after reconciliation.

### Strict mode

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:doctor:strict
```

Or for a PR:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-doctor.js --pr <number> --json --strict
```

Or use the explicit PR wrapper:

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:doctor:strict:pr -- <number>
```

Strict mode is still diagnose-only. It does not create release authority.

Wrapper note:

- `ao:doctor:strict` remains valid in project mode
- `ao:doctor:strict:pr` exists only to make PR-scoped strict usage explicit

## Reconciliation vs Doctor

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
- AO artifact leftover review
- suggested next inspection commands

Doctor consumes reconciliation truth. It must not replace it.

## Interpreting Doctor Status

Doctor `top_status` uses:

1. `source_failure`
2. `blocked`
3. `ambiguous`
4. `warning`
5. `healthy`

Interpretation:

- `healthy`: no significant local or cross-source diagnostic concerns
- `warning`: continuity risk exists, but the workspace is still observable
- `ambiguous`: diagnosis target or local context is unclear
- `blocked`: local posture is operationally unsafe, for example detached HEAD
- `source_failure`: required probes failed and the diagnosis is incomplete

Important:

- reconciliation `blocked` means truth-layer blocking conditions
- doctor `blocked` means stop and inspect before continuing continuity work

Doctor `blocked` does not mean release authority.

## Strict Exit Codes

Phase-2 strict mode uses:

- `0`: healthy
- `20`: warning
- `21`: blocked
- `22`: ambiguous
- `23`: source failure
- `24`: invalid CLI usage

Default human mode is permissive:

- `0`: healthy, warning, blocked, or ambiguous
- `3`: source failure
- `4`: invalid CLI usage

## Common Findings

### Local git/worktree findings

- `dirty_worktree`
- `staged_changes_present`
- `detached_head`
- `missing_upstream_tracking`
- `current_branch_mismatch`
- `pr_scope_not_linked_to_current_branch`

### Artifact findings

- `ao_artifact_leftovers`
- `ao_artifact_scope_conflict`

### Preserved reconciliation findings

Doctor may also surface phase-1 findings such as:

- `no_orchestrator_session`
- `multiple_orchestrator_sessions`
- `stale_orchestrator_session`
- `orphan_open_pr`
- `multiple_candidate_workers`
- `review_blocked`
- `ci_blocked`
- `merge_conflict_blocked`

## Suggested Workflow

### For one known PR

1. Run:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

2. If continuity still looks unhealthy, run:

```bash
node scripts/ao-doctor.js --pr <number>
```

3. Follow the suggested inspection commands from doctor output.

### For broad operator triage

1. Run:

```bash
npm run ao:doctor
```

2. Inspect:

- `source_health`
- local branch/worktree summary
- `key_findings`
- `suggested_commands`

## What Phase 2 Still Does Not Solve

Phase 2 does not:

- repair AO runtime automatically
- restart or recreate sessions
- reassign ownership
- merge PRs
- decide release readiness independently
- implement lifecycle/control-plane authority

Those remain later AO work.
