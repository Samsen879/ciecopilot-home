## Correlation and Regression: Product-Moment Correlation Coefficient

### Question
An A-Level Further Mathematics teacher records the scores of 6 students in a diagnostic test (`x`) and their subsequent score in the final examination (`y`). The data are as follows:
Student A (15, 46), Student B (20, 58), Student C (28, 65), Student D (35, 74), Student E (42, 80), Student F (45, 85).

1.  Calculate the product-moment correlation coefficient between the diagnostic test scores and the final examination scores.
2.  Find the equation of the least squares regression line of `y` on `x` in the form `y = a + bx`.
3.  Interpret the value of the gradient, `b`, in this context.

### Syllabus Reference
This topic is considered **assumed knowledge** from the Cambridge International AS & A Level Mathematics (9709) syllabus, specifically Paper 5 (Probability & Statistics 1). It provides the foundational statistical techniques upon which the Further Probability & Statistics (9231) course is built. It is not an explicit learning objective within the 9231 syllabus itself.

### Learning Objective
- To calculate and interpret the product-moment correlation coefficient and the coefficients for a least squares regression line.

### Mark Scheme / Solution
**1. Summary Statistics and PMCC Calculation**

The first step is to compute the necessary summary statistics from the data.
- The number of data pairs is `n = 6`. (B1)

- The sums of the variables are:
  - `Σx = 15 + 20 + 28 + 35 + 42 + 45 = 185` (B1)
  - `Σy = 46 + 58 + 65 + 74 + 80 + 85 = 408` (B1)

- The sums of the squares of the variables are:
  - `Σx² = 15² + 20² + 28² + 35² + 42² + 45² = 225 + 400 + 784 + 1225 + 1764 + 2025 = 6423` (B1)
  - `Σy² = 46² + 58² + 65² + 74² + 80² + 85² = 2116 + 3364 + 4225 + 5476 + 6400 + 7225 = 28806` (B1)

- The sum of the products of the variables is:
  - `Σxy = (15*46) + (20*58) + (28*65) + (35*74) + (42*80) + (45*85) = 690 + 1160 + 1820 + 2590 + 3360 + 3825 = 13445` (B1)

Next, we calculate the summary measures `S_xx`, `S_yy`, and `S_xy`.
- `$S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n} = 6423 - \frac{185^2}{6} = 6423 - 5704.166... = 718.833...$` (M1 for formula and substitution)
- `$S_{xx} = \frac{4313}{6}$` (A1 for exact value)

- `$S_{yy} = \sum y^2 - \frac{(\sum y)^2}{n} = 28806 - \frac{408^2}{6} = 28806 - 27744 = 1062$` (M1 for formula and substitution, A1 for correct value)

- `$S_{xy} = \sum xy - \frac{(\sum x)(\sum y)}{n} = 13445 - \frac{(185)(408)}{6} = 13445 - 12580 = 865$` (M1 for formula and substitution, A1 for correct value)

Finally, we calculate the product-moment correlation coefficient, `r`.
- `$r = \frac{S_{xy}}{\sqrt{S_{xx} S_{yy}}} = \frac{865}{\sqrt{(718.833...)(1062)}}$` (M1 for correct formula use)
- `$r = \frac{865}{\sqrt{763400.833...}} = \frac{865}{873.728...} = 0.98998...$`
- `$r = 0.990$ (to 3 s.f.)` (A1)

**2. Regression Line Calculation**

First, calculate the gradient, `b`.
- `$b = \frac{S_{xy}}{S_{xx}} = \frac{865}{718.833...} = 1.2033...$` (M1 for formula)
- `$b = 1.20$ (to 3 s.f.)` (A1)

Next, calculate the means to find the y-intercept, `a`.
- `$\bar{x} = \frac{\sum x}{n} = \frac{185}{6}$` (B1)
- `$\bar{y} = \frac{\sum y}{n} = \frac{408}{6} = 68$` (B1)

Now, calculate the y-intercept, `a`.
- `$a = \bar{y} - b\bar{x} = 68 - (1.2033...)(\frac{185}{6}) = 68 - 37.098... = 30.901...$` (M1 for formula)
- `$a = 30.9$ (to 3 s.f.)` (A1)

The equation of the regression line is:
- `y = 30.9 + 1.20x` (A1 for the full equation in context)

**3. Interpretation of the Gradient**

- The value `b ≈ 1.20` means that for each additional mark a student scores on the diagnostic test, their score in the final examination is predicted to increase by approximately 1.20 marks. (B1 for correct interpretation in context)

### Standard Solution Steps
1.  **Calculate Summary Statistics:** Compute `n`, `Σx`, `Σy`, `Σx²`, `Σy²`, and `Σxy` from the raw data.
2.  **Calculate S-values:** Use the summary statistics to find `S_xx`, `S_yy`, and `S_xy`. It is best practice to use exact fractions or store calculator values to maintain precision.
3.  **Calculate PMCC (r):** Substitute the S-values into the formula `$r = \frac{S_{xy}}{\sqrt{S_{xx} S_{yy}}}$.
4.  **Calculate Gradient (b):** For the regression line `y` on `x`, use the formula `$b = \frac{S_{xy}}{S_{xx}}`.
5.  **Calculate Means:** Find `$\bar{x}$` and `$\bar{y}$`.
6.  **Calculate Intercept (a):** Use the formula `$a = \bar{y} - b\bar{x}`, ensuring the unrounded value of `b` is used.
7.  **State the Equation:** Write the final regression line equation `y = a + bx`, with `a` and `b` rounded to an appropriate number of significant figures (usually 3).
8.  **Interpret:** Explain the meaning of `r`, `a`, or `b` as required by the question, always referring to the context of the variables.

### Common Mistakes
- **Premature Rounding:** Rounding summary statistics or S-values too early can lead to significant inaccuracies in the final answers for `r`, `a`, and `b`.
- **Calculation Errors:** Simple arithmetic or data entry errors are common, especially when calculating the sums of squares. Always double-check these values.
- **Formula Confusion:** Using an incorrect formula, such as `$b = \frac{S_{xy}}{S_{yy}}$` or swapping `x` and `y` variables in the `S` formulas.
- **Misinterpreting `r`:** Stating that a strong correlation proves that `x` *causes* `y`. Correlation does not imply causation.
- **Extrapolation:** Using the regression line to make predictions for `y` using an `x` value that is far outside the range of the original data. This is unreliable.
- **Regression Line of x on y:** Calculating the incorrect regression line. The regression line of `y` on `x` (used to predict `y` from `x`) is different from the regression line of `x` on `y`.

### Tags
- `correlation`
- `regression`
- `pmcc`
- `least squares`
- `statistics`
- `assumed knowledge`
- `9709`