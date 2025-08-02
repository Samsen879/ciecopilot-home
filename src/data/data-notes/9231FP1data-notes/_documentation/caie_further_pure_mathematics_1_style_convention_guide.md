### **CAIE Further Pure Mathematics 1 (9231/1) - Style and Convention Guide**

This guide provides an analytical summary of the question styles, marking conventions, and common student challenges for the CAIE Further Pure Mathematics 1 paper. It is synthesized from an analysis of the syllabus, past question papers, and their corresponding mark schemes.

---

### **1. General Marking Principles**

The allocation of marks follows a consistent pattern designed to reward methodical application and accuracy.

| Mark Type | Description | Typical Allocation Examples |
| :--- | :--- | :--- |
| **B (Independent Mark)** | Awarded for a correct result or statement independent of method. Often for recalling a formula, a definition, or a specific feature of a graph. | - Stating the base case (`n=1`) in an induction proof.<br>- Identifying correct vertical or horizontal asymptotes.<br>- Writing down the sum of roots (`Σα`) from a polynomial. |
| **M (Method Mark)** | Awarded for a valid method applied to the problem. Not lost for numerical errors. Requires showing application, not just quoting a formula. | - Using the quotient rule to differentiate a rational function.<br>- Setting up the cross product to find a normal vector.<br>- Substituting `x = (y-c)/m` to find a new polynomial equation.<br>- Applying the method of differences correctly. |
| **A (Accuracy Mark)** | Awarded for a correct answer or intermediate step. Can only be awarded if the corresponding method mark (M) has been earned. | - Correct coordinates of a stationary point after differentiation.<br>- Correct final simplified expression for a summation.<br>- Correct vector equation of a line or plane. |
| **DM / DB** | A dependent mark that can only be awarded if a preceding M or B mark (often marked with an asterisk `*`) has been earned. | - **DM1:** Setting `dy/dx = 0` after a correct differentiation attempt (M1*).<br>- **DM1:** Forming a quadratic equation in `m` for invariant lines after a correct matrix multiplication (M1*). |
| **AG** | Answer Given. The working leading to a printed answer must be fully shown and logically sound. Any gaps or errors in the working will result in the loss of the A mark. | |
| **FT** | Follow Through. Allows a candidate to earn subsequent marks even if an earlier step was incorrect. Typically applies to A or B marks. | A sketch (B1 FT) may be credited if it correctly reflects the features (asymptotes, turning points) found incorrectly in a previous part. |

---

### **2. Analysis by Syllabus Topic**

#### **2.1 Proof by Induction**

*   **Question Phrasing:** "Prove by mathematical induction that, for all positive integers n, ...".
*   **Target Content:** Divisibility, summation of series, matrix powers, recurrence relations, or differentiation formulas.
*   **Marking Conventions:**
    1.  **B1:** Show the base case (usually `n=1`) is true. A clear calculation and conclusion are required.
    2.  **B1:** State the inductive hypothesis clearly. (e.g., "Assume the statement is true for `n=k`...").
    3.  **M1:** Consider the `n=k+1` case. This involves writing out the expression for `k+1`.
    4.  **M1:** Use the inductive hypothesis by substituting the `k`th case into the `k+1` expression.
    5.  **A1:** Show correct and detailed algebraic manipulation to prove the `k+1` case is true.
    6.  **A1:** Write a full concluding statement, referencing the base case, inductive step, and the principle of mathematical induction.
*   **Common Pitfalls:**
    *   A weak or missing concluding statement. Simply writing "True for `n=k+1`" is insufficient.
    *   Algebraic errors during the inductive step, especially when manipulating sums or matrix products.
    *   For divisibility proofs, failing to express `f(k+1)` as a combination of `f(k)` and another term that is clearly divisible (e.g., `f(k+1) = A * f(k) + B * (divisible term)`).

#### **2.2 Roots of Polynomial Equations**

*   **Question Phrasing:** "The equation ... has roots α, β, γ...". "Find a ... equation whose roots are...". "Find the value of ...".
*   **Marking Conventions:**
    *   **B1:** For correctly stating or using Vieta's formulas (e.g., `Σα`, `Σαβ`).
    *   **M1:** For a correct strategy to find a new equation (e.g., using `y = 2α+1` to form `x = (y-1)/2` and substituting).
    *   **M1:** For a correct strategy to evaluate a symmetric function (e.g., `Σα² = (Σα)² - 2Σαβ`).
    *   **A1:** For a fully simplified new equation or correct final value.
*   **Common Pitfalls:**
    *   Sign errors when writing down Vieta's formulas.
    *   Algebraic mistakes when expanding or simplifying expressions, particularly for the new equation.
    *   Confusing `(Σα)²` with `Σα²`.

#### **2.3 Rational Functions and Graphs**

*   **Question Phrasing:** "Find the equations of the asymptotes...". "Find the coordinates of the stationary points...". "Sketch the curve C...". "Sketch `y = |f(x)|`..."
*   **Marking Conventions:**
    *   **Asymptotes:** B1 for vertical asymptote(s) from `denominator = 0`. B1 for horizontal/oblique asymptote found by considering `x → ∞` or using polynomial long division.
    *   **Stationary Points:** M1 for using the quotient rule. DM1 for setting `dy/dx = 0`. A1 for correct coordinates.
    *   **Sketching:** B1 for correctly drawn and labelled axes and asymptotes. B1 for correct shape and position of branches. B1 for marking key points (intersections, stationary points).
    *   **Inequalities:** M1 for identifying critical values (roots and vertical asymptotes). M1 for testing regions or using the graph. A1 for the correct set of values.
*   **Common Pitfalls:**
    *   Mistakes in polynomial division when finding an oblique asymptote.
    *   Errors in the quotient rule for differentiation.
    *   When solving inequalities like `f(x) < k`, forgetting that vertical asymptotes are critical values.
    *   Incorrectly sketching transformations, especially `y² = f(x)` (forgetting the reflection in the x-axis) and `y = 1/f(x)`.

#### **2.4 Summation of Series & Method of Differences**

*   **Question Phrasing:** "Use standard results... to find Σ...". "Express ... in partial fractions and hence use the method of differences...". "Deduce the value of the infinite sum...".
*   **Marking Conventions:**
    *   **Standard Results:** M1 for substituting correct MF19 formulae. A1 for correct expansion. A1 for correct, simplified final answer.
    *   **Method of Differences:** M1 for correct partial fractions. M1 for listing at least two terms at the start and one at the end of the summation to show cancellation. A1 for identifying the remaining terms. A1 for the correct sum in terms of `n`.
    *   **Infinite Sum:** B1 for finding the limit as `n → ∞` of their sum.
*   **Common Pitfalls:**
    *   Algebraic errors when simplifying sums from standard results.
    *   Not showing enough terms in the method of differences to clearly demonstrate the cancellation pattern.
    *   Incorrectly identifying which terms remain after cancellation.

#### **2.5 Matrices**

*   **Question Phrasing:** "Find the value of `k` for which M is singular." "Describe fully the geometrical transformation...". "Find the equations of the invariant lines...".
*   **Marking Conventions:**
    *   **Inverse/Singularity:** M1 for setting `det(M) = 0`. A1 for the value of `k`. For the inverse, M1 for determinant, M1 for matrix of cofactors, M1 for transpose, A1 for `(1/det) * adj(M)`.
    *   **Transformations:** B1 for each correct transformation type (e.g., rotation, shear), and B1 for the order if composite. Marks are awarded for full descriptions (e.g., "Rotation 90° anti-clockwise about the origin").
    *   **Invariant Lines:** M1 for setting up the matrix equation `M(x, mx) = (X, mX)`. M1 for deriving a quadratic in `m`. A1 for the gradients and A1 for the line equations (`y = mx`).
*   **Common Pitfalls:**
    *   Forgetting to transpose the matrix of cofactors when finding the inverse of a 3x3 matrix.
    *   Sign errors in cofactor calculations.
    *   Incorrect order of multiplication for composite transformations (e.g., `AB` means `B` then `A`).
    *   Algebraic errors when solving for the gradient `m` of invariant lines.

#### **2.6 Vectors**

*   **Question Phrasing:** "Find the equation of the plane ABC...". "Find the shortest distance between the lines...". "Find the angle between the plane P and the line l...".
*   **Marking Conventions:**
    *   **Plane Equation:** M1 for finding two direction vectors in the plane. M1 for finding the normal vector using the cross product. M1 for using `r.n = a.n`. A1 for the final equation.
    *   **Shortest Distance (Skew Lines):** M1 for the cross product of the direction vectors to find the common perpendicular `n`. M1 for a vector connecting a point on each line. M1 for using the formula `|PQ . n| / |n|`. A1 for the correct distance.
    *   **Angles:** M1 for identifying the correct vectors to use (e.g., normal of plane, direction of line). M1 for using the correct formula (dot product). A1 for the correct angle. **Crucially, the sine formula is used for line-plane angle, while cosine is used for plane-plane.**
*   **Common Pitfalls:**
    *   *Major and frequent issue:* Arithmetic errors in the vector cross product calculation.
    *   Using the incorrect formula for an angle (e.g., using `cosθ` instead of `sinθ` for a line and plane).
    *   Sign errors when calculating the scalar product.
    *   Forgetting the modulus when calculating distance.

#### **2.7 Polar Coordinates**

*   **Question Phrasing:** "Sketch the curve with polar equation...". "Find the area of the region...". "Convert the equation ... to Cartesian form."
*   **Marking Conventions:**
    *   **Sketching:** B1 for correct shape (e.g., cardioid, loop). B1 for correct orientation and intersections with the initial line/half-lines. B1 for symmetry.
    *   **Area:** M1 for using `A = ½ ∫ r² dθ` with correct limits. M1 for using a double angle identity to integrate `cos²θ` or `sin²θ`. A1 for correct integration. A1 for exact final answer.
    *   **Conversion:** M1 for using `r² = x² + y²`, `x = rcosθ`, `y = rsinθ`. A1 for a correct Cartesian equation.
*   **Common Pitfalls:**
    *   Using `∫ r dθ` instead of `½ ∫ r² dθ` for the area.
    *   Incorrect integration limits.
    *   Errors in simplifying trigonometric identities for integration.
    *   Forgetting to square `r` correctly in the area formula.

---

### **3. Notation and Formatting Standards**

*   **Vectors:** Presented as `i, j, k` or as column vectors `(x, y, z)`. Both are acceptable. `r` is standard for a general position vector.
*   **Matrices:** Written with round brackets or square brackets. `I` is the identity matrix. `M⁻¹` is the inverse and `Mᵀ` is the transpose.
*   **Exact Answers:** When "exact" is specified, answers must be in terms of π, surds, `ln`, or fractions. No decimal approximations.
*   **Significant Figures:** Standard is 3 s.f. for non-exact numerical answers, and 1 d.p. for angles in degrees, unless specified otherwise.
*   **Clarity of Working:** "You must show all necessary working clearly" is a standard instruction. Unsupported answers from a calculator will receive no marks. This is particularly important for tasks like matrix inversion, finding determinants, and vector products. The steps must be shown.