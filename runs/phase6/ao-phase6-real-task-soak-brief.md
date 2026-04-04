# AO Phase 6 Real-Task Soak Brief

## Problem Type
issue_delivery

## Acceptance Contract
- synthetic worktree lifecycle can be enrolled, paused, re-activated, and retired
- repo-local ao-state reflects the task lifecycle transitions
- soak cleanup removes the synthetic worktree and branch after retirement

## Runtime Ref
runtime.github_local

## Policy Ref
policy.operator_gated

## Human Gates
- operator_enroll
- human_review_before_merge

## Goal

Exercise one real managed-task lifecycle in the current repo-local AO control plane without touching existing in-flight branches.

## Done

- create one synthetic task worktree and branch
- enroll it into AO management
- verify it appears in `ao-state`
- pause and re-activate it through `ao-manage`
- retire it cleanly
- remove the synthetic worktree and branch after retirement

## Non-Goal

- merge a real PR
- alter existing user worktrees
- force a baseline sync on top of the current dirty repo root
