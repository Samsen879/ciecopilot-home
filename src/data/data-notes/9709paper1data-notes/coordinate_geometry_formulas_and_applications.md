## Coordinate Geometry: Distance, Midpoint and Gradient

**Syllabus Reference**: 3.1 Distance, midpoint and gradient

**Learning Objective**: Calculate distance between two points, find midpoint of a line segment, and calculate gradient of a line.

### Example Question
The coordinates of three points are $A(1, 2)$, $B(5, 10)$, and $C(9, 2)$.
(a) Show that triangle $ABC$ is an isosceles triangle.
(b) Find the coordinates of $M$, the midpoint of the line segment $AC$.
(c) Show that $BM$ is perpendicular to $AC$.

### Mark Scheme / Solution
(a) Calculate the lengths of the three sides:
$AB = \sqrt{(5 - 1)^2 + (10 - 2)^2} = \sqrt{4^2 + 8^2} = \sqrt{16 + 64} = \sqrt{80}$ (M1 for correct distance formula)
$BC = \sqrt{(9 - 5)^2 + (2 - 10)^2} = \sqrt{4^2 + (-8)^2} = \sqrt{16 + 64} = \sqrt{80}$ (M1 for correct distance formula)
$AC = \sqrt{(9 - 1)^2 + (2 - 2)^2} = \sqrt{8^2 + 0^2} = 8$
Since $AB = BC$, triangle $ABC$ is isosceles (A1 for correct conclusion)

(b) Find the midpoint $M$ of $AC$:
$M = \left(\frac{1 + 9}{2}, \frac{2 + 2}{2}\right) = (5, 2)$ (B1 for correct midpoint)

(c) Show $BM$ is perpendicular to $AC$:
Gradient of $BM = \frac{10 - 2}{5 - 5}$, which is undefined. This means $BM$ is a vertical line (M1 for recognizing vertical line)
Gradient of $AC = \frac{2 - 2}{9 - 1} = \frac{0}{8} = 0$. This means $AC$ is a horizontal line (M1 for recognizing horizontal line)
A vertical line is perpendicular to a horizontal line. Therefore, $BM$ is perpendicular to $AC$ (A1 for correct conclusion)

### Standard Solution Steps
- Use the distance formula $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$ to find side lengths
- Use the midpoint formula $M = \left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$
- Calculate gradients using $m = \frac{y_2 - y_1}{x_2 - x_1}$
- For perpendicular lines, check if $m_1 m_2 = -1$ or if one is horizontal and the other vertical

### Common Mistakes
- Confusing the distance and midpoint formulas
- Making arithmetic errors with negative coordinates
- Forgetting the condition for perpendicular lines or not recognizing special cases

### Tags
distance formula, midpoint formula, gradient, perpendicular lines, isosceles triangle

---

## Coordinate Geometry: Equation of a Straight Line

**Syllabus Reference**: 3.2 Equation of a straight line

**Learning Objective**: Find the equation of a straight line given sufficient information, and understand parallel and perpendicular lines.

### Example Question
A line $L_1$ passes through the points $P(2, -3)$ and $Q(8, 1)$.
(a) Find the equation of line $L_1$.
(b) A second line, $L_2$, is perpendicular to $L_1$ and passes through point $Q$. Find the equation of line $L_2$.
(c) A third line, $L_3$, is parallel to $L_1$ and passes through the origin $(0, 0)$. Find the equation of line $L_3$.

### Mark Scheme / Solution
(a) Equation of $L_1$:
First, find the gradient of $L_1$: $m_1 = \frac{1 - (-3)}{8 - 2} = \frac{4}{6} = \frac{2}{3}$ (M1 for correct gradient calculation)
Using point-gradient form with point $P(2, -3)$: $y - (-3) = \frac{2}{3}(x - 2)$
$y + 3 = \frac{2}{3}x - \frac{4}{3}$
$3y + 9 = 2x - 4$
$2x - 3y - 13 = 0$ (A1 for correct equation)

(b) Equation of $L_2$:
Line $L_2$ is perpendicular to $L_1$, so its gradient $m_2$ is the negative reciprocal of $m_1$
$m_2 = -\frac{1}{m_1} = -\frac{3}{2}$ (M1 for correct perpendicular gradient)
$L_2$ passes through $Q(8, 1)$. Using the point-gradient form: $y - 1 = -\frac{3}{2}(x - 8)$ (M1 for correct application)
$2(y - 1) = -3(x - 8)$
$2y - 2 = -3x + 24$
$3x + 2y - 26 = 0$ (A1 for correct equation)

(c) Equation of $L_3$:
Line $L_3$ is parallel to $L_1$, so its gradient $m_3 = m_1 = \frac{2}{3}$ (B1 for correct parallel gradient)
It passes through the origin $(0, 0)$. Using $y = mx + c$, we have $c = 0$
The equation is $y = \frac{2}{3}x$, or $2x - 3y = 0$ (B1 for correct equation)

### Standard Solution Steps
- Find the gradient using two points on the line
- Use point-gradient form $y - y_1 = m(x - x_1)$ to find the equation
- For parallel lines, gradients are equal
- For perpendicular lines, product of gradients is $-1$

### Common Mistakes
- Calculating the negative reciprocal incorrectly
- Using the wrong point to substitute into the equation
- Algebraic errors when rearranging the final equation

### Tags
equation of a line, parallel lines, perpendicular lines, gradient

---

## Coordinate Geometry: Intersection of Lines

**Syllabus Reference**: 3.3 Intersection of lines

**Learning Objective**: Find the point of intersection of two lines by solving simultaneous equations.

### Example Question
The line $l_1$ has equation $3x + y = 9$. The line $l_2$ passes through the point $(4, 1)$ and is perpendicular to $l_1$.
(a) Find the equation of line $l_2$.
(b) Find the coordinates of the point of intersection of $l_1$ and $l_2$.

### Mark Scheme / Solution
(a) Equation of $l_2$:
Rearrange $l_1$ to find its gradient: $y = -3x + 9$. The gradient of $l_1$ is $m_1 = -3$ (B1)
The gradient of $l_2$, $m_2$, is the negative reciprocal of $m_1$: $m_2 = -\frac{1}{-3} = \frac{1}{3}$ (M1)
Using the point-gradient form with point $(4, 1)$: $y - 1 = \frac{1}{3}(x - 4)$
$3(y - 1) = x - 4$
$3y - 3 = x - 4$
$x - 3y - 1 = 0$ (A1)

(b) Point of intersection:
Solve the simultaneous equations:
$3x + y = 9$ ... (1)
$x - 3y = 1$ ... (2)
From (1), $y = 9 - 3x$ (M1)
Substitute this into (2): $x - 3(9 - 3x) = 1$
$x - 27 + 9x = 1$
$10x = 28$
$x = 2.8$ (A1)
Substitute $x = 2.8$ back into $y = 9 - 3x$:
$y = 9 - 3(2.8) = 9 - 8.4 = 0.6$ (A1)
The point of intersection is $(2.8, 0.6)$

### Standard Solution Steps
- Find the equation of the second line using the given information
- Set up simultaneous equations from both line equations
- Solve by substitution or elimination
- Check the answer by substituting back into both original equations

### Common Mistakes
- Errors in solving the simultaneous equations
- Substituting the expression back into the same equation it was derived from

### Tags
simultaneous equations, intersection of lines, perpendicular lines

---

## Coordinate Geometry: Equation of a Circle

**Syllabus Reference**: 3.4 Equation of a circle

**Learning Objective**: Understand and use the equation of a circle and find tangents to circles.

### Example Question
A circle has equation $(x - 5)^2 + (y + 2)^2 = 25$.
(a) State the coordinates of the centre and the radius of the circle.
(b) Find the coordinates of the points where the circle intersects the y-axis.
(c) Find the equation of the tangent to the circle at the point $P(9, 1)$.

### Mark Scheme / Solution
(a) Centre and Radius:
Comparing with $(x - a)^2 + (y - b)^2 = r^2$:
The centre is $(5, -2)$ (B1)
The radius is $\sqrt{25} = 5$ (B1)

(b) Intersection with y-axis:
Intersection with the y-axis occurs when $x = 0$
Substitute $x = 0$ into the circle's equation: $(0 - 5)^2 + (y + 2)^2 = 25$ (M1)
$25 + (y + 2)^2 = 25$
$(y + 2)^2 = 0$
$y + 2 = 0$
$y = -2$ (A1)
The circle touches the y-axis at the single point $(0, -2)$ (A1)

(c) Equation of the tangent at $P(9, 1)$:
The centre of the circle is $C(5, -2)$
Find the gradient of the radius $CP$: $m_{radius} = \frac{1 - (-2)}{9 - 5} = \frac{3}{4}$ (M1)
The tangent at $P$ is perpendicular to the radius $CP$
Gradient of tangent, $m_{tangent} = -\frac{1}{m_{radius}} = -\frac{4}{3}$ (M1)
Use point-gradient form with point $P(9, 1)$: $y - 1 = -\frac{4}{3}(x - 9)$ (M1)
$3(y - 1) = -4(x - 9)$
$3y - 3 = -4x + 36$
$4x + 3y - 39 = 0$ (A1)

### Standard Solution Steps
- Identify centre and radius from the standard form of circle equation
- For intersection with axes, substitute the appropriate coordinate as zero
- For tangents, find the gradient of the radius and use the perpendicular gradient
- Use point-gradient form to find the tangent equation

### Common Mistakes
- Forgetting to take the square root for the radius
- Incorrectly finding the gradient of the tangent
- Not recognizing when a line is tangent to a circle rather than intersecting at two points

### Tags
circle equation, centre and radius, tangent to a circle, line and circle intersection