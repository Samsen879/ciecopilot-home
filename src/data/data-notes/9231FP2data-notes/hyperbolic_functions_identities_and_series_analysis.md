# CAIE 9231 Further Mathematics: Paper 2 Generation
## Topic: Hyperbolic Functions

---
---

### Question 1: Identities and Equations

`---`
`Syllabus Reference: "9231/2.1 Hyperbolic Functions"`
`Learning Objective: "Prove and use identities involving hyperbolic functions. Understand and use definitions of inverse hyperbolic functions and their logarithmic forms."`
`Difficulty Profile: {"part_a": "Easy", "part_b": "Medium"}`
`Cognitive Skills: ["Apply", "Analyze"]`
`Time Estimate: "12"`
`Topic Weight: 8`
`Prerequisite Skills: ["Exponential definitions of cosh/sinh", "Solving quadratic equations", "Logarithmic form of arcosh(x)", "Domain and Range of hyperbolic functions"]`
`Cross_Topic_Links: ["Algebra (Quadratics)"]`
`Example Question:`
`(a) Starting from the definitions of sinh x and cosh x in terms of exponential functions, prove that cosh(2x) ≡ 2cosh²(x) - 1. [3]`
`(b) Hence, solve the equation cosh(2x) - 5cosh(x) + 3 = 0, giving your answers in exact logarithmic form. [5]`
`Mark Scheme:`
`part_a:`
`- M1: Substitutes the exponential definitions into the RHS: RHS = 2((e^x + e^(-x))/2)² - 1.`
`- M1: Correctly expands the squared term and simplifies: = 2((e^(2x) + 2e^x e^(-x) + e^(-2x))/4) - 1 = (e^(2x) + 2 + e^(-2x))/2 - 1.`
`- A1: Completes the proof by simplifying to the definition of cosh(2x): = (e^(2x) + e^(-2x))/2 = cosh(2x) = LHS. (AG)`
`part_b:`
`- M1: Substitutes the identity from part (a) into the equation: (2cosh²(x) - 1) - 5cosh(x) + 3 = 0.`
`- A1: Obtains the correct quadratic equation in cosh(x): 2cosh²(x) - 5cosh(x) + 2 = 0.`
`- M1: Solves the quadratic equation for cosh(x), e.g., by factoring: (2cosh(x) - 1)(cosh(x) - 2) = 0.`
`- A1: Finds the valid solution for cosh(x), rejecting the other: cosh(x) = 2. Rejects cosh(x) = 1/2 since cosh(x) ≥ 1 for real x.`
`- M1: Uses the logarithmic form for the inverse hyperbolic function: x = ±arcosh(2) = ±ln(2 + sqrt(2² - 1)).`
`- A1: States the final exact answers: x = ±ln(2 + sqrt(3)).`
`Standard Solution Steps:`
`part_a:`
`The goal is to prove the identity by starting with one side and manipulating it to get the other. We start with the more complex Right-Hand Side (RHS).`
`1. Substitute the exponential definition of cosh(x) = (e^x + e^(-x))/2 into the RHS expression: RHS = 2(cosh(x))² - 1 = 2((e^x + e^(-x))/2)² - 1.`
`2. Expand the squared term: (e^x + e^(-x))² = (e^x)² + 2(e^x)(e^(-x)) + (e^(-x))² = e^(2x) + 2 + e^(-2x).`
`3. Substitute this back into the expression and simplify: RHS = 2 * (e^(2x) + 2 + e^(-2x))/4 - 1 = (e^(2x) + 2 + e^(-2x))/2 - 1.`
`4. Combine terms: RHS = (e^(2x) + e^(-2x))/2 + 2/2 - 1 = (e^(2x) + e^(-2x))/2 + 1 - 1 = (e^(2x) + e^(-2x))/2.`
`5. Recognise this as the definition of cosh(2x), which is the Left-Hand Side (LHS). The identity is proven.`
`part_b:`
`1. Use the identity proven in part (a) to substitute for cosh(2x) in the given equation. This transforms the equation from one with mixed arguments (2x and x) to one with a single argument (x).`
   `Equation becomes: (2cosh²(x) - 1) - 5cosh(x) + 3 = 0.`
`2. Simplify the expression to form a standard quadratic equation in terms of cosh(x): 2cosh²(x) - 5cosh(x) + 2 = 0.`
`3. Solve this quadratic equation for cosh(x). Let u = cosh(x). The equation is 2u² - 5u + 2 = 0. This can be factored as (2u - 1)(u - 2) = 0.`
`4. The potential solutions are cosh(x) = 1/2 and cosh(x) = 2.`
`5. Analyze the validity of these solutions. The range of cosh(x) for real x is [1, ∞). Therefore, cosh(x) = 1/2 has no real solutions. We proceed with cosh(x) = 2.`
`6. To find x, we take the inverse hyperbolic cosine: x = arcosh(2). Since cosh(x) is an even function, the solutions will be symmetric about the y-axis, i.e., x = ±arcosh(2).`
`7. Use the standard logarithmic formula for arcosh(u) = ln(u + sqrt(u² - 1)):`
   `x = ±ln(2 + sqrt(2² - 1)) = ±ln(2 + sqrt(3)). These are the final, exact solutions.`
`Teaching Insights:`
`- Emphasise the parallels between hyperbolic and trigonometric identities, but stress the key differences in signs (e.g., cosh² - sinh² = 1).`
`- When proving identities from definitions, advise students to start with the more complicated side as it is usually easier to simplify than to expand.`
`- Remind students to always check the validity of solutions for hyperbolic equations, particularly the constraint cosh(x) ≥ 1 and |tanh(x)| < 1.`
`- The logarithmic forms of inverse hyperbolic functions are given in the formula book (MF19), but students must know when and how to apply them to find exact answers.`
`Error Analysis:`
`- Common algebraic mistakes when expanding (e^x + e^(-x))², often forgetting the middle term of +2.`
`- Forgetting to check solutions against the range of cosh(x) and incorrectly trying to find arcosh(0.5).`
`- Errors in applying the logarithmic formula for arcosh(x), such as misplacing brackets or calculation errors under the square root.`
`- Only providing the positive solution for x, forgetting that cosh(x) is an even function, so if x is a solution, so is -x.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Exponential definitions of cosh/sinh", "Solving quadratic equations"]`
`  Next_Steps: ["Solving more complex hyperbolic equations involving multiple identities", "Proving identities for sinh(3x) or tanh(A+B)"]`
`API Integration Fields:`
`  {"uuid": "993f4e1f-1b54-4f9e-8c34-786d5c5f87a0", "topic_hash": "HYPEQID_01", "adaptive_difficulty": "0.45"}`
`Tags: ["hyperbolic identity", "hyperbolic equation", "quadratic form", "logarithmic form", "arcosh"]`
`---`

---
---

### Question 2: Differentiation and Series

`---`
`Syllabus Reference: "9231/2.1 Hyperbolic Functions", "9231/2.3 Differentiation"`
`Learning Objective: "Differentiate inverse hyperbolic functions. Derive and use the first few terms of a Maclaurin's series for a function."`
`Difficulty Profile: {"part_a": "Medium", "part_b": "Hard"}`
`Cognitive Skills: ["Apply", "Synthesize"]`
`Time Estimate: "13"`
`Topic Weight: 8`
`Prerequisite Skills: ["Chain rule", "Derivatives of trigonometric and inverse hyperbolic functions", "Definition of Maclaurin's series", "Binomial expansion of (1-u)^-1", "Integration of series"]`
`Cross_Topic_Links: ["Differentiation (Maclaurin's Series)", "Trigonometry", "Integration"]`
`Example Question:`
`The curve C has equation y = tanh⁻¹(sin x) for 0 ≤ x < π/2.`
`(a) Show that dy/dx = sec x. [3]`
`(b) Find the first three non-zero terms in the Maclaurin's series for y. [5]`
`Mark Scheme:`
`part_a:`
`- M1: Correctly applies the chain rule structure. Let u = sin x, then y = tanh⁻¹(u). dy/dx = dy/du * du/dx. States du/dx = cos x and dy/du = 1/(1 - u²).`
`- A1: Substitutes correctly into the chain rule: dy/dx = (1 / (1 - sin²x)) * cos x.`
`- A1: Uses the identity sin²x + cos²x = 1 to simplify the denominator and reaches the given answer: = (1 / cos²x) * cos x = sec x. (AG)`
`part_b:`
`- M1: Recognises that to find the series for y, one can integrate the series for dy/dx = sec x. Writes the series for cos x: 1 - x²/2! + x⁴/4! - ...`
`- M1: Finds the series for sec x = (cos x)⁻¹ = (1 - x²/2 + x⁴/24 - ...)⁻¹ and uses the binomial expansion (1 - u)⁻¹ ≈ 1 + u + u²: = 1 + (x²/2 - x⁴/24) + (x²/2)² + ...`
`- A1: Correctly collects terms to find the series for sec x: = 1 + x²/2 + ( -1/24 + 1/4 )x⁴ + ... = 1 + x²/2 + 5x⁴/24 + ...`
`- M1: Integrates the series for sec x term by term: y = ∫(1 + x²/2 + 5x⁴/24 + ...)dx = C + x + x³/6 + x⁵/24 + ...`
`- A1: Uses the initial condition y(0) = tanh⁻¹(sin 0) = 0 to find C = 0. States the first three non-zero terms: y = x + x³/6 + x⁵/24.`
`Standard Solution Steps:`
`part_a:`
`1. The function is a composition, so we use the chain rule. Let y = f(g(x)) where f(u) = tanh⁻¹(u) and g(x) = sin x.`
`2. Find the derivatives of the individual functions: g'(x) = cos x and f'(u) = 1/(1 - u²).`
`3. Apply the chain rule formula dy/dx = f'(g(x)) * g'(x): dy/dx = 1/(1 - (sin x)²) * cos x.`
`4. Use the fundamental trigonometric identity sin²x + cos²x = 1 to replace 1 - sin²x with cos²x.`
`5. The expression becomes dy/dx = (1/cos²x) * cos x.`
`6. Simplify by cancelling cos x to get dy/dx = 1/cos x, which is the definition of sec x. The result is shown.`
`part_b:`
`1. Finding the Maclaurin series by repeatedly differentiating y is complex. A more efficient method is to find the series for dy/dx and then integrate it.`
`2. From (a), dy/dx = sec x. We need the series for sec x. Recall the series for cos x = 1 - x²/2! + x⁴/4! - ...`
`3. Write sec x as (cos x)⁻¹ = (1 - x²/2 + x⁴/24 - ...)⁻¹.`
`4. This is of the form (1 - u)⁻¹ where u = x²/2 - x⁴/24 + ... The binomial expansion for (1-u)⁻¹ is 1 + u + u² + ...`
`5. Substitute for u: sec x ≈ 1 + (x²/2 - x⁴/24) + (x²/2)². We only need terms up to x⁴ to get an x⁵ term upon integration.`
`6. Expand and collect terms: sec x ≈ 1 + x²/2 + (-1/24 + 1/4)x⁴ = 1 + x²/2 + 5x⁴/24.`
`7. Now, integrate this series to find the series for y: y = ∫(1 + x²/2 + 5x⁴/24) dx = C + x + (x³/3)/2 + (x⁵/5)/(24) = C + x + x³/6 + x⁵/120. (Error in manual calc, let's re-do)`
`y = ∫(1 + x²/2 + 5x⁴/24 + ...) dx = C + x + x³/(2*3) + 5x⁵/(24*5) + ... = C + x + x³/6 + x⁵/24 + ...` Correct.
`8. Determine the constant of integration, C, by using the value of y at x=0. y(0) = tanh⁻¹(sin 0) = tanh⁻¹(0) = 0.`
`9. Substituting into the series: 0 = C + 0 + 0 + 0, so C = 0.`
`10. The first three non-zero terms are y = x + x³/6 + x⁵/24.`
`Teaching Insights:`
`- This question demonstrates the interconnectedness of the syllabus. A hyperbolic function question evolves into trigonometry, differentiation, series expansions, and integration.`
`- Highlight alternative methods for finding Maclaurin series. Direct differentiation is often laborious. Using known series (like for cos x) and algebraic manipulation (like binomial expansion) or integrating/differentiating a known series is a key technique.`
`- Students must be fluent with the binomial expansion for negative/rational powers, especially (1+x)^n.`
`Error Analysis:`
`- In (a), sign error in the derivative of tanh⁻¹(u), writing -1/(1-u²).`
`- In (b), attempting to find the series by repeated differentiation of y = tanh⁻¹(sin x) can lead to very complex derivatives and algebraic errors.`
`- Errors in the binomial expansion of (1 - u)⁻¹, such as incorrect signs or forgetting to square the u term for the third term of the expansion.`
`- Forgetting the constant of integration C, or assuming it is zero without justification.`
`- Arithmetic errors when integrating term-by-term.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Chain rule", "Maclaurin's series definition", "Series for cos(x)", "Binomial expansion"]`
`  Next_Steps: ["Maclaurin series by solving differential equations", "Limits using series expansions"]`
`API Integration Fields:`
`  {"uuid": "a4d3b8c1-6b2f-4e1a-9f5d-123abcde89f1", "topic_hash": "HYPDIFF_01", "adaptive_difficulty": "0.70"}`
`Tags: ["inverse hyperbolic function", "differentiation", "maclaurin series", "chain rule", "secant", "integration of series"]`
`---`

---
---

### Question 3: Calculus Applications

`---`
`Syllabus Reference: "9231/2.1 Hyperbolic Functions", "9231/2.4 Integration"`
`Learning Objective: "Use integration to find arc lengths and surface areas of revolution for curves with equations in Cartesian coordinates."`
`Difficulty Profile: {"part_a": "Medium", "part_b": "Hard"}`
`Cognitive Skills: ["Apply", "Integrate"]`
`Time Estimate: "15"`
`Topic Weight: 10`
`Prerequisite Skills: ["Formulae for arc length and surface area", "Differentiation and integration of cosh(x)", "Hyperbolic identities (cosh²u - sinh²u = 1, cosh²u in terms of cosh(2u))"]`
`Cross_Topic_Links: ["Integration (Applications)"]`
`Example Question:`
`The curve C has equation y = 2 cosh(x/2) for 0 ≤ x ≤ 2.`
`(a) Show that the length of the arc C is 2 sinh(1). [4]`
`(b) The region bounded by the curve C, the x-axis, the y-axis, and the line x = 2 is rotated through 2π radians about the x-axis. Find the exact surface area generated. [6]`
`Mark Scheme:`
`part_a:`
`- B1: Correctly differentiates y: dy/dx = 2 * (1/2) * sinh(x/2) = sinh(x/2).`
`- M1: Substitutes into the correct arc length formula: s = ∫[0,2] sqrt(1 + (dy/dx)²) dx = ∫[0,2] sqrt(1 + sinh²(x/2)) dx.`
`- A1: Uses the identity cosh²(u) - sinh²(u) = 1 to simplify the integrand: = ∫[0,2] sqrt(cosh²(x/2)) dx = ∫[0,2] cosh(x/2) dx.`
`- A1: Integrates correctly and evaluates the definite integral: = [2 sinh(x/2)] from 0 to 2 = 2 sinh(1) - 2 sinh(0) = 2 sinh(1). (AG)`
`part_b:`
`- M1: States the correct formula for the area of a surface of revolution: S = 2π ∫[0,2] y * sqrt(1 + (dy/dx)²) dx.`
`- A1: Makes correct substitutions from part (a) into the formula: S = 2π ∫[0,2] (2 cosh(x/2)) * (cosh(x/2)) dx = 4π ∫[0,2] cosh²(x/2) dx.`
`- M1: Uses the correct identity to handle the squared hyperbolic function: cosh²(u) = (cosh(2u) + 1)/2, so cosh²(x/2) = (cosh(x) + 1)/2.`
`- M1: Substitutes the identity and simplifies the integral: S = 4π ∫[0,2] (cosh(x) + 1)/2 dx = 2π ∫[0,2] (cosh(x) + 1) dx.`
`- A1: Performs the integration correctly: = 2π [sinh(x) + x] from 0 to 2.`
`- A1: Evaluates the definite integral to find the exact final answer: = 2π [(sinh(2) + 2) - (sinh(0) + 0)] = 2π(sinh(2) + 2).`
`Standard Solution Steps:`
`part_a:`
`1. The formula for arc length is s = ∫ sqrt(1 + (dy/dx)²) dx.`
`2. First, find dy/dx. For y = 2 cosh(x/2), using the chain rule gives dy/dx = 2 * sinh(x/2) * (1/2) = sinh(x/2).`
`3. Substitute this into the arc length formula: s = ∫[0,2] sqrt(1 + sinh²(x/2)) dx.`
`4. Apply the hyperbolic identity cosh²(u) - sinh²(u) = 1, which rearranges to 1 + sinh²(u) = cosh²(u). Here u = x/2.`
`5. The integrand simplifies: sqrt(cosh²(x/2)) = cosh(x/2) (since cosh is always positive).`
`6. The integral becomes s = ∫[0,2] cosh(x/2) dx.`
`7. Integrate with respect to x: [2 sinh(x/2)] between the limits 0 and 2.`
`8. Evaluate at the limits: 2 sinh(2/2) - 2 sinh(0/2) = 2 sinh(1) - 0 = 2 sinh(1). The result is shown.`
`part_b:`
`1. The formula for the surface area of revolution about the x-axis is S = 2π ∫ y * sqrt(1 + (dy/dx)²) dx.`
`2. We already found y = 2 cosh(x/2) and sqrt(1 + (dy/dx)²) = cosh(x/2) from part (a).`
`3. Substitute these into the formula: S = 2π ∫[0,2] (2 cosh(x/2)) * (cosh(x/2)) dx = 4π ∫[0,2] cosh²(x/2) dx.`
`4. To integrate cosh²(x/2), we must use a hyperbolic identity to reduce the power. Use cosh(2u) = 2cosh²(u) - 1, which gives cosh²(u) = (cosh(2u) + 1)/2. For u=x/2, this is cosh²(x/2) = (cosh(x) + 1)/2.`
`5. The integral becomes S = 4π ∫[0,2] (cosh(x) + 1)/2 dx = 2π ∫[0,2] (cosh(x) + 1) dx.`
`6. Perform the integration: S = 2π [sinh(x) + x] with limits from 0 to 2.`
`7. Evaluate at the limits: S = 2π [(sinh(2) + 2) - (sinh(0) + 0)].`
`8. The final exact answer is S = 2π(sinh(2) + 2).`
`Teaching Insights:`
`- The expression sqrt(1 + (dy/dx)²) for catenary-type curves y = a cosh(x/a) simplifies very neatly. This is a classic, and students should be encouraged to recognize this pattern.`
`- The integration of squared trig/hyperbolic functions is a core skill. Students must be fluent in using the double angle/argument identities to reduce the power.`
`- Stress the importance of keeping track of constants like '2π' and coefficients throughout the multi-step calculation.`
`Error Analysis:`
`- Errors in the initial differentiation of y, such as forgetting the chain rule factor of 1/2.`
`- Incorrectly simplifying sqrt(1 + sinh²(x/2)) to sinh(x/2) or 1 + sinh(x/2).`
`- Using the wrong identity for cosh²(u), e.g., mixing it up with the one for sinh²(u) or a trigonometric identity.`
`- Mistakes when integrating cosh(x/2) or cosh(x), especially with the coefficient.`
`- Calculation errors when substituting the limits of integration.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Arc length formula", "Surface area of revolution formula", "Differentiation of cosh", "Hyperbolic identities"]`
`  Next_Steps: ["Arc length in polar coordinates", "Surface area for parametric curves", "Integration leading to inverse hyperbolic functions"]`
`API Integration Fields:`
`  {"uuid": "b8e1c5a2-7d3f-4a0b-9c2e-f1a9b4c0d6f2", "topic_hash": "HYPCALC_01", "adaptive_difficulty": "0.65"}`
`Tags: ["arc length", "surface area of revolution", "catenary", "cosh", "hyperbolic calculus", "definite integral"]`
`---`