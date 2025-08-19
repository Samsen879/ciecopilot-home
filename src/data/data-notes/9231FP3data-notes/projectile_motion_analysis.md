## FM.1: Projectile Motion from a Height

**Syllabus Reference**: 3.1
**Learning Objective**: To apply constant acceleration formulae independently to the horizontal and vertical motion of a projectile launched from a point above the horizontal ground.

### Example Question

A particle is projected from a point $O$ on top of a vertical cliff. The initial velocity of the particle is $25 \text{ m s}^{-1}$ at an angle of $30^\circ$ above the horizontal. The point $O$ is $60 \text{ m}$ above sea level. The particle moves freely under gravity and hits the sea at a point $P$.

(a) Find the greatest height reached by the particle above sea level. [3]
(b) Find the time taken for the particle to reach the point $P$. [4]
(c) Determine the horizontal distance from the base of the cliff to the point $P$. [2]
(d) Find the speed and angle of impact of the particle with the sea. [4]

*(Assume g = 10 m s⁻²)*

### Mark Scheme / Solution

**(a) Find the greatest height reached by the particle above sea level.**

Resolving initial velocity:
$u_x = 25 \cos 30^\circ = 12.5\sqrt{3}$
$u_y = 25 \sin 30^\circ = 12.5$

Consider vertical motion from O to max height. At max height, $v_y = 0$.
Using $v^2 = u^2 + 2as$:
$0^2 = (12.5)^2 + 2(-10)s$  **[M1]** - For using a correct suvat equation for vertical motion to find height.
$20s = 156.25$
$s = 7.8125 \text{ m}$  **[A1]** - Correct height above O.

Total height above sea level = $60 + 7.8125 = 67.8125 \text{ m}$.
Greatest height = $67.8 \text{ m}$ (3 s.f.) **[A1]** - For adding cliff height and giving final answer to 3 s.f.

---
**(b) Find the time taken for the particle to reach the point P.**

Consider vertical motion from O to P. Displacement $s_y = -60 \text{ m}$.
Using $s = ut + \frac{1}{2}at^2$:
$-60 = 12.5t + \frac{1}{2}(-10)t^2$  **[M1]** - For applying suvat with correct values for $s_y, u_y, a$.
$5t^2 - 12.5t - 60 = 0$ **[A1]** - For the correct quadratic equation.

Solving the quadratic:
$t = \frac{-(-12.5) \pm \sqrt{(-12.5)^2 - 4(5)(-60)}}{2(5)}$ **[M1]** - For a correct attempt to solve their quadratic.
$t = \frac{12.5 \pm \sqrt{156.25 + 1200}}{10} = \frac{12.5 \pm \sqrt{1356.25}}{10}$
$t = \frac{12.5 \pm 36.827...}{10}$

Since $t > 0$, we take the positive root.
$t = 4.9327...$
$t = 4.93 \text{ s}$ (3 s.f.) **[A1]**

---
**(c) Determine the horizontal distance from the base of the cliff to the point P.**

Consider horizontal motion. Acceleration $a_x = 0$.
$s_x = u_x t$
$s_x = (12.5\sqrt{3}) \times 4.9327...$ **[M1]** - For using $s_x = u_x t$ with their time from part (b).
$s_x = 106.78...$
Horizontal distance = $107 \text{ m}$ (3 s.f.) **[A1]**

---
**(d) Find the speed and angle of impact of the particle with the sea.**

Final horizontal velocity: $v_x = u_x = 12.5\sqrt{3} = 21.65... \text{ m s}^{-1}$ **[B1]** - For correct $v_x$.

Final vertical velocity:
Using $v = u + at$:
$v_y = 12.5 + (-10)(4.9327...)$ **[M1]** - For finding $v_y$ using a correct suvat equation.
$v_y = 12.5 - 49.327... = -36.827... \text{ m s}^{-1}$

Resultant speed:
$V = \sqrt{v_x^2 + v_y^2} = \sqrt{(21.65...)^2 + (-36.827...)^2}$ **[M1]** - For correctly combining velocity components.
$V = \sqrt{468.75 + 1356.25} = \sqrt{1825} = 42.72...$
Speed = $42.7 \text{ m s}^{-1}$ (3 s.f.) **[A1]**

Angle of impact $\theta$ below the horizontal:
$\tan\theta = \frac{|v_y|}{|v_x|} = \frac{36.827...}{21.65...} = 1.700...$
$\theta = 59.53...^\circ$
Angle of impact is $59.5^\circ$ below the horizontal. **[A1]**

### Standard Solution Steps
1.  **Resolve Initial Velocity**: Split the initial velocity $U$ into horizontal ($u_x = U\cos\alpha$) and vertical ($u_y = U\sin\alpha$) components.
2.  **Define Origin and Direction**: Establish a clear coordinate system. Typically, the point of projection is the origin for initial calculations, with 'up' as the positive vertical direction. This means $a_y = -g$ and displacement to a point below the start is negative.
3.  **Analyse Vertical and Horizontal Motion Separately**:
    *   **Vertical**: Use the `suvat` equations with $a = -10 \text{ m s}^{-2}$. This is used to find time of flight, maximum height, or final vertical velocity.
    *   **Horizontal**: Use the `suvat` equations with $a = 0 \text{ m s}^{-2}$ (i.e., $s_x = u_x t$). This is used to find the range.
4.  **Solve for the Unknowns**: Use the variable that links the two motions: *time* ($t$).
5.  **Calculate Final Speed/Angle**: If required, find the final velocity components ($v_x$ and $v_y$) at the point of impact. Combine them using Pythagoras' theorem for speed ($V = \sqrt{v_x^2 + v_y^2}$) and trigonometry for the angle ($\tan\theta = |v_y/v_x|$).

### Common Mistakes
*   **Sign Convention Errors**: The most common mistake. Forgetting that displacement is negative when the particle lands below its starting point (e.g., writing $s_y = 60$ instead of $s_y = -60$).
*   **Premature Rounding**: Using a rounded value for the time of flight from part (b) to calculate the range in part (c), leading to accuracy errors. Use the full calculator value.
*   **Confusing Height Calculations**: Forgetting to add the initial height of the cliff when calculating the *greatest height above sea level*.
*   **Incorrect Angle Calculation**: Stating the final angle without specifying its direction (e.g., 'below the horizontal'). Or, calculating $\tan\theta = v_x/v_y$.

### Tags
`projectile motion`, `suvat`, `kinematics`, `cliff`, `range`, `time of flight`, `impact velocity`

---
---

## FM.1: Projectile Motion on an Inclined Plane

**Syllabus Reference**: 3.1
**Learning Objective**: To model the motion of a projectile on an inclined plane by resolving gravity into components parallel and perpendicular to the plane.

### Example Question

A particle is projected from a point $O$ on a smooth plane which is inclined at an angle of $20^\circ$ to the horizontal. The particle is projected up the plane with initial velocity $30 \text{ m s}^{-1}$ at an angle of $45^\circ$ to the plane.

(a) Show that the acceleration components parallel and perpendicular to the plane are $-10\sin20^\circ$ and $-10\cos20^\circ$ respectively. [2]
(b) Find the time of flight of the particle (the time until it strikes the plane again). [3]
(c) Determine the range of the particle up the inclined plane. [3]
(d) Find the maximum perpendicular distance from the plane reached by the particle during its flight. [3]

*(Assume g = 10 m s⁻²)*

### Mark Scheme / Solution

**(a) Show that the acceleration components parallel and perpendicular to the plane are $-10\sin20^\circ$ and $-10\cos20^\circ$ respectively.**



Gravity, $g=10$, acts vertically downwards.
Let the direction up the plane be the positive $x'$-axis, and perpendicular to the plane (outwards) be the positive $y'$-axis.

The angle between the vertical and the normal to the plane is $20^\circ$.
Component of $g$ perpendicular to the plane: $g_\perp = -g \cos 20^\circ = -10 \cos 20^\circ$. **[B1]** - Correctly resolves perpendicular component with sign.
Component of $g$ parallel to the plane: $g_\parallel = -g \sin 20^\circ = -10 \sin 20^\circ$. **[B1]** - Correctly resolves parallel component with sign.

---
**(b) Find the time of flight of the particle.**

Resolve initial velocity:
$u_{x'} = 30 \cos 45^\circ = 15\sqrt{2}$
$u_{y'} = 30 \sin 45^\circ = 15\sqrt{2}$

Consider motion perpendicular to the plane. The particle strikes the plane when its perpendicular displacement $s_{y'}$ is 0.
$u = 15\sqrt{2}$, $a = -10\cos20^\circ \approx -9.397$, $s = 0$.
Using $s = ut + \frac{1}{2}at^2$:
$0 = (15\sqrt{2})t + \frac{1}{2}(-10\cos20^\circ)t^2$ **[M1]** - For applying suvat perp. to plane with $s=0$.
$0 = t(15\sqrt{2} - 5t\cos20^\circ)$

$t=0$ (start) or $t = \frac{15\sqrt{2}}{5\cos20^\circ} = \frac{3\sqrt{2}}{\cos20^\circ}$ **[A1]**
$t = 4.515...$
Time of flight = $4.52 \text{ s}$ (3 s.f.) **[A1]**

---
**(c) Determine the range of the particle up the inclined plane.**

Consider motion parallel to the plane. The range is the displacement $s_{x'}$ at the time of flight.
$u = 15\sqrt{2}$, $a = -10\sin20^\circ \approx -3.420$, $t = 4.515...$
Using $s = ut + \frac{1}{2}at^2$:
$s_{x'} = (15\sqrt{2})(4.515...) + \frac{1}{2}(-10\sin20^\circ)(4.515...)^2$ **[M1]** - For applying suvat parallel to plane with their time from (b).
$s_{x'} = 95.77... - 34.91...$ **[A1]** - Correct substitution/intermediate calculation.
$s_{x'} = 60.85...$
Range = $60.9 \text{ m}$ (3 s.f.) **[A1]**

---
**(d) Find the maximum perpendicular distance from the plane.**

Consider motion perpendicular to the plane. At maximum distance, the perpendicular velocity component $v_{y'}$ is 0.
$u = 15\sqrt{2}$, $a = -10\cos20^\circ$, $v = 0$.
Using $v^2 = u^2 + 2as$:
$0^2 = (15\sqrt{2})^2 + 2(-10\cos20^\circ)s_{y'}$ **[M1]** - For using suvat with $v=0$ perp. to plane.
$0 = 450 - (20\cos20^\circ)s_{y'}$ **[A1]**
$s_{y'} = \frac{450}{20\cos20^\circ} = 23.94...$
Max distance = $23.9 \text{ m}$ (3 s.f.) **[A1]**

### Standard Solution Steps
1.  **Define Axes**: Set up a coordinate system with the x-axis parallel to the inclined plane and the y-axis perpendicular to it.
2.  **Resolve Gravity**: Resolve the acceleration due to gravity ($g$) into components parallel ($a_x = -g\sin\theta$) and perpendicular ($a_y = -g\cos\theta$) to the plane. The signs are negative if the x-axis is *up* the plane and the y-axis is *away* from the plane.
3.  **Resolve Initial Velocity**: Split the initial velocity $U$ into components parallel ($u_x$) and perpendicular ($u_y$) to the plane.
4.  **Calculate Time of Flight**: Analyse the motion perpendicular to the plane. The time of flight is the time when the perpendicular displacement ($s_y$) returns to 0. Use $s_y = u_y t + \frac{1}{2}a_y t^2$.
5.  **Calculate Range**: Analyse the motion parallel to the plane. The range is the parallel displacement ($s_x$) after the time of flight has elapsed. Use $s_x = u_x t + \frac{1}{2}a_x t^2$.
6.  **Calculate Maximum Perpendicular Distance**: Analyse the motion perpendicular to the plane. This occurs when the perpendicular velocity ($v_y$) is 0. Use $v_y^2 = u_y^2 + 2a_y s_y$.

### Common Mistakes
*   **Incorrect Resolution of g**: The most frequent error. Confusing sine and cosine, or getting the signs wrong. A clear diagram is essential. A common mix-up is using $g\cos\theta$ for the parallel component and $g\sin\theta$ for the perpendicular.
*   **Using Horizontal/Vertical Components**: Applying standard horizontal and vertical `suvat` instead of resolving relative to the plane. This method is much more complex and prone to error.
*   **Mixing Components**: Using the parallel acceleration with the perpendicular velocity, or vice versa.
*   **Time of Flight Error**: Calculating the time to the highest point and doubling it. This only works if the particle lands at the same vertical height, which is not the case for inclined planes unless projection is perpendicular to the slope. The correct method is to set perpendicular displacement to zero.

### Tags
`projectile motion`, `inclined plane`, `resolving forces`, `time of flight`, `range`, `kinematics`