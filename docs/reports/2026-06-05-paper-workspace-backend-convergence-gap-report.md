# Paper Workspace Backend Convergence Gap Report

Issue: #356  
Parent epic: #355  
Baseline inspected: `origin/main @ a1758f0aaa45c5dcd25c1d254a92934e3cc434cb`  
Branch: `task/356-paper-workspace-gap-report`  
Scope: documentation/report only. No schema, API, service, frontend, 9231, or new 9709 content changes are proposed or implemented by this report.

## Evidence Sources

PRD source:

- `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md` was used as the team-local PRD v4.1 source because this AO worktree does not contain `核心项目文档/PRD.md` or `core project docs/PRD.md`; `.gitignore:83` ignores `核心项目文档/`.
- Key PRD clauses inspected:
  - PRD v4.1 final draft title and phase scope: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:1`, `:27-33`.
  - locked product decisions for `Paper Workspace + Topic Sections + Stable Slots`: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:39-57`.
  - workspace scope and carried content: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:306-323`.
  - session/workspace memory boundary: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:721-747`, `:788-804`.
  - paper workspace ownership, uniqueness, canonical-home and linked-reference rules: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:1135-1154`.
  - stable slots: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:1156-1170`.
  - review task contract, completion evidence, global/paper/topic queue views, queue overload boundaries: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:1299-1372`, `:1407-1422`.
  - product/learning metrics for workspace revisit, review completion, review lift, and queue overload: `/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md:2007-2096`.

Repository evidence inspected:

- `supabase/migrations/20260320111000_create_learning_runtime_core.sql`
- `supabase/migrations/20260320112000_create_learning_runtime_read_models.sql`
- `api/_runtime/route-registry.js`
- `api/learning/workspaces/[topicId].js`
- `api/learning/lib/repositories/workspace-repository.js`
- `api/learning/lib/workspaces/workspace-read-service.js`
- `api/learning/lib/review/review-scheduler-policy.js`
- `api/learning/lib/review/review-task-service.js`
- `api/learning/review-tasks/[id].js`
- `api/learning/lib/contracts/runtime-contract.js`
- `api/learning/__tests__/workspace-repository.test.js`
- `api/learning/__tests__/workspace-read-service.test.js`
- `api/learning/__tests__/review-scheduler-policy.test.js`
- `api/learning/__tests__/review-task-api.test.js`
- `api/learning/__tests__/schema-contract.test.js`
- `api/_runtime/__tests__/route-registry-learning.test.js`
- GitHub issue evidence from `gh issue view 355 --repo Samsen879/ciecopilot-home --json ...` and `gh issue view 356 --repo Samsen879/ciecopilot-home --json ...`.

## Executive Finding

`origin/main` has useful backend primitives for stable slots, linked references, topic-filtered review projection, revisit continuity, explicit review-task lifecycle intents, and completion-evidence storage. The convergence blocker is that the workspace identity is still topic-scoped at every durable boundary: schema, read model, repository, route, service, and tests all make `topic_id` the workspace key.

The next backend work should therefore be additive and staged:

1. Add paper-scoped identity and read models before changing API semantics.
2. Preserve `/api/learning/workspaces/:topicId` as a compatibility bridge.
3. Add paper workspace API and entry-resolution contracts after persistence/read models exist.
4. Refactor services to paper-first while keeping topic focus as a section/subview.
5. Implement paper-filtered review views from the global queue without duplicating review tasks.
6. Harden completion evidence by review mode.

## PRD-To-Code Status Matrix

| Area | PRD v4.1 target | Current `origin/main` status | Classification | Owning follow-up |
|---|---|---|---|---|
| Workspace scope | Workspace is per learner per paper scope; Topic is an internal section, not its own visible workspace. PRD lines `306-323`, `1135-1154`. | `learning_workspaces` stores `topic_id`, `topic_path`, and `UNIQUE (user_id, topic_id)` only (`supabase/migrations/20260320111000_create_learning_runtime_core.sql:76-86`). Repository ensure/fetch uses `topicId` (`api/learning/lib/repositories/workspace-repository.js:37-43`, `:57-80`, `:103-109`). | blocker | #361, #364 |
| Topic sections | Paper Workspace must contain topic sections while preserving bottom-layer topic ownership. PRD lines `311-313`, `1149-1154`. | Topic is the workspace key and route parameter; there is no paper-level container plus `focus_topic_id` or topic-section projection (`api/learning/workspaces/[topicId].js:74-85`, `api/learning/lib/workspaces/workspace-read-service.js:637-704`). | blocker | #362, #357, #359 |
| Stable slots | Minimum paper slots are Overview/Paper Map, Topics, Core Methods, Worked Examples, Common Traps, My Notes, Review Queue. PRD lines `1156-1167`. | Stable-slot primitives exist, but the enum is topic-workspace oriented: `overview_map`, `core_method_derivation`, `canonical_worked_example`, `common_traps`, `my_notes`, `review_queue` (`api/learning/lib/contracts/runtime-contract.js:40-65`, `supabase/migrations/20260320111000_create_learning_runtime_core.sql:88-98`). There is no explicit `topics` slot or paper section slot model. | compatibility bridge | #362, #357 |
| API routes | Paper workspace should be addressable as a paper/module-level surface, with topic views as subviews. | The only registered workspace route is `/api/learning/workspaces/:topicId` (`api/_runtime/route-registry.js:71-83`) and route tests assert only topic workspace routing (`api/_runtime/__tests__/route-registry-learning.test.js:47-54`, `:88-98`). The handler supports `POST action=ensure` (`api/learning/workspaces/[topicId].js:61-85`), but the route registry currently advertises only `GET, OPTIONS`. | compatibility bridge | #357 |
| Repository boundary | Paper-first workspace access should not require callers to treat topic as workspace identity. | `ensureWorkspaceExists` and `fetchWorkspaceProjection` are topic-first and query by `user_id + topic_id` (`api/learning/lib/repositories/workspace-repository.js:37-49`, `:57-100`, `:103-131`). Repository tests assert `topic_id` filters and `learning_workspaces_user_id_topic_id_key` conflict handling (`api/learning/__tests__/workspace-repository.test.js:126-213`, `:215-272`). | blocker | #361, #364 |
| Read service boundary | Paper workspace should return paper summary, topic sections, slots, paper-filtered review view, and topic-filtered subview. | `getWorkspaceView` fetches one topic workspace projection, topic artifacts, topic review queue, and latest session by topic (`api/learning/lib/workspaces/workspace-read-service.js:637-712`). `readTopicFromSession` reads `primary_topic_id` / `primary_topic_path` from the active scope (`api/learning/lib/workspaces/workspace-read-service.js:413-433`). | blocker | #362, #364, #359 |
| Review queue views | One global scheduler; Paper Workspace `Review Queue` is paper-filtered; Topic ReviewTasks are topic/question-type subviews; no paper-local/topic-local duplicate queues. PRD lines `1354-1372`. | A global projection primitive exists (`learning_review_queue_projection`) and `listReviewTasks` derives scheduler state before filtering (`supabase/migrations/20260320112000_create_learning_runtime_read_models.sql:95-126`, `api/learning/lib/workspaces/workspace-read-service.js:593-635`). Filtering is topic-only via `target_topic_id`; no paper scope exists in the projection. | blocker | #358 after #362/#364 |
| Queue overload policy | Scheduler must cap daily recommendations and high-priority duplicates. PRD lines `1407-1422`. | Policy already caps daily recommendations at 3 and one high-priority open task per type (`api/learning/lib/review/review-scheduler-policy.js:56-63`, `:728-835`). Tests cover daily cap and high-priority per-type limits (`api/learning/__tests__/review-scheduler-policy.test.js:206-323`). | compatibility bridge | #358 |
| Review completion evidence | Completion cannot be a bare done checkbox; it needs behavior evidence by mode. PRD lines `1337-1352`. | Schema has `completion_evidence` (`supabase/migrations/20260320111000_create_learning_runtime_core.sql:150-171`), review task patching requires explicit intent and evidence signal (`api/learning/lib/review/review-task-service.js:20-23`, `:128-178`, `:258-274`), and API tests reject generic status writes (`api/learning/__tests__/review-task-api.test.js:55-111`). Evidence validation is generic: summary, note, or typed ref. It does not yet enforce the PRD's mode-specific evidence semantics for `quick_recall`, `reconstruct_derivation`, `redo_variant`, `timed_check`, and `trap_fix`. | compatibility bridge | #360 |
| Completion/revisit metrics | Product metrics should distinguish review completion, workspace revisit, review lift, and queue overload. PRD lines `2007-2096`. | Workspace read service exposes revisit changes (`api/learning/lib/workspaces/workspace-read-service.js:493-551`, `:707-711`) and tests cover last-session continuity (`api/learning/__tests__/workspace-read-service.test.js:1466-1495`). There is no backend-only rollout report/gate tying these signals to paper workspace compatibility. | later frontend adapter | #363 |

## Gap Register

### G1: Paper Workspace Identity Is Missing

Classification: blocker  
Current files/tables:

- `public.learning_workspaces` has `topic_id`, `topic_path`, and `UNIQUE (user_id, topic_id)` but no `paper_scope`, `paper_id`, `study_module_id`, or parent paper key (`supabase/migrations/20260320111000_create_learning_runtime_core.sql:76-86`).
- `public.learning_workspace_projection` projects `topic_id` and `topic_path` directly (`supabase/migrations/20260320112000_create_learning_runtime_read_models.sql:59-93`).
- `api/learning/lib/repositories/workspace-repository.js` can only ensure and fetch by topic (`:37-49`, `:57-100`, `:103-131`).
- `api/learning/__tests__/schema-contract.test.js:183-195` and `api/learning/__tests__/workspace-repository.test.js:126-272` freeze the topic-keyed contract.

Why it blocks migration:

- Any paper API built on this schema would either create multiple workspaces per paper, one per topic, or overload one topic row as the paper workspace. Both violate PRD v4.1's single paper/module workspace rule.

Expected direction:

- #361 should add additive paper-scoped persistence while preserving existing topic rows until compatibility reads are proven.

### G2: Topic Sections Are Not A Projection Layer Yet

Classification: blocker  
Current files/routes/services:

- `/api/learning/workspaces/:topicId` treats the path parameter as the workspace locator (`api/_runtime/route-registry.js:71-83`; `api/learning/workspaces/[topicId].js:74-85`).
- `getWorkspaceView` returns `workspace.topic_id` and `workspace.topic_path`, not a paper workspace with `topic_sections` (`api/learning/lib/workspaces/workspace-read-service.js:691-704`).
- The service reads artifacts and sessions by topic (`api/learning/lib/workspaces/workspace-read-service.js:657-677`).

Expected direction:

- #362 should add read models for paper workspace and topic-section projections.
- #359 should own backend entry resolution from paper workspace plus focused topic section after #357/#364 stabilize the API and service layer.

### G3: Existing Topic Workspace Endpoint Must Stay Compatible

Classification: compatibility bridge  
Current files/tests:

- Route registry reserves `/api/learning/workspaces/:topicId` as `learning-workspace-topic` (`api/_runtime/route-registry.js:71-83`).
- Route tests assert the topic path and module order (`api/_runtime/__tests__/route-registry-learning.test.js:47-54`, `:83-98`).
- Handler accepts `GET` and `POST`, with `POST` requiring `action: "ensure"` (`api/learning/workspaces/[topicId].js:34-85`).

Constraints:

- Do not delete or repurpose the existing path during backend convergence.
- Add paper workspace routes/contracts alongside it.
- Existing clients should still receive `workspace`, `slots`, `review_queue`, and `revisit` at the topic endpoint.
- The bridge can resolve `topicId -> paper workspace + focus_topic_id`, but it must not create duplicate paper-local or topic-local review tasks.
- Resolve the current registry/handler method mismatch deliberately: either register `POST` for the existing compatibility endpoint or keep first-open ensure outside route-registry dispatch with explicit tests.

### G4: Stable Slot Primitives Exist But Need Paper-Slot Semantics

Classification: compatibility bridge  
Current files/tables:

- Runtime constants define six slot keys and compatibility by artifact kind (`api/learning/lib/contracts/runtime-contract.js:40-65`).
- Schema check uses the same six slot keys (`supabase/migrations/20260320111000_create_learning_runtime_core.sql:88-98`).
- Workspace read service fills empty slots and injects active review-task refs into the review slot (`api/learning/lib/workspaces/workspace-read-service.js:101-156`).
- Tests assert stable slots plus linked refs (`api/learning/__tests__/workspace-read-service.test.js:1076-1111`).

Delta:

- PRD minimum includes `Topics` as a first-class paper workspace slot/section and names paper-level slots at a higher level than the current topic-slot enum.
- Current keys are good low-level primitives, but an additive paper contract needs an explicit mapping so clients can distinguish paper map, topic sections, topic-resident artifacts, and review queue.

Expected direction:

- #362 should define paper read-model slot/section shape.
- #357 should define wire names and compatibility aliases.

### G5: Review Queue Has Global Mechanics But No Paper Filter

Classification: blocker  
Current files/tables:

- `learning_review_queue_projection` is a global review-task view keyed by `user_id` and `target_topic_id`; it does not expose paper scope (`supabase/migrations/20260320112000_create_learning_runtime_read_models.sql:95-126`).
- `listReviewTasks` loads the user queue, derives policy state, then filters by `topicId`, `status`, and `dueBefore` (`api/learning/lib/workspaces/workspace-read-service.js:564-635`).
- `getWorkspaceView` calls `listReviewTasks` with the current topic only (`api/learning/lib/workspaces/workspace-read-service.js:656-689`).

Existing reusable pieces:

- Scheduler policy already derives global queue posture, daily cap, and high-priority per-type limits (`api/learning/lib/review/review-scheduler-policy.js:56-63`, `:728-835`).
- Scheduler tests cover cap/overflow behavior (`api/learning/__tests__/review-scheduler-policy.test.js:206-323`).

Expected direction:

- #358 should consume paper-scope read models from #362 and paper-first service access from #364, then expose paper-filtered and topic-filtered views from the same global queue.

### G6: Completion Evidence Is Present But Not Mode-Specific Enough

Classification: compatibility bridge  
Current files/tables:

- `learning_review_tasks.completion_evidence` exists and is returned by the read model (`supabase/migrations/20260320111000_create_learning_runtime_core.sql:150-171`; `supabase/migrations/20260320112000_create_learning_runtime_read_models.sql:95-126`).
- `patchLearningReviewTask` requires explicit lifecycle intent and completion evidence (`api/learning/lib/review/review-task-service.js:20-23`, `:128-178`, `:258-274`).
- API tests reject generic `{ status: "completed" }` writes (`api/learning/__tests__/review-task-api.test.js:55-111`).

Delta:

- PRD requires behavior evidence by mode, for example recall response, reconstructed derivation, new attempt, timed check, or trap fix.
- Current validation accepts a generic summary/note/typed-ref evidence signal, which is useful but not enough to prove mode-specific completion.

Expected direction:

- #360 should harden completion evidence contracts after #358 confirms paper/topic review projections.

### G7: Tests Freeze The Current Topic Model

Classification: compatibility bridge  
Current tests:

- Schema contract asserts `UNIQUE (user_id, topic_id)` and current stable-slot enum (`api/learning/__tests__/schema-contract.test.js:113-118`, `:183-195`).
- Repository tests assert topic filters and insert payloads (`api/learning/__tests__/workspace-repository.test.js:126-213`).
- Workspace read-service tests call `getWorkspaceView({ topicId })` and expect topic-level payloads (`api/learning/__tests__/workspace-read-service.test.js:1076-1111`, `:1416-1464`, `:1466-1495`).
- Route registry tests assert only the topic workspace route (`api/_runtime/__tests__/route-registry-learning.test.js:47-54`, `:88-98`).

Expected direction:

- Do not flip these tests in one PR. Add paper-scoped tests in #361/#362/#357 and keep compatibility assertions for `/api/learning/workspaces/:topicId`.

### G8: Frontend Adapter Work Is Intentionally Later

Classification: later frontend adapter  
Reason:

- #355 and #356 explicitly exclude frontend surface work.
- PRD product surfaces are paper workspace plus topic sections, but this backend convergence chain should first stabilize persistence, read models, API contracts, service access, and review projections.

Expected direction:

- #363 should produce backend-only rollout/compatibility evidence. Frontend adapter work should start only after #357/#358/#359/#360/#364 have converged.

## Compatibility Constraints For `/api/learning/workspaces/:topicId`

The existing endpoint is the bridge that keeps old topic workspace consumers alive while the backend moves to paper-first.

Required constraints:

- Keep accepting `topicId` as a focus locator until consumers move to paper workspace routes.
- Keep returning the current top-level fields: `workspace`, `workspace.slots`, `review_queue`, `revisit`, and `runtime_posture`.
- Keep `workspace_not_found` behavior for missing compatibility targets unless the new resolver has a documented paper fallback.
- Preserve stable slot keys for existing clients or provide explicit aliases in a new paper endpoint; do not silently rename `core_method_derivation` or `canonical_worked_example`.
- Preserve linked-reference typed refs such as `{ kind: "review_task", review_task_id }` and `{ kind: "artifact", artifact_id }`.
- Do not create separate topic-local queue rows. The topic endpoint must remain a view of the global queue filtered by paper/topic context.
- Do not use topic workspace creation as a hidden paper workspace creation path without idempotent paper-scope uniqueness.
- Add route-registry coverage for any compatibility method that should be externally reachable; current handler has `POST action=ensure`, while the registry lists `GET, OPTIONS`.

## Proposed #355 Child-Issue Dependency Graph

GitHub issue #355 currently lists the child issues and recommended order. The dependency graph below keeps #356 as the frozen evidence input and orders work by durable contract dependencies:

```text
#356 gap report
  -> #361 paper-scoped workspace persistence contract
       -> #362 paper workspace read models and topic-section projections
            -> #357 paper workspace API contract with topic compatibility
                 -> #364 workspace repository/read-service paper-first refactor
                      -> #359 backend entry resolver for paper workspace + topic focus
                 -> #358 paper-filtered and topic-filtered review projections
                      -> #360 ReviewTask completion evidence hardening
  -> #363 backend-only rollout gate and compatibility report
       (after #357, #358, #359, #360, and #364)
```

Notes:

- #361 should precede #362 because read models need the additive persistence shape.
- #357 should follow #361/#362 so API wire contracts are not invented over missing persistence.
- #364 should follow #357 so service refactors preserve the agreed compatibility route.
- #359 depends on #357/#364 because entry resolution must target the settled route/service shape.
- #358 depends on #362/#364 because paper-filtered review views need both paper read models and paper-first service access.
- #360 should follow #358 so completion evidence hardening matches the final review projection semantics.
- #363 should close the backend-only chain with compatibility evidence and no frontend route/page/component changes.

## Verification

Commands run from `/home/samsen/.worktrees/ciecopilot-home/cie-238` on branch `task/356-paper-workspace-gap-report`.

```text
npm run workflow:codex-preflight -- --json
exit 0
top_status: warning
repo.branch: task/356-paper-workspace-gap-report
repo.head: a1758f0a
branch_safety: healthy
upstream_sync: healthy, ahead 0, behind 0
worktree_cleanliness: warning because this docs-only report and docs/reports/INDEX.md were dirty before commit
dirty files:
  unstaged: docs/reports/INDEX.md
  untracked: docs/reports/2026-06-05-paper-workspace-backend-convergence-gap-report.md

git status --short --branch
exit 0
## task/356-paper-workspace-gap-report...origin/main
 M docs/reports/INDEX.md
?? docs/reports/2026-06-05-paper-workspace-backend-convergence-gap-report.md

npm test -- --runInBand api/learning/__tests__/workspace-repository.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-scheduler-policy.test.js
first run: exit 1 before Jest executed because this fresh AO worktree had no node_modules/jest/bin/jest.js
environment remediation: npm ci
npm ci: exit 0, added 791 packages, 22 npm audit findings reported by npm
rerun: exit 0
PASS api/learning/__tests__/workspace-read-service.test.js
PASS api/learning/__tests__/review-scheduler-policy.test.js
PASS api/learning/__tests__/workspace-repository.test.js
Test Suites: 3 passed, 3 total
Tests: 24 passed, 24 total
```
