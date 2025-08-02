## Chi-squared Tests: Goodness of Fit Test

**Syllabus Reference**: S2 6.1

**Learning Objective**: Use a chi-squared test to test the goodness of fit of a theoretical model to observed data.

### Example Question
A six-sided die was rolled `$120$` times and the frequencies for the scores `$1, 2, 3, 4, 5,$` and `$6$` were `$15, 22, 25, 18, 19,$` and `$21$` respectively. Test at the `$5\%$` significance level whether the die is fair.

### Mark Scheme / Solution
$H_0$: The die is fair. (B1)
$H_1$: The die is not fair. (B1)

Under `$H_0$`, the expected frequency for each score is `$E = \frac{120}{6} = 20$`. (M1)

The chi-squared statistic is calculated as `$ \chi^2 = \sum \frac{(O - E)^2}{E} $`.
`$ \chi^2 = \frac{(15-20)^2}{20} + \frac{(22-20)^2}{20} + \frac{(25-20)^2}{20} + \frac{(18-20)^2}{20} + \frac{(19-20)^2}{20} + \frac{(21-20)^2}{20} $` (M1)
`$ \chi^2 = \frac{25}{20} + \frac{4}{20} + \frac{25}{20} + \frac{4}{20} + \frac{1}{20} + \frac{1}{20} = \frac{60}{20} = 3 $` (A1)

The degrees of freedom `$ \nu = n - 1 = 6 - 1 = 5 $`. (B1)
The critical value from the chi-squared table for `$5$` degrees of freedom at the `$5\%$` significance level is `$11.070$`. (M1)

Compare the test statistic to the critical value: `$3 < 11.070$`. (M1)
Since the calculated value is less than the critical value, we do not reject `$H_0$`. There is insufficient evidence at the `$5\%$` significance level to conclude that the die is not fair. (A1)

### Standard Solution Steps
- State the null hypothesis (`$H_0$`) and the alternative hypothesis (`$H_1$`).
- Calculate the expected frequencies (`$E_i$`) for each category based on the theoretical model.
- Calculate the chi-squared test statistic using the formula `$ \chi^2 = \sum \frac{(O_i - E_i)^2}{E_i} $`.
- Determine the degrees of freedom, which is `$ \nu = n - k $` where `$n$` is the number of categories and `$k$` is the number of parameters estimated from the data (usually `$1$` for the total).
- Find the critical value from the chi-squared distribution table for the given significance level and degrees of freedom.
- Compare the calculated test statistic with the critical value and draw a conclusion in the context of the problem.

### Common Mistakes
- Incorrectly calculating the degrees of freedom, often using `$n$` instead of `$n-1$`.
- Making arithmetic errors when calculating the `$ (O - E)^2 / E $` terms.
- Forgetting to state the final conclusion in the context of the original question.
- Using an incorrect critical value by looking in the wrong column or row of the statistical tables.

### Tags
chi_squared, goodness_of_fit, hypothesis_test, discrete_uniform_distribution

---
## Chi-squared Tests: Test for Independence

**Syllabus Reference**: S2 6.2

**Learning Objective**: Formulate hypotheses and use a chi-squared test to test the independence of two variables in a contingency table.

### Example Question
A survey of `$200$` students was conducted to see if their choice of favourite subject (Maths, English, Science) is independent of their gender (Male, Female). The observed frequencies were as follows: `$40$` males chose Maths, `$25$` males chose English, and `$15$` males chose Science. Also, `$30$` females chose Maths, `$50$` females chose English, and `$40$` females chose Science. Test at the `$10\%$` significance level whether the choice of subject is independent of gender.

### Mark Scheme / Solution
$H_0$: Choice of subject is independent of gender. (B1)
$H_1$: Choice of subject is not independent of gender. (B1)

Calculate totals. Row totals: Males `$40+25+15=80$`, Females `$30+50+40=120$`. Column totals: Maths `$40+30=70$`, English `$25+50=75$`, Science `$15+40=55$`. Grand total is `$200$`. (M1)

Calculate expected frequencies using `$E = \frac{\text{Row Total} \times \text{Column Total}}{\text{Grand Total}}$`.
Male, Maths: `$ E = \frac{80 \times 70}{200} = 28 $`
Male, English: `$ E = \frac{80 \times 75}{200} = 30 $`
Male, Science: `$ E = \frac{80 \times 55}{200} = 22 $`
Female, Maths: `$ E = \frac{120 \times 70}{200} = 42 $`
Female, English: `$ E = \frac{120 \times 75}{200} = 45 $`
Female, Science: `$ E = \frac{120 \times 55}{200} = 33 $` (M1 for method, A1 for all correct)

Calculate the chi-squared statistic:
`$ \chi^2 = \frac{(40-28)^2}{28} + \frac{(25-30)^2}{30} + \frac{(15-22)^2}{22} + \frac{(30-42)^2}{42} + \frac{(50-45)^2}{45} + \frac{(40-33)^2}{33} $` (M1)
`$ \chi^2 = 5.1428... + 0.8333... + 2.2272... + 3.4285... + 0.5555... + 1.4848... = 13.672... $`
`$ \chi^2 \approx 13.7 $` (A1)

The degrees of freedom `$ \nu = (\text{rows} - 1)(\text{columns} - 1) = (2 - 1)(3 - 1) = 2 $`. (B1)
The critical value from the chi-squared table for `$2$` degrees of freedom at the `$10\%$` significance level is `$4.605$`. (M1)

Compare the test statistic to the critical value: `$13.7 > 4.605$`. (M1)
Since the calculated value is greater than the critical value, we reject `$H_0$`. There is sufficient evidence at the `$10\%$` significance level to conclude that the choice of subject is not independent of gender. (A1)

### Standard Solution Steps
- State the null hypothesis (`$H_0$: independence) and the alternative hypothesis (`$H_1$: not independent).
- Calculate the row totals, column totals, and the grand total from the observed frequency data.
- Calculate the expected frequency for each cell using the formula `$E = \frac{\text{Row Total} \times \text{Column Total}}{\text{Grand Total}}$`.
- Calculate the chi-squared test statistic `$ \chi^2 = \sum \frac{(O_i - E_i)^2}{E_i} $`.
- Determine the degrees of freedom using the formula `$ \nu = (r-1)(c-1) $`, where `$r$` is the number of rows and `$c$` is the number of columns.
- Find the critical value from the chi-squared distribution table for the given significance level.
- Compare the calculated test statistic with the critical value and state the conclusion in the context of the problem.

### Common Mistakes
- Incorrectly calculating degrees of freedom, often using `$rc-1$` or `$r+c-2$`.
- Errors in calculating expected frequencies due to mixing up row and column totals.
- Swapping observed and expected frequencies in the chi-squared formula.
- Failing to pool categories when an expected frequency is less than `$5$`, if required by the question (though not necessary in this example).

### Tags
chi_squared, test_for_independence, contingency_table, hypothesis_test, association