# 9709 Wave A Shard 1 Execution Report

Date: 2026-04-20
Issue: `#246`
PR: `#250`
Status: fail

## Summary

This note records the actual `#246` shard-1 execution state on `feat/242`.

The first live shard-1 attempt produced a checked-in canonical fail verdict. The fail was real, not a dry-run artifact:

- lane runner wrote `10` shard-1 rows, but all `10` rows failed at the Windows-host Qwen boundary with `failure_reason = "<3>WSL ... UtilBindVsockAnyPort:307: socket failed 1"`
- closure gate still passed on the existing search gate contract
- current-shard projection audit failed with `current_shard_projection_completeness = 0.0` and `current_shard_queryability = 1.0`
- deterministic full-review wrote `10` records but reviewed `0/10` because every record hit `api_error: Connection error.`
- canonical shard verdict remained `pass = false`

Because shard-1 had already ended without `verdict = pass`, this worker treated that as a real failed attempt, ran the required reset, and wrote `docs/reports/2026-04-19-9709-wave-a-shard1-reset.json` before considering any rerun.

Two code-level blockers were then remediated locally:

- `scripts/vlm/qc_stats.py` now imports `read_json`, which fixes the reproducible `NameError` on `--thresholds-json`
- `api/lib/supabase/pg-compat-client.js` now supports `.delete().select(...)`, which unblocked the required shard reset path under `SUPABASE_PG_COMPAT=true`

Safe no-image provider smokes outside the sandbox passed for both provider paths used by this issue:

- Windows-host wrapper path: `qwen3.6-plus`
- direct DashScope OpenAI client path: `qwen3-vl-flash`

This worker did **not** rerun shard-1 from the top after reset. The only honest rerun path would send local exam-image assets to DashScope outside the sandbox, and that action was explicitly rejected by the approvals reviewer until the user gives explicit approval for that external upload.

## Execution Fingerprint

- worktree: `/home/samsen/.worktrees/ciecopilot-home/cie-179`
- branch: `feat/242`
- repo SHA: `15dd7ea012ba0465149d12a8b3398d58b138313c`
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
- projection audit DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL` because direct Supabase JS REST fetch timed out in this shell
- reset DB path: `SUPABASE_PG_COMPAT=true` against local `DATABASE_URL`

## Artifact Digests

- `docs/reports/2026-04-19-9709-wave-a-shard1-results.json`: `d8b6b56c014b4b3557d7a9215d4c6628fac82ec59b6d79ee07d5b073b0e4235a`
- `docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json`: `708444f745005db864b9bdc2e8fab389c7beedee29bbf5e3580d46929344d493`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate-report.md`: `eeedb79fa01fa497ca3f5820345bcb05403c755391ba1555fd2cd732bdf5093d`
- `docs/reports/2026-04-19-9709-wave-a-shard1-gate.json`: `0512e871e0d0156347e9c140fa80fd7ae4e833f001b08dce44b3e4bacd778610`
- `docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json`: `9be7fcbd83512d32e8c53b545c008d99f2bf9b09068306bc0a69063b01e4a6c2`
- `docs/reports/2026-04-19-9709-wave-a-shard1-qc.json`: `3f5868dec1c5b44ef8cfd39a068b0dc69de70cdbd79838b522e358be5699af24`
- `docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json`: `d0c2021c71b0fa837a9301208b98ef2fe63cd0e0f89e3958101d99607076f7d3`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json`: `d6eb503d23898a93fe21b26b32448174f465043759ab854927cb7bf8995040f6`
- `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.md`: `e4225c785c16f246f1918036faddf31539cf8f6560c1e9614f4071cbe9f05770`
- `docs/reports/2026-04-19-9709-wave-a-shard1-reset.json`: `99fe952f8b76bcb76dd9013a94ef9e3ff7f40191ca37bc6e8e0969c886e1e095`

## Authority References

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_expansion_wave_a_v1.json`
- `data/contracts/9709_wave_a_thresholds_v1.json`
- `scripts/learning/run_9709_wave1_search_closure.js`

## Command List

### Original Shard-1 Attempt

```bash
python3 scripts/vlm/qwen_lane_runner_v1.py \
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
.venv/bin/python scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --shard-id shard_1 \
  --full-review \
  --sample-size 10 \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json
```

```bash
python3 scripts/vlm/qc_wave_a_shard_verdict.py \
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

### Fail-Path Recovery And Diagnostics

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_wave_a_shard_reset.js \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --shard-id shard_1 \
  --scope-from-manifest \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-reset.json
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
  --gate-psql-mode docker \
  --dry-run
```

```bash
.venv/bin/python -m pytest tests/test_qwen_wave1_qc.py -k thresholds_json_is_provided
```

```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand \
  api/lib/supabase/__tests__/pg-compat-client.test.js \
  -t "supports delete filters with returning projections for reset flows"
```

```bash
.venv/bin/python scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_expansion_wave_a_v1.json \
  --lane-results-json docs/reports/2026-04-19-9709-wave-a-shard1-results.json \
  --thresholds-json data/contracts/9709_wave_a_thresholds_v1.json \
  --output-json docs/reports/2026-04-19-9709-wave-a-shard1-qc.json
```

```bash
python3 -m scripts.vlm.qwen_openai_client_v1 \
  --model qwen3.6-plus \
  --text 'Return a JSON object {"ok": true} and nothing else.' \
  --json-object
```

```bash
.venv/bin/python - <<'PY'
import json, os
from openai import OpenAI
from scripts.common.env import load_project_env
load_project_env()
client = OpenAI(
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
resp = client.chat.completions.create(
    model="qwen3-vl-flash",
    messages=[{"role": "user", "content": 'Return only a JSON object {"ok": true}.'}],
    extra_body={"enable_thinking": False},
)
print(json.dumps({"model": resp.model, "content": resp.choices[0].message.content}, ensure_ascii=False))
PY
```

## Result List

1. lane runner: fail
   The artifact wrote `10` shard-1 rows, but all `10` rows carried `failure_reason = "<3>WSL ... UtilBindVsockAnyPort:307: socket failed 1"`.
2. closure run: partial pass
   The closure flow wrote evidence bundles and a green gate:
   - `gate_pass = true`
   - `scope_mode = lane_results`
   - `cumulative_mode = false`
3. projection audit: fail
   The real current-shard audit under `SUPABASE_PG_COMPAT=true` reported:
   - `duplicate_projection_rows = 0`
   - `current_shard_projection_completeness = 0.0`
   - `current_shard_queryability = 1.0`
   - all `10` shard-1 rows were missing required projection fields `summary` and `search_text`
4. deterministic full-review: fail
   The artifact wrote `10` records, but every record ended with `error = "api_error: Connection error."`, so:
   - `reviewed_count = 0`
   - `acceptance_rate = null`
5. canonical verdict: fail
   `docs/reports/2026-04-19-9709-wave-a-shard1-verdict.json` recorded:
   - `provider_failures = 10`
   - `projection_pass = false`
   - `full_review_acceptance = 0.0`
   - `pass = false`
6. shard reset: pass
   The required fail-path reset removed only shard-1 identities:
   - `question_bank`: `10 -> 0`
   - `learning_question_analysis_snapshots`: `10 -> 0`
   - `learning_question_events`: `10 -> 0`
   - no out-of-scope deletes
7. focused qc_stats regression test: pass
   The new pytest covers the exact `--thresholds-json` path that previously crashed with `NameError: read_json is not defined`.
8. focused pg-compat delete regression test: pass
   The new Jest test covers `.delete().select(...)`, which the reset runner requires under `SUPABASE_PG_COMPAT=true`.
9. exact qc_stats issue command after fix: pass with caveat
   The command now writes `docs/reports/2026-04-19-9709-wave-a-shard1-qc.json`, but the issue command omits `--shard-id`, so the wave-1 overlay spans all `30` manifest rows while only `10` shard-1 rows carry actual lane evidence.
10. no-image Windows-host wrapper smoke: pass
    `python3 -m scripts.vlm.qwen_openai_client_v1 ... --json-object` returned `{"ok": true}` with `model = "qwen3.6-plus"`.
11. no-image direct DashScope OpenAI smoke: pass
    `.venv/bin/python` with `OpenAI(... base_url=DashScope ...)` returned `{"ok": true}` with `model = "qwen3-vl-flash"`.
12. image-based rerun smoke: blocked before execution
    The approvals reviewer rejected the safer single-row rerun smoke because it would send a local exam-image asset to the external DashScope service without explicit user approval.

## Remediation Notes

The original fail artifacts show two independent runtime blockers:

1. provider/image path
   The lane runner and the deterministic full-review both failed when they had to send local exam images through their respective provider paths. The no-image smokes show the credentials and basic transport are valid outside the sandbox, but they do **not** authorize sending local image assets to DashScope.
2. qc / reset utility defects
   `qc_stats.py` had a reproducible import bug, and the pg-compat query builder lacked delete support. Both are fixed on this branch and verified with focused tests.

The required reset is now complete, so the worktree is in a clean fail-path state for shard-1.

## Conclusion

Issue `#246` is not green on the current execution line.

The current canonical shard-1 state remains `verdict = fail`, and shard-2 must not start.

The branch now contains:

- the original shard-1 fail artifacts
- the required reset artifact
- the fixed qc/reset utility code
- the missing execution report and qc artifact
- safe provider diagnostics proving that no-image transport works outside the sandbox

The next honest step is a full shard-1 rerun from the top **only after** explicit approval exists for uploading local exam-image assets to DashScope from this session.
