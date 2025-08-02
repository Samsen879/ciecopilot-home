## Continuous Random Variables: PDF and CDF

**Syllabus Reference**: $6.4$

**Learning Objective**: Determine the value of an unknown constant in a probability density function and derive the corresponding cumulative distribution function.

### Example Question
The continuous random variable $X$ has probability density function $f(x)$ given by $f(x) = kx(4-x^2)$ for $0 \le x \le 2$, and $f(x) = 0$ otherwise, where $k$ is a constant. Show that $k = \frac{1}{4}$, find the cumulative distribution function, $F(x)$, of $X$, and find the median of $X$.

### Mark Scheme / Solution
For $f(x)$ to be a PDF, $\int_{-\infty}^{\infty} f(x) dx = 1$.
$\int_0^2 kx(4-x^2) dx = 1$
$k \int_0^2 (4x - x^3) dx = 1$
$k [2x^2 - \frac{x^4}{4}]_0^2 = 1$
$k [(2(2^2) - \frac{2^4}{4}) - (0)] = 1$
$k [8 - \frac{16}{4}] = 1$
$k(8-4) = 1$, so $4k = 1$, hence $k = \frac{1}{4}$.

To find the CDF, $F(x)$:
For $x < 0$, $F(x) = 0$.
For $0 \le x \le 2$, $F(x) = \int_0^x f(t) dt = \int_0^x \frac{1}{4}t(4-t^2) dt$.
$F(x) = \frac{1}{4} [2t^2 - \frac{t^4}{4}]_0^x$
$F(x) = \frac{1}{4} (2x^2 - \frac{x^4}{4}) = \frac{x^2}{2} - \frac{x^4}{16}$.
For $x > 2$, $F(x) = 1$.
The full CDF is:
$F(x) = \begin{cases} 0 & \text{for } x < 0 \\ \frac{x^2}{2} - \frac{x^4}{16} & \text{for } 0 \le x \le 2 \\ 1 & \text{for } x > 2 \end{cases}$

To find the median $m$, solve $F(m) = 0.5$.
$\frac{m^2}{2} - \frac{m^4}{16} = 0.5$
$8m^2 - m^4 = 8$
$m^4 - 8m^2 + 8 = 0$
Let $y = m^2$, so $y^2 - 8y + 8 = 0$.
$y = \frac{-(-8) \pm \sqrt{(-8)^2 - 4(1)(8)}}{2(1)} = \frac{8 \pm \sqrt{64-32}}{2} = \frac{8 \pm \sqrt{32}}{2} = 4 \pm 2\sqrt{2}$.
So $m^2 = 4 + 2\sqrt{2} \approx 6.828$ or $m^2 = 4 - 2\sqrt{2} \approx 1.172$.
Since $m$ must be in the interval $[0, 2]$, $m^2$ must be in $[0, 4]$.
We must choose $m^2 = 4 - 2\sqrt{2}$.
$m = \sqrt{4 - 2\sqrt{2}} \approx 1.082$.

### Standard Solution Steps
- To find the constant $k$, use the property that the total probability is $1$ by setting the definite integral of the PDF over its support equal to $1$.
- Solve the resulting equation for $k$.
- To find the CDF $F(x)$, integrate the PDF $f(t)$ from the lower bound of its support up to a variable $x$.
- Define the CDF piecewise, ensuring it is $0$ before the support begins and $1$ after the support ends.
- To find the median $m$, set the CDF equal to $0.5$, i.e., solve $F(m) = 0.5$, ensuring the solution for $m$ lies within the support of the distribution.

### Common Mistakes
- Integration errors, particularly with polynomials.
- Forgetting to use the property $\int f(x) dx = 1$ to find the constant.
- When finding the CDF, confusing the integration variable (e.g., $t$) with the upper limit of the integral ($x$).
- Failing to define the CDF piecewise for all values of $x$. Forgetting the cases $x < 0$ and $x > 2$.
- In solving for the median, not discarding the solution that falls outside the valid range of $X$.
- Algebraic errors when solving the equation for the median, which is often a quadratic in $x^2$.

### Tags
continuous_random_variables, pdf, cdf, constant_of_integration, median, integration, syllabus_6_4

## Continuous Random Variables: Expectation and Variance

**Syllabus Reference**: $6.4$

**Learning Objective**: Calculate the expectation $E(X)$ and variance $Var(X)$ for a continuous random variable given its probability density function.

### Example Question
A continuous random variable $X$ has the probability density function $f(x)$ given by $f(x) = \frac{3}{32}x(4-x)$ for $0 \le x \le 4$, and $f(x) = 0$ otherwise. Find the mean of $X$, $E(X)$, and the variance of $X$, $Var(X)$.

### Mark Scheme / Solution
The mean $E(X)$ is given by $\int_{-\infty}^{\infty} x f(x) dx$.
$E(X) = \int_0^4 x \left(\frac{3}{32}x(4-x)\right) dx = \frac{3}{32} \int_0^4 (4x^2 - x^3) dx$.
$E(X) = \frac{3}{32} [\frac{4x^3}{3} - \frac{x^4}{4}]_0^4$.
$E(X) = \frac{3}{32} [(\frac{4(4^3)}{3} - \frac{4^4}{4}) - 0] = \frac{3}{32} [\frac{256}{3} - 64]$.
$E(X) = \frac{3}{32} [\frac{256 - 192}{3}] = \frac{3}{32} [\frac{64}{3}] = 2$.

To find the variance, first find $E(X^2)$.
$E(X^2) = \int_{-\infty}^{\infty} x^2 f(x) dx = \int_0^4 x^2 \left(\frac{3}{32}x(4-x)\right) dx$.
$E(X^2) = \frac{3}{32} \int_0^4 (4x^3 - x^4) dx$.
$E(X^2) = \frac{3}{32} [x^4 - \frac{x^5}{5}]_0^4$.
$E(X^2) = \frac{3}{32} [4^4 - \frac{4^5}{5}] = \frac{3}{32} [256 - \frac{1024}{5}]$.
$E(X^2) = \frac{3}{32} [\frac{1280 - 1024}{5}] = \frac{3}{32} [\frac{256}{5}] = \frac{3 \times 8}{5} = \frac{24}{5} = 4.8$.
$Var(X) = E(X^2) - [E(X)]^2$.
$Var(X) = 4.8 - 2^2 = 4.8 - 4 = 0.8$.

### Standard Solution Steps
- To calculate $E(X)$, evaluate the integral of $x \cdot f(x)$ over the support of the random variable.
- To calculate $Var(X)$, first calculate $E(X^2)$ by evaluating the integral of $x^2 \cdot f(x)$ over the support.
- Use the formula $Var(X) = E(X^2) - [E(X)]^2$ to find the variance.
- Ensure all integration is performed correctly and the limits of integration correspond to the support of the PDF.

### Common Mistakes
- Using the incorrect formula for expectation, e.g., integrating $f(x)$ instead of $x \cdot f(x)$.
- Errors in calculating $E(X^2)$, such as integrating $x \cdot f(x)^2$ or $(x \cdot f(x))^2$.
- Simple arithmetic or algebraic errors when expanding brackets or performing the definite integration.
- Using an incorrect formula for variance, such as $E(X^2)$, $E(X^2) - E(X)$, or $(E(X^2) - E(X))^2$.
- Forgetting to square the mean, i.e., using $Var(X) = E(X^2) - E(X)$ instead of $Var(X) = E(X^2) - [E(X)]^2$.
- Premature rounding of intermediate results, leading to an inaccurate final answer.

### Tags
continuous_random_variables, expectation, variance, mean, moments, pdf, syllabus_6_4

## Continuous Random Variables: Moment Generating Functions

**Syllabus Reference**: $6.4$ (Extension)

**Learning Objective**: Use the moment generating function (MGF) of a continuous random variable to find its mean and variance, and to identify the distribution.

### Example Question
The moment generating function (MGF) of a continuous random variable $X$ is given by $M_X(t) = (1 - 4t)^{-3}$ for $t < \frac{1}{4}$. Find the mean and variance of $X$, and identify the distribution of $X$, stating the value of any parameters.

### Mark Scheme / Solution
$E(X) = M'_X(0)$.
$M'_X(t) = \frac{d}{dt}(1 - 4t)^{-3} = -3(1 - 4t)^{-4}(-4) = 12(1 - 4t)^{-4}$.
$E(X) = M'_X(0) = 12(1 - 0)^{-4} = 12$.
$E(X^2) = M''_X(0)$.
$M''_X(t) = \frac{d}{dt}(12(1 - 4t)^{-4}) = 12(-4)(1 - 4t)^{-5}(-4) = 192(1 - 4t)^{-5}$.
$E(X^2) = M''_X(0) = 192(1 - 0)^{-5} = 192$.
$Var(X) = E(X^2) - [E(X)]^2$.
$Var(X) = 192 - 12^2 = 192 - 144 = 48$.

The MGF of a Gamma distribution, $X \sim \text{Gamma}(\alpha, \lambda)$, is $M_X(t) = (\frac{\lambda}{\lambda - t})^\alpha = (1 - \frac{t}{\lambda})^{-\alpha}$.
Comparing $(1-4t)^{-3}$ with $(1 - \frac{t}{\lambda})^{-\alpha}$:
We can see that $\alpha = 3$.
And $\frac{1}{\lambda} = 4$, which implies $\lambda = \frac{1}{4}$.
So, $X$ has a Gamma distribution with shape parameter $\alpha=3$ and rate parameter $\lambda = \frac{1}{4}$.
Alternatively, some definitions use a scale parameter $\theta = 1/\lambda$. In that case, $X \sim \text{Gamma}(3, 4)$.

### Standard Solution Steps
- To find the mean $E(X)$, calculate the first derivative of the MGF, $M'_X(t)$, and evaluate it at $t=0$.
- To find $E(X^2)$, calculate the second derivative of the MGF, $M''_X(t)$, and evaluate it at $t=0$.
- Calculate the variance using the formula $Var(X) = E(X^2) - [E(X)]^2$.
- To identify the distribution, compare the given MGF to the standard forms of MGFs for known distributions (e.g., Exponential, Gamma, Normal).
- Match the form to determine the distribution's family and deduce the values of its parameters.

### Common Mistakes
- Errors in differentiation, particularly forgetting to apply the chain rule correctly.
- Evaluating the derivatives at $t=1$ instead of $t=0$.
- Forgetting that the second derivative gives $E(X^2)$, not the variance directly.
- Calculation error in the variance formula, especially forgetting to square $E(X)$.
- Inability to recognize the standard form of the MGF for common distributions.
- Confusing the parameters of the distribution (e.g., rate parameter $\lambda$ vs. scale parameter $\theta=1/\lambda$ for the Gamma or Exponential distribution).

### Tags
continuous_random_variables, moment_generating_function, mgf, expectation, variance, gamma_distribution, syllabus_6_4