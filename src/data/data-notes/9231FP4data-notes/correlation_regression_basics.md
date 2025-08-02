## Correlation and Regression: Calculating PMCC and the Regression Line

**Syllabus Reference**: S1 6.1

**Learning Objective**: Calculate, by formula, the product moment correlation coefficient and the equation of a regression line.

### Example Question
A researcher records the average daily hours of sunshine, `$x$`, and the number of ice creams sold, `$y$`, at a kiosk on $6$ different days. The paired data are: $(4, 55)$, $(6, 60)$, $(8, 72)$, $(9, 75)$, $(10, 80)$, and $(12, 91)$.
(a) Calculate the product moment correlation coefficient (PMCC) between hours of sunshine and ice creams sold.
(b) Find the equation of the least squares regression line of `$y$` on `$x$` in the form `$y = a + bx$`.

### Mark Scheme / Solution
Summary values are calculated first. `$n = 6$`.
$\sum x = 4 + 6 + 8 + 9 + 10 + 12 = 49$
$\sum y = 55 + 60 + 72 + 75 + 80 + 91 = 433$
$\sum x^2 = 4^2 + 6^2 + 8^2 + 9^2 + 10^2 + 12^2 = 441$
$\sum y^2 = 55^2 + 60^2 + 72^2 + 75^2 + 80^2 + 91^2 = 32115$
$\sum xy = (4)(55) + (6)(60) + (8)(72) + (9)(75) + (10)(80) + (12)(91) = 3723$ (M1 for attempting at least one summary value)

$S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n} = 441 - \frac{49^2}{6} = 40.833...$ (M1)
$S_{yy} = \sum y^2 - \frac{(\sum y)^2}{n} = 32115 - \frac{433^2}{6} = 866.833...$
$S_{xy} = \sum xy - \frac{\sum x \sum y}{n} = 3723 - \frac{49 \times 433}{6} = 188.166...$ (A1 for all S-values correct)

(a) Calculate the PMCC, `$r$`.
$r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}$ (M1)
$r = \frac{188.166...}{\sqrt{40.833... \times 866.833...}} = \frac{188.166...}{188.117...}$ (M1 for correct substitution)
$r = 0.999$ (A1)

(b) Find the regression line `$y = a + bx$`.
$b = \frac{S_{xy}}{S_{xx}} = \frac{188.166...}{40.833...} = 4.608...$ (M1)
$b = 4.61$ (to 3 s.f.) (A1)
$a = \bar{y} - b\bar{x} = \frac{433}{6} - (4.608...) \times (\frac{49}{6}) = 34.53...$ (M1)
$a = 34.5$ (to 3 s.f.) (A1)
So, the equation is `$y = 34.5 + 4.61x$`. (A1)

### Standard Solution Steps
- Calculate the five summary statistics: `$\sum x$`, `$\sum y$`, `$\sum x^2$`, `$\sum y^2$`, `$\sum xy$`.
- Use the summary statistics to calculate `$S_{xx}$`, `$S_{yy}$`, and `$S_{xy}$`.
- For the PMCC, substitute the S-values into the formula for `$r$`.
- For the regression line, first calculate `$b$` using `$S_{xy}$` and `$S_{xx}$`.
- Then calculate the means `$\bar{x}$` and `$\bar{y}$` and substitute into the formula for `$a$`.
- State the final equation clearly in the form `$y = a + bx$`.

### Common Mistakes
- Squaring `$\sum x$` instead of using `$\sum x^2$` in the formula for `$S_{xx}$`.
- Making a calculator error when inputting the data for summary statistics.
- Mixing up the formulas for `$b$` and `$r$`.
- Calculating `$a$` using rounded values of `$b$`, leading to an inaccurate final answer.
- Giving the regression equation as `$x$` on `$y$` instead of `$y$` on `$x$`.

### Tags
correlation, regression, pmcc, least_squares, statistical_inference

---
## Correlation and Regression: Hypothesis Test for Zero Correlation

**Syllabus Reference**: S1 6.2

**Learning Objective**: Carry out a hypothesis test for the population product moment correlation coefficient.

### Example Question
A teacher wants to investigate if there is a correlation between the number of hours students spend on a learning platform, `$x$`, and their score in a test, `$y$`. The data for `$8$` students are: $(5, 65)$, $(7, 70)$, $(8, 68)$, $(10, 80)$, $(12, 75)$, $(13, 85)$, $(15, 82)$, $(16, 90)$.
Test, at the `$5\%$` significance level, whether there is evidence of a positive correlation between hours spent and test score.

### Mark Scheme / Solution
First, calculate the PMCC.
$n=8$
$\sum x = 86$, $\sum y = 615$, $\sum x^2 = 1032$, $\sum y^2 = 47823$, $\sum xy = 6834$.
$S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n} = 1032 - \frac{86^2}{8} = 107.5$
$S_{xy} = \sum xy - \frac{\sum x \sum y}{n} = 6834 - \frac{86 \times 615}{8} = 222.75$ (M1 for both S-values)
$S_{yy} = \sum y^2 - \frac{(\sum y)^2}{n} = 47823 - \frac{615^2}{8} = 557.375$
$r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}} = \frac{222.75}{\sqrt{107.5 \times 557.375}}$ (M1)
$r = 0.90999... \approx 0.910$ (A1)

Hypothesis Test:
1. State hypotheses.
$H_0: \rho = 0$ (B1)
$H_1: \rho > 0$ (B1)

2. Find the critical value.
Significance level is `$5\%$`, one-tailed test.
For `$n=8$`, the critical value from tables is `$0.6215$`. (B1)

3. Compare the test statistic to the critical value and conclude.
The test statistic is the calculated PMCC, `$r = 0.910$`.
Since `$0.910 > 0.6215$`, we reject `$H_0$`. (M1)
There is sufficient evidence at the `$5\%$` significance level to suggest a positive correlation between hours spent on the platform and test score. (A1)

### Standard Solution Steps
- State the null (`$H_0: \rho = 0$`) and alternative (`$H_1: \rho \ne 0$`, `$\rho > 0$`, or `$\rho < 0$`) hypotheses.
- Calculate the value of the PMCC (`$r$`) from the sample data. This is the test statistic.
- Find the critical value from the statistical tables using the sample size (`$n$`) and the significance level.
- Compare the absolute value of the test statistic `|$r$|` with the critical value.
- If `|$r$|` is greater than the critical value, reject `$H_0$`. Otherwise, do not reject `$H_0$`.
- Write a conclusion in the context of the original question.

### Common Mistakes
- Stating the incorrect alternative hypothesis, e.g., using `$\rho \ne 0$` for a one-tailed test.
- Using the wrong significance level column in the tables, e.g., using `$5\%$ two-tailed` for a `$5\%$ one-tailed` test.
- Comparing `$r$` with a `$z$`-value or `$t$`-value instead of the critical value for the PMCC.
- Making an incorrect comparison, for example, if `$r = -0.7$` and critical value is `$0.6$`, wrongly concluding `$-0.7 < 0.6$` means do not reject. The comparison should be `_`$|-0.7| > 0.6$`.
- Failing to write the conclusion in the context of the problem.

### Tags
correlation, hypothesis_testing, pmcc, significance_test, statistical_inference