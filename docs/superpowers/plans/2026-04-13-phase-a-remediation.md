# Phase A Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the approved Phase A truth gaps by replacing caller-trusted import classification with a real question-analysis path, persisting `QuestionClassified` events, landing executable P3 rubric contracts, and realigning gates, fixtures, and evidence with actual runtime capability.

**Architecture:** Keep the remediation inside the existing learning-runtime slice instead of introducing parallel infrastructure. Add a deterministic Phase A question-analysis layer that derives canonical classification from the prompt plus optional user hints, persist classification snapshots and `QuestionClassified` events through the question registry path, and make released-family evidence depend on executable pilot rubric templates rather than metadata-only rubric refs.

**Tech Stack:** Node ESM, Jest, Supabase/Postgres migrations, JSON Schema, React.

---

## Chunk 1: Question Analysis And Event Persistence

### Task 1: Replace caller-trusted import classification with analyzed results

**Files:**
- Create: `api/learning/lib/question-analysis/question-intelligence-service.js`
- Modify: `api/learning/lib/import/question-import-service.js`
- Modify: `api/learning/lib/validators/question-import-validator.js`
- Modify: `src/components/learning-runtime/ImportedQuestionIntake.js`
- Test: `api/learning/__tests__/question-import-service.test.js`
- Test: `api/learning/__tests__/question-analysis.test.js`
- Test: `src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js`

- [ ] **Step 1: Write failing tests for analyzer-driven classification and hint handling**
- [ ] **Step 2: Run the focused suites and verify the failures are about missing analyzer behavior**
- [ ] **Step 3: Implement a deterministic analyzer for the approved four pilot question types, using user context only as a non-canonical hint**
- [ ] **Step 4: Re-run the focused suites and verify the import path now derives classification from analysis output**

### Task 2: Persist real `QuestionClassified` events and align snapshot evidence refs

**Files:**
- Create: `api/learning/lib/events/question-event-service.js`
- Modify: `api/learning/lib/repositories/question-registry-repository.js`
- Modify: `supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql`
- Create: `supabase/migrations/20260413110000_phase_a_question_classified_events.sql`
- Test: `api/learning/__tests__/question-registry-repository.test.js`
- Test: `api/learning/__tests__/question-import-service.test.js`
- Test: `api/learning/__tests__/schema-contract.test.js`

- [ ] **Step 1: Write failing tests for `QuestionClassified` event insertion and snapshot event refs**
- [ ] **Step 2: Run the focused suites and verify the failures are about missing event persistence**
- [ ] **Step 3: Implement question event persistence and wire import to emit one event per persisted snapshot**
- [ ] **Step 4: Re-run the focused suites and verify event emission is durable and idempotent enough for import**

## Chunk 2: P3 Contracts, Backfill, And Evidence Alignment

### Task 3: Land executable P3 rubric contracts and validate pilot templates

**Files:**
- Create: `api/learning/lib/marking/contracts/p3-contract-types.d.ts`
- Create: `api/learning/lib/marking/contracts/p3-rubric-template.schema.json`
- Create: `api/learning/lib/marking/contracts/p3-rubric-validator.js`
- Create: `data/learning_runtime/pilot_rubrics/*.json`
- Modify: `api/learning/lib/contracts/released-family-gate.js`
- Test: `api/learning/__tests__/p3-rubric-validator.test.js`
- Test: `scripts/learning/__tests__/released-family-gate.test.js`

- [ ] **Step 1: Write failing tests for P3 schema validation and pilot rubric package coverage**
- [ ] **Step 2: Run the focused suites and verify they fail because the contracts do not exist yet**
- [ ] **Step 3: Implement the JSON Schema, runtime validator, and pilot rubric packages**
- [ ] **Step 4: Re-run the focused suites and verify the released-family gate now depends on executable P3 templates**

### Task 4: Add offline backfill, synthetic fixture provenance, and remediation evidence

**Files:**
- Create: `scripts/learning/lib/question-analysis-backfill.js`
- Create: `scripts/learning/run_question_analysis_backfill.js`
- Modify: `tests/marking/fixtures/ft_cao_fixtures.json`
- Create: `scripts/learning/__tests__/question-analysis-backfill.test.js`
- Create: `tests/marking/__tests__/ft-cao-fixtures-contract.test.js`
- Modify: `data/learning_runtime/release_evidence/released-family-gate-contract.v1.json`
- Modify: `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`
- Modify: `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`
- Create: `docs/reports/2026-04-13-phase-a-remediation-report.md`

- [ ] **Step 1: Write failing tests for offline backfill and synthetic fixture provenance/persona coverage**
- [ ] **Step 2: Run the focused suites and verify the failures match the missing approved requirements**
- [ ] **Step 3: Implement the backfill script, fixture contract, and evidence refresh**
- [ ] **Step 4: Re-run the focused suites and targeted evidence commands, then record actual outcomes in the remediation report**
