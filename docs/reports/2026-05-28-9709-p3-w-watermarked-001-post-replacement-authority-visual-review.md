# 9709 p3_w_watermarked_001 post-replacement authority visual review

日期: 2026-05-28

结论: 本轮只做 shard-scoped topic authority alignment。映射对象限定为已经存在并已 seed 的 P1/P3 topic path；没有新增 syllabus node，也没有把 VLM 视觉复核单独当作 syllabus authority。

## Scope

- shard: `p3_w_watermarked_001`
- manifest: `data/manifests/9709_p3_w_watermarked_001_page_chain_surface_v1.json`
- sidecar: `data/manifests/9709_p3_w_watermarked_001_authority_sidecar_v1.json`
- curriculum seed: `data/curriculum/9709_question_search_recovery_nodes_v1.json`
- source posture: post-replacement source PDFs, page-chain projection, accepted visual queue closeout

## Counts

| Metric | Value |
|---|---:|
| manifest_items | `30` |
| new_visual_mappings | `30` |
| seeded_topic_paths | `9` |
| new_syllabus_nodes | `0` |

## Topic Distribution

| Topic Path | Title | Count |
|---|---|---:|
| `9709.p3.algebra` | Algebra | `4` |
| `9709.p3.complex_numbers` | Complex Numbers | `3` |
| `9709.p3.differential_equations` | Differential Equations | `3` |
| `9709.p3.differentiation` | Differentiation | `3` |
| `9709.p3.integration` | Integration | `5` |
| `9709.p3.logarithmic_and_exponential_functions` | Logarithmic And Exponential Functions | `3` |
| `9709.p3.numerical_solution_of_equations` | Numerical Solution Of Equations | `3` |
| `9709.p3.trigonometry` | Trigonometry | `3` |
| `9709.p3.vectors` | Vectors | `3` |

## Method

- Mapped all rows from post-replacement page-chain OCR text, diagram flags, marks, page indices, and rendered review crop references to existing seeded topic paths.
- Used the accepted post-replacement visual queue closeout only as source-legibility evidence; topic truth comes from the authority review over OCR/visual evidence and seeded topic paths.
- Did not introduce new topic paths, syllabus nodes, or invented prompt text.

## Row Review

| Q | Storage Key | Topic Path | Evidence Note | OCR Summary |
|---|---|---|---|---|
| q01 | `9709/w19_qp_31/questions/q01.png` | `9709.p3.logarithmic_and_exponential_functions` | logarithmic expression involving e^(2y) rearranged for y | 1 Given that ln(1 + e^{2y}) = x, express y in terms of x. |
| q02 | `9709/w19_qp_31/questions/q02.png` | `9709.p3.algebra` | absolute-value inequality | 2 Solve the inequality \|2x − 3\| > 4\|x + 1\|. |
| q03 | `9709/w19_qp_31/questions/q03.png` | `9709.p3.differentiation` | parametric differentiation | 3 The parametric equations of a curve are x = 2t + sin 2t, y = ln(1 − cos 2t). Show that dy/dx = cosec 2t. |
| q04 | `9709/w19_qp_31/questions/q04.png` | `9709.p3.differential_equations` | population model differential equation with initial condition | 4 The number of insects in a population t weeks after the start of observations is denoted by N. The population is decreasing at a rate proportional to Ne^{-0.02t}. The variables N and t are treated as continuous, and it |
| q05 | `9709/w19_qp_31/questions/q05.png` | `9709.p3.numerical_solution_of_equations` | fixed-point iteration for stationary-point equation | 5 The curve with equation y = e^{-2x} ln(x - 1) has a stationary point when x = p. (i) Show that p satisfies the equation x = 1 + exp\left(\frac{1}{2(x - 1)}\right), where exp(x) denotes e^x. (ii) Verify by calculation t |
| q06 | `9709/w19_qp_31/questions/q06.png` | `9709.p3.integration` | integration by parts with trigonometric derivative | (i) By differentiating $\frac{\cos x}{\sin x}$, show that if $y = \cot x$ then $\frac{\mathrm{d}y}{\mathrm{d}x} = -\cosec^2 x$. (ii) Show that $\int_{\frac{1}{4}\pi}^{\frac{1}{2}\pi} x \cosec^2 x \, \mathrm{d}x = \frac{1 |
| q07 | `9709/w19_qp_31/questions/q07.png` | `9709.p3.vectors` | 3D vector lines and plane through intersecting lines | 7 Two lines l and m have equations r = ai + 2j + 3k + λ(i − 2j + 3k) and r = 2i + j + 2k + μ(2i − j + k) respectively, where a is a constant. It is given that the lines intersect. (i) Find the value of a. (ii) When a has |
| q08 | `9709/w19_qp_31/questions/q08.png` | `9709.p3.integration` | partial fractions and definite integration | 8 Let f(x) = (x^2 + x + 6) / (x^2 (x + 2)). (i) Express f(x) in partial fractions. (ii) Hence, showing full working, show that the exact value of ∫₁⁴ f(x) dx is 9/4. |
| q09 | `9709/w19_qp_31/questions/q09.png` | `9709.p3.trigonometry` | triple-angle identity, trigonometric equation and exact trigonometric integral | (i) By first expanding cos(2x + x), show that cos 3x ≡ 4 cos³ x − 3 cos x. (ii) Hence solve the equation cos 3x + 3 cos x + 1 = 0, for 0 ⩽ x ⩽ π. (iii) Find the exact value of \(\int_{\frac{1}{6}\pi}^{\frac{1}{3}\pi} \co |
| q10 | `9709/w19_qp_31/questions/q10.png` | `9709.p3.complex_numbers` | complex square roots and Argand diagram | 10 (a) The complex number u is given by u = -3 - (2√10)i. Showing all necessary working and without using a calculator, find the square roots of u. Give your answers in the form a + ib, where the numbers a and b are real |
| q01 | `9709/w19_qp_32/questions/q01.png` | `9709.p3.logarithmic_and_exponential_functions` | logarithmic equation involving exponential term | 1 Solve the equation 5 ln(4 − 3^x) = 6. Show all necessary working and give the answer correct to 3 decimal places. |
| q02 | `9709/w19_qp_32/questions/q02.png` | `9709.p3.differentiation` | stationary point of exponential rational curve | 2 The curve with equation y = e^{-2x} / (1 - x^2) has a stationary point in the interval -1 < x < 1. Find dy/dx and hence find the x-coordinate of this stationary point, giving the answer correct to 3 decimal places. [5] |
| q03 | `9709/w19_qp_32/questions/q03.png` | `9709.p3.algebra` | polynomial division and remainder theorem | 3 The polynomial x^4 + 3x^3 + ax + b, where a and b are constants, is denoted by p(x). When p(x) is divided by x^2 + x - 1 the remainder is 2x + 3. Find the values of a and b. |
| q04 | `9709/w19_qp_32/questions/q04.png` | `9709.p3.trigonometry` | R sin form and trigonometric equation | (i) Express (√6) sin x + cos x in the form R sin(x + α), where R > 0 and 0° < α < 90°. State the exact value of R and give α correct to 3 decimal places. (ii) Hence solve the equation (√6) sin 2θ + cos 2θ = 2, for 0° < θ |
| q05 | `9709/w19_qp_32/questions/q05.png` | `9709.p3.differentiation` | implicit differentiation and horizontal tangent | 5 The equation of a curve is 2x²y − xy² = a³, where a is a positive constant. Show that there is only one point on the curve at which the tangent is parallel to the x-axis and find the y-coordinate of this point. [7] |
| q06 | `9709/w19_qp_32/questions/q06.png` | `9709.p3.differential_equations` | first-order differential equation with trigonometric variables | 6 The variables x and θ satisfy the differential equation sin½θ dx/dθ = (x + 2) cos½θ for 0 < θ < π. It is given that x = 1 when θ = ⅓π. Solve the differential equation and obtain an expression for x in terms of cos θ. |
| q07 | `9709/w19_qp_32/questions/q07.png` | `9709.p3.complex_numbers` | complex conjugate equation and Argand loci | (a) Find the complex number z satisfying the equation z + \frac{iz}{z^*} - 2 = 0, where z^* denotes the complex conjugate of z. Give your answer in the form x + iy, where x and y are real. (b) (i) On a single Argand diag |
| q08 | `9709/w19_qp_32/questions/q08.png` | `9709.p3.integration` | partial fractions and logarithmic definite integral | 8 Let f(x) = (2x^2 + x + 8)/((2x - 1)(x^2 + 2)). (i) Express f(x) in partial fractions. (ii) Hence, showing full working, find ∫₁⁵ f(x) dx, giving the answer in the form ln c, where c is an integer. |
| q09 | `9709/w19_qp_32/questions/q09.png` | `9709.p3.numerical_solution_of_equations` | fixed-point iteration derived from integral equation | 9 It is given that ∫₀ᵃ x cos(1/3 x) dx = 3, where the constant a is such that 0 < a < 3/2 π. (i) Show that a satisfies the equation a = (4 − 3 cos(1/3 a)) / sin(1/3 a). (ii) Verify by calculation that a lies between 2.5  |
| q10 | `9709/w19_qp_32/questions/q10.png` | `9709.p3.vectors` | vector line-plane intersection, angle and perpendicular plane | 10 The line l has equation r = i + 3j − 2k + λ(i − 2j + 3k). The plane p has equation 2x + y − 3z = 5. (i) Find the position vector of the point of intersection of l and p. [3] (ii) Calculate the acute angle between l an |
| q01 | `9709/w19_qp_33/questions/q01.png` | `9709.p3.algebra` | absolute-value inequality | 1 Solve the inequality 2\|x + 2\| > \|3x − 1\|. |
| q02 | `9709/w19_qp_33/questions/q02.png` | `9709.p3.algebra` | polynomial factor and remainder theorem | 2 The polynomial 6x^3 + ax^2 + bx - 2, where a and b are constants, is denoted by p(x). It is given that (2x + 1) is a factor of p(x) and that when p(x) is divided by (x + 2) the remainder is -24. Find the values of a an |
| q03 | `9709/w19_qp_33/questions/q03.png` | `9709.p3.logarithmic_and_exponential_functions` | exponential equation in powers of 3 | 3 Showing all necessary working, solve the equation \(\frac{3^{2x} + 3^{-x}}{3^{2x} - 3^{-x}} = 4\). Give your answer correct to 3 decimal places. |
| q04 | `9709/w19_qp_33/questions/q04.png` | `9709.p3.trigonometry` | trigonometric identity and equation in tan x | (i) By first expanding tan(2x + x), show that the equation tan 3x = 3 cot x can be written in the form tan⁴x − 12 tan²x + 3 = 0. (ii) Hence solve the equation tan 3x = 3 cot x for 0° < x < 90°. |
| q05 | `9709/w19_qp_33/questions/q05.png` | `9709.p3.numerical_solution_of_equations` | root existence and iterative formula | (i) By sketching a suitable pair of graphs, show that the equation ln(x + 2) = 4e^{-x} has exactly one real root. (ii) Show by calculation that this root lies between x = 1 and x = 1.5. (iii) Use the iterative formula $x |
| q06 | `9709/w19_qp_33/questions/q06.png` | `9709.p3.complex_numbers` | modulus-argument complex number and exact Cartesian form | 6 Throughout this question the use of a calculator is not permitted. The complex number with modulus 1 and argument \(\frac{1}{3}\pi\) is denoted by \(w\). (i) Express \(w\) in the form \(x + iy\), where \(x\) and \(y\)  |
| q07 | `9709/w19_qp_33/questions/q07.png` | `9709.p3.vectors` | planes, perpendicular distance and angle | 7 The plane m has equation x + 4y - 8z = 2. The plane n is parallel to m and passes through the point P with coordinates (5, 2, -2). (i) Find the equation of n, giving your answer in the form ax + by + cz = d. (ii) Calcu |
| q08 | `9709/w19_qp_33/questions/q08.png` | `9709.p3.integration` | trapezium-rule estimate and integral of sec x with diagram | The diagram shows the graph of y = sec x for 0 ≤ x < ½π. (i) Use the trapezium rule with 2 intervals to estimate the value of ∫₀¹·² sec x dx, giving your answer correct to 2 decimal places. [3] (ii) Explain, with referen |
| q09 | `9709/w19_qp_33/questions/q09.png` | `9709.p3.differential_equations` | separable differential equation solved with partial fractions | 9 The variables x and t satisfy the differential equation 5 dx/dt = (20 − x)(40 − x). It is given that x = 10 when t = 0. (i) Using partial fractions, solve the differential equation, obtaining an expression for x in ter |
| q10 | `9709/w19_qp_33/questions/q10.png` | `9709.p3.integration` | area under exponential-trigonometric curve after maximum point | The diagram shows the graph of y = e^{cos x} sin^3 x for 0 ≤ x ≤ π, and its maximum point M. The shaded region R is bounded by the curve and the x-axis. (i) Find the x-coordinate of M. Show all necessary working and give |
