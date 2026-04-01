# AO Continuity Runbook

## Scope

This runbook covers the phase-4 repo-local AO continuity layer in this repo.

Continuity is bind-and-hold only:

- it persists durable branch and worktree bindings
- it records local occupancy, cleanliness, HEAD posture, and last safe observation
- it fails closed when local continuity looks unsafe
- it does not clean a worktree automatically
- it does not recreate sessions automatically
- it does not permit same-branch parallel writers
- it does not act as a merge or release authority

Continuity exists to answer one operator question:

- is this task safe to resume in the current local worktree, or should it hold for human review?

## What Continuity Persists

Each durable worktree binding records:

- `task_id`
- `branch_name`
- `worktree_path`
- `owner_session_name`
- `owner_session_id`
- `occupancy_status`
- `cleanliness_status`
- `head_status`
- `continuity_status`
- `last_observed_at`
- `last_observed`
- `last_safe_observed_at`
- `last_safe_observation`

This is the operator-visible local continuity record for one managed task.

## When To Use This Runbook

Use this runbook when:

- a worker exited and you need to decide whether resume is safe
- doctor reports a worktree continuity finding
- `ao:state` shows non-`safe_resume` continuity counts
- a paused task still has a durable worktree binding
- you suspect branch drift, detached HEAD, dirty state, or conflicting occupancy

Do not use this runbook as a substitute for phase-1 reconciliation truth or phase-2 diagnosis.

## Command Forms

### State snapshot

```bash
cd /home/samsen/code/ciecopilot-home
npm run ao:state:json
```

Inspect:

- `summary.worktree_binding_count`
- `summary.active_worktree_binding_count`
- `summary.worktree_continuity_counts`
- `worktrees.bindings`

### PR-scoped diagnosis

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-doctor.js --pr <number> --json --strict
```

Inspect:

- `top_status`
- `worktree_safety`
- worktree-related findings such as `dirty_worktree_hold`

### Explicit resume

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-manage.js resume --issue <number> --owner-session <session> --owner-session-id <session>
```

`resume` is fail-closed. It only proceeds when the durable binding continuity is:

- `safe_resume`
- `stale_local_occupancy`

### Pause management while preserving bindings

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-manage.js unmanage --issue <number> --reason worker_exited
```

Use this when a worker stops but the durable local continuity record should remain available for later inspection.

### Inspect or route successor handoff

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-handoff.js inspect --issue <number> --json
```

Use handoff inspection when the durable binding is stale but a successor may need explicit authority before resume.

## Continuity Classifications

### `safe_resume`

Meaning:

- the durable branch/worktree binding matches the current local state
- no conflicting occupancy is visible
- the local posture is clean enough for bounded continuity repair

Operator action:

- resume is allowed
- proceed with normal ownership continuity checks

### `stale_local_occupancy`

Meaning:

- the durable binding still matches the local worktree
- the last owner lease is no longer active
- the last safe local observation is still preserved

Operator action:

- inspect whether the prior worker is truly gone
- use explicit handoff if a successor will take over
- resume only after ownership continuity is correct

Important:

- stale occupancy is not permission to run parallel writers
- do not create a second writer on the same branch/worktree

### `dirty_worktree_hold`

Meaning:

- the current local worktree is dirty
- bounded continuity repair must stop

Operator action:

1. inspect `git status`
2. decide whether the local changes belong to the managed task
3. keep or hand off the work deliberately

Do not:

- auto-clean
- discard changes
- assume resume is safe

### `detached_head_hold`

Meaning:

- local HEAD is detached
- stable branch continuity is not provable

Operator action:

1. inspect `git branch --show-current`
2. inspect `git status`
3. restore explicit branch context before attempting resume

### `branch_mismatch_hold`

Meaning:

- the current branch or worktree path does not match the durable binding

Operator action:

1. compare the binding record to the current local branch and path
2. decide whether the operator is in the wrong worktree or the binding is outdated
3. do not resume until branch and path are intentionally aligned

### `conflicting_local_occupancy`

Meaning:

- another active task claims the same branch or worktree path, or
- multiple active owners conflict for the same task

Operator action:

1. stop
2. inspect durable worktree bindings and ownership leases
3. resolve the conflict explicitly with human review or handoff

Do not:

- force resume
- allow same-branch parallel writers

## Suggested Operator Workflow

### For one known PR

1. Run reconciliation truth:

```bash
node scripts/ao-reconcile.js --pr <number> --json --strict
```

2. Run doctor:

```bash
node scripts/ao-doctor.js --pr <number> --json --strict
```

3. Inspect durable continuity state:

```bash
npm run ao:state:json
```

4. If continuity is `safe_resume`, resume explicitly.

5. If continuity is `stale_local_occupancy`, inspect handoff state before resume.

6. If continuity is any hold status, stop and resolve the local condition first.

### For worker exit continuity repair

1. Preserve bindings:

```bash
node scripts/ao-manage.js unmanage --issue <number> --reason worker_exited
```

2. Inspect the durable worktree record with `ao:state` and doctor.

3. If the same worker is returning and the binding is safe, use `resume`.

4. If a successor is taking over, use the explicit handoff flow first and then `resume`.

## Fail-Closed Rules

Continuity must fail closed when:

- local worktree is dirty
- HEAD is detached
- branch or worktree path does not match the durable binding
- conflicting local occupancy exists
- no safe durable observation exists for resume

`resume` must not paper over these states.

## What Continuity Still Does Not Solve

Continuity does not:

- determine PR release readiness
- replace reconciliation
- replace doctor
- choose the successor automatically
- clean a worktree
- repair arbitrary git damage
- authorize destructive cleanup

Those remain operator decisions or later AO layers.
