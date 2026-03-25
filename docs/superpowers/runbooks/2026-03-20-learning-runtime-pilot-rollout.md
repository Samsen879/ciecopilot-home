# Learning Runtime Pilot Rollout

Date: 2026-03-25
Scope: first `9709` runtime pilot slice after runtime-first cutover for session-centric AskAI, workspace entry, and legacy entry-point demotion

## Rollout Posture

- Canonical runtime entry surfaces are `/learn/session/:sessionId` and `/learn/workspace/:topicId`.
- AskAI, Study Hub, and Learning Path remain compatibility-only surfaces during this slice and no longer gate canonical runtime entry.
- Authoritative scoring covers the seeded trigonometry types plus the released `9709.integration.application` and `9709.differential_equations.separable` slices and still requires all released-scope gates:
  - registry-backed released question type
  - released rubric ref
  - classification confidence present
  - validated uncertainty posture
- Imported or non-promoted questions outside released scope must stay on explicit `non_released_fallback`, including broader `9709.differential_equations.*` cases beyond the promoted separable slice.

## Default Entry Posture

- Normal posture: runtime-first by default with no frontend feature flag required for canonical entry.
- Default behavior:
  - AskAI resolves to `learning_runtime`
  - Study Hub resolves to `compatibility_shell`
  - Learning Path resolves to `compatibility_shell`
- Retired flag:
  - `VITE_LEARNING_RUNTIME_ENABLED` no longer controls canonical entry and should be removed from environment configs during cleanup.

## Migration Order

1. Merge the cutover branch after the focused legacy-entry/runtime verification set and Vite build pass.
2. Remove stale `VITE_LEARNING_RUNTIME_ENABLED` configuration from the deployment target so operators do not mistake it for an active control.
3. Verify the default entry expectations in the target environment:
   - AskAI hands off into runtime entry by default
   - Study Hub stays compatibility-only
   - Learning Path stays compatibility-only
4. Treat `/learn/session/:sessionId` and `/learn/workspace/:topicId` as the only canonical runtime surfaces for the pilot.

## Legacy Surface Rules After Rollout

- `src/pages/AskAI.jsx`: compatibility entry only; it must not regain canonical runtime state ownership.
- `src/pages/StudyHub.jsx`: compatibility shell only; it must not regain canonical workspace, review-queue, or artifact truth.
- `src/pages/LearningPath.jsx`: compatibility shell only; it must not regain canonical runtime truth.

## Rollback Posture

- Primary rollback lever: set `VITE_LEARNING_RUNTIME_ROLLBACK_TO_LEGACY=true`.
- Expected rollback result:
  - AskAI returns to legacy chat entry mode.
  - Study Hub returns to the legacy hub surface.
  - Learning Path returns to the legacy path surface.
- No legacy surface should be promoted back to canonical runtime truth during rollback; rollback only changes entry routing.
- If runtime behavior is suspect, set the rollback flag first, confirm legacy entry recovers, and then investigate the session/workspace routes separately.
- Clearing rollback means removing `VITE_LEARNING_RUNTIME_ROLLBACK_TO_LEGACY` or setting it to a non-`true` value.

## Verification Record

Canonical learning-runtime verification in this repo should use `npm test -- --runInBand ...`.
Do not use Jest's short `-v` flag here; the current wrapper accepts long-form flags such as `--verbose`, but the canonical closeout recipes below do not require verbosity flags at all.

```bash
# Pure unit, repository, and schema verification
npm test -- --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/request-idempotency-repository.test.js api/learning/__tests__/session-repository.test.js api/learning/__tests__/question-registry-repository.test.js

# Handler and API verification
npm test -- --runInBand api/learning/__tests__/session-api.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-ask.test.js

# Full learning-runtime slice verification
npm test -- --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js api/rag/__tests__/ask-service.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js
npm run build
```

Learning-runtime handler suites now bind their test server on `127.0.0.1` instead of relying on `supertest`'s default wildcard bind.
If a local sandbox blocks loopback listens too, treat that as an environment-limited handler run and report the pure-suite results separately instead of misclassifying the failure as a product regression.
