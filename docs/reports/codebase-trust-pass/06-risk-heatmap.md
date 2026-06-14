# Codebase Trust Pass 06 — Risk Heatmap (Issue #466)

Generated: 2026-06-14
Scope: synthesis only for issues #461-#465 in support of parent #460

## Executive summary of verified repo facts

The child scans collectively show that runtime behavior is split across a stable API-first contract layer plus frontend adapters, with `api/learning` and `src/pages/learning-runtime` carrying most operational risk today.
No direct implementation changes were run in this issue; this is planning-only synthesis from completed scans.

Verified inputs:
- `docs/reports/codebase-trust-pass/01-complexity-inventory.md` (and `.json`) for code-size, hook/import density, and complexity hotspots.
- `docs/reports/codebase-trust-pass/02-frontend-runtime-scan.md` for route/state runtime behavior and frontend coverage gaps.
- `docs/reports/codebase-trust-pass/03-backend-route-contract-scan.md` and `.json` for API gateway, route-registry, auth/rate boundaries, and contract coverage.
- `docs/reports/codebase-trust-pass/04-tests-gates-scan.md` and `.json` for workflow and gate topology and test-distribution mismatch.
- `docs/reports/codebase-trust-pass/05-prd-contract-map.md` and `.json` for contract ownership and active scope/prioritization status.

### Verified facts
- Frontend runtime routes are wired through `src/pages/legacy-entry-mode.js` and consumed by `src/App.jsx`, with three runtime pages under `src/pages/learning-runtime/*`.
- API entry routing is centralized in `api/index.js` and driven through `api/_runtime/route-registry.js`.
- Route matching is ordered first-match in `route-registry`.
- Jest coverage collection is currently configured as `collectCoverageFrom: ["api/**/*.js"]`.
- `active_scope_bundle` ownership and explicit non-authoritative fallback logic are the central contract guardrails in the PRD mapping scan.

### Recommendations
- Keep this pass focused on bounded, low-risk cleanup: route-policy hardening, page-level coverage improvements, and documentation clarity for gate semantics.
- Any refactor touching `api/learning` contracts or `src/pages/learning-runtime` should preserve the typed-ref `active_scope_bundle` path and compatibility bridges.
- Avoid expanding scope into data migration scripts or full rewrite of legacy surfaces in this PR sequence.

### Assumptions
- The scan files fully represent completed child findings; no additional live repo inspection was performed.
- The absence of explicit issues in a scanned domain (for example P0 in backend scan) is treated as “not observed in this pass,” not “verified healthy.”
- Current branch state is aligned with issue #466 work scope and child reports.

## Risk heatmap by domain

| Domain | Current risk level | Confidence | Signal | Primary evidence paths |
|---|---|---|---|---|
| Frontend runtime | Medium-High (P1) | High | Route orchestration and page-level state transitions are functionally rich but under-tested at page granularity. | `src/pages/learning-runtime/LearningSessionPage.jsx`, `src/pages/learning-runtime/TopicWorkspacePage.jsx`, `src/pages/learning-runtime/ReviewQueuePage.jsx`, `src/pages/legacy-entry-mode.js`, `src/App.jsx` |
| Backend runtime | Medium-High (P1) | High | Large runtime/core files with high complexity and dependency density plus high-volume script/test code supporting runtime checks. | `api/learning/lib/session-runtime/session-service.js`, `api/learning/lib/session-runtime/session-anchor-resolution.js`, `api/learning/lib/events/attempt-event-service.js`, `api/learning/lib/contracts/runtime-contract.js` |
| Route/API contract | Medium-High (P1) | High | Contract registry uses first-match semantics and lacks duplicate-path/method linting, creating silent shadowing risk. | `api/_runtime/route-registry.js`, `api/index.js`, `api/_runtime/route-registry.js` |
| PRD contract | Medium (P1/P2 mix) | Medium | Core guards are present, but some critical behaviors are distributed (`event`-driven learning effect, compatibility bridges) rather than single-authoritative files. | `api/learning/lib/contracts/runtime-contract.js`, `api/learning/lib/contracts/released-scope-core.js`, `api/learning/lib/contracts/released-scope.js`, `api/learning/lib/session-runtime/session-service.js` |
| Tests / gates | High (P1-P0 boundary) | High | Coverage denominator excludes substantial frontend/script/AO tests, and AO/no-op semantics can blur reviewer interpretation. | `package.json`, `.github/workflows/rag-s2-advisory-gate.yml`, `.github/workflows/rag-s1-contract-gate.yml`, `.github/workflows/rag-s1-metric-gate.yml` |
| Scripts/docs | Medium (P2) | Medium | Workflow intent is visible but not consistently documented by category; script/test surface is large and non-homogeneous. | `.github/workflows/*.yml`, `scripts/workflow/`, `docs/reports/INDEX.md` |
| Environment/tooling | Medium (P2) | Low | Node/runtime claims differ by source and are not fully normalized in the scan. | `package.json`, child tests scan notes (issue #464) |

## Top 25 reviewer-impact findings

| # | Severity | Domain | Finding | Source report | Repo path evidence |
|---|---|---|---|---|---|
| 1 | P0 | Tests/gates | Jest coverage is API-only (`api/**/*.js`) while runtime and script/AO test surfaces are broader, so release confidence is structurally incomplete. | 04-tests-gates-scan.md | `package.json` |
| 2 | P1 | Frontend runtime | No direct page-level tests for `LearningSessionPage`, `TopicWorkspacePage`, and `ReviewQueuePage` were identified; orchestration logic remains indirectly tested. | 02-frontend-runtime-scan.md | `src/pages/learning-runtime/LearningSessionPage.jsx`, `src/pages/learning-runtime/TopicWorkspacePage.jsx`, `src/pages/learning-runtime/ReviewQueuePage.jsx` |
| 3 | P1 | Frontend runtime | High orchestration density in `LearningSessionPage` (launch/import/ask state machine, idempotent request keys, route-state branching) creates regression coupling. | 02-frontend-runtime-scan.md | `src/pages/learning-runtime/LearningSessionPage.jsx` |
| 4 | P1 | Frontend runtime | `src/context` and `src/contexts` split by module family increases onboarding risk for future context edits and routing glue. | 02-frontend-runtime-scan.md | `src/context/AIContext.jsx`, `src/contexts/AuthContext.jsx`, `src/contexts/ThemeContext.jsx` |
| 5 | P2 | Frontend runtime | `legacy-entry-mode` route entry and app-level mapping are central points with limited explicit transition coverage for route payload handling. | 02-frontend-runtime-scan.md | `src/pages/legacy-entry-mode.js`, `src/App.jsx` |
| 6 | P1 | Backend runtime | `api/rag/lib/ask-service.js` has high LOC and highest import count in the scan, indicating high surface complexity for one component. | 01-complexity-inventory.md | `api/rag/lib/ask-service.js` |
| 7 | P1 | Backend runtime | `api/learning/lib/events/attempt-event-service.js` is a high-LOC event effect path for scoring/attempt transitions. | 01-complexity-inventory.md | `api/learning/lib/events/attempt-event-service.js` |
| 8 | P1 | Backend runtime | `api/learning/lib/session-runtime/session-service.js` is core and high LOC; this file remains a key failure concentration path. | 01-complexity-inventory.md | `api/learning/lib/session-runtime/session-service.js` |
| 9 | P1 | Backend runtime | `api/learning/lib/workspaces/workspace-read-service.js` and `workspace-entry-resolver.js` are large and central to workspace ownership semantics. | 01-complexity-inventory.md | `api/learning/lib/workspaces/workspace-read-service.js`, `api/learning/lib/workspaces/paper-workspace-entry-resolver.js` |
| 10 | P1 | Backend runtime | `scripts/ao/lib/controller-loop.js` and `scripts/ao/lib/state-contracts.js` are large and represent operational control-plane risk if edited. | 01-complexity-inventory.md | `scripts/ao/lib/controller-loop.js`, `scripts/ao/lib/state-contracts.js` |
| 11 | P2 | Backend runtime | Large runtime-facing test files (for example `api/learning/__tests__/workspace-read-service.test.js`) are maintenance-heavy and likely brittle refactor dependencies. | 01-complexity-inventory.md | `api/learning/__tests__/workspace-read-service.test.js` |
| 12 | P2 | Backend runtime | Many high-import files exist in script/test stack (`scripts/ao/lib/eval-harness.js`, `tests/ao/controller-loop.test.js`) with broader blast radius if touched. | 01-complexity-inventory.md | `scripts/ao/lib/eval-harness.js`, `tests/ao/controller-loop.test.js` |
| 13 | P1 | Backend/API contract | Route registry match is linear, first-match, with no built-in duplicate-path/method collision detection. | 03-backend-route-contract-scan.md | `api/_runtime/route-registry.js:243-263` |
| 14 | P1 | Backend/API contract | Gateway-level schema/contract checks are thin; detailed payload validation remains handler-level and can vary by handler semantics. | 03-backend-route-contract-scan.md | `api/index.js:206-230`, `api/_runtime/request-adapter.js:133-153` |
| 15 | P2 | Backend/API contract | Rate-limit policy metadata is selective, not universal, so high-impact routes rely on non-registry controls. | 03-backend-route-contract-scan.md | `api/_runtime/route-registry.js:274-277`, `api/lib/security/rate-limit-policy.js` |
| 16 | P2 | Backend/API contract | Legacy exclusions are explicit but statically listed; drift is possible without automated retired-route policy coupling. | 03-backend-route-contract-scan.md | `api/_runtime/route-registry.js:4-9`, `api/index.js:108-119` |
| 17 | P2 | Backend/API contract | No direct coverage for route auth/rate metadata completeness outside learning subset. | 03-backend-route-contract-scan.md | `api/_runtime/route-registry.js`, `api/_runtime/__tests__/route-registry-learning.test.js` |
| 18 | P1 | PRD contract | `active_scope_bundle` appears canonical in multiple files and is therefore high-impact if any refactor changes its type assumptions. | 05-prd-contract-map.md | `api/learning/lib/contracts/runtime-contract.js`, `api/learning/lib/session-runtime/session-service.js` |
| 19 | P1 | PRD contract | `session-anchor-resolution` + question registry form canonical topic/question paths; compatibility bridge reliance increases mutation risk. | 05-prd-contract-map.md | `api/learning/lib/session-runtime/session-anchor-resolution.js`, `api/learning/lib/repositories/question-registry-repository.js` |
| 20 | P2 | PRD contract | Mastery effect is inferred from attempt/event pipelines; no single dedicated “mastery” owner file was identified. | 05-prd-contract-map.md | `api/learning/lib/events/event-service.js`, `api/learning/lib/events/attempt-event-service.js` |
21 | P2 | PRD contract | MarkingResult / Smart Mark boundary depends on non-authoritative fallback markers and release checks; this boundary is critical and easy to regress. | 05-prd-contract-map.md | `api/learning/lib/contracts/released-scope-core.js`, `api/marking/evaluate-v1.js`, `api/learning/lib/events/attempt-event-service.js`, `api/marking/lib/marking-result-contract.js` |
| 22 | P2 | PRD contract | `Question family / question type` is registry-derived and released-scope dependent, with medium risk if legacy payload paths bypass registry. | 05-prd-contract-map.md | `api/learning/lib/repositories/question-registry-repository.js`, `api/learning/lib/contracts/released-scope.js` |
| 23 | P1 | Tests / gates | Workflow naming and AO no-op/no-op-like branches remain ambiguous for reviewers, especially around `rag-s1-*` and `rag-s2-advisory`. | 04-tests-gates-scan.md | `.github/workflows/rag-s1-contract-gate.yml`, `.github/workflows/rag-s1-metric-gate.yml`, `.github/workflows/rag-s2-advisory-gate.yml` |
| 24 | P2 | Tests / gates | No single canonical doc mapping release vs advisory vs AO-only for workflows was observed in scan scope. | 04-tests-gates-scan.md | `.github/workflows/*.yml`, `docs/reports/INDEX.md` |
| 25 | P2 | Scripts/docs | Script and test ecosystems (`scripts/*`, `tests/ao/*`) are very large; without targeted indexing this becomes hard to reason about in governance PRs. | 04-tests-gates-scan.md | `scripts/workflow/`, `tests/ao/`, `docs/reports/codebase-trust-pass` |

## P0 / P1 / P2 backlog

P0 candidate set is intentionally narrow to keep the synthesis pass safe:
- P0-1: Coverage topology mismatch (gated by API-only coverage denominator) [Source 04]
- P0-2: Route-registry shadowing risk from first-match + no collision linting [Source 03]

### Minimal safe acceptance criteria for each P0 candidate

1. P0-1 acceptance criteria: run a review check plan that demonstrates (a) why coverage is API-only, (b) a defined policy for interpreting frontend/runtime coverage, and (c) either a temporary coverage-adjusted gate or explicit reviewer exemption list with owners.
2. P0-2 acceptance criteria: add/keep a deterministic duplicate path+method lint check in route-registry validation, prove no existing route in production registry would collide, and verify auth/rate fields remain unchanged after linting.

P1 backlog (recommended next execution order):
- P1-1: Add page-level runtime route transition tests for `LearningSessionPage`, `TopicWorkspacePage`, and `ReviewQueuePage`.
- P1-2: Add contract tests for route-registry duplicate collisions and route policy completeness beyond learning subset.
- P1-3: Add workflow intent notes in `docs/reports` mapping every workflow to release/advisory/AO-only semantics.

P2 backlog:
- P2-1: Add compatibility note for `src/context` vs `src/contexts` boundary or standardize with explicit migration guard.
- P2-2: Add focused complexity notes for high-import/high-LOC hotspots before any cleanup PR.
- P2-3: Produce a small scripts/docs index linking heavy script test sets (`scripts`, `tests/ao`) to owning issue context.

## Suggested Codex execution slices (one PR each)

1. `slice-frontend-page-tests` — add focused runtime page route-transition and request-key guard tests under `src/pages/learning-runtime/*`.
2. `slice-route-registry-lint` — add registry duplicate-path/method + auth/rate metadata lint tests under `api/_runtime/*`.
3. `slice-gate-taxonomy-doc` — add concise workflow taxonomy doc section in `docs/reports/` with release/advisory/AO-only semantics, no runtime changes.
4. `slice-coverage-policy` — publish a policy note and reviewer runbook for the current API-only coverage model while keeping code unchanged.

## Ten things not to fix in this pass

1. Do not refactor `active_scope_bundle` internals or typed-ref semantics.
2. Do not rework session scoring math or `MarkingResult` authority logic.
3. Do not alter route semantics for `/api/learning/*` APIs outside regression-safe tests.
4. Do not remove compatibility bridges for legacy entry points.
5. Do not normalize the whole `src/context` and `src/contexts` trees in one pass.
6. Do not change AI or auth runtime behavior without explicit PRD owner approval.
7. Do not collapse or rename large script files unless accompanied by full test parity.
8. Do not merge duplicate PRs for overlapping coverage-interpretation and test-plan tasks.
9. Do not expand into migration-heavy runtime domains outside #466 scope.
10. Do not claim full repo health closure from this single planning pass; use follow-on slices only.

## Open questions for human owner decision

1. Should coverage mismatch (P0-1) be fixed in a code gate (Jest config) or governance policy artifact first?
2. Should route-registry collision lint be hard-failing in CI immediately or staged behind explicit warning for one sprint?
3. Is the compatibility bridge (`src/context` vs `src/contexts`) expected to be permanent or to converge under one path?
4. What is the approval policy for workflow clarifier changes touching AO-only no-op branches?
5. Which 2-3 production slices are preferred first if only one PR can be merged at a time?
