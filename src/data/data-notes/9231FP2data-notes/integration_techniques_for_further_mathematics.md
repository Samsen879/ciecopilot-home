# CAIE 9231 Further Mathematics: Paper 2 Generation
## Topic: Integration

---
---

### Question 1: Reduction Formulae

`---`
`Syllabus Reference: "9231/2.4 Integration"`
`Learning Objective: "Derive and use reduction formulae for definite integrals."`
`Difficulty Profile: {"part_a": "Hard", "part_b": "Medium"}`
`Cognitive Skills: ["Synthesize", "Apply", "Analyze"]`
`Time Estimate: "14"`
`Topic Weight: 9`
`Prerequisite Skills: ["Integration by parts", "Trigonometric identities (sin²x = 1 - cos²x)", "Properties of definite integrals", "Iterative processes"]`
`Cross_Topic_Links: ["Trigonometry"]`
`Example Question:`
`Let $I_n = \int_0^{\pi/2} \sin^n x \, dx$ for integer $n \ge 0$.`
`(a) By considering $\int_0^{\pi/2} \sin^{n-1} x \sin x \, dx$, show that for $n \ge 2$,`
`$$ nI_n = (n-1)I_{n-2} $$ [6]`
`(b) Hence find the exact value of $\int_0^{\pi/2} \sin^5 x \, dx$. [3]`
`Mark Scheme:`
`part_a:`
`- M1: Correctly sets up integration by parts. Let $u = \sin^{n-1} x$ and $dv/dx = \sin x$.`
`- A1: Correctly finds $du/dx = (n-1)\sin^{n-2} x \cos x$ and $v = -\cos x$.`
`- M1: Applies the integration by parts formula: $I_n = [-\cos x \sin^{n-1} x]_0^{\pi/2} - \int_0^{\pi/2} (-\cos x)(n-1)\sin^{n-2} x \cos x \, dx$.`
`- A1: Evaluates the boundary term $[-\cos x \sin^{n-1} x]_0^{\pi/2}$. At $x=\pi/2$, $\cos(\pi/2)=0$. At $x=0$, $\sin(0)=0$. So the term is 0. (For $n \ge 2$).`
`- M1: Simplifies the integral term: $I_n = (n-1) \int_0^{\pi/2} \cos^2 x \sin^{n-2} x \, dx$. Uses the identity $\cos^2 x = 1 - \sin^2 x$.`
  `$I_n = (n-1) \int_0^{\pi/2} (1-\sin^2 x)\sin^{n-2} x \, dx = (n-1) (\int_0^{\pi/2} \sin^{n-2} x \, dx - \int_0^{\pi/2} \sin^n x \, dx)$.`
`- A1: Expresses the equation in terms of $I_n$ and $I_{n-2}$ and rearranges to the final form. $I_n = (n-1)(I_{n-2} - I_n) \implies I_n = (n-1)I_{n-2} - (n-1)I_n \implies I_n(1 + n - 1) = (n-1)I_{n-2} \implies nI_n = (n-1)I_{n-2}$. (AG)`
`part_b:`
`- M1: Applies the reduction formula iteratively starting from $I_5$.`
  `$5I_5 = 4I_3 \implies I_5 = \frac{4}{5}I_3$.`
  `$3I_3 = 2I_1 \implies I_3 = \frac{2}{3}I_1$.`
`- M1: Calculates the base case $I_1$.`
  `$I_1 = \int_0^{\pi/2} \sin x \, dx = [-\cos x]_0^{\pi/2} = (-\cos(\pi/2)) - (-\cos(0)) = 0 - (-1) = 1$.`
`- A1: Substitutes back to find the final exact value.`
  `$I_5 = \frac{4}{5} \times \frac{2}{3} \times I_1 = \frac{4}{5} \times \frac{2}{3} \times 1 = \frac{8}{15}$.`
`Standard Solution Steps:`
`part_a:`
`1. The core task is to apply integration by parts to $I_n = \int \sin^{n-1} x \sin x \, dx$.`
`2. Choose the parts for the formula $\int u \frac{dv}{dx} dx = uv - \int v \frac{du}{dx} dx$.`
   `Let $u = \sin^{n-1} x \implies \frac{du}{dx} = (n-1)\sin^{n-2} x \cos x$ (using the chain rule).`
   `Let $\frac{dv}{dx} = \sin x \implies v = -\cos x$.`
`3. Substitute these into the formula with the limits $[0, \pi/2]$:`
   `$I_n = [-\cos x \sin^{n-1} x]_0^{\pi/2} - \int_0^{\pi/2} (-\cos x)((n-1)\sin^{n-2} x \cos x) \, dx$.`
`4. Evaluate the first term at the limits. At the upper limit $x=\pi/2$, $\cos(\pi/2) = 0$. At the lower limit $x=0$, $\sin(0) = 0$. Since $n \ge 2$, the term $\sin^{n-1}(0)$ is well-defined and equals 0. Thus, the entire boundary term evaluates to $0 - 0 = 0$.`
`5. Simplify the integral term:`
   `$I_n = (n-1) \int_0^{\pi/2} \cos^2 x \sin^{n-2} x \, dx$.`
`6. To get back to integrals involving only powers of `sin x`, use the identity $\cos^2 x = 1 - \sin^2 x$.`
   `$I_n = (n-1) \int_0^{\pi/2} (1 - \sin^2 x) \sin^{n-2} x \, dx$.`
`7. Split the integral into two parts:`
   `$I_n = (n-1) \left( \int_0^{\pi/2} \sin^{n-2} x \, dx - \int_0^{\pi/2} \sin^n x \, dx \right)$.`
`8. Recognize that these integrals are $I_{n-2}$ and $I_n$ respectively.`
   `$I_n = (n-1)(I_{n-2} - I_n)$.`
`9. Rearrange the equation to make $I_n$ the subject:`
   `$I_n = (n-1)I_{n-2} - (n-1)I_n$`
   `$I_n + (n-1)I_n = (n-1)I_{n-2}$`
   `$nI_n = (n-1)I_{n-2}$. The result is shown.`
`part_b:`
`1. We need to find $I_5$. Apply the reduction formula repeatedly.`
   `For n=5: $5I_5 = (5-1)I_{5-2} = 4I_3 \implies I_5 = \frac{4}{5}I_3$.`
   `For n=3: $3I_3 = (3-1)I_{3-2} = 2I_1 \implies I_3 = \frac{2}{3}I_1$.`
`2. The recursion stops at $I_1$, which we must calculate directly.`
   `$I_1 = \int_0^{\pi/2} \sin^1 x \, dx = [-\cos x]_0^{\pi/2} = (-\cos(\pi/2)) - (-\cos(0)) = 0 - (-1) = 1$.`
`3. Substitute the values back up the chain:`
   `$I_3 = \frac{2}{3} \times 1 = \frac{2}{3}$.`
   `$I_5 = \frac{4}{5} \times I_3 = \frac{4}{5} \times \frac{2}{3} = \frac{8}{15}$.`
`Teaching Insights:`
`- The key to deriving reduction formulae is a clever choice of `u` and `dv` for integration by parts, usually splitting the power `n` into `n-1` and `1`.`
`- Students must be confident in using trigonometric identities to manipulate the resulting integral back into the form of the original `I_n` expression.`
`- Emphasize the importance of the base case (e.g., $I_0$ or $I_1$) which must be calculated directly to terminate the recursion.`
`- This particular result is part of a famous set of integrals known as Wallis's integrals.`
`Error Analysis:`
`- Incorrect application of the chain rule when differentiating $\sin^{n-1} x$.`
`- Sign errors during the integration by parts, especially with the negative sign from integrating $\sin x$ and the minus sign in the formula itself.`
`- Errors in algebraic rearrangement, especially when expanding $(n-1)(I_{n-2} - I_n)$.`
`- In part (b), calculating the wrong base case (e.g., finding $I_0$ instead of $I_1$) or making arithmetic errors during the substitution.`
`- Mishandling the limits of integration, especially forgetting that $\cos(0)=1$, not 0.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Integration by parts", "Trigonometric identities"]`
`  Next_Steps: ["Reduction formulae for other functions (e.g., $\int x^n e^x dx$)", "Using reduction formulae to find general formulae for $I_n$ (Wallis's Product)"]`
`API Integration Fields:`
`  {"uuid": "f1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d", "topic_hash": "INT_REDFORM_01", "adaptive_difficulty": "0.75"}`
`Tags: ["reduction formula", "integration by parts", "definite integral", "trigonometry", "wallis integrals"]`
`---`

---
---

### Question 2: Hyperbolic and Trigonometric Substitutions

`---`
`Syllabus Reference: "9231/2.4 Integration"`
`Learning Objective: "Integrate functions of the form $1/\sqrt{x^2+a^2}$ by using the substitution $x=a \sinh u$ or $x=a \tan u$."`
`Difficulty Profile: {"part_a": "Medium"}`
`Cognitive Skills: ["Apply", "Analyze"]`
`Time Estimate: "10"`
`Topic Weight: 7`
`Prerequisite Skills: ["Hyperbolic identities (sinh²u + 1 = cosh²u)", "Differentiation of hyperbolic functions", "Changing limits of integration for definite integrals", "Logarithmic form of arsinh(x)"]`
`Cross_Topic_Links: ["Hyperbolic Functions"]`
`Example Question:`
`Use the substitution $x = 2\sinh u$ to find the exact value of`
`$$ \int_0^{2\sqrt{3}} \frac{1}{\sqrt{x^2+4}} \, dx $$`
`Give your answer in a single logarithmic term. [7]`
`Mark Scheme:`
`- M1: Correctly performs the substitution for $x$ and finds $dx$. $x=2\sinh u \implies dx = 2\cosh u \, du$.`
`- A1: Correctly substitutes into the integrand's denominator: $\sqrt{(2\sinh u)^2 + 4} = \sqrt{4\sinh^2 u + 4} = \sqrt{4(\sinh^2 u + 1)}$.`
`- M1: Uses the identity $\sinh^2 u + 1 = \cosh^2 u$ to simplify the expression to $\sqrt{4\cosh^2 u} = 2\cosh u$.`
`- M1: Correctly changes the limits of integration. `
  `When $x=0$, $0 = 2\sinh u \implies u=0$.`
  `When $x=2\sqrt{3}$, $2\sqrt{3} = 2\sinh u \implies \sinh u = \sqrt{3} \implies u = \text{arsinh}(\sqrt{3})$.`
`- A1: The integral transforms correctly to $\int_0^{\text{arsinh}(\sqrt{3})} \frac{1}{2\cosh u} (2\cosh u \, du) = \int_0^{\text{arsinh}(\sqrt{3})} 1 \, du$.`
`- M1: Integrates the simplified expression: $[u]_0^{\text{arsinh}(\sqrt{3})} = \text{arsinh}(\sqrt{3}) - 0$.`
`- A1: Uses the logarithmic form for the inverse hyperbolic sine, $\text{arsinh}(y) = \ln(y + \sqrt{y^2+1})$, to find the final exact answer.`
  `$\ln(\sqrt{3} + \sqrt{(\sqrt{3})^2+1}) = \ln(\sqrt{3} + \sqrt{3+1}) = \ln(\sqrt{3} + 2)$.`
`Standard Solution Steps:`
`1. The substitution is given: $x = 2\sinh u$. First, find the differential element $dx$.`
   `$\frac{dx}{du} = 2\cosh u \implies dx = 2\cosh u \, du$.`
`2. Transform the integrand. Substitute $x=2\sinh u$ into the denominator:`
   `$\sqrt{x^2+4} = \sqrt{(2\sinh u)^2 + 4} = \sqrt{4\sinh^2 u + 4}$.`
`3. Factor out the 4 and use the hyperbolic identity $\sinh^2 u + 1 = \cosh^2 u$.`
   `$\sqrt{4(\sinh^2 u + 1)} = \sqrt{4\cosh^2 u} = 2\cosh u$ (since $\cosh u$ is always positive).`
`4. Transform the limits of integration from $x$-values to $u$-values.`
   `Lower limit: When $x=0$, $0 = 2\sinh u \implies \sinh u = 0 \implies u=0$.`
   `Upper limit: When $x=2\sqrt{3}$, $2\sqrt{3} = 2\sinh u \implies \sinh u = \sqrt{3}$. The corresponding value of $u$ is $\text{arsinh}(\sqrt{3})$.`
`5. Assemble the new definite integral in terms of $u$.`
   `$\int_0^{2\sqrt{3}} \frac{1}{\sqrt{x^2+4}} \, dx = \int_0^{\text{arsinh}(\sqrt{3})} \frac{1}{2\cosh u} \cdot (2\cosh u \, du)$.`
`6. The integrand simplifies beautifully to 1.`
   `$\int_0^{\text{arsinh}(\sqrt{3})} 1 \, du$.`
`7. Perform the simple integration.`
   `$[u]_0^{\text{arsinh}(\sqrt{3})} = \text{arsinh}(\sqrt{3}) - 0 = \text{arsinh}(\sqrt{3})$.`
`8. The question asks for the answer as a logarithm. Use the formula $\text{arsinh}(y) = \ln(y + \sqrt{y^2+1})$.`
   `$\text{arsinh}(\sqrt{3}) = \ln(\sqrt{3} + \sqrt{(\sqrt{3})^2+1}) = \ln(\sqrt{3} + \sqrt{4}) = \ln(2 + \sqrt{3})$.`
`Teaching Insights:`
`- This type of substitution is specifically designed to simplify expressions of the form $\sqrt{x^2+a^2}$, $\sqrt{x^2-a^2}$, or $\sqrt{a^2-x^2}$ by leveraging hyperbolic and trigonometric identities.`
`- For $\sqrt{x^2+a^2}$, use $x=a\sinh u$. For $\sqrt{x^2-a^2}$, use $x=a\cosh u$. For $\sqrt{a^2-x^2}$, use $x=a\sin\theta$. This pattern should be memorized.`
`- Emphasize that for definite integrals, changing the limits is often more efficient than substituting back to the original variable $x$.`
`- Students must know the logarithmic forms of the inverse hyperbolic functions, which are provided in the formula book (MF19), to give exact answers.`
`Error Analysis:`
`- Forgetting to substitute for $dx$ as well as for $x$.`
`- Errors in changing the limits of integration.`
`- Algebraic errors when simplifying the expression under the square root.`
`- After integrating to get $\text{arsinh}(\sqrt{3})$, leaving the answer in this form instead of converting to the requested logarithmic form.`
`- Errors in applying the logarithmic formula, e.g., calculating $\sqrt{y^2-1}$ instead of $\sqrt{y^2+1}$ for arsinh.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Hyperbolic identities", "Differentiation of hyperbolic functions", "Definite integration", "Changing integration limits"]`
`  Next_Steps: ["Integrals requiring trigonometric substitution (e.g., $x=a\sin\theta$)", "Integrals leading to inverse hyperbolic functions without explicit substitution"]`
`API Integration Fields:`
`  {"uuid": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d", "topic_hash": "INT_HYPSUB_01", "adaptive_difficulty": "0.60"}`
`Tags: ["integration by substitution", "hyperbolic substitution", "definite integral", "arsinh", "logarithmic form"]`
`---`

---
---

### Question 3: Applications of Integration (Arc Length)

`---`
`Syllabus Reference: "9231/2.4 Integration"`
`Learning Objective: "Calculate arc lengths of curves with equations in Cartesian coordinates."`
`Difficulty Profile: {"part_a": "Medium", "part_b": "Medium"}`
`Cognitive Skills: ["Apply", "Integrate", "Analyze"]`
`Time Estimate: "15"`
`Topic Weight: 8`
`Prerequisite Skills: ["Arc length formula (Cartesian)", "Differentiation of polynomial functions (including negative powers)", "Algebraic manipulation (expanding and factorizing quadratics)", "Definite integration"]`
`Cross_Topic_Links: ["Differentiation"]`
`Example Question:`
`The curve $C$ has equation $y = \frac{x^3}{12} + \frac{1}{x}$ for $1 \le x \le 3$.`
`(a) Show that $1 + \left(\frac{dy}{dx}\right)^2 = \left(\frac{x^2}{4} + \frac{1}{x^2}\right)^2$. [4]`
`(b) Find the exact length of the arc of $C$ between the points with $x$-coordinates 1 and 3. [4]`
`Mark Scheme:`
`part_a:`
`- M1: Differentiates y with respect to x. $y = \frac{1}{12}x^3 + x^{-1} \implies \frac{dy}{dx} = \frac{3x^2}{12} - x^{-2} = \frac{x^2}{4} - \frac{1}{x^2}$.`
`- M1: Squares the expression for $\frac{dy}{dx}$.`
  `$\left(\frac{dy}{dx}\right)^2 = \left(\frac{x^2}{4} - \frac{1}{x^2}\right)^2 = \left(\frac{x^2}{4}\right)^2 - 2\left(\frac{x^2}{4}\right)\left(\frac{1}{x^2}\right) + \left(\frac{1}{x^2}\right)^2 = \frac{x^4}{16} - \frac{1}{2} + \frac{1}{x^4}$.`
`- M1: Adds 1 to the result.`
  `$1 + \left(\frac{dy}{dx}\right)^2 = \frac{x^4}{16} - \frac{1}{2} + 1 + \frac{1}{x^4} = \frac{x^4}{16} + \frac{1}{2} + \frac{1}{x^4}$.`
`- A1: Factorizes the expression to show it is the required perfect square.`
  `This is the expansion of $\left(\frac{x^2}{4} + \frac{1}{x^2}\right)^2$. (AG)`
`part_b:`
`- M1: States the correct formula for arc length, $s = \int_a^b \sqrt{1 + (\frac{dy}{dx})^2} \, dx$.`
`- A1: Makes the substitution from part (a): $s = \int_1^3 \sqrt{\left(\frac{x^2}{4} + \frac{1}{x^2}\right)^2} \, dx = \int_1^3 \left(\frac{x^2}{4} + \frac{1}{x^2}\right) \, dx$.`
`- M1: Performs the integration: $s = \left[\frac{x^3}{12} - \frac{1}{x}\right]_1^3$.`
`- A1: Evaluates the definite integral to find the exact final answer.`
  `$s = \left(\frac{3^3}{12} - \frac{1}{3}\right) - \left(\frac{1^3}{12} - \frac{1}{1}\right) = \left(\frac{27}{12} - \frac{1}{3}\right) - \left(\frac{1}{12} - 1\right) = \left(\frac{9}{4} - \frac{1}{3}\right) - \left(-\frac{11}{12}\right)$.`
  `$= \left(\frac{27-4}{12}\right) + \frac{11}{12} = \frac{23}{12} + \frac{11}{12} = \frac{34}{12} = \frac{17}{6}$.`
`Standard Solution Steps:`
`part_a:`
`1. First, find the derivative of $y$ with respect to $x$.`
   `$y = \frac{1}{12}x^3 + x^{-1}$`
   `$\frac{dy}{dx} = \frac{1}{12}(3x^2) - 1x^{-2} = \frac{x^2}{4} - \frac{1}{x^2}$.`
`2. Next, square this derivative.`
   `$\left(\frac{dy}{dx}\right)^2 = \left(\frac{x^2}{4} - \frac{1}{x^2}\right)^2 = \left(\frac{x^2}{4}\right)^2 - 2\left(\frac{x^2}{4}\right)\left(\frac{1}{x^2}\right) + \left(\frac{1}{x^2}\right)^2$.`
   `$= \frac{x^4}{16} - \frac{1}{2} + \frac{1}{x^4}$.`
`3. Add 1 to this expression. This is the term needed for the arc length formula.`
   `$1 + \left(\frac{dy}{dx}\right)^2 = 1 + \frac{x^4}{16} - \frac{1}{2} + \frac{1}{x^4} = \frac{x^4}{16} + \frac{1}{2} + \frac{1}{x^4}$.`
`4. Recognize that this new expression is a perfect square. It matches the form $(A+B)^2 = A^2 + 2AB + B^2$. Here, $A = \frac{x^2}{4}$ and $B = \frac{1}{x^2}$. The middle term is $2AB = 2(\frac{x^2}{4})(\frac{1}{x^2}) = \frac{1}{2}$, which matches.`
`5. Therefore, $1 + \left(\frac{dy}{dx}\right)^2 = \left(\frac{x^2}{4} + \frac{1}{x^2}\right)^2$, as required.`
`part_b:`
`1. The formula for arc length is $s = \int_a^b \sqrt{1 + (\frac{dy}{dx})^2} \, dx$.`
`2. Substitute the result from part (a) and the limits $x=1$ to $x=3$.`
   `$s = \int_1^3 \sqrt{\left(\frac{x^2}{4} + \frac{1}{x^2}\right)^2} \, dx$.`
`3. The square root and the square cancel out, simplifying the integral significantly.`
   `$s = \int_1^3 \left(\frac{x^2}{4} + \frac{1}{x^2}\right) \, dx = \int_1^3 \left(\frac{1}{4}x^2 + x^{-2}\right) \, dx$.`
`4. Integrate term by term:`
   `$s = \left[\frac{1}{4} \frac{x^3}{3} + \frac{x^{-1}}{-1}\right]_1^3 = \left[\frac{x^3}{12} - \frac{1}{x}\right]_1^3$.`
`5. Evaluate the definite integral:`
   `$s = \left(\frac{3^3}{12} - \frac{1}{3}\right) - \left(\frac{1^3}{12} - \frac{1}{1}\right) = \left(\frac{27}{12} - \frac{4}{12}\right) - \left(\frac{1}{12} - \frac{12}{12}\right)$.`
   `$= \frac{23}{12} - \left(-\frac{11}{12}\right) = \frac{23+11}{12} = \frac{34}{12} = \frac{17}{6}$.`
`Teaching Insights:`
`- Arc length questions in exams are often constructed so that the term $1 + (dy/dx)^2$ simplifies to a perfect square. Students should be trained to recognize this pattern. The key is that the middle term changes sign, e.g., from $-2AB$ to $+2AB$.`
`- Careful algebraic manipulation is paramount. A small error in differentiation or squaring will prevent the expression from simplifying correctly.`
`- This is a good example of how different parts of a question are linked. Part (a) is essential groundwork for making part (b) solvable.`
`Error Analysis:`
`- Errors in differentiating $1/x$, often forgetting the negative sign or getting the new power wrong.`
`- Mistakes in expanding the squared derivative, particularly the middle term, e.g., writing $-2$ instead of $-1/2$.`
`- After integrating, sign errors when substituting the lower limit due to the minus sign in the integral formula and the minus sign on the $1/x$ term.`
`- Simple arithmetic errors when combining fractions to get the final answer.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Arc length formula", "Differentiation of polynomials and negative powers", "Algebraic expansion of binomials", "Definite integration"]`
`  Next_Steps: ["Arc length for parametric curves", "Arc length for polar curves", "Surface area of revolution"]`
`API Integration Fields:`
`  {"uuid": "b2c1d0e9-f8g7-6h5i-4j3k-2l1m0n9o8p7q", "topic_hash": "INT_ARCLEN_CART_01", "adaptive_difficulty": "0.70"}`
`Tags: ["arc length", "integration applications", "cartesian coordinates", "differentiation", "perfect square"]`
`---`