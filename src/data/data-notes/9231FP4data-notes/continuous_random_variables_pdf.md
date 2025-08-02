## Continuous Random Variables: Probability Density Functions

**Syllabus Reference**: 4.1

**Learning Objective**: Use a probability density function which may be defined piecewise. Use the general result E(g(X)) = ∫g(x)f(x)dx where f(x) is the probability density function of the continuous random variable X and g(X) is a function of X. Understand and use the relationship between the probability density function (PDF) and the cumulative distribution function (CDF), and use either to evaluate probabilities or percentiles.

### Example Question
The continuous random variable $X$ has a probability density function $f(x)$ defined by:
$f(x) = k(x-1)^2$ for $1 \le x \le 3$,
$f(x) = 0$ otherwise.

(a) Show that the value of the constant $k$ is $3/8$.
(b) Find the expected value of $X$, $E(X)$.
(c) Find the median value of $X$.

### Mark Scheme / Solution
(a) To find the value of $k$, we use the property that the total probability is 1.
So, $\int_{1}^{3} k(x-1)^2 \,dx = 1$. M1
This gives $k[\frac{(x-1)^3}{3}]_{1}^{3} = 1$. A1
$k(\frac{(3-1)^3}{3} - \frac{(1-1)^3}{3}) = 1$.
$k(\frac{2^3}{3} - 0) = 1$.
$k(\frac{8}{3}) = 1$.
So, $k = 3/8$. A1

(b) The expected value is given by $E(X) = \int_{1}^{3} x \cdot f(x) \,dx$.
$E(X) = \int_{1}^{3} x \cdot \frac{3}{8}(x-1)^2 \,dx = \frac{3}{8} \int_{1}^{3} x(x^2 - 2x + 1) \,dx$. M1
$E(X) = \frac{3}{8} \int_{1}^{3} (x^3 - 2x^2 + x) \,dx$.
$E(X) = \frac{3}{8} [\frac{x^4}{4} - \frac{2x^3}{3} + \frac{x^2}{2}]_{1}^{3}$. A1
$E(X) = \frac{3}{8} [(\frac{81}{4} - \frac{54}{3} + \frac{9}{2}) - (\frac{1}{4} - \frac{2}{3} + \frac{1}{2})]$.
$E(X) = \frac{3}{8} [(\frac{81}{4} - 18 + \frac{9}{2}) - (\frac{3-8+6}{12})]$.
$E(X) = \frac{3}{8} [(\frac{81 - 72 + 18}{4}) - (\frac{1}{12})] = \frac{3}{8} [\frac{27}{4} - \frac{1}{12}]$.
$E(X) = \frac{3}{8} [\frac{81-1}{12}] = \frac{3}{8} \cdot \frac{80}{12} = \frac{240}{96} = \frac{5}{2}$. A1

(c) Let $m$ be the median. We must solve $\int_{1}^{m} f(x) \,dx = 0.5$.
$\int_{1}^{m} \frac{3}{8}(x-1)^2 \,dx = 0.5$. M1
$\frac{3}{8} [\frac{(x-1)^3}{3}]_{1}^{m} = 0.5$.
$\frac{1}{8} [(m-1)^3 - (1-1)^3] = 0.5$.
$\frac{1}{8}(m-1)^3 = 0.5$.
$(m-1)^3 = 4$. M1
$m-1 = \sqrt[3]{4}$.
$m = 1 + \sqrt[3]{4} \approx 2.59$. A1

### Standard Solution Steps
- Step 1: Normalize the PDF. Set up an integral of the function $f(x)$ over its defined range and equate it to 1. Solve this equation to find the value of the constant, $k$.
- Step 2: Calculate the expectation (mean). Set up the integral for $E(X)$ by calculating $\int x \cdot f(x) \,dx$ over the defined range, using the value of $k$ found in the first step.
- Step 3: Find the median. Set up an integral of $f(x)$ from the lower bound of the range to the median, $m$. Equate this integral to 0.5 and solve the resulting equation for $m$.

### Common Mistakes
- Integration errors, particularly when dealing with polynomials or functions like $(x-a)^n$.
- Using the wrong limits of integration for the given range of $X$. For this question, integrating from 0 instead of 1 is a frequent error.
- Forgetting to use the calculated value of $k$ in later parts of the question, such as calculating the mean or median.
- Algebraic errors when solving the final equation for the median, especially when it involves cube roots or other powers.
- Confusing $E(X)$ with $E(X^2)$ or $Var(X)$.

### Tags
- continuous random variables, probability density function, pdf, expectation, median, caie 9231, fp4, 4.1

---