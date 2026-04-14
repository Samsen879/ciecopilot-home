# Phase A Reassessment Report

**Date:** 2026-04-14  
**Branch:** `task/phase-a-followup-runtime-rubric-landing-followup`  
**Scope:** Reassess current `main` against the frozen Phase A authority docs and the approved acceptance contract before making any further runtime changes.

## Very Short Brief

- Goal: confirm whether current `main` still has any real Phase A runtime/rubric landing gaps.
- Done: produce an evidence-backed gap matrix and rerun the focused verification suites that cover the approved Phase A contract.
- Non-goal: widen scope beyond the approved `9709` Phase A slice or reopen frozen contract semantics.

## Authority

- `docs/reports/2026-04-11-ao-next-phase-execution-roadmap.md`
- `docs/reports/2026-04-12-phase-a-product-decision-record.md`
- `docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md`

## Conclusion

Current `main` already satisfies the approved Phase A acceptance contract in the inspected runtime, schema, gate, and fixture surfaces. No missing runtime behavior was found for:

- the 4 approved pilot question types in authoritative runtime scope
- explicit fail-closed low-confidence posture
- real import-path `QuestionClassified`
- enriched analysis snapshots
- executable P3 rubric contracts
- validated `9709` pilot rubric package
- usable offline backfill
- synthetic fixture persona/provenance rules
- alignment across runtime, tests, gates, and receipts

This follow-up therefore lands as an auditable reassessment report, not as a runtime behavior change.

## Gap Matrix

| Requirement | Current evidence | Exact file/path | Missing behavior | Fix strategy | Verification plan |
| --- | --- | --- | --- | --- | --- |
| 4 pilot question types in authoritative runtime scope | Import/runtime posture resolves and tests pass for `9709.trigonometry.identities`, `9709.trigonometry.equations`, `9709.integration.application`, and `9709.differential_equations.separable` | `api/learning/lib/contracts/released-scope.js`<br>`api/learning/__tests__/released-scope.test.js`<br>`api/learning/__tests__/question-import-service.test.js` | None detected on current `main` | No runtime change required | Keep released-scope and import suites green |
| Explicit fail-closed low-confidence posture | `low_confidence_posture` is materialized and low-confidence classifications stay out of authoritative scoring | `api/learning/lib/question-analysis/low-confidence-posture.js`<br>`api/learning/lib/question-analysis/analysis-result-contract.js`<br>`api/learning/lib/contracts/released-scope-core.js`<br>`api/learning/__tests__/question-analysis.test.js`<br>`api/learning/__tests__/released-scope.test.js` | None detected on current `main` | No runtime change required | Re-run question-analysis and released-scope suites |
| Real import-path `QuestionClassified` aligned to snapshot | Import inserts the snapshot, appends `QuestionClassified`, links `evidence_source_event_ref`, and persists typed `classification_snapshot_ref` | `api/learning/lib/repositories/question-registry-repository.js`<br>`api/learning/lib/events/question-event-service.js`<br>`api/learning/__tests__/question-import-service.test.js`<br>`api/learning/__tests__/question-registry-repository.test.js` | None detected on current `main` | No runtime change required | Re-run import and repository suites |
| Enriched analysis snapshot fields | Phase A snapshot fields and registry projection include prerequisite topics, step skeleton, difficulty, audit metadata, provenance kind, and low-confidence posture | `supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql`<br>`supabase/migrations/20260413110000_phase_a_question_classified_events.sql`<br>`api/learning/__tests__/schema-contract.test.js` | None detected on current `main` | No schema change required | Re-run schema-contract suite |
| Landed P3 executable rubric contracts | JSON Schema + validator require executable P3 structures and all 4 pilot rubric templates validate | `api/learning/lib/marking/contracts/p3-rubric-template.schema.json`<br>`api/learning/lib/marking/contracts/p3-rubric-validator.js`<br>`data/learning_runtime/pilot_rubrics/*.json`<br>`api/learning/__tests__/p3-rubric-validator.test.js` | None detected on current `main` | No contract change required | Re-run P3 rubric validator suite |
| Validated `9709` pilot rubric package | Released-family gate contract/receipt pass for the released trig, integration, and differential-equations families and their approved question types | `api/learning/lib/contracts/released-family-gate.js`<br>`data/learning_runtime/release_evidence/released-family-gate-contract.v1.json`<br>`data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`<br>`scripts/learning/__tests__/released-family-gate.test.js` | None detected on current `main` | No gate change required | Re-run released-family gate suite |
| Usable offline backfill | Backfill analyzes imported questions, creates snapshots, emits `QuestionClassified`, and updates `question_bank`; force mode supersedes the active snapshot first | `scripts/learning/lib/question-analysis-backfill.js`<br>`scripts/learning/run_question_analysis_backfill.js`<br>`scripts/learning/__tests__/question-analysis-backfill.test.js` | None detected on current `main` | No backfill change required | Re-run backfill suite |
| Synthetic fixtures/personas/provenance | Required personas are present and every fixture is explicitly synthetic, development-only, and non-authoritative | `tests/marking/fixtures/ft_cao_fixtures.json`<br>`tests/marking/__tests__/ft-cao-fixtures-contract.test.js` | None detected on current `main` | No fixture change required | Re-run fixture contract suite |
| Alignment across runtime/tests/gates/receipts | Runtime code, focused tests, gate contract, and generated receipt all agree on the same Phase A slice | `api/learning/lib/import/question-import-service.js`<br>`api/learning/__tests__/question-import-service.test.js`<br>`scripts/learning/__tests__/released-family-gate.test.js`<br>`data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json` | None detected on current `main` | No behavior change required | Keep the same focused suites in regression/CI |

## Verification

This task worktree did not have a local `node_modules`, so the reassessment used the shared root dependency tree without mutating the branch.

Commands run and actual outcomes:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/released-scope.test.js \
  api/learning/__tests__/question-analysis.test.js \
  scripts/learning/__tests__/question-analysis-backfill.test.js \
  api/learning/__tests__/p3-rubric-validator.test.js
```

Outcome:

- Passed.
- Test suites: `4 passed, 4 total`
- Tests: `19 passed, 19 total`

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules \
node --experimental-vm-modules \
  /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  api/learning/__tests__/schema-contract.test.js \
  tests/marking/__tests__/ft-cao-fixtures-contract.test.js \
  scripts/learning/__tests__/released-family-gate.test.js \
  api/learning/__tests__/question-import-service.test.js \
  api/learning/__tests__/question-registry-repository.test.js
```

Outcome:

- Passed.
- Test suites: `5 passed, 5 total`
- Tests: `20 passed, 20 total`

```bash
git diff --check
```

Outcome:

- Passed with no diff hygiene errors.

## Notes

- `npm run workflow:baseline:sync` failed in the preserved root workspace because its local branch did not have upstream tracking configured.
- `npm run workflow:task:create -- --id phase-a-followup --slug runtime-rubric-landing-followup --base baseline/origin-main` still succeeded and created this task worktree from `baseline/origin-main`, so the reassessment artifact is on a compliant `task/*` branch.
