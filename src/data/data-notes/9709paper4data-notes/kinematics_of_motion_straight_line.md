## Kinematics of Motion in a Straight Line: Velocity-Time Graphs

**Syllabus Reference**: 9709.P4.4.2
**Learning Objective**: Interpret velocity-time graphs to find displacement, acceleration, and deceleration.

### Example Question
A train travels between two stations, A and B. The train starts from rest at A and accelerates uniformly for $20$ s, reaching a speed of $30$ m s$^{-1}$. It maintains this speed for a period of time before decelerating uniformly for $40$ s, coming to rest at B. The total journey time is $120$ s.

(i) Find the acceleration of the train during the first $20$ s.
(ii) Find the total distance between station A and station B.

### Mark Scheme / Solution
(i) Acceleration is the gradient of the first section of the velocity-time graph.
$a = \frac{\Delta v}{\Delta t} = \frac{30 - 0}{20 - 0}$ (M1)
$a = 1.5$ m s$^{-2}$ (A1)

(ii) The duration of the constant velocity phase is $120 - 20 - 40 = 60$ s. (B1)
Total distance is the area under the velocity-time graph, which forms a trapezium.
Distance = $\frac{1}{2} \times (\text{sum of parallel sides}) \times (\text{height})$
Distance = $\frac{1}{2}(60 + 120) \times 30$ (M1)
Distance = $\frac{1}{2}(180) \times 30 = 2700$ m (A1)

### Standard Solution Steps
- Sketch a velocity-time graph to visualise the journey, labelling axes and known values of time and velocity.
- Recall that acceleration is the gradient of the velocity-time graph. Calculate the change in velocity divided by the change in time for the relevant section.
- Recall that total displacement/distance is the area under the velocity-time graph.
- Divide the graph into simple shapes (triangles, rectangles) or use the trapezium rule to calculate the total area.

### Common Mistakes
- Confusing the gradient (acceleration) with the area (distance).
- Incorrectly calculating the time for the constant velocity part of the journey.
- Errors in applying the formula for the area of a trapezium. An alternative is to calculate the area of the initial triangle, the central rectangle, and the final triangle separately and sum them.

### Tags
kinematics, velocity_time_graph, acceleration, distance, 4.2

## Kinematics of Motion in a Straight Line: Constant Acceleration Equations (suvat)

**Syllabus Reference**: 9709.P4.4.2
**Learning Objective**: Apply the formulae for constant acceleration to solve problems involving motion in a straight line.

### Example Question
A particle is projected vertically upwards with a speed of $25$ m s$^{-1}$ from a point on the ground. Use $g = 10$ m s$^{-2}$.

(i) Find the greatest height reached by the particle.
(ii) Find the total time from projection until the particle returns to the ground.

### Mark Scheme / Solution
(i) At the greatest height, the final velocity $v$ is $0$.
Take upwards as the positive direction. We have $u = 25$, $v = 0$, $a = -10$. We need to find $s$.
Use $v^2 = u^2 + 2as$. (M1)
$0^2 = 25^2 + 2(-10)s$
$0 = 625 - 20s$
$20s = 625$
$s = 31.25$ m. (A1)

(ii) When the particle returns to the ground, its displacement $s$ is $0$.
We have $u = 25$, $s = 0$, $a = -10$. We need to find $t$.
Use $s = ut + \frac{1}{2}at^2$. (M1)
$0 = 25t + \frac{1}{2}(-10)t^2$
$0 = 25t - 5t^2$
$0 = 5t(5 - t)$ (M1 for solving the quadratic)
$t = 0$ (start) or $t = 5$.
The total time is $5$ s. (A1)

### Standard Solution Steps
- Establish a positive direction (e.g., upwards). Any vector quantities in the opposite direction (like acceleration due to gravity) must be negative.
- List the known suvat variables ($s, u, v, a, t$) for the motion being considered.
- Identify the unknown variable that the question asks for.
- Select the suvat equation that connects the known variables to the unknown.
- Substitute the values into the equation and solve.

### Common Mistakes
- Sign errors. It is crucial to be consistent with the chosen positive direction. If upwards is positive, then acceleration $a$ due to gravity must be negative (e.g., $-10$).
- Using $v=0$ for the final velocity when the particle has returned to the ground. The velocity is not zero; the displacement is zero.
- Forgetting that there are often two solutions for time when solving a quadratic equation for $s=0$ (the start time and the return time).

### Tags
kinematics, suvat, constant_acceleration, vertical_motion, greatest_height, time_of_flight, 4.2

## Kinematics of Motion in a Straight Line: Calculus in Kinematics (Variable Acceleration)

**Syllabus Reference**: 9709.P4.4.2
**Learning Objective**: Use differentiation and integration with respect to time to solve problems involving displacement, velocity, and acceleration.

### Example Question
A particle P moves in a straight line. At time $t$ seconds ($t \ge 0$) after passing through a fixed point O, its velocity $v$ m s$^{-1}$ is given by $v = 3t^2 - 18t + 15$.

(i) Find the acceleration of P when it is momentarily at rest.
(ii) Find the total distance travelled by P in the first $4$ seconds of its motion.

### Mark Scheme / Solution
(i) The particle is at rest when $v = 0$.
$3t^2 - 18t + 15 = 0$ (M1)
$t^2 - 6t + 5 = 0$
$(t-1)(t-5) = 0$
The particle is at rest at $t=1$ s and $t=5$ s. (A1)
Acceleration is $a = dv/dt$.
$a = \frac{d}{dt}(3t^2 - 18t + 15) = 6t - 18$ (M1)
When $t=1$, $a = 6(1) - 18 = -12$ m s$^{-2}$. (A1)

(ii) Distance requires integration of velocity, checking for turning points.
The particle turns at $t=1$ s, which is within the interval $[0, 4]$.
Displacement $s = \int (3t^2 - 18t + 15) dt = t^3 - 9t^2 + 15t + C$. (M1)
Since P starts at O, at $t=0$, $s=0$, so $C=0$.
Displacement from $t=0$ to $t=1$:
$s(1) = 1^3 - 9(1)^2 + 15(1) = 1 - 9 + 15 = 7$ m. (A1)
Displacement from $t=1$ to $t=4$:
$s(4) = 4^3 - 9(4)^2 + 15(4) = 64 - 144 + 60 = -20$ m.
The displacement during the interval $[1, 4]$ is $s(4) - s(1) = -20 - 7 = -27$ m.
The distance travelled in this interval is $|-27| = 27$ m.
Total distance = (distance from 0 to 1) + (distance from 1 to 4) = $7 + 27 = 34$ m. (M1 for considering split interval, A1 for correct answer)

### Standard Solution Steps
- Remember the relationships: $a = dv/dt$ and $v = ds/dt$. Conversely, $v = \int a dt$ and $s = \int v dt$.
- To find when a particle is at rest, set its velocity $v$ to zero and solve for $t$.
- To find total distance, first find any turning points (times when $v=0$) within the specified time interval.
- Integrate the velocity function to find the displacement function $s(t)$.
- Calculate the displacement for each segment of the journey between the start, turning points, and end.
- Sum the absolute values (magnitudes) of these displacements to find the total distance.

### Common Mistakes
- Confusing displacement with total distance. Displacement is a vector, distance is a scalar. They are only equal if the particle never changes direction.
- Forgetting to find and use the constant of integration ($+C$) by applying the initial conditions.
- Differentiating when integration is required, or vice versa.
- Calculating the displacement at the end time ($s(4)$) and assuming this is the total distance, without accounting for any changes in direction.

### Tags
kinematics, calculus, variable_acceleration, differentiation, integration, displacement, distance, turning_point, 4.2