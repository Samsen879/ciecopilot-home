## Non-parametric tests: Single-Sample Wilcoxon Signed-Rank Test
**Syllabus Reference**: 4.4
**Learning Objective**: Use a single-sample sign test and a single-sample Wilcoxon signed-rank test to test a hypothesis concerning a population median (including the use of normal approximations where appropriate; questions will not involve tied ranks or observations equal to the population median value being tested).
### Example Question
A machine is designed to produce metal rods with a median length of 25.0 cm. A quality control manager suspects the machine is producing rods that are longer than this. A random sample of 9 rods is taken and their lengths are measured. The lengths, in cm, are:
25.3, 25.8, 24.9, 26.1, 25.5, 26.4, 25.2, 26.0, 25.7.
Assuming the distribution of lengths is symmetrical, test the manager's suspicion at the 5% significance level.
### Mark Scheme / Solution
$H_0: m = 25.0$
$H_1: m > 25.0$ (B1)
Differences from median are: 0.3, 0.8, -0.1, 1.1, 0.5, 1.4, 0.2, 1.0, 0.7. (M1)
The absolute differences are: 0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 1.0, 1.1, 1.4.
The corresponding ranks are: 1, 2, 3, 4, 5, 6, 7, 8, 9. (M1)
The rank for the single negative difference (-0.1) is 1.
Sum of ranks of positive differences, $W+ = 2+3+4+5+6+7+8+9 = 44$.
Sum of ranks of negative differences, $W- = 1$.
The test statistic is $T = \min(W+, W-) = 1$. (A1)
For a one-tailed test at the 5% level with $n=9$, the critical value from tables is 8. (B1)
Since $1 < 8$, we reject $H_0$. (M1)
There is sufficient evidence at the 5% level to support the manager's suspicion that the median length of the rods is greater than 25.0 cm. (A1)
### Standard Solution Steps
- State the null and alternative hypotheses for the population median, $m$.
- For each observation, calculate the difference from the hypothesised median.
- Rank the absolute values of the non-zero differences from smallest to largest.
- Calculate $W+$, the sum of ranks corresponding to positive differences, and $W-$, the sum of ranks corresponding to negative differences.
- The test statistic $T$ is the smaller of $W+$ and $W-$.
- Find the appropriate critical value from the Wilcoxon signed-rank test table for the sample size $n$ and the significance level.
- Compare the test statistic $T$ to the critical value. If $T$ is less than or equal to the critical value, reject $H_0$.
- State the conclusion in the context of the problem.
### Common Mistakes
- Incorrectly stating the hypotheses, particularly for a one-tailed test.
- Errors in calculating differences or ranking the absolute differences.
- Confusing $W+$ and $W-$, or using the larger value as the test statistic.
- Using the wrong significance level for a one-tailed test (e.g., looking up 2.5% instead of 5%).
- Forgetting to state the conclusion in context.
### Tags
wilcoxon_signed_rank_test, hypothesis_test, single_sample, population_median, non_parametric
---
## Non-parametric tests: Wilcoxon Rank-Sum Test (Normal Approximation)
**Syllabus Reference**: 4.4
**Learning Objective**: Use a paired-sample sign test, a Wilcoxon matched-pairs signed-rank test and a Wilcoxon rank-sum test, as appropriate, to test for identity of populations (including the use of normal approximations where appropriate; questions will not involve tied ranks or zero-difference pairs).
### Example Question
A researcher wishes to compare the reaction times of two groups of people, A and B, to a specific stimulus. The reaction times, in milliseconds, for a random sample from each group are recorded.
Group A ($n_A=11$): 210, 215, 223, 228, 231, 235, 240, 242, 248, 251, 255.
Group B ($n_B=12$): 220, 225, 229, 233, 238, 245, 249, 253, 258, 260, 263, 265.
Test, at the 10% significance level, whether there is a difference in the median reaction times of the two groups.
### Mark Scheme / Solution
$H_0$: There is no difference in the median reaction times for the two groups.
$H_1$: There is a difference in the median reaction times for the two groups. (B1)
Combined ranks (A for Group A, B for Group B): 210(1,A), 215(2,A), 220(3,B), 223(4,A), 225(5,B), 228(6,A), 229(7,B), 231(8,A), 233(9,B), 235(10,A), 238(11,B), 240(12,A), 242(13,A), 245(14,B), 248(15,A), 249(16,B), 251(17,A), 253(18,B), 255(19,A), 258(20,B), 260(21,B), 263(22,B), 265(23,B). (M1 for ranking)
Sum of ranks for the smaller group (A), $R_A = 1+2+4+6+8+10+12+13+15+17+19 = 107$. (A1)
Since sample sizes are large, use normal approximation. $n_1=11$, $n_2=12$.
Mean $\mu_R = \frac{1}{2} n_1 (n_1 + n_2 + 1) = \frac{1}{2}(11)(11+12+1) = \frac{1}{2}(11)(24) = 132$. (M1)
Variance $\sigma_R^2 = \frac{1}{12} n_1 n_2 (n_1 + n_2 + 1) = \frac{1}{12}(11)(12)(24) = 264$. (A1)
Using continuity correction, since $107 < 132$, we use $107.5$.
$z = \frac{R_A + 0.5 - \mu_R}{\sqrt{\sigma_R^2}} = \frac{107.5 - 132}{\sqrt{264}} = \frac{-24.5}{16.248...} = -1.5079...$ (M1 A1)
The critical value for a two-tailed test at the 10% significance level is $z = \pm1.645$. (B1)
Since $|-1.508| < 1.645$, we do not reject $H_0$. (M1)
There is insufficient evidence at the 10% significance level to conclude that there is a difference in the median reaction times between the two groups. (A1)
### Standard Solution Steps
- State the null and alternative hypotheses regarding the equality of the two population medians.
- Combine the data from both samples into a single set and rank all values from smallest to largest.
- Calculate the sum of ranks for one of the samples, usually the smaller one ($R$).
- For large samples, calculate the mean ($\mu_R$) and variance ($\sigma_R^2$) of the rank sum statistic.
- Standardise the rank sum using the normal approximation formula $z = \frac{R \pm 0.5 - \mu_R}{\sigma_R}$, applying a continuity correction.
- Find the critical z-value(s) from the standard normal distribution table for the given significance level.
- Compare the calculated z-statistic with the critical value(s) and make a decision about $H_0$.
- State the conclusion in the context of the problem.
### Common Mistakes
- Errors in the tedious process of ranking the combined data.
- Forgetting to apply the continuity correction, or applying it in the wrong direction (subtracting 0.5 when R < mu, or adding when R > mu).
- Using incorrect formulae for the mean and variance of the rank sum.
- Using a one-tailed critical value for a two-tailed test.
- Calculation errors when finding the z-statistic.
### Tags
wilcoxon_rank_sum_test, two_sample, hypothesis_test, normal_approximation, non_parametric
---
## Non-parametric tests: Paired-Sample Sign Test
**Syllabus Reference**: 4.4
**Learning Objective**: Use a paired-sample sign test, a Wilcoxon matched-pairs signed-rank test and a Wilcoxon rank-sum test, as appropriate, to test for identity of populations (including the use of normal approximations where appropriate; questions will not involve tied ranks or zero-difference pairs).
### Example Question
An agronomist wants to test if a new fertilizer increases the yield of a specific crop. 12 plots of land are used. One half of each plot is treated with the new fertilizer (F), and the other half is a control (C). The yields, in kg, are recorded for each half-plot.
Plot data: (C, F)
(45.2, 47.1), (39.8, 39.5), (51.0, 52.3), (48.5, 50.0), (42.1, 43.5), (47.9, 47.9), (44.3, 45.9), (53.4, 55.0), (49.1, 50.2), (46.8, 46.1), (50.5, 51.8), (43.7, 45.3)
Using a sign test, test at the 5% significance level whether the new fertilizer increases the median crop yield.
### Mark Scheme / Solution
$H_0$: The fertilizer has no effect on median crop yield (median difference is 0).
$H_1$: The fertilizer increases the median crop yield (median difference is > 0). (B1)
Calculate the sign of the difference (F - C) for each pair.
Differences: +1.9, -0.3, +1.3, +1.5, +1.4, 0, +1.6, +1.6, +1.1, -0.7, +1.3, +1.6. (M1)
The signs are: +, -, +, +, +, (ignore 0), +, +, +, -, +, +. (A1)
There is one zero difference, so the effective sample size is $n = 11$.
Number of positive signs = 9. Number of negative signs = 2. (M1)
The test statistic is the number of the less frequent sign, so $S = 2$. (A1)
Under $H_0$, the number of negative signs, $X$, follows a binomial distribution $B(11, 0.5)$. (M1)
We are testing if the number of negative signs is unusually small.
We calculate the p-value, $P(X \le 2)$. (M1)
$P(X \le 2) = P(X=0) + P(X=1) + P(X=2) = (\frac{1}{2})^{11} [\binom{11}{0} + \binom{11}{1} + \binom{11}{2}]$ (M1)
$= \frac{1}{2048} [1 + 11 + 55] = \frac{67}{2048} = 0.0327...$ (A1)
Comparing the p-value to the significance level: $0.0327 < 0.05$. (M1)
We reject $H_0$. There is significant evidence at the 5% level to suggest that the new fertilizer increases the median crop yield. (A1)
### Standard Solution Steps
- State the null and alternative hypotheses about the median of the differences.
- Calculate the difference for each data pair.
- Determine the sign (+ or -) of each difference.
- Exclude any pairs with a zero difference and adjust the sample size, $n$.
- Count the number of positive signs and the number of negative signs.
- The test statistic, $S$, is the smaller of these two counts.
- Calculate the p-value, which is the probability $P(X \le S)$ where $X \sim B(n, 0.5)$. For a two-tailed test, this value is doubled.
- Compare the p-value with the significance level ($\alpha$). If p-value < $\alpha$, reject $H_0$.
- State the conclusion in the context of the problem.
### Common Mistakes
- Forgetting to discard zero differences and reduce the sample size $n$ accordingly.
- Confusing the test statistic with the number of the more frequent sign.
- Incorrectly calculating the binomial probability, either by formula or using tables.
- For a one-tailed test, testing in the wrong tail (e.g., calculating $P(X \ge S)$ instead of $P(X \le S)$).
- Simply comparing the test statistic $S$ to the significance level, rather than calculating a p-value or finding a critical value for $S$.
### Tags
sign_test, paired_sample, hypothesis_test, non_parametric, binomial_distribution