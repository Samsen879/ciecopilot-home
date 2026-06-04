# 9709 p3_w24_standard_001 local visual disposition

日期: 2026-06-04

结论: `p3_w24_standard_001` 的 corrected v2 pre-shard crops 已完成本地视觉核对并生成 authority topic disposition；这不是外部 VLM review，也不是 production-ready。

## Scope

- input manifest: `data/manifests/9709_p3_w24_standard_001_input_v2.json`
- crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`
- surface manifest: `data/manifests/9709_p3_w24_standard_001_page_chain_surface_v2.json`
- local visual disposition JSON: `docs/reports/2026-06-04-9709-p3-w24-standard-001-local-visual-dispositions.json`

## Result

- rows reviewed: `32/32`
- source PDFs: `3`
- crop images reviewed via local contact sheets: `49`
- multi-page rows: `17`
- diagram/axes rows: `6`
- accepted rows: `32`
- blockers: `0`
- external VLM/API calls: `0`
- not VLM-reviewed: `true`
- not production-ready: `true`

## Topic Counts

| topic path | rows |
| --- | ---: |
| `9709.p3.algebra` | 4 |
| `9709.p3.complex_numbers` | 5 |
| `9709.p3.differential_equations` | 3 |
| `9709.p3.differentiation` | 3 |
| `9709.p3.integration` | 5 |
| `9709.p3.logarithmic_and_exponential_functions` | 3 |
| `9709.p3.numerical_solution_of_equations` | 3 |
| `9709.p3.trigonometry` | 3 |
| `9709.p3.vectors` | 3 |

## Row Disposition

| paper | q | authority topic | diagram/axes | route |
| --- | --- | --- | --- | --- |
| w24_qp_31 | q01 | `9709.p3.algebra` | no | ocr_lane |
| w24_qp_31 | q02 | `9709.p3.integration` | no | ocr_lane |
| w24_qp_31 | q03 | `9709.p3.differentiation` | no | ocr_lane |
| w24_qp_31 | q04 | `9709.p3.trigonometry` | no | ocr_lane |
| w24_qp_31 | q05 | `9709.p3.numerical_solution_of_equations` | no | ocr_lane |
| w24_qp_31 | q06 | `9709.p3.integration` | yes | diagram_lane |
| w24_qp_31 | q07 | `9709.p3.algebra` | no | ocr_lane |
| w24_qp_31 | q08 | `9709.p3.complex_numbers` | no | ocr_lane |
| w24_qp_31 | q09 | `9709.p3.vectors` | no | ocr_lane |
| w24_qp_31 | q10 | `9709.p3.differential_equations` | yes | diagram_lane |
| w24_qp_32 | q01 | `9709.p3.algebra` | no | ocr_lane |
| w24_qp_32 | q02 | `9709.p3.numerical_solution_of_equations` | no | ocr_lane |
| w24_qp_32 | q03 | `9709.p3.complex_numbers` | no | ocr_lane |
| w24_qp_32 | q04 | `9709.p3.logarithmic_and_exponential_functions` | no | ocr_lane |
| w24_qp_32 | q05 | `9709.p3.complex_numbers` | no | ocr_lane |
| w24_qp_32 | q06 | `9709.p3.logarithmic_and_exponential_functions` | yes | diagram_lane |
| w24_qp_32 | q07 | `9709.p3.trigonometry` | no | ocr_lane |
| w24_qp_32 | q08 | `9709.p3.differentiation` | no | ocr_lane |
| w24_qp_32 | q09 | `9709.p3.vectors` | no | ocr_lane |
| w24_qp_32 | q10 | `9709.p3.differential_equations` | no | ocr_lane |
| w24_qp_32 | q11 | `9709.p3.integration` | no | ocr_lane |
| w24_qp_33 | q01 | `9709.p3.complex_numbers` | yes | diagram_lane |
| w24_qp_33 | q02 | `9709.p3.numerical_solution_of_equations` | no | ocr_lane |
| w24_qp_33 | q03 | `9709.p3.logarithmic_and_exponential_functions` | yes | diagram_lane |
| w24_qp_33 | q04 | `9709.p3.complex_numbers` | no | ocr_lane |
| w24_qp_33 | q05 | `9709.p3.trigonometry` | no | ocr_lane |
| w24_qp_33 | q06 | `9709.p3.vectors` | no | ocr_lane |
| w24_qp_33 | q07 | `9709.p3.differentiation` | no | ocr_lane |
| w24_qp_33 | q08 | `9709.p3.algebra` | no | ocr_lane |
| w24_qp_33 | q09 | `9709.p3.integration` | no | ocr_lane |
| w24_qp_33 | q10 | `9709.p3.differential_equations` | no | ocr_lane |
| w24_qp_33 | q11 | `9709.p3.integration` | yes | diagram_lane |

## Boundary

This artifact only accepts local crop boundaries, visual legibility, diagram flags, and seeded topic mapping for the shard authority layer. DB backfill, question-analysis hydration, search gate, and release closeout remain downstream work and were not run here.
