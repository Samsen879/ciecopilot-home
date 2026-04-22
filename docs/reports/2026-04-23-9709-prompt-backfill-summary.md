# 2026-04-23 9709 Prompt Backfill Summary

Issue: `9709-prompt-backfill`

## Goal

Recover prompt material for the `299` authority-ready `9709` paper-question rows that were still mostly skipping AO question analysis because the previous ready-only batch used placeholder empty-lane evidence.

## Inputs

- authority manifest: `data/manifests/9709_authority_ready_batch_300_v1.json`
- authority sidecar: `data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json`
- previous ready manifest baseline: `docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json`
- current run lane results (raw): `docs/reports/2026-04-23-9709-prompt-backfill-lane-results.json`
- current run lane results (cleaned): `docs/reports/2026-04-23-9709-prompt-backfill-lane-results-clean.json`

## Baseline Counts

Fresh pre-run DB check on the `299` ready rows:

- `ready_with_prompt = 41`
- `ready_without_prompt = 258`
- `ready_with_snapshot = 43`
- `descriptor_rows_ok = 0`
- `descriptor_rows_with_summary = 0`

## Commands Run

Probe:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python scripts/vlm/qwen_lane_runner_v1.py \
  --manifest docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json \
  --max-jobs 1 \
  --output tmp/2026-04-23-9709-prompt-backfill-probe-results.json
```

Full lane replay:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python scripts/vlm/qwen_lane_runner_v1.py \
  --manifest docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json \
  --output docs/reports/2026-04-23-9709-prompt-backfill-lane-results.json
```

Aggregate QC:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python scripts/vlm/qc_stats.py \
  --manifest docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json \
  --lane-results-json docs/reports/2026-04-23-9709-prompt-backfill-lane-results.json \
  --output-json docs/reports/2026-04-23-9709-prompt-backfill-qc.json
```

Authority batch + host backfills:

```bash
node scripts/learning/run_9709_authority_ready_batch.js \
  --manifest data/manifests/9709_authority_ready_batch_300_v1.json \
  --authority-sidecar data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json \
  --curriculum-seed data/curriculum/9709_authority_ready_batch_300_nodes_v2.json \
  --lane-results docs/reports/2026-04-23-9709-prompt-backfill-lane-results-clean.json \
  --authority-manifest-out docs/reports/2026-04-23-9709-prompt-backfill-authority-manifest.json \
  --aligned-manifest-out docs/reports/2026-04-23-9709-prompt-backfill-aligned-manifest.json \
  --ready-manifest-out docs/reports/2026-04-23-9709-prompt-backfill-ready-manifest.json \
  --evidence-bundles-out docs/reports/2026-04-23-9709-prompt-backfill-evidence-bundles.json \
  --gate-report docs/reports/2026-04-23-9709-prompt-backfill-gate-report.md \
  --gate-json docs/reports/2026-04-23-9709-prompt-backfill-gate.json
```

## QC Posture

Lane replay aggregate QC from `docs/reports/2026-04-23-9709-prompt-backfill-qc.json`:

- `pilot rows = 299`
- `summary presence = 297`
- `missing summaries = 2`
- `descriptor coverage = 297 / 299 = 0.9933110367892977`
- `provider failures = 2`

The two failed rows were:

- `9709/s24_qp_13/questions/q09.png`
- `9709/s24_qp_33/questions/q09.png`

Both failures reported `Windows-host Qwen provider did not return a valid JSON object`.

## Cleanup Applied

Before hydration, the raw lane replay was normalized into `docs/reports/2026-04-23-9709-prompt-backfill-lane-results-clean.json`.

Deterministic cleanup:

- trimmed low-signal footer boilerplate from `summary` and `ocr_text` on `21` rows
- removed `Additional Page`
- removed `BLANK PAGE`
- removed copyright / permission boilerplate
- preserved the two provider-failure rows unchanged so they remain visible and can be retried explicitly later

## Post-Run Counts

Fresh post-run DB check on `docs/reports/2026-04-23-9709-prompt-backfill-ready-manifest.json`:

- `ready_with_prompt = 297`
- `ready_without_prompt = 2`
- `ready_with_snapshot = 299`
- `descriptor_summary_status = evidence_bundle_summary` on `297` rows
- `descriptor_search_text_status = evidence_bundle_search_text` on `299` rows

The only ready rows still lacking prompt material after the run are:

- `9709/s24_qp_13/questions/q09.png`
- `9709/s24_qp_33/questions/q09.png`

Both still have active snapshots but no prompt because the upstream lane replay failed before producing OCR evidence.

## Gate Result

`docs/reports/2026-04-23-9709-prompt-backfill-gate.json` recorded:

- `exact_structured_match_rate = 1`
- `subject_leakage_rate = 0`
- `metadata_completeness_rate = 1`
- `null_summary_rate = 0`
- `pass = true`

## Residual Notes

- The direct `qc_vlm_spot_check.py` full-review sample was not used as the release gate for this slice. The local environment routes `httpx` through proxy variables that require `socksio`, and the direct no-proxy rerun did not complete in a reasonable window. The batch decision therefore relied on:
  - completed `299`-row live lane replay
  - aggregate QC coverage
  - explicit isolation of the `2` provider-failure rows
  - manual inspection of representative summaries across `functions`, `trigonometry`, and `integration`
- `paper-question-registry-backfill` still reports `prompt_representation_source = missing` for rows that did not hydrate from `question_descriptions_v0`; the effective prompt recovery in this run came from the evidence-bundle path during question-analysis backfill.
