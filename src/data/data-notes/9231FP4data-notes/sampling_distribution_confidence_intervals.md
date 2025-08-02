## Sampling and Estimation: Distribution of the Sample Mean

**Syllabus Reference**: 7.1 Concepts of population and sample

**Learning Objective**: Recall and use the distribution of the sample mean for a random sample from a normal distribution.

### Example Question
The mass, in grams, of a randomly chosen apple of a certain variety is modelled by the random variable $X$, where $X \sim N(210, 15^2)$. A random sample of 10 such apples is selected. Find the probability that the mean mass of these 10 apples is greater than 215 grams.

### Mark Scheme / Solution
Let $\bar{X}$ be the sample mean mass of the 10 apples.
The distribution of the sample mean $\bar{X}$ is given by $\bar{X} \sim N(\mu, \frac{\sigma^2}{n})$. B1
Given $\mu = 210$, $\sigma = 15$, and $n = 10$.
So, $\bar{X} \sim N(210, \frac{15^2}{10})$.
The variance of $\bar{X}$ is $\frac{225}{10} = 22.5$. M1
We want to find $P(\bar{X} > 215)$.
Standardise the variable: $Z = \frac{\bar{X} - \mu}{\sigma/\sqrt{n}}$.
$P(\bar{X} > 215) = P(Z > \frac{215 - 210}{\sqrt{22.5}})$. M1
$P(Z > \frac{5}{4.7434...}) = P(Z > 1.054)$. A1
Using standard normal tables, $P(Z > 1.054) = 1 - P(Z < 1.054) = 1 - \Phi(1.054)$. M1
$1 - 0.8540 = 0.146$. A1 (Answer to 3 s.f.)

### Standard Solution Steps
- Step 1: Identify the parameters of the population distribution ($\mu$ and $\sigma^2$).
- Step 2: State the distribution of the sample mean, $\bar{X}$, using the formula $\bar{X} \sim N(\mu, \frac{\sigma^2}{n})$.
- Step 3: Calculate the mean and variance of the sample mean's distribution.
- Step 4: Standardise the required value of the sample mean using the formula $Z = \frac{\bar{x} - \mu}{\sigma/\sqrt{n}}$.
- Step 5: Use the standard normal distribution table ($\Phi$) to find the required probability.

### Common Mistakes
- Using the population variance $\sigma^2$ instead of the variance of the sample mean, $\frac{\sigma^2}{n}$.
- Using the population standard deviation $\sigma$ instead of the standard error of the mean, $\frac{\sigma}{\sqrt{n}}$, in the denominator when standardising.
- Forgetting to square the standard deviation to get the variance when stating the distribution parameters.
- Errors in looking up values from the normal distribution table or incorrect application of symmetry properties (e.g., confusing $P(Z > z)$ with $P(Z < z)$).

### Tags
- sampling, sample mean, normal distribution, probability, standard error, syllabus 7.1

---
## Sampling and Estimation: Unbiased Estimators

**Syllabus Reference**: 7.2 Unbiased estimators

**Learning Objective**: Understand what is meant by an unbiased estimator, and use the result that if $E(T) = \theta$ then $T$ is an unbiased estimator of $\theta$.

### Example Question
A random variable $X$ has a population mean $\mu$ and population variance $\sigma^2$. To estimate the population mean, two independent random samples are taken. The first sample has size 4 and mean $\bar{X_1}$. The second sample has size 6 and mean $\bar{X_2}$.
An estimator $T$ for $\mu$ is proposed, where $T = k\bar{X_1} + (1-k)\bar{X_2}$.
(a) Show that $T$ is an unbiased estimator for $\mu$ for any constant $k$.
(b) Find, in terms of $\sigma^2$ and $k$, the variance of $T$.
(c) Find the value of $k$ that gives the most efficient unbiased estimator of this form, and state the variance of this estimator.

### Mark Scheme / Solution
(a) For $T$ to be an unbiased estimator of $\mu$, we must have $E(T) = \mu$. M1
$E(T) = E(k\bar{X_1} + (1-k)\bar{X_2})$
$= k E(\bar{X_1}) + (1-k) E(\bar{X_2})$ M1
Since $\bar{X_1}$ and $\bar{X_2}$ are sample means from the population, $E(\bar{X_1}) = \mu$ and $E(\bar{X_2}) = \mu$. B1
$E(T) = k\mu + (1-k)\mu = k\mu + \mu - k\mu = \mu$.
Since $E(T) = \mu$, $T$ is an unbiased estimator of $\mu$ for any value of $k$. A1

(b) $Var(T) = Var(k\bar{X_1} + (1-k)\bar{X_2})$
Since the samples are independent, $Var(T) = k^2 Var(\bar{X_1}) + (1-k)^2 Var(\bar{X_2})$. M1
We know $Var(\bar{X_1}) = \frac{\sigma^2}{n_1} = \frac{\sigma^2}{4}$ and $Var(\bar{X_2}) = \frac{\sigma^2}{n_2} = \frac{\sigma^2}{6}$. B1
So, $Var(T) = k^2\frac{\sigma^2}{4} + (1-k)^2\frac{\sigma^2}{6}$. M1
$= \sigma^2 (\frac{k^2}{4} + \frac{(1-k)^2}{6})$. A1

(c) To find the minimum variance, we differentiate $Var(T)$ with respect to $k$ and set it to 0.
Let $V(k) = \frac{k^2}{4} + \frac{1 - 2k + k^2}{6}$.
$\frac{dV}{dk} = \frac{2k}{4} + \frac{-2 + 2k}{6} = \frac{k}{2} + \frac{k-1}{3}$. M1
Set $\frac{dV}{dk} = 0$: $\frac{k}{2} + \frac{k-1}{3} = 0 \implies 3k + 2(k-1) = 0 \implies 3k + 2k - 2 = 0$.
$5k = 2 \implies k = \frac{2}{5}$ or $0.4$. A1
To find the minimum variance, substitute $k=0.4$ back into the variance expression.
$Var(T) = \sigma^2 (\frac{(0.4)^2}{4} + \frac{(1-0.4)^2}{6}) = \sigma^2 (\frac{0.16}{4} + \frac{0.36}{6})$. M1
$Var(T) = \sigma^2 (0.04 + 0.06) = 0.1\sigma^2$ or $\frac{\sigma^2}{10}$. A1

### Standard Solution Steps
- (a) To prove unbiasedness, calculate the expected value $E(T)$ using the linearity of expectation and the fact that $E(\bar{X}) = \mu$. Show that $E(T)$ simplifies to $\mu$.
- (b) To find the variance, use the formula $Var(aX+bY) = a^2Var(X) + b^2Var(Y)$ for independent variables $X, Y$. Use the result $Var(\bar{X}) = \frac{\sigma^2}{n}$.
- (c) To find the most efficient estimator (minimum variance), differentiate the variance expression with respect to the variable ($k$) and solve for when the derivative is zero. Substitute this value of $k$ back into the variance expression.

### Common Mistakes
- Confusing $E(k\bar{X_1})$ with $kE(X_1)$. The expectation of the sample mean is $\mu$.
- Errors in variance algebra: forgetting to square the constants, i.e., using $k$ instead of $k^2$.
- Assuming the samples are dependent and including a covariance term. The question specifies independent samples.
- Errors in differentiation, particularly the chain rule for the $(1-k)^2$ term.
- Forgetting to find the actual variance after finding the value of $k$ that minimises it.

### Tags
- unbiased estimator, proof, expectation, variance, efficiency, syllabus 7.2

---
## Sampling and Estimation: Confidence Interval for the Mean

**Syllabus Reference**: 7.3 Confidence intervals

**Learning Objective**: Formulate a confidence interval for a population mean, $\mu$, for a random sample from a normal distribution with known variance, or with unknown variance (using the t-distribution).

### Example Question
The time taken, in minutes, for a particular chemical reaction to complete is known to be normally distributed with mean $\mu$.
(a) In a series of 15 experiments, the mean time was found to be 34.5 minutes. Assuming the population standard deviation is known to be 2.5 minutes, calculate a 95% confidence interval for $\mu$.
(b) In a different laboratory, the population standard deviation is unknown. A random sample of 12 experiments gives a sample mean of 36.1 minutes and a sample standard deviation, $s$, of 2.8 minutes. Calculate a 99% confidence interval for $\mu$.

### Mark Scheme / Solution
(a) Population variance is known, so we use the Normal distribution.
The confidence interval is given by $\bar{x} \pm z \sqrt{\frac{\sigma^2}{n}}$. B1
Here, $\bar{x} = 34.5$, $\sigma = 2.5$, $n = 15$.
For a 95% confidence interval, the critical z-value is $1.96$. B1
CI = $34.5 \pm 1.96 \times \frac{2.5}{\sqrt{15}}$. M1
CI = $34.5 \pm 1.96 \times 0.6455...$
CI = $34.5 \pm 1.265...$
The 95% confidence interval is $(33.2, 35.8)$. A1

(b) Population variance is unknown, so we use the t-distribution.
The confidence interval is given by $\bar{x} \pm t_{n-1} \sqrt{\frac{s^2}{n}}$. B1
Here, $\bar{x} = 36.1$, $s = 2.8$, $n = 12$.
The degrees of freedom, $\nu = n - 1 = 12 - 1 = 11$. B1
For a 99% confidence interval with $\nu=11$, the critical value from t-tables is $t_{11}(0.005) = 3.106$. B1
CI = $36.1 \pm 3.106 \times \frac{2.8}{\sqrt{12}}$. M1
CI = $36.1 \pm 3.106 \times 0.8083...$
CI = $36.1 \pm 2.510...$
The 99% confidence interval is $(33.6, 38.6)$. A1

### Standard Solution Steps
- Step 1: Determine if the population variance $\sigma^2$ is known or unknown.
- Step 2: If known, use the z-distribution. Find the appropriate z-value for the given confidence level (e.g., 1.96 for 95%).
- Step 3: If unknown, use the t-distribution. Calculate the degrees of freedom ($\nu = n-1$) and find the appropriate t-value from tables for the given confidence level.
- Step 4: Use the sample standard deviation ($s$) as the estimate for $\sigma$. Note that CAIE questions usually provide $s$ based on the divisor $n-1$.
- Step 5: Substitute the values ($\bar{x}$, $n$, $s$ or $\sigma$, and the critical value) into the correct formula: $\bar{x} \pm z \frac{\sigma}{\sqrt{n}}$ or $\bar{x} \pm t \frac{s}{\sqrt{n}}$.
- Step 6: Calculate the lower and upper bounds of the interval, giving answers to an appropriate degree of accuracy (e.g., 3 s.f.).

### Common Mistakes
- Using the z-distribution when the population variance is unknown, or vice versa.
- Using incorrect degrees of freedom for the t-distribution (e.g., using $n$ instead of $n-1$).
- Using the wrong critical value (e.g., using the value for a 95% interval when 99% is required).
- Calculation errors with the standard error term $\frac{s}{\sqrt{n}}$ or $\frac{\sigma}{\sqrt{n}}$.
- Confusing sample standard deviation ($s$) with population standard deviation ($\sigma$).

### Tags
confidence_interval, normal_distribution, t_distribution, known_variance, unknown_variance, degrees_of_freedom, syllabus_7_3

---
## Sampling and Estimation: Confidence Interval for a Proportion

**Syllabus Reference**: 7.4 Confidence intervals

**Learning Objective**: Formulate a confidence interval for a population proportion, p, using a normal approximation.

### Example Question
A factory produces a large number of electronic components. In a quality control check, a random sample of 500 components is tested, and 45 are found to be defective.
(a) Calculate an approximate 98% confidence interval for the proportion, $p$, of defective components produced by the factory.
(b) The factory manager claims that the true proportion of defective components is 7%. Use your confidence interval to comment on this claim.

### Mark Scheme / Solution
(a) First, calculate the sample proportion, $\hat{p}$.
$\hat{p} = \frac{45}{500} = 0.09$. B1
The formula for an approximate confidence interval for a proportion is $\hat{p} \pm z \sqrt{\frac{\hat{p}(1-\hat{p})}{n}}$. B1
For a 98% confidence level, the two-tailed z-value is found from $P(Z>z)=0.01$, so $z=2.326$. B1
Standard error (SE) = $\sqrt{\frac{0.09 \times (1-0.09)}{500}} = \sqrt{\frac{0.09 \times 0.91}{500}} = \sqrt{0.0001638}$. M1
SE = $0.0128...$
The margin of error is $z \times SE = 2.326 \times 0.0128... = 0.02976...$ M1
The confidence interval is $0.09 \pm 0.02976...$
CI = $(0.0602, 0.1198)$.
To 3 s.f., the interval is $(0.0602, 0.120)$. A1

(b) The factory manager claims $p=0.07$.
The 98% confidence interval is $(0.0602, 0.120)$.
Since the value $0.07$ lies inside the calculated confidence interval, there is no evidence at the 98% confidence level to reject the manager's claim. B1 FT

### Standard Solution Steps
- Step 1: Calculate the sample proportion $\hat{p} = \frac{x}{n}$, where $x$ is the number of successes and $n$ is the sample size.
- Step 2: Find the critical z-value corresponding to the required confidence level (e.g., 1.96 for 95%, 2.576 for 99%).
- Step 3: Calculate the standard error of the proportion using the formula $SE = \sqrt{\frac{\hat{p}(1-\hat{p})}{n}}$.
- Step 4: Calculate the margin of error by multiplying the z-value by the standard error.
- Step 5: Construct the confidence interval: $\hat{p} \pm \text{Margin of Error}$.
- Step 6: When commenting on a claim, check if the claimed value lies inside or outside the calculated interval. If inside, there is no reason to reject the claim. If outside, the claim is not supported by the data.

### Common Mistakes
- Using $\hat{p}$ in the numerator of the standard error but using a different value (like 0.5) in the denominator part of the formula.
- Using an incorrect z-value (e.g., for a one-tailed test or a different confidence level).
- Forgetting to take the square root when calculating the standard error.
- Making a definitive statement like "the claim is correct" instead of "there is no evidence to reject the claim". A confidence interval provides a range of plausible values, it doesn't prove a specific value is correct.
- Rounding intermediate calculations too early, leading to an inaccurate final interval.

### Tags
- confidence interval, proportion, normal approximation, standard error, hypothesis comment, syllabus 7.4

---
## Sampling and Estimation: The Central Limit Theorem

**Syllabus Reference**: 7.1 Concepts of population and sample

**Learning Objective**: Understand and use the Central Limit Theorem for the distribution of the sample mean.

### Example Question
The random variable $X$ represents the value of a prize, in dollars, won from a vending machine. The probability distribution of $X$ is given in the following table.
| $x$ | 1 | 5 | 10 |
|---|---|---|---|
| $P(X=x)$ | 0.6 | 0.3 | 0.1 |

(a) Find the population mean, $\mu$, and variance, $\sigma^2$, of $X$.
(b) A random sample of 100 prizes is taken. Use the Central Limit Theorem to find the approximate probability that the sample mean prize value is between \$3 and \$4.

### Mark Scheme / Solution
(a) $E(X) = \mu = \sum x P(X=x)$.
$\mu = (1)(0.6) + (5)(0.3) + (10)(0.1) = 0.6 + 1.5 + 1.0 = 3.1$. B1
$E(X^2) = \sum x^2 P(X=x)$.
$E(X^2) = (1^2)(0.6) + (5^2)(0.3) + (10^2)(0.1) = 0.6 + (25)(0.3) + (100)(0.1) = 0.6 + 7.5 + 10 = 18.1$. M1
$Var(X) = \sigma^2 = E(X^2) - [E(X)]^2$. M1
$\sigma^2 = 18.1 - (3.1)^2 = 18.1 - 9.61 = 8.49$. A1

(b) By the Central Limit Theorem, since $n=100$ is large, the distribution of the sample mean $\bar{X}$ is approximately normal.
$\bar{X} \approx N(\mu, \frac{\sigma^2}{n})$. M1
$\bar{X} \approx N(3.1, \frac{8.49}{100}) = N(3.1, 0.0849)$. B1 FT
We need to find $P(3 < \bar{X} < 4)$.
Standardise the endpoints:
$Z_1 = \frac{3 - 3.1}{\sqrt{0.0849}} = \frac{-0.1}{0.2913...} = -0.3432...$ M1
$Z_2 = \frac{4 - 3.1}{\sqrt{0.0849}} = \frac{0.9}{0.2913...} = 3.089...$ A1
$P(3 < \bar{X} < 4) \approx P(-0.343 < Z < 3.089) = \Phi(3.089) - \Phi(-0.343)$. M1
$= \Phi(3.089) - (1 - \Phi(0.343))$
$= 0.9990 - (1 - 0.6342) = 0.9990 - 0.3658$.
$= 0.6332$.
The probability is approximately $0.633$. A1

### Standard Solution Steps
- Step 1: Calculate the population mean ($\mu$) and variance ($\sigma^2$) from the given probability distribution.
- Step 2: State the Central Limit Theorem, which says that for a large sample size ($n \ge 30$ is a common rule of thumb), the sample mean $\bar{X}$ is approximately normally distributed.
- Step 3: Define the parameters of this approximate normal distribution: Mean = $\mu$, Variance = $\frac{\sigma^2}{n}$.
- Step 4: Standardise the given limits for the sample mean using the formula $Z = \frac{\bar{x} - \mu}{\sigma/\sqrt{n}}$.
- Step 5: Use the standard normal distribution table to find the probability for the calculated Z-scores.

### Common Mistakes
- Errors in calculating the population mean or variance, which will carry through the rest of the problem. Forgetting to square the mean when using $Var(X) = E(X^2) - [E(X)]^2$.
- Using the population variance $\sigma^2$ in the normal approximation instead of the variance of the sample mean, $\frac{\sigma^2}{n}$.
- Applying a continuity correction. This is not necessary as the sample mean is a continuous variable, even if the parent population is discrete.
- Errors in standardisation, such as dividing by $\sigma$ instead of $\sigma/\sqrt{n}$.
- Incorrect use of the normal distribution tables, especially for negative z-values.

### Tags
- central limit theorem, clt, sampling distribution, sample mean, discrete random variable, normal approximation, syllabus 7.1