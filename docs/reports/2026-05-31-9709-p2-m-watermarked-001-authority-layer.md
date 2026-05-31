# 9709 p2_m_watermarked_001 authority layer

Verdict: created a shard-scoped P2 authority layer for `p2_m_watermarked_001`. This uses checked-in component-scoped `9709.p2.*` runtime seed nodes and a 7-row authority sidecar. It does not merge P2 into P3 and does not claim full 9709 production readiness.

## Artifacts

- authority sidecar: `data/manifests/9709_p2_m_watermarked_001_authority_sidecar_v1.json`
- machine-readable report: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-authority-layer.json`
- authority-aligned preflight JSON: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-release-preflight-authority-aligned.json`
- authority-aligned preflight markdown: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-release-preflight-authority-aligned.md`

## Scope

- shard: `p2_m_watermarked_001`
- rows: `7`
- source manifest: `data/manifests/9709_p2_m_watermarked_001_page_chain_surface_v1.json`
- projection evidence: `docs/reports/2026-05-31-9709-p2-m-watermarked-001-page-chain-projection.json`
- source PDF: `data/past-papers/9709Mathematics/paper2/WM_9709_m20_qp_22.pdf`
- source PDF status: `watermarked_source_pdf`, accepted via targeted visual review plus operator disposition

## Seeded Topic Paths

- `9709.p2.algebra` - Algebra (2.1)
- `9709.p2.differentiation` - Differentiation (2.4)
- `9709.p2.integration` - Integration (2.5)
- `9709.p2.logarithmic_and_exponential_functions` - Logarithmic and Exponential Functions (2.2)
- `9709.p2.numerical_solution_of_equations` - Numerical Solution of Equations (2.6)
- `9709.p2.trigonometry` - Trigonometry (2.3)

## Topic Distribution

- `9709.p2.algebra`: `2`
- `9709.p2.differentiation`: `1`
- `9709.p2.integration`: `2`
- `9709.p2.numerical_solution_of_equations`: `1`
- `9709.p2.trigonometry`: `1`

## Row Review

| Storage Key | Topic Path | Topic | Evidence Summary |
|---|---|---|---|
| `9709/m20_qp_22/questions/q01.png` | `9709.p2.trigonometry` | Trigonometry | Solve the equation 2 sin(theta + 30 degrees) + 5 cos theta = 2 sin theta for 0 degrees < theta < 90 degrees. |
| `9709/m20_qp_22/questions/q02.png` | `9709.p2.algebra` | Algebra | Find the quotient when 4x^3 + 17x^2 + 9x is divided by x^2 + 5x + 6, then hence solve 4x^3 + 17x^2 + 9x - 18 = 0. |
| `9709/m20_qp_22/questions/q03.png` | `9709.p2.integration` | Integration | It is given that int_a^(3a) 2/(2x - 5) dx = ln(7/2). Find the positive constant a. |
| `9709/m20_qp_22/questions/q04.png` | `9709.p2.differentiation` | Differentiation | A curve has equation 3x^2 - y^2 - 4 ln(2y + 3) = 26. Find the equation of the tangent at (3, -1). |
| `9709/m20_qp_22/questions/q05.png` | `9709.p2.algebra` | Algebra | Sketch y = \|x + 2k\| and y = \|2x - 3k\|, find their intersections, then solve the related modulus inequality in t. |
| `9709/m20_qp_22/questions/q06.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | A curve y = x^3 e^(0.2x) has gradient 15 at P; derive a fixed-point equation and use iteration to find the x-coordinate. |
| `9709/m20_qp_22/questions/q07.png` | `9709.p2.integration` | Integration | For y = 4 sin^2 x + 8 sin x + 3, find the x-coordinate of A, gradient at A, and exact area of the shaded region. |

## Authority Preflight

- status: `pass`
- blockers: `0`
- warnings: `7`
- expected warning: `manifest_primary_topic_missing_sidecar_canonical_present` because the surface manifest intentionally starts without primary topic paths and the sidecar supplies canonical authority.

## Boundary

This authority layer is shard-scoped. It authorizes `p2_m_watermarked_001` rows for the local ready-batch path only after the evidence/visual review gates have passed. It is not a statement that all Paper 2 or all 9709 rows are production-ready.
