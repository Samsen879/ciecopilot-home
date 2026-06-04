# 9709 corrected-v2 new-paper production-ready closeout

日期: 2026-06-04

## Verdict

新增 corrected-v2 `9709` PDF 题目行已全量 production-ready。

- aggregate gate status: `pass`
- corrected-v2 shards: `24`
- corrected-v2 rows: `593`
- source PDFs: `72`
- blockers: `0`

## Gate Contract

- ready manifest row match: `24/24`
- DB coverage: `24/24`
- search gate: `24/24`
- release preflight: `24/24`
- production-ready closeout: `24/24`

DB coverage requires `present == manifest_count == joined_snapshots == shard rows` and zero values for `missing_registry`, `prompt_missing`, `provenance_missing`, `search_text_missing`, `snapshot_ref_missing`, `snapshot_missing`, and `materialized_classifier_missing`.

## Distribution

| Paper | Rows |
| --- | ---: |
| `p1` | 127 |
| `p2` | 88 |
| `p3` | 131 |
| `p4` | 85 |
| `p5` | 79 |
| `p6` | 83 |

| Session | Rows |
| --- | ---: |
| `m25` | 49 |
| `s25` | 198 |
| `w24` | 148 |
| `w25` | 198 |

## Shard Matrix

| Shard | Rows | Ready | DB | Search | Release | Production closeout |
| --- | ---: | --- | --- | --- | --- | --- |
| `p1_m25_standard_001` | 11 | `true` | `true` | `true` | `true` | `true` |
| `p1_s25_standard_001` | 42 | `true` | `true` | `true` | `true` | `true` |
| `p1_w24_standard_001` | 32 | `true` | `true` | `true` | `true` | `true` |
| `p1_w25_standard_001` | 42 | `true` | `true` | `true` | `true` | `true` |
| `p2_m25_standard_001` | 8 | `true` | `true` | `true` | `true` | `true` |
| `p2_s25_standard_001` | 28 | `true` | `true` | `true` | `true` | `true` |
| `p2_w24_standard_001` | 21 | `true` | `true` | `true` | `true` | `true` |
| `p2_w25_standard_001` | 31 | `true` | `true` | `true` | `true` | `true` |
| `p3_m25_standard_001` | 11 | `true` | `true` | `true` | `true` | `true` |
| `p3_s25_standard_001` | 44 | `true` | `true` | `true` | `true` | `true` |
| `p3_w24_standard_001` | 32 | `true` | `true` | `true` | `true` | `true` |
| `p3_w25_standard_001` | 44 | `true` | `true` | `true` | `true` | `true` |
| `p4_m25_standard_001` | 7 | `true` | `true` | `true` | `true` | `true` |
| `p4_s25_standard_001` | 28 | `true` | `true` | `true` | `true` | `true` |
| `p4_w24_standard_001` | 22 | `true` | `true` | `true` | `true` | `true` |
| `p4_w25_standard_001` | 28 | `true` | `true` | `true` | `true` | `true` |
| `p5_m25_standard_001` | 6 | `true` | `true` | `true` | `true` | `true` |
| `p5_s25_standard_001` | 26 | `true` | `true` | `true` | `true` | `true` |
| `p5_w24_standard_001` | 20 | `true` | `true` | `true` | `true` | `true` |
| `p5_w25_standard_001` | 27 | `true` | `true` | `true` | `true` | `true` |
| `p6_m25_standard_001` | 6 | `true` | `true` | `true` | `true` | `true` |
| `p6_s25_standard_001` | 30 | `true` | `true` | `true` | `true` | `true` |
| `p6_w24_standard_001` | 21 | `true` | `true` | `true` | `true` | `true` |
| `p6_w25_standard_001` | 26 | `true` | `true` | `true` | `true` | `true` |


## Artifacts

- generator: `scripts/learning/run_9709_new_paper_v2_production_ready_aggregate_gate.js`
- machine gate: `docs/reports/2026-06-04-9709-new-paper-v2-production-ready-aggregate-gate.json`
- markdown closeout: `docs/reports/2026-06-04-9709-new-paper-v2-production-ready-closeout.md`
- per-shard final artifacts: `docs/reports/2026-06-04-9709-p*-*-standard-001-*-final.*`
- per-shard production closeouts: `docs/reports/2026-06-04-9709-p*-*-standard-001-production-ready.*`

## Boundary

- Scope is the 24 corrected-v2 new-paper shards / 593 rows / 72 PDFs only.
- This does not use the old 610-row v1 new-paper manifests.
- Visual disposition for this corrected-v2 batch is local/operator-reviewed, not external VLM-reviewed.
- DB backfill, analysis hydration, search gate, release preflight, and DB coverage have all been checked shard-by-shard before this aggregate verdict.
