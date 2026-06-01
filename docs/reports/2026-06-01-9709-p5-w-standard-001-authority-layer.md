# 9709 p5_w_standard_001 authority layer

日期: 2026-06-01

## Verdict

`p5_w_standard_001` authority status: `authority-ready`.

This authority layer is shard-scoped. It authorizes `p5_w_standard_001` rows for the local ready-batch path only after the evidence/visual review gates have passed. It is not a statement that all Paper 5 or all 9709 rows are production-ready.

## Boundary

- rows: `143`
- source manifest: `data/manifests/9709_p5_w_standard_001_page_chain_surface_v1.json`
- authority sidecar: `data/manifests/9709_p5_w_standard_001_authority_sidecar_v1.json`
- runtime seed: `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_v1.json`
- visual disposition: `docs/reports/2026-06-01-9709-p5-w-standard-001-vlm-assisted-visual-disposition.md`

Mixed component boundary:

- W16-W18 standard Paper 5 rows: `63` legacy Mechanics 2 rows, crosswalked to current repo `9709.p4.*` mechanics paths.
- W20-W23 standard Paper 5 rows: `80` current Probability and Statistics 1 rows, mapped to `9709.p5.*` paths.
- Shard-local inventory correction: `9709/w18_qp_52/questions/q02.png` was added to this shard input manifest after page-chain found the printed question; this closeout does not broaden into global inventory remediation.

## Seeded Topic Paths

| Topic Path | Title | Section | Family |
| --- | --- | --- | --- |
| `9709.p4.energy_work_and_power` | Energy, Work and Power | 4.5 | P4 Mechanics |
| `9709.p4.forces_and_equilibrium` | Forces and Equilibrium | 4.1 | P4 Mechanics |
| `9709.p4.kinematics_of_motion_in_a_straight_line` | Kinematics of Motion in a Straight Line | 4.2 | P4 Mechanics |
| `9709.p4.newtons_laws_of_motion` | Newton's Laws of Motion | 4.4 | P4 Mechanics |
| `9709.p5.discrete_random_variables` | Discrete Random Variables | 5.4 | P5 Probability and Statistics 1 |
| `9709.p5.permutations_and_combinations` | Permutations and Combinations | 5.2 | P5 Probability and Statistics 1 |
| `9709.p5.probability` | Probability | 5.3 | P5 Probability and Statistics 1 |
| `9709.p5.representation_of_data` | Representation of Data | 5.1 | P5 Probability and Statistics 1 |
| `9709.p5.the_normal_distribution` | The Normal Distribution | 5.5 | P5 Probability and Statistics 1 |

## Topic Distribution

| Topic Path | Count |
| --- | ---: |
| `9709.p4.energy_work_and_power` | 12 |
| `9709.p4.forces_and_equilibrium` | 16 |
| `9709.p4.kinematics_of_motion_in_a_straight_line` | 15 |
| `9709.p4.newtons_laws_of_motion` | 20 |
| `9709.p5.discrete_random_variables` | 16 |
| `9709.p5.permutations_and_combinations` | 16 |
| `9709.p5.probability` | 15 |
| `9709.p5.representation_of_data` | 15 |
| `9709.p5.the_normal_distribution` | 18 |

## Authority Preflight

- status: `pass`
- blockers: `0`
- warnings: `286`

| Warning reason | Count |
| --- | ---: |
| `manifest_primary_topic_missing_sidecar_canonical_present` | 143 |
| `paper_5_or_6_in_authority_ready_batch` | 143 |

## Review Method

Authority mapping used local page-chain OCR/projection evidence plus current repo P4/P5 syllabus seed nodes. No new external VLM/API call was used for authority mapping. The targeted visual review had already closed the extraction/visual queue for diagram, multi-page, and warning-disposition rows.
