# Vectors (FP1)

---

### Entry 1: Vector and Cartesian Equation of a Plane

#### Question

The points $A$, $B$, and $C$ have position vectors $\mathbf{a} = \mathbf{i} + 2\mathbf{j} - \mathbf{k}$, $\mathbf{b} = 3\mathbf{i} + \mathbf{j} + \mathbf{k}$, and $\mathbf{c} = 2\mathbf{i} - \mathbf{j} + 4\mathbf{k}$ respectively, relative to the origin $O$.

(a) Find the vector $\vec{AB} \times \vec{AC}$.

(b) Hence, find the Cartesian equation of the plane $ABC$.

(c) The point $D$ has coordinates $(5, 3, -2)$. Find the perpendicular distance from $D$ to the plane $ABC$.

#### Solution

(a)
First, find two direction vectors lying in the plane, such as $\vec{AB}$ and $\vec{AC}$.
$\vec{AB} = \mathbf{b} - \mathbf{a} = (3\mathbf{i} + \mathbf{j} + \mathbf{k}) - (\mathbf{i} + 2\mathbf{j} - \mathbf{k}) = 2\mathbf{i} - \mathbf{j} + 2\mathbf{k}$.
$\vec{AC} = \mathbf{c} - \mathbf{a} = (2\mathbf{i} - \mathbf{j} + 4\mathbf{k}) - (\mathbf{i} + 2\mathbf{j} - \mathbf{k}) = \mathbf{i} - 3\mathbf{j} + 5\mathbf{k}$.

The vector product of these two vectors will give a normal vector to the plane.
$\vec{AB} \times \vec{AC} = \begin{vmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} \\ 2 & -1 & 2 \\ 1 & -3 & 5 \end{vmatrix}$
$= \mathbf{i}((-1)(5) - (2)(-3)) - \mathbf{j}((2)(5) - (2)(1)) + \mathbf{k}((2)(-3) - (-1)(1))$
$= \mathbf{i}(-5 - (-6)) - \mathbf{j}(10 - 2) + \mathbf{k}(-6 - (-1))$
$= \mathbf{i} - 8\mathbf{j} - 5\mathbf{k}$.

(b)
The normal vector to the plane is $\mathbf{n} = \mathbf{i} - 8\mathbf{j} - 5\mathbf{k}$.
The equation of the plane can be written as $\mathbf{r} \cdot \mathbf{n} = \mathbf{a} \cdot \mathbf{n}$.
$\mathbf{a} \cdot \mathbf{n} = (\mathbf{i} + 2\mathbf{j} - \mathbf{k}) \cdot (\mathbf{i} - 8\mathbf{j} - 5\mathbf{k})$
$= (1)(1) + (2)(-8) + (-1)(-5) = 1 - 16 + 5 = -10$.
The vector equation is $\mathbf{r} \cdot (\mathbf{i} - 8\mathbf{j} - 5\mathbf{k}) = -10$.
Writing $\mathbf{r} = x\mathbf{i} + y\mathbf{j} + z\mathbf{k}$, the Cartesian equation is $x - 8y - 5z = -10$, or $x - 8y - 5z + 10 = 0$.

(c)
The perpendicular distance from a point $(x_0, y_0, z_0)$ to the plane $ax+by+cz+d=0$ is given by the formula:
Distance $= \frac{|ax_0 + by_0 + cz_0 + d|}{\sqrt{a^2+b^2+c^2}}$.
Here, the point is $D(5, 3, -2)$ and the plane is $x - 8y - 5z + 10 = 0$.
Distance $= \frac{|(1)(5) + (-8)(3) + (-5)(-2) + 10|}{\sqrt{1^2 + (-8)^2 + (-5)^2}}$
$= \frac{|5 - 24 + 10 + 10|}{\sqrt{1 + 64 + 25}}$
$= \frac{|1|}{\sqrt{90}} = \frac{1}{3\sqrt{10}}$ or $\frac{\sqrt{10}}{30}$.

#### Mark Scheme
(a)
Finds two vectors in the plane, e.g., $\vec{AB}$ and $\vec{AC}$. **M1**
Attempts the vector product of these two vectors. **M1**
Obtains the correct normal vector $\mathbf{i} - 8\mathbf{j} - 5\mathbf{k}$. **A1**

(b)
Uses the formula $\mathbf{r} \cdot \mathbf{n} = \mathbf{a} \cdot \mathbf{n}$ with their normal and a point on the plane. **M1**
Correctly obtains the Cartesian equation $x - 8y - 5z = -10$. **A1**

(c)
Applies the correct formula for the distance from a point to a plane. **M1**
Substitutes values correctly and obtains the final answer $\frac{1}{\sqrt{90}}$. **A1**

#### Common Mistakes
- **Vector Product Errors:** Arithmetic mistakes are very common when calculating the vector product. A systematic approach, like using the determinant form, is recommended.
- **Sign Errors:** A sign error in the normal vector or in the scalar product `a.n` will lead to an incorrect plane equation.
- **Distance Formula:** Using an incorrect version of the distance formula, or making sign errors when substituting the coordinates of the point and the coefficients from the plane equation. Ensure the plane equation is in the form $ax+by+cz+d=0$.

---

### Entry 2: Angles involving Lines and Planes

#### Question
The line $l$ has the vector equation $\mathbf{r} = \begin{pmatrix} 1 \\ 2 \\ -1 \end{pmatrix} + \lambda \begin{pmatrix} 2 \\ -2 \\ 1 \end{pmatrix}$.
The plane $\Pi$ has the Cartesian equation $3x + 4y - z = 5$.

(a) Find the acute angle between the line $l$ and the plane $\Pi$.

(b) A second plane, $\Pi_2$, has equation $x - 2y + 2z = 8$. Find the acute angle between the planes $\Pi$ and $\Pi_2$.

#### Solution
(a)
The direction vector of the line $l$ is $\mathbf{d} = \begin{pmatrix} 2 \\ -2 \\ 1 \end{pmatrix}$.
The normal vector to the plane $\Pi$ is $\mathbf{n} = \begin{pmatrix} 3 \\ 4 \\ -1 \end{pmatrix}$.
Let $\theta$ be the angle between the line and the plane. The angle between the direction vector $\mathbf{d}$ and the normal vector $\mathbf{n}$ is $(90^\circ - \theta)$.
We use the scalar product with the sine formula for the angle between a line and a plane:
$\sin\theta = \frac{|\mathbf{d} \cdot \mathbf{n}|}{|\mathbf{d}||\mathbf{n}|}$.
$\mathbf{d} \cdot \mathbf{n} = (2)(3) + (-2)(4) + (1)(-1) = 6 - 8 - 1 = -3$.
$|\mathbf{d}| = \sqrt{2^2 + (-2)^2 + 1^2} = \sqrt{4+4+1} = \sqrt{9} = 3$.
$|\mathbf{n}| = \sqrt{3^2 + 4^2 + (-1)^2} = \sqrt{9+16+1} = \sqrt{26}$.
$\sin\theta = \frac{|-3|}{3\sqrt{26}} = \frac{3}{3\sqrt{26}} = \frac{1}{\sqrt{26}}$.
$\theta = \arcsin\left(\frac{1}{\sqrt{26}}\right) = 11.31^\circ \approx 11.3^\circ$ (to 1 d.p.).

(b)
The normal vector to plane $\Pi$ is $\mathbf{n}_1 = \begin{pmatrix} 3 \\ 4 \\ -1 \end{pmatrix}$.
The normal vector to plane $\Pi_2$ is $\mathbf{n}_2 = \begin{pmatrix} 1 \\ -2 \\ 2 \end{pmatrix}$.
Let $\alpha$ be the angle between the two planes. This is the angle between their normal vectors. We use the cosine formula:
$\cos\alpha = \frac{|\mathbf{n}_1 \cdot \mathbf{n}_2|}{|\mathbf{n}_1||\mathbf{n}_2|}$.
$\mathbf{n}_1 \cdot \mathbf{n}_2 = (3)(1) + (4)(-2) + (-1)(2) = 3 - 8 - 2 = -7$.
$|\mathbf{n}_1| = \sqrt{26}$ (from part a).
$|\mathbf{n}_2| = \sqrt{1^2 + (-2)^2 + 2^2} = \sqrt{1+4+4} = \sqrt{9} = 3$.
$\cos\alpha = \frac{|-7|}{\sqrt{26} \times 3} = \frac{7}{3\sqrt{26}}$.
$\alpha = \arccos\left(\frac{7}{3\sqrt{26}}\right) = 62.77^\circ \approx 62.8^\circ$ (to 1 d.p.).

#### Mark Scheme
(a)
Identifies correct direction vector $\mathbf{d}$ and normal vector $\mathbf{n}$. **B1**
Uses the correct formula $\sin\theta = \frac{|\mathbf{d} \cdot \mathbf{n}|}{|\mathbf{d}||\mathbf{n}|}$. **M1**
Correctly calculates the scalar product $\mathbf{d} \cdot \mathbf{n}$. **A1**
Correctly calculates the magnitudes $|\mathbf{d}|$ and $|\mathbf{n}|$. **A1**
Obtains the correct angle $11.3^\circ$. **A1**

(b)
Identifies the correct normal vectors for both planes. **B1**
Uses the correct formula $\cos\alpha = \frac{|\mathbf{n}_1 \cdot \mathbf{n}_2|}{|\mathbf{n}_1||\mathbf{n}_2|}$. **M1**
Obtains the correct angle $62.8^\circ$. **A1**

#### Common Mistakes
- **Incorrect Formula:** The most common mistake is using cosine instead of sine for the line-plane angle, or vice-versa for the plane-plane angle. Remember: line and plane are 'different', so use sine; plane and plane are 'same', so use cosine.
- **Missing Absolute Value:** Forgetting the modulus on the scalar product can lead to an obtuse angle. The question almost always asks for the *acute* angle.
- **Calculation Errors:** Simple arithmetic errors when computing the scalar product or the magnitudes of the vectors.

---

### Entry 3: Shortest Distance Between Skew Lines

#### Question
The line $l_1$ has equation $\mathbf{r} = (\mathbf{i} + \mathbf{k}) + \lambda(\mathbf{i} - \mathbf{j} + 2\mathbf{k})$.
The line $l_2$ has equation $\mathbf{r} = (2\mathbf{i} + 4\mathbf{j}) + \mu(2\mathbf{i} + \mathbf{j} - \mathbf{k})$.

(a) Show that the lines $l_1$ and $l_2$ are skew.
(b) Find the shortest distance between $l_1$ and $l_2$.

#### Solution
(a)
The direction vectors are $\mathbf{d}_1 = \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix}$ and $\mathbf{d}_2 = \begin{pmatrix} 2 \\ 1 \\ -1 \end{pmatrix}$. Since $\mathbf{d}_1$ is not a scalar multiple of $\mathbf{d}_2$, the lines are not parallel.

To check for intersection, we set the position vectors equal:
$\begin{pmatrix} 1 \\ 0 \\ 1 \end{pmatrix} + \lambda \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix} = \begin{pmatrix} 2 \\ 4 \\ 0 \end{pmatrix} + \mu \begin{pmatrix} 2 \\ 1 \\ -1 \end{pmatrix}$
This gives a system of simultaneous equations:
1. $1 + \lambda = 2 + 2\mu \implies \lambda - 2\mu = 1$
2. $-\lambda = 4 + \mu \implies \lambda + \mu = -4$
3. $1 + 2\lambda = -\mu \implies 2\lambda + \mu = -1$

Solving (1) and (2): Subtract (1) from (2) to get $(\lambda+\mu) - (\lambda-2\mu) = -4 - 1 \implies 3\mu = -5 \implies \mu = -5/3$.
Substitute $\mu$ into (2): $\lambda - 5/3 = -4 \implies \lambda = -4 + 5/3 = -7/3$.

Check these values in equation (3):
$2(-7/3) + (-5/3) = -14/3 - 5/3 = -19/3$.
Since $-19/3 \neq -1$, there is no solution. The lines do not intersect.
Because the lines are not parallel and do not intersect, they are skew.

(b)
The common perpendicular vector is $\mathbf{n} = \mathbf{d}_1 \times \mathbf{d}_2$.
$\mathbf{n} = \begin{pmatrix} 1 \\ -1 \\ 2 \end{pmatrix} \times \begin{pmatrix} 2 \\ 1 \\ -1 \end{pmatrix} = \begin{pmatrix} (-1)(-1) - (2)(1) \\ (2)(2) - (1)(-1) \\ (1)(1) - (-1)(2) \end{pmatrix} = \begin{pmatrix} 1 - 2 \\ 4 + 1 \\ 1 + 2 \end{pmatrix} = \begin{pmatrix} -1 \\ 5 \\ 3 \end{pmatrix}$.

Let $A$ be a point on $l_1$ and $B$ be a point on $l_2$. From the equations, we can take $A(1, 0, 1)$ and $B(2, 4, 0)$.
The vector connecting them is $\vec{AB} = \mathbf{b} - \mathbf{a} = \begin{pmatrix} 2-1 \\ 4-0 \\ 0-1 \end{pmatrix} = \begin{pmatrix} 1 \\ 4 \\ -1 \end{pmatrix}$.

The shortest distance is the projection of $\vec{AB}$ onto the common perpendicular $\mathbf{n}$.
Distance $= \frac{|\vec{AB} \cdot \mathbf{n}|}{|\mathbf{n}|}$.
$|\vec{AB} \cdot \mathbf{n}| = |(1)(-1) + (4)(5) + (-1)(3)| = |-1 + 20 - 3| = |16| = 16$.
$|\mathbf{n}| = \sqrt{(-1)^2 + 5^2 + 3^2} = \sqrt{1 + 25 + 9} = \sqrt{35}$.
Shortest distance $= \frac{16}{\sqrt{35}}$ or $\frac{16\sqrt{35}}{35}$.

#### Mark Scheme
(a)
Shows direction vectors are not parallel. **B1**
Sets up simultaneous equations by equating components. **M1**
Solves for $\lambda$ and $\mu$ using two equations. **M1**
Shows that these values do not satisfy the third equation and concludes the lines are skew. **A1**

(b)
Attempts to find the common perpendicular by calculating $\mathbf{d}_1 \times \mathbf{d}_2$. **M1**
Correctly finds $\mathbf{n}$. **A1**
Finds a vector connecting a point on $l_1$ to a point on $l_2$. **B1**
Applies the formula $\frac{|\vec{AB} \cdot \mathbf{n}|}{|\mathbf{n}|}$ correctly. **M1**
Obtains the correct exact distance $\frac{16}{\sqrt{35}}$. **A1**

#### Common Mistakes
- **Skew Test:** Failing to complete the test for skew lines. It's necessary to show both non-parallelism and non-intersection.
- **Vector Product:** Arithmetic errors when calculating the cross product for the common normal.
- **Connecting Vector:** Choosing points on the lines but making a sign error when subtracting position vectors.
- **Forgetting Modulus:** The distance must be positive. Forgetting the absolute value on the scalar product can result in a negative distance, which is incorrect.

---

### Entry 4: Intersection of Planes and Common Perpendicular Line

#### Question

The plane $\Pi_1$ has equation $x + 2y - z = 2$.
The plane $\Pi_2$ has equation $2x - y + 3z = 9$.
The lines $l_1$ and $l_2$ have equations $\mathbf{r} = \begin{pmatrix} 1 \\ 0 \\ 0 \end{pmatrix} + \lambda \begin{pmatrix} 0 \\ 1 \\ 1 \end{pmatrix}$ and $\mathbf{r} = \begin{pmatrix} 0 \\ 2 \\ 0 \end{pmatrix} + \mu \begin{pmatrix} 1 \\ -1 \\ 0 \end{pmatrix}$.

(a) Find a vector equation for the line of intersection of the planes $\Pi_1$ and $\Pi_2$.

(b) Find the vector equation of the line that is perpendicular to both $l_1$ and $l_2$ and intersects both lines.

#### Solution

(a)
The normal vectors of the planes are $\mathbf{n}_1 = \begin{pmatrix} 1 \\ 2 \\ -1 \end{pmatrix}$ and $\mathbf{n}_2 = \begin{pmatrix} 2 \\ -1 \\ 3 \end{pmatrix}$.
The direction of the line of intersection, $\mathbf{d}$, is perpendicular to both normal vectors, so $\mathbf{d} = \mathbf{n}_1 \times \mathbf{n}_2$.
$\mathbf{d} = \begin{pmatrix} 1 \\ 2 \\ -1 \end{pmatrix} \times \begin{pmatrix} 2 \\ -1 \\ 3 \end{pmatrix} = \begin{pmatrix} (2)(3) - (-1)(-1) \\ (-1)(2) - (1)(3) \\ (1)(-1) - (2)(2) \end{pmatrix} = \begin{pmatrix} 6-1 \\ -2-3 \\ -1-4 \end{pmatrix} = \begin{pmatrix} 5 \\ -5 \\ -5 \end{pmatrix}$.
We can use a simpler parallel vector, such as $\begin{pmatrix} 1 \\ -1 \\ -1 \end{pmatrix}$.

To find a point on the line, we can solve the system of equations. Let's set $z=0$:
1. $x + 2y = 2$
2. $2x - y = 9$
Multiply (2) by 2: $4x - 2y = 18$.
Add this to (1): $(x+2y)+(4x-2y) = 2+18 \implies 5x = 20 \implies x=4$.
Substitute $x=4$ into (1): $4+2y=2 \implies 2y = -2 \implies y=-1$.
A point on the line is $(4, -1, 0)$.
The vector equation of the line of intersection is $\mathbf{r} = \begin{pmatrix} 4 \\ -1 \\ 0 \end{pmatrix} + t \begin{pmatrix} 1 \\ -1 \\ -1 \end{pmatrix}$.

(b)
Let the common perpendicular line be $l_3$. Its direction vector $\mathbf{d}_3$ must be perpendicular to the direction vectors of $l_1$ and $l_2$, which are $\mathbf{d}_1 = \begin{pmatrix} 0 \\ 1 \\ 1 \end{pmatrix}$ and $\mathbf{d}_2 = \begin{pmatrix} 1 \\ -1 \\ 0 \end{pmatrix}$.
$\mathbf{d}_3 = \mathbf{d}_1 \times \mathbf{d}_2 = \begin{pmatrix} (1)(0) - (1)(-1) \\ (1)(1) - (0)(0) \\ (0)(-1) - (1)(1) \end{pmatrix} = \begin{pmatrix} 1 \\ 1 \\ -1 \end{pmatrix}$.

Let $P$ on $l_1$ and $Q$ on $l_2$ be the endpoints of the common perpendicular segment.
$\mathbf{p} = \begin{pmatrix} 1 \\ \lambda \\ \lambda \end{pmatrix}$ and $\mathbf{q} = \begin{pmatrix} \mu \\ 2-\mu \\ 0 \end{pmatrix}$.
The vector $\vec{PQ} = \mathbf{q} - \mathbf{p} = \begin{pmatrix} \mu-1 \\ 2-\mu-\lambda \\ -\lambda \end{pmatrix}$.
The vector $\vec{PQ}$ must be parallel to $\mathbf{d}_3$, so $\vec{PQ} = k\mathbf{d}_3$ for some scalar $k$.
$\begin{pmatrix} \mu-1 \\ 2-\mu-\lambda \\ -\lambda \end{pmatrix} = k \begin{pmatrix} 1 \\ 1 \\ -1 \end{pmatrix}$.
This gives a system of equations:
1. $\mu - 1 = k$
2. $2 - \mu - \lambda = k$
3. $-\lambda = -k \implies \lambda = k$

Substitute (1) and (3) into (2):
$2 - (k+1) - k = k \implies 2 - k - 1 - k = k \implies 1 - 2k = k \implies 3k=1 \implies k=1/3$.
So, $\lambda = 1/3$ and $\mu = k+1 = 4/3$.
The point $P$ on $l_1$ is $(1, 1/3, 1/3)$.
The equation of the common perpendicular is $\mathbf{r} = \mathbf{p} + t\mathbf{d}_3 = \begin{pmatrix} 1 \\ 1/3 \\ 1/3 \end{pmatrix} + t \begin{pmatrix} 1 \\ 1 \\ -1 \end{pmatrix}$.

#### Mark Scheme
(a)
Calculates $\mathbf{n}_1 \times \mathbf{n}_2$ to find the direction of the line. **M1 A1**
Finds a point on the line by solving the system of equations. **M1**
States the correct final vector equation. **A1**

(b)
Calculates $\mathbf{d}_1 \times \mathbf{d}_2$ to find the direction of the common perpendicular. **M1**
Sets up general points on $l_1$ and $l_2$ and finds the vector $\vec{PQ}$. **M1**
Sets up a system of equations using the condition that $\vec{PQ}$ is parallel to the common perpendicular direction. **M1**
Solves for the parameters $\lambda$ and $\mu$ (or $k$). **A1**
States a correct final vector equation for the common perpendicular line. **A1**

#### Common Mistakes
- **Intersection Line:** Making algebraic errors when solving the system to find a point. Any point will do, so setting one variable to zero is usually the simplest method.
- **Common Perpendicular:** This is a procedurally complex problem. A common mistake is to only find the *direction* of the perpendicular but not a *point* on the line. Another is mixing up the conditions: $\vec{PQ}$ must be *parallel* to $\mathbf{d}_1 \times \mathbf{d}_2$, or alternatively, $\vec{PQ}$ must be *perpendicular* to both $\mathbf{d}_1$ and $\mathbf{d}_2$ (leading to two dot-product equations). Both methods are valid but must be applied correctly.