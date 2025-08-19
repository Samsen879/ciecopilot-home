# CAIE 9231 Further Mathematics: Paper 2 Generation
## Topic: Differentiation

---
---

### Question 1: Implicit Differentiation and Higher Derivatives

`---`
`Syllabus Reference: "9231/2.3 Differentiation"`
`Learning Objective: "Find the second derivative (d²y/dx²) for implicitly defined relations."`
`Difficulty Profile: {"part_a": "Medium", "part_b": "Hard"}`
`Cognitive Skills: ["Apply", "Analyze"]`
`Time Estimate: "14"`
`Topic Weight: 9`
`Prerequisite Skills: ["Implicit differentiation", "Chain rule", "Product rule", "Differentiation of hyperbolic and polynomial functions"]`
`Cross_Topic_Links: ["Hyperbolic Functions"]`
`Example Question:`
`A curve C is defined by the equation x³ + sinh(2y) = 4x.`
`(a) Find an expression for dy/dx in terms of x and y. [4]`
`(b) The point P(2, 0) lies on C. Find the value of d²y/dx² at the point P. [5]`
`Mark Scheme:`
`part_a:`
`- M1: Differentiates the equation with respect to x, correctly applying the chain rule to sinh(2y).`
  `3x² + cosh(2y) * 2(dy/dx) = 4.`
`- M1: Correctly isolates the dy/dx term.`
  `2cosh(2y)(dy/dx) = 4 - 3x².`
`- A1: States the correct final expression for dy/dx.`
  `dy/dx = (4 - 3x²) / (2cosh(2y)).`
`part_b:`
`- M1: Differentiates the expression for dy/dx using the quotient rule.`
  `d²y/dx² = [(-6x)(2cosh(2y)) - (4 - 3x²)(4sinh(2y)(dy/dx))] / (4cosh²(2y)).`
`- M1: First finds the value of dy/dx at P(2, 0).`
  `dy/dx at P = (4 - 3(2)²) / (2cosh(0)) = (4 - 12) / (2 * 1) = -4.`
`- A1: Correct value of dy/dx at P is -4.`
`- M1: Substitutes x=2, y=0, and dy/dx=-4 into the expression for d²y/dx².`
  `d²y/dx² = [(-12)(2cosh(0)) - (4 - 12)(4sinh(0)(-4))] / (4cosh²(0)).`
`- A1: Evaluates correctly to find the final answer.`
  `d²y/dx² = [(-12)(2) - (-8)(0)] / (4 * 1²) = -24 / 4 = -6.`
`Standard Solution Steps:`
`part_a:`
`1. We need to differentiate the entire equation implicitly with respect to x.`
`d/dx(x³) + d/dx(sinh(2y)) = d/dx(4x).`
`2. The derivative of x³ is 3x². The derivative of 4x is 4.`
`3. For the sinh(2y) term, we must use the chain rule. Let u = 2y. Then d/dx(sinh(u)) = cosh(u) * du/dx.`
`   Here, du/dx = d/dx(2y) = 2(dy/dx).`
`   So, d/dx(sinh(2y)) = cosh(2y) * 2(dy/dx).`
`4. The full differentiated equation is: 3x² + 2cosh(2y)(dy/dx) = 4.`
`5. Rearrange the equation to solve for dy/dx:`
   `2cosh(2y)(dy/dx) = 4 - 3x²`
   `dy/dx = (4 - 3x²) / (2cosh(2y))`
`part_b:`
`1. To find the second derivative, we differentiate the expression for dy/dx with respect to x. This requires the quotient rule: d/dx(u/v) = (u'v - uv') / v².`
   `Let u = 4 - 3x² and v = 2cosh(2y).`
   `u' = -6x.`
   `v' = d/dx(2cosh(2y)) = 2 * sinh(2y) * 2(dy/dx) = 4sinh(2y)(dy/dx).`
`2. Substitute these into the quotient rule formula:`
   `d²y/dx² = [(-6x)(2cosh(2y)) - (4 - 3x²)(4sinh(2y)(dy/dx))] / (2cosh(2y))².`
`3. Before substituting values into this complex expression, first calculate the value of the first derivative, dy/dx, at the point P(2, 0).`
   `dy/dx |_(2,0) = (4 - 3(2)²) / (2cosh(2*0)) = (4 - 12) / (2 * 1) = -8 / 2 = -4.`
`4. Now substitute x=2, y=0, and dy/dx=-4 into the expression for d²y/dx². Note that cosh(0)=1 and sinh(0)=0.`
   `d²y/dx² |_(2,0) = [(-6*2)(2cosh(0)) - (4 - 3*2²)(4sinh(0)(-4))] / (4cosh²(0)).`
   `d²y/dx² |_(2,0) = [(-12)(2) - (-8)(4*0*-4)] / (4 * 1²).`
`5. The term containing sinh(0) becomes zero, which simplifies the calculation greatly.`
   `d²y/dx² |_(2,0) = -24 / 4 = -6.`
`Teaching Insights:`
`- Implicit differentiation is fundamentally an application of the chain rule. Emphasize that every time a term involving `y` is differentiated with respect to `x`, it generates a `dy/dx` factor.`
`- When finding a higher derivative at a specific point, it is almost always easier to calculate the value of the lower derivative(s) at that point first, rather than substituting the entire algebraic expression for `dy/dx` into the formula for `d²y/dx².`
`- Point out the "shortcut" of differentiating the expression `2cosh(2y)(dy/dx) = 4 - 3x²` using the product rule on the left side, which can sometimes be less prone to error than the quotient rule. `(4sinh(2y)(dy/dx))(dy/dx) + 2cosh(2y)(d²y/dx²) = -6x`.`
`Error Analysis:`
`- Forgetting the `2(dy/dx)` factor from the chain rule when differentiating `sinh(2y)`.`
`- Errors in applying the quotient rule, particularly with the negative sign in the numerator formula.`
`- Making an algebraic slip when substituting the values of x, y, and dy/dx into the final expression.`
`- Attempting to substitute the entire algebraic expression for `dy/dx` into the second derivative formula, leading to a highly complex expression and likely errors.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Implicit differentiation", "Chain rule", "Product rule", "Quotient rule"]`
  `Next_Steps: ["Using implicit differentiation to find Maclaurin series", "Finding equations of tangents and normals for implicitly defined curves"]`
`API Integration Fields:`
`  {"uuid": "e3a8b1c4-9f2d-4e8a-8b1c-5d9f3a2c1b4e", "topic_hash": "DIFF_IMPLICIT_01", "adaptive_difficulty": "0.65"}`
`Tags: ["implicit differentiation", "second derivative", "chain rule", "quotient rule", "hyperbolic functions"]`
`---`

---
---

### Question 2: Parametric Differentiation and Inverse Trigonometry

`---`
`Syllabus Reference: "9231/2.3 Differentiation"`
`Learning Objective: "Differentiate inverse trigonometric functions. Find the first and second derivatives for parametrically defined relations."`
`Difficulty Profile: {"part_a": "Easy", "part_b": "Medium", "part_c": "Hard"}`
`Cognitive Skills: ["Apply", "Analyze"]`
`Time Estimate: "15"`
`Topic Weight: 9`
`Prerequisite Skills: ["Parametric differentiation formula (dy/dx and d²y/dx²)", "Differentiation of inverse trigonometric functions", "Chain rule", "Equation of a normal"]`
`Cross_Topic_Links: ["Parametric Equations", "Trigonometry"]`
`Example Question:`
`A curve is defined by the parametric equations`
`x = 2t²,  y = arcsin(t),  for 0 < t < 1.`
`(a) Find an expression for dy/dx in terms of t. [3]`
`(b) Find the equation of the normal to the curve at the point where t = 1/√2, giving your answer in the form ax + by + c = 0. [4]`
`(c) Find an expression for d²y/dx² in terms of t. [3]`
`Mark Scheme:`
`part_a:`
`- B1: Correctly finds dx/dt = 4t.`
`- B1: Correctly finds dy/dt = 1 / sqrt(1 - t²).`
`- M1: Applies the parametric differentiation formula dy/dx = (dy/dt) / (dx/dt).`
  `dy/dx = (1 / sqrt(1 - t²)) / (4t) = 1 / (4t * sqrt(1 - t²)).`
`part_b:`
`- M1: Evaluates dy/dx at t = 1/√2.`
  `m_T = 1 / (4(1/√2) * sqrt(1 - (1/√2)²)) = 1 / ((4/√2) * sqrt(1/2)) = 1 / ((4/√2) * (1/√2)) = 1/2.`
`- M1: Finds the gradient of the normal, m_N = -1 / m_T = -2.`
`- B1: Finds the coordinates of the point: x = 2(1/√2)² = 1, y = arcsin(1/√2) = π/4.`
`- A1: Uses y - y₁ = m(x - x₁) to find the equation and presents it in the required form.`
  `y - π/4 = -2(x - 1) => 4y - π = -8x + 8 => 8x + 4y - 8 - π = 0.`
`part_c:`
`- M1: States the correct formula for the second derivative: d²y/dx² = d/dt(dy/dx) * (dt/dx).`
`- M1: Differentiates dy/dx with respect to t. Let dy/dx = (4t(1-t²)^(1/2))⁻¹. `
  `d/dt(dy/dx) = -1 * (4t(1-t²)^(1/2))⁻² * [4(1-t²)^(1/2) + 4t * (1/2)(1-t²)⁻¹/² * (-2t)]`
  `= -[4(1-t²)^(1/2) - 4t²(1-t²)⁻¹/²] / (16t²(1-t²)) = -(4(1-t²) - 4t²) / (16t²(1-t²)^(3/2)) = -(4-8t²) / (16t²(1-t²)^(3/2)).`
`- A1: Simplifies and multiplies by dt/dx = 1/(4t).`
  `d²y/dx² = (8t² - 4) / (16t²(1-t²)^(3/2)) * (1/(4t)) = (2t² - 1) / (16t³(1-t²)^(3/2)).`
`Standard Solution Steps:`
`part_a:`
`1. Find the derivatives of x and y with respect to the parameter t.`
   `dx/dt = d/dt(2t²) = 4t.`
   `dy/dt = d/dt(arcsin(t)) = 1 / sqrt(1 - t²).`
`2. Use the chain rule for parametric equations: dy/dx = (dy/dt) / (dx/dt).`
`3. Substitute the derivatives: dy/dx = (1 / sqrt(1 - t²)) / (4t).`
`4. Simplify the expression: dy/dx = 1 / (4t * sqrt(1 - t²)).`
`part_b:`
`1. Find the gradient of the tangent (m_T) by substituting t = 1/√2 into the expression for dy/dx.`
   `m_T = 1 / (4(1/√2) * sqrt(1 - 1/2)) = 1 / ((4/√2) * (1/√2)) = 1 / (4/2) = 1/2.`
`2. The normal is perpendicular to the tangent, so its gradient (m_N) is the negative reciprocal: m_N = -1 / (1/2) = -2.`
`3. Find the (x, y) coordinates of the point when t = 1/√2.`
   `x = 2(1/√2)² = 2(1/2) = 1.`
   `y = arcsin(1/√2) = π/4.`
`4. Use the point-gradient form of a line, y - y₁ = m(x - x₁), to find the equation of the normal.`
   `y - π/4 = -2(x - 1).`
`5. Rearrange into the form ax + by + c = 0.`
   `y - π/4 = -2x + 2`
   `4y - π = -8x + 8`
   `8x + 4y - (8 + π) = 0.`
`part_c:`
`1. The formula for the second parametric derivative is d²y/dx² = d/dt(dy/dx) * (dt/dx).`
`2. We already have dy/dx and we know dt/dx = 1 / (dx/dt) = 1/(4t).`
`3. We need to find d/dt(dy/dx) = d/dt [ (4t * sqrt(1-t²))⁻¹ ]. Using the chain rule:`
   `= -1 * (4t * sqrt(1-t²))⁻² * d/dt(4t * sqrt(1-t²)).`
`4. The derivative in the bracket requires the product rule: `
   `d/dt(4t(1-t²)¹/²) = 4(1-t²)¹/² + 4t * (1/2)(1-t²)⁻¹/² * (-2t) = 4*sqrt(1-t²) - 4t²/sqrt(1-t²).`
`5. Combine everything:`
   `d/dt(dy/dx) = -[4*sqrt(1-t²) - 4t²/sqrt(1-t²)] / [16t²(1-t²)]`
   `= -[4(1-t²) - 4t²] / [16t²(1-t²)^(3/2)] = -(4 - 8t²) / [16t²(1-t²)^(3/2)] = (8t² - 4) / [16t²(1-t²)^(3/2)].`
`6. Finally, multiply by dt/dx:`
   `d²y/dx² = ( (8t² - 4) / [16t²(1-t²)^(3/2)] ) * (1 / (4t)) = (2t² - 1) / (16t³(1-t²)^(3/2)).`
`Teaching Insights:`
`- The formula for the second parametric derivative is a common point of failure. Emphasize that it is NOT `(d²y/dt²) / (d²x/dt²)`. The `* dt/dx` term is crucial.`
`- When dealing with complicated expressions for differentiation, like in part (c), writing them with negative and fractional exponents, `f(t)⁻¹`, can make the chain rule more straightforward than the quotient rule for some students.`
`- Remind students to find all components needed for the equation of a line: the x-coordinate, the y-coordinate, and the gradient.`
`Error Analysis:`
`- In (a), knowing the derivative of `arcsin(t)` but forgetting the chain rule when applying the parametric formula.`
`- In (b), using the tangent gradient instead of the normal gradient.`
`- In (c), using the incorrect formula for the second derivative, often by forgetting the `* dt/dx` factor.`
`- Significant algebraic errors when differentiating the expression for `dy/dx`, especially when combining product, chain, and power rules.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Parametric differentiation", "Differentiation of inverse trigonometric functions", "Chain rule"]`
  `Next_Steps: ["Arc length for parametric curves", "Surface area of revolution for parametric curves"]`
`API Integration Fields:`
`  {"uuid": "f9c0e4d1-6a8b-4f1e-a9d5-7b1d3c2e9f0a", "topic_hash": "DIFF_PARAM_INVTRIG_01", "adaptive_difficulty": "0.75"}`
`Tags: ["parametric differentiation", "inverse trigonometric functions", "arcsin", "equation of normal", "second derivative"]`
`---`

---
---

### Question 3: Differentiation and Maclaurin's Series

`---`
`Syllabus Reference: "9231/2.3 Differentiation", "9231/2.1 Hyperbolic Functions"`
`Learning Objective: "Differentiate inverse hyperbolic functions. Derive and use the first few terms of a Maclaurin's series for a function, including cases requiring implicit differentiation or a differential relation."`
`Difficulty Profile: {"part_a": "Medium", "part_b": "Hard"}`
`Cognitive Skills: ["Apply", "Synthesize", "Analyze"]`
`Time Estimate: "16"`
`Topic Weight: 10`
`Prerequisite Skills: ["Maclaurin's series definition", "Differentiation of inverse hyperbolic functions", "Product rule", "Leibniz's theorem (or equivalent repeated differentiation)"]`
`Cross_Topic_Links: ["Hyperbolic Functions", "Series Expansions"]`
`Example Question:`
`Let y = arsinh(x).`
`(a) Show that (1 + x²) (dy/dx)² = 1. [3]`
`(b) By differentiating the result from part (a) with respect to x, show that (1 + x²) (d²y/dx²) + x (dy/dx) = 0. [3]`
`(c) Hence, find the first three non-zero terms in the Maclaurin's series for arsinh(x). [5]`
`Mark Scheme:`
`part_a:`
`- M1: Differentiates y = arsinh(x) to get dy/dx = 1 / sqrt(1 + x²).`
`- M1: Squares both sides: (dy/dx)² = 1 / (1 + x²).`
`- A1: Rearranges to the given form: (1 + x²)(dy/dx)² = 1. (AG)`
`part_b:`
`- M1: Differentiates (1 + x²)(dy/dx)² = 1 implicitly with respect to x using the product rule.`
  `d/dx[(1+x²)] * (dy/dx)² + (1+x²) * d/dx[(dy/dx)²] = 0.`
`- A1: Correctly differentiates both parts of the product.`
  `2x(dy/dx)² + (1+x²) * [2(dy/dx) * (d²y/dx²)] = 0.`
`- A1: Divides the entire equation by 2(dy/dx) (which is non-zero for x near 0) to obtain the required result.`
  `x(dy/dx) + (1+x²)(d²y/dx²) = 0. (AG)`
`part_c:`
`- B1: Finds the values of the function and its first two derivatives at x=0.`
  `y(0) = arsinh(0) = 0.`
  `From (a), (dy/dx)²(0) = 1 => dy/dx(0) = 1 (since arsinh is increasing).`
  `From (b), (1)(d²y/dx²)(0) + 0(1) = 0 => d²y/dx²(0) = 0.`
`- M1: Differentiates the relation from (b) again to find the third derivative.`
  `[ (1)(dy/dx) + x(d²y/dx²) ] + [ (2x)(d²y/dx²) + (1+x²)(d³y/dx³) ] = 0.`
`- M1: Substitutes x=0 to find d³y/dx³(0).`
  `[1 + 0] + [0 + 1 * d³y/dx³(0)] = 0 => d³y/dx³(0) = -1.`
`- M1: Continues to find the next non-zero derivative (d⁵y/dx⁵). Differentiating again gives `
  `y''' + y''' + 2y''' + 6xy'''' + (1+x²)y''''' = 0 (using abbreviated notation)`
  `At x=0: y''''(0)=0. y'''''(0) + 3y'''(0) = 0? Wait, let's do it properly.`
  `Differentiating `(1+x²)y''' + 3xy'' + y' = 0` gives `2xy''' + (1+x²)y'''' + 3y'' + 3xy''' + y'' = 0`.`
  `At x=0: y''''(0) + 4y''(0) = 0 => y''''(0) = 0.`
  `Differentiating again: `(1+x²)y''''' + 2xy'''' + 5y''' + 5y''' + 5xy'''' + y''' = 0`.
  `At x=0: y'''''(0) + 10y'''(0) = 0 => y'''''(0) = -10(-1) = 10? No. Wait.`
  `Let's try Leibniz from (b). y⁽ⁿ⁺²⁾(1+x²) + n(2x)y⁽ⁿ⁺¹⁾ + n(n-1)/2(2)y⁽ⁿ⁾ + xy⁽ⁿ⁺¹⁾ + n(1)y⁽ⁿ⁾ = 0.`
  `At x=0: y⁽ⁿ⁺²⁾(0) + n(n-1)y⁽ⁿ⁾(0) + ny⁽ⁿ⁾(0) = 0 => y⁽ⁿ⁺²⁾(0) = -n²y⁽ⁿ⁾(0).`
  `y⁽⁴⁾(0) = -2²y⁽²⁾(0) = 0. y⁽⁵⁾(0) = -3²y⁽³⁾(0) = -9(-1) = 9.`
`- A1: Uses the Maclaurin formula y(x) = y(0) + y'(0)x + y''(0)x²/2! + ...`
  `arsinh(x) = 0 + (1)x + (0)x²/2! + (-1)x³/3! + (0)x⁴/4! + (9)x⁵/5! + ...`
  `= x - x³/6 + 9x⁵/120 = x - x³/6 + 3x⁵/40.`
`Standard Solution Steps:`
`part_a:`
`1. The standard derivative of y = arsinh(x) is dy/dx = 1 / sqrt(1 + x²).`
`2. Square both sides of this equation: (dy/dx)² = (1 / sqrt(1 + x²))² = 1 / (1 + x²).`
`3. Multiply both sides by (1 + x²) to clear the fraction, which gives the required result: (1 + x²)(dy/dx)² = 1.`
`part_b:`
`1. Differentiate the result from part (a) with respect to x. The left side requires the product rule.`
   `d/dx[(1 + x²)(dy/dx)²] = d/dx(1).`
   `[d/dx(1+x²)] * (dy/dx)² + (1+x²) * [d/dx((dy/dx)²)] = 0.`
`2. The derivative of (1+x²) is 2x. To differentiate (dy/dx)², use the chain rule: it becomes 2(dy/dx) * d/dx(dy/dx) = 2(dy/dx)(d²y/dx²).`
`3. Substitute these back into the equation:`
   `2x(dy/dx)² + (1+x²)[2(dy/dx)(d²y/dx²)] = 0.`
`4. Since dy/dx is not generally zero, we can divide the entire equation by 2(dy/dx) to simplify.`
   `x(dy/dx) + (1+x²)(d²y/dx²) = 0. This is the desired relationship.`
`part_c:`
`1. The Maclaurin series is f(x) = f(0) + f'(0)x + f''(0)x²/2! + ... We need the values of y and its derivatives at x=0.`
   `y(0) = arsinh(0) = 0.`
   `From (a), at x=0: (1+0)(dy/dx)² = 1 => dy/dx(0) = 1 (we take the positive root as arsinh(x) is an increasing function).`
   `From (b), at x=0: (1+0)(d²y/dx²)(0) + 0 * (dy/dx)(0) = 0 => d²y/dx²(0) = 0.`
`2. Since f''(0)=0, we need higher derivatives. Differentiate the relation from (b) using the product rule again.`
   `(1+x²)y'' + xy' = 0` (using y' notation).
   `Differentiating: [(2x)y'' + (1+x²)y'''] + [(1)y' + xy''] = 0.`
   `Combine terms: (1+x²)y''' + 3xy'' + y' = 0.`
`3. Evaluate at x=0: (1)y'''(0) + 0 + y'(0) = 0 => y'''(0) + 1 = 0 => y'''(0) = -1.`
`4. We need the next non-zero term. Differentiate again:`
   `[(2x)y''' + (1+x²)y''''] + [(3)y'' + 3xy'''] + [y''] = 0.`
   `At x=0: y''''(0) + 3y''(0) + y''(0) = 0 => y''''(0) + 4(0) = 0 => y''''(0) = 0.`
`5. Differentiate one more time:`
   `[(2)y''' + 2xy''''] + [(2x)y'''' + (1+x²)y'''''] + [(3)y''' + 3y''' + 3xy''''] + [y'''] = 0.`
   `At x=0: 2y'''(0) + y'''''(0) + 6y'''(0) + y'''(0) = 0 => y'''''(0) + 9y'''(0) = 0.`
   `y'''''(0) = -9 * (-1) = 9.`
`6. Substitute the values into the Maclaurin formula:`
   `y = 0 + (1)x + (0)x²/2! + (-1)x³/3! + (0)x⁴/4! + (9)x⁵/5! + ...`
`7. The first three non-zero terms are: y = x - x³/6 + 9x⁵/120 = x - x³/6 + 3x⁵/40.`
`Teaching Insights:`
`- This pattern of finding a differential relationship (like in part b) is a powerful technique for generating Maclaurin series terms without computing increasingly complex derivatives directly.`
`- The Leibniz theorem provides a general formula for the nth derivative of a product, `(uv)⁽ⁿ⁾`, which can formalize and simplify the process in part (c), leading to a recurrence relation for the derivatives at x=0: `y⁽ⁿ⁺²⁾(0) = -n²y⁽ⁿ⁾(0)`. This is a highly efficient method for advanced students.`
`- Stress the logic: a result is proved in (a), then used in (b), which is then used repeatedly in (c). This scaffolding is central to CAIE question design.`
`Error Analysis:`
`- In (a), sign error in the derivative of arsinh(x), confusing it with arcosh(x).`
`- In (b), errors in the product rule or the chain rule for the `(dy/dx)²` term.`
`- In (c), algebraic errors during the repeated differentiation. It is easy to miss a term or misapply the product rule multiple times.`
`- Forgetting the `n!` term in the denominator of the Maclaurin series formula.`
`- Making a mistake when evaluating the derivatives at x=0, which invalidates all subsequent terms.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Maclaurin's series definition", "Differentiation of inverse hyperbolic functions", "Product rule", "Implicit differentiation"]`
  `Next_Steps: ["Using series for approximations and calculating limits", "Maclaurin series for solutions to differential equations"]`
`API Integration Fields:`
`  {"uuid": "a7b3c8d1-4e2f-4c1a-8f5d-123abcde89f1", "topic_hash": "DIFF_MACLAURIN_HYP_01", "adaptive_difficulty": "0.85"}`
`Tags: ["maclaurin series", "inverse hyperbolic function", "arsinh", "differentiation", "leibniz theorem", "recurrence relation"]`
`---`