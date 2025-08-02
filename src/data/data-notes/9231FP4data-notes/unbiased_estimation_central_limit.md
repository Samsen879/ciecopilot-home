## [Topic]: Unbiased Estimates of Population Parameters

### Question
A random sample of 8 adult badgers is taken and their weights, in kg, are measured. The results are summarised as follows: $\sum x = 58.4$ and $\sum x^2 = 431.2$.
Calculate unbiased estimates of the population mean and variance for the weight of adult badgers.

### Solution
- The sample mean is $\bar{x} = \frac{\sum x}{n} = \frac{58.4}{8} = 7.3$.
- An unbiased estimate of the population mean, $\mu$, is the sample mean.
- So, $\hat{\mu} = 7.3$ kg.

- An unbiased estimate of the population variance, $\sigma^2$, is given by the formula $s^2 = \frac{1}{n-1} \left( \sum x^2 - \frac{(\sum x)^2}{n} \right)$.
- Substituting the given values:
- $s^2 = \frac{1}{8-1} \left( 431.2 - \frac{58.4^2}{8} \right)$
- $s^2 = \frac{1}{7} \left( 431.2 - \frac{3410.56}{8} \right)$
- $s^2 = \frac{1}{7} (431.2 - 426.32)$
- $s^2 = \frac{4.88}{7}$
- $s^2 = 0.69714...$
- So, $\hat{\sigma}^2 = 0.697$ (to 3 s.f.).

### Mark Scheme / Solution
- Unbiased estimate of mean = $\frac{58.4}{8} = 7.3$ (B1)
- Formula for unbiased variance estimate with denominator $n-1$: $s^2 = \frac{1}{7} \left( \sum x^2 - \frac{(\sum x)^2}{8} \right)$ (M1)
- Correct substitution into the formula: $s^2 = \frac{1}{7} \left( 431.2 - \frac{58.4^2}{8} \right)$ (A1)
- Final answer for variance estimate $s^2 = 0.697$ or $\frac{4.88}{7}$ (A1)

---

### Common Mistakes
- Using the wrong denominator for the variance estimate. A common error is to divide by $n=8$ instead of $n-1=7$. This calculates the sample variance, not the unbiased estimate of the population variance.
- Calculation errors, particularly when squaring the sum of $x$, i.e., mixing up $(\sum x)^2$ with $\sum x^2$.
- Prematurely rounding intermediate values, which can lead to an inaccurate final answer.

## [Topic]: The Central Limit Theorem

### Question
The time, $T$ minutes, taken by a student to complete a puzzle is a random variable with mean 28 and variance 15. A random sample of 50 students is taken. Find the probability that the mean time taken by these students to complete the puzzle is less than 29 minutes.

### Solution
- Let $T$ be the time taken by a student, with $E(T) = 28$ and $Var(T) = 15$.
- Let $\bar{T}$ be the sample mean time for a sample of size $n=50$.
- Since the sample size $n=50$ is large ($n>30$), the Central Limit Theorem (CLT) can be applied.
- The distribution of the sample mean, $\bar{T}$, is approximately normal.
- The mean of the sampling distribution is $E(\bar{T}) = \mu = 28$.
- The variance of the sampling distribution is $Var(\bar{T}) = \frac{\sigma^2}{n} = \frac{15}{50} = 0.3$.
- So, the distribution is $\bar{T} \sim N(28, 0.3)$ approximately.
- We need to find $P(\bar{T} < 29)$.
- Standardise the value: $Z = \frac{\bar{T} - \mu}{\sqrt{Var(\bar{T})}} = \frac{29 - 28}{\sqrt{0.3}}$.
- $Z = \frac{1}{\sqrt{0.3}} \approx 1.8257...$
- We look for $P(Z < 1.826)$.
- Using standard normal distribution tables, $\Phi(1.826) = 0.9661$.
- The probability is $0.966$ (to 3 s.f.).

### Mark Scheme / Solution
- State or use the distribution of the sample mean as Normal, with mean 28 (B1)
- Calculate the variance of the sample mean as $\frac{15}{50}$ or $0.3$ (B1)
- Attempt to standardise using their mean and variance, with a square root in the denominator: $\frac{29-28}{\sqrt{0.3}}$ (M1)
- Obtain the correct z-value of $1.826$ or equivalent (A1)
- Obtain the final correct probability of $0.966$ (A1)

---

### Common Mistakes
- Forgetting to divide the population variance by $n=50$. A frequent error is to use $Var(\bar{T}) = 15$.
- Forgetting to take the square root of the variance ($Var(\bar{T}) = 0.3$) when standardising.
- Failing to state that the use of the Normal distribution is justified by the Central Limit Theorem due to the large sample size.
- Assuming the original distribution of $T$ is Normal. This is not stated in the question; it is the distribution of the sample mean $\bar{T}$ that becomes approximately Normal.