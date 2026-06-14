# Codebase Trust Pass 09 - Coverage Policy

Issue: #471
Parent: #460
Predecessors: #467 / PR #468, #469 / PR #470
Date: 2026-06-14

## Purpose

This policy records how reviewers and owners must interpret the current coverage signal during the Codebase Trust Pass wave 1 sequence.

This PR is documentation-only. It does not change Jest configuration, coverage thresholds, source behavior, tests, workflows, package scripts, package metadata, or README content.

## Current coverage semantics

Current Jest coverage is API-surface coverage, not full-stack runtime confidence.

The tests and gates scan records that coverage collection is currently configured for `api/**/*.js`. Jest can discover and run tests outside `api/**`, including frontend/runtime, scripts, AO, and evidence-related tests, but those files are not part of the current coverage denominator unless they are also under the configured API coverage surface.

Reviewers must therefore interpret the current coverage signal as evidence about the configured API surface only. It is useful for API-focused review, but it is not a complete measurement of frontend runtime behavior, AO workflow behavior, scripts, or full repository health.

## Reviewer interpretation rules

API-only coverage must not be represented as full-stack runtime confidence.

Do not use the current coverage number to claim:

- full-stack learning runtime confidence,
- production readiness,
- full repo health closure,
- frontend route-transition confidence,
- AO/advisory workflow release guarantees,
- or broad source-health improvement.

The correct reviewer phrasing is that the current coverage signal is API-surface coverage under the existing Jest denominator. Any wider runtime confidence claim must cite separate evidence.

## Frontend learning runtime confidence

Frontend learning runtime confidence requires page-level route transition tests.

At minimum, reviewer confidence for the learning runtime frontend must be supported by page-level tests for the runtime routes and transitions identified in the scan set, including:

- workspace-to-session transitions,
- launcher and import handoff transitions,
- session ask transitions,
- review-queue transitions,
- route payload handling and request-key/idempotency behavior where applicable.

Until those page-level tests exist and are reviewed, API coverage must not be used as a substitute for frontend runtime confidence. This policy does not implement those tests; that work belongs in a later, separately reviewable PR.

## AO, advisory, and release semantics

AO/advisory workflow semantics require explicit release/advisory/AO-only mapping before they are treated as release-blocking product guarantees.

Workflow checks or reports with advisory behavior, benchmark behavior, AO-only behavior, no-op behavior, or path-specific behavior must not be treated as release-blocking product guarantees unless an explicit owner-approved mapping says they are release-blocking for the relevant product surface.

For reviewer purposes:

- release-blocking means the check is intended to gate product release for the stated scope;
- advisory means the result informs risk review but does not itself block release;
- AO-only means the result validates orchestration or control-plane expectations rather than product runtime behavior;
- no-op or path-specific branches must be interpreted only for the branch/path condition that actually ran.

This policy documents the interpretation rule only. It does not change workflow files or make any advisory/AO-only check release-blocking.

## Owner sign-off requirements

Owners must sign off before any production release or full-repo health claim based on coverage.

Owner sign-off must confirm:

- which coverage denominator or evidence surface is being used;
- whether frontend page-level route transition evidence exists for the claimed runtime surface;
- whether AO/advisory/release workflow semantics have an explicit mapping for the claim;
- whether any remaining gaps are accepted, deferred, or release-blocking;
- and whether the claim is limited to API-surface coverage or extends to a broader runtime/product scope.

Without that sign-off, coverage can support only the narrower API-surface interpretation described above.

## Deferred Jest denominator and gate changes

Jest denominator, coverage threshold, package script, and workflow changes are deferred.

This PR documents reviewer interpretation only. It does not change `collectCoverageFrom`, Jest thresholds, package scripts, GitHub workflows, or coverage gate behavior.

Any later denominator or gate change must be proposed in its own small PR with clear before/after behavior, explicit owner approval, and rollback steps.

## Follow-up PR boundaries

Follow-up PRs must remain small, independently reviewable, and rollbackable.

In this wave, do not combine this policy with:

- TECH_REVIEWER_GUIDE finalization,
- runtime page transition tests,
- `active_scope_bundle` guardrail tests,
- source refactors,
- scoring authority changes,
- compatibility bridge removal,
- context directory normalization,
- or production readiness claims.

Each follow-up PR should have one clear owner decision, one narrow write scope, focused verification, and a direct rollback plan.

## Reviewer checklist

Before accepting any coverage-based claim, reviewers should verify:

1. The claim says API-surface coverage when it relies on the current Jest coverage configuration.
2. The claim does not imply full-stack runtime confidence without separate frontend page-level route transition evidence.
3. The claim does not treat AO-only, advisory, no-op, or path-specific workflow results as release-blocking without explicit mapping.
4. The claim has owner sign-off before it is used for production release or full-repo health language.
5. Any follow-up denominator, gate, or runtime-test work is isolated to its own reviewable and rollbackable PR.

## Rollback plan

If this policy is wrong or superseded, revert this docs-only file. No runtime, test, workflow, package, or coverage configuration rollback is required because this PR changes documentation only.
