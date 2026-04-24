# 9709 Release Preflight Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 9709-specific release preflight that blocks publication when the authority-ready batch regresses into the failure modes found during the 300-question audit.

**Architecture:** Implement a pure validator library plus a thin CLI. Wire the library into `run_9709_authority_ready_batch.js` before write-side backfill steps, while keeping JSON and Markdown reports available for standalone operator use.

**Tech Stack:** Node.js ES modules, Jest, existing 9709 manifest/sidecar/curriculum JSON artifacts.

---

## File Map

- Create: `scripts/learning/lib/9709-release-preflight.js`
- Create: `scripts/learning/run_9709_release_preflight.js`
- Create: `scripts/learning/__tests__/9709-release-preflight.test.js`
- Create: `scripts/learning/__tests__/run-9709-release-preflight.test.js`
- Modify: `scripts/learning/run_9709_authority_ready_batch.js`
- Add docs: `docs/superpowers/specs/2026-04-24-9709-release-preflight-design.md`

## Task 1: Validator Red Tests

- [ ] Write tests for a passing 300-row fixture with warnings allowed.
- [ ] Write tests for `diagram_present=null` as a blocker.
- [ ] Write tests for missing sidecar join entries as blockers.
- [ ] Write tests for missing canonical topic and unseeded topic blockers.
- [ ] Write tests for legacy P1 vector rows that are not canonicalized to `p3.vectors`.
- [ ] Write tests for OCR-empty and unresolved-image blockers.
- [ ] Run the focused Jest file and confirm it fails because the validator does not exist.

## Task 2: Validator Implementation

- [ ] Implement manifest, sidecar, seed, and optional bundle normalization.
- [ ] Implement blocker/warning accumulation with reason codes and examples.
- [ ] Implement `status`, `counts`, and Markdown rendering.
- [ ] Run focused tests and make them pass.

## Task 3: CLI

- [ ] Add argument parsing for manifest, sidecar, seed, bundles, expected count, JSON output, Markdown output, and fail-on-warning.
- [ ] Add tests for CLI report writing and exit-code behavior through exported `main`.
- [ ] Run focused CLI tests and make them pass.

## Task 4: Batch Runner Integration

- [ ] Add preflight options to `run_9709_authority_ready_batch.js`.
- [ ] Run preflight after artifact build and before backfill steps.
- [ ] Add a runner test proving blockers stop execution before write steps.

## Task 5: Verification

- [ ] Run the focused preflight tests.
- [ ] Run the existing `run-9709-authority-ready-batch.test.js`.
- [ ] Run the preflight CLI against the published 300-row artifacts and confirm no blockers.
