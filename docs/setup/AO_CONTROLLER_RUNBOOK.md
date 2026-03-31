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
  --mode shadow \
  --poll-interval-ms 30000 \
  --shutdown-timeout-ms 10000
```

Notes:

- `AO_SESSION_NAME` should be stable for a long-running controller instance.
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

## Stop The Controller

Use `Ctrl-C` in the foreground process, or send `SIGTERM` / `SIGINT` to the controller process.

Example:

```bash
pkill -TERM -f "node scripts/ao-controller.js --continuous"
```

Shutdown behavior:

- AO does not start another pass after the stop request lands
- if the controller is sleeping between polls, it exits promptly
- if a pass is already running, AO completes that pass and then releases leadership
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
  --mode observe \
  --poll-interval-ms 30000 \
  --shutdown-timeout-ms 10000
```

That keeps the controller authoritative for observation and state convergence without proposing or executing higher-risk actions.
