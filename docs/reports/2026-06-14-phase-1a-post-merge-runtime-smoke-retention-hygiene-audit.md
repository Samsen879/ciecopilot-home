# Phase 1A Post-Merge Runtime Smoke, Retention, And Hygiene Audit

Issue: #458
Parent: #435
Children audited: #436-#446
Merged PRs audited: #447-#457
Date: 2026-06-14
Baseline inspected: `origin/main @ 706e3adb78da67b48164346828be2945a3e6244d`
Branch: `feat/issue-458`
Scope: audit/report-only. No schema, API, frontend route/page, scoring, content-pipeline, worktree cleanup, or runtime behavior changes.

## Verdict

The Phase 1A Learning Runtime Foundation chain is closed and merged on live `origin/main @ 706e3adb78da67b48164346828be2945a3e6244d`. Focused runtime, API, frontend contract, marking, artifact, visual-reasoning, and release-scope verification passed from the current worktree using the shared root dependency install because this AO worktree has no local `node_modules`.

No hard runtime blocker was found in this audit. Retention posture is acceptable for the merged Phase 1A foundation: historical attempts, mark runs, mark decisions, learning events, question snapshots, and artifact content versions are append-only or lineage-preserving; derived rows update in place by design. Follow-up hardening is recommended for explicit transition audit trails and no-delete regression coverage, but it is not a release blocker for this report.

A true browser smoke was not run because local Supabase, backend, and frontend servers were not started in this AO session. The nearest service/component smoke path was run as a targeted Jest smoke across imported-question fallback, guided-solve launch payload, session fallback UI, ReviewTask candidate generation, workspace projection, and pinned artifact projection.

## Final-Main Live Truth

Commands run before report edits:

```text
git fetch origin --prune
git rev-parse origin/main
git rev-parse HEAD
git status --short --branch
npm run workflow:codex-preflight -- --json
ao status -p ciecopilot-home --json
gh issue view 435..446,458 --json number,title,state,closedAt,url
gh pr view 447..457 --json number,title,state,mergedAt,headRefName,headRefOid,baseRefName,mergeCommit,mergeStateStatus
```

Observed git truth:

- `origin/main`: `706e3adb78da67b48164346828be2945a3e6244d`
- `HEAD`: `706e3adb78da67b48164346828be2945a3e6244d`
- Status before edits: `## feat/issue-458...origin/main`
- Preflight before edits: exit 0, `top_status: "warning"` only because `feat/issue-458` is not `task/` or `codex/` scoped; worktree cleanliness and upstream sync were healthy; `worktree_count: 3`.

Issue truth:

| Issue | State | Closed at | Title |
| --- | --- | --- | --- |
| #435 | CLOSED | 2026-06-13T22:41:41Z | Phase 1A Learning Runtime Foundation control chain |
| #436 | CLOSED | 2026-06-13T18:04:04Z | Phase 1A Child 1: Live source-of-truth contract/readback gate |
| #437 | CLOSED | 2026-06-13T18:27:32Z | Phase 1A Child 2: Session Runtime and active_scope_bundle contract |
| #438 | CLOSED | 2026-06-13T19:07:33Z | Phase 1A Child 3: Context health, topic drift, and handoff |
| #439 | CLOSED | 2026-06-13T19:29:13Z | Phase 1A Child 4: Minimal released_scope_check contract |
| #440 | CLOSED | 2026-06-13T19:52:55Z | Phase 1A Child 5: Imported/Pasted Question durable object chain |
| #441 | CLOSED | 2026-06-13T20:36:26Z | Phase 1A Child 6: Mastery MVP guardrails |
| #442 | CLOSED | 2026-06-13T20:59:50Z | Phase 1A Child 7: Learn Concept and Guided Solve vertical slice |
| #443 | CLOSED | 2026-06-13T21:28:54Z | Phase 1A Child 8: Artifact Inbox/Pinned trust and lifecycle convergence |
| #444 | CLOSED | 2026-06-13T21:53:32Z | Phase 1A Child 9: Error Book and ReviewTask trigger MVP |
| #445 | CLOSED | 2026-06-13T22:20:07Z | Phase 1A Child 10: Visual Reasoning MVP schemas |
| #446 | CLOSED | 2026-06-13T22:39:01Z | Phase 1A Child 11: Smart Mark Phase 1B readiness gate |
| #458 | OPEN | n/a | Post-merge Phase 1A runtime smoke + retention/hygiene audit |

PR truth:

| PR | State | Merged at | Merge commit | Head |
| --- | --- | --- | --- | --- |
| #447 | MERGED | 2026-06-13T18:04:04Z | `0622b09cc651f284ab75128dd1cee9cbe4514cf5` | `feat/issue-436 @ 64b84d86eeae060faab7708ecc4a7ddfba8dde11` |
| #448 | MERGED | 2026-06-13T18:27:31Z | `6b2294f090b256a2bdbbde727ddfc0be1ca9e3d6` | `feat/issue-437 @ 03d6a3971e4275a6335e598917786270a236c66b` |
| #449 | MERGED | 2026-06-13T19:07:32Z | `2a3d470e9d0da36edc3c0abd44681f66e3e1c090` | `feat/issue-438 @ 976ac0a798847652e486f91008876d2a48c36c1a` |
| #450 | MERGED | 2026-06-13T19:29:12Z | `f0ddd9ed7656da8340bd81e48d9ee3c205ba1084` | `feat/issue-439 @ a7aad30cdbef1adc754d2598f73c4d0fcded26be` |
| #451 | MERGED | 2026-06-13T19:52:54Z | `8169517258562199a0c48ada7da616833ee34605` | `feat/issue-440 @ e732a85aa398da2f9da9777159792afb6744ab90` |
| #452 | MERGED | 2026-06-13T20:36:25Z | `2d7c4760f377221ad10f13d1ba98513ea09632f8` | `feat/issue-441 @ b37294b7870423a2560d3578b2b0375c4b84274e` |
| #453 | MERGED | 2026-06-13T20:59:49Z | `904de40bd286befdf76f43557a7bb91127e5037a` | `feat/issue-442 @ 22962a3c9e93abcdb4427d00228b92c0298e6a60` |
| #454 | MERGED | 2026-06-13T21:28:53Z | `ed7743ef6a7d54e9d3b26570dfb501ac7d04fbeb` | `feat/issue-443 @ ad7040dd137984d93fca97ebb34c1f0ddb347401` |
| #455 | MERGED | 2026-06-13T21:53:31Z | `b52f21f1f73315d8fcf0a5b224991a8c8c1e4d39` | `feat/issue-444 @ 266090afa627ff688a4425f0b023292ee1d04311` |
| #456 | MERGED | 2026-06-13T22:20:06Z | `461904607077ff83a0e4bce5cc0fcb40929a6792` | `feat/issue-445 @ bce1bf5d566e9ba0063762d786b817f35ee4c9e4` |
| #457 | MERGED | 2026-06-13T22:39:00Z | `706e3adb78da67b48164346828be2945a3e6244d` | `feat/issue-446 @ 1c98bcdec51768af9745a9fb3fea57743ac5be5a` |

AO/GitHub metadata drift:

- AO handoff file `cie-303-4de879a7.md` reported a stale/false-positive `agent-exited` lifecycle signal. Live `ao status -p ciecopilot-home --json` showed `cie-303` as `status: "working"`, `activity: "active"`, `issue: "458"`, `branch: "feat/issue-458"`, and no PR yet.
- `npm run workflow:codex-preflight -- --json` warned only that this AO-owned branch is not `task/` or `codex/` scoped. The AO handoff explicitly instructed continuing `feat/issue-458`, so this is recorded as workflow metadata drift, not a blocker.
- `gh pr view` reported `mergeStateStatus: "UNKNOWN"` for already-merged PRs #447-#457. The canonical live state is `state: "MERGED"` plus non-null `mergedAt` and merge commits.
- The top-precedence local PRD file named by project rules, `核心项目文档/PRD.md`, is absent from this worktree and ignored by `.gitignore`. This was already recorded in the #436 readback, so this audit used tracked runtime specs, plans, current code, and June readback reports.

## Aggregate Focused Verification

The isolated AO worktree has no local `node_modules`, so Jest and dependency-requiring scripts were run with the shared root install:

```text
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules
```

Focused command evidence:

| Command | Outcome |
| --- | --- |
| `npm run workflow:codex-preflight -- --json` | Exit 0; `top_status: "warning"` from branch namespace only; worktree clean and upstream synced before report edits. |
| `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js --verbose` | 15 suites passed; 180 tests passed. |
| `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/mastery-orchestrator.test.js api/marking/__tests__/decision-engine-v1.test.js api/marking/__tests__/decision-engine-v1-ft-cao.test.js api/marking/__tests__/marking-result-contract.test.js api/marking/__tests__/evaluate-v1.test.js --verbose` | 5 suites passed; 88 tests passed. |
| `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/SessionAskComposer.test.js src/components/learning-runtime/__tests__/ImportPostureBanner.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/components/learning-runtime/__tests__/WorkspaceArtifactCard.test.js src/components/learning-runtime/__tests__/paper-workspace-contract-fixtures.test.js src/components/learning-runtime/__tests__/paper-workspace-view-model-adapters.test.js src/components/learning-runtime/__tests__/paper-workspace-frontend-smoke.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose` | 11 suites passed; 77 tests passed. |
| `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node scripts/learning/run_released_family_gate.js` | Exit 0; emitted `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json` and `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`. The generated file changes were restored before this report edit to keep the PR report-only. |
| `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/artifact-content-repository.test.js --verbose` | 1 suite passed; 6 tests passed. |
| `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/question-import-validator.test.js api/learning/__tests__/question-envelope-contract.test.js api/learning/__tests__/artifact-repository.test.js api/learning/__tests__/review-task-api.test.js --verbose` | 5 suites passed; 30 tests passed. |

Initial command limitation:

- `npm run learning:release-gate` without `NODE_PATH` failed with `Error: Cannot find module 'ajv'` because this isolated worktree has no local dependency install. `/home/samsen/code/ciecopilot-home/node_modules/ajv` is present, and the same gate passed when run with the shared root dependency path.

Coverage map:

| Acceptance area | Verification evidence |
| --- | --- |
| Source-of-truth/workspace contract fixtures | `schema-contract.test.js`, `workspace-read-service.test.js`, `paper-workspace-contract-fixtures.test.js`, `paper-workspace-view-model-adapters.test.js`, `paper-workspace-frontend-smoke.test.js` |
| StudySession and `active_scope_bundle` | `runtime-contract.test.js`, `session-validator.test.js`, `session-api.test.js`, `session-ask.test.js`, `learningRuntimeApi.test.js`, `view-models.test.js` |
| Context health and topic drift fail-closed behavior | `api/evidence/__tests__/context.test.js`, `session-ask.test.js` topic-drift and incomplete-scope failure cases |
| `released_scope_check` | `released-scope.test.js`, `question-import-service.test.js`, `mastery-orchestrator.test.js`, `run_released_family_gate.js` |
| Imported/pasted durable policy | `question-import-service.test.js`, `question-import-validator.test.js`, `question-envelope-contract.test.js`, `ImportedQuestionIntake.test.js` |
| Mastery guardrails | `mastery-orchestrator.test.js`, `review-task-service.test.js`, `evaluate-v1.test.js` learning-effect cases |
| Learn Concept / Guided Solve slice | `ImportedQuestionIntake.test.js`, `LearningSessionShell.test.js`, `SessionAskComposer.test.js`, `session-api.test.js`, `session-ask.test.js` |
| Artifact trust/lifecycle projection | `artifact-service.test.js`, `artifact-api.test.js`, `artifact-repository.test.js`, `artifact-content-repository.test.js`, `WorkspaceArtifactCard.test.js`, `WorkspaceShell.test.js` |
| ReviewTask evidence triggers | `review-task-service.test.js`, `review-task-api.test.js`, `workspace-read-service.test.js`, `paper-workspace-contract-fixtures.test.js` |
| Visual reasoning bounded schema | `artifact-content-repository.test.js`, `workspace-read-service.test.js`, `view-models.test.js` |
| Smart Mark readiness / marking governance | `run_released_family_gate.js`, `decision-engine-v1.test.js`, `decision-engine-v1-ft-cao.test.js`, `marking-result-contract.test.js`, `evaluate-v1.test.js`, `2026-06-14-smart-mark-phase-1b-readiness-gate.md` readback |

## Smoke Path Evidence

True UI/browser smoke was not feasible in this session because the local Supabase database, backend server, and frontend server were not started. The checked-in local DB runbook requires Docker/Supabase reset plus `api:dev` and `dev` servers before a browser smoke can be valid.

Nearest service/component smoke command:

```text
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/question-import-service.test.js src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/workspace-read-service.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js --testNamePattern='imported questions expose fallback released_scope_check|builds guided-solve session payloads anchored to imported questions|renders ask composer, live turns, and fallback posture|fallback review tasks now route through immediate repair|review task candidates index error-book and misconception evidence for projections|marking effect -> review task -> workspace projection -> artifact patch keeps lifecycle and ownership consistent|applyArtifactLifecycleUpdate moves a pinned slot to the successor and removes the candidate from inbox' --verbose
```

Outcome:

- 6 suites passed.
- 7 targeted tests passed.
- 89 non-matching tests were skipped by `--testNamePattern`.

Path mapping:

| Requested smoke step | Targeted evidence |
| --- | --- |
| `imported question` | `question-import-service.test.js`: imported questions expose fallback `released_scope_check` when registry evidence is missing. |
| `guided solve` | `ImportedQuestionIntake.test.js`: builds guided-solve session payloads anchored to imported questions. |
| `non_released_fallback diagnostic` | `LearningSessionShell.test.js`: renders ask composer, live turns, and fallback posture for active sessions. |
| `ReviewTask candidate` | `review-task-service.test.js`: fallback review tasks route through immediate repair and candidates index error-book/misconception evidence. |
| `artifact inbox/pinned projection` | `workspace-read-service.test.js`: marking effect -> review task -> workspace projection -> artifact patch keeps lifecycle and ownership consistent; `WorkspaceShell.test.js`: pinned slot moves to successor and removes the candidate from inbox. |

Limitation: this is an API/service/component smoke, not a browser-backed test against a running local database. A later browser smoke should use `docs/setup/LOCAL_DB_VERIFY.md` and the canonical frontend URL `http://localhost:5173`.

## Retention Enforcement Audit

The audit checked migrations, repositories, and focused tests for silent delete/overwrite risk.

| Object family | Evidence | Retention assessment |
| --- | --- | --- |
| Attempts | `public.attempts` is primary-keyed and referenced by `mark_runs` with `ON DELETE RESTRICT`; `learning_events.aggregate_id` also references attempts with `ON DELETE RESTRICT`. | Historical attempts are protected once downstream mark runs/events exist. No Phase 1A runtime delete path was observed. |
| Mark runs / marking decisions / MarkingResult shape | `public.mark_runs` references attempts with `ON DELETE RESTRICT`; `public.mark_decisions` references mark runs with `ON DELETE RESTRICT`; decision inserts are unique per `(mark_run_id, rubric_id)`. `marking-result-contract.test.js` passed part/subpart mapping and conservative fallback cases. | Historical marking evidence is append-preserving at the ledger layer. The user-facing MarkingResult shape remains conservative when mappings are incomplete. |
| Imported question objects | `question_bank` was widened to durable `paper_question` and `imported_question` sources, with nullable storage key/q-number compatibility. `question-import-service.test.js` passed durable import, idempotency, raw-text retention policy, snapshot event linking, and fallback posture cases. | Imported/pasted questions are durable objects, not chat-only payloads. The active question row can update pointers such as `classification_snapshot_ref`, but classification snapshots and question events preserve lineage. |
| ReviewTask evidence | `learning_review_tasks` stores `completion_evidence`; `review-task-api.test.js` rejects generic status payloads; `review-task-service.test.js` requires mode-specific evidence for completed outcomes and preserves skipped/expired semantics. | ReviewTask rows update in place by explicit intent. No delete path was observed. Follow-up transition audit would strengthen evidence history, but current completion evidence is not silent. |
| Artifacts and content versions | `learning_artifacts` stores source attempt/mark-run refs, trust/placement/lifecycle fields, audit evidence refs, and lineage/supersession refs. `learning_artifact_content_versions` creates new versions and only flips `is_current`; prior versions remain linked through `lineage_parent_version_id`. Artifact API/service tests reject generic state payloads and illegal lifecycle transitions. | Artifact metadata is derived and can update by explicit lifecycle intent. Artifact content is versioned, and failed replacement does not clear prior current content. No artifact delete endpoint was found in the audited Phase 1A path. |
| Mastery and effect lineage | Family/type masteries are explicitly derived/reconcilable objects. `learning_events` is append-only by uniqueness/sequence constraints, and `learning_event_effects` records handler effects. `mastery-orchestrator.test.js` and `review-task-service.test.js` passed fail-closed guardrail cases. | Mastery rows update in place by design; learning events/effects provide lineage. Strong positive type-level updates remain gated by released scope and performance evidence. |
| Reconciliation | `reconciliation-service.test.js` passed the case that derived state can update while the historical attempt/mark-run input object remains unchanged; reconciliation run summaries count historical and derived objects. | Reconciliation follows the frozen contract: preserve historical snapshots and revise derived state. |

Follow-up retention hardening recommendation:

- Add explicit no-delete regression tests for `attempts`, `mark_runs`, `mark_decisions`, `question_bank` imported rows, `learning_review_tasks`, and `learning_artifacts` service surfaces.
- Add a ReviewTask transition/audit table or event emission for every explicit write intent if human review later needs a row-level status history beyond `completion_evidence`.
- Add an artifact lifecycle transition audit/event layer parallel to content versions if artifact metadata changes need immutable per-transition history.
- Keep mastery rows as derived state, but require every positive update to cite a learning event/effect ref in any future schema/API widening.

These are hardening items, not blockers discovered by this audit.

## AO Workspace Hygiene Audit

Commands:

```text
git worktree list --porcelain
git -C <worktree> status --short --branch
du -sh <worktree paths>
du -sh /home/samsen/.agent-orchestrator/369ab9408a58-ciecopilot-home
```

Observed worktrees:

| Path | Branch / head | Git status | Disk | Risk classification | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `/home/samsen/.worktrees/ciecopilot-home/cie-303` | `feat/issue-458 @ 706e3adb78da67b48164346828be2945a3e6244d` | Clean before this report/index edit; active AO issue #458 worktree. | 5.1G | Keep/active | Keep until this PR is merged or closed by AO. |
| `/home/samsen/code/ciecopilot-home` | `codex/chatgpt-image-cdp-runbook @ 28c75837ddfff738d333106183ddc702cbe2aab3` | Dirty: untracked `docs/reports/2026-06-07-gpt55-pro-extended-thinking-usage-strategy.md` and `docs/reports/gpt55-pro-web-runs/`. | 18G, including nested worktrees. | Do not delete; dirty root. | Human/operator should review or stash/commit untracked report artifacts before any cleanup. |
| `/home/samsen/code/ciecopilot-home/.worktrees/codex-paper-workspace-ui-reconstruction` | `codex/paper-workspace-ui-reconstruction @ 0b5fa658df507dca8c4cdb1791256855871af4c5`, ahead 18 / behind 92 | Dirty: modified `index.html`, `src/pages/paper-workspace/StaticWorkspacePages.jsx`, `src/pages/paper-workspace/__tests__/paper-workspace-model.test.js`, `src/pages/paper-workspace/components/PaperWorkspaceComponents.jsx`, `src/styles/tokens.css`, `tailwind.config.js`. | 3.6G | Do not delete; dirty and divergent. | Requires owner decision before cleanup; not part of #458. |

Additional AO state:

- `/home/samsen/.agent-orchestrator/369ab9408a58-ciecopilot-home`: 19M.
- Relevant AO files observed: `sessions/cie-303` and `interactive-messages/cie-303-4de879a7.md`.
- No worktree or AO artifact deletion was performed.

Cleanup recommendation:

1. Keep `cie-303` until the #458 PR is merged/closed.
2. Do not remove the root worktree or nested paper workspace reconstruction worktree without explicit owner approval because both have uncommitted or untracked changes.
3. After #458 closes, run the repo workflow closeout for this branch if still present, then reevaluate disk cleanup with exact-path ownership.

## Human-Review Evidence Format Improvement

Recommended AO review evidence format for future PRs:

```text
AO Review Evidence v2

Reviewed object
- PR:
- Issue:
- Base branch:
- Reviewed head SHA:
- Review timestamp:
- Reviewer session:

Live recheck immediately before verdict
- gh pr view --json headRefOid,baseRefName,mergeStateStatus,mergeable,isDraft,reviewDecision:
- PR head SHA at recheck:
- Matches reviewed head SHA: yes/no
- Base branch head SHA:
- Behind status / merge state:
- Draft status:

Required and path-applicable checks
- Required checks:
- Observed check states:
- Path-based missing-check rationale:
- Checks not applicable:

Focused verification
- Command:
- Exit:
- Suites/tests or gate counts:
- Known warnings:
- Dependency/worktree assumptions:

Scope boundary assertions
- Touched files:
- Explicit non-touched boundaries:
- Product/runtime release claims allowed:
- Product/runtime release claims not made:

Risk and rollback
- Behavioral risk:
- Data/retention risk:
- Rollback or reopen recommendation:
- Follow-up issue recommendation:

Verdict
- Pass/fail/hold:
- Exact SHA verdict applies to:
- Conditions before merge:
```

This format specifically prevents stale approved-and-green decisions by forcing an exact reviewed SHA, a fresh PR head SHA recheck, base/behind state, required/path-applicable check evidence, focused verification, scope assertions, rollback/reopen advice, and follow-up issue recommendations.

## Scope Boundary

This audit did not:

- implement new runtime behavior;
- delete or modify AO worktrees;
- touch 9702/9709/9231 production-ready content pipelines;
- perform final frontend route/page migration;
- claim Smart Mark released scoring readiness beyond the #446 readiness gate;
- replace or canonicalize the absent ignored PRD file.

The only intended committed files for this issue are this report and the reports index entry.
