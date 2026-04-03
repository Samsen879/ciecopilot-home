# AO Phase 1 Entry And Topology Convergence Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge AO phase 1 onto a single canonical repo root, remove dated baseline bridge defaults from the formal entry path, and ship the migration docs needed to move the live repo root into the stable baseline posture.

**Architecture:** Treat `/home/samsen/code/ciecopilot-home` as the only canonical project root. Workflow commands and AO startup stay repo-local, while baseline becomes a stable branch posture rooted at `baseline/origin-main` instead of a separate official `.worktrees/baseline-*` entry directory. Implement with TDD: lock the new topology in tests first, then change config/scripts, then update docs and add the one-time migration runbook.

**Tech Stack:** Node 18 ESM, bash, Jest, git worktrees, markdown runbooks.

---

## Source Spec

- [AO Phase 1 Entry And Topology Convergence Design](/home/samsen/code/ciecopilot-home/.worktrees/task-20260402--ao-complete-state-roadmap/docs/superpowers/specs/2026-04-03-ao-phase1-entry-topology-design.md)

## File Map

### Entry and workflow implementation

- Modify: `agent-orchestrator.yaml`
- Modify: `scripts/ao/start-clean.sh`
- Modify: `package.json`
- Modify: `scripts/workflow/cli.js`
- Modify: `scripts/workflow/lib/workflow-helper.js`

### Tests

- Modify: `scripts/workflow/__tests__/workflow-helper.test.js`
- Modify: `scripts/workflow/__tests__/workflow-scripts.test.js`
- Create: `tests/ao/entry-topology-contract.test.js`

### Documentation

- Modify: `docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md`
- Modify: `docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md`
- Modify: `docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md`
- Modify: `docs/setup/ENGINEERING_LOCAL_GUARDRAILS_V1_1.md`
- Create: `docs/setup/AO_ROOT_BASELINE_MIGRATION_RUNBOOK.md`

## Chunk 1: Lock The New Canonical-Root Contract In Tests

### Task 1: Rewrite workflow tests to expect stable root-baseline semantics

**Files:**
- Modify: `scripts/workflow/__tests__/workflow-helper.test.js`
- Modify: `scripts/workflow/__tests__/workflow-scripts.test.js`
- Test: `scripts/workflow/__tests__/workflow-helper.test.js`
- Test: `scripts/workflow/__tests__/workflow-scripts.test.js`

- [ ] **Step 1: Write failing helper expectations for stable baseline defaults**

Update the helper and script tests so they expect:

```js
const BASELINE_WORKTREE_NAME = 'baseline-origin-main';
const BASELINE_BRANCH_NAME = 'baseline/origin-main';
```

and root-based sync / closeout commands such as:

```js
expect(plan.commands).toEqual([
  'git -C /repo fetch origin --prune',
  'git -C /repo pull --ff-only',
]);
```

for baseline sync, plus closeout expectations that no longer pull from `/repo/.worktrees/baseline-origin-main-20260402`.

- [ ] **Step 2: Run the workflow tests and verify they fail for the current dated defaults**

Run:

```bash
npm test -- --runInBand scripts/workflow/__tests__/workflow-helper.test.js scripts/workflow/__tests__/workflow-scripts.test.js
```

Expected:
- FAIL because the current defaults still reference `baseline-origin-main-20260402`
- FAIL because closeout / sync plans still target a separate baseline worktree

- [ ] **Step 3: Commit the red test changes**

```bash
git add scripts/workflow/__tests__/workflow-helper.test.js scripts/workflow/__tests__/workflow-scripts.test.js
git commit -m "test: lock phase1 workflow root topology"
```

### Task 2: Add a failing contract test for the entry topology surface

**Files:**
- Create: `tests/ao/entry-topology-contract.test.js`
- Test: `tests/ao/entry-topology-contract.test.js`

- [ ] **Step 1: Write a contract test that reads the real repo files**

Create a focused contract test that checks:

```js
expect(configText).toContain('path: /home/samsen/code/ciecopilot-home');
expect(configText).not.toContain('Temporary bridge');
expect(configText).not.toContain('baseline-origin-main-20260402');
expect(startCleanText).not.toContain('.worktrees/baseline-origin-main-20260402');
expect(packageJson.scripts['git:hooks:install']).toBe('bash scripts/git-hooks/install.sh');
expect(packageJson.scripts['workflow:baseline:sync']).toBe('bash scripts/workflow/baseline-sync.sh');
```

Use plain file reads and string assertions; do not add a YAML parser dependency for this contract.

- [ ] **Step 2: Run the contract test and verify it fails for the current bridge configuration**

Run:

```bash
npm test -- --runInBand tests/ao/entry-topology-contract.test.js
```

Expected:
- FAIL because `agent-orchestrator.yaml` still points at `.worktrees/baseline-origin-main-20260402`
- FAIL because `scripts/ao/start-clean.sh` still contains bridge fallback candidates

- [ ] **Step 3: Commit the red contract test**

```bash
git add tests/ao/entry-topology-contract.test.js
git commit -m "test: add AO phase1 entry topology contract"
```

## Chunk 2: Implement The Canonical-Root Entry Model

### Task 3: Update workflow helpers and CLI defaults to sync the repo root baseline

**Files:**
- Modify: `scripts/workflow/lib/workflow-helper.js`
- Modify: `scripts/workflow/cli.js`
- Test: `scripts/workflow/__tests__/workflow-helper.test.js`
- Test: `scripts/workflow/__tests__/workflow-scripts.test.js`

- [ ] **Step 1: Implement stable baseline defaults**

Change the CLI defaults to:

```js
const DEFAULT_BASELINE_WORKTREE_NAME = 'baseline-origin-main';
const DEFAULT_BASELINE_BRANCH_NAME = 'baseline/origin-main';
```

and remove the assumption that the canonical baseline sync target is a separate dated worktree.

- [ ] **Step 2: Make baseline sync and closeout operate on the repo root posture**

Implement helper / CLI behavior so:

```js
buildBaselineSyncPlan({ repoRoot })
```

produces repo-root commands, and task closeout finishes with repo-root fetch + fast-forward pull instead of a pull inside `.worktrees/baseline-*`.

Keep task worktree creation in `.worktrees/task-*`; only the baseline sync target changes.

- [ ] **Step 3: Re-run the workflow test slice and verify it turns green**

Run:

```bash
npm test -- --runInBand scripts/workflow/__tests__/workflow-helper.test.js scripts/workflow/__tests__/workflow-scripts.test.js
```

Expected:
- PASS
- no assertion still references `baseline-origin-main-20260402`

- [ ] **Step 4: Commit the workflow implementation**

```bash
git add scripts/workflow/lib/workflow-helper.js scripts/workflow/cli.js scripts/workflow/__tests__/workflow-helper.test.js scripts/workflow/__tests__/workflow-scripts.test.js
git commit -m "feat: converge workflow baseline defaults on repo root"
```

### Task 4: Remove AO bridge behavior from the formal startup/configuration path

**Files:**
- Modify: `agent-orchestrator.yaml`
- Modify: `scripts/ao/start-clean.sh`
- Modify: `tests/ao/entry-topology-contract.test.js`
- Test: `tests/ao/entry-topology-contract.test.js`

- [ ] **Step 1: Point the orchestrator config at the canonical repo root**

Update:

```yaml
projects:
  ciecopilot-home:
    path: /home/samsen/code/ciecopilot-home
```

Remove the temporary bridge comment and replace any dated baseline creation guidance with stable `baseline/origin-main` language.

- [ ] **Step 2: Strip bridge fallback from `start-clean.sh`**

Remove the `.worktrees/baseline-origin-main-20260402/**` candidate arrays so startup only looks for repo-local:

```bash
$repo_root/scripts/git-hooks/install.sh
$repo_root/scripts/workflow/baseline-sync.sh
```

Update the skip/error messages to describe missing repo-local formal scripts, not a missing baseline bridge.

- [ ] **Step 3: Re-run the entry topology contract test and verify it passes**

Run:

```bash
npm test -- --runInBand tests/ao/entry-topology-contract.test.js
```

Expected:
- PASS
- `agent-orchestrator.yaml` no longer contains `.worktrees/baseline-origin-main-20260402`
- `scripts/ao/start-clean.sh` no longer contains bridge fallback candidates

- [ ] **Step 4: Smoke the dry-run startup contract**

Run:

```bash
npm run ao:start:clean:dry
```

Expected:
- output stays repo-local
- no printed command contains `.worktrees/baseline-origin-main-20260402`

- [ ] **Step 5: Commit the entry-surface convergence**

```bash
git add agent-orchestrator.yaml scripts/ao/start-clean.sh tests/ao/entry-topology-contract.test.js
git commit -m "feat: remove AO entry bridge defaults"
```

## Chunk 3: Converge Documentation And Ship The Migration Runbook

### Task 5: Rewrite operator docs to use repo root as the only formal entry

**Files:**
- Modify: `docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md`
- Modify: `docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md`
- Modify: `docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md`
- Modify: `docs/setup/ENGINEERING_LOCAL_GUARDRAILS_V1_1.md`

- [ ] **Step 1: Replace dated baseline-entry examples with repo-root entry examples**

Update command examples to use:

```bash
cd /home/samsen/code/ciecopilot-home
```

and rewrite the narrative so baseline means the root branch posture plus task worktree creation base, not an official `.worktrees/baseline-*` entry directory.

- [ ] **Step 2: Keep historical context but remove official-entry language**

Where the docs still need to mention `baseline-origin-main-20260402`, frame it explicitly as migration history only, not as the live default path.

- [ ] **Step 3: Diff the docs to confirm the new operator story is consistent**

Run:

```bash
git diff -- docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md docs/setup/ENGINEERING_LOCAL_GUARDRAILS_V1_1.md
```

Expected:
- examples consistently start from the repo root
- no doc still instructs operators to enter `.worktrees/baseline-origin-main-20260402` for normal operation

- [ ] **Step 4: Commit the doc convergence**

```bash
git add docs/setup/ENGINEERING_WORKFLOW_GOVERNANCE_V1.md docs/setup/ENGINEERING_WORKFLOW_AUTOMATION_V1_2.md docs/setup/ENGINEERING_TASK_WORKFLOW_SOP.md docs/setup/ENGINEERING_LOCAL_GUARDRAILS_V1_1.md
git commit -m "docs: converge AO phase1 operator entry docs"
```

### Task 6: Add the one-time root baseline migration runbook and run the final verification slice

**Files:**
- Create: `docs/setup/AO_ROOT_BASELINE_MIGRATION_RUNBOOK.md`
- Test: `tests/ao/entry-topology-contract.test.js`
- Test: `scripts/workflow/__tests__/workflow-helper.test.js`
- Test: `scripts/workflow/__tests__/workflow-scripts.test.js`

- [ ] **Step 1: Write the migration runbook**

Document the one-time live-repo switch from:

- root on `baseline/origin-main-20260330`
- historical clean entry at `.worktrees/baseline-origin-main-20260402`

to:

- root on `baseline/origin-main`
- repo-local hooks / workflow / AO startup

The runbook must explicitly cover:

- how to inspect or preserve current root dirty changes
- how to create or rename the stable baseline branch
- how to switch the root safely
- how to treat old dated baseline worktrees and branches after migration

- [ ] **Step 2: Run the focused verification matrix**

Run:

```bash
npm test -- --runInBand tests/ao/entry-topology-contract.test.js scripts/workflow/__tests__/workflow-helper.test.js scripts/workflow/__tests__/workflow-scripts.test.js
npm run ao:start:clean:dry
rg -n 'baseline-origin-main-20260402|baseline/origin-main-20260402' agent-orchestrator.yaml scripts/ao/start-clean.sh scripts/workflow docs/setup package.json
```

Expected:
- targeted tests PASS
- dry-run output stays repo-local
- `rg` only finds historical references that are intentionally preserved outside the live entry surface, or returns no matches in the touched operator docs and config

- [ ] **Step 3: Commit the migration runbook and final convergence**

```bash
git add docs/setup/AO_ROOT_BASELINE_MIGRATION_RUNBOOK.md
git commit -m "docs: add AO root baseline migration runbook"
```
