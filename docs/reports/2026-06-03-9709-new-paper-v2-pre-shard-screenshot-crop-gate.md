# 9709 new-paper pre-shard screenshot/crop gate

日期: 2026-06-03

## Verdict

Gate passed only for local screenshot preparation: 具备进入正式 shard page-chain/visual/authority 流程的本地截图准备条件.

This is a `pre-shard screenshot/crop gate`.

- Not production-ready.
- Not VLM-reviewed.
- Not authority/DB/search/release closeout.
- External VLM/API calls: `0`.

## Summary

- input shard manifests: `24`
- PDFs rendered: `72`
- rendered pages: `1144`
- total rows: `593`
- pre-shard crop manifest rows: `593`
- crop rows complete: `593`
- missing crops: `0`
- multi-page rows: `186`
- ambiguous rows: `0`
- blocker rows: `0`
- visual review still required rows: `593`
- pre-shard crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`

## Per-Shard Counts

| Shard | Rows | Complete | Missing crops | Multi-page | Blockers |
| --- | ---: | ---: | ---: | ---: | ---: |
| `p1_m25_standard_001` | 11 | 11 | 0 | 3 | 0 |
| `p1_s25_standard_001` | 42 | 42 | 0 | 17 | 0 |
| `p1_w24_standard_001` | 32 | 32 | 0 | 8 | 0 |
| `p1_w25_standard_001` | 42 | 42 | 0 | 11 | 0 |
| `p2_m25_standard_001` | 8 | 8 | 0 | 2 | 0 |
| `p2_s25_standard_001` | 28 | 28 | 0 | 13 | 0 |
| `p2_w24_standard_001` | 21 | 21 | 0 | 12 | 0 |
| `p2_w25_standard_001` | 31 | 31 | 0 | 6 | 0 |
| `p3_m25_standard_001` | 11 | 11 | 0 | 4 | 0 |
| `p3_s25_standard_001` | 44 | 44 | 0 | 15 | 0 |
| `p3_w24_standard_001` | 32 | 32 | 0 | 17 | 0 |
| `p3_w25_standard_001` | 44 | 44 | 0 | 15 | 0 |
| `p4_m25_standard_001` | 7 | 7 | 0 | 3 | 0 |
| `p4_s25_standard_001` | 28 | 28 | 0 | 5 | 0 |
| `p4_w24_standard_001` | 22 | 22 | 0 | 6 | 0 |
| `p4_w25_standard_001` | 28 | 28 | 0 | 5 | 0 |
| `p5_m25_standard_001` | 6 | 6 | 0 | 4 | 0 |
| `p5_s25_standard_001` | 26 | 26 | 0 | 6 | 0 |
| `p5_w24_standard_001` | 20 | 20 | 0 | 5 | 0 |
| `p5_w25_standard_001` | 27 | 27 | 0 | 9 | 0 |
| `p6_m25_standard_001` | 6 | 6 | 0 | 2 | 0 |
| `p6_s25_standard_001` | 30 | 30 | 0 | 6 | 0 |
| `p6_w24_standard_001` | 21 | 21 | 0 | 4 | 0 |
| `p6_w25_standard_001` | 26 | 26 | 0 | 8 | 0 |

## Blockers

No blocker rows.

## Stop Boundary

Stop here. This artifact only establishes local screenshot/crop preparation status before formal shard production begins. It does not run authority alignment, DB backfill, question analysis, search gate, release preflight, or any external DashScope/Qwen VLM/API call.
