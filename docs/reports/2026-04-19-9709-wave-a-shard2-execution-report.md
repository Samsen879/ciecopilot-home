# 9709 Wave A Shard 2 Execution Report

Date: 2026-04-20
Issue: `#247`
PR: `#250`
Status: pass

## Summary

This note records the successful shard-2 execution for `#247` on `feat/242`.

There was no previously checked-in shard-2 attempt artifact under `docs/reports`, so this execution started directly from the issue-draft command chain without a reset step. The run used live closure with `--scope-from-lane-results`, stayed current-shard-only, and preserved the green baseline gate established by shard 1.

The canonical shard posture is green:

- `provider_failures = 0`
- `gate_pass = true`
- `current_shard_projection_completeness = 1.0`
- `current_shard_queryability = 1.0`
- `full_review_acceptance = 0.9`
- canonical `verdict = pass`

Shard 2 produced the expected OCR-hard routing profile. The crop on `9709/m24_qp_12/questions/q04.png` correctly stayed in `review_lane` because subquestion `4(a)` is missing the left side of the numerator, while `4(b)` remains transcription-sensitive. The only deterministic full-review miss was `9709/w16_qp_13/questions/q03.png`, which stayed on `ocr_lane` but omitted the required working or answer context called out by the marking instruction. That miss remained bounded: shard acceptance still closed at `9/10`, satisfying the stop/go contract.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- branch: `feat/242`
- repo SHA during execution: `69acfd554e3170c512dd329fd8313b12cb0ceeae`
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
- closure scope source: `docs/reports/2026-04-19-9709-wave-a-shard2-results.json`
- cumulative mode: `false`
- closure gate `psql` mode: `docker`
- DB target alias: local `DATABASE_URL`
- projection audit DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`
- qc DB path: local `DATABASE_URL`

## Artifact Digests

- `docs/reports/2026-04-19-9709-wave-a-shard2-results.json`: `5b3c03706cea4c008df87ba0a34e41353facaf36c39382fd1d0d92df0228c441`
- `docs/reports/2026-04-19-9709-wave-a-shard2-bundles.json`: `25eb852b0df7ca6a622c33da5d551539780fb0c93affe7aed2e08339b6f74a3e`
- `docs/reports/2026-04-19-9709-wave-a-shard2-gate-report.md`: `e3eedb279aa9eb01b6113cda39907ae0a462617745757ac637845cf88767e983`
- `docs/reports/2026-04-19-9709-wave-a-shard2-gate.json`: `54771a02abe2c0fe15e4e7698b1517bf750a35607325b00b7fc724cab97fc86b`
- `docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json`: `7db7146dbc6dbfb09ee9beccd8b2201bd3a09224902b75c677f7059d28a1eb0e`
- `docs/reports/2026-04-19-9709-wave-a-shard2-qc.json`: `c721fbef7a772f85f66e2c5af1355b113369e0e22d87972804902ce70da6e340`
- `docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json`: `a60d136a05a2c2a950bb5b950e0825453e832a5c2e0f8570e17bd16b70cecfb0`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json`: `6e1428980ba60544d354aeff6a9c65d3bd297a2fa60f2cca29e959d4dad238e1`
- `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.md`: `4d44d7b7793fad2ab637610914419dec5e73991bf3ee812272a4592fc36eaea4`
- `docs/reports/2026-04-19-9709-wave-a-shard2-execution-report.md`: self-digest omitted in-report to avoid a self-referential hash loop; verify with `sha256sum` at closeout time

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Command List

### Shard 2 Execution

```bash
.venv/bin/python scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --output docs/reports/2026-04-19-9709-wave-a-shard2-results.json
```

```bash
node scripts/learning/run_9709_wave1_search_closure.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --lane-results docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --scope-from-lane-results \
  --evidence-bundles-out docs/reports/2026-04-19-9709-wave-a-shard2-bundles.json \
  --gate-report docs/reports/2026-04-19-9709-wave-a-shard2-gate-report.md \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard2-gate.json \
  --gate-psql-mode docker
```

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_wave_a_projection_audit.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json
```

```bash
.venv/bin/python scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-qc.json
```

```bash
.venv/bin/python scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --shard-id shard_2 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json
```

```bash
.venv/bin/python scripts/vlm/qc_wave_a_shard_verdict.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_2 \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard2-results.json \
  --gate-json docs/reports/2026-04-19-9709-wave-a-shard2-gate.json \
  --projection-audit-json docs/reports/2026-04-19-9709-wave-a-shard2-projection-audit.json \
  --full-review-json docs/reports/2026-04-19-9709-wave-a-shard2-full-review.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json \
  --output-md docs/reports/2026-04-19-9709-wave-a-shard2-verdict.md
```

## Result List

1. lane runner: pass
   The command wrote `10` shard rows with:
   - `provider_failures = 0`
   - `summary_present = 10`
   - route counts: `ocr_lane = 7`, `review_lane = 3`
2. closure command: pass
   The command used `--scope-from-lane-results`, so:
   - `scope_mode = lane_results`
   - closure scope source = `docs/reports/2026-04-19-9709-wave-a-shard2-results.json`
   - `cumulative_mode = false`
   The live gate stayed green and the closure command exited successfully.
3. baseline gate rerun: pass
   `docs/reports/2026-04-19-9709-wave-a-shard2-gate.json` recorded:
   - `exact_structured_match_rate = 1`
   - `subject_leakage_rate = 0`
   - `metadata_completeness_rate = 1`
   - `null_summary_rate = 0`
   - `gate_pass = true`
4. projection audit: pass
   The current-shard audit recorded:
   - `duplicate_projection_rows = 0`
   - `current_shard_projection_completeness = 1.0`
   - `current_shard_queryability = 1.0`
   - no missing required fields for any shard row
5. shard QC: pass
   The threshold artifact recorded:
   - `provider_failures: pass`
   - `unexpected_review_fallbacks:clean: pass`
   - `unexpected_review_fallbacks:medium: pass`
   - `route_hint_match:clean: pass`
   - `route_hint_match:medium: pass`
6. deterministic full-review: pass
   The full-review artifact wrote `10` review records:
   - `accepted_count = 9`
   - `acceptance_rate = 0.9`
   - allowlist review bucket confirmation for `9709/m24_qp_12/questions/q04.png`
   - single follow-up miss on `9709/w16_qp_13/questions/q03.png`
7. canonical verdict: pass
   `docs/reports/2026-04-19-9709-wave-a-shard2-verdict.json` recorded:
   - `provider_failures = 0`
   - `gate_pass = true`
   - `projection_pass = true`
   - `full_review_acceptance = 0.9`
   - `pass = true`
   Failure codes: none

## OCR-Hard Observations

- `9709/m24_qp_12/questions/q04.png` was correctly routed to `review_lane`.
  The image crop removes the left side of the numerator in `4(a)`, and deterministic review confirmed that this belongs in the review bucket even though `4(b)` remains mostly legible.
- `9709/w23_qp_32/questions/q09.png` stayed in the manifest-justified `review_lane` set but deterministic review accepted the descriptor as fully usable.
  The image includes a diagram and shaded region; the returned structured evidence captured the curve definition, interval, point `M`, and region `R` without introducing a blocker.
- `9709/w23_qp_32/questions/q07.png` also stayed in `review_lane` and deterministic review accepted it.
  The returned descriptor preserved the identity proof prompt, the follow-on equation, and the angle domain correctly.
- `9709/w16_qp_13/questions/q03.png` is the single bounded follow-up.
  It remained on `ocr_lane`, but deterministic review marked the review bucket verdict incorrect because the OCR-only result preserved the stem and formula without the required working or answer context implied by “Showing all necessary working.”

## Rerun / Cleanup Posture

No rerun or cleanup was required for this checked-in shard-2 execution.

At start, there was no prior shard-2 attempt artifact under `docs/reports`, so the issue-draft recovery rule did not require `docs/reports/2026-04-19-9709-wave-a-shard2-reset.json` before execution.

If this shard had failed without `verdict = pass`, the next attempt would have been blocked until `node scripts/learning/run_wave_a_shard_reset.js --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json --shard-id shard_2 --scope-from-manifest --output-json docs/reports/2026-04-19-9709-wave-a-shard2-reset.json` proved current-shard-only cleanup on the Wave A write surfaces.

## Conclusion

Issue `#247` now passes on the current execution line.

Shard 2 executed once from the checked-in baseline, kept the closure path scoped to `lane_results`, preserved the green gate and projection audits, and finished with canonical `verdict = pass`.
