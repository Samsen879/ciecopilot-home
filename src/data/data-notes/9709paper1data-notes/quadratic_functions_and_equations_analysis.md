## Topic: Quadratics
### Subtopic: 1.1 Completing the Square and Finding the Vertex
#### Example Question:
The function $f(x)$ is defined by $f(x) = 2x^2 - 12x + 23$ for $x \in \mathbb{R}$.
(a) Express $f(x)$ in the form $a(x + b)^2 + c$, where $a$, $b$ and $c$ are constants.
(b) State the coordinates of the vertex of the graph of $y = f(x)$.
(c) Find the exact solutions to the equation $f(x) = 9$.
#### Key Formulas:
- $a(x+p)^2+q$
#### Standard Solution Steps:
- (a) Factor out the coefficient of $x^2$ from the first two terms. Complete the square for the expression in the brackets. Multiply out and simplify to find the final form.
- (b) The vertex of $y = a(x - h)^2 + k$ is at $(h, k)$. Use the result from part (a) to state the coordinates.
- (c) Set the completed square form equal to $9$. Rearrange to make $(x+b)^2$ the subject. Take the square root of both sides (remembering the $\pm$ sign) and solve for $x$.
#### Mark Scheme:
- (a)
- $f(x) = 2(x^2 - 6x) + 23$ [M1 for factorising out 2 from the first two terms]
- $f(x) = 2((x - 3)^2 - 9) + 23$ [M1 for attempting to complete the square, $(x-3)^2$]
- $f(x) = 2(x - 3)^2 - 18 + 23$
- $f(x) = 2(x - 3)^2 + 5$ [A1 for correct final expression. $a=2, b=-3, c=5$]
- (b)
- The vertex is at $(3, 5)$. [B1 FT from their completed square form]
- (c)
- $2(x - 3)^2 + 5 = 9$ [M1 for setting their expression from (a) equal to 9]
- $2(x - 3)^2 = 4$
- $(x - 3)^2 = 2$
- $x - 3 = \pm\sqrt{2}$ [A1 for correct step]
- $x = 3 \pm \sqrt{2}$ [A1 for both exact solutions]
#### Common Mistakes:
- Forgetting to multiply the constant term from completing the square by the coefficient $a$.
- Incorrectly identifying the sign of the x-coordinate of the vertex from the form $a(x+b)^2+c$.
- Forgetting the $\pm$ sign when taking the square root to solve an equation.
### Tags
completing_the_square, vertex, quadratic_formula
- Quadratic formula
- Exact solution

### Subtopic: 1.2 The Discriminant and Nature of Roots
#### Example Question:
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
#### Mark Scheme:
- $a = k$, $b = -4$, $c = k - 3$ [B1 SOI]
- For two distinct real roots, $b^2 - 4ac > 0$.
- $(-4)^2 - 4(k)(k - 3) > 0$ [M1 for substituting correctly into the discriminant and setting inequality]
- $16 - 4k^2 + 12k > 0$
- $4k^2 - 12k - 16 < 0$
- $k^2 - 3k - 4 < 0$ [A1 for correct simplified quadratic inequality]
- $(k - 4)(k + 1) < 0$
- Critical values are $k = 4$ and $k = -1$.
- Sketching the parabola $y = k^2 - 3k - 4$, which opens upwards, the region where $y < 0$ is between the roots.
- So, $-1 < k < 4$. [A1 for correct final range]
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
#### Example Question:
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
#### Mark Scheme:
- $x^2 + 3x + 7 = mx - 2$ [M1 for equating the line and curve equations]
- $x^2 + (3 - m)x + 9 = 0$ [A1 for correct quadratic form]
- For the line to be a tangent, the discriminant must be 0.
- $a = 1$, $b = (3 - m)$, $c = 9$
- $(3 - m)^2 - 4(1)(9) = 0$ [M1 for using the discriminant and setting it to 0]
- $9 - 6m + m^2 - 36 = 0$
- $m^2 - 6m - 27 = 0$ [A1 for correct quadratic in m]
- $(m - 9)(m + 3) = 0$
- $m = 9$ or $m = -3$ [A1 for both values of m]
- When $m = 9$: $x^2 + (3 - 9)x + 9 = 0 \implies x^2 - 6x + 9 = 0 \implies (x-3)^2 = 0 \implies x = 3$.
- $y = 9(3) - 2 = 25$. Point of contact is $(3, 25)$. [A1 for correct coordinates for one value of m]
- When $m = -3$: $x^2 + (3 - (-3))x + 9 = 0 \implies x^2 + 6x + 9 = 0 \implies (x+3)^2 = 0 \implies x = -3$.
- $y = -3(-3) - 2 = 7$. Point of contact is $(-3, 7)$. [A1 for correct coordinates for the other value of m]
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
#### Example Question:
Find the set of values of $x$ for which $2x^2 + 5x > 12$.
#### Key Formulas:
- A quadratic inequality is solved by first finding the roots (critical values) of the corresponding equation.
#### Standard Solution Steps:
- Rearrange the inequality so that one side is zero, e.g., $ax^2 + bx + c > 0$.
- Solve the corresponding quadratic equation $ax^2 + bx + c = 0$ to find the critical values. This can be done by factorising or using the quadratic formula.
- Sketch the graph of the quadratic $y = ax^2 + bx + c$. The shape (upward or downward-opening parabola) is determined by the sign of $a$.
- Use the sketch and the inequality sign to determine the required range of values for $x$.
#### Mark Scheme:
- $2x^2 + 5x - 12 > 0$ [M1 for rearranging to standard form]
- Solve $2x^2 + 5x - 12 = 0$.
- $(2x - 3)(x + 4) = 0$ [M1 for attempting to factorise or solve]
- Critical values are $x = \frac{3}{2}$ and $x = -4$. [A1 for both correct critical values]
- Sketching the parabola $y = 2x^2 + 5x - 12$, which opens upwards.
- The inequality is $> 0$, so we are interested in the regions where the graph is above the x-axis.
- $x > \frac{3}{2}$ or $x < -4$. [A1 for the correct two separate regions]
#### Common Mistakes:
- Incorrectly factorising the quadratic.
- Choosing the wrong region after finding the critical values. A sketch is highly recommended to avoid this.
- Writing the answer as a single incorrect inequality, e.g., $-4 > x > \frac{3}{2}$.
### Tags
quadratic_inequality, critical_values, sign_analysis
- Set of values

### Subtopic: 1.5 Solving Simultaneous Equations (Linear and Quadratic)
#### Example Question:
Find the coordinates of the points of intersection of the line $x - 2y = 3$ and the curve $xy + y^2 = 5$.
#### Standard Solution Steps:
- Rearrange the linear equation to make either $x$ or $y$ the subject.
- Substitute this expression into the quadratic equation.
- This will result in a single quadratic equation in one variable.
- Solve this quadratic equation to find the values for that variable.
- Substitute these values back into the rearranged linear equation to find the corresponding values of the other variable.
- State the coordinates of the intersection points.
#### Mark Scheme:
- From the linear equation, $x = 2y + 3$. [M1 for rearranging the linear equation]
- Substitute into the curve equation: $(2y + 3)y + y^2 = 5$. [M1 for substitution]
- $2y^2 + 3y + y^2 = 5$
- $3y^2 + 3y - 5 = 0$ [A1 for correct quadratic equation]
- Using the quadratic formula: $y = \frac{-3 \pm \sqrt{3^2 - 4(3)(-5)}}{2(3)}$ [M1 for correct use of the quadratic formula]
- $y = \frac{-3 \pm \sqrt{9 + 60}}{6} = \frac{-3 \pm \sqrt{69}}{6}$ [A1 for correct values of y]
- When $y = \frac{-3 + \sqrt{69}}{6}$: $x = 2\left(\frac{-3 + \sqrt{69}}{6}\right) + 3 = \frac{-3 + \sqrt{69}}{3} + 3 = \frac{6 + \sqrt{69}}{3}$.
- When $y = \frac{-3 - \sqrt{69}}{6}$: $x = 2\left(\frac{-3 - \sqrt{69}}{6}\right) + 3 = \frac{-3 - \sqrt{69}}{3} + 3 = \frac{6 - \sqrt{69}}{3}$.
- Points are $(\frac{6 + \sqrt{69}}{3}, \frac{-3 + \sqrt{69}}{6})$ and $(\frac{6 - \sqrt{69}}{3}, \frac{-3 - \sqrt{69}}{6})$. [A1 for both correct pairs of coordinates]
#### Common Mistakes:
- Errors in algebraic manipulation after substitution.
- Only finding the values for one variable and forgetting to find the corresponding values for the other.
- Not pairing the coordinates correctly.
### Tags
simultaneous_equations, intersection_points, coordinate_geometry
- Substitution
- Coordinate geometry

### Subtopic: 1.6 Solving Equations in Quadratic Form
#### Example Question:
Solve the equation $x^4 - 7x^2 - 18 = 0$.
#### Standard Solution Steps:
- Identify a substitution that will turn the equation into a quadratic. In this case, let $u = x^2$.
- Rewrite the equation in terms of the new variable $u$.
- Solve the resulting quadratic equation for $u$.
- Substitute back to the original variable. For each valid solution for $u$, solve for $x$.
- Discard any solutions that are not possible (e.g., $x^2$ cannot be negative for real $x$).
#### Mark Scheme:
- Let $u = x^2$. [M1 for substitution]
- The equation becomes $u^2 - 7u - 18 = 0$. [A1 for correct quadratic in u]
- Factoring the quadratic: $(u - 9)(u + 2) = 0$.
- So, $u = 9$ or $u = -2$. [A1 for both values of u]
- Substitute back:
- Case 1: $x^2 = 9 \implies x = \pm 3$. [A1 for both correct values of x]
- Case 2: $x^2 = -2$. This has no real solutions. [B1 for rejecting the negative solution for $x^2$]
- The solutions are $x = 3$ and $x = -3$.
#### Common Mistakes:
- Forgetting to solve for the original variable $x$ after finding the values for $u$.
- When taking the square root, only giving the positive solution and forgetting the negative one.
- Attempting to find a real solution from an invalid intermediate step, like $x^2 = -2$.
### Tags
disguised_quadratics, substitution, algebraic_manipulation
- Solving equations
- Powers

## Topic: Functions
### Subtopic: 2.1 Domain and Range
#### Example Question:
The function $f$ is defined by $f(x) = x^2 - 6x + 2$ for the domain $x \le 2$. Find the range of $f$.
#### Key Formulas:
- The vertex form of a quadratic is $f(x) = a(x-h)^2 + k$, where $(h, k)$ is the vertex. This is key for finding the range.
#### Standard Solution Steps:
- Complete the square to find the coordinates of the vertex of the quadratic function.
- Sketch the graph of the parabola, paying attention to its orientation (opening upwards or downwards).
- Identify the given domain and mark it on the x-axis of your sketch.
- Determine if the vertex lies inside or outside the given domain.
- Evaluate the function at the boundary/boundaries of the domain.
- Based on the sketch, determine the set of all possible y-values for the given domain.
#### Mark Scheme:
- The function is a quadratic. Find the vertex by completing the square.
- $f(x) = (x^2 - 6x + 9) - 9 + 2$
- $f(x) = (x - 3)^2 - 7$ [M1]
- The vertex of the parabola is at the point $(3, -7)$.
- The domain is $x \le 2$. The vertex ($x=3$) is outside this domain.
- The function is strictly decreasing over its entire domain $x \le 2$.
- Evaluate the function at the boundary of the domain, $x=2$.
- $f(2) = (2)^2 - 6(2) + 2 = 4 - 12 + 2 = -6$ [M1]
- Since the function is decreasing for $x \le 2$, the value of $f(x)$ will only increase from $-6$ as $x$ becomes more negative.
- The range of $f$ is $f(x) \ge -6$. [A1]
#### Common Mistakes:
- Incorrectly finding the vertex after completing the square.
- Forgetting to consider the restricted domain when stating the range.
- Assuming the vertex's y-coordinate is the minimum/maximum of the range without checking if the vertex is within the domain.
- Confusing domain and range.
### Tags
function, domain, range, quadratic_function
- range
- quadratic
- completing the square

### Subtopic: 2.2 One-to-one and Inverse Functions
#### Example Question:
The function $f$ is defined by $f(x) = (x+2)^2 + 5$ for $x \ge -2$.
(a) State the range of $f$.
(b) Explain why $f$ has an inverse.
(c) Find an expression for $f^{-1}(x)$.
(d) State the domain of $f^{-1}$.
#### Key Formulas:
- A function is one-to-one if every element of the range corresponds to exactly one element of the domain.
- To find $f^{-1}(x)$: let $y = f(x)$, make $x$ the subject of the formula, then swap $x$ and $y$.
- The domain of $f^{-1}$ is the range of $f$. The range of $f^{-1}$ is the domain of $f$.
#### Standard Solution Steps:
- (a) Identify the vertex from the completed square form and consider the domain to state the range.
- (b) A function has an inverse if it is one-to-one. Show that for the given domain, the function is either strictly increasing or strictly decreasing.
- (c) Let $y=f(x)$, rearrange to make $x$ the subject, then swap $x$ and $y$. Select the correct sign when taking a square root based on the original function's domain.
- (d) The domain of the inverse function is the range of the original function found in part (a).
#### Mark Scheme:
- (a) The vertex of the parabola $y = (x+2)^2 + 5$ is at $(-2, 5)$. Since the domain is $x \ge -2$, the function starts at its minimum point. The range of $f$ is $f(x) \ge 5$. [B1]
- (b) For the domain $x \ge -2$, the graph of $f(x)$ is always increasing. This means that for any y-value in the range, there is only one corresponding x-value. Therefore, the function is one-to-one and has an inverse. [B1]
- (c) Let $y = f(x)$.
- $y = (x+2)^2 + 5$
- $y - 5 = (x+2)^2$ [M1]
- $\sqrt{y - 5} = x + 2$ [M1] (Take positive root as domain $x \ge -2 \implies x+2 \ge 0$)
- $x = \sqrt{y - 5} - 2$
- Swap $x$ and $y$: $y = \sqrt{x - 5} - 2$.
- $f^{-1}(x) = \sqrt{x - 5} - 2$. [A1]
- (d) The domain of $f^{-1}$ is the range of $f$. Therefore, the domain of $f^{-1}$ is $x \ge 5$. [B1ft]
#### Common Mistakes:
- Forgetting to select the correct sign (positive or negative) when taking a square root during the rearrangement.
- Incorrectly stating the domain and range of the inverse function.
- Trying to find an inverse for a function that is not one-to-one without a restricted domain.
### Tags
function, inverse_function, domain_restriction, one_to_one
- one-to-one
- domain
- range

### Subtopic: 2.3 Composite Functions
#### Example Question:
Functions $f$ and $g$ are defined by:
$f(x) = \frac{1}{2x-3}$ for $x > 2$
$g(x) = 4x + k$ for $x \in \mathbb{R}$, where $k$ is a constant.
(a) Find an expression for the composite function $fg(x)$.
(b) Given that $fg(3) = \frac{1}{5}$, find the value of $k$.
(c) Using the value of $k$ found in part (b), solve the equation $gf(x) = 7$.
#### Standard Solution Steps:
- To find $fg(x)$, substitute the entire expression for $g(x)$ into every instance of $x$ in the function $f(x)$.
- To solve an equation like $fg(x) = c$, first find the expression for $fg(x)$ and then set it equal to $c$ and solve for $x$.
- Always check if the final solution for $x$ lies within the domain of the innermost function (in $gf(x)$, this is the domain of $f$).
#### Mark Scheme:
- (a) $fg(x) = f(g(x)) = f(4x+k)$ [M1]
- $fg(x) = \frac{1}{2(4x+k)-3} = \frac{1}{8x+2k-3}$ [A1]
- (b) Substitute $x=3$ into the expression for $fg(x)$:
- $fg(3) = \frac{1}{8(3)+2k-3} = \frac{1}{21+2k}$ [M1]
- $\frac{1}{21+2k} = \frac{1}{5} \implies 21+2k = 5 \implies 2k = -16 \implies k = -8$ [A1]
- (c) With $k=-8$, we have $g(x) = 4x - 8$. We need to solve $gf(x) = 7$.
- $gf(x) = g(f(x)) = g(\frac{1}{2x-3})$ [M1]
- $gf(x) = 4(\frac{1}{2x-3}) - 8 = \frac{4}{2x-3} - 8$
- $\frac{4}{2x-3} - 8 = 7 \implies \frac{4}{2x-3} = 15$ [M1]
- $4 = 15(2x-3) \implies 4 = 30x - 45 \implies 49 = 30x \implies x = \frac{49}{30}$ [A1]
- Check domain: The domain of $f(x)$ is $x>2$. Since $\frac{49}{30} \approx 1.63$, which is not greater than 2, there is no solution. [A1ft]
#### Common Mistakes:
- Confusing $fg(x)$ with $gf(x)$. The order is crucial.
- Incorrectly substituting during the composition, for example calculating $f(x)g(x)$ instead.
- Forgetting to check if the final answer is valid within the specified domain of the original functions.
### Tags
function, composite_function, function_composition
- fg(x)
- algebra

### Subtopic: 2.4 Graph of a Function and its Inverse
#### Example Question:
The function $f$ is defined by $f(x) = (x-3)^2$ for the domain $x \ge 3$.
(a) Find an expression for $f^{-1}(x)$.
(b) On a single diagram, sketch the graphs of $y=f(x)$ and $y=f^{-1}(x)$.
(c) State the relationship between the two graphs.
(d) Find the coordinates of the point of intersection of the graphs of $y=f(x)$ and $y=f^{-1}(x)$.
#### Standard Solution Steps:
- (a) To find the inverse, set $y = f(x)$, rearrange to make $x$ the subject, and then swap variables.
- (b) Sketch $f(x)$ and the line $y=x$. Reflect the graph of $f(x)$ in the line $y=x$ to get the graph of $f^{-1}(x)$.
- (c) State the reflection property.
- (d) To find intersection points, solve the equation $f(x) = x$ or $f^{-1}(x) = x$. Ensure solutions are valid in the required domains.
#### Mark Scheme:
- (a) Let $y = (x-3)^2$. Take square root: $\sqrt{y} = x-3$. (Positive root since $x \ge 3 \implies x-3 \ge 0$). [M1]
- $x = \sqrt{y} + 3$. Swap variables: $y = \sqrt{x} + 3$.
- $f^{-1}(x) = 3 + \sqrt{x}$. [A1]
- (b) A sketch showing the correct shapes and relative positions of $f(x)$ (right half of parabola, vertex $(3,0)$), $f^{-1}(x)$ (square root graph starting $(0,3)$), and the line $y=x$. [B3]
- (c) The graph of $y=f^{-1}(x)$ is a reflection of the graph of $y=f(x)$ in the line $y=x$. [B1]
- (d) Solve $f(x) = x$: $(x-3)^2 = x$. [M1]
- $x^2 - 6x + 9 = x \implies x^2 - 7x + 9 = 0$.
- Use quadratic formula: $x = \frac{7 \pm \sqrt{(-7)^2 - 4(1)(9)}}{2} = \frac{7 \pm \sqrt{13}}{2}$. [A1]
- The domain of $f(x)$ is $x \ge 3$.
- $x_1 = \frac{7 - \sqrt{13}}{2} \approx 1.7$, which is not in the domain.
- $x_2 = \frac{7 + \sqrt{13}}{2} \approx 5.3$, which is in the domain.
- The intersection point is on the line $y=x$, so the coordinates are $(\frac{7 + \sqrt{13}}{2}, \frac{7 + \sqrt{13}}{2})$. [A1]
#### Common Mistakes:
- Incorrectly reflecting the graph.
- Trying to solve $f(x) = f^{-1}(x)$, which is often much more difficult algebraically than solving $f(x) = x$.
- Forgetting to check if the solutions to the intersection equation are valid for the given domain.
### Tags
function, inverse_function, intersection_points, domain_validation
- graph
- reflection
- y=x
- intersection

### Subtopic: 2.5 Graph Transformations
#### Example Question:
The graph of $y = f(x)$ has a turning point at $(3, 5)$.
(a) State the coordinates of the turning point on the graph of $y = f(x-2) + 4$.
(b) The graph of $y=g(x)$ is a transformation of the graph of $y=f(x)$. The turning point on the graph of $y=g(x)$ is $(6, 15)$. Given that $g(x) = af(x/b)$, state the values of the constants $a$ and $b$.
#### Key Formulas:
- $y = f(x) + a$: Translation by vector $(0, a)$.
- $y = f(x + a)$: Translation by vector $(-a, 0)$.
- $y = af(x)$: Stretch parallel to the y-axis, factor $a$.
- $y = f(ax)$: Stretch parallel to the x-axis, factor $1/a$.
#### Standard Solution Steps:
- (a) Identify the transformations and apply them sequentially to the given coordinates. $f(x-2)$ is a translation right by 2. $+4$ is a translation up by 4.
- (b) Identify the transformations corresponding to $a$ and $b$. $af(...)$ is a vertical stretch by factor $a$. $f(x/b)$ is a horizontal stretch by factor $b$. Set up equations by mapping the original coordinates to the new coordinates.
#### Mark Scheme:
- (a) The transformation $y = f(x-2) + 4$ is a translation by the vector $\begin{pmatrix} 2 \\ 4 \end{pmatrix}$. [M1]
- Applying this to the point $(3, 5)$: New point is $(3+2, 5+4) = (5, 9)$. [A1]
- (b) The transformation $y = af(x/b)$ maps a point $(x,y)$ to $(bx, ay)$.
- The original point is $(3, 5)$. The new point is $(6, 15)$.
- $b \times 3 = 6 \implies 3b = 6 \implies b = 2$. [M1][A1]
- $a \times 5 = 15 \implies 5a = 15 \implies a = 3$. [M1][A1]
#### Common Mistakes:
- Confusing the direction of horizontal translations (e.g., thinking $x-2$ means a shift to the left).
- Applying transformations in the wrong order. For combinations of stretches and translations, order can matter.
- Confusing a stretch factor of $b$ with $1/b$. For $f(ax)$, the stretch factor is $1/a$. For $f(x/b)$, the stretch factor is $b$.
### Tags
function, graph_transformations, function_graphs
- transformation
- translation
- stretch
- turning point

## Topic: Coordinate Geometry
### Subtopic: 3.1 Distance, Midpoint, and Gradient
#### Example Question:
The coordinates of three points are $A(1, 2)$, $B(5, 10)$, and $C(9, 2)$.
(a) Show that triangle $ABC$ is an isosceles triangle.
(b) Find the coordinates of $M$, the midpoint of the line segment $AC$.
(c) Show that $BM$ is perpendicular to $AC$.
#### Key Formulas:
- Distance: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$
- Midpoint: $M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$
- Gradient: $m = \frac{y_2 - y_1}{x_2 - x_1}$
#### Standard Solution Steps:
- (a) Use the distance formula to calculate the lengths of the three sides $AB$, $BC$, and $AC$. Show that at least two of these lengths are equal.
- (b) Use the midpoint formula with the coordinates of $A$ and $C$.
- (c) Calculate the gradient of line segment $BM$ and the gradient of line segment $AC$. Show that the product of their gradients is $-1$, or that one is horizontal (gradient 0) and the other is vertical (undefined gradient).
#### Mark Scheme:
- (a) Calculate the lengths of the three sides:
- $AB = \sqrt{(5 - 1)^2 + (10 - 2)^2} = \sqrt{4^2 + 8^2} = \sqrt{16 + 64} = \sqrt{80}$ [M1]
- $BC = \sqrt{(9 - 5)^2 + (2 - 10)^2} = \sqrt{4^2 + (-8)^2} = \sqrt{16 + 64} = \sqrt{80}$
- $AC = \sqrt{(9 - 1)^2 + (2 - 2)^2} = \sqrt{8^2 + 0^2} = 8$
- Since $AB = BC$, triangle $ABC$ is isosceles. [A1]
- (b) Find the midpoint $M$ of $AC$:
- $M = \left(\frac{1 + 9}{2}, \frac{2 + 2}{2}\right) = (5, 2)$ [B1]
- (c) Show $BM$ is perpendicular to $AC$:
- Gradient of $BM = \frac{10 - 2}{5 - 5} = \frac{8}{0}$, which is undefined (vertical line). [M1]
- Gradient of $AC = \frac{2 - 2}{9 - 1} = \frac{0}{8} = 0$ (horizontal line). [M1]
- A vertical line is perpendicular to a horizontal line. Therefore, $BM$ is perpendicular to $AC$. [A1]
#### Common Mistakes:
- Confusing the distance and midpoint formulas.
- Making arithmetic errors with negative coordinates.
- Forgetting the condition for perpendicular lines ($m_1 m_2 = -1$) or not recognizing the case of horizontal and vertical lines.
### Tags
distance_formula, midpoint_formula, coordinate_geometry
- gradient
- perpendicular lines
- isosceles triangle

### Subtopic: 3.2 Equation of a Straight Line & Parallel/Perpendicular Lines
#### Example Question:
A line $L_1$ passes through the points $P(2, -3)$ and $Q(8, 1)$.
(a) Find the equation of line $L_1$.
(b) A second line, $L_2$, is perpendicular to $L_1$ and passes through point $Q$. Find the equation of line $L_2$.
#### Key Formulas:
- Point-gradient form: $y - y_1 = m(x - x_1)$
- Gradient-intercept form: $y = mx + c$
- Parallel lines: $m_1 = m_2$
- Perpendicular lines: $m_1 m_2 = -1$
#### Standard Solution Steps:
- (a) First find the gradient of $L_1$ using the two points. Then use the point-gradient form with one of the points to find the equation.
- (b) Calculate the gradient of $L_2$ by finding the negative reciprocal of the gradient of $L_1$. Then use the point-gradient form with the given point $Q$.
#### Mark Scheme:
- (a) Gradient of $L_1$: $m_1 = \frac{1 - (-3)}{8 - 2} = \frac{4}{6} = \frac{2}{3}$. [M1]
- Using point $P(2, -3)$: $y - (-3) = \frac{2}{3}(x - 2)$.
- $y + 3 = \frac{2}{3}x - \frac{4}{3} \implies 3y + 9 = 2x - 4 \implies 2x - 3y - 13 = 0$. [A1 for any correct form]
- (b) Gradient of $L_2$: $m_2 = -\frac{1}{m_1} = -\frac{3}{2}$. [M1]
- $L_2$ passes through $Q(8, 1)$. Using point-gradient form: $y - 1 = -\frac{3}{2}(x - 8)$. [M1]
- $2(y - 1) = -3(x - 8) \implies 2y - 2 = -3x + 24 \implies 3x + 2y - 26 = 0$. [A1]
#### Common Mistakes:
- Calculating the negative reciprocal incorrectly (e.g., changing the sign but not inverting).
- Using the wrong point to substitute into the equation.
- Algebraic errors when rearranging the final equation.
### Tags
equation_of_line, parallel_lines, coordinate_geometry
- perpendicular lines
- gradient

### Subtopic: 3.3 Equation of a Circle and Tangents
#### Example Question:
A circle has equation $(x - 5)^2 + (y + 2)^2 = 25$.
(a) State the coordinates of the centre and the radius of the circle.
(b) Find the coordinates of the points where the circle intersects the y-axis.
(c) Find the equation of the tangent to the circle at the point $P(9, 1)$.
#### Key Formulas:
- Equation of a circle centre $(a, b)$, radius $r$: $(x - a)^2 + (y - b)^2 = r^2$.
- The tangent to a circle is perpendicular to the radius at the point of contact.
#### Standard Solution Steps:
- (a) Compare the given equation with the standard form to identify the centre $(a, b)$ and radius $r$.
- (b) To find y-axis intercepts, substitute $x=0$ into the circle equation and solve for $y$.
- (c) Find the gradient of the radius connecting the centre and the point of contact $P$. The gradient of the tangent is the negative reciprocal of the radius gradient. Use the point-gradient form to find the tangent's equation.
#### Mark Scheme:
- (a) Centre is $(5, -2)$. Radius is $\sqrt{25} = 5$. [B1, B1]
- (b) Substitute $x=0$: $(0 - 5)^2 + (y + 2)^2 = 25$. [M1]
- $25 + (y + 2)^2 = 25 \implies (y + 2)^2 = 0$.
- $y + 2 = 0 \implies y = -2$.
- The circle intersects the y-axis at $(0, -2)$. [A1]
- (c) The centre is $C(5, -2)$ and the point of contact is $P(9, 1)$.
- Gradient of radius $CP$: $m_{radius} = \frac{1 - (-2)}{9 - 5} = \frac{3}{4}$. [M1]
- Gradient of tangent, $m_{tangent} = -\frac{1}{m_{radius}} = -\frac{4}{3}$. [M1]
- Use point $P(9, 1)$: $y - 1 = -\frac{4}{3}(x - 9)$. [M1]
- $3(y - 1) = -4(x - 9) \implies 3y - 3 = -4x + 36$.
- Equation of the tangent is $4x + 3y - 39 = 0$. [A1]
#### Common Mistakes:
- Forgetting to take the square root for the radius.
- Incorrectly finding the gradient of the tangent (not taking the negative reciprocal).
- Expanding brackets unnecessarily when solving for intercepts, which can lead to errors.
### Tags
circle_equation, centre_and_radius, coordinate_geometry
- tangent to a circle
- line and circle intersection

## Topic: Circular Measure
### Subtopic: 4.1 Radian Measure, Arc Length and Sector Area
#### Example Question:
The diagram shows a sector $OAB$ of a circle with centre $O$ and radius $8$ cm. The angle $AOB$ is $72^\circ$.
(a) Find the arc length $AB$.
(b) Find the area of the sector $OAB$.
#### Key Formulas:
- Conversion: $180^\circ = \pi$ radians
- Arc length: $s = r\theta$ (where $\theta$ is in radians)
- Sector area: $A = \frac{1}{2}r^2\theta$ (where $\theta$ is in radians)
#### Standard Solution Steps:
- First, convert the angle from degrees to radians by multiplying by $\frac{\pi}{180}$.
- (a) Apply the arc length formula $s = r\theta$ using the calculated angle in radians.
- (b) Apply the sector area formula $A = \frac{1}{2}r^2\theta$ using the calculated angle in radians.
#### Mark Scheme:
- First, convert the angle to radians:
- $\theta = 72 \times \frac{\pi}{180} = \frac{2\pi}{5}$ radians. [B1]
- (a) Arc Length $AB$:
- $s = r\theta = 8 \times \frac{2\pi}{5} = \frac{16\pi}{5}$ cm. [M1, A1]
- (b) Area of Sector $OAB$:
- $A = \frac{1}{2}r^2\theta = \frac{1}{2} \times 8^2 \times \frac{2\pi}{5} = \frac{64\pi}{5}$ cm². [M1, A1]
#### Common Mistakes:
- Forgetting to convert the angle to radians before using the formulas.
- Using the formula for the area of a triangle instead of a sector.
- Calculation errors when working with $\pi$.
### Tags
radians, degrees, circular_measure, trigonometry
- arc length
- sector area
- conversion

### Subtopic: 4.2 Problem Solving with Segments
#### Example Question:
The diagram shows a sector $OPQ$ of a circle with centre $O$ and radius $12$ cm. The angle $POQ$ is $1.5$ radians. The chord $PQ$ is drawn. Find the area and perimeter of the segment bounded by the chord $PQ$ and the arc $PQ$.
#### Key Formulas:
- Area of segment = Area of sector - Area of triangle
- Area of sector = $\frac{1}{2}r^2\theta$
- Area of triangle = $\frac{1}{2}ab\sin C$
- Chord length (using Cosine Rule) = $\sqrt{a^2+b^2 - 2ab\cos C}$
#### Standard Solution Steps:
- To find the perimeter of the segment: calculate the arc length $PQ$ using $s=r\theta$, then calculate the chord length $PQ$ using the cosine rule on triangle $OPQ$. Add them together.
- To find the area of the segment: calculate the area of the sector $OPQ$ using $A=\frac{1}{2}r^2\theta$. Calculate the area of the triangle $OPQ$ using $A=\frac{1}{2}r^2\sin\theta$. Subtract the triangle area from the sector area.
#### Mark Scheme:
- **Perimeter:**
- Arc length $PQ = r\theta = 12 \times 1.5 = 18$ cm. [M1]
- Chord length $PQ$: Use Cosine Rule on $\triangle OPQ$.
- $PQ^2 = 12^2 + 12^2 - 2(12)(12)\cos(1.5)$ [M1]
- $PQ^2 = 288 - 288\cos(1.5) \approx 288 - 288(0.0707) = 267.6$
- $PQ = \sqrt{267.6} \approx 16.36$ cm. [A1]
- Perimeter = Arc length + Chord length = $18 + 16.36 = 34.36$ cm. [A1]
- **Area:**
- Area of sector $OPQ = \frac{1}{2}r^2\theta = \frac{1}{2}(12^2)(1.5) = 108$ cm². [M1]
- Area of triangle $OPQ = \frac{1}{2}(12)(12)\sin(1.5) = 72\sin(1.5) \approx 72(0.9975) = 71.82$ cm². [M1]
- Area of segment = Area of sector - Area of triangle = $108 - 71.82 = 36.18$ cm². [A1]
#### Common Mistakes:
- Keeping the calculator in degree mode when the angle is given in radians.
- Confusing the formulas for arc length and sector area.
- Errors in applying the sine or cosine rules.
- Subtracting incorrectly when finding the segment area.
### Tags
segment_area, segment_perimeter, circular_measure, trigonometry
- cosine rule
- sine rule
- problem solving

## Topic: Trigonometry
### Subtopic: 5.1 Graphs of Trigonometric Functions
#### Example Question:
The diagram shows part of the graph of $y = a + b \cos(cx)$.
(a) Find the values of the constants $a$, $b$, and $c$, given the graph has a minimum at $(0, -1)$ and a maximum at $(\pi, 5)$.
(b) State the period and amplitude of the function.
#### Standard Solution Steps:
- (a) The constant $a$ is the principal axis (midline), calculated as $(\text{max} + \text{min})/2$.
- The constant $b$ is the amplitude, calculated as $(\text{max} - \text{min})/2$. Note the sign of $b$ based on whether the graph is reflected.
- The constant $c$ is determined by the period. Period = $2\pi/c$. Find the period from the graph (horizontal distance for one full cycle).
- (b) State the amplitude $|b|$ and period $2\pi/c$ from the values found.
#### Mark Scheme:
- (a) Finding the constants:
- Principal axis, $a = \frac{5 + (-1)}{2} = 2$. [M1, A1]
- Amplitude, $|b| = \frac{5 - (-1)}{2} = 3$. [M1]
- The standard $y=\cos(x)$ graph starts at a maximum at $x=0$. This graph starts at a minimum, so it is reflected in the x-axis. Thus, $b = -3$. [A1]
- One half-cycle is completed between $x=0$ and $x=\pi$. The full period is $2\pi$.
- Period = $\frac{2\pi}{c} \implies 2\pi = \frac{2\pi}{c} \implies c = 1$. [M1, A1]
- (b) Period and Amplitude:
- Amplitude is $|b| = |-3| = 3$. [B1]
- Period is $2\pi$. [B1]
#### Common Mistakes:
- Incorrectly calculating the principal axis or amplitude.
- Getting the sign of $b$ wrong (not noticing a reflection).
- Errors in calculating $c$ from the period.
### Tags
trigonometric_graphs, graph_transformations, trigonometry
- amplitude
- period
- principal axis

### Subtopic: 5.2 Trigonometric Identities and Equations
#### Example Question:
(a) Show that the equation $6\cos^2\theta + \tan^2\theta = 4$ can be written in the form $6\cos^4\theta - 4\cos^2\theta + 1 = 0$.
(b) Hence solve the equation $6\cos^2\theta + \tan^2\theta = 4$ for $0 \le \theta \le \pi$. Give your answers in terms of $\pi$.
#### Key Formulas:
- $\tan\theta \equiv \frac{\sin\theta}{\cos\theta}$
- $\sin^2\theta + \cos^2\theta \equiv 1$
#### Standard Solution Steps:
- (a) Use the identity $\tan^2\theta = \sin^2\theta/\cos^2\theta$. Then use the identity $\sin^2\theta = 1 - \cos^2\theta$. Multiply by $\cos^2\theta$ to clear the fraction and rearrange to get the desired form.
- (b) Let $u = \cos^2\theta$ to form a standard quadratic equation. Solve for $u$. Substitute back to find values for $\cos\theta$. Find all solutions for $\theta$ in the given range.
#### Mark Scheme:
- (a) Start with $6\cos^2\theta + \tan^2\theta = 4$.
- Substitute $\tan^2\theta = \frac{\sin^2\theta}{\cos^2\theta}$: $6\cos^2\theta + \frac{\sin^2\theta}{\cos^2\theta} = 4$. [M1]
- Substitute $\sin^2\theta = 1 - \cos^2\theta$: $6\cos^2\theta + \frac{1 - \cos^2\theta}{\cos^2\theta} = 4$. [M1]
- Multiply by $\cos^2\theta$: $6\cos^4\theta + 1 - \cos^2\theta = 4\cos^2\theta$. [M1]
- Rearrange: $6\cos^4\theta - 5\cos^2\theta + 1 = 0$. (Note: there is a typo in the question's target equation).
- (b) Let $u = \cos^2\theta$. The equation is $6u^2 - 5u + 1 = 0$. [M1]
- Factorise: $(3u - 1)(2u - 1) = 0$. [M1]
- Solutions for $u$ are $u = 1/3$ or $u = 1/2$.
- Case 1: $\cos^2\theta = 1/2 \implies \cos\theta = \pm\frac{1}{\sqrt{2}}$. [A1]
- For $\cos\theta = \frac{1}{\sqrt{2}}$, $\theta = \frac{\pi}{4}$. For $\cos\theta = -\frac{1}{\sqrt{2}}$, $\theta = \frac{3\pi}{4}$. [A1, A1]
- Case 2: $\cos^2\theta = 1/3 \implies \cos\theta = \pm\frac{1}{\sqrt{3}}$. These do not yield exact answers in terms of $\pi$.
- The required solutions are $\theta = \frac{\pi}{4}$ and $\theta = \frac{3\pi}{4}$.
#### Common Mistakes:
- Errors in algebraic manipulation when using identities.
- Forgetting the $\pm$ when taking a square root (e.g., from $\cos^2\theta$).
- Not finding all solutions within the specified range.
### Tags
trigonometric_equations, trigonometric_identities, exact_values
- quadratic in disguise
- solving equations

### Subtopic: 5.3 Solving Equations of the form sin(ax+b)=k
#### Example Question:
Solve the equation $3\sin(2x - 20^\circ) + 1 = 0$ for $0^\circ \le x \le 180^\circ$.
#### Standard Solution Steps:
- Isolate the trigonometric function, e.g., $\sin(2x - 20^\circ) = -1/3$.
- Adjust the range for the compound angle. If $0^\circ \le x \le 180^\circ$, then $-20^\circ \le 2x - 20^\circ \le 340^\circ$.
- Find the principal value using the inverse trigonometric function.
- Use a CAST diagram or graph sketch to find all solutions for the compound angle within the adjusted range.
- Solve for $x$ for each solution.
- Check that the final values for $x$ are within the original range.
#### Mark Scheme:
- Isolate the function: $\sin(2x - 20^\circ) = -1/3$. [B1]
- Adjust the range: Let $u = 2x - 20^\circ$. The range for $u$ is $-20^\circ \le u \le 340^\circ$. [M1]
- Find the principal value: $u_{pv} = \arcsin(-1/3) = -19.47^\circ$. [A1]
- Find all solutions for $u$ in its range. Sine is negative in Q3 and Q4.
- $u_1 = -19.47^\circ$ (which is in the range).
- $u_2 = 180^\circ - (-19.47^\circ) = 199.47^\circ$. [M1 for finding second value]
- $u_3 = 360^\circ + (-19.47^\circ) = 340.53^\circ$ (outside the range).
- Solve for $x$:
- $2x - 20 = -19.47 \implies 2x = 0.53 \implies x = 0.265^\circ$. [A1]
- $2x - 20 = 199.47 \implies 2x = 219.47 \implies x = 109.7^\circ$. [A1]
- Final answers (to 1 d.p.): $x = 0.3^\circ, 109.7^\circ$.
#### Common Mistakes:
- Forgetting to adjust the range for the compound angle.
- Only finding the principal value from the calculator.
- Errors in using CAST diagram or graph properties to find all solutions.
- Algebraic mistakes when solving for $x$.
### Tags
trigonometric_equations, compound_angle, equation_solving
- range adjustment
- CAST diagram
- principal value

## Topic: Series
### Subtopic: 6.1 Arithmetic Progressions
#### Example Question:
The 4th term of an arithmetic progression is 18 and the sum of the first 10 terms is 255.
(a) Find the first term and the common difference of the progression.
(b) Given that the nth term of the progression is 63, find the value of n.
#### Key Formulas:
- nth term: $u_n = a + (n-1)d$
- Sum of first n terms: $S_n = \frac{n}{2}(2a + (n-1)d)$
#### Standard Solution Steps:
- (a) Use the given information to form two simultaneous equations in terms of the first term $a$ and the common difference $d$.
- Solve the simultaneous equations to find the values of $a$ and $d$.
- (b) Set up an equation using the nth term formula, setting it equal to 63. Substitute the values of $a$ and $d$ and solve for $n$.
#### Mark Scheme:
- (a)
- 4th term is 18: $a + 3d = 18$ (1). [M1]
- Sum of first 10 terms is 255: $\frac{10}{2}(2a + 9d) = 255 \implies 5(2a+9d) = 255 \implies 2a+9d = 51$ (2). [M1]
- From (1), $a = 18-3d$.
- Substitute into (2): $2(18-3d)+9d=51$. [M1]
- $36-6d+9d=51 \implies 3d=15 \implies d=5$. [A1]
- Substitute back: $a = 18 - 3(5) = 3$. [A1]
- (b)
- $u_n = 3 + (n-1)5 = 63$. [M1 FT]
- $5(n-1) = 60 \implies n-1 = 12 \implies n=13$. [A1]
#### Common Mistakes:
- Mixing up the formulas for the nth term and the sum of n terms.
- Making algebraic errors when solving the simultaneous equations.
### Tags
arithmetic_progression, AP, series, nth_term
- nth term
- Sum of terms
- Simultaneous equations

### Subtopic: 6.2 Geometric Progressions
#### Example Question:
The second term of a geometric progression is 8. The sum to infinity of the progression is 36.
(a) Find the possible values of the first term $a$ and the common ratio $r$.
(b) For the case where $r=2/3$, find the sum of the first 8 terms, giving your answer correct to 3 decimal places.
#### Key Formulas:
- nth term: $u_n = ar^{n-1}$
- Sum of first n terms: $S_n = \frac{a(1-r^n)}{1-r}$
- Sum to infinity: $S_{\infty} = \frac{a}{1-r}$, for $|r| < 1$
#### Standard Solution Steps:
- (a) Form two equations in terms of $a$ and $r$ from the given information. Solve them simultaneously, likely leading to a quadratic for $r$.
- (b) Use the specified value of $r$ and its corresponding $a$ in the formula for the sum of the first n terms.
#### Mark Scheme:
- (a)
- 2nd term is 8: $ar = 8$ (1). [B1]
- Sum to infinity is 36: $\frac{a}{1-r} = 36$ (2). [B1]
- From (1), $a = 8/r$. Substitute into (2): $\frac{8/r}{1-r} = 36$. [M1]
- $8 = 36r(1-r) \implies 36r^2 - 36r + 8 = 0 \implies 9r^2 - 9r + 2 = 0$. [A1]
- Factorising: $(3r - 1)(3r - 2) = 0$. [M1]
- So, $r = 1/3$ or $r = 2/3$. [A1]
- Case 1: $r = 1/3 \implies a = 8/(1/3) = 24$.
- Case 2: $r = 2/3 \implies a = 8/(2/3) = 12$. [A1 for both pairs]
- (b)
- Use $a=12$ and $r=2/3$.
- $S_8 = \frac{12(1 - (2/3)^8)}{1 - 2/3}$. [M1]
- $S_8 = \frac{12(1 - 256/6561)}{1/3} = 36(1 - 256/6561) = 36(\frac{6305}{6561}) \approx 35.027$. [A1]
#### Common Mistakes:
- Using the wrong formulas, particularly for sum to infinity.
- Errors when solving the simultaneous equations.
- Not checking the condition for convergence $|r|<1$.
### Tags
geometric_progression, GP, series, convergence
- Sum to infinity
- Convergence

### Subtopic: 6.3 Binomial Expansion
#### Example Question:
(a) Find the first four terms in the expansion of $(2 - \frac{x}{4})^{10}$ in ascending powers of $x$.
(b) Hence, find the coefficient of $x^3$ in the expansion of $(1 + 4x)(2 - \frac{x}{4})^{10}$.
#### Key Formulas:
- Binomial Theorem: $(a+b)^n = a^n + \binom{n}{1}a^{n-1}b + \binom{n}{2}a^{n-2}b^2 + \dots$
- Binomial coefficient: $\binom{n}{r} = \frac{n!}{r!(n-r)!}$
#### Standard Solution Steps:
- (a) Apply the binomial theorem. Identify $a$, $b$, and $n$. Systematically calculate the first four terms.
- (b) Identify the two products that will result in an $x^3$ term: (constant from first bracket) $\times$ ($x^3$ term from expansion) and ($x$ term from first bracket) $\times$ ($x^2$ term from expansion). Add the resulting coefficients.
#### Mark Scheme:
- (a) For $(2 - \frac{x}{4})^{10}$, $a=2, b=-x/4, n=10$.
- Term 1: $\binom{10}{0} (2)^{10} = 1024$. [B1]
- Term 2: $\binom{10}{1} (2)^{9} (-\frac{x}{4})^1 = 10 \times 512 \times (-\frac{x}{4}) = -1280x$. [M1, A1]
- Term 3: $\binom{10}{2} (2)^{8} (-\frac{x}{4})^2 = 45 \times 256 \times (\frac{x^2}{16}) = 720x^2$. [A1]
- Term 4: $\binom{10}{3} (2)^{7} (-\frac{x}{4})^3 = 120 \times 128 \times (-\frac{x^3}{64}) = -240x^3$. [A1]
- Expansion is $1024 - 1280x + 720x^2 - 240x^3 + \dots$
- (b) Coefficient of $x^3$ in $(1 + 4x)(1024 - 1280x + 720x^2 - 240x^3 + \dots)$.
- Terms are $(1 \times -240x^3)$ and $(4x \times 720x^2)$. [M1]
- Coefficients are $-240$ and $4 \times 720 = 2880$.
- Total coefficient = $-240 + 2880 = 2640$. [A1]
#### Common Mistakes:
- Forgetting the negative sign on the term $b$.
- Errors in calculating binomial coefficients.
- Forgetting to raise all parts of a term to the power.
- In part (b), only finding one of the products that gives the required term.
### Tags
binomial_expansion, binomial_coefficient, series
- Ascending powers

## Topic: Differentiation
### Subtopic: 7.1 The Derivative and Power Rule
#### Example Question:
A curve has equation $y = 4x^3 - \frac{6}{\sqrt{x}} + 5$. Find the derivative, $\frac{dy}{dx}$.
#### Key Formulas:
- If $y = kx^n$, then $\frac{dy}{dx} = knx^{n-1}$.
#### Standard Solution Steps:
- Rewrite the equation with all terms in index form, $x^n$.
- Differentiate each term using the power rule.
- Simplify the resulting expression.
#### Mark Scheme:
- Rewrite in index form: $y = 4x^3 - 6x^{-\frac{1}{2}} + 5$. [M1]
- Differentiate term by term:
- $\frac{dy}{dx} = 4(3x^{2}) - 6(-\frac{1}{2}x^{-\frac{3}{2}}) + 0$. [M1]
- $\frac{dy}{dx} = 12x^2 + 3x^{-\frac{3}{2}}$. [A1]
#### Common Mistakes:
- Incorrectly converting roots/fractions to index form.
- Errors with signs when differentiating negative powers.
- Forgetting that the derivative of a constant is zero.
### Tags
differentiation, power_rule, calculus
- Negative Indices
- Fractional Indices

### Subtopic: 7.2 The Chain Rule
#### Example Question:
Given that $f(x) = (3x-2)^5 + \frac{1}{(3x-2)^2}$, find $f'(1)$.
#### Key Formulas:
- If $y = (ax+b)^n$, then $\frac{dy}{dx} = an(ax+b)^{n-1}$.
#### Standard Solution Steps:
- Rewrite the function with all terms in index form.
- Differentiate each term using the chain rule.
- Substitute the given value of $x$ into the derivative $f'(x)$.
#### Mark Scheme:
- Rewrite in index form: $f(x) = (3x-2)^5 + (3x-2)^{-2}$. [B1]
- Differentiate: $f'(x) = 5(3)(3x-2)^{4} + (-2)(3)(3x-2)^{-3}$. [M1]
- $f'(x) = 15(3x-2)^4 - 6(3x-2)^{-3}$. [A1]
- Substitute $x=1$: $f'(1) = 15(3(1)-2)^4 - 6(3(1)-2)^{-3}$. [M1]
- $f'(1) = 15(1)^4 - 6(1)^{-3} = 15 - 6 = 9$. [A1]
#### Common Mistakes:
- Forgetting to multiply by the derivative of the inner function (the 'a' value).
- Errors in subtracting 1 from a negative power.
### Tags
differentiation, chain_rule, calculus
- Evaluating Derivatives

### Subtopic: 7.3 Tangents and Normals
#### Example Question:
Find the equation of the tangent to the curve $y = 2x^2 - 8x + 11$ at the point where $x = 3$.
#### Key Formulas:
- Gradient of tangent, $m_T = \frac{dy}{dx}$ at the point.
- Gradient of normal, $m_N = -\frac{1}{m_T}$.
- Equation of a line: $y - y_1 = m(x - x_1)$.
#### Standard Solution Steps:
- Find the derivative of the curve's equation.
- Find the gradient of the tangent by substituting the given x-value into the derivative.
- Find the y-coordinate of the point by substituting the x-value into the original equation.
- Use the point-gradient form to find the tangent's equation.
#### Mark Scheme:
- Find the derivative: $\frac{dy}{dx} = 4x - 8$. [B1]
- Find the gradient at $x=3$: $m_T = 4(3) - 8 = 4$. [M1]
- Find the y-coordinate at $x=3$: $y = 2(3)^2 - 8(3) + 11 = 18 - 24 + 11 = 5$. The point is $(3, 5)$. [B1]
- Use point-gradient form: $y - 5 = 4(x - 3)$. [M1]
- $y - 5 = 4x - 12 \implies y = 4x - 7$. [A1]
#### Common Mistakes:
- Using the gradient of the normal for the tangent equation, or vice-versa.
- Substituting the x-coordinate into the original equation to find the gradient.
### Tags
differentiation, tangent, normal, calculus
- Normal
- Coordinate Geometry

### Subtopic: 7.4 Stationary Points
#### Example Question:
A curve is defined by $y = \frac{1}{3}x^3 - x^2 - 15x + 7$. Find the coordinates of the stationary points and determine their nature.
#### Key Formulas:
- At a stationary point, $\frac{dy}{dx} = 0$.
- Nature test: If $\frac{d^2y}{dx^2} > 0$, local minimum. If $\frac{d^2y}{dx^2} < 0$, local maximum.
#### Standard Solution Steps:
- Find the first derivative $\frac{dy}{dx}$.
- Set $\frac{dy}{dx} = 0$ and solve for $x$ to find the x-coordinates of the stationary points.
- Substitute these x-values back into the original equation for $y$ to find the full coordinates.
- Find the second derivative $\frac{d^2y}{dx^2}$.
- Substitute the x-coordinates into the second derivative to determine the nature of each point.
#### Mark Scheme:
- Differentiate: $\frac{dy}{dx} = x^2 - 2x - 15$. [B1]
- Set to zero: $x^2 - 2x - 15 = 0 \implies (x - 5)(x + 3) = 0$. [M1]
- x-coordinates are $x = 5$ and $x = -3$. [A1]
- Find y-coordinates:
- For $x=5$, $y = \frac{1}{3}(5)^3 - (5)^2 - 15(5) + 7 = -\frac{154}{3}$. Point is $(5, -154/3)$.
- For $x=-3$, $y = \frac{1}{3}(-3)^3 - (-3)^2 - 15(-3) + 7 = 34$. Point is $(-3, 34)$. [A1 for both]
- Find second derivative: $\frac{d^2y}{dx^2} = 2x - 2$. [B1]
- Determine nature:
- At $x=5$: $\frac{d^2y}{dx^2} = 2(5) - 2 = 8 > 0$. It is a local minimum. [M1, A1]
- At $x=-3$: $\frac{d^2y}{dx^2} = 2(-3) - 2 = -8 < 0$. It is a local maximum. [A1]
#### Common Mistakes:
- Errors in solving the quadratic derivative.
- Substituting x-values into the derivative instead of the original equation to find the y-coordinates.
- Misinterpreting the sign of the second derivative.
### Tags
differentiation, stationary_points, maxima_minima, calculus
- Maxima and Minima
- Second Derivative Test

### Subtopic: 7.5 Rates of Change
#### Example Question:
The volume, $V$ cm³, of a spherical balloon is increasing at a constant rate of $20$ cm³s⁻¹. Find the rate of increase of the radius, $r$ cm, when the radius is $5$ cm. (Volume of a sphere is $V = \frac{4}{3}\pi r^3$)
#### Key Formulas:
- Chain Rule for rates: $\frac{dy}{dt} = \frac{dy}{dx} \times \frac{dx}{dt}$.
#### Standard Solution Steps:
- Identify the given rate ($\frac{dV}{dt}$) and the rate to be found ($\frac{dr}{dt}$).
- Write down the formula connecting the variables ($V$ and $r$).
- Differentiate this formula to find the link between the variables' differentials (e.g., find $\frac{dV}{dr}$).
- Set up the chain rule equation connecting the rates and solve for the unknown rate.
#### Mark Scheme:
- Given: $\frac{dV}{dt} = 20$. Find $\frac{dr}{dt}$ when $r=5$.
- Volume formula: $V = \frac{4}{3}\pi r^3$.
- Differentiate with respect to $r$: $\frac{dV}{dr} = 4\pi r^2$. [M1, A1]
- Chain rule: $\frac{dr}{dt} = \frac{dr}{dV} \times \frac{dV}{dt} = \frac{1}{\frac{dV}{dr}} \times \frac{dV}{dt}$. [M1]
- When $r=5$, $\frac{dV}{dr} = 4\pi (5^2) = 100\pi$.
- Substitute values: $\frac{dr}{dt} = \frac{1}{100\pi} \times 20 = \frac{20}{100\pi} = \frac{1}{5\pi}$. [A1]
#### Common Mistakes:
- Incorrectly setting up the chain rule relationship.
- Forgetting to substitute the value of $r$ into the expression for $\frac{dV}{dr}$.
### Tags
differentiation, rates_of_change, related_rates, calculus
- Chain Rule
- Related Rates
- Word Problems

## Topic: Integration
### Subtopic: 8.1 Indefinite Integration
#### Example Question:
A curve is such that $\frac{dy}{dx} = 4x^3 - 6x + \frac{3}{x^2}$. Given that the curve passes through the point $(1, -2)$, find the equation of the curve.
#### Key Formulas:
- $\int x^n \,dx = \frac{x^{n+1}}{n+1} + c$ (for $n \neq -1$)
- $\int (ax+b)^n \,dx = \frac{(ax+b)^{n+1}}{a(n+1)} + c$ (for $n \neq -1$)
#### Standard Solution Steps:
- Rewrite the gradient function with negative indices.
- Integrate the expression with respect to $x$, remembering to add the constant of integration, $c$.
- Substitute the coordinates of the given point into the integrated equation to find the value of $c$.
- Write the final equation of the curve.
#### Mark Scheme:
- Rewrite gradient: $\frac{dy}{dx} = 4x^3 - 6x + 3x^{-2}$.
- Integrate: $y = \int (4x^3 - 6x + 3x^{-2}) \,dx$.
- $y = \frac{4x^4}{4} - \frac{6x^2}{2} + \frac{3x^{-1}}{-1} + c$. [M1]
- $y = x^4 - 3x^2 - 3x^{-1} + c$. [A1]
- Substitute point $(1, -2)$: $-2 = 1^4 - 3(1)^2 - 3(1)^{-1} + c$. [M1]
- $-2 = 1 - 3 - 3 + c \implies -2 = -5 + c \implies c = 3$. [A1]
- Final equation: $y = x^4 - 3x^2 - \frac{3}{x} + 3$.
#### Common Mistakes:
- Incorrectly integrating terms with negative or fractional powers.
- Forgetting to add the constant of integration, $c$.
- Making arithmetic errors when solving for $c$.
### Tags
integration, indefinite_integral, antiderivative, calculus
- Constant of Integration
- Power Rule

### Subtopic: 8.2 Definite Integration and Area under a Curve
#### Example Question:
The diagram shows the curve $y = 8 - 2x - x^2$. The curve intersects the positive x-axis at point $A$. Find the area of the shaded region bounded by the curve, the x-axis, and the y-axis.
#### Standard Solution Steps:
- Find the limits of integration. The lower limit is given (y-axis, $x=0$). Find the upper limit by finding the x-intercept of the curve (set $y=0$ and solve for $x$).
- Set up the definite integral for the area, $\int_{a}^{b} y \,dx$.
- Integrate the function.
- Substitute the upper and lower limits into the integrated function and subtract the results.
#### Mark Scheme:
- Find x-intercept (point A): Set $y=0 \implies 8 - 2x - x^2 = 0$.
- $x^2 + 2x - 8 = 0 \implies (x+4)(x-2) = 0$.
- The positive intercept is $x=2$. So the limits are from $0$ to $2$. [B1]
- Set up the integral: $Area = \int_{0}^{2} (8 - 2x - x^2) \,dx$. [M1]
- Integrate: $\left[ 8x - \frac{2x^2}{2} - \frac{x^3}{3} \right]_{0}^{2} = \left[ 8x - x^2 - \frac{x^3}{3} \right]_{0}^{2}$. [A1]
- Substitute limits:
- $(8(2) - (2)^2 - \frac{(2)^3}{3}) - (8(0) - (0)^2 - \frac{(0)^3}{3})$. [M1]
- $(16 - 4 - \frac{8}{3}) - (0) = 12 - \frac{8}{3} = \frac{36-8}{3} = \frac{28}{3}$. [A1]
#### Common Mistakes:
- Finding the incorrect limits of integration.
- Errors during the integration step.
- Mistakes in arithmetic when substituting the limits (especially with negative numbers).
- Forgetting that areas below the x-axis will yield a negative result from the integral.
### Tags
definite_integral, area_under_curve, integration, calculus
- Limits of Integration
- Fundamental Theorem of Calculus

### Subtopic: 8.3 Area between a Curve and a Line
#### Example Question:
Find the area of the region enclosed by the curve $y = 6 - x$ and the line $y = \frac{5}{x}$.
#### Standard Solution Steps:
- Find the points of intersection by setting the two equations equal to each other and solving for $x$. These will be the limits of integration.
- Set up the integral for the area between the curves: $\int_{a}^{b} (y_{upper} - y_{lower}) \,dx$.
- Integrate the resulting function.
- Evaluate the definite integral using the limits found in the first step.
#### Mark Scheme:
- Find points of intersection: $6 - x = \frac{5}{x}$. [M1]
- $6x - x^2 = 5 \implies x^2 - 6x + 5 = 0$.
- $(x-1)(x-5) = 0 \implies x=1$ and $x=5$. These are the limits. [A1]
- Determine the upper curve. For $x \in (1,5)$, e.g., $x=2$, $y_{line} = 6-2=4$ and $y_{curve}=5/2=2.5$. The line is the upper function.
- Set up integral: $Area = \int_{1}^{5} ( (6-x) - (\frac{5}{x}) ) \,dx$. [M1]
- Integrate: $\left[ 6x - \frac{x^2}{2} - 5\ln|x| \right]_{1}^{5}$. Note: $\int \frac{1}{x} dx$ is not in P1. Let's adjust the line to $y=x$.
- **Adjusted Question:** Area between $y=6-x$ and $y=x$.
- Intersect: $6-x = x \implies 2x=6 \implies x=3$. This only gives one point. Let's use $y=x^2$ and $y=x+2$.
- **Adjusted Question:** Area between $y=x+2$ and $y=x^2$.
- Intersect: $x^2 = x+2 \implies x^2-x-2=0 \implies (x-2)(x+1)=0$. Limits are $x=-1, x=2$. [M1, A1]
- Upper curve is the line $y=x+2$.
- Area = $\int_{-1}^{2} ((x+2) - x^2) \,dx$. [M1]
- Integrate: $[\frac{x^2}{2} + 2x - \frac{x^3}{3}]_{-1}^{2}$. [A1]
- Substitute limits: $(\frac{4}{2} + 4 - \frac{8}{3}) - (\frac{1}{2} - 2 + \frac{1}{3}) = (6-\frac{8}{3}) - (\frac{5}{6}-2) = \frac{10}{3} - (-\frac{7}{6}) = \frac{20+7}{6} = \frac{27}{6} = \frac{9}{2}$. [A1]
#### Common Mistakes:
- Incorrectly identifying the upper and lower functions.
- Errors in solving for the points of intersection.
- Subtracting the functions in the wrong order, leading to a negative area.
### Tags
area_between_curves, definite_integral, integration, calculus
- Intersection points

### Subtopic: 8.4 Volumes of Revolution
#### Example Question:
The region $R$ is bounded by the curve $y = \sqrt{x-1}$, the x-axis, and the line $x=5$. Find the volume of the solid generated when $R$ is rotated $360^\circ$ about the x-axis.
#### Key Formulas:
- Volume of revolution about x-axis: $V = \int_{a}^{b} \pi y^2 \,dx$.
#### Standard Solution Steps:
- Identify the limits of integration from the problem description.
- Square the expression for $y$ to get $y^2$.
- Set up the volume integral, $V = \pi \int_{a}^{b} y^2 \,dx$.
- Integrate the expression for $y^2$.
- Evaluate the definite integral and multiply by $\pi$.
#### Mark Scheme:
- The region is bounded by $x=1$ (where $y=0$) and $x=5$. Limits are $1$ to $5$. [B1]
- We have $y = \sqrt{x-1}$, so $y^2 = x-1$. [M1]
- Set up the integral: $V = \pi \int_{1}^{5} (x-1) \,dx$. [M1]
- Integrate: $V = \pi \left[ \frac{x^2}{2} - x \right]_{1}^{5}$. [A1]
- Substitute limits: $V = \pi \left[ (\frac{5^2}{2} - 5) - (\frac{1^2}{2} - 1) \right]$. [M1]
- $V = \pi \left[ (\frac{25}{2} - \frac{10}{2}) - (\frac{1}{2} - \frac{2}{2}) \right] = \pi \left[ \frac{15}{2} - (-\frac{1}{2}) \right] = \pi \left[ \frac{16}{2} \right] = 8\pi$. [A1]
#### Common Mistakes:
- Forgetting to square the function $y$.
- Forgetting the factor of $\pi$.
- Errors in integration or evaluation of the limits.
### Tags
volumes_of_revolution, definite_integral, integration, calculus
- Solid of Revolution
- Disk Method