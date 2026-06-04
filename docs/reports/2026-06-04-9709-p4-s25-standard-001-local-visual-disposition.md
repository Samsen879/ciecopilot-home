# 9709 p4_s25_standard_001 local visual disposition

日期: 2026-06-04

结论: `p4_s25_standard_001` 的 corrected v2 pre-shard crops 已完成本地视觉核对并生成 authority topic disposition；这不是外部 VLM review，也不是 production-ready。

## Scope

- input manifest: `data/manifests/9709_p4_s25_standard_001_input_v2.json`
- crop manifest: `data/manifests/9709_new_papers_2026_06_03_pre_shard_crop_manifest_v2.json`
- surface manifest: `data/manifests/9709_p4_s25_standard_001_page_chain_surface_v2.json`
- local visual disposition JSON: `docs/reports/2026-06-04-9709-p4-s25-standard-001-local-visual-dispositions.json`

## Result

- rows reviewed: `28/28`
- source PDFs: `4`
- crop images reviewed via local contact sheets: `33`
- multi-page rows: `5`
- diagram/axes rows: `12`
- accepted rows: `28`
- blockers: `0`
- external VLM/API calls: `0`
- not VLM-reviewed: `true`
- not production-ready: `true`

## Topic Counts

| topic path | rows |
| --- | ---: |
| `9709.p4.energy_work_and_power` | 5 |
| `9709.p4.forces_and_equilibrium` | 6 |
| `9709.p4.kinematics_of_motion_in_a_straight_line` | 8 |
| `9709.p4.momentum` | 4 |
| `9709.p4.newtons_laws_of_motion` | 5 |

## Row Disposition

| paper | q | authority topic | diagram/axes | route |
| --- | --- | --- | --- | --- |
| s25_qp_41 | q01 | `9709.p4.newtons_laws_of_motion` | no | ocr_lane |
| s25_qp_41 | q02 | `9709.p4.forces_and_equilibrium` | yes | diagram_lane |
| s25_qp_41 | q03 | `9709.p4.kinematics_of_motion_in_a_straight_line` | yes | diagram_lane |
| s25_qp_41 | q04 | `9709.p4.energy_work_and_power` | no | ocr_lane |
| s25_qp_41 | q05 | `9709.p4.momentum` | no | ocr_lane |
| s25_qp_41 | q06 | `9709.p4.newtons_laws_of_motion` | yes | diagram_lane |
| s25_qp_41 | q07 | `9709.p4.kinematics_of_motion_in_a_straight_line` | no | ocr_lane |
| s25_qp_42 | q01 | `9709.p4.energy_work_and_power` | no | ocr_lane |
| s25_qp_42 | q02 | `9709.p4.momentum` | no | ocr_lane |
| s25_qp_42 | q03 | `9709.p4.forces_and_equilibrium` | yes | diagram_lane |
| s25_qp_42 | q04 | `9709.p4.kinematics_of_motion_in_a_straight_line` | yes | diagram_lane |
| s25_qp_42 | q05 | `9709.p4.newtons_laws_of_motion` | yes | diagram_lane |
| s25_qp_42 | q06 | `9709.p4.kinematics_of_motion_in_a_straight_line` | no | ocr_lane |
| s25_qp_42 | q07 | `9709.p4.energy_work_and_power` | no | ocr_lane |
| s25_qp_43 | q01 | `9709.p4.momentum` | no | ocr_lane |
| s25_qp_43 | q02 | `9709.p4.newtons_laws_of_motion` | no | ocr_lane |
| s25_qp_43 | q03 | `9709.p4.kinematics_of_motion_in_a_straight_line` | yes | diagram_lane |
| s25_qp_43 | q04 | `9709.p4.forces_and_equilibrium` | yes | diagram_lane |
| s25_qp_43 | q05 | `9709.p4.energy_work_and_power` | no | ocr_lane |
| s25_qp_43 | q06 | `9709.p4.kinematics_of_motion_in_a_straight_line` | no | ocr_lane |
| s25_qp_43 | q07 | `9709.p4.forces_and_equilibrium` | yes | diagram_lane |
| s25_qp_45 | q01 | `9709.p4.newtons_laws_of_motion` | no | ocr_lane |
| s25_qp_45 | q02 | `9709.p4.momentum` | yes | diagram_lane |
| s25_qp_45 | q03 | `9709.p4.kinematics_of_motion_in_a_straight_line` | no | ocr_lane |
| s25_qp_45 | q04 | `9709.p4.forces_and_equilibrium` | yes | diagram_lane |
| s25_qp_45 | q05 | `9709.p4.energy_work_and_power` | no | ocr_lane |
| s25_qp_45 | q06 | `9709.p4.kinematics_of_motion_in_a_straight_line` | no | ocr_lane |
| s25_qp_45 | q07 | `9709.p4.forces_and_equilibrium` | yes | diagram_lane |

## Boundary

This artifact only accepts local crop boundaries, visual legibility, diagram flags, and seeded topic mapping for the shard authority layer. DB backfill, question-analysis hydration, search gate, and release closeout remain downstream work and were not run here.
