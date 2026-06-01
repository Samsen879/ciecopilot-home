# 9709 p5_w_watermarked_001 authority layer

日期: 2026-06-01

## Verdict

`p5_w_watermarked_001` authority status: `authority-ready`.

This authority layer is shard-scoped. It authorizes `p5_w_watermarked_001` rows for the local ready-batch path only after the evidence/visual review gates have passed. It is not a statement that all Paper 5 or all 9709 rows are production-ready.

## Boundary

- rows: `21`
- source manifest: `data/manifests/9709_p5_w_watermarked_001_page_chain_surface_v1.json`
- authority sidecar: `data/manifests/9709_p5_w_watermarked_001_authority_sidecar_v1.json`
- runtime seed: `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_v1.json`
- visual disposition: `docs/reports/2026-06-01-9709-p5-w-watermarked-001-operator-visual-disposition.md`

Legacy component boundary:

- W19 watermarked Paper 5 rows: `21` legacy Mechanics 2 rows, crosswalked to current repo `9709.p4.*` mechanics paths.
- Current P5 Probability and Statistics rows: `0`.
- Watermarked source status: `6` watermark-only VLM rejections were operator-overridden after visual checks indicated intact question boundary, legibility, diagram/table presence, and continuity posture.

## Seeded Topic Paths

| Topic Path | Title | Section | Family |
| --- | --- | --- | --- |
| `9709.p4.energy_work_and_power` | Energy, Work and Power | 4.5 | P4 Mechanics |
| `9709.p4.forces_and_equilibrium` | Forces and Equilibrium | 4.1 | P4 Mechanics |
| `9709.p4.kinematics_of_motion_in_a_straight_line` | Kinematics of Motion in a Straight Line | 4.2 | P4 Mechanics |
| `9709.p4.newtons_laws_of_motion` | Newton's Laws of Motion | 4.4 | P4 Mechanics |

## Topic Distribution

| Topic Path | Count |
| --- | ---: |
| `9709.p4.energy_work_and_power` | 4 |
| `9709.p4.forces_and_equilibrium` | 5 |
| `9709.p4.kinematics_of_motion_in_a_straight_line` | 6 |
| `9709.p4.newtons_laws_of_motion` | 6 |

## Authority Preflight

- status: `pass`
- blockers: `0`
- warnings: `42`

| Warning reason | Count |
| --- | ---: |
| `manifest_primary_topic_missing_sidecar_canonical_present` | 21 |
| `paper_5_or_6_in_authority_ready_batch` | 21 |

## Review Method

Authority mapping used local page-chain OCR/projection evidence plus current repo P4 syllabus seed nodes. No new external VLM/API call was used for authority mapping. The targeted/operator visual review had already closed the extraction/visual queue for diagram, multi-page, and watermarked-source rows.
