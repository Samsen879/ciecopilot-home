# Subject Adapter Foundation

**Date:** 2026-03-25  
**Status:** frozen for issue #72  
**Depends on:** `核心项目文档/PRD.md`, `docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md`

## Goal

Freeze the runtime subject-adapter boundary before any second-subject rollout so the next subject does not inherit `9709` semantics by accident.

This issue does **not** ship a second subject. It freezes the contract and records which subject should be next.

## Runtime-Core-Owned Responsibilities

These remain in runtime core and must not move into subject adapters:

- Study-session lifecycle and typed `active_scope_bundle` persistence
- Workspace, artifact, and review-task repositories plus immutable lineage
- Reconciliation, idempotency, and generic learning HTTP/error envelopes
- Generic released-family evidence gates and conservative fallback invariants

The executable source of truth for this split lives in `api/learning/lib/subjects/subject-adapter-contract.js`.

## Adapter-Owned Responsibilities

Each subject adapter owns exactly four behavior surfaces:

### 1. Classification

- question family / question type semantics
- canonical import normalization
- subject-owned runtime context defaults

Executable hook:

- `classification.mergeCanonicalClassification(...)`

### 2. Marking

- subject interpretation of released scoring posture
- subject-specific rubric / uncertainty semantics above the core invariant

Executable hook:

- `marking.resolveReleasedScoringPosture(...)`

### 3. Mastery

- mastery signal allocation
- question-type vs family promotion semantics
- subject-specific conservative fallback behavior

Executable hook:

- `mastery.buildMasteryProjection(...)`

### 4. Review

- review trigger routing
- subject-specific scheduler semantics

Executable hook:

- `review.buildSchedulerSeed(...)`

## Frozen Runtime Posture

- `9709` is the only runtime-enabled adapter in this issue.
- `9702` is recorded as the selected next subject but remains disabled.
- Disabled adapters must fail explicitly instead of falling back to `9709` behavior.

This is enforced in `api/learning/lib/subjects/subject-adapter-registry.js` and covered by `api/learning/__tests__/subject-adapter-registry.test.js`.

## Integration Points Landed In This Issue

The subject adapter seam is now exercised in live runtime paths:

- imported-question intake uses adapter classification + marking posture
- learning effects use adapter marking + mastery semantics
- review-task generation uses adapter review scheduling semantics

The relevant tests are:

- `api/learning/__tests__/subject-adapter-registry.test.js`
- `api/learning/__tests__/question-import-service.test.js`
- `api/learning/__tests__/review-task-service.test.js`

## Second-Subject Decision

The selected next subject after `9709` is `9702` (Physics).

Rationale:

- it already has meaningful repo evidence across past papers, mark schemes, notes, and subject pages
- it exercises subject-specific semantics that math does not, which makes it a better test of the adapter contract
- choosing `9231` first would create a stronger temptation to copy math heuristics forward instead of proving the boundary

The evidence record is frozen in `docs/reports/learning_runtime_second_subject_decision_2026-03-25.md`.
