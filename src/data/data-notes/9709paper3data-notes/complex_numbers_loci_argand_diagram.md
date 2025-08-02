## Complex Numbers: Loci in the Argand Diagram

**Syllabus Reference**: 9709.P3.3.9
**Learning Objective**: Find and sketch loci in the Argand diagram, including circles $|z-a|=k$, perpendicular bisectors $|z-a|=|z-b|$, and half-lines $\arg(z-a)=\alpha$.

### Example Question 1
A complex number $z$ is represented by the point $P$ in an Argand diagram.

(i) Sketch the locus of points representing $z$ such that $|z - 4 - 3i| = 5$. [3]
(ii) On the same diagram, sketch the locus of points representing $z$ such that $\arg(z - 4) = \frac{\pi}{4}$. [2]
(iii) Find the complex number represented by the point of intersection of the two loci, giving your answer in the form $x+iy$. [4]

### Mark Scheme / Solution
(i) The locus is given by $|z - (4 + 3i)| = 5$.
This represents a circle with centre at the point corresponding to $4+3i$ and with radius 5. M1
Centre: $(4, 3)$ and radius: $5$. A1
A correct sketch showing a circle with centre at $(4,3)$ and radius 5. A1

(ii) The locus is given by $\arg(z - 4) = \frac{\pi}{4}$.
This represents a half-line starting from the point $(4,0)$ and making an angle of $\frac{\pi}{4}$ with the positive real axis. M1
A correct sketch of the half-line with an open circle at $(4,0)$. A1

(iii) To find the intersection, we solve the Cartesian equations of the loci simultaneously.
The circle has equation $(x-4)^2 + (y-3)^2 = 25$. M1
The half-line starts at $(4,0)$ with gradient $\tan(\frac{\pi}{4}) = 1$. Its equation is $y = x-4$, for $x>4$. M1
Substitute the equation of the line into the equation of the circle:
$(x-4)^2 + ((x-4)-3)^2 = 25$
$(x-4)^2 + (x-7)^2 = 25$
Let $u = x-4$, then $u^2 + (u-3)^2 = 25$
$u^2 + u^2 - 6u + 9 = 25$
$2u^2 - 6u - 16 = 0$
$u^2 - 3u - 8 = 0$
Using the quadratic formula: $u = \frac{3 \pm \sqrt{9 + 32}}{2} = \frac{3 \pm \sqrt{41}}{2}$ M1
Since $x = u + 4$ and we need $x > 4$, we take the positive solution: $u = \frac{3 + \sqrt{41}}{2}$
$x = 4 + \frac{3 + \sqrt{41}}{2} = \frac{11 + \sqrt{41}}{2}$
$y = x - 4 = \frac{3 + \sqrt{41}}{2}$
The complex number is $z = \frac{11 + \sqrt{41}}{2} + i\frac{3 + \sqrt{41}}{2}$. A1

### Standard Solution Steps
-   **Locus of a Circle**: Recognise that $|z-a|=k$ represents a circle with centre at point $a$ and radius $k$. Convert to Cartesian form $(x-x_c)^2 + (y-y_c)^2 = k^2$ for calculations.
-   **Locus of a Half-Line**: Recognise that $\arg(z-a)=\alpha$ represents a half-line starting from point $a$ at an angle $\alpha$ to the positive real axis. The starting point $a$ is excluded. Its Cartesian equation is $y-y_a = (\tan \alpha)(x-x_a)$, along with a condition on $x$ or $y$ to define the half-line.
-   **Intersection**: To find the point(s) of intersection, solve the Cartesian equations of the two loci simultaneously. This typically involves substituting the linear equation of the half-line into the quadratic equation of the circle.
-   **Validation**: Always check your solutions against the definitions of the loci. For a half-line, ensure the intersection point lies on the correct side of the starting point.

### Common Mistakes
-   **Centre Identification**: Incorrectly determining the centre of the circle from $|z-a|=k$. For example, the centre of $|z - 4 - 3i| = k$ is $(4, 3)$, not $(-4, -3)$.
-   **Half-Line Start Point**: Misidentifying the start point of the half-line $\arg(z-a)=\alpha$. The line starts from $a$.
-   **Open Circle**: Forgetting to draw a small open circle at the start of the half-line to show that the point itself is not part of the locus.
-   **Algebraic Errors**: Making errors when substituting and solving the simultaneous equations.
-   **Extraneous Solutions**: Failing to discard solutions that do not satisfy the conditions of the half-line (e.g., a point behind the start of the line).

### Tags
complex_numbers, argand_diagram, locus, circle, half_line, modulus, argument, intersection, 3.9

---

### Example Question 2
The complex numbers $u$ and $v$ are given by $u = -1 + i\sqrt{3}$ and $v=2i$.

(i) Express $u$ in modulus-argument (polar) form, $r(\cos\theta + i\sin\theta)$, where $r>0$ and $-\pi < \theta \le \pi$. [2]
(ii) Using the modulus-argument form, find the complex number $w = \frac{u}{v}$. Express $w$ in the form $x+iy$, giving exact values for $x$ and $y$. [4]
(iii) On an Argand diagram, sketch the locus of points representing complex numbers $z$ satisfying $|z-u| = |z-v|$. [3]

### Mark Scheme / Solution
(i) For $u = -1 + i\sqrt{3}$:
Modulus: $|u| = \sqrt{(-1)^2 + (\sqrt{3})^2} = \sqrt{1+3} = \sqrt{4} = 2$. B1
-   Argument: $u$ is in the second quadrant. The basic angle is $\alpha = \tan^{-1}(\frac{\sqrt{3}}{1}) = \frac{\pi}{3}$.
    The argument is $\arg(u) = \pi - \alpha = \pi - \frac{\pi}{3} = \frac{2\pi}{3}$.
So, $u = 2(\cos(\frac{2\pi}{3}) + i\sin(\frac{2\pi}{3}))$. B1

(ii) First, express $v=2i$ in polar form.
-   Modulus: $|v| = \sqrt{0^2 + 2^2} = 2$.
Argument: $v$ is on the positive imaginary axis, so $\arg(v) = \frac{\pi}{2}$. B1
To find $w = \frac{u}{v}$, we divide the moduli and subtract the arguments. M1
$|w| = \frac{|u|}{|v|} = \frac{2}{2} = 1$. A1
$\arg(w) = \arg(u) - \arg(v) = \frac{2\pi}{3} - \frac{\pi}{2} = \frac{4\pi - 3\pi}{6} = \frac{\pi}{6}$. A1
Now, convert $w$ back to Cartesian form $x+iy$:
$w = 1(\cos(\frac{\pi}{6}) + i\sin(\frac{\pi}{6})) = \frac{\sqrt{3}}{2} + i\frac{1}{2}$.
So, $x = \frac{\sqrt{3}}{2}$ and $y = \frac{1}{2}$.

(iii) The locus $|z-u| = |z-v|$ is the set of points $z$ that are equidistant from $u$ and $v$. This is the perpendicular bisector of the line segment joining the points representing $u$ and $v$. M1
The point for $u$ is $(-1, \sqrt{3})$.
The point for $v$ is $(0, 2)$. B1
The sketch should show the points for $u$ and $v$ plotted correctly, and a line that is clearly the perpendicular bisector of the segment connecting them. A1

The sketch should show points $u$ at $(-1, \sqrt{3})$ and $v$ at $(0, 2)$, with a straight line that is the perpendicular bisector of the line segment joining these two points.

### Standard Solution Steps
-   **Modulus-Argument Form**: To convert $z=x+iy$ to polar form, calculate modulus $r = \sqrt{x^2+y^2}$ and argument $\theta = \tan^{-1}(|y/x|)$, adjusted for the correct quadrant.
-   **Division in Polar Form**: To calculate $\frac{z_1}{z_2}$, divide their moduli $\frac{|z_1|}{|z_2|}$ and subtract their arguments $\arg(z_1) - \arg(z_2)$. Ensure the final argument is in the principal range $(-\pi, \pi]$.
-   **Perpendicular Bisector Locus**: Recognise $|z-a|=|z-b|$ as the perpendicular bisector of the line segment joining the points representing $a$ and $b$. To sketch, plot the points for $a$ and $b$ and draw the line that cuts the segment between them at a right angle and halfway along its length.

### Common Mistakes
-   **Argument Calculation**: Incorrectly calculating the argument, especially for complex numbers not in the first quadrant. A common error is not adjusting the basic angle correctly (e.g., using $-\alpha$ or $\alpha-\pi$ instead of $\pi-\alpha$ for the second quadrant).
-   **Polar Form Rules**: Confusing the rules for multiplication and division (e.g., adding arguments for division).
-   **Final Argument Range**: Forgetting to adjust the argument if it falls outside the principal range by adding or subtracting $2\pi$.
-   **Locus Sketch**: Misinterpreting $|z-u|=|z-v|$ as a circle or another shape. When sketching the bisector, ensure it looks perpendicular and passes through the midpoint.

### Tags
complex_numbers, modulus, argument, polar_form, division, argand_diagram, locus, perpendicular_bisector, 3.9