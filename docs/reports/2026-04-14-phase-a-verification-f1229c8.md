# 2026-04-14 Phase A Verification on `f1229c8`

## Scope

Verification-only pass against clean upstream code at `origin/main@f1229c8` from worktree `/home/samsen/.worktrees/ciecopilot-home/cie-105`.

Authority docs read from the local root workspace, per AO clarification:

- `/home/samsen/code/ciecopilot-home/docs/reports/2026-04-11-ao-next-phase-execution-roadmap.md`
- `/home/samsen/code/ciecopilot-home/docs/reports/2026-04-12-phase-a-product-decision-record.md`

No product-code edits were made. The only tracked file rewrites came from the released-family gate script refreshing generated timestamps in its checked-in receipt and report.

## Verification Commands

### Branch-mismatch failure

```bash
node scripts/learning/run_event_pipeline_gate.js
```

Outcome:

- Failed with exit code `1`
- Error: `MODULE_NOT_FOUND`
- Cause: `scripts/learning/run_event_pipeline_gate.js` does not exist on `f1229c8`
- Classification: branch / handoff mismatch, not a runtime logic failure in an existing script

### Released-family gate

```bash
node scripts/learning/run_released_family_gate.js
```

Outcome:

- Passed with exit code `0`
- Rewrote:
  - `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`
  - `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`
- Observed gate result:
  - `status: pass`
  - `release_ready: true`
- Diff was timestamp-only:
  - `generated_at` updated from `2026-04-13T00:53:16.030Z` to `2026-04-14T02:06:45.000Z`

### Targeted API learning suites

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/question-analysis.test.js \
  api/learning/__tests__/question-import-service.test.js \
  api/learning/__tests__/question-registry-repository.test.js \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/p3-rubric-validator.test.js \
  api/learning/__tests__/released-scope.test.js
```

Outcome:

- Passed
- Test suites: `6 passed, 6 total`
- Tests: `33 passed, 33 total`

### Backfill verification

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  scripts/learning/__tests__/question-analysis-backfill.test.js
```

Outcome:

- Passed
- Test suites: `1 passed, 1 total`
- Tests: `3 passed, 3 total`

### Synthetic fixture contract

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  tests/marking/__tests__/ft-cao-fixtures-contract.test.js
```

Outcome:

- Passed
- Test suites: `1 passed, 1 total`
- Tests: `1 passed, 1 total`

### Imported question intake

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  src/components/learning-runtime/__tests__/ImportedQuestionIntake.test.js
```

Outcome:

- Passed
- Test suites: `1 passed, 1 total`
- Tests: `4 passed, 4 total`

## Product Questions Confirmed

### Low-confidence is fail-closed

Confirmed by code and test coverage:

- `api/learning/lib/question-analysis/low-confidence-posture.js`
  - `LOW_CONFIDENCE_THRESHOLD = 0.8`
  - low-band posture sets `authoritative_scoring_allowed: false`
  - low-band posture sets `fallback_reason_code: low_classification_confidence`
- `api/learning/lib/question-analysis/analysis-result-contract.js`
  - `buildQuestionAnalysisResult()` materializes `low_confidence_posture` for low-band classifications
- `api/learning/lib/contracts/released-scope.js`
  - `resolveReleasedScoringPosture()` routes through explicit fallback when release gates do not pass
- `api/learning/__tests__/released-scope.test.js`
  - low-confidence pilot classifications are asserted to remain `non_released_fallback`
- `api/learning/__tests__/question-analysis.test.js`
  - low-confidence posture is asserted on the analysis result itself

Conclusion:

- Low-confidence classification is explicit and fail-closed for authoritative scoring on this commit.

### `QuestionClassified` is emitted on the real import and backfill paths

Confirmed by code and tests:

- Import path:
  - `api/learning/lib/import/question-import-service.js` runs analysis and passes the materialized classification into registry persistence
  - `api/learning/lib/repositories/question-registry-repository.js` inserts the snapshot, appends `QuestionClassified`, and writes `evidence_source_event_ref`
  - `api/learning/__tests__/question-import-service.test.js` asserts the persisted `QuestionClassified` row and snapshot event ref
- Backfill path:
  - `scripts/learning/lib/question-analysis-backfill.js` inserts a new snapshot, appends `QuestionClassified`, and links the snapshot back to the emitted event
  - `scripts/learning/__tests__/question-analysis-backfill.test.js` asserts the emitted `QuestionClassified` row and updated question state

Conclusion:

- `QuestionClassified` is emitted on both the real import path and the real question-analysis backfill path on this commit.

## Residual Notes

- The only verification failure was the absent Phase 0 event-pipeline gate script named in the AO handoff. That script is not present on `f1229c8`, so it could not be evaluated in this worktree.
- No environment-limited failures occurred after local dependency installation with `npm ci`.
