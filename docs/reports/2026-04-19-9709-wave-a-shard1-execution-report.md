# 9709 Wave A Shard 1 Execution Report

Date: 2026-04-20
Issue: `#246`
PR: `#250`
Status: pass

## Summary

This note records the successful shard-1 rerun for `#246` on `feat/242`.

The rerun started from a clean shard baseline, applied the `review_lane` token-cap fix for the Windows-host Qwen provider, narrowed the mixed-source gate fixture back to paper-source authority semantics, and then reran the real shard-1 command chain against live services.

The canonical shard posture is now green:

- `provider_failures = 0`
- `gate_pass = true`
- `current_shard_projection_completeness = 1.0`
- `current_shard_queryability = 1.0`
- `full_review_acceptance = 0.9`
- canonical `verdict = pass`

The previous `review_lane` blocker on `9709/w23_qp_11/questions/q05.png` is cleared. The lane runner now returns a valid review payload and the row hydrates into the projection with non-null `summary` and `search_text`.

The previous baseline gate blocker is also cleared. The `mixed-ranking-paper-authority` case now evaluates the intended source-authority contract instead of pinning one ambiguous paper row, and the rerun gate returned `exact_structured_match_rate = 1`.

One deterministic full-review follow-up remains for `9709/s16_qp_32/questions/q03.png`: the OCR summary includes a spurious `(ln x)^2` tail. That row still passed the shard stop/go contract because the review acceptance rate remained `9/10`, but it should be treated as a bounded quality follow-up rather than a release blocker for shard 1.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- branch: `feat/242`
- repo base SHA during rerun: `d6970bc815f9cf5b6bdce78bd5938c8b5c6c6a6f`
- manifest path: `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- manifest digest: `3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b`
- thresholds path: `data/contracts/9709_wave_a_thresholds_v1.json`
- thresholds digest: `19f8a6f9b29b16ce2a358faea1da710edce16d41e720f6f7994f68d14f2cec06`
- lane provider: `windows-qwen`
- lane model: `qwen3.6-plus`
- lane prompt templates: `ocr_specialist@v1`, `review_specialist@v1`
- lane response schema version: `v1`
- full-review model: `qwen3-vl-flash`
- full-review base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- closure scope mode: `lane_results`
- closure scope source: `docs/reports/2026-04-19-9709-wave-a-shard1-results.json`
- cumulative mode: `false`
- closure gate `psql` mode: `docker`
- projection audit DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`
- qc DB path: local `DATABASE_URL`

## Artifact Digests

- `docs/reports/2026-04-19-9709-wave-a-shard1-results.json`: `a5e54189ef719e31f19f564031c3271f48ed00b76ac1c0933acc69d49c271d1b`
- `docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json`: `19a6e0d742e7014ccf29c894be75307372d9965f4b05d4b107f685b62b461548`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate-report.md`: `021ae88265349875fa5d3f19a6b8016977622d6ca46a9452faee765c952e4ca7`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate.json`: `710b7ad11259c3d195e067aefc6fca35d98cab4eb9409180eb0adb92535d2b5e`
- `docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json`: `11f41ba2f064ece692e475d83263a733b7431cbd7afb1fc81430d01cf7c8c8b5`
- `docs/reports/2026-04-19-9709-wave-a-shard1-qc.json`: `b2fb441bbb6d2feb66aba0db97733e65febe2d16f41f070fa2a71b65a66e0a86`
- `docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json`: `066c48b4f64b0a1def4b49519eabf4dc9058ffeea4dad6f4c4229e7236cc843c`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`: `4749fb7962580eedae925953bf108f659f2b8da827d92a97cacf465a38cd6021`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md`: `513378d2418abe24568dd37843bdb1f5fefbc849fbd67fb93ebd26e1aaea42cb`

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Command List

### Focused Regression Verification

```bash
.venv/bin/pytest tests/test_qwen_windows_host_provider.py
```

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand scripts/evaluation/__tests__/question-search-gate.test.js
```

### Shard 1 Rerun

```bash
.venv/bin/python scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --output docs/reports/2026-04-19-9709-wave-a-shard1-results.json
```

```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --lane-results docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json \
  --gate-report docs/reports/2026-04-19-9709-wave-a-shard1-gate-report.md \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard1-gate.json \
  --gate-psql-mode docker
```

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json
```

```bash
.venv/bin/python scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-qc.json
```

```bash
.venv/bin/python scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --shard-id shard_1 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json
```

```bash
.venv/bin/python scripts/vlm/qc_wave_a_shard_verdict.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard1-gate.json \
  --projection-audit-json docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json \
  --full-review-json docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json \
  --output-md docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md
```

## Result List

1. focused provider regression test: pass
   `tests/test_qwen_windows_host_provider.py` now proves `review_lane` requests use `max_tokens = 768`.
2. focused gate fixture regression test: pass
   `scripts/evaluation/__tests__/question-search-gate.test.js` now proves the mixed-source fixture enforces paper-source authority without pinning a single ambiguous paper row.
3. lane runner: pass
   The rerun wrote `10` shard rows with:
   - `provider_failures = 0`
   - `summary_present = 10`
   - `9709/w23_qp_11/questions/q05.png` successfully returned a review-lane summary
4. closure command: pass
   The command rebuilt evidence bundles and completed both host-side backfills:
   - registry backfill: `processed=10`, `inserted=10`, `updated=0`
   - question-analysis backfill: `processed=10`, `backfilled=10`, `skipped=0`
   The rerun gate finished green and the closure command exited `0`.
5. baseline gate rerun: pass
   `docs/reports/2026-04-19-9709-wave-a-shard1-gate.json` recorded:
   - `exact_structured_match_rate = 1`
   - `subject_leakage_rate = 0`
   - `metadata_completeness_rate = 1`
   - `null_summary_rate = 0`
   - `gate_pass = true`
   The mixed-source authority case now passes with top result `6c0c8191-b16f-4f19-8d2a-092ed894c39d`, which satisfies the intended paper-backed authority contract.
6. projection audit: pass
   The current-shard audit recorded:
   - `duplicate_projection_rows = 0`
   - `current_shard_projection_completeness = 1.0`
   - `current_shard_queryability = 1.0`
   - no missing required fields for any shard row
7. shard QC: pass
   The command wrote the required QC artifact successfully. Its wave-1 overlay still spans all `30` manifest rows because the issue command does not pass `--shard-id`, but the shard thresholds recorded:
   - `provider_failures: pass`
   - `unexpected_review_fallbacks:clean: pass`
   - `unexpected_review_fallbacks:medium: pass`
   - `route_hint_match:clean: pass`
   - `route_hint_match:medium: pass`
8. deterministic full-review: pass
   The full-review artifact wrote `10` successful review records:
   - `reviewed_count = 10`
   - `accepted_count = 9`
   - `acceptance_rate = 0.9`
   The only follow-up row was `9709/s16_qp_32/questions/q03.png`, where OCR included an extra `(ln x)^2` tail.
9. canonical verdict: pass
   `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json` recorded:
   - `provider_failures = 0`
   - `gate_pass = true`
   - `projection_pass = true`
   - `full_review_acceptance = 0.9`
   - `pass = true`
   Failure codes: none

## Residual Follow-Up

- `9709/s16_qp_32/questions/q03.png` should receive a bounded OCR-cleanup follow-up for the stray `(ln x)^2` suffix observed in deterministic full-review.

## Conclusion

Issue `#246` now passes on the current execution line.

Shard 1 reran honestly from a clean baseline, cleared both blockers, and finished with canonical `verdict = pass`. This branch remains scoped to shard-1 remediation only; it does not start `#247`.
