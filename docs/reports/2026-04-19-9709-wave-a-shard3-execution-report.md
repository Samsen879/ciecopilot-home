# 9709 Wave A Shard 3 Execution Report

Date: 2026-04-20
Issue: `#248`
PR: `#250`
Status: blocked

## Summary

This note records the first checked-in shard-3 execution attempt for `#248` on `feat/242`.

No prior shard-3 attempt artifact or shard-3 reset artifact existed under `docs/reports` at start, so this attempt ran directly from the issue-draft command chain without a reset step.

The execution is blocked by environment-level connectivity failures rather than a bounded hard-row content miss:

- the lane runner wrote `10` rows, but every row failed with the same Windows-host WSL socket error
- closure wrote evidence bundles, then failed during the host-side paper-question registry backfill before producing gate artifacts
- projection audit failed reaching the local Postgres port
- shard QC failed opening the database connection
- deterministic full review wrote an artifact, but reviewed `0/10` rows successfully because every row was already in a failed state
- canonical shard verdict could not be produced because `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json` was never created

Because this shard did not reach `verdict.json pass=true`, Wave A must stop at `#248` and must not continue to `#249`.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- branch: `feat/242`
- repo SHA during execution: `443df3a1e86c663b9ffb99cbf9229c19f585f86d`
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
- intended closure scope mode: `lane_results`
- intended closure scope source: `docs/reports/2026-04-19-9709-wave-a-shard3-results.json`
- intended cumulative mode: `false`
- closure gate `psql` mode: `docker`
- DB target alias: local `DATABASE_URL`
- projection audit DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`
- qc DB path: local `DATABASE_URL`

## Artifact Digests

- `docs/reports/2026-04-19-9709-wave-a-shard3-results.json`: `5b2de1cddf904c6f4485637d9eae0fbd3b83448686d29ca6a3e520c542115d8b`
- `docs/reports/2026-04-19-9709-wave-a-shard3-bundles.json`: `62e9eb581e1e823f981a12a254c5ef1f2a90ee670964afc16a1620598155afa4`
- `docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json`: `841d71be2652e938a3507b18cdbc55c269d7019b322cd7c86eaf84ef7207de60`
- `docs/reports/2026-04-19-9709-wave-a-shard3-gate-report.md`: not created because closure failed during host backfill
- `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json`: not created because closure failed during host backfill
- `docs/reports/2026-04-19-9709-wave-a-shard3-projection-audit.json`: not created because projection audit failed before writing output
- `docs/reports/2026-04-19-9709-wave-a-shard3-qc.json`: not created because QC stats failed before writing output
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.json`: not created because the verdict step could not read the missing gate artifact
- `docs/reports/2026-04-19-9709-wave-a-shard3-verdict.md`: not created because the verdict step could not read the missing gate artifact
- `docs/reports/2026-04-19-9709-wave-a-shard3-execution-report.md`: self-digest omitted in-report to avoid a self-referential hash loop; verify with `sha256sum` at closeout time

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Command List

### Shard 3 Execution Attempt

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

1. lane runner: blocked
   The command wrote `10` shard rows with:
   - `provider_failures = 10`
   - `summary_present = 0`
   - route counts: `ocr_lane = 7`, `review_lane = 3`
   Every row failed with the same provider-side error:
   - `<3>WSL (...) ERROR: UtilBindVsockAnyPort:307: socket failed 1`
2. closure command: blocked
   The command wrote `docs/reports/2026-04-19-9709-wave-a-shard3-bundles.json`, intended to run with:
   - `scope_mode = lane_results`
   - `cumulative_mode = false`
   It then failed during `backfill_paper_question_registry` when `powershell.exe` attempted the host-side backfill script and returned the same WSL socket error.
3. baseline gate rerun: not reached
   `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json` was never created because closure exited before the gate step could run.
4. projection audit: blocked
   The command failed before writing output:
   - `connect EPERM 127.0.0.1:54322`
5. shard QC: blocked
   The command failed before writing output:
   - `psycopg.OperationalError: connection is bad: no error details available`
6. deterministic full review: blocked artifact written
   The full-review command completed and wrote the output file, but its aggregate state was:
   - `accepted_count = 0`
   - `reviewed_count = 0`
   - `acceptance_rate = null`
   This reflects upstream lane failure, not a bounded descriptor disagreement.
7. canonical verdict: blocked
   The verdict command failed immediately because it could not read:
   - `docs/reports/2026-04-19-9709-wave-a-shard3-gate.json`

## Hard-Row Inventory Outcome

The declared hardest shard rows were not evaluated on their own merits in this attempt because the provider path failed before any summaries were produced.

Affected row inventory:

- `9709/s21_qp_13/questions/q04.png` via `ocr_lane`
- `9709/s18_qp_13/questions/q07.png` via `ocr_lane`
- `9709/s22_qp_13/questions/q02.png` via `review_lane`
- `9709/w21_qp_33/questions/q09.png` via `ocr_lane`
- `9709/w19_qp_32/questions/q08.png` via `ocr_lane`
- `9709/s24_qp_32/questions/q06.png` via `review_lane`
- `9709/s17_qp_32/questions/q03.png` via `ocr_lane`
- `9709/w22_qp_32/questions/q09.png` via `ocr_lane`
- `9709/w22_qp_32/questions/q04.png` via `ocr_lane`
- `9709/w22_qp_32/questions/q07.png` via `review_lane`

Each row recorded the same failure family instead of a row-specific OCR or review outcome.

## Failed-Shard Isolation Posture

After the first failed attempt, an escalated reset was attempted so the shard could be rerun outside the sandbox from a clean baseline. That reset also failed before writing an artifact:

- command:

```bash
node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-reset.json
```

- result:
  `Failed to load question_bank rows for reset: TypeError: fetch failed`

So no `docs/reports/2026-04-19-9709-wave-a-shard3-reset.json` artifact exists, and a safe rerun could not be started in this session.

If shard 3 is retried later, failed-shard isolation is still required first:

```bash
node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_3 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard3-reset.json
```

That rerun must not start until the checked-in reset artifact proves current-shard-only cleanup on the Wave A write surfaces.

## Conclusion

Issue `#248` is blocked on the current execution line.

This shard-3 attempt established that the blocker is systemic host/connectivity failure, not a bounded hard-row quality regression. The shard did not reach a canonical verdict artifact, and even the required rerun-isolation reset could not complete. Wave A must stop here until the provider/DB connectivity path is restored and shard-specific reset isolation succeeds before any rerun.
