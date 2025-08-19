# CAIE A Level Further Mathematics: Generated Questions
## File: `motion_of_a_projectile_fm1.md`

---
### **Question 1**

**Syllabus Reference**
*   9231/3.1 Motion of a Projectile

**Learning Objective**
*   To derive the Cartesian equation of a projectile's trajectory and use it to solve problems involving initial projection from a height.

**Difficulty Profile**
*   Difficulty: Medium
*   Marks: 9

**Cognitive Skills**
*   Modelling
*   Algebraic Manipulation
*   Problem Solving
*   Application of Formulae

**Keywords**
*   Projectile, Trajectory, Cartesian Equation, Range, SUVAT, Projection from height

#### **Question**
A small ball is projected from a point $A$ at the top of a vertical cliff of height $60 \text{ m}$. The initial velocity of the ball is $25 \text{ m s}^{-1}$ at an angle of $\alpha$ above the horizontal, where $\tan\alpha = \frac{3}{4}$. The ball moves freely under gravity and hits the sea at a point $B$. The point $O$ is at the base of the cliff, directly below $A$. You may assume the value of $g$ is $10 \text{ m s}^{-2}$.

(a) Show that the equation of the trajectory of the ball, with the origin at $A$, is $y = \frac{3}{4}x - \frac{1}{80}x^2$. [4]

(b) Find the horizontal distance from the base of the cliff to the point $B$ where the ball hits the sea. [3]

(c) Determine the speed of the ball just before it hits the sea at $B$. [2]

---
#### **Mark Scheme / Solution**

**(a) Deriving the equation of the trajectory**

*   Resolve initial velocity:
    Since $\tan\alpha = \frac{3}{4}$, we can form a 3-4-5 triangle.
    $\sin\alpha = \frac{3}{5}$ and $\cos\alpha = \frac{4}{5}$.
    Initial horizontal velocity $u_x = 25 \cos\alpha = 25 \times \frac{4}{5} = 20 \text{ m s}^{-1}$.
    Initial vertical velocity $u_y = 25 \sin\alpha = 25 \times \frac{3}{5} = 15 \text{ m s}^{-1}$.
    **[B1]** - For both correct components of velocity.

*   Horizontal motion (constant velocity):
    $x = u_x t \implies x = 20t$.
    From this, $t = \frac{x}{20}$.
    **[M1]** - For using horizontal motion to express $t$ in terms of $x$.

*   Vertical motion (constant acceleration $a_y = -g = -10$):
    Using $s_y = u_y t + \frac{1}{2}a_y t^2$, with $y$ being the vertical displacement from $A$.
    $y = 15t - \frac{1}{2}(10)t^2 = 15t - 5t^2$.
    **[M1]** - For a correct attempt at the vertical displacement equation.

*   Substitute $t = \frac{x}{20}$ into the vertical motion equation:
    $y = 15\left(\frac{x}{20}\right) - 5\left(\frac{x}{20}\right)^2$
    $y = \frac{3}{4}x - 5\left(\frac{x^2}{400}\right)$
    $y = \frac{3}{4}x - \frac{x^2}{80}$. (AG - Answer Given)
    **[A1]** - For correct substitution and simplification to the given answer.

**(b) Finding the horizontal distance to point B**

*   The ball hits the sea when its vertical displacement from A is $-60 \text{ m}$.
    Set $y = -60$ in the trajectory equation.
    $-60 = \frac{3}{4}x - \frac{1}{80}x^2$.
    **[M1]** - For correctly identifying $y = -60$ and substituting into the trajectory equation.

*   Rearrange into a quadratic equation:
    $\frac{1}{80}x^2 - \frac{3}{4}x - 60 = 0$.
    Multiply by 80: $x^2 - 60x - 4800 = 0$.
    **[M1]** - For forming a correct three-term quadratic equation.

*   Solve the quadratic. Using the formula or factorization:
    $(x - 120)(x + 40) = 0$.
    Since horizontal distance $x$ must be positive, $x = 120$.
    The horizontal distance $OB$ is $120 \text{ m}$.
    **[A1]** - For the correct distance.

**(c) Finding the final speed**

*   Horizontal velocity at $B$ is constant: $v_x = 20 \text{ m s}^{-1}$.
*   Find the time of flight to $B$: $t = \frac{x}{20} = \frac{120}{20} = 6 \text{ s}$.
*   Vertical velocity at $B$: $v_y = u_y + a_y t = 15 - 10(6) = -45 \text{ m s}^{-1}$.
    **[M1]** - For finding the vertical component of velocity at $B$.

*   Final speed $v = \sqrt{v_x^2 + v_y^2} = \sqrt{20^2 + (-45)^2}$.
    $v = \sqrt{400 + 2025} = \sqrt{2425} = 49.244...$
    The final speed is $49.2 \text{ m s}^{-1}$ (3 s.f.).
    **[A1]** - For the correct final speed.

---
**Standard Solution Steps**
1.  Resolve the initial velocity vector into horizontal ($u_x$) and vertical ($u_y$) components.
2.  Write parametric equations for motion: $x(t)$ using $a_x=0$, and $y(t)$ using $a_y=-g$.
3.  Eliminate the time parameter $t$ to derive the Cartesian equation $y(x)$.
4.  To find where the particle lands, substitute the final vertical displacement ($y=-h$) into the trajectory equation.
5.  Solve the resulting quadratic equation for $x$ to find the range.
6.  To find the final speed, calculate the final vertical velocity $v_y$ (using time of flight or $v^2=u^2+2as$) and combine it with the constant horizontal velocity $v_x$ using Pythagoras' theorem.

**Teaching Insights**
*   Emphasise the independence of horizontal and vertical motion. This is the foundational concept.
*   The derivation of the trajectory equation is a standard procedure. Ensure students can perform the substitution and algebraic simplification fluently. Using $1 + \tan^2\alpha \equiv \sec^2\alpha$ is often required when the angle is the unknown.
*   Sign conventions are crucial. A common convention is to take the point of projection as the origin, with $x$ positive horizontally and $y$ positive vertically upwards. Any displacement below the origin is therefore negative.
*   An alternative method for part (c) is using conservation of energy:
    Initial Energy (at A) = Final Energy (at B)
    $\frac{1}{2}mU^2 + mgh = \frac{1}{2}mv_B^2$
    $\frac{1}{2}m(25^2) + m(10)(60) = \frac{1}{2}mv_B^2$
    $\frac{1}{2}(625) + 600 = \frac{1}{2}v_B^2 \implies 312.5 + 600 = 0.5 v_B^2 \implies v_B^2 = 2 \times 912.5 = 1825$. This gives $v_B = 42.7$ which is incorrect. Ah, the energy method in (c) is a good check. My velocity calculation gave $v^2=2425$. Let's recheck the energy. The cliff height is 60m.
    $\frac{1}{2}mU^2 + mgh = \frac{1}{2}mv^2$
    $U=25$, $h=60$, $g=10$.
    $\frac{1}{2}(25^2) + 10(60) = \frac{1}{2}v^2$
    $\frac{625}{2} + 600 = \frac{1}{2}v^2$
    $312.5 + 600 = 0.5v^2$
    $912.5 = 0.5v^2$
    $v^2 = 1825$. Wait.
    Let's recheck my kinematics calculation.
    $v_x = 20$. $v_y = 15 - 10(6) = -45$.
    $v^2 = v_x^2 + v_y^2 = 20^2 + (-45)^2 = 400 + 2025 = 2425$.
    There is a discrepancy. Let me check my energy calculation again.
    Oh, I see my mistake. The problem statement has $h=60$. In my head, I may have used a different value. Let's trace it.
    The point A is at the top of a cliff of height 60m. The origin for the trajectory equation is point A. The sea is at $y=-60$.
    Wait, let me re-read my own work.
    $v^2=2425$ from kinematics. $v=49.2$.
    Energy: initial KE = $0.5m(25^2) = 312.5m$. Initial PE (relative to sea level) = $m(10)(60) = 600m$. Total Initial = $912.5m$.
    Final Energy (at B): Final KE = $0.5mv^2$. Final PE = 0.
    So $912.5m = 0.5mv^2 \implies v^2 = 1825$.
    Why is there a mismatch? Let me re-read the question I wrote. "projected from a point A at the top of a vertical cliff of height 60m". "initial velocity is 25 m/s". "angle alpha above horizontal".
    Okay, let's re-calculate $v_y$ at $B$ using a different kinematic equation to be sure.
    $v_y^2 = u_y^2 + 2as_y = 15^2 + 2(-10)(-60) = 225 + 1200 = 1425$.
    So $v_y = -\sqrt{1425}$.
    Then $v^2 = v_x^2 + v_y^2 = 20^2 + 1425 = 400 + 1425 = 1825$.
    The energy method result is correct. My previous calculation for $v_y$ using time was wrong. Let me check the time calculation.
    $x=120$. $t = x/u_x = 120/20 = 6$s. This seems correct.
    Let me check $v_y = u_y + at$. $v_y = 15 - 10(6) = 15 - 60 = -45$.
    So $v_y^2 = (-45)^2 = 2025$.
    Why did $v_y^2 = u_y^2 + 2as_y$ give a different result?
    $u_y=15, a=-10, s_y=-60$.
    $v_y^2 = 15^2 + 2(-10)(-60) = 225 + 1200 = 1425$.
    The error is somewhere in my chain of reasoning. Let me trace part (b).
    $y=-60$. $-60 = \frac{3}{4}x - \frac{x^2}{80}$. $x^2 - 60x - 4800 = 0$.
    Does $(x-120)(x+40) = x^2 - 120x + 40x - 4800 = x^2 - 80x - 4800$.
    Ah, the factorization is wrong. The roots are not integers. My quadratic solver was faulty.
    $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} = \frac{60 \pm \sqrt{(-60)^2 - 4(1)(-4800)}}{2} = \frac{60 \pm \sqrt{3600 + 19200}}{2} = \frac{60 \pm \sqrt{22800}}{2}$.
    $\sqrt{22800} = \sqrt{400 \times 57} = 20\sqrt{57}$.
    $x = \frac{60 \pm 20\sqrt{57}}{2} = 30 \pm 10\sqrt{57}$.
    Since $x>0$, $x = 30 + 10\sqrt{57} \approx 30 + 10(7.55) = 105.5$.
    So the horizontal distance is $105.5$m.

    Let me correct the entire solution. The error analysis will be valuable. This is a perfect example of a cascading error from a simple mistake in factorization.

**(c) Finding the final speed - Corrected**
*   From part (b), the horizontal distance is $x = 30 + 10\sqrt{57}$.
*   Horizontal velocity at $B$ is constant: $v_x = 20 \text{ m s}^{-1}$.
*   Vertical velocity at $B$: Using $v_y^2 = u_y^2 + 2as_y$ is independent of part (b) and thus safer.
    $v_y^2 = (15)^2 + 2(-10)(-60) = 225 + 1200 = 1425$.
    **[M1]** - For finding the vertical component of velocity squared.

*   Final speed $v = \sqrt{v_x^2 + v_y^2} = \sqrt{20^2 + 1425}$.
    $v = \sqrt{400 + 1425} = \sqrt{1825} = 42.72...$
    The final speed is $42.7 \text{ m s}^{-1}$ (3 s.f.).
    **[A1]** - For the correct final speed.

    **(b) Finding the horizontal distance to point B - Corrected**
*   The ball hits the sea when its vertical displacement from A is $-60 \text{ m}$.
    Set $y = -60$ in the trajectory equation.
    $-60 = \frac{3}{4}x - \frac{1}{80}x^2$.
    **[M1]** - For correctly identifying $y = -60$ and substituting.

*   Rearrange into a quadratic equation:
    $\frac{1}{80}x^2 - \frac{3}{4}x - 60 = 0$.
    Multiply by 80: $x^2 - 60x - 4800 = 0$.
    **[M1]** - For forming a correct three-term quadratic equation.

*   Solve the quadratic using the formula, as it does not factorise into integers:
    $x = \frac{-(-60) \pm \sqrt{(-60)^2 - 4(1)(-4800)}}{2(1)} = \frac{60 \pm \sqrt{3600 + 19200}}{2}$
    $x = \frac{60 \pm \sqrt{22800}}{2}$.
    Since horizontal distance $x$ must be positive, we take the positive root.
    $x = \frac{60 + \sqrt{22800}}{2} = 105.49...$
    The horizontal distance is $105 \text{ m}$ (3 s.f.).
    **[A1]** - For the correct distance.

Okay, now the solution is consistent and correct. I will put this corrected version into the final output. The insight about using the energy method or the time-independent kinematic equation is now even more valuable.

---
**Teaching Insights**
*   Emphasise the independence of horizontal and vertical motion. This is the foundational concept.
*   The derivation of the trajectory equation is a standard procedure. Ensure students can perform the substitution and algebraic simplification fluently.
*   Sign conventions are crucial. A common convention is to take the point of projection as the origin, with $x$ positive horizontally and $y$ positive vertically upwards. Any displacement below the origin is therefore negative.
*   When finding the final speed, using an energy conservation argument or a time-independent kinematic equation (like $v_y^2 = u_y^2 + 2as_y$) can be more robust than methods that depend on a previously calculated time of flight, which may itself be subject to error. This provides an excellent opportunity to discuss self-checking and using independent methods.

**Error Analysis**
*   **Sign Errors:** The most common error is incorrect handling of signs for displacement and acceleration. Students may use $y = 60$ instead of $y = -60$, or $a_y = 10$ instead of $a_y = -10$.
*   **Component Errors:** Incorrectly resolving the initial velocity (e.g., swapping sin and cos).
*   **Quadratic Formula Errors:** Arithmetic mistakes when substituting into or simplifying the quadratic formula.
*   **Cascading Errors:** As demonstrated in the correction process, an error in solving the quadratic for $x$ in part (b) would lead to an incorrect time of flight, which would then lead to an incorrect final velocity in part (c) if using a time-dependent method. This highlights the importance of accuracy at each step.

**Alternative Methods**
*   **Part (b):** One could first solve for the time of flight to $y = -60$ using $s_y = u_y t + \frac{1}{2}a_y t^2$, which gives $-60 = 15t - 5t^2$. This yields the quadratic $5t^2 - 15t - 60 = 0$ or $t^2 - 3t - 12 = 0$. Solving for $t > 0$ gives $t = \frac{3+\sqrt{57}}{2}$. The horizontal range is then $x = u_x t = 20 \left(\frac{3+\sqrt{57}}{2}\right) = 10(3+\sqrt{57}) = 30+10\sqrt{57}$, which matches the other method.
*   **Part (c):** As noted in Teaching Insights, conservation of energy can be used.
    Initial Energy (at A, relative to sea level) = $\frac{1}{2}m(25^2) + mg(60)$.
    Final Energy (at B) = $\frac{1}{2}mv^2$.
    Equating them: $\frac{1}{2}v^2 = \frac{1}{2}(625) + 10(60) = 312.5 + 600 = 912.5$.
    $v^2 = 1825 \implies v = \sqrt{1825} \approx 42.7 \text{ m s}^{-1}$.

**Follow-up Questions**
1.  Find the angle the ball's velocity vector makes with the horizontal just before it hits the sea.
2.  Calculate the greatest height the ball reaches above sea level.
3.  If the cliff were higher, what is the maximum possible horizontal range for this projection speed?

**API Integration Fields**
*   UniqueID: FM-PROJ-9231-001
*   Version: 1.1
*   Author: CAIE Specialist AI
*   Last Updated: 2025-08-08

**Tags**
*   Projectile Motion, Trajectory Equation, Quadratic, Kinematics, SUVAT, Further Mechanics

---
### **Question 2**

**Syllabus Reference**
*   9231/3.1 Motion of a Projectile

**Learning Objective**
*   To model the motion of a projectile on an inclined plane by resolving gravity into components parallel and perpendicular to the plane.

**Difficulty Profile**
*   Difficulty: Hard
*   Marks: 11

**Cognitive Skills**
*   Modelling
*   Coordinate System Transformation
*   Trigonometry
*   Problem Solving

**Keywords**
*   Projectile, Inclined Plane, Range on a plane, Resolving forces, Time of flight

#### **Question**
A particle is projected with a speed of $40 \text{ m s}^{-1}$ from a point $O$ at the bottom of a smooth plane. The plane is inclined at an angle of $30^\circ$ to the horizontal. The particle is projected at an angle of $45^\circ$ to the plane, so its initial direction of motion makes an angle of $75^\circ$ with the horizontal. The particle moves in a vertical plane containing a line of greatest slope of the inclined plane. The particle hits the plane at a point $A$. Take $g = 10 \text{ m s}^{-2}$.

(a) Find the time of flight from $O$ to $A$. [5]

(b) Calculate the range of the projectile, i.e., the distance $OA$. [3]

(c) Determine the greatest perpendicular distance of the particle from the plane during its flight. [3]

---
#### **Mark Scheme / Solution**

**(a) Finding the time of flight**

*   Set up a coordinate system with the $x$-axis along the plane (from $O$ to $A$) and the $y$-axis perpendicular to the plane.
*   Resolve the initial velocity relative to these axes:
    $u_x = 40 \cos(45^\circ) = 40 \times \frac{\sqrt{2}}{2} = 20\sqrt{2} \text{ m s}^{-1}$.
    $u_y = 40 \sin(45^\circ) = 40 \times \frac{\sqrt{2}}{2} = 20\sqrt{2} \text{ m s}^{-1}$.
    **[B1]** - For both correct components of initial velocity.

*   Resolve the acceleration due to gravity ($g=10$) into components parallel and perpendicular to the plane:
    $a_x = -g \sin(30^\circ) = -10 \times \frac{1}{2} = -5 \text{ m s}^{-2}$.
    $a_y = -g \cos(30^\circ) = -10 \times \frac{\sqrt{3}}{2} = -5\sqrt{3} \text{ m s}^{-2}$.
    **[M1]** - For attempting to resolve $g$ parallel and perpendicular to the plane.
    **[A1]** - For both correct components of acceleration (signs must be correct).

*   The particle hits the plane at $A$ when its displacement perpendicular to the plane ($s_y$) is zero. Use $s_y = u_y t + \frac{1}{2}a_y t^2$.
    $0 = (20\sqrt{2})t + \frac{1}{2}(-5\sqrt{3})t^2$.
    **[M1]** - For setting up the perpendicular displacement equation and setting $s_y = 0$.

*   $0 = t(20\sqrt{2} - \frac{5\sqrt{3}}{2}t)$.
    Since $t>0$ for the time of flight:
    $20\sqrt{2} = \frac{5\sqrt{3}}{2}t \implies t = \frac{40\sqrt{2}}{5\sqrt{3}} = \frac{8\sqrt{2}}{\sqrt{3}} = \frac{8\sqrt{6}}{3}$.
    $t = 6.531...$
    Time of flight is $6.53 \text{ s}$ (3 s.f.).
    **[A1]** - For the correct time of flight.

**(b) Calculating the range OA**

*   The range is the displacement along the plane ($s_x$) at the time of flight. Use $s_x = u_x t + \frac{1}{2}a_x t^2$.
    $s_x = (20\sqrt{2})\left(\frac{8\sqrt{6}}{3}\right) + \frac{1}{2}(-5)\left(\frac{8\sqrt{6}}{3}\right)^2$.
    **[M1]** - For substituting the time of flight into the parallel displacement equation.

*   $s_x = \frac{160\sqrt{12}}{3} - \frac{5}{2}\left(\frac{64 \times 6}{9}\right) = \frac{160 \times 2\sqrt{3}}{3} - \frac{5}{2}\left(\frac{128}{3}\right)$.
    $s_x = \frac{320\sqrt{3}}{3} - \frac{320}{3} = \frac{320}{3}(\sqrt{3} - 1)$.
    $s_x = 78.1...$
    The range $OA$ is $78.1 \text{ m}$ (3 s.f.).
    **[A1]** - For the correct expression for the range.
    **[A1]** - For the correct final answer to 3 s.f.

**(c) Greatest perpendicular distance from the plane**

*   The greatest perpendicular distance occurs when the velocity component perpendicular to the plane ($v_y$) is zero.
    Use $v_y = u_y + a_y t$.
    $0 = 20\sqrt{2} + (-5\sqrt{3})t \implies t = \frac{20\sqrt{2}}{5\sqrt{3}} = \frac{4\sqrt{6}}{3}$.
    **[M1]** - For setting $v_y=0$ to find the time to max height.

*   Substitute this time into the $s_y$ equation. Alternatively, use $v_y^2 = u_y^2 + 2a_y s_y$.
    $0^2 = (20\sqrt{2})^2 + 2(-5\sqrt{3})s_y$.
    **[M1]** - For using a valid method to find the max perpendicular displacement.

*   $0 = 800 - 10\sqrt{3} s_y$.
    $s_y = \frac{800}{10\sqrt{3}} = \frac{80}{\sqrt{3}} = \frac{80\sqrt{3}}{3}$.
    $s_y = 46.18...$
    The greatest perpendicular distance is $46.2 \text{ m}$ (3 s.f.).
    **[A1]** - For the correct distance.

---
**Standard Solution Steps**
1.  Establish a coordinate system parallel and perpendicular to the inclined plane. This is the crucial first step.
2.  Resolve the initial velocity $U$ into components $u_x$ and $u_y$ relative to this new coordinate system.
3.  Resolve the acceleration due to gravity $g$ into components $a_x = -g\sin\beta$ and $a_y = -g\cos\beta$, where $\beta$ is the angle of the plane.
4.  To find the time of flight, solve the equation for perpendicular motion $s_y = u_y t + \frac{1}{2}a_y t^2 = 0$.
5.  To find the range, substitute the time of flight into the equation for parallel motion $s_x = u_x t + \frac{1}{2}a_x t^2$.
6.  To find the maximum perpendicular distance, find the point where the perpendicular velocity component $v_y=0$.

**Teaching Insights**
*   This topic is a significant step up from level-ground projectiles. The main difficulty is conceptual: students must understand that the acceleration is no longer purely vertical.
*   Drawing a large, clear diagram showing the plane, the initial velocity vector, and the resolved components of $g$ is non-negotiable for success. Encourage students to always start with this.
*   The choice of coordinate system is key. While it is possible to solve this using standard horizontal/vertical axes, it is algebraically far more complex. The rotated coordinate system simplifies the problem definition (e.g., landing occurs at $y=0$).
*   Reinforce the idea that the "suvat" equations still apply, but they must be applied consistently within the new coordinate system with the newly derived components for acceleration.

**Error Analysis**
*   **Resolving g:** The most frequent and critical error. Students may swap sin and cos, or get the signs wrong. A common mistake is to forget to resolve $g$ at all and use $a_x=0, a_y=-g$.
*   **Angle Confusion:** Mixing up the angle of the plane ($\beta=30^\circ$) with the angle of projection relative to the plane ($\theta=45^\circ$).
*   **Calculation Errors:** The expressions involve surds and fractions, increasing the likelihood of arithmetic mistakes. A calculator that handles exact arithmetic can be very helpful.
*   **Premature Rounding:** Rounding the time of flight before using it to calculate the range will lead to accuracy penalties. Exact values should be carried through the working.

**Alternative Methods**
*   It's possible to solve the problem using standard horizontal and vertical axes (relative to the ground). The path is $x = (40 \cos 75^\circ) t$ and $y = (40 \sin 75^\circ) t - 5t^2$. The line representing the plane is $y = (\tan 30^\circ) x$. Finding the intersection of the path and the line gives the landing point, from which range and time of flight can be found. This method is generally more cumbersome and prone to error.

**Follow-up Questions**
1.  Show that the particle lands at right angles to the plane if $\cot\beta = 2\tan\theta$, where $\beta$ is the plane angle and $\theta$ is the projection angle to the plane.
2.  For a fixed speed $U$ and plane angle $\beta$, find the projection angle $\theta$ that gives the maximum possible range up the plane.

**API Integration Fields**
*   UniqueID: FM-PROJ-9231-002
*   Version: 1.0
*   Author: CAIE Specialist AI
*   Last Updated: 2025-08-08

**Tags**
*   Projectile Motion, Inclined Plane, Range, Resolving Vectors, Further Mechanics, Hard

---
### **Question 3**

**Syllabus Reference**
*   9231/3.1 Motion of a Projectile

**Learning Objective**
*   To find the possible angles of projection to hit a specific target, by forming and solving a quadratic equation in $\tan\alpha$.

**Difficulty Profile**
*   Difficulty: Medium-Hard
*   Marks: 8

**Cognitive Skills**
*   Modelling
*   Algebraic Manipulation
*   Trigonometric Identities
*   Problem Solving

**Keywords**
*   Projectile, Trajectory, Angle of Projection, Target, Quadratic in tan(alpha)

#### **Question**
A firefighter is using a hose to spray water on a fire. The water leaves the nozzle of the hose, held at ground level, with a speed of $30 \text{ m s}^{-1}$. The nozzle is aimed at a small window located at a horizontal distance of $45 \text{ m}$ and a vertical height of $20 \text{ m}$ from the nozzle. The water jet is modelled as a projectile moving freely under gravity, with $g = 10 \text{ m s}^{-2}$. Let $\alpha$ be the angle of projection above the horizontal.

(a) Show that the two possible angles of projection, $\alpha_1$ and $\alpha_2$, must satisfy the equation $2\tan^2\alpha - 6\tan\alpha + 3 = 0$. [5]

(b) Find the two possible angles of projection, giving your answers in degrees correct to 1 decimal place. [3]

---
#### **Mark Scheme / Solution**

**(a) Deriving the quadratic equation in tan(alpha)**

*   Start with the standard Cartesian equation for the trajectory of a projectile:
    $y = x\tan\alpha - \frac{gx^2}{2U^2\cos^2\alpha}$.
    **[M1]** - For stating or starting with the correct trajectory equation.

*   Use the trigonometric identity $\frac{1}{\cos^2\alpha} \equiv \sec^2\alpha \equiv 1 + \tan^2\alpha$.
    $y = x\tan\alpha - \frac{gx^2}{2U^2}(1 + \tan^2\alpha)$.
    **[M1]** - For correctly substituting the identity involving $\tan^2\alpha$.

*   Substitute the known values into the equation:
    - Target point $(x, y) = (45, 20)$.
    - Initial speed $U = 30$.
    - Gravity $g = 10$.
    $20 = 45\tan\alpha - \frac{10 \times 45^2}{2 \times 30^2}(1 + \tan^2\alpha)$.
    **[M1]** - For substituting all given values correctly.

*   Simplify the coefficient term:
    $\frac{10 \times 45^2}{2 \times 30^2} = \frac{10 \times 2025}{2 \times 900} = \frac{20250}{1800} = \frac{202.5}{18} = 11.25 = \frac{45}{4}$.
    So, $20 = 45\tan\alpha - \frac{45}{4}(1 + \tan^2\alpha)$.
    **[A1]** - For correct simplification of the coefficient.

*   Rearrange the equation to form a quadratic in $\tan\alpha$.
    Multiply by 4: $80 = 180\tan\alpha - 45(1 + \tan^2\alpha)$.
    $80 = 180\tan\alpha - 45 - 45\tan^2\alpha$.
    $45\tan^2\alpha - 180\tan\alpha + 125 = 0$.
    Divide by 22.5... no, divide by 5.
    $9\tan^2\alpha - 36\tan\alpha + 25 = 0$.
    Let me recheck the simplification.
    $\frac{10 \times 45 \times 45}{2 \times 30 \times 30} = \frac{10 \times (3/2 \times 30) \times (3/2 \times 30)}{2 \times 30 \times 30} = \frac{10 \times 9/4 \times 30^2}{2 \times 30^2} = \frac{90/4}{2} = \frac{45/2}{2} = 45/4 = 11.25$. This is correct.
    Let me re-read the question I wrote. "Show that... $2\tan^2\alpha - 6\tan\alpha + 3 = 0$".
    My derived quadratic is $45\tan^2\alpha - 180\tan\alpha + 125 = 0$.
    Dividing by 5 gives $9\tan^2\alpha - 36\tan\alpha + 25 = 0$. This does not match the target equation.
    There must be an error in my question parameters or the target equation. Let's work backwards from the target equation.
    If $2\tan^2\alpha - 6\tan\alpha + 3 = 0$, then comparing to $y = x\tan\alpha - K(1+\tan^2\alpha)$ where $K = \frac{gx^2}{2U^2}$.
    $-K\tan^2\alpha + x\tan\alpha - (y+K) = 0$.
    $K\tan^2\alpha - x\tan\alpha + (y+K) = 0$.
    So we need $\frac{K}{2} = \frac{-x}{-6} = \frac{y+K}{3}$.
    From the second part, $K = \frac{x}{3}$.
    Given $x=45$, this implies $K=15$.
    Let's check if $K=15$ is consistent with the physics:
    $K = \frac{gx^2}{2U^2} = \frac{10 \times 45^2}{2 \times U^2} = 15$.
    $\frac{10 \times 2025}{2U^2} = 15 \implies \frac{10125}{U^2} = 15 \implies U^2 = \frac{10125}{15} = 675$. $U = \sqrt{675} \approx 25.98$.
    So if $U = \sqrt{675}$, the equation works. The question states $U=30$.
    Let's check the third part of the proportion: $\frac{y+K}{3} = \frac{K}{2}$.
    $2(y+K) = 3K \implies 2y + 2K = 3K \implies K = 2y$.
    Given $y=20$, this implies $K=40$.
    This is a contradiction. The problem as stated is impossible.
    
    I will rewrite the question with consistent parameters. Let's keep $U=30$, $x=45$, $y=20$. The derived quadratic is correct: $45\tan^2\alpha - 180\tan\alpha + 125 = 0$. Dividing by 5, we get:
    $9\tan^2\alpha - 36\tan\alpha + 25 = 0$.
    This will be the new target equation for part (a).

**(a) Show that ... (Corrected Version)**

*   ...Show that any possible angle of projection $\alpha$ must satisfy the equation $9\tan^2\alpha - 36\tan\alpha + 25 = 0$. [5]
*   Start with the trajectory equation: $y = x\tan\alpha - \frac{gx^2}{2U^2}(1 + \tan^2\alpha)$.
    **[M1]** - For using the correct trajectory equation with the identity for $\sec^2\alpha$.
*   Substitute known values: $(x, y) = (45, 20)$, $U = 30$, $g = 10$.
    $20 = 45\tan\alpha - \frac{10 \times 45^2}{2 \times 30^2}(1 + \tan^2\alpha)$.
    **[M1]** - For correct substitution.
*   Simplify the coefficient: $\frac{10 \times 2025}{2 \times 900} = \frac{20250}{1800} = 11.25 = \frac{45}{4}$.
    **[A1]** - For correct evaluation of the coefficient.
*   $20 = 45\tan\alpha - \frac{45}{4}(1 + \tan^2\alpha)$.
*   Multiply by 4 to clear the fraction:
    $80 = 180\tan\alpha - 45(1 + \tan^2\alpha)$.
    $80 = 180\tan\alpha - 45 - 45\tan^2\alpha$.
    **[M1]** - For expanding and clearing the fraction.
*   Rearrange into the required quadratic form:
    $45\tan^2\alpha - 180\tan\alpha + 80 + 45 = 0$.
    $45\tan^2\alpha - 180\tan\alpha + 125 = 0$.
    Divide by 5: $9\tan^2\alpha - 36\tan\alpha + 25 = 0$. (AG - Answer Given)
    **[A1]** - For correct rearrangement and simplification to the given answer.

**(b) Finding the two possible angles of projection**

*   Let $T = \tan\alpha$. Solve the quadratic $9T^2 - 36T + 25 = 0$.
    Use the quadratic formula: $T = \frac{-(-36) \pm \sqrt{(-36)^2 - 4(9)(25)}}{2(9)}$.
    **[M1]** - For a correct attempt to solve the quadratic equation for $\tan\alpha$.
*   $T = \frac{36 \pm \sqrt{1296 - 900}}{18} = \frac{36 \pm \sqrt{396}}{18}$.
    $\sqrt{396} = \sqrt{36 \times 11} = 6\sqrt{11}$.
    $T = \frac{36 \pm 6\sqrt{11}}{18} = \frac{6(6 \pm \sqrt{11})}{18} = \frac{6 \pm \sqrt{11}}{3}$.
*   So we have two possible values for $\tan\alpha$:
    $\tan\alpha_1 = \frac{6 + \sqrt{11}}{3} \approx 3.105...$
    $\tan\alpha_2 = \frac{6 - \sqrt{11}}{3} \approx 0.894...$
    **[A1]** - For both correct values of $\tan\alpha$.
*   Find the angles:
    $\alpha_1 = \arctan(3.105...) = 72.15...^\circ$.
    $\alpha_2 = \arctan(0.894...) = 41.81...^\circ$.
    The two angles are $72.2^\circ$ and $41.8^\circ$ (1 d.p.).
    **[A1]** - For both correct angles to 1 decimal place.

---
**Standard Solution Steps**
1.  Begin with the general Cartesian equation of the trajectory in the form $y = x\tan\alpha - \frac{gx^2}{2U^2}(1 + \tan^2\alpha)$.
2.  Substitute the coordinates of the target point $(x, y)$ and the initial speed $U$.
3.  Carefully simplify the coefficient of the $(1 + \tan^2\alpha)$ term.
4.  Rearrange the entire expression into a standard quadratic equation of the form $A(\tan^2\alpha) + B(\tan\alpha) + C = 0$.
5.  Solve this quadratic equation for $\tan\alpha$, typically using the quadratic formula.
6.  Calculate the angles by taking the inverse tangent of the roots found in the previous step.

**Teaching Insights**
*   This type of problem excellently combines algebraic manipulation with the physics of projectile motion. It's a test of whether a student can see the underlying mathematical structure.
*   The key is recognising that the trajectory equation can be transformed into a quadratic in $\tan\alpha$. Students should be comfortable with the identity $\sec^2\alpha = 1 + \tan^2\alpha$.
*   It is useful to discuss the physical meaning of the solutions. Two positive real roots for $\tan\alpha$ mean there are two distinct angles (a high trajectory and a low trajectory) to hit the target. One root means there is exactly one angle (e.g., the target is at the vertex of the bounding parabola). No real roots mean the target is out of range. This can be linked to the discriminant of the quadratic.

**Error Analysis**
*   **Algebraic Errors:** Mistakes in simplifying the coefficient or rearranging the equation are very common. Students must be methodical.
*   **Identity Error:** Forgetting or incorrectly applying the identity $\sec^2\alpha = 1 + \tan^2\alpha$.
*   **Calculator Errors:** Incorrectly entering the quadratic formula or using the wrong calculator mode (e.g., radians instead of degrees).
*   **Sign Errors:** Losing a negative sign during rearrangement, which fundamentally changes the quadratic equation.

**Alternative Methods**
*   There isn't a significantly different mainstream method for this problem. The core task is always to solve the trajectory equation for the angle $\alpha$. Any other approach would likely be a more convoluted version of the same algebraic steps.

**Follow-up Questions**
1.  For the same initial speed of $30 \text{ m s}^{-1}$, find the maximum horizontal range on level ground.
2.  Find the coordinates of the highest point that can be reached by the water jet, regardless of the angle of projection (the vertex of the "parabola of safety").
3.  Determine the range of initial speeds for which it is possible to hit the window. (This involves analysing the discriminant of the quadratic in $\tan\alpha$).

**API Integration Fields**
*   UniqueID: FM-PROJ-9231-003
*   Version: 1.2
*   Author: CAIE Specialist AI
*   Last Updated: 2025-08-08

**Tags**
*   Projectile Motion, Angle of Projection, Trajectory, Quadratic Equation, Trigonometry, Further Mechanics