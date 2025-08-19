## [Physical Quantities and Units]: [Homogeneity and Graphical Analysis]

Syllabus Reference: 9702.1
Learning Objective: Show an understanding of and use the conventions for labelling graph axes and table columns as set out in the ASE publication Signs, Symbols and Systematics.

Example Question:
The period $T$ of a simple pendulum is thought to be related to its length $L$ and the acceleration of free fall $g$ by the equation $T = kL^p g^q$, where $k$, $p$ and $q$ are constants.

(a) The constant $k$ is dimensionless. Use analysis of the units to determine the values of $p$ and $q$.
(b) In an experiment, a student measures $T$ for different values of $L$. The results are shown in the table below.

| $L / \text{m}$ | $T / \text{s}$ | $T^2 / \text{s}^2$ |
| :--- | :--- | :--- |
| 0.20 | 0.90 | 0.81 |
| 0.40 | 1.27 | 1.61 |
| 0.60 | 1.55 | 2.40 |
| 0.80 | 1.79 | 3.20 |
| 1.00 | 2.01 | 4.04 |

The relationship is predicted to be $T^2 = \frac{4\pi^2}{g} L$. A graph is plotted of $T^2$ on the y-axis against $L$ on the x-axis. Determine a value for $g$ from the graph.

Mark Scheme / Solution:
(a)
- Express the equation in terms of base units. $T$ has units of s. $L$ has units of m. $g$ has units of m s⁻². [C1]
- $[T] = [L]^p [g]^q$
- $s = (m)^p (m s^{-2})^q = m^p m^q s^{-2q} = m^{p+q} s^{-2q}$. [M1]
- Comparing powers of s: $1 = -2q$, so $q = -1/2$. [A1]
- Comparing powers of m: $0 = p+q$, so $p = -q = +1/2$. [A1]
- So, $p = 1/2$ and $q = -1/2$.

(b)
- The gradient of the graph of $T^2$ against $L$ is equal to $\frac{4\pi^2}{g}$. [C1]
- Calculate the gradient from the graph using a large triangle.
- Gradient = $\frac{\Delta(T^2)}{\Delta L} = \frac{4.04 - 0.81}{1.00 - 0.20} = \frac{3.23}{0.80} = 4.0375$ s² m⁻¹. [M1]
- Equate gradient to the expression: $4.0375 = \frac{4\pi^2}{g}$. [M1]
- Rearrange for $g$: $g = \frac{4\pi^2}{4.0375} = \frac{39.478}{4.0375} = 9.778$ m s⁻².
- $g = 9.8$ m s⁻² (to 2 s.f.). [A1]

Standard Solution Steps:
- For homogeneity, write down the base units for each quantity in the equation.
- Use the laws of indices to combine powers of each base unit (M, L, T).
- Equate the powers of each base unit on both sides of the equation to form simultaneous equations.
- Solve these equations to find the unknown powers.
- For the graph analysis, identify the relationship between the plotted variables and the constants.
- The gradient or intercept of the straight-line graph will be related to the constant to be determined.
- Calculate the gradient using a large triangle from the plotted points.
- Equate the numerical gradient to the algebraic expression for the gradient and solve for the unknown constant.

Common Mistakes:
- Incorrect base units for quantities, especially acceleration ($g$).
- Algebraic errors when combining or comparing powers of the base units.
- In graphical analysis, calculating the gradient using only one point instead of the change between two points ($\Delta y / \Delta x$).
- Using a small triangle for the gradient calculation, which increases uncertainty and can lead to an inaccurate result.
- Errors in algebraic rearrangement when solving for the final value.

Tags:
physical_quantities, units, homogeneity, graphical_analysis, uncertainty

---
## [Physical Quantities and Units]: [Errors and Uncertainties]

Syllabus Reference: 9702.1
Learning Objective: Show an understanding of the distinction between systematic errors and random errors. Show an understanding of and use the expressions for combining uncertainties.

Example Question:
A student measures the diameter of a wire using a micrometer screw gauge and obtains the reading $d = 0.54 \pm 0.01$ mm. The length of the wire is measured using a ruler as $L = 125.0 \pm 0.1$ cm. The resistance of the wire is measured as $R = 5.2 \pm 0.1$ $\Omega$. The resistivity $\rho$ is calculated using the formula $\rho = \frac{RA}{L}$, where A is the cross-sectional area of the wire.

(a) State the difference between a systematic error and a random error.
(b) Calculate the value of the resistivity $\rho$.
(c) Calculate the percentage uncertainty in the resistivity $\rho$.
(d) State the value of the resistivity with its absolute uncertainty.

Mark Scheme / Solution:
(a)
- A random error causes readings to be scattered around the true value, and can be reduced by averaging repeated measurements. [B1]
- A systematic error causes all readings to be shifted in one direction from the true value. It cannot be reduced by averaging. [B1]

(b)
- First, calculate the cross-sectional area $A = \pi (d/2)^2 = \pi d^2 / 4$.
- Convert diameter to metres: $d = 0.54 \times 10^{-3}$ m.
- Convert length to metres: $L = 1.250$ m. [C1]
- $A = \frac{\pi (0.54 \times 10^{-3})^2}{4} = 2.290 \times 10^{-7}$ m².
- $\rho = \frac{RA}{L} = \frac{(5.2)(2.290 \times 10^{-7})}{1.250} = 9.526 \times 10^{-7}$ $\Omega$ m.
- $\rho = 9.5 \times 10^{-7}$ $\Omega$ m (to 2 s.f.). [A1]

(c)
- Percentage uncertainty in R = $(\frac{0.1}{5.2}) \times 100\% = 1.92\%$.
- Percentage uncertainty in L = $(\frac{0.1}{125.0}) \times 100\% = 0.08\%$.
- Percentage uncertainty in d = $(\frac{0.01}{0.54}) \times 100\% = 1.85\%$. [C1]
- $\rho = \frac{R \pi d^2}{4L}$. The percentage uncertainty in $\rho$ is the sum of the percentage uncertainties in R and L, and twice the percentage uncertainty in d. [M1]
- $\frac{\Delta\rho}{\rho} = \frac{\Delta R}{R} + 2\frac{\Delta d}{d} + \frac{\Delta L}{L}$.
- % uncertainty in $\rho = 1.92\% + 2(1.85\%) + 0.08\% = 1.92\% + 3.70\% + 0.08\% = 5.7\%$. [A1]

(d)
- Absolute uncertainty $\Delta\rho = 5.7\% \times (9.526 \times 10^{-7}) = 0.057 \times (9.526 \times 10^{-7}) = 0.54 \times 10^{-7}$ $\Omega$ m. [C1]
- The value and its uncertainty should be given to the same number of decimal places or precision.
- $\rho = (9.5 \pm 0.5) \times 10^{-7}$ $\Omega$ m. [A1]

Standard Solution Steps:
- Ensure all measurements are converted to consistent SI base units before calculation.
- Calculate the value of the desired quantity using the given formula.
- For each measured quantity, calculate its fractional or percentage uncertainty ($\Delta x / x$).
- Use the rules for combining uncertainties:
    - For multiplication and division ($y = ab/c$), add the fractional uncertainties: $\frac{\Delta y}{y} = \frac{\Delta a}{a} + \frac{\Delta b}{b} + \frac{\Delta c}{c}$.
    - For powers ($y = a^n$), multiply the fractional uncertainty by the power: $\frac{\Delta y}{y} = n \frac{\Delta a}{a}$.
- Sum the relevant percentage uncertainties to find the total percentage uncertainty in the calculated result.
- Calculate the absolute uncertainty by multiplying the fractional uncertainty by the calculated value.
- State the final answer in the form value $\pm$ uncertainty, ensuring the uncertainty is given to one significant figure and the value is rounded to the same decimal place.

Common Mistakes:
- Forgetting to convert units (e.g., mm to m, cm to m) before calculation.
- When calculating percentage uncertainty, forgetting to multiply by 2 for the diameter, which is squared in the area formula.
- Adding absolute uncertainties for multiplication/division instead of adding fractional/percentage uncertainties.
- Incorrectly rounding the final answer. The uncertainty should be quoted to 1 significant figure, and the value should be rounded to the same level of precision (decimal place) as the uncertainty.

Tags:
uncertainty, error_analysis, systematic_error, random_error, resistivity

---
## [Kinematics]: [Motion Graphs]

Syllabus Reference: 9702.2
Learning Objective: Interpret and use displacement–time, velocity–time and acceleration–time graphs.

Example Question:
A velocity-time graph shows a car's journey. From t=0 to t=10s, the velocity increases linearly from 0 to 20 m/s. From t=10s to t=30s, the velocity remains constant at 20 m/s. From t=30s to t=40s, the velocity decreases linearly from 20 m/s to 0 m/s.

(a) Describe the motion of the car during the first 10 s.
(b) Calculate the total displacement of the car after 40 s.
(c) Calculate the average velocity of the car for the entire journey.
(d) Sketch the acceleration-time graph for the journey.

Mark Scheme / Solution:
(a)
- The car accelerates uniformly (or at a constant rate) from rest. [B1]
- From a velocity of 0 m s⁻¹ to 20 m s⁻¹. [B1]

(b)
- Total displacement is the area under the velocity-time graph. [M1]
- The shape is a trapezium. Area = $\frac{1}{2}(a+b)h$.
- The parallel sides are the time durations at the top and bottom of the shape.
- Top side duration = $30 - 10 = 20$ s. Bottom side duration = $40 - 0 = 40$ s. Height is the constant velocity, 20 m/s.
- Area = $\frac{1}{2}(20 + 40) \times 20 = \frac{1}{2} \times 60 \times 20 = 600$ m. [A1]
- Alternative: Area = (Area of triangle 0-10s) + (Area of rectangle 10-30s) + (Area of triangle 30-40s)
- Area = $(\frac{1}{2} \times 10 \times 20) + (20 \times 20) + (\frac{1}{2} \times 10 \times 20) = 100 + 400 + 100 = 600$ m. [M1]

(c)
- Average velocity = Total displacement / Total time. [C1]
- Average velocity = $600 / 40 = 15$ m s⁻¹. [A1]

(d)
- For 0-10 s: acceleration = gradient = $20/10 = 2.0$ m s⁻².
- For 10-30 s: acceleration = gradient = $0$ m s⁻².
- For 30-40 s: acceleration = gradient = $(0-20)/(40-30) = -2.0$ m s⁻². [M1]
- Graph shows horizontal line at +2.0 from t=0 to 10. [A1]
- Graph shows horizontal line at 0 from t=10 to 30. [A1]
- Graph shows horizontal line at -2.0 from t=30 to 40. [A1]
- Axes correctly labelled with 'acceleration / m s⁻²' and 'time / s'.

Standard Solution Steps:
- To describe motion from a v-t graph, look at the gradient (acceleration) and the value of velocity.
- To find displacement, calculate the area under the v-t graph. Split the graph into simple shapes (triangles, rectangles) if necessary.
- To find acceleration, calculate the gradient of the v-t graph for the relevant section.
- To calculate average velocity, divide the total displacement (total area) by the total time.
- To sketch an a-t graph from a v-t graph, calculate the gradient for each segment of the journey and plot these constant values against time.

Common Mistakes:
- Confusing displacement-time and velocity-time graphs. For example, interpreting the slope of a v-t graph as velocity instead of acceleration.
- Calculating distance travelled by multiplying velocity by time, which is only valid for constant velocity.
- Errors in calculating the area of trapeziums or triangles.
- When sketching the a-t graph, drawing slopes instead of horizontal lines representing the constant acceleration in each phase.
- Sign errors when calculating deceleration (negative acceleration).

Tags:
kinematics, motion_graphs, velocity-time, acceleration, displacement

---
## [Kinematics]: [Equations of Motion and Projectiles]

Syllabus Reference: 9702.2
Learning Objective: Use equations of motion for constant acceleration in one dimension and for motion in two dimensions, such as projectile motion.

Example Question:
A stone is thrown from the top of a cliff, which is 45 m high. The stone is thrown with an initial velocity of 15 m s⁻¹ at an angle of 30° above the horizontal. Air resistance is negligible.

(a) Calculate the maximum height reached by the stone above the sea level.
(b) Calculate the time taken for the stone to reach the sea.
(c) Calculate the horizontal distance travelled by the stone from the base of the cliff.

Mark Scheme / Solution:
(a)
- Resolve the initial velocity into horizontal and vertical components.
- $u_x = 15 \cos(30^\circ) = 13.0$ m s⁻¹.
- $u_y = 15 \sin(30^\circ) = 7.5$ m s⁻¹. [C1]
- At maximum height, the vertical component of velocity $v_y = 0$.
- Use $v_y^2 = u_y^2 + 2as$. Here, $a = -g = -9.81$ m s⁻². [M1]
- $0 = (7.5)^2 + 2(-9.81)s$.
- $s = \frac{-7.5^2}{2(-9.81)} = \frac{56.25}{19.62} = 2.87$ m. [A1]
- Maximum height above sea level = height of cliff + s = $45 + 2.87 = 47.9$ m. [A1]

(b)
- Consider the vertical motion from the top of the cliff to the sea.
- Displacement $s = -45$ m (taking upwards as positive). $u_y = 7.5$ m s⁻¹. $a = -9.81$ m s⁻².
- Use $s = ut + \frac{1}{2}at^2$. [M1]
- $-45 = 7.5t + \frac{1}{2}(-9.81)t^2$.
- $4.905t^2 - 7.5t - 45 = 0$. [C1]
- Use the quadratic formula $t = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.
- $t = \frac{7.5 \pm \sqrt{(-7.5)^2 - 4(4.905)(-45)}}{2(4.905)}$.
- $t = \frac{7.5 \pm \sqrt{56.25 + 882.9}}{9.81} = \frac{7.5 \pm \sqrt{939.15}}{9.81} = \frac{7.5 \pm 30.65}{9.81}$. [M1]
- Time must be positive, so $t = \frac{7.5 + 30.65}{9.81} = \frac{38.15}{9.81} = 3.89$ s. [A1]

(c)
- Horizontal motion has constant velocity.
- Horizontal distance (range) = $u_x \times t$. [M1]
- Range = $13.0 \times 3.89 = 50.57$ m.
- Range = $51$ m (to 2 s.f.). [A1]

Standard Solution Steps:
- Resolve the initial velocity into horizontal ($u_x$) and vertical ($u_y$) components.
- Treat horizontal and vertical motion independently. Remember horizontal acceleration is zero and vertical acceleration is $g$ (usually $-9.81$ m s⁻²).
- For maximum height, use the vertical motion equations. At the peak, the vertical velocity $v_y$ is zero.
- For time of flight, use the vertical motion equations from the start point to the end point. Be careful with the sign of the displacement.
- Once the total time of flight is known, calculate the horizontal range using the constant horizontal velocity component.

Common Mistakes:
- Forgetting to resolve the initial velocity into components.
- Using the full initial velocity (e.g., 15 m s⁻¹) in vertical or horizontal calculations.
- Sign errors, particularly for displacement and acceleration in the vertical direction. It is crucial to define a positive direction (e.g., upwards) and stick to it.
- Using a time calculated to reach the maximum height to find the total range, instead of the total time of flight.
- Mixing up horizontal and vertical components in equations.

Tags:
kinematics, projectile_motion, suvat, vectors

---
## [Dynamics]: [Newton's Laws and Connected Particles]

Syllabus Reference: 9702.3
Learning Objective: Apply Newton’s laws of motion to solve problems, including situations with friction and connected particles.

Example Question:
Two blocks, A of mass $m_A = 4.0$ kg and B of mass $m_B = 6.0$ kg, are connected by a light, inextensible string. The string passes over a frictionless pulley. Block A is on a rough horizontal surface with a coefficient of kinetic friction $\mu_k = 0.20$. Block B hangs freely. The system is released from rest.

(a) Draw a free-body diagram showing all the forces acting on block A and block B.
(b) Calculate the acceleration of the system.
(c) Calculate the tension in the string.

Mark Scheme / Solution:
(a)
- Block A: Weight ($W_A$) downwards, Normal reaction ($N$) upwards, Tension ($T$) to the right, Friction ($f$) to the left. [B1]
- Block B: Weight ($W_B$) downwards, Tension ($T$) upwards. [B1]
- All forces correctly labelled.

(b)
- For block A, consider vertical forces: $N = W_A = m_A g = 4.0 \times 9.81 = 39.24$ N. [C1]
- Calculate the frictional force: $f = \mu_k N = 0.20 \times 39.24 = 7.848$ N. [C1]
- Apply Newton's second law to block A (horizontal): $T - f = m_A a$.
- $T - 7.848 = 4.0 a$ (Equation 1). [M1]
- Apply Newton's second law to block B (vertical): $W_B - T = m_B a$.
- $W_B = 6.0 \times 9.81 = 58.86$ N.
- $58.86 - T = 6.0 a$ (Equation 2). [M1]
- Add Equation 1 and Equation 2 to eliminate T:
- $(T - 7.848) + (58.86 - T) = 4.0a + 6.0a$.
- $51.012 = 10.0 a$. [M1]
- $a = 5.1012$ m s⁻².
- $a = 5.1$ m s⁻². [A1]

(c)
- Substitute the value of $a$ into either equation to find $T$.
- Using Equation 1: $T - 7.848 = 4.0 \times 5.1012$.
- $T = 20.4048 + 7.848 = 28.25$ N. [M1]
- $T = 28$ N (to 2 s.f.). [A1]
- Check with Equation 2: $T = 58.86 - 6.0 \times 5.1012 = 58.86 - 30.6072 = 28.25$ N. Consistent.

Standard Solution Steps:
- Draw clear free-body diagrams for each mass, showing all forces acting on it.
- Resolve forces if necessary (e.g., on an inclined plane).
- Apply Newton's second law ($F_{net} = ma$) to each mass along the direction of motion. This will generate a set of simultaneous equations.
- For friction problems, first find the normal reaction force, then use it to calculate the frictional force ($f = \mu N$).
- Solve the simultaneous equations for the unknowns, typically acceleration ($a$) and tension ($T$). Adding the equations is often a quick way to eliminate tension.
- Substitute the value of the acceleration back into one of the original equations to find the tension.

Common Mistakes:
- Incorrectly drawn free-body diagrams, e.g., missing forces or showing forces acting in the wrong direction.
- Assuming tension is equal to the weight of the hanging mass. This is only true if the system is in equilibrium (not accelerating).
- Forgetting the friction force, or using the wrong normal force to calculate it (e.g., on an inclined plane).
- Sign errors when setting up the $F=ma$ equations. It is essential to define a positive direction for the system's motion and apply it consistently.
- Using $m_A$ in the equation for block B, or vice-versa.

Tags:
dynamics, newtons_laws, friction, connected_particles, pulleys, tension

---
## [Dynamics]: [Momentum and Impulse]

Syllabus Reference: 9702.3
Learning Objective: Show an understanding of and use the concept of momentum, and use the principle of conservation of momentum to solve problems. Define and use impulse.

Example Question:
A ball of mass 0.50 kg moving at 11 m s⁻¹ strikes a vertical wall normally (at 90°). It rebounds along the same path with a speed of 11 m s⁻¹.

(a) Show that the change in momentum of the ball is 11 kg m s⁻¹.
(b) The ball is in contact with the wall for 0.10 s. Calculate the magnitude of the average force exerted by the wall on the ball.
(c) State whether the collision is elastic or inelastic, and justify your answer.

Mark Scheme / Solution:
(a)
- Define initial direction (towards wall) as negative. So $u = -11$ m s⁻¹.
- Rebound direction (away from wall) is positive. So $v = +11$ m s⁻¹. [C1]
- Initial momentum $p_i = mu = 0.50 \times (-11) = -5.5$ kg m s⁻¹.
- Final momentum $p_f = mv = 0.50 \times (+11) = +5.5$ kg m s⁻¹. [M1]
- Change in momentum $\Delta p = p_f - p_i = 5.5 - (-5.5) = 11$ kg m s⁻¹. [A1]

(b)
- Impulse = Force $\times$ time = Change in momentum. [M1]
- $F \times \Delta t = \Delta p$.
- $F = \frac{\Delta p}{\Delta t} = \frac{11}{0.10} = 110$ N. [A1]

(c)
- Initial kinetic energy $E_{ki} = \frac{1}{2}mu^2 = \frac{1}{2}(0.50)(-11)^2 = 30.25$ J. [C1]
- Final kinetic energy $E_{kf} = \frac{1}{2}mv^2 = \frac{1}{2}(0.50)(11)^2 = 30.25$ J. [C1]
- Since kinetic energy is conserved ($E_{ki} = E_{kf}$), the collision is elastic. [A1]

Standard Solution Steps:
- Remember that momentum and velocity are vectors. Establish a clear sign convention for directions.
- Calculate the initial momentum ($p_i = mu$) and the final momentum ($p_f = mv$).
- The change in momentum is the vector difference: $\Delta p = p_f - p_i$. Be careful with signs.
- Impulse is defined as both the change in momentum ($\Delta p$) and the product of average force and contact time ($F\Delta t$).
- To find the average force, set $F\Delta t = \Delta p$ and solve for F.
- To check if a collision is elastic, calculate the total kinetic energy before and after the collision. If it is conserved, the collision is elastic. If KE is lost, it is inelastic.

Common Mistakes:
- Treating momentum as a scalar. Forgetting that direction is critical and failing to use signs or vector components.
- Calculating the change in momentum as $m(v-u)$ but forgetting that $u$ and $v$ often have opposite signs, leading to a small result instead of a large one.
- Confusing momentum and kinetic energy. They are different quantities.
- Stating a collision is elastic simply because momentum is conserved. Momentum is conserved in all collisions (in an isolated system), but kinetic energy is only conserved in elastic collisions.

Tags:
dynamics, momentum, impulse, conservation_of_momentum, elastic_collision

---
## [Forces, Density and Pressure]: [Equilibrium and Vector Triangles]

Syllabus Reference: 9702.4
Learning Objective: Use a vector triangle to represent forces in equilibrium. Understand and use the concept of density.

Example Question:
A traffic light of mass 12 kg is suspended by two cables. Cable 1 makes an angle of 30° to the horizontal and Cable 2 makes an angle of 45° to the horizontal.

(a) Define density.
(b) The traffic light is in equilibrium. State the two conditions for an object to be in equilibrium.
(c) Calculate the tension in Cable 1 ($T_1$) and Cable 2 ($T_2$).

Mark Scheme / Solution:
(a)
- Density is defined as mass per unit volume. [B1]

(b)
- 1. The net (or resultant) force acting on the object must be zero. [B1]
- 2. The net (or resultant) torque (or moment) about any point must be zero. [B1]

(c)
- Method 1: Resolving forces.
- Weight of traffic light $W = mg = 12 \times 9.81 = 117.72$ N. [C1]
- Resolve forces horizontally: Resultant horizontal force is zero.
- $T_1 \cos(30^\circ) = T_2 \cos(45^\circ)$.
- $0.866 T_1 = 0.707 T_2 \implies T_1 = 0.816 T_2$ (Equation 1). [M1]
- Resolve forces vertically: Resultant vertical force is zero.
- $T_1 \sin(30^\circ) + T_2 \sin(45^\circ) = W = 117.72$ N.
- $0.500 T_1 + 0.707 T_2 = 117.72$ (Equation 2). [M1]
- Substitute (1) into (2):
- $0.500(0.816 T_2) + 0.707 T_2 = 117.72$.
- $0.408 T_2 + 0.707 T_2 = 117.72$.
- $1.115 T_2 = 117.72 \implies T_2 = 105.6$ N. [A1]
- Substitute $T_2$ back into (1):
- $T_1 = 0.816 \times 105.6 = 86.1$ N. [A1]
- Final answers: $T_1 = 86$ N and $T_2 = 110$ N (to 2 s.f.).

- Method 2: Lami's Theorem / Sine Rule on vector triangle
- Draw a closed vector triangle with forces $W$, $T_1$, and $T_2$.
- The angle opposite W is $180 - 30 - 45 = 105^\circ$.
- The angle opposite $T_1$ is $90+45=135^\circ$ (angle between $W$ and $T_2$).
- The angle opposite $T_2$ is $90+30=120^\circ$ (angle between $W$ and $T_1$).
- Using Sine Rule on the three forces in equilibrium: $\frac{W}{\sin(105^\circ)} = \frac{T_1}{\sin(135^\circ)} = \frac{T_2}{\sin(120^\circ)}$. This is Lami's theorem.
- Note: It is often easier to use the internal angles of the force triangle. Angle between $T_1$ and horizontal is 30, so angle with vertical is 60. Angle between $T_2$ and horizontal is 45. Internal angle between $T_1$ and $T_2$ is $180 - 30 - 45 = 105^\circ$. Angle opposite $T_1$ is $90-45=45^\circ$. Angle opposite $T_2$ is $90-30=60^\circ$.
- Using Sine Rule on the triangle of forces: $\frac{W}{\sin(105^\circ)} = \frac{T_1}{\sin(45^\circ)} = \frac{T_2}{\sin(60^\circ)}$. [M1]
- $T_1 = W \frac{\sin(45^\circ)}{\sin(105^\circ)} = 117.72 \times \frac{0.707}{0.966} = 86.2$ N. [A1]
- $T_2 = W \frac{\sin(60^\circ)}{\sin(105^\circ)} = 117.72 \times \frac{0.866}{0.966} = 105.6$ N. [A1]

Standard Solution Steps:
- Identify that the object is in equilibrium, so the net force is zero.
- Draw a free-body diagram of the object showing all forces.
- Resolve all forces into horizontal (x) and vertical (y) components.
- Set the sum of the horizontal components to zero ($\Sigma F_x = 0$).
- Set the sum of the vertical components to zero ($\Sigma F_y = 0$).
- Solve the resulting simultaneous equations for the unknown forces.
- Alternatively, if there are three forces, draw a closed vector triangle and use the Sine Rule to solve for the unknown forces.

Common Mistakes:
- Resolving forces incorrectly, e.g., mixing up sin and cos. Remember SOH CAH TOA and which angle you are using.
- Sign errors when summing the force components.
- Errors in solving the simultaneous equations.
- When using the vector triangle method, calculating the angles inside the triangle incorrectly.

Tags:
forces, equilibrium, vectors, resolving_forces, density, pressure

---
## [Work, Energy and Power]: [Conservation of Energy]

Syllabus Reference: 9702.5
Learning Objective: Apply the principle of conservation of energy, including the concepts of gravitational potential energy, kinetic energy, and work done.

Example Question:
A skier of mass 75 kg starts from rest at the top of a slope of length 120 m, which is inclined at 25° to the horizontal. The skier reaches the bottom of the slope with a speed of 30 m s⁻¹.

(a) Define work done by a force.
(b) Calculate the change in gravitational potential energy (GPE) of the skier.
(c) Calculate the kinetic energy (KE) of the skier at the bottom of the slope.
(d) Using the work-energy principle, calculate the average resistive force (friction and air resistance) acting on the skier.

Mark Scheme / Solution:
(a)
- Work done is the product of the force and the distance moved in the direction of the force. [B1]

(b)
- Vertical height of the slope $h = L \sin(\theta) = 120 \sin(25^\circ) = 50.71$ m. [M1]
- Change in GPE = $mg\Delta h = 75 \times 9.81 \times 50.71$. [C1]
- Change in GPE = $37310$ J = $3.7 \times 10^4$ J. [A1]

(c)
- Kinetic energy $E_k = \frac{1}{2}mv^2$. [C1]
- $E_k = \frac{1}{2} \times 75 \times (30)^2 = \frac{1}{2} \times 75 \times 900 = 33750$ J.
- $E_k = 3.4 \times 10^4$ J. [A1]

(d)
- By the work-energy principle: Loss in GPE = Gain in KE + Work done against resistive forces. [M1]
- Work done against resistive forces = Loss in GPE - Gain in KE.
- Work done = $37310 - 33750 = 3560$ J. [C1]
- Work done = Force $\times$ Distance moved. The distance moved is the length of the slope.
- $3560 = F_{resistive} \times 120$. [M1]
- $F_{resistive} = \frac{3560}{120} = 29.67$ N.
- $F_{resistive} = 30$ N. [A1]

Standard Solution Steps:
- Identify the initial and final states of the system.
- Calculate the initial energy (in this case, GPE at the top, KE is zero). To find GPE, first calculate the vertical height.
- Calculate the final energy (in this case, KE at the bottom, GPE is zero relative to the bottom).
- Apply the principle of conservation of energy. If there are no resistive forces, initial energy equals final energy.
- If there are resistive forces, the work done by these forces equals the "lost" energy (Initial Energy - Final Energy).
- To find the average resistive force, divide the work done against resistance by the distance over which the force acts.

Common Mistakes:
- Using the length of the slope as the vertical height in the GPE calculation.
- Forgetting to square the velocity in the KE calculation.
- Errors in applying the energy conservation principle, e.g., adding the work done by friction to the final energy instead of equating it to the energy loss.
- Dividing the work done by the vertical height instead of the distance along the slope to find the resistive force.

Tags:
work, energy, power, conservation_of_energy, GPE, KE

---
## [Deformation of Solids]: [Stress, Strain, and Young Modulus]

Syllabus Reference: 9702.6
Learning Objective: Define and use the terms stress, strain, Young modulus and the spring constant.

Example Question:
A metal wire of original length 1.50 m and cross-sectional area $0.80$ mm² is stretched by a force. The wire is found to obey Hooke's Law in the region of interest. A force of 120 N produces an extension of 0.80 mm.

(a) Define tensile stress and tensile strain.
(b) Determine the spring constant of the wire.
(c) Calculate the Young modulus of the metal.
(d) Calculate the elastic potential energy (strain energy) stored in the wire when the extension is 0.60 mm.

Mark Scheme / Solution:
(a)
- Tensile stress is the force applied per unit cross-sectional area of the wire. ($\sigma = F/A$) [B1]
- Tensile strain is the extension per unit original length of the wire. ($\epsilon = x/L$) [B1]

(b)
- The spring constant $k$ is the ratio of force to extension ($k=F/x$) for a material obeying Hooke's Law. [M1]
- $k = \frac{120 \text{ N}}{0.80 \times 10^{-3} \text{ m}} = 1.5 \times 10^5$ N m⁻¹. [A1]

(c)
- Young modulus $E = \frac{\text{stress}}{\text{strain}} = \frac{F/A}{x/L} = \frac{FL}{Ax}$. [M1]
- This can be written as $E = (\frac{F}{x}) \frac{L}{A} = k \frac{L}{A}$.
- Convert area to m²: $A = 0.80 \text{ mm}^2 = 0.80 \times (10^{-3})^2 \text{ m}^2 = 0.80 \times 10^{-6}$ m². [C1]
- $E = (1.5 \times 10^5 \text{ N m⁻¹}) \times \frac{1.50 \text{ m}}{0.80 \times 10^{-6} \text{ m}^2}$. [C1]
- $E = 2.8125 \times 10^{11}$ Pa.
- $E = 2.8 \times 10^{11}$ Pa. [A1]

(d)
- Strain energy is the area under the force-extension graph, given by $E_p = \frac{1}{2}Fx$. [M1]
- First find the force F required for an extension of 0.60 mm. Since the wire obeys Hooke's law, F is proportional to x.
- $F = kx = (1.5 \times 10^5) \times (0.60 \times 10^{-3}) = 90$ N. [C1]
- $E_p = \frac{1}{2} \times 90 \times (0.60 \times 10^{-3}) = 0.027$ J. [A1]

Standard Solution Steps:
- To find the spring constant, calculate the gradient of the F-x graph or use $k=F/x$ with a given data pair.
- To find the Young modulus, use the formula $E = \text{stress}/\text{strain}$. This can be rearranged in terms of F, L, A and x. Use values from a point on the linear region of the graph, or use the gradient.
- Ensure all quantities are in SI units before calculation (e.g., area in m², extension in m).
- To find the strain energy, calculate the area under the F-x graph up to the given extension. For the linear region, this is the area of a triangle ($\frac{1}{2}Fx$).

Common Mistakes:
- Unit conversion errors, especially for area from mm² to m². Remember $1 \text{ mm}^2 = (10^{-3} \text{ m})^2 = 10^{-6} \text{ m}^2$.
- Confusing the spring constant ($k$) with the Young modulus ($E$). The spring constant depends on the dimensions of the specific object, while the Young modulus is a property of the material.
- Using the wrong formula for strain energy, e.g., $Fx$ instead of $\frac{1}{2}Fx$.
- Reading values from the graph incorrectly or using points outside the region of proportionality when calculating the Young modulus.

Tags:
deformation, stress, strain, young_modulus, spring_constant, elastic_potential_energy

---
## [Waves]: [Intensity and the Doppler Effect]

Syllabus Reference: 9702.7
Learning Objective: Use the relationship intensity is proportional to (amplitude)². Use the Doppler effect equations for a source moving relative to a stationary observer.

Example Question:
(a) A sound wave has an intensity $I$ and an amplitude $A$. State the relationship between $I$ and $A$.

(b) The sound from a siren on a stationary ambulance has a frequency of 800 Hz. The ambulance moves at a speed of 25 m s⁻¹ directly towards a stationary observer. The speed of sound in air is 340 m s⁻¹.
(i) Calculate the observed frequency of the sound.
(ii) The ambulance passes the observer and moves away at the same speed. Calculate the new observed frequency.

Mark Scheme / Solution:
(a)
- The intensity is directly proportional to the square of the amplitude ($I \propto A^2$). [B1]

(b)
(i)
- Use the Doppler effect formula for a source moving towards the observer: $f_o = f_s (\frac{v}{v - v_s})$. [M1]
- $f_s = 800$ Hz, $v = 340$ m s⁻¹, $v_s = 25$ m s⁻¹.
- $f_o = 800 \times (\frac{340}{340 - 25}) = 800 \times (\frac{340}{315})$. [C1]
- $f_o = 800 \times 1.079 = 863.5$ Hz.
- $f_o = 860$ Hz (to 2 s.f.). [A1]

(ii)
- Use the Doppler effect formula for a source moving away from the observer: $f_o = f_s (\frac{v}{v + v_s})$. [M1]
- $f_o = 800 \times (\frac{340}{340 + 25}) = 800 \times (\frac{340}{365})$. [C1]
- $f_o = 800 \times 0.9315 = 745.2$ Hz.
- $f_o = 750$ Hz (to 2 s.f.). [A1]

Standard Solution Steps:
- Identify the correct formula for the Doppler effect based on whether the source is moving towards or away from the observer.
- Remember: when moving towards, the denominator is ($v - v_s$), leading to a higher observed frequency.
- Remember: when moving away, the denominator is ($v + v_s$), leading to a lower observed frequency.
- Substitute the given values for source frequency ($f_s$), speed of the wave ($v$), and speed of the source ($v_s$).
- Calculate the final observed frequency ($f_o$).

Common Mistakes:
- Using the wrong sign in the denominator of the Doppler formula (e.g., using '+' when the source is approaching).
- Mixing up the speed of the source ($v_s$) and the speed of the wave ($v$).
- Forgetting the context: frequency should increase when the source approaches and decrease when it recedes. If your answer does not match this, you have likely used the wrong formula.
- Applying the formula for a moving observer when the source is moving.

Tags:
waves, intensity, amplitude, doppler_effect

---
## [Superposition]: [Interference and Coherence]

Syllabus Reference: 9702.8
Learning Objective: Understand the terms interference and coherence. Understand and use the conditions for constructive and destructive interference in terms of path difference. Use the equation $\lambda = ax/D$ for double-slit interference.

Example Question:
In a Young's double-slit experiment, a laser emitting light of wavelength 630 nm is used. The light is incident on two parallel slits that are separated by a distance of 0.45 mm. An interference pattern is observed on a screen placed 2.5 m away from the slits.

(a) State the principle of superposition.
(b) Explain what is meant by coherent sources.
(c) Calculate the separation of the bright fringes (the fringe spacing) observed on the screen.
(d) Describe the change, if any, to the fringe spacing if the distance between the slits is decreased.

Mark Scheme / Solution:
(a)
- When two or more waves meet at a point, the resultant displacement is the vector sum of the individual displacements of the waves. [B1]

(b)
- Coherent sources are sources that emit waves with a constant phase difference between them. [B1] They must also have the same frequency. [B1]

(c)
- Use the formula for fringe spacing $x = \frac{\lambda D}{a}$. [M1]
- Ensure all units are in metres.
- $\lambda = 630 \times 10^{-9}$ m.
- $a = 0.45 \times 10^{-3}$ m.
- $D = 2.5$ m. [C1]
- $x = \frac{(630 \times 10^{-9}) \times 2.5}{0.45 \times 10^{-3}}$. [M1]
- $x = \frac{1.575 \times 10^{-6}}{0.45 \times 10^{-3}} = 3.5 \times 10^{-3}$ m.
- $x = 3.5$ mm. [A1]

(d)
- From the formula $x = \frac{\lambda D}{a}$, the fringe spacing $x$ is inversely proportional to the slit separation $a$. [M1]
- Therefore, if the slit separation $a$ is decreased, the fringe spacing $x$ will increase. The fringes become wider apart. [A1]

Standard Solution Steps:
- Identify the correct formula, $x = \lambda D / a$.
- Convert all given quantities to SI units (e.g., nm to m, mm to m).
- Substitute the values into the formula to calculate the fringe spacing, $x$.
- To analyse changes, look at the relationship between the variables in the formula. For example, $x$ is directly proportional to $\lambda$ and $D$, and inversely proportional to $a$.

Common Mistakes:
- Unit conversion errors, especially for wavelength (nm) and slit separation (mm).
- Mixing up the variables in the formula, for example, swapping the slit separation ($a$) and the fringe spacing ($x$).
- Using the wrong formula, e.g., for a diffraction grating instead of a double slit.
- Incorrectly describing the relationship between variables (e.g., saying fringe spacing increases when slit separation increases).

Tags:
superposition, interference, coherence, youngs_double_slit, path_difference

---
## [Electricity]: [Resistivity and Drift Velocity]

Syllabus Reference: 9702.9
Learning Objective: Define charge, current, potential difference, resistance, and resistivity. Use the equation for resistivity $\rho = RA/L$. Use the equation for current $I = nAqv$.

Example Question:
A copper wire has a length of 5.0 m and a uniform cross-sectional area of $1.2 \times 10^{-7}$ m². The resistivity of copper is $1.7 \times 10^{-8}$ $\Omega$ m. The number density of free electrons in copper is $8.5 \times 10^{28}$ m⁻³. A potential difference is applied across the wire, causing a current of 2.0 A to flow.

(a) Define electrical resistivity.
(b) Calculate the resistance of the wire.
(c) Calculate the mean drift velocity of the free electrons in the wire.

Mark Scheme / Solution:
(a)
- Resistivity is a property of a material, defined as the resistance of a sample of the material of unit length and unit cross-sectional area. ($\rho = RA/L$). [B1]

(b)
- Use the formula $\rho = \frac{RA}{L}$, rearranged for R: $R = \frac{\rho L}{A}$. [M1]
- $R = \frac{(1.7 \times 10^{-8}) \times 5.0}{1.2 \times 10^{-7}}$. [C1]
- $R = \frac{8.5 \times 10^{-8}}{1.2 \times 10^{-7}} = 0.708$ $\Omega$.
- $R = 0.71$ $\Omega$. [A1]

(c)
- Use the formula $I = nAqv$, rearranged for v: $v = \frac{I}{nAq}$. [M1]
- $I = 2.0$ A.
- $n = 8.5 \times 10^{28}$ m⁻³.
- $A = 1.2 \times 10^{-7}$ m².
- $q = 1.60 \times 10^{-19}$ C (charge of an electron). [C1]
- $v = \frac{2.0}{(8.5 \times 10^{28}) \times (1.2 \times 10^{-7}) \times (1.60 \times 10^{-19})}$. [M1]
- $v = \frac{2.0}{1.632 \times 10^3} = 1.225 \times 10^{-3}$ m s⁻¹.
- $v = 1.2 \times 10^{-3}$ m s⁻¹. [A1]

Standard Solution Steps:
- For resistance, use the resistivity formula $R = \rho L / A$. Ensure all units are SI units.
- For drift velocity, use the formula $I = nAqv$.
- Identify all the variables in the formula. Remember that $n$ is the number density of charge carriers, and $q$ is the charge on one carrier (usually the elementary charge, $e$).
- Rearrange the formula to make the drift velocity $v$ the subject.
- Substitute the known values and calculate the result.

Common Mistakes:
- Algebraic errors when rearranging the formulae.
- Unit conversion errors, although in this question the units are already in SI.
- Confusing number density ($n$) with the number of moles or total number of electrons.
- Using the wrong value for the charge of the carrier $q$.
- Forgetting that the drift velocity of electrons is typically very small. A large answer (e.g., > 1 m s⁻¹) is a sign of a calculation error.

Tags:
electricity, resistance, resistivity, drift_velocity, current

---
## [D.C. Circuits]: [E.M.F. and Internal Resistance]

Syllabus Reference: 9702.10
Learning Objective: Show an understanding of the effects of the internal resistance of a source of e.m.f. on the terminal potential difference and power delivered.

Example Question:
A battery has an electromotive force (e.m.f.) of 12.0 V and an internal resistance of 2.0 $\Omega$. It is connected to a variable resistor R.

(a) Define electromotive force (e.m.f.).
(b) The variable resistor is set to a resistance of 10.0 $\Omega$. Calculate:
(i) the current in the circuit.
(ii) the terminal potential difference across the battery.
(iii) the power delivered to the external resistor R.
(c) The resistance R is varied. Determine the value of R for which the power delivered to it is a maximum.

Mark Scheme / Solution:
(a)
- The e.m.f. of a source is the energy converted from other forms (e.g., chemical) to electrical energy per unit charge passing through the source. (or work done per unit charge). [B1]

(b)
(i)
- Total resistance in circuit = $R + r = 10.0 + 2.0 = 12.0$ $\Omega$. [C1]
- Current $I = \frac{E}{R+r} = \frac{12.0}{12.0} = 1.0$ A. [A1]

(ii)
- Terminal p.d. $V = IR = 1.0 \times 10.0 = 10.0$ V. [C1]
- Alternatively, $V = E - Ir = 12.0 - (1.0 \times 2.0) = 12.0 - 2.0 = 10.0$ V. [A1]

(iii)
- Power $P = VI = 10.0 \times 1.0 = 10.0$ W. [C1]
- Alternatively, $P = I^2 R = (1.0)^2 \times 10.0 = 10.0$ W. [A1]

(c)
- Maximum power is delivered to the external resistor when its resistance is equal to the internal resistance of the source. [B1]
- Therefore, $R = r = 2.0$ $\Omega$. [A1]

Standard Solution Steps:
- Remember that the total resistance in a simple circuit with a power source with internal resistance is the sum of the external resistance and the internal resistance ($R_{total} = R + r$).
- Use Ohm's Law with the total resistance and the e.m.f. to find the circuit current: $I = E / (R+r)$.
- The terminal potential difference ($V$) is the p.d. across the external resistor ($V=IR$) or the e.m.f. minus the "lost volts" across the internal resistance ($V = E - Ir$).
- The power delivered to the external load can be calculated using $P=VI$, $P=I^2R$, or $P=V^2/R$.
- Recall the condition for maximum power transfer: the external load resistance must equal the internal resistance ($R=r$).

Common Mistakes:
- Forgetting to include the internal resistance when calculating the total resistance and current.
- Confusing e.m.f. ($E$) with terminal p.d. ($V$). E.m.f. is the total energy per charge, while terminal p.d. is the energy per charge available to the external circuit.
- Using the e.m.f. in power calculations for the external resistor (e.g., $P = E^2/R$), which is incorrect as some voltage is lost internally.
- Incorrectly stating the condition for maximum power transfer.

Tags:
dc_circuits, internal_resistance, emf, terminal_pd, power

---
## [Particle Physics]: [The Nuclear Atom and Quarks]

Syllabus Reference: 9702.11
Learning Objective: Describe a simple model for the nuclear atom that includes protons, neutrons and electrons. Understand the quark model and be able to state the quark composition of protons and neutrons.

Example Question:
(a) Describe the Geiger-Marsden alpha-particle scattering experiment. Include in your answer the experimental setup, the observations, and the conclusions drawn.

(b) The standard model of particle physics classifies particles into quarks and leptons.
(i) State the quark composition of a proton and a neutron.
(ii) A sigma-plus particle ($\Sigma^+$) is a baryon with a charge of +1e and a strangeness of -1. It contains two up quarks. Determine the identity of the third quark.

Mark Scheme / Solution:
(a)
- Setup: A narrow beam of alpha particles was fired at a thin gold foil in a vacuum. A detector (e.g., a fluorescent screen) was used to observe the path of the alpha particles after interacting with the foil. [B1]
- Observations:
    - Most alpha particles passed straight through the foil with little or no deflection.
    - A small number of alpha particles were deflected through large angles.
    - A very small number (about 1 in 8000) were deflected through angles greater than 90° (i.e., bounced back). [B1]
- Conclusions:
    - The atom is mostly empty space (as most alphas passed straight through).
    - The atom contains a small, dense, positively charged nucleus (to cause the large-angle repulsion).
    - The nucleus contains most of the atom's mass. [B1]

(b)
(i)
- Proton (p): two up quarks, one down quark (uud). [B1]
- Neutron (n): one up quark, two down quarks (udd). [B1]

(ii)
- Let the third quark be Q. A baryon is made of three quarks.
- The composition is (uuQ).
- Charge of up quark = $+2/3$ e.
- Charge of strange quark = $-1/3$ e.
- Charge of down quark = $-1/3$ e.
- Total charge of $\Sigma^+$ is +1e.
- Charge of (uuQ) = $(+2/3) + (+2/3) + (\text{charge of Q}) = +1$. [M1]
- $+4/3 + (\text{charge of Q}) = +1$.
- Charge of Q = $1 - 4/3 = -1/3$ e. [A1]
- This means Q could be a down quark or a strange quark.
- Strangeness of up quark = 0. Strangeness of down quark = 0.
- Strangeness of strange quark = -1.
- Total strangeness of $\Sigma^+$ is -1.
- Strangeness of (uuQ) = $0 + 0 + (\text{strangeness of Q}) = -1$.
- Strangeness of Q = -1. [M1]
- The quark with charge -1/3 e and strangeness -1 is the strange quark (s).
- The third quark is a strange quark. [A1]

Standard Solution Steps:
- For the scattering experiment, structure the answer into Setup, Observations, and Conclusions. Be specific with the observations, including the relative numbers of particles deflected at different angles.
- For quark composition problems, remember the charges of the up ($+2/3$e), down ($-1/3$e), and strange ($-1/3$e) quarks.
- Use the principles of conservation of charge and strangeness.
- Set up equations for the total charge and total strangeness of the particle based on its constituent quarks.
- Solve the equations to determine the properties (and thus identity) of the unknown quark.

Common Mistakes:
- Vague descriptions of the scattering experiment, e.g., saying "some particles were deflected" instead of specifying that a small number were deflected by large angles.
- Confusing the conclusions, e.g., stating that the nucleus is negative.
- Memorising the quark compositions incorrectly.
- Errors in adding the fractional charges of quarks.
- Forgetting that strangeness is a quantum number that must be conserved in strong interactions (but not weak), and using it to identify strange particles.

Tags:
particle_physics, nuclear_model, rutherford_scattering, quarks, leptons, baryons

---
## [Motion in a Circle]: [Angular Speed and Centripetal Force]

Syllabus Reference: 9702.12
Learning Objective: Understand and use the concept of angular speed. Use the equations for centripetal force and centripetal acceleration.

Example Question:
A small object of mass 150 g is attached to a string and is whirled in a horizontal circle of radius 40 cm. The object completes 2.0 revolutions per second.

(a) Define angular speed.
(b) For the object, calculate:
(i) its angular speed, $\omega$.
(ii) its linear speed, $v$.
(iii) the centripetal acceleration, $a$.
(iv) the tension in the string.

Mark Scheme / Solution:
(a)
- Angular speed is the rate of change of angular displacement. [B1]

(b)
(i)
- Frequency $f = 2.0$ Hz.
- Angular speed $\omega = 2\pi f$. [M1]
- $\omega = 2\pi \times 2.0 = 4\pi = 12.57$ rad s⁻¹.
- $\omega = 13$ rad s⁻¹. [A1]

(ii)
- Linear speed $v = r\omega$. [M1]
- Convert radius to metres: $r = 40$ cm $= 0.40$ m.
- $v = 0.40 \times 12.57 = 5.028$ m s⁻¹.
- $v = 5.0$ m s⁻¹. [A1]

(iii)
- Centripetal acceleration $a = r\omega^2$ or $a = v^2/r$. [M1]
- Using $a=r\omega^2$: $a = 0.40 \times (12.57)^2 = 0.40 \times 158.0 = 63.2$ m s⁻².
- Using $a=v^2/r$: $a = (5.028)^2 / 0.40 = 25.28 / 0.40 = 63.2$ m s⁻².
- $a = 63$ m s⁻². [A1]

(iv)
- The centripetal force is provided by the tension in the string. $F_c = T$.
- $F_c = ma$. [M1]
- Convert mass to kg: $m = 150$ g $= 0.150$ kg.
- $T = 0.150 \times 63.2 = 9.48$ N.
- $T = 9.5$ N. [A1]

Standard Solution Steps:
- Convert all quantities to SI units (mass to kg, radius to m).
- Calculate the angular speed $\omega$ from the frequency or period ($\omega=2\pi f$ or $\omega=2\pi/T$).
- Calculate the linear speed using $v=r\omega$.
- Calculate the centripetal acceleration using $a=r\omega^2$ or $a=v^2/r$.
- Identify the force that provides the centripetal force (in this case, tension).
- Use Newton's second law, $F_c = ma$, to calculate the magnitude of this force.

Common Mistakes:
- Forgetting to convert units, especially radius from cm to m and mass from g to kg.
- Confusing angular speed ($\omega$) with linear speed ($v$).
- Using the wrong formula for centripetal acceleration, or forgetting to square the variable (e.g., using $a=r\omega$).
- Using degrees instead of radians for angular speed. The formula $\omega = 2\pi f$ gives the result in radians per second.
- Believing that centripetal force is a separate, new force. It is not; it is the resultant force directed towards the center of the circle, and is provided by other real forces like tension, gravity, or friction.

Tags:
circular_motion, angular_speed, centripetal_force, centripetal_acceleration

---
## [Gravitational fields]: [Geostationary Orbits]

Syllabus Reference: 9702.13
Learning Objective: Analyse the motion of a satellite in a circular orbit, including geostationary orbits.

Example Question:
A satellite of mass 850 kg is to be placed in a geostationary orbit around the Earth. The mass of the Earth is $5.97 \times 10^{24}$ kg and its mean radius is $6.37 \times 10^6$ m. The universal gravitational constant $G$ is $6.67 \times 10^{-11}$ N m² kg⁻².

(a) State two features of a geostationary orbit.
(b) Show that the radius of the geostationary orbit is $4.22 \times 10^7$ m.
(c) Calculate the gravitational potential energy of the satellite when it is in this orbit.

Mark Scheme / Solution:
(a)
- 1. The satellite orbits directly above the Earth's equator.
- 2. The period of the orbit is 24 hours (or 86400 s), the same as the Earth's rotational period.
- 3. The satellite travels in the same direction as the Earth's rotation (west to east). [B2 for any two]

(b)
- The gravitational force provides the centripetal force. [M1]
- $\frac{GMm}{r^2} = m\omega^2r$
- $\frac{GM}{r^2} = (\frac{2\pi}{T})^2 r$ [C1]
- Rearrange for r: $r^3 = \frac{GMT^2}{4\pi^2}$.
- The period T must be in seconds: $T = 24 \times 60 \times 60 = 86400$ s. [C1]
- $r^3 = \frac{(6.67 \times 10^{-11}) \times (5.97 \times 10^{24}) \times (86400)^2}{4\pi^2}$
- $r^3 = \frac{2.97 \times 10^{24}}{39.48} = 7.53 \times 10^{22}$ m³. [M1]
- $r = \sqrt[3]{7.53 \times 10^{22}} = 4.223 \times 10^7$ m.
- $r \approx 4.22 \times 10^7$ m. [A1]

(c)
- Gravitational potential energy $\Phi = -\frac{GMm}{r}$. [M1]
- $\Phi = -\frac{(6.67 \times 10^{-11}) \times (5.97 \times 10^{24}) \times 850}{4.22 \times 10^7}$. [C1]
- $\Phi = -8.02 \times 10^9$ J. [A1]

Standard Solution Steps:
- For orbital motion, always start by equating the gravitational force to the required centripetal force ($F_g = F_c$).
- Express the centripetal force in terms of angular speed ($m\omega^2r$) as the period ($T$) is usually known.
- Relate angular speed to period using $\omega = 2\pi/T$.
- Ensure the period $T$ is converted to seconds.
- Substitute the expressions into the force equation and solve for the unknown variable (e.g., radius $r$).
- Use the formula $\Phi = -GMm/r$ for gravitational potential energy, remembering the negative sign.

Common Mistakes:
- Using the period in hours instead of seconds.
- Confusing the radius of the orbit ($r$) with the height above the Earth's surface ($h$). Remember $r = R_{Earth} + h$.
- Using $g = 9.81$ m s⁻² in orbital calculations; this value is only valid on the surface of the Earth. The acceleration of free fall decreases with altitude.
- Forgetting the negative sign for gravitational potential energy.

Tags:
gravitational_fields, geostationary_orbit, centripetal_force, gravitational_potential

---
## [Temperature]: [Specific Heat Capacity]

Syllabus Reference: 9702.14
Learning Objective: Define and use specific heat capacity.

Example Question:
An electrical heater, rated at 50 W, is used to heat a 0.80 kg block of a metal. The heater is switched on for 4.0 minutes and the temperature of the block increases from 20.0 °C to 55.0 °C.

(a) Define specific heat capacity.
(b) Calculate the energy supplied by the heater.
(c) Assuming all the energy from the heater is transferred to the block, calculate the specific heat capacity of the metal.
(d) In reality, the value calculated in (c) would be an overestimate. Explain why.

Mark Scheme / Solution:
(a)
- Specific heat capacity is the thermal energy required to raise the temperature of a unit mass (1 kg) of a substance by one degree (1 K or 1 °C), without a change of state. [B1]

(b)
- Energy supplied = Power × time. [M1]
- Time in seconds = $4.0 \times 60 = 240$ s. [C1]
- Energy = $50 \times 240 = 12000$ J. [A1]

(c)
- Thermal energy absorbed $Q = mc\Delta\theta$. We assume $Q$ is equal to energy supplied. [M1]
- Change in temperature $\Delta\theta = 55.0 - 20.0 = 35.0$ °C. [C1]
- $12000 = 0.80 \times c \times 35.0$.
- $c = \frac{12000}{0.80 \times 35.0} = \frac{12000}{28} = 428.6$ J kg⁻¹ K⁻¹.
- $c = 430$ J kg⁻¹ K⁻¹ (to 2 s.f.). [A1]

(d)
- In a real experiment, some thermal energy would be lost from the block to the surroundings. [B1]
- Therefore, the actual energy absorbed by the block is less than the 12000 J supplied. Since $c$ is calculated using $c = Q_{supplied}/(m\Delta\theta)$, using the larger supplied energy value in the numerator results in a calculated value of $c$ that is higher than the true value. [B1]

Standard Solution Steps:
- Calculate the electrical energy supplied using $E = P \times t$. Ensure time is in seconds.
- Calculate the change in temperature, $\Delta\theta$. Remember that a change in Celsius is the same as a change in Kelvin.
- Use the formula for thermal energy absorbed, $Q = mc\Delta\theta$.
- In a closed system, set the energy supplied equal to the energy absorbed and solve for the unknown quantity.
- When considering experimental reality, account for heat loss to the surroundings, which means energy supplied > energy absorbed.

Common Mistakes:
- Using time in minutes instead of seconds in the power equation.
- Forgetting to calculate the *change* in temperature and using just the initial or final temperature.
- In questions involving heat loss, getting the logic reversed when explaining why a calculated value is an over- or under-estimate.

Tags:
temperature, specific_heat_capacity, thermal_energy, power

---
## [Ideal gases]: [Gas Laws and Kinetic Theory]

Syllabus Reference: 9702.15
Learning Objective: Use the ideal gas equation $pV = nRT$ and the relation $p = \frac{1}{3}\frac{Nm}{V}\langle c^2 \rangle$.

Example Question:
A cylinder contains 0.050 m³ of helium gas at a pressure of $2.0 \times 10^5$ Pa and a temperature of 27 °C. The molar mass of helium is $4.0$ g mol⁻¹. Assume helium behaves as an ideal gas.
($R = 8.31$ J K⁻¹ mol⁻¹, $N_A = 6.02 \times 10^{23}$ mol⁻¹)

(a) Calculate the number of moles of helium gas in the cylinder.
(b) Calculate the mass of a single helium atom.
(c) Using the kinetic theory equation $p = \frac{1}{3}\frac{Nm}{V}\langle c^2 \rangle$, calculate the root-mean-square (r.m.s.) speed of the helium atoms.

Mark Scheme / Solution:
(a)
- Convert temperature to Kelvin: $T = 27 + 273 = 300$ K. [C1]
- Use the ideal gas equation $pV = nRT$. [M1]
- $n = \frac{pV}{RT} = \frac{(2.0 \times 10^5) \times 0.050}{8.31 \times 300}$. [C1]
- $n = \frac{10000}{2493} = 4.01$ mol. [A1]

(b)
- Mass of one mole is 4.0 g = $0.0040$ kg. [C1]
- One mole contains $N_A$ atoms.
- Mass of one atom $m = \frac{\text{Molar Mass}}{N_A} = \frac{0.0040}{6.02 \times 10^{23}}$. [M1]
- $m = 6.64 \times 10^{-27}$ kg. [A1]

(c)
- Rearrange the kinetic theory equation for $\langle c^2 \rangle$: $\langle c^2 \rangle = \frac{3pV}{Nm}$. [M1]
- $N$ is the total number of atoms: $N = n \times N_A = 4.01 \times (6.02 \times 10^{23}) = 2.41 \times 10^{24}$. [C1]
- $\langle c^2 \rangle = \frac{3 \times (2.0 \times 10^5) \times 0.050}{(2.41 \times 10^{24}) \times (6.64 \times 10^{-27})} = \frac{30000}{1.60}$.
- $\langle c^2 \rangle = 1.875 \times 10^6$ m² s⁻². [C1]
- r.m.s. speed $c_{rms} = \sqrt{\langle c^2 \rangle} = \sqrt{1.875 \times 10^6} = 1369$ m s⁻¹.
- $c_{rms} = 1400$ m s⁻¹. [A1]

Standard Solution Steps:
- Always convert temperature to Kelvin for ideal gas calculations.
- Use $pV=nRT$ to relate the macroscopic properties of the gas.
- To find the mass of one atom, divide the molar mass (in kg) by Avogadro's constant.
- The kinetic theory equation relates macroscopic pressure and volume to the microscopic properties of the atoms (number, mass, and speed).
- Remember that $\langle c^2 \rangle$ is the mean-square speed, and the r.m.s. speed is its square root.

Common Mistakes:
- Using temperature in degrees Celsius instead of Kelvin.
- Confusing the number of moles ($n$) with the number of molecules ($N$).
- Confusing the universal gas constant ($R$) with the Boltzmann constant ($k$).
- Forgetting to take the square root to find the r.m.s. speed from the mean-square speed.
- Using molar mass in grams instead of kilograms when calculating the mass of an atom.

Tags:
ideal_gases, kinetic_theory, rms_speed, ideal_gas_law

---
## [Thermodynamics]: [First Law]

Syllabus Reference: 9702.16
Learning Objective: Apply the first law of thermodynamics to a number of situations.

Example Question:
An ideal gas is enclosed in a cylinder by a frictionless piston. The gas initially has a volume of $3.0 \times 10^{-4}$ m³ at a pressure of $1.5 \times 10^5$ Pa. The gas is heated, and it expands at a constant pressure to a final volume of $7.5 \times 10^{-4}$ m³. During the expansion, $150$ J of thermal energy is supplied to the gas.

(a) State the first law of thermodynamics in terms of the increase in internal energy $\Delta U$, the heat supplied to the system $Q$, and the work done on the system $W$.
(b) Calculate the work done by the gas during the expansion.
(c) Use your answer in (b) to state the work done *on* the gas.
(d) Calculate the increase in the internal energy of the gas.

Mark Scheme / Solution:
(a)
- $\Delta U = Q + W$. [B1]
- Where $\Delta U$ is the increase in internal energy of the system, $Q$ is the thermal energy supplied to the system, and $W$ is the work done on the system. [B1]

(b)
- For expansion at constant pressure, work done by gas = $p\Delta V$. [M1]
- $\Delta V = (7.5 \times 10^{-4}) - (3.0 \times 10^{-4}) = 4.5 \times 10^{-4}$ m³. [C1]
- Work done by gas = $(1.5 \times 10^5) \times (4.5 \times 10^{-4}) = 67.5$ J. [A1]

(c)
- Work done *on* the gas is the negative of the work done *by* the gas. [M1]
- $W = -67.5$ J. [A1]

(d)
- Using the first law of thermodynamics: $\Delta U = Q + W$. [M1]
- $Q = +150$ J (heat is supplied).
- $W = -67.5$ J.
- $\Delta U = 150 + (-67.5) = 82.5$ J.
- $\Delta U = 83$ J. [A1]

Standard Solution Steps:
- Clearly state the first law of thermodynamics and the sign convention being used ($W$ as work done ON the system).
- Calculate the work done. For a constant pressure process, use $W_{by} = p\Delta V$.
- Determine the sign of $W$ (work done on the system). If the gas expands, it does work on the surroundings, so the work done *on* it is negative.
- Determine the sign of $Q$. If heat is supplied *to* the system, $Q$ is positive.
- Substitute the values of $Q$ and $W$ into the first law equation to find the change in internal energy $\Delta U$.

Common Mistakes:
- **Sign convention for work done.** This is the most common error. The CAIE syllabus defines $W$ as work done *on* the system. Expansion means $W$ is negative. Compression means $W$ is positive.
- Confusing work done *by* the gas with work done *on* the gas.
- Errors in calculating the change in volume $\Delta V$.
- Applying $W=p\Delta V$ to situations where pressure is not constant.

Tags:
thermodynamics, first_law, internal_energy, work_done

---
## [Oscillations]: [Simple Harmonic Motion and Energy]

Syllabus Reference: 9702.17
Learning Objective: Use the defining equation for SHM, $a = -\omega^2 x$, and analyse energy changes in SHM.

Example Question:
A small block of mass 250 g is attached to a horizontal spring of spring constant $k=40$ N m⁻¹. The block rests on a frictionless surface. The block is pulled 5.0 cm from its equilibrium position and released, undergoing simple harmonic motion (SHM).

(a) Show that the angular frequency $\omega$ of the oscillations is 12.6 rad s⁻¹.
(b) Calculate the maximum speed of the block.
(c) Calculate the total energy of the oscillating system.
(d) Determine the speed of the block when it is 2.0 cm from the equilibrium position.

Mark Scheme / Solution:
(a)
- For a mass-spring system, $\omega^2 = k/m$. [M1]
- Mass $m = 250$ g $= 0.250$ kg.
- $\omega^2 = \frac{40}{0.250} = 160$. [C1]
- $\omega = \sqrt{160} = 12.649$ rad s⁻¹.
- $\omega \approx 12.6$ rad s⁻¹. [A1]

(b)
- Maximum speed $v_{max} = A\omega$ or $v_{max} = x_0 \omega$. [M1]
- Amplitude $A = 5.0$ cm $= 0.050$ m. [C1]
- $v_{max} = 0.050 \times 12.649 = 0.632$ m s⁻¹.
- $v_{max} = 0.63$ m s⁻¹. [A1]

(c)
- Total energy $E = \frac{1}{2}m v_{max}^2$ or $E = \frac{1}{2} k A^2$. [M1]
- Using $E = \frac{1}{2} k A^2$:
- $E = \frac{1}{2} \times 40 \times (0.050)^2 = 20 \times 0.0025 = 0.050$ J. [A1]

(d)
- By conservation of energy: Total Energy = Kinetic Energy + Potential Energy.
- $E = \frac{1}{2}mv^2 + \frac{1}{2}kx^2$. [M1]
- $0.050 = \frac{1}{2}(0.250)v^2 + \frac{1}{2}(40)(0.020)^2$. [C1]
- $0.050 = 0.125v^2 + 20(0.0004) = 0.125v^2 + 0.008$.
- $0.125v^2 = 0.050 - 0.008 = 0.042$.
- $v^2 = \frac{0.042}{0.125} = 0.336$.
- $v = \sqrt{0.336} = 0.580$ m s⁻¹.
- $v = 0.58$ m s⁻¹. [A1]
- Alternative using $v = \pm \omega \sqrt{A^2-x^2}$:
- $v = 12.6 \sqrt{0.050^2 - 0.020^2} = 12.6 \sqrt{0.0021} = 12.6 \times 0.0458 = 0.577$ m s⁻¹. [A1]

Standard Solution Steps:
- Ensure all units are SI units (kg, m, s).
- Calculate the angular frequency $\omega$ using the appropriate formula for the system (e.g., $\omega^2=k/m$ for a spring).
- Use the standard SHM equations ($v_{max}=A\omega$, $a_{max}=A\omega^2$) to find maximum values.
- Calculate total energy using the formula involving maximum speed or amplitude.
- To find velocity at a specific displacement, use conservation of energy or the formula $v = \pm \omega \sqrt{A^2-x^2}$.

Common Mistakes:
- Using mass in grams or amplitude/displacement in cm without converting to SI units.
- Confusing angular frequency $\omega$ (in rad s⁻¹) with frequency $f$ (in Hz).
- Errors in the energy conservation equation, e.g., forgetting the $\frac{1}{2}$ or mixing up KE and PE terms.
- Forgetting to square terms like amplitude or omega in energy calculations.

Tags:
oscillations, simple_harmonic_motion, shm, energy_in_shm, mass-spring_system

---
## [Electric fields]: [Charged Particles in Uniform Fields]

Syllabus Reference: 9702.18
Learning Objective: Describe the motion of a beam of charged particles in a uniform electric field.

Example Question:
An electron is fired horizontally with a speed of $2.5 \times 10^7$ m s⁻¹ into a uniform electric field. The field is created by two parallel plates of length 8.0 cm, separated by 2.0 cm. A potential difference of 500 V is applied across the plates.
(Charge of an electron $e = 1.60 \times 10^{-19}$ C, mass of an electron $m_e = 9.11 \times 10^{-31}$ kg).

(a) Calculate the magnitude of the electric field strength between the plates.
(b) Calculate the vertical acceleration of the electron in the field.
(c) The electron enters the field at the midpoint between the plates. Calculate the magnitude of the vertical deflection of the electron as it emerges from the field.

Mark Scheme / Solution:
(a)
- For a uniform field between parallel plates, $E = V/d$. [M1]
- $d = 2.0$ cm $= 0.020$ m.
- $E = \frac{500}{0.020} = 25000$ V m⁻¹ (or N C⁻¹). [A1]

(b)
- Force on electron $F = eE$. [M1]
- $F = (1.60 \times 10^{-19}) \times 25000 = 4.0 \times 10^{-15}$ N.
- Using Newton's second law, $F=ma$, so $a = F/m_e$. [C1]
- $a = \frac{4.0 \times 10^{-15}}{9.11 \times 10^{-31}} = 4.39 \times 10^{15}$ m s⁻². [A1]

(c)
- This is analogous to projectile motion.
- First, find the time spent in the field. The horizontal velocity is constant.
- Time $t = \frac{\text{horizontal distance}}{\text{horizontal speed}} = \frac{L}{v_x}$. [M1]
- $L = 8.0$ cm $= 0.080$ m.
- $t = \frac{0.080}{2.5 \times 10^7} = 3.2 \times 10^{-9}$ s. [C1]
- Now consider vertical motion. Initial vertical velocity $u_y = 0$.
- Vertical deflection $s_y = u_y t + \frac{1}{2} a_y t^2$. [M1]
- $s_y = 0 + \frac{1}{2} \times (4.39 \times 10^{15}) \times (3.2 \times 10^{-9})^2$.
- $s_y = \frac{1}{2} \times (4.39 \times 10^{15}) \times (1.024 \times 10^{-17}) = 0.0225$ m.
- Deflection = $0.0225$ m = $2.25$ cm. [A1]
- (The electron hits the plate since deflection > 1.0 cm. The question is valid, the result is just large).

Standard Solution Steps:
- Treat the motion in two independent perpendicular directions: horizontal and vertical.
- Horizontal motion: Constant velocity (no force in this direction).
- Vertical motion: Constant acceleration (due to the uniform electric field).
- Calculate the electric field strength ($E=V/d$) and the electric force ($F=qE$).
- Use $F=ma$ to find the vertical acceleration.
- Use the horizontal motion to find the time the particle spends in the field ($t = L/v_x$).
- Use the vertical motion equations of kinematics (suvat) with the calculated time and acceleration to find the vertical displacement (deflection).

Common Mistakes:
- Using the wrong distance in $E=V/d$ (using plate length instead of plate separation).
- Forgetting that the horizontal velocity remains constant throughout the motion.
- Applying a force or acceleration in the horizontal direction.
- Errors in using the equations of motion (suvat).

Tags:
electric_fields, projectile_motion, uniform_field, charged_particles

---
## [Capacitance]: [Resistor-Capacitor (RC) Discharge Circuits]

Syllabus Reference: 9702.19
Learning Objective: Analyse the discharge of a capacitor through a resistor.

Example Question:
A 4700 μF capacitor is charged to a potential difference of 12 V. It is then discharged through a 2.5 kΩ resistor.

(a) Define capacitance.
(b) Calculate the initial energy stored in the capacitor.
(c) Calculate the time constant of the discharge circuit.
(d) Calculate the potential difference across the capacitor after 15 s of discharging.

Mark Scheme / Solution:
(a)
- Capacitance is the ratio of the charge stored on a conductor to the potential difference between the conductors. ($C=Q/V$). [B1]

(b)
- Energy stored $E = \frac{1}{2}CV^2$. [M1]
- $C = 4700$ μF $= 4700 \times 10^{-6}$ F.
- $E = \frac{1}{2} \times (4700 \times 10^{-6}) \times (12)^2 = \frac{1}{2} \times (4.7 \times 10^{-3}) \times 144$. [C1]
- $E = 0.338$ J. [A1]

(c)
- Time constant $\tau = RC$. [M1]
- $R = 2.5$ kΩ $= 2500$ Ω.
- $\tau = 2500 \times (4700 \times 10^{-6}) = 11.75$ s. [A1]
- $\tau = 12$ s.

(d)
- Use the discharge equation $V = V_0 e^{-t/\tau}$. [M1]
- $V_0 = 12$ V, $t = 15$ s, $\tau = 11.75$ s.
- $V = 12 \times e^{-15 / 11.75} = 12 \times e^{-1.276}$. [C1]
- $V = 12 \times 0.279 = 3.35$ V.
- $V = 3.4$ V. [A1]

Standard Solution Steps:
- Ensure all values are in SI units (F for capacitance, Ω for resistance).
- Use the appropriate formula for energy stored ($E=\frac{1}{2}CV^2$ or $E=\frac{1}{2}QV$ or $E=\frac{Q^2}{2C}$).
- Calculate the time constant using $\tau = RC$.
- Use the exponential decay equations for discharge: $V = V_0 e^{-t/\tau}$, $I = I_0 e^{-t/\tau}$, or $Q = Q_0 e^{-t/\tau}$.
- Substitute the known values and solve for the unknown, being careful with the exponential function.

Common Mistakes:
- Unit conversion errors, especially for μF and kΩ.
- Using the charging equation ($V = V_0(1-e^{-t/\tau})$) for a discharging problem.
- Errors in calculating the time constant.
- Mathematical errors when evaluating the exponential term, especially with calculators.

Tags:
capacitance, capacitor_discharge, time_constant, stored_energy

---
## [Magnetic fields]: [Motion of Charged Particles]

Syllabus Reference: 9702.20
Learning Objective: Analyse the motion of a charged particle in a uniform magnetic field.

Example Question:
A proton (mass $1.67 \times 10^{-27}$ kg, charge $+1.60 \times 10^{-19}$ C) enters a region of uniform magnetic field of flux density 0.50 T. The velocity of the proton is $4.0 \times 10^6$ m s⁻¹ and is perpendicular to the magnetic field.

(a) State the shape of the path of the proton in the magnetic field and explain why it takes this path.
(b) Calculate the magnitude of the magnetic force acting on the proton.
(c) Calculate the radius of the circular path of the proton.
(d) An electron enters the same field with the same velocity. State two ways its path would differ from the proton's path.

Mark Scheme / Solution:
(a)
- Shape: The path is a circle (or arc of a circle). [B1]
- Explanation: The magnetic force is always perpendicular to the velocity of the proton. A force that is always perpendicular to velocity provides a centripetal force, causing circular motion. [B1]

(b)
- Magnetic force $F = Bqv$. [M1]
- $F = 0.50 \times (1.60 \times 10^{-19}) \times (4.0 \times 10^6)$. [C1]
- $F = 3.2 \times 10^{-13}$ N. [A1]

(c)
- The magnetic force provides the centripetal force. [M1]
- $Bqv = \frac{mv^2}{r}$. [C1]
- Rearrange for radius $r = \frac{mv}{Bq}$.
- $r = \frac{(1.67 \times 10^{-27}) \times (4.0 \times 10^6)}{0.50 \times (1.60 \times 10^{-19})}$. [M1]
- $r = \frac{6.68 \times 10^{-21}}{8.0 \times 10^{-20}} = 0.0835$ m.
- $r = 8.4$ cm. [A1]

(d)
- 1. The path would curve in the opposite direction (e.g., anti-clockwise instead of clockwise) because the electron has a negative charge. [B1]
- 2. The radius of the path would be much smaller because the electron has a much smaller mass. [B1]

Standard Solution Steps:
- Recognise that a charged particle moving perpendicular to a uniform B-field experiences a force given by $F=Bqv$.
- Understand that this force is always perpendicular to velocity, thus acting as a centripetal force.
- Equate the magnetic force to the centripetal force: $Bqv = mv^2/r$.
- Solve this equation for the required quantity (e.g., radius $r$).
- Use Fleming's Left-Hand Rule to determine the direction of the force and hence the curvature of the path.

Common Mistakes:
- Using the wrong formula for force (e.g., $F=BIL$ for a wire).
- Forgetting to equate the magnetic force to the centripetal force.
- Algebraic errors when rearranging the equation to solve for the radius.
- Confusing the properties of a proton and an electron (charge sign and mass).

Tags:
magnetic_fields, force_on_charge, circular_motion, centripetal_force

---
## [Alternating currents]: [R.M.S. Values and Power]

Syllabus Reference: 9702.21
Learning Objective: Understand and use the terms peak value, root-mean-square (r.m.s.) value and mean power in the context of alternating currents.

Example Question:
A sinusoidal alternating voltage supply has a peak value of 325 V and a frequency of 50 Hz. It is connected to a resistive heater with a resistance of 120 Ω.

(a) Define the root-mean-square (r.m.s.) value of an alternating current.
(b) Calculate the r.m.s. voltage of the supply.
(c) Calculate the r.m.s. current in the heater.
(d) Calculate the mean power dissipated by the heater.

Mark Scheme / Solution:
(a)
- The r.m.s. value of an alternating current is the value of the direct current that would dissipate thermal energy at the same rate in a given resistor. [B1]

(b)
- $V_{rms} = \frac{V_0}{\sqrt{2}}$, where $V_0$ is the peak voltage. [M1]
- $V_{rms} = \frac{325}{\sqrt{2}} = 229.8$ V.
- $V_{rms} = 230$ V. [A1]

(c)
- Use Ohm's Law with r.m.s. values: $I_{rms} = \frac{V_{rms}}{R}$. [M1]
- $I_{rms} = \frac{229.8}{120} = 1.915$ A.
- $I_{rms} = 1.9$ A. [A1]

(d)
- Mean power $P = V_{rms} \times I_{rms}$. [M1]
- $P = 229.8 \times 1.915 = 440$ W. [A1]
- Alternative 1: $P = I_{rms}^2 R = (1.915)^2 \times 120 = 3.667 \times 120 = 440$ W.
- Alternative 2: $P = \frac{V_{rms}^2}{R} = \frac{(229.8)^2}{120} = \frac{52808}{120} = 440$ W.

Standard Solution Steps:
- Remember the relationship between peak and r.m.s. values: $V_{rms} = V_0/\sqrt{2}$ and $I_{rms} = I_0/\sqrt{2}$.
- Apply Ohm's law ($V=IR$) using consistent values (either both peak or both r.m.s.). It is standard to work with r.m.s. values.
- Calculate the mean (average) power using any of the standard power formulae ($P=VI, P=I^2R, P=V^2/R$), but *always* use r.m.s. values for V and I.

Common Mistakes:
- Using peak values to calculate mean power. This gives a value that is twice the correct mean power ($P_{peak} = V_0 I_0 = 2 \times P_{mean}$).
- Confusing peak voltage with r.m.s. voltage. In many countries, the stated mains voltage (e.g., 230 V) is the r.m.s. value.
- Errors in applying Ohm's law or the power formulas.

Tags:
alternating_current, ac, rms, peak_value, mean_power

---
## [Quantum physics]: [Line Spectra and Photons]

Syllabus Reference: 9702.22
Learning Objective: Explain the origin of the emission and absorption line spectra. Use the relation for the energy of a photon, $E=hf$.

Example Question:
The diagram shows some of the energy levels of an isolated hydrogen atom.

- - - - - - - - - - - 0 eV
- - - - - - - - - - - -1.51 eV
- - - - - - - - - - - -3.40 eV
- - - - - - - - - - - -13.6 eV

(a) Explain what is meant by an energy level of an atom.
(b) An electron in the ground state absorbs a photon and is excited to the -1.51 eV level. Calculate the energy of the absorbed photon.
(c) The electron then de-excites, returning to the ground state by emitting one or more photons. Determine the wavelengths of the three possible photons that could be emitted.
($h = 6.63 \times 10^{-34}$ J s, $c = 3.00 \times 10^8$ m s⁻¹, $e = 1.60 \times 10^{-19}$ C)

Mark Scheme / Solution:
(a)
- An energy level is one of a discrete set of allowed energy values that an electron can have within an atom. [B1]

(b)
- Energy of photon = Difference in energy levels.
- $\Delta E = E_{final} - E_{initial} = (-1.51) - (-13.6) = 12.09$ eV. [A1]

(c)
- The possible transitions are:
    1. -1.51 eV to -13.6 eV (direct)
    2. -1.51 eV to -3.40 eV
    3. -3.40 eV to -13.6 eV
- Use the relation $\Delta E = hf = \frac{hc}{\lambda}$. So, $\lambda = \frac{hc}{\Delta E}$. [M1]
- First, convert energy differences from eV to Joules by multiplying by $1.60 \times 10^{-19}$. [C1]
- **Transition 1**: $\Delta E = 12.09$ eV $= 1.934 \times 10^{-18}$ J.
    - $\lambda_1 = \frac{(6.63 \times 10^{-34}) \times (3.00 \times 10^8)}{1.934 \times 10^{-18}} = 1.028 \times 10^{-7}$ m (103 nm). [A1]
- **Transition 2**: $\Delta E = (-1.51) - (-3.40) = 1.89$ eV $= 3.024 \times 10^{-19}$ J.
    - $\lambda_2 = \frac{(6.63 \times 10^{-34}) \times (3.00 \times 10^8)}{3.024 \times 10^{-19}} = 6.58 \times 10^{-7}$ m (658 nm). [A1]
- **Transition 3**: $\Delta E = (-3.40) - (-13.6) = 10.2$ eV $= 1.632 \times 10^{-18}$ J.
    - $\lambda_3 = \frac{(6.63 \times 10^{-34}) \times (3.00 \times 10^8)}{1.632 \times 10^{-18}} = 1.218 \times 10^{-7}$ m (122 nm). [A1]

Standard Solution Steps:
- Understand that a photon is absorbed or emitted when an electron transitions between discrete energy levels.
- The photon energy is equal to the exact energy difference between the two levels: $\Delta E = E_1 - E_2$.
- Convert the energy difference from electron-volts (eV) to Joules (J) by multiplying by $1.60 \times 10^{-19}$.
- Use the photon energy equation $E=hf$ and the wave equation $c=f\lambda$ to relate energy to wavelength: $\lambda = hc/E$.
- Substitute values to calculate the wavelength.

Common Mistakes:
- Forgetting to convert energy from eV to J before using it in equations with constants in SI units.
- Errors in calculating the energy difference between levels.
- Identifying the incorrect possible transitions for de-excitation.
- Using the energy of a level itself rather than the difference between levels.

Tags:
quantum_physics, energy_levels, photon, emission_spectra, absorption_spectra

---
## [Nuclear physics]: [Mass-Energy Equivalence]

Syllabus Reference: 9702.23
Learning Objective: Understand and use the relationship between mass and energy as given by $E=mc^2$.

Example Question:
One possible fission reaction of Uranium-235 is:
$ ^{235}_{92}\text{U} + ^1_0\text{n} \rightarrow ^{141}_{56}\text{Ba} + ^{92}_{36}\text{Kr} + 3(^1_0\text{n}) $
The masses of the particles involved are:
- Mass of $^{235}_{92}\text{U}$ nucleus = 235.0439 u
- Mass of $^{141}_{56}\text{Ba}$ nucleus = 140.9144 u
- Mass of $^{92}_{36}\text{Kr}$ nucleus = 91.9262 u
- Mass of a neutron ($^1_0\text{n}$) = 1.0087 u
(1 u = $1.66 \times 10^{-27}$ kg)

(a) Define mass defect.
(b) Calculate the mass defect for this reaction.
(c) Calculate the energy released in this single fission reaction, giving your answer in Joules.

Mark Scheme / Solution:
(a)
- Mass defect is the difference between the total mass of the individual, separate nucleons and the mass of the nucleus. [B1]

(b)
- Mass before reaction = Mass of U-235 + Mass of 1 neutron
- Mass before = $235.0439 + 1.0087 = 236.0526$ u. [C1]
- Mass after reaction = Mass of Ba-141 + Mass of Kr-92 + Mass of 3 neutrons
- Mass after = $140.9144 + 91.9262 + 3(1.0087) = 140.9144 + 91.9262 + 3.0261 = 235.8667$ u. [C1]
- Mass defect $\Delta m$ = Mass before - Mass after. [M1]
- $\Delta m = 236.0526 - 235.8667 = 0.1859$ u. [A1]

(c)
- Convert mass defect to kg:
- $\Delta m = 0.1859 \times (1.66 \times 10^{-27}) = 3.086 \times 10^{-28}$ kg. [C1]
- Use Einstein's mass-energy equivalence equation $E = \Delta m c^2$. [M1]
- $E = (3.086 \times 10^{-28}) \times (3.00 \times 10^8)^2$.
- $E = (3.086 \times 10^{-28}) \times (9.00 \times 10^{16}) = 2.777 \times 10^{-11}$ J.
- $E = 2.78 \times 10^{-11}$ J. [A1]

Standard Solution Steps:
- Carefully sum the masses of all particles/nuclei on the reactant (left) side of the equation.
- Carefully sum the masses of all particles/nuclei on the product (right) side of the equation. Pay attention to coefficients (e.g., 3 neutrons).
- The mass defect is the difference between these two totals (Mass before - Mass after).
- Convert the mass defect from atomic mass units (u) to kilograms (kg).
- Use the equation $E = \Delta m c^2$ to calculate the energy released.

Common Mistakes:
- Miscounting the number of particles on either side of the reaction, especially the neutrons.
- Calculating mass defect as (Mass after - Mass before), which gives the wrong sign.
- Forgetting to convert the mass defect from u to kg before using $E=mc^2$.
- Errors in squaring the speed of light.

Tags:
nuclear_physics, fission, mass_defect, mass-energy_equivalence

---
## [Medical physics]: [Ultrasound and Acoustic Impedance]

Syllabus Reference: 9702.24
Learning Objective: Explain the principles behind the generation and detection of ultrasound. Use the equation for the specific acoustic impedance $Z = \rho c$.

Example Question:
Ultrasound is used in medical imaging to distinguish between different tissues.
(a) Define specific acoustic impedance.
(b) The speed of ultrasound in soft tissue is 1540 m s⁻¹ and its density is 1060 kg m⁻³. The speed of ultrasound in bone is 4080 m s⁻¹ and its density is 1900 kg m⁻³.
(i) Calculate the specific acoustic impedance of soft tissue.
(ii) Calculate the specific acoustic impedance of bone.
(c) The intensity reflection coefficient $\alpha$ at a boundary between two materials is given by $\alpha = (\frac{Z_2 - Z_1}{Z_2 + Z_1})^2$. Calculate the value of $\alpha$ for the boundary between soft tissue and bone.
(d) Explain why a gel is used between the ultrasound transducer and the patient's skin.

Mark Scheme / Solution:
(a)
- Specific acoustic impedance is the product of the density of a medium and the speed of sound in that medium. [B1]

(b)
(i)
- Use the formula $Z = \rho c$. [M1]
- $Z_{tissue} = 1060 \times 1540 = 1.632 \times 10^6$ kg m⁻² s⁻¹.
- $Z_{tissue} = 1.63 \times 10^6$ kg m⁻² s⁻¹. [A1]
(ii)
- $Z_{bone} = 1900 \times 4080 = 7.752 \times 10^6$ kg m⁻² s⁻¹.
- $Z_{bone} = 7.75 \times 10^6$ kg m⁻² s⁻¹. [A1]

(c)
- Substitute the Z-values into the reflection coefficient formula.
- $\alpha = (\frac{(7.75 \times 10^6) - (1.63 \times 10^6)}{(7.75 \times 10^6) + (1.63 \times 10^6)})^2$. [M1]
- $\alpha = (\frac{6.12 \times 10^6}{9.38 \times 10^6})^2 = (0.652)^2 = 0.425$.
- $\alpha = 0.43$. [A1]

(d)
- Without a gel, there is a layer of air between the transducer and the skin.
- Air has a very different (much lower) acoustic impedance compared to skin/tissue. [B1]
- This large mismatch in impedance would cause a very high reflection coefficient ($\alpha \approx 1$), meaning most of the ultrasound would be reflected at the surface and would not enter the body. The gel displaces the air and has an acoustic impedance similar to skin, allowing for efficient transmission of the ultrasound into the body. [B1]

Standard Solution Steps:
- Use the formula $Z=\rho c$ to calculate the specific acoustic impedance for each material.
- Substitute the Z-values into the intensity reflection coefficient formula. Be careful with the subtraction and addition.
- Square the result to find the final coefficient.
- For conceptual questions, relate the acoustic impedance mismatch to the amount of reflection at a boundary. A large mismatch means high reflection; a small mismatch means high transmission.

Common Mistakes:
- Using the wrong values for density or speed.
- Forgetting to square the term in the reflection coefficient formula.
- Incorrectly explaining the role of the coupling gel; the key is the impedance matching, not simply lubrication.

Tags:
medical_physics, ultrasound, acoustic_impedance, reflection_coefficient

---
## [Astronomy and cosmology]: [Hubble's Law and Redshift]

Syllabus Reference: 9702.25
Learning Objective: Understand that the Universe is expanding and that this is suggested by the redshift of galaxies. Use Hubble's law.

Example Question:
(a) State Hubble's law.
(b) The light from a distant galaxy is analysed. A spectral line corresponding to hydrogen, which has a wavelength of 656.3 nm when measured in a laboratory on Earth, is observed to have a wavelength of 672.8 nm.
(i) Calculate the redshift, $z$, of this galaxy.
(ii) Calculate the recessional speed of the galaxy.
(iii) Use Hubble's law to estimate the distance to the galaxy.
(The Hubble constant $H_0 = 2.2 \times 10^{-18}$ s⁻¹)

Mark Scheme / Solution:
(a)
- Hubble's law states that the recessional speed of a galaxy is directly proportional to its distance from Earth. [B1]
- Mathematically, $v = H_0 d$. [B1]

(b)
(i)
- Redshift $z = \frac{\Delta \lambda}{\lambda}$. [M1]
- $\Delta \lambda = \lambda_{observed} - \lambda_{rest} = 672.8 - 656.3 = 16.5$ nm. [C1]
- $z = \frac{16.5}{656.3} = 0.0251$. [A1]

(ii)
- For non-relativistic speeds, $z \approx \frac{v}{c}$. So, $v = zc$. [M1]
- $v = 0.0251 \times (3.00 \times 10^8 \text{ m s⁻¹}) = 7.53 \times 10^6$ m s⁻¹. [A1]

(iii)
- From Hubble's law, $v = H_0 d$, so $d = \frac{v}{H_0}$. [M1]
- $d = \frac{7.53 \times 10^6}{2.2 \times 10^{-18}} = 3.42 \times 10^{24}$ m. [A1]

Standard Solution Steps:
- Calculate the change in wavelength, $\Delta\lambda$.
- Use the formula $z = \Delta\lambda/\lambda$ to find the redshift.
- Use the Doppler shift approximation $v = zc$ to find the recessional speed.
- Use Hubble's law, $v = H_0d$, to find the distance. Ensure you are using a consistent set of units (e.g., speed in m/s, distance in m, $H_0$ in s⁻¹).

Common Mistakes:
- Mixing up $\Delta\lambda$ and $\lambda$ in the redshift formula.
- Unit errors, especially if the Hubble constant is given in units of km s⁻¹ Mpc⁻¹. The value given here is in SI units, which simplifies the calculation.
- Using the relativistic Doppler formula when the simpler approximation is sufficient and expected.

Tags:
astronomy, cosmology, hubbles_law, redshift, expanding_universe