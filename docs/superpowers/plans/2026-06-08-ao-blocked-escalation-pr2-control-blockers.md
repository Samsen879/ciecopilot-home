# AO Blocked Escalation PR2 Control Blockers Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `notify_human_blocked` from release-facing task-chain gates to explicit PR-scoped AO control-plane blockers.

**Architecture:** Reuse PR1's action model and audit-only execution path. PR2 only changes lifecycle routing findings that already represent a hard control blocker; it does not add external transports or notify on ordinary CI/review/mergeability holds.

**Tech Stack:** Node.js ESM, Jest, repo-local AO lifecycle tests.

---

## Files

- Modify: `scripts/ao/lib/lifecycle-engine.js`
- Modify: `tests/ao/lifecycle-engine.test.js`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`

## Chunk 1: Doctor Blocker Routing

- [x] Add a failing lifecycle test proving `doctor_blocks_control` proposes `notify_human_blocked`.
- [x] Add `notify_human_blocked` to the `doctor_blocks_control` lifecycle finding.
- [x] Keep normal CI/review/mergeability holds on hold actions only.

## Chunk 2: Verification

- [x] Run focused lifecycle tests.
- [x] Run `tests/ao`.
- [x] Run `npm run workflow:codex-preflight -- --json`.
