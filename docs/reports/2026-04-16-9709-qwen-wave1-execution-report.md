# 9709 Qwen Wave 1 Execution Report

Date: 2026-04-16
Issue: `#201`
Status: executed on real pilot assets; not descriptor-ready

This report supersedes the earlier `#198` freeze-only posture for the deterministic `9709` wave-1 pilot. The earlier report froze the manifest, router contract, and execution policy. This report captures the actual pilot run, the lane-aware QC outputs, and the checked-in spot-check evidence.

## Source Documents

- `docs/superpowers/plans/2026-04-15-9709-question-bank-data-recovery-and-gate-rerun.md`
- `docs/superpowers/specs/2026-04-15-9709-qwen-api-ao-vlm-architecture-design.md`
- `docs/superpowers/plans/2026-04-16-9709-qwen-api-wave1-ao-execution-runbook.md`

## Focused Verification

The runtime and QC changes were verified with:

```bash
.venv/bin/python -m pytest tests/test_qwen_openai_client_v1.py tests/test_qwen_lane_runner_v1.py tests/test_qwen_windows_host_provider.py tests/test_qwen_wave1_qc.py -q
```

Observed result:

- `23 passed in 0.41s`

The QC CLIs were also verified after the additive manifest/lane-result work:

```bash
.venv/bin/python scripts/vlm/qc_stats.py --help
.venv/bin/python scripts/vlm/qc_vlm_spot_check.py --help
```

## Commands Run

Pilot execution:

```bash
.venv/bin/python scripts/vlm/qwen_lane_runner_v1.py \
  --manifest data/manifests/9709_question_search_recovery_v1.json \
  --output docs/reports/2026-04-16-9709-qwen-wave1-pilot-results.json
```

Lane-aware QC:

```bash
.venv/bin/python scripts/vlm/qc_stats.py \
  --manifest data/manifests/9709_question_search_recovery_v1.json \
  --lane-results-json docs/reports/2026-04-16-9709-qwen-wave1-pilot-results.json \
  --output-json docs/reports/2026-04-16-9709-qwen-wave1-qc-stats.json
```

Wave-1 spot-check:

```bash
.venv/bin/python scripts/vlm/qc_vlm_spot_check.py \
  --manifest data/manifests/9709_question_search_recovery_v1.json \
  --lane-results-json docs/reports/2026-04-16-9709-qwen-wave1-pilot-results.json \
  --output-json docs/reports/2026-04-16-9709-qwen-wave1-spot-check.json
```

## Pilot Execution Outcome

The pilot ran against all `17` canonical single-question images in `data/manifests/9709_question_search_recovery_v1.json`.

Observed wave-1 runtime counts:

- rows: `17`
- route: `review_lane=17`
- lane: `review=17`
- model: `qwen3.6-plus=17`
- decision reasons: `requires_review=17`, `unknown_surface_flags=17`, `gate_critical=2`
- `diagram_present`: `unknown=17`
- `lazy_attach_original_image`: `true=17`
- top-level `failure_reason`: `0` non-null rows

Observed descriptor surface quality:

- `summary` present: `1`
- `summary` missing: `16`
- confidence `0.95`: `1`
- confidence `0.0`: `16`

The only non-empty summary came from the gate-critical row `9709/s19_qp_11/questions/q06.png`. Even there, the runtime itself called out notation/rendering ambiguity around `tan 2x`, so the output was still not clean descriptor evidence.

## Lane-Aware QC Findings

The checked-in QC JSON is `docs/reports/2026-04-16-9709-qwen-wave1-qc-stats.json`.

Key findings:

- `question_descriptions_v0` still has `0` `9709` rows and `0` `status='ok'` rows in this environment.
- This issue did not silently mirror wave-1 lane outputs into `question_descriptions_v0`.
- The pilot stayed entirely in the review bucket: `descriptor_readiness.review_bucket=17`.
- The runtime transport layer is not the blocker. All `17` calls returned a top-level envelope with `failure_reason=null`.
- The blocker is output quality and posture consistency inside the returned evidence.

The strongest internal inconsistency is the review flag posture:

- warnings flagged `requires_review` on `17/17` rows
- manifest routing also required review on `17/17` rows
- the lane evidence itself returned `requires_review=false` on `16/17` rows and `true` on only `1/17` rows

That means the current runtime is not failing because the API is down or because assets are missing. It is failing because the structured review output is mostly empty while also disagreeing with the route-level review posture.

## Spot-Check Evidence

The checked-in spot-check JSON is `docs/reports/2026-04-16-9709-qwen-wave1-spot-check.json`.

The spot-check was run on all `17` pilot rows with `qwen3-vl-flash` as the reviewer.

Observed outcomes:

- reviewed rows: `17/17`
- `descriptor_readiness.review_bucket=17`
- `descriptor_readiness.descriptor_ready=0`
- `route_verdict.appropriate=11`
- `route_verdict.over_conservative=6`
- `review_bucket_verdict.correct=8`
- `review_bucket_verdict.cannot_judge=7`
- `review_bucket_verdict.incorrect=2`

Interpretation:

- The spot-check did not find a single row that should be promoted as descriptor-ready.
- The `over_conservative=6` signal does not mean those rows are ready. It means the reviewer believes some rows may be readable enough for a narrower OCR/diagram route, but the current run still did not produce descriptor-quality structured output for them.
- The two `incorrect` review-bucket verdicts do not justify promotion. They flag contradictory output posture on:
  - `9709/s20_qp_33/questions/q07.png`
  - `9709/s21_qp_31/questions/q03.png`

In both cases the returned output stayed empty (`summary=None`, `confidence=0.0`) while also claiming `requires_review=false` inside evidence, which is an output-consistency bug rather than recovery success.

## Descriptor Readiness Posture

The pilot is not ready for descriptor promotion.

Explicit posture for this slice:

- real pilot execution: `yes`
- canonical single-question assets used: `yes`
- lane-aware QC evidence checked in: `yes`
- spot-check evidence checked in: `yes`
- descriptor-ready pilot rows: `0/17`
- rows silently promoted out of review: `0/17`

Residual failure buckets:

- ambiguous or degraded notation: the gate-critical trigonometry row `9709/s19_qp_11/questions/q06.png` is the clearest example; it produced the only substantial summary and still remained ambiguous.
- empty review outputs: `16/17` rows returned `summary=None` and `confidence=0.0`.
- inconsistent review signaling: `16/17` rows returned evidence-level `requires_review=false` while the route, warnings, and manifest all required review.
- unresolved surface metadata: `diagram_present`, `formula_dense`, and `table_heavy` remain `null` across the pilot manifest, so the current router posture still collapses the entire slice into `review_lane`.

## Honest Conclusion

Wave-1 can now be run deterministically on the real `9709` pilot assets, and the repository now contains durable lane-aware QC plus spot-check evidence for that run.

It did not recover usable descriptor outputs for the pilot slice.

The correct posture after this execution is:

- keep all current pilot rows bucketed for review
- do not backfill `question_descriptions_v0` from these lane outputs
- do not claim descriptor readiness from the current wave-1 run
- treat the next step as route/surface-resolution work, not as a hidden soft-pass

## Checked-In Evidence

- `docs/reports/2026-04-16-9709-qwen-wave1-pilot-results.json`
- `docs/reports/2026-04-16-9709-qwen-wave1-qc-stats.json`
- `docs/reports/2026-04-16-9709-qwen-wave1-spot-check.json`
