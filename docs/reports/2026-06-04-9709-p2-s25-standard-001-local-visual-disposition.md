# 9709 p2_s25_standard_001 local visual disposition

日期: 2026-06-04

结论: `p2_s25_standard_001` 的 corrected v2 pre-shard crops 已完成本地视觉核对并生成 authority topic disposition；这不是外部 VLM review，也不是 production-ready。

## Scope

- input manifest: `data/manifests/9709_p2_s25_standard_001_input_v2.json`
- crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`
- surface manifest: `data/manifests/9709_p2_s25_standard_001_page_chain_surface_v2.json`
- local visual disposition JSON: `docs/reports/2026-06-04-9709-p2-s25-standard-001-local-visual-dispositions.json`

## Result

- rows reviewed: `28/28`
- source PDFs: `4`
- crop images reviewed via local contact sheets: `41`
- multi-page rows: `13`
- diagram/axes rows: `4`
- accepted rows: `28`
- blockers: `0`
- external VLM/API calls: `0`
- not VLM-reviewed: `true`
- not production-ready: `true`

## Topic Counts

| topic path | rows |
| --- | ---: |
| `9709.p2.algebra` | 7 |
| `9709.p2.differentiation` | 8 |
| `9709.p2.integration` | 4 |
| `9709.p2.logarithmic_and_exponential_functions` | 1 |
| `9709.p2.numerical_solution_of_equations` | 4 |
| `9709.p2.trigonometry` | 4 |

## Row Disposition

| paper | q | authority topic | diagram/axes | route |
| --- | --- | --- | --- | --- |
| s25_qp_21 | q01 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_21 | q02 | `9709.p2.logarithmic_and_exponential_functions` | no | ocr_lane |
| s25_qp_21 | q03 | `9709.p2.numerical_solution_of_equations` | no | ocr_lane |
| s25_qp_21 | q04 | `9709.p2.integration` | yes | diagram_lane |
| s25_qp_21 | q05 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_21 | q06 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_21 | q07 | `9709.p2.trigonometry` | no | ocr_lane |
| s25_qp_22 | q01 | `9709.p2.integration` | no | ocr_lane |
| s25_qp_22 | q02 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_22 | q03 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_22 | q04 | `9709.p2.numerical_solution_of_equations` | yes | diagram_lane |
| s25_qp_22 | q05 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_22 | q06 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_22 | q07 | `9709.p2.trigonometry` | no | ocr_lane |
| s25_qp_23 | q01 | `9709.p2.integration` | no | ocr_lane |
| s25_qp_23 | q02 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_23 | q03 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_23 | q04 | `9709.p2.numerical_solution_of_equations` | yes | diagram_lane |
| s25_qp_23 | q05 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_23 | q06 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_23 | q07 | `9709.p2.trigonometry` | no | ocr_lane |
| s25_qp_25 | q01 | `9709.p2.integration` | no | ocr_lane |
| s25_qp_25 | q02 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_25 | q03 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_25 | q04 | `9709.p2.numerical_solution_of_equations` | yes | diagram_lane |
| s25_qp_25 | q05 | `9709.p2.algebra` | no | ocr_lane |
| s25_qp_25 | q06 | `9709.p2.differentiation` | no | ocr_lane |
| s25_qp_25 | q07 | `9709.p2.trigonometry` | no | ocr_lane |

## Boundary

This artifact only accepts local crop boundaries, visual legibility, diagram flags, and seeded topic mapping for the shard authority layer. DB backfill, question-analysis hydration, search gate, and release closeout remain downstream work and were not run here.
