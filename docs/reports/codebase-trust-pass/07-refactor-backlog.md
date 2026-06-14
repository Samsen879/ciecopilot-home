# Refactor Backlog (Issue #466)

Generated: 2026-06-14
Source set: reports #461-#465 only

## Executive summary

Synthesis scope is to convert trust-pass inventory into executable backlog only. No repo source edits were performed in this issue.

## Verified facts

- Frontend runtime routes, page transitions, and API wrappers were mapped with known orchestration points.
- Backend route registry is explicit and centralized, with first-match semantics and route metadata in a static registry.
- Workflow and test gate coverage is extensive but uneven in interpretation and documentation.
- PRD contract mapping indicates distributed ownership (`api/learning` and related runtime contracts) with compatibility bridges retained.

## P0 backlog

1. `P0-1` — Clarify/test coverage semantics before trust assertions are used as release evidence.
   Source: report 04.
   Acceptance: explicit documented policy, explicit reviewer interpretation, and signed proof that scope coverage is accepted for all runtime decisions.
2. `P0-2` — Add deterministic route-registry collision defense in route-contract verification layer.
   Source: report 03.
   Acceptance: duplicate path+method guard exists for registry entries and existing route metadata passes unchanged.

## P1 backlog

1. `P1-1` — Add page-level tests for `LearningSessionPage`, `TopicWorkspacePage`, and `ReviewQueuePage` covering launch/import/ask transitions and request-key dedupe.
2. `P1-2` — Add route-contract matrix tests for auth/rate completeness outside the learning subset.
3. `P1-3` — Add explicit workflow semantics map (release, advisory, AO-only, AO-no-op) in reports/docs.
4. `P1-4` — Add guardrail tests for `active_scope_bundle` request/response integrity with compatibility paths.

## P2 backlog

1. `P2-1` — Decide and document context-provider boundary strategy (`src/context` vs `src/contexts`).
2. `P2-2` — Add script/test inventory index mapping `scripts/workflow`, `tests/ao`, and `scripts/learning` ownership.
3. `P2-3` — Track complexity deltas for files flagged in report #461 before each cleanup PR.
4. `P2-4` — Add PRD-to-code contract follow-up notes where "partial" or "compatibility bridge" remains in force.

## Suggested Codex execution slices (one PR each)

1. `slice-01-route-registry-lint`
   Scope: `api/_runtime/route-registry.js` tests and route-contract checks only.
2. `slice-02-runtime-page-tests`
   Scope: `src/pages/learning-runtime/*` tests and route transition assertions.
3. `slice-03-gate-taxonomy-docs`
   Scope: `docs/reports/` updates for workflow intent mapping.
4. `slice-04-coverage-policy-docs`
   Scope: `docs/reports/codebase-trust-pass/`, runbook, and PRD gate interpretation notes.

## Ten things not to fix in this pass

1. No changes to `api/learning/lib/contracts/runtime-contract.js` internals.
2. No score-authority logic in `api/marking/*`.
3. No active migration of legacy Study Hub / Learning Path objects.
4. No changes to `active_scope_bundle` persistence or typed-ref invariants.
5. No route semantics refactor beyond collision-policy verification.
6. No broad frontend context-provider folder flattening in one pass.
7. No cleanup of all huge files (`api/rag/lib/ask-service.js`, `scripts/ao/lib/eval-harness.js`) in one PR.
8. No engine/runtime policy change (`package.json` Node engines) without maintainer review.
9. No AO-only branch logic behavior changes in this pass.
10. No production release claims until acceptance criteria for P0 items are met.

## Assumptions

- Existing compatibility and anti-drift behavior for `current_question_id` and `current_question_type_id` remains required.
- Any follow-on code PR must keep request guards for session/workspace/review flows intact unless a separate contract PR explicitly revises them.
- This pass is read-only and should not include production code or schema modifications.

## Open questions for owner decision

1. Do we keep `active_scope_bundle` untouched through cleanup slice #1, or add guardrail tests first?
2. Is route-lint enforcement to be hard-fail now or warning-only for one sprint?
3. Should coverage ambiguity be solved by policy-only documentation or by Jest config change first?
4. Is context-folder normalization a P2 UX task or a separate contract-sensitive runtime refactor?
5. Which two PRs should be prioritized if only one PR can land per review cycle?
