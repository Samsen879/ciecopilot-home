## Chi-squared Tests: Test for Independence in a Contingency Table

**Syllabus Reference**: 4.3

**Learning Objective**: Use a χ²-test, with the appropriate number of degrees of freedom, for independence in a contingency table (Yates’ correction is not required; rows or columns should be combined so that the expected frequency in each cell is at least 5).

### Example Question
A college surveys 144 students to investigate whether there is an association between the subject studied and the grade achieved. The results are recorded in a contingency table.
The observed frequencies for subject (Maths, Physics, Chemistry) and grade (Grade A/B, Grade C/D, Grade U) are as follows:
For Maths: 25 students got Grade A/B, 30 got Grade C/D, and 5 got Grade U.
For Physics: 20 students got Grade A/B, 25 got Grade C/D, and 10 got Grade U.
For Chemistry: 15 students got Grade A/B, 10 got Grade C/D, and 4 got Grade U.
Test, at the 5% significance level, whether the grade achieved is independent of the subject studied.

### Mark Scheme / Solution
$H_0$: Grade achieved is independent of the subject studied. B1
$H_1$: Grade achieved is not independent of the subject studied.

Calculate row and column totals from the observed frequencies.
Row totals: Maths=60, Physics=55, Chemistry=29.
Column totals: Grade A/B=60, Grade C/D=65, Grade U=19.
Grand total N=144. M1

Calculate expected frequencies, $E = \frac{\text{row total} \times \text{column total}}{N}$.
$E(\text{Chem, U}) = \frac{29 \times 19}{144} = 3.826...$ M1
Since $E(\text{Chem, U}) < 5$, the 'Grade U' and 'Grade C/D' columns must be combined. A1

The new contingency table is for Subject vs Grade (A/B, C/D/U).
Observed frequencies for the new table:
Maths: A/B=25, C/D/U=35
Physics: A/B=20, C/D/U=35
Chemistry: A/B=15, C/D/U=14 M1
New column totals: A/B=60, C/D/U=84.

Recalculate expected frequencies for the combined table:
$E(\text{Maths, A/B}) = \frac{60 \times 60}{144} = 25$
$E(\text{Maths, C/D/U}) = \frac{60 \times 84}{144} = 35$
$E(\text{Phys, A/B}) = \frac{55 \times 60}{144} = 22.917$
$E(\text{Phys, C/D/U}) = \frac{55 \times 84}{144} = 32.083$
$E(\text{Chem, A/B}) = \frac{29 \times 60}{144} = 12.083$
$E(\text{Chem, C/D/U}) = \frac{29 \times 84}{144} = 16.917$ M1 A1

Calculate the $\chi^2$ test statistic, $\sum \frac{(O-E)^2}{E}$:
$\chi^2 = \frac{(25-25)^2}{25} + \frac{(35-35)^2}{35} + \frac{(20-22.917)^2}{22.917} + \frac{(35-32.083)^2}{32.083} + \frac{(15-12.083)^2}{12.083} + \frac{(14-16.917)^2}{16.917}$
$\chi^2 = 0 + 0 + 0.371 + 0.265 + 0.702 + 0.501 = 1.839$ M1 A1

The number of degrees of freedom is $\nu = (\text{rows}-1)(\text{columns}-1) = (3-1)(2-1) = 2$. B1
The critical value for $\chi^2$ at the 5% significance level with $\nu=2$ is 5.991. B1

Since $1.839 < 5.991$, we do not reject $H_0$. M1
There is insufficient evidence at the 5% significance level to suggest that the grade achieved is associated with the subject studied. A1

### Standard Solution Steps
- State the null hypothesis ($H_0$) of independence and the alternative hypothesis ($H_1$) of association.
- Calculate all row totals, column totals, and the grand total for the observed data.
- Calculate the expected frequency for each cell using the formula $E = (\text{row total} \times \text{column total}) / \text{grand total}$.
- Check if all expected frequencies are at least 5. If not, combine appropriate rows or columns and recalculate observed and expected frequencies for the new table.
- Calculate the $\chi^2$ test statistic using the formula $\sum \frac{(O-E)^2}{E}$ for all cells in the final table.
- Determine the number of degrees of freedom, $\nu = (r-1)(c-1)$, using the dimensions of the final table.
- Find the critical value from the $\chi^2$ distribution table for the given significance level and degrees of freedom.
- Compare the calculated $\chi^2$ statistic with the critical value and state the conclusion in the context of the problem.

### Common Mistakes
- Stating hypotheses incorrectly or omitting them.
- Making calculation errors when finding totals or expected frequencies.
- Failing to check the condition that all expected frequencies must be at least 5.
- Forgetting to combine rows/columns when an expected frequency is less than 5.
- Using the wrong number of degrees of freedom, especially after combining rows or columns.
- Comparing the test statistic with the wrong critical value (e.g., from the wrong significance level).
- Stating the conclusion in terms of rejecting/accepting $H_1$ instead of $H_0$, or not putting the conclusion back into the original context of the problem.

### Tags
chi_squared, contingency_table, test_for_independence, hypothesis_testing, goodness_of_fit, syllabus_4_3