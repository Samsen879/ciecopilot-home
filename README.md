# AO Pilot

Experimental control plane for AI-assisted coding workflows.

AO Pilot is a personal research prototype for managing long-running, PR-based coding work with agent sessions such as Codex-style workers. It explores how an operator can keep AI-assisted development from turning into an unmanaged pile of branches, stale sessions, ambiguous PR states, and unclear release decisions.

This repository is **not a polished open-source product** and is **not production-ready**. It is a working lab for control-plane ideas that were developed while building CIE Copilot.

## What this project explores

AO Pilot focuses on the coordination layer around AI coding agents rather than on code generation itself.

Core ideas:

- **Managed tasks**: represent issue-backed units of work with durable task IDs, branch bindings, worktree bindings, owner sessions, and PR bindings.
- **Ownership and handoff**: track which session owns a task, whether the owner is still valid, and how a successor session can safely continue work.
- **PR reconciliation**: compare local AO state with GitHub PR state, CI state, branch state, and review state.
- **Lifecycle diagnosis**: detect blocked, ambiguous, orphaned, stale, or release-ready work.
- **Controller modes**: separate observe, shadow, and assist modes so automation can be introduced gradually.
- **Human gates**: keep review and release decisions explicit instead of letting automation silently merge or ship changes.

The goal is not to replace a developer. The goal is to make AI-assisted development auditable, recoverable, and safer when multiple tasks and sessions are active.

## Current status

This repository should be read as an **experimental control-plane prototype**.

What is present:

- Node.js CLI scripts for AO task management, reconciliation, doctor checks, lifecycle checks, handoff, state inspection, and controller execution.
- A v1alpha-style state contract for managed tasks, ownership leases, controller leases, actions, overrides, handoffs, reviews, checkpoints, and measurements.
- Acceptance tests covering representative PR lifecycle cases such as clean continuity, failed CI, approved green PRs, orphaned ownership, stale ownership, and cross-source disagreement.
- Compatibility code from the original CIE Copilot development environment.

What is not guaranteed yet:

- Stable public API.
- Clean extraction from the CIE Copilot codebase.
- Production deployment safety.
- Complete documentation for new external contributors.
- A finalized license.

## Repository background

AO Pilot started as an internal control-plane experiment inside the CIE Copilot project. Some names, defaults, scripts, and environment variables still reference `ciecopilot-home`. That is intentional historical context, not a claim that this repository is a finished CIE Copilot distribution.

The current default project ID in many scripts is still:

```bash
ciecopilot-home
```

For a different project, pass `--project <project_id>` where supported.

## Main CLI entry points

The AO scripts are exposed through `package.json`.

```bash
npm run ao:start:clean
npm run ao:reconcile
npm run ao:doctor
npm run ao:lifecycle
npm run ao:state
npm run ao:knowledge
npm run ao:manage
npm run ao:handoff
npm run ao:override
npm run ao:controller
npm run ao:test:acceptance
npm run ao:smoke
```

Most scripts also support `--json` for machine-readable output.

## Quick start

Install dependencies:

```bash
npm ci
```

Optional environment setup:

```bash
cp .env.example .env
```

Run the AO acceptance tests:

```bash
npm run ao:test:acceptance
```

Run a basic doctor check:

```bash
npm run ao:doctor -- --project ciecopilot-home
```

Run a PR-scoped reconciliation:

```bash
npm run ao:reconcile -- --pr <number> --json --strict
```

Start from a clean AO runtime state:

```bash
npm run ao:start:clean:dry
npm run ao:start:clean
```

The dry-run form is recommended first because the clean-start flow may call the external `ao` CLI, install local Git hooks, synchronize workflow baselines, and start an AO project session.

## Example workflow model

A typical AO-managed coding loop looks like this:

1. Create or identify an issue-backed task.
2. Enroll the task with a durable branch and worktree binding.
3. Let a worker session implement the change.
4. Reconcile the AO state with GitHub PR, CI, branch, and review state.
5. Diagnose whether the task is healthy, ambiguous, blocked, or release-ready.
6. If the worker session stops, use checkpoints and handoff records to resume safely.
7. Keep final review and release decisions behind explicit human gates.

## Important commands

### Reconcile AO and GitHub state

```bash
npm run ao:reconcile -- --pr <number> --json --strict
```

Used to compare AO's local state model with PR state, branch state, status checks, and review posture.

### Diagnose project or PR health

```bash
npm run ao:doctor -- --json
npm run ao:doctor -- --pr <number> --json --strict
```

Used to surface blocked, ambiguous, stale, orphaned, or unhealthy work.

### Inspect lifecycle readiness

```bash
npm run ao:lifecycle -- --pr <number> --json --strict
```

Used to inspect whether a PR has enough continuity, CI, and review evidence to move forward.

### Manage a task

```bash
npm run ao:manage -- enroll \
  --issue <number> \
  --title "Task title" \
  --branch <branch-name> \
  --worktree <path>
```

Supported task operations include:

- `enroll`
- `adopt`
- `resume`
- `unmanage`
- `retire`

### Handoff between sessions

```bash
npm run ao:handoff -- request --issue <number> --successor-session <session-name>
npm run ao:handoff -- inspect --issue <number> --json
```

Used when one session needs to stop and another session needs enough context to continue safely.

### Run the controller

```bash
npm run ao:controller -- --holder <operator-id> --mode observe --json
npm run ao:controller -- --holder <operator-id> --mode shadow --json
npm run ao:controller -- --holder <operator-id> --mode assist --json
```

Controller modes are intentionally separated:

- `observe`: inspect and report only.
- `shadow`: propose actions without executing them.
- `assist`: execute allowed actions according to policy.

## Safety posture

AO Pilot is designed around conservative automation.

The intended posture is:

- prefer explicit state over implicit assumptions;
- prefer `blocked` or `ambiguous` over unsafe progress;
- preserve human review gates;
- keep machine-readable JSON outputs for auditability;
- make handoff and ownership transitions durable rather than conversational only.

## Why this exists

AI coding agents are powerful, but the surrounding workflow can become fragile:

- multiple workers touch different branches;
- PRs become stale or orphaned;
- CI and review state drift away from local assumptions;
- one session stops without leaving enough recovery context;
- automation proposes actions without a clear policy boundary.

AO Pilot is an attempt to build the missing control plane around that workflow.

## Notes for readers

This is a personal experimental repository. Low polish, old project names, and compatibility paths are expected. The interesting part is the control-plane model: state contracts, reconciliation, lifecycle diagnosis, handoff, policy decisions, and controller execution modes.

If you are reviewing this repository as part of my GitHub profile, the best interpretation is:

> A prototype showing how I think about AI-assisted software engineering systems, not a finished product asking for users.
