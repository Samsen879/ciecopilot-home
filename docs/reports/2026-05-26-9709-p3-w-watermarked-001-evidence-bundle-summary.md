# 9709 p3_w_watermarked_001 evidence bundle summary

日期: 2026-05-26

## Scope

- shard id: `p3_w_watermarked_001`
- manifest id: `9709_full_scaleout_manifest_v1_p3_w_watermarked_001_page_chain_surface_v1`
- projected items: `30`
- warning dispositions applied: `0`

## Routes

| Route | Count |
|---|---:|
| `diagram_lane` | `2` |
| `ocr_lane` | `28` |

## Diagram Presence

| diagram_present | Count |
|---|---:|
| `false` | `28` |
| `true` | `2` |

## Review Crops

| Metric | Count |
|---|---:|
| payloads | `3` |
| questions | `30` |
| crops | `48` |

## Evidence Bundle

| Metric | Count |
|---|---:|
| bundles planned | `30` |
| lazy attach original image | `30` |

All `30` items remained review-required before human disposition because the source PDFs are watermarked. There were no page-chain warning dispositions for this shard.

## Artifacts

- page-chain surface manifest: `data/manifests/9709_p3_w_watermarked_001_page_chain_surface_v1.json`
- evidence bundles: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-evidence-bundles.json`
- projection: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-page-chain-projection.json`
- review crops index: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-review-crops-index.json`
- lane results: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-lane-results.json`
- resolution audit: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-resolution-audit.json`
- post-extraction review: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-post-extraction-review.json`
- contact-sheet visual VLM review: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-contact-sheet-vlm-review.json`
- targeted visual VLM review: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-targeted-visual-vlm-review.json`

## Downstream Posture

The evidence bundle is shard-scoped extraction evidence only. Production readiness is blocked by visual watermark occlusion findings; authority sidecar, registry/analysis backfill, search gate, and release preflight were not run.
