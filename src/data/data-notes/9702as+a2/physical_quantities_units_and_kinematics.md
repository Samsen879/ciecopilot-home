## 1: Physical quantities and units

**Syllabus Reference**: 9702.1
**Learning Objective**: Show an understanding of and use the conventions for labelling graph axes and table columns as set out in the ASE publication Signs, Symbols and Systematics.

### Example Question
The period $T$ of a simple pendulum is thought to be related to its length $L$ and the acceleration of free fall $g$ by the equation $T = kL^p g^q$, where $k$, $p$ and $q$ are constants.

(a) The constant $k$ is dimensionless. Use analysis of the units to determine the values of $p$ and $q$.
(b) In an experiment, a student measures $T$ for different values of $L$. Sample pairs are: $(L, T) = (0.20 \text{ m}, 0.90 \text{ s}), (0.40 \text{ m}, 1.27 \text{ s}), (1.00 \text{ m}, 2.01 \text{ s})$. Using $T^2 = \frac{4\pi^2}{g} L$, explain how to determine a value for $g$ from a graph of $T^2$ against $L$.

### Mark Scheme / Solution
(a)
- Express the equation in terms of base units. $T$ has units of s. $L$ has units of m. $g$ has units of m s⁻². [C1]
- $[T] = [L]^p [g]^q$
- s = (m)$^p$ (m s⁻²)$^q$ = m$^p$ m$^q$ s⁻²$^q$ = m$^{p+q}$ s⁻²$^q$. [M1]
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

### Standard Solution Steps
- For homogeneity, write down the base units for each quantity in the equation.
- Use the laws of indices to combine powers of each base unit (M, L, T).
- Equate the powers of each base unit on both sides of the equation to form simultaneous equations.
- Solve these equations to find the unknown powers.
- For the graph analysis, identify the relationship between the plotted variables and the constants.
- The gradient or intercept of the straight-line graph will be related to the constant to be determined.
- Calculate the gradient using a large triangle from the plotted points.
- Equate the numerical gradient to the algebraic expression for the gradient and solve for the unknown constant.

### Common Mistakes
- Incorrect base units for quantities, especially acceleration ($g$).
- Algebraic errors when combining or comparing powers of the base units.
- In graphical analysis, calculating the gradient using only one point instead of the change between two points ($\Delta y / \Delta x$).
- Using a small triangle for the gradient calculation, which increases uncertainty and can lead to an inaccurate result.
- Errors in algebraic rearrangement when solving for the final value.

### Tags
physical_quantities, units, homogeneity, graphical_analysis, uncertainty

## 1: Physical quantities and units

**Syllabus Reference**: 9702.1
**Learning Objective**: Show an understanding of the distinction between systematic errors and random errors. Show an understanding of and use the expressions for combining uncertainties.

### Example Question
A student measures the diameter of a wire using a micrometer screw gauge and obtains the reading $d = 0.54 \pm 0.01$ mm. The length of the wire is measured using a ruler as $L = 125.0 \pm 0.1$ cm. The resistance of the wire is measured as $R = 5.2 \pm 0.1$ $\Omega$. The resistivity $\rho$ is calculated using the formula $\rho = \frac{RA}{L}$, where $A$ is the cross-sectional area of the wire.

(a) State the difference between a systematic error and a random error.
(b) Calculate the value of the resistivity $\rho$.
(c) Calculate the percentage uncertainty in the resistivity $\rho$.
(d) State the value of the resistivity with its absolute uncertainty.

### Mark Scheme / Solution
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
- \% uncertainty in $\rho = 1.92\% + 2(1.85\%) + 0.08\% = 1.92\% + 3.70\% + 0.08\% = 5.7\%$. [A1]

(d)
- Absolute uncertainty $\Delta\rho = 5.7\% \times (9.526 \times 10^{-7}) = 0.057 \times (9.526 \times 10^{-7}) = 0.54 \times 10^{-7}$ $\Omega$ m. [C1]
- The value and its uncertainty should be given to the same number of decimal places or precision.
- $\rho = (9.5 \pm 0.5) \times 10^{-7}$ $\Omega$ m. [A1]

### Standard Solution Steps
- Ensure all measurements are converted to consistent SI base units before calculation.
- Calculate the value of the desired quantity using the given formula.
- For each measured quantity, calculate its fractional or percentage uncertainty ($\Delta x / x$).
- Use the rules for combining uncertainties:
    - For multiplication and division ($y = ab/c$), add the fractional uncertainties: $\frac{\Delta y}{y} = \frac{\Delta a}{a} + \frac{\Delta b}{b} + \frac{\Delta c}{c}$.
    - For powers ($y = a^n$), multiply the fractional uncertainty by the power: $\frac{\Delta y}{y} = n \frac{\Delta a}{a}$.
- Sum the relevant percentage uncertainties to find the total percentage uncertainty in the calculated result.
- Calculate the absolute uncertainty by multiplying the fractional uncertainty by the calculated value.
- State the final answer in the form value $\pm$ uncertainty, ensuring the uncertainty is given to one significant figure and the value is rounded to the same decimal place.

### Common Mistakes
- Forgetting to convert units (e.g., mm to m, cm to m) before calculation.
- When calculating percentage uncertainty, forgetting to multiply by 2 for the diameter, which is squared in the area formula.
- Adding absolute uncertainties for multiplication/division instead of adding fractional/percentage uncertainties.
- Incorrectly rounding the final answer. The uncertainty should be quoted to 1 significant figure, and the value should be rounded to the same level of precision (decimal place) as the uncertainty.

### Tags
uncertainty, error_analysis, systematic_error, random_error, resistivity

## 2: Kinematics

**Syllabus Reference**: 9702.2
**Learning Objective**: Interpret and use displacement–time, velocity–time and acceleration–time graphs.

### Example Question
The velocity-time graph for a car journey is shown below.

(a) Describe the motion of the car during the first 10 s.
(b) Calculate the total displacement of the car after 40 s.
(c) Calculate the average velocity of the car for the entire journey.
(d) Sketch the acceleration-time graph for the journey.

### Mark Scheme / Solution
(a)
- The car accelerates uniformly (or at a constant rate) from rest. [B1]
- From a velocity of 0 m s⁻¹ to 20 m s⁻¹. [B1]

(b)
- Total displacement is the area under the velocity-time graph. [M1]
- Area = Area of trapezium
- Area = $\frac{1}{2}(a+b)h = \frac{1}{2}( (40-0) + (30-10) ) \times 20$. [C1]
- Area = $\frac{1}{2}(40+20) \times 20 = \frac{1}{2} \times 60 \times 20 = 600$ m. [A1]
- *Alternative: Area = (Area of triangle) + (Area of rectangle) = $(\frac{1}{2} \times 10 \times 20) + (20 \times 20) + (\frac{1}{2} \times 10 \times 20) = 100 + 400 + 100 = 600$ m. This is wrong, the second part is a rectangle. Let's re-calculate.
- Area = (Area of triangle 0-10s) + (Area of rectangle 10-30s) + (Area of triangle 30-40s)
- Area = $(\frac{1}{2} \times 10 \times 20) + (20 \times 20) + (\frac{1}{2} \times 10 \times 20) = 100 + 400 + 100 = 600$ m. The first calculation was correct. Let's try the trapezium formula again.
- Base a = (30-10) = 20s. Base b = (40-0) = 40s. Height h = 20 m/s.
- Area = $\frac{1}{2}(20+40) \times 20 = 600$ m. Correct. [A1]

(c)
- Average velocity = Total displacement / Total time. [C1]
- Average velocity = $600 / 40 = 15$ m s⁻¹. [A1]

(d)
- For 0-10 s: acceleration = gradient = $20/10 = 2.0$ m s⁻².
- For 10-30 s: acceleration = gradient = $0$ m s⁻².
- For 30-40 s: acceleration = gradient = $-20/10 = -2.0$ m s⁻². [M1]
- Graph shows horizontal line at +2.0 from t=0 to 10. [A1]
- Graph shows horizontal line at 0 from t=10 to 30. [A1]
- Graph shows horizontal line at -2.0 from t=30 to 40. [A1]
- Axes correctly labelled with 'acceleration / m s⁻²' and 'time / s'.

### Standard Solution Steps
- To describe motion from a v-t graph, look at the gradient (acceleration) and the value of velocity.
- To find displacement, calculate the area under the v-t graph. Split the graph into simple shapes (triangles, rectangles) if necessary.
- To find acceleration, calculate the gradient of the v-t graph for the relevant section.
- To calculate average velocity, divide the total displacement (total area) by the total time.
- To sketch an a-t graph from a v-t graph, calculate the gradient for each segment of the journey and plot these constant values against time.

### Common Mistakes
- Confusing displacement-time and velocity-time graphs. For example, interpreting the slope of a v-t graph as velocity instead of acceleration.
- Calculating distance travelled by multiplying velocity by time, which is only valid for constant velocity.
- Errors in calculating the area of trapeziums or triangles.
- When sketching the a-t graph, drawing slopes instead of horizontal lines representing the constant acceleration in each phase.
- Sign errors when calculating deceleration (negative acceleration).

### Tags
kinematics, motion_graphs, velocity-time, acceleration, displacement

## 2: Kinematics

**Syllabus Reference**: 9702.2
**Learning Objective**: Use equations of motion for constant acceleration in one dimension and for motion in two dimensions, such as projectile motion.

### Example Question
A stone is thrown from the top of a cliff, which is 45 m high. The stone is thrown with an initial velocity of 15 m s⁻¹ at an angle of 30° above the horizontal. Air resistance is negligible.

(a) Calculate the maximum height reached by the stone above the sea level.
(b) Calculate the time taken for the stone to reach the sea.
(c) Calculate the horizontal distance travelled by the stone from the base of the cliff.

### Mark Scheme / Solution
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

### Standard Solution Steps
- Resolve the initial velocity into horizontal ($u_x$) and vertical ($u_y$) components.
- Treat horizontal and vertical motion independently. Remember horizontal acceleration is zero and vertical acceleration is $g$ (usually $-9.81$ m s⁻²).
- For maximum height, use the vertical motion equations. At the peak, the vertical velocity $v_y$ is zero.
- For time of flight, use the vertical motion equations from the start point to the end point. Be careful with the sign of the displacement.
- Once the total time of flight is known, calculate the horizontal range using the constant horizontal velocity component.

### Common Mistakes
- Forgetting to resolve the initial velocity into components.
- Using the full initial velocity (e.g., 15 m s⁻¹) in vertical or horizontal calculations.
- Sign errors, particularly for displacement and acceleration in the vertical direction. It is crucial to define a positive direction (e.g., upwards) and stick to it.
- Using a time calculated to reach the maximum height to find the total range, instead of the total time of flight.
- Mixing up horizontal and vertical components in equations.

### Tags
kinematics, projectile_motion, suvat, vectors

## 3: Dynamics

**Syllabus Reference**: 9702.3
**Learning Objective**: Apply Newton’s laws of motion to solve problems, including situations with friction and connected particles.

### Example Question
Two blocks, A of mass $m_A = 4.0$ kg and B of mass $m_B = 6.0$ kg, are connected by a light, inextensible string. The string passes over a frictionless pulley. Block A is on a rough horizontal surface with a coefficient of kinetic friction $\mu_k = 0.20$. Block B hangs freely. The system is released from rest.

(a) Draw a free-body diagram showing all the forces acting on block A and block B.
(b) Calculate the acceleration of the system.
(c) Calculate the tension in the string.

### Mark Scheme / Solution
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
- *Check with Equation 2: $T = 58.86 - 6.0 \times 5.1012 = 58.86 - 30.6072 = 28.25$ N. Consistent.*

### Standard Solution Steps
- Draw clear free-body diagrams for each mass, showing all forces acting on it.
- Resolve forces if necessary (e.g., on an inclined plane).
- Apply Newton's second law ($F_{net} = ma$) to each mass along the direction of motion. This will generate a set of simultaneous equations.
- For friction problems, first find the normal reaction force, then use it to calculate the frictional force ($f = \mu N$).
- Solve the simultaneous equations for the unknowns, typically acceleration ($a$) and tension ($T$). Adding the equations is often a quick way to eliminate tension.
- Substitute the value of the acceleration back into one of the original equations to find the tension.

### Common Mistakes
- Incorrectly drawn free-body diagrams, e.g., missing forces or showing forces acting in the wrong direction.
- Assuming tension is equal to the weight of the hanging mass. This is only true if the system is in equilibrium (not accelerating).
- Forgetting the friction force, or using the wrong normal force to calculate it (e.g., on an inclined plane).
- Sign errors when setting up the $F=ma$ equations. It is essential to define a positive direction for the system's motion and apply it consistently.
- Using $m_A$ in the equation for block B, or vice-versa.

### Tags
dynamics, newtons_laws, friction, connected_particles, pulleys, tension

## 3: Dynamics

**Syllabus Reference**: 9702.3
**Learning Objective**: Show an understanding of and use the concept of momentum, and use the principle of conservation of momentum to solve problems. Define and use impulse.

### Example Question
A ball of mass 0.25 kg moving at 12 m s⁻¹ strikes a vertical wall at an angle of 60° to the wall. It rebounds with a speed of 10 m s⁻¹, also at an angle of 60° to the wall. The ball is in contact with the wall for 0.15 s.

(a) Show that the change in momentum of the ball is 5.5 kg m s⁻¹.
(b) Calculate the magnitude of the average force exerted by the wall on the ball.
(c) State whether the collision is elastic or inelastic, and justify your answer with a calculation.

### Mark Scheme / Solution
(a)
- Momentum is a vector. Consider the components of momentum perpendicular and parallel to the wall.
- The angle to the normal is $90^\circ - 60^\circ = 30^\circ$.
- Initial velocity component perpendicular to wall: $u_x = -12 \cos(30^\circ) = -10.39$ m s⁻¹ (taking away from wall as positive).
- Final velocity component perpendicular to wall: $v_x = +10 \cos(30^\circ) = +8.66$ m s⁻¹. [C1]
- Initial momentum component perpendicular to wall: $p_{ix} = 0.25 \times (-10.39) = -2.60$ kg m s⁻¹.
- Final momentum component perpendicular to wall: $p_{fx} = 0.25 \times (+8.66) = +2.17$ kg m s⁻¹. [M1]
- Change in momentum $\Delta p_x = p_{fx} - p_{ix} = 2.17 - (-2.60) = 4.77$ kg m s⁻¹.
- The components of velocity parallel to the wall are unchanged.
- $u_y = -12 \sin(30^\circ) = -6$ m/s. $v_y = -10 \sin(30^\circ) = -5$ m/s. This is wrong. The question states the rebound angle is also 60 degrees to the wall.
- Let's re-read. "at an angle of 60° to the wall". Let's resolve parallel and perpendicular to the wall.
- Perpendicular to wall: $u_\perp = -12 \sin(60^\circ) = -10.39$. $v_\perp = 10 \sin(60^\circ) = 8.66$.
- Parallel to wall: $u_\parallel = -12 \cos(60^\circ) = -6.0$. $v_\parallel = -10 \cos(60^\circ) = -5.0$.
- The momentum change is only perpendicular to the wall as the force acts in that direction. The question implies the force from the wall is only perpendicular. So the parallel component of momentum should be conserved. Let's assume the question means "the angle of reflection equals the angle of incidence". This means the parallel component of velocity changes magnitude. Let's follow the numbers given.
- Initial momentum: $p_i = m u = 0.25 \times 12 = 3.0$ kg m s⁻¹.
- Final momentum: $p_f = m v = 0.25 \times 10 = 2.5$ kg m s⁻¹.
- The change in momentum is the vector subtraction $\Delta \vec{p} = \vec{p_f} - \vec{p_i}$.
- Let's use components perpendicular to the wall (x) and parallel to it (y).
- $p_{ix} = -3.0 \sin(60^\circ) = -2.60$ kg m s⁻¹. $p_{iy} = -3.0 \cos(60^\circ) = -1.50$ kg m s⁻¹.
- $p_{fx} = +2.5 \sin(60^\circ) = +2.17$ kg m s⁻¹. $p_{fy} = -2.5 \cos(60^\circ) = -1.25$ kg m s⁻¹.
- $\Delta p_x = 2.17 - (-2.60) = 4.77$ kg m s⁻¹.
- $\Delta p_y = -1.25 - (-1.50) = 0.25$ kg m s⁻¹.
- Magnitude $|\Delta p| = \sqrt{(\Delta p_x)^2 + (\Delta p_y)^2} = \sqrt{4.77^2 + 0.25^2} = \sqrt{22.75 + 0.0625} = 4.78$ kg m s⁻¹. This does not match 5.5.
- Let's re-read the question. "strikes ... at an angle of 60° to the wall". This is the standard way. Let's assume the calculation in the mark scheme is what is expected. Often in such questions, the component parallel to the wall is assumed to be unchanged. Let's try that.
- $v_\parallel = u_\parallel = 12 \cos(60^\circ) = 6$ m/s. This contradicts $v=10$ m/s.
- There seems to be an issue with the question statement or the target answer. Let's construct a question that results in 5.5.
- Let's assume the component parallel to the wall is conserved. Then $v \cos(60^\circ) = u \cos(60^\circ)$, which means $v=u=12$. But the question says v=10.
- Let's ignore the parallel component and assume the question is only about the perpendicular component, and the target answer is wrong.
- Let's assume the question meant "angle to the normal is 60°".
- Perpendicular to wall: $u_\perp = -12 \cos(60^\circ) = -6$. $v_\perp = 10 \cos(60^\circ) = 5$.
- $\Delta p_\perp = m(v_\perp - u_\perp) = 0.25(5 - (-6)) = 0.25 \times 11 = 2.75$ kg m s⁻¹. Still not 5.5.
- What if the initial momentum vector and final momentum vector are added head-to-tail to find the change? The angle between them is $180 - 2 \times 30 = 120^\circ$ (if we use angle to normal).
- Let's use the cosine rule for vector subtraction: $|\Delta \vec{p}|^2 = |\vec{p_f}|^2 + |\vec{p_i}|^2 - 2|\vec{p_f}||\vec{p_i}|\cos(\theta)$. The angle between the two momentum vectors is $60^\circ$.
- $p_i = 3.0$, $p_f = 2.5$. The angle between the vectors shown on a diagram would be $180 - 60 - 60 = 60^\circ$. Let's assume this is the angle.
- $|\Delta p|^2 = 2.5^2 + 3.0^2 - 2(2.5)(3.0)\cos(60^\circ) = 6.25 + 9.0 - 15(0.5) = 15.25 - 7.5 = 7.75$. $|\Delta p| = 2.78$. Still not 5.5.
- The question is flawed. I will rewrite the question and solution to be correct.

**Rewritten Question:**
A ball of mass 0.50 kg moving at 11 m s⁻¹ strikes a vertical wall normally (at 90°). It rebounds along the same path with a speed of 11 m s⁻¹.
(a) Show that the change in momentum of the ball is 11 kg m s⁻¹.
(b) The ball is in contact with the wall for 0.10 s. Calculate the magnitude of the average force exerted by the wall on the ball.
(c) State whether the collision is elastic or inelastic, and justify your answer.

**Rewritten Mark Scheme / Solution**
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

### Standard Solution Steps
- Remember that momentum and velocity are vectors. Establish a clear sign convention for directions.
- Calculate the initial momentum ($p_i = mu$) and the final momentum ($p_f = mv$).
- The change in momentum is the vector difference: $\Delta p = p_f - p_i$. Be careful with signs.
- Impulse is defined as both the change in momentum ($\Delta p$) and the product of average force and contact time ($F\Delta t$).
- To find the average force, set $F\Delta t = \Delta p$ and solve for F.
- To check if a collision is elastic, calculate the total kinetic energy before and after the collision. If it is conserved, the collision is elastic. If KE is lost, it is inelastic.

### Common Mistakes
- Treating momentum as a scalar. Forgetting that direction is critical and failing to use signs or vector components.
- Calculating the change in momentum as $m(v-u)$ but forgetting that $u$ and $v$ often have opposite signs, leading to a small result instead of a large one.
- Confusing momentum and kinetic energy. They are different quantities.
- Stating a collision is elastic simply because momentum is conserved. Momentum is conserved in all collisions (in an isolated system), but kinetic energy is only conserved in elastic collisions.

### Tags
dynamics, momentum, impulse, conservation_of_momentum, elastic_collision

## 4: Forces, density and pressure

**Syllabus Reference**: 9702.4
**Learning Objective**: Use a vector triangle to represent forces in equilibrium. Understand and use the concept of density.

### Example Question
A traffic light of mass 12 kg is suspended by two cables as shown. Cable 1 makes an angle of 30° to the horizontal and Cable 2 makes an angle of 45° to the horizontal.

(a) Define density.
(b) The traffic light is in equilibrium. State the two conditions for an object to be in equilibrium.
(c) Calculate the tension in Cable 1 ($T_1$) and Cable 2 ($T_2$).

### Mark Scheme / Solution
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
- The angle between $T_1$ and $W$ is $90+30=120^\circ$.
- The angle between $T_2$ and $W$ is $90+45=135^\circ$.
- The angle between $T_1$ and $T_2$ is $180 - 30 - 45 = 105^\circ$. (This is the angle inside the triangle of forces). Let's use angles relative to horizontal/vertical.
- Angle opposite W is $30+45=75^\circ$. No, it's $180 - (90-30) - (90-45) = 180-60-45 = 75^\circ$. Correct.
- Angle opposite $T_1$ is $90+45=135^\circ$.
- Angle opposite $T_2$ is $90+30=120^\circ$.
- Using Sine Rule: $\frac{W}{\sin(75^\circ)} = \frac{T_1}{\sin(135^\circ)} = \frac{T_2}{\sin(120^\circ)}$. [M1]
- $T_1 = W \frac{\sin(135^\circ)}{\sin(75^\circ)} = 117.72 \times \frac{0.707}{0.966} = 86.2$ N. [A1]
- $T_2 = W \frac{\sin(120^\circ)}{\sin(75^\circ)} = 117.72 \times \frac{0.866}{0.966} = 105.6$ N. [A1]

### Standard Solution Steps
- Identify that the object is in equilibrium, so the net force is zero.
- Draw a free-body diagram of the object showing all forces.
- Resolve all forces into horizontal (x) and vertical (y) components.
- Set the sum of the horizontal components to zero ($\Sigma F_x = 0$).
- Set the sum of the vertical components to zero ($\Sigma F_y = 0$).
- Solve the resulting simultaneous equations for the unknown forces.
- Alternatively, if there are three forces, draw a closed vector triangle and use the Sine Rule to solve for the unknown forces.

### Common Mistakes
- Resolving forces incorrectly, e.g., mixing up sin and cos. Remember SOH CAH TOA and which angle you are using.
- Sign errors when summing the force components.
- Errors in solving the simultaneous equations.
- When using the vector triangle method, calculating the angles inside the triangle incorrectly.

### Tags
forces, equilibrium, vectors, resolving_forces, density, pressure

## 5: Work, energy and power

**Syllabus Reference**: 9702.5
**Learning Objective**: Apply the principle of conservation of energy, including the concepts of gravitational potential energy, kinetic energy, and work done.

### Example Question
A skier of mass 75 kg starts from rest at the top of a slope of length 120 m, which is inclined at 25° to the horizontal. The skier reaches the bottom of the slope with a speed of 30 m s⁻¹.

(a) Define work done by a force.
(b) Calculate the change in gravitational potential energy (GPE) of the skier.
(c) Calculate the kinetic energy (KE) of the skier at the bottom of the slope.
(d) Using the work-energy principle, calculate the average resistive force (friction and air resistance) acting on the skier.

### Mark Scheme / Solution
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

### Standard Solution Steps
- Identify the initial and final states of the system.
- Calculate the initial energy (in this case, GPE at the top, KE is zero). To find GPE, first calculate the vertical height.
- Calculate the final energy (in this case, KE at the bottom, GPE is zero relative to the bottom).
- Apply the principle of conservation of energy. If there are no resistive forces, initial energy equals final energy.
- If there are resistive forces, the work done by these forces equals the "lost" energy (Initial Energy - Final Energy).
- To find the average resistive force, divide the work done against resistance by the distance over which the force acts.

### Common Mistakes
- Using the length of the slope as the vertical height in the GPE calculation.
- Forgetting to square the velocity in the KE calculation.
- Errors in applying the energy conservation principle, e.g., adding the work done by friction to the final energy instead of equating it to the energy loss.
- Dividing the work done by the vertical height instead of the distance along the slope to find the resistive force.

### Tags
work, energy, power, conservation_of_energy, GPE, KE

## 6: Deformation of solids

**Syllabus Reference**: 9702.6
**Learning Objective**: Define and use the terms stress, strain, Young modulus and the spring constant.

### Example Question
A metal wire of original length 1.50 m and cross-sectional area $0.80$ mm² is stretched by a force. The graph shows the variation of the force $F$ applied to the wire with its extension $x$.

(a) Define tensile stress and tensile strain.
(b) Use the graph to determine the spring constant of the wire.
(c) Calculate the Young modulus of the metal.
(d) Calculate the elastic potential energy (strain energy) stored in the wire when the extension is 0.60 mm.

### Mark Scheme / Solution
(a)
- Tensile stress is the force applied per unit cross-sectional area of the wire. ($\sigma = F/A$) [B1]
- Tensile strain is the extension per unit original length of the wire. ($\epsilon = x/L$) [B1]

(b)
- The spring constant $k$ is the gradient of the force-extension graph (since $F=kx$). [M1]
- From the graph, which is a straight line through the origin, use the end point.
- $k = \frac{\Delta F}{\Delta x} = \frac{120 \text{ N}}{0.80 \times 10^{-3} \text{ m}} = 1.5 \times 10^5$ N m⁻¹. [A1]

(c)
- Young modulus $E = \frac{\text{stress}}{\text{strain}} = \frac{F/A}{x/L} = \frac{FL}{Ax}$. [M1]
- The gradient of the graph is $F/x$. So $E = \text{gradient} \times \frac{L}{A}$.
- Convert area to m²: $A = 0.80 \text{ mm}^2 = 0.80 \times (10^{-3})^2 \text{ m}^2 = 0.80 \times 10^{-6}$ m². [C1]
- $E = (1.5 \times 10^5 \text{ N m⁻¹}) \times \frac{1.50 \text{ m}}{0.80 \times 10^{-6} \text{ m}^2}$. [C1]
- $E = 2.8125 \times 10^{11}$ Pa.
- $E = 2.8 \times 10^{11}$ Pa. [A1]

(d)
- Strain energy is the area under the force-extension graph. [M1]
- Energy $E_p = \frac{1}{2}Fx$.
- At extension $x = 0.60$ mm $= 0.60 \times 10^{-3}$ m, the force from the graph is $F = 90$ N. [C1]
- $E_p = \frac{1}{2} \times 90 \times (0.60 \times 10^{-3}) = 0.027$ J. [A1]

### Standard Solution Steps
- To find the spring constant, calculate the gradient of the F-x graph.
- To find the Young modulus, use the formula $E = \text{stress}/\text{strain}$. This can be rearranged in terms of F, L, A and x. Use values from a point on the linear region of the graph, or use the gradient.
- Ensure all quantities are in SI units before calculation (e.g., area in m², extension in m).
- To find the strain energy, calculate the area under the F-x graph up to the given extension. For the linear region, this is the area of a triangle ($\frac{1}{2}Fx$).

### Common Mistakes
- Unit conversion errors, especially for area from mm² to m². Remember $1 \text{ mm}^2 = (10^{-3} \text{ m})^2 = 10^{-6} \text{ m}^2$.
- Confusing the spring constant ($k$) with the Young modulus ($E$). The spring constant depends on the dimensions of the specific object, while the Young modulus is a property of the material.
- Using the wrong formula for strain energy, e.g., $Fx$ instead of $\frac{1}{2}Fx$.
- Reading values from the graph incorrectly or using points outside the region of proportionality when calculating the Young modulus.

### Tags
deformation, stress, strain, young_modulus, spring_constant, elastic_potential_energy

## 7: Waves

**Syllabus Reference**: 9702.7
**Learning Objective**: Use the relationship intensity is proportional to (amplitude)². Use the Doppler effect equations for a source moving relative to a stationary observer.

### Example Question
(a) A sound wave has an intensity $I$ and an amplitude $A$. State the relationship between $I$ and $A$.

(b) The sound from a siren on a stationary ambulance has a frequency of 800 Hz. The ambulance moves at a speed of 25 m s⁻¹ directly towards a stationary observer. The speed of sound in air is 340 m s⁻¹.
(i) Calculate the observed frequency of the sound.
(ii) The ambulance passes the observer and moves away at the same speed. Calculate the new observed frequency.

### Mark Scheme / Solution
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

### Standard Solution Steps
- Identify the correct formula for the Doppler effect based on whether the source is moving towards or away from the observer.
- Remember: when moving towards, the denominator is ($v - v_s$), leading to a higher observed frequency.
- Remember: when moving away, the denominator is ($v + v_s$), leading to a lower observed frequency.
- Substitute the given values for source frequency ($f_s$), speed of the wave ($v$), and speed of the source ($v_s$).
- Calculate the final observed frequency ($f_o$).

### Common Mistakes
- Using the wrong sign in the denominator of the Doppler formula (e.g., using '+' when the source is approaching).
- Mixing up the speed of the source ($v_s$) and the speed of the wave ($v$).
- Forgetting the context: frequency should increase when the source approaches and decrease when it recedes. If your answer does not match this, you have likely used the wrong formula.
- Applying the formula for a moving observer when the source is moving.

### Tags
waves, intensity, amplitude, doppler_effect

## 8: Superposition

**Syllabus Reference**: 9702.8
**Learning Objective**: Understand the terms interference and coherence. Understand and use the conditions for constructive and destructive interference in terms of path difference. Use the equation $\lambda = ax/D$ for double-slit interference.

### Example Question
In a Young's double-slit experiment, a laser emitting light of wavelength 630 nm is used. The light is incident on two parallel slits that are separated by a distance of 0.45 mm. An interference pattern is observed on a screen placed 2.5 m away from the slits.

(a) State the principle of superposition.
(b) Explain what is meant by *coherent sources*.
(c) Calculate the separation of the bright fringes (the fringe spacing) observed on the screen.
(d) Describe the change, if any, to the fringe spacing if the distance between the slits is decreased.

### Mark Scheme / Solution
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

### Standard Solution Steps
- Identify the correct formula, $x = \lambda D / a$.
- Convert all given quantities to SI units (e.g., nm to m, mm to m).
- Substitute the values into the formula to calculate the fringe spacing, $x$.
- To analyse changes, look at the relationship between the variables in the formula. For example, $x$ is directly proportional to $\lambda$ and $D$, and inversely proportional to $a$.

### Common Mistakes
- Unit conversion errors, especially for wavelength (nm) and slit separation (mm).
- Mixing up the variables in the formula, for example, swapping the slit separation ($a$) and the fringe spacing ($x$).
- Using the wrong formula, e.g., for a diffraction grating instead of a double slit.
- Incorrectly describing the relationship between variables (e.g., saying fringe spacing increases when slit separation increases).

### Tags
superposition, interference, coherence, youngs_double_slit, path_difference

## 9: Electricity

**Syllabus Reference**: 9702.9
**Learning Objective**: Define charge, current, potential difference, resistance, and resistivity. Use the equation for resistivity $\rho = RA/L$. Use the equation for current $I = nAqv$.

### Example Question
A copper wire has a length of 5.0 m and a uniform cross-sectional area of $1.2 \times 10^{-7}$ m². The resistivity of copper is $1.7 \times 10^{-8}$ $\Omega$ m. The number density of free electrons in copper is $8.5 \times 10^{28}$ m⁻³. A potential difference is applied across the wire, causing a current of 2.0 A to flow.

(a) Define electrical resistivity.
(b) Calculate the resistance of the wire.
(c) Calculate the mean drift velocity of the free electrons in the wire.

### Mark Scheme / Solution
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

### Standard Solution Steps
- For resistance, use the resistivity formula $R = \rho L / A$. Ensure all units are SI units.
- For drift velocity, use the formula $I = nAqv$.
- Identify all the variables in the formula. Remember that $n$ is the number density of charge carriers, and $q$ is the charge on one carrier (usually the elementary charge, $e$).
- Rearrange the formula to make the drift velocity $v$ the subject.
- Substitute the known values and calculate the result.

### Common Mistakes
- Algebraic errors when rearranging the formulae.
- Unit conversion errors, although in this question the units are already in SI.
- Confusing number density ($n$) with the number of moles or total number of electrons.
- Using the wrong value for the charge of the carrier $q$.
- Forgetting that the drift velocity of electrons is typically very small. A large answer (e.g., > 1 m s⁻¹) is a sign of a calculation error.

### Tags
electricity, resistance, resistivity, drift_velocity, current

## 10: D.C. circuits

**Syllabus Reference**: 9702.10
**Learning Objective**: Show an understanding of the effects of the internal resistance of a source of e.m.f. on the terminal potential difference and power delivered.

### Example Question
A battery has an electromotive force (e.m.f.) of 12.0 V and an internal resistance of 2.0 $\Omega$. It is connected to a variable resistor R.

(a) Define electromotive force (e.m.f.).
(b) The variable resistor is set to a resistance of 10.0 $\Omega$. Calculate:
(i) the current in the circuit.
(ii) the terminal potential difference across the battery.
(iii) the power delivered to the external resistor R.
(c) The resistance R is varied. Determine the value of R for which the power delivered to it is a maximum.

### Mark Scheme / Solution
(a)
- The e.m.f. of a source is the energy converted from other forms (e.g., chemical) to electrical energy per unit charge passing through the source. (or work done per unit charge). [B1]

(b)
(i)
- Total resistance in circuit = $R + r = 10.0 + 2.0 = 12.0$ $\Omega$. [C1]
- Current $I = \frac{E}{R+r} = \frac{12.0}{12.0} = 1.0$ A. [A1]

(ii)
- Terminal p.d. $V = IR = 1.0 \times 10.0 = 10.0$ V. [C1]
- *Alternatively, $V = E - Ir = 12.0 - (1.0 \times 2.0) = 12.0 - 2.0 = 10.0$ V.* [A1]

(iii)
- Power $P = VI = 10.0 \times 1.0 = 10.0$ W. [C1]
- *Alternatively, $P = I^2 R = (1.0)^2 \times 10.0 = 10.0$ W.* [A1]

(c)
- Maximum power is delivered to the external resistor when its resistance is equal to the internal resistance of the source. [B1]
- Therefore, $R = r = 2.0$ $\Omega$. [A1]

### Standard Solution Steps
- Remember that the total resistance in a simple circuit with a power source with internal resistance is the sum of the external resistance and the internal resistance ($R_{total} = R + r$).
- Use Ohm's Law with the total resistance and the e.m.f. to find the circuit current: $I = E / (R+r)$.
- The terminal potential difference ($V$) is the p.d. across the external resistor ($V=IR$) or the e.m.f. minus the "lost volts" across the internal resistance ($V = E - Ir$).
- The power delivered to the external load can be calculated using $P=VI$, $P=I^2R$, or $P=V^2/R$.
- Recall the condition for maximum power transfer: the external load resistance must equal the internal resistance ($R=r$).

### Common Mistakes
- Forgetting to include the internal resistance when calculating the total resistance and current.
- Confusing e.m.f. ($E$) with terminal p.d. ($V$). E.m.f. is the total energy per charge, while terminal p.d. is the energy per charge available to the external circuit.
- Using the e.m.f. in power calculations for the external resistor (e.g., $P = E^2/R$), which is incorrect as some voltage is lost internally.
- Incorrectly stating the condition for maximum power transfer.

### Tags
dc_circuits, internal_resistance, emf, terminal_pd, power

## 11: Particle physics

**Syllabus Reference**: 9702.11
**Learning Objective**: Describe a simple model for the nuclear atom that includes protons, neutrons and electrons. Understand the quark model and be able to state the quark composition of protons and neutrons.

### Example Question
(a) Describe the Geiger-Marsden alpha-particle scattering experiment. Include in your answer the experimental setup, the observations, and the conclusions drawn.

(b) The standard model of particle physics classifies particles into quarks and leptons.
(i) State the quark composition of a proton and a neutron.
(ii) A sigma-plus particle ($\Sigma^+$) is a baryon with a charge of +1e and a strangeness of -1. It contains two up quarks. Determine the identity of the third quark.

### Mark Scheme / Solution
(a)
- **Setup**: A narrow beam of alpha particles was fired at a thin gold foil in a vacuum. A detector (e.g., a fluorescent screen) was used to observe the path of the alpha particles after interacting with the foil. [B1]
- **Observations**:
    - Most alpha particles passed straight through the foil with little or no deflection.
    - A small number of alpha particles were deflected through large angles.
    - A very small number (about 1 in 8000) were deflected through angles greater than 90° (i.e., bounced back). [B1]
- **Conclusions**:
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

### Standard Solution Steps
- For the scattering experiment, structure the answer into Setup, Observations, and Conclusions. Be specific with the observations, including the relative numbers of particles deflected at different angles.
- For quark composition problems, remember the charges of the up ($+2/3$e), down ($-1/3$e), and strange ($-1/3$e) quarks.
- Use the principles of conservation of charge and strangeness.
- Set up equations for the total charge and total strangeness of the particle based on its constituent quarks.
- Solve the equations to determine the properties (and thus identity) of the unknown quark.

### Common Mistakes
- Vague descriptions of the scattering experiment, e.g., saying "some particles were deflected" instead of specifying that a small number were deflected by large angles.
- Confusing the conclusions, e.g., stating that the nucleus is negative.
- Memorising the quark compositions incorrectly.
- Errors in adding the fractional charges of quarks.
- Forgetting that strangeness is a quantum number that must be conserved in strong interactions (but not weak), and using it to identify strange particles.

### Tags
particle_physics, nuclear_model, rutherford_scattering, quarks, leptons, baryons

## 12: Motion in a circle

**Syllabus Reference**: 9702.12
**Learning Objective**: Understand and use the concept of angular speed. Use the equations for centripetal force and centripetal acceleration.

### Example Question
A small object of mass 150 g is attached to a string and is whirled in a horizontal circle of radius 40 cm. The object completes 2.0 revolutions per second.

(a) Define angular speed.
(b) For the object, calculate:
(i) its angular speed, $\omega$.
(ii) its linear speed, $v$.
(iii) the centripetal acceleration, $a$.
(iv) the tension in the string.

### Mark Scheme / Solution
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
- *Using $a=v^2/r$: $a = (5.028)^2 / 0.40 = 25.28 / 0.40 = 63.2$ m s⁻².*
- $a = 63$ m s⁻². [A1]

(iv)
- The centripetal force is provided by the tension in the string. $F_c = T$.
- $F_c = ma$. [M1]
- Convert mass to kg: $m = 150$ g $= 0.150$ kg.
- $T = 0.150 \times 63.2 = 9.48$ N.
- $T = 9.5$ N. [A1]

### Standard Solution Steps
- Convert all quantities to SI units (mass to kg, radius to m).
- Calculate the angular speed $\omega$ from the frequency or period ($\omega=2\pi f$ or $\omega=2\pi/T$).
- Calculate the linear speed using $v=r\omega$.
- Calculate the centripetal acceleration using $a=r\omega^2$ or $a=v^2/r$.
- Identify the force that provides the centripetal force (in this case, tension).
- Use Newton's second law, $F_c = ma$, to calculate the magnitude of this force.

### Common Mistakes
- Forgetting to convert units, especially radius from cm to m and mass from g to kg.
- Confusing angular speed ($\omega$) with linear speed ($v$).
- Using the wrong formula for centripetal acceleration, or forgetting to square the variable (e.g., using $a=r\omega$).
- Using degrees instead of radians for angular speed. The formula $\omega = 2\pi f$ gives the result in radians per second.
- Believing that centripetal force is a separate, new force. It is not; it is the *resultant* force directed towards the center of the circle, and is provided by other real forces like tension, gravity, or friction.

### Tags
circular_motion, angular_speed, centripetal_force, centripetal_acceleration