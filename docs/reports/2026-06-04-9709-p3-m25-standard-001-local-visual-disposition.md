# 9709 p3_m25_standard_001 local visual disposition

日期: 2026-06-04

结论: `p3_m25_standard_001` 的 corrected v2 pre-shard crops 已完成本地视觉核对并生成 authority topic disposition；这不是外部 VLM review，也不是 production-ready。

## Scope

- input manifest: `data/manifests/9709_p3_m25_standard_001_input_v2.json`
- crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`
- surface manifest: `data/manifests/9709_p3_m25_standard_001_page_chain_surface_v2.json`
- local visual disposition JSON: `docs/reports/2026-06-04-9709-p3-m25-standard-001-local-visual-dispositions.json`

## Result

- rows reviewed: `11/11`
- source PDFs: `1`
- crop images reviewed via local contact sheets: `15`
- multi-page rows: `4`
- diagram/axes rows: `2`
- accepted rows: `11`
- blockers: `0`
- external VLM/API calls: `0`
- not VLM-reviewed: `true`
- not production-ready: `true`

## Topic Counts

| topic path | rows |
| --- | ---: |
| `9709.p3.algebra` | 1 |
| `9709.p3.complex_numbers` | 2 |
| `9709.p3.differential_equations` | 1 |
| `9709.p3.differentiation` | 1 |
| `9709.p3.integration` | 2 |
| `9709.p3.logarithmic_and_exponential_functions` | 1 |
| `9709.p3.numerical_solution_of_equations` | 1 |
| `9709.p3.trigonometry` | 1 |
| `9709.p3.vectors` | 1 |

## Row Disposition

| paper | q | authority topic | diagram/axes | route |
| --- | --- | --- | --- | --- |
| m25_qp_32 | q01 | `9709.p3.logarithmic_and_exponential_functions` | no | ocr_lane |
| m25_qp_32 | q02 | `9709.p3.differentiation` | no | ocr_lane |
| m25_qp_32 | q03 | `9709.p3.complex_numbers` | yes | diagram_lane |
| m25_qp_32 | q04 | `9709.p3.trigonometry` | no | ocr_lane |
| m25_qp_32 | q05 | `9709.p3.complex_numbers` | no | ocr_lane |
| m25_qp_32 | q06 | `9709.p3.differential_equations` | no | ocr_lane |
| m25_qp_32 | q07 | `9709.p3.numerical_solution_of_equations` | yes | diagram_lane |
| m25_qp_32 | q08 | `9709.p3.vectors` | no | ocr_lane |
| m25_qp_32 | q09 | `9709.p3.algebra` | no | ocr_lane |
| m25_qp_32 | q10 | `9709.p3.integration` | no | ocr_lane |
| m25_qp_32 | q11 | `9709.p3.integration` | no | ocr_lane |

## Boundary

This artifact only accepts local crop boundaries, visual legibility, diagram flags, and seeded topic mapping for the shard authority layer. DB backfill, question-analysis hydration, search gate, and release closeout remain downstream work and were not run here.
