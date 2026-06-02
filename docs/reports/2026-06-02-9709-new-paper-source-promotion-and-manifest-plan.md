# 9709 new-paper source promotion, , , and manifest plan

日期: 2026-06-02

## Verdict

72 份新增 `9709` question paper PDF 已从候选目录提升到 repo source path，并完成本地 locator inventory / shard input manifest 生成。

- source candidates promoted: `72/72`
- SHA256 copy verification: `72/72`
- local parseable question rows: `610`
- new shard inputs: `24`
- external VLM/API calls: `0`
- DB/search/release changes: `0`

这一步只是 source promotion + manifest planning，不改变既有 `2937/2937` production-ready 口径，也不声明这些新增题目 production-ready。

## Source Scope

| Session | PDFs |
| --- | ---: |
| `m25` | 6 |
| `s25` | 24 |
| `w24` | 18 |
| `w25` | 24 |

| Paper | PDFs |
| --- | ---: |
| `p1` | 12 |
| `p2` | 12 |
| `p3` | 12 |
| `p4` | 12 |
| `p5` | 12 |
| `p6` | 12 |

## Local Locator Inventory

- targeted q01-q15 slots: `1080`
- locator found rows: `610`
- parseable question rows: `610`
- missing locator rows: `470`
- low-score rows: `0`
- excluded low-score rows: `0`
- multi-page locator rows: `183`

### Rows By Paper

| Paper | Rows |
| --- | ---: |
| `1` | 131 |
| `2` | 93 |
| `3` | 131 |
| `4` | 92 |
| `5` | 80 |
| `6` | 83 |

### Rows By Session-Year

| Session-Year | Rows |
| --- | ---: |
| `m25` | 49 |
| `s25` | 204 |
| `w24` | 148 |
| `w25` | 209 |

## Shard Plan

Shard ids include session-year to avoid collision with the existing 36 production-ready shards.

| Shard | Rows | PDFs | Source PDFs |
| --- | ---: | ---: | --- |
| `p1_m25_standard_001` | 11 | 1 | data/past-papers/9709Mathematics/paper1/9709_m25_qp_12.pdf |
| `p1_s25_standard_001` | 42 | 4 | data/past-papers/9709Mathematics/paper1/9709_s25_qp_11.pdf, data/past-papers/9709Mathematics/paper1/9709_s25_qp_12.pdf, data/past-papers/9709Mathematics/paper1/9709_s25_qp_13.pdf, data/past-papers/9709Mathematics/paper1/9709_s25_qp_15.pdf |
| `p1_w24_standard_001` | 32 | 3 | data/past-papers/9709Mathematics/paper1/9709_w24_qp_11.pdf, data/past-papers/9709Mathematics/paper1/9709_w24_qp_12.pdf, data/past-papers/9709Mathematics/paper1/9709_w24_qp_13.pdf |
| `p1_w25_standard_001` | 46 | 4 | data/past-papers/9709Mathematics/paper1/9709_w25_qp_11.pdf, data/past-papers/9709Mathematics/paper1/9709_w25_qp_12.pdf, data/past-papers/9709Mathematics/paper1/9709_w25_qp_13.pdf, data/past-papers/9709Mathematics/paper1/9709_w25_qp_15.pdf |
| `p2_m25_standard_001` | 8 | 1 | data/past-papers/9709Mathematics/paper2/9709_m25_qp_22.pdf |
| `p2_s25_standard_001` | 28 | 4 | data/past-papers/9709Mathematics/paper2/9709_s25_qp_21.pdf, data/past-papers/9709Mathematics/paper2/9709_s25_qp_22.pdf, data/past-papers/9709Mathematics/paper2/9709_s25_qp_23.pdf, data/past-papers/9709Mathematics/paper2/9709_s25_qp_25.pdf |
| `p2_w24_standard_001` | 21 | 3 | data/past-papers/9709Mathematics/paper2/9709_w24_qp_21.pdf, data/past-papers/9709Mathematics/paper2/9709_w24_qp_22.pdf, data/past-papers/9709Mathematics/paper2/9709_w24_qp_23.pdf |
| `p2_w25_standard_001` | 36 | 4 | data/past-papers/9709Mathematics/paper2/9709_w25_qp_21.pdf, data/past-papers/9709Mathematics/paper2/9709_w25_qp_22.pdf, data/past-papers/9709Mathematics/paper2/9709_w25_qp_23.pdf, data/past-papers/9709Mathematics/paper2/9709_w25_qp_25.pdf |
| `p3_m25_standard_001` | 11 | 1 | data/past-papers/9709Mathematics/paper3/9709_m25_qp_32.pdf |
| `p3_s25_standard_001` | 44 | 4 | data/past-papers/9709Mathematics/paper3/9709_s25_qp_31.pdf, data/past-papers/9709Mathematics/paper3/9709_s25_qp_32.pdf, data/past-papers/9709Mathematics/paper3/9709_s25_qp_33.pdf, data/past-papers/9709Mathematics/paper3/9709_s25_qp_35.pdf |
| `p3_w24_standard_001` | 32 | 3 | data/past-papers/9709Mathematics/paper3/9709_w24_qp_31.pdf, data/past-papers/9709Mathematics/paper3/9709_w24_qp_32.pdf, data/past-papers/9709Mathematics/paper3/9709_w24_qp_33.pdf |
| `p3_w25_standard_001` | 44 | 4 | data/past-papers/9709Mathematics/paper3/9709_w25_qp_31.pdf, data/past-papers/9709Mathematics/paper3/9709_w25_qp_32.pdf, data/past-papers/9709Mathematics/paper3/9709_w25_qp_33.pdf, data/past-papers/9709Mathematics/paper3/9709_w25_qp_35.pdf |
| `p4_m25_standard_001` | 7 | 1 | data/past-papers/9709Mathematics/paper4/9709_m25_qp_42.pdf |
| `p4_s25_standard_001` | 34 | 4 | data/past-papers/9709Mathematics/paper4/9709_s25_qp_41.pdf, data/past-papers/9709Mathematics/paper4/9709_s25_qp_42.pdf, data/past-papers/9709Mathematics/paper4/9709_s25_qp_43.pdf, data/past-papers/9709Mathematics/paper4/9709_s25_qp_45.pdf |
| `p4_w24_standard_001` | 22 | 3 | data/past-papers/9709Mathematics/paper4/9709_w24_qp_41.pdf, data/past-papers/9709Mathematics/paper4/9709_w24_qp_42.pdf, data/past-papers/9709Mathematics/paper4/9709_w24_qp_43.pdf |
| `p4_w25_standard_001` | 29 | 4 | data/past-papers/9709Mathematics/paper4/9709_w25_qp_41.pdf, data/past-papers/9709Mathematics/paper4/9709_w25_qp_42.pdf, data/past-papers/9709Mathematics/paper4/9709_w25_qp_43.pdf, data/past-papers/9709Mathematics/paper4/9709_w25_qp_45.pdf |
| `p5_m25_standard_001` | 6 | 1 | data/past-papers/9709Mathematics/paper5/9709_m25_qp_52.pdf |
| `p5_s25_standard_001` | 26 | 4 | data/past-papers/9709Mathematics/paper5/9709_s25_qp_51.pdf, data/past-papers/9709Mathematics/paper5/9709_s25_qp_52.pdf, data/past-papers/9709Mathematics/paper5/9709_s25_qp_53.pdf, data/past-papers/9709Mathematics/paper5/9709_s25_qp_55.pdf |
| `p5_w24_standard_001` | 20 | 3 | data/past-papers/9709Mathematics/paper5/9709_w24_qp_51.pdf, data/past-papers/9709Mathematics/paper5/9709_w24_qp_52.pdf, data/past-papers/9709Mathematics/paper5/9709_w24_qp_53.pdf |
| `p5_w25_standard_001` | 28 | 4 | data/past-papers/9709Mathematics/paper5/9709_w25_qp_51.pdf, data/past-papers/9709Mathematics/paper5/9709_w25_qp_52.pdf, data/past-papers/9709Mathematics/paper5/9709_w25_qp_53.pdf, data/past-papers/9709Mathematics/paper5/9709_w25_qp_55.pdf |
| `p6_m25_standard_001` | 6 | 1 | data/past-papers/9709Mathematics/paper6/9709_m25_qp_62.pdf |
| `p6_s25_standard_001` | 30 | 4 | data/past-papers/9709Mathematics/paper6/9709_s25_qp_61.pdf, data/past-papers/9709Mathematics/paper6/9709_s25_qp_62.pdf, data/past-papers/9709Mathematics/paper6/9709_s25_qp_63.pdf, data/past-papers/9709Mathematics/paper6/9709_s25_qp_65.pdf |
| `p6_w24_standard_001` | 21 | 3 | data/past-papers/9709Mathematics/paper6/9709_w24_qp_61.pdf, data/past-papers/9709Mathematics/paper6/9709_w24_qp_62.pdf, data/past-papers/9709Mathematics/paper6/9709_w24_qp_63.pdf |
| `p6_w25_standard_001` | 26 | 4 | data/past-papers/9709Mathematics/paper6/9709_w25_qp_61.pdf, data/past-papers/9709Mathematics/paper6/9709_w25_qp_62.pdf, data/past-papers/9709Mathematics/paper6/9709_w25_qp_63.pdf, data/past-papers/9709Mathematics/paper6/9709_w25_qp_65.pdf |

## Artifacts

- machine inventory: `docs/reports/2026-06-02-9709-new-paper-post-source-inventory.json`
- combined manifest: `data/manifests/9709_new_papers_2026_06_02_manifest_v1.json`
- shard input manifests: `data/manifests/9709_p*_m25_standard_001_input_v1.json`, `data/manifests/9709_p*_s25_standard_001_input_v1.json`, `data/manifests/9709_p*_w24_standard_001_input_v1.json`, and `data/manifests/9709_p*_w25_standard_001_input_v1.json`
- source candidates: `tmp/9709_source_candidates/2026-06-02/`
- source paths: `data/past-papers/9709Mathematics/paper*/9709_*_qp_*.pdf`

## Stop Boundary

The next operational step is page-chain extraction/crops/evidence on a single new-paper shard, starting with a small smoke shard such as `p1_m25_standard_001` or `p2_m25_standard_001`.

That step calls external VLM/API through `scripts/vlm/run_pdf_page_chain_extraction_v1.py`; it was not run in this step. It requires explicit approval to send rendered local PDF page content to the external VLM/API.
