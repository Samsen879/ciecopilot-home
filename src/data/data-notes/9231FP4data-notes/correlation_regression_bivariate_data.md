### **Syllabus Reference**
Bivariate data (Assumed knowledge from A Level Mathematics 9709, Section S1.4)

### **Learning Objective**
To calculate and interpret the product moment correlation coefficient (PMCC) and determine the equation of the least squares regression line of *y* on *x*.

### **Question**
A teacher wants to investigate the relationship between the number of hours a student spends studying (*x*) and their score on a test (*y*). The data for a random sample of 8 students is as follows:

-   **Student A:** Study Hours (x) = 5, Test Score (y) = 65
-   **Student B:** Study Hours (x) = 7, Test Score (y) = 70
-   **Student C:** Study Hours (x) = 10, Test Score (y) = 75
-   **Student D:** Study Hours (x) = 12, Test Score (y) = 78
-   **Student E:** Study Hours (x) = 15, Test Score (y) = 82
-   **Student F:** Study Hours (x) = 16, Test Score (y) = 88
-   **Student G:** Study Hours (x) = 18, Test Score (y) = 90
-   **Student H:** Study Hours (x) = 20, Test Score (y) = 94

1.  Calculate the product moment correlation coefficient (PMCC), *r*, between study hours and test score.
2.  Calculate the equation of the least squares regression line of *y* on *x*, in the form *y = a + bx*.
3.  Interpret the value of the PMCC.

---

### **Mark Scheme / Solution**

#### **1. Summary Calculations**

First, we calculate the summary statistics from the data.

-   The number of data pairs, `n = 8`.
-   Σ*x* = 5 + 7 + 10 + 12 + 15 + 16 + 18 + 20 = 103 `B1`
-   Σ*y* = 65 + 70 + 75 + 78 + 82 + 88 + 90 + 94 = 642 `B1`
-   Σ*x*² = 5² + 7² + 10² + 12² + 15² + 16² + 18² + 20² = 25 + 49 + 100 + 144 + 225 + 256 + 324 + 400 = 1523 `B1`
-   Σ*y*² = 65² + 70² + 75² + 78² + 82² + 88² + 90² + 94² = 4225 + 4900 + 5625 + 6084 + 6724 + 7744 + 8100 + 8836 = 52238 `B1`
-   Σ*xy* = (5×65) + (7×70) + (10×75) + (12×78) + (15×82) + (16×88) + (18×90) + (20×94) = 325 + 490 + 750 + 936 + 1230 + 1408 + 1620 + 1880 = 8639 `B1`

#### **2. Calculation of Sₓₓ, Sᵧᵧ, and Sₓᵧ**

We use the summary statistics to find the corrected sums of squares and products.

-   Sₓₓ = Σ*x*² - (Σ*x*)²/n = 1523 - (103)²/8 `M1`
    > Sₓₓ = 1523 - 1326.125 = 196.875 `A1`
-   Sᵧᵧ = Σ*y*² - (Σ*y*)²/n = 52238 - (642)²/8 `M1`
    > Sᵧᵧ = 52238 - 51520.5 = 717.5 `A1`
-   Sₓᵧ = Σ*xy* - (Σ*x*Σ*y*)/n = 8639 - (103 × 642)/8 `M1`
    > Sₓᵧ = 8639 - 8267.25 = 371.75 `A1`

#### **3. Calculate the Product Moment Correlation Coefficient (r)**

Using the formula *r* = Sₓᵧ / √(SₓₓSᵧᵧ):

-   *r* = 371.75 / √(196.875 × 717.5) `M1`
-   *r* = 371.75 / √(141257.8125) `M1` (For evaluating the denominator)
-   *r* = 371.75 / 375.8428...
-   *r* = 0.98911... ≈ **0.989** (3 s.f.) `A1`

#### **4. Calculate the Regression Line (y = a + bx)**

First, calculate the gradient, *b*.

-   *b* = Sₓᵧ / Sₓₓ `M1`
-   *b* = 371.75 / 196.875 `M1`
-   *b* = 1.8884... ≈ **1.89** (3 s.f.) `A1`

Next, calculate the means to find the intercept, *a*.

-   x̄ = Σ*x* / n = 103 / 8 = 12.875 `B1`
-   ȳ = Σ*y* / n = 642 / 8 = 80.25 `B1`

Now find the intercept, *a*, using the formula *a* = ȳ - *b*x̄.

-   *a* = 80.25 - (1.8884... × 12.875) `M1`
-   *a* = 80.25 - 24.316...
-   *a* = 55.933... ≈ **55.9** (3 s.f.) `A1`

Finally, state the equation of the regression line.

-   **y = 55.9 + 1.89x** `A1`

---

### **Key Insights & Interpretation**

> **PMCC Interpretation**: A correlation coefficient of **r ≈ 0.989** indicates a *very strong, positive, linear relationship* between the number of hours spent studying and the test score. As study hours increase, the test score tends to increase in a highly consistent, linear fashion. `B1`
>
> **Regression Line Interpretation**:
> - The intercept **a ≈ 55.9** suggests that a student who does 0 hours of studying is predicted to score approximately 56 on the test. *Caution: This is an extrapolation as x=0 is outside the range of the data (5 to 20 hours) and may not be reliable.*
> - The gradient **b ≈ 1.89** indicates that for each additional hour of studying, the test score is predicted to increase by approximately **1.89 points**. `B1`