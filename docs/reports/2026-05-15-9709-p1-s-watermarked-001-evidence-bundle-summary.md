# 9709 p1_s_watermarked_001 evidence bundle summary

日期: 2026-05-15

## Scope

- shard id: `p1_s_watermarked_001`
- manifest id: `9709_full_scaleout_manifest_v1_p1_s_watermarked_001_page_chain_surface_v1`
- projected items: `33`
- warning dispositions applied: `1`

## Routes

| Route | Count |
|---|---:|
| `diagram_lane` | `9` |
| `ocr_lane` | `24` |

## Diagram Presence

| diagram_present | Count |
|---|---:|
| `true` | `9` |
| `false` | `24` |

## Review Crops

| Metric | Count |
|---|---:|
| payloads | `3` |
| questions | `33` |
| crops | `46` |

## Evidence Bundle

| Metric | Count |
|---|---:|
| bundles planned | `33` |
| lazy attach original image | `33` |

All `33` items remained review-required before human disposition because the source PDFs are watermarked. q06 in `WM_9709_s20_qp_11.pdf` also carried the accepted warning disposition.

## Artifacts

- page-chain surface manifest: `data/manifests/9709_p1_s_watermarked_001_page_chain_surface_v1.json`
- evidence bundles: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-evidence-bundles.json`
- projection: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-page-chain-projection.json`
- review crops index: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-review-crops-index.json`
- lane results: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-lane-results.json`
- resolution audit: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-resolution-audit.json`
- post-extraction review: `docs/reports/2026-05-15-9709-p1-s-watermarked-001-post-extraction-review.json`

## Downstream Posture

The evidence bundle is shard-scoped extraction evidence only. Production readiness depends on the later accepted human visual disposition, authority sidecar, registry/analysis backfill, search gate, release preflight, and DB coverage artifacts.
