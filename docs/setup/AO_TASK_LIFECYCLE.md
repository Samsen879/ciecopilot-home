# AO Task Lifecycle

## Scope

This document defines the phase-5 task lifecycle for repo-local AO managed tasks.

It answers three separate questions:

- what durable status a managed task is in
- which command transitions it
- how closeout should treat it

## Durable Task Status

Managed task status stays intentionally small:

- `active`: AO is currently managing the task
- `paused`: AO is holding the task without retiring its history
- `retired`: AO has finished active management and released live bindings

## Command Mapping

- `ao-manage enroll` creates or activates a managed task
- `ao-manage adopt` re-activates a paused task
- `ao-manage resume` re-activates work from a valid checkpoint or accepted successor handoff
- `ao-manage unmanage` pauses the task
- `ao-manage retire` retires the task and releases bound PR / ownership state

## Closeout Mapping

Workflow closeout is the merge-side lifecycle bridge.

When the repository contains `scripts/ao-manage.js`, this is the expected closeout path:

1. human merges the PR
2. operator runs `npm run workflow:task:closeout -- --branch <branch> --confirm closeout`
3. closeout runs `ao-manage retire`
4. closeout removes the task worktree and local task branch
5. baseline sync runs

This means closeout is now a full-lifecycle action, not only a Git cleanup step.

## AO State Closeout Status

`ao-state --json` exposes one operator-facing closeout status per task:

- `active`
- `hold`
- `ready_to_retire`
- `retired`

Interpretation:

- `active`: continue normal management
- `hold`: task should stay visible and managed, but not retired yet
- `ready_to_retire`: local AO state is quiet enough that the next closeout should retire the task
- `retired`: no further active management is expected

## Invariants

- merge alone does not count as AO closeout until the managed task is retired
- closeout should not delete durable AO history
- `retired` tasks may still retain checkpoints, released bindings, handoff history, audit entries, and metrics for traceability
