## Hypothesis Testing: One-Sample t-test
**Syllabus Reference**: 4.2
**Learning Objective**: Formulate hypotheses and apply a hypothesis test concerning the population mean using a small sample drawn from a normal population of unknown variance, using a t-test.
### Example Question
A manufacturer claims that its packets of flour have a mean weight of 1000 g. The weights, in grams, of a random sample of 8 packets are measured and found to be: 998, 1001, 995, 1003, 996, 992, 999, 998. Assuming that the weights of the packets are normally distributed, test the manufacturer's claim at the 5% significance level.
### Mark Scheme / Solution
$H_0: \mu = 1000$ (B1)
$H_1: \mu \neq 1000$ (B1)
The sample size is $n=8$.
Sample mean $\bar{x} = \frac{998 + 1001 + 995 + 1003 + 996 + 992 + 999 + 998}{8} = \frac{7982}{8} = 997.75$ (M1)
The unbiased estimate of the population variance is $s^2 = \frac{1}{n-1} \left( \sum x^2 - \frac{(\sum x)^2}{n} \right)$.
$\sum x = 7982$, $\sum x^2 = 7964092$.
$s^2 = \frac{1}{7} \left( 7964092 - \frac{7982^2}{8} \right) = \frac{1}{7} (7964092 - 7964080.5) = \frac{11.5}{7} \approx 1.64286$ (M1 A1)
The test statistic is $t = \frac{\bar{x} - \mu}{s/\sqrt{n}} = \frac{997.75 - 1000}{\sqrt{1.64286 / 8}} = \frac{-2.25}{\sqrt{0.2053575}} = \frac{-2.25}{0.45316} \approx -4.965$ (M1 A1)
Degrees of freedom $v = n-1 = 7$. (B1)
The critical value for a two-tailed test at 5% significance is $t_{0.025, 7} = 2.365$. (B1)
Since $|-4.965| > 2.365$, we reject the null hypothesis. (M1)
There is sufficient evidence at the 5% significance level to suggest that the mean weight of the packets is not 1000 g. (A1)
### Standard Solution Steps
- State the null and alternative hypotheses for the population mean $\mu$.
- Calculate the sample mean $\bar{x}$ and the unbiased estimate of the population variance $s^2$.
- Calculate the t-statistic using the formula $t = \frac{\bar{x} - \mu_0}{s/\sqrt{n}}$.
- Determine the number of degrees of freedom, $v = n-1$.
- Find the critical t-value from statistical tables for the given significance level and degrees of freedom.
- Compare the calculated t-statistic with the critical value and state the conclusion in the context of the problem.
### Common Mistakes
- Using the population standard deviation formula instead of the sample (unbiased) one.
- Calculating the standard deviation of the sample, not the unbiased estimate of the population standard deviation.
- Looking up the critical value for a one-tailed test instead of a two-tailed test, or vice-versa.
- Forgetting to state the conclusion in the context of the original question.
- Using a z-test instead of a t-test, which is incorrect for a small sample with unknown variance.
### Tags
hypothesis_test, t_test, one_sample, unknown_variance, normal_population
---
## Hypothesis Testing: Two-Sample t-test
**Syllabus Reference**: 4.2
**Learning Objective**: Calculate a pooled estimate of a population variance from two samples. Formulate hypotheses concerning the difference of population means, and apply, as appropriate: a 2-sample t-test.
### Example Question
A teacher wishes to compare the effectiveness of two teaching methods, A and B. A group of 20 students is randomly divided into two groups of 10. One group is taught by method A and the other by method B. At the end of the course, they all take the same test. The scores are summarised below.
Method A: $n_A = 10$, $\sum x_A = 750$, $\sum x_A^2 = 56540$
Method B: $n_B = 10$, $\sum y_B = 780$, $\sum y_B^2 = 61089$
You may assume that the scores for both methods are independent random samples from normal distributions with a common variance. Test, at the 10% significance level, whether there is a difference in the mean scores produced by the two methods.
### Mark Scheme / Solution
$H_0: \mu_A = \mu_B$
$H_1: \mu_A \neq \mu_B$ (B1)
For method A: $\bar{x}_A = \frac{750}{10} = 75$. $s_A^2 = \frac{1}{9}(56540 - \frac{750^2}{10}) = \frac{1}{9}(56540 - 56250) = \frac{290}{9} \approx 32.22$ (M1)
For method B: $\bar{x}_B = \frac{780}{10} = 78$. $s_B^2 = \frac{1}{9}(61089 - \frac{780^2}{10}) = \frac{1}{9}(61089 - 60840) = \frac{249}{9} = 27.67$ (M1)
The pooled estimate of the common variance is $s_p^2 = \frac{(n_A-1)s_A^2 + (n_B-1)s_B^2}{n_A+n_B-2} = \frac{9(\frac{290}{9}) + 9(\frac{249}{9})}{10+10-2}$ (M1)
$s_p^2 = \frac{290 + 249}{18} = \frac{539}{18} \approx 29.944$ (A1)
The test statistic is $t = \frac{\bar{x}_A - \bar{x}_B}{\sqrt{s_p^2(\frac{1}{n_A} + \frac{1}{n_B})}} = \frac{75 - 78}{\sqrt{\frac{539}{18}(\frac{1}{10} + \frac{1}{10})}}$ (M1)
$t = \frac{-3}{\sqrt{\frac{539}{18} \times \frac{2}{10}}} = \frac{-3}{\sqrt{\frac{539}{90}}} = \frac{-3}{2.4475} \approx -1.226$ (A1)
Degrees of freedom $v = n_A+n_B-2 = 10+10-2 = 18$. (B1)
The critical value for a two-tailed test at 10% significance is $t_{0.05, 18} = 1.734$. (B1)
Since $|-1.226| < 1.734$, we do not reject the null hypothesis. (M1)
There is insufficient evidence at the 10% significance level to suggest a difference in the mean scores for the two teaching methods. (A1)
### Standard Solution Steps
- State the null and alternative hypotheses for the difference between the two population means.
- Calculate the sample means and unbiased variance estimates for both samples.
- Calculate the pooled variance estimate using the formula $s_p^2 = \frac{(n_1-1)s_1^2 + (n_2-1)s_2^2}{n_1+n_2-2}$.
- Calculate the two-sample t-statistic.
- Determine the degrees of freedom, $v = n_1+n_2-2$.
- Find the appropriate critical t-value.
- Compare the test statistic to the critical value and state a conclusion in context.
### Common Mistakes
- Not pooling the variances when the question states they can be assumed equal.
- Using an incorrect formula for the pooled variance.
- Errors in calculating the unbiased variance estimates from summary statistics.
- Incorrectly calculating the degrees of freedom as $n_1+n_2-1$ or similar.
- Using a z-test.
### Tags
hypothesis_test, t_test, two_sample, pooled_variance, difference_of_means
---
## Confidence Intervals: Paired Samples
**Syllabus Reference**: 4.2
**Learning Objective**: Determine a confidence interval for a difference of population means, using a t-distribution or a normal distribution, as appropriate. Formulate hypotheses concerning the difference of population means, and apply, as appropriate: a paired sample t-test.
### Example Question
A sports scientist investigates the effect of a new diet on the performance of eight athletes. The athletes' performance scores were measured before the diet and after three weeks on the diet. The results are shown below, where a higher score indicates better performance.
Athlete: 1, 2, 3, 4, 5, 6, 7, 8
Score Before: 65, 72, 80, 68, 75, 84, 77, 71
Score After: 68, 75, 79, 74, 77, 88, 81, 75
Assuming the differences in scores are normally distributed, calculate a 99% confidence interval for the mean difference in performance score.
### Mark Scheme / Solution
Let $d$ be the difference in score (After - Before).
The differences are: 3, 3, -1, 6, 2, 4, 4, 4. (M1)
$n=8$.
$\sum d = 3+3-1+6+2+4+4+4 = 25$.
$\bar{d} = \frac{25}{8} = 3.125$. (A1)
$\sum d^2 = 9+9+1+36+4+16+16+16 = 107$.
The unbiased estimate of the variance of the differences is $s_d^2 = \frac{1}{n-1}(\sum d^2 - \frac{(\sum d)^2}{n}) = \frac{1}{7}(107 - \frac{25^2}{8})$ (M1)
$s_d^2 = \frac{1}{7}(107 - 78.125) = \frac{28.875}{7} \approx 4.125$. (A1)
Degrees of freedom $v = n-1 = 7$. (B1)
For a 99% confidence interval, we need the critical t-value $t_{0.005, 7}$.
From tables, $t_{0.005, 7} = 3.499$. (B1)
The confidence interval is given by $\bar{d} \pm t \times \frac{s_d}{\sqrt{n}}$. (M1)
CI = $3.125 \pm 3.499 \times \frac{\sqrt{4.125}}{\sqrt{8}}$
CI = $3.125 \pm 3.499 \times \frac{2.031}{2.828}$
CI = $3.125 \pm 3.499 \times 0.7182$
CI = $3.125 \pm 2.513$ (M1)
The 99% confidence interval is (0.612, 5.638). (A1)
### Standard Solution Steps
- Calculate the differences for each pair of data points.
- Calculate the mean of these differences, $\bar{d}$.
- Calculate the unbiased estimate of the variance of the differences, $s_d^2$.
- Determine the degrees of freedom, $v = n-1$, where $n$ is the number of pairs.
- Find the appropriate critical t-value for the required confidence level.
- Construct the confidence interval using the formula $\bar{d} \pm t_{crit} \times \frac{s_d}{\sqrt{n}}$.
- State the final interval, usually to 3 significant figures.
### Common Mistakes
- Treating the data as two independent samples instead of paired data.
- Calculating the variance of the 'before' and 'after' data separately.
- Errors in calculating the differences, for example, subtracting inconsistently.
- Using the wrong degrees of freedom ($2n-2$ instead of $n-1$).
- Using a z-value instead of a t-value.
- Using the wrong tail probability to find the t-value (e.g., for 99% CI, looking up 0.01 instead of 0.005).
### Tags
confidence_interval, t_distribution, paired_data, paired_sample, difference_of_means