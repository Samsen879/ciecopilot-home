## Continuous Random Variables: Verifying a PDF and Finding the Mode

**Syllabus Reference**: 5.1a

**Learning Objective**: Understand and use probability density functions. Find the mode of a continuous random variable.

### Example Question
A continuous random variable $X$ has a probability density function (PDF) given by $f(x) = kx(4-x)$ for $0 \le x \le 4$, and $f(x) = 0$ otherwise.
(a) Show that $k = \frac{3}{32}$.
(b) Find the mode of the distribution.

### Mark Scheme / Solution
(a) For $f(x)$ to be a valid PDF, the total area under the curve must be 1.
$\int_{0}^{4} kx(4-x) \,dx = 1$ B1
$k \int_{0}^{4} (4x - x^2) \,dx = 1$
$k \left[ 2x^2 - \frac{x^3}{3} \right]_{0}^{4} = 1$ M1 for correct integration.
$k \left( (2(4^2) - \frac{4^3}{3}) - (0) \right) = 1$ M1 for substituting limits.
$k \left( 32 - \frac{64}{3} \right) = 1$
$k \left( \frac{96-64}{3} \right) = k \left( \frac{32}{3} \right) = 1$
So, $k = \frac{3}{32}$. A1

(b) The mode is the value of $x$ for which $f(x)$ is a maximum.
$f(x) = \frac{3}{32}(4x - x^2)$. To find the maximum, we find $f'(x)$ and set it to 0. M1
$f'(x) = \frac{3}{32}(4 - 2x)$
Setting $f'(x) = 0$ gives $4 - 2x = 0$, so $x = 2$.
To confirm it is a maximum, $f''(x) = \frac{3}{32}(-2) = -\frac{6}{32} < 0$.
The mode is $x=2$. A1

### Standard Solution Steps
- Step 1: Use the property that the total probability is 1, so $\int_{-\infty}^{\infty} f(x) \,dx = 1$.
- Step 2: Set up the definite integral over the given domain and solve for the constant $k$.
- Step 3: To find the mode, find the value of $x$ that maximizes the PDF. This is typically done by finding the first derivative of $f(x)$, setting it to zero, and solving for $x$.
- Step 4: Confirm the stationary point is a maximum using the second derivative test.

### Common Mistakes
- Incorrectly expanding the brackets before integration.
- Errors in the process of definite integration or arithmetic when solving for $k$.
- Forgetting that the mode corresponds to the maximum of the PDF, not the mean or median.
- Differentiating incorrectly or failing to check if the result is a maximum.

### Tags
continuous_random_variables, pdf, mode, integration, differentiation, syllabus_4_1

---
## Continuous Random Variables: CDF and Median

**Syllabus Reference**: 5.1b

**Learning Objective**: Find and use the cumulative distribution function (CDF). Find the median of a continuous random variable.

### Example Question
A continuous random variable $X$ has PDF $f(x) = \frac{3}{8}x^2$ for $0 \le x \le 2$, and $f(x)=0$ otherwise.
(a) Find the cumulative distribution function, $F(x)$.
(b) Hence, find the median value of $X$.

### Mark Scheme / Solution
(a) The CDF, $F(x)$, is the integral of the PDF, $f(t)$, from the lower bound to $x$. M1
For $0 \le x \le 2$:
$F(x) = \int_{0}^{x} \frac{3}{8}t^2 \,dt = \frac{3}{8} \left[ \frac{t^3}{3} \right]_{0}^{x}$ M1
$F(x) = \frac{3}{8} \left( \frac{x^3}{3} \right) = \frac{x^3}{8}$
So the full CDF is:
$F(x) = \begin{cases} 0 & x < 0 \\ \frac{x^3}{8} & 0 \le x \le 2 \\ 1 & x > 2 \end{cases}$ A1 for the correct piecewise function.

(b) The median, $m$, is the value for which $F(m)=0.5$. B1
$\frac{m^3}{8} = 0.5$ M1
$m^3 = 4$
$m = \sqrt[3]{4} \approx 1.59$ A1

### Standard Solution Steps
- Step 1: To find the CDF, $F(x)$, integrate the PDF, $f(t)$, from the minimum value of the domain up to $x$.
- Step 2: Remember to define the CDF for all real values of $x$, including the parts where $F(x)=0$ and $F(x)=1$.
- Step 3: To find the median $m$, set the CDF equal to $0.5$, so $F(m)=0.5$.
- Step 4: Solve the resulting equation for $m$.

### Common Mistakes
- Forgetting to define the CDF as a piecewise function.
- Integration errors when finding the CDF from the PDF.
- Setting the PDF equal to $0.5$ instead of the CDF.
- Algebraic errors when solving the equation $F(m) = 0.5$.

### Tags
continuous_random_variables, cdf, median, integration, syllabus_4_1

---
## Continuous Random Variables: Expectation and Variance

**Syllabus Reference**: 5.1c, 5.1d

**Learning Objective**: Calculate the expected value and variance of a continuous random variable.

### Example Question
The continuous random variable $X$ has PDF $f(x) = \frac{1}{2}x$ for $0 \le x \le 2$, and $f(x)=0$ otherwise.
(a) Find the expected value of $X$, $E(X)$.
(b) Find the variance of $X$, $Var(X)$.

### Mark Scheme / Solution
(a) $E(X) = \int_{-\infty}^{\infty} x f(x) \,dx$.
$E(X) = \int_{0}^{2} x \left( \frac{1}{2}x \right) \,dx = \int_{0}^{2} \frac{1}{2}x^2 \,dx$ M1 for correct setup.
$= \frac{1}{2} \left[ \frac{x^3}{3} \right]_{0}^{2}$ M1 for correct integration.
$= \frac{1}{2} \left( \frac{2^3}{3} - 0 \right) = \frac{1}{2} \left( \frac{8}{3} \right) = \frac{4}{3}$. A1

(b) $Var(X) = E(X^2) - [E(X)]^2$.
First, find $E(X^2) = \int_{-\infty}^{\infty} x^2 f(x) \,dx$.
$E(X^2) = \int_{0}^{2} x^2 \left( \frac{1}{2}x \right) \,dx = \int_{0}^{2} \frac{1}{2}x^3 \,dx$ M1 for correct setup of $E(X^2)$.
$= \frac{1}{2} \left[ \frac{x^4}{4} \right]_{0}^{2}$
$= \frac{1}{2} \left( \frac{2^4}{4} - 0 \right) = \frac{1}{2} \left( \frac{16}{4} \right) = 2$. A1
Now, use the variance formula:
$Var(X) = E(X^2) - [E(X)]^2 = 2 - \left(\frac{4}{3}\right)^2$ M1 for using the formula correctly.
$= 2 - \frac{16}{9} = \frac{18-16}{9} = \frac{2}{9}$. A1

### Standard Solution Steps
- Step 1: To find $E(X)$, calculate the integral of $x \cdot f(x)$ over the domain of $X$.
- Step 2: To find $Var(X)$, first calculate $E(X^2)$ by evaluating the integral of $x^2 \cdot f(x)$ over the domain.
- Step 3: Use the formula $Var(X) = E(X^2) - [E(X)]^2$.

### Common Mistakes
- Forgetting to multiply by $x$ when calculating $E(X)$ or by $x^2$ for $E(X^2)$.
- Confusing $E(X^2)$ with $[E(X)]^2$.
- Integration errors, particularly with powers of $x$.
- Forgetting to square the value of $E(X)$ in the final variance calculation.

### Tags
continuous_random_variables, expectation, mean, variance, integration, syllabus_4_1

---
## Continuous Random Variables: Moment Generating Function (MGF)

**Syllabus Reference**: 5.2a

**Learning Objective**: Understand and use moment generating functions (MGFs) to find the mean and variance.

### Example Question
A continuous random variable $X$ has an exponential distribution with PDF $f(x) = 2e^{-2x}$ for $x \ge 0$.
(a) Find the moment generating function, $M_X(t)$, of $X$.
(b) Use the MGF to find the mean, $E(X)$, and the variance, $Var(X)$.

### Mark Scheme / Solution
(a) The MGF is defined as $M_X(t) = E(e^{tx})$.
$M_X(t) = \int_{0}^{\infty} e^{tx} (2e^{-2x}) \,dx$ M1 for correct definition and setup.
$= \int_{0}^{\infty} 2e^{(t-2)x} \,dx$
$= 2 \left[ \frac{e^{(t-2)x}}{t-2} \right]_{0}^{\infty}$ M1 for correct integration.
For the integral to converge, we require $t-2 < 0$, so $t<2$.
The upper limit evaluates to 0 (as $e^{-\infty} \to 0$), and the lower limit is $e^0=1$.
$= 2 \left( 0 - \frac{1}{t-2} \right) = \frac{-2}{t-2} = \frac{2}{2-t}$, for $t<2$. A1

(b) To find the mean, we find the first derivative of the MGF and evaluate at $t=0$.
$M_X'(t) = \frac{d}{dt} (2(2-t)^{-1}) = 2(-1)(2-t)^{-2}(-1) = 2(2-t)^{-2}$ M1
$E(X) = M_X'(0) = 2(2-0)^{-2} = \frac{2}{4} = \frac{1}{2}$. A1
To find the variance, we first need $E(X^2)$ from the second derivative.
$M_X''(t) = \frac{d}{dt} (2(2-t)^{-2}) = 2(-2)(2-t)^{-3}(-1) = 4(2-t)^{-3}$ M1
$E(X^2) = M_X''(0) = 4(2-0)^{-3} = \frac{4}{8} = \frac{1}{2}$. A1
$Var(X) = E(X^2) - [E(X)]^2 = \frac{1}{2} - (\frac{1}{2})^2 = \frac{1}{2} - \frac{1}{4} = \frac{1}{4}$. M1 A1

### Standard Solution Steps
- Step 1: Use the definition $M_X(t) = E(e^{tx}) = \int e^{tx} f(x) \,dx$ to find the MGF.
- Step 2: Differentiate the MGF once and evaluate at $t=0$ to find the mean $E(X)$.
- Step 3: Differentiate the MGF a second time and evaluate at $t=0$ to find $E(X^2)$.
- Step 4: Use the formula $Var(X) = E(X^2) - [E(X)]^2$ to calculate the variance.

### Common Mistakes
- Incorrect integration, especially when combining exponential terms.
- Forgetting the condition for convergence of the integral (e.g., $t-2 < 0$).
- Errors in differentiation, particularly with the chain rule.
- Forgetting to evaluate the derivatives at $t=0$.
- Using $M_X''(0)$ as the variance instead of as $E(X^2)$.

### Tags
continuous_random_variables, mgf, moment_generating_function, expectation, variance, exponential_distribution, syllabus_4_1