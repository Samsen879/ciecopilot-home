# Learning Runtime Pilot Rollout

Date: 2026-03-22
Scope: first `9709` runtime pilot slice for session-centric AskAI, workspace entry, and legacy entry-point demotion

## Rollout Posture

- Canonical runtime entry surfaces are `/learn/session/:sessionId` and `/learn/workspace/:topicId`.
- Legacy AskAI, Study Hub, and Learning Path remain compatibility-only surfaces during this slice.
- Authoritative scoring remains limited to the seeded trigonometry pilot family and still requires all released-scope gates:
  - seeded pilot question type
  - released rubric ref
  - validated uncertainty posture
- Imported or non-pilot questions outside released scope must stay on explicit `non_released_fallback`.

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

Use the Task 13 verification set with `--verbose` for Jest in this repo:

```bash
npm test -- --runInBand api/_runtime/__tests__/route-registry-learning.test.js api/evidence/__tests__/context.test.js api/learning/__tests__/runtime-contract.test.js api/learning/__tests__/error-contract.test.js api/learning/__tests__/learning-http.test.js api/learning/__tests__/session-validator.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-ask.test.js api/learning/__tests__/workspace-read-service.test.js api/learning/__tests__/review-task-service.test.js api/learning/__tests__/artifact-api.test.js api/learning/__tests__/artifact-service.test.js api/learning/__tests__/reconciliation-service.test.js api/learning/__tests__/released-scope.test.js api/rag/__tests__/ask-service.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/pages/__tests__/legacy-entry-mode.test.js src/components/learning-runtime/__tests__/view-models.test.js --verbose
npm run build
```
