# AO Blocked Escalation PR1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first AO blocked-escalation slice: task-chain blockers produce a typed action, durable audit/state evidence, and a deduplicated GitHub comment command.

**Architecture:** Keep PR1 inside the existing lifecycle/action surfaces. Lifecycle emits `notify_human_blocked` only for explicit human-gate blockers, and action execution records it as an audit-only notification action without contacting external chat systems.

**Tech Stack:** Node.js ESM, Jest, repo-local AO control-plane modules.

---

## PR Split

- PR1: Add `notify_human_blocked` for blocked task-chain handoff through lifecycle actions, action model policy, audit execution, docs, and tests.
- PR2: Route broader AO control-plane blockers into the same escalation action after tuning false-positive boundaries.
- PR3: Add one external webhook transport as a secondary notification channel, with secrets, retry, and idempotency kept outside the AO source of truth.

## Files

- Modify: `scripts/ao/lib/lifecycle-engine.js`
- Modify: `scripts/ao/lib/action-executor.js`
- Modify: `scripts/ao/lib/measurement-taxonomy.js`
- Modify: `tests/ao/lifecycle-engine.test.js`
- Modify: `tests/ao/action-executor.test.js`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- Modify: `docs/setup/AO_CONTROL_PLANE_OPERATIONS.md`

## Chunk 1: Lifecycle Action

- [x] Add failing lifecycle tests proving task-chain human gates include `notify_human_blocked`.
- [x] Implement lifecycle finding/action templates for `notify_human_blocked`.
- [x] Keep normal holds such as CI/review/mergeability on existing hold actions only.

## Chunk 2: Assist Execution

- [x] Add failing action-executor tests proving `notify_human_blocked` is Class A audit-only, requires active task and PR scope, and records execution details without network calls.
- [x] Implement action policy and execution handling.
- [x] Extend measurement taxonomy so metrics classify it as `notify_human`.

## Chunk 3: Docs And Verification

- [x] Document GitHub comment plus marker semantics as PR1's default notification path.
- [x] Run focused AO Jest tests.
- [x] Run `npm run workflow:codex-preflight -- --json`.
