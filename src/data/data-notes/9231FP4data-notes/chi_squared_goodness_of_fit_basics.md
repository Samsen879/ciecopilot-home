## Chi-squared Tests: Core Concepts and Procedure

Chi-squared (${\chi}^2$) tests are a class of statistical inference methods used to analyze categorical data. They evaluate the discrepancy between observed frequencies and the frequencies that would be expected under a null hypothesis.

- The Chi-squared Test Statistic
    - The statistic is calculated using the formula:
    - $ \chi^2_{\text{calc}} = \sum_{i=1}^{n} \frac{(O_i - E_i)^2}{E_i} $
    - where:
        - -$O_i$ is the observed frequency in the i-th category.
        - -$E_i$ is the expected frequency in the i-th category under the null hypothesis.
        - -$n$ is the number of categories.

- Types of Chi-squared Tests
    - Goodness-of-Fit (GoF) Test: Tests if the observed frequency distribution of a single categorical variable matches a specific theoretical distribution (e.g., uniform, binomial, normal).
    - Test for Independence: Uses a contingency table to determine if there is a significant association between two categorical variables.

- Degrees of Freedom ($\nu$)
    - This parameter defines the specific chi-squared distribution used to find the critical value.
    - For a GoF test: $\nu = n - 1 - k$, where $n$ is the number of categories after any pooling, and $k$ is the number of population parameters estimated from the sample data.
    - For a test for independence: $\nu = (\text{number of rows} - 1) \times (\text{number of columns} - 1)$.

### Standard Procedure

- State the hypotheses in words.
    - -$H_0$: The data conforms to the specified distribution, or the two variables are independent.
    - -$H_1$: The data does not conform to the specified distribution, or the two variables are not independent.

- Calculate the expected frequencies ($E_i$) based on the null hypothesis.

- Check the condition for expected frequencies. If any $E_i < 5$, categories must be combined (pooled) with adjacent ones until all expected frequencies are at least 5.

- Construct a table to calculate the test statistic, listing each category's $O_i$, $E_i$, and the component contribution $\frac{(O_i - E_i)^2}{E_i}$.

- Sum the contributions to find the calculated test statistic, $\chi^2_{calc}$.

- Determine the degrees of freedom ($\nu$).

- Find the critical value, $\chi^2_{crit}$, from statistical tables using the significance level and degrees of freedom.

- Compare the calculated statistic to the critical value.
    - -If $\chi^2_{calc} > \chi^2_{crit}$, reject $H_0$.
    - -If $\chi^2_{calc} \le \chi^2_{crit}$, do not reject $H_0$.

- Write a final conclusion in the context of the original problem.

### Common Issues

- Incorrect degrees of freedom ($\nu$). A frequent error is forgetting to subtract 1 for each parameter (like $\mu$ or $p$) estimated from the sample data in a goodness-of-fit test.

- Incorrect hypotheses. For a GoF test, hypotheses should be about the distribution itself, not a parameter.

- Failure to pool categories. The test is invalid if any expected frequency is less than 5. Categories must be combined based on expected, not observed, frequencies.

- Definitive conclusions. A statistically sound conclusion is "there is insufficient evidence to reject the null hypothesis," not "the variables are independent."

- Computational errors. Using a structured table helps minimize arithmetic mistakes.

---
## Chi-squared Tests: Goodness of Fit (Binomial Distribution)

### Question
An amateur meteorologist records the number of rainy days in a particular town over a period of 250 weeks. He believes that the number of rainy days per week follows a binomial distribution $B(7, p)$. The results are summarised in the table below.

| Number of rainy days per week | 0 | 1 | 2 | 3 | 4 | 5 | 6 or 7 |
|-------------------------------|---|---|---|---|---|---|----------|
| Observed frequency            | 8 | 25| 48| 65| 60| 27| 17       |

(i) Show that an estimate for the value of $p$, the probability of a day being rainy, is approximately $0.45$.

(ii) Carry out a goodness of fit test at the 5% significance level to determine whether the binomial distribution $B(7, 0.45)$ is a suitable model for these data.

### Solution
(i) Estimate for $p$

To estimate $p$, we equate the sample mean to the theoretical mean of the binomial distribution, $np$.
First, calculate the sample mean, $\bar{x} = \frac{\sum fx}{\sum f}$. The final category is ambiguous, so a reasonable assumption must be made to proceed. Let's assume the 17 weeks in '6 or 7' were distributed as 10 weeks with 6 rainy days and 7 weeks with 7 rainy days.
$\sum f = 8+25+48+65+60+27+17 = 250$.
$\sum fx = (0 \times 8) + (1 \times 25) + (2 \times 48) + (3 \times 65) + (4 \times 60) + (5 \times 27) + (6 \times 10) + (7 \times 7)$
$\sum fx = 0 + 25 + 96 + 195 + 240 + 135 + 60 + 49 = 788$. (M1)

Mean $\bar{x} = \frac{788}{250} = 3.152$.
The mean of $B(7, p)$ is $7p$. We set $7p = \bar{x}$.
$7p = 3.152 \implies p = \frac{3.152}{7} \approx 0.4502...$
Thus, an estimate for $p$ is $0.45$. (A1)

(ii) Goodness of Fit Test

Step 1: Hypotheses
-$H_0$: The number of rainy days per week can be modelled by $B(7, 0.45)$. (B1)
-$H_1$: The number of rainy days per week cannot be modelled by $B(7, 0.45)$.

Step 2: Calculate Expected Frequencies
Let $X \sim B(7, 0.45)$. Total frequency $N=250$. Expected frequency $E_i = N \times P(X=i)$.
$P(X=x) = \binom{7}{x} (0.45)^x (0.55)^{7-x}$.
-$P(X=0) = (0.55)^7 = 0.01522$. $E_0 = 250 \times 0.01522 = 3.805$.
-$P(X=1) = 7(0.45)(0.55)^6 = 0.07739$. $E_1 = 250 \times 0.07739 = 19.348$.
-$P(X=2) = \binom{7}{2}(0.45)^2(0.55)^5 = 0.2140$. $E_2 = 250 \times 0.2140 = 53.5$.
-$P(X=3) = \binom{7}{3}(0.45)^3(0.55)^4 = 0.2918$. $E_3 = 250 \times 0.2918 = 72.95$.
-$P(X=4) = \binom{7}{4}(0.45)^4(0.55)^3 = 0.2388$. $E_4 = 250 \times 0.2388 = 59.7$.
-$P(X=5) = \binom{7}{5}(0.45)^5(0.55)^2 = 0.1172$. $E_5 = 250 \times 0.1172 = 29.3$.
-$P(X \ge 6) = 1 - \sum_{i=0}^{5} P(X=i) = 1 - 0.9544 = 0.0456$. $E_{\ge 6} = 250 \times 0.0456 = 11.4$. (M1 for probabilities, A1 for E values)

Step 3: Pool categories and Calculate $\chi^2$
The expected frequency for $X=0$ is $E_0 = 3.805$, which is less than 5. We pool this category with the next one. (B1 for pooling)

| Number of days | Observed (O) | Expected (E) | $\frac{(O-E)^2}{E}$ |
|----------------|--------------|--------------|-------------------|
| 0 or 1         | $8+25 = 33$  | $3.805+19.348 = 23.153$ | $4.187$ |
| 2              | $48$         | $53.5$       | $0.565$  |
| 3              | $65$         | $72.95$      | $0.867$ |
| 4              | $60$         | $59.7$       | $0.0015$ |
| 5              | $27$         | $29.3$       | $0.181$  |
| 6 or 7         | $17$         | $11.4$       | $2.751$  |
| Total          | 250          | 250          | $\chi^2_{calc} = 8.553$ |
(M1 for $\chi^2$ components)
$\chi^2_{calc} = 8.553$ (A1)

Step 4: Determine Degrees of Freedom and Critical Value
- Number of categories after pooling = 6.
- Number of parameters estimated = 1 (we estimated $p$).
- Degrees of freedom $v = 6 - 1 - 1 = 4$. (B1)
- Significance level = 5% or $0.05$.
- Critical value from $\chi^2$ tables for $v=4$ is $\chi^2_{crit}(0.05) = 9.488$. (B1)

Step 5: Compare and Conclude
We have $\chi^2_{calc} = 8.553$ and $\chi^2_{crit} = 9.488$.
Since $8.553 < 9.488$, we do not reject $H_0$. (M1)
There is insufficient evidence at the 5% significance level to reject the claim that the number of rainy days per week can be modelled by the binomial distribution $B(7, 0.45)$. (A1 FT)

### Solution Steps
- (Part i) State that the parameter $p$ is estimated by equating the sample mean ($\bar{x}$) to the theoretical mean ($np$). Calculate the sample mean from the data, making a reasonable assumption for the grouped final category, and solve for $p$.
- (Part ii) State the null ($H_0$) and alternative ($H_1$) hypotheses.
- Calculate the probability for each outcome using the $B(7, 0.45)$ distribution.
- Multiply these probabilities by the total frequency ($N=250$) to find the expected frequencies ($E_i$).
- Check the expected frequencies. If any $E_i < 5$, combine that category with an adjacent one.
- Calculate the chi-squared test statistic using the formula $\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$.
- Determine the degrees of freedom: $v = (\text{categories after pooling}) - 1 - (\text{parameters estimated})$.
- Find the critical value from chi-squared tables for the calculated degrees of freedom and significance level.
- Compare the calculated statistic with the critical value and state the conclusion in context.

### Tags
chi_squared, goodness_of_fit, binomial_distribution, parameter_estimation, hypothesis_testing

---
## Chi-squared Tests: Goodness of Fit (Normal Distribution)

### Question
A biologist is studying the lengths of a certain species of lizard. A random sample of 200 lizards is taken, and their lengths, $x$ cm, are measured. The results are summarised in the following table.

| Length, $x$ (cm) | $10 \le x < 14$ | $14 \le x < 16$ | $16 \le x < 18$ | $18 \le x < 20$ | $20 \le x < 24$ |
|------------------|-----------------|-----------------|-----------------|-----------------|-----------------|
| Frequency        | 16              | 45              | 78              | 42              | 19              |

It is believed that the lengths of these lizards are normally distributed.
(i) Calculate estimates of the mean and variance of the lengths of the lizards.
(ii) Test, at the 10% significance level, whether a normal distribution is a suitable model for these data.

### Solution
(i) Estimates of mean and variance

We use the midpoints of the classes: 12, 15, 17, 19, 22.
Total frequency $\sum f = 200$.

Estimate of mean, $\bar{x} = \frac{\sum fx}{\sum f}$
$\sum fx = (12 \times 16) + (15 \times 45) + (17 \times 78) + (19 \times 42) + (22 \times 19) = 3409$. (M1)
$\bar{x} = \frac{3409}{200} = 17.045$. (A1)

Estimate of variance, $s^2 = \frac{1}{n-1} \left( \sum fx^2 - \frac{(\sum fx)^2}{n} \right)$
$\sum fx^2 = (12^2 \times 16) + (15^2 \times 45) + (17^2 \times 78) + (19^2 \times 42) + (22^2 \times 19) = 59329$. (M1)
$s^2 = \frac{1}{199} \left( 59329 - \frac{3409^2}{200} \right) = \frac{1}{199} (59329 - 58106.405) = 6.14369...$ (A1)
The estimated mean is $\mu \approx 17.045$ and variance is $\sigma^2 \approx 6.144$.

(ii) Goodness of Fit Test

Step 1: Hypotheses
-$H_0$: The lengths of the lizards can be modelled by a normal distribution. (B1)
-$H_1$: The lengths of the lizards cannot be modelled by a normal distribution.

Step 2: Calculate Expected Frequencies
We use the distribution $N(17.045, 6.1437)$. So $\sigma = \sqrt{6.1437} = 2.4787$. Total frequency $N=200$.
- For $x < 14$: $Z = \frac{14 - 17.045}{2.4787} = -1.229$. $P(X < 14) = \Phi(-1.229) = 0.1095$. $E_1 = 200 \times 0.1095 = 21.9$.
- For $14 \le x < 16$: $P(14 \le X < 16) = P(-1.229 \le Z < -0.4216) = 0.2272$. $E_2 = 200 \times 0.2272 = 45.44$.
- For $16 \le x < 18$: $P(16 \le X < 18) = P(-0.4216 \le Z < 0.3853) = 0.3133$. $E_3 = 200 \times 0.3133 = 62.66$.
- For $18 \le x < 20$: $P(18 \le X < 20) = P(0.3853 \le Z < 1.192) = 0.2334$. $E_4 = 200 \times 0.2334 = 46.68$.
- For $x \ge 20$: $P(X \ge 20) = P(Z \ge 1.192) = 0.1166$. $E_5 = 200 \times 0.1166 = 23.32$. (M1 for standardizing, M1 for probabilities, A1 for all E values)

Step 3: Calculate Test Statistic
All expected frequencies are greater than 5, so no pooling is necessary.

| Length, $x$ (cm) | Observed (O) | Expected (E) | $\frac{(O-E)^2}{E}$ |
|------------------|--------------|--------------|-------------------|
| $x < 14$         | 16           | 21.90        | $1.589$           |
| $14 \le x < 16$  | 45           | 45.44        | $0.004$           |
| $16 \le x < 18$  | 78           | 62.66        | $3.755$           |
| $18 \le x < 20$  | 42           | 46.68        | $0.469$           |
| $x \ge 20$       | 19           | 23.32        | $0.803$           |
| Total            | 200          | 200          | $\chi^2_{calc} = 6.62$ |
(M1 for applying the formula)
$\chi^2_{calc} = 6.62$. (A1)

Step 4: Determine Degrees of Freedom and Critical Value
- Number of categories = 5.
- Number of parameters estimated = 2 (we estimated $\mu$ and $\sigma^2$).
- Degrees of freedom $v = 5 - 1 - 2 = 2$. (B1)
- Significance level = 10% or $0.10$.
- Critical value from $\chi^2$ tables for $v=2$ is $\chi^2_{crit}(0.10) = 4.605$. (B1)

Step 5: Compare and Conclude
We have $\chi^2_{calc} = 6.62$ and $\chi^2_{crit} = 4.605$.
Since $6.62 > 4.605$, we reject $H_0$. (M1)
There is sufficient evidence at the 10% significance level to suggest that the lengths of the lizards are not normally distributed. (A1 FT)

### Solution Steps
- (Part i) Calculate midpoints for each class. Use these and the frequencies to calculate the sample mean ($\bar{x}$) and unbiased sample variance ($s^2$).
- (Part ii) State the null ($H_0$) and alternative ($H_1$) hypotheses.
- Using the estimated mean and standard deviation, calculate expected frequencies for each class by standardizing the boundaries and finding probabilities from the normal distribution.
- Check if any expected frequencies are below 5. Pool if necessary.
- Calculate the chi-squared test statistic, $\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$.
- Determine degrees of freedom: $v = (\text{categories}) - 1 - (\text{parameters estimated})$.
- Find the critical value from tables for the given significance level.
- Compare the statistic with the critical value and state the conclusion in context.

### Tags
chi_squared, goodness_of_fit, normal_distribution, parameter_estimation, grouped_data, continuous_data

---
## Chi-squared Tests: Test for Independence (Contingency Tables)

### Question
A sociologist wants to investigate whether there is an association between an individual's highest level of educational attainment and their preference for a news source. A random sample of 400 adults was surveyed. The results are shown in the contingency table below.

|                       | News Source Preference    |           |              |
|-----------------------|---------------------------|-----------|--------------|
| Education Level       | Television News           | Newspapers| Online Sources |
| High School           | 65                        | 35        | 50           |
| Bachelor's Degree     | 40                        | 55        | 85           |
| Postgraduate Degree   | 15                        | 25        | 30           |

Test, at the 5% significance level, whether there is an association between educational attainment and news source preference.

### Solution
Step 1: Hypotheses
-$H_0$: There is no association between educational attainment and news source preference. (They are independent). (B1)
-$H_1$: There is an association between educational attainment and news source preference. (They are not independent).

Step 2: Calculate Row and Column Totals

| Education Level       | TV News | Newspapers | Online | Row Total |
|-----------------------|---------|------------|--------|-----------|
| High School           | 65      | 35         | 50     | 150       |
| Bachelor's Degree     | 40      | 55         | 85     | 180       |
| Postgraduate Degree   | 15      | 25         | 30     | 70        |
| Column Total          | 120     | 115        | 165    | 400 (N)   |
(M1 for totals)

Step 3: Calculate Expected Frequencies
The formula for expected frequency is $E_{ij} = \frac{(\text{Row Total}_i) \times (\text{Column Total}_j)}{N}$.
-$E_{11} = \frac{150 \times 120}{400} = 45.0$
-$E_{12} = \frac{150 \times 115}{400} = 43.125$
-$E_{13} = \frac{150 \times 165}{400} = 61.875$
-$E_{21} = \frac{180 \times 120}{400} = 54.0$
-$E_{22} = \frac{180 \times 115}{400} = 51.75$
-$E_{23} = \frac{180 \times 165}{400} = 74.25$
-$E_{31} = \frac{70 \times 120}{400} = 21.0$
-$E_{32} = \frac{70 \times 115}{400} = 20.125$
-$E_{33} = \frac{70 \times 165}{400} = 28.875$
(M1 for formula, A1 for values)

Step 4: Calculate the $\chi^2$ Test Statistic
The contribution for each cell is $\frac{(O-E)^2}{E}$.
-$Cell_{11}: \frac{(65-45)^2}{45.0} = 8.889$
-$Cell_{12}: \frac{(35-43.125)^2}{43.125} = 1.531$
-$Cell_{13}: \frac{(50-61.875)^2}{61.875} = 2.281$
-$Cell_{21}: \frac{(40-54)^2}{54.0} = 3.630$
-$Cell_{22}: \frac{(55-51.75)^2}{51.75} = 0.204$
-$Cell_{23}: \frac{(85-74.25)^2}{74.25} = 1.556$
-$Cell_{31}: \frac{(15-21)^2}{21.0} = 1.714$
-$Cell_{32}: \frac{(25-20.125)^2}{20.125} = 1.182$
-$Cell_{33}: \frac{(30-28.875)^2}{28.875} = 0.044$
(M1 for method)

$\chi^2_{calc} = 8.889 + 1.531 + 2.281 + 3.630 + 0.204 + 1.556 + 1.714 + 1.182 + 0.044 = 21.031$ (A1)

Step 5: Determine Degrees of Freedom and Critical Value
- Degrees of freedom $v = (\text{rows} - 1) \times (\text{columns} - 1) = (3-1) \times (3-1) = 4$. (B1)
- Significance level = 5% or $0.05$.
- From $\chi^2$ tables, the critical value for $v=4$ at the 5% level is $\chi^2_{crit}(0.05) = 9.488$. (B1)

Step 6: Compare and Conclude
We have $\chi^2_{calc} = 21.031$ and $\chi^2_{crit} = 9.488$.
Since $21.031 > 9.488$, we reject the null hypothesis $H_0$. (M1)
There is significant evidence at the 5% level to suggest an association exists between an individual's level of educational attainment and their preferred news source. (A1)

### Solution Steps
- State the null ($H_0$) and alternative ($H_1$) hypotheses regarding the independence of the two variables.
- Calculate the totals for each row and column, and the grand total ($N$).
- Calculate the expected frequency for each cell using the formula $E = (\text{Row Total} \times \text{Column Total}) / N$.
- Calculate the chi-squared test statistic by summing the contributions from each cell: $\chi^2 = \sum \frac{(\text{Observed} - \text{Expected})^2}{\text{Expected}}$.
- Determine the degrees of freedom using the formula $v = (\text{rows} - 1) \times (\text{columns} - 1)$.
- Find the critical value from the chi-squared distribution tables.
- Compare the calculated statistic with the critical value and state the conclusion in the context of the problem.

### Tags
chi_squared, contingency_table, test_for_independence, association, categorical_data