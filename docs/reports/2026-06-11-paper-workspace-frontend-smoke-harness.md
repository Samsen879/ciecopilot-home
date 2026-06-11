# Paper Workspace Frontend Smoke Harness

Date: 2026-06-11

Issue: #429

Parent: #422

Depends on: #428

## Scope

This smoke harness validates the frontend integration seam between the Paper Workspace API helpers, the checked-in #427 contract fixtures, and the #428 pure workspace view-model adapters.

It does not add final Paper Workspace routes, pages, layouts, browser automation, backend semantic changes, or endpoint retirement. The preserved legacy topic workspace fallback remains part of the smoke coverage.

## Source Checks

- Started from live `origin/main` at `d0b70f9dd901209a161cc04c29d2029ec7fabc20`, where #428 is merged as PR #432.
- Re-read GitHub issues #427, #428, and #429.
- Re-read `docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md`.
- Verified the #429 runtime reference files exist:
  - `src/api/learningRuntimeApi.js`
  - `src/components/learning-runtime/view-models/workspace-view-model.js`
- Re-read the #427 fixture/report artifacts:
  - `src/components/learning-runtime/__fixtures__/paper-workspace-contract/*.json`
  - `docs/reports/2026-06-11-paper-workspace-frontend-contract-pack.md`
- Re-read the #428 adapter tests:
  - `src/api/__tests__/learningRuntimeApi.test.js`
  - `src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js`

## Harness

The focused smoke test is:

```bash
npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js --verbose
```

The test uses a deterministic local `fetch` stub, not real external services. Each stubbed route validates the raw fixture shape before returning JSON to the frontend API helper. The normalized helper response is then passed into `buildWorkspaceViewModel`.

## Coverage

| Surface | Request covered | Fixture | Expected view-model surface |
| --- | --- | --- | --- |
| Paper workspace | `/api/learning/workspaces/papers/9709%3Apaper%3Ap1` | `paper-workspace-envelope.json` | `surface.kind: "paper_workspace"` and `reviewQueueScope: "paper_workspace_review_projection"` |
| Paper topic-section subview | `/api/learning/workspaces/papers/9709%3Apaper%3Ap1?topic_id=topic-1` | `paper-topic-section-subview.json` | `surface.kind: "paper_topic_section_workspace"` and `reviewQueueScope: "paper_topic_section_review_projection"` |
| Legacy topic fallback | `/api/learning/workspaces/topic-1` | `legacy-topic-workspace-fallback.json` | `surface.kind: "legacy_topic_workspace"` and `reviewQueueScope: "global_queue_projection"` |
| Invalid paper scope | `/api/learning/workspaces/papers/9709%3Ainvalid%20paper` | local structured error payload | `LearningRuntimeApiError` with `code: "invalid_paper_scope"` |

## Failure Boundaries

The local smoke stub intentionally fails before view-model parsing for these malformed Paper Workspace payloads:

- missing `compatibility`;
- missing `review_queue.scope`;
- non-array `topic_sections`.

This keeps ambiguous or drifted backend contract payloads visible even though `normalizeWorkspaceResponse` may otherwise degrade some fields into `null` or empty collections for UI safety.

## Pass Criteria

The command passes only when:

- all three workspace surfaces are requested through the public frontend API helpers;
- `paperScope` is encoded as one URL segment;
- normalized payloads can be converted by `buildWorkspaceViewModel`;
- paper workspace, topic-section, and legacy fallback surfaces remain distinguishable;
- invalid paper scope responses degrade through the structured API error path;
- malformed contract fixtures are rejected by the smoke stub.

## Verification

Commands run from `/home/samsen/.worktrees/ciecopilot-home/cie-290`.

```text
git status --short --branch
## task/429-paper-workspace-fe-smoke-harness...origin/main
 M docs/reports/INDEX.md
?? docs/reports/2026-06-11-paper-workspace-frontend-smoke-harness.md
?? src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js

npm run workflow:codex-preflight -- --json
exit 0
top_status: warning
branch: task/429-paper-workspace-fe-smoke-harness
head: d0b70f9d
branch_safety: healthy
upstream_sync: healthy, ahead 0, behind 0
worktree_cleanliness: warning because this report, docs/reports/INDEX.md, and the new smoke test were intentionally dirty before commit

npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js --verbose
exit 0
Test Suites: 1 passed, 1 total
Tests: 5 passed, 5 total

npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js src/api/__tests__/learningRuntimeApi.test.js --verbose
exit 0
Test Suites: 3 passed, 3 total
Tests: 27 passed, 27 total

git diff --check
exit 0
```

## Boundaries

No final UI route/page/layout migration was performed. No backend route semantics were changed. No 9702/9709/9231 question-production workflows were touched.
