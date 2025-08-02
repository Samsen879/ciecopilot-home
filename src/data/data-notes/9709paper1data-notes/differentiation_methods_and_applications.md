## Differentiation: The Derivative of x^n
**Syllabus Reference**: 7.1
**Learning Objective**: Differentiate expressions of the form $x^n$ and apply the power rule to polynomial expressions.
### Example Question
A curve has equation $y = 4x^3 - \frac{6}{\sqrt{x}} + 5$. Find the derivative, $\frac{dy}{dx}$. [3]
### Mark Scheme / Solution
Rewrite the equation with all terms in index form, $x^n$. (M1 for converting to index form)
$y = 4x^3 - 6x^{-\frac{1}{2}} + 5$
Differentiate each term using the power rule. (M1 for applying power rule)
$\frac{dy}{dx} = 4(3x^{3-1}) - 6(-\frac{1}{2}x^{-\frac{1}{2}-1}) + 0$
$\frac{dy}{dx} = 12x^2 + 3x^{-\frac{3}{2}}$
The answer can be left with negative indices. (A1 for correct final answer)
### Standard Solution Steps
- Convert all terms to index form $x^n$
- Apply the power rule $\frac{d}{dx}[x^n] = nx^{n-1}$
- Differentiate each term separately
- Simplify the final expression
### Common Mistakes
- Incorrectly converting $\frac{1}{\sqrt{x}}$ to index form (it is $x^{-\frac{1}{2}}$, not $x^{\frac{1}{2}}$)
- Errors with signs when differentiating negative powers
- Forgetting to differentiate the constant term to zero
- Not simplifying the final expression properly
### Tags
differentiation, power rule, negative indices, fractional indices

## Differentiation: Chain Rule
**Syllabus Reference**: 7.2
**Learning Objective**: Apply the chain rule to differentiate composite functions of the form $(ax+b)^n$.
### Example Question
Given that $f(x) = (3x-2)^5 + \frac{1}{(3x-2)^2}$, find $f'(1)$. [4]
### Mark Scheme / Solution
Rewrite the function with all terms in index form. (B1 for converting to index form)
$f(x) = (3x-2)^5 + (3x-2)^{-2}$
Differentiate each term using the chain rule. (M1 for applying chain rule)
$f'(x) = 5(3)(3x-2)^{5-1} + (-2)(3)(3x-2)^{-2-1}$
$f'(x) = 15(3x-2)^4 - 6(3x-2)^{-3}$ (A1 for correct derivative)
Substitute $x=1$ into the derivative $f'(x)$. (M1 for substitution)
$f'(1) = 15(3(1)-2)^4 - 6(3(1)-2)^{-3}$
$f'(1) = 15(1)^4 - 6(1)^{-3}$
$f'(1) = 15 - 6 = 9$ (A1 for correct evaluation)
### Standard Solution Steps
- Convert to index form where necessary
- Apply the chain rule: if $y = (ax+b)^n$, then $\frac{dy}{dx} = an(ax+b)^{n-1}$
- Multiply by the derivative of the inner function (coefficient of $x$)
- Substitute the given value and evaluate
### Common Mistakes
- Forgetting to multiply by the derivative of the inner function (the coefficient of $x$)
- Errors in subtracting 1 from a negative power (e.g., $-2-1=-1$ instead of $-3$)
- Arithmetic mistakes when substituting the value of $x$
- Not converting to index form initially
### Tags
differentiation, chain rule, composite functions, evaluating derivatives

## Differentiation: Tangents and Normals
**Syllabus Reference**: 7.3
**Learning Objective**: Find equations of tangent and normal lines to curves at given points.
### Example Question
The equation of a curve is $y = 2x^2 - 8x + 11$.
(a) Find the equation of the tangent to the curve at the point where $x = 3$. [3]
(b) Find the equation of the normal to the curve at the same point. [2]
### Mark Scheme / Solution
(a) Tangent
First, find the derivative of the curve's equation.
$\frac{dy}{dx} = 4x - 8$ (B1)
Find the gradient of the tangent, $m_T$, by substituting $x=3$ into the derivative.
$m_T = 4(3) - 8 = 12 - 8 = 4$. (M1)
Find the y-coordinate of the point by substituting $x=3$ into the original equation.
$y = 2(3)^2 - 8(3) + 11 = 18 - 24 + 11 = 5$. The point is $(3, 5)$.
Use the point-gradient form $y - y_1 = m(x - x_1)$ to find the tangent's equation.
$y - 5 = 4(x - 3) \implies y - 5 = 4x - 12 \implies y = 4x - 7$. (A1)

(b) Normal
The gradient of the normal, $m_N$, is the negative reciprocal of the tangent's gradient.
$m_N = -\frac{1}{m_T} = -\frac{1}{4}$. (M1)
Use the point-gradient form with the point $(3, 5)$ and the normal's gradient.
$y - 5 = -\frac{1}{4}(x - 3)$.
$4y - 20 = -(x - 3) \implies 4y - 20 = -x + 3 \implies x + 4y - 23 = 0$. (A1)
### Standard Solution Steps
- Find the derivative to get the gradient function
- Substitute the x-coordinate to find the gradient at the specific point
- Find the y-coordinate by substituting into the original equation
- Use point-gradient form for the tangent equation
- For the normal, use the negative reciprocal of the tangent gradient
### Common Mistakes
- Using the gradient of the tangent for the equation of the normal
- Calculation errors when finding the negative reciprocal
- Substituting the x-coordinate into the original equation to find the gradient, instead of into the derivative
- Algebraic errors in the point-gradient form
### Tags
differentiation, tangent, normal, coordinate geometry, gradient

## Differentiation: Stationary Points
**Syllabus Reference**: 7.4
**Learning Objective**: Find and classify stationary points using the first and second derivatives.
### Example Question
A curve is defined by the equation $y = \frac{1}{3}x^3 - x^2 - 15x + 7$.
(a) Find the coordinates of the stationary points on the curve. [4]
(b) Determine the nature of each stationary point. [3]
### Mark Scheme / Solution
(a) Finding Coordinates
Differentiate the equation to find $\frac{dy}{dx}$.
$\frac{dy}{dx} = x^2 - 2x - 15$. (B1)
Set the derivative equal to zero to find the x-coordinates of the stationary points.
$x^2 - 2x - 15 = 0$. (M1)
Factorise the quadratic equation.
$(x - 5)(x + 3) = 0$.
So, $x = 5$ or $x = -3$. (A1)
Find the corresponding y-coordinates by substituting these x-values back into the original equation.
For $x = 5$: $y = \frac{1}{3}(5)^3 - (5)^2 - 15(5) + 7 = \frac{125}{3} - 25 - 75 + 7 = -\frac{154}{3}$. Point is $(5, -\frac{154}{3})$.
For $x = -3$: $y = \frac{1}{3}(-3)^3 - (-3)^2 - 15(-3) + 7 = -9 - 9 + 45 + 7 = 34$. Point is $(-3, 34)$. (A1)

(b) Determining Nature
Find the second derivative, $\frac{d^2y}{dx^2}$.
$\frac{d^2y}{dx^2} = 2x - 2$. (B1)
Substitute the x-coordinates of the stationary points into the second derivative.
For $x = 5$: $\frac{d^2y}{dx^2} = 2(5) - 2 = 8$. Since $8 > 0$, the point $(5, -\frac{154}{3})$ is a local minimum. (M1,A1)
For $x = -3$: $\frac{d^2y}{dx^2} = 2(-3) - 2 = -8$. Since $-8 < 0$, the point $(-3, 34)$ is a local maximum.
### Standard Solution Steps
- Find the first derivative and set it equal to zero
- Solve the resulting equation to find x-coordinates of stationary points
- Substitute x-values into the original equation to find y-coordinates
- Find the second derivative
- Use the second derivative test to determine the nature of each point
### Common Mistakes
- Errors in factorising the quadratic derivative
- Substituting x-values into the derivative instead of the original equation to find the y-coordinates
- Errors in calculating the second derivative or misinterpreting its sign
- Not completing the classification of all stationary points
### Tags
differentiation, stationary points, maxima and minima, second derivative test

## Differentiation: Rates of Change
**Syllabus Reference**: 7.5
**Learning Objective**: Apply differentiation to solve problems involving rates of change using the chain rule.
### Example Question
The volume, $V$ cm³, of a spherical balloon is increasing at a constant rate of $20$ cm³s⁻¹. Find the rate of increase of the radius, $r$ cm, at the instant when the radius is $5$ cm. [The volume of a sphere is $V = \frac{4}{3}\pi r^3$.] [4]
### Mark Scheme / Solution
Identify the given rate and the rate to be found.
Given: $\frac{dV}{dt} = 20$.
To find: $\frac{dr}{dt}$ when $r=5$.
Write down the formula connecting the variables $V$ and $r$.
$V = \frac{4}{3}\pi r^3$.
Differentiate $V$ with respect to $r$ to find $\frac{dV}{dr}$. (M1)
$\frac{dV}{dr} = \frac{4}{3}\pi (3r^2) = 4\pi r^2$. (A1)
Set up the chain rule equation connecting the rates.
$\frac{dV}{dt} = \frac{dV}{dr} \times \frac{dr}{dt}$.
Rearrange to find the required rate: $\frac{dr}{dt} = \frac{dV}{dt} \div \frac{dV}{dr}$. (M1)
Substitute the known values. At $r=5$, $\frac{dV}{dr} = 4\pi (5^2) = 100\pi$.
$\frac{dr}{dt} = 20 \div (100\pi) = \frac{20}{100\pi} = \frac{1}{5\pi}$. (A1)
The rate of increase of the radius is $\frac{1}{5\pi}$ cm s⁻¹.
### Standard Solution Steps
- Identify the given rate and the rate to be found
- Write down the relationship between the variables
- Differentiate to find the connecting derivative
- Apply the chain rule to relate the rates
- Substitute known values and solve for the required rate
### Common Mistakes
- Differentiating $V$ with respect to $t$ directly instead of with respect to $r$
- Incorrectly setting up the chain rule relationship
- Forgetting to substitute the value of $r$ into the expression for $\frac{dV}{dr}$ before solving
- Sign errors or calculation mistakes in the final answer
### Tags
differentiation, rates of change, chain rule, related rates, word problems