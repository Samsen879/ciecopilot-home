## Linear Combinations of Random Variables: Expectation and Variance

**Syllabus Reference**: S9 6.2

**Learning Objective**: Use formulae for the expectation and variance of linear combinations of independent random variables.

### Example Question
The weights of apples of variety A, in grams, are normally distributed with mean $155$ and standard deviation $12$. The weights of apples of variety B, in grams, are normally distributed with mean $165$ and standard deviation $15$. The weights are independent. Find the mean and variance of the total weight of $3$ apples of variety A and $2$ apples of variety B.

### Mark Scheme / Solution
Let $A$ be the weight of an apple of variety A and $B$ be the weight of an apple of variety B.
We have $A \sim N(155, 12^2)$ and $B \sim N(165, 15^2)$. (B1)
Let $T$ be the total weight, so $T = A_1 + A_2 + A_3 + B_1 + B_2$.
$E(T) = E(A_1 + A_2 + A_3 + B_1 + B_2) = 3E(A) + 2E(B)$. (M1)
$E(T) = 3(155) + 2(165) = 465 + 330 = 795$. (A1)
$Var(T) = Var(A_1 + A_2 + A_3 + B_1 + B_2) = 3Var(A) + 2Var(B)$ because they are independent. (M1)
$Var(T) = 3(12^2) + 2(15^2) = 3(144) + 2(225) = 432 + 450 = 882$. (A1)
So, the mean is $795$ and the variance is $882$.

### Standard Solution Steps
- Identify the distributions of the individual random variables, $X$ and $Y$, including their means and variances.
- Define the new variable, $W$, as a linear combination, e.g., $W = aX + bY$.
- State and apply the formula for the expectation: $E(W) = aE(X) + bE(Y)$.
- State and apply the formula for the variance: $Var(W) = a^2Var(X) + b^2Var(Y)$.
- Ensure the final answer provides both the mean and variance as requested.

### Common Mistakes
- Forgetting to square the coefficients in the variance formula, calculating $aVar(X) + bVar(Y)$ instead of $a^2Var(X) + b^2Var(Y)$.
- Incorrectly adding variances for a difference, e.g., calculating $Var(X-Y) = Var(X) - Var(Y)$. Variances are always added for independent variables.
- Using the standard deviation instead of the variance in the formula.

### Tags
linear_combinations, expectation, variance, normal_distribution, sum_of_random_variables

---
## Linear Combinations of Random Variables: Probabilities for Normal Linear Combinations

**Syllabus Reference**: S9 6.2

**Learning Objective**: Use the property that a linear combination of independent normal variables is itself normally distributed to find probabilities.

### Example Question
The time, $X$ minutes, taken by a student to complete a task is normally distributed with mean $25$ and variance $9$. The time, $Y$ minutes, taken by another student to complete the same task is an independent normal random variable with mean $22$ and variance $7$. Find the probability that the first student takes less than $1.5$ times as long as the second student.

### Mark Scheme / Solution
We are given $X \sim N(25, 9)$ and $Y \sim N(22, 7)$.
We need to find $P(X < 1.5Y)$, which is the same as $P(X - 1.5Y < 0)$. (B1)
Let the new random variable be $W = X - 1.5Y$.
$E(W) = E(X) - 1.5E(Y) = 25 - 1.5(22) = 25 - 33 = -8$. (M1)
$Var(W) = Var(X) + (-1.5)^2Var(Y) = 9 + (2.25)(7) = 9 + 15.75 = 24.75$. (M1)
So, $W \sim N(-8, 24.75)$. (A1)
We now find $P(W < 0)$.
$Z = \frac{W - E(W)}{\sqrt{Var(W)}} = \frac{0 - (-8)}{\sqrt{24.75}} = \frac{8}{4.9749...} = 1.6081...$ (M1)
$P(Z < 1.608) = \Phi(1.608)$. (M1)
From tables, this probability is $0.9461$. (A1)

### Standard Solution Steps
- Define the new random variable, $W$, as a linear combination based on the inequality in the question.
- Calculate the expectation, $E(W)$, using $E(aX + bY) = aE(X) + bE(Y)$.
- Calculate the variance, $Var(W)$, using $Var(aX + bY) = a^2Var(X) + b^2Var(Y)$.
- State the distribution of the new variable, $W \sim N(E(W), Var(W))$.
- Standardize the required value using the calculated mean and standard deviation of $W$.
- Use the standard normal distribution to find the final probability.

### Common Mistakes
- Incorrectly forming the inequality, e.g., $P(1.5X < Y)$.
- Subtracting variances when the linear combination involves a difference, i.e., calculating $Var(X) - (1.5)^2Var(Y)$.
- Forgetting to square the coefficient for the variance calculation, i.e., using $1.5$ instead of $(1.5)^2$.
- Errors in standardizing, such as dividing by the variance instead of the standard deviation.

### Tags
linear_combinations, probability, normal_distribution, standardization, difference_of_variables

---
## Linear Combinations of Random Variables: Difference of Sample Means

**Syllabus Reference**: S9 6.2

**Learning Objective**: Solve problems involving the distribution of the difference between two sample means from normal populations.

### Example Question
The mass of a brand A biscuit is normally distributed with mean $10.2$g and standard deviation $0.4$g. The mass of a brand B biscuit is normally distributed with mean $10.5$g and standard deviation $0.3$g. A random sample of $10$ brand A biscuits and a random sample of $12$ brand B biscuits are taken. Find the probability that the mean mass of the brand A sample is greater than the mean mass of the brand B sample.

### Mark Scheme / Solution
Let $A$ be the mass of a brand A biscuit and $B$ be the mass of a brand B biscuit.
$A \sim N(10.2, 0.4^2)$ and $B \sim N(10.5, 0.3^2)$.
Let $\bar{A}$ be the sample mean for $10$ brand A biscuits and $\bar{B}$ be the sample mean for $12$ brand B biscuits.
The distribution of the sample mean $\bar{A}$ is $\bar{A} \sim N(10.2, \frac{0.4^2}{10})$. (M1)
$\bar{A} \sim N(10.2, 0.016)$.
The distribution of the sample mean $\bar{B}$ is $\bar{B} \sim N(10.5, \frac{0.3^2}{12})$. (M1)
$\bar{B} \sim N(10.5, 0.0075)$.
We want to find $P(\bar{A} > \bar{B})$, which is $P(\bar{A} - \bar{B} > 0)$.
Let $D = \bar{A} - \bar{B}$.
$E(D) = E(\bar{A}) - E(\bar{B}) = 10.2 - 10.5 = -0.3$. (M1)
$Var(D) = Var(\bar{A}) + Var(\bar{B}) = 0.016 + 0.0075 = 0.0235$. (M1)
So, $D \sim N(-0.3, 0.0235)$. (A1)
$P(D > 0) = P(Z > \frac{0 - (-0.3)}{\sqrt{0.0235}}) = P(Z > \frac{0.3}{0.15329...})$. (M1)
$P(Z > 1.957) = 1 - \Phi(1.957) = 1 - 0.9748 = 0.0252$. (A1)

### Standard Solution Steps
- Identify the distributions of the parent populations, $X$ and $Y$.
- Determine the distributions of the sample means, $\bar{X}$ and $\bar{Y}$, using the fact that $E(\bar{X}) = \mu$ and $Var(\bar{X}) = \frac{\sigma^2}{n}$.
- Define the new variable as the difference between the sample means, $D = \bar{X} - \bar{Y}$.
- Calculate the expectation, $E(D) = E(\bar{X}) - E(\bar{Y})$.
- Calculate the variance, $Var(D) = Var(\bar{X}) + Var(\bar{Y})$.
- State the normal distribution for $D$.
- Standardize the value $0$ and find the required probability.

### Common Mistakes
- Using the population variance, $\sigma^2$, for the variance of the sample mean instead of $\frac{\sigma^2}{n}$.
- Forgetting to add the variances for the difference of the means.
- Making calculation errors when finding the variance of the sample means.
- Standardizing using the population standard deviation instead of the standard deviation of the sample mean.

### Tags
sample_mean, central_limit_theorem, linear_combinations, normal_distribution, difference_of_means