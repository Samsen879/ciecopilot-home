## Rational Functions: Identifying Asymptotes

**Syllabus Reference**: 1.2 Rational Functions and Graphs

**Learning Objective**: Determine vertical, horizontal, and oblique asymptotes.

### Example Question
The curve $C$ has equation $y = \frac{2x^2 + 5x - 3}{x^2 - 9}$. Find the equations of all asymptotes of $C$.

### Mark Scheme / Solution
To find vertical asymptotes, set the denominator to zero: $x^2 - 9 = 0$. M1. This gives $(x-3)(x+3) = 0$. The vertical asymptotes are $x=3$ and $x=-3$. A1.
The degrees of the numerator and denominator are equal (both are 2). M1. Therefore, the horizontal asymptote is given by the ratio of the leading coefficients, $y = \frac{2}{1}$. The equation is $y=2$. A1.

### Standard Solution Steps
- **Vertical Asymptotes**: Set the denominator of the rational function equal to zero and solve for $x$. Ensure the numerator is non-zero for these values of $x$. If both are zero, there may be a hole in the graph instead of an asymptote.
- **Horizontal Asymptotes**:
    - If degree of numerator < degree of denominator, the horizontal asymptote is $y=0$.
    - If degree of numerator = degree of denominator, the horizontal asymptote is $y = \frac{\text{leading coefficient of numerator}}{\text{leading coefficient of denominator}}$.
    - If degree of numerator > degree of denominator, there is no horizontal asymptote (see oblique asymptotes).

### Common Mistakes
- Incorrectly factorising the denominator to find vertical asymptotes.
- Forgetting to check if the numerator is also zero at a potential vertical asymptote, which would indicate a point of discontinuity (a hole) rather than an asymptote.
- Applying the wrong rule for the horizontal asymptote, such as always assuming it is $y=0$.
- Making sign errors when reading coefficients for the horizontal asymptote.

### Tags
rational functions, asymptotes, vertical asymptote, horizontal asymptote, graph analysis

---
## Rational Functions: Oblique Asymptotes

**Syllabus Reference**: 1.2 Rational Functions and Graphs

**Learning Objective**: Determine vertical, horizontal, and oblique asymptotes.

### Example Question
A curve $C$ has the equation $y = \frac{x^2 - 5x + 7}{x-2}$. Find the equations of the asymptotes of $C$.

### Mark Scheme / Solution
The vertical asymptote is found by setting the denominator to zero, which gives $x-2=0$. The equation is $x=2$. B1.
The degree of the numerator (2) is exactly one greater than the degree of the denominator (1), so an oblique asymptote exists. M1.
Perform polynomial long division to find the quotient.
$\frac{x^2 - 5x + 7}{x-2} = x - 3 + \frac{1}{x-2}$. M1 A1.
As $x \to \pm\infty$, the remainder term $\frac{1}{x-2} \to 0$. The equation of the oblique asymptote is $y = x - 3$. A1.

### Standard Solution Steps
- **Condition Check**: First, verify that an oblique asymptote exists by checking if the degree of the numerator is exactly one greater than the degree of the denominator.
- **Polynomial Division**: Use polynomial long division (or synthetic division) to divide the numerator by the denominator.
- **Identify Quotient**: The equation of the oblique asymptote is $y = \text{quotient}$. The remainder part of the division is ignored as it tends to zero for large $|x|$.
- **Vertical Asymptotes**: Also find any vertical asymptotes by setting the denominator to zero.

### Common Mistakes
- Errors in the polynomial long division process, such as incorrect subtraction or misaligned terms.
- Incorrectly identifying the quotient as the asymptote.
- Attempting to find an oblique asymptote when the condition on degrees is not met.
- Forgetting to state the vertical asymptote, as the question asks for all asymptotes.

### Tags
rational functions, asymptotes, oblique asymptote, slant asymptote, polynomial division

---
## Rational Functions: Graph Sketching

**Syllabus Reference**: 1.2 Rational Functions and Graphs

**Learning Objective**: Sketch graphs of simple rational functions, identifying significant features like turning points, asymptotes, and intersections with axes.

### Example Question
The curve $C$ has equation $y = \frac{x^2}{x-2}$.
(a) Find the equations of the asymptotes of $C$.
(b) Find the coordinates of the turning points of $C$.
(c) Sketch the curve $C$, showing the asymptotes, turning points, and any intersections with the axes.

### Mark Scheme / Solution
(a) Vertical asymptote is $x=2$. B1.
Degree of numerator is one greater than degree of denominator, so there is an oblique asymptote. By division, $\frac{x^2}{x-2} = x+2+\frac{4}{x-2}$. The oblique asymptote is $y=x+2$. M1 A1.
(b) Differentiate using the quotient rule: $\frac{dy}{dx} = \frac{2x(x-2) - x^2(1)}{(x-2)^2} = \frac{x^2-4x}{(x-2)^2}$. M1 A1.
Set $\frac{dy}{dx}=0 \implies x^2-4x=0 \implies x(x-4)=0$. DM1.
The x-coordinates of the turning points are $x=0$ and $x=4$.
The turning points are $(0, 0)$ and $(4, 8)$. A1.
(c) Axes drawn and both asymptotes $x=2$ and $y=x+2$ correctly drawn and labelled. B1.
Correct shape of both branches, approaching asymptotes correctly. B1.
Curve passes through the origin $(0,0)$ and has turning points at $(0,0)$ and $(4,8)$ correctly located and marked. B1.

### Standard Solution Steps
1.  **Find Asymptotes**: Determine and draw all vertical, horizontal, or oblique asymptotes. These form the skeleton of the graph.
2.  **Find Intercepts**:
    -   Find the y-intercept by setting $x=0$.
    -   Find any x-intercepts by setting $y=0$ (which means setting the numerator to zero).
3.  **Find Stationary Points**:
    -   Find the first derivative $\frac{dy}{dx}$, typically using the quotient rule.
    -   Set $\frac{dy}{dx}=0$ and solve for $x$ to find the x-coordinates of the turning points.
    -   Substitute these x-values back into the original equation to find the corresponding y-coordinates.
4.  **Sketch**: Combine all the above information. Plot the key points (intercepts, turning points). Draw the branches of the curve, ensuring they approach the asymptotes correctly and have the correct shape around the turning points.

### Common Mistakes
-   Errors in differentiation, especially with the quotient rule.
-   Algebraic mistakes when solving $\frac{dy}{dx}=0$.
-   Drawing the branches of the curve in the wrong sections created by the asymptotes.
-   Incorrectly showing the curve's behaviour near the asymptotes (e.g., crossing a vertical asymptote).
-   Forgetting to label the asymptotes, intercepts, and turning points on the final sketch.

### Tags
rational functions, graph sketching, turning points, stationary points, asymptotes, intercepts, differentiation

---
## Rational Functions: Range of Values using Discriminant

**Syllabus Reference**: 1.2 Rational Functions and Graphs

**Learning Objective**: Determine the set of values taken by the function (e.g., using a discriminant).

### Example Question
Find the set of values that $y$ cannot take for the curve with equation $y = \frac{x^2 - 2x + 5}{x-3}$.

### Mark Scheme / Solution
Set up the equation as a quadratic in $x$. $y(x-3) = x^2 - 2x + 5$. M1.
Rearrange into the form $Ax^2+Bx+C=0$: $x^2 - 2x + 5 - yx + 3y = 0$, which gives $x^2 - (2+y)x + (5+3y) = 0$. A1.
For real values of $x$ to exist, the discriminant must be greater than or equal to zero. $b^2 - 4ac \ge 0$. M1.
This gives $(-(2+y))^2 - 4(1)(5+3y) \ge 0$.
$(y+2)^2 - 4(5+3y) \ge 0$.
$y^2 + 4y + 4 - 20 - 12y \ge 0$.
$y^2 - 8y - 16 \ge 0$. A1.
To find the roots of $y^2 - 8y - 16 = 0$, use the quadratic formula: $y = \frac{8 \pm \sqrt{64 - 4(1)(-16)}}{2} = \frac{8 \pm \sqrt{128}}{2} = 4 \pm \sqrt{32} = 4 \pm 4\sqrt{2}$.
Since $y^2 - 8y - 16 \ge 0$, the function's range is $y \le 4 - 4\sqrt{2}$ or $y \ge 4 + 4\sqrt{2}$.
The set of values that $y$ cannot take is $4 - 4\sqrt{2} < y < 4 + 4\sqrt{2}$. A1.

### Standard Solution Steps
- **Rearrange to a Quadratic**: Rewrite the equation $y=f(x)$ to form a quadratic equation in $x$, with coefficients involving $y$.
- **Apply Discriminant Condition**: For real solutions for $x$ to exist, the discriminant of this quadratic equation must be non-negative (i.e., $b^2 - 4ac \ge 0$).
- **Form Inequality in y**: Substitute the coefficients (in terms of $y$) into the discriminant condition. This creates a quadratic inequality in $y$.
- **Solve the Inequality**: Solve the quadratic inequality for $y$. This gives the set of all possible values for $y$ (the range).
- **Identify the Gap**: If the question asks for values that $y$ *cannot* take, this corresponds to the interval where the discriminant is negative.

### Common Mistakes
-   Algebraic errors when rearranging the equation into a quadratic in $x$.
-   Sign errors when identifying the coefficients $a, b, c$ for the discriminant.
-   Mistakes in expanding and simplifying the discriminant inequality.
-   Solving the final quadratic inequality incorrectly (e.g., getting the inequality signs the wrong way around).
-   Confusing the set of values $y$ *can* take with the set of values it *cannot* take.

### Tags
rational functions, range, discriminant, quadratic inequality, turning points