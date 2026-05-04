# 9709 p1_m_standard_001 evidence bundle summary

## Scope

This report records the screenshot/review-crop and evidence-bundle step for `p1_m_standard_001`.

It does not run analysis backfill, DB write-back, search/classifier gates, or release gates. The shard is not production-ready yet.

## Inputs

- shard manifest: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/shard-manifest.json`
- page-chain payloads: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/outputs/*.json`
- rendered pages: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/renders/`
- warning disposition: `docs/reports/2026-05-04-9709-p1-m-standard-001-warning-disposition.json`

## Warning disposition

The only page-chain warning was `9709_m21_qp_12.pdf` q09:

- warning: `subpart_mark_count_mismatch`
- disposition: `accepted_with_normalized_structure`
- blocker: `false`
- normalized subpart labels: `["(a)(i)", "(a)(ii)", "(b)"]`
- normalized marks: `[3, 2, 4]`
- review posture: keep `requires_review=true`
- OCR posture: keep human review required because the saved OCR dropped theta symbols in parts of q09 text

The raw page-chain boundary was accepted, but raw marks were not accepted for write-back.

## Screenshot/review crops

Review crops were generated from the saved page-chain payloads:

- payload count: `8`
- question count: `85`
- crop count: `126`
- local crop root: `tmp/pdf-page-chain/full-scaleout/p1_m_standard_001/review-crops/`
- tracked crop index: `docs/reports/2026-05-04-9709-p1-m-standard-001-review-crops-index.json`

The crop PNG files remain in ignored `tmp/` storage for local review. They were not committed as binary repo artifacts.

## Projection and surface manifest

Projection result:

- projected items: `85`
- diagram_present.true: `26`
- diagram_present.false: `59`
- route_counts.diagram_lane: `26`
- route_counts.ocr_lane: `59`
- warning dispositions applied: `1`

Tracked artifacts:

- resolution audit: `docs/reports/2026-05-04-9709-p1-m-standard-001-resolution-audit.json`
- page-chain projection: `docs/reports/2026-05-04-9709-p1-m-standard-001-page-chain-projection.json`
- lane results: `docs/reports/2026-05-04-9709-p1-m-standard-001-lane-results.json`
- triaged surface manifest: `data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json`

The triaged surface manifest deliberately keeps `primary_topic_path` as `null`. Topic authority has not been backfilled in this step.

## Evidence bundle

Evidence bundle output:

- evidence bundles: `85`
- `diagram_lane`: `26`
- `ocr_lane`: `59`
- `lazy_attach_original_image`: `85`
- tracked bundle: `docs/reports/2026-05-04-9709-p1-m-standard-001-evidence-bundles.json`

The evidence bundle consistency check passed:

- manifest items: `85`
- projection items: `85`
- bundle items: `85`
- manifest/evidence/surface `diagram_present` matched for all `85` items
- all surface flags are explicit booleans
- q09 normalized subquestion blocks and review posture are present in the persisted bundle
- q09 review posture includes `ocr_symbol_omission`

## Stop point

Stop here before analysis or DB write-back.

The next valid step is post-extraction review for this shard, especially:

- all `26` diagram-lane rows
- q09 normalized mark/subpart disposition
- multi-page questions and any unusually short OCR rows

Only after post-extraction review passes should this shard proceed to analysis backfill, search/classifier checks, and release gates.
