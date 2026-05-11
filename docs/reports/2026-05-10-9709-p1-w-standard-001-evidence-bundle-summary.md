# 9709 p1_w_standard_001 evidence bundle summary

日期: 2026-05-10

## Scope

- shard id: `p1_w_standard_001`
- manifest id: `9709_full_scaleout_manifest_v1_p1_w_standard_001`
- projected items: `228`
- warning dispositions applied: `3`

## Routes

| Route | Count |
|---|---:|
| `diagram_lane` | `61` |
| `ocr_lane` | `167` |

## Diagram Presence

| diagram_present | Count |
|---|---:|
| `true` | `61` |
| `false` | `167` |

## Review Crops

| Metric | Count |
|---|---:|
| payloads | `21` |
| questions | `228` |
| crops | `330` |

## Evidence Bundle

| Metric | Count |
|---|---:|
| bundles planned | `228` |
| lazy attach original image | `228` |

## Artifacts

- evidence bundles: `docs/reports/2026-05-10-9709-p1-w-standard-001-evidence-bundles.json`
- projection: `docs/reports/2026-05-10-9709-p1-w-standard-001-page-chain-projection.json`
- review crops index: `docs/reports/2026-05-10-9709-p1-w-standard-001-review-crops-index.json`
- lane results: `docs/reports/2026-05-10-9709-p1-w-standard-001-lane-results.json`
- resolution audit: `docs/reports/2026-05-10-9709-p1-w-standard-001-resolution-audit.json`
- post-extraction review: `docs/reports/2026-05-10-9709-p1-w-standard-001-post-extraction-review.json`

## Downstream Posture

The evidence bundle is shard-scoped extraction evidence only. It does not authorize DB write-back, analysis backfill, classifier/search checks, or release gates without the next authority-alignment step.
