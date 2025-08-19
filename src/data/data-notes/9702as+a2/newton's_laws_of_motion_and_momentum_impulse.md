## Dynamics: Newton's Laws of Motion

**Syllabus Reference**: 9702.3

**Learning Objective**: apply Newton’s laws of motion to problems involving force, mass and acceleration (including friction and motion in a circle)

 

### Example Question
A person of mass 75 kg stands in a lift. The lift accelerates upwards from rest at a rate of 1.2 m s⁻², then travels at a constant velocity, and finally decelerates at a rate of 1.5 m s⁻² before stopping.
(Assume the acceleration of free fall, $g$, is 9.81 m s⁻²).

(a) Draw a free-body diagram showing the forces acting on the person.
(b) Calculate the force exerted by the lift floor on the person (the normal contact force) during the initial upward acceleration.
(c) Calculate the normal contact force on the person as the lift decelerates.

### Mark Scheme / Solution
(a) Free-body diagram:
    - Arrow pointing upwards, labelled *Tension (T)* or *Normal Contact Force (R)*.
    - Arrow pointing downwards from the center of mass, labelled *Weight (W)* or *mg*.
    - The upward arrow should be visibly longer than the downward arrow for upward acceleration. [B1]

    

(b) **Upward acceleration:**
   Apply Newton's Second Law, $F_{net} = ma$. The net force is the difference between the upward and downward forces.
   $R - W = ma$ [C1]
   $R - mg = ma$
   $R = ma + mg = m(a + g)$ [M1]
   $R = 75 \times (1.2 + 9.81)$
   $R = 75 \times (11.01) = 825.75$ N
   $R = 830$ N (to 2 or 3 s.f.) [A1]

(c) **Downward acceleration (deceleration):**
   The acceleration is now downwards, so we can take $a = -1.5$ m s⁻².
   Apply Newton's Second Law: $F_{net} = ma$
   $R - W = ma$
   $R - mg = m(-1.5)$ [M1]
   $R = mg - 1.5m = m(g - 1.5)$
   $R = 75 \times (9.81 - 1.5)$
   $R = 75 \times (8.31) = 623.25$ N
   $R = 620$ N (to 2 or 3 s.f.) [A1]

### Standard Solution Steps
- Step 1: Draw a clear free-body diagram to identify all forces acting on the object (the person). Define a positive direction (e.g., upwards is positive).
- Step 2: Write down Newton's Second Law in the form $F_{net} = ma$. $F_{net}$ is the vector sum of all forces from the diagram.
- Step 3: For upward acceleration, the upward force (R) is greater than the downward force (W). The equation is $R - W = ma$.
- Step 4: For downward acceleration (or upward deceleration), the downward force (W) is greater than the upward force (R). The net force is downwards. The equation becomes $R - W = m(-a)$ or $W - R = ma$.
- Step 5: Substitute the known values for mass, acceleration, and g to solve for the unknown force, R.

### Common Mistakes
- Assuming the contact force always equals weight ($mg$).
- Setting up the net force equation with incorrect signs (e.g., $W - R = ma$ for upward acceleration).
- Omitting $g$ when calculating $W=mg$.
- Using the wrong sign for acceleration during deceleration.

 

### Tags
dynamics, newtons_laws, f_ma, free_body_diagram, resultant_force, apparent_weight, lift_problem, 3

---
## Dynamics: Momentum and Impulse

**Syllabus Reference**: 9702.3

**Learning Objective**: define and use impulse as the product of force and time; relate impulse to the change in momentum; recall that the area under a force–time graph is equal to the impulse

 

### Example Question
A hockey ball of mass 160 g, initially at rest, is struck by a hockey stick. The graph shows the variation of the force F exerted on the ball with time t.

[Visual Description: A Force-Time graph. The F-axis (in N) goes up to 1200 N. The t-axis (in ms) goes up to 4.0 ms. The graph starts at (0,0), rises linearly to a peak at (2.0, 1200), and then falls linearly back to (4.0, 0), forming a triangle.]

(a) Use the graph to determine the impulse delivered to the ball.
(b) Calculate the final speed of the ball immediately after it is struck.
(c) State the assumption made in calculating the final speed in (b).

### Mark Scheme / Solution
(a) Impulse is the area under the force-time graph. [C1]
   The shape is a triangle. Area = $\frac{1}{2} \times \text{base} \times \text{height}$.
   Base = $4.0$ ms $= 4.0 \times 10^{-3}$ s
   Height = $1200$ N
   Impulse = $\frac{1}{2} \times (4.0 \times 10^{-3}) \times 1200$ [M1]
   Impulse = $2.4$ N s (or kg m s⁻¹) [A1]

(b) Impulse = Change in momentum ($Ft = \Delta p = mv - mu$) [C1]
   The ball is initially at rest, so initial momentum $mu = 0$.
   Impulse = $mv$
   $2.4 = (0.160) \times v$ [M1]
   Note: mass must be in kg. $160$ g $= 0.160$ kg.
   $v = \frac{2.4}{0.160}$
   $v = 15$ m s⁻¹ [A1]

(c) It is assumed that this is the only horizontal force acting on the ball, or that other forces like air resistance and friction are negligible during the short time of impact. [B1]

### Standard Solution Steps
- Step 1: Identify that impulse is the area under the F-t graph.
- Step 2: Calculate the area of the given shape (a triangle in this case). Pay close attention to the units on the axes, especially prefixes like milli- (ms).
- Step 3: State the relationship between impulse and momentum: Impulse = Change in momentum ($Ft = \Delta p$).
- Step 4: Set the calculated impulse equal to $mv - mu$. Convert mass to kg if necessary.
- Step 5: Substitute the known values for impulse, mass, and initial velocity to solve for the final velocity.
- Step 6: For questions about assumptions, consider what external forces might have been ignored (e.g., friction, air resistance, weight if the motion is vertical).

### Common Mistakes
- Confusing impulse with force, or momentum with kinetic energy.
- Missing unit conversions (ms to s, g to kg).
- Miscomputing the graph area; forgetting initial momentum if not zero.
- Sign errors when direction changes in rebound scenarios.

 

### Tags
dynamics, momentum, impulse, force_time_graph, conservation_of_momentum, newtons_second_law, 3

---
## Dynamics: Conservation of Momentum

**Syllabus Reference**: 9702.3

**Learning Objective**: state and apply the principle of conservation of linear momentum to solve problems, including elastic and inelastic collisions in one dimension

 

### Example Question
A trolley of mass 1.5 kg moving at 4.0 m s⁻¹ collides head-on with a stationary trolley of mass 2.5 kg. After the collision, the two trolleys stick together and move as a single object.

(a) State the principle of conservation of linear momentum.
(b) Calculate the common velocity of the two trolleys immediately after the collision.
(c) By calculating the kinetic energy before and after the collision, determine whether the collision is elastic or inelastic.

### Mark Scheme / Solution
(a) The principle of conservation of linear momentum states that for a closed system (with no external forces), the total momentum before a collision is equal to the total momentum after the collision. [B1]

(b) Let the mass of the first trolley be $m_1 = 1.5$ kg and its initial velocity be $u_1 = 4.0$ m s⁻¹.
   Let the mass of the second trolley be $m_2 = 2.5$ kg and its initial velocity be $u_2 = 0$ m s⁻¹.
   Let the final common velocity be $v$.

   Total momentum before = Total momentum after [C1]
   $m_1u_1 + m_2u_2 = (m_1 + m_2)v$ [M1]
   $(1.5 \times 4.0) + (2.5 \times 0) = (1.5 + 2.5)v$
   $6.0 + 0 = 4.0v$ [M1]
   $v = \frac{6.0}{4.0} = 1.5$ m s⁻¹ [A1]

(c) **Kinetic energy before collision:**
   $E_{k, before} = \frac{1}{2}m_1u_1^2 + \frac{1}{2}m_2u_2^2$
   $E_{k, before} = \frac{1}{2}(1.5)(4.0)^2 + 0 = 0.5 \times 1.5 \times 16 = 12$ J [M1]

   **Kinetic energy after collision:**
   $E_{k, after} = \frac{1}{2}(m_1 + m_2)v^2$
   $E_{k, after} = \frac{1}{2}(1.5 + 2.5)(1.5)^2 = 0.5 \times 4.0 \times 2.25 = 4.5$ J [M1]

   **Conclusion:**
   Since the total kinetic energy after the collision (4.5 J) is less than the total kinetic energy before the collision (12 J), the collision is inelastic. [A1] A concluding statement is required.

### Standard Solution Steps
- Step 1: State the principle of conservation of momentum.
- Step 2: Identify the masses and velocities of all objects before the collision. Define a direction as positive.
- Step 3: Write the conservation of momentum equation: `Total initial momentum = Total final momentum`.
- Step 4: Substitute the known values and solve for the unknown velocity. Remember that if objects stick together, their final mass is the sum of their individual masses.
- Step 5: To check if the collision is elastic, calculate the total kinetic energy of the system *before* the collision.
- Step 6: Calculate the total kinetic energy of the system *after* the collision using the newly found final velocity.
- Step 7: Compare the initial and final kinetic energies. If $E_{k, before} = E_{k, after}$, it is elastic. If $E_{k, before} > $E_{k, after}$, it is inelastic. Make a clear concluding statement.

### Common Mistakes
- Trying to conserve kinetic energy in an inelastic collision.
- Forgetting to sum masses when objects stick together; sign errors for opposite directions.
- Squaring momentum instead of velocity when computing kinetic energy.
- Stating KE loss without calculation and comparison.

 

### Tags
dynamics, momentum, conservation_of_momentum, inelastic_collision, elastic_collision, kinetic_energy, 3







