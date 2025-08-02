## Integration: Integration as the Reverse of Differentiation
**Syllabus Reference**: 8.1
**Learning Objective**: Understand integration as the reverse process of differentiation and find indefinite integrals.
### Example Question
A curve is such that its gradient function is given by $\frac{dy}{dx} = 4x^3 - 6x + \frac{3}{x^2}$.
Find the general equation of the curve. [3]
### Mark Scheme / Solution
Rewrite the gradient function with negative indices.
The term $\frac{3}{x^2}$ is rewritten as $3x^{-2}$ to apply the power rule for integration.
$\frac{dy}{dx} = 4x^3 - 6x + 3x^{-2}$ (B1 for converting to index form)

Integrate the expression with respect to $x$.
Apply the rule $\int x^n \,dx = \frac{x^{n+1}}{n+1} + c$ to each term.
$y = \int (4x^3 - 6x + 3x^{-2}) \,dx$
$y = \frac{4x^{3+1}}{3+1} - \frac{6x^{1+1}}{1+1} + \frac{3x^{-2+1}}{-2+1} + c$ (M1 for applying power rule)
$y = \frac{4x^4}{4} - \frac{6x^2}{2} + \frac{3x^{-1}}{-1} + c$

Simplify the expression and present the final equation.
$y = x^4 - 3x^2 - 3x^{-1} + c$
The final equation of the curve is $y = x^4 - 3x^2 - \frac{3}{x} + c$. (A1 for correct final answer)
### Standard Solution Steps
- Rewrite all terms in index form if necessary
- Apply the power rule for integration: $\int x^n \,dx = \frac{x^{n+1}}{n+1} + c$
- Integrate each term separately
- Simplify and include the constant of integration
### Common Mistakes
- Forgetting to include the constant of integration $c$
- Errors in applying the power rule (forgetting to add 1 to the power)
- Not rewriting terms in index form before integrating
- Sign errors when dealing with negative powers
### Tags
integration, indefinite integral, power rule, constant of integration

## Integration: Integrating $(ax+b)^n$
**Syllabus Reference**: 8.2
**Learning Objective**: Integrate expressions of the form $(ax+b)^n$ using the reverse chain rule.
### Example Question
Find $\int \frac{12}{\sqrt{2x+5}} \,dx$. [3]
### Mark Scheme / Solution
Rewrite the integrand in the form $k(ax+b)^n$.
The square root in the denominator corresponds to a power of $-\frac{1}{2}$.
$\int 12(2x+5)^{-\frac{1}{2}} \,dx$ (B1)

Apply the integration formula for $(ax+b)^n$.
Use the formula $\int (ax+b)^n \,dx = \frac{(ax+b)^{n+1}}{a(n+1)} + c$.
Here, $a=2$, $b=5$, and $n=-\frac{1}{2}$.
$= 12 \times \frac{(2x+5)^{-\frac{1}{2}+1}}{2(-\frac{1}{2}+1)} + c$ (M1)
$= 12 \times \frac{(2x+5)^{\frac{1}{2}}}{2(\frac{1}{2})} + c$
$= 12 \times \frac{(2x+5)^{\frac{1}{2}}}{1} + c$

Simplify the result.
The final simplified expression is $12\sqrt{2x+5} + c$. (A1)
### Standard Solution Steps
- Rewrite in the form $k(ax+b)^n$
- Apply the formula $\int (ax+b)^n \,dx = \frac{(ax+b)^{n+1}}{a(n+1)} + c$
- Identify values of $a$, $b$, and $n$
- Simplify the final expression
### Common Mistakes
- Forgetting to divide by the coefficient of $x$ (the value $a$)
- Errors in arithmetic when adding 1 to the power
- Not simplifying the final expression properly
- Omitting the constant of integration
### Tags
integration, chain rule, composite functions, square root functions

## Integration: Finding the Constant of Integration
**Syllabus Reference**: 8.3
**Learning Objective**: Use initial conditions to find the constant of integration in differential equations.
### Example Question
A curve has a gradient at the point $(x,y)$ given by $\frac{dy}{dx} = \frac{6}{x^3} + 2x$. The curve passes through the point $(1, -2)$.
Find the equation of the curve. [4]
### Mark Scheme / Solution
Integrate the expression for $\frac{dy}{dx}$.
First, rewrite the gradient as $\frac{dy}{dx} = 6x^{-3} + 2x$.
$y = \int (6x^{-3} + 2x) \,dx$
$y = \frac{6x^{-2}}{-2} + \frac{2x^2}{2} + c$ (M1)
$y = -3x^{-2} + x^2 + c$, or $y = -\frac{3}{x^2} + x^2 + c$. (A1)

Substitute the coordinates of the given point to find $c$.
The curve passes through $(1, -2)$, so substitute $x=1$ and $y=-2$.
$-2 = -\frac{3}{(1)^2} + (1)^2 + c$ (M1)
$-2 = -3 + 1 + c$
$-2 = -2 + c$
$c = 0$

Write the final equation of the curve.
Substitute the value of $c$ back into the integrated equation.
$y = x^2 - \frac{3}{x^2}$. (A1)
### Standard Solution Steps
- Integrate the given gradient function
- Use the given point to form an equation in terms of $c$
- Solve for the constant of integration
- Write the final equation of the curve
### Common Mistakes
- Errors in the integration process
- Substituting the point coordinates incorrectly
- Algebraic mistakes when solving for $c$
- Not writing the final equation clearly
### Tags
integration, differential equations, initial conditions, curve sketching

## Integration: Definite Integrals
**Syllabus Reference**: 8.4
**Learning Objective**: Evaluate definite integrals using the fundamental theorem of calculus.
### Example Question
Evaluate the definite integral $\int_{1}^{4} (3\sqrt{x} + \frac{4}{x^2}) \,dx$, giving your answer as an exact fraction. [5]
### Mark Scheme / Solution
Rewrite the integrand with rational indices.
$\int_{1}^{4} (3x^{\frac{1}{2}} + 4x^{-2}) \,dx$ (B1)

Find the indefinite integral.
$\left[ \frac{3x^{\frac{3}{2}}}{\frac{3}{2}} + \frac{4x^{-1}}{-1} \right]_{1}^{4}$ (M1)
$\left[ 2x^{\frac{3}{2}} - 4x^{-1} \right]_{1}^{4}$
$\left[ 2\sqrt{x^3} - \frac{4}{x} \right]_{1}^{4}$ (A1)

Substitute the upper and lower limits.
This is done using the formula $F(b) - F(a)$.
Substitute upper limit ($x=4$): $2\sqrt{4^3} - \frac{4}{4} = 2\sqrt{64} - 1 = 2(8) - 1 = 16 - 1 = 15$.
Substitute lower limit ($x=1$): $2\sqrt{1^3} - \frac{4}{1} = 2(1) - 4 = -2$. (M1)

Calculate the final value.
Value = (Value at upper limit) - (Value at lower limit)
Value = $15 - (-2) = 17$. (A1)
### Standard Solution Steps
- Rewrite in index form if necessary
- Find the indefinite integral
- Apply the fundamental theorem: $\int_a^b f(x) \,dx = F(b) - F(a)$
- Substitute the limits and calculate
### Common Mistakes
- Errors in converting to index form
- Sign errors when subtracting the lower limit value
- Computational errors when evaluating at the limits
- Not simplifying fractions to exact form
### Tags
integration, definite integrals, fundamental theorem, exact values

## Integration: Areas Under Curves
**Syllabus Reference**: 8.5
**Learning Objective**: Use definite integration to find areas bounded by curves and coordinate axes.
### Example Question
A diagram shows a shaded region bounded by the curve with equation $y = 8 - 2x - x^2$, the x-axis, and the y-axis. The curve intersects the positive x-axis at the point $A$.
(a) Find the coordinates of the point $A$. [2]
(b) Find the area of the shaded region. [4]
### Mark Scheme / Solution
(a) Find the coordinates of A
Set $y=0$ to find the x-intercepts.
The point $A$ is where the curve crosses the positive x-axis.
$8 - 2x - x^2 = 0$
$x^2 + 2x - 8 = 0$ (M1)
$(x+4)(x-2) = 0$
$x=-4$ or $x=2$.
Since $A$ is on the positive x-axis, $x=2$.
The coordinates of $A$ are $(2, 0)$. (A1)

(b) Find the area of the shaded region
Set up the definite integral for the area.
The shaded region is bounded by the curve, the y-axis ($x=0$), and the x-axis up to point $A$ ($x=2$).
$Area = \int_{0}^{2} (8 - 2x - x^2) \,dx$ (M1)

Integrate the expression.
$\left[ 8x - \frac{2x^2}{2} - \frac{x^3}{3} \right]_{0}^{2}$
$\left[ 8x - x^2 - \frac{x^3}{3} \right]_{0}^{2}$ (A1)

Substitute the limits and evaluate.
Substitute upper limit ($x=2$): $8(2) - (2)^2 - \frac{(2)^3}{3} = 16 - 4 - \frac{8}{3} = 12 - \frac{8}{3} = \frac{36-8}{3} = \frac{28}{3}$.
Substitute lower limit ($x=0$): $8(0) - (0)^2 - \frac{(0)^3}{3} = 0$. (M1)

State the final area.
Area = $\frac{28}{3} - 0 = \frac{28}{3}$ (or $9\frac{1}{3}$). (A1)
### Standard Solution Steps
- Find intersection points by setting expressions equal
- Set up the definite integral with correct limits
- Integrate the function
- Evaluate at the limits and subtract
- State the final area with appropriate units
### Common Mistakes
- Errors in finding intersection points
- Using wrong limits of integration
- Sign errors in the integration process
- Not setting up the integral correctly for the bounded region
### Tags
integration, area under curve, definite integrals, intersection points