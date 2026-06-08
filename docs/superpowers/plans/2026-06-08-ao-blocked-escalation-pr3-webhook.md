# AO Blocked Escalation PR3 Webhook Transport Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in external webhook transport for blocked AO notifications while keeping AO state and GitHub comments as the source of truth.

**Architecture:** Add a small blocked-notification transport module. It is disabled by default, reads webhook configuration only from environment variables, sends WeCom-compatible markdown when explicitly enabled, retries once, and records only sanitized delivery results in AO action execution details.

**Tech Stack:** Node.js ESM, Jest, existing AO action executor.

---

## Files

- Create: `scripts/ao/lib/blocked-notification-transport.js`
- Modify: `scripts/ao/lib/action-executor.js`
- Create: `tests/ao/blocked-notification-transport.test.js`
- Modify: `tests/ao/action-executor.test.js`
- Modify: `docs/setup/AO_CONTROL_PLANE_OPERATIONS.md`

## Chunk 1: Transport Module

- [x] Add failing tests for default disabled posture, WeCom markdown payload shape, retry, and sanitized results.
- [x] Implement the env-gated webhook transport.

## Chunk 2: Executor Integration

- [x] Add a failing action-executor test proving `notify_human_blocked` calls the transport when supplied.
- [x] Integrate the transport without changing notification action success into a hard dependency.

## Chunk 3: Docs And Verification

- [x] Document env vars and source-of-truth boundaries.
- [x] Run focused tests and `tests/ao`.
- [x] Run `npm run workflow:codex-preflight -- --json`.
