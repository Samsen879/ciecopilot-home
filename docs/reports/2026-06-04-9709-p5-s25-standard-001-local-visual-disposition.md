# 9709 p5_s25_standard_001 local visual disposition

日期: 2026-06-04

结论: `p5_s25_standard_001` 的 corrected v2 pre-shard crops 已完成本地视觉核对并生成 authority topic disposition；这不是外部 VLM review，也不是 production-ready。

## Scope

- input manifest: `data/manifests/9709_p5_s25_standard_001_input_v2.json`
- crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`
- surface manifest: `data/manifests/9709_p5_s25_standard_001_page_chain_surface_v2.json`
- local visual disposition JSON: `docs/reports/2026-06-04-9709-p5-s25-standard-001-local-visual-dispositions.json`

## Result

- rows reviewed: `26/26`
- source PDFs: `4`
- crop images reviewed via local contact sheets: `32`
- multi-page rows: `6`
- diagram/axes rows: `2`
- accepted rows: `26`
- blockers: `0`
- external VLM/API calls: `0`
- not VLM-reviewed: `true`
- not production-ready: `true`

## Topic Counts

| topic path | rows |
| --- | ---: |
| `9709.p5.discrete_random_variables` | 4 |
| `9709.p5.permutations_and_combinations` | 5 |
| `9709.p5.probability` | 5 |
| `9709.p5.representation_of_data` | 5 |
| `9709.p5.the_normal_distribution` | 7 |

## Row Disposition

| paper | q | authority topic | diagram/axes | route |
| --- | --- | --- | --- | --- |
| s25_qp_51 | q01 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_51 | q02 | `9709.p5.permutations_and_combinations` | no | ocr_lane |
| s25_qp_51 | q03 | `9709.p5.representation_of_data` | no | diagram_lane |
| s25_qp_51 | q04 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_51 | q05 | `9709.p5.permutations_and_combinations` | no | ocr_lane |
| s25_qp_51 | q06 | `9709.p5.discrete_random_variables` | no | diagram_lane |
| s25_qp_52 | q01 | `9709.p5.discrete_random_variables` | no | diagram_lane |
| s25_qp_52 | q02 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_52 | q03 | `9709.p5.probability` | no | ocr_lane |
| s25_qp_52 | q04 | `9709.p5.probability` | no | ocr_lane |
| s25_qp_52 | q05 | `9709.p5.representation_of_data` | yes | diagram_lane |
| s25_qp_52 | q06 | `9709.p5.permutations_and_combinations` | no | ocr_lane |
| s25_qp_52 | q07 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_53 | q01 | `9709.p5.representation_of_data` | no | ocr_lane |
| s25_qp_53 | q02 | `9709.p5.probability` | no | ocr_lane |
| s25_qp_53 | q03 | `9709.p5.discrete_random_variables` | no | ocr_lane |
| s25_qp_53 | q04 | `9709.p5.representation_of_data` | yes | diagram_lane |
| s25_qp_53 | q05 | `9709.p5.probability` | no | ocr_lane |
| s25_qp_53 | q06 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_53 | q07 | `9709.p5.permutations_and_combinations` | no | ocr_lane |
| s25_qp_55 | q01 | `9709.p5.discrete_random_variables` | no | diagram_lane |
| s25_qp_55 | q02 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_55 | q03 | `9709.p5.the_normal_distribution` | no | ocr_lane |
| s25_qp_55 | q04 | `9709.p5.probability` | no | ocr_lane |
| s25_qp_55 | q05 | `9709.p5.representation_of_data` | no | diagram_lane |
| s25_qp_55 | q06 | `9709.p5.permutations_and_combinations` | no | ocr_lane |

## Boundary

This artifact only accepts local crop boundaries, visual legibility, diagram/table flags, and seeded topic mapping for the shard authority layer. DB backfill, question-analysis hydration, search gate, and release closeout remain downstream work and were not run here.
