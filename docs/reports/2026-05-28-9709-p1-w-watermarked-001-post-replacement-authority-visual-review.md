# 9709 p1_w_watermarked_001 post-replacement authority visual review

日期: 2026-05-28

结论: 本轮只做 shard-scoped topic authority alignment。映射对象限定为已经存在并已 seed 的 P1/P3 topic path；没有新增 syllabus node，也没有把 VLM 视觉复核单独当作 syllabus authority。

## Scope

- shard: `p1_w_watermarked_001`
- manifest: `data/manifests/9709_p1_w_watermarked_001_page_chain_surface_v1.json`
- sidecar: `data/manifests/9709_p1_w_watermarked_001_authority_sidecar_v1.json`
- curriculum seed: `data/curriculum/9709_question_search_recovery_nodes_v1.json`
- source posture: post-replacement source PDFs, page-chain projection, accepted visual queue closeout

## Counts

| Metric | Value |
|---|---:|
| manifest_items | `32` |
| new_visual_mappings | `32` |
| seeded_topic_paths | `8` |
| new_syllabus_nodes | `0` |

## Topic Distribution

| Topic Path | Title | Count |
|---|---|---:|
| `9709.p1.circular_measure` | Circular Measure | `3` |
| `9709.p1.coordinate_geometry` | Coordinate Geometry | `4` |
| `9709.p1.differentiation` | Differentiation | `7` |
| `9709.p1.functions` | Functions | `2` |
| `9709.p1.integration` | Integration | `4` |
| `9709.p1.quadratics` | Quadratics | `3` |
| `9709.p1.series` | Series | `6` |
| `9709.p1.trigonometry` | Trigonometry | `3` |

## Method

- Mapped all rows from post-replacement page-chain OCR text, diagram flags, marks, page indices, and rendered review crop references to existing seeded topic paths.
- Used the accepted post-replacement visual queue closeout only as source-legibility evidence; topic truth comes from the authority review over OCR/visual evidence and seeded topic paths.
- Did not introduce new topic paths, syllabus nodes, or invented prompt text.

## Row Review

| Q | Storage Key | Topic Path | Evidence Note | OCR Summary |
|---|---|---|---|---|
| q01 | `9709/w19_qp_11/questions/q01.png` | `9709.p1.series` | binomial expansion term independent of x | 1 Find the term independent of x in the expansion of \(\left(2x + \frac{1}{4x^2}\right)^6\). |
| q02 | `9709/w19_qp_11/questions/q02.png` | `9709.p1.differentiation` | increasing function determined from derivative sign | 2 An increasing function, f, is defined for x > n, where n is an integer. It is given that f'(x) = x² - 6x + 8. Find the least possible value of n. |
| q03 | `9709/w19_qp_11/questions/q03.png` | `9709.p1.differentiation` | tangent to cubic curve using derivative at a point | 3 The line y = ax + b is a tangent to the curve y = 2x^3 - 5x^2 - 3x + c at the point (2, 6). Find the values of the constants a, b and c. |
| q04 | `9709/w19_qp_11/questions/q04.png` | `9709.p1.series` | geometric progression of daily distances | 4 A runner who is training for a long-distance race plans to run increasing distances each day for 21 days. She will run x km on day 1, and on each subsequent day she will increase the distance by 10% of the previous day |
| q05 | `9709/w19_qp_11/questions/q05.png` | `9709.p1.trigonometry` | trigonometric equation and interval solution | (i) Given that 4 tan x + 3 cos x + \frac{1}{\cos x} = 0, show, without using a calculator, that sin x = -\frac{2}{3}. (ii) Hence, showing all necessary working, solve the equation 4 tan(2x − 20°) + 3 cos(2x − 20°) + 1/co |
| q06 | `9709/w19_qp_11/questions/q06.png` | `9709.p1.quadratics` | line tangent to quadratic curve using discriminant/tangency | 6 A straight line has gradient m and passes through the point (0, −2). Find the two values of m for which the line is a tangent to the curve y = x² − 2x + 7 and, for each value of m, find the coordinates of the point whe |
| q07 | `9709/w19_qp_11/questions/q07.png` | `9709.p1.functions` | function ranges and composite function | 7 Functions f and g are defined by f : x ↦ 3/(2x + 1) for x > 0, g : x ↦ 1/x + 2 for x > 0. (i) Find the range of f and the range of g. (ii) Find an expression for fg(x), giving your answer in the form \(\frac{ax}{bx + c |
| q08 | `9709/w19_qp_11/questions/q08.png` | `9709.p1.circular_measure` | sector, tangents, perimeter and shaded area in radians | The diagram shows a sector OAC of a circle with centre O. Tangents AB and CB to the circle meet at B. The arc AC is of length 6 cm and angle AOC = 3/8 π radians. (i) Find the length of OA correct to 4 significant figures |
| q09 | `9709/w19_qp_11/questions/q09.png` | `9709.p1.differentiation` | derivatives, stationary point and nature of a curve | 9 A curve for which $\frac{\mathrm{d} y}{\mathrm{~d} x}=(5 x-1)^{\frac{1}{2}}-2$ passes through the point $(2,3)$. (i) Find the equation of the curve. (ii) Find \(\frac{\mathrm{d}^{2} y}{\mathrm{~d} x^{2}}\). (iii) Find  |
| q10 | `9709/w19_qp_11/questions/q10.png` | `9709.p1.coordinate_geometry` | position-vector geometry and area in 3D using coordinate methods | Relative to an origin O, the position vectors of the points A, B, C and D, shown in the diagram, are given by \[ \overrightarrow{OA} = \begin{pmatrix} -1 \\ 3 \\ -4 \end{pmatrix}, \quad \overrightarrow{OB} = \begin{pmatr |
| q11 | `9709/w19_qp_11/questions/q11.png` | `9709.p1.integration` | curve rearrangement and shaded-region area by integration | The diagram shows a shaded region bounded by the y-axis, the line y = -1 and the part of the curve y = x² + 4x + 3 for which x ≥ -2. (i) Express y = x² + 4x + 3 in the form y = (x + a)² + b, where a and b are constants.  |
| q01 | `9709/w19_qp_12/questions/q01.png` | `9709.p1.series` | binomial expansion coefficient | 1 The coefficient of x^2 in the expansion of (4 + ax)(1 + x/2)^6 is 3. Find the value of the constant a. [4] |
| q02 | `9709/w19_qp_12/questions/q02.png` | `9709.p1.coordinate_geometry` | midpoint and parallel line equation | 2 The point M is the mid-point of the line joining the points (3, 7) and (−1, 1). Find the equation of the line through M which is parallel to the line x/3 + y/2 = 1. |
| q03 | `9709/w19_qp_12/questions/q03.png` | `9709.p1.integration` | curve equation recovered from derivative and points | 3 A curve is such that $\frac{\mathrm{d} y}{\mathrm{~d} x}=\frac{k}{\sqrt{x}}$, where $k$ is a constant. The points $P(1,-1)$ and $Q(4,4)$ lie on the curve. Find the equation of the curve. |
| q04 | `9709/w19_qp_12/questions/q04.png` | `9709.p1.circular_measure` | circle tangents, perimeter and sector area | The diagram shows a circle with centre O and radius r cm. Points A and B lie on the circle and angle AOB = 2θ radians. The tangents to the circle at A and B meet at T. (i) Express the perimeter of the shaded region in te |
| q05 | `9709/w19_qp_12/questions/q05.png` | `9709.p1.differentiation` | stationary volume and related-rate style optimization | The diagram shows a solid cone which has a slant height of 15 cm and a vertical height of h cm. (i) Show that the volume, V cm³, of the cone is given by V = \frac{1}{3}\pi(225h - h^3). [2] [The volume of a cone of radius |
| q06 | `9709/w19_qp_12/questions/q06.png` | `9709.p1.trigonometry` | trigonometric equations and trigonometric form transformation | 6 (a) Given that x > 0, find the two smallest values of x, in radians, for which 3 tan(2x + 1) = 1. Show all necessary working. (b) The function f : x ↦ 3 cos²x − 2 sin²x is defined for 0 ≤ x ≤ π. (i) Express f(x) in the |
| q07 | `9709/w19_qp_12/questions/q07.png` | `9709.p1.coordinate_geometry` | 3D position-vector distance and angle geometry | The diagram shows a three-dimensional shape OABCDEF G. The base OABC and the upper surface DEFG are identical horizontal rectangles. The parallelograms OAED and CBFG both lie in vertical planes. Points P and Q are the mi |
| q08 | `9709/w19_qp_12/questions/q08.png` | `9709.p1.series` | arithmetic and geometric progression sums | 8 (a) Over a 21-day period an athlete prepares for a marathon by increasing the distance she runs each day by 1.2 km. On the first day she runs 13 km. (i) Find the distance she runs on the last day of the 21-day period.  |
| q09 | `9709/w19_qp_12/questions/q09.png` | `9709.p1.quadratics` | quadratic curve tangent and value-set inequalities | 9 Functions f and g are defined by f(x) = 2x² + 8x + 1 for x ∈ ℝ, g(x) = 2x − k for x ∈ ℝ, where k is a constant. (i) Find the value of k for which the line y = g(x) is a tangent to the curve y = f(x). [3] (ii) In the ca |
| q10 | `9709/w19_qp_12/questions/q10.png` | `9709.p1.integration` | derivative, antiderivative, normal and area under curve | The diagram shows part of the curve $y = 1 - \frac{4}{(2x + 1)^2}$. The curve intersects the $x$-axis at $A$. The normal to the curve at $A$ intersects the $y$-axis at $B$. (i) Obtain expressions for $\frac{\mathrm{d}y}{ |
| q01 | `9709/w19_qp_13/questions/q01.png` | `9709.p1.series` | binomial expansion to a specified power | (i) Expand (1 + y)^6 in ascending powers of y as far as the term in y^2. (ii) In the expansion of (1 + (px - 2x^2))^6 the coefficient of x^2 is 48. Find the value of the positive constant p. |
| q02 | `9709/w19_qp_13/questions/q02.png` | `9709.p1.functions` | inverse function and domain after completing square | 2 The function g is defined by g(x) = x² − 6x + 7 for x > 4. By first completing the square, find an expression for g⁻¹(x) and state the domain of g⁻¹. |
| q03 | `9709/w19_qp_13/questions/q03.png` | `9709.p1.differentiation` | stationary point interval from derivative of cubic | 3 The equation of a curve is y = x³ + x² − 8x + 7. The curve has no stationary points in the interval a < x < b. Find the least possible value of a and the greatest possible value of b. |
| q04 | `9709/w19_qp_13/questions/q04.png` | `9709.p1.circular_measure` | semicircle angle in radians and shaded area | The diagram shows a semicircle ACB with centre O and radius r. Arc OC is part of a circle with centre A. (i) Express angle CAO in radians in terms of π. (ii) Find the area of the shaded region in terms of r, π and √3, si |
| q05 | `9709/w19_qp_13/questions/q05.png` | `9709.p1.differentiation` | related rates for cuboid surface area and volume | The dimensions of a cuboid are x cm, 2x cm and 4x cm, as shown in the diagram. (i) Show that the surface area S cm² and the volume V cm³ are connected by the relation S = 7V^(2/3). (ii) When the volume of the cuboid is 1 |
| q06 | `9709/w19_qp_13/questions/q06.png` | `9709.p1.quadratics` | line-curve intersections and tangency parameter values | 6 A line has equation y = 3kx − 2k and a curve has equation y = x² − kx + 2, where k is a constant. (i) Find the set of values of k for which the line and curve meet at two distinct points. (ii) For each of two particula |
| q07 | `9709/w19_qp_13/questions/q07.png` | `9709.p1.trigonometry` | trigonometric equation reduced to quadratic form | (i) Show that the equation 3 cos⁴ θ + 4 sin² θ − 3 = 0 can be expressed as 3x² − 4x + 1 = 0, where x = cos² θ. (ii) Hence solve the equation 3 cos⁴ θ + 4 sin² θ − 3 = 0 for 0° ≤ θ ≤ 180°. |
| q08 | `9709/w19_qp_13/questions/q08.png` | `9709.p1.differentiation` | decreasing function interval and recovery from derivative | 8 A function f is defined for x > 1/2 and is such that f'(x) = 3(2x - 1)^{1/2} - 6. (i) Find the set of values of x for which f is decreasing. (ii) It is now given that f(1) = −3. Find f(x). |
| q09 | `9709/w19_qp_13/questions/q09.png` | `9709.p1.series` | geometric progression ratios from first terms | 9 The first, second and third terms of a geometric progression are 3k, 5k − 6 and 6k − 4, respectively. (i) Show that k satisfies the equation 7k² − 48k + 36 = 0. (ii) Find, showing all necessary working, the exact value |
| q10 | `9709/w19_qp_13/questions/q10.png` | `9709.p1.coordinate_geometry` | 3D position-vector geometry | 10 Relative to an origin O, the position vectors of the points A, B and X are given by \[ \overrightarrow{OA} = \begin{pmatrix} -8 \\ -4 \\ 2 \end{pmatrix}, \quad \overrightarrow{OB} = \begin{pmatrix} 10 \\ 2 \\ 11 \end{ |
| q11 | `9709/w19_qp_13/questions/q11.png` | `9709.p1.integration` | normal to curve and area bounded by curve/line | The diagram shows part of the curve y = (x − 1)⁻² + 2, and the lines x = 1 and x = 3. The point A on the curve has coordinates (2, 3). The normal to the curve at A crosses the line x = 1 at B. (i) Show that the normal AB |
