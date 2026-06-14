# Codebase Trust Pass Technical Reviewer Guide

Use this guide when reviewing small Codebase Trust Pass follow-up PRs under the
wave 1 sequence. It turns the scan findings and owner decisions into a concrete
review checklist. It is not a production-readiness claim and it does not replace
the issue-specific acceptance criteria for each PR slice.

## Review Order

Review in this order before approving or marking a PR human-ready:

1. Confirm live GitHub state.
2. Confirm the changed file scope matches the issue slice.
3. Check contract-specific guardrails for the touched domain.
4. Check coverage and evidence claims.
5. Confirm rollback is small and direct.

If any earlier gate fails, block the PR before spending review time on lower
priority cleanup details.

## Live GitHub Readiness Checklist

Before treating any PR as human-ready, verify live GitHub state, not stale local
metadata or orchestration summaries.

- Record the exact PR head SHA from GitHub and review that SHA only.
- Confirm the local diff, review comments, and test evidence all refer to the
  same head SHA.
- Confirm GitHub reports the PR as mergeable against the intended base branch.
- Confirm required checks are complete and passing for the current head SHA.
- Confirm there are no unresolved review threads.
- Confirm the PR is not relying on an older approval after a force-push, rebase,
  or base-branch movement.

Recommended evidence to include in the review note:

- PR number and URL.
- Head SHA.
- Mergeability state.
- Required check summary.
- Review-thread status.
- Date and time of verification.

## Slice Scope Checklist

Each follow-up PR must stay inside one planned slice. Do not approve PRs that
combine unrelated domains or hide cleanup work inside a guardrail PR.

- Compare changed files against the issue's allowed write scope.
- Confirm source, tests, config, workflows, package files, and README files are
  untouched unless that exact slice explicitly allows them.
- Confirm docs-only PRs are docs-only.
- Confirm API guardrail PRs do not also refactor frontend runtime pages.
- Confirm frontend test PRs do not also change backend runtime contracts.
- Confirm cleanup PRs do not change scoring authority, route semantics, or
  persistence contracts as a side effect.
- Confirm any added evidence cites current repo paths rather than treating scan
  reports as proof of current source behavior.

Block the PR if the changed files do not match the slice, even if the additional
changes look harmless.

## `active_scope_bundle` Checklist

Wave 1 freezes `active_scope_bundle` internals. A reviewer should treat this as
a high-blast-radius contract unless a future owner-approved contract PR
explicitly scopes a change.

Verify that the PR does not change:

- `active_scope_bundle` schema shape.
- Persistence semantics for the bundle.
- Typed-ref invariants.
- Anchor-kind compatibility rules.
- Request/response normalization that preserves the bundle.
- Compatibility paths that keep bare `current_question_id` and
  `current_question_type_id` from replacing typed refs inside the bundle.

Relevant evidence paths from the trust-pass reports include:

- `api/learning/lib/contracts/runtime-contract.js`
- `api/learning/lib/session-runtime/session-service.js`
- `api/learning/lib/session-runtime/session-anchor-resolution.js`
- `api/learning/lib/validators/session-validator.js`
- `src/api/learningRuntimeApi.js`

Block the PR if it rewrites bundle schema, persistence, or typed-ref behavior
without a dedicated owner-approved contract issue and rollback plan.

## Route And API Checklist

Route/API PRs must preserve current route semantics unless the issue explicitly
scopes a change.

Verify that the PR preserves:

- Route order and first-match behavior in the route registry.
- Duplicate method/path collision protection introduced by PR-01.
- Auth metadata, especially `jwt_required` versus public routes.
- Rate metadata, including policy IDs and method-scoped rate limits.
- Existing gateway posture for request adaptation, body parsing, CORS, and
  internal/legacy route exceptions.
- Error envelope posture and handler-level known-error mapping.
- Learning route semantics for sessions, ask, import, workspace, review task,
  artifact, marking, RAG, and evidence routes.

When route behavior changes are explicitly scoped, require before/after evidence
showing that auth, rate, and first-match expectations remain intentional. Do not
accept a route diff that relies on "same handler name" without proving the
matching order and metadata still line up.

## Frontend Learning Runtime Checklist

Frontend learning-runtime PRs must not claim large page split, orchestration
refactor, or route confidence without page-level route transition coverage.

Before accepting those claims, verify coverage for:

- `/learn/session/:sessionId`
- `/learn/workspace/:topicId`
- Review-queue route transitions.
- Workspace-to-session launch transitions.
- Launcher and import handoff transitions.
- Session ask transitions.
- Request-key/idempotency and stale-response guards where the page owns them.

Until those page-level tests exist for the relevant surface, reviewers should
allow only narrow changes with narrow claims. Do not approve splitting
`LearningSessionPage` or moving runtime orchestration boundaries based only on
component-level or API-wrapper tests.

## Smart Mark, `MarkingResult`, And Fallback Checklist

Smart Mark and `MarkingResult` changes must preserve authority boundaries.

Verify that the PR preserves:

- Explicit `non_released_fallback` behavior for imported or non-released
  questions outside released scope.
- The rule that authoritative scoring requires seeded pilot question type,
  released rubric ref, and validated uncertainty posture.
- The boundary between non-authoritative fallback markers and real score or
  point judgments.
- Existing `MarkingResult` contract fields and lineage expectations.
- Learning event and attempt paths that consume marking results without turning
  fallback output into authoritative scoring.

Block any PR that lets pilot membership alone unlock authoritative scoring or
turns missing released-scope evidence into fake scores.

## Coverage Claim Checklist

Current coverage semantics are API-surface coverage, not full-stack runtime
confidence.

Before accepting coverage language, verify:

- Claims relying on current Jest coverage say "API-surface coverage."
- API-only coverage is not represented as full-stack runtime confidence.
- Frontend runtime confidence cites page-level route transition tests, not only
  API coverage or component-level tests.
- AO-only, advisory, no-op, or path-specific workflow results are not described
  as release-blocking product guarantees without explicit owner-approved mapping.
- Production readiness, full repo health closure, and broad source-health claims
  have owner sign-off and separate evidence for every claimed surface.

Block language that converts a narrow gate into a broad runtime or production
claim.

## Compatibility Bridge Checklist

Compatibility bridges remain in force during wave 1 unless a future
owner-approved migration PR explicitly says otherwise.

Verify that the PR does not:

- Remove compatibility bridges for legacy entry points.
- Normalize `src/context` and `src/contexts` as a drive-by cleanup.
- Replace compatibility reads or handoff paths with new canonical runtime truth
  in legacy Study Hub or Learning Path surfaces.
- Collapse paper/topic compatibility assumptions without live source-of-truth
  evidence and owner approval.
- Convert temporary compatibility debt into silent behavior changes.

If bridge removal or context-folder normalization appears in a wave 1 PR, block
unless the issue explicitly authorizes that migration and includes tests,
rollback, and owner sign-off.

## Rollback Checklist

Every small PR slice must be independently rollbackable.

Require the PR body to state:

- Changed files.
- Behavior changes, or "none" for docs-only PRs.
- Tests or checks run.
- Acceptance status.
- Rollback plan.
- Remaining risks.

For docs-only PRs, rollback should be a simple revert of the documentation file.
For code PRs, rollback should identify the exact commit or files to revert and
explain why no schema, persistence, data migration, or authority-boundary cleanup
is required. If rollback requires coordinated source, data, and workflow changes,
the PR is too large for a small trust-pass slice.

## Reviewer Blocking Conditions

Block the PR when any of these conditions are present:

- The head SHA reviewed is not the current GitHub head SHA.
- GitHub mergeability, required checks, or unresolved review-thread state is not
  verified live.
- Changed files exceed the issue's allowed slice scope.
- The PR combines unrelated domains.
- `active_scope_bundle` schema, persistence, or typed-ref behavior changes
  without a dedicated owner-approved contract PR.
- Route order, first-match behavior, auth metadata, rate metadata, error
  posture, or learning route semantics change without explicit scope.
- Frontend runtime claims exceed the available page-level route transition
  coverage.
- Smart Mark, `MarkingResult`, or fallback changes weaken non-released fallback
  or scoring authority boundaries.
- API-only coverage is presented as full-stack runtime confidence.
- Compatibility bridges are removed or `src/context` and `src/contexts` are
  normalized during wave 1 without explicit approval.
- The PR claims production readiness, full repo health closure, or broad source
  health closure from the trust-pass wave.
- Rollback is vague, cross-domain, or requires unreviewed migration work.

## Reviewer Evidence Template

Use this short template for each review note:

```text
PR:
Head SHA:
Changed files:
Slice scope:
Live GitHub state:
Checks:
Unresolved review threads:
Contract surfaces touched:
Coverage interpretation:
Rollback plan:
Verdict: PASS / BLOCK / DEFER
Reason:
```

For a `BLOCK` or `DEFER`, include the exact failing assumption, the exact repo
evidence path, and the owner decision needed.

## What this pass has NOT done

This pass has not:

- Rewritten the learning runtime.
- Normalized all context directories.
- Changed Smart Mark authority.
- Changed `active_scope_bundle` schema.
- Changed route semantics beyond the PR-01 route-registry collision guard.
- Claimed full-stack coverage.
- Claimed full-repo health closure.
- Claimed production readiness.
