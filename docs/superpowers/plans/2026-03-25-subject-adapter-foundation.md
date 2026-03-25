# Subject Adapter Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze a runtime subject-adapter contract, route current `9709` behavior through it, and record an evidence-based second-subject decision without rolling out that second subject yet.

**Architecture:** Add a thin adapter registry above the frozen runtime/session contract and below subject-sensitive runtime behaviors. Keep session persistence, typed refs, reconciliation, artifact lifecycle, and queue state in runtime core; move classification, marking posture, mastery semantics, and review scheduling semantics behind per-subject adapters. Use a runtime-enabled `9709` adapter and a selected-but-disabled `9702` stub to make the boundary explicit.

**Tech Stack:** Node API handlers, Jest, existing learning-runtime/marking/review modules, Markdown docs.

---

## Chunk 1: Contract And Tests

### Task 1: Add failing tests for the adapter boundary and second-subject decision

**Files:**
- Create: `api/learning/__tests__/subject-adapter-registry.test.js`
- Modify: `api/learning/__tests__/question-import-service.test.js`
- Modify: `api/learning/__tests__/review-task-service.test.js`

- [ ] **Step 1: Write a failing registry test**
- [ ] **Step 2: Write failing service tests proving unsupported subjects do not silently reuse `9709` logic**
- [ ] **Step 3: Run focused Jest suites and confirm failure**

## Chunk 2: Adapter Registry Integration

### Task 2: Implement the subject-adapter contract and `9709`/`9702` registry entries

**Files:**
- Create: `api/learning/lib/subjects/subject-adapter-contract.js`
- Create: `api/learning/lib/subjects/subject-adapter-registry.js`

- [ ] **Step 1: Define adapter-owned vs runtime-core-owned responsibilities**
- [ ] **Step 2: Implement a runtime-enabled `9709` adapter using existing semantics**
- [ ] **Step 3: Implement a selected-next `9702` stub that fails explicitly instead of falling back to math defaults**

### Task 3: Route live runtime behavior through the adapter seam

**Files:**
- Modify: `api/learning/lib/import/question-import-service.js`
- Modify: `api/learning/lib/mastery/mastery-orchestrator.js`
- Modify: `api/learning/lib/review/review-task-service.js`

- [ ] **Step 1: Use adapter classification/marking in imported-question intake**
- [ ] **Step 2: Use adapter marking/mastery in learning effects orchestration**
- [ ] **Step 3: Use adapter review semantics when building review tasks**
- [ ] **Step 4: Run focused Jest suites and confirm green**

## Chunk 3: Evidence Artifact

### Task 4: Record the frozen contract and second-subject decision

**Files:**
- Create: `docs/superpowers/specs/2026-03-25-subject-adapter-foundation.md`
- Create: `docs/reports/learning_runtime_second_subject_decision_2026-03-25.md`

- [ ] **Step 1: Document core-owned vs adapter-owned runtime responsibilities**
- [ ] **Step 2: Summarize live repo evidence for `9702` and `9231`**
- [ ] **Step 3: Record the chosen subject and why the alternative was not chosen**

## Chunk 4: Verification And Delivery

### Task 5: Verify, commit, and open the PR

**Files:**
- Modify: current branch only

- [ ] **Step 1: Run focused verification commands and capture exact results**
- [ ] **Step 2: Rename branch to `feat/72`**
- [ ] **Step 3: Commit with a conventional message**
- [ ] **Step 4: Push and create a PR that closes #72**
