# AO Auto-Merge Ready PR Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default-on AO-managed automatic PR merge after release gates pass.

**Architecture:** Keep lifecycle decision-making separate from execution. `lifecycle-engine` emits a new `auto_merge_ready_pr` action when a managed PR is release-ready; `action-executor` validates fresh GitHub state and performs the merge. Existing `notify_human_ready` remains notification-only.

**Tech Stack:** Node.js ESM, Jest, AO control-plane scripts, GitHub CLI.

---

## Chunk 1: Release Action Contract

### Task 1: Lifecycle Emits Auto-Merge

**Files:**
- Modify: `scripts/ao/lib/lifecycle-engine.js`
- Test: `tests/ao/lifecycle-engine.test.js`

- [ ] **Step 1: Write the failing test**

Add a test proving an approved, green, mergeable PR produces `release_decision.disposition = auto_merge_ready_pr` and includes an action with `id = auto_merge_ready_pr`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/ao/lifecycle-engine.test.js`

- [ ] **Step 3: Implement minimal lifecycle change**

Add the new disposition, finding, and action template without changing existing hold paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/ao/lifecycle-engine.test.js`

## Chunk 2: Assist Execution

### Task 2: Execute Freshly Validated GitHub Merge

**Files:**
- Modify: `scripts/ao/lib/action-executor.js`
- Test: `tests/ao/action-executor.test.js`

- [ ] **Step 1: Write failing tests**

Add tests for `auto_merge_ready_pr` model policy and merge execution using injected command runners. Cover successful merge, stale head block, and already-merged idempotency.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --runInBand tests/ao/action-executor.test.js`

- [ ] **Step 3: Implement minimal executor**

Add the action policy, fresh `gh pr view` validation, `gh pr merge --squash --delete-branch`, blocked records for drift, and idempotent already-merged handling.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- --runInBand tests/ao/action-executor.test.js`

## Chunk 3: Controller And Docs Contract

### Task 3: Keep Controller And Runbooks Honest

**Files:**
- Modify: `docs/setup/AO_CONTROL_PLANE_OPERATIONS.md`
- Modify: `docs/setup/AO_LIFECYCLE_RUNBOOK.md`
- Modify: `docs/setup/AO_CONTROLLER_RUNBOOK.md`
- Test: `tests/ao/controller-loop.test.js`
- Test: `tests/ao/control-plane-assist-contract.test.js`

- [ ] **Step 1: Write/update contract tests**

Update tests that currently require `notify_human_ready` for ready PRs to require `auto_merge_ready_pr`.

- [ ] **Step 2: Run tests**

Run: `npm test -- --runInBand tests/ao/controller-loop.test.js tests/ao/control-plane-assist-contract.test.js`

- [ ] **Step 3: Update docs**

Document default-on auto-merge and the fresh GitHub validation gates.

- [ ] **Step 4: Run AO-focused verification**

Run: `npm test -- --runInBand tests/ao/lifecycle-engine.test.js tests/ao/action-executor.test.js tests/ao/controller-loop.test.js tests/ao/control-plane-assist-contract.test.js`
