# Phase 1A Live Source-Of-Truth Contract Readback

Issue: #436
Parent: #435
Date: 2026-06-14
Baseline inspected: `origin/main @ 6edc4906db969b6086edf97411a161068f9386ca`
Branch: `feat/issue-436`
Scope: docs/report-only. No schema, API, frontend route/page, scoring, content pipeline, or 9702/9709/9231 production-ready workflow changes.

## Verdict

Live `origin/main` is not pure paper-first and is not pure topic-first. The current source-of-truth contract is a hybrid projection:

- Paper Workspace is the current approved target/read-model surface for later UI integration.
- Topic sections are projections inside Paper Workspace, with canonical ownership still topic-based for objects such as artifacts, ReviewTasks, mastery rows, and source questions.
- The legacy Topic Workspace route, helper, stable slots, and view-model surface remain preserved compatibility behavior until a separate human-approved migration retires them.
- The global ReviewTask queue remains the queue identity; paper and topic-section views filter/project it and must not clone paper-local or topic-local queues.

Therefore Phase 1A should not assume a completed Paper Workspace supersession. Child work should use the Paper Workspace + Topic Sections + Stable Slots contract as the target while preserving Topic Workspace + Stable Slots compatibility as a hard Phase 1 boundary.

## Source Inventory

| Source | Live `origin/main` status | Commit hash / evidence |
| --- | --- | --- |
| `核心项目文档/PRD.md` | Not tracked and absent in this AO worktree. `.gitignore:83` ignores `核心项目文档/`, so this file is not independently citable as live `origin/main` truth from this checkout. | Not applicable as a tracked live source. `.gitignore` last changed in `f81e845718bdd40fa54eb8fab024160b0a095590`; line 83 ignores the directory. |
| `docs/reports/2026-06-05-paper-workspace-backend-convergence-gap-report.md` | Tracked readback of team-local PRD v4.1 and then-current backend gaps. It records that local PRD v4.1 fixed `Paper Workspace + Topic Sections + Stable Slots` and that the PRD file was outside the AO worktree. | `083120938dcc18c695548292ab32b855264c812a`; lines 11-22, 44-70. |
| `docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md` | Older frozen runtime contract with topic workspace identity and stable slots. It still governs active scope, imported question durability, ReviewTask evidence, mastery guardrails, and non-released fallback. | `de1b87ab0e238c3b34425816054b6ee0e2b1dc23`; lines 251-254, 322-332, 403-440, 450-479, 598-621, 804-825, 1045-1055, 1071-1074, 1159-1164. |
| `docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md` | Older execution plan still naming `/learn/workspace/:topicId` and workspace projection ownership for early runtime work. | `ffe3082dd12722c0efcf2b8ebef45b486d45639b`; lines 1217-1277, 1438-1441. |
| `docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md` | Backend readback after the Paper Workspace chain: paper route is additive, topic endpoint remains available, topic sections are projections, queue is global. | `c52b059361bde3a0920c4b76d6af90566dd4404b`; lines 12-21, 50-58, 62-174, 176-180. |
| `docs/reports/2026-06-05-review-task-completion-evidence-compatibility.md` | ReviewTask completion evidence current contract: completed outcomes require mode-specific evidence; incomplete outcomes retain compatibility. | `6ca5345c2baee8ea637593ab5d66f3274c7744f4`; lines 8-37. |
| `docs/reports/2026-06-11-paper-workspace-frontend-contract-pack.md` | Frontend fixture contract for paper workspace, focused topic-section subview, legacy topic fallback, and ReviewTask completed-outcome payloads. | `f2aab5aac263cb5c6f089372b27ae02ea3fcc76f`; lines 11-13, 31-48, 58-76. |
| `docs/reports/2026-06-11-paper-workspace-frontend-smoke-harness.md` | Frontend smoke contract that verifies helpers/view-models for paper workspace, topic-section, legacy fallback, and malformed payload failure paths. | `014002f81c350ba186a9574724c7161468521fca`; lines 13-15, 46-69, 92-97. |
| `docs/reports/2026-06-11-paper-workspace-frontend-pre-adapter-readiness.md` | Final pre-adapter readiness handoff. It explicitly blocks visible route/page/layout migration and preserves `/api/learning/workspaces/:topicId` until separate approval. | `f81e845718bdd40fa54eb8fab024160b0a095590`; lines 35-42, 50-87, 120-135, 176-192. |
| `docs/reports/gpt55-pro-web-runs/` | Not present on this live baseline. | No tracked source found by `find docs/reports/gpt55-pro-web-runs -maxdepth 2 -type f`. |

## Implementation Source Map

| Area | Files/modules/tests | Last relevant commit |
| --- | --- | --- |
| API route registry | `api/_runtime/route-registry.js` registers `learning-workspace-paper` before `learning-workspace-topic` and exposes `GET`, `POST`, `OPTIONS` for paper workspace. | `063d4acec7553c27f4e4bc2b7ac2209abf6b046f`; lines 71-95. |
| Paper persistence/read models | `supabase/migrations/20260605120000_add_paper_workspace_persistence_contract.sql` adds `learning_paper_workspaces`, `learning_paper_workspace_topic_sections`, and compatibility projection without rewriting topic workspaces. | `3ac187777cb3f7f5cda868694bd135fe202d8c4b`; lines 1-26, 28-41, 163-180. |
| Legacy topic workspace persistence | `supabase/migrations/20260320111000_create_learning_runtime_core.sql`, `supabase/migrations/20260320112000_create_learning_runtime_read_models.sql` remain the older topic/stable-slot base. | `96debaac69c9f0c8036d8e64da59291667ad72c0`, `e1c9e000a2797b93080524e713366ff31be8e8d1`. |
| Paper route handler | `api/learning/workspaces/papers/[paperScope].js` normalizes paper scope, supports paper view, ensure, and focused topic-section query. | `2916e0064187139e2e3e20278ee0c9f4c1f9501d`; lines 48-132. |
| Topic compatibility route | `api/learning/workspaces/[topicId].js` still supports `GET` and `POST action: "ensure"` and returns `compatibility: buildTopicWorkspaceCompatibility(payload)`. | `063d4acec7553c27f4e4bc2b7ac2209abf6b046f`; lines 35-91. |
| Compatibility envelopes | `api/learning/lib/workspaces/paper-workspace-contract.js` defines paper, paper-topic-section, and legacy topic compatibility shapes. | `2916e0064187139e2e3e20278ee0c9f4c1f9501d`; lines 4-7, 60-123. |
| Frontend API helpers | `src/api/learningRuntimeApi.js` exposes `getWorkspace`, `getPaperWorkspace`, `getPaperTopicSectionWorkspace`, `listReviewTasks`, and explicit `updateReviewTask` payload building. | `d0b70f9dd901209a161cc04c29d2029ec7fabc20`; lines 226-238, 306-328, 330-365, 402-418. |
| Workspace view model | `src/components/learning-runtime/view-models/workspace-view-model.js` parses paper workspace, paper topic-section, and legacy topic fallback surfaces. | `d0b70f9dd901209a161cc04c29d2029ec7fabc20`; lines 239-344. |
| Active scope/session runtime | `api/learning/lib/session-runtime/session-service.js`, `api/learning/__tests__/session-api.test.js`, `api/learning/__tests__/session-ask.test.js`, `src/api/__tests__/learningRuntimeApi.test.js`, and `src/components/learning-runtime/__tests__/view-models.test.js`. | Service `ae81b26e801d76abbb94530b626a6b57c1c4fc07`; tests include `ae81b26e801d76abbb94530b626a6b57c1c4fc07`, `56bd9df9c9f5d02b98448cd29f8d111bbef84553`, `d0b70f9dd901209a161cc04c29d2029ec7fabc20`, `3c066ac20189b99ea5fb265a043fccb90e699299`. |
| Imported/pasted question intake | `api/learning/lib/import/question-import-service.js`, `api/learning/__tests__/question-import-service.test.js`, `api/learning/__tests__/question-import-validator.test.js`, `src/api/__tests__/learningRuntimeApi.test.js`, `src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js`. | Service `c8001541ba1c0dbe6cbe939159b624261ac38b75`; primary tests `f1229c84a556a0b4febda440fbabd277e9e56019` and `d0b70f9dd901209a161cc04c29d2029ec7fabc20`. |
| ReviewTask completion evidence | `api/learning/lib/validators/review-task-completion-evidence.js`, `api/learning/lib/review/review-task-service.js`, `api/learning/__tests__/review-task-service.test.js`, `api/learning/__tests__/review-task-api.test.js`, frontend fixture tests. | `6ca5345c2baee8ea637593ab5d66f3274c7744f4`; frontend fixture test `f2aab5aac263cb5c6f089372b27ae02ea3fcc76f`. |
| Scoring release-scope guard | `api/learning/lib/contracts/released-scope.js`, `api/learning/__tests__/released-scope.test.js`, import service posture resolution. | `05a7fa11a6cf9728620328dc466d5872798a80df`; import service current logic lines 233-275. |
| Mastery guardrail | `api/learning/lib/mastery/mastery-orchestrator.js`, `api/learning/__tests__/mastery-orchestrator.test.js`. | Service `3c066ac20189b99ea5fb265a043fccb90e699299`; test `bab91f5dfe67a5627342afacd0ac2659df737e51`. |
| Paper workspace focused tests | `api/learning/__tests__/workspace-read-service.test.js`, `api/learning/__tests__/paper-workspace-entry-resolver.test.js`, `src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js`, `src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js`, `src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js`. | `6ca5345c2baee8ea637593ab5d66f3274c7744f4`, `9afaa82e29e979c7725755941b6539798f48894e`, `f2aab5aac263cb5c6f089372b27ae02ea3fcc76f`, `d0b70f9dd901209a161cc04c29d2029ec7fabc20`, `014002f81c350ba186a9574724c7161468521fca`. |

## Source-Of-Truth Matrix

| Contract area | Product/report truth | Implementation/API/view-model truth | Current decision |
| --- | --- | --- | --- |
| Product source | `核心项目文档/PRD.md` is top-precedence by project rules but is absent and ignored on live `origin/main`. The tracked PRD v4.1 readback is the June 5 convergence report at `083120938dcc18c695548292ab32b855264c812a`, which says PRD v4.1 locked `Paper Workspace + Topic Sections + Stable Slots`. The older tracked March spec at `de1b87ab0e238c3b34425816054b6ee0e2b1dc23` still names topic workspace uniqueness. | Live repo has both paper and topic compatibility code. | Treat the checked-in June reports plus current code as live readback truth. Do not cite absent local PRD as direct live evidence. |
| Workspace model | March spec: one learner plus one topic equals one canonical workspace; stable slots are topic-stable. June reports: paper workspace is target, topic sections are projections, legacy topic endpoint remains. | Paper route, paper persistence, topic-section projections, and legacy topic route all exist. Frontend API/view-models support paper, paper-topic-section, and legacy topic fallback. | Hybrid projection. Paper Workspace is target/read-model surface; Topic Workspace + Stable Slots is preserved compatibility. Not pure paper-first yet. |
| Active scope bundle | March spec requires persisted `active_scope_bundle` with typed refs, nullable question refs, and no placeholder question IDs. | `session-service.js` builds `current_question_ref` and `current_question_type_ref` typed refs and allows nulls; frontend normalization preserves typed refs and questionless state. Tests cover questionless session/API/view-model behavior. | Current truth is typed-ref active scope; bare IDs are summary convenience only. Child work must not introduce route-only or bare-ID canonical state. |
| ReviewTask completion evidence | March spec and June #360 note require evidence, not a bare checkbox; completed outcomes require mode-specific evidence. | `validateReviewTaskCompletionEvidence` rejects missing evidence and enforces mode-specific completed evidence. API helper builds explicit `intent`, `completion_outcome`, and `completion_evidence`. Fixture and backend tests cover this. | Current truth is strict write-time evidence for completed outcomes, with compatibility for non-completed outcomes. |
| Imported/pasted questions | March spec requires imported/pasted questions to become durable `Question` objects and return explicit scoring posture. | Import service normalizes question envelope, inserts/reuses durable imported question rows, resolves released scoring posture from registry/rubric/uncertainty context, and exposes `scoring_scope_posture`; frontend API includes `importQuestion`. | Current truth is durable import first, explicit posture second. Imported/pasted questions must not stay chat-only or bypass release-scope posture. |
| Mastery guardrail | March spec forbids topic-level percentage mastery as the new runtime truth and allows positive type-level updates only in released scoring scope. | Mastery orchestrator computes release posture, marks non-authoritative runtime inputs, suppresses `masteryUpdates` when non-authoritative, and stores release posture in proposed effects. | Current truth is conservative mastery: no strong positive type-level updates outside authoritative scope. |
| Scoring release scope | March spec allows authoritative scoring only with promoted question type, released rubric ref, and validated uncertainty behavior; `non_released_fallback` is success posture. | `released-scope.js` requires released type match, released family evidence, candidate refs, and uncertainty posture through core release gating. Import and mastery services consume that posture. | Current truth is release-scope gated scoring. Pilot membership alone does not unlock scoring; fallbacks are valid runtime outcomes. |
| API behavior | June rollout gate defines paper route, paper topic-section subview, legacy topic workspace, global review queue, explicit ReviewTask lifecycle write. | Route registry and handlers expose all those surfaces. `src/api/learningRuntimeApi.js` exposes helpers for all of them and preserves legacy topic fallback. | Current API is hybrid and additive. No endpoint retirement is authorized. |
| View-model behavior | June #430 readiness says pure view model should distinguish paper, paper-topic-section, and legacy topic fallback surfaces. | `buildWorkspaceViewModel` derives `surface.kind`, `reviewQueueScope`, `topicSectionsAreProjections`, and `isLegacyTopicWorkspace`. Tests cover paper, topic-section, and legacy fallback cases. | Current view-model truth is surface-aware hybrid parsing. Later UI must branch on surface, not assume one workspace kind. |
| Current reports | June 5 and June 11 reports are internally consistent that Paper Workspace is the target but not a launched UI migration. | The code matches this: paper APIs and pre-adapter helpers exist, legacy visible topic route remains. | Reports and code agree on hybrid current state. |

## Conflict Resolution

Known conflict:

- The tracked March runtime contract says workspace identity is `one learner + one topic` and documents `/api/learning/workspaces/:topicId`.
- The later PRD v4.1 readback and June reports say the product target is `Paper Workspace + Topic Sections + Stable Slots`.
- The live `origin/main` checkout does not contain the top-precedence local PRD file, so direct PRD v4.1 citation is only available through checked-in readback reports.

Resolution recommendation:

1. Use this report as the Phase 1A source-of-truth gate for issue #436.
2. For child implementation work, treat `Paper Workspace + Topic Sections + Stable Slots` as the target contract only where existing paper routes, fixtures, helpers, and view-model adapters already prove it.
3. Preserve `/api/learning/workspaces/:topicId`, `getWorkspace(topicId)`, `surface.kind: "legacy_topic_workspace"`, and topic stable-slot semantics until a separate, human-approved route/page/layout migration explicitly retires them.
4. Do not construct a new visible Topic Workspace root for paper topic-section focus. Topic sections remain projections inside the paper workspace.
5. Do not create paper-local or topic-local ReviewTask queue identities. The global queue remains the source; paper/topic views filter it.
6. Do not widen scoring, mastery, imported-question, active-scope, content-pipeline, or production-ready workflow behavior as part of Phase 1A source-of-truth cleanup.

This resolves the issue's paper-first versus topic-first question as: current live truth is hybrid projection with a paper-first target and topic-first compatibility bridge. Paper Workspace is not yet a full supersession of Topic Workspace in the live UI/runtime contract.

## Proposed Child Issue Adjustments

These are recommendations only. This PR does not edit child issues.

| Child area | Adjustment |
| --- | --- |
| Child 2 and later workspace work | State explicitly that the implementation contract is "hybrid projection: Paper Workspace target plus preserved Topic Workspace compatibility." Avoid wording that implies pure paper-first supersession. |
| Frontend route/page work | Keep visible route/page/layout migration out of Phase 1A unless a later human-approved issue names the URL shape and retirement plan. |
| API/view-model work | Require all consumers to branch on `surface.kind` and `reviewQueue.scope` rather than inferring from route alone. |
| Topic fallback | Add an explicit non-retirement clause: `/api/learning/workspaces/:topicId` and `getWorkspace(topicId)` stay until a separate approved migration removes them. |
| PRD/source tracking | Consider a separate docs task to promote the local PRD v4.1 workspace clauses into a tracked repo source or a tracked PRD-readback appendix, because `核心项目文档/PRD.md` is ignored and absent from live AO worktrees. |
| ReviewTask evidence | Any UI action child that completes ReviewTasks must require mode-specific evidence payloads before sending `completion_outcome: "completed"`. |
| Scoring/mastery/import | Preserve existing release-scope and non-released fallback gates; do not use workspace migration as a reason to broaden authoritative scoring or positive type-level mastery. |

## Verification Notes

Initial live-state checks before writing this report:

```text
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git merge-base HEAD origin/main
gh issue view 436 --json number,title,state,body,url,labels,assignees
ao status -p ciecopilot-home --json
npm run workflow:codex-preflight -- --json --strict
```

Observed before edits:

- `HEAD`, `origin/main`, and merge-base all resolved to `6edc4906db969b6086edf97411a161068f9386ca`.
- Issue #436 was open and matched the docs/report-only acceptance contract.
- AO status showed `cie-292` active on issue `436`, branch `feat/issue-436`, with no PR.
- Strict preflight returned `top_status: "warning"` and exit code 20 because the AO branch is not `task/` or `codex/` scoped; `branch_safety` was the only warning, while worktree cleanliness and upstream sync were healthy.

Final verification after the report/index edits:

```text
npm run workflow:codex-preflight -- --json
```

- Exit 0.
- `top_status: "warning"` because this AO branch is `feat/issue-436`, not `task/` or `codex/`, and the intentional docs changes are dirty before commit.
- `upstream_sync` remained healthy with `ahead: 0`, `behind: 0`.

```text
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/released-scope.test.js --verbose
```

- Exit 0.
- 6 test suites passed; 68 tests passed.
- The repo root dependency path was used because this isolated AO worktree has no local `node_modules/jest`.

Broader diagnostic run including `api/learning/__tests__/question-import-service.test.js`:

- Exit 1.
- 6 of 7 suites passed; 77 of 79 tests passed.
- The 2 failures were existing import-service confidence expectation mismatches: expected `classification_confidence: 0.89`, received `0.95` in the integration application import cases.
- This branch has no diffs in `api/learning/lib/import/question-import-service.js` or `api/learning/__tests__/question-import-service.test.js`.

```text
rg -n "Product source|Workspace model|Active scope bundle|ReviewTask completion evidence|Imported/pasted questions|Mastery guardrail|Scoring release scope|Known conflict|Proposed Child Issue Adjustments|hybrid projection|Topic Workspace \\+ Stable Slots" docs/reports/2026-06-14-phase-1a-live-source-of-truth-contract-readback.md
git diff --check
```

- Both commands exited 0.
