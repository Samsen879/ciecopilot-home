# Paper Workspace Frontend Contract Pack

Date: 2026-06-11

Issue: #427

Parent: #422

## Scope

This pack is frontend-contract-only. It adds representative JSON fixtures and focused fixture-shape validation for future Paper Workspace adapter work.

It does not migrate final UI routes, rebuild pages, change layout composition, retire legacy topic workspace reads, or change backend route semantics.

## Source Checks

- Started from live `origin/main` at `6892f6f2884ad7552a5dfbd9def5a48d29aad51f`.
- Re-read `docs/reports/2026-06-05-paper-workspace-backend-rollout-gate.md`.
- Verified these referenced files exist on the working baseline:
  - `api/learning/workspaces/papers/[paperScope].js`
  - `api/learning/workspaces/[topicId].js`
  - `api/learning/review-tasks/[id].js`
  - `src/components/learning-runtime/view-models/workspace-view-model.js`
- Re-checked `api/learning/lib/workspaces/paper-workspace-contract.js` and `api/learning/lib/workspaces/workspace-read-service.js` while shaping fixtures.
- Legacy topic fallback keeps `review_queue.scope: "global_queue_projection"`. That matches the rollout-gate report and the current `listReviewTasks` implementation.

## Fixture Files

The checked-in frontend fixtures live in `src/components/learning-runtime/__fixtures__/paper-workspace-contract/`.

| Fixture | Surface | Intent |
| --- | --- | --- |
| `paper-workspace-envelope.json` | `GET /api/learning/workspaces/papers/:paperScope` | Paper workspace envelope with `paper_scope`, `topic_sections`, `stable_slots`, `paper_workspace`, `review_queue`, and `compatibility`. |
| `paper-topic-section-subview.json` | `GET /api/learning/workspaces/papers/:paperScope?topic_id=...` | Topic-focused projection inside a paper workspace. It is not a new visible workspace root. |
| `legacy-topic-workspace-fallback.json` | `GET /api/learning/workspaces/:topicId` | Preserved legacy topic workspace fallback during migration. |
| `review-task-completion-evidence.json` | `PATCH /api/learning/review-tasks/:id` | Explicit `intent: "complete"` payloads for completed outcomes across ReviewTask modes, with mode-specific `completion_evidence`. |

## Contract Notes

- `paper_scope` is a backend wire key. Frontend callers must encode it as one URL segment with `encodeURIComponent(paper_scope)`.
- `topic_sections` are projections inside a paper workspace. They must not be treated as new visible workspace roots during later UI work.
- `stable_slots` keeps the backend slot keys: `overview_map`, `core_method_derivation`, `canonical_worked_example`, `common_traps`, `my_notes`, and `review_queue`.
- `review_queue.scope` distinguishes projection surfaces:
  - paper workspace fixture: `paper_workspace_review_projection`
  - paper topic-section fixture: `paper_topic_section_review_projection`
  - legacy topic fallback fixture: `global_queue_projection`
- The legacy `/api/learning/workspaces/:topicId` fallback remains preserved until a later approved migration explicitly changes it.
- ReviewTask lifecycle writes use explicit intents. Completed outcomes require mode-specific `completion_evidence`; bare `{ "status": "completed" }` or `{ "state": "completed" }` is not a valid frontend write shape.

## Allowed Drift

Allowed drift for later phases:

- representative IDs, timestamps, display labels, counts, and item ordering may change when backend fixtures are refreshed;
- additive backend fields may be accepted if the adapter keeps the existing wire keys stable;
- nested review queue item examples may be replaced with fresher examples from backend tests.

Not allowed without a contract issue:

- renaming `paper_scope`, `topic_sections`, `stable_slots`, `review_queue.scope`, or `compatibility`;
- treating topic sections as visible workspace roots;
- dropping legacy topic fallback reads during migration;
- changing legacy fallback `review_queue.scope` away from `global_queue_projection` without a backend/report update;
- sending ReviewTask completed outcomes without mode-specific evidence.

## Consumption Guidance

Phase #428 API client and view-model adapter work should import or parse these fixtures directly in tests. Use them as contract fixtures, not UI mocks.

Later phases should:

- call `/api/learning/workspaces/papers/${encodeURIComponent(paper_scope)}` for paper envelopes;
- call the same paper route with `topic_id` or `topic_path` for focused subviews;
- keep `/api/learning/workspaces/:topicId` as a compatibility fallback while migration is incomplete;
- branch on `review_queue.scope` instead of assuming every queue projection has the same surface;
- send ReviewTask completion writes with `intent`, `completion_outcome`, and `completion_evidence`.

## Validation

- Red test observed before fixtures existed:
  - `npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js --verbose`
  - failed on missing `src/components/learning-runtime/__fixtures__/paper-workspace-contract/*.json` fixtures.
- Green test after fixtures:
  - `npm test -- --runInBand src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js --verbose`
  - 5 tests passed.

## Boundaries

No route, page, layout, backend semantic, endpoint-retirement, or 9702/9709/9231 question-production workflow changes are part of this contract pack.
