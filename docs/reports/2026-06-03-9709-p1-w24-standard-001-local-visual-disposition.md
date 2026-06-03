# 9709 p1_w24_standard_001 local visual disposition

日期: 2026-06-03

结论: `p1_w24_standard_001` 的 corrected v2 pre-shard crops 已完成本地视觉核对并生成 authority topic disposition；这不是外部 VLM review，也不是 production-ready。

## Scope

- input manifest: `data/manifests/9709_p1_w24_standard_001_input_v2.json`
- crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`
- surface manifest: `data/manifests/9709_p1_w24_standard_001_page_chain_surface_v2.json`
- local visual disposition JSON: `docs/reports/2026-06-03-9709-p1-w24-standard-001-local-visual-dispositions.json`

## Result

- rows reviewed: `32/32`
- source PDFs: `3`
- crop images reviewed via local contact sheets: `40`
- multi-page rows: `8`
- diagram/axes rows: `9`
- accepted rows: `32`
- blockers: `0`
- external VLM/API calls: `0`
- not VLM-reviewed: `true`
- not production-ready: `true`

## Topic Counts

| topic path | rows |
| --- | ---: |
| `9709.p1.circular_measure` | 3 |
| `9709.p1.coordinate_geometry` | 4 |
| `9709.p1.differentiation` | 4 |
| `9709.p1.functions` | 4 |
| `9709.p1.integration` | 5 |
| `9709.p1.quadratics` | 1 |
| `9709.p1.series` | 7 |
| `9709.p1.trigonometry` | 4 |

## Row Disposition

| paper | q | authority topic | diagram/axes | route |
| --- | --- | --- | --- | --- |
| w24_qp_11 | q01 | `9709.p1.series` | no | ocr_lane |
| w24_qp_11 | q02 | `9709.p1.differentiation` | no | ocr_lane |
| w24_qp_11 | q03 | `9709.p1.circular_measure` | yes | diagram_lane |
| w24_qp_11 | q04 | `9709.p1.quadratics` | no | ocr_lane |
| w24_qp_11 | q05 | `9709.p1.integration` | no | ocr_lane |
| w24_qp_11 | q06 | `9709.p1.coordinate_geometry` | no | ocr_lane |
| w24_qp_11 | q07 | `9709.p1.integration` | yes | diagram_lane |
| w24_qp_11 | q08 | `9709.p1.trigonometry` | no | ocr_lane |
| w24_qp_11 | q09 | `9709.p1.differentiation` | no | ocr_lane |
| w24_qp_11 | q10 | `9709.p1.series` | no | ocr_lane |
| w24_qp_11 | q11 | `9709.p1.functions` | no | ocr_lane |
| w24_qp_12 | q01 | `9709.p1.trigonometry` | yes | diagram_lane |
| w24_qp_12 | q02 | `9709.p1.series` | no | ocr_lane |
| w24_qp_12 | q03 | `9709.p1.differentiation` | no | ocr_lane |
| w24_qp_12 | q04 | `9709.p1.series` | no | ocr_lane |
| w24_qp_12 | q05 | `9709.p1.functions` | yes | diagram_lane |
| w24_qp_12 | q06 | `9709.p1.circular_measure` | yes | diagram_lane |
| w24_qp_12 | q07 | `9709.p1.integration` | yes | diagram_lane |
| w24_qp_12 | q08 | `9709.p1.coordinate_geometry` | no | ocr_lane |
| w24_qp_12 | q09 | `9709.p1.coordinate_geometry` | no | ocr_lane |
| w24_qp_12 | q10 | `9709.p1.integration` | no | ocr_lane |
| w24_qp_13 | q01 | `9709.p1.series` | no | ocr_lane |
| w24_qp_13 | q02 | `9709.p1.trigonometry` | no | ocr_lane |
| w24_qp_13 | q03 | `9709.p1.series` | no | ocr_lane |
| w24_qp_13 | q04 | `9709.p1.trigonometry` | no | ocr_lane |
| w24_qp_13 | q05 | `9709.p1.functions` | yes | diagram_lane |
| w24_qp_13 | q06 | `9709.p1.series` | no | ocr_lane |
| w24_qp_13 | q07 | `9709.p1.circular_measure` | yes | diagram_lane |
| w24_qp_13 | q08 | `9709.p1.functions` | no | ocr_lane |
| w24_qp_13 | q09 | `9709.p1.integration` | yes | diagram_lane |
| w24_qp_13 | q10 | `9709.p1.coordinate_geometry` | no | ocr_lane |
| w24_qp_13 | q11 | `9709.p1.differentiation` | no | ocr_lane |

## Boundary

This artifact only accepts local crop boundaries, visual legibility, diagram flags, and seeded topic mapping for the shard authority layer. DB backfill, question-analysis hydration, search gate, and release closeout remain downstream work and were not run here.
