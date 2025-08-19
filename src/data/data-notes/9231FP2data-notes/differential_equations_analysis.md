# CAIE 9231 Further Mathematics: Paper 2 Generation
## Topic: FP2.6 Differential Equations

---
---

### Question 1: First-Order Linear Differential Equations

`---`
`Syllabus Reference: "9231/2.6 Differential Equations"`
`Learning Objective: "Find an integrating factor for a first order linear differential equation, and use an integrating factor to find the general solution. Use initial conditions to find a particular solution."`
`Difficulty Profile: {"part_a": "Medium", "part_b": "Easy"}`
`Cognitive Skills: ["Apply", "Analyze"]`
`Time Estimate: "12"`
`Topic Weight: 7`
`Prerequisite Skills: ["Integration by parts", "Logarithm and exponential rules", "Differentiation of products"]`
`Cross_Topic_Links: ["Integration"]`
`Example Question:`
`Consider the differential equation`
`$$ x \frac{dy}{dx} - 3y = x^4 \ln x $$`
`for $x > 0$.`
`(a) Find the general solution for y in terms of x. [6]`
`(b) Find the particular solution given that $y = \frac{1}{2}$ when $x=1$. [2]`
`Mark Scheme:`
`part_a:`
`- M1: Divides by x to rearrange the equation into the standard form $\frac{dy}{dx} + P(x)y = Q(x)$.`
  `$\frac{dy}{dx} - \frac{3}{x}y = x^3 \ln x$.`
`- M1: Finds the integrating factor (I.F.). $I(x) = e^{\int P(x) dx} = e^{\int -\frac{3}{x} dx} = e^{-3\ln x}$.`
`- A1: Correctly simplifies the integrating factor to $e^{\ln(x^{-3})} = x^{-3}$.`
`- M1: Multiplies the standard form equation by the I.F. and recognizes the LHS as the derivative of a product.`
  `$x^{-3}\frac{dy}{dx} - 3x^{-4}y = \ln x \implies \frac{d}{dx}(x^{-3}y) = \ln x$.`
`- M1: Integrates the RHS with respect to x. Integration of $\ln x$ by parts: $\int 1 \cdot \ln x \,dx = x\ln x - \int x \cdot \frac{1}{x} dx = x\ln x - x$.`
`- A1: Correctly states the general solution after integration.`
  `$x^{-3}y = x\ln x - x + C \implies y = x^4\ln x - x^4 + Cx^3$.`
`part_b:`
`- M1: Substitutes the initial conditions $x=1, y=1/2$ into the general solution.`
  `$\frac{1}{2} = 1^4\ln(1) - 1^4 + C(1)^3 = 0 - 1 + C$.`
`- A1: Solves for C and states the final particular solution.`
  `$C = \frac{3}{2}$. The particular solution is $y = x^4\ln x - x^4 + \frac{3}{2}x^3$.`
`Standard Solution Steps:`
`part_a:`
`1. The given differential equation must first be written in the standard form $\frac{dy}{dx} + P(x)y = Q(x)$. To do this, we divide the entire equation by $x$.`
   `$\frac{dy}{dx} - \frac{3}{x}y = x^3 \ln x$.`
   `Here, $P(x) = -\frac{3}{x}$ and $Q(x) = x^3 \ln x$.`
`2. Calculate the integrating factor, $I(x)$, using the formula $I(x) = e^{\int P(x)dx}$.`
   `$I(x) = e^{\int -\frac{3}{x} dx} = e^{-3\ln x} = e^{\ln(x^{-3})} = x^{-3}$.`
`3. Multiply the standard form of the equation by the integrating factor.`
   `$x^{-3}\left(\frac{dy}{dx} - \frac{3}{x}y\right) = x^{-3}(x^3 \ln x) \implies x^{-3}\frac{dy}{dx} - 3x^{-4}y = \ln x$.`
`4. The left-hand side is now, by design, the derivative of the product of $y$ and the integrating factor: $\frac{d}{dx}(y \cdot I(x)) = \frac{d}{dx}(yx^{-3})$.`
   `So, $\frac{d}{dx}(yx^{-3}) = \ln x$.`
`5. Integrate both sides with respect to $x$.`
   `$yx^{-3} = \int \ln x \,dx$.`
   `The integral of $\ln x$ is a standard result found using integration by parts: $\int \ln x \,dx = x\ln x - x + C$.`
`6. The resulting equation is $yx^{-3} = x\ln x - x + C$.`
`7. Solve for $y$ to get the general solution:`
   `$y = x^3(x\ln x - x + C) = x^4\ln x - x^4 + Cx^3$.`
`part_b:`
`1. Use the given initial condition, $y = 1/2$ when $x=1$, in the general solution to find the constant $C$.`
   `$\frac{1}{2} = (1)^4\ln(1) - (1)^4 + C(1)^3$.`
`2. Since $\ln(1) = 0$, this simplifies to:`
   `$\frac{1}{2} = 0 - 1 + C \implies C = 1 + \frac{1}{2} = \frac{3}{2}$.`
`3. Substitute the value of C back into the general solution to obtain the particular solution.`
   `$y = x^4\ln x - x^4 + \frac{3}{2}x^3$.`
`Teaching Insights:`
`- The method of integrating factors is a fixed procedure. Students must memorize the standard form $\frac{dy}{dx} + P(x)y = Q(x)$ and the formula for the I.F.`
`- A crucial step is recognizing that after multiplying by the I.F., the LHS always becomes $\frac{d}{dx}(y \cdot \text{I.F.})$. This is a useful self-check.`
`- Emphasize the properties of logarithms and exponentials, as they are key to simplifying the I.F. Forgetting that $e^{k\ln x} = x^k$ is a common hurdle.`
`- Ensure students are proficient with integration techniques from previous courses, such as integration by parts, as they are required for integrating the RHS.`
`Error Analysis:`
`- Failure to rearrange the equation into the standard form, leading to an incorrect $P(x)$.`
`- Sign errors when calculating $\int P(x) dx$.`
`- Errors in simplifying the integrating factor, e.g., writing $e^{-3\ln x}$ as $-3x$.`
`- After finding the general solution for $y \cdot I(x)$, forgetting to multiply through by the inverse of the I.F. to isolate $y$.`
`- Mistakes in substituting initial conditions, especially when $\ln(1)=0$ is involved.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Integration of standard functions", "Logarithm and exponential rules", "Integration by parts"]`
`  Next_Steps: ["Second-order differential equations", "Using substitutions to simplify differential equations"]`
`API Integration Fields:`
`  {"uuid": "6f1d9c2e-4b8a-4f5c-8d1e-9a0b1c2d3e4f", "topic_hash": "DE_FIRST_ORDER_LINEAR_01", "adaptive_difficulty": "0.60"}`
`Tags: ["differential equation", "first-order", "linear", "integrating factor", "general solution", "particular solution"]`
`---`

---
---

### Question 2: Second-Order Non-Homogeneous Differential Equations

`---`
`Syllabus Reference: "9231/2.6 Differential Equations"`
`Learning Objective: "Find the complementary function and a particular integral for a second order linear differential equation with constant coefficients. Use initial conditions to find a particular solution."`
`Difficulty Profile: {"part_a": "Easy", "part_b": "Medium", "part_c": "Medium"}`
`Cognitive Skills: ["Apply", "Analyze"]`
`Time Estimate: "16"`
`Topic Weight: 10`
`Prerequisite Skills: ["Solving quadratic equations (including complex roots)", "Differentiation of trigonometric functions", "Solving simultaneous equations"]`
`Cross_Topic_Links: ["Complex Numbers (for auxiliary equation)"]`
`Example Question:`
`Find the solution of the differential equation`
`$$ \frac{d^2y}{dx^2} + 2\frac{dy}{dx} + 5y = 10\cos x $$`
`given that when $x=0$, $y=1$ and $\frac{dy}{dx}=3$. [10]`
`Mark Scheme:`
`- M1: Forms the auxiliary equation $m^2 + 2m + 5 = 0$.`
`- A1: Solves the auxiliary equation to find complex roots: $m = \frac{-2 \pm \sqrt{4 - 20}}{2} = -1 \pm 2i$.`
`- A1: Correctly writes down the complementary function (CF): $y_{CF} = e^{-x}(A\cos(2x) + B\sin(2x))$.`
`- M1: Chooses the correct form for the particular integral (PI): $y_{PI} = C\cos x + D\sin x$.`
`- M1: Differentiates the PI twice: $\frac{dy}{dx} = -C\sin x + D\cos x$ and $\frac{d^2y}{dx^2} = -C\cos x - D\sin x$.`
`- M1: Substitutes the PI and its derivatives into the original differential equation.`
  `$(-C\cos x - D\sin x) + 2(-C\sin x + D\cos x) + 5(C\cos x + D\sin x) = 10\cos x$.`
`- M1: Collects coefficients of $\cos x$ and $\sin x$ and equates them.`
  `$\cos x: -C + 2D + 5C = 10 \implies 4C + 2D = 10$.`
  `$\sin x: -D - 2C + 5D = 0 \implies 4D - 2C = 0 \implies C = 2D$.`
`- A1: Solves the simultaneous equations to find $C=2$ and $D=1$. PI is $y_{PI} = 2\cos x + \sin x$.`
`- B1FT: Writes the general solution $y = y_{CF} + y_{PI} = e^{-x}(A\cos(2x) + B\sin(2x)) + 2\cos x + \sin x$.`
`- M1: Differentiates the general solution and applies the initial conditions for $y$ and $\frac{dy}{dx}$ at $x=0$.`
  `$y(0)=1 \implies 1 = A + 2 \implies A = -1$.`
  `$\frac{dy}{dx} = e^{-x}(-2A\sin(2x)+2B\cos(2x)) - e^{-x}(A\cos(2x)+B\sin(2x)) - 2\sin x + \cos x$.`
  `$\frac{dy}{dx}(0)=3 \implies 3 = (2B) - (A) + 1 \implies 3 = 2B - A + 1$.`
`- A1: Solves for B and states the final particular solution.`
  `$3 = 2B - (-1) + 1 \implies 3 = 2B + 2 \implies 2B = 1 \implies B=1/2$.`
  `$y = e^{-x}(-\cos(2x) + \frac{1}{2}\sin(2x)) + 2\cos x + \sin x$.`
`Standard Solution Steps:`
`1.  **Find the Complementary Function (CF):** This is the solution to the homogeneous equation $\frac{d^2y}{dx^2} + 2\frac{dy}{dx} + 5y = 0$.`
    `a. Form the auxiliary equation: $m^2 + 2m + 5 = 0$.`
    `b. Solve the quadratic equation for m, using the quadratic formula: $m = \frac{-2 \pm \sqrt{2^2 - 4(1)(5)}}{2(1)} = \frac{-2 \pm \sqrt{-16}}{2} = \frac{-2 \pm 4i}{2} = -1 \pm 2i$.`
    `c. Since the roots are complex ($p \pm qi$), the CF is of the form $y_{CF} = e^{px}(A\cos(qx) + B\sin(qx))$.`
    `d. Here, $p=-1$ and $q=2$, so $y_{CF} = e^{-x}(A\cos(2x) + B\sin(2x))$.`
`2.  **Find the Particular Integral (PI):** This is a solution that matches the form of the right-hand side, $f(x) = 10\cos x$.`
    `a. For a sinusoidal RHS, we try a PI of the form $y_{PI} = C\cos x + D\sin x$.`
    `b. Find the derivatives: $\frac{dy}{dx} = -C\sin x + D\cos x$ and $\frac{d^2y}{dx^2} = -C\cos x - D\sin x$.`
    `c. Substitute these into the full DE: $(-C\cos x - D\sin x) + 2(-C\sin x + D\cos x) + 5(C\cos x + D\sin x) = 10\cos x$.`
    `d. Group terms by $\cos x$ and $\sin x$: $( -C+2D+5C)\cos x + (-D-2C+5D)\sin x = 10\cos x$.`
    `e. This gives $(4C+2D)\cos x + (-2C+4D)\sin x = 10\cos x + 0\sin x$.`
    `f. Equate coefficients to form simultaneous equations:`
       `$4C + 2D = 10 \implies 2C + D = 5$`
       `$-2C + 4D = 0 \implies D = C/2$`
    `g. Solving these gives $C=2, D=1$. So, $y_{PI} = 2\cos x + \sin x$.`
`3.  **Form the General Solution:** The general solution is $y = CF + PI$.`
    `$y = e^{-x}(A\cos(2x) + B\sin(2x)) + 2\cos x + \sin x$.`
`4.  **Apply Initial Conditions:** Use the given conditions to find the constants A and B.`
    `a. Use $y(0)=1$: $1 = e^0(A\cos(0) + B\sin(0)) + 2\cos(0) + \sin(0) \implies 1 = A(1) + 2(1) \implies A = -1$.`
    `b. First find the derivative of the general solution using the product rule on the CF part:`
       `$\frac{dy}{dx} = [-e^{-x}(A\cos(2x) + B\sin(2x))] + [e^{-x}(-2A\sin(2x) + 2B\cos(2x))] - 2\sin x + \cos x$.`
    `c. Now use $\frac{dy}{dx}(0)=3$: $3 = [-1(A)] + [1(2B)] - 0 + 1 \implies 3 = -A + 2B + 1$.`
    `d. Substitute $A=-1$: $3 = -(-1) + 2B + 1 \implies 3 = 2 + 2B \implies 2B = 1 \implies B=1/2$.`
`5.  **State the Final Particular Solution:** Substitute the values of A and B.`
    `$y = e^{-x}(-\cos(2x) + \frac{1}{2}\sin(2x)) + 2\cos x + \sin x$.`
`Teaching Insights:`
`- The procedure is highly structured. The process CF -> PI -> General Solution -> Particular Solution must be followed every time.`
`- Students must memorize the three forms of the CF based on the nature of the roots of the auxiliary equation (real distinct, real repeated, complex conjugate).`
`- Similarly, the standard forms for the PI must be learned. A common difficulty is when the PI form overlaps with a term in the CF, requiring modification (e.g., multiplying by x).`
`- The final step of applying initial conditions often involves careful differentiation (product rule) and solving simultaneous equations, which can be a source of errors.`
`Error Analysis:`
`- Errors in solving the auxiliary equation, especially with signs in the quadratic formula.`
`- Incorrectly stating the CF for complex or repeated roots.`
`- Choosing the wrong form for the PI, or making algebraic/differentiation errors when substituting it.`
`- Errors in solving the simultaneous equations for the PI coefficients.`
`- Mistakes in differentiating the general solution (especially the product rule part) to apply the $\frac{dy}{dx}$ condition.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Solving quadratic equations", "Differentiation of exponential and trig functions", "Product rule", "Solving simultaneous equations"]`
`  Next_Steps: ["DEs where the PI form matches a term in the CF", "DEs requiring substitution", "Modelling problems with second-order DEs"]`
`API Integration Fields:`
`  {"uuid": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6", "topic_hash": "DE_SECOND_ORDER_NONHOMOG_01", "adaptive_difficulty": "0.80"}`
`Tags: ["differential equation", "second-order", "constant coefficients", "complementary function", "particular integral", "complex roots", "initial conditions"]`
`---`

---
---

### Question 3: Differential Equations with Substitution

`---`
`Syllabus Reference: "9231/2.6 Differential Equations"`
`Learning Objective: "Use a given substitution to reduce a differential equation to a first or second order linear equation with constant coefficients."`
`Difficulty Profile: {"part_a": "Hard", "part_b": "Medium"}`
`Cognitive Skills: ["Synthesize", "Apply", "Analyze"]`
`Time Estimate: "17"`
`Topic Weight: 9`
`Prerequisite Skills: ["Chain rule", "Product rule", "Solving second-order non-homogeneous DEs", "Logarithm and exponential rules"]`
`Cross_Topic_Links: ["Differentiation"]`
`Example Question:`
`The differential equation (E) is given by`
`$$ x^2 \frac{d^2y}{dx^2} - 3x \frac{dy}{dx} + 3y = 2x^5 $$`
`(a) Use the substitution $x=e^t$ to show that equation (E) can be transformed into`
`$$ \frac{d^2y}{dt^2} - 4\frac{dy}{dt} + 3y = 2e^{5t} $$ [6]`
`(b) Hence find the general solution for $y$ in terms of $x$. [6]`
`Mark Scheme:`
`part_a:`
`- M1: Starts with the substitution $x=e^t \implies t=\ln x$. Finds $\frac{dt}{dx} = \frac{1}{x}$.`
`- M1: Uses the chain rule to find the first derivative: $\frac{dy}{dx} = \frac{dy}{dt}\frac{dt}{dx} = \frac{1}{x}\frac{dy}{dt}$.`
`- M1: Uses the product and chain rules to find the second derivative.`
  `$\frac{d^2y}{dx^2} = \frac{d}{dx}\left(\frac{1}{x}\frac{dy}{dt}\right) = -\frac{1}{x^2}\frac{dy}{dt} + \frac{1}{x}\frac{d}{dx}\left(\frac{dy}{dt}\right)$.`
`- A1: Correctly applies chain rule again: $\frac{d}{dx}\left(\frac{dy}{dt}\right) = \frac{d^2y}{dt^2}\frac{dt}{dx} = \frac{1}{x}\frac{d^2y}{dt^2}$.`
  `So, $\frac{d^2y}{dx^2} = -\frac{1}{x^2}\frac{dy}{dt} + \frac{1}{x^2}\frac{d^2y}{dt^2}$.`
`- M1: Substitutes the expressions for $\frac{dy}{dx}$ and $\frac{d^2y}{dx^2}$ into the original equation (E).`
  `$x^2\left(-\frac{1}{x^2}\frac{dy}{dt} + \frac{1}{x^2}\frac{d^2y}{dt^2}\right) - 3x\left(\frac{1}{x}\frac{dy}{dt}\right) + 3y = 2(e^t)^5$.`
`- A1: Simplifies the equation to the required form.`
  `$\left(-\frac{dy}{dt} + \frac{d^2y}{dt^2}\right) - 3\frac{dy}{dt} + 3y = 2e^{5t} \implies \frac{d^2y}{dt^2} - 4\frac{dy}{dt} + 3y = 2e^{5t}$. (AG)`
`part_b:`
`- M1: Solves the transformed equation. Finds the CF first. Auxiliary equation: $m^2 - 4m + 3 = 0 \implies (m-1)(m-3)=0 \implies m=1, 3$.`
`- A1: States the CF in terms of t: $y_{CF} = Ae^t + Be^{3t}$.`
`- M1: Finds the PI. Try $y_{PI} = Ce^{5t}$. Then $\frac{dy}{dt} = 5Ce^{5t}$ and $\frac{d^2y}{dt^2} = 25Ce^{5t}$.`
  `$25Ce^{5t} - 4(5Ce^{5t}) + 3(Ce^{5t}) = 2e^{5t} \implies (25-20+3)C = 2 \implies 8C=2 \implies C=1/4$.`
`- A1: States the PI in terms of t: $y_{PI} = \frac{1}{4}e^{5t}$.`
`- M1: Writes the general solution in terms of t: $y = Ae^t + Be^{3t} + \frac{1}{4}e^{5t}$.`
`- A1: Substitutes back using $x=e^t$ to find the final general solution in terms of x.`
  `$y = Ax + Bx^3 + \frac{1}{4}x^5$.`
`Standard Solution Steps:`
`part_a:`
`1. The substitution is $x=e^t$, which means $t=\ln x$. We need to transform the derivatives from being with respect to $x$ to being with respect to $t$.`
`2.  **First Derivative:** Use the chain rule: $\frac{dy}{dx} = \frac{dy}{dt} \cdot \frac{dt}{dx}$. Since $t=\ln x$, we have $\frac{dt}{dx} = \frac{1}{x}$.`
    `So, $\frac{dy}{dx} = \frac{1}{x}\frac{dy}{dt}$. This can be rearranged to $x\frac{dy}{dx} = \frac{dy}{dt}$.`
`3.  **Second Derivative:** Use the product rule and chain rule to differentiate $\frac{dy}{dx}$ with respect to $x$.`
    `$\frac{d^2y}{dx^2} = \frac{d}{dx}\left(\frac{1}{x}\frac{dy}{dt}\right) = \left(-\frac{1}{x^2}\right)\frac{dy}{dt} + \frac{1}{x}\frac{d}{dx}\left(\frac{dy}{dt}\right)$.`
    `The term $\frac{d}{dx}(\frac{dy}{dt})$ requires another application of the chain rule: $\frac{d}{dx}(\frac{dy}{dt}) = \frac{d}{dt}(\frac{dy}{dt}) \cdot \frac{dt}{dx} = \frac{d^2y}{dt^2} \cdot \frac{1}{x} = \frac{1}{x}\frac{d^2y}{dt^2}$.`
    `Substituting this back gives: $\frac{d^2y}{dx^2} = -\frac{1}{x^2}\frac{dy}{dt} + \frac{1}{x^2}\frac{d^2y}{dt^2}$.`
    `This can be rearranged to $x^2\frac{d^2y}{dx^2} = \frac{d^2y}{dt^2} - \frac{dy}{dt}$.`
`4.  **Substitute into the DE (E):** Replace the terms in (E) with their equivalents in $t$.`
    `$x^2\frac{d^2y}{dx^2} \rightarrow \left(\frac{d^2y}{dt^2} - \frac{dy}{dt}\right)$`
    `$-3x\frac{dy}{dx} \rightarrow -3\left(\frac{dy}{dt}\right)$`
    `$3y \rightarrow 3y$`
    `$2x^5 \rightarrow 2(e^t)^5 = 2e^{5t}`
`5.  **Assemble the new DE:**`
    `$(\frac{d^2y}{dt^2} - \frac{dy}{dt}) - 3\frac{dy}{dt} + 3y = 2e^{5t}$.`
`6.  **Simplify:**`
    `$\frac{d^2y}{dt^2} - 4\frac{dy}{dt} + 3y = 2e^{5t}$. This is the required transformed equation.`
`part_b:`
`1.  Solve the transformed constant-coefficient equation from part (a).`
    `a.  **Find CF:** The auxiliary equation is $m^2 - 4m + 3 = 0$. This factors to $(m-1)(m-3)=0$, so the roots are $m=1$ and $m=3$. The complementary function is $y_{CF} = Ae^t + Be^{3t}$.`
    `b.  **Find PI:** The RHS is $2e^{5t}$. Try a particular integral $y_{PI} = Ce^{5t}$.`
        `Derivatives are $\frac{dy}{dt} = 5Ce^{5t}$ and $\frac{d^2y}{dt^2} = 25Ce^{5t}$.`
        `Substitute into the transformed DE: $25Ce^{5t} - 4(5Ce^{5t}) + 3(Ce^{5t}) = 2e^{5t}$.`
        `$(25-20+3)Ce^{5t} = 2e^{5t} \implies 8C=2 \implies C=1/4$.`
        `The particular integral is $y_{PI} = \frac{1}{4}e^{5t}$.`
`2.  **General Solution in t:** The general solution in terms of $t$ is $y = y_{CF} + y_{PI}$.`
    `$y = Ae^t + Be^{3t} + \frac{1}{4}e^{5t}$.`
`3.  **Convert back to x:** Use the original substitution $x=e^t$. This implies $e^t=x$, $e^{3t}=(e^t)^3=x^3$, and $e^{5t}=(e^t)^5=x^5$.`
    `Substituting these back gives the final general solution in terms of $x$.`
    `$y = Ax + Bx^3 + \frac{1}{4}x^5$.`
`Teaching Insights:`
`- Euler-type differential equations, where the power of $x$ in the coefficient matches the order of the derivative (e.g., $x^2y''$, $xy'$), are a classic application for the substitution $x=e^t$.`
`- The derivation of the transformed derivatives (`$x\frac{dy}{dx} = \frac{dy}{dt}$` and `$x^2\frac{d^2y}{dx^2} = \frac{d^2y}{dt^2}-\frac{dy}{dt}$`) is a standard procedure that students can learn, but they must be able to derive it from first principles using the chain and product rules as shown.`
`- This type of question beautifully links multiple concepts: advanced differentiation, substitution, and the full procedure for solving second-order non-homogeneous equations.`
`Error Analysis:`
`- Errors in the chain/product rule when transforming the derivatives. This is the most common and critical point of failure in part (a).`
`- After transforming the equation, making a mistake in solving the constant-coefficient DE (e.g., wrong CF or PI).`
`- Forgetting to substitute back from $t$ to $x$ to give the final answer in the required variable.`
`- Algebraic errors when substituting back, e.g., incorrectly stating that $e^{3t} = 3x$.`
`Adaptive Learning Metadata:`
`  Prerequisites: ["Chain rule for differentiation", "Solving second-order non-homogeneous DEs"]`
`  Next_Steps: ["Initial value problems for Euler-type equations", "Different types of substitutions"]`
`API Integration Fields:`
`  {"uuid": "c3b2a1d0-e9f8-7g6h-5i4j-3k2l1m0n9o8p", "topic_hash": "DE_SUBSTITUTION_EULER_01", "adaptive_difficulty": "0.90"}`
`Tags: ["differential equation", "substitution", "euler-cauchy equation", "second-order", "chain rule", "general solution"]`
`---`