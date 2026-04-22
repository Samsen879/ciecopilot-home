# 2026-04-22 9709 Ready-Only Authority Batch Run Summary

## Commands

Dry run:

```bash
node scripts/learning/run_9709_authority_ready_batch.js \
  --manifest data/manifests/9709_authority_ready_batch_300_v1.json \
  --authority-sidecar data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json \
  --curriculum-seed data/curriculum/9709_authority_ready_batch_300_nodes_v2.json \
  --lane-results docs/reports/2026-04-22-9709-authority-ready-batch-empty-lane-results.json \
  --authority-manifest-out docs/reports/2026-04-22-9709-authority-freeze-manifest-300-v2.json \
  --aligned-manifest-out docs/reports/2026-04-22-9709-aligned-manifest-300-v2.json \
  --ready-manifest-out docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json \
  --evidence-bundles-out docs/reports/2026-04-22-9709-question-evidence-bundles-v1-300-v2.json \
  --gate-report docs/reports/2026-04-22-9709-ready-only-search-gate-report-300-v2.md \
  --gate-json docs/reports/2026-04-22-9709-ready-only-search-gate-300-v2.json \
  --dry-run
```

Real run:

```bash
node scripts/learning/run_9709_authority_ready_batch.js \
  --manifest data/manifests/9709_authority_ready_batch_300_v1.json \
  --authority-sidecar data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json \
  --curriculum-seed data/curriculum/9709_authority_ready_batch_300_nodes_v2.json \
  --lane-results docs/reports/2026-04-22-9709-authority-ready-batch-empty-lane-results.json \
  --authority-manifest-out docs/reports/2026-04-22-9709-authority-freeze-manifest-300-v2.json \
  --aligned-manifest-out docs/reports/2026-04-22-9709-aligned-manifest-300-v2.json \
  --ready-manifest-out docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json \
  --evidence-bundles-out docs/reports/2026-04-22-9709-question-evidence-bundles-v1-300-v2.json \
  --gate-report docs/reports/2026-04-22-9709-ready-only-search-gate-report-300-v2.md \
  --gate-json docs/reports/2026-04-22-9709-ready-only-search-gate-300-v2.json
```

## Inputs

- input manifest: `data/manifests/9709_authority_ready_batch_300_v1.json`
- authority sidecar: `data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json`
- curriculum seed: `data/curriculum/9709_authority_ready_batch_300_nodes_v2.json`
- lane results: `docs/reports/2026-04-22-9709-authority-ready-batch-empty-lane-results.json`

## Alignment Counts

- total rows: `300`
- ready rows: `299`
- blocked rows: `1`
- verdict breakdown:
  - `ready`: `299`
  - `blocked_authority_missing`: `1`
- blocked buckets:
  - `blocked_for_review`: `0`
  - `blocked_authority_missing`: `1`
  - `blocked_needs_seed`: `0`
  - `blocked_taxonomy_invalid`: `0`

Blocked row held out of downstream admission:

- `9709/s17_qp_63/questions/q07.png`

## Downstream Execution

- registry backfill ran: `yes`
  - processed: `299`
  - inserted: `0`
  - updated: `299`
  - conflicts: `0`
- question analysis backfill ran: `yes`
  - processed: `299`
  - backfilled: `41`
  - skipped: `258`
  - dominant skip reason: `skipped_missing_prompt_representation`
- blocked row entered ready manifest: `no`

## Gate Result

- gate pass: `false`
- failing metrics:
  - `exact_structured_match_rate`: `0.4` vs required `0.9`
  - `metadata_completeness_rate`: `0.4211` vs required `0.95`
  - `null_summary_rate`: `1` vs required `0.05`
- passing metric:
  - `subject_leakage_rate`: `0` vs required `0`

Alignment preflight was attached to the paper-backed gate cases. All pinned paper cases resolved to `overall_alignment_verdict = ready`; the gate failure remained retrieval/data-surface red rather than alignment-blocked.

## Outputs

- authority manifest: `docs/reports/2026-04-22-9709-authority-freeze-manifest-300-v2.json`
- aligned manifest: `docs/reports/2026-04-22-9709-aligned-manifest-300-v2.json`
- ready manifest: `docs/reports/2026-04-22-9709-ready-only-manifest-300-v2.json`
- evidence bundles: `docs/reports/2026-04-22-9709-question-evidence-bundles-v1-300-v2.json`
- gate report: `docs/reports/2026-04-22-9709-ready-only-search-gate-report-300-v2.md`
- gate json: `docs/reports/2026-04-22-9709-ready-only-search-gate-300-v2.json`

## Notes

- No blocked or authority-missing rows were advanced into registry or question-analysis downstream steps.
- No script inferred authority truth or patched bundle truth directly.
- The remaining runtime gap is data posture, not contract routing: `258` ready rows still lack usable prompt material for AO question analysis, so they are skipped instead of aborting the batch.
