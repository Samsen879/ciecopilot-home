## Vectors: Equation of a Line and Angles

**Syllabus Reference**: 9709.P3.3.7
**Learning Objective**: Represent a line in three dimensions by a vector equation. Use the scalar product to find the angle between two lines.

### Example Question
The points A and B have position vectors $\mathbf{i} + 2\mathbf{j} - \mathbf{k}$ and $3\mathbf{i} + \mathbf{j} + \mathbf{k}$ respectively, relative to the origin O.

(i) Find the vector equation of the line $l$ passing through A and B. [2]
(ii) The line $m$ has equation $\mathbf{r} = (5\mathbf{i} - \mathbf{j}) + \mu(\mathbf{i} + 2\mathbf{j} + 3\mathbf{k})$. Find the acute angle between the lines $l$ and $m$. [4]

### Mark Scheme / Solution
(i) First, find the direction vector of the line $l$.
$\vec{AB} = \mathbf{b} - \mathbf{a} = (3\mathbf{i} + \mathbf{j} + \mathbf{k}) - (\mathbf{i} + 2\mathbf{j} - \mathbf{k})$
$\vec{AB} = (3-1)\mathbf{i} + (1-2)\mathbf{j} + (1-(-1))\mathbf{k} = 2\mathbf{i} - \mathbf{j} + 2\mathbf{k}$. M1
The vector equation of line $l$ is $\mathbf{r} = \mathbf{a} + \lambda\vec{AB}$.
$\mathbf{r} = \begin{pmatrix} 1 \\ 2 \\ -1 \end{pmatrix} + \lambda \begin{pmatrix} 2 \\ -1 \\ 2 \end{pmatrix}$. A1

(ii) The direction vector of line $l$ is $\mathbf{d}_l = \begin{pmatrix} 2 \\ -1 \\ 2 \end{pmatrix}$.
The direction vector of line $m$ is $\mathbf{d}_m = \begin{pmatrix} 1 \\ 2 \\ 3 \end{pmatrix}$.
Use the scalar product formula $\mathbf{d}_l \cdot \mathbf{d}_m = |\mathbf{d}_l||\mathbf{d}_m|\cos\theta$. M1
$\mathbf{d}_l \cdot \mathbf{d}_m = (2)(1) + (-1)(2) + (2)(3) = 2 - 2 + 6 = 6$. A1
$|\mathbf{d}_l| = \sqrt{2^2 + (-1)^2 + 2^2} = \sqrt{4+1+4} = \sqrt{9} = 3$.
$|\mathbf{d}_m| = \sqrt{1^2 + 2^2 + 3^2} = \sqrt{1+4+9} = \sqrt{14}$. M1
$\cos\theta = \frac{6}{3\sqrt{14}} = \frac{2}{\sqrt{14}}$.
$\theta = \cos^{-1}\left(\frac{2}{\sqrt{14}}\right) = 57.688...^\circ$.
The acute angle is $57.7^\circ$ (to 1 d.p.). A1

### Standard Solution Steps
- **(i) Equation of a Line**:
    - Find the direction vector by subtracting the position vector of the starting point from the position vector of the end point (e.g., $\vec{AB} = \mathbf{b} - \mathbf{a}$).
    - Construct the vector equation using a point on the line and the direction vector: $\mathbf{r} = \text{position vector} + \lambda(\text{direction vector})$.
- **(ii) Angle Between Lines**:
    - Identify the direction vectors of both lines from their vector equations.
    - Use the scalar product formula: $\cos\theta = \frac{\mathbf{d}_1 \cdot \mathbf{d}_2}{|\mathbf{d}_1||\mathbf{d}_2|}$.
    - Calculate the dot product of the two direction vectors.
    - Calculate the magnitude of each direction vector.
    - Substitute these values into the formula to find $\cos\theta$ and then solve for $\theta$.
    - If the angle is obtuse ($>90^\circ$) and the question asks for the acute angle, subtract the result from $180^\circ$.

### Common Mistakes
- **Equation of a line**: Confusing position and direction vectors. Using a position vector as a direction vector or vice versa.
- **Angle calculation**: Using a position vector instead of a direction vector in the scalar product formula.
- **Scalar product**: Making arithmetic errors when calculating the dot product or magnitudes.
- **Final angle**: Providing the obtuse angle when the acute angle is requested. If $\cos\theta$ is negative, the angle is obtuse; the acute angle is $180^\circ - \theta$.

### Tags
vectors, vector_equation_of_line, scalar_product, dot_product, angle_between_lines, 3.7

---

## Vectors: Intersection of Lines

**Syllabus Reference**: 9709.P3.3.7
**Learning Objective**: Determine whether two lines intersect, are parallel, or are skew, and find the point of intersection if it exists.

### Example Question
The line $l_1$ has the equation $\mathbf{r} = \begin{pmatrix} 2 \\ 1 \\ 5 \end{pmatrix} + s \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix}$. The line $l_2$ has the equation $\mathbf{r} = \begin{pmatrix} 0 \\ 7 \\ -1 \end{pmatrix} + t \begin{pmatrix} 1 \\ 1 \\ 1 \end{pmatrix}$.

(i) Show that the lines $l_1$ and $l_2$ are not parallel. [1]
(ii) Determine whether the lines intersect. If they do, find the position vector of the point of intersection. [5]

### Mark Scheme / Solution
(i) The direction vector of $l_1$ is $\mathbf{d}_1 = \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix}$. The direction vector of $l_2$ is $\mathbf{d}_2 = \begin{pmatrix} 1 \\ 1 \\ 1 \end{pmatrix}$.
For the lines to be parallel, $\mathbf{d}_1$ must be a scalar multiple of $\mathbf{d}_2$. Comparing the $\mathbf{i}$ components, the scalar would have to be 1. However, $-1 \neq 1 \times 1$. Thus, the direction vectors are not multiples of each other, and the lines are not parallel. B1

(ii) To find if the lines intersect, set their vector equations equal to each other.
$\begin{pmatrix} 2+s \\ 1-s \\ 5+2s \end{pmatrix} = \begin{pmatrix} t \\ 7+t \\ -1+t \end{pmatrix}$. M1
This gives a system of three simultaneous equations:
1) $2+s = t$
2) $1-s = 7+t$
3) $5+2s = -1+t$

Substitute (1) into (2):
$1-s = 7+(2+s)$
$1-s = 9+s$
$-8 = 2s \implies s = -4$. A1

Substitute $s=-4$ into (1) to find $t$:
$t = 2+(-4) = -2$. A1

Now check if these values satisfy equation (3). M1
LHS: $5+2s = 5+2(-4) = 5-8 = -3$.
RHS: $-1+t = -1+(-2) = -3$.
Since LHS = RHS, the values are consistent and the lines intersect.

To find the point of intersection, substitute $s=-4$ into the equation for $l_1$ (or $t=-2$ into $l_2$).
$\mathbf{r} = \begin{pmatrix} 2 \\ 1 \\ 5 \end{pmatrix} + (-4) \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix} = \begin{pmatrix} 2-4 \\ 1+4 \\ 5-8 \end{pmatrix} = \begin{pmatrix} -2 \\ 5 \\ -3 \end{pmatrix}$.
The position vector of the point of intersection is $-2\mathbf{i} + 5\mathbf{j} - 3\mathbf{k}$. A1

### Standard Solution Steps
- **Check for parallelism**: Compare the direction vectors. If one is a scalar multiple of the other, they are parallel.
- **Set up equations**: Equate the vector equations of the two lines, using different parameters (e.g., $s$ and $t$). This creates a system of three linear equations.
- **Solve for parameters**: Solve any two of the three equations simultaneously to find values for $s$ and $t$.
- **Verify intersection**: Substitute the found values of $s$ and $t$ into the third (unused) equation.
  - If the third equation is satisfied, the lines intersect.
  - If it is not satisfied, the lines are skew (since they are not parallel).
- **Find intersection point**: If the lines intersect, substitute the value of the parameter ($s$ or $t$) back into its corresponding line equation to get the position vector of the point of intersection.

### Common Mistakes
- Using the same parameter for both line equations (e.g., using $s$ for both).
- Making algebraic errors when solving the simultaneous equations.
- Forgetting to check the parameter values in the third equation. This check is crucial to distinguish between intersecting and skew lines.
- Concluding that lines intersect without a successful check, or concluding they are skew after making a calculation error.
- Substituting the wrong parameter value (e.g., $t$ into the equation for line $l_1$).

### Tags
vectors, intersection_of_lines, skew_lines, parallel_lines, simultaneous_equations, 3.7

---

## Vectors: Point on a Line and Perpendicularity

**Syllabus Reference**: 9709.P3.3.7
**Learning Objective**: Understand and use the property that if a vector is perpendicular to another vector, their scalar product is zero. Find the position vector of a point on a line that is closest to another point.

### Example Question
A line $l$ has vector equation $\mathbf{r} = (\mathbf{i} + 8\mathbf{j} + 2\mathbf{k}) + \lambda(\mathbf{i} - \mathbf{j} + 2\mathbf{k})$. The point $P$ has position vector $6\mathbf{i} + 4\mathbf{j} - 3\mathbf{k}$.

(i) Find the position vector of the point $N$ on the line $l$ such that the vector $\vec{PN}$ is perpendicular to $l$. [5]
(ii) Hence find the shortest distance from $P$ to the line $l$. [2]

### Mark Scheme / Solution
(i) The position vector of a general point $N$ on the line $l$ is given by:
$\vec{ON} = \begin{pmatrix} 1+\lambda \\ 8-\lambda \\ 2+2\lambda \end{pmatrix}$. B1

The vector $\vec{PN}$ is given by $\vec{ON} - \vec{OP}$:
$\vec{PN} = \begin{pmatrix} 1+\lambda \\ 8-\lambda \\ 2+2\lambda \end{pmatrix} - \begin{pmatrix} 6 \\ 4 \\ -3 \end{pmatrix} = \begin{pmatrix} \lambda-5 \\ 4-\lambda \\ 5+2\lambda \end{pmatrix}$. M1

Since $\vec{PN}$ is perpendicular to the line $l$, its scalar product with the direction vector of $l$, $\mathbf{d} = \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix}$, must be zero.
$\vec{PN} \cdot \mathbf{d} = 0$. M1
$\begin{pmatrix} \lambda-5 \\ 4-\lambda \\ 5+2\lambda \end{pmatrix} \cdot \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix} = 0$
$1(\lambda-5) - 1(4-\lambda) + 2(5+2\lambda) = 0$
$\lambda - 5 - 4 + \lambda + 10 + 4\lambda = 0$
$6\lambda + 1 = 0 \implies \lambda = -\frac{1}{6}$. A1

Substitute $\lambda = -\frac{1}{6}$ into the equation for $\vec{ON}$ to find the position vector of $N$.
$\vec{ON} = \begin{pmatrix} 1 - 1/6 \\ 8 - (-1/6) \\ 2 + 2(-1/6) \end{pmatrix} = \begin{pmatrix} 5/6 \\ 49/6 \\ 2 - 1/3 \end{pmatrix} = \begin{pmatrix} 5/6 \\ 49/6 \\ 5/3 \end{pmatrix}$.
The position vector of $N$ is $\frac{5}{6}\mathbf{i} + \frac{49}{6}\mathbf{j} + \frac{5}{3}\mathbf{k}$. A1

(ii) The shortest distance is the magnitude of the vector $\vec{PN}$.
First, find the vector $\vec{PN}$ using $\lambda = -\frac{1}{6}$.
$\vec{PN} = \begin{pmatrix} -1/6-5 \\ 4-(-1/6) \\ 5+2(-1/6) \end{pmatrix} = \begin{pmatrix} -31/6 \\ 25/6 \\ 5-1/3 \end{pmatrix} = \begin{pmatrix} -31/6 \\ 25/6 \\ 14/3 \end{pmatrix} = \begin{pmatrix} -31/6 \\ 25/6 \\ 28/6 \end{pmatrix}$. M1

$|\vec{PN}| = \sqrt{(-\frac{31}{6})^2 + (\frac{25}{6})^2 + (\frac{28}{6})^2} = \frac{1}{6}\sqrt{31^2 + 25^2 + 28^2}$
$= \frac{1}{6}\sqrt{961 + 625 + 784} = \frac{1}{6}\sqrt{2370}$.
Shortest distance $\approx 7.028...$ or $7.03$ (3 s.f.). A1

### Standard Solution Steps
- **(i) Finding the point N**:
    - Write down the position vector of a general point $N$ on the line using the parameter $\lambda$.
    - Find the vector $\vec{PN}$ by subtracting the position vector of $P$ from the position vector of $N$.
    - Use the perpendicularity condition: the scalar product of $\vec{PN}$ and the direction vector of the line is zero.
    - Solve the resulting equation to find the specific value of $\lambda$.
    - Substitute this value of $\lambda$ back into the general expression for the position vector of $N$.
- **(ii) Finding the shortest distance**:
    - Substitute the value of $\lambda$ you found into the expression for the vector $\vec{PN}$.
    - Calculate the magnitude of this specific vector $\vec{PN}$. This magnitude is the shortest distance.

### Common Mistakes
- Incorrectly calculating the vector $\vec{PN}$, often subtracting in the wrong order ($\vec{OP} - \vec{ON}$).
- Taking the scalar product of $\vec{PN}$ with a position vector from the line equation instead of the direction vector.
- Algebraic errors when expanding and solving the scalar product equation for $\lambda$.
- Errors in calculating the final magnitude, especially with fractions and squares.

### Tags
vectors, perpendicular_distance, shortest_distance_point_to_line, scalar_product, perpendicularity, 3.7