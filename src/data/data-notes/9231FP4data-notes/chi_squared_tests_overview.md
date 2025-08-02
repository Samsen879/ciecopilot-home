## Chi-squared Tests: Goodness of Fit for a Discrete Uniform Distribution
**Syllabus Reference**: 8.1
**Learning Objective**: Perform a chi-squared goodness of fit test for a discrete uniform distribution.
### Example Question
A standard six-sided die was rolled 300 times to test if it was fair. The frequencies of the scores are shown below.
- Score: 1, 2, 3, 4, 5, 6
- Frequency: 42, 55, 61, 45, 49, 48
Test, at the 5% significance level, whether the die is fair.
### Mark Scheme / Solution
- $H_0$: The die is fair. $H_1$: The die is not fair. (B1)
- Expected frequency for each score is $300 \div 6 = 50$. (B1)
- $\chi^2_{calc} = \frac{(42-50)^2}{50} + \frac{(55-50)^2}{50} + \frac{(61-50)^2}{50} + \frac{(45-50)^2}{50} + \frac{(49-50)^2}{50} + \frac{(48-50)^2}{50}$ (M1)
- $= 1.28 + 0.50 + 2.42 + 0.50 + 0.02 + 0.08$
- $\chi^2_{calc} = 4.8$ (A1)
- Degrees of freedom $\nu = 6 - 1 = 5$. (B1)
- Critical value from tables for a 5% significance level is $\chi^2_{crit}(5) = 11.07$. (B1)
- Since $4.8 < 11.07$, the result is not significant. (M1)
- Do not reject $H_0$. There is insufficient evidence at the 5% level to suggest the die is not fair. (A1)
### Standard Solution Steps
- State the null hypothesis ($H_0$) and the alternative hypothesis ($H_1$).
- Calculate the expected frequency for each category, which is the total frequency divided by the number of categories for a uniform distribution.
- Ensure all expected frequencies are 5 or greater. If not, categories must be pooled.
- Calculate the test statistic using the formula $\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$.
- Determine the number of degrees of freedom, $\nu = n - 1$, where $n$ is the number of categories.
- Find the critical value from the chi-squared distribution tables for the given significance level and degrees of freedom.
- Compare the calculated test statistic with the critical value and state the conclusion in context.
### Common Mistakes
- Incorrectly calculating expected frequencies.
- Forgetting to pool categories where the expected frequency is less than 5.
- Using an incorrect number of degrees of freedom.
- Making arithmetic errors when calculating the test statistic.
- Writing a conclusion that is not in the context of the question or is definitive, e.g., 'the die is fair'.
### Tags
chi_squared, goodness_of_fit, uniform_distribution, hypothesis_testing, syllabus_4_3
---
## Chi-squared Tests: Test for Independence in a Contingency Table
**Syllabus Reference**: 8.2
**Learning Objective**: Perform a chi-squared test for the independence of two variables in a contingency table.
### Example Question
A researcher wants to determine if there is a relationship between a person's preferred social media platform and their age group. 500 people were surveyed. Test, at the 1% significance level, whether the choice of social media platform is independent of age group.
- Observed Frequencies:
- Platform A: Age 18-29 (80), Age 30-49 (50), Age 50+ (20)
- Platform B: Age 18-29 (60), Age 30-49 (90), Age 50+ (40)
- Platform C: Age 18-29 (25), Age 30-49 (35), Age 50+ (100)
### Mark Scheme / Solution
- $H_0$: Choice of social media platform is independent of age group. (B1)
- $H_1$: Choice of social media platform is not independent of age group. (B1)
- Calculate row totals: 150, 190, 160. Column totals: 165, 175, 160. Grand total: 500. (M1)
- Calculate expected frequencies, $E_{ij} = \frac{(\text{Row Total}) \times (\text{Column Total})}{\text{Grand Total}}$. (M1)
- For Platform A / Age 18-29: $E_{11} = (150 \times 165) / 500 = 49.5$.
- For Platform A / Age 30-49: $E_{12} = (150 \times 175) / 500 = 52.5$.
- All 9 expected frequencies calculated correctly. (A1)
- Calculate test statistic, $\chi^2 = \sum \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$. (M1)
- $\chi^2_{calc} = \frac{(80-49.5)^2}{49.5} + \frac{(50-52.5)^2}{52.5} + \dots + \frac{(100-51.2)^2}{51.2} = 119.31$. (A1)
- Degrees of freedom $\nu = (r-1)(c-1) = (3-1)(3-1) = 4$. (B1)
- Critical value for a 1% significance level is $\chi^2_{crit}(4) = 13.28$. (B1)
- Since $119.31 > 13.28$, the result is significant. (M1)
- Reject $H_0$. There is sufficient evidence at the 1% level to suggest an association between choice of platform and age group. (A1)
### Standard Solution Steps
- State the null ($H_0$) and alternative ($H_1$) hypotheses in terms of independence.
- Calculate the total for each row and each column, and the grand total.
- Calculate the expected frequency for each cell using the formula $E_{ij} = \frac{(\text{Row Total}_i) \times (\text{Column Total}_j)}{\text{Grand Total}}$.
- Calculate the test statistic $\chi^2 = \sum \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$.
- Determine the degrees of freedom using $\nu = (r-1)(c-1)$, where $r$ is the number of rows and $c$ is the number of columns.
- Find the critical value from chi-squared tables for the given significance level.
- Compare the calculated statistic to the critical value and state the conclusion in context.
### Common Mistakes
- Stating hypotheses incorrectly.
- Errors in calculating row/column totals.
- Using the wrong formula for expected frequencies.
- Using the wrong formula for degrees of freedom, e.g., $(rc-1)$ instead of $(r-1)(c-1)$.
- Concluding that the variables are independent when rejecting $H_0$.
### Tags
chi_squared, contingency_table, test_for_independence, association, hypothesis_testing, syllabus_4_3
---
## Chi-squared Tests: Goodness of Fit with an Estimated Parameter
**Syllabus Reference**: 8.1
**Learning Objective**: Perform a chi-squared goodness of fit test for a distribution where a parameter has been estimated from the data.
### Example Question
The number of printing errors found on a sample of 200 randomly chosen pages of a book are summarised below.
- Errors per page: 0, 1, 2, 3, 4 or more
- Number of pages: 85, 70, 30, 12, 3
It is suggested that the number of errors per page follows a Poisson distribution. Test this suggestion at the 10% significance level.
### Mark Scheme / Solution
- $H_0$: The number of errors per page follows a Poisson distribution. (B1)
- $H_1$: The number of errors per page does not follow a Poisson distribution. (B1)
- Total errors = $(0 \times 85) + (1 \times 70) + (2 \times 30) + (3 \times 12) + (4 \times 3) = 178$. (M1)
- Estimated mean $\lambda = \frac{178}{200} = 0.89$. (A1)
- Calculate expected frequencies using $E_i = 200 \times P(X=i)$ with $\lambda = 0.89$. (M1)
- $E_0 = 200 \times e^{-0.89} = 82.13$. $E_1 = 200 \times \frac{e^{-0.89} 0.89^1}{1!} = 73.10$. $E_2 = 32.53$. (A1)
- $E_3 = 9.65$. $E_{\ge 4} = 2.58$. (A1)
- Since $E_{\ge 4} < 5$, pool the last two categories. (M1)
- New category '3 or more': $O_{\ge 3} = 12 + 3 = 15$. $E_{\ge 3} = 9.65 + 2.58 = 12.23$. (A1)
- $\chi^2_{calc} = \frac{(85-82.13)^2}{82.13} + \frac{(70-73.10)^2}{73.10} + \frac{(30-32.53)^2}{32.53} + \frac{(15-12.23)^2}{12.23}$. (M1)
- $\chi^2_{calc} = 1.056$. (A1)
- Degrees of freedom $\nu = (\text{cells}) - 1 - (\text{parameters}) = 4 - 1 - 1 = 2$. (B1)
- Critical value for 10% significance level is $\chi^2_{crit}(2) = 4.605$. (B1)
- Since $1.056 < 4.605$, do not reject $H_0$. (M1)
- There is insufficient evidence to suggest the data does not follow a Poisson distribution. (A1)
### Standard Solution Steps
- State the null ($H_0$) and alternative ($H_1$) hypotheses.
- Calculate the estimated parameter(s) from the sample data.
- Use the estimated parameter(s) to calculate the expected frequency for each category ($E_i = N \times P_i$).
- Check if all expected frequencies are 5 or greater and pool categories if necessary.
- Calculate the test statistic $\chi^2 = \sum \frac{(O_i - E_i)^2}{E_i}$.
- Determine the degrees of freedom: $\nu = k - 1 - m$, where $k$ is the number of categories after pooling and $m$ is the number of estimated parameters.
- Find the critical value and compare with the test statistic, then state the conclusion in context.
### Common Mistakes
- Forgetting to subtract an extra degree of freedom for the estimated parameter.
- Incorrectly calculating the sample mean to estimate the parameter.
- Errors in calculating Poisson probabilities.
- Forgetting to adjust the degrees of freedom after pooling categories.
- Using the wrong number of final categories ($k$) to calculate degrees of freedom.
### Tags
chi_squared, goodness_of_fit, poisson_distribution, estimated_parameter, hypothesis_testing, syllabus_4_3
---