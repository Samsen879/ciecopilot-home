# Mainline Convergence For AO And Durable Idempotency Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover one current branch by starting from `origin/main`, then re-landing repo-local AO tooling and durable learning-runtime idempotency without regressing the newer runtime product wave already on main.

**Architecture:** Treat `origin/main` as the canonical product base. Re-land work in three bounded chunks: branch convergence setup, AO slice, and durable-idempotency slice. Never replay the mixed local WIP snapshot wholesale. Diff file-by-file against `origin/main`, preserve newer product behavior, and establish one explicit verification baseline at the end.

**Tech Stack:** Git, Node 18 ESM scripts, Jest, npm, Supabase/Postgres migrations, Markdown runbooks.

---

## Source Spec

- [2026-03-27-mainline-convergence-ao-idempotency-design.md](/home/samsen/code/ciecopilot-home/docs/superpowers/specs/2026-03-27-mainline-convergence-ao-idempotency-design.md)
- [ao_codex_work_dossier_2026-03-26.md](/home/samsen/code/ciecopilot-home/docs/reports/ao_codex_work_dossier_2026-03-26.md)

## Execution Rules

- Use `origin/main` as the only branch base for recovery work.
- Do not cherry-pick `2146615` wholesale.
- Keep product files from the March 24-25 mainline wave intact unless the slice explicitly requires a targeted merge.
- Run focused verification after each chunk; do not defer all verification to the end.
- Use current Jest command syntax; do not use stale `-v` examples from older issue bodies.

## File Map

### Branch and repo-control files

- `agent-orchestrator.yaml`: compare and port only the AO wiring still needed on top of `origin/main`.
- `.agent-rules.md`: compare local AO guidance with mainline and preserve the stronger current rules without discarding newer mainline expectations.
- `package.json`: preserve current mainline scripts, add AO scripts only if they are missing or weaker.

### AO slice files

- `scripts/ao-reconcile.js`
- `scripts/ao-doctor.js`
- `scripts/ao-lifecycle.js`
- `scripts/ao/lib/ao-observation-source.js`
- `scripts/ao/lib/github-observation-source.js`
- `scripts/ao/lib/reconciliation-contracts.js`
- `scripts/ao/lib/reconciliation-engine.js`
- `scripts/ao/lib/reconciliation-report.js`
- `scripts/ao/lib/reconciliation-runner.js`
- `scripts/ao/lib/doctor-contracts.js`
- `scripts/ao/lib/doctor-local-state-source.js`
- `scripts/ao/lib/doctor-engine.js`
- `scripts/ao/lib/doctor-report.js`
- `scripts/ao/lib/doctor-runner.js`
- `scripts/ao/lib/lifecycle-contracts.js`
- `scripts/ao/lib/lifecycle-engine.js`
- `scripts/ao/lib/lifecycle-report.js`
- `scripts/ao/start-clean.sh`
- `tests/ao/reconciliation-contracts.test.js`
- `tests/ao/ao-observation-source.test.js`
- `tests/ao/github-observation-source.test.js`
- `tests/ao/reconciliation-engine.test.js`
- `tests/ao/reconciliation-report.test.js`
- `tests/ao/reconciliation-runner.test.js`
- `tests/ao/ao-reconcile-cli.test.js`
- `tests/ao/doctor-contracts.test.js`
- `tests/ao/doctor-local-state-source.test.js`
- `tests/ao/doctor-engine.test.js`
- `tests/ao/doctor-report.test.js`
- `tests/ao/doctor-runner.test.js`
- `tests/ao/ao-doctor-cli.test.js`
- `tests/ao/lifecycle-contracts.test.js`
- `tests/ao/lifecycle-engine.test.js`
- `tests/ao/lifecycle-report.test.js`
- `tests/ao/ao-lifecycle-cli.test.js`
- `docs/setup/AO_RECONCILIATION_RUNBOOK.md`
- `docs/setup/AO_DOCTOR_RUNBOOK.md`
- `docs/setup/AO_LIFECYCLE_RUNBOOK.md`

### Durable idempotency slice files

- `supabase/migrations/20260324120000_create_learning_request_idempotency.sql`
- `api/learning/lib/repositories/request-idempotency-repository.js`
- `api/learning/lib/session-runtime/session-service.js`
- `api/learning/lib/import/question-import-service.js`
- `api/learning/lib/repositories/session-repository.js`
- `api/learning/lib/repositories/question-registry-repository.js`
- `api/learning/__tests__/request-idempotency-repository.test.js`
- `api/learning/__tests__/schema-contract.test.js`
- `api/learning/__tests__/session-api.test.js`
- `api/learning/__tests__/session-repository.test.js`
- `api/learning/__tests__/question-import-service.test.js`
- `api/learning/__tests__/question-registry-repository.test.js`

## Chunk 1: Create The Correct Recovery Base

### Task 1: Capture the divergence baseline before changing branches

**Files:**
- Modify: none
- Test: none

- [ ] **Step 1: Record branch divergence**

Run:

```bash
git rev-list --left-right --count origin/main...HEAD
git log --oneline --decorate HEAD..origin/main
git log --oneline --decorate origin/main..HEAD
```

Expected:
- confirm that `origin/main` contains the later runtime product wave
- confirm that `HEAD` contains only the local AO/idempotency line

- [ ] **Step 2: Record the current worktree-only recovery inputs**

Run:

```bash
git diff --name-only origin/main...HEAD
git diff --stat origin/main...HEAD
```

Expected:
- explicit list of AO/idempotency files that exist only on the local line

### Task 2: Create the fresh convergence branch from `origin/main`

**Files:**
- Modify: none
- Test: none

- [ ] **Step 1: Fetch and create the recovery branch**

Run:

```bash
git fetch origin
git switch -c converge/mainline-ao-idempotency origin/main
```

Expected:
- new branch points at `origin/main`

- [ ] **Step 2: Confirm the branch really starts from mainline**

Run:

```bash
git rev-list --left-right --count origin/main...HEAD
git status --short --branch
```

Expected:
- no product-wave divergence from `origin/main`

### Task 3: Verify the mainline baseline before re-landing local slices

**Files:**
- Modify: none
- Test: existing focused suites only

- [ ] **Step 1: Run a focused mainline runtime sanity check**

Run:

```bash
npm test -- --runInBand src/pages/__tests__/legacy-entry-mode.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/components/learning-runtime/__tests__/view-models.test.js
```

Expected:
- current mainline runtime entry, workspace, and browser-client suites pass

- [ ] **Step 2: Record any baseline failures before local re-land work**

Expected:
- if the base fails, stop and fix mainline baseline first instead of mixing recovery causes

## Chunk 2: Re-Land The AO Slice

### Task 4: Port AO CLI entrypoints and pure libraries on top of `origin/main`

**Files:**
- Modify: `package.json`
- Modify: `.agent-rules.md`
- Modify: `agent-orchestrator.yaml`
- Create or Modify: `scripts/ao-reconcile.js`
- Create or Modify: `scripts/ao-doctor.js`
- Create or Modify: `scripts/ao-lifecycle.js`
- Create or Modify: `scripts/ao/lib/ao-observation-source.js`
- Create or Modify: `scripts/ao/lib/github-observation-source.js`
- Create or Modify: `scripts/ao/lib/reconciliation-contracts.js`
- Create or Modify: `scripts/ao/lib/reconciliation-engine.js`
- Create or Modify: `scripts/ao/lib/reconciliation-report.js`
- Create or Modify: `scripts/ao/lib/reconciliation-runner.js`
- Create or Modify: `scripts/ao/lib/doctor-contracts.js`
- Create or Modify: `scripts/ao/lib/doctor-local-state-source.js`
- Create or Modify: `scripts/ao/lib/doctor-engine.js`
- Create or Modify: `scripts/ao/lib/doctor-report.js`
- Create or Modify: `scripts/ao/lib/doctor-runner.js`
- Create or Modify: `scripts/ao/lib/lifecycle-contracts.js`
- Create or Modify: `scripts/ao/lib/lifecycle-engine.js`
- Create or Modify: `scripts/ao/lib/lifecycle-report.js`
- Create or Modify: `scripts/ao/start-clean.sh`

- [ ] **Step 1: Diff the AO slice against `origin/main`**

Run:

```bash
git diff --no-index -- scripts/ao scripts/ao
```

Expected:
- replace this with targeted `git show` or `git diff origin/main...runtime-post-pilot-0323-2239 -- <path>` per file as needed
- identify files that are missing on `origin/main` vs files that already exist but differ

- [ ] **Step 2: Port the AO files with minimal product overlap**

Implement:
- copy or merge AO CLI and `scripts/ao/lib/**` from the local branch line
- preserve any newer `origin/main` repo wiring when the same file exists on both sides
- keep GitHub canonical for PR/review/check truth

- [ ] **Step 3: Port AO runbooks and script wiring**

Implement:
- add `ao:reconcile`, `ao:doctor`, and `ao:lifecycle` scripts if missing
- add the three AO setup runbooks
- merge repo rules conservatively instead of replacing them wholesale

- [ ] **Step 4: Run the AO-focused test slice**

Run:

```bash
npm test -- --runInBand tests/ao/reconciliation-contracts.test.js tests/ao/ao-observation-source.test.js tests/ao/github-observation-source.test.js tests/ao/reconciliation-engine.test.js tests/ao/reconciliation-report.test.js tests/ao/reconciliation-runner.test.js tests/ao/ao-reconcile-cli.test.js tests/ao/doctor-contracts.test.js tests/ao/doctor-local-state-source.test.js tests/ao/doctor-engine.test.js tests/ao/doctor-report.test.js tests/ao/doctor-runner.test.js tests/ao/ao-doctor-cli.test.js tests/ao/lifecycle-contracts.test.js tests/ao/lifecycle-engine.test.js tests/ao/lifecycle-report.test.js tests/ao/ao-lifecycle-cli.test.js
```

Expected:
- AO contract, engine, runner, and CLI suites pass on the new branch

- [ ] **Step 5: Smoke the AO commands directly**

Run:

```bash
node scripts/ao-reconcile.js --help
node scripts/ao-doctor.js --help
node scripts/ao-lifecycle.js --help
```

Expected:
- all three commands render help and exit cleanly

- [ ] **Step 6: Commit the AO slice**

```bash
git add package.json .agent-rules.md agent-orchestrator.yaml scripts/ao-reconcile.js scripts/ao-doctor.js scripts/ao-lifecycle.js scripts/ao/lib docs/setup/AO_RECONCILIATION_RUNBOOK.md docs/setup/AO_DOCTOR_RUNBOOK.md docs/setup/AO_LIFECYCLE_RUNBOOK.md tests/ao
git commit -m "feat(ao): re-land repo-local AO tooling on mainline"
```

## Chunk 3: Re-Land Durable Learning Idempotency

### Task 5: Port the durable idempotency schema and repository foundation

**Files:**
- Create or Modify: `supabase/migrations/20260324120000_create_learning_request_idempotency.sql`
- Create or Modify: `api/learning/lib/repositories/request-idempotency-repository.js`
- Modify: `api/learning/__tests__/schema-contract.test.js`
- Create or Modify: `api/learning/__tests__/request-idempotency-repository.test.js`

- [ ] **Step 1: Write the failing repository and schema expectations on the convergence branch**

Add or restore expectations for:
- `learning_request_idempotency` table presence
- stable request fingerprinting
- reservation / replay / conflict / finalize semantics

- [ ] **Step 2: Run the focused schema and repository tests to verify current failure**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/request-idempotency-repository.test.js
```

Expected:
- FAIL before porting the missing durable-idempotency slice

- [ ] **Step 3: Port the migration and repository implementation**

Implement:
- add the migration from the local line
- add the durable request-idempotency repository
- preserve any stronger `origin/main` learning-runtime contracts already present

- [ ] **Step 4: Re-run the focused schema and repository tests**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/request-idempotency-repository.test.js
```

Expected:
- PASS

### Task 6: Re-land session-create durable idempotency

**Files:**
- Modify: `api/learning/lib/session-runtime/session-service.js`
- Modify: `api/learning/lib/repositories/session-repository.js`
- Modify: `api/learning/__tests__/session-api.test.js`
- Modify: `api/learning/__tests__/session-repository.test.js`

- [ ] **Step 1: Restore failing session replay tests**

Cover:
- same-key same-payload replay
- same-key different-payload conflict
- stale pending recovery
- preallocated durable `session_id`

- [ ] **Step 2: Run the session-focused tests and verify failure**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/session-repository.test.js api/learning/__tests__/session-api.test.js
```

Expected:
- FAIL until session create uses the durable repository path

- [ ] **Step 3: Port session create durable replay logic**

Implement:
- durable reservation
- resource-ref persistence
- canonical response replay
- recovery from abandoned or completed reservation state

- [ ] **Step 4: Re-run the session-focused tests**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/session-repository.test.js api/learning/__tests__/session-api.test.js
```

Expected:
- PASS

### Task 7: Re-land question-import durable idempotency

**Files:**
- Modify: `api/learning/lib/import/question-import-service.js`
- Modify: `api/learning/lib/repositories/question-registry-repository.js`
- Modify: `api/learning/__tests__/question-import-service.test.js`
- Modify: `api/learning/__tests__/question-registry-repository.test.js`

- [ ] **Step 1: Restore failing import replay tests**

Cover:
- same-key same-payload replay
- same-key different-payload conflict
- stale pending recovery
- preallocated durable `question_id`

- [ ] **Step 2: Run the import-focused tests and verify failure**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/question-import-service.test.js
```

Expected:
- FAIL until question import uses the durable repository path

- [ ] **Step 3: Port question-import durable replay logic**

Implement:
- durable reservation
- resource-ref persistence
- canonical response replay
- recovery from abandoned or completed reservation state

- [ ] **Step 4: Re-run the import-focused tests**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/question-import-service.test.js
```

Expected:
- PASS

- [ ] **Step 5: Commit the durable idempotency slice**

```bash
git add supabase/migrations/20260324120000_create_learning_request_idempotency.sql api/learning/lib/repositories/request-idempotency-repository.js api/learning/lib/session-runtime/session-service.js api/learning/lib/import/question-import-service.js api/learning/lib/repositories/session-repository.js api/learning/lib/repositories/question-registry-repository.js api/learning/__tests__/request-idempotency-repository.test.js api/learning/__tests__/schema-contract.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/session-repository.test.js api/learning/__tests__/question-import-service.test.js api/learning/__tests__/question-registry-repository.test.js
git commit -m "feat(learning): re-land durable request idempotency on mainline"
```

## Chunk 4: Canonical Recovery Verification

### Task 8: Run the converged AO plus durable-idempotency verification baseline

**Files:**
- Modify: none unless glue fixes are required
- Test: focused AO and learning-runtime suites

- [ ] **Step 1: Run the AO verification baseline**

Run:

```bash
npm test -- --runInBand tests/ao/reconciliation-contracts.test.js tests/ao/ao-observation-source.test.js tests/ao/github-observation-source.test.js tests/ao/reconciliation-engine.test.js tests/ao/reconciliation-report.test.js tests/ao/reconciliation-runner.test.js tests/ao/ao-reconcile-cli.test.js tests/ao/doctor-contracts.test.js tests/ao/doctor-local-state-source.test.js tests/ao/doctor-engine.test.js tests/ao/doctor-report.test.js tests/ao/doctor-runner.test.js tests/ao/ao-doctor-cli.test.js tests/ao/lifecycle-contracts.test.js tests/ao/lifecycle-engine.test.js tests/ao/lifecycle-report.test.js tests/ao/ao-lifecycle-cli.test.js
```

Expected:
- PASS

- [ ] **Step 2: Run the durable-idempotency learning baseline**

Run:

```bash
npm test -- --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/request-idempotency-repository.test.js api/learning/__tests__/session-repository.test.js api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/session-api.test.js api/learning/__tests__/question-import-service.test.js
```

Expected:
- PASS

- [ ] **Step 3: Run one product sanity slice to prove mainline runtime behavior still stands**

Run:

```bash
npm test -- --runInBand src/pages/__tests__/legacy-entry-mode.test.js src/api/__tests__/learningRuntimeApi.test.js src/components/learning-runtime/__tests__/LearningSessionShell.test.js src/components/learning-runtime/__tests__/WorkspaceShell.test.js src/components/learning-runtime/__tests__/view-models.test.js
```

Expected:
- PASS

- [ ] **Step 4: Record the final branch topology**

Run:

```bash
git rev-list --left-right --count origin/main...HEAD
git status --short --branch
```

Expected:
- the new recovery branch is ahead of `origin/main` only by the explicit AO and idempotency commits

- [ ] **Step 5: Commit any final glue fixes**

```bash
git add -A
git commit -m "chore(converge): finalize mainline AO and idempotency recovery"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-27-mainline-convergence-ao-idempotency.md`. Ready to execute?
