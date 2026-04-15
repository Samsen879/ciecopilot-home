# 2026-04-15 Question Search Slice V1 Report

## Scope

This report records the stage-3 structured question-search gate run for the `9709` pilot slice.
It reuses the stage-1 descriptor fallback contract and adds release-style retrieval metrics on top of the stage-2 question-search projection.

## Verification Matrix

| Command | Outcome |
| --- | --- |
| `npm run workflow:baseline:sync` | FAIL. The repo-local preflight hit the known root-worktree fetch/upstream problem and was treated as an environment note only. No root-worktree repair was attempted from this stage-3 branch. |
| `node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/schema-contract.test.js api/learning/__tests__/question-search-repository.test.js api/learning/__tests__/question-search-service.test.js api/learning/__tests__/question-search-api.test.js scripts/evaluation/__tests__/question-search-gate.test.js` | PASS. 5 suites, 19 tests. |
| `node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md` | FAIL with exit code `1`. The gate runner completed and wrote this report, but the current environment did not satisfy the paper-backed pinned cases or the release thresholds. |

## Commands

```bash
node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md
```

## Fixture

- Fixture path: `data/eval/question_search_gold_9709_v1.json`
- Generated at (UTC): `2026-04-15T08:37:18.743Z`
- Case count: `4`

| Case | Query | Summary Policy | Expected Source Kind |
| --- | --- | --- | --- |
| imported-fallback-browser-repair | topic=9709.codex_cli.browser_fixture.repair, q=1, type=9709.trigonometry.equations, text~2cos(2x)-3sin x | allow_null | imported_question |
| imported-fallback-browser-continuity | topic=9709.codex_cli.browser_fixture.continuity, q=2, type=9709.trigonometry.identities, text~tan^2 | allow_null | imported_question |
| paper-pin-s19-p1-q6 | topic=9709.p1.trigonometry, year=2019, session=s, paper=1, q=6, text~Prove trigonometric identity and solve equation | require_non_null | paper_question |
| paper-pin-s16-p3-q7 | topic=9709.p3.integration, year=2016, session=s, paper=3, q=7, text~Evaluate integral I using substitution | require_non_null | paper_question |

## Descriptor Source

Selected branch: `question_descriptions_v0_status_ok`

| Surface | Exists | Count | 9709 Detail |
| --- | --- | --- | --- |
| question_descriptions_prod_v1 | no | n/a | n/a |
| question_descriptions_v0 | yes | 0 | 0 |
| learning_question_search_projection_9709 | yes | 11 | paper_question: 0, imported_question: 11 |
| question_bank_9709 | yes | 11 | paper_question: 0, imported_question: 11 |
| curriculum_nodes_9709 | yes | 3 | topic_path::text like 9709.% |

## Case Results

| Case | Resolution / Query | Top Result | Exact Match | Metadata | Summary | Subject Leakage |
| --- | --- | --- | --- | --- | --- | --- |
| imported-fallback-browser-repair | topic=9709.codex_cli.browser_fixture.repair, q=1, type=9709.trigonometry.equations, text~2cos(2x)-3sin x | 0c100001-7a3e-4d82-9d7c-1f1000010201 | pass | 8/8 | n/a | no |
| imported-fallback-browser-continuity | topic=9709.codex_cli.browser_fixture.continuity, q=2, type=9709.trigonometry.identities, text~tan^2 | 0c100001-7a3e-4d82-9d7c-1f1000010202 | pass | 8/8 | n/a | no |
| paper-pin-s19-p1-q6 | topic_path_not_found | (none) | fail | 0/8 | missing | no |
| paper-pin-s16-p3-q7 | topic_path_not_found | (none) | fail | 0/8 | missing | no |

## Threshold Results

| Metric | Comparator | Required | Actual | Status |
| --- | --- | --- | --- | --- |
| exact_structured_match_rate | >= | 0.9 | 0.5 | fail |
| subject_leakage_rate | <= | 0 | 0 | pass |
| metadata_completeness_rate | >= | 0.95 | 0.5 | fail |
| null_summary_rate | <= | 0.05 | 1 | fail |

## Metrics

- exact_structured_match_rate: `0.5`
- subject_leakage_rate: `0`
- metadata_completeness_rate: `0.5`
- null_summary_rate: `1`
- gate_pass: `false`

## Outcome

- Code verification for the slice is green.
- The live structured-retrieval gate is red in the checked environment.
- The failure posture is data-contract specific rather than a runner crash:
  - imported fallback cases pass
  - paper-backed pinned cases fail because no `9709` paper-backed rows are present in `question_bank` or `learning_question_search_projection`
  - descriptor-backed summaries remain unavailable because the selected fallback source `question_descriptions_v0` has `0` `9709` rows and `question_descriptions_prod_v1` is absent

## Residual Risks

- The local 9709 question_bank slice has paper_question: 0, so paper-backed pinned cases cannot pass until seeded paper-backed rows exist.
- Descriptor surfaces are empty for 9709 in the checked environment, so summary-bearing paper-backed retrieval remains blocked by data posture rather than runner logic.
- learning_question_search_projection currently exposes paper_question: 0 for 9709, which means the gate is exercising imported fallback more than descriptor-backed retrieval.
- At least one pinned paper-backed topic_path could not be resolved from curriculum_nodes in the checked environment.
- The structured-retrieval gate is blocking release for this checked environment until the failing thresholds are addressed.
