# Phase A Remediation Report

**Date:** 2026-04-13  
**Branch:** `task/phase-a-remediation`  
**Scope:** Close the approved Phase A truth gaps using only:

- `docs/reports/2026-04-11-ao-next-phase-execution-roadmap.md` section 8
- `docs/reports/2026-04-12-phase-a-product-decision-record.md`

## Gap Matrix

| Gap | Remediation | Evidence | Status |
| --- | --- | --- | --- |
| Pilot scope/runtime drift: runtime still treated trig family as the only authoritative slice | Import analysis, released-scope posture, UI options, and gate evidence were aligned to the 4 approved pilot question types | `api/learning/lib/import/question-import-service.js`, `src/components/learning-runtime/ImportedQuestionIntake.js`, `api/learning/__tests__/released-scope.test.js`, `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json` | Closed |
| Import path trusted caller-supplied classification | Added deterministic question-intelligence analysis for the approved pilot types and downgraded user input to `analysis_hints` only | `api/learning/lib/question-analysis/question-intelligence-service.js`, `api/learning/lib/validators/question-import-validator.js`, `api/learning/__tests__/question-analysis.test.js`, `api/learning/__tests__/question-import-service.test.js` | Closed |
| Low-confidence behavior was not explicit fail-closed posture | Persisted `low_confidence_posture` and kept low-confidence classifications out of authoritative scoring | `api/learning/lib/question-analysis/analysis-result-contract.js`, `api/learning/lib/question-analysis/runtime-validator.js`, `api/learning/__tests__/question-import-service.test.js`, `api/learning/__tests__/released-scope.test.js` | Closed |
| Real import path did not emit durable `QuestionClassified` events | Added question-scoped event persistence and linked snapshots back to the emitted event ref | `api/learning/lib/events/question-event-service.js`, `api/learning/lib/repositories/question-registry-repository.js`, `supabase/migrations/20260413110000_phase_a_question_classified_events.sql`, `api/learning/__tests__/question-registry-repository.test.js` | Closed |
| P3 executable rubric contract was missing | Added P3 contract types, JSON Schema validator, runtime validator, and pilot rubric templates for the 4 approved pilot question types | `api/learning/lib/marking/contracts/p3-rubric-template.schema.json`, `api/learning/lib/marking/contracts/p3-rubric-validator.js`, `data/learning_runtime/pilot_rubrics/*.json`, `api/learning/__tests__/p3-rubric-validator.test.js` | Closed |
| Snapshot schema and registry projection were incomplete for Phase A evidence | Persisted prerequisite topics, step skeleton summary, difficulty signal, audit metadata, provenance kind, and low-confidence posture through the registry projection | `supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql`, `supabase/migrations/20260413110000_phase_a_question_classified_events.sql`, `api/learning/__tests__/schema-contract.test.js` | Closed |
| No offline backfill for already-imported questions | Added a backfill library and CLI to analyze imported questions, create snapshots, emit `QuestionClassified`, and update `question_bank` | `scripts/learning/lib/question-analysis-backfill.js`, `scripts/learning/run_question_analysis_backfill.js`, `scripts/learning/__tests__/question-analysis-backfill.test.js` | Closed |
| Synthetic fixtures lacked approved provenance/persona contract | Added explicit synthetic provenance and the required persona coverage markers | `tests/marking/fixtures/ft_cao_fixtures.json`, `tests/marking/__tests__/ft-cao-fixtures-contract.test.js` | Closed |
| Released-family evidence overstated capability using metadata-only checks | Gate contract now validates executable pilot rubric templates and refreshed receipt/report match current runtime capability | `api/learning/lib/contracts/released-family-gate.js`, `data/learning_runtime/release_evidence/released-family-gate-contract.v1.json`, `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`, `docs/reports/learning_runtime_released_family_gate_2026-03-25.md` | Closed |

## Files Changed

Modified:

- `api/learning/__tests__/question-analysis.test.js`
- `api/learning/__tests__/question-import-service.test.js`
- `api/learning/__tests__/question-registry-repository.test.js`
- `api/learning/__tests__/schema-contract.test.js`
- `api/learning/lib/contracts/released-family-gate.js`
- `api/learning/lib/import/question-import-service.js`
- `api/learning/lib/question-analysis/analysis-result-contract.js`
- `api/learning/lib/question-analysis/runtime-validator.js`
- `api/learning/lib/repositories/question-registry-repository.js`
- `api/learning/lib/validators/question-import-validator.js`
- `data/learning_runtime/release_evidence/released-family-gate-contract.v1.json`
- `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`
- `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`
- `src/components/learning-runtime/ImportedQuestionIntake.js`
- `src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js`
- `tests/marking/fixtures/ft_cao_fixtures.json`

Added:

- `api/learning/__tests__/p3-rubric-validator.test.js`
- `api/learning/lib/events/question-event-service.js`
- `api/learning/lib/marking/contracts/p3-contract-types.d.ts`
- `api/learning/lib/marking/contracts/p3-rubric-template.schema.json`
- `api/learning/lib/marking/contracts/p3-rubric-validator.js`
- `api/learning/lib/question-analysis/question-intelligence-service.js`
- `data/learning_runtime/pilot_rubrics/9709.differential_equations.separable.json`
- `data/learning_runtime/pilot_rubrics/9709.integration.application.json`
- `data/learning_runtime/pilot_rubrics/9709.trigonometry.equations.json`
- `data/learning_runtime/pilot_rubrics/9709.trigonometry.identities.json`
- `docs/reports/2026-04-13-phase-a-remediation-report.md`
- `docs/superpowers/plans/2026-04-13-phase-a-remediation.md`
- `scripts/learning/__tests__/question-analysis-backfill.test.js`
- `scripts/learning/lib/question-analysis-backfill.js`
- `scripts/learning/run_question_analysis_backfill.js`
- `supabase/migrations/20260413110000_phase_a_question_classified_events.sql`
- `tests/marking/__tests__/ft-cao-fixtures-contract.test.js`

## Verification

Commands run and actual outcomes:

```bash
node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/question-analysis.test.js \
  api/learning/__tests__/question-registry-repository.test.js \
  api/learning/__tests__/question-import-service.test.js \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/p3-rubric-validator.test.js \
  api/learning/__tests__/released-scope.test.js \
  scripts/learning/__tests__/released-family-gate.test.js \
  scripts/learning/__tests__/question-analysis-backfill.test.js \
  tests/marking/__tests__/ft-cao-fixtures-contract.test.js \
  src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js
```

Outcome:

- First run failed before assertions due to a parse error in `scripts/learning/__tests__/question-analysis-backfill.test.js`.
- Root cause was malformed block terminators in the new test file.

```bash
node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand \
  scripts/learning/__tests__/question-analysis-backfill.test.js \
  tests/marking/__tests__/ft-cao-fixtures-contract.test.js
```

Outcome:

- Passed.
- Test suites: `2 passed, 2 total`
- Tests: `3 passed, 3 total`

```bash
node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/question-analysis.test.js \
  api/learning/__tests__/question-registry-repository.test.js \
  api/learning/__tests__/question-import-service.test.js \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/p3-rubric-validator.test.js \
  api/learning/__tests__/released-scope.test.js \
  scripts/learning/__tests__/released-family-gate.test.js \
  scripts/learning/__tests__/question-analysis-backfill.test.js \
  tests/marking/__tests__/ft-cao-fixtures-contract.test.js \
  src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js
```

Outcome:

- Passed.
- Test suites: `10 passed, 10 total`
- Tests: `42 passed, 42 total`

```bash
node scripts/learning/run_released_family_gate.js \
  --out-json data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json \
  --out-md docs/reports/learning_runtime_released_family_gate_2026-03-25.md
```

Outcome:

- Passed with exit code `0`
- Rewrote:
  - `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`
  - `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`
- Receipt status: `pass`
- `release_ready: true`

## Approved Requirements

Satisfied:

- 4 approved pilot question types are covered in runtime analysis and gate evidence:
  - `9709.trigonometry.identities`
  - `9709.trigonometry.equations`
  - `9709.integration.application`
  - `9709.differential_equations.separable`
- Low-confidence classification is explicit and fail-closed for authoritative scoring.
- Import now follows `question -> analyze -> snapshot -> QuestionClassified`.
- P3 pilot rubric template validation exists and is executed in tests and release gate.
- Offline backfill exists for imported questions without snapshots.
- Synthetic fixtures satisfy the approved persona and provenance contract.
- Released-family evidence now reflects executable runtime capability instead of metadata-only claims.

Unsatisfied:

- None identified within the approved Phase A remediation scope after focused verification.

## Question Event Boundary

This remediation keeps `QuestionClassified` in `learning_question_events` instead of forcing it into the earlier Phase 0 `learning_events` attempt pipeline.

Reason:

- The current branch does not contain the Phase 0 event infrastructure.
- The Phase 0 event design is attempt-scoped and keyed to attempt progression.
- Phase A classification occurs before an attempt exists and needs durable question-scoped lineage tied directly to `classification_snapshot_id`.

Constraint:

- This is not intended to create a second canonical attempt truth surface.
- The new table is deliberately narrow and only records question-classification lineage.
- If the Phase 0 event stack lands later with a compatible question-scoped contract, this surface can be converged intentionally instead of guessed into the attempt pipeline now.

## Residual Risks

- The question-intelligence path is deterministic and intentionally narrow to the 4 approved pilot question types; broader subject/family coverage still requires later work.
- `learning_question_events` is a temporary question-scoped boundary pending future convergence with Phase 0 event infrastructure if and when that lands on the same branch.
- Pilot rubric templates are executable and gated, but the human-review workflow for future template revisions is still outside this remediation branch.
