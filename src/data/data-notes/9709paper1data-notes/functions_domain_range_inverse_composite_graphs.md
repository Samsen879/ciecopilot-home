## Functions: Domain and Range

**Syllabus Reference**: 2.1 Domain and Range of functions

**Learning Objective**: Understand and use the terms domain and range, and find the range of a function with restricted domain.

### Example Question
The function $f$ is defined by $f(x) = x^2 - 6x + 2$ for the domain $x \le 2$. Find the range of $f$.

### Mark Scheme / Solution
To find the range, complete the square:
$f(x) = (x^2 - 6x + 9) - 9 + 2$ (M1 for attempting to complete the square)
$f(x) = (x - 3)^2 - 7$
The vertex of the parabola is at $(3, -7)$
Since the domain is restricted to $x \le 2$ and the vertex is at $x = 3$, the function is strictly decreasing over its entire domain
Evaluate the function at the boundary of the domain, $x = 2$:
$f(2) = (2)^2 - 6(2) + 2 = 4 - 12 + 2 = -6$ (M1 for evaluating at the boundary)
Since the function is decreasing for $x \le 2$, the value of $f(x)$ increases as $x$ becomes more negative
Therefore, the range of $f$ is $f(x) \ge -6$ (A1 for correct range)

### Standard Solution Steps
- Complete the square to find the coordinates of the vertex of the quadratic function
- Sketch the graph of the parabola, paying attention to its orientation
- Identify the given domain and mark it on the x-axis
- Determine if the vertex lies inside or outside the given domain
- Evaluate the function at the boundary of the domain
- Based on the sketch, determine the set of all possible y-values for the given domain

### Common Mistakes
- Incorrectly finding the vertex after completing the square
- Forgetting to consider the restricted domain when stating the range
- Assuming the vertex's y-coordinate is the minimum or maximum of the range without checking if the vertex is within the domain
- Confusing domain and range

### Tags
function, domain, range, quadratic, completing the square

---

## Functions: One-one and Inverse Functions

**Syllabus Reference**: 2.2 One-one functions and inverse functions

**Learning Objective**: Determine if a function is one-one and find the inverse of a one-one function.

### Example Question
The function $f$ is defined by $f(x) = (x+2)^2 + 5$ for $x \ge -2$.
(a) State the range of $f$.
(b) Explain why $f$ has an inverse.
(c) Find an expression for $f^{-1}(x)$.
(d) State the domain of $f^{-1}$.

### Mark Scheme / Solution
(a) The vertex of the parabola $y = (x+2)^2 + 5$ is at $(-2, 5)$. Since the domain is $x \ge -2$, the function starts at its minimum point.
The range of $f$ is $f(x) \ge 5$ (B1 for correct range)

(b) For the domain $x \ge -2$, the graph of $f(x)$ is always increasing. This means that for any y-value in the range, there is only one corresponding x-value. Therefore, the function is one-one and has an inverse (B1 for correct explanation)

(c) To find the inverse, let $y = f(x)$:
$y = (x+2)^2 + 5$
$y - 5 = (x+2)^2$ (M1 for rearranging)
$\sqrt{y - 5} = x + 2$ (M1 for taking square root)
We take the positive square root because the domain of $f$ is $x \ge -2$, which means $x+2 \ge 0$
$x = \sqrt{y - 5} - 2$
Swap $x$ and $y$:
$f^{-1}(x) = \sqrt{x - 5} - 2$ (A1 for correct inverse expression)

(d) The domain of $f^{-1}$ is equal to the range of $f$
From part (a), the range of $f$ is $f(x) \ge 5$
Therefore, the domain of $f^{-1}$ is $x \ge 5$ (B1 for correct domain)

### Standard Solution Steps
- To find the inverse, set $y = f(x)$
- Rearrange the equation to make $x$ the subject
- Be careful when taking square roots to select the correct sign based on the original function's domain
- Swap the variables $x$ and $y$ to get the expression for $f^{-1}(x)$
- The domain of the inverse function is the range of the original function
- The range of the inverse function is the domain of the original function

### Common Mistakes
- Forgetting to select the correct sign when taking a square root during the rearrangement
- Incorrectly stating the domain and range of the inverse function
- Trying to find an inverse for a function that is not one-one without a restricted domain

### Tags
function, inverse function, one-one, domain, range

---

## Functions: Composite Functions

**Syllabus Reference**: 2.3 Composition of functions

**Learning Objective**: Form and find the domain and range of composite functions, and solve equations involving composite functions.

### Example Question
Functions $f$ and $g$ are defined by:
$f(x) = \frac{1}{2x-3}$ for $x > 2$
$g(x) = 4x + k$ for $x \in \mathbb{R}$, where $k$ is a constant.

(a) Find an expression for the composite function $fg(x)$.
(b) Given that $fg(3) = \frac{1}{5}$, find the value of $k$.
(c) Using the value of $k$ found in part (b), solve the equation $gf(x) = 7$.

### Mark Scheme / Solution
(a) To find $fg(x)$, substitute $g(x)$ into $f(x)$:
$fg(x) = f(g(x)) = f(4x+k)$ (M1 for correct substitution)
$fg(x) = \frac{1}{2(4x+k)-3} = \frac{1}{8x+2k-3}$ (A1 for correct composite function)

(b) Given $fg(3) = \frac{1}{5}$:
Substitute $x=3$ into the expression for $fg(x)$:
$fg(3) = \frac{1}{8(3)+2k-3} = \frac{1}{24+2k-3} = \frac{1}{21+2k}$ (M1 for correct substitution)
Set this equal to the given value:
$\frac{1}{21+2k} = \frac{1}{5}$
$21+2k = 5$
$2k = -16$
$k = -8$ (A1 for correct value of k)

(c) With $k=-8$, we have $g(x) = 4x - 8$. Find the expression for $gf(x)$:
$gf(x) = g(f(x)) = g\left(\frac{1}{2x-3}\right)$ (M1 for correct composite function)
$gf(x) = 4\left(\frac{1}{2x-3}\right) - 8 = \frac{4}{2x-3} - 8$
Solve the equation:
$\frac{4}{2x-3} - 8 = 7$
$\frac{4}{2x-3} = 15$ (M1 for correct rearrangement)
$4 = 15(2x-3)$
$4 = 30x - 45$
$49 = 30x$
$x = \frac{49}{30}$ (A1 for correct algebraic solution)
We must check if this solution is valid for the domain of $f(x)$, which is $x > 2$. Since $\frac{49}{30} \approx 1.63 < 2$, there is no solution (A1 for domain check)

### Standard Solution Steps
- To find $fg(x)$, substitute the entire expression for $g(x)$ into every instance of $x$ in the function $f(x)$
- To solve an equation like $fg(x) = c$, first find the expression for $fg(x)$ and then set it equal to $c$ and solve for $x$
- Always check if the final solution for $x$ lies within the domain of the innermost function

### Common Mistakes
- Confusing $fg(x)$ with $gf(x)$
- Incorrectly substituting during the composition
- Forgetting to check if the final answer is valid within the specified domain of the original functions

### Tags
function, composite function, domain, substitution

---

## Functions: Graph of a Function and its Inverse

**Syllabus Reference**: 2.4 Relationship between the graph of a function and its inverse

**Learning Objective**: Understand the relationship between the graphs of a function and its inverse.

### Example Question
The function $f$ is defined by $f(x) = (x-3)^2$ for the domain $x \ge 3$.
(a) Find an expression for $f^{-1}(x)$.
(b) Find the coordinates of the point of intersection of the graphs of $y=f(x)$ and $y=f^{-1}(x)$.

### Mark Scheme / Solution
(a) Let $y = (x-3)^2$. To find the inverse, make $x$ the subject:
$\sqrt{y} = x-3$. We take the positive root since $x \ge 3 \implies x-3 \ge 0$ (M1 for correct square root)
$x = \sqrt{y} + 3$
Swap $x$ and $y$: $y = \sqrt{x} + 3$
$f^{-1}(x) = 3 + \sqrt{x}$ (A1 for correct inverse)

(b) The graphs intersect on the line $y=x$. Solve $f(x) = x$:
$(x-3)^2 = x$ (M1 for setting up equation)
$x^2 - 6x + 9 = x$
$x^2 - 7x + 9 = 0$
Using the quadratic formula:
$x = \frac{7 \pm \sqrt{(-7)^2 - 4(1)(9)}}{2(1)} = \frac{7 \pm \sqrt{49 - 36}}{2} = \frac{7 \pm \sqrt{13}}{2}$ (A1 for correct use of quadratic formula)
The domain of $f(x)$ is $x \ge 3$
$x_1 = \frac{7 - \sqrt{13}}{2} \approx 1.7$ is not in the domain
$x_2 = \frac{7 + \sqrt{13}}{2} \approx 5.3$ is in the domain
The coordinates are $\left(\frac{7 + \sqrt{13}}{2}, \frac{7 + \sqrt{13}}{2}\right)$ (A1 for correct coordinates)

### Standard Solution Steps
- To sketch $f$ and $f^{-1}$, first sketch $f(x)$ and the line $y=x$
- Reflect the graph of $f(x)$ in the line $y=x$ to get the graph of $f^{-1}(x)$
- To find intersection points, solve the equation $f(x) = x$
- Check that solutions are valid in the domain of $f$

### Common Mistakes
- Incorrectly reflecting the graph
- Trying to solve $f(x) = f^{-1}(x)$ instead of $f(x) = x$
- Forgetting to check if the solutions are valid for the given domain

### Tags
function, inverse function, graph, reflection, intersection

---

## Functions: Graph Transformations

**Syllabus Reference**: 2.5 Graph transformations

**Learning Objective**: Understand and illustrate transformations of graphs including translations and stretches.

### Example Question
The graph of $y = f(x)$ has a turning point at $(3, 5)$.
(a) State the coordinates of the turning point on the graph of $y = f(x-2) + 4$.
(b) The graph of $y=g(x)$ is a transformation of the graph of $y=f(x)$. The turning point on the graph of $y=g(x)$ is $(6, 15)$. Given that $g(x) = af(x/b)$, find the values of the constants $a$ and $b$.

### Mark Scheme / Solution
(a) The transformation $y = f(x-2) + 4$ consists of:
$f(x-2)$: A translation of 2 units to the right
$+4$: A translation of 4 units up
Applying this to the point $(3, 5)$:
Translation right by 2: $(3+2, 5) = (5, 5)$ (M1 for correct horizontal translation)
Translation up by 4: $(5, 5+4) = (5, 9)$ (A1 for correct final coordinates)
The new turning point is at $(5, 9)$

(b) The transformation is $y = af(x/b)$:
$f(x/b)$: A stretch parallel to the x-axis with scale factor $b$
$af(...)$: A stretch parallel to the y-axis with scale factor $a$
The original point is $(x, y) = (3, 5)$. The new point is $(bx, ay) = (6, 15)$
$b \times 3 = 6 \implies b = 2$ (M1 for setting up equation, A1 for correct value of b)
$a \times 5 = 15 \implies a = 3$ (M1 for setting up equation, A1 for correct value of a)
So $a = 3$ and $b = 2$

### Standard Solution Steps
- Identify the transformations and their order
- Remember that transformations inside the bracket affect the x-coordinate, and those outside affect the y-coordinate
- Apply each transformation step-by-step to the coordinates of the given point
- For finding unknown constants, map the effect of the transformations on a general point and equate to the new coordinates

### Common Mistakes
- Confusing the direction of horizontal translations
- Applying transformations in the wrong order
- Confusing stretch factors with their reciprocals

### Tags
function, graph, transformation, translation, stretch, turning point