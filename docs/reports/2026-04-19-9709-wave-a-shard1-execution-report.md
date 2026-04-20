# 9709 Wave A Shard 1 Execution Report

Date: 2026-04-20
Issue: `#246`
PR: `#250`
Status: fail

## Summary

This note records the approved shard-1 rerun for `#246` on `feat/242`.

The rerun started from the checked-in reset artifact at `docs/reports/2026-04-19-9709-wave-a-shard1-reset.json` and executed the real shard-1 command chain again against live services.

The rerun improved materially relative to the earlier all-provider-failure attempt:

- lane runner now produced `9/10` successful shard rows
- deterministic full-review succeeded on all `10` sampled rows and accepted `9/10`
- current-shard projection completeness improved from `0.0` to `0.9`

But shard 1 still failed canonically and remains a stop condition for Wave A:

- `provider_failures = 1`
- `gate_pass = false`
- `current_shard_projection_completeness = 0.9`
- `full_review_acceptance = 0.9`
- canonical `verdict = fail`

The one remaining bad row is `9709/w23_qp_11/questions/q05.png`. It failed in the `review_lane` path with `failure_reason = "Windows-host Qwen provider did not return a valid JSON object"`. That same row is also the only projection-audit miss and the only full-review follow-up row.

The search gate also regressed on rerun: `mixed-ranking-paper-authority` now returns top result `1500bd9d-8842-462a-8105-2334ca4e81af`, so `exact_structured_match_rate` dropped to `0.8` and the baseline gate failed.

Because shard 1 still ended with `verdict = fail`, this worker did not start `#247` and ran the fail-path reset again at the end of the rerun.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- branch: `feat/242`
- repo SHA during rerun: `78c33356da92ee2e7a9b3682dd1cd22a0a9af73f`
- manifest path: `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- manifest digest: `3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b`
- thresholds path: `data/contracts/9709_wave_a_thresholds_v1.json`
- thresholds digest: `19f8a6f9b29b16ce2a358faea1da710edce16d41e720f6f7994f68d14f2cec06`
- rerun precondition: checked-in reset artifact already existed and passed before rerun started
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
- reset DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`

## Artifact Digests

- `docs/reports/2026-04-19-9709-wave-a-shard1-results.json`: `9eb8c02aa3566c94991cab264ae86fc06effa34e208c574beb781cd91fe1cab4`
- `docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json`: `1147f3d36a64e7a3c4f44558e5f453a156727fc0153c0cb4c281cc0c63784382`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate-report.md`: `f227dc3043e56cd9b186aae549ec61497f5e22589f227752c400cb44f600c31e`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate.json`: `f20f9e06999d1532751412c21ebbe8e492e085ab8a0c1c16d598b3337db1a9ba`
- `docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json`: `dfa4d5e97a5fb1d67d8db6fe960f5b655fbfc7973c615e5aac440543d15349ad`
- `docs/reports/2026-04-19-9709-wave-a-shard1-qc.json`: `7ac24e3a8631ce1de84227abaa8f26d528000a74f3a8e87cbeab2f9c0ba4a616`
- `docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json`: `60ccce82c61813ad42a93f972ec5713c48a923bd02076dba7f1e152061a5a8d0`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`: `b8d0cfefa4cc421535de858b3e86f4ae74d739ef4c2166af586f7c22e52d085c`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md`: `c11955d10ef424aec41fe763e259f3236cf64a7bd4ce58c520c2d58bc70fb709`
- `docs/reports/2026-04-19-9709-wave-a-shard1-reset.json`: `99fe952f8b76bcb76dd9013a94ef9e3ff7f40191ca37bc6e8e0969c886e1e095`

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Command List

### Rerun From Checked-In Reset

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

### Post-Fail Cleanup

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-reset.json
```

## Result List

1. lane runner: partial pass
   The rerun wrote `10` shard rows with:
   - `provider_failures = 1`
   - `summary_present = 9`
   - the only failed row: `9709/w23_qp_11/questions/q05.png`
   - failure reason: `Windows-host Qwen provider did not return a valid JSON object`
2. closure command: partial pass, overall exit `1`
   The command rebuilt evidence bundles and completed both host-side backfills:
   - registry backfill: `processed=10`, `inserted=10`, `updated=0`
   - question-analysis backfill: `processed=10`, `backfilled=10`, `skipped=0`
   The final gate rerun then failed and caused the closure command to exit non-zero.
3. baseline gate rerun: fail
   `docs/reports/2026-04-19-9709-wave-a-shard1-gate.json` recorded:
   - `exact_structured_match_rate = 0.8`
   - `subject_leakage_rate = 0`
   - `metadata_completeness_rate = 1`
   - `null_summary_rate = 0`
   - `gate_pass = false`
   The only failing fixture case was `mixed-ranking-paper-authority`, whose top result became `1500bd9d-8842-462a-8105-2334ca4e81af`.
4. projection audit: fail
   The current-shard audit improved but still missed one row:
   - `duplicate_projection_rows = 0`
   - `current_shard_projection_completeness = 0.9`
   - `current_shard_queryability = 1.0`
   - only `9709/w23_qp_11/questions/q05.png` was missing required `summary` and `search_text`
5. shard QC: partial pass
   The command wrote the required qc artifact successfully. Its wave-1 overlay still spans all `30` manifest rows because the issue command does not pass `--shard-id`.
6. deterministic full-review: pass
   The full-review artifact wrote `10` successful review records:
   - `reviewed_count = 10`
   - `accepted_count = 9`
   - `acceptance_rate = 0.9`
   The only non-accepted row was `9709/w23_qp_11/questions/q05.png`, matching the single provider/projection miss.
7. canonical verdict: fail
   `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json` recorded:
   - `provider_failures = 1`
   - `gate_pass = false`
   - `projection_pass = false`
   - `full_review_acceptance = 0.9`
   - `pass = false`
   Failure codes:
   - `provider_failures_exceeded`
   - `baseline_gate_failed`
   - `current_shard_projection_incomplete`
   - `projection_audit_failed`
8. post-fail reset: pass
   The required cleanup reset ran again and removed only shard-1 identities:
   - `question_bank: 10 -> 0`
   - `learning_question_analysis_snapshots: 10 -> 0`
   - `learning_question_events: 10 -> 0`
   - no out-of-scope deletes

## Blockers

Shard 1 remains blocked by two real rerun defects:

1. one review-lane provider failure remains
   `9709/w23_qp_11/questions/q05.png` still fails in `review_lane` because the Windows-host Qwen provider returned a non-JSON payload
2. search gate regressed during the rerun
   `mixed-ranking-paper-authority` no longer resolves to the expected top paper-backed row, so the baseline gate fails at `exact_structured_match_rate = 0.8`

## Conclusion

Issue `#246` is still not green on the current execution line.

Shard 1 was rerun honestly after explicit approval, but the canonical result remains `verdict = fail`. The rerun improved the data posture enough to prove the pipeline is no longer catastrophically dead, yet it still does not satisfy the frozen shard-1 stop/go contract.

This worker did not start `#247` and left shard 1 reset back to a clean fail-path state.
