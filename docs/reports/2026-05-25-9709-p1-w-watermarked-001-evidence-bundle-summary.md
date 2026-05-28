# 9709 p1_w_watermarked_001 evidence bundle summary

日期: 2026-05-25

## Scope

- shard id: `p1_w_watermarked_001`
- manifest id: `9709_full_scaleout_manifest_v1_p1_w_watermarked_001_page_chain_surface_v1`
- projected items: `32`
- warning dispositions applied: `1`

## Routes

| Route | Count |
|---|---:|
| `diagram_lane` | `10` |
| `ocr_lane` | `22` |

## Diagram Presence

| diagram_present | Count |
|---|---:|
| `false` | `22` |
| `true` | `10` |

## Review Crops

| Metric | Count |
|---|---:|
| payloads | `3` |
| questions | `32` |
| crops | `52` |

## Evidence Bundle

| Metric | Count |
|---|---:|
| bundles planned | `32` |
| lazy attach original image | `32` |

All `32` items remained review-required before human disposition because the source PDFs are watermarked. q06 in `WM_9709_w19_qp_12.pdf` also carried the accepted warning disposition.

## Artifacts

- page-chain surface manifest: `data/manifests/9709_p1_w_watermarked_001_page_chain_surface_v1.json`
- evidence bundles: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-evidence-bundles.json`
- projection: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-page-chain-projection.json`
- review crops index: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-review-crops-index.json`
- lane results: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-lane-results.json`
- resolution audit: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-resolution-audit.json`
- post-extraction review: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-post-extraction-review.json`
- targeted visual VLM review: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-targeted-visual-vlm-review.json`

## Downstream Posture

The evidence bundle is shard-scoped extraction evidence only. Production readiness is blocked by visual watermark occlusion findings; authority sidecar, registry/analysis backfill, search gate, and release preflight were not run.
