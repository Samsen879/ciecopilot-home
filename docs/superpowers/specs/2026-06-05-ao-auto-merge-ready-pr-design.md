# AO Auto-Merge Ready PR Design

## Goal

AO should merge a managed PR automatically once the release gates prove it is ready, then allow the orchestrator to continue to the next issue without a separate human merge step.

## Decision

Auto-merge is globally enabled by default for AO-managed PRs. It is implemented as a new explicit release action, `auto_merge_ready_pr`, rather than changing the meaning of `notify_human_ready`.

## Release Conditions

AO may propose and execute `auto_merge_ready_pr` only when all of these are true:

- lifecycle scope is one explicit PR
- reconciliation and doctor inputs are healthy enough for authoritative release control
- PR is open, not draft, approved, CI passing, and mergeable
- independent AO review gate has passed for the current head SHA when review state exists or is required
- execution rereads current GitHub state before merging and blocks on any drift

## Execution Behavior

Assist mode executes the action through GitHub using `gh pr merge <number> --squash --delete-branch`. If GitHub reports the PR is already merged, the action is treated as idempotently executed. Any source failure, stale head, missing approval, failing CI, draft state, or mergeability blocker leaves the action blocked and does not retire the task.

## Non-Goals

- Do not replay old `notify_human_ready` actions as merge actions.
- Do not weaken review, CI, mergeability, or source-health gates.
- Do not change unrelated AO worker assignment or handoff behavior.
