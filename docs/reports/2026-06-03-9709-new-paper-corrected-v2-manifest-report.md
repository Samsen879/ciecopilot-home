# 9709 new-paper corrected v2 pre-shard manifests

日期: 2026-06-03

## Verdict

Corrected v2 input manifests were built by retaining only rows whose `q_number` has a strict left-margin printed question header in the source PDF text layer.

This is a `pre-shard input correction` that prepares the later `pre-shard screenshot/crop gate` rerun.

- Not production-ready.
- Not VLM-reviewed.
- Not authority/DB/search/release closeout.
- External VLM/API calls: `0`.

## Summary

- input shard manifests: `24`
- v1 rows: `610`
- corrected v2 rows: `593`
- excluded false-positive rows: `17`
- v2 shards: `24`
- v2 PDFs: `72`
- root cause: `v1 locator admitted PDF page numbers or non-header numeric tokens where strict printed question headers were absent`
- next step: `rerun local-only pre-shard screenshot/crop gate on v2 manifests`

## Per-Shard Counts

| Shard | v1 rows | v2 rows | Excluded |
| --- | ---: | ---: | ---: |
| `p1_m25_standard_001` | 11 | 11 | 0 |
| `p1_s25_standard_001` | 42 | 42 | 0 |
| `p1_w24_standard_001` | 32 | 32 | 0 |
| `p1_w25_standard_001` | 46 | 42 | 4 |
| `p2_m25_standard_001` | 8 | 8 | 0 |
| `p2_s25_standard_001` | 28 | 28 | 0 |
| `p2_w24_standard_001` | 21 | 21 | 0 |
| `p2_w25_standard_001` | 36 | 31 | 5 |
| `p3_m25_standard_001` | 11 | 11 | 0 |
| `p3_s25_standard_001` | 44 | 44 | 0 |
| `p3_w24_standard_001` | 32 | 32 | 0 |
| `p3_w25_standard_001` | 44 | 44 | 0 |
| `p4_m25_standard_001` | 7 | 7 | 0 |
| `p4_s25_standard_001` | 34 | 28 | 6 |
| `p4_w24_standard_001` | 22 | 22 | 0 |
| `p4_w25_standard_001` | 29 | 28 | 1 |
| `p5_m25_standard_001` | 6 | 6 | 0 |
| `p5_s25_standard_001` | 26 | 26 | 0 |
| `p5_w24_standard_001` | 20 | 20 | 0 |
| `p5_w25_standard_001` | 28 | 27 | 1 |
| `p6_m25_standard_001` | 6 | 6 | 0 |
| `p6_s25_standard_001` | 30 | 30 | 0 |
| `p6_w24_standard_001` | 21 | 21 | 0 |
| `p6_w25_standard_001` | 26 | 26 | 0 |

## Excluded Rows

| Storage key | Source PDF | q | Reason |
| --- | --- | ---: | --- |
| `9709/w25_qp_15/questions/q12.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 12 | `strict_printed_question_header_absent` |
| `9709/w25_qp_15/questions/q13.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 13 | `strict_printed_question_header_absent` |
| `9709/w25_qp_15/questions/q14.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 14 | `strict_printed_question_header_absent` |
| `9709/w25_qp_15/questions/q15.png` | `data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf` | 15 | `strict_printed_question_header_absent` |
| `9709/w25_qp_22/questions/q08.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 8 | `strict_printed_question_header_absent` |
| `9709/w25_qp_22/questions/q09.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 9 | `strict_printed_question_header_absent` |
| `9709/w25_qp_22/questions/q10.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 10 | `strict_printed_question_header_absent` |
| `9709/w25_qp_22/questions/q11.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 11 | `strict_printed_question_header_absent` |
| `9709/w25_qp_22/questions/q12.png` | `data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf` | 12 | `strict_printed_question_header_absent` |
| `9709/s25_qp_41/questions/q08.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 8 | `strict_printed_question_header_absent` |
| `9709/s25_qp_41/questions/q09.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 9 | `strict_printed_question_header_absent` |
| `9709/s25_qp_41/questions/q10.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 10 | `strict_printed_question_header_absent` |
| `9709/s25_qp_41/questions/q11.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 11 | `strict_printed_question_header_absent` |
| `9709/s25_qp_41/questions/q12.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf` | 12 | `strict_printed_question_header_absent` |
| `9709/s25_qp_45/questions/q12.png` | `data/past-papers/9709Mathematics/paper4/9709_s25_qp_45.pdf` | 12 | `strict_printed_question_header_absent` |
| `9709/w25_qp_45/questions/q07.png` | `data/past-papers/9709Mathematics/paper4/9709_w25_qp_45.pdf` | 7 | `strict_printed_question_header_absent` |
| `9709/w25_qp_51/questions/q11.png` | `data/past-papers/9709Mathematics/paper5/9709_w25_qp_51.pdf` | 11 | `strict_printed_question_header_absent` |

## Stop Boundary

Stop here for manifest correction. This artifact does not run formal page-chain production, VLM review, authority alignment, DB backfill, question analysis, search gate, release preflight, or any external DashScope/Qwen VLM/API call.
