## Linear Combinations of Random Variables: Expectation, Variance and Probabilities

### Example Question
The random variables $X$ and $Y$ are independent and have the following distributions: $X \sim N(50, 6)$ and $Y \sim N(40, 4)$.
- (i) Find the mean and variance of the random variable $W$, where $W = 3X + 2Y$.
- (ii) Find the probability $P(W > 240)$.
- (iii) Find the mean and variance of the random variable $Z$, where $Z = X - Y$.
- (iv) Find the probability that a random observation of $X$ is greater than a random observation of $Y$ by more than 12.

### Mark Scheme / Solution
- (i)
- To find the mean of $W$:
- $E(W) = E(3X + 2Y) = 3E(X) + 2E(Y)$ M1
- $E(W) = 3(50) + 2(40) = 150 + 80 = 230$ A1
- To find the variance of $W$:
- $Var(W) = Var(3X + 2Y) = 3^2Var(X) + 2^2Var(Y)$ M1
- $Var(W) = 9(6) + 4(4) = 54 + 16 = 70$ A1

- (ii)
- Since $X$ and $Y$ are normal, $W$ is also normally distributed. B1
- $W \sim N(230, 70)$
- We need to find $P(W > 240)$.
- Standardise the value: $Z = \frac{240 - 230}{\sqrt{70}}$ M1
- $Z = \frac{10}{\sqrt{70}} \approx 1.195$ A1
- $P(Z > 1.195) = 1 - P(Z < 1.195) = 1 - \Phi(1.195)$ M1
- From tables, $\Phi(1.195) = 0.8840$.
- $P(W > 240) = 1 - 0.8840 = 0.116$ A1

- (iii)
- To find the mean of $Z$:
- $E(Z) = E(X - Y) = E(X) - E(Y) = 50 - 40 = 10$ B1
- To find the variance of $Z$:
- $Var(Z) = Var(X - Y) = Var(X) + (-1)^2Var(Y) = Var(X) + Var(Y)$ M1
- $Var(Z) = 6 + 4 = 10$ A1

- (iv)
- We need to find $P(X > Y + 12)$, which is equivalent to $P(X - Y > 12)$, or $P(Z > 12)$. B1
- $Z \sim N(10, 10)$
- Standardise the value: $Z_{std} = \frac{12 - 10}{\sqrt{10}}$ M1
- $Z_{std} = \frac{2}{\sqrt{10}} \approx 0.632$ A1
- $P(Z > 12) = P(Z_{std} > 0.632) = 1 - \Phi(0.632)$ M1
- From tables, $\Phi(0.632) = 0.7363$.
- $P(Z > 12) = 1 - 0.7363 = 0.2637... = 0.264$ (3 s.f.) A1

### Standard Solution Steps
- To find the expectation of a linear combination $aX + bY$, use the formula $E(aX + bY) = aE(X) + bE(Y)$.
- To find the variance of a linear combination of independent variables $aX + bY$, use the formula $Var(aX + bY) = a^2Var(X) + b^2Var(Y)$.
- Note that for $X - Y$, the variance is $Var(X) + Var(Y)$, not $Var(X) - Var(Y)$.
- If the original variables are normally distributed, their linear combination is also normally distributed.
- State the new normal distribution with the calculated mean and variance, e.g., $W \sim N(E(W), Var(W))$.
- To find a probability, standardise the value using the new mean and variance: $Z = \frac{value - E(W)}{\sqrt{Var(W)}}$.
- Use standard normal distribution tables to find the required probability.

### Common Mistakes
- Forgetting to square the coefficients in the variance formula, e.g., calculating $Var(aX+bY)$ as $aVar(X) + bVar(Y)$.
- Subtracting variances for a difference, i.e., incorrectly using $Var(X - Y) = Var(X) - Var(Y)$. The variances are always added for a linear combination of independent variables.
- Using the standard deviation instead of the variance in the variance calculation, or vice-versa.
- Confusing $E(X^2)$ with $Var(X)$.
- Forgetting to take the square root of the new variance when standardising to find a probability.
- Errors in rearranging inequalities, for example, converting $P(X > Y + 12)$ to $P(X + Y > 12)$ instead of $P(X - Y > 12)$.
- Making calculation errors when finding the mean or variance.

### Tags
- linear combination of random variables, expectation, variance, normal distribution, independence, probability calculations