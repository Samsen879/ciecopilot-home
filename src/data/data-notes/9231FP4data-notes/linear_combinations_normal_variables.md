## Linear Combinations of Random Variables: Normal Variables

**Syllabus Reference**: Assumed Knowledge for 9231/4.2

**Learning Objective**: Use the property that a linear combination of independent normal random variables is itself normally distributed.

### Example Question
The weights of adult male penguins of a certain species, $M$, are normally distributed with a mean of 30 kg and a standard deviation of 2.5 kg. The weights of adult female penguins of the same species, $F$, are normally distributed with a mean of 24 kg and a standard deviation of 2 kg. The weights are independent.

Find the probability that the weight of a randomly chosen male penguin is less than the total weight of two randomly chosen female penguins.

### Mark Scheme / Solution
Let $M \sim N(30, 2.5^2)$ and $F \sim N(24, 2^2)$. B1
We need to find $P(M < F_1 + F_2)$.
Let the new random variable be $X = F_1 + F_2 - M$.
The mean of X is $E(X) = E(F_1) + E(F_2) - E(M) = 24 + 24 - 30 = 18$. M1
The variance of X is $Var(X) = Var(F_1) + Var(F_2) + (-1)^2Var(M)$. M1
So $Var(X) = Var(F) + Var(F) + Var(M) = 2^2 + 2^2 + 2.5^2 = 4 + 4 + 6.25 = 14.25$. M1 A1
Therefore, the distribution of the new variable is $X \sim N(18, 14.25)$. A1
We are finding the probability $P(X > 0)$. M1
Standardising the value of 0 gives $Z = (0 - 18) / \sqrt{14.25}$.
$Z = -18 / 3.7749... \approx -4.768$. A1
$P(X > 0) = P(Z > -4.768) = \Phi(4.768)$.
This value is very close to 1. The probability is $0.999999...$.
The final answer is $0.999999$ (to 6 s.f.) or effectively 1. A1

### Standard Solution Steps
- Identify the independent normal random variables and state their distributions, $X \sim N(\mu_X, \sigma_X^2)$ and $Y \sim N(\mu_Y, \sigma_Y^2)$.
- Define a new random variable representing the required linear combination, such as $L = aX + bY$.
- Calculate the mean of the new variable using the formula $E(L) = aE(X) + bE(Y)$.
- Calculate the variance of the new variable using the formula $Var(L) = a^2Var(X) + b^2Var(Y)$.
- State the full distribution of the new variable, $L \sim N(E(L), Var(L))$.
- Formulate the probability statement required by the question, for example $P(L > k)$.
- Standardise the value of interest, $k$, using the Z-score formula: $Z = (k - E(L)) / \sqrt{Var(L)}$.
- Use standard normal distribution tables or a calculator to find the final probability.

### Common Mistakes
- Subtracting variances for a difference, such as $Var(X - Y)$. The variances of independent variables are always added, so $Var(X - Y) = Var(X) + Var(Y)$.
- Forgetting to square the coefficients when calculating the new variance. The correct formula is $Var(aX + bY) = a^2Var(X) + b^2Var(Y)$, not $aVar(X) + bVar(Y)$.
- Using the standard deviation instead of the variance in the combination formulae. Remember to square the standard deviation to get the variance before combining.
- Mistake in setting up the inequality. For example, for "weight of A is more than twice the weight of B", setting up $P(A < 2B)$ instead of $P(A > 2B)$, which is $P(A - 2B > 0)$.

### Tags
- linear combinations, normal distribution, 9231, further probability, assumed knowledge, random variables, 9709

---