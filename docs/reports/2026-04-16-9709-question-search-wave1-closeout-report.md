# 9709 Question Search Wave 1 Closeout Report

Date: 2026-04-16
Issue: `#203`
Depends on: `#202`
Status: gate rerun complete; release posture remains red

## Scope

This report closes the wave-1 recovery sequence by rerunning the focused question-search verification surfaces against the recovered `9709` pilot and recording the actual release evidence.

It does not claim success beyond what the current data proves. No feature code was changed in this issue.

## Evidence Inputs

- `docs/reports/2026-04-15-9709-question-bank-data-recovery-report.md`
- `docs/reports/2026-04-16-9709-qwen-wave1-execution-report.md`
- `docs/reports/2026-04-16-9709-qwen-wave1-qc-stats.json`
- `docs/reports/2026-04-16-9709-qwen-wave1-spot-check.json`

## Commands

Attempted focused Jest command from the issue:

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/question-search-repository.test.js \
  api/learning/__tests__/question-search-service.test.js \
  api/learning/__tests__/question-search-api.test.js \
  scripts/evaluation/__tests__/question-search-gate.test.js
```

Observed result:

- failed immediately with `MODULE_NOT_FOUND` because this AO worktree does not have a local `node_modules/` tree

Executed equivalent focused Jest command from the sibling shared install:

```bash
node --experimental-vm-modules ../cie-135/node_modules/jest/bin/jest.js --runInBand \
  api/learning/__tests__/schema-contract.test.js \
  api/learning/__tests__/question-search-repository.test.js \
  api/learning/__tests__/question-search-service.test.js \
  api/learning/__tests__/question-search-api.test.js \
  scripts/evaluation/__tests__/question-search-gate.test.js
```

Observed result:

- `5` suites passed
- `20` tests passed

Live gate rerun:

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report output/2026-04-16-9709-question-search-gate-rerun.md \
  --json-out output/2026-04-16-9709-question-search-gate-rerun.json
```

Observed result:

- exit code `1`
- `exact_structured_match_rate=0.5`
- `subject_leakage_rate=0`
- `metadata_completeness_rate=0.5`
- `null_summary_rate=1`
- `descriptor_source=question_descriptions_v0_status_ok`
- failing metrics: `exact_structured_match_rate`, `metadata_completeness_rate`, `null_summary_rate`

Database posture checks:

```bash
psql "$DATABASE_URL" \
  -c "select source_kind, count(*) from public.question_bank where subject_code = '9709' group by 1 order by 1;" \
  -c "select source_kind, count(*) from public.learning_question_search_projection where subject_code = '9709' group by 1 order by 1;" \
  -c "select status, count(*) from public.question_descriptions_v0 where syllabus_code = '9709' group by 1 order by 1;" \
  -c "select count(*) as qd_9709_ok from public.question_descriptions_v0 where syllabus_code = '9709' and status = 'ok';" \
  -c "select topic_path::text from public.curriculum_nodes where syllabus_code = '9709' and version_tag = '2025-2027_v1' order by 1;"
```

Projection hydration probe:

```bash
psql "$DATABASE_URL" \
  -c "select count(*) as paper_rows, count(*) filter (where year is null) as year_null, count(*) filter (where session is null) as session_null, count(*) filter (where paper_number is null) as paper_number_null, count(*) filter (where summary is null or btrim(summary) = '') as summary_blank, count(*) filter (where search_text is null or btrim(search_text) = '') as search_text_blank from public.learning_question_search_projection where subject_code='9709' and source_kind='paper_question';" \
  -c "select storage_key, source_kind, subject_code, year, session, paper_number, q_number, summary, search_text from public.learning_question_search_projection where storage_key in ('9709/s19_qp_11/questions/q06.png','9709/s16_qp_33/questions/q07.png') order by storage_key;" \
  -c "select storage_key, source_kind, subject_code, paper_scope, q_number, prompt_representation, provenance_summary, primary_topic_id::text from public.question_bank where storage_key in ('9709/s19_qp_11/questions/q06.png','9709/s16_qp_33/questions/q07.png') order by storage_key;"
```

Wave-1 evidence rollup:

```bash
node - <<'NODE'
const fs = require('fs');
const rows = JSON.parse(fs.readFileSync('docs/reports/2026-04-16-9709-qwen-wave1-pilot-results.json','utf8'));
const getEvidence = (row, field) => (row.output?.evidence || []).find((entry) => entry.field === field)?.value;
const summary = {
  total_rows: rows.length,
  review_lane: rows.filter((row) => row.route === 'review_lane').length,
  review_bucket: rows.filter((row) => row.lane === 'review').length,
  warnings_requires_review: rows.filter((row) => (row.output?.warnings || []).includes('requires_review')).length,
  evidence_requires_review_true: rows.filter((row) => getEvidence(row, 'requires_review') === true).length,
  evidence_requires_review_false: rows.filter((row) => getEvidence(row, 'requires_review') === false).length,
  summary_present: rows.filter((row) => typeof row.output?.summary === 'string' && row.output.summary.trim() !== '').length,
  summary_missing: rows.filter((row) => !(typeof row.output?.summary === 'string' && row.output.summary.trim() !== '')).length,
  confidence_zero: rows.filter((row) => Number(row.confidence) === 0).length,
};
console.log(JSON.stringify(summary, null, 2));
NODE

node - <<'NODE'
const fs = require('fs');
const spot = JSON.parse(fs.readFileSync('docs/reports/2026-04-16-9709-qwen-wave1-spot-check.json','utf8'));
const count = (field) => spot.records.reduce((acc, row) => {
  const key = row.review?.[field] ?? 'null';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify({
  sample_size: spot.sample_size,
  descriptor_readiness: count('descriptor_readiness'),
  route_verdict: count('route_verdict'),
  review_bucket_verdict: count('review_bucket_verdict')
}, null, 2));
NODE
```

## Focused Verification Outcome

| Surface | Outcome |
| --- | --- |
| schema contract | pass |
| repository slice | pass |
| service slice | pass |
| API slice | pass |
| gate runner unit slice | pass |
| live `9709` gate | fail |

## Current Data Posture

| Surface | Count / Outcome |
| --- | --- |
| `question_bank` `9709` imported rows | `11` |
| `question_bank` `9709` paper-backed rows | `17` |
| `learning_question_search_projection` `9709` imported rows | `11` |
| `learning_question_search_projection` `9709` paper-backed rows | `17` |
| `question_descriptions_v0` `9709` rows by status | none present |
| `question_descriptions_v0` `9709` `status='ok'` rows | `0` |
| `curriculum_nodes` `9709` rows for `2025-2027_v1` | `9` total |
| `curriculum_nodes` descendant rows counted by the gate (`9709.%`) | `8` |

## Gate Result

Case-level outcome:

| Case | Source Expectation | Total Results | Exact Match | Metadata | Summary |
| --- | --- | --- | --- | --- | --- |
| `imported-fallback-browser-repair` | `imported_question` | `1` | pass | `8/8` | n/a |
| `imported-fallback-browser-continuity` | `imported_question` | `1` | pass | `8/8` | n/a |
| `paper-pin-s19-p1-q6` | `paper_question` | `0` | fail | `0/8` | missing |
| `paper-pin-s16-p3-q7` | `paper_question` | `0` | fail | `0/8` | missing |

Threshold outcome:

| Metric | Required | Actual | Status |
| --- | --- | --- | --- |
| `exact_structured_match_rate` | `>= 0.9` | `0.5` | fail |
| `subject_leakage_rate` | `<= 0` | `0` | pass |
| `metadata_completeness_rate` | `>= 0.95` | `0.5` | fail |
| `null_summary_rate` | `<= 0.05` | `1` | fail |

## Why The Gate Is Still Red

Recovery `#202` fixed the original topic-path/data-absence blocker:

- the pinned `paper_question` rows now exist in `question_bank`
- the projection now exposes `17` `paper_question` rows
- the required `9709.p1.trigonometry` and `9709.p3.integration` curriculum nodes resolve cleanly

The current blocker moved downstream into projection completeness:

- all `17/17` `paper_question` projection rows still have `year = null`
- all `17/17` `paper_question` projection rows still have `session = null`
- all `17/17` `paper_question` projection rows still have `paper_number = null`
- all `17/17` `paper_question` projection rows still have blank `summary`
- all `17/17` `paper_question` projection rows still have blank `search_text`

The pinned rows show the split clearly:

- `question_bank` preserves `paper_scope` with `year`, `session`, `paper`, and `q_number`
- `learning_question_search_projection` keeps `q_number` and topic linkage, but drops `year`, `session`, `paper_number`, `summary`, and `search_text`

Because the live gate queries include structured paper filters plus free text, both pinned paper cases now fail as `0`-result searches instead of the earlier `topic_path_not_found` failure.

## Carried-Forward Wave-1 Descriptor Evidence

The descriptor posture from the checked-in wave-1 run still does not justify a soft pass:

| Evidence Surface | Count / Outcome |
| --- | --- |
| pilot rows | `17` |
| route `review_lane` | `17` |
| lane `review` | `17` |
| rows with `requires_review` warning | `17` |
| rows where evidence itself says `requires_review=true` | `1` |
| rows where evidence says `requires_review=false` | `16` |
| rows with non-empty summary | `1` |
| rows with missing summary | `16` |
| rows with `confidence=0.0` | `16` |
| spot-check `descriptor_readiness.review_bucket` | `17` |
| spot-check `route_verdict.appropriate` | `11` |
| spot-check `route_verdict.over_conservative` | `6` |
| spot-check `review_bucket_verdict.correct` | `8` |
| spot-check `review_bucket_verdict.cannot_judge` | `7` |
| spot-check `review_bucket_verdict.incorrect` | `2` |

Interpretation:

- wave-1 proved the pilot can be executed deterministically on real assets
- wave-1 did not produce descriptor-ready text for the gate to consume
- even if the projection had the paper metadata hydrated, the current descriptor surface would still fail the gate's summary threshold

## Residual Risks

- the paper-backed projection contract is incomplete for recovered rows; `year`, `session`, `paper_number`, `summary`, and `search_text` are all blank on `17/17` paper rows
- the selected descriptor branch is still `question_descriptions_v0_status_ok` with `0` usable `9709` rows
- the wave-1 lane evidence is internally inconsistent: route/warnings require review on all `17` rows, but evidence-level `requires_review` is false on `16`
- the current gate is still dominated by imported fallback success, not paper-backed descriptor retrieval

## Final Release Posture

The deterministic `9709` pilot is **not** green enough for the structured question-search gate.

Truthful closeout answer:

- focused question-search verification surfaces: green
- recovered pilot data presence: improved but incomplete
- live question-search gate: red
- release recommendation: **do not promote**

No soft-pass is justified from the current evidence. The correct posture is to preserve failure until the paper-backed projection is hydrated with real structured paper metadata and descriptor-bearing search text, then rerun the gate.
