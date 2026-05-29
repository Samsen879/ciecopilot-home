# 9709 p2_m_standard_001 authority layer

Date: 2026-05-30

Verdict: created a shard-scoped P2 authority layer for `p2_m_standard_001`. This adds component-scoped `9709.p2.*` runtime seed nodes and a 57-row authority sidecar. It does not merge P2 into P3 and does not claim production readiness.

## Outputs

- P2 runtime seed: `data/curriculum/9709_question_search_recovery_nodes_with_p2_v1.json`
- authority sidecar: `data/manifests/9709_p2_m_standard_001_authority_sidecar_v1.json`
- machine-readable report: `docs/reports/2026-05-30-9709-p2-m-standard-001-authority-layer.json`

## Seeded P2 Topic Paths

| Topic Path | Section | Title | Official locator |
|---|---|---|---|
| `9709.p2.algebra` | `2.1` | Algebra | `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_1_algebra` |
| `9709.p2.logarithmic_and_exponential_functions` | `2.2` | Logarithmic and Exponential Functions | `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_2_logarithmic_and_exponential_functions` |
| `9709.p2.trigonometry` | `2.3` | Trigonometry | `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_3_trigonometry` |
| `9709.p2.differentiation` | `2.4` | Differentiation | `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_4_differentiation` |
| `9709.p2.integration` | `2.5` | Integration | `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_5_integration` |
| `9709.p2.numerical_solution_of_equations` | `2.6` | Numerical Solution of Equations | `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_6_numerical_solution_of_equations` |

## Topic Distribution

| Topic Path | Count |
|---|---:|
| `9709.p2.algebra` | 16 |
| `9709.p2.differentiation` | 11 |
| `9709.p2.integration` | 8 |
| `9709.p2.logarithmic_and_exponential_functions` | 5 |
| `9709.p2.numerical_solution_of_equations` | 8 |
| `9709.p2.trigonometry` | 9 |

## Row Review

| Storage Key | Topic Path | Topic | Evidence Summary |
|---|---|---|---|
| `9709/m16_qp_22/questions/q01.png` | `9709.p2.algebra` | Algebra | Find the quotient and the remainder when $2x^3 + 3x^2 + 10$ is divided by $(x + 2)$. |
| `9709/m16_qp_22/questions/q02.png` | `9709.p2.algebra` | Algebra | Solve the inequality $\|x - 5\| < \|2x + 3\|$. |
| `9709/m16_qp_22/questions/q03.png` | `9709.p2.logarithmic_and_exponential_functions` | Logarithmic and Exponential Functions | It is given that $k$ is a positive constant. Solve the equation $2 \ln x = \ln(3k + x) + \ln(2k - x)$, expressing $x$ in terms of $k$. |
| `9709/m16_qp_22/questions/q04.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | The sequence of values given by the iterative formula $$ x_{n+1} = \sqrt{\left(\frac{1}{2}x_n^2 + 4x_n^{-3}\right)}, $$ with initial value $x_1 = 1.5$, converges to $\alpha$. ... |
| `9709/m16_qp_22/questions/q05.png` | `9709.p2.integration` | Integration | Given that $\displaystyle\int_0^a 6e^{2x+1} \, \mathrm{d}x = 65$, find the value of $a$ correct to 3 decimal places. |
| `9709/m16_qp_22/questions/q06.png` | `9709.p2.differentiation` | Differentiation | The diagram shows the part of the curve $y = 3e^{-x} \sin 2x$ for $0 \leqslant x \leqslant \frac{1}{2}\pi$, and the stationary point $M$. (i) Find the equation of the tangent ... |
| `9709/m16_qp_22/questions/q07.png` | `9709.p2.differentiation` | Differentiation | The equation of a curve is $2x^3 + y^3 = 24$. (i) Express $\dfrac{\mathrm{d}y}{\mathrm{d}x}$ in terms of $x$ and $y$, and show that the gradient of the curve is never positive. ... |
| `9709/m16_qp_22/questions/q08.png` | `9709.p2.trigonometry` | Trigonometry | 8 (i) Show that sin 2x cot x ≡ 2 cos²x. [2] (ii) Using the identity in part (i), (a) find the least possible value of 3 sin 2x cot x + 5 cos 2x + 8 as x varies, [4] (b) find ... |
| `9709/m17_qp_22/questions/q01.png` | `9709.p2.logarithmic_and_exponential_functions` | Logarithmic and Exponential Functions | 1 Solve the equation 2 ln(2x) − ln(x + 3) = ln(3x + 5). |
| `9709/m17_qp_22/questions/q02.png` | `9709.p2.trigonometry` | Trigonometry | (i) Given that tan 2θ cot θ = 8, show that tan² θ = 3/4. (ii) Hence solve the equation tan 2θ cot θ = 8 for 0° < θ < 180°. |
| `9709/m17_qp_22/questions/q03.png` | `9709.p2.algebra` | Algebra | (i) Solve the inequality \|2x − 5\| < \|x + 3\|. (ii) Hence find the largest integer y satisfying the inequality \|2 ln y − 5\| < \|ln y + 3\|. |
| `9709/m17_qp_22/questions/q04.png` | `9709.p2.differentiation` | Differentiation | 4 Find the gradient of the curve x² sin y + cos 3y = 4 at the point (2, ½π). |
| `9709/m17_qp_22/questions/q05.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | 5 It is given that a is a positive constant such that ∫₀ᵃ (1 + 2x + 3e³ˣ) dx = 250. (i) Show that a = ⅓ ln(251 − a − a²). (ii) Use an iterative formula based on the equation in ... |
| `9709/m17_qp_22/questions/q06.png` | `9709.p2.algebra` | Algebra | 6 The polynomial p(x) is defined by p(x) = ax^3 + bx^2 - 17x - a, where a and b are constants. It is given that (x + 2) is a factor of p(x) and that the remainder is 28 when ... |
| `9709/m17_qp_22/questions/q07.png` | `9709.p2.integration` | Integration | The diagram shows part of the curve y = 2 cos 2x cos(2x + 1/6 π). The shaded region is bounded by the curve and the two axes. (i) Show that 2 cos 2x cos(2x + 1/6 π) can be ... |
| `9709/m18_qp_22/questions/q01.png` | `9709.p2.algebra` | Algebra | 1 Solve the inequality \|5x + 2\| > \|4x + 3\|. |
| `9709/m18_qp_22/questions/q02.png` | `9709.p2.differentiation` | Differentiation | 2 A curve has equation y = 4x sin ½x. Find the equation of the tangent to the curve at the point for which x = π. [4] |
| `9709/m18_qp_22/questions/q03.png` | `9709.p2.integration` | Integration | (i) Use the trapezium rule with four intervals to find an approximation to \[ \int_{0}^{8} \ln(x + 2) \, dx, \] giving your answer correct to 3 significant figures. (ii) Hence ... |
| `9709/m18_qp_22/questions/q04.png` | `9709.p2.algebra` | Algebra | 4 The polynomial p(x) is defined by p(x) = 4x³ + 4x² − 29x − 15. (i) Use the factor theorem to show that (x + 3) is a factor of p(x). (iii) Hence, given that \[ 2^{3u+2} + ... |
| `9709/m18_qp_22/questions/q05.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | 5 It is given that ∫_{-a}^{2a} 4e^{-2x} dx = 25, where a is a positive constant. (i) Show that a = \frac{1}{2}\ln(12.5 + e^{-4a}). (ii) Use the equation in part (i) to show by ... |
| `9709/m18_qp_22/questions/q06.png` | `9709.p2.trigonometry` | Trigonometry | (i) Show that cosec 2x + cot 2x ≡ cot x. (ii) Hence find the exact value of cot \frac{1}{12}\pi. (iii) Find \int \sin 2x(\cosec 4x + \cot 4x) \, dx. |
| `9709/m18_qp_22/questions/q07.png` | `9709.p2.differentiation` | Differentiation | The diagram shows part of the curve defined by the parametric equations x = t² + 4t, y = t³ − 3t². The curve has a minimum point at M and crosses the x-axis at the point P. (i) ... |
| `9709/m19_qp_22/questions/q01.png` | `9709.p2.trigonometry` | Trigonometry | 1 Solve the equation sec² θ + tan² θ = 5 tan θ + 4 for 0° < θ < 180°. Show all necessary working. [4] |
| `9709/m19_qp_22/questions/q02.png` | `9709.p2.algebra` | Algebra | 2 Given that x satisfies the equation \|2x + 3\| = \|2x − 1\|, find the value of \|4x − 3\| − \|6x\|. |
| `9709/m19_qp_22/questions/q03.png` | `9709.p2.logarithmic_and_exponential_functions` | Logarithmic and Exponential Functions | The variables x and y satisfy the equation y = Ae^(px+p), where A and p are constants. The graph of ln y against x is a straight line passing through the points (1, 2.835) and ... |
| `9709/m19_qp_22/questions/q04.png` | `9709.p2.algebra` | Algebra | (i) Find the quotient when 4x³ + 8x² + 11x + 9 is divided by (2x + 1), and show that the remainder is 5. (ii) Show that the equation 4x³ + 8x² + 11x + 4 = 0 has exactly one ... |
| `9709/m19_qp_22/questions/q05.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | 5 The equation of a curve is y = e^{2x}/(4x + 1) and the point P on the curve has y-coordinate 10. (i) Show that the x-coordinate of P satisfies the equation x = ... |
| `9709/m19_qp_22/questions/q06.png` | `9709.p2.integration` | Integration | 6 (a) Show that ∫₁⁴ (2/x + 2/(2x+1)) dx = ln 48. (b) Find ∫ sin 2x (cot x + 2 cosec x) dx. |
| `9709/m19_qp_22/questions/q07.png` | `9709.p2.differentiation` | Differentiation | 7 The parametric equations of a curve are x = 2t − sin 2t, y = 5t + cos 2t, for 0 ≤ t ≤ ½π. At the point P on the curve, the gradient of the curve is 2. (i) Show that the value ... |
| `9709/m21_qp_22/questions/q01.png` | `9709.p2.algebra` | Algebra | (a) Sketch, on the same diagram, the graphs of y = \|3x − 5\| and y = x + 2. (b) Solve the equation \|3x − 5\| = x + 2. |
| `9709/m21_qp_22/questions/q02.png` | `9709.p2.trigonometry` | Trigonometry | 2 Solve the equation sec² θ cot θ = 8 for 0 < θ < π. |
| `9709/m21_qp_22/questions/q03.png` | `9709.p2.differentiation` | Differentiation | 3 The parametric equations of a curve are x = e^{2t} cos 4t, y = 3 sin 2t. Find the gradient of the curve at the point for which t = 0. |
| `9709/m21_qp_22/questions/q04.png` | `9709.p2.integration` | Integration | The diagram shows part of the curve with equation $y = \frac{5x}{4x^3 + 1}$. The shaded region is bounded by the curve and the lines $x = 1$, $x = 3$ and $y = 0$. (a) Find ... |
| `9709/m21_qp_22/questions/q05.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | 5 (a) Given that 2 ln(x + 1) + ln x = ln(x + 9), show that x = √(9/(x + 2)). (b) It is given that the equation $x = \sqrt{\frac{9}{x + 2}}$ has a single root. Show by ... |
| `9709/m21_qp_22/questions/q06.png` | `9709.p2.algebra` | Algebra | 6 The polynomial p(x) is defined by p(x) = x³ + ax + b, where a and b are constants. It is given that (x + 2) is a factor of p(x) and that the remainder is 5 when p(x) is ... |
| `9709/m21_qp_22/questions/q07.png` | `9709.p2.trigonometry` | Trigonometry | (a) Express $5\sqrt{3} \cos x + 5 \sin x$ in the form $R \cos(x - \alpha)$, where $R > 0$ and $0 < \alpha < \frac{1}{2}\pi$. (b) As $x$ varies, find the least possible value of ... |
| `9709/m22_qp_22/questions/q01.png` | `9709.p2.algebra` | Algebra | 1 Solve the equation \|5x − 2\| = \|4x + 9\|. |
| `9709/m22_qp_22/questions/q02.png` | `9709.p2.differentiation` | Differentiation | 2 A curve has equation y = 7 + 4 ln(2x + 5). Find the equation of the tangent to the curve at the point (−2, 7), giving your answer in the form y = mx + c. |
| `9709/m22_qp_22/questions/q03.png` | `9709.p2.logarithmic_and_exponential_functions` | Logarithmic and Exponential Functions | 3 The variables x and y satisfy the equation y = 3^{2a} a^x, where a is a constant. The graph of ln y against x is a straight line with gradient 0.239. (a) Find the value of a ... |
| `9709/m22_qp_22/questions/q04.png` | `9709.p2.trigonometry` | Trigonometry | (a) Show that sin 2θ cot θ − cos 2θ ≡ 1. (b) Hence find the exact value of sin \frac{1}{6}\pi \cot \frac{1}{12}\pi. (c) Find the smallest positive value of θ (in radians) ... |
| `9709/m22_qp_22/questions/q05.png` | `9709.p2.integration` | Integration | 5 (a) Given that y = tan²x, show that dy/dx = 2 tan x + 2 tan³x. (b) Find the exact value of ∫_{1/4 π}^{1/3 π} (tan x + tan²x + tan³x) dx. |
| `9709/m22_qp_22/questions/q06.png` | `9709.p2.algebra` | Algebra | 6 The polynomial p(x) is defined by p(x) = 4x³ + 16x² + 9x − 15. (a) Find the quotient when p(x) is divided by (2x + 3), and show that the remainder is −6. [3] (b) Find ∫ ... |
| `9709/m22_qp_22/questions/q07.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | 7 A curve has equation e^{2x}y - e^y = 100. (a) Show that \frac{dy}{dx} = \frac{2e^{2x}y}{e^y - e^{2x}}. (b) Show that the curve has no stationary points. It is required to ... |
| `9709/m23_qp_22/questions/q01.png` | `9709.p2.integration` | Integration | 1 Find the exact value of ∫₀^(½π) 2 tan²(½x) dx. |
| `9709/m23_qp_22/questions/q02.png` | `9709.p2.trigonometry` | Trigonometry | 2 Solve the equation tan(θ − 60°) = 3 cot θ for −90° < θ < 90°. |
| `9709/m23_qp_22/questions/q03.png` | `9709.p2.algebra` | Algebra | 3 The polynomial p(x) is defined by p(x) = ax^3 - ax^2 + ax + b, where a and b are constants. It is given that (x + 2) is a factor of p(x), and that the remainder is 35 when ... |
| `9709/m23_qp_22/questions/q04.png` | `9709.p2.algebra` | Algebra | (a) Sketch, on the same diagram, the graphs of y = \|2x − 11\| and y = 3x − 3. (b) Solve the inequality \|2x − 11\| < 3x − 3. (c) Find the smallest integer N satisfying the ... |
| `9709/m23_qp_22/questions/q05.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | 5 It is given that ∫₁ᵃ (4/(1+2x) + 3/x) dx = ln 10, where a is a constant greater than 1. (a) Show that a = ∛[90(1+2a)⁻²]. (b) Use an iterative formula, based on the equation ... |
| `9709/m23_qp_22/questions/q06.png` | `9709.p2.differentiation` | Differentiation | The diagram shows the curve with equation $ y = \frac{4e^{2x} + 9}{e^x + 2} $. The curve has a minimum point $ M $ and crosses the y-axis at the point $ P $. (a) Find the exact ... |
| `9709/m23_qp_22/questions/q07.png` | `9709.p2.differentiation` | Differentiation | The diagram shows the curve with parametric equations x = k tan t, y = 3 sin 2t − 4 sin t, for 0 < t < ½π. It is given that k is a positive constant. The curve crosses the ... |
| `9709/m24_qp_22/questions/q01.png` | `9709.p2.logarithmic_and_exponential_functions` | Logarithmic and Exponential Functions | 1 Use logarithms to solve the equation $3^{4x+3} = 5^{2x+7}$. Give your answer correct to 3 significant figures. [4] |
| `9709/m24_qp_22/questions/q02.png` | `9709.p2.algebra` | Algebra | (a) Sketch the graph of $y = \|3x - 7\|$, stating the coordinates of the points where the graph meets the axes. (b) Hence find the set of values of the constant $k$ for which the ... |
| `9709/m24_qp_22/questions/q03.png` | `9709.p2.algebra` | Algebra | 3 The polynomial p(x) is defined by p(x) = 6x^3 + ax^2 + 3x - 10, where a is a constant. It is given that (2x - 1) is a factor of p(x). (a) Find the value of a and hence ... |
| `9709/m24_qp_22/questions/q04.png` | `9709.p2.integration` | Integration | The diagram shows the curve with equation $y = \sqrt{1 + e^{0.5x}}$. The shaded region is bounded by the curve and the straight lines $x = 0$, $x = 6$ and $y = 0$. (a) Use the ... |
| `9709/m24_qp_22/questions/q05.png` | `9709.p2.numerical_solution_of_equations` | Numerical Solution of Equations | The diagram shows part of the curve with equation $y = \frac{x^3}{x + 2}$. At the point $P$, the gradient of the curve is 6. (a) Show that the $x$-coordinate of $P$ satisfies ... |
| `9709/m24_qp_22/questions/q06.png` | `9709.p2.differentiation` | Differentiation | The diagram shows the curve with parametric equations x = 1 + √t, y = (ln t + 2)(ln t − 3), for 0 < t < 25. The curve crosses the x-axis at the points A and B and has a minimum ... |
| `9709/m24_qp_22/questions/q07.png` | `9709.p2.trigonometry` | Trigonometry | (a) Prove that \[ \sin 2\theta (a \cot \theta + b \tan \theta) \equiv a + b + (a - b) \cos 2\theta, \] where $a$ and $b$ are constants. (b) Find the exact value of ... |

## Boundary Discipline

- The official P2/P3 subset statement remains a boundary overlay, not a topic merge.
- The seed adds P2 component-scoped topic paths only; it does not change P3, P4, P5, or P6 authority.
- Visual/page-chain evidence is used only to map each row to an already seeded official P2 section path.

## Authority Preflight Result

The authority/release preflight has been rerun against the new P2 seed and sidecar: `pass`, 57 sidecar rows, 0 blockers, and 57 expected `manifest_primary_topic_missing_sidecar_canonical_present` warnings because the page-chain surface manifest still leaves `primary_topic_path` unset while the sidecar supplies canonical P2 topic authority.

## Downstream Posture

DB write-back, analysis hydration, search/classifier gates, and production-ready closeout remain out of scope until explicitly run later.
