## Probability Generating Functions: Sum of Independent Random Variables

**Syllabus Reference**: 4.5

**Learning Objective**: Use the result that the PGF of the sum of independent random variables is the product of the PGFs of those random variables.

### Example Question
The independent random variables $X$ and $Y$ have Poisson distributions with means $2.5$ and $3.5$ respectively. The random variable $Z$ is defined as $Z = X + Y$.

(a) State the probability generating functions, $G_X(t)$ and $G_Y(t)$, of $X$ and $Y$.

(b) Find the probability generating function of $Z$.

(c) Identify the distribution of $Z$, stating its parameter(s).

(d) Find $P(Z > 4)$.

### Mark Scheme / Solution
(a) The PGF for a Poisson distribution with mean $\lambda$ is $e^{\lambda(t-1)}$.
For $X \sim Po(2.5)$, $G_X(t) = e^{2.5(t-1)}$. B1
For $Y \sim Po(3.5)$, $G_Y(t) = e^{3.5(t-1)}$. B1

(b) Since $X$ and $Y$ are independent, $G_Z(t) = G_X(t) \times G_Y(t)$. M1
$G_Z(t) = e^{2.5(t-1)} \times e^{3.5(t-1)}$ M1
$G_Z(t) = e^{(2.5+3.5)(t-1)} = e^{6(t-1)}$. A1

(c) The PGF $G_Z(t) = e^{6(t-1)}$ is the PGF of a Poisson distribution. A1
The distribution is Poisson with parameter $\lambda = 6$. A1

(d) $Z \sim Po(6)$.
$P(Z > 4) = 1 - P(Z \le 4)$. M1
$P(Z \le 4) = P(Z=0) + P(Z=1) + P(Z=2) + P(Z=3) + P(Z=4)$
$P(Z \le 4) = e^{-6} \left( \frac{6^0}{0!} + \frac{6^1}{1!} + \frac{6^2}{2!} + \frac{6^3}{3!} + \frac{6^4}{4!} \right)$ M1
$P(Z \le 4) = e^{-6} (1 + 6 + 18 + 36 + 54) = e^{-6}(115)$.
$P(Z \le 4) \approx 0.00247875 \times 115 \approx 0.285056$
$P(Z > 4) = 1 - 0.285056 = 0.714944$.
So, $P(Z > 4) = 0.715$ (3 s.f.). A1

### Standard Solution Steps
- Identify the distributions of the individual random variables, $X$ and $Y$, and their parameters.
- State the standard form of the probability generating function for the identified distribution type.
- Substitute the parameters of $X$ and $Y$ to find their specific PGFs, $G_X(t)$ and $G_Y(t)$.
- Apply the property that for a sum of independent variables, $Z = X+Y$, the PGF is the product $G_Z(t) = G_X(t) G_Y(t)$.
- Multiply the PGFs and simplify the expression algebraically.
- Compare the resulting PGF with standard forms to identify the name and parameter(s) of the distribution of $Z$.
- Use the identified distribution of $Z$ to calculate any required probabilities.

### Common Mistakes
- Adding PGFs instead of multiplying them for the sum of independent variables.
- Using an incorrect formula for the PGF of a standard distribution (e.g., binomial, geometric, Poisson).
- Making algebraic errors when multiplying and simplifying the PGFs, especially with exponents.
- Forgetting to state both the name of the resulting distribution and its parameter(s).
- Calculation errors when finding probabilities from the final distribution, such as miscalculating factorials or using incorrect bounds for inequalities.

### Tags
probability_generating_functions, pgf, sum_of_independent_variables, poisson_distribution, syllabus_4_5