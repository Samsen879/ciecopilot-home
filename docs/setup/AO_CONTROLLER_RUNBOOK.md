# AO Controller Runbook

## Scope

This runbook covers the continuous repo-local AO controller runtime added in issue `#125`.

The controller is the control-plane sidecar authority for this repo:

- one durable leader per repo
- continuous observe/shadow/assist passes
- heartbeat-backed leadership
- safe stale-leader reclaim
- operator-visible runtime posture through `ao-state`

This runbook does not introduce hidden background services. Operators still start and stop the controller explicitly.

## Before You Start

Confirm the repo already has AO control-plane state and the tasks you want to manage are enrolled.

Useful checks:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-state.js
```

If the controller mode is still `off`, start the controller with an explicit mode override.

## Start The Continuous Controller

Recommended pattern:

```bash
cd /home/samsen/code/ciecopilot-home
AO_SESSION_NAME=ao-controller-main \
node scripts/ao-controller.js \
  --continuous \
  --holder ao-controller-main \
  --mode shadow \
  --poll-interval-ms 30000 \
  --shutdown-timeout-ms 10000
```

Notes:

- `AO_SESSION_NAME` should be stable for a long-running controller instance.
- when AO session environment is absent, `--holder <id>` is required so manual starts cannot share an unsafe implicit holder identity
- `--mode observe|shadow|assist` both sets the durable controller mode and starts the runtime in that mode.
- omit `--mode` when you want to reuse the durable mode already recorded in AO state.
- `--poll-interval-ms` is the explicit pass cadence for the continuous runtime.
- `--shutdown-timeout-ms` records the intended shutdown grace posture for operators; the controller still finishes the in-flight pass before releasing leadership.

## Inspect Controller Health

Human summary:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-state.js
```

Machine-readable inspection:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-state.js --json
```

Inspect the `controllers` array. The important fields are:

- `controller_id`
- `configured_mode`
- `runtime_kind`
- `health_status`
- `lease_status`
- `holder_id`
- `heartbeat_at`
- `expires_at`
- `poll_interval_ms`
- `shutdown_timeout_ms`
- `last_run_started_at`
- `last_run_completed_at`
- `last_run_status`

Interpretation:

- `healthy`: an active leader is renewing heartbeat before lease expiry
- `stale`: a leader lease is still recorded but its expiry window has passed
- `idle`: the controller mode is on, but no active leader is running
- `off`: the durable controller mode is off

## Read Controller Decision Chains

In shadow or assist mode, each controller `task_results[*]` now carries a shared `decision_chain` summary.

Read these fields before re-deriving anything from prompt text:

- `decision_chain.contract_status`
- `decision_chain.blocking_reasons`
- `decision_chain.next_actions`
- `decision_chain.next_commands`

This is the stable bridge between:

- reconcile truth
- doctor diagnosis
- lifecycle control decisions

Project-mode advisory passes may still show advisory chain posture. PR-scoped trigger passes should show `authoritative_pr_chain`.

## Read Controller Continuity

Controller `task_results[*]` now also carry a phase-3 `continuity` summary.

Read these fields together with the decision chain:

- `continuity.posture`
- `continuity.recommended_action`
- `continuity.owner_session_name`
- `continuity.successor_session_name`
- `continuity.checkpoint_state`

Interpretation:

- use `decision_chain` to understand why the controller reached its phase-1/2/3 conclusion
- use `continuity` to understand whether the current task is in active-owner, restore-ready, successor-handoff, orphaned, or ambiguous posture
- if `decision_chain.next_actions` and `continuity.recommended_action` disagree, stop and inspect the underlying task state before executing anything higher-risk
- if `continuity.posture` is `restore_ready`, only treat that as resumable when `continuity.checkpoint_state` is `valid`
- if `continuity.posture` is `handoff_granted`, the next safe manual follow-up is `ao-manage resume` for the accepted successor, not a fresh enroll/adopt

## Read Controller Review Gate

Once a durable `ao-review` request exists, controller release-facing advancement is gated by that review state.

Read these fields together:

- `task_results[*].release_decision.disposition`
- `task_results[*].release_decision.basis`
- `task_results[*].decision_chain.next_actions`
- `task_results[*].decision_chain.blocking_reasons`
- `ao-state --json`: `reviews.summary`
- `ao-state --json`: `reviews.inspections[*]`

Interpretation:

- `release_decision.disposition = await_review` with basis such as `review_pending`, `review_missing`, or `review_target_mismatch` means the controller must not advance to `notify_human_ready`
- `release_decision.disposition = no_release_action` with basis `review_changes_required` means the slice has been sent back to implementation
- `release_decision.disposition = human_gate` with basis `review_escalated` means reviewer authority ended and a human must decide next
- when the review gate is active, expect `decision_chain.next_actions` to show `hold_review` or `human_gate`, not `notify_human_ready`
- first release is explicit only: the gate activates from durable review state created by `ao-review request`; the controller does not auto-spawn reviewers

## Read Assist Execution Verdict

In assist mode, each controller `task_results[*]` now also carries `assist_actions[*]`.

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

- `model_executable=true` means the action passed the phase-4 Class A allowlist and its structural preconditions
- `execution_reason` is the concrete operator answer for the final execution outcome
- `idempotency_mode=action_status_gate` means assist will not re-execute an action after it has left `proposed`
- `rollback_mode=audit_only` means the action is intentionally limited to low-risk control-plane side effects, not auto-reversal
- if `policy_decision` is `deny` or `downgrade`, the action remains blocked even if `model_executable=true`
- if a review freeze is active, assist should surface `hold_review` as an advisory blocked action instead of auto-running `continue_worker` or `notify_human_ready`

## Stop The Controller

Use `Ctrl-C` in the foreground process, or send `SIGTERM` / `SIGINT` to the controller process.

Example:

```bash
pkill -TERM -f "node scripts/ao-controller.js --continuous"
```

Shutdown behavior:

- AO does not start another pass after the stop request lands
- if the controller is sleeping between polls, it exits promptly
- if a pass is already running, AO cooperatively requests shutdown and bounds the in-flight wait by `--shutdown-timeout-ms`
- long-running passes continue renewing heartbeat during the shutdown window so healthy leaders are not reclaimed as stale mid-exit
- if the in-flight work does not stop before the timeout, AO exits the runtime with a bounded `shutdown_timeout` stop reason and releases leadership cleanly
- the final lease release is visible in `ao-state`

## Restart Semantics

The controller runtime is replay-safe across restarts:

- restarting with the same `AO_SESSION_NAME` renews the same leader lease instead of tripping split-brain protection
- restarting with a different holder only succeeds if the prior lease is stale
- repeated continuous passes keep one active leader lease instead of acquiring and releasing leadership every pass

## Recover A Stale Leader

Use this flow when `ao-state` shows controller health as `stale` or the recorded holder is gone.

1. Inspect state first:

```bash
cd /home/samsen/code/ciecopilot-home
node scripts/ao-state.js --json
```

2. Confirm the recorded `holder_id` is not actually still running.

3. Start a replacement controller with a new session name:

```bash
cd /home/samsen/code/ciecopilot-home
AO_SESSION_NAME=ao-controller-recovery \
node scripts/ao-controller.js \
  --continuous \
  --holder ao-controller-recovery \
  --poll-interval-ms 30000 \
  --shutdown-timeout-ms 10000
```

4. The replacement controller will:

- mark the stale leader lease as expired
- acquire a fresh active lease for itself
- continue the control loop without split-brain scheduling

If AO reports a fresh active leader instead of a stale one, do not start a second controller. Stop and coordinate with the current holder.

## Low-Risk Recovery Posture

When recovering after an outage or uncertain local state, prefer:

```bash
cd /home/samsen/code/ciecopilot-home
AO_SESSION_NAME=ao-controller-recovery \
node scripts/ao-controller.js \
  --continuous \
  --holder ao-controller-recovery \
  --mode observe \
  --poll-interval-ms 30000 \
  --shutdown-timeout-ms 10000
```

That keeps the controller authoritative for observation and state convergence without proposing or executing higher-risk actions.
