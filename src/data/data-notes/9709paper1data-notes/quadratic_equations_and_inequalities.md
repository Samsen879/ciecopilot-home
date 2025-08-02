## Topic: Quadratics
### Subtopic: 1.1 Completing the Square and Finding the Vertex
### Example Question:
The function $f(x)$ is defined by $f(x) = 2x^2 - 12x + 23$ for $x \in \mathbb{R}$.
(a) Express $f(x)$ in the form $a(x + b)^2 + c$, where $a$, $b$ and $c$ are constants.
(b) State the coordinates of the vertex of the graph of $y = f(x)$.
(c) Find the exact solutions to the equation $f(x) = 9$.
#### Key Formulas:
- $a(x+p)^2+q$
#### Standard Solution Steps:
- (a) Factor out the coefficient of $x^2$ from the first two terms. Complete the square for the expression in the brackets. Multiply out and simplify to find the final form.
- (b) The vertex of $y = a(x - h)^2 + k$ is at $(h, k)$. Use the result from part (a) to state the coordinates.
- (c) Set the completed square form equal to 9. Rearrange to make $(x+b)^2$ the subject. Take the square root of both sides (remembering the $\pm$ sign) and solve for $x$.
### Mark Scheme / Solution
(a)
$f(x) = 2(x^2 - 6x) + 23$ (M1 for factorising out 2 from the first two terms)
$f(x) = 2((x - 3)^2 - 9) + 23$ (M1 for attempting to complete the square, $(x-3)^2$)
$f(x) = 2(x - 3)^2 - 18 + 23$
$f(x) = 2(x - 3)^2 + 5$ (A1 for correct final expression. $a=2, b=-3, c=5$)

(b)
The vertex is at $(3, 5)$. (B1 FT from their completed square form)

(c)
$2(x - 3)^2 + 5 = 9$ (M1 for setting their expression from (a) equal to 9)
$2(x - 3)^2 = 4$
$(x - 3)^2 = 2$
$x - 3 = \pm\sqrt{2}$ (A1 for correct step)
$x = 3 \pm \sqrt{2}$ (A1 for both exact solutions)
#### Common Mistakes:
- Forgetting to multiply the constant term from completing the square by the coefficient $a$.
- Incorrectly identifying the sign of the x-coordinate of the vertex from the form $a(x+b)^2+c$.
- Forgetting the $\pm$ sign when taking the square root to solve an equation.
### Tags
completing_the_square, vertex, quadratic_formula
- Quadratic formula
- Exact solution

### Subtopic: 1.2 The Discriminant and Nature of Roots
### Example Question:
The quadratic equation $kx^2 - 4x + (k - 3) = 0$, where $k$ is a constant, has two distinct real roots. Find the set of possible values of $k$.
#### Key Formulas:
- Discriminant: $\Delta = b^2 - 4ac$
- Two distinct real roots: $b^2 - 4ac > 0$
- Two equal real roots (one repeated root): $b^2 - 4ac = 0$
- No real roots: $b^2 - 4ac < 0$
#### Standard Solution Steps:
- Identify the values of $a$, $b$, and $c$ from the quadratic equation in terms of $k$.
- State the condition for two distinct real roots, which is $b^2 - 4ac > 0$.
- Substitute $a$, $b$, and $c$ into the discriminant inequality.
- Simplify the resulting inequality to form a quadratic inequality in $k$.
- Solve the quadratic inequality by finding the critical values and sketching a graph or using a sign diagram.
- State the final set of values for $k$.
### Mark Scheme / Solution
$a = k$, $b = -4$, $c = k - 3$ (B1 SOI)
For two distinct real roots, $b^2 - 4ac > 0$.
$(-4)^2 - 4(k)(k - 3) > 0$ (M1 for substituting correctly into the discriminant and setting inequality)
$16 - 4k^2 + 12k > 0$
$4k^2 - 12k - 16 < 0$
$k^2 - 3k - 4 < 0$ (A1 for correct simplified quadratic inequality)
$(k - 4)(k + 1) < 0$
Critical values are $k = 4$ and $k = -1$.
Sketching the parabola $y = k^2 - 3k - 4$, which opens upwards, the region where $y < 0$ is between the roots.
So, $-1 < k < 4$. (A1 for correct final range)
#### Common Mistakes:
- Incorrectly identifying $a$, $b$, or $c$, especially when they involve variables.
- Using the wrong inequality sign (e.g., $<$ instead of $>$).
- Errors in solving the resulting quadratic inequality, particularly in identifying the correct region.
- Forgetting that the leading term, $k$, cannot be zero for it to be a quadratic equation. In this case $k=0$ is within the final range so it is a valid solution.
### Tags
discriminant, nature_of_roots, quadratic_inequality
- Quadratic inequality
- Set of values

### Subtopic: 1.3 Intersections of a Line and a Curve
### Example Question:
The line $y = mx - 2$ is a tangent to the curve $y = x^2 + 3x + 7$. Find the possible values of the constant $m$ and the coordinates of the points of contact for each value of $m$.
#### Key Formulas:
- For a line to be tangent to a curve, the discriminant of the resulting quadratic equation from their intersection must be zero: $b^2 - 4ac = 0$.
#### Standard Solution Steps:
- Set the equations of the line and the curve equal to each other to find their points of intersection.
- Rearrange the resulting equation into the standard quadratic form $Ax^2 + Bx + C = 0$.
- For the line to be a tangent, there must be exactly one point of intersection, so the discriminant of this quadratic must be zero.
- Set up the equation $B^2 - 4AC = 0$.
- Solve this equation for the unknown constant $m$.
- For each value of $m$, substitute it back into the quadratic equation $Ax^2 + Bx + C = 0$ and solve for $x$ to find the x-coordinate of the point of contact.
- Substitute the x-coordinate back into the line equation to find the corresponding y-coordinate.
### Mark Scheme / Solution
$x^2 + 3x + 7 = mx - 2$ (M1 for equating the line and curve equations)
$x^2 + (3 - m)x + 9 = 0$ (A1 for correct quadratic form)
For the line to be a tangent, the discriminant must be 0.
$a = 1$, $b = (3 - m)$, $c = 9$
$(3 - m)^2 - 4(1)(9) = 0$ (M1 for using the discriminant and setting it to 0)
$9 - 6m + m^2 - 36 = 0$
$m^2 - 6m - 27 = 0$ (A1 for correct quadratic in m)
$(m - 9)(m + 3) = 0$
$m = 9$ or $m = -3$ (A1 for both values of m)
When $m = 9$: $x^2 + (3 - 9)x + 9 = 0 \implies x^2 - 6x + 9 = 0 \implies (x-3)^2 = 0 \implies x = 3$.
$y = 9(3) - 2 = 25$. Point of contact is $(3, 25)$. (A1 for correct coordinates for one value of m)
When $m = -3$: $x^2 + (3 - (-3))x + 9 = 0 \implies x^2 + 6x + 9 = 0 \implies (x+3)^2 = 0 \implies x = -3$.
$y = -3(-3) - 2 = 7$. Point of contact is $(-3, 7)$. (A1 for correct coordinates for the other value of m)
#### Common Mistakes:
- Making algebraic errors when rearranging the equation into quadratic form.
- Solving $B^2 - 4AC = 0$ incorrectly.
- Forgetting to find the coordinates of the points of contact after finding the values of $m$.
### Tags
tangent, discriminant, line_curve_intersection
- Intersection
- Simultaneous equations
- Coordinate geometry

### Subtopic: 1.4 Solving Quadratic Inequalities
### Example Question:
Find the set of values of $x$ for which $2x^2 + 5x > 12$.
#### Key Formulas:
- A quadratic inequality is solved by first finding the roots (critical values) of the corresponding equation.
#### Standard Solution Steps:
- Rearrange the inequality so that one side is zero, e.g., $ax^2 + bx + c > 0$.
- Solve the corresponding quadratic equation $ax^2 + bx + c = 0$ to find the critical values. This can be done by factorising or using the quadratic formula.
- Sketch the graph of the quadratic $y = ax^2 + bx + c$. The shape (upward or downward-opening parabola) is determined by the sign of $a$.
- Use the sketch and the inequality sign to determine the required range of values for $x$.
### Mark Scheme / Solution
$2x^2 + 5x - 12 > 0$ (M1 for rearranging to standard form)
Solve $2x^2 + 5x - 12 = 0$.
$(2x - 3)(x + 4) = 0$ (M1 for attempting to factorise or solve)
Critical values are $x = \frac{3}{2}$ and $x = -4$. (A1 for both correct critical values)
Sketching the parabola $y = 2x^2 + 5x - 12$, which opens upwards.
The inequality is $> 0$, so we are interested in the regions where the graph is above the x-axis.
$x > \frac{3}{2}$ or $x < -4$. (A1 for the correct two separate regions)
#### Common Mistakes:
- Incorrectly factorising the quadratic.
- Choosing the wrong region after finding the critical values. A sketch is highly recommended to avoid this.
- Writing the answer as a single incorrect inequality, e.g., $-4 > x > \frac{3}{2}$.
### Tags
quadratic_inequality, critical_values, sign_analysis
- Set of values

### Subtopic: 1.5 Solving Simultaneous Equations (Linear and Quadratic)
### Example Question:
Find the coordinates of the points of intersection of the line $x - 2y = 3$ and the curve $xy + y^2 = 5$.
#### Standard Solution Steps:
- Rearrange the linear equation to make either $x$ or $y$ the subject.
- Substitute this expression into the quadratic equation.
- This will result in a single quadratic equation in one variable.
- Solve this quadratic equation to find the values for that variable.
- Substitute these values back into the rearranged linear equation to find the corresponding values of the other variable.
- State the coordinates of the intersection points.
### Mark Scheme / Solution
From the linear equation, $x = 2y + 3$. (M1 for rearranging the linear equation)
Substitute into the curve equation: $(2y + 3)y + y^2 = 5$. (M1 for substitution)
$2y^2 + 3y + y^2 = 5$
$3y^2 + 3y - 5 = 0$ (A1 for correct quadratic equation)
Using the quadratic formula: $y = \frac{-3 \pm \sqrt{3^2 - 4(3)(-5)}}{2(3)}$ (M1 for correct use of the quadratic formula)
$y = \frac{-3 \pm \sqrt{9 + 60}}{6} = \frac{-3 \pm \sqrt{69}}{6}$ (A1 for correct values of y)
When $y = \frac{-3 + \sqrt{69}}{6}$: $x = 2\left(\frac{-3 + \sqrt{69}}{6}\right) + 3 = \frac{-3 + \sqrt{69}}{3} + 3 = \frac{6 + \sqrt{69}}{3}$.
When $y = \frac{-3 - \sqrt{69}}{6}$: $x = 2\left(\frac{-3 - \sqrt{69}}{6}\right) + 3 = \frac{-3 - \sqrt{69}}{3} + 3 = \frac{6 - \sqrt{69}}{3}$.
Points are $(\frac{6 + \sqrt{69}}{3}, \frac{-3 + \sqrt{69}}{6})$ and $(\frac{6 - \sqrt{69}}{3}, \frac{-3 - \sqrt{69}}{6})$. (A1 for both correct pairs of coordinates)
#### Common Mistakes:
- Errors in algebraic manipulation after substitution.
- Only finding the values for one variable and forgetting to find the corresponding values for the other.
- Not pairing the coordinates correctly.
### Tags
simultaneous_equations, intersection_points, coordinate_geometry
- Substitution
- Coordinate geometry

### Subtopic: 1.6 Solving Equations in Quadratic Form
### Example Question:
Solve the equation $x^4 - 7x^2 - 18 = 0$.
#### Standard Solution Steps:
- Identify a substitution that will turn the equation into a quadratic. In this case, let $u = x^2$.
- Rewrite the equation in terms of the new variable $u$.
- Solve the resulting quadratic equation for $u$.
- Substitute back to the original variable. For each valid solution for $u$, solve for $x$.
- Discard any solutions that are not possible (e.g., $x^2$ cannot be negative for real $x$).
### Mark Scheme / Solution
Let $u = x^2$. (M1 for substitution)
The equation becomes $u^2 - 7u - 18 = 0$. (A1 for correct quadratic in u)
Factoring the quadratic: $(u - 9)(u + 2) = 0$.
So, $u = 9$ or $u = -2$. (A1 for both values of u)
Substitute back:
Case 1: $x^2 = 9 \implies x = \pm 3$. (A1 for both correct values of x)
Case 2: $x^2 = -2$. This has no real solutions. (B1 for rejecting the negative solution for $x^2$)
The solutions are $x = 3$ and $x = -3$.
#### Common Mistakes:
- Forgetting to solve for the original variable $x$ after finding the values for $u$.
- When taking the square root, only giving the positive solution and forgetting the negative one.
- Attempting to find a real solution from an invalid intermediate step, like $x^2 = -2$.
### Tags
disguised_quadratics, substitution, algebraic_manipulation
- Solving equations
- Powers