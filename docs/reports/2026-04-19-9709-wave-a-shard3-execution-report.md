# 9709 Wave A Shard 3 Execution Report

Date: 2026-04-20
Issue: `#248`
PR: `#250`
Status: pass

## Summary

This note records the successful repaired shard-3 execution for `#248` on `feat/242`.

Shard 3 did not pass on the first attempt. The original run hit a mixed execution-surface failure: the provider and host-backfill path were attempted through a blocked WSL/host bridge, local Postgres reads were attempted from the sandboxed socket surface, and the shard reset used the direct remote Supabase fetch path that timed out on TLS instead of a working proxied or PG-compat path.

After diagnosis, the repaired execution line was:

- run the required shard reset with `SUPABASE_PG_COMPAT=true` against the local database
- rerun the lane runner, closure, projection audit, QC, and full review outside the sandbox on the working host and local-DB surfaces

The canonical shard posture is now green:

- `provider_failures = 0`
- `gate_pass = true`
- `current_shard_projection_completeness = 1.0`
- `current_shard_queryability = 1.0`
- `full_review_acceptance = 0.9`
- canonical `verdict = pass`

One bounded deterministic follow-up remains for `9709/s22_qp_13/questions/q02.png`. Full review accepted the shard overall, but marked that row as over-conservative because it stayed in `review_lane` with incomplete quantitative diagram evidence.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- branch: `feat/242`
- repo SHA during repaired execution: `9c9314bee5d76196c382921207132a79bc4bfeb9`
- manifest path: `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- manifest digest: `3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b`
- thresholds path: `data/contracts/9709_wave_a_thresholds_v1.json`
- thresholds digest: `19f8a6f9b29b16ce2a358faea1da710edce16d41e720f6f7994f68d14f2cec06`
- lane provider: `windows-qwen`
- lane model: `qwen3.6-plus`
- lane prompt templates: `ocr_specialist@v1`, `review_specialist@v1`
- lane response schema version: `v1`
- lane base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- full-review model: `qwen3-vl-flash`
- full-review base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- closure scope mode: `lane_results`
- closure scope source: `docs/reports/2026-04-19-9709-wave-a-shard3-results.json`
- cumulative mode: `false`
- closure gate `psql` mode: `docker`
- repaired reset path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`
- repaired projection audit DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`
- repaired qc DB path: local `DATABASE_URL` outside the sandbox

## Artifact Digests

- `docs/reports/2026-04-19-9709-wave-a-shard3-reset.json`: `c8675da9cc5324edebff7361655656915b41515c4c07d82ac274d40ee9fe59aa`
- `docs/reports/2026-04-19-9709-wave-a-shard3-results.json`: `5d83126a2b4e604459aeab31877333347844287140649ab154c6a3d3254d43c6`
- `docs/reports/2026-04-19-9709-wave-a-shard3-bundles.json`: `a14a64fa8df1f9cfe2d22f08fcac70bdf2a3d31e3a046ea97fcaf4aa1f4c7686`
- `docs/reports/2026-04-19-9709-wave-a-shard3-gate-report.md`: `8eadd466a7c5877424ca2f70ea3b21938f9d399d0bceb385798922df2baa5bbf`
- `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json`: `5afd7be3eab7ea5bf7f96504f52120b4c4f363ed356f77aab59930ab672e8001`
- `docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json`: `8916941cea773464685685223b1f8f8e0f139f0b4f4d8f100c4f881752619fda`
- `docs/reports/2026-04-19-9709-wave-a-shard3-qc.json`: `74d4287aea95a0039ec0a1190f4cf54567a92b9d42516f39b501fb88a4b58a30`
- `docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json`: `d605716af403668e69c98a4872775dd43930ae0f5afd16d69b07a2dc88a8737d`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`: `007dfee9012f66256f45c9101c9c5077acc624c2c27908f27e147d61dc741dda`
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md`: `0faa9ce5ef16a7a10c5fe815dccfe34564b56b5a5de5c5c3a035f0dfd962a08c`
- `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`: self-digest omitted in-report to avoid a self-referential hash loop; verify with `sha256sum` at closeout time

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/learning/run_9709_wave1_search_closure.js`
- `scripts/learning/run_wave_a_shard_reset.js`

## Command List

### Required Reset Before Rerun

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-reset.json
```

### Repaired Shard 3 Execution

```bash
.venv/bin/python scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --output docs/reports/2026-04-19-9709-wave-a-shard3-results.json
```

```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --lane-results docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out docs/reports/2026-04-19-9709-wave-a-shard3-bundles.json \
  --gate-report docs/reports/2026-04-19-9709-wave-a-shard3-gate-report.md \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard3-gate.json \
  --gate-psql-mode docker
```

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json
```

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
.venv/bin/python scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-qc.json
```

```bash
.venv/bin/python scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --shard-id shard_3 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json
```

```bash
.venv/bin/python scripts/vlm/qc_wave_a_shard_verdict.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard3-results.json \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard3-gate.json \
  --projection-audit-json docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json \
  --full-review-json docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json \
  --output-md docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md
```

## Result List

1. required reset: pass
   `docs/reports/2026-04-19-9709-wave-a-shard3-reset.json` recorded:
   - `pass = true`
   - `target_row_count = 10`
   - `deleted_question_bank_rows = 0`
   - `leftover_question_bank_rows = 0`
2. lane runner: pass
   The repaired rerun wrote `10` shard rows with:
   - `provider_failures = 0`
   - `summary_present = 10`
   - route counts: `ocr_lane = 7`, `review_lane = 3`
3. closure command: pass
   The command used `--scope-from-lane-results`, so:
   - `scope_mode = lane_results`
   - closure scope source = `docs/reports/2026-04-19-9709-wave-a-shard3-results.json`
   - `cumulative_mode = false`
   It rebuilt evidence bundles and completed both host-side backfills:
   - registry backfill: `processed=10`, `inserted=10`, `updated=0`
   - question-analysis backfill: `processed=10`, `backfilled=10`, `skipped=0`
4. baseline gate rerun: pass
   `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json` recorded:
   - `exact_structured_match_rate = 1`
   - `subject_leakage_rate = 0`
   - `metadata_completeness_rate = 1`
   - `null_summary_rate = 0`
   - `gate_pass = true`
5. projection audit: pass
   The current-shard audit recorded:
   - `duplicate_projection_rows = 0`
   - `current_shard_projection_completeness = 1.0`
   - `current_shard_queryability = 1.0`
   - no missing required fields for any shard row
6. shard QC: pass
   The threshold artifact recorded:
   - `provider_failures: pass`
   - `unexpected_review_fallbacks:clean: pass`
   - `unexpected_review_fallbacks:medium: pass`
   - `route_hint_match:clean: pass`
   - `route_hint_match:medium: pass`
7. deterministic full-review: pass
   The full-review artifact wrote `10` successful review records:
   - `accepted_count = 9`
   - `reviewed_count = 10`
   - `acceptance_rate = 0.9`
   - one bounded follow-up case on `9709/s22_qp_13/questions/q02.png`
8. canonical verdict: pass
   `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json` recorded:
   - `provider_failures = 0`
   - `gate_pass = true`
   - `projection_pass = true`
   - `full_review_acceptance = 0.9`
   - `pass = true`
   Failure codes: none

## Hard-Row Inventory Outcome

- `9709/s22_qp_13/questions/q02.png` remained in `review_lane` and was the single bounded follow-up.
  Deterministic review marked the route as over-conservative because the descriptor still lacked quantitative diagram evidence for deriving `p`, `q`, and `r`, but the review bucket verdict remained correct.
- `9709/s24_qp_32/questions/q06.png` stayed in the manifest-justified `review_lane` set and deterministic review accepted it.
  The returned evidence preserved the curve, maximum point, and exact-integral framing without a blocker.
- `9709/w22_qp_32/questions/q07.png` stayed in the manifest-justified `review_lane` set and deterministic review accepted it.
  The returned descriptor preserved the differential-equation stem, givens, and follow-on solve task correctly.
- the seven `ocr_lane` rows all completed without provider failure and hydrated into the projection cleanly.

## Repaired Failure Lineage

The first checked-in shard-3 attempt at `#248` remains historically important, but it is no longer the current truth for this shard.

That first attempt proved:

- sandboxed local DB access was not a valid execution surface for the projection audit or QC path
- direct remote Supabase fetch was not a valid reset path in this worker because the effective route timed out on TLS
- the provider and host-backfill steps needed the real host bridge rather than the sandboxed surface

The repaired rerun cleared each of those boundaries without changing the frozen shard contract:

- required reset executed on local PG-compat
- provider and host-backfill steps executed outside the sandbox
- local Postgres consumers executed on the healthy `127.0.0.1:54322` path outside the sandbox

## Conclusion

Issue `#248` now passes on the current execution line.

Shard 3 required an honest environment repair and a fresh reset before rerun, but the repaired execution stayed within the frozen Wave A contract and finished with canonical `verdict = pass`.
