# Codex Semi-Automatic Workspace Hygiene Design

## Context

Most development in this repository is performed by Codex. The repository
already has AO workflow scripts, protected-branch git hooks, and branch/worktree
rules, but Codex sessions can still begin in the root worktree and leave dirty
state for the human to reconcile.

## Decision

Adopt a semi-automatic Codex workflow:

- Small, scoped edits may happen in the current worktree.
- Broad work, PR review work, CI repair, and cross-module implementation still
  require a `task/*` worktree.
- Codex must run a preflight check before editing when workflow scripts are
  available.
- Codex must leave the workspace clean before handing control back, or explicitly
  report the files and human decision needed.
- Commits must not be made directly on `main`, `master`, or `baseline/*`; create
  a `codex/*` or `task/*` branch first.

## Preflight Contract

`npm run workflow:codex-preflight -- --json` reports:

- current branch and upstream
- ahead/behind counts
- branch policy
- sync policy
- worktree cleanliness
- required actions before editing or committing

The output is advisory for editing and mandatory for closeout reporting. It is
not a replacement for focused verification or git hooks.

## Closeout Contract

Before ending a development turn, Codex reports:

- current branch
- `git status --short --branch`
- commit or stash identifier when one was created
- verification commands and outcomes
- any unresolved files or decisions

The expected steady state is a clean worktree. Dirty closeout is allowed only
when the remaining action needs explicit human direction.

## Non-Goals

- Replacing AO task worktrees for large tasks.
- Allowing direct commits or pushes to protected branches.
- Auto-deleting user changes without classification.
- Auto-merging or bypassing GitHub review/CI state.
