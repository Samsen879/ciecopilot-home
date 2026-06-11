# Paper Workspace Frontend Pre-Adapter Readiness

Date: 2026-06-11

Issue: #430

Parent: #422

Depends on: #429

## Verdict

The Paper Workspace frontend pre-adapter chain is ready-held for a later, human-approved UI integration issue after #430 merges.

This gate closes only the contract/adapter/smoke handoff. It does not authorize or implement final visible Paper Workspace route, page, layout, navigation, or shell migration.

## Baseline

- Started from live `origin/main` at `014002f81c350ba186a9574724c7161468521fca`, after #429 merged via PR #433.
- Working branch: `task/430-paper-workspace-fe-readiness-handoff`.
- Re-read GitHub issues #427, #428, #429, and #430.
- Re-read `docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md`.
- Verified the #430 runtime references exist on this branch:
  - `docs/reports/2026-06-11-paper-workspace-frontend-contract-pack.md`
  - `docs/reports/2026-06-11-paper-workspace-frontend-smoke-harness.md`
  - `src/api/learningRuntimeApi.js`
  - `src/components/learning-runtime/view-models/workspace-view-model.js`
  - `src/pages/learning-runtime/TopicWorkspacePage.jsx`
  - `src/components/learning-runtime/WorkspaceShell.js`

## Ready For UI Integration

The later UI integration issue can consume these pre-adapter surfaces directly:

| Area | Ready artifact | Use in later UI work |
| --- | --- | --- |
| Backend contract summary | `docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md` | Treat paper routes as additive, topic sections as projections, and the global review queue as the source of paper/topic review projections. |
| Frontend contract pack | `docs/reports/2026-06-11-paper-workspace-frontend-contract-pack.md` | Use the fixture pack as canonical pre-adapter payload evidence. |
| Smoke handoff | `docs/reports/2026-06-11-paper-workspace-frontend-smoke-harness.md` | Use the focused smoke command as the local contract/readiness gate before visible UI work. |
| Fixtures | `src/components/learning-runtime/__fixtures__/paper-workspace-contract/*.json` | Validate UI-facing parsing without depending on a final route or browser layout. |
| API helpers | `src/api/learningRuntimeApi.js` | Fetch Paper Workspace envelopes and preserved legacy fallback through shared helpers. |
| Pure view model | `src/components/learning-runtime/view-models/workspace-view-model.js` | Convert payloads into surface-aware workspace state before wiring visible components. |

## Canonical Fixtures

The canonical pre-adapter fixture directory is `src/components/learning-runtime/__fixtures__/paper-workspace-contract/`.

| Fixture | Contract surface |
| --- | --- |
| `paper-workspace-envelope.json` | `GET /api/learning/workspaces/papers/:paperScope`; includes `paper_scope`, `topic_sections`, `stable_slots`, `paper_workspace`, `review_queue.scope: "paper_workspace_review_projection"`, and `compatibility`. |
| `paper-topic-section-subview.json` | `GET /api/learning/workspaces/papers/:paperScope?topic_id=...`; represents a focused topic-section projection inside a paper workspace, not a visible topic workspace root. |
| `legacy-topic-workspace-fallback.json` | `GET /api/learning/workspaces/:topicId`; preserves legacy topic workspace fallback with `review_queue.scope: "global_queue_projection"`. |
| `review-task-completion-evidence.json` | `PATCH /api/learning/review-tasks/:id`; records completed-outcome requests with explicit lifecycle intent and mode-specific `completion_evidence`. |

Allowed fixture drift is limited to representative IDs, timestamps, labels, counts, item ordering, and additive backend fields. Renaming `paper_scope`, `topic_sections`, `stable_slots`, `review_queue.scope`, or `compatibility` requires a contract issue.

## Routes And Helpers

Future UI integration should use these route/helper pairs:

| Need | Backend route | Frontend helper |
| --- | --- | --- |
| Paper workspace envelope | `/api/learning/workspaces/papers/:paperScope` | `getPaperWorkspace(paperScope)` |
| Focused paper topic-section subview | `/api/learning/workspaces/papers/:paperScope?topic_id=...` or `?topic_path=...` | `getPaperTopicSectionWorkspace(paperScope, { topicId })` or `getPaperTopicSectionWorkspace(paperScope, { topicPath })` |
| Legacy topic fallback | `/api/learning/workspaces/:topicId` | `getWorkspace(topicId)` |
| ReviewTask lifecycle write | `/api/learning/review-tasks/:id` | `updateReviewTask(reviewTaskId, payload)` |

`getPaperWorkspace` and `getPaperTopicSectionWorkspace` encode `paperScope` with `encodeURIComponent` as one route segment. `getWorkspace(topicId)` remains the preserved compatibility helper and must not be removed during the later UI migration.

`buildWorkspaceViewModel(payload, options)` is the public pure view-model entry point for Paper Workspace payloads. It normalizes paper workspace, paper topic-section, and legacy topic fallback surfaces, and it parses `review_queue.scope` through the review queue view-model path so later UI code can distinguish:

- `paper_workspace_review_projection`;
- `paper_topic_section_review_projection`;
- `global_queue_projection`.

## Legacy Fallback Rule

The later UI integration must preserve `/api/learning/workspaces/:topicId` and `getWorkspace(topicId)` as a compatibility fallback until a separate, approved migration issue retires them.

Legacy fallback behavior must remain distinguishable in the view model:

- `surface.kind: "legacy_topic_workspace"`;
- `surface.isLegacyTopicWorkspace: true`;
- `reviewQueue.scope: "global_queue_projection"`;
- `compatibility.legacy_topic_fallback` remains present in the backend payload.

Do not route Paper Workspace topic-section focus by constructing new visible topic workspace roots. Topic sections remain projections inside the paper workspace.

## ReviewTask Completion Evidence

Future UI controls that complete ReviewTasks must submit explicit lifecycle writes through `updateReviewTask`.

Completed outcomes must use this shape:

```js
await updateReviewTask(reviewTaskId, {
  intent: 'complete',
  completionOutcome: 'completed',
  completionEvidence: {
    // mode-specific behavioral proof
  },
});
```

The frontend must not send bare `{ status: "completed" }`, `{ state: "completed" }`, or any generic state write for completed outcomes.

The fixture `review-task-completion-evidence.json` covers these completed modes:

- `quick_recall`;
- `reconstruct_derivation`;
- `redo_variant`;
- `timed_check`;
- `trap_fix`.

## Readiness Gate

No new script is added for #430. The existing workflow preflight plus the focused #427-#429 Jest suite already form a lightweight readiness gate, and wrapping them in another script would not add coverage.

Run this command bundle from the issue branch before any later UI integration starts:

```bash
git status --short --branch
npm run workflow:codex-preflight -- --json
npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js --verbose
git diff --check
```

Pass criteria:

- branch is an owned task branch and not `main`, `master`, or `baseline/*`;
- worktree is clean, or dirty only with the intentional handoff artifact before commit;
- preflight reports `top_status: "healthy"` and `upstream_sync` healthy;
- the focused Jest command reports 4 passing suites and 32 passing tests;
- `git diff --check` exits 0;
- no command requires final visible Paper Workspace UI routes/pages/layouts.

Fail or stop criteria:

- any fixture/report/source file named above is missing;
- any focused fixture/API/view-model/smoke test fails;
- route semantics differ from the backend rollout-gate report;
- preserving the legacy topic fallback requires a backend semantic change;
- UI integration depends on unresolved product/layout decisions from the active frontend reconstruction.

## Verification

Commands run from `/home/samsen/.worktrees/ciecopilot-home/cie-291`.

```text
git status --short --branch
## task/430-paper-workspace-fe-readiness-handoff...origin/main

npm run workflow:codex-preflight -- --json
exit 0
top_status: healthy
branch: task/430-paper-workspace-fe-readiness-handoff
head: 014002f8
branch_safety: healthy
upstream_sync: healthy, ahead 0, behind 0
worktree_cleanliness: healthy
guidance.decision: safe_to_edit

npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js --verbose
exit 0
Test Suites: 4 passed, 4 total
Tests: 32 passed, 32 total

git diff --check
exit 0
```

Environment note: this isolated worktree initially had no local `node_modules`, so the first Jest attempt stopped before test execution with `Cannot find module ... node_modules/jest/bin/jest.js`. After `npm ci`, the exact required `npm test` command above passed.

## Stop Rules For Follow-On UI Integration

- No final visible Paper Workspace route, page, layout, shell, or navigation migration may start from this issue.
- No endpoint retirement.
- Preserve `/api/learning/workspaces/:topicId` and `getWorkspace(topicId)` until a separate approved migration removes them.
- No backend semantic changes without a backend issue.
- No paper-local or topic-local ReviewTask queue identity; paper and topic-section views project the global review queue.
- No bare completed ReviewTask status writes; completed outcomes require explicit intent and mode-specific `completion_evidence`.
- No 9702, 9709, or 9231 question-production workflow changes.
- No parent #422 ready-held/closeout update until #430 merges and final evidence is posted to the parent.

## Remaining Blocked Work

These items remain blocked until a human-approved follow-on UI integration chain exists and the active frontend reconstruction stabilizes:

- visible Paper Workspace route selection and URL shape;
- page/shell ownership between `TopicWorkspacePage.jsx`, `WorkspaceShell.js`, and any future Paper Workspace route component;
- navigation and entry-point migration from legacy topic workspace surfaces;
- browser-level route/layout automation for the final UI;
- endpoint retirement or compatibility fallback removal;
- parent #422 ready-held or closeout update with final merged evidence.

No visible UI route/page/layout migration was performed for #430.
