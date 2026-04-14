# Phase A Reassessment Report

**Date:** 2026-04-14  
**Branch:** `task/phase-a-followup-runtime-rubric-landing-followup`  
**Scope:** Reassess current `main` against the frozen Phase A authority docs and the approved acceptance boundary before making any further runtime changes.

## Very Short Brief

- Goal: confirm whether current `main` already satisfies the approved Phase A question-intelligence + P3 contract-landing boundary without claiming later runtime wiring is finished.
- Done: produce an evidence-backed gap matrix and rerun the focused verification suites that cover the approved Phase A contract surfaces.
- Non-goal: widen scope beyond the approved `9709` Phase A slice, reopen frozen contract semantics, or claim Phase C runtime orchestration is already landed.

## Authority

- `docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md`
- `docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md`
- `docs/superpowers/plans/2026-04-13-phase-a-remediation.md`
- `docs/reports/2026-04-13-phase-a-remediation-report.md`

## Conclusion

Current `main` already satisfies the approved Phase A contract-landing boundary for the inspected question-intelligence, schema, gate, fixture, and contract-package surfaces. The evidence on current `main` supports:

- the 4 approved pilot question types in authoritative released-scope posture
- explicit fail-closed low-confidence posture
- question-level `QuestionClassified` lineage aligned to analysis snapshots
- enriched analysis snapshots
- P3 types/schema/validator plus a validated `9709` pilot rubric package
- usable offline backfill
- synthetic fixture persona/provenance rules
- alignment across these Phase A contract surfaces, focused tests, gates, and receipts

This follow-up therefore lands as an auditable Phase A contract-landing reassessment report. It should not be read as proof that adapter-backed marking runtime execution, end-to-end marking integration, or full event-model unification already landed on `main`.

## Not Delivered Yet

- adapter registry / `adapter_method` dispatch execution layer
- end-to-end marking runtime integration from Phase A contracts into the later `AttemptSubmitted -> MarkingCompleted -> LearningUpdateProposed` chain
- question-vs-attempt `QuestionClassified` semantic unification

## Transition Debt Carried Forward

- `#11`: question-scoped `QuestionClassified` lineage is present for import and backfill, but it is not yet unified with the later attempt-pipeline semantics described for Phase C. Treat this as open Phase A -> C runtime-wiring debt, not as resolved by this close.
- `#12`: the P3 rubric package now carries executable contract structure, including `adapter_method` fields inside pilot templates, but current `main` does not land the adapter registry / dispatch execution layer that will own runtime marking. Treat this as open transition debt and an architectural clarification item before later Phase B/C marking pipeline work.

## Gap Matrix

| Requirement | Current evidence | Exact file/path | Missing behavior | Fix strategy | Verification plan |
| --- | --- | --- | --- | --- | --- |
| 4 pilot question types in authoritative released-scope posture | Import/released-scope posture resolves and tests pass for `9709.trigonometry.identities`, `9709.trigonometry.equations`, `9709.integration.application`, and `9709.differential_equations.separable` | `api/learning/lib/contracts/released-scope.js`<br>`api/learning/__tests__/released-scope.test.js`<br>`api/learning/__tests__/question-import-service.test.js` | None detected on current `main` within the approved Phase A slice | No Phase A change required | Keep released-scope and import suites green |
| Explicit fail-closed low-confidence posture | `low_confidence_posture` is materialized and low-confidence classifications stay out of authoritative scoring | `api/learning/lib/question-analysis/low-confidence-posture.js`<br>`api/learning/lib/question-analysis/analysis-result-contract.js`<br>`api/learning/lib/contracts/released-scope-core.js`<br>`api/learning/__tests__/question-analysis.test.js`<br>`api/learning/__tests__/released-scope.test.js` | None detected on current `main` within the approved Phase A contract boundary | No Phase A change required | Re-run question-analysis and released-scope suites |
| Question-level `QuestionClassified` aligned to snapshot | Import inserts the snapshot, appends question-level `QuestionClassified`, links `evidence_source_event_ref`, and persists typed `classification_snapshot_ref` | `api/learning/lib/repositories/question-registry-repository.js`<br>`api/learning/lib/events/question-event-service.js`<br>`api/learning/__tests__/question-import-service.test.js`<br>`api/learning/__tests__/question-registry-repository.test.js` | Attempt-pipeline semantic unification is not landed on current `main` | `#11`: carry this as Phase A -> C runtime-wiring debt | Re-run import and repository suites |
| Enriched analysis snapshot fields | Phase A snapshot fields and registry projection include prerequisite topics, step skeleton, difficulty, audit metadata, provenance kind, and low-confidence posture | `supabase/migrations/20260412103000_expand_learning_question_analysis_snapshots_phase_a.sql`<br>`supabase/migrations/20260413110000_phase_a_question_classified_events.sql`<br>`api/learning/__tests__/schema-contract.test.js` | None detected on current `main` within the approved Phase A schema scope | No schema change required | Re-run schema-contract suite |
| Landed P3 contract package | JSON Schema + validator require Phase A P3 structures, including `adapter_method` fields in the pilot templates, and all 4 pilot rubric templates validate | `api/learning/lib/marking/contracts/p3-rubric-template.schema.json`<br>`api/learning/lib/marking/contracts/p3-rubric-validator.js`<br>`data/learning_runtime/pilot_rubrics/*.json`<br>`api/learning/__tests__/p3-rubric-validator.test.js` | No adapter registry / `adapter_method` dispatch execution layer on current `main` | `#12`: keep this as later architectural/runtime wiring debt | Re-run P3 rubric validator suite |
| Validated `9709` pilot rubric package | Released-family gate contract/receipt pass for the released trig, integration, and differential-equations families and their approved question types | `api/learning/lib/contracts/released-family-gate.js`<br>`data/learning_runtime/release_evidence/released-family-gate-contract.v1.json`<br>`data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json`<br>`scripts/learning/__tests__/released-family-gate.test.js` | Gate receipts validate contract/package readiness, not end-to-end runtime marking execution | Keep the gate wording aligned to Phase A contract readiness only | Re-run released-family gate suite |
| Usable offline backfill | Backfill analyzes imported questions, creates snapshots, emits `QuestionClassified`, and updates `question_bank`; force mode supersedes the active snapshot first | `scripts/learning/lib/question-analysis-backfill.js`<br>`scripts/learning/run_question_analysis_backfill.js`<br>`scripts/learning/__tests__/question-analysis-backfill.test.js` | None detected on current `main` within the approved Phase A contract boundary | No backfill change required | Re-run backfill suite |
| Synthetic fixtures/personas/provenance | Required personas are present and every fixture is explicitly synthetic, development-only, and non-authoritative | `tests/marking/fixtures/ft_cao_fixtures.json`<br>`tests/marking/__tests__/ft-cao-fixtures-contract.test.js` | None detected on current `main` within the approved Phase A fixture scope | No fixture change required | Re-run fixture contract suite |
| Alignment across Phase A contract surfaces/tests/gates/receipts | Import path, focused tests, gate contract, and generated receipt all agree on the same Phase A question-intelligence + P3 contract slice | `api/learning/lib/import/question-import-service.js`<br>`api/learning/__tests__/question-import-service.test.js`<br>`scripts/learning/__tests__/released-family-gate.test.js`<br>`data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json` | These surfaces do not evidence end-to-end `AttemptSubmitted -> MarkingCompleted -> LearningUpdateProposed` runtime execution on current `main` | Carry forward as later Phase C runtime-wiring debt; no Phase A behavior change required | Keep the same focused suites in regression/CI |

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
- This report intentionally closes Phase A at the contract boundary described in the tracked runtime contract, pilot-slice execution plan, and Phase A remediation plan/report. Later runtime orchestration remains out of scope for this close.
