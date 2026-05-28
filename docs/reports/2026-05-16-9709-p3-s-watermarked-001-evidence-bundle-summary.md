# 9709 p3_s_watermarked_001 evidence bundle summary

日期: 2026-05-16

## Scope

- shard id: `p3_s_watermarked_001`
- manifest id: `9709_full_scaleout_manifest_v1_p3_s_watermarked_001_input_v1_page_chain_surface_v1`
- projected items: `30`
- warning dispositions applied: `1`

## Routes

| Route | Count |
|---|---:|
| `diagram_lane` | `5` |
| `ocr_lane` | `25` |

## Diagram Presence

| diagram_present | Count |
|---|---:|
| `false` | `25` |
| `true` | `5` |

## Review Crops

| Metric | Count |
|---|---:|
| payloads | `3` |
| questions | `30` |
| crops | `46` |

## Evidence Bundle

| Metric | Count |
|---|---:|
| bundles planned | `30` |
| lazy attach original image | `30` |

All `30` items remained review-required before human disposition because the source PDFs are watermarked.

## Artifacts

- page-chain surface manifest: `data/manifests/9709_p3_s_watermarked_001_page_chain_surface_v1.json`
- evidence bundles: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-evidence-bundles.json`
- projection: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-page-chain-projection.json`
- review crops index: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-review-crops-index.json`
- lane results: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-lane-results.json`
- resolution audit: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-resolution-audit.json`
- warning disposition: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-warning-disposition.json`
- post-extraction review: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-post-extraction-review.json`

## Downstream Posture

The evidence bundle is shard-scoped extraction evidence only. Production readiness depends on the accepted human visual disposition, authority sidecar, registry/analysis backfill, search gate, release preflight, and DB coverage artifacts.
