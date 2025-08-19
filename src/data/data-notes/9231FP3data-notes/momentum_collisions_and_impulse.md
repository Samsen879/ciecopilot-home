## FM.6: Momentum, Collisions, and Impulse

**Syllabus Reference**: 3.6
**Learning Objective**: To apply the principles of conservation of linear momentum and Newton's law of restitution to direct and oblique collisions between particles or a particle and a fixed surface.

---

### Direct Collisions: Conservation of Momentum and NEL

#### Example Question

Two smooth spheres, A and B, of masses $2$ kg and $3$ kg respectively, are moving in the same direction along the same straight line on a smooth horizontal surface. Sphere A has a speed of $5 \text{ m s}^{-1}$ and sphere B has a speed of $2 \text{ m s}^{-1}$, with A following B. The coefficient of restitution between the spheres is $0.6$.

(i) Find the speeds of A and B immediately after the collision. [5]
(ii) Calculate the total loss of kinetic energy due to the collision. [3]
(iii) Find the magnitude of the impulse exerted by A on B. [2]

#### Mark Scheme / Solution

Let the velocities of A and B after the collision be $v_A$ and $v_B$ respectively. The positive direction is the initial direction of motion.

**(i) Find the speeds of A and B immediately after the collision.**

**Conservation of Linear Momentum (CLM):**
$m_A u_A + m_B u_B = m_A v_A + m_B v_B$
$(2)(5) + (3)(2) = 2v_A + 3v_B$ **[M1]** - For applying CLM correctly.
$10 + 6 = 2v_A + 3v_B$
$16 = 2v_A + 3v_B$ --- (1) **[A1]**

**Newton's Experimental Law (NEL):**
$v_B - v_A = -e(u_B - u_A) \quad \text{or} \quad v_B - v_A = e(u_A - u_B)$
$v_B - v_A = 0.6(5 - 2)$ **[M1]** - For applying NEL correctly.
$v_B - v_A = 0.6(3) = 1.8$ --- (2)

Solving simultaneously:
From (2), $v_B = v_A + 1.8$. Substitute into (1):
$16 = 2v_A + 3(v_A + 1.8)$ **[M1]** - For a valid attempt to solve the simultaneous equations.
$16 = 2v_A + 3v_A + 5.4$
$10.6 = 5v_A \implies v_A = 2.12 \text{ m s}^{-1}$

Substitute $v_A$ back into (2):
$v_B = 2.12 + 1.8 = 3.92 \text{ m s}^{-1}$

The speed of A is $2.12 \text{ m s}^{-1}$ and the speed of B is $3.92 \text{ m s}^{-1}$. **[A1]** - For both correct speeds.

---
**(ii) Calculate the total loss of kinetic energy due to the collision.**

KE before = $\frac{1}{2}m_A u_A^2 + \frac{1}{2}m_B u_B^2$
$= \frac{1}{2}(2)(5)^2 + \frac{1}{2}(3)(2)^2 = 25 + 6 = 31 \text{ J}$ **[M1]** - For calculating initial KE.

KE after = $\frac{1}{2}m_A v_A^2 + \frac{1}{2}m_B v_B^2$
$= \frac{1}{2}(2)(2.12)^2 + \frac{1}{2}(3)(3.92)^2 = 4.4944 + 23.0496 = 27.544 \text{ J}$ **[M1]** - For calculating final KE using their velocities.

Loss in KE = KE before - KE after
$= 31 - 27.544 = 3.456 \text{ J}$
Loss in KE = $3.46 \text{ J}$ (3 s.f.) **[A1]**

---
**(iii) Find the magnitude of the impulse exerted by A on B.**

Impulse is the change in momentum. We can calculate this for either sphere.
Impulse on B = $m_B v_B - m_B u_B$
$= 3(3.92) - 3(2)$ **[M1]** - For applying the impulse-momentum principle to one sphere.
$= 11.76 - 6 = 5.76$

The magnitude of the impulse is $5.76 \text{ Ns}$. **[A1]**

#### Standard Solution Steps
1.  **Diagram and Direction**: Draw a simple "before" and "after" diagram. Define a positive direction for velocity.
2.  **Apply CLM**: Form an equation using the principle of Conservation of Linear Momentum (`Total momentum before = Total momentum after`).
3.  **Apply NEL**: Form a second equation using Newton's Experimental Law (`Speed of separation = e × Speed of approach`). Be careful with the signs and order of subtraction.
4.  **Solve Equations**: Solve the two linear simultaneous equations to find the final velocities.
5.  **Calculate KE Loss**: Find the total kinetic energy before the collision and after the collision. The loss is the difference between these two values.
6.  **Calculate Impulse**: Find the change in momentum (`mv - mu`) for one of the particles. The impulse on the other particle is equal in magnitude and opposite in direction.

#### Common Mistakes
*   **Sign Errors**: Incorrectly assigning signs to velocities, especially if one particle is initially moving in the opposite direction.
*   **NEL Errors**: Applying Newton's Law incorrectly, for example `v_A - v_B = e(u_A - u_B)`. The order of subtraction must be consistent (`v_B - v_A` relates to `u_A - u_B`).
*   **KE Calculation**: Squaring the sum of masses or speeds instead of summing the individual KE terms.
*   **Impulse Calculation**: Mixing up initial and final momentum (`mu - mv`) or calculating the change in velocity and forgetting to multiply by mass.

#### Tags
`direct collision`, `conservation of momentum`, `newtons law of restitution`, `impulse`, `kinetic energy`, `FM.6`

---
---

### Oblique Collisions

#### Example Question

A smooth sphere P of mass $2m$ moving with speed $u$ on a smooth horizontal surface collides with a smooth sphere Q of mass $m$ which is at rest. The direction of motion of P before impact makes an angle of $60^\circ$ with the line of centres of the spheres. The coefficient of restitution between the spheres is $e = \frac{1}{2}$.

Find, in terms of $u$:
(i) the velocity of P after the collision. [8]
(ii) the velocity of Q after the collision. [2]
(iii) the loss in kinetic energy due to the collision. [3]

#### Mark Scheme / Solution

Let the line of centres be the x-axis. We resolve the initial velocity of P into components parallel and perpendicular to the line of centres.

**Initial Velocities:**
$u_{Px} = u \cos 60^\circ = \frac{1}{2}u$
$u_{Py} = u \sin 60^\circ = \frac{\sqrt{3}}{2}u$
$u_{Qx} = 0, \quad u_{Qy} = 0$

**Component perpendicular to line of centres is unchanged:**
For smooth spheres, the velocity component perpendicular to the line of centres remains constant for each sphere.
$v_{Py} = u_{Py} = \frac{\sqrt{3}}{2}u$ **[B1]**
$v_{Qy} = u_{Qy} = 0$ **[B1]**

**Apply CLM along the line of centres (x-direction):**
$(2m)u_{Px} + (m)u_{Qx} = (2m)v_{Px} + (m)v_{Qx}$
$(2m)(\frac{1}{2}u) + 0 = 2mv_{Px} + mv_{Qx}$ **[M1]**
$u = 2v_{Px} + v_{Qx}$ --- (1) **[A1]**

**Apply NEL along the line of centres (x-direction):**
$v_{Qx} - v_{Px} = e(u_{Px} - u_{Qx})$
$v_{Qx} - v_{Px} = \frac{1}{2}(\frac{1}{2}u - 0)$ **[M1]**
$v_{Qx} - v_{Px} = \frac{1}{4}u$ --- (2)

**Solve for $v_{Px}$ and $v_{Qx}$:**
From (2), $v_{Qx} = v_{Px} + \frac{1}{4}u$. Substitute into (1):
$u = 2v_{Px} + (v_{Px} + \frac{1}{4}u)$ **[M1]**
$u = 3v_{Px} + \frac{1}{4}u$
$\frac{3}{4}u = 3v_{Px} \implies v_{Px} = \frac{1}{4}u$

Substitute back into (2):
$v_{Qx} - \frac{1}{4}u = \frac{1}{4}u \implies v_{Qx} = \frac{1}{2}u$

**(i) Find the velocity of P after the collision.**

Final velocity components of P are $v_{Px} = \frac{1}{4}u$ and $v_{Py} = \frac{\sqrt{3}}{2}u$.
Speed of P: $|v_P| = \sqrt{(\frac{1}{4}u)^2 + (\frac{\sqrt{3}}{2}u)^2} = \sqrt{\frac{1}{16}u^2 + \frac{3}{4}u^2} = \sqrt{\frac{1+12}{16}u^2} = \frac{\sqrt{13}}{4}u$ **[A1]**
Angle $\theta_P$ with the line of centres: $\tan\theta_P = \frac{v_{Py}}{|v_{Px}|} = \frac{\sqrt{3}/2 u}{1/4 u} = 2\sqrt{3}$
$\theta_P = \arctan(2\sqrt{3}) = 73.9^\circ$
The velocity of P is $\frac{\sqrt{13}}{4}u$ at an angle of $73.9^\circ$ to the line of centres. **[A1]**

---
**(ii) Find the velocity of Q after the collision.**

Final velocity components of Q are $v_{Qx} = \frac{1}{2}u$ and $v_{Qy} = 0$.
The velocity of Q is $\frac{1}{2}u$ along the line of centres. **[A1]** (M1 implied by correct use of components)

---
**(iii) Find the loss in kinetic energy due to the collision.**

KE before = $\frac{1}{2}(2m)u^2 + 0 = mu^2$ **[B1]**

KE after = $\frac{1}{2}(2m)|v_P|^2 + \frac{1}{2}(m)|v_Q|^2$
$= m(\frac{13}{16}u^2) + \frac{1}{2}m(\frac{1}{2}u)^2$ **[M1]**
$= \frac{13}{16}mu^2 + \frac{1}{2}m(\frac{1}{4}u^2) = \frac{13}{16}mu^2 + \frac{1}{8}mu^2 = \frac{15}{16}mu^2$

Loss in KE = $mu^2 - \frac{15}{16}mu^2 = \frac{1}{16}mu^2$ **[A1]**

#### Standard Solution Steps
1.  **Set up Coordinate System**: Define axes parallel and perpendicular to the line of centres.
2.  **Resolve Initial Velocities**: Resolve the initial velocity of the moving particle(s) into components along these two axes.
3.  **Perpendicular Components**: State that the velocity components perpendicular to the line of centres are unchanged for both spheres. This is a crucial step for smooth spheres.
4.  **Apply CLM**: Apply the Conservation of Linear Momentum principle to the components *along the line of centres*.
5.  **Apply NEL**: Apply Newton's Experimental Law to the components *along the line of centres*.
6.  **Solve for Components**: Solve the simultaneous equations from CLM and NEL to find the final velocity components along the line of centres.
7.  **Reconstitute Velocities**: Combine the parallel and perpendicular components for each sphere using Pythagoras' theorem (for speed) and trigonometry (for direction) to find the final velocities.
8.  **Calculate KE Loss**: Find the total KE before and after, then find the difference.

#### Common Mistakes
*   **Incorrect Resolution**: Resolving the initial velocity incorrectly (mixing up sine and cosine). A clear diagram is essential.
*   **Applying CLM/NEL to wrong components**: Forgetting that CLM and NEL only apply along the line of centres.
*   **Changing Perpendicular Component**: Incorrectly altering the velocity component perpendicular to the line of centres.
*   **Vector Combination**: Errors in using Pythagoras' theorem or trigonometry when reconstituting the final velocity vectors from their components.
*   **KE Calculation**: Using only the component along the line of centres to calculate kinetic energy. The total speed must be used.

#### Tags
`oblique collision`, `conservation of momentum`, `newtons law of restitution`, `resolving velocity`, `kinetic energy`, `FM.6`