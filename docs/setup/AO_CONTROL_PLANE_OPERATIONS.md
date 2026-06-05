# AO Control Plane Operations

## Scope

This document explains how the repo-local AO control-plane commands fit together operationally after the continuous controller runtime work in issue `#125`.

The control plane is still operator-started and operator-visible:

- no hidden background bootstrap
- no webhook-first orchestration
- auto-merge is default-on only after AO release gates pass
- no host-project business logic

## Tool Roles

### `ao-controller`

`ao-controller` is the continuous control-plane authority.

Use it to:

- run observe/shadow/assist passes continuously
- own the durable controller leader lease
- renew heartbeat
- reclaim stale leadership safely

Typical command:

```bash
cd /home/samsen/code/ciecopilot-home
AO_SESSION_NAME=ao-controller-main \
node scripts/ao-controller.js --continuous --holder ao-controller-main --mode shadow --poll-interval-ms 30000
```

Manual-start rule:

- if AO does not provide `AO_SESSION_NAME` or `AO_SESSION_ID`, operators must pass `--holder <id>`
- reuse the same durable holder id when intentionally restarting the same controller instance

## Phase-4 Assist Execution Contract

Phase 4 promotes assist execution from a proposal-only scaffold into a bounded execution surface.

Current execution rule:

- only Class A actions may auto-execute
- every auto-execution still requires durable policy `allow`
- every auto-execution still requires runtime preflight status `clean`
- replay remains idempotent through `action_status_gate`: once an action record is no longer `proposed`, assist does not execute it again
- assist auto-merges release-ready AO-managed PRs by default through `auto_merge_ready_pr`

Current class boundary:

- `class_a`: low-risk repo-local control actions that may auto-execute after policy and preflight gates pass
- `class_a` also includes `auto_merge_ready_pr`, which mutates GitHub only after fresh PR state confirms approval, CI, mergeability, non-draft state, and expected head SHA
- `class_b`: advisory or hold posture only; never auto-executes in phase 4
- `class_c`: ownership-transfer or similarly high-risk actions; never auto-executes in phase 4

Current allowlist:

- `continue_worker`
- `notify_human_ready`
- `auto_merge_ready_pr`

Still blocked:

- `restore_worker`
- `handoff_worker`
- any merge action other than `auto_merge_ready_pr`

Rollback posture:

- Class A: `audit_only`
- Class B: `not_applicable`
- Class C: `manual_only`

Operator explanation surfaces:

- `ao-controller --json`: `task_results[*].assist_actions[*]`
- `ao-state --json`: `actions.recent[*]`

Read these fields first:

- `risk_class`
- `policy_decision`
- `model_executable`
- `model_reason`
- `execution_reason`
- `runtime_preflight_status`
- `idempotency_mode`
- `rollback_mode`

Interpretation:

- `model_executable=true` means the phase-4 allowlist and preconditions permit execution in principle
- `policy_decision=deny|downgrade` still blocks actual execution even when the model is executable
- `execution_reason` is the operator-facing answer to “why did this run or why was it blocked?”
- explicit review freeze can still replace a release-facing `auto_merge_ready_pr` proposal with `hold_review`; in that case the action is blocked by review posture, not by policy downgrade

## Independent Reviewer Gate Contract

Independent review is now a durable control-plane surface.

First-release rule:

- review starts only when the implementation worker explicitly emits `ready_for_review`
- AO records that request through `ao-review`
- controller and lifecycle fail closed only when that durable review state exists and has not passed for the current target SHA
- auto-merge remains blocked until the review gate passes for the current target SHA
- reviewer read-only is convention-enforced in v1, not OS- or git-sandbox enforced

Current review posture vocabulary:

- `review_pending`: the request is open or claimed and implementation progression is frozen
- `review_changes_required`: the reviewer sent the slice back to implementation
- `review_passed`: the reviewer cleared the current target SHA
- `review_escalated`: the reviewer could not safely resolve inside reviewer authority

Current reviewer authority:

- may read repo contents
- may run local verification
- may inspect `ao-state`
- may inspect GitHub read-only state
- may not edit files, push, merge, or silently replace ownership

Primary operator surfaces:

- `ao-review inspect --json`
- `ao-state --json`: `reviews.summary`
- `ao-state --json`: `reviews.inspections[*]`
- `ao-manage ... --json`: result-level `review`
- `ao-controller --json`: `task_results[*].release_decision`, `task_results[*].decision_chain`, `task_results[*].assist_actions[*]`

Read these review fields first:

- `posture`
- `reviewer_session_name`
- `target_head_sha`
- `freeze_status`
- `blocking_reason`

Interpretation:

- if `reviews.inspections[*].posture = review_pending`, the implementation slice is frozen and `auto_merge_ready_pr` must not advance
- if `reviews.inspections[*].posture = review_changes_required`, the next safe step is more implementation work, not human-ready notification
- if `reviews.inspections[*].posture = review_escalated`, stop for explicit human judgment
- if `reviews.inspections[*].posture = review_passed`, the release-facing path may continue for that exact target SHA

### `ao-manage`

`ao-manage` defines what AO is responsible for at the task level.

Use it to:

- enroll a new issue-backed task
- adopt or resume an existing task
- pause management with `unmanage`
- retire a task cleanly

Typical commands:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-manage.js enroll --issue 125 --branch feat/125 --worktree /path/to/worktree
```

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-manage.js resume --issue 125
```

Read `ao-manage ... --json` or the human summary for:

- `continuity.posture`
- `continuity.recommended_action`
- `continuity.owner_session_name`
- `continuity.successor_session_name`
- `continuity.checkpoint_state`

### `ao-override`

`ao-override` is the durable human control surface.

Use it to:

- hold autonomy globally or for one task / PR / controller
- record temporary policy posture changes
- clear overrides after review or incident recovery

Typical commands:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-override.js create \
  --scope-kind controller \
  --scope-id default \
  --kind hold_autonomy \
  --value '{"enabled":true}'
```

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-override.js list
```

### `ao-handoff`

`ao-handoff` is the successor-routing surface for task ownership continuity.

Use it to:

- request a successor handoff when the current owner is stale or blocked
- let a successor claim the work
- accept or reject the claim
- inspect handoff posture before transfer

Typical commands:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-handoff.js request --issue 125 --successor-session cie-125-successor --reason owner_stale
```

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-handoff.js inspect --issue 125
```

### `ao-review`

`ao-review` is the explicit independent-review surface.

See [AO Review Runbook](/home/samsen/code/ciecopilot-home/docs/setup/AO_REVIEW_RUNBOOK.md) for the full reviewer contract and operating loop.

Use it to:

- request review after implementation reaches an explicit `ready_for_review` checkpoint
- let a separate reviewer session claim the task
- record `pass`, `changes_required`, or `escalate_human`
- inspect the current review posture and freeze status

Typical commands:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-review.js request --issue 125 --target-branch feat/125 --target-sha <sha> --verification-baseline-json '[{"category":"workspace_sanity","commands":["git status --short"]}]'
```

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-review.js inspect --issue 125 --json
```

### `ao-state`

`ao-state` is the operator inspection surface across the control plane.

Use it to:

- confirm controller health and holder posture
- inspect overrides, checkpoints, handoffs, reviews, and recent audit activity
- verify that the controller is running continuously instead of one-shot

Typical commands:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-state.js
```

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-state.js --json
```

## Phase-3 Continuity Contract

Phase 3 now exposes one shared continuity summary across the control plane.

Read these fields first:

- `continuity.posture`
- `continuity.recommended_action`
- `continuity.owner_session_name`
- `continuity.successor_session_name`
- `continuity.checkpoint_state`

Current posture vocabulary:

- `active_owner`: one owner is clearly resumable right now
- `restore_ready`: the prior owner is known and the latest checkpoint is valid enough to restore
- `handoff_pending`: successor routing has started but is not yet granted
- `handoff_granted`: successor routing is accepted and waiting for resume / transfer completion
- `orphaned`: no safe current owner is present, so a successor path is needed
- `ambiguous`: continuity signals conflict, so the human must resolve ownership first
- `retired`: the task is no longer active

Surface map:

- `ao-state --json`: `continuity.summary` and `continuity.inspections[*]`
- `ao-handoff inspect --json`: per-task `continuity`
- `ao-manage ... --json`: result-level `continuity`
- `ao-controller` shadow/assist results: `task_results[*].continuity`

Operator reading rule:

- read `decision_chain` when the question is “why did lifecycle/controller classify this trigger this way?”
- read `continuity` when the question is “do I restore the prior owner, resume a granted successor, request a handoff, or stop for human resolution?”
- read `assist_actions` / `actions.recent` when the question is “why was this specific action auto-executable or blocked?”
- read `reviews` when the question is “who is reviewing this exact SHA and why is release-facing progress blocked or released?”

## Phase-5 Closeout And Retention Contract

Phase 5 extends the control plane from “manage current work” into “retire and retain work cleanly after merge”.

The closeout rule is now:

- human merges the PR
- operator runs `npm run workflow:task:closeout -- --branch <branch> --confirm closeout`
- when repo-local `scripts/ao-manage.js` exists, closeout retires the managed AO task before removing the task worktree and branch
- durable AO state is retained as released / retired history; it is not deleted during closeout

Read these fields in `ao-state --json`:

- `tasks.summary.closeout_status_counts`
- `tasks.inspections[*].task_status`
- `tasks.inspections[*].closeout_status`
- `tasks.inspections[*].recommended_action`
- `tasks.inspections[*].review_posture`
- `tasks.inspections[*].review_blocking_reason`

Current closeout vocabulary:

- `active`: task is still actively managed
- `hold`: task should remain managed but not yet retired
- `ready_to_retire`: local AO state is quiet enough that the next closeout should retire it
- `retired`: closeout has already retired the managed task

Retention rule:

- worktrees and local task branches are cleanup targets
- durable task, binding, lease, checkpoint, handoff, audit, and metric records are retained for traceability
- archival / compaction is a later explicit operation, not part of normal closeout

## Phase-6 Historical Debt And Soak Contract

Phase 6 adds two operator evidence loops:

- historical debt inventory
- soak and incident drills

`ao-state --json` is now the first debt triage surface.

Read:

- `ao-state --json`: `debt.summary.category_counts`
- `ao-state --json`: `debt.summary.item_kind_counts`
- `ao-state --json`: `debt.inspections[*]`

Debt category vocabulary:

- `keep_evidence`: still-live repo-local evidence that should stay in place for the current task posture
- `archive_candidate`: retired durable history that should remain traceable now and can be considered for later archival
- `cleanup_candidate`: repo-local noise, stale worktree residue, stale lease residue, or loose artifacts that should be cleaned with an explicit operator action

Common item kinds:

- `task_worktree`
- `task_branch`
- `controller_lease`
- `ownership_lease`
- `artifact`
- `managed_task`

Operating rule:

- do not use destructive reset commands as debt cleanup shortcuts
- inspect `debt.inspections[*].recommended_action` and `reason_codes` before deleting anything
- phase 6 cleanup should stay controlled, reversible where possible, and audit-friendly

Soak / drill rule:

- keep using the normal control-plane commands as the truth source
- record repeated smoke and acceptance evidence instead of relying on one “looked fine” run
- treat incident drills as operator evidence, not as model-only reasoning

## Day-2 Operating Pattern

### 1. Define Scope

Use `ao-manage` to enroll or resume the tasks AO should own. The controller only converges managed tasks.

### 2. Start One Controller Leader

Start exactly one continuous `ao-controller` per repo. Confirm health in `ao-state`.

### 3. Inspect Runtime Posture

Check:

- `controller_health`
- `controller_runtime`
- `continuity`
- `active_overrides`
- `checkpoints`
- `handoffs`
- recent audit entries

### 4. Apply Human Holds When Needed

If autonomy needs to pause, record that with `ao-override` instead of relying on informal operator memory.

### 5. Route Ownership Explicitly

If a worker is stale or needs replacement, use `ao-handoff` to make the successor path durable and inspectable.

### 6. Resume Normal Convergence

After review, clear overrides and keep the controller running continuously. Do not rely on ad-hoc one-shot reruns as the steady-state operating model.

## Recommended Incident Flows

### Controller process died

1. Run `node scripts/ao-state.js --json`
2. Confirm whether controller health is `idle` or `stale`
3. Restart `ao-controller --continuous`
4. Verify a new healthy leader heartbeat appears

### Fresh leader already exists

1. Do not start a second controller
2. Inspect `holder_id`, `heartbeat_at`, and `expires_at`
3. Coordinate with the existing holder or wait for the lease to become stale

### Need to freeze autonomy before investigation

1. Create a controller-scoped or task-scoped override with `ao-override`
2. Leave the controller running in observe mode if you still want inspection and state convergence
3. Clear the override when the incident closes

### Owner continuity is broken

1. Inspect the task with `ao-handoff`
2. Read `continuity.posture`, `continuity.recommended_action`, and `continuity.checkpoint_state`
3. If posture is `handoff_pending` or `orphaned`, request and accept a successor handoff
4. If posture is `handoff_granted`, resume the accepted successor with `ao-manage resume`
5. If posture is `restore_ready`, resume the prior owner only from the valid checkpoint path
6. If posture is `ambiguous`, stop and resolve ownership manually before any resume

### Worker exited but prior owner is still recoverable

1. Run `node scripts/ao-state.js --json`
2. Find the task in `continuity.inspections[*]`
3. If posture is `restore_ready` and checkpoint state is `valid`, resume the same owner
4. If posture is not `restore_ready`, do not guess; inspect `ao-handoff` and lifecycle output first

## Operational Boundaries

Keep these boundaries explicit:

- `ao-controller` is the convergence loop
- `ao-manage` changes management scope and ownership lifecycle
- `ao-override` records human control posture
- `ao-handoff` records successor routing and transfer intent
- `ao-state` is the operator-visible truth surface

Mixing those roles by hand-editing raw state defeats the control-plane design. Use the repo-local commands instead.
