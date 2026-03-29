# AO / Codex Work Dossier (2026-03-26)

## Purpose

Reconstruct what AO and Codex already did before this session, with enough detail to separate:

- repo history on GitHub
- current `origin/main` state
- the current local worktree snapshot on `runtime-post-pilot-0323-2239`

This report is meant to stop us from confusing "closed issue history" with "what this branch currently contains."

## Evidence Sources

- closed GitHub issues in `Samsen879/ciecopilot-home`
- git history across `origin/main`, `origin/runtime-post-pilot-0323-2239`, and local `HEAD`
- repo-local planning docs:
  - [核心项目文档/PRD.md](/home/samsen/code/ciecopilot-home/核心项目文档/PRD.md)
  - [2026-03-20-prd-learning-runtime-contract-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md)
  - [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md)
  - [.agent-rules.md](/home/samsen/code/ciecopilot-home/.agent-rules.md)
- current file tree under:
  - [api/learning](/home/samsen/code/ciecopilot-home/api/learning)
  - [src/pages/learning-runtime](/home/samsen/code/ciecopilot-home/src/pages/learning-runtime)
  - [src/components/learning-runtime](/home/samsen/code/ciecopilot-home/src/components/learning-runtime)
  - [scripts/ao](/home/samsen/code/ciecopilot-home/scripts/ao)
  - [tests/ao](/home/samsen/code/ciecopilot-home/tests/ao)

## Branch Reality

Current worktree:

- branch: `runtime-post-pilot-0323-2239`
- `git status --short --branch`: ahead `1` of `origin/runtime-post-pilot-0323-2239`
- `git rev-list --left-right --count origin/main...HEAD`: `38 3`
- neither `origin/main` nor `HEAD` is an ancestor of the other

Implication:

- `origin/main` contains many closed issue landings that this branch does not have
- this branch also contains three local-only commits that are not on `origin/main`
- repo history and worktree reality have to be tracked separately

## High-Level Findings

1. The closed GitHub issue history is real and substantial: `35` closed issues in the relevant AO / learning-runtime sequence.
2. The first PRD-aligned learning-runtime pilot slice was built through issues `#15` to `#27`, and that pilot slice is present on this branch.
3. The post-pilot runtime expansion issues `#44` to `#51`, the GitHub Pages fix `#60`, and the hardening / cutover wave `#62` to `#73` landed on `origin/main`, but this branch is missing that mainline wave.
4. This branch contains a large local-only WIP snapshot commit, `2146615`, that adds AO CLI, AO tests, AO runbooks, and durable request-idempotency work which diverges from `origin/main`.
5. One concrete mismatch example: issue `#71` is closed on GitHub, and `origin/main` switched runtime entry to a rollback-based model, but this branch still uses the older enable-flag model in [legacy-entry-mode.js](/home/samsen/code/ciecopilot-home/src/pages/legacy-entry-mode.js).

## Current Worktree-Only Commits

These commits exist on `HEAD` but are not in `origin/main`:

| Commit | Summary | Main effect |
| --- | --- | --- |
| `2146615` | `WIP: snapshot AO and learning runtime progress` | Large local snapshot adding AO CLI, AO tests, AO runbooks, idempotency migration/repository, and related learning-runtime changes |
| `a58ec62` | `fix(ao): stop repeating idle prompts` | AO runtime behavior tweak local to this branch line |
| `e32cba9` | `chore(ao): harden runtime reconciliation flow` | Earlier local AO reconciliation hardening |

Important consequence:

- this worktree has AO and idempotency material that overlaps conceptually with later merged issues, but it is not the same as the final `origin/main` result

## Wave A: Pilot Slice Buildout (`#15` to `#27`)

These issues correspond to the first PRD-aligned `9709` learning-runtime slice defined by the frozen contract and execution plan.

| Issue | Summary | Primary landing commits | Representative landed files / tests | Status in current branch |
| --- | --- | --- | --- | --- |
| `#15` | Freeze runtime contracts, released scope, error envelopes | `ed4b333` | [runtime-contract.js](/home/samsen/code/ciecopilot-home/api/learning/lib/contracts/runtime-contract.js), [error-contract.js](/home/samsen/code/ciecopilot-home/api/learning/lib/contracts/error-contract.js), [released-scope.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/released-scope.test.js) | Present |
| `#16` | Freeze session/import validators and HTTP helpers | `0126d56`, `1df4f93` | [session-validator.js](/home/samsen/code/ciecopilot-home/api/learning/lib/validators/session-validator.js), [question-import-validator.js](/home/samsen/code/ciecopilot-home/api/learning/lib/validators/question-import-validator.js), [learning-http.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/learning-http.test.js) | Present |
| `#17` | Add canonical runtime schema and pilot registry migrations | `34b5800`, `e1c9e00`, `30da2ad` | [20260320111000_create_learning_runtime_core.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260320111000_create_learning_runtime_core.sql), [20260320111500_seed_learning_runtime_pilot_registry.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260320111500_seed_learning_runtime_pilot_registry.sql), [schema-contract.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/schema-contract.test.js) | Present |
| `#18` | Add canonical runtime repositories | `97b6ef5` | [question-registry-repository.js](/home/samsen/code/ciecopilot-home/api/learning/lib/repositories/question-registry-repository.js), [session-repository.js](/home/samsen/code/ciecopilot-home/api/learning/lib/repositories/session-repository.js), [workspace-repository.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/workspace-repository.test.js) | Present |
| `#19` | Register learning routes and session skeletons | `88cf31f`, `7bcf5d0`, `a1030a8` | [route-registry.js](/home/samsen/code/ciecopilot-home/api/_runtime/route-registry.js), [api/learning/sessions/index.js](/home/samsen/code/ciecopilot-home/api/learning/sessions/index.js), [session-api.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/session-api.test.js) | Present |
| `#20` | Add question import flow and released-scope gating | `0ac2e09`, `a2ecc74`, `6a7714f` | [question-import-service.js](/home/samsen/code/ciecopilot-home/api/learning/lib/import/question-import-service.js), [api/learning/questions/import.js](/home/samsen/code/ciecopilot-home/api/learning/questions/import.js), [question-import-service.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/question-import-service.test.js) | Present |
| `#21` | Wrap AskAI in session runtime | `218517b`, `4c2c034`, `98829cd` | [ask-service.js](/home/samsen/code/ciecopilot-home/api/rag/lib/ask-service.js), [ask-context-builder.js](/home/samsen/code/ciecopilot-home/api/learning/lib/session-runtime/ask-context-builder.js), [session-ask.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/session-ask.test.js) | Present |
| `#22` | Add conservative orchestration, artifact lifecycle, reconciliation | `379c4b8`, `fa7b043`, `f2cc074` | [review-task-service.js](/home/samsen/code/ciecopilot-home/api/learning/lib/review/review-task-service.js), [artifact-service.js](/home/samsen/code/ciecopilot-home/api/learning/lib/artifacts/artifact-service.js), [reconciliation-service.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/reconciliation-service.test.js) | Present |
| `#23` | Add workspace and review queue projections | `729d264`, `bde1b13` | [workspace-read-service.js](/home/samsen/code/ciecopilot-home/api/learning/lib/workspaces/workspace-read-service.js), [api/evidence/context.js](/home/samsen/code/ciecopilot-home/api/evidence/context.js), [workspace-read-service.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/workspace-read-service.test.js) | Present |
| `#24` | Add browser client and learning session page | `f4657b2`, `4c483ba` | [learningRuntimeApi.js](/home/samsen/code/ciecopilot-home/src/api/learningRuntimeApi.js), [LearningSessionPage.jsx](/home/samsen/code/ciecopilot-home/src/pages/learning-runtime/LearningSessionPage.jsx), [LearningSessionShell.test.js](/home/samsen/code/ciecopilot-home/src/components/learning-runtime/__tests__/LearningSessionShell.test.js) | Present |
| `#25` | Add workspace UI and demote legacy surfaces | `8ef0340`, `d0af300`, `4470bdb` | [TopicWorkspacePage.jsx](/home/samsen/code/ciecopilot-home/src/pages/learning-runtime/TopicWorkspacePage.jsx), [WorkspaceShell.jsx](/home/samsen/code/ciecopilot-home/src/components/learning-runtime/WorkspaceShell.jsx), [legacy-entry-mode.test.js](/home/samsen/code/ciecopilot-home/src/pages/__tests__/legacy-entry-mode.test.js) | Present |
| `#26` | Add end-to-end API boundary coverage | `a18a26c`, `4157717`, `2c78ebb`, `5b14ef1` | [route-registry-learning.test.js](/home/samsen/code/ciecopilot-home/api/_runtime/__tests__/route-registry-learning.test.js), [artifact-api.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/artifact-api.test.js), [released-scope.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/released-scope.test.js) | Present |
| `#27` | Final rollout flags and legacy demotion verification | `746c3d2`, `c8b7d96`, `3189a5d` | [AskAI.jsx](/home/samsen/code/ciecopilot-home/src/pages/AskAI.jsx), [StudyHub.jsx](/home/samsen/code/ciecopilot-home/src/pages/StudyHub.jsx), [2026-03-20-learning-runtime-pilot-rollout.md](/home/samsen/code/ciecopilot-home/docs/superpowers/runbooks/2026-03-20-learning-runtime-pilot-rollout.md) | Present, but still on the older feature-flag model |

## Wave B: Post-Pilot Expansion and Validation (`#42`, `#44` to `#51`, `#60`)

These issues landed on `origin/main` after the pilot slice, but they are not contained in this branch snapshot.

| Issue | Summary | Primary landing commits | Representative landed files / tests | Status in current branch |
| --- | --- | --- | --- | --- |
| `#42` | Sacrificial AO release validation | `7b916e3`, `21a2afa`, `925646e` | `README.md`, `scripts/rag/__tests__/fixtures/ao-sacrificial-release-validation.md` | Missing from current branch |
| `#44` | Add interactive session launch and ask flow | `d267b25`, `2ff337a`, `4c1002f` | `src/components/learning-runtime/SessionLauncher.js`, `src/components/learning-runtime/SessionAskComposer.js`, `src/components/learning-runtime/__tests__/SessionAskComposer.test.js` | Missing from current branch |
| `#45` | Add imported-question intake and import-to-session handoff | `90a96a8`, `a7c6665`, `2d5998c` | `src/components/learning-runtime/ImportedQuestionIntake.js`, `src/components/learning-runtime/ImportPostureBanner.js`, `src/components/learning-runtime/__tests__/ImportPostureBanner.test.js` | Missing from current branch |
| `#46` | Surface real workspace slot content and launch actions | `d3267d3`, `33b849a`, `0008155` | `src/components/learning-runtime/WorkspaceArtifactCard.js`, `src/components/learning-runtime/LinkedReferenceList.js`, `src/components/learning-runtime/__tests__/WorkspaceArtifactCard.test.js` | Missing from current branch |
| `#47` | Add review-task write API and completion semantics | `f41af41`, `9f1e269`, `ef3c7e4` | `api/learning/review-tasks/[id].js`, `api/learning/lib/validators/review-task-write-validator.js`, `api/learning/__tests__/review-task-api.test.js` | Missing from current branch |
| `#48` | Add interactive review queue surfaces and review-to-session handoff | `0e787e5`, `054e241`, `c2b203c` | `src/components/learning-runtime/ReviewTaskActionBar.js`, `src/pages/learning-runtime/ReviewQueuePage.jsx`, `src/components/learning-runtime/view-models/review-queue-view-model.js` | Missing from current branch |
| `#49` | Add artifact lifecycle actions and slot-conflict UX | `39dab36`, `3038d3c` | `src/components/learning-runtime/ArtifactLifecycleActions.js`, `src/components/learning-runtime/ArtifactSupersedeSheet.js`, `src/components/learning-runtime/__tests__/WorkspaceShell.test.js` | Missing from current branch |
| `#50` | Promote `9709` integration to released scoring | `5fd0ea7`, `79b3994`, `cedeac8` | `api/learning/lib/contracts/released-scope.js`, `api/learning/lib/import/question-import-service.js`, promotion evidence under `docs/reports/` | Missing from current branch |
| `#51` | Replace lineage stub with real handoff and resume flow | `c533eb5`, `985d407`, `32d6a55` | `api/learning/lib/session-runtime/session-handoff.js`, `api/learning/lib/session-runtime/session-service.js`, `src/components/learning-runtime/__tests__/LearningSessionShell.test.js` | Missing from current branch |
| `#60` | Fix GitHub Pages Jekyll build failure | `a9e6bc6`, `84b0ed1` | [src/styles/README.md](/home/samsen/code/ciecopilot-home/src/styles/README.md) | Missing from current branch |

## Wave C: Convergence, AO Hardening, Cutover, and Next Runtime Scope (`#62` to `#73`)

This wave mostly exists on `origin/main`, with partial overlapping local work on this branch.

| Issue | Summary | Primary landing commits | Representative landed files / tests | Status in current branch |
| --- | --- | --- | --- | --- |
| `#62` | Converge AO + durable idempotency onto mainline | `9ad08e5`, `9b46c97`, `226b0cd` | [.agent-rules.md](/home/samsen/code/ciecopilot-home/.agent-rules.md), [scripts/ao-reconcile.js](/home/samsen/code/ciecopilot-home/scripts/ao-reconcile.js), [request-idempotency-repository.js](/home/samsen/code/ciecopilot-home/api/learning/lib/repositories/request-idempotency-repository.js) | Not satisfied in this branch; `origin/main...HEAD` is still `38 3` |
| `#63` | Make verification sandbox-safe and command-current | `56bd9df`, `aa008c3` | `api/learning/__tests__/loopback-test-client.js`, [2026-03-20-learning-runtime-pilot-rollout.md](/home/samsen/code/ciecopilot-home/docs/superpowers/runbooks/2026-03-20-learning-runtime-pilot-rollout.md), [2026-03-20-prd-learning-runtime-pilot-slice-execution.md](/home/samsen/code/ciecopilot-home/docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md) | Missing from current branch; older docs still show stale `-v` examples |
| `#64` | Finish durable request idempotency end-to-end | `5e30751`, `8805d03`, `a6420e0` | [20260324120000_create_learning_request_idempotency.sql](/home/samsen/code/ciecopilot-home/supabase/migrations/20260324120000_create_learning_request_idempotency.sql), [request-idempotency-repository.js](/home/samsen/code/ciecopilot-home/api/learning/lib/repositories/request-idempotency-repository.js), [request-idempotency-repository.test.js](/home/samsen/code/ciecopilot-home/api/learning/__tests__/request-idempotency-repository.test.js) | Diverged local variant: overlapping local WIP exists, but not the merged mainline result |
| `#65` | Add AO live-source acceptance coverage and smoke flow | `86c0638`, `93c9a9f`, `d8f0a11`, `7f497f8`, `e714675` | `docs/reports/ao_operator_smoke_guide.md`, `scripts/ao/run-operator-smoke.js`, `tests/ao/fixtures/acceptance/**` | Diverged local variant: AO CLI/tests exist locally, but not as the same merged acceptance state |
| `#66` | Promote differential equations into released scoring | `d28d535`, `68aa280`, `42b871b` | `supabase/migrations/20260325110000_promote_learning_runtime_differential_equations_separable.sql`, `api/learning/__tests__/released-scope.test.js`, promotion reports under `docs/reports/` | Missing from current branch |
| `#67` | Add part/subpart-aware runtime scoring ingestion | `ba23333`, `9c270fb` | `api/marking/lib/marking-result-contract.js`, `api/marking/evaluate-v1.js`, `api/marking/__tests__/marking-result-contract.test.js` | Missing from current branch |
| `#68` | Add released-family gold-set / rubric / uncertainty gate | `3b2337d`, `09e3928`, `7bbc946` | `scripts/learning/lib/released-family-gate.js`, `api/learning/lib/contracts/released-scope-core.js`, `docs/reports/learning_runtime_released_family_gate_2026-03-25.md` | Missing from current branch |
| `#69` | Add explicit post-mortem review mode | `2da21c2`, `39f69df` | `src/pages/learning-runtime/LearningSessionPage.jsx`, `src/components/learning-runtime/view-models/session-view-model.js`, `src/components/learning-runtime/__tests__/WorkspaceShell.test.js` | Missing from current branch |
| `#70` | Harden review scheduler policy | `c7ed035`, `adc296d` | `api/learning/lib/review/review-scheduler-policy.js`, `api/learning/lib/review/review-task-service.js`, `api/learning/__tests__/review-scheduler-policy.test.js` | Missing from current branch |
| `#71` | Remove long-lived feature flag and make runtime default | `abca405`, `3901d50` | [legacy-entry-mode.js](/home/samsen/code/ciecopilot-home/src/pages/legacy-entry-mode.js), [AskAI.jsx](/home/samsen/code/ciecopilot-home/src/pages/AskAI.jsx), [legacy-entry-mode.test.js](/home/samsen/code/ciecopilot-home/src/pages/__tests__/legacy-entry-mode.test.js) | Missing from current branch; current branch still uses `VITE_LEARNING_RUNTIME_ENABLED` |
| `#72` | Freeze subject adapter contract and choose second subject | `21de80e`, `fa58405` | `api/learning/lib/subjects/subject-adapter-contract.js`, `api/learning/lib/subjects/subject-adapter-registry.js`, `docs/reports/learning_runtime_second_subject_decision_2026-03-25.md` | Missing from current branch |
| `#73` | Strengthen workspace revisitation and continuation | `8b60649`, `adcf839` | `api/learning/lib/workspaces/workspace-read-service.js`, `src/components/learning-runtime/WorkspaceShell.js`, `src/components/learning-runtime/view-models/workspace-view-model.js` | Missing from current branch |

## Concrete Mismatch Examples

### 1. Issue `#71` is closed on GitHub, but this branch still has the pre-cutover entry model

Current branch:

- [legacy-entry-mode.js](/home/samsen/code/ciecopilot-home/src/pages/legacy-entry-mode.js) still uses `VITE_LEARNING_RUNTIME_ENABLED`
- runtime routes only include session and workspace

`origin/main`:

- switched to `VITE_LEARNING_RUNTIME_ROLLBACK_TO_LEGACY`
- treats runtime as the default and legacy chat as explicit rollback
- adds `/learn/review-queue`

### 2. Issue `#48` is closed on GitHub, but this branch has no dedicated review-queue route

`origin/main` contains:

- `src/pages/learning-runtime/ReviewQueuePage.jsx`
- `src/components/learning-runtime/ReviewTaskActionBar.js` plus queue-specific view-model work

Current branch:

- no mainline review-queue route
- older compatibility-shell state remains

### 3. AO and idempotency exist locally, but as a divergent branch line

Current branch has:

- [scripts/ao-reconcile.js](/home/samsen/code/ciecopilot-home/scripts/ao-reconcile.js)
- [scripts/ao-doctor.js](/home/samsen/code/ciecopilot-home/scripts/ao-doctor.js)
- [scripts/ao-lifecycle.js](/home/samsen/code/ciecopilot-home/scripts/ao-lifecycle.js)
- [request-idempotency-repository.js](/home/samsen/code/ciecopilot-home/api/learning/lib/repositories/request-idempotency-repository.js)

But because `origin/main...HEAD` is `38 3`, this local line has not actually replaced or absorbed the later merged mainline work.

## Verification Notes

Focused verification run in this session:

```bash
npm test -- --runInBand src/pages/__tests__/legacy-entry-mode.test.js tests/ao/ao-reconcile-cli.test.js tests/ao/ao-doctor-cli.test.js tests/ao/ao-lifecycle-cli.test.js
```

Observed result:

- `4` suites passed
- `19` tests passed

Additional verification finding:

```bash
npm test -- --runInBand ... -v
```

fails in this repo because the current Jest wrapper rejects `-v` as an unrecognized option. That is consistent with the testing-drift problem later addressed by issue `#63`.

## Bottom Line

If the question is "what did AO and Codex already do before?", the answer is:

- GitHub / `origin/main` history: pilot runtime slice, post-pilot runtime expansion, release/content hardening, AO convergence work, and later runtime cutover issues through `#73`
- current local worktree: pilot runtime slice plus a divergent local AO / idempotency WIP line, but missing the later `origin/main` runtime expansion and cutover wave

So any future planning has to choose one of two truths explicitly:

- repo-history truth: follow `origin/main`
- current-worktree truth: reconcile this branch before assuming later closed issues are actually present here
