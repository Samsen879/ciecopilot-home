# 9709 p5_m_standard_001 authority layer

Verdict: authority-ready for `p5_m_standard_001`. M16-M19 `qp_52` rows are legacy Paper 5 Mechanics 2 and are crosswalked to current repo `9709.p4.*` mechanics paths; M21-M24 rows use current `9709.p5.*` Probability & Statistics 1 paths. This does not claim full 9709 production readiness.

## Artifacts

- authority sidecar: `data/manifests/9709_p5_m_standard_001_authority_sidecar_v1.json`
- runtime seed: `data/curriculum/9709_question_search_recovery_nodes_with_p2_p4_p5_v1.json`
- machine-readable report: `docs/reports/2026-06-01-9709-p5-m-standard-001-authority-layer.json`
- source manifest: `data/manifests/9709_p5_m_standard_001_page_chain_surface_v1.json`
- projection evidence: `docs/reports/2026-06-01-9709-p5-m-standard-001-page-chain-projection.json`
- visual disposition: `docs/reports/2026-06-01-9709-p5-m-standard-001-vlm-assisted-visual-disposition.md`
- final release preflight: `docs/reports/2026-06-01-9709-p5-m-standard-001-release-preflight-final.json`

## Scope

- shard: `p5_m_standard_001`
- rows: `54`
- legacy mechanics rows: `28`
- current P5 statistics rows: `26`

## Seeded Topic Paths Used

- `9709.p4.energy_work_and_power` - Energy, Work and Power (4.5)
- `9709.p4.forces_and_equilibrium` - Forces and Equilibrium (4.1)
- `9709.p4.kinematics_of_motion_in_a_straight_line` - Kinematics of Motion in a Straight Line (4.2)
- `9709.p4.newtons_laws_of_motion` - Newton's Laws of Motion (4.4)
- `9709.p5.discrete_random_variables` - Discrete Random Variables (5.4)
- `9709.p5.permutations_and_combinations` - Permutations and Combinations (5.2)
- `9709.p5.probability` - Probability (5.3)
- `9709.p5.representation_of_data` - Representation of Data (5.1)
- `9709.p5.the_normal_distribution` - The Normal Distribution (5.5)

## Topic Distribution

- `9709.p4.energy_work_and_power`: `4`
- `9709.p4.forces_and_equilibrium`: `8`
- `9709.p4.kinematics_of_motion_in_a_straight_line`: `8`
- `9709.p4.newtons_laws_of_motion`: `8`
- `9709.p5.discrete_random_variables`: `8`
- `9709.p5.permutations_and_combinations`: `4`
- `9709.p5.probability`: `5`
- `9709.p5.representation_of_data`: `4`
- `9709.p5.the_normal_distribution`: `5`

## Authority Preflight

- status: `pass`
- blockers: `0`
- warnings: `108`

| Warning reason | Count |
|---|---:|
| `manifest_primary_topic_missing_sidecar_canonical_present` | 54 |
| `paper_5_or_6_in_authority_ready_batch` | 54 |

## Review Method

- operator rule review rows: `54`
- explicit override rows: `0`
- fallback rows: `0`
- basis: local page-chain OCR/projection evidence plus current repo P4/P5 syllabus seed nodes; no new external VLM/API call was used for authority mapping.

## Boundary

This authority layer is shard-scoped. It authorizes `p5_m_standard_001` rows for the local ready-batch path because evidence/visual review gates and authority preflight have passed. The mixed legacy/current component mapping is explicit and should not be read as a full legacy Mechanics 2 taxonomy expansion.
