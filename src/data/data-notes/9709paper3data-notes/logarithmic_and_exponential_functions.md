## Logarithmic and exponential functions: Solving equations

**Syllabus Reference**: 9709.P3.3.2
**Learning Objective**: Understand the relationship between logarithms and indices, and use the laws of logarithms. Solve equations and inequalities involving logarithms and exponentials.

### Example Question
Solve the equation $3^{2x+1} - 10(3^x) + 3 = 0$. [5]

### Mark Scheme / Solution
State or imply that $3^{2x+1} = 3 \cdot (3^x)^2$. M1
Let $y = 3^x$. The equation becomes $3y^2 - 10y + 3 = 0$. M1
Solving the quadratic equation: $(3y-1)(y-3) = 0$.
So $y = \frac{1}{3}$ or $y = 3$. A1
Substitute back:
If $3^x = 3$, then $x=1$. A1
If $3^x = \frac{1}{3} = 3^{-1}$, then $x=-1$. A1

### Standard Solution Steps
- Identify that the equation can be expressed as a polynomial, usually a quadratic, in terms of an exponential term (e.g., $e^x$, $3^x$).
- Use the laws of indices to separate terms, for example rewriting $3^{2x+1}$ as $3 \cdot (3^x)^2$.
- Make a substitution, such as $y = 3^x$, to form a standard polynomial equation.
- Solve the polynomial equation for the substitution variable $y$.
- Replace the substitution variable with the original exponential term (e.g., $3^x = y$).
- Solve for the final variable $x$ by using logarithms or by inspection if the base is the same.

### Common Mistakes
- Incorrectly applying index laws, for instance writing $3^{2x+1}$ as $3^{2x} + 3$ or $(3^x)^2 + 1$.
- Making errors when factorising or solving the resulting quadratic equation.
- Forgetting to solve for $x$ after finding the values for the substituted variable $y$.
- Discarding valid solutions, or incorrectly concluding there is no solution for an equation like $e^x = 0.5$. A positive result for $e^x$ always yields a valid real solution for $x$.

### Tags
logarithms, exponentials, solving_equations, quadratic_in_disguise, 3.2, indices

## Logarithmic and exponential functions: Modelling and Linearisation

**Syllabus Reference**: 9709.P3.3.2
**Learning Objective**: Use logarithms to transform a given relationship to a linear form, and hence determine unknown constants by calculating the gradient or intercept of the graph.

### Example Question
The variables $x$ and $y$ satisfy the equation $y = Ae^{kx}$, where $A$ and $k$ are constants. The graph of $\ln y$ against $x$ is a straight line passing through the points $(1, 4.5)$ and $(3, 7.1)$.

Find the values of $A$ and $k$, giving your answers correct to 2 significant figures. [5]

### Mark Scheme / Solution
Take natural logarithms of both sides of $y = Ae^{kx}$:
$\ln y = \ln(Ae^{kx})$
$\ln y = \ln A + \ln(e^{kx})$
$\ln y = kx + \ln A$. B1

This is a linear relationship between $\ln y$ and $x$. The gradient is $k$ and the vertical intercept is $\ln A$.
Calculate the gradient, $k$:
$k = \frac{7.1 - 4.5}{3 - 1} = \frac{2.6}{2} = 1.3$. M1 A1

To find $\ln A$, substitute one of the points into the linear equation $\ln y = 1.3x + \ln A$.
Using point $(1, 4.5)$: $4.5 = 1.3(1) + \ln A$. M1
$\ln A = 4.5 - 1.3 = 3.2$.
$A = e^{3.2} = 24.53... \approx 25$ (to 2 s.f.). A1

The values are $k = 1.3$ and $A = 25$.

### Standard Solution Steps
- Take logarithms (usually natural log, $\ln$, for base $e$) of both sides of the given non-linear equation.
- Use the laws of logarithms to rearrange the equation into the form $Y = mX + c$, where $Y$ and $X$ are functions of the original variables $y$ and $x$.
- Identify which parts of the equation correspond to the gradient $m$ and the intercept $c$.
- Use the given coordinates to calculate the gradient of the straight line.
- Use the gradient and one of the points to find the vertical intercept.
- Solve for the unknown constants by equating them to the calculated gradient and intercept.
- Ensure final answers are given to the required degree of accuracy.

### Common Mistakes
- Incorrectly applying logarithm laws. A common error is writing $\ln(A+B)$ as $\ln A + \ln B$. The correct law is $\ln(AB) = \ln A + \ln B$.
- Confusing the variables. For example, plotting $y$ against $\ln x$ instead of $\ln y$ against $x$.
- Mixing up the gradient and the intercept. For $y=Ae^{kx}$, the gradient is $k$ and the intercept is $\ln A$. For $y=Ax^k$, the gradient is $k$ and the intercept is $\ln A$, but the axes are $\ln y$ and $\ln x$.
- Calculation errors when finding the gradient or solving for the intercept.
- Forgetting to convert back from the logarithmic form, for example stating the final answer as $\ln A = 3.2$ instead of solving for $A$.

### Tags
logarithms, exponentials, linear_law, modelling, 3.2, linearisation, coordinate_geometry

## Logarithmic and exponential functions: Inequalities

**Syllabus Reference**: 9709.P3.3.2
**Learning Objective**: Solve inequalities involving logarithms and exponentials, understanding the domain restrictions for logarithmic functions.

### Example Question
Solve the inequality $\log_2(x-1) + \log_2(x+3) \leq 3$. [6]

### Mark Scheme / Solution
First, state the domain restrictions. For the logarithms to be defined:
$x - 1 > 0$ and $x + 3 > 0$
This gives $x > 1$ and $x > -3$
Therefore, the domain is $x > 1$. B1

Use the logarithm law $\log_a p + \log_a q = \log_a(pq)$:
$\log_2((x-1)(x+3)) \leq 3$ M1

Convert to exponential form:
$(x-1)(x+3) \leq 2^3$
$(x-1)(x+3) \leq 8$ A1

Expand the left side:
$x^2 + 3x - x - 3 \leq 8$
$x^2 + 2x - 3 \leq 8$
$x^2 + 2x - 11 \leq 0$ M1

Solve $x^2 + 2x - 11 = 0$ using the quadratic formula:
$x = \frac{-2 \pm \sqrt{4 + 44}}{2} = \frac{-2 \pm \sqrt{48}}{2} = \frac{-2 \pm 4\sqrt{3}}{2} = -1 \pm 2\sqrt{3}$ A1

The quadratic $x^2 + 2x - 11$ has roots at $x = -1 - 2\sqrt{3}$ and $x = -1 + 2\sqrt{3}$.
Since the coefficient of $x^2$ is positive, the parabola opens upward.
Therefore, $x^2 + 2x - 11 \leq 0$ when $-1 - 2\sqrt{3} \leq x \leq -1 + 2\sqrt{3}$. M1

Combining with the domain restriction $x > 1$:
Since $-1 + 2\sqrt{3} = -1 + 2(1.732...) = -1 + 3.464... = 2.464...$
The solution is $1 < x \leq -1 + 2\sqrt{3}$. A1

### Standard Solution Steps
- Identify and state the domain restrictions for all logarithmic terms
- Use logarithm laws to combine or simplify logarithmic expressions
- Convert the logarithmic inequality to exponential form
- Solve the resulting polynomial inequality
- Find the intersection of the solution with the domain restrictions
- Express the final answer clearly, often using exact values

### Common Mistakes
- Forgetting to state or apply domain restrictions for logarithmic functions
- Incorrectly applying logarithm laws, especially $\log(a+b) \neq \log a + \log b$
- Making sign errors when converting between logarithmic and exponential forms
- Solving the quadratic equation instead of the quadratic inequality
- Not checking that the final solution satisfies the original domain restrictions

### Tags
logarithms, inequalities, domain_restrictions, quadratic_inequalities, 3.2