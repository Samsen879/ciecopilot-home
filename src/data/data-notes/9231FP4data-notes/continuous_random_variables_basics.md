## Continuous Random Variables: Probability Density Function (PDF)
**Syllabus Reference**: 6.1
**Learning Objective**: Understand and use the properties of a probability density function, and calculate probabilities.
### Example Question
The continuous random variable $X$ has a probability density function given by
$f(x) = \begin{cases} kx^2 & 0 \le x \le 3 \\ 0 & \text{otherwise} \end{cases}$
- Find the value of the constant $k$.
- Find $P(1 \le X \le 2)$.
### Mark Scheme / Solution
$\int_{0}^{3} kx^2 dx = 1$ M1
$k \left[ \frac{x^3}{3} \right]_{0}^{3} = 1$ M1
$k \left( \frac{3^3}{3} - 0 \right) = 1$
$k(9) = 1$ A1
$k = \frac{1}{9}$ A1
$P(1 \le X \le 2) = \int_{1}^{2} \frac{1}{9}x^2 dx$ M1
$= \frac{1}{9} \left[ \frac{x^3}{3} \right]_{1}^{2}$ M1
$= \frac{1}{27} [x^3]_{1}^{2}$
$= \frac{1}{27} (2^3 - 1^3)$ A1
$= \frac{7}{27}$ A1
### Standard Solution Steps
- Set the definite integral of the PDF over its entire range equal to 1.
- Solve the resulting equation to find the value of the unknown constant $k$.
- To find the probability for a given interval, integrate the PDF over that interval.
- Substitute the limits of the interval into the integrated function and calculate the final probability.
### Common Mistakes
- Forgetting to set the total integral of the PDF to 1.
- Making errors during the integration of the polynomial function.
- Using incorrect limits of integration when finding the constant or a specific probability.
- Leaving the constant $k$ in the final probability calculation instead of substituting its value.
### Tags
continuous_random_variables, pdf, probability_density_function, integration, constant_of_proportionality
---
## Continuous Random Variables: Cumulative Distribution Function (CDF)
**Syllabus Reference**: 6.2
**Learning Objective**: Understand the relationship between the cumulative distribution function and the probability density function, and use the CDF to calculate probabilities.
### Example Question
The continuous random variable $X$ has probability density function
$f(x) = \begin{cases} \frac{1}{8}x & 0 \le x \le 4 \\ 0 & \text{otherwise} \end{cases}$
Find the cumulative distribution function, $F(x)$, of $X$.
Hence, find $P(X > 3)$.
### Mark Scheme / Solution
For $0 \le x \le 4$, $F(x) = \int_{0}^{x} \frac{1}{8}t dt$ M1
$= \left[ \frac{t^2}{16} \right]_{0}^{x} = \frac{x^2}{16}$ A1
The full CDF is:
$F(x) = \begin{cases} 0 & x < 0 \\ \frac{x^2}{16} & 0 \le x \le 4 \\ 1 & x > 4 \end{cases}$ B1
To find $P(X > 3)$:
$P(X > 3) = 1 - P(X \le 3) = 1 - F(3)$ M1
$1 - F(3) = 1 - \frac{3^2}{16}$ A1
$= 1 - \frac{9}{16} = \frac{7}{16}$ A1
### Standard Solution Steps
- Define the CDF $F(x)$ as a piecewise function covering all real numbers.
- For the active range of the PDF, find $F(x)$ by integrating the PDF $f(t)$ from the lower bound of the range up to a variable $x$.
- Define $F(x) = 0$ for values below the range and $F(x) = 1$ for values above the range.
- To find $P(X > a)$, calculate $1 - F(a)$. To find $P(a < X < b)$, calculate $F(b) - F(a)$.
### Common Mistakes
- Confusing the PDF with the CDF.
- Incorrectly defining the piecewise intervals for the CDF.
- Forgetting that $F(x) = 1$ for all values of $x$ above the upper limit of the PDF's range.
- Calculation errors when using the CDF, for example calculating $P(X > a)$ as $F(a)$.
### Tags
continuous_random_variables, cdf, cumulative_distribution_function, pdf, integration, piecewise_function
---
## Continuous Random Variables: Mean and Variance
**Syllabus Reference**: 6.3
**Learning Objective**: Calculate the expectation (mean) and variance of a continuous random variable.
### Example Question
A continuous random variable $X$ has the probability density function
$f(x) = \begin{cases} \frac{3}{32}x(4-x) & 0 \le x \le 4 \\ 0 & \text{otherwise} \end{cases}$
Find the mean, $E(X)$, and the variance, $Var(X)$, of the distribution.
### Mark Scheme / Solution
$E(X) = \int_{0}^{4} x \left( \frac{3}{32}x(4-x) \right) dx$ M1
$= \frac{3}{32} \int_{0}^{4} (4x^2 - x^3) dx$ B1
$= \frac{3}{32} \left[ \frac{4x^3}{3} - \frac{x^4}{4} \right]_{0}^{4}$ M1
$= \frac{3}{32} \left( \frac{4(4^3)}{3} - \frac{4^4}{4} \right) = \frac{3}{32} \left( \frac{256}{3} - 64 \right) = 2$ A1
$E(X^2) = \int_{0}^{4} x^2 \left( \frac{3}{32}x(4-x) \right) dx$ M1
$= \frac{3}{32} \int_{0}^{4} (4x^3 - x^4) dx$
$= \frac{3}{32} \left[ x^4 - \frac{x^5}{5} \right]_{0}^{4}$ M1
$= \frac{3}{32} \left( 4^4 - \frac{4^5}{5} \right) = \frac{3}{32} \left( 256 - \frac{1024}{5} \right) = 4.8$ A1
$Var(X) = E(X^2) - [E(X)]^2 = 4.8 - 2^2$ M1
$= 0.8$ A1
### Standard Solution Steps
- Calculate the mean $E(X)$ by evaluating the integral $\int x f(x) dx$ over the appropriate range.
- Calculate $E(X^2)$ by evaluating the integral $\int x^2 f(x) dx$ over the appropriate range.
- Use the formula $Var(X) = E(X^2) - [E(X)]^2$ to find the variance.
- Ensure algebraic expansion of $x f(x)$ and $x^2 f(x)$ is correct before integrating.
### Common Mistakes
- Errors in algebraic expansion before integration.
- Errors in the process of definite integration.
- Confusing $[E(X)]^2$ with $E(X^2)$.
- Forgetting to square the mean when calculating the variance.
### Tags
mean, expectation, variance, continuous_random_variables, pdf, integration
---
## Continuous Random Variables: Median and Quartiles
**Syllabus Reference**: 6.4
**Learning Objective**: Understand the concept of the median and quartiles of a continuous random variable and calculate their values.
### Example Question
The continuous random variable $X$ has PDF given by
$f(x) = \begin{cases} \frac{3}{8}x^2 & 0 \le x \le 2 \\ 0 & \text{otherwise} \end{cases}$
Find the median value of $X$.
### Mark Scheme / Solution
Let $m$ be the median.
$\int_{0}^{m} \frac{3}{8}x^2 dx = 0.5$ M1
$\left[ \frac{3}{8} \frac{x^3}{3} \right]_{0}^{m} = 0.5$
$\left[ \frac{x^3}{8} \right]_{0}^{m} = 0.5$ M1
$\frac{m^3}{8} - 0 = 0.5$ A1
$m^3 = 4$ M1
$m = \sqrt[3]{4}$ A1
### Standard Solution Steps
- Set up the equation for the median $m$ using the definition $P(X \le m) = 0.5$.
- This translates to the integral equation $\int_{a}^{m} f(x) dx = 0.5$, where $a$ is the lower bound of the PDF's domain.
- Evaluate the integral to get an equation in terms of $m$.
- Solve the equation for $m$.
- The same principle applies for quartiles, using 0.25 for the lower quartile and 0.75 for the upper quartile.
### Common Mistakes
- Confusing the median with the mean (expectation). They are not the same unless the distribution is symmetric.
- Setting the PDF $f(m)$ equal to 0.5 instead of the integral.
- Making algebraic errors when solving the final equation for $m$.
- Using incorrect limits on the integral.
### Tags
median, quartiles, continuous_random_variables, pdf, integration, cdf
---