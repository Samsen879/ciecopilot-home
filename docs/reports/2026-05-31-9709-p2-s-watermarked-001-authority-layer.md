# 9709 p2_s_watermarked_001 authority layer

status: `authority_preflight_pass`

## Scope

- shard: `p2_s_watermarked_001`
- manifest: `data/manifests/9709_p2_s_watermarked_001_page_chain_surface_v1.json`
- projection: `docs/reports/2026-05-31-9709-p2-s-watermarked-001-page-chain-projection.json`
- authority sidecar: `data/manifests/9709_p2_s_watermarked_001_authority_sidecar_v1.json`
- item count: `23`
- source PDFs: Summer 2020 Paper 2 watermarked variants `21`, `22`, `23`

## Seeded P2 Topic Paths

- `9709.p2.algebra` - Algebra (2.1)
- `9709.p2.logarithmic_and_exponential_functions` - Logarithmic and Exponential Functions (2.2)
- `9709.p2.trigonometry` - Trigonometry (2.3)
- `9709.p2.differentiation` - Differentiation (2.4)
- `9709.p2.integration` - Integration (2.5)
- `9709.p2.numerical_solution_of_equations` - Numerical Solution of Equations (2.6)

## Topic Distribution

- `9709.p2.algebra`: `6`
- `9709.p2.differentiation`: `5`
- `9709.p2.integration`: `1`
- `9709.p2.logarithmic_and_exponential_functions`: `5`
- `9709.p2.numerical_solution_of_equations`: `3`
- `9709.p2.trigonometry`: `3`

## Row Mappings

- `9709/s20_qp_21/questions/q01.png` -> `9709.p2.logarithmic_and_exponential_functions`: Logarithmic equation using laws of logarithms to solve for x.
- `9709/s20_qp_21/questions/q02.png` -> `9709.p2.algebra`: Polynomial factor theorem constraints are used to determine unknown coefficients.
- `9709/s20_qp_21/questions/q03.png` -> `9709.p2.differentiation`: Parametric differentiation is required to find a tangent equation.
- `9709/s20_qp_21/questions/q04.png` -> `9709.p2.algebra`: Modulus graph sketching, intersections, and inequality solution control the task.
- `9709/s20_qp_21/questions/q05.png` -> `9709.p2.numerical_solution_of_equations`: The differentiation setup leads to a fixed-point equation and iterative numerical solution.
- `9709/s20_qp_21/questions/q06.png` -> `9709.p2.trigonometry`: Trigonometric identity and equation solving are the controlling parts, with a related trigonometric integral.
- `9709/s20_qp_21/questions/q07.png` -> `9709.p2.integration`: Polynomial division is used to evaluate a definite integral in logarithmic form.
- `9709/s20_qp_22/questions/q01.png` -> `9709.p2.logarithmic_and_exponential_functions`: Logarithms are used to linearise an exponential relation.
- `9709/s20_qp_22/questions/q02.png` -> `9709.p2.differentiation`: Stationary point requires differentiating an exponential product.
- `9709/s20_qp_22/questions/q03.png` -> `9709.p2.differentiation`: Implicit differentiation is required to find the gradient of the curve.
- `9709/s20_qp_22/questions/q04.png` -> `9709.p2.logarithmic_and_exponential_functions`: Logarithmic transformation of a power-law model is used to infer constants from a straight-line graph.
- `9709/s20_qp_22/questions/q05.png` -> `9709.p2.algebra`: Modulus graph sketching and inequality solution are algebraic.
- `9709/s20_qp_22/questions/q06.png` -> `9709.p2.algebra`: Polynomial factorisation is the primary structure, followed by substitution into a trigonometric equation.
- `9709/s20_qp_22/questions/q07.png` -> `9709.p2.numerical_solution_of_equations`: The integral equation is rearranged into a fixed-point form and solved by iteration.
- `9709/s20_qp_22/questions/q08.png` -> `9709.p2.trigonometry`: Trigonometric identity and equation solving control the question, with a related exact integral.
- `9709/s20_qp_23/questions/q01.png` -> `9709.p2.logarithmic_and_exponential_functions`: Logarithms are used to linearise an exponential relation.
- `9709/s20_qp_23/questions/q02.png` -> `9709.p2.differentiation`: Stationary point requires differentiating an exponential product.
- `9709/s20_qp_23/questions/q03.png` -> `9709.p2.differentiation`: Implicit differentiation is required to find the gradient of the curve.
- `9709/s20_qp_23/questions/q04.png` -> `9709.p2.logarithmic_and_exponential_functions`: Logarithmic transformation of a power-law model is used to infer constants from a straight-line graph.
- `9709/s20_qp_23/questions/q05.png` -> `9709.p2.algebra`: Modulus graph sketching and inequality solution are algebraic.
- `9709/s20_qp_23/questions/q06.png` -> `9709.p2.algebra`: Polynomial factorisation is the primary structure, followed by substitution into a trigonometric equation.
- `9709/s20_qp_23/questions/q07.png` -> `9709.p2.numerical_solution_of_equations`: The integral equation is rearranged into a fixed-point form and solved by iteration.
- `9709/s20_qp_23/questions/q08.png` -> `9709.p2.trigonometry`: Trigonometric identity and equation solving control the question, with a related exact integral.

## Authority Preflight

- status: `pass`
- blockers: `0`
- warnings: `23`
- expected warning reason: `manifest_primary_topic_missing_sidecar_canonical_present`

## Boundary

- Shard-scoped authority layer only.
- P2 remains component-scoped and is not merged into P3.
- Watermarked-source status is accepted only because targeted visual review plus operator disposition found no content occlusion.
