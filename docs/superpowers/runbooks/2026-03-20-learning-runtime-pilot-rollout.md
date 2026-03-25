# Learning Runtime Pilot Rollout

Date: 2026-03-22
Scope: first `9709` runtime pilot slice for session-centric AskAI, workspace entry, and legacy entry-point demotion

## Rollout Posture

- Canonical runtime entry surfaces are `/learn/session/:sessionId` and `/learn/workspace/:topicId`.
- Legacy AskAI, Study Hub, and Learning Path remain compatibility-only surfaces during this slice.
- Authoritative scoring covers the seeded trigonometry types plus the released `9709.integration.application` and `9709.differential_equations.separable` slices and still requires all released-scope gates:
  - registry-backed released question type
  - released rubric ref
  - classification confidence present
  - validated uncertainty posture
- Imported or non-promoted questions outside released scope must stay on explicit `non_released_fallback`, including broader `9709.differential_equations.*` cases beyond the promoted separable slice.

## Feature-Flag Default

- Frontend flag: `VITE_LEARNING_RUNTIME_ENABLED`
- Default posture: disabled unless the env var is explicitly set to `true`
- Disabled behavior:
  - AskAI stays on `legacy_chat`
  - Study Hub stays on `legacy_hub`
  - Learning Path stays on `legacy_path`
- Enabled behavior:
  - AskAI becomes a handoff entry into learning-runtime workspace routes
  - Study Hub becomes a compatibility shell linking into runtime workspaces
  - Learning Path becomes a compatibility shell linking into runtime workspaces

## Migration Order

1. Merge the rollout-hardening branch after the full backend/frontend verification set and Vite build pass.
2. Leave `VITE_LEARNING_RUNTIME_ENABLED` unset in production by default.
3. Enable the flag in the target environment when the pilot should route through learning-runtime entry points.
4. Verify the three entry-point expectations after enabling the flag:
   - AskAI hands off into runtime entry
   - Study Hub stays compatibility-only
   - Learning Path stays compatibility-only
5. Treat `/learn/session/:sessionId` and `/learn/workspace/:topicId` as the only canonical runtime surfaces for the pilot.

## Legacy Surface Rules After Rollout

- `src/pages/AskAI.jsx`: compatibility entry only under the flag; it must not regain canonical runtime state ownership.
- `src/pages/StudyHub.jsx`: compatibility shell only under the flag; it must not regain canonical workspace, review-queue, or artifact truth.
- `src/pages/LearningPath.jsx`: compatibility shell only under the flag; it must not regain canonical runtime truth.

## Rollback Posture

- Primary rollback lever: unset `VITE_LEARNING_RUNTIME_ENABLED` or set it to a non-`true` value.
- Expected rollback result:
  - AskAI returns to legacy chat entry mode.
  - Study Hub returns to the legacy hub surface.
  - Learning Path returns to the legacy path surface.
- No legacy surface should be promoted back to canonical runtime truth during rollback; rollback only changes entry routing.
- If runtime behavior is suspect while the flag is enabled, disable the flag first, then investigate the session/workspace routes separately.

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
