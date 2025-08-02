## Sampling and Estimation: Unbiased Estimators

**Syllabus Reference**: 2.1

**Learning Objective**: Understand the distinction between a population and a sample and use the notation $\bar{x}$ and $s^2$. Calculate unbiased estimates of the population mean and variance from a sample.

### Example Question
The masses, in grams, of a random sample of 6 chocolate bars from a production line are: 45.1, 44.8, 45.3, 44.9, 45.2, 44.7. Calculate unbiased estimates of the population mean and variance.

### Mark Scheme / Solution
The sample mean, $\bar{x} = \frac{\sum x}{n}$. M1
$\sum x = 45.1 + 44.8 + 45.3 + 44.9 + 45.2 + 44.7 = 269.0$.
$\bar{x} = \frac{269.0}{6} = 44.9833... = 45.0$ (3 s.f.). A1
Unbiased estimate of population variance, $s^2 = \frac{1}{n-1} \left( \sum x^2 - \frac{(\sum x)^2}{n} \right)$. M1
$\sum x^2 = 45.1^2 + 44.8^2 + 45.3^2 + 44.9^2 + 45.2^2 + 44.7^2 = 12150.28$. B1
$s^2 = \frac{1}{5} \left( 12150.28 - \frac{269.0^2}{6} \right)$. M1 for substitution.
$s^2 = \frac{1}{5} (12150.28 - 12060.166...) = \frac{1}{5}(0.2333...) = 0.04666...$.
$s^2 = 0.0467$ (3 s.f.). A1

### Standard Solution Steps
- Step 1: Calculate the sum of the data points, $\sum x$, and the sum of the squares, $\sum x^2$.
- Step 2: Calculate the sample mean using the formula $\bar{x} = \frac{\sum x}{n}$. This is the unbiased estimate of the population mean $\mu$.
- Step 3: Calculate the unbiased estimate of the population variance using the formula $s^2 = \frac{1}{n-1} \left( \sum x^2 - n\bar{x}^2 \right)$ or an equivalent form.

### Common Mistakes
- Dividing by $n$ instead of $n-1$ when calculating the unbiased estimate of population variance.
- Prematurely rounding intermediate values like $\bar{x}$ or $\sum x^2$, leading to an inaccurate final answer.
- Confusing the unbiased estimate of the variance ($s^2$) with the unbiased estimate of the standard deviation ($s$).

### Tags
sampling, estimation, unbiased_estimator, mean, variance, syllabus_2_1

---
## Sampling and Estimation: Central Limit Theorem

**Syllabus Reference**: 2.2

**Learning Objective**: Use the Central Limit Theorem to approximate the distribution of the mean of a large sample, $\bar{X}$, as $N(\mu, \sigma^2/n)$.

### Example Question
The time, $T$, in minutes, that a customer spends in a supermarket has a mean of 40 and a standard deviation of 12. A random sample of 50 customers is taken. Find the probability that the mean time spent in the supermarket by the customers in the sample is less than 38 minutes.

### Mark Scheme / Solution
Let $T$ be the time a customer spends. We are given $E(T) = \mu = 40$ and $Var(T) = \sigma^2 = 12^2 = 144$. B1
The sample size is $n=50$, which is large.
By the Central Limit Theorem, the distribution of the sample mean $\bar{T}$ is approximately normal. M1
$\bar{T} \sim N(\mu, \frac{\sigma^2}{n})$ which is $\bar{T} \sim N(40, \frac{144}{50})$. A1 for correct distribution.
So, $\bar{T} \sim N(40, 2.88)$.
We need to find $P(\bar{T} < 38)$.
Standardise the value: $Z = \frac{\bar{T} - \mu}{\sigma/\sqrt{n}} = \frac{38 - 40}{\sqrt{2.88}}$. M1 for standardisation.
$Z = \frac{-2}{1.697...} = -1.1785$. A1
$P(Z < -1.1785) = 1 - P(Z < 1.1785) = 1 - \Phi(1.1785)$. M1 for using symmetry of normal distribution.
From tables, $\Phi(1.1785) \approx 0.8807$.
Probability $= 1 - 0.8807 = 0.1193$.
The probability is $0.119$ (3 s.f.). A1

### Standard Solution Steps
- Step 1: Identify the population mean $\mu$, population variance $\sigma^2$, and sample size $n$.
- Step 2: State the approximate distribution of the sample mean $\bar{X}$ using the Central Limit Theorem: $\bar{X} \sim N(\mu, \sigma^2/n)$.
- Step 3: Calculate the value of the variance of the sample mean, $\sigma^2/n$.
- Step 4: Standardise the required value of $\bar{x}$ using the formula $Z = \frac{\bar{x} - \mu}{\sigma/\sqrt{n}}$.
- Step 5: Use standard normal distribution tables or a calculator to find the required probability.

### Common Mistakes
- Forgetting to divide the population variance by the sample size $n$.
- Using the population standard deviation $\sigma$ instead of the standard error $\frac{\sigma}{\sqrt{n}}$ in the standardisation formula.
- Making errors with normal distribution calculations, such as finding $P(Z > z)$ instead of $P(Z < z)$.

### Tags
sampling, estimation, central_limit_theorem, clt, normal_distribution, syllabus_2_2

---
## Sampling and Estimation: Confidence Interval for a Mean

**Syllabus Reference**: 2.3

**Learning Objective**: Calculate a confidence interval for a population mean $\mu$.

### Example Question
A random sample of 80 apples is taken from an orchard and the mass, $x$ grams, of each apple is measured. The sample has a mean mass of $\bar{x} = 165$ grams and an unbiased estimate of the population variance of $s^2 = 36$. Calculate a 95% confidence interval for the population mean mass of apples.

### Mark Scheme / Solution
We are given $n=80$, $\bar{x}=165$, and $s^2=36$.
Since $n$ is large, the sample mean $\bar{X}$ is approximately normally distributed. B1
A 95% confidence interval for $\mu$ is given by $\bar{x} \pm z \times \frac{s}{\sqrt{n}}$. M1
For a 95% confidence level, the critical z-value is 1.96. B1
The standard error is $\frac{s}{\sqrt{n}} = \frac{\sqrt{36}}{\sqrt{80}} = \frac{6}{\sqrt{80}}$. M1
The margin of error is $1.96 \times \frac{6}{\sqrt{80}} = 1.96 \times 0.6708... = 1.3148...$ A1
The confidence interval is $165 \pm 1.3148...$.
Lower limit = $165 - 1.3148... = 163.685...$
Upper limit = $165 + 1.3148... = 166.3148...$
The 95% confidence interval is (163.7, 166.3). A1 for correct interval to required accuracy.

### Standard Solution Steps
- Step 1: Identify the sample size $n$, sample mean $\bar{x}$, and sample standard deviation $s$ (or variance $s^2$).
- Step 2: Determine the appropriate critical value (z-value for large samples) for the given confidence level.
- Step 3: Calculate the standard error of the mean, $\frac{s}{\sqrt{n}}$.
- Step 4: Calculate the margin of error by multiplying the critical value by the standard error.
- Step 5: Construct the interval by adding and subtracting the margin of error from the sample mean.

### Common Mistakes
- Using the incorrect z-value for the confidence level (e.g., using 1.645 for 95% or 1.96 for 90%).
- Using the variance $s^2$ instead of the standard deviation $s$ in the formula.
- Forgetting to take the square root of $n$ in the standard error calculation.
- Stating the interval as $\bar{x} \pm \text{margin of error}$ without calculating the upper and lower bounds.

### Tags
sampling, estimation, confidence_interval, normal_distribution, large_sample, syllabus_2_3

---