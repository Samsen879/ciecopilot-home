# 9709 p1_m_watermarked_001 authority visual review

日期: 2026-05-12

结论: 本轮只做 shard-scoped topic authority alignment。映射对象限定为已经存在并已 seed 的 P1 topic path；没有新增 syllabus node，也没有把视觉判读当成新 syllabus authority。

## Counts

| Metric | Value |
|---|---:|
| manifest_items | `12` |
| existing_sidecar_reused | `0` |
| new_visual_mappings | `12` |
| seeded_topic_paths | `7` |

## Topic Distribution

| Topic Path | Title | Count |
|---|---|---:|
| `9709.p1.circular_measure` | Circular Measure | `1` |
| `9709.p1.coordinate_geometry` | Coordinate Geometry | `1` |
| `9709.p1.differentiation` | Differentiation | `3` |
| `9709.p1.functions` | Functions | `2` |
| `9709.p1.integration` | Integration | `1` |
| `9709.p1.series` | Series | `2` |
| `9709.p1.trigonometry` | Trigonometry | `2` |

## Method

- Mapped all rows from `p1_m_watermarked_001` page-chain OCR text, diagram flags, marks, page indices, and rendered review crop references to existing seeded topic paths.
- Used the accepted human visual disposition for watermark, diagram, and cross-page continuity checks before authority alignment.
- Did not introduce new topic paths, syllabus nodes, or invented prompt text.

## Row Review

| Storage Key | Topic Path | Topic | Source | Evidence Summary |
|---|---|---|---|---|
| `9709/m20_qp_12/questions/q01.png` | `9709.p1.differentiation` | Differentiation | `new_watermarked_visual_mapping` | 1 The function f is defined by f(x) = \frac{1}{3x + 2} + x^2 for x < -1. Determine whether f is an increasing function, a decreasing function or neither. |
| `9709/m20_qp_12/questions/q02.png` | `9709.p1.functions` | Functions | `new_watermarked_visual_mapping` | 2 The graph of y = f(x) is transformed to the graph of y = 1 + f(½x). Describe fully the two single transformations which have been combined to give the resulting transformation. |
| `9709/m20_qp_12/questions/q03.png` | `9709.p1.integration` | Integration | `new_watermarked_visual_mapping` | The diagram shows part of the curve with equation y = x² + 1. The shaded region enclosed by the curve, the y-axis and the line y = 5 is rotated through 360° about the y-axis. Find the volume obtained. |
| `9709/m20_qp_12/questions/q04.png` | `9709.p1.differentiation` | Differentiation | `new_watermarked_visual_mapping` | 4 A curve has equation y = x² - 2x - 3. A point is moving along the curve in such a way that at P the y-coordinate is increasing at 4 units per second and the x-coordinate is increasing at 6 units per second. Find the x-coordinate of P. |
| `9709/m20_qp_12/questions/q05.png` | `9709.p1.trigonometry` | Trigonometry | `new_watermarked_visual_mapping` | 5 Solve the equation \[ \frac{\tan \theta + 3 \sin \theta + 2}{\tan \theta - 3 \sin \theta + 1} = 2 \] for $0^\circ \leqslant \theta \leqslant 90^\circ$. |
| `9709/m20_qp_12/questions/q06.png` | `9709.p1.series` | Series | `new_watermarked_visual_mapping` | 6 The coefficient of $\frac{1}{x}$ in the expansion of $\left(2x + \frac{a}{x^2}\right)^5$ is 720. (a) Find the possible values of the constant $a$. (b) Hence find the coefficient of $\frac{1}{x^7}$ in the expansion. |
| `9709/m20_qp_12/questions/q07.png` | `9709.p1.circular_measure` | Circular Measure | `new_watermarked_visual_mapping` | The diagram shows a sector AOB which is part of a circle with centre O and radius 6 cm and with angle AOB = 0.8 radians. The point C on OB is such that AC is perpendicular to OB. The arc CD is part of a circle with centre O, where D lies on OA. Find the area of the shaded region. |
| `9709/m20_qp_12/questions/q08.png` | `9709.p1.series` | Series | `new_watermarked_visual_mapping` | 8 A woman's basic salary for her first year with a particular company is $30000 and at the end of the year she also gets a bonus of $600. (a) For her first year, express her bonus as a percentage of her basic salary. [1] At the end of each complete year, the woman's basic salary will increase by 3% and her bonus will increase by $100. (b) Express the bonus s |
| `9709/m20_qp_12/questions/q09.png` | `9709.p1.functions` | Functions | `new_watermarked_visual_mapping` | (a) Express 2x² + 12x + 11 in the form 2(x + a)² + b, where a and b are constants. The function f is defined by f(x) = 2x² + 12x + 11 for x ≤ −4. (b) Find an expression for f⁻¹(x) and state the domain of f⁻¹. The function g is defined by g(x) = 2x − 3 for x ⩽ k. (c) For the case where k = −1, solve the equation fg(x) = 193. (d) State the largest value of k p |
| `9709/m20_qp_12/questions/q10.png` | `9709.p1.differentiation` | Differentiation | `new_watermarked_visual_mapping` | 10 The gradient of a curve at the point (x, y) is given by dy/dx = 2(x + 3)^{1/2} - x. The curve has a stationary point at (a, 14), where a is a positive constant. (a) Find the value of a. (b) Determine the nature of the stationary point. (c) Find the equation of the curve. |
| `9709/m20_qp_12/questions/q11.png` | `9709.p1.trigonometry` | Trigonometry | `new_watermarked_visual_mapping` | 11 (a) Solve the equation $3 \tan^2 x - 5 \tan x - 2 = 0$ for $0^\circ \leqslant x \leqslant 180^\circ$. (b) Find the set of values of $k$ for which the equation $3 \tan^2 x - 5 \tan x + k = 0$ has no solutions. (c) For the equation 3 tan² x − 5 tan x + k = 0, state the value of k for which there are three solutions in the interval 0° ≤ x ≤ 180°, and find th |
| `9709/m20_qp_12/questions/q12.png` | `9709.p1.coordinate_geometry` | Coordinate Geometry | `new_watermarked_visual_mapping` | 12 A diameter of a circle C₁ has end-points at (−3, −5) and (7, 3). (a) Find an equation of the circle C₁. The circle C₁ is translated by \(\begin{pmatrix}8\\4\end{pmatrix}\) to give circle C₂, as shown in the diagram. (b) Find an equation of the circle C₂. (c) Show that the equation of the line RS is y = -2x + 13. (d) Hence show that the x-coordinates of R  |
