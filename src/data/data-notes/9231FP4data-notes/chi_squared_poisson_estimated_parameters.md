## Chi-squared Tests: Goodness of Fit for a Binomial Distribution

**Syllabus Reference**: 6.1

**Learning Objective**: Carry out a chi-squared goodness-of-fit test for a binomial distribution.

### Example Question
A geneticist claims that the probability of a newborn mouse being male is $0.5$. To test this claim, 80 litters, each containing 5 mice, were observed. The number of male mice in each litter was recorded.

| Number of Males | 0 | 1 | 2 | 3 | 4 | 5 |
|-----------------|---|---|---|---|---|---|
| Number of Litters (Observed) | 3 | 14 | 24 | 25 | 10 | 4 |

Test the geneticist's claim at the $5\%$ significance level.

### Mark Scheme / Solution
$H_0$: The number of male mice in a litter of 5 follows the distribution $B(5, 0.5)$. B1
$H_1$: The number of male mice in a litter of 5 does not follow the distribution $B(5, 0.5)$. B1

The total number of litters is $N=80$.
Expected frequencies $E_i = N \times P(X=i)$.
$P(X=0) = \binom{5}{0}(0.5)^5 = 0.03125 \implies E_0 = 80 \times 0.03125 = 2.5$
$P(X=1) = \binom{5}{1}(0.5)^5 = 0.15625 \implies E_1 = 80 \times 0.15625 = 12.5$
$P(X=2) = \binom{5}{2}(0.5)^5 = 0.3125 \implies E_2 = 80 \times 0.3125 = 25$
$P(X=3) = \binom{5}{3}(0.5)^5 = 0.3125 \implies E_3 = 80 \times 0.3125 = 25$
$P(X=4) = \binom{5}{4}(0.5)^5 = 0.15625 \implies E_4 = 80 \times 0.15625 = 12.5$
$P(X=5) = \binom{5}{5}(0.5)^5 = 0.03125 \implies E_5 = 80 \times 0.03125 = 2.5$
M1 for calculating expected probabilities or frequencies.

Since $E_0 < 5$ and $E_5 < 5$, we pool the first two and last two categories.
| Number of Males | 0 or 1 | 2 | 3 | 4 or 5 |
|-----------------|--------|---|---|--------|
| Observed ($O_i$) | 17 | 24 | 25 | 14 |
| Expected ($E_i$) | 15 | 25 | 25 | 15 |
B1 for correct pooling.

The test statistic is $\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$.
$\chi^2_{calc} = \frac{(17-15)^2}{15} + \frac{(24-25)^2}{25} + \frac{(25-25)^2}{25} + \frac{(14-15)^2}{15}$ M1
$\chi^2_{calc} = \frac{4}{15} + \frac{1}{25} + 0 + \frac{1}{15} = \frac{5}{15} + \frac{1}{25} = \frac{1}{3} + 0.04 = 0.373$ A1

Degrees of freedom $\nu = (\text{number of categories after pooling}) - 1 = 4 - 1 = 3$. B1
Critical value at $5\%$ significance for $\nu=3$ is $\chi^2_{crit} = 7.815$. B1

Since $0.373 < 7.815$, we do not reject $H_0$. A1
There is insufficient evidence at the $5\%$ level to suggest the geneticist's claim is incorrect. E1

### Standard Solution Steps
- State hypotheses for the binomial goodness of fit.
- Calculate the expected frequencies using the binomial probability formula.
- Pool categories where the expected frequency is less than 5.
- Calculate the chi-squared test statistic.
- Determine the degrees of freedom and find the critical value.
- Compare the calculated statistic to the critical value and state the conclusion in context.

### Common Mistakes
- Forgetting to pool categories with expected frequencies less than 5.
- Using incorrect degrees of freedom after pooling. The number of categories used is the number *after* pooling.
- Calculating probabilities incorrectly.
- Stating an incorrect conclusion, such as accepting $H_0$.

### Tags
chi_squared, goodness_of_fit, binomial_distribution, pooling_categories, syllabus_4_3

---
## Chi-squared Tests: Independence in a Contingency Table

**Syllabus Reference**: 6.1

**Learning Objective**: Carry out a chi-squared test for independence in a contingency table.

### Example Question
A researcher surveyed 200 people to investigate whether there is an association between a person's age group and their primary source of news. The results are shown in the table below.

| Age Group | TV | Newspapers | Online |
|-----------|----|------------|--------|
| 18-35     | 15 | 10         | 65     |
| 36-55     | 30 | 25         | 25     |
| Over 55   | 40 | 35         | 5      |

Test, at the $10\%$ significance level, whether age group and primary source of news are independent.

### Mark Scheme / Solution
$H_0$: Age group and primary source of news are independent. B1
$H_1$: Age group and primary source of news are not independent. B1

First, calculate row and column totals.
| Age Group | TV | Newspapers | Online | Total |
|-----------|----|------------|--------|-------|
| 18-35     | 15 | 10         | 65     | 90    |
| 36-55     | 30 | 25         | 25     | 80    |
| Over 55   | 40 | 35         | 5      | 80    |
| Total     | 85 | 70         | 95     | 200   |

Expected frequency formula: $E_{ij} = \frac{\text{Row Total}_i \times \text{Column Total}_j}{\text{Grand Total}}$. M1
Example calculation: $E_{11} = \frac{90 \times 85}{200} = 38.25$.

Table of Expected Frequencies:
| Age Group | TV | Newspapers | Online |
|-----------|---------|------------|--------|
| 18-35     | 38.25   | 31.5       | 42.75  |
| 36-55     | 34      | 28         | 38     |
| Over 55   | 34      | 28         | 38     |
A1 for at least 3 correct expected frequencies.

Test statistic: $\chi^2_{calc} = \sum \frac{(O_i - E_i)^2}{E_i}$
$\chi^2_{calc} = \frac{(15-38.25)^2}{38.25} + \frac{(10-31.5)^2}{31.5} + ... + \frac{(5-38)^2}{38}$ M1 for correct application of formula.
$\chi^2_{calc} = 14.15 + 14.71 + 11.52 + 0.47 + 0.32 + 4.32 + 1.06 + 2.18 + 28.66$
$\chi^2_{calc} = 77.39$ A1

Degrees of freedom $\nu = (r-1)(c-1) = (3-1)(3-1) = 2 \times 2 = 4$. B1
Critical value at $10\%$ significance for $\nu=4$ is $\chi^2_{crit} = 7.779$. B1

Since $77.39 > 7.779$, we reject $H_0$. A1
There is sufficient evidence at the $10\%$ level to suggest that age group and primary source of news are not independent. E1

### Standard Solution Steps
- State hypotheses for independence.
- Calculate row, column, and grand totals.
- Calculate the expected frequency for each cell in the table.
- Calculate the chi-squared test statistic.
- Determine the degrees of freedom using the formula $(r-1)(c-1)$.
- Find the critical value and compare it with the calculated statistic to make a conclusion.

### Common Mistakes
- Using an incorrect formula for degrees of freedom, often $(rc-1)$.
- Calculation errors when finding expected frequencies.
- Failing to state the conclusion in the context of the problem.
- Mixing up observed and expected frequencies in the chi-squared formula.

### Tags
chi_squared, independence, contingency_table, association, syllabus_4_3

---
## Chi-squared Tests: Goodness of Fit for Poisson (Estimated Mean)

**Syllabus Reference**: 6.1

**Learning Objective**: Carry out a chi-squared goodness-of-fit test for a Poisson distribution, including cases where a parameter is estimated from the data.

### Example Question
The number of accidents per month on a stretch of road was recorded over a period of 100 months.

| Number of Accidents | 0 | 1 | 2 | 3 | 4 | $\ge 5$ |
|---------------------|---|---|---|---|---|---------|
| Frequency (months)  | 30 | 38 | 19 | 8 | 3 | 2       |

Test, at the $5\%$ significance level, whether the number of accidents per month can be modelled by a Poisson distribution.

### Mark Scheme / Solution
$H_0$: The number of accidents per month follows a Poisson distribution. B1
$H_1$: The number of accidents per month does not follow a Poisson distribution. B1

The mean of the Poisson distribution is not given, so it must be estimated from the data.
Total accidents = $(0 \times 30) + (1 \times 38) + (2 \times 19) + (3 \times 8) + (4 \times 3) + (5 \times 2) = 0 + 38 + 38 + 24 + 12 + 10 = 122$.
(Treating $\ge 5$ as 5 for mean calculation).
Estimated mean $\lambda = \frac{122}{100} = 1.22$. M1 A1

Now calculate expected frequencies using $E_i = 100 \times P(X=i)$ with $\lambda = 1.22$.
$P(X=0) = e^{-1.22} = 0.2952 \implies E_0 = 29.52$
$P(X=1) = e^{-1.22} \frac{1.22^1}{1!} = 0.3602 \implies E_1 = 36.02$
$P(X=2) = e^{-1.22} \frac{1.22^2}{2!} = 0.2197 \implies E_2 = 21.97$
$P(X=3) = e^{-1.22} \frac{1.22^3}{3!} = 0.0894 \implies E_3 = 8.94$
$P(X=4) = e^{-1.22} \frac{1.22^4}{4!} = 0.0273 \implies E_4 = 2.73$
$P(X \ge 5) = 1 - \sum_{i=0}^{4} P(X=i) = 1 - 0.9918 = 0.0082 \implies E_{\ge 5} = 0.82$.
M1 for calculating expected frequencies.

Since $E_4 < 5$ and $E_{\ge 5} < 5$, we must pool the last three categories ($X=3$, $X=4$, $X \ge 5$).
| Accidents ($i$) | 0 | 1 | 2 | $\ge 3$ |
|-----------------|------|------|------|---------|
| Observed ($O_i$) | 30 | 38 | 19 | 13 |
| Expected ($E_i$) | 29.52| 36.02| 21.97| 12.49 |
B1 for correct pooling. (Note: $E_{\ge 3} = 8.94 + 2.73 + 0.82 = 12.49$)

$\chi^2_{calc} = \sum \frac{(O_i - E_i)^2}{E_i} = \frac{(30-29.52)^2}{29.52} + \frac{(38-36.02)^2}{36.02} + \frac{(19-21.97)^2}{21.97} + \frac{(13-12.49)^2}{12.49}$ M1
$\chi^2_{calc} = 0.0078 + 0.1089 + 0.4018 + 0.0208 = 0.539$ A1

Degrees of freedom $\nu = (\text{categories after pooling}) - 1 - (\text{parameters estimated}) = 4 - 1 - 1 = 2$. B1
Critical value at $5\%$ significance for $\nu=2$ is $\chi^2_{crit} = 5.991$. B1

Since $0.539 < 5.991$, we do not reject $H_0$. A1
There is insufficient evidence at the $5\%$ level to suggest the data cannot be modelled by a Poisson distribution. E1

### Standard Solution Steps
- State hypotheses for the Poisson goodness of fit.
- Estimate the parameter $\lambda$ by calculating the sample mean.
- Calculate expected frequencies using the Poisson probability formula and the estimated $\lambda$.
- Pool categories to ensure all expected frequencies are at least 5.
- Calculate the chi-squared statistic.
- Determine degrees of freedom, remembering to subtract 1 for the estimated parameter.
- Compare the statistic to the critical value and state the conclusion.

### Common Mistakes
- Forgetting to subtract an extra 1 from the degrees of freedom for the estimated parameter $\lambda$.
- Errors in calculating the sample mean to estimate $\lambda$.
- Incorrectly pooling categories, or forgetting to pool.
- Using an incorrect formula for Poisson probabilities.

### Tags
chi_squared, goodness_of_fit, poisson_distribution, estimated_parameter, syllabus_4_3