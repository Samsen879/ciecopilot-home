# Mainline Convergence For AO And Durable Idempotency Design

**Date:** 2026-03-27  
**Scope:** recover one current implementation trunk by converging onto `origin/main`, then re-landing repo-local AO tooling and durable learning-runtime idempotency on top of that trunk  
**Status:** approved in-session  
**Applies to branch reality:** current local worktree `runtime-post-pilot-0323-2239`, current remote trunk `origin/main`  
**Depends on:** [AO / Codex Work Dossier (2026-03-26)](/home/samsen/code/ciecopilot-home/docs/reports/ao_codex_work_dossier_2026-03-26.md), [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md), [.agent-rules.md](/home/samsen/code/ciecopilot-home/.agent-rules.md)

## Goal

Recover a single trustworthy development line for this product.

That line must preserve the newer learning-runtime product work already merged into `origin/main`, while also regaining the useful repo-local AO and durable-idempotency work currently stranded on the local `runtime-post-pilot-0323-2239` line.

The intended outcome is not "keep both histories alive." It is:

- one current branch based on `origin/main`
- one explicit AO slice re-landed on top
- one explicit durable-idempotency slice re-landed on top
- one verification baseline future work can trust

## Problem Statement

The product currently has split truth.

The dossier established:

- `origin/main` contains the later learning-runtime product and cutover wave through the March 25 issue set
- `runtime-post-pilot-0323-2239` contains only the earlier pilot runtime slice plus a divergent local AO/idempotency WIP line
- `git rev-list --left-right --count origin/main...HEAD` is `38 3`

That means the current worktree is simultaneously:

- too stale to treat as product truth
- too customized to discard blindly

The result is operational drag:

- closed GitHub issues do not match branch reality
- runtime cutover behavior on `main` is missing here
- local AO/idempotency work is real, but not integrated into the current product trunk
- future implementation risks stacking on the wrong baseline

## Recommended Approach

Create a fresh convergence branch from `origin/main` and treat that branch as the only recovery target.

Do **not** rebase or continue the existing local branch as the primary recovery line.

Then re-land two bounded slices from the local branch history:

1. **AO slice**
   - repo-local reconcile / doctor / lifecycle commands
   - AO contracts, engines, report renderers, runbooks, and test suites
   - only the orchestrator wiring and repo rules necessary for those commands to operate

2. **Durable idempotency slice**
   - `learning_request_idempotency` migration
   - request-idempotency repository
   - session-create integration
   - question-import integration
   - focused repository, service, and handler verification

This is intentionally not a cherry-pick-the-whole-WIP strategy.

The local `2146615` snapshot is too mixed. It touches:

- AO
- durable idempotency
- docs
- repo rules
- tests
- service code

Re-landing by explicit slice is slower than one cherry-pick, but it gives a recoverable and reviewable trunk.

## Why This Approach

### Why `origin/main` must be the base

`origin/main` already contains the later product wave that benefits users directly:

- interactive runtime session launch
- imported-question intake
- richer workspace rendering
- review-task write flow
- review queue UX
- artifact lifecycle UI
- integration promotion
- scheduler hardening
- runtime-default cutover
- revisitation improvements

Continuing from the current local branch would force all future product work to be rebuilt on stale product surfaces.

### Why the local branch still matters

The local branch contains valuable work not present on `origin/main` in the same form:

- AO CLI and core AO libraries
- AO tests and runbooks
- local repo rules aligned with AO flows
- durable idempotency repository and migration
- durable replay logic for learning session create and question import

Discarding that line outright would lose useful operational and retry-safety work.

### Why re-land by slice instead of replaying the whole snapshot

The mixed WIP snapshot does not map cleanly to current `origin/main`.

If it is replayed wholesale, it risks:

- overwriting later product changes
- reintroducing older runtime assumptions
- obscuring which files belong to AO vs idempotency vs product runtime
- making final verification ambiguous

The recovery should prefer explicit file ownership over historical convenience.

## Source Of Truth

For this convergence effort, the order of truth is:

1. `origin/main` for current product behavior
2. [AO / Codex Work Dossier (2026-03-26)](/home/samsen/code/ciecopilot-home/docs/reports/ao_codex_work_dossier_2026-03-26.md) for what is present where
3. frozen product/runtime docs:
   - [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md)
   - [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md)
   - [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md)
4. local `runtime-post-pilot-0323-2239` only as a source of re-land candidates, not as the canonical branch baseline

## Non-Goals

This recovery design does **not** include:

- new product features beyond what is needed to complete convergence
- widening runtime scope beyond already-merged mainline work
- rewriting AO into an auto-mutating control plane
- adding new subject runtime rollout
- reopening completed product issues as if they were unimplemented on `main`
- preserving every local diff from `2146615`

## Slice Boundaries

### Phase 1: Convergence branch

Create a fresh branch from `origin/main`.

This phase proves:

- the engineer is working from the latest product truth
- the branch topology problem is acknowledged and not ignored
- verification commands are evaluated against the right base

### Phase 2: AO re-land

Re-land only the AO surface that is still needed and not already represented on `main`:

- `scripts/ao-reconcile.js`
- `scripts/ao-doctor.js`
- `scripts/ao-lifecycle.js`
- `scripts/ao/lib/**`
- `tests/ao/**`
- AO runbooks in `docs/setup/**`
- package-script and rules wiring required to operate those commands

This phase succeeds only if AO commands run and their focused tests pass on the new branch.

### Phase 3: Durable idempotency re-land

Re-land only the durable learning-runtime idempotency slice:

- `supabase/migrations/20260324120000_create_learning_request_idempotency.sql`
- `api/learning/lib/repositories/request-idempotency-repository.js`
- session/create integration
- import/question integration
- focused tests

This phase succeeds only if retry safety is real on the converged branch rather than just locally documented.

### Phase 4: Canonical verification baseline

Run one current verification baseline and capture the actual outcomes.

The branch is not considered recovered merely because files were copied.

## Verification Strategy

Verification is part of the design, not an afterthought.

### Baseline verification on `origin/main`

Before re-landing local slices, run focused checks on the fresh convergence branch to confirm the current product baseline is sane.

### AO verification

Use focused AO tests and command help checks first:

- `tests/ao/**`
- `node scripts/ao-reconcile.js --help`
- `node scripts/ao-doctor.js --help`
- `node scripts/ao-lifecycle.js --help`

### Durable idempotency verification

Use repository/schema/service-focused suites first, then handler/API suites only when the harness path is current and stable.

Because the repo already experienced stale command drift, the convergence line must use command syntax that matches the current Jest wrapper.

## Risks And Mitigations

### Risk: overwriting newer product behavior from `main`

Mitigation:

- never use the local branch as the base
- re-land AO and idempotency by explicit file scope
- diff every candidate file against `origin/main` before applying it

### Risk: carrying forward mixed WIP assumptions

Mitigation:

- do not cherry-pick `2146615` wholesale
- split AO and idempotency into separate re-land chunks
- keep product files off-limits unless the slice explicitly requires them

### Risk: false confidence from issue-closed status

Mitigation:

- use branch reality, not issue status, when deciding what still needs to be ported
- record the final converged verification baseline in-repo

## Success Criteria

This recovery is successful only if all of the following are true:

- a new branch exists on top of `origin/main`
- later learning-runtime product work from `main` remains intact
- repo-local AO commands and tests exist on the new branch and pass focused verification
- durable request idempotency exists on the new branch and passes focused verification
- future implementation can continue from that branch without re-litigating branch truth

## Decision

The product should benefit from this recovery by choosing:

- `origin/main` as canonical product truth
- one fresh convergence branch from `origin/main`
- explicit AO re-land
- explicit durable-idempotency re-land

Everything else is secondary to restoring a single trustworthy trunk.
