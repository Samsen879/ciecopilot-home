# 9709 p1_m_watermarked_001 evidence bundle summary

日期: 2026-05-11

## Scope

- shard id: `p1_m_watermarked_001`
- manifest id: `9709_full_scaleout_manifest_v1_p1_m_watermarked_001`
- projected items: `12`
- warning dispositions applied: `0`

## Routes

| Route | Count |
|---|---:|
| `diagram_lane` | `3` |
| `ocr_lane` | `9` |

## Diagram Presence

| diagram_present | Count |
|---|---:|
| `true` | `3` |
| `false` | `9` |

## Review Crops

| Metric | Count |
|---|---:|
| payloads | `1` |
| questions | `12` |
| crops | `16` |

## Evidence Bundle

| Metric | Count |
|---|---:|
| bundles planned | `12` |
| lazy attach original image | `12` |

All `12` items remain review-required because the source PDF is watermarked.

## Artifacts

- page-chain surface manifest: `data/manifests/9709_p1_m_watermarked_001_page_chain_surface_v1.json`
- evidence bundles: `docs/reports/2026-05-11-9709-p1-m-watermarked-001-evidence-bundles.json`
- projection: `docs/reports/2026-05-11-9709-p1-m-watermarked-001-page-chain-projection.json`
- review crops index: `docs/reports/2026-05-11-9709-p1-m-watermarked-001-review-crops-index.json`
- lane results: `docs/reports/2026-05-11-9709-p1-m-watermarked-001-lane-results.json`
- resolution audit: `docs/reports/2026-05-11-9709-p1-m-watermarked-001-resolution-audit.json`
- post-extraction review: `docs/reports/2026-05-11-9709-p1-m-watermarked-001-post-extraction-review.json`

## Downstream Posture

The evidence bundle is shard-scoped extraction evidence only. It does not authorize authority sidecar creation, DB write-back, analysis backfill, search/classifier checks, or release gates while post-extraction review remains `needs_human_review`.
