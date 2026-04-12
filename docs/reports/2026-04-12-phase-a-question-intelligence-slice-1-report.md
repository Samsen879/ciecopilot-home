# 2026-04-12 Phase A Question Intelligence Slice 1 Report

## Scope

This report records the restored delivery state for the Phase A slice-1 takeover on `task/20260412-phase-a-question-intelligence`.

The slice stays within the approved Phase A boundary:

- enrich imported-question classification snapshots with Phase A question-intelligence fields
- seed candidate rubric refs for the first released `9709` pilot types
- keep low-confidence classifications in explicit non-authoritative fallback posture
- preserve compatibility with the existing imported-question / `evaluate-v1` path

## Delivered Changes

Question-analysis contract and helpers were added under `api/learning/lib/question-analysis/`:

- `analysis-result-contract.js`
- `candidate-rubric-ref-resolver.js`
- `low-confidence-posture.js`
- `question-envelope-contract.js`
- `runtime-validator.js`

The import and registry write path now carry the Phase A analysis fields:

- `api/learning/lib/import/question-import-service.js`
- `api/learning/lib/repositories/question-registry-repository.js`
- `api/learning/lib/contracts/released-scope-core.js`

Schema and test coverage were extended for the slice:

- `supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql`
- `api/learning/__tests__/question-analysis.test.js`
- `api/learning/__tests__/question-import-service.test.js`
- `api/learning/__tests__/question-registry-repository.test.js`
- `api/learning/__tests__/released-scope.test.js`
- `api/learning/__tests__/schema-contract.test.js`

The follow-up CI repair for this slice preserved the established column order of
`learning_question_registry_projection` so migration replay can append the new
Phase A columns without breaking the existing view contract.

## Verification

Command run from the task worktree:

```bash
node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/question-registry-repository.test.js api/learning/__tests__/question-analysis.test.js api/learning/__tests__/released-scope.test.js api/learning/__tests__/question-import-service.test.js api/marking/__tests__/evaluate-v1.test.js
```

Observed result:

- `6` test suites passed
- `46` tests passed
- no snapshot changes

The takeover required two narrow repairs after restoring the branch state:

- `api/learning/__tests__/schema-contract.test.js` now matches the migration's intended nullable `confidence_band` constraint.
- `supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql` now preserves the original view column order and appends the new Phase A fields after the established projection columns.

## Residual Risks

- Verification is focused to the touched backend slice. No live Supabase migration push or browser flow was run in this takeover.
- Candidate rubric seeding remains intentionally limited to the approved pilot question types for Phase A.
- Low-confidence posture is guarded in tests, but downstream product handling of fallback diagnostics remains separate work.
