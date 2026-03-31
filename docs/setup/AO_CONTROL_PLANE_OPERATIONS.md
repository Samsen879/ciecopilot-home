# AO Control Plane Operations

## Scope

This document explains how the repo-local AO control-plane commands fit together operationally after the continuous controller runtime work in issue `#125`.

The control plane is still operator-started and operator-visible:

- no hidden background bootstrap
- no webhook-first orchestration
- no auto-merge
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
node scripts/ao-controller.js --continuous --mode shadow --poll-interval-ms 30000
```

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

### `ao-state`

`ao-state` is the operator inspection surface across the control plane.

Use it to:

- confirm controller health and holder posture
- inspect overrides, checkpoints, handoffs, and recent audit activity
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

## Day-2 Operating Pattern

### 1. Define Scope

Use `ao-manage` to enroll or resume the tasks AO should own. The controller only converges managed tasks.

### 2. Start One Controller Leader

Start exactly one continuous `ao-controller` per repo. Confirm health in `ao-state`.

### 3. Inspect Runtime Posture

Check:

- `controller_health`
- `controller_runtime`
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
2. Request and accept a successor handoff
3. Resume work from the latest valid checkpoint as needed

## Operational Boundaries

Keep these boundaries explicit:

- `ao-controller` is the convergence loop
- `ao-manage` changes management scope and ownership lifecycle
- `ao-override` records human control posture
- `ao-handoff` records successor routing and transfer intent
- `ao-state` is the operator-visible truth surface

Mixing those roles by hand-editing raw state defeats the control-plane design. Use the repo-local commands instead.
