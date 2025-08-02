## Continuous Random Variables: Piecewise PDF and CDF
**Syllabus Reference**: 4.1
**Learning Objective**: Use a probability density function which may be defined piecewise.
### Example Question
A continuous random variable $X$ has a probability density function $f(x)$ defined as:
$f(x) = kx$ for $0 \le x \le 2$
$f(x) = k(4-x)$ for $2 < x \le 4$
$f(x) = 0$ otherwise.
(a) Show that $k = \frac{1}{4}$.
(b) Find the cumulative distribution function, $F(x)$.
(c) Find the median of $X$.
### Mark Scheme / Solution
(a)
Total probability is 1, so $\int_{0}^{4} f(x) dx = 1$. (M1)
$\int_{0}^{2} kx dx + \int_{2}^{4} k(4-x) dx = 1$
$k[\frac{x^2}{2}]_{0}^{2} + k[4x - \frac{x^2}{2}]_{2}^{4} = 1$ (A1)
$k(\frac{4}{2} - 0) + k((16 - \frac{16}{2}) - (8 - \frac{4}{2})) = 1$
$2k + k((8) - (6)) = 1$ (M1)
$2k + 2k = 1$, so $4k=1$, hence $k = \frac{1}{4}$. (A1)

(b)
For $0 \le x \le 2$:
$F(x) = \int_{0}^{x} \frac{1}{4}t dt = [\frac{t^2}{8}]_{0}^{x} = \frac{x^2}{8}$ (M1 A1)
For $2 < x \le 4$:
$F(x) = F(2) + \int_{2}^{x} \frac{1}{4}(4-t) dt$ (M1)
$F(x) = \frac{2^2}{8} + \frac{1}{4}[4t - \frac{t^2}{2}]_{2}^{x}$
$F(x) = \frac{1}{2} + \frac{1}{4}((4x - \frac{x^2}{2}) - (8 - \frac{4}{2})) = \frac{1}{2} + \frac{1}{4}(4x - \frac{x^2}{2} - 6)$
$F(x) = \frac{1}{2} + x - \frac{x^2}{8} - \frac{3}{2} = x - \frac{x^2}{8} - 1$ (A1)
The full CDF is:
$F(x) = 0$ for $x < 0$
$F(x) = \frac{x^2}{8}$ for $0 \le x \le 2$
$F(x) = x - \frac{x^2}{8} - 1$ for $2 < x \le 4$
$F(x) = 1$ for $x > 4$ (B1 for correct structure)

(c)
To find the median $m$, we set $F(m) = 0.5$.
$F(2) = \frac{2^2}{8} = \frac{4}{8} = 0.5$. (M1)
Therefore, the median of $X$ is 2. (A1)
### Standard Solution Steps
- Use the property that the total integral of a PDF over its domain is 1.
- Split the integral according to the piecewise definition to solve for the constant $k$.
- Find the CDF by integrating the PDF. For the second piece, calculate the value of the CDF at the join point (e.g., $F(2)$) and add the integral from that point to $x$.
- Set the CDF equal to 0.5 to find the median.
- Check which interval the median lies in. In this case, it lies exactly on the boundary.
### Common Mistakes
- Incorrectly setting up the integral for the total probability.
- When finding the CDF for the second interval, forgetting to add the accumulated probability from the first interval ($F(2)$).
- Algebraic errors when integrating or simplifying the CDF expression.
- Assuming the median must be in the middle of the range without calculation.
### Tags
- pdf, cdf, piecewise, median, integration
---
## Continuous Random Variables: Expectation and Variance
**Syllabus Reference**: 4.1
**Learning Objective**: Use the general result E(g(X)) = ∫g(x)f(x)dx where f(x) is the probability density function of the continuous random variable X and g(X) is a function of X.
### Example Question
The continuous random variable $X$ has probability density function $f(x)$ given by
$f(x) = \frac{3}{4}(2x - x^2)$ for $0 \le x \le 2$
$f(x) = 0$ otherwise.
(a) Find $E(X)$.
(b) Find $Var(X)$.
### Mark Scheme / Solution
(a)
$E(X) = \int_{0}^{2} x f(x) dx = \int_{0}^{2} x \frac{3}{4}(2x - x^2) dx$ (M1)
$= \frac{3}{4} \int_{0}^{2} (2x^2 - x^3) dx$
$= \frac{3}{4} [\frac{2x^3}{3} - \frac{x^4}{4}]_{0}^{2}$ (A1)
$= \frac{3}{4} ((\frac{2(8)}{3} - \frac{16}{4}) - 0) = \frac{3}{4} (\frac{16}{3} - 4)$ (M1)
$= \frac{3}{4} (\frac{16-12}{3}) = \frac{3}{4} (\frac{4}{3}) = 1$. (A1)

(b)
First find $E(X^2) = \int_{0}^{2} x^2 f(x) dx = \int_{0}^{2} x^2 \frac{3}{4}(2x - x^2) dx$ (M1)
$= \frac{3}{4} \int_{0}^{2} (2x^3 - x^4) dx$
$= \frac{3}{4} [\frac{2x^4}{4} - \frac{x^5}{5}]_{0}^{2} = \frac{3}{4} [\frac{x^4}{2} - \frac{x^5}{5}]_{0}^{2}$ (A1)
$= \frac{3}{4} ((\frac{16}{2} - \frac{32}{5}) - 0) = \frac{3}{4} (8 - \frac{32}{5})$
$= \frac{3}{4} (\frac{40-32}{5}) = \frac{3}{4} (\frac{8}{5}) = \frac{6}{5} = 1.2$. (A1)
$Var(X) = E(X^2) - [E(X)]^2$. (M1)
$Var(X) = 1.2 - 1^2 = 0.2$. (A1)
### Standard Solution Steps
- To find the expectation $E(X)$, evaluate the definite integral of $x \cdot f(x)$ over the entire range of $X$.
- To find the variance, first find $E(X^2)$ by evaluating the definite integral of $x^2 \cdot f(x)$.
- Apply the variance formula: $Var(X) = E(X^2) - [E(X)]^2$.
- Perform the polynomial multiplication and integration carefully.
- Substitute the limits of integration correctly.
### Common Mistakes
- Errors in the initial multiplication of $x \cdot f(x)$ or $x^2 \cdot f(x)$.
- Mistakes during integration, such as incorrect powers or coefficients.
- Calculation errors when substituting the limits of the integral.
- Forgetting to square the mean, $[E(X)]^2$, in the variance formula.
- Confusing $E(X^2)$ with $Var(X)$.
### Tags
- expectation, variance, continuous random variable, pdf, integration, moments
---
## Continuous Random Variables: Functions of Random Variables
**Syllabus Reference**: 4.1
**Learning Objective**: Use cumulative distribution functions (CDFs) of related variables in simple cases (e.g., given the CDF of X, find the CDF of Y=X³).
### Example Question
The continuous random variable $X$ has the cumulative distribution function $F(x)$ given by
$F(x) = 0$ for $x < 0$
$F(x) = \frac{x^3}{27}$ for $0 \le x \le 3$
$F(x) = 1$ for $x > 3$.
The random variable $Y$ is defined by $Y = X^2$.
Find the probability density function of $Y$.
### Mark Scheme / Solution
Let $G(y)$ be the CDF of $Y$.
$G(y) = P(Y \le y) = P(X^2 \le y)$. (M1)
Since $X$ is non-negative, this is equivalent to $P(X \le \sqrt{y})$. (M1)
This is equal to $F_X(\sqrt{y})$.
$G(y) = \frac{(\sqrt{y})^3}{27} = \frac{y^{3/2}}{27}$. (A1)
We must find the range for $y$. Since $0 \le x \le 3$, we have $0^2 \le x^2 \le 3^2$, so $0 \le y \le 9$. (B1)
To find the PDF of $Y$, $f_Y(y)$, we differentiate the CDF $G(y)$ with respect to $y$.
$f_Y(y) = \frac{d}{dy} G(y) = \frac{d}{dy} (\frac{y^{3/2}}{27})$. (M1)
$f_Y(y) = \frac{1}{27} \cdot \frac{3}{2} y^{1/2} = \frac{1}{18} \sqrt{y}$ for $0 \le y \le 9$. (A1)
The complete PDF is:
$f_Y(y) = \frac{1}{18}\sqrt{y}$ for $0 \le y \le 9$
$f_Y(y) = 0$ otherwise. (A1 for full definition)
### Standard Solution Steps
- Define the CDF of the new variable, $Y$, as $G(y) = P(Y \le y)$.
- Substitute the definition of $Y$ in terms of $X$ into the probability statement.
- Rearrange the inequality to be in terms of $X$ (e.g., $P(X \le ...)$).
- Use the given CDF of $X$ to write an expression for the CDF of $Y$.
- Determine the correct range for the new variable $Y$ based on the range of $X$.
- Differentiate the CDF of $Y$ to find the PDF of $Y$.
- State the final PDF with its valid range.
### Common Mistakes
- Incorrectly rearranging the inequality, especially if negative values were possible.
- Forgetting to determine the new range for $Y$.
- Errors in differentiation, particularly with fractional powers.
- Confusing the PDF and CDF, for example by trying to differentiate the PDF of X.
- Leaving the answer as the CDF instead of finding the PDF.
### Tags
- cdf, pdf, transformation, function of a random variable, differentiation, jacobian method