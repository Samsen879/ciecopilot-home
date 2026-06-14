# Codebase Trust Pass 09 - Owner Decisions

Issue: #467
Parent: #460
Predecessor scans: #461, #462, #463, #464, #465, #466
Date: 2026-06-14

## PR-00 status

The Spark scan phase is complete for the Codebase Trust Pass child issues #461 through #466. Those completed scan artifacts are carried forward into this directory so reviewers can inspect one canonical report set before execution-wave code PRs begin.

PR-00 is docs-only. Execution has not yet changed source behavior, and this PR does not edit source, tests, config, workflows, package metadata, or README files.

This report set does not claim full repo health closure. It records scan evidence and owner decisions for the next small execution PRs. API-only coverage must not be represented as full-stack runtime confidence.

Follow-up code PRs must remain small, independently reviewable, and rollbackable.

## Owner decisions

### D1 active_scope_bundle freeze

Wave 1 freezes `active_scope_bundle` internals.

Allowed in Wave 1:
- tests,
- documentation,
- contract-preservation assertions.

Forbidden in Wave 1:
- schema rewrite,
- persistence semantics rewrite,
- typed-ref migration.

Rationale: the scan set identifies `active_scope_bundle` as a central contract guardrail across `api/learning/lib/contracts/runtime-contract.js`, `api/learning/lib/session-runtime/session-service.js`, `src/api/learningRuntimeApi.js`, and related anchor-resolution paths. The first execution wave should protect this contract before refactoring around it.

### D2 route-registry lint enforcement

Duplicate method + path collision lint must hard-fail in the follow-up route-registry code PR.

PR-00 does not change route semantics. The enforcement belongs in a dedicated follow-up PR that can prove existing production registry entries pass unchanged and that auth/rate metadata remains intact.

### D3 coverage interpretation

Current coverage claims are API-surface coverage, not full-stack runtime confidence.

Do not change the Jest denominator in PR-00. Coverage policy should be documented first, and any denominator or gate changes should happen only in a later, reviewable execution slice.

Runtime confidence requires page-level route transition tests for learning runtime flows, especially workspace-to-session, launcher/import handoff, session ask, and review-queue transitions.

### D4 context directory split

The `src/context` versus `src/contexts` split is accepted as temporary compatibility debt.

Broad normalization is deferred until runtime page-level transition tests exist. No PR in the first wave should normalize the context directories as a drive-by cleanup.

### D5 cleanup scope

No large file split should happen before guardrail tests.

Do not change scoring or `MarkingResult` authority in this wave. Do not remove compatibility bridges. For frontend cleanup, tests must come before splitting `LearningSessionPage` or moving runtime orchestration boundaries.

### D6 no production release claim until P0 criteria pass

Do not claim source health improvement, full repo health closure, or production readiness from scan or planning docs.

Production and release claims require the future P0 criteria to pass, especially:
- route-registry collision guard,
- coverage and reviewer interpretation policy.

PR-00 records decisions and canonicalizes scan artifacts only. It does not improve runtime behavior by itself.

## Execution PR sequence

1. PR-00 owner decision record
   - Scope: canonicalize completed scan reports and owner decisions in `docs/reports/codebase-trust-pass/`.
   - Constraint: docs-only, no behavior change, no source health or production readiness claim.

2. PR-01 route-registry collision lint
   - Scope: add deterministic duplicate method + path collision enforcement for `api/_runtime/route-registry.js`.
   - Constraint: API runtime route-contract tests only; no production route reorder or route semantics change beyond failing duplicate registry definitions.
   - Required proof: current registry has no collisions and auth/rate metadata remains unchanged.
   - Documentation note: first-match route behavior is intentional but must be guarded.

3. PR-02 coverage policy docs
   - Scope: document and enforce reviewer interpretation that current coverage is API-surface coverage only.
   - Constraint: no Jest denominator change unless explicitly approved in that PR.

4. PR-03 TECH_REVIEWER_GUIDE final
   - Scope: convert the draft reviewer guide into the final reviewer runbook for Codebase Trust Pass execution slices.
   - Constraint: keep guidance tied to evidence paths and owner decisions.

5. PR-04 runtime page transition tests
   - Scope: add page-level route transition tests for `LearningSessionPage`, `TopicWorkspacePage`, and `ReviewQueuePage`.
   - Constraint: tests must preserve existing launch/import/ask/review behavior.

6. PR-05 active_scope_bundle guardrail tests
   - Scope: add contract-preservation tests around request/response and compatibility paths for `active_scope_bundle`.
   - Constraint: no schema rewrite, persistence rewrite, or typed-ref migration.

## Rollback plan

If PR-00 needs to be reverted, revert the docs-only PR. No source behavior rollback is needed because this PR changes only report files under `docs/reports/codebase-trust-pass/`.

## Reviewer blocking conditions

Block PR-00 if any of the following are present:
- any changed file outside `docs/reports/codebase-trust-pass/`,
- any source code change,
- any test change,
- any config, workflow, package, or README change,
- any full repo health closure claim,
- any source health improvement or production readiness claim,
- any statement that API-only coverage is full-stack confidence,
- any implementation of route lint, runtime tests, active_scope_bundle tests, scoring authority changes, or compatibility bridge removal.
