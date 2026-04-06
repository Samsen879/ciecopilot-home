# Learning Runtime Closeout Matrix

- issue: `#163`
- branch: `feat/issue-163`
- base_commit: `ffe3082`
- verified_at_utc: `2026-04-06T13:34:02Z`

## Preconditions

- GitHub dependency state was confirmed before execution:
  - `#160` closed at `2026-04-06T10:01:06Z`
  - `#161` closed at `2026-04-06T11:55:05Z`
  - `#162` closed at `2026-04-06T12:19:46Z`
- No open PR existed for `feat/issue-163` when this closeout run started.
- This AO worktree did not have a local `node_modules` directory. The worktree `package-lock.json` matched `/home/samsen/code/ciecopilot-home/package-lock.json` byte-for-byte, so verification reused the existing root install through a local symlink before rerunning the matrix. This was an environment bootstrap step, not a product-code change.

## Closeout Command Set

### 1. Foundational contract and repository layer

```bash
npm test -- --runInBand --runTestsByPath \
  api/learning/__tests__/runtime-contract.test.js \
  api/learning/__tests__/error-contract.test.js \
  api/learning/__tests__/learning-http.test.js \
  api/learning/__tests__/session-validator.test.js \
  api/learning/__tests__/question-import-validator.test.js \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/question-registry-repository.test.js \
  api/learning/__tests__/session-repository.test.js \
  api/learning/__tests__/workspace-repository.test.js \
  api/learning/__tests__/mastery-orchestrator.test.js \
  api/learning/__tests__/request-idempotency-repository.test.js \
  api/learning/__tests__/review-scheduler-policy.test.js \
  api/learning/__tests__/subject-adapter-registry.test.js \
  --verbose
```

- start_utc: `2026-04-06T13:32:41Z`
- end_utc: `2026-04-06T13:32:43Z`
- exit_code: `0`
- outcome: `PASS`
- summary: `13` suites passed, `45` tests passed
- matrix coverage:
  - released-scope contract
  - repository / schema contract
  - second-subject read-only fail-closed posture

### 2. Runtime API verticals and frontend/runtime shell

```bash
npm test -- --runInBand --runTestsByPath \
  api/learning/__tests__/question-import-service.test.js \
  api/learning/__tests__/session-api.test.js \
  api/learning/__tests__/session-ask.test.js \
  api/learning/__tests__/review-task-service.test.js \
  api/learning/__tests__/artifact-service.test.js \
  api/learning/__tests__/artifact-api.test.js \
  api/learning/__tests__/workspace-read-service.test.js \
  src/api/__tests__/learningRuntimeApi.test.js \
  src/components/learning-runtime/__tests__/LearningSessionShell.test.js \
  src/components/learning-runtime/__tests__/WorkspaceShell.test.js \
  src/pages/__tests__/legacy-entry-mode.test.js \
  src/components/learning-runtime/__tests__/view-models.test.js \
  --verbose
```

- start_utc: `2026-04-06T13:33:12Z`
- end_utc: `2026-04-06T13:33:14Z`
- exit_code: `0`
- outcome: `PASS`
- summary: `12` suites passed, `111` tests passed
- matrix coverage:
  - `import -> create session -> ask -> workspace`
  - `marking effect -> review task -> artifact patch -> workspace`
  - compatibility entry routes for `AskAI`, `StudyHub`, runtime routes, and rollback posture

### 3. Frontend build

```bash
npm run build
```

- start_utc: `2026-04-06T13:33:38Z`
- end_utc: `2026-04-06T13:33:44Z`
- exit_code: `0`
- outcome: `PASS`
- summary: Vite build completed in `5.29s`

### 4. Release posture gate

```bash
npm run learning:release-gate
```

- start_utc: `2026-04-06T13:34:02Z`
- end_utc: `2026-04-06T13:34:02Z`
- exit_code: `0`
- outcome: `PASS`
- receipt: `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`
- report: `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`

## Release Gate Result

- `status: pass`
- `release_ready: true`
- `generated_at: 2026-04-06T13:34:02.854Z`
- released families still green:
  - `9709.trigonometry_manipulation_equations`
  - `9709.integration_techniques`
  - `9709.differential_equations`

## Outcome

- The closeout command set was defined and executed successfully.
- `npm run build` passed.
- `npm run learning:release-gate` passed.
- The targeted learning-runtime closeout suites passed after `#160`, `#161`, and `#162` closed.
- No product-level blockers were observed in this matrix.

## Residual Notes

- AO worktree verification currently assumes a dependency bootstrap step if the assigned worktree does not already contain `node_modules`. That did not affect runtime correctness here because the shared install matched the worktree lockfile exactly, but it remains an operator-facing preflight detail rather than a product blocker.
