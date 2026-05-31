# 9709 p4_m_watermarked_001 authority layer

status: `authority_preflight_pass`

## Scope

- shard: `p4_m_watermarked_001`
- manifest: `data/manifests/9709_p4_m_watermarked_001_page_chain_surface_v1.json`
- projection: `docs/reports/2026-05-31-9709-p4-m-watermarked-001-page-chain-projection.json`
- authority sidecar: `data/manifests/9709_p4_m_watermarked_001_authority_sidecar_v1.json`
- item count: `7`
- source PDFs: March 2020 Paper 4 watermarked variant `42`

## Seeded P4 Topic Paths

- `9709.p4.forces_and_equilibrium` - Forces and Equilibrium (4.1)
- `9709.p4.kinematics_of_motion_in_a_straight_line` - Kinematics of Motion in a Straight Line (4.2)
- `9709.p4.momentum` - Momentum (4.3)
- `9709.p4.newtons_laws_of_motion` - Newton's Laws of Motion (4.4)
- `9709.p4.energy_work_and_power` - Energy, Work and Power (4.5)

## Topic Distribution

- `9709.p4.energy_work_and_power`: `2`
- `9709.p4.forces_and_equilibrium`: `1`
- `9709.p4.kinematics_of_motion_in_a_straight_line`: `2`
- `9709.p4.momentum`: `1`
- `9709.p4.newtons_laws_of_motion`: `1`

## Row Mappings

- `9709/m20_qp_42/questions/q01.png` -> `9709.p4.energy_work_and_power`: Constant power, work done, driving force and acceleration under resistance control the question.
- `9709/m20_qp_42/questions/q02.png` -> `9709.p4.newtons_laws_of_motion`: Resolving the applied force with friction and acceleration uses Newton's second law.
- `9709/m20_qp_42/questions/q03.png` -> `9709.p4.energy_work_and_power`: Kinetic energy, potential energy and work against resistance control the surface-motion task.
- `9709/m20_qp_42/questions/q04.png` -> `9709.p4.kinematics_of_motion_in_a_straight_line`: Constant-acceleration motion over straight-line intervals controls the question.
- `9709/m20_qp_42/questions/q05.png` -> `9709.p4.forces_and_equilibrium`: Coplanar force resolution, resultant direction and equilibrium control the question.
- `9709/m20_qp_42/questions/q06.png` -> `9709.p4.momentum`: The multi-part vehicle problem culminates in a collision mass calculation using conservation of momentum; Newton-law towing/braking subparts support that setup.
- `9709/m20_qp_42/questions/q07.png` -> `9709.p4.kinematics_of_motion_in_a_straight_line`: Piecewise displacement-time functions, velocity and total distance in straight-line motion control the question.

## Authority Preflight

- status: `pass`
- blockers: `0`
- warnings: `7`
- expected warning reason: `manifest_primary_topic_missing_sidecar_canonical_present`

## Boundary

- Shard-scoped authority layer only.
- P4 remains component-scoped and is not merged into P2/P1.
- Watermarked-source status is accepted only because targeted visual review found no content occlusion.
