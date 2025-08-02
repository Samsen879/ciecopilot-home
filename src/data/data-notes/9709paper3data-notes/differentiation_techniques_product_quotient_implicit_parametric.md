# differentiation_techniques.md
## Differentiation: Product and Quotient Rules

**Syllabus Reference**: 9709.P3.3.4
**Learning Objective**: Differentiate products and quotients of functions, including exponential, logarithmic, and trigonometric functions. Use derivatives to find stationary points.

### Example Question
A curve has the equation $y = \frac{e^{2x}}{\cos x}$. Find the exact x-coordinate of the stationary point on the curve in the interval $-\frac{\pi}{2} < x < \frac{\pi}{2}$. [5]

### Mark Scheme / Solution
Use the quotient rule: $\frac{d}{dx}(\frac{u}{v}) = \frac{v \frac{du}{dx} - u \frac{dv}{dx}}{v^2}$.
Let $u = e^{2x}$ and $v = \cos x$.
Then $\frac{du}{dx} = 2e^{2x}$ and $\frac{dv}{dx} = -\sin x$. B1
Substitute into the quotient rule formula:
$\frac{dy}{dx} = \frac{(\cos x)(2e^{2x}) - (e^{2x})(-\sin x)}{(\cos x)^2}$. M1 A1
$\frac{dy}{dx} = \frac{2e^{2x}\cos x + e^{2x}\sin x}{\cos^2 x} = \frac{e^{2x}(2\cos x + \sin x)}{\cos^2 x}$.

For stationary points, $\frac{dy}{dx} = 0$. M1
$\frac{e^{2x}(2\cos x + \sin x)}{\cos^2 x} = 0$.
Since $e^{2x} > 0$ and $\cos^2 x > 0$ for the given interval, the numerator must be zero.
$2\cos x + \sin x = 0$
$\sin x = -2\cos x$
$\frac{\sin x}{\cos x} = -2$
$\tan x = -2$. A1
The question asks for the exact x-coordinate, which is $x = \tan^{-1}(-2)$. (This is the only solution in the interval $-\frac{\pi}{2} < x < \frac{\pi}{2}$).

### Standard Solution Steps
1.  Identify that the function is a quotient of two simpler functions, $u(x)$ and $v(x)$.
2.  Write down the quotient rule formula.
3.  Find the derivatives of $u(x)$ and $v(x)$ separately.
4.  Substitute $u, v, \frac{du}{dx}, \frac{dv}{dx}$ into the formula and simplify algebraically.
5.  To find stationary points, set the derivative $\frac{dy}{dx}$ equal to zero.
6.  This usually means setting the numerator of the resulting fraction to zero.
7.  Solve the resulting equation for $x$. Ensure the solution is within the specified domain.

### Common Mistakes
-   Mixing up the terms in the quotient rule numerator (e.g., calculating $u \frac{dv}{dx} - v \frac{du}{dx}$).
-   Incorrectly differentiating the constituent functions, especially forgetting the chain rule for $e^{2x}$ or getting the sign wrong for the derivative of $\cos x$.
-   Algebraic errors when simplifying the derivative expression.
-   Mistakes when solving the resulting trigonometric equation, such as dividing by a function that could be zero.

### Tags
differentiation, quotient_rule, exponentials, trigonometry, stationary_points, 3.4

## Differentiation: Implicit Differentiation

**Syllabus Reference**: 9709.P3.3.4
**Learning Objective**: Use implicit differentiation to find the derivative of a function defined implicitly.

### Example Question
A curve is defined by the equation $x^3 + \ln(y^2 + 1) = 4xy$. Find the equation of the tangent to the curve at the point where $x=0$. [6]

### Mark Scheme / Solution
First, find the y-coordinate when $x=0$.
$0^3 + \ln(y^2 + 1) = 4(0)y$
$\ln(y^2 + 1) = 0$
$y^2 + 1 = e^0 = 1$
$y^2 = 0 \Rightarrow y=0$. So the point is $(0,0)$. B1

Differentiate the equation with respect to $x$:
$\frac{d}{dx}(x^3) + \frac{d}{dx}(\ln(y^2 + 1)) = \frac{d}{dx}(4xy)$

$\frac{d}{dx}(x^3) = 3x^2$.
$\frac{d}{dx}(\ln(y^2 + 1)) = \frac{1}{y^2+1} \cdot 2y \frac{dy}{dx}$ (Chain rule). M1
$\frac{d}{dx}(4xy) = 4(1 \cdot y + x \cdot \frac{dy}{dx}) = 4y + 4x\frac{dy}{dx}$ (Product rule). M1

So, the differentiated equation is:
$3x^2 + \frac{2y}{y^2+1}\frac{dy}{dx} = 4y + 4x\frac{dy}{dx}$. A1

To find the gradient of the tangent at $(0,0)$, substitute $x=0$ and $y=0$. M1
$3(0)^2 + \frac{2(0)}{0^2+1}\frac{dy}{dx} = 4(0) + 4(0)\frac{dy}{dx}$
$0 + 0 \cdot \frac{dy}{dx} = 0 + 0 \cdot \frac{dy}{dx}$
This gives $0=0$, which is unhelpful. We must rearrange for $\frac{dy}{dx}$ first.

Rearrange the differentiated equation to solve for $\frac{dy}{dx}$:
$(\frac{2y}{y^2+1} - 4x)\frac{dy}{dx} = 4y - 3x^2$
$\frac{dy}{dx} = \frac{4y - 3x^2}{\frac{2y}{y^2+1} - 4x}$.
This is an indeterminate form at $(0,0)$. We must use L'Hopital's rule or re-evaluate. Let's re-examine the equation after substitution:
$3x^2 + \frac{2y}{y^2+1}\frac{dy}{dx} = 4y + 4x\frac{dy}{dx}$
Let's substitute the point $(0,0)$ *before* complete rearrangement:
$3(0)^2 + \frac{2(0)}{0^2+1} \frac{dy}{dx} = 4(0) + 4(0) \frac{dy}{dx}$
This approach is flawed. Let's take a different example as the one chosen is too advanced.

**Revised Example Question**
A curve is defined by the equation $y^3 + 6xy = x^3 - 7$. Find the equation of the tangent to the curve at the point $(2, 1)$. [5]

### Mark Scheme / Solution
Differentiate the equation term by term with respect to $x$.
$\frac{d}{dx}(y^3) + \frac{d}{dx}(6xy) = \frac{d}{dx}(x^3) - \frac{d}{dx}(7)$

$\frac{d}{dx}(y^3) = 3y^2 \frac{dy}{dx}$. M1 (Chain Rule)
$\frac{d}{dx}(6xy) = 6(1 \cdot y + x \cdot \frac{dy}{dx}) = 6y + 6x\frac{dy}{dx}$. M1 (Product Rule)
$\frac{d}{dx}(x^3) = 3x^2$.

The differentiated equation is:
$3y^2 \frac{dy}{dx} + 6y + 6x\frac{dy}{dx} = 3x^2$. A1
Substitute the point $(2, 1)$ to find the gradient, $m$.
$3(1)^2 m + 6(1) + 6(2)m = 3(2)^2$
$3m + 6 + 12m = 12$
$15m = 6$
$m = \frac{6}{15} = \frac{2}{5}$. A1

Use the point-gradient formula $y - y_1 = m(x - x_1)$ to find the tangent equation.
$y - 1 = \frac{2}{5}(x - 2)$
$5(y-1) = 2(x-2)$
$5y - 5 = 2x - 4$
$5y = 2x + 1$ or $2x - 5y + 1 = 0$. A1

### Standard Solution Steps
1.  Differentiate both sides of the equation with respect to $x$.
2.  When differentiating a term containing $y$, apply the chain rule: $\frac{d}{dx}(f(y)) = f'(y) \frac{dy}{dx}$.
3.  When differentiating a term containing both $x$ and $y$ (e.g., $xy$), use the product rule.
4.  After differentiating, you will have an equation containing $x, y,$ and $\frac{dy}{dx}$.
5.  Substitute the coordinates of the given point into this equation.
6.  Solve the resulting linear equation for $\frac{dy}{dx}$ to find the gradient of the tangent.
7.  Use the point and the gradient to find the equation of the tangent line.

### Common Mistakes
-   Forgetting to apply the chain rule for terms involving $y$ (i.e., forgetting the $\frac{dy}{dx}$ factor).
-   Errors in applying the product rule to terms like $xy$.
-   Algebraic mistakes when isolating $\frac{dy}{dx}$ after substitution.
-   Substituting the point into the original equation instead of the differentiated one when finding the gradient.

### Tags
differentiation, implicit_differentiation, chain_rule, product_rule, tangent, gradient, 3.4

## Differentiation: Parametric Equations

**Syllabus Reference**: 9709.P3.3.4
**Learning Objective**: Differentiate functions defined parametrically and use the derivative to solve problems involving tangents and normals.

### Example Question
The parametric equations of a curve are $x = 4 \sin t$ and $y = 3\cos 2t$, for $0 < t < \frac{\pi}{2}$.
(i) Find an expression for $\frac{dy}{dx}$ in terms of $t$. [3]
(ii) Find the equation of the normal to the curve at the point where $t = \frac{\pi}{6}$. [4]

### Mark Scheme / Solution
(i) First, find the derivatives of $x$ and $y$ with respect to the parameter $t$.
$\frac{dx}{dt} = 4\cos t$. B1
$\frac{dy}{dt} = 3(-\sin 2t) \cdot 2 = -6\sin 2t$. B1
Use the chain rule for parametric equations: $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$.
$\frac{dy}{dx} = \frac{-6\sin 2t}{4\cos t}$.
Using the double angle identity $\sin 2t = 2\sin t \cos t$:
$\frac{dy}{dx} = \frac{-6(2\sin t \cos t)}{4\cos t} = \frac{-12\sin t \cos t}{4\cos t} = -3\sin t$. A1

(ii) Find the gradient of the tangent at $t = \frac{\pi}{6}$.
$m_{tangent} = -3\sin(\frac{\pi}{6}) = -3(\frac{1}{2}) = -\frac{3}{2}$. M1
The gradient of the normal is the negative reciprocal:
$m_{normal} = -\frac{1}{m_{tangent}} = -\frac{1}{-3/2} = \frac{2}{3}$. A1

Find the coordinates of the point when $t = \frac{\pi}{6}$.
$x = 4\sin(\frac{\pi}{6}) = 4(\frac{1}{2}) = 2$.
$y = 3\cos(2 \cdot \frac{\pi}{6}) = 3\cos(\frac{\pi}{3}) = 3(\frac{1}{2}) = \frac{3}{2}$. M1

Use the point-gradient formula $y - y_1 = m(x - x_1)$.
$y - \frac{3}{2} = \frac{2}{3}(x - 2)$
$3(y - \frac{3}{2}) = 2(x - 2)$
$3y - \frac{9}{2} = 2x - 4$
$3y = 2x - 4 + \frac{9}{2}$
$3y = 2x + \frac{1}{2}$ or $6y = 4x + 1$ or $4x - 6y + 1 = 0$. A1

### Standard Solution Steps
1.  Differentiate $x$ with respect to the parameter ($t$) to find $\frac{dx}{dt}$.
2.  Differentiate $y$ with respect to the parameter ($t$) to find $\frac{dy}{dt}$.
3.  Calculate the gradient of the curve using the formula $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$.
4.  Simplify the expression for $\frac{dy}{dx}$ if possible, often using trigonometric identities.
5.  To find the tangent/normal at a specific point, substitute the given parameter value into the expressions for $x$, $y$, and $\frac{dy}{dx}$.
6.  Calculate the gradient of the normal if required ($m_{normal} = -1/m_{tangent}$).
7.  Use the point coordinates and the relevant gradient to find the equation of the line.

### Common Mistakes
-   Incorrectly calculating $\frac{dx}{dt}$ or $\frac{dy}{dt}$, often forgetting the chain rule (e.g., for $\cos 2t$).
-   Inverting the formula for the gradient, i.e., calculating $\frac{dx/dt}{dy/dt}$.
-   Algebraic or trigonometric simplification errors when combining the derivatives.
-   Confusing the gradient of the normal with the gradient of the tangent.
-   Errors in calculating the $(x, y)$ coordinates from the parameter value.

### Tags
differentiation, parametric_differentiation, tangent, normal, trigonometry, chain_rule, 3.4