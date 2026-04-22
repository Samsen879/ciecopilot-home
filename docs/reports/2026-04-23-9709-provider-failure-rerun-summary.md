# 2026-04-23 9709 Provider Failure Rerun Summary

Issue: `9709-provider-failure-rerun`

## Scope

Target only the two unresolved storage keys that remained after merged PR #275:

- `9709/s24_qp_13/questions/q09.png`
- `9709/s24_qp_33/questions/q09.png`

## Root Cause Investigation

The original prompt-backfill failure string was too coarse. Direct OCR probes against the Windows-host Qwen lane showed that the provider was no longer returning arbitrary invalid output. The actual failure mode was truncated JSON:

- at `max_tokens=768`, both rows ended with `finish_reason=length` and the JSON payload cut off mid-structure
- at `max_tokens=1536`, both rows ended with `finish_reason=stop` and parsed cleanly

The first forced backfill using the raw `1536` OCR payloads still produced a bad downstream result on `9709/s24_qp_33/questions/q09.png`: the OCR covered the full page (`q09`, `q10`, `q11`), so cross-question cues polluted the classification and temporarily produced `9709.trigonometry.identities`.

The final recovery path therefore used two deterministic steps:

1. rerun the upstream OCR lane at `max_tokens=1536` for the two failed rows
2. clean the successful OCR output down to the `q09` section only before rebuilding evidence bundles and rerunning `question_analysis_backfill`

No local truth was fabricated. The final prompt material comes from the live provider output, trimmed only by explicit footer stripping and `q09` boundary extraction.

## Commands Run

Targeted probe + recovery artifact generation:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python - <<'PY'
# wrote:
# - docs/reports/2026-04-23-9709-provider-failure-rerun-manifest.json
# - docs/reports/2026-04-23-9709-provider-failure-rerun-probe.json
# - docs/reports/2026-04-23-9709-provider-failure-rerun-lane-results.json
# - docs/reports/2026-04-23-9709-provider-failure-rerun-lane-results-clean.json
PY
```

Question-specific cleanup of the recovered OCR payloads:

```bash
node --input-type=module - <<'NODE'
# rewrote docs/reports/2026-04-23-9709-provider-failure-rerun-lane-results-clean.json
# using q09-only section extraction plus question-aware subquestion chunking
NODE
```

Evidence bundle rebuild:

```bash
node --input-type=module - <<'NODE'
# wrote docs/reports/2026-04-23-9709-provider-failure-rerun-evidence-bundles.json
NODE
```

Forced paper-question analysis backfill through local PG compat:

```bash
SUPABASE_PG_COMPAT=true DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
node scripts/learning/run_question_analysis_backfill.js \
  --force \
  --source-kind paper_question \
  --manifest docs/reports/2026-04-23-9709-provider-failure-rerun-manifest.json \
  --evidence-bundles docs/reports/2026-04-23-9709-provider-failure-rerun-evidence-bundles.json \
  > docs/reports/2026-04-23-9709-provider-failure-rerun-question-analysis-backfill.json
```

Post-backfill DB verification:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
psql "$DATABASE_URL" -XtA <<'SQL' \
  > docs/reports/2026-04-23-9709-provider-failure-rerun-db-state.json
-- queried question_bank, learning_question_analysis_snapshots,
-- and learning_question_search_projection for the two storage keys
SQL
```

## Results

`docs/reports/2026-04-23-9709-provider-failure-rerun-question-analysis-backfill.json` recorded:

- `processed = 2`
- `backfilled = 2`
- `skipped = 0`

`docs/reports/2026-04-23-9709-provider-failure-rerun-db-state.json` recorded:

- `9709/s24_qp_13/questions/q09.png`
  - `prompt_length = 436`
  - `descriptor_summary_status = evidence_bundle_summary`
  - `descriptor_search_text_status = evidence_bundle_search_text`
  - `release_scope_status = non_released_fallback`
  - active snapshot `1a458e04-7e97-4237-aec5-16bf1bd61306`
- `9709/s24_qp_33/questions/q09.png`
  - `prompt_length = 459`
  - `descriptor_summary_status = evidence_bundle_summary`
  - `descriptor_search_text_status = evidence_bundle_search_text`
  - `primary_question_type_id = 9709.differential_equations.separable`
  - `release_scope_status = released_scoring`
  - active snapshot `65b2dc84-1e23-4b93-a95c-4c95e015d5bd`

Both rows now have non-empty prompt material in `question_bank` and non-empty `summary` / `search_text` in `learning_question_search_projection`.

## Residual Notes

- `9709/s24_qp_13/questions/q09.png` still lands in `non_released_fallback` with `primary_question_type_id = null`. That is acceptable for the current contract posture: prompt material is recovered, but the row is not promoted into released scoring.
- `9709/s24_qp_33/questions/q09.png` now classifies correctly as `9709.differential_equations.separable`, but its derived `search_text` still contains a generic `evaluate integral` cue. That comes from the current search-signal heuristic treating `dx/dt` as an integral-like token. The active snapshot and prompt state are correct; the remaining risk is limited to search-text noisiness for this exact storage key.
