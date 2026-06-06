# Paper Workspace Backend Rollout Gate

Issue: #363
Parent epic: #355
Dependency PR: #381 / issue #360, branch `task/360-review-completion-evidence`, head `6ca5345c2baee8ea637593ab5d66f3274c7744f4`
Branch: `task/363-backend-only-rollout-gate`
PR base: `task/360-review-completion-evidence`
Scope: backend/docs/report only. No frontend files, endpoint retirement, 9231 build/content, or 9709 content production are part of this gate.

## Rollout Verdict

The Paper Workspace / Review Runtime backend chain is ready for normal stacked review after #360 and this report merge in order.

This is not a frontend launch. It is a backend compatibility checkpoint confirming that:

- the visible Paper Workspace route is additive;
- the old topic workspace endpoint remains available;
- paper topic sections are projections over canonical topic-owned objects;
- review views are filtered from the global queue rather than cloned into paper-local or topic-local queues;
- ReviewTask completion evidence is strict for completed outcomes on the stacked #360 branch;
- the remaining work is a frontend adapter migration against the backend contracts listed here.

## Evidence Sources

- Epic and issue truth: #355, #356, #357, #358, #359, #360, #361, #362, #363, #364.
- Merged dependency PRs: #366, #368, #369, #371, #373, #376, #379.
- Stacked dependency PR: #381 at `6ca5345c2baee8ea637593ab5d66f3274c7744f4`.
- Baseline reports:
  - `docs/reports/2026-06-05-paper-workspace-backend-convergence-gap-report.md`
  - `docs/reports/2026-06-05-review-task-completion-evidence-compatibility.md`
- Backend route and service evidence:
  - `api/_runtime/route-registry.js`
  - `api/learning/workspaces/[topicId].js`
  - `api/learning/workspaces/papers/[paperScope].js`
  - `api/learning/lib/workspaces/paper-workspace-contract.js`
  - `api/learning/lib/workspaces/paper-workspace-entry-resolver.js`
  - `api/learning/lib/workspaces/workspace-read-service.js`
  - `api/learning/lib/repositories/workspace-repository.js`
  - `api/learning/review-tasks/index.js`
  - `api/learning/review-tasks/[id].js`
  - `api/learning/lib/validators/review-task-completion-evidence.js`
- Schema/read-model evidence:
  - `supabase/migrations/20260320111000_create_learning_runtime_core.sql`
  - `supabase/migrations/20260320112000_create_learning_runtime_read_models.sql`
  - `supabase/migrations/20260605120000_add_paper_workspace_persistence_contract.sql`
  - `supabase/migrations/20260605130000_add_paper_workspace_read_model_projection.sql`

## Route Contracts

| Route | Methods | Status | Contract |
|---|---:|---|---|
| `/api/learning/workspaces/:topicId` | `GET`, `POST`, `OPTIONS` | preserved compatibility endpoint | `GET` returns topic workspace shape with `workspace`, `runtime_posture`, `review_queue`, `revisit`, and `compatibility`. `POST` requires `action: "ensure"` and creates/returns a topic compatibility workspace only after the topic exists. |
| `/api/learning/workspaces/papers/:paperScope` | `GET`, `POST`, `OPTIONS` | additive paper endpoint | `paperScope` must be one encoded path segment, for example `9709%3Apaper%3Ap1`. `GET` returns the paper workspace envelope. `POST` requires `action: "ensure"` and first-opens an additive paper workspace row. |
| `/api/learning/workspaces/papers/:paperScope?topic_id=...` | `GET` | paper topic-section subview | Returns one topic-section projection inside the paper workspace without creating a topic workspace. `topic_path` can be used as an alternate focus locator. |
| `/api/learning/review-tasks` | `GET`, `OPTIONS` | global review queue read | Returns `scope: "global_queue_projection"` filtered by optional `topic_id`, `question_type_id`, `status`, and `due_before`. |
| `/api/learning/review-tasks/:id` | `PATCH`, `OPTIONS` | explicit lifecycle write | Rejects generic status writes. Accepts explicit lifecycle intents and, on #360, requires mode-specific behavior evidence for completed outcomes. |

Route registry ordering keeps `learning-workspace-paper` before `learning-workspace-topic`, so encoded paper routes do not get swallowed by the legacy dynamic topic route.

## Response Shapes

### Paper Workspace

`GET /api/learning/workspaces/papers/:paperScope` returns:

```json
{
  "paper_scope": "9709:paper:p1",
  "workspace_id": "paper-workspace-id",
  "topic_sections": [],
  "stable_slots": {},
  "paper_workspace": {
    "paper_workspace_id": "paper-workspace-id",
    "user_id": "user-id",
    "subject_code": "9709",
    "paper_scope": "9709:paper:p1",
    "workspace_kind": "paper_main",
    "visible_organization_summary": {},
    "linked_topic_summary": {},
    "stable_slots": {},
    "pinned_artifacts": [],
    "linked_references": []
  },
  "review_queue": {
    "scope": "paper_workspace_review_projection",
    "paper_scope": "9709:paper:p1",
    "items": [],
    "summary": {},
    "topic_sections": []
  },
  "compatibility": {
    "surface": "paper_workspace",
    "paper_workspace_route": "/api/learning/workspaces/papers/:paperScope",
    "legacy_topic_fallback": {
      "route": "/api/learning/workspaces/:topicId",
      "status": "preserved"
    }
  }
}
```

### Topic Section Subview

`GET /api/learning/workspaces/papers/:paperScope?topic_id=<topicId>` returns:

```json
{
  "paper_scope": "9709:paper:p1",
  "workspace_id": "topic-workspace-id",
  "paper_workspace": {},
  "topic_section": {
    "paper_workspace_topic_section_id": "section-id",
    "topic_id": "topic-id",
    "topic_workspace_id": "topic-workspace-id",
    "topic_path": "9709.topic.path",
    "canonical_ownership": {
      "owner_kind": "topic"
    }
  },
  "workspace": {
    "workspace_id": "topic-workspace-id",
    "topic_id": "topic-id",
    "slots": {}
  },
  "stable_slots": {},
  "review_queue": {
    "scope": "paper_topic_section_review_projection",
    "topic_id": "topic-id",
    "items": []
  },
  "compatibility": {
    "surface": "paper_topic_section_workspace",
    "topic_sections_are_projections": true
  }
}
```

### Legacy Topic Workspace

`GET /api/learning/workspaces/:topicId` continues returning:

```json
{
  "workspace": {
    "workspace_id": "topic-workspace-id",
    "topic_id": "topic-id",
    "topic_path": "9709.topic.path",
    "slots": {}
  },
  "runtime_posture": {},
  "review_queue": {
    "scope": "global_queue_projection",
    "topic_id": "topic-id",
    "items": []
  },
  "revisit": {},
  "compatibility": {
    "surface": "legacy_topic_workspace",
    "paper_workspace_route": "/api/learning/workspaces/papers/:paperScope",
    "legacy_topic_fallback": true
  }
}
```

## DB And Read-Model Contract Summary

| Surface | Current backend contract | Compatibility posture |
|---|---|---|
| `learning_paper_workspaces` | Additive visible workspace keyed by `UNIQUE (user_id, paper_scope)` with canonical paper scope format and subject-code match checks. | Does not rewrite topic workspaces. |
| `learning_paper_workspace_topic_sections` | Bridges a paper workspace to topic sections with optional `topic_workspace_id`. Trigger guards require linked topic workspace user/topic consistency. | Topic section rows are projections and do not duplicate artifacts, ReviewTasks, queues, or mastery state. |
| `learning_paper_workspace_projection` | Paper read model includes topic sections, stable slot grouping, pinned artifact summaries, linked references, and paper review projection shape. | Composes from existing topic workspace projection, topic-owned artifacts, and global review queue projection. |
| `learning_topic_workspace_compatibility_projection` | Alias over `learning_workspace_projection`. | Preserves the existing topic workspace read contract while paper adoption is additive. |
| `learning_review_queue_projection` | Global review queue read model from `learning_review_tasks`. Includes status, mode, due dates, target topic/type, lineage refs, scheduler state, and completion evidence. | Paper/topic views filter and fold this projection. They do not create separate queue identities. |
| `learning_review_tasks.completion_evidence` | Stored immutable evidence field for lifecycle outcomes. On #360, completed outcomes require mode-specific behavioral proof. | Existing incomplete outcomes can retain summary/note compatibility. Completed bare checkbox writes are invalid. |

## Review Projection Summary

The scheduler remains global. `listReviewTasks` loads `learning_review_queue_projection`, derives scheduler policy, filters by query parameters, folds duplicate canonical identities, and returns `scope: "global_queue_projection"`.

Paper views call the global queue once, then filter by the paper workspace topic-section IDs. The paper response returns:

- `scope: "paper_workspace_review_projection"`;
- `paper_scope`;
- the topic IDs participating in the paper workspace;
- policy state inherited from the global projection;
- deduped review items;
- per-topic-section review summaries.

Topic-section views narrow the paper view to one topic section and return `scope: "paper_topic_section_review_projection"`.

The `review_queue` stable slot stores active `ReviewTask` typed references, not cloned tasks. When a queue payload is filtered by status/due date, the topic workspace still keeps active review-task refs in the slot so the visible workspace does not lose unresolved work.

## Compatibility Matrix

| Compatibility point | Contract | Status at this gate | Remaining handoff |
|---|---|---|---|
| Old topic workspace endpoint | `/api/learning/workspaces/:topicId` remains registered for `GET`, `POST`, and `OPTIONS`. | Preserved and tested. | Frontend can keep using it until the adapter migrates to paper routes. |
| New paper workspace endpoint | `/api/learning/workspaces/papers/:paperScope` is additive and validates encoded canonical paper scope. | Present and tested for `GET`, `POST action=ensure`, invalid scope, auth, and unsupported methods. | Frontend must encode paper scope with `encodeURIComponent`. |
| Paper topic-section subview | Paper route accepts `topic_id` or `topic_path` focus query. | Present and tested. | Frontend should use it for topic focus inside a paper workspace instead of treating topic as visible workspace root. |
| Entry resolver | `resolvePaperWorkspaceEntry` handles paper, topic, concept, question, ReviewTask, artifact, and workspace-slot anchors. | Present and tested for direct, derived, degraded, and ambiguous paper-scope cases. | Session/frontend handoff should pass typed anchors and handle fail-closed ambiguity. |
| Paper persistence | `learning_paper_workspaces` and topic sections are additive. | Present in migration and repository tests. | No destructive migration or endpoint retirement yet. |
| Stable slots | Existing six stable slot keys remain: `overview_map`, `core_method_derivation`, `canonical_worked_example`, `common_traps`, `my_notes`, `review_queue`. | Preserved. Paper view groups these keys across topic sections. | Frontend can alias/narrate slots, but backend wire keys stay stable during migration. |
| Review projection | Global queue plus paper/topic filtered views. | Present and tested, including dedupe and scheduler policy carry-through. | Frontend should not invent paper-local queues. |
| #360 completion evidence | Completed ReviewTasks require mode-specific evidence. | Present on stacked dependency branch #381. | Frontend action controls must send behavior evidence by mode before using completed outcome. |

## Remaining Frontend Adapter Handoff

Frontend work should consume the backend contracts above without changing backend semantics:

1. Add a Paper Workspace route/shell that calls `/api/learning/workspaces/papers/${encodeURIComponent(paper_scope)}`.
2. Treat `topic_sections` as sections inside the paper workspace, not independent visible workspaces.
3. For focused topic views, call the paper route with `topic_id` or `topic_path` rather than constructing a new topic workspace model.
4. Keep legacy `/api/learning/workspaces/:topicId` reads as a fallback during migration.
5. Use `review_queue.scope` to distinguish global, paper, and topic-section projections.
6. For ReviewTask completion, send explicit lifecycle intents and mode-specific `completion_evidence`; do not send bare `{ status: "completed" }`.

Frontend non-goals for this gate:

- no frontend route/page/component migration;
- no deletion of legacy Study Hub or old Learning Path surfaces;
- no endpoint retirement;
- no new 9231 build/content;
- no new 9709 content production.

## AO Child-Issue Closeout Instructions

| Issue | GitHub state checked during #363 | Closeout instruction |
|---|---|---|
| #356 | closed, PR #366 merged | Already retired. No action in this PR. |
| #361 | closed, PR #368 merged | Already retired. No action in this PR. |
| #362 | closed, PR #369 merged | Already retired. No action in this PR. |
| #357 | closed, PR #371 merged | Already retired. No action in this PR. |
| #364 | closed, PR #373 merged | Already retired. No action in this PR. |
| #359 | closed, PR #376 merged | Already retired. No action in this PR. |
| #358 | closed, PR #379 merged | Already retired. No action in this PR. |
| #360 | open, PR #381 open against `main` | Human should merge #381 first. Then run normal AO closeout for `task/360-review-completion-evidence` if the local branch still exists. |
| #363 | open, this stacked PR pending | Merge only after #381 lands or after this PR is retargeted to updated `main`. Then run normal AO closeout for `task/363-backend-only-rollout-gate` if the local branch still exists. |
| #355 | open parent epic | Keep open until #360 and #363 have both merged and the human accepts this backend-only rollout evidence. |

This PR must not merge #381, #363, or the parent epic. It only supplies the backend-only rollout gate evidence and normal review-ready branch state.

## Verification

Commands were run from `/home/samsen/code/ciecopilot-home/.worktrees/task-363--backend-only-rollout-gate` unless noted.

```text
npm run workflow:codex-preflight -- --json
exit 0
top_status: warning
branch: task/363-backend-only-rollout-gate
head: 6ca5345c
branch_safety: healthy
upstream_sync: healthy, ahead 0, behind 0
worktree_cleanliness: warning because this report and docs/reports/INDEX.md were intentionally dirty before commit
dirty files:
  unstaged: docs/reports/INDEX.md
  untracked: docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md

npm test -- --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/__tests__/api-route-integration.test.js api/learning/__tests__/workspace-repository.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/review-scheduler-policy.test.js
initial run: exit 1 before Jest executed because this fresh stacked worktree had no node_modules/jest/bin/jest.js
environment remediation: npm ci
npm ci: exit 0, added 791 packages, 22 npm audit findings reported by npm
rerun: exit 0
PASS api/learning/__tests__/workspace-read-service.test.js
PASS api/learning/__tests__/review-task-service.test.js
PASS api/learning/__tests__/workspace-repository.test.js
PASS api/learning/__tests__/review-scheduler-policy.test.js
PASS api/_runtime/__tests__/route-registry-learning.test.js
PASS api/__tests__/api-route-integration.test.js
Test Suites: 6 passed, 6 total
Tests: 79 passed, 79 total

git diff --check
exit 0

git status --short --branch
exit 0
## task/363-backend-only-rollout-gate...origin/task/360-review-completion-evidence
 M docs/reports/INDEX.md
?? docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md
```
