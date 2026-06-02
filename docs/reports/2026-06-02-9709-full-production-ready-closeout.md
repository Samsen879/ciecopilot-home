# 9709 full production-ready aggregate closeout

日期: 2026-06-02

## Verdict

当前 `9709` surface-manifest inventory 已全量 production-ready。

- aggregate gate status: `pass`
- current surface shards: `36/36`
- current surface rows: `2937/2937`
- blockers: `0`
- DB coverage sources: `production_ready_markdown_table`: `4`, `json`: `32`

这里的“全量”是当前已确认可解析题目行口径，不是原始 `5400` 个 probe slots。原始 2026-05-04 inventory 是 `2935` rows；后续修复和补行后，当前 surface manifests 为 `2937` rows。

## Gate Contract

已统一核对 36 个 shard 的以下条件：

- production-ready closeout 存在且行数匹配: `36/36`。
- DB coverage 中 `present == manifest_count == shard rows` 且 missing 指标全为 0: `36/36`。
- question search gate 全部 pass: `36/36`。
- final release preflight 全部 pass 且 blockers 为 0: `36/36`。

DB missing 指标包括: `missing_registry`, `prompt_missing`, `provenance_missing`, `search_text_missing`, `snapshot_ref_missing`, `snapshot_missing`, `materialized_classifier_missing`。

## Distribution

| Paper | Rows |
| --- | ---: |
| `p1` | 649 |
| `p2` | 433 |
| `p3` | 618 |
| `p4` | 412 |
| `p5` | 409 |
| `p6` | 416 |

| Session | Rows |
| --- | ---: |
| `m` | 438 |
| `s` | 1322 |
| `w` | 1177 |

| Source type | Rows |
| --- | ---: |
| `standard` | 2595 |
| `watermarked` | 342 |

## Shard Matrix

| Shard | Rows | Production ready | DB coverage | Search gate | Release preflight |
| --- | ---: | --- | --- | --- | --- |
| `p1_m_standard_001` | 85 | `true` | `true` | `true` | `true` |
| `p1_m_watermarked_001` | 12 | `true` | `true` | `true` | `true` |
| `p1_s_standard_001` | 259 | `true` | `true` | `true` | `true` |
| `p1_s_watermarked_001` | 33 | `true` | `true` | `true` | `true` |
| `p1_w_standard_001` | 228 | `true` | `true` | `true` | `true` |
| `p1_w_watermarked_001` | 32 | `true` | `true` | `true` | `true` |
| `p2_m_standard_001` | 57 | `true` | `true` | `true` | `true` |
| `p2_m_watermarked_001` | 7 | `true` | `true` | `true` | `true` |
| `p2_s_standard_001` | 173 | `true` | `true` | `true` | `true` |
| `p2_s_watermarked_001` | 23 | `true` | `true` | `true` | `true` |
| `p2_w_standard_001` | 151 | `true` | `true` | `true` | `true` |
| `p2_w_watermarked_001` | 22 | `true` | `true` | `true` | `true` |
| `p3_m_standard_001` | 83 | `true` | `true` | `true` | `true` |
| `p3_m_watermarked_001` | 10 | `true` | `true` | `true` | `true` |
| `p3_s_standard_001` | 246 | `true` | `true` | `true` | `true` |
| `p3_s_watermarked_001` | 30 | `true` | `true` | `true` | `true` |
| `p3_w_standard_001` | 219 | `true` | `true` | `true` | `true` |
| `p3_w_watermarked_001` | 30 | `true` | `true` | `true` | `true` |
| `p4_m_standard_001` | 55 | `true` | `true` | `true` | `true` |
| `p4_m_watermarked_001` | 7 | `true` | `true` | `true` | `true` |
| `p4_s_standard_001` | 164 | `true` | `true` | `true` | `true` |
| `p4_s_watermarked_001` | 20 | `true` | `true` | `true` | `true` |
| `p4_w_standard_001` | 145 | `true` | `true` | `true` | `true` |
| `p4_w_watermarked_001` | 21 | `true` | `true` | `true` | `true` |
| `p5_m_standard_001` | 54 | `true` | `true` | `true` | `true` |
| `p5_m_watermarked_001` | 6 | `true` | `true` | `true` | `true` |
| `p5_s_standard_001` | 164 | `true` | `true` | `true` | `true` |
| `p5_s_watermarked_001` | 21 | `true` | `true` | `true` | `true` |
| `p5_w_standard_001` | 143 | `true` | `true` | `true` | `true` |
| `p5_w_watermarked_001` | 21 | `true` | `true` | `true` | `true` |
| `p6_m_standard_001` | 55 | `true` | `true` | `true` | `true` |
| `p6_m_watermarked_001` | 7 | `true` | `true` | `true` | `true` |
| `p6_s_standard_001` | 170 | `true` | `true` | `true` | `true` |
| `p6_s_watermarked_001` | 19 | `true` | `true` | `true` | `true` |
| `p6_w_standard_001` | 144 | `true` | `true` | `true` | `true` |
| `p6_w_watermarked_001` | 21 | `true` | `true` | `true` | `true` |

## Inventory Note

当前 surface manifests 比 2026-05-04 原始 inventory 多 2 行净增：

- `p2_s_standard_001`: 移除 3 个 S16 false-positive slots，加入 3 个 S17 printed q02 rows，row count 不变。
- `p5_w_standard_001`: recovered `9709/w18_qp_52/questions/q02.png`。
- `p6_m_standard_001`: recovered `9709/m21_qp_62/questions/q04.png`。

因此当前可声明的生产口径是 `2937/2937` current surface rows production-ready。

## Artifacts

- generator: `scripts/learning/run_9709_full_production_ready_aggregate_gate.js`
- machine gate: `docs/reports/2026-06-02-9709-full-production-ready-aggregate-gate.json`
- shard source manifests: `data/manifests/9709_p*_page_chain_surface_v1.json`
- shard reports: `docs/reports/*9709*production-ready*`, `*db-coverage.json`, `*search-gate.json`, `*release-preflight-final.json`

## Boundary

本报告不把原始 q01-q15 probe slots 中未被确认为 printed question 的 locator 空位纳入 production-ready 题目行。若未来要审计这些 probe slots，需要单独做 locator/printed-question audit。
