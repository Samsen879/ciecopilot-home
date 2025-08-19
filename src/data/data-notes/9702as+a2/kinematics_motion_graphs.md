## Kinematics: Motion Graphs

**Syllabus Reference**: 9702.2
**Learning Objective**: deduce, from the shape of a velocity–time graph, the displacement and acceleration and translate between displacement–time, velocity–time and acceleration–time graphs

 

### Example Question
The velocity-time graph below describes the motion of a train travelling between two stations on a straight, level track.

[Visual Description: A velocity-time graph with velocity (m/s) on the y-axis and time (s) on the x-axis. The graph starts at the origin (0,0), goes up linearly to the point (20, 15), then horizontally to the point (100, 15), and finally down linearly to the point (120, 0).]

(a) Calculate the acceleration of the train during the first 20 seconds.
(b) Determine the total distance travelled by the train between the two stations.
(c) Calculate the average velocity of the train for the entire journey.

### Mark Scheme / Solution
(a) Acceleration is the gradient of the v-t graph.
   Acceleration = $\frac{\Delta v}{\Delta t} = \frac{15 - 0}{20 - 0}$ [M1]
   Acceleration = $0.75$ m s⁻² [A1]

(b) Total distance is the area under the v-t graph. The shape is a trapezium.
   Area = $\frac{1}{2} (a+b)h$
   Where $a$ = length of top parallel side = $100 - 20 = 80$ s
   Where $b$ = length of bottom parallel side = $120$ s
   Where $h$ = height = $15$ m s⁻¹
   Distance = $\frac{1}{2} (80 + 120) \times 15$ [M1]
   Distance = $\frac{1}{2} (200) \times 15 = 1500$ m [A1]
   Alternative for area: Area of triangle + area of rectangle + area of triangle
   Area = $(\frac{1}{2} \times 20 \times 15) + (80 \times 15) + (\frac{1}{2} \times 20 \times 15) = 150 + 1200 + 150 = 1500$ m [M1 for method, A1 for answer]

(c) Average velocity = $\frac{\text{Total displacement}}{\text{Total time}}$
   Total displacement = $1500$ m (from b)
   Total time = $120$ s
   Average velocity = $\frac{1500}{120}$ [M1]
   Average velocity = $12.5$ m s⁻¹ [A1]

### Standard Solution Steps
- Step 1 (for acceleration): Recognise that acceleration is the gradient of the velocity-time graph. Select the correct time interval and calculate the change in velocity divided by the change in time.
- Step 2 (for distance): Recognise that displacement/distance is the area under the velocity-time graph. Identify the geometric shape(s) that make up the area (e.g., trapezium, triangles, rectangles).
- Step 3 (for distance): Apply the correct formula for the area of the shape(s) to calculate the total distance.
- Step 4 (for average velocity): Use the definition of average velocity, which is the total displacement divided by the total time taken. Use the value calculated in the previous step for displacement.

### Common Mistakes
- Confusing displacement-time and velocity-time graphs; using the gradient of a v–t graph to find velocity instead of acceleration.
- Misidentifying sides or height in the trapezium area formula $\tfrac{1}{2}(a+b)h$.
- Arithmetic slips when computing gradient or area.
- Using average of key velocities instead of total distance over total time.

### Tags
kinematics, velocity_time_graph, acceleration, displacement, average_velocity, motion_graphs, 2

---
## Kinematics: Equations of Motion

**Syllabus Reference**: 9702.2
**Learning Objective**: use the equations of motion for constant acceleration in one dimension

 

### Example Question
A ball is thrown vertically upwards from the edge of a cliff which is 40 m high. The ball's initial upward velocity is 15 m s⁻¹. Air resistance is negligible.
(Assume the acceleration of free fall, $g$, is 9.81 m s⁻²).

(a) Calculate the maximum height reached by the ball relative to the top of the cliff.
(b) Determine the time taken for the ball to reach the sea at the base of the cliff.
(c) Calculate the velocity of the ball just before it strikes the sea.

### Mark Scheme / Solution
(Define 'upwards' as the positive direction. So, $u = +15$ m s⁻¹, $a = -9.81$ m s⁻²)

(a) At maximum height, the final velocity $v = 0$.
   Using $v^2 = u^2 + 2as$: [C1]
   $0^2 = (15)^2 + 2(-9.81)s$
   $0 = 225 - 19.62s$
   $s = \frac{225}{19.62} = 11.47$ m
   Maximum height = $11.5$ m [A1]

(b) The ball falls from the point of release to the sea. The total displacement is -40 m.
   Using $s = ut + \frac{1}{2}at^2$: [M1]
   $-40 = 15t + \frac{1}{2}(-9.81)t^2$
   $-40 = 15t - 4.905t^2$
   $4.905t^2 - 15t - 40 = 0$ [M1 for correct quadratic setup]
   Using the quadratic formula $t = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$:
   $t = \frac{15 \pm \sqrt{(-15)^2 - 4(4.905)(-40)}}{2(4.905)}$
   $t = \frac{15 \pm \sqrt{225 + 784.8}}{9.81} = \frac{15 \pm 31.78}{9.81}$
   $t = 4.77$ s or $t = -1.71$ s. Since time must be positive:
   $t = 4.77$ s [A1]

(c) Using $v = u + at$:
   $v = 15 + (-9.81)(4.77)$ [M1]
   $v = 15 - 46.8 = -31.8$ m s⁻¹
   The velocity is $31.8$ m s⁻¹ downwards. [A1]
    Alternative for (c): Using $v^2 = u^2 + 2as$ with $s = -40$ m
    $v^2 = (15)^2 + 2(-9.81)(-40)$ [M1]
    $v^2 = 225 + 784.8 = 1009.8$
    $v = \sqrt{1009.8} = \pm 31.78$ m s⁻¹. Since it's moving downwards, $v = -31.8$ m s⁻¹ [A1]

### Standard Solution Steps
- Step 1: Establish a clear sign convention (e.g., up is positive, down is negative) and list the known 'suvat' variables for each part of the question. Remember $a = -g$.
- Step 2 (for max height): Identify that the vertical velocity $v$ is zero at the peak of the motion. Select the appropriate suvat equation ($v^2 = u^2 + 2as$) that links the known variables ($u, v, a$) with the unknown ($s$).
- Step 3 (for time): Consider the entire journey from cliff edge to sea. The total displacement $s$ is the height of the cliff, with a negative sign according to the convention. Use $s = ut + \frac{1}{2}at^2$. This will form a quadratic equation.
- Step 4 (for time): Solve the quadratic equation for $t$. Discard the negative solution as time cannot be negative.
- Step 5 (for final velocity): Use the calculated time $t$ in a simpler equation like $v = u + at$, or use the time-independent equation $v^2 = u^2 + 2as$ again with the total displacement $s = -40$ m. Interpret the sign of the final answer to state the direction.

### Common Mistakes
- Using $s=+40$ m instead of $s=-40$ m for the downward journey.
- Inconsistent sign convention (e.g., $u=+15$ with $a=+9.81$).
- Algebra slips when solving the quadratic; forgetting to take square roots.
- Choosing an inappropriate suvat equation or rounding too early.

### Tags
kinematics, suvat, equations_of_motion, freefall, projectile, quadratic_equation, sign_convention, 2

---
## Kinematics: Projectile Motion

**Syllabus Reference**: 9702.2
**Learning Objective**: analyse the motion of a projectile as the motion of two independent components, assuming constant velocity horizontally and constant acceleration vertically

 

### Example Question
A football is kicked from ground level with an initial velocity of 22 m s⁻¹ at an angle of 35° to the horizontal. Assume that air resistance is negligible and that the acceleration of free fall, $g$, is 9.81 m s⁻².

(a) Show that the initial vertical component of the velocity is approximately 12.6 m s⁻¹.
(b) Calculate the time taken for the football to reach its maximum height.
(c) Determine the total time of flight of the football.
(d) Calculate the horizontal distance travelled by the football (the range).

### Mark Scheme / Solution
(a) Resolve initial velocity into vertical and horizontal components.
   Vertical component $u_y = u \sin \theta$ [C1]
   $u_y = 22 \sin(35^\circ) = 22 \times 0.5736 = 12.619$ m s⁻¹
   $u_y \approx 12.6$ m s⁻¹ [A1]

(b) At maximum height, the final vertical velocity $v_y = 0$.
   Using $v_y = u_y + at$: [M1]
   $0 = 12.6 - 9.81t$
   $t = \frac{12.6}{9.81} = 1.284$ s
   Time to reach max height = $1.28$ s [A1]

(c) For a symmetric trajectory (starting and ending at the same height), the time of flight is twice the time to reach maximum height.
   Total time $T = 2 \times 1.284$ s [M1]
   $T = 2.57$ s [A1]
   Alternative for (c): Use $s_y = u_y t + \frac{1}{2}at^2$ with $s_y=0$
   $0 = 12.6t - 4.905t^2 = t(12.6 - 4.905t)$
   $t=0$ or $t = 12.6 / 4.905 = 2.57$ s [M1 for method, A1 for answer]

(d) First, find the horizontal component of velocity $u_x$.
   $u_x = u \cos \theta = 22 \cos(35^\circ) = 18.02$ m s⁻¹ [C1]
   Horizontal motion has constant velocity, so distance = velocity × time.
   Range $s_x = u_x \times T$ [M1]
   $s_x = 18.02 \times 2.57 = 46.31$ m
   Range = $46.3$ m [A1]

### Standard Solution Steps
- Step 1: Resolve the initial velocity vector into its independent horizontal ($u_x = u \cos \theta$) and vertical ($u_y = u \sin \theta$) components.
- Step 2: Analyse the vertical motion using suvat equations, with $a = -g$. To find the time to max height, use the condition that final vertical velocity $v_y=0$.
- Step 3: Calculate the total time of flight. For symmetric trajectories, this is simply twice the time to reach maximum height.
- Step 4: Analyse the horizontal motion. This is constant velocity motion ($a=0$). Use the formula distance = speed × time, where speed is the horizontal component $u_x$ and time is the total time of flight $T$.

### Common Mistakes
- Applying gravity to horizontal motion (reducing $u_x$ over time).
- Using full velocity instead of resolved components in suvat.
- Mixing up sine and cosine in vector resolution; calculator in radians mode.
- Forgetting to double time to max height for total time of flight.

### Tags
kinematics, projectile_motion, vectors, suvat, range, time_of_flight, resolving_vectors, 2