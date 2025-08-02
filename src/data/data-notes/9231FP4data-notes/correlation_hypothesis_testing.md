## Correlation and Regression: Hypothesis Test for Pearson's PMCC

**Syllabus Reference**: 5.2

**Learning Objective**: Conduct a hypothesis test for the population product moment correlation coefficient, $\rho$, being zero.

### Example Question
A psychology student investigates the relationship between the number of hours a person sleeps per night, $x$, and their score on a cognitive test, $y$. The data for 8 adults are shown below.
| Hours of sleep, $x$ | 5.5 | 6.0 | 6.5 | 7.0 | 7.5 | 8.0 | 8.5 | 9.0 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Test score, $y$ | 61 | 58 | 65 | 71 | 70 | 78 | 75 | 82 |

Summary statistics for these data are:
$\Sigma x = 58$, $\Sigma y = 560$, $\Sigma x^2 = 434$, $\Sigma y^2 = 39510$, $\Sigma xy = 4097$.

Test, at the 5% significance level, whether there is evidence of a correlation between hours of sleep and cognitive test score.

### Mark Scheme / Solution
State the null and alternative hypotheses. $H_0: \rho = 0$, $H_1: \rho \neq 0$. B1

Calculate $S_{xx}$, $S_{yy}$ and $S_{xy}$.
$S_{xx} = \Sigma x^2 - \frac{(\Sigma x)^2}{n} = 434 - \frac{58^2}{8} = 13.5$. M1
$S_{yy} = \Sigma y^2 - \frac{(\Sigma y)^2}{n} = 39510 - \frac{560^2}{8} = 310$.
$S_{xy} = \Sigma xy - \frac{(\Sigma x)(\Sigma y)}{n} = 4097 - \frac{58 \times 560}{8} = 37$. A1 for all three correct.

Calculate Pearson's product-moment correlation coefficient, $r$.
$r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}} = \frac{37}{\sqrt{13.5 \times 310}} = 0.5721...$. M1 A1

Find the critical value from the tables for a two-tailed test with $n=8$ at the 5% significance level. Critical value is $0.7067$. B1

Compare the test statistic to the critical value and state the conclusion.
Since $|0.572| < 0.7067$, we do not reject $H_0$. M1
There is insufficient evidence at the 5% significance level to suggest a correlation between hours of sleep and cognitive test score. A1

### Standard Solution Steps
- Step 1: State the null hypothesis $H_0: \rho = 0$ and the alternative hypothesis $H_1: \rho \neq 0$ (or $\rho > 0$ or $\rho < 0$).
- Step 2: Use the summary statistics to calculate $S_{xx}$, $S_{yy}$, and $S_{xy}$.
- Step 3: Use the values from Step 2 to calculate the test statistic, $r$.
- Step 4: Find the appropriate critical value from the statistical tables, using the sample size $n$ and the significance level.
- Step 5: Compare the absolute value of $r$ to the critical value.
- Step 6: State the conclusion in the context of the problem.

### Common Mistakes
- Stating a one-tailed alternative hypothesis when a two-tailed test is required by the question wording ('evidence of a correlation').
- Errors in calculating $S_{xx}$, $S_{yy}$, or $S_{xy}$ from the summary data.
- Looking up the wrong critical value from the tables (e.g., using the wrong significance level or sample size).
- Failing to compare the absolute value of $r$ to the critical value for a two-tailed test.
- Not writing the final conclusion in the context of the variables given in the question.

### Tags
- correlation, regression, pearson, pmcc, hypothesis test, 5.2

---

## Correlation and Regression: Hypothesis Test for Spearman's Rank

**Syllabus Reference**: 5.2

**Learning Objective**: Conduct a hypothesis test for a zero population rank correlation using Spearman's rank correlation coefficient, $r_s$.

### Example Question
Two wine critics, Anton and Ben, are asked to rank 9 different wines. The results are shown in the table.

| Wine | A | B | C | D | E | F | G | H | I |
| :--- | :- | :- | :- | :- | :- | :- | :- | :- | :- |
| Rank by Anton | 2 | 5 | 1 | 9 | 4 | 8 | 3 | 6 | 7 |
| Rank by Ben | 3 | 6 | 2 | 8 | 1 | 9 | 5 | 4 | 7 |

Test, at the 1% significance level, whether there is evidence of a positive association between the two critics' rankings.

### Mark Scheme / Solution
State the null and alternative hypotheses. $H_0: \rho_s = 0$, $H_1: \rho_s > 0$. B1

Calculate the differences in ranks, $d$, and the square of the differences, $d^2$.
| $d$ | -1 | -1 | -1 | 1 | 3 | -1 | -2 | 2 | 0 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| $d^2$ | 1 | 1 | 1 | 1 | 9 | 1 | 4 | 4 | 0 |
M1 for calculating differences.

Calculate the sum of the squared differences.
$\Sigma d^2 = 1 + 1 + 1 + 1 + 9 + 1 + 4 + 4 + 0 = 22$. A1

Calculate Spearman's rank correlation coefficient, $r_s$.
$r_s = 1 - \frac{6 \Sigma d^2}{n(n^2-1)} = 1 - \frac{6 \times 22}{9(9^2-1)} = 1 - \frac{132}{720} = 0.8166...$. M1 A1

Find the critical value from the tables for a one-tailed test with $n=9$ at the 1% significance level. Critical value is $0.7833$. B1

Compare the test statistic to the critical value and state the conclusion.
Since $0.817 > 0.7833$, we reject $H_0$. M1
There is sufficient evidence at the 1% significance level of a positive association between the rankings of the two wine critics. A1

### Standard Solution Steps
- Step 1: State the null and alternative hypotheses in terms of the population rank correlation, $\rho_s$.
- Step 2: If data is not already ranked, rank each variable. Handle tied ranks correctly if they exist.
- Step 3: Calculate the difference, $d$, between each pair of ranks and then square it to find $d^2$.
- Step 4: Sum the squared differences to find $\Sigma d^2$.
- Step 5: Calculate Spearman's rank correlation coefficient, $r_s = 1 - \frac{6 \Sigma d^2}{n(n^2-1)}$.
- Step 6: Find the appropriate one-tailed or two-tailed critical value from the tables.
- Step 7: Compare $r_s$ to the critical value and make a decision to reject or not reject $H_0$.
- Step 8: State the conclusion clearly in the context of the question.

### Common Mistakes
- Errors in ranking the data, especially when there are tied ranks.
- Calculation errors when finding $d$ or $d^2$, particularly with negative signs.
- Forgetting the '1 -' part of the formula for $r_s$.
- Using the formula for Pearson's PMCC by mistake.
- Using the wrong critical value (e.g., using a 5% value for a 1% test, or a two-tailed value for a one-tailed test).

### Tags
correlation, spearman, non_parametric, hypothesis_test, rank, syllabus_5_2

---

## Correlation and Regression: Appropriateness of a Test

**Syllabus Reference**: 5.2

**Learning Objective**: Understand the circumstances in which it is more appropriate to use Spearman's rank correlation coefficient than the product moment correlation coefficient.

### Example Question
A researcher is investigating the relationship between the age of a machine, in years, and the monthly cost of its maintenance, in dollars. Data from 10 machines is collected. A scatter plot of the data is shown below, indicating a relationship that is not linear.



(i) Explain why it would be more appropriate to use a test based on Spearman's rank correlation coefficient than Pearson's product-moment correlation coefficient to test for a relationship.

(ii) The value of Spearman's rank correlation coefficient for these 10 data points is calculated to be $r_s = 0.7576$. Carry out a hypothesis test at the 5% significance level to determine if there is evidence of a positive correlation between the age of a machine and its maintenance cost.

### Mark Scheme / Solution
(i) Pearson's PMCC is a measure of the strength of a *linear* relationship between two variables. The scatter plot shows that the relationship is clearly non-linear. Spearman's rank correlation coefficient measures the strength of a *monotonic* relationship (i.e., whether one variable consistently increases or decreases as the other increases). Since the data appears to be monotonic but non-linear, Spearman's is the more appropriate measure. E1

(ii) State the null and alternative hypotheses.
$H_0: \rho_s = 0$
$H_1: \rho_s > 0$
B1

The test statistic is given as $r_s = 0.7576$.

Find the critical value from the tables for a one-tailed test with $n=10$ at the 5% significance level. M1 for identifying the correct test parameters.
Critical value is $0.5636$. A1

Compare the test statistic to the critical value and state the conclusion.
Since $0.7576 > 0.5636$, we reject $H_0$. M1
There is sufficient evidence at the 5% significance level to conclude there is a positive correlation between the age of the machine and its monthly maintenance cost. A1

### Standard Solution Steps
- Step 1: For appropriateness questions, inspect the data or scatter plot for linearity.
- Step 2: State that Pearson's tests for linear association, while Spearman's tests for monotonic association.
- Step 3: Conclude which is more appropriate based on the observed pattern.
- Step 4: For the hypothesis test, state the hypotheses for $\rho_s$.
- Step 5: Identify the given test statistic, $r_s$.
- Step 6: Find the correct critical value from tables based on $n$, significance level, and whether the test is one-tailed or two-tailed.
- Step 7: Compare the test statistic to the critical value and write a conclusion in context.

### Common Mistakes
- Giving a vague reason such as 'the data is not on a straight line' without explaining what each coefficient actually measures.
- Confusing monotonic with linear.
- Forgetting to state hypotheses for the test in part (ii).
- In the conclusion, failing to mention the significance level and the context of the problem.

### Tags
- correlation, spearman, pearson, appropriateness, hypothesis test, 5.2