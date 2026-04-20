# 9709 Wave A Closeout Report

Date: 2026-04-20
Issue: `#249`
PR: `#250`
Status: closeout complete; recommendation remains red

## Scope

This report aggregates the three repaired Wave A shard executions, reruns the final verification surfaces, and records the only honest binary recommendation for what should happen next.

It does not widen scope beyond Wave A. It does not start Wave B implementation.

## Evidence Inputs

- `docs/reports/2026-04-19-9709-wave-a-shard1-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`
- `/tmp/9709-wave-a-baseline-final.json`
- `docs/reports/2026-04-19-9709-wave-a-closeout-gate.json`

## Final Checks

Final baseline fixture rerun:

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/9709-wave-a-baseline-final.md \
  --json-out /tmp/9709-wave-a-baseline-final.json \
  --psql-mode docker
```

Observed result:

- exit `0`
- `exact_structured_match_rate = 1`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 1`
- `null_summary_rate = 0`
- `gate_pass = true`

Final Wave A probe fixture rerun:

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_wave_a_v1.json \
  --report docs/reports/2026-04-19-9709-wave-a-closeout-gate-report.md \
  --json-out docs/reports/2026-04-19-9709-wave-a-closeout-gate.json \
  --psql-mode docker
```

Observed result:

- exit `1`
- `exact_structured_match_rate = 0.5556`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 0.5556`
- `null_summary_rate = 0.4444`
- `gate_pass = false`

## Manifest Posture

- manifest id: `9709_question_search_expansion_wave_a_v1`
- manifest digest: `3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b`
- thresholds digest: `19f8a6f9b29b16ce2a358faea1da710edce16d41e720f6f7994f68d14f2cec06`
- total Wave A rows: `30`
- per-bucket counts:
  - `9709.p1.trigonometry = 10`
  - `9709.p3.integration = 10`
  - `9709.p3.trigonometry = 10`
- per-shard counts:
  - `shard_1 = 10`
  - `shard_2 = 10`
  - `shard_3 = 10`

## Route Distribution

- total `ocr_lane` rows: `21`
- total `review_lane` rows: `9`
- total `diagram_lane` rows: `0`
- review-lane utilization: `9 / 30 = 0.3`

## Shard Results

- `shard_1`
  - `provider_failures = 0`
  - `gate_pass = true`
  - `projection_pass = true`
  - `current_shard_projection_completeness = 1`
  - `current_shard_queryability = 1`
  - `full_review_acceptance = 0.9`
  - `verdict = pass`
  - bounded follow-up: `9709/s16_qp_32/questions/q03.png`
- `shard_2`
  - `provider_failures = 0`
  - `gate_pass = true`
  - `projection_pass = true`
  - `current_shard_projection_completeness = 1`
  - `current_shard_queryability = 1`
  - `full_review_acceptance = 0.9`
  - `verdict = pass`
  - bounded follow-ups: `9709/m24_qp_12/questions/q04.png`, `9709/w16_qp_13/questions/q03.png`
- `shard_3`
  - `provider_failures = 0`
  - `gate_pass = true`
  - `projection_pass = true`
  - `current_shard_projection_completeness = 1`
  - `current_shard_queryability = 1`
  - `full_review_acceptance = 0.9`
  - `verdict = pass`
  - bounded follow-up: `9709/s22_qp_13/questions/q02.png`

## Paper-Backed Hydration Completeness

Wave A succeeded on its own hydration contract:

- `30 / 30` targeted rows completed lane execution without provider failure
- `30 / 30` targeted rows hydrated into the projection with current-shard completeness `1`
- `30 / 30` targeted rows passed current-shard direct queryability checks
- duplicate projection rows across all three shard audits: `0`

That means the Wave A write surfaces are internally consistent for the rows that were selected.

## Baseline Gate Result

The baseline `9709` fixture remains green after the full Wave A sequence:

- `exact_structured_match_rate = 1`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 1`
- `null_summary_rate = 0`
- selected descriptor branch: `question_descriptions_v0_status_ok`

Wave A did not regress the previously stabilized baseline.

## Wave A Probe Result

The final aggregate Wave A probe is not green enough for Wave B:

- pass cases: `5 / 9`
- failing cases: `4 / 9`
- failing case ids:
  - `wave-a-gate-04`
  - `wave-a-gate-07`
  - `wave-a-gate-08`
  - `wave-a-gate-09`
- failing buckets:
  - `9709.p3.integration`
  - `9709.p3.trigonometry`

Interpretation:

- the Wave A rows exist
- the shard-local gate, hydration, and queryability surfaces are green
- but the aggregate probe still cannot retrieve four intended paper-backed rows through the current structured search contract

This is not a baseline regression. It is a Wave A closeout blocker.

## Shard Verdict Lineage

- issue `#246` / `shard_1`
  - execution report: `docs/reports/2026-04-19-9709-wave-a-shard1-execution-report.md`
  - canonical verdict: `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`
  - execution repo SHA: `d6970bc815f9cf5b6bdce78bd5938c8b5c6c6a6f`
  - evidence landed on PR head `69acfd5`
- issue `#247` / `shard_2`
  - execution report: `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`
  - canonical verdict: `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json`
  - execution repo SHA: `69acfd554e3170c512dd329fd8313b12cb0ceeae`
  - evidence landed on PR head `443df3a`
- issue `#248` / `shard_3`
  - execution report: `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`
  - canonical verdict: `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`
  - repaired execution repo SHA: `9c9314bee5d76196c382921207132a79bc4bfeb9`
  - first attempt blocker was preserved in git history, then superseded by the reset-backed passing rerun

## Execution Fingerprint Lineage

- shard 1 and shard 2 both ran with:
  - lane provider `windows-qwen`
  - lane model `qwen3.6-plus`
  - prompt templates `ocr_specialist@v1`, `review_specialist@v1`
  - response schema version `v1`
  - closure scope mode `lane_results`
  - closure gate `psql` mode `docker`
- shard 3 final rerun stayed on the same frozen contract, but required repaired execution surfaces:
  - required reset via `SUPABASE_PG_COMPAT=true`
  - provider and host backfills outside the sandbox
  - local DB consumers outside the sandbox on `127.0.0.1:54322`
- final closeout verification artifacts:
  - baseline final gate json: `5afd7be3eab7ea5bf7f96504f52120b4c4f363ed356f77aab59930ab672e8001`
  - Wave A probe gate json: `febf9fc577a18e1504b90e5ef3fcde55386aab7d30f75e57d59b24d51c64200c`
  - Wave A probe fixture digest: `903f2ad3c03b6b8ae62839de7a553faa3fc9f296505ef4e5fe167f484ee51269`

## Why Wave A Still Stops Here

Wave A proved that the controlled 30-row expansion can be executed honestly:

- all three shard verdicts are green
- all three shard hydration audits are green
- the baseline gate remains green

But Wave A did not yet prove that the expanded slice is reliably retrievable under the final aggregate probe:

- one `9709.p3.integration` case still misses completely
- three `9709.p3.trigonometry` cases still miss completely
- the failing cases all require non-null summary-bearing paper-backed retrieval

That is enough evidence to stop before Wave B.

## Exact Next Issue Slices

- search-text and ranking calibration for `9709.p3.integration` clean retrieval, starting with `9709/s17_qp_33/questions/q04.png`
- search-text and provenance repair for `9709.p3.trigonometry` aggregate misses, starting with `9709/m20_qp_32/questions/q05.png`, `9709/w23_qp_32/questions/q07.png`, and `9709/w22_qp_32/questions/q07.png`
- bounded review-lane calibration for `9709/s22_qp_13/questions/q02.png`, where the descriptor remained over-conservative in shard 3 full review

Stop after Wave A and open remediation issues
