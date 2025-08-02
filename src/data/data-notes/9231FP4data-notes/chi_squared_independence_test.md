## Chi-squared Tests: Test for Independence

### Example Question
A sociologist conducts a survey to investigate whether there is an association between a person's age group and their preferred source of news. A random sample of 250 people is surveyed. The observed frequencies are presented in the following contingency table:
For the age group 18-30, the preferences were: Online 50, TV 15, Print 10.
For the age group 31-50, the preferences were: Online 40, TV 30, Print 15.
For the age group 51+, the preferences were: Online 20, TV 45, Print 25.

Test, at the 5% level of significance, whether there is an association between age group and preferred news source. State your hypotheses and conclusion clearly.

### Mark Scheme / Solution
$H_0$: There is no association between age group and preferred news source. Age group and preferred news source are independent. B1
$H_1$: There is an association between age group and preferred news source. Age group and preferred news source are not independent.

First, calculate the row and column totals from the observed data.
Row totals: $75$ (18-30), $85$ (31-50), $90$ (51+).
Column totals: $110$ (Online), $90$ (TV), $50$ (Print).
Grand total: $250$.

Next, calculate the expected frequencies ($E$) for each cell using $E = \frac{\text{row total} \times \text{column total}}{\text{grand total}}$. M1
Expected frequencies table:
- 18-30: Online 33, TV 27, Print 15.
- 31-50: Online 37.4, TV 30.6, Print 17.
- 51+: Online 39.6, TV 32.4, Print 18. A1

Now, calculate the chi-squared statistic, $\chi^2 = \sum \frac{(O-E)^2}{E}$. M1
The contributions for each cell are:
$\frac{(50-33)^2}{33} = 8.758$
$\frac{(15-27)^2}{27} = 5.333$
$\frac{(10-15)^2}{15} = 1.667$
$\frac{(40-37.4)^2}{37.4} = 0.181$
$\frac{(30-30.6)^2}{30.6} = 0.012$
$\frac{(15-17)^2}{17} = 0.235$
$\frac{(20-39.6)^2}{39.6} = 9.701$
$\frac{(45-32.4)^2}{32.4} = 4.900$
$\frac{(25-18)^2}{18} = 2.722$ A1

Summing the contributions:
$\chi^2_{calc} = 8.758 + 5.333 + 1.667 + 0.181 + 0.012 + 0.235 + 9.701 + 4.900 + 2.722 = 33.509$ A1

The degrees of freedom, $\nu = (\text{rows} - 1)(\text{columns} - 1) = (3-1)(3-1) = 4$. B1
The critical value from the $\chi^2$ distribution tables for $\nu=4$ at a 5% significance level is $9.488$. B1

Comparison and conclusion:
Since the calculated test statistic $\chi^2_{calc} = 33.509$ is greater than the critical value $9.488$, we reject the null hypothesis $H_0$. A1
There is sufficient evidence at the 5% significance level to suggest that there is an association between a person's age group and their preferred news source.

### Standard Solution Steps
- State the null hypothesis ($H_0$) that there is no association (the variables are independent) and the alternative hypothesis ($H_1$) that there is an association (the variables are not independent).
- Calculate the totals for each row and each column, and the grand total.
- Calculate the expected frequency for each cell in the contingency table using the formula $E = \frac{\text{row total} \times \text{column total}}{\text{grand total}}$.
- Calculate the chi-squared test statistic using the formula $\chi^2 = \sum \frac{(O-E)^2}{E}$, where $O$ is the observed frequency and $E$ is the expected frequency.
- Determine the number of degrees of freedom using $\nu = (\text{number of rows} - 1)(\text{number of columns} - 1)$.
- Find the critical value from the chi-squared distribution tables for the calculated degrees of freedom and the given significance level.
- Compare the calculated $\chi^2$ statistic with the critical value. If $\chi^2_{calc} > \chi^2_{crit}$, reject $H_0$. Otherwise, do not reject $H_0$.
- State the conclusion in the context of the original problem.

### Common Mistakes
- Stating the hypotheses incorrectly, for example using symbols for means ($\mu$) or correlation ($\rho$) instead of a statement in words.
- Errors in calculating row, column, or grand totals, which will make all subsequent calculations incorrect.
- Mistakes in calculating expected frequencies, often due to arithmetic error or using the wrong totals.
- Incorrectly calculating the degrees of freedom. A common error is using $n-1$ or $(\text{rows} \times \text{columns}) - 1$.
- Finding the incorrect critical value from the tables, either by using the wrong degrees of freedom or the wrong significance level column.
- Making a conclusion that is not in the context of the problem, for instance just writing "Reject $H_0$".
- Not pooling categories when an expected frequency is less than 5, if the question requires it. Conversely, pooling categories when not required.

### Tags
chi_squared, test_for_independence, contingency_table, hypothesis_testing, observed_frequency, expected_frequency, degrees_of_freedom, critical_value, syllabus_4_3

---