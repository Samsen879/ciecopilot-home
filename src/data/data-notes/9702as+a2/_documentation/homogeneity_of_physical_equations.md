 
---
title: "Homogeneity of Physical Equations"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Physical Quantities and Units"
sub_topic: "1.1 Homogeneity of Equations"
---

## Physical Quantities and Units: Homogeneity of Equations

**Syllabus Reference**: 9702.1
**Learning Objective**: Check the homogeneity of equations using base units; interpret base and derived units.

- (a) show an understanding that all physical quantities consist of a numerical magnitude and a unit
- (b) recall the following base quantities and their units: mass (kg), length (m), time (s), current (A), temperature (K), amount of substance (mol)
- (c) check the homogeneity of physical equations using base units

### Core Concepts

**1. Physical Quantities and Units**
A physical quantity is a measurable property of a phenomenon, body, or substance. It is expressed as the product of a numerical magnitude and a unit. Units provide a standard for measurement and allow for consistent communication of quantities. The International System of Units (SI) defines seven base quantities with their corresponding base units.

**2. Principle of Homogeneity**
The principle of homogeneity states that for an equation to be physically valid, the units on both sides of the equation must be the same. This means that the equation must be dimensionally consistent. Homogeneity is a necessary but not sufficient condition for an equation to be correct. If an equation is not homogeneous, it is definitely incorrect.

**3. Checking Homogeneity**
To check the homogeneity of an equation:
1.  Replace each quantity in the equation with its base SI units.
2.  Simplify the units on both sides of the equation.
3.  If the base units on both sides are identical, the equation is homogeneous.

Base quantities and SI units include mass (kg), length (m), time (s), current (A), temperature (K), and amount of substance (mol).

Some common derived units and their base units:
-   Force ($F = ma$): N = kg m s⁻²
-   Energy ($E = Fd$): J = N m = kg m² s⁻²
-   Power ($P = E/t$): W = J s⁻¹ = kg m² s⁻³
-   Pressure ($P = F/A$): Pa = N m⁻² = kg m⁻¹ s⁻²
-   Velocity ($v = d/t$): m s⁻¹
-   Acceleration ($a = v/t$): m s⁻²

### Example Question

**Question:**
Check the homogeneity of the equation for kinetic energy, $E_k = \frac{1}{2}mv^2$, where $E_k$ is kinetic energy, $m$ is mass, and $v$ is velocity.

### Mark Scheme / Solution
1.  **Identify the base units for each term:**
    -   Energy ($E_k$): Joules (J), which in base units is kg m² s⁻²
    -   Mass ($m$): kilograms (kg)
    -   Velocity ($v$): metres per second (m s⁻¹)

2.  **Substitute the base units into the right-hand side of the equation:**
    -   The constant $\frac{1}{2}$ has no units.
    -   Units of $mv^2$ = (unit of $m$) $\times$ (unit of $v$)$^2$
    -   Units of $mv^2$ = kg $\times$ (m s⁻¹)$^2$
    -   Units of $mv^2$ = kg $\times$ m² s⁻²

3.  **Compare units on both sides:**
    -   Left-hand side units: kg m² s⁻²
    -   Right-hand side units: kg m² s⁻²

Since the units on both sides of the equation are identical (kg m² s⁻²), the equation is homogeneous.

### Standard Solution Steps

-   **Constants:** Pure numbers or dimensionless constants (like $\frac{1}{2}$ or $\pi$) do not affect the homogeneity check, as they have no units.
-   **Trigonometric Functions, Logarithms, Exponentials:** The arguments of these functions (e.g., $\sin(\theta)$, $\ln(x)$, $e^x$) must be dimensionless (have no units). The output of these functions is also dimensionless.
-   **Addition/Subtraction:** Quantities can only be added or subtracted if they have the same units.
-   **Derived Units:** Be comfortable converting derived units (like Joules or Newtons) back into their base SI units. Memorize or be able to derive common ones.

 
---
title: "Uncertainties and Errors"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Physical Quantities and Units"
sub_topic: "1.2 Uncertainties and Errors"
---

## Physical Quantities and Units: Uncertainties and Errors

### Learning Objectives

- (a) understand and use the concept of significant figures
- (b) understand and use the concept of absolute, fractional and percentage uncertainties in physical measurements
- (c) determine the uncertainty in a derived quantity by addition or subtraction of absolute uncertainties or by addition of percentage uncertainties

### Core Concepts

**1. Types of Errors**
-   **Random errors:** Occur unpredictably and vary in magnitude and direction. They are caused by uncontrolled variables, limitations in reading precision, or observer judgment. Reduced by repeating measurements and averaging.
-   **Systematic errors:** Occur consistently in the same direction, making measurements either consistently too high or too low. Caused by faulty equipment, incorrect calibration, or environmental factors. Cannot be reduced by averaging; require instrument calibration or method refinement.

**2. Precision and Accuracy**
-   **Precision:** The degree of agreement among repeated measurements of the same quantity. A precise measurement has small random errors.
-   **Accuracy:** The closeness of a measured value to the true value. An accurate measurement has small systematic errors.

**3. Significant Figures**
Significant figures indicate the precision of a measurement.
-   Non-zero digits are always significant.
-   Zeros between non-zero digits are significant.
-   Leading zeros (before non-zero digits) are not significant.
-   Trailing zeros (at the end of a number) are significant only if the number contains a decimal point.

**Rules for calculations:**
-   **Multiplication/Division:** The result should have the same number of significant figures as the quantity with the fewest significant figures.
-   **Addition/Subtraction:** The result should have the same number of decimal places as the quantity with the fewest decimal places.

**4. Uncertainties**
-   **Absolute uncertainty ($\Delta x$):** The range within which the true value is expected to lie. Has the same units as the measured quantity. E.g., $(5.0 \pm 0.1)$ cm.
-   **Fractional uncertainty:** $\frac{\Delta x}{x}$ (dimensionless).
-   **Percentage uncertainty:** $\frac{\Delta x}{x} \times 100\%$

**5. Combining Uncertainties**
-   **Addition/Subtraction ($y = a \pm b$):** Absolute uncertainties add. $\Delta y = \Delta a + \Delta b$.
-   **Multiplication/Division ($y = ab$ or $y = a/b$):** Percentage uncertainties add. $\frac{\Delta y}{y} = \frac{\Delta a}{a} + \frac{\Delta b}{b}$.
-   **Powers ($y = a^n$):** The percentage uncertainty is multiplied by the power. $\frac{\Delta y}{y} = n \frac{\Delta a}{a}$.
-   **Mixed operations:** Combine uncertainties step-by-step.

### Example Question

**Question:**
A student measures the length of a wire as $(1.25 \pm 0.02)$ m and its diameter as $(0.030 \pm 0.001)$ m. Calculate the area of the circular cross-section of the wire and its percentage uncertainty. The area $A = \pi (\frac{d}{2})^2$.

### Mark Scheme / Solution
1.  **Calculate the value of the diameter squared and its percentage uncertainty:**
    -   Diameter $d = 0.030$ m, $\Delta d = 0.001$ m.
    -   Percentage uncertainty in diameter = $\frac{0.001}{0.030} \times 100\% = 3.33\%$
    -   For $d^2$, the percentage uncertainty is $2 \times 3.33\% = 6.67\%$

2.  **Calculate the cross-sectional area A:**
    -   $A = \pi (\frac{d}{2})^2 = \pi \frac{d^2}{4}$
    -   $A = \pi \frac{(0.030 \text{ m})^2}{4} = \pi \frac{0.0009}{4} \text{ m}^2 = 0.00070685... \text{ m}^2$
    -   Round to 2 significant figures (due to 0.030 m having 2 significant figures): $A = 0.00071$ m²

3.  **Calculate the percentage uncertainty in the area:**
    -   The constants $\pi$ and $4$ have no uncertainty.
    -   The percentage uncertainty in A is the same as the percentage uncertainty in $d^2$.
    -   Percentage uncertainty in A = $6.67\%$
    -   Rounding to one significant figure for uncertainty (as per common practice, or match the precision of the input percentage uncertainties): $7\%$

4.  **Final Answer:**
    -   Area = $0.00071$ m²
    -   Percentage uncertainty = $7\%$
    -   So, the area is $(0.00071 \text{ m}^2 \pm 7\%)$.

### Standard Solution Steps
- Replace quantities by base SI units on both sides
- Simplify units and compare powers of base units
- Equate powers to solve for unknown exponents

### Common Mistakes
- Treating constants as having units
- Not converting derived units back to base units before comparison

### Tags
physical_quantities, units, homogeneity, dimensional_analysis, 1

-   **Significant Figures vs. Decimal Places:** Remember the specific rules for multiplication/division versus addition/subtraction. In general, final answers should not be given to more significant figures than the least precise input data. A good rule of thumb is to keep one extra significant figure during intermediate calculations to avoid rounding errors.
-   **Uncertainty Reporting:** Absolute uncertainties should generally be quoted to one significant figure, and the measured value should be rounded to the same decimal place as the absolute uncertainty.
-   **Squaring and Powers:** Do not forget to multiply the percentage uncertainty by the power when combining uncertainties for quantities raised to a power.
-   **Percentage or Fractional:** It is often easier to work with percentage uncertainties for multiplication and division.

 
---
title: "Motion Graphs"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Kinematics"
sub_topic: "2.1 Motion Graphs"
---

## Kinematics: Motion Graphs

### Learning Objectives

- (a) understand and use the definitions of displacement, velocity, speed and acceleration
- (b) use graphical methods to represent displacement, velocity and acceleration
- (c) use the area under a velocity-time graph to determine displacement and the gradient to determine acceleration
- (d) use the area under an acceleration-time graph to determine change in velocity

### Core Concepts

**1. Definitions**
-   **Displacement ($s$):** The shortest distance from the initial to the final position, including direction. It is a vector quantity. Unit: metres (m).
-   **Velocity ($v$):** Rate of change of displacement. It is a vector quantity. Unit: metres per second (m s⁻¹).
    $v = \frac{\Delta s}{\Delta t}$
-   **Speed:** Rate of change of distance. It is a scalar quantity. Unit: metres per second (m s⁻¹). Speed is the magnitude of velocity.
-   **Acceleration ($a$):** Rate of change of velocity. It is a vector quantity. Unit: metres per second squared (m s⁻²).
    $a = \frac{\Delta v}{\Delta t}$

**2. Displacement-Time Graphs**
-   **Gradient:** Represents velocity.
    -   Steeper gradient = greater speed.
    -   Zero gradient (horizontal line) = stationary.
    -   Straight line = constant velocity.
    -   Curved line = changing velocity (acceleration or deceleration).
-   **Area under graph:** Not typically useful.

**3. Velocity-Time Graphs**
-   **Gradient:** Represents acceleration.
    -   Positive gradient = acceleration.
    -   Negative gradient = deceleration (or acceleration in the opposite direction).
    -   Zero gradient = constant velocity (zero acceleration).
-   **Area under graph:** Represents displacement.
    -   Area above the time axis is positive displacement.
    -   Area below the time axis is negative displacement.
    -   Net displacement is the algebraic sum of areas.
    -   Total distance travelled is the sum of magnitudes of all areas.

**4. Acceleration-Time Graphs**
-   **Gradient:** Not typically useful for A Level.
-   **Area under graph:** Represents change in velocity ($\Delta v$).
    -   Area = final velocity - initial velocity ($v - u$).

**Summary of Graph Properties**

Graph properties summary:
- Displacement–time: gradient is velocity
- Velocity–time: gradient is acceleration; area is displacement
- Acceleration–time: area is change in velocity $\Delta v$

### Worked Example

**Question:**
A car starts from rest and accelerates uniformly to a velocity of 20 m s⁻¹ in 5.0 s. It then travels at this constant velocity for 10.0 s before decelerating uniformly to rest in another 4.0 s.
Sketch a velocity-time graph for the car's motion and calculate the total displacement of the car.

**Solution:**
1.  **Sketch the velocity-time graph:**
    -   From $t=0$ to $t=5.0$ s, velocity increases linearly from 0 to 20 m s⁻¹.
    -   From $t=5.0$ s to $t=15.0$ s (5.0 + 10.0), velocity is constant at 20 m s⁻¹.
    -   From $t=15.0$ s to $t=19.0$ s (15.0 + 4.0), velocity decreases linearly from 20 m s⁻¹ to 0.

2.  **Calculate the total displacement:**
    -   The total displacement is the total area under the velocity-time graph. This can be divided into a triangle, a rectangle, and another triangle.
    -   **Area 1 (Acceleration phase):** Triangle
        -   Base = 5.0 s
        -   Height = 20 m s⁻¹
        -   Area$_1 = \frac{1}{2} \times \text{base} \times \text{height} = \frac{1}{2} \times 5.0 \text{ s} \times 20 \text{ m s⁻¹} = 50 \text{ m}$
    -   **Area 2 (Constant velocity phase):** Rectangle
        -   Base = 10.0 s
        -   Height = 20 m s⁻¹
        -   Area$_2 = \text{base} \times \text{height} = 10.0 \text{ s} \times 20 \text{ m s⁻¹} = 200 \text{ m}$
    -   **Area 3 (Deceleration phase):** Triangle
        -   Base = 4.0 s
        -   Height = 20 m s⁻¹
        -   Area$_3 = \frac{1}{2} \times \text{base} \times \text{height} = \frac{1}{2} \times 4.0 \text{ s} \times 20 \text{ m s⁻¹} = 40 \text{ m}$
    -   **Total Displacement:** Area$_1$ + Area$_2$ + Area$_3$ = 50 m + 200 m + 40 m = 290 m

The total displacement of the car is 290 m.

### Common Pitfalls & Exam Tips

-   **Gradient vs. Area:** Be very clear about which quantity is represented by the gradient and which by the area for each type of graph. A common mistake is mixing these up.
-   **Displacement vs. Distance:** On a velocity-time graph, areas below the x-axis indicate negative displacement. For total distance travelled, all areas are considered positive. For net displacement, areas below the axis subtract from areas above.
-   **Curved Graphs:** For non-linear graphs (e.g., a curved velocity-time graph indicating non-uniform acceleration), the gradient at any point is found by drawing a tangent to the curve at that point.
-   **Units:** Always ensure units are consistent throughout calculations and included in the final answer.

 
---
title: "Projectile Motion"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Kinematics"
sub_topic: "2.2 Projectile Motion"
---

## Kinematics: Projectile Motion

### Learning Objectives

- (a) analyze projectile motion with uniform acceleration in the vertical direction and uniform velocity in the horizontal direction
- (b) use the equations of motion with constant acceleration to solve problems involving projectile motion

### Core Concepts

**1. Principles of Projectile Motion**
Projectile motion refers to the motion of an object projected into the air, subject only to the acceleration of gravity. Key principles:
-   **Horizontal Motion:** Constant velocity. There is no horizontal acceleration (assuming negligible air resistance).
-   **Vertical Motion:** Constant acceleration due to gravity, $g = 9.81$ m s⁻² (downwards). This is uniformly accelerated motion.
-   The horizontal and vertical components of motion are independent of each other.
-   Time is the common link between the horizontal and vertical motions.

**2. Equations of Motion (SUVAT Equations)**
These equations apply to motion under constant acceleration. For projectile motion, $a_y = -g$ (if upward is positive) and $a_x = 0$.

| Equation                           | Description                                     |
| :--------------------------------- | :---------------------------------------------- |
| $v = u + at$                       | Final velocity = initial velocity + acceleration $\times$ time |
| $s = ut + \frac{1}{2}at^2$         | Displacement = initial velocity $\times$ time + $\frac{1}{2}$ acceleration $\times$ time² |
| $v^2 = u^2 + 2as$                  | Final velocity² = initial velocity² + 2 $\times$ acceleration $\times$ displacement |
| $s = \frac{1}{2}(u + v)t$          | Displacement = average velocity $\times$ time |

Where:
-   $s$ = displacement
-   $u$ = initial velocity
-   $v$ = final velocity
-   $a$ = acceleration
-   $t$ = time

**3. Applying SUVAT to Projectile Motion**
Separate the motion into horizontal (x) and vertical (y) components.

| Component      | Description                                                                 |
| :------------- | :-------------------------------------------------------------------------- |
| **Horizontal** | $a_x = 0$                                                                   |
|                | $v_x = u_x$ (velocity is constant horizontally)                             |
|                | $s_x = u_x t$                                                               |
| **Vertical**   | $a_y = -g$ (where $g = 9.81$ m s⁻², assuming upwards is positive)           |
|                | $v_y = u_y + a_y t$                                                         |
|                | $s_y = u_y t + \frac{1}{2}a_y t^2$                                          |
|                | $v_y^2 = u_y^2 + 2a_y s_y$                                                  |

**4. Resolving Initial Velocity**
If an object is launched with an initial velocity $U$ at an angle $\theta$ to the horizontal:
-   Initial horizontal velocity: $u_x = U \cos \theta$
-   Initial vertical velocity: $u_y = U \sin \theta$

### Worked Example

**Question:**
A ball is thrown horizontally from the top of a cliff 45 m high with an initial speed of 15 m s⁻¹. Calculate:
(a) The time taken for the ball to hit the ground.
(b) The horizontal distance from the base of the cliff where the ball lands.
(Assume air resistance is negligible and $g = 9.81$ m s⁻²).

**Solution:**
(a) **Time to hit the ground (Vertical Motion):**
-   Initial vertical velocity, $u_y = 0$ m s⁻¹ (thrown horizontally).
-   Vertical displacement, $s_y = -45$ m (taking upwards as positive, so displacement downwards is negative).
-   Vertical acceleration, $a_y = -9.81$ m s⁻².
-   Use the equation: $s_y = u_y t + \frac{1}{2}a_y t^2$
-   $-45 = (0)t + \frac{1}{2}(-9.81)t^2$
-   $-45 = -4.905 t^2$
-   $t^2 = \frac{-45}{-4.905} \approx 9.1743$
-   $t = \sqrt{9.1743} \approx 3.0289$ s
-   Time taken = 3.03 s (3 significant figures)

(b) **Horizontal distance (Horizontal Motion):**
-   Initial horizontal velocity, $u_x = 15$ m s⁻¹.
-   Horizontal acceleration, $a_x = 0$ m s⁻².
-   Time of flight, $t = 3.0289$ s (from part a).
-   Use the equation: $s_x = u_x t + \frac{1}{2}a_x t^2$
-   Since $a_x = 0$, $s_x = u_x t$
-   $s_x = 15 \text{ m s⁻¹} \times 3.0289 \text{ s}$
-   $s_x = 45.4335$ m
-   Horizontal distance = 45.4 m (3 significant figures)

### Common Pitfalls & Exam Tips

-   **Independence of Motion:** Remember to treat horizontal and vertical motions separately. The only common variable is time.
-   **Sign Conventions:** Be consistent with your sign conventions (e.g., always define a positive direction for vertical motion, usually upwards, so gravity is negative).
-   **Resolving Components:** If the initial velocity is at an angle, always resolve it into horizontal and vertical components before applying SUVAT equations.
-   **Air Resistance:** Unless explicitly stated, assume air resistance is negligible. If it were significant, it would introduce a drag force dependent on velocity, making acceleration non-constant and SUVAT equations not directly applicable.
-   **Maximum Height:** At maximum height, the vertical component of velocity ($v_y$) is momentarily zero. The horizontal velocity ($v_x$) remains constant throughout the flight.

```yaml
---
title: "Newton's Laws of Motion"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Dynamics"
sub_topic: "3.1 Newton's Laws of Motion"
---

## Dynamics: Newton's Laws of Motion

### Learning Objectives

- (a) state and use Newton's first law
- (b) state and use Newton's second law in the form $F = ma$
- (c) state and use Newton's third law
- (d) apply Newton's laws to solve problems involving forces and motion

### Core Concepts

**1. Newton's First Law (Law of Inertia)**
An object will remain at rest or continue to move with a constant velocity (constant speed in a straight line) unless acted upon by a resultant (net) external force.
-   This means if the resultant force on an object is zero, its acceleration is zero.
-   **Inertia:** The resistance of an object to changes in its state of motion. Mass is a measure of inertia.

**2. Newton's Second Law**
The resultant force ($F$) acting on an object is directly proportional to the product of its mass ($m$) and acceleration ($a$), and is in the direction of the acceleration.
-   Mathematically: $F_{net} = ma$
-   Where $F_{net}$ is the vector sum of all forces acting on the object.
-   The unit of force is the Newton (N), which is defined as the force required to give a mass of 1 kg an acceleration of 1 m s⁻². So, 1 N = 1 kg m s⁻².

**3. Newton's Third Law**
If object A exerts a force on object B, then object B simultaneously exerts an equal and opposite force on object A.
-   These forces are often called action-reaction pairs.
-   Key characteristics:
    -   They are equal in magnitude and opposite in direction.
    -   They act on different objects. This is crucial; they do not cancel each other out as they act on different bodies.
    -   They are of the same type (e.g., both gravitational, both normal contact, both electrostatic).

**4. Applying Newton's Laws**
-   **Free-body diagrams:** Draw all forces acting *on* the object, originating from its center of mass.
-   **Resolve forces:** Resolve forces into components along perpendicular axes (e.g., horizontal and vertical, or parallel and perpendicular to an inclined plane).
-   **Apply $F_{net} = ma$:** Apply the second law separately to each component direction.
-   For equilibrium or constant velocity (Newton's First Law), $F_{net} = 0$.

### Worked Example

**Question:**
A block of mass 5.0 kg is pulled along a rough horizontal surface by a rope. The tension in the rope is 25 N and acts at an angle of 30° above the horizontal. The frictional force opposing the motion is 5.0 N.
(a) Draw a free-body diagram for the block.
(b) Calculate the acceleration of the block.
(Take $g = 9.81$ m s⁻²)

**Solution:**
(a) **Free-body diagram:**
Forces acting on the block:
-   **Weight (W):** Vertically downwards, $W = mg = 5.0 \times 9.81 = 49.05$ N.
-   **Normal Reaction Force (R):** Vertically upwards, perpendicular to the surface.
-   **Tension (T):** At 30° above horizontal, $T = 25$ N.
-   **Friction (f):** Horizontally opposite to the direction of motion, $f = 5.0$ N.

```
       ^ R
       |
       |  T (25 N)
       | /
       |/ 30°
       O ------>
      / \
     /   \ f (5.0 N)
    W (49.05 N)
```
(Note: This is a textual representation. A hand-drawn diagram would be clearer with arrows and labels.)

(b) **Calculate the acceleration:**
1.  **Resolve the tension force into horizontal and vertical components:**
    -   Horizontal component of tension: $T_x = T \cos 30° = 25 \times \cos 30° = 25 \times 0.866 = 21.65$ N
    -   Vertical component of tension: $T_y = T \sin 30° = 25 \times \sin 30° = 25 \times 0.5 = 12.5$ N

2.  **Apply Newton's Second Law in the horizontal direction:**
    -   Forces in horizontal direction: $T_x$ (forward) and $f$ (backward).
    -   Net horizontal force ($F_x$) = $T_x - f$
    -   $F_x = 21.65 \text{ N} - 5.0 \text{ N} = 16.65 \text{ N}$
    -   Using $F_x = ma_x$:
        -   $16.65 = 5.0 \times a_x$
        -   $a_x = \frac{16.65}{5.0} = 3.33$ m s⁻²

3.  **Check vertical equilibrium (optional, but good practice):**
    -   Forces in vertical direction: $R$ (up), $T_y$ (up), $W$ (down).
    -   Net vertical force ($F_y$) = $R + T_y - W$
    -   Since the block is not accelerating vertically, $F_y = 0$.
    -   $R + 12.5 - 49.05 = 0$
    -   $R = 49.05 - 12.5 = 36.55$ N (This is the normal force acting on the block)

The acceleration of the block is 3.33 m s⁻².

### Common Pitfalls & Exam Tips

-   **Free-Body Diagrams:** Always draw a clear free-body diagram showing all forces acting *on* the object. Do not include forces exerted *by* the object.
-   **Action-Reaction Pairs:** Remember that action-reaction forces always act on *different* objects. They never cancel each other out to determine the net force on a *single* object.
-   **Resolving Forces:** If forces are not aligned with your chosen axes, resolve them into components.
-   **Net Force:** Be careful to sum forces in a consistent direction when calculating the net force. Assign positive and negative signs appropriately.
-   **Units:** Ensure all quantities are in SI units (kg, m, s, N) before calculations.

```yaml
---
title: "Momentum and Collisions"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Dynamics"
sub_topic: "3.2 Momentum and Collisions"
---

## Dynamics: Momentum and Collisions

### Learning Objectives

- (a) define and use the concept of linear momentum
- (b) state and apply the principle of conservation of momentum
- (c) understand and use the impulse of a force ($F \Delta t$) as the change in momentum ($\Delta (mv)$)
- (d) distinguish between elastic and inelastic collisions

### Core Concepts

**1. Linear Momentum**
-   **Definition:** Linear momentum ($p$) is the product of an object's mass ($m$) and its velocity ($v$).
    $p = mv$
-   **Vector Quantity:** Momentum is a vector quantity, having both magnitude and direction. Its direction is the same as the velocity.
-   **Unit:** The SI unit of momentum is kilogram metre per second (kg m s⁻¹).

**2. Impulse**
-   **Definition:** Impulse ($J$) is the product of the force ($F$) acting on an object and the time interval ($\Delta t$) over which the force acts.
    $J = F \Delta t$
-   **Relationship to Momentum:** Impulse is also defined as the change in an object's momentum. This is derived from Newton's Second Law:
    $F = \frac{\Delta p}{\Delta t} \implies F \Delta t = \Delta p$
    So, $J = \Delta p = mv - mu$
-   **Unit:** The SI unit of impulse is Newton second (N s), which is equivalent to kg m s⁻¹.

**3. Principle of Conservation of Momentum**
For a closed system (one where no external forces act), the total linear momentum remains constant.
-   This means the total momentum before a collision or explosion is equal to the total momentum after the collision or explosion.
-   Total initial momentum = Total final momentum
    $\sum (mu)_{initial} = \sum (mv)_{final}$
-   This principle applies to both elastic and inelastic collisions and explosions.

**4. Types of Collisions**
-   **Elastic Collision:** A collision in which both kinetic energy and momentum are conserved. In reality, perfectly elastic collisions are rare, but examples include collisions between gas molecules.
    -   Total initial kinetic energy = Total final kinetic energy
-   **Inelastic Collision:** A collision in which momentum is conserved, but kinetic energy is not conserved (some kinetic energy is converted into other forms, such as heat, sound, or deformation energy).
    -   Total initial kinetic energy $\neq$ Total final kinetic energy (usually, initial KE > final KE)
    -   If objects stick together after collision, it is a perfectly inelastic collision.

### Worked Example

**Question:**
A bullet of mass 0.010 kg is fired horizontally with a speed of 300 m s⁻¹ into a block of wood of mass 2.0 kg which is initially at rest on a rough horizontal surface. The bullet becomes embedded in the block.
(a) Calculate the common speed of the bullet and block immediately after impact.
(b) Determine the impulse exerted on the block by the bullet during the impact.

**Solution:**
(a) **Common speed after impact (Conservation of Momentum):**
This is an inelastic collision as the bullet becomes embedded.
-   Mass of bullet, $m_b = 0.010$ kg
-   Initial velocity of bullet, $u_b = 300$ m s⁻¹
-   Mass of block, $m_w = 2.0$ kg
-   Initial velocity of block, $u_w = 0$ m s⁻¹
-   Let the common final velocity be $V$.

Applying the principle of conservation of momentum:
Total initial momentum = Total final momentum
$m_b u_b + m_w u_w = (m_b + m_w) V$
$(0.010 \text{ kg})(300 \text{ m s⁻¹}) + (2.0 \text{ kg})(0 \text{ m s⁻¹}) = (0.010 \text{ kg} + 2.0 \text{ kg}) V$
$3.0 \text{ kg m s⁻¹} + 0 = (2.010 \text{ kg}) V$
$V = \frac{3.0}{2.010} \text{ m s⁻¹} \approx 1.4925$ m s⁻¹
Common speed = 1.49 m s⁻¹ (3 significant figures)

(b) **Impulse exerted on the block by the bullet:**
Impulse on block = Change in momentum of the block
$\Delta p_{block} = m_w V - m_w u_w$
$\Delta p_{block} = (2.0 \text{ kg})(1.4925 \text{ m s⁻¹}) - (2.0 \text{ kg})(0 \text{ m s⁻¹})$
$\Delta p_{block} = 2.985 \text{ kg m s⁻¹}$
Impulse = 2.99 N s (3 significant figures)
(Note: The impulse on the bullet by the block would be equal in magnitude and opposite in direction: $0.010 \text{ kg} \times (1.4925 - 300) \text{ m s⁻¹} = -2.985$ N s)

### Common Pitfalls & Exam Tips

-   **Vector Nature:** Always consider the direction of velocity and momentum. Assign positive and negative signs for direction consistently.
-   **Closed System:** Conservation of momentum applies only when there are no external forces. In collisions, internal forces (forces between the colliding objects) cancel out.
-   **Kinetic Energy:** Do not assume kinetic energy is conserved unless the collision is explicitly stated to be elastic. In most real-world collisions, some kinetic energy is lost.
-   **Impulse-Momentum Theorem:** Remember that impulse is not just $F \Delta t$; it is fundamentally the change in momentum. This is particularly useful for problems involving forces over short time intervals.
-   **Units:** Pay attention to units: kg m s⁻¹ for momentum, N s for impulse. They are dimensionally equivalent.

```yaml
---
title: "Forces, Density, and Pressure"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Forces, Density and Pressure"
sub_topic: "4.1 Forces, Density, and Pressure"
---

## Forces, Density and Pressure: General Concepts

### Learning Objectives

- (a) understand that mass is a measure of the amount of substance in a body
- (b) understand that weight is the gravitational force on a body
- (c) understand and use the concepts of density and pressure
- (d) recall and use the formula $p = \rho gh$ for pressure in a liquid

### Core Concepts

**1. Mass and Weight**
-   **Mass ($m$):** A measure of the amount of matter in a body. It is a scalar quantity and is constant regardless of location. Unit: kilogram (kg).
-   **Weight ($W$):** The gravitational force acting on an object. It is a vector quantity, directed towards the center of the Earth.
    $W = mg$
    Where $g$ is the acceleration of free fall (gravitational field strength). Unit: Newton (N).
    -   $g$ varies slightly with location (e.g., lower at higher altitudes, slightly lower at the equator due to Earth's rotation). On Earth's surface, $g \approx 9.81$ m s⁻².

**2. Density**
-   **Definition:** Density ($\rho$) is defined as mass per unit volume.
    $\rho = \frac{m}{V}$
-   **Scalar Quantity:** Density is a scalar quantity.
-   **Unit:** The SI unit of density is kilogram per cubic metre (kg m⁻³). Other common units include g cm⁻³.
    -   To convert g cm⁻³ to kg m⁻³: $1 \text{ g cm⁻³} = 1000 \text{ kg m⁻³}$.

**3. Pressure**
-   **Definition:** Pressure ($p$) is defined as force per unit area acting perpendicular to the surface.
    $p = \frac{F}{A}$
-   **Scalar Quantity:** Pressure is a scalar quantity. Although force is a vector, pressure acts equally in all directions at a point within a fluid.
-   **Unit:** The SI unit of pressure is the Pascal (Pa), which is defined as one Newton per square metre (N m⁻²). Other common units include atmospheres (atm) and millimetres of mercury (mmHg).

**4. Pressure in Liquids**
-   **Formula:** The pressure exerted by a column of liquid at a certain depth is given by:
    $p = \rho gh$
    Where:
    -   $p$ = pressure at depth $h$ due to the liquid (Pa)
    -   $\rho$ = density of the liquid (kg m⁻³)
    -   $g$ = acceleration of free fall (m s⁻²)
    -   $h$ = depth below the surface of the liquid (m)
-   This formula calculates the pressure *due to the liquid column*. Total pressure at a depth $h$ in an open liquid will also include atmospheric pressure: $p_{total} = p_{atm} + \rho gh$.
-   Pressure at the same horizontal level in a continuous fluid is the same.

### Worked Example

**Question:**
A rectangular block of mass 12 kg has dimensions 0.20 m x 0.30 m x 0.40 m.
(a) Calculate the density of the block.
(b) If the block rests on its smallest face on a horizontal surface, calculate the pressure it exerts on the surface.
(Take $g = 9.81$ m s⁻²)

**Solution:**
(a) **Density of the block:**
1.  **Calculate the volume of the block:**
    -   $V = \text{length} \times \text{width} \times \text{height}$
    -   $V = 0.20 \text{ m} \times 0.30 \text{ m} \times 0.40 \text{ m} = 0.024 \text{ m}^3$
2.  **Calculate the density:**
    -   $\rho = \frac{m}{V}$
    -   $\rho = \frac{12 \text{ kg}}{0.024 \text{ m}^3} = 500 \text{ kg m⁻³}$

The density of the block is 500 kg m⁻³.

(b) **Pressure exerted on the surface:**
1.  **Calculate the weight of the block (the force exerted):**
    -   $W = mg$
    -   $W = 12 \text{ kg} \times 9.81 \text{ m s⁻²} = 117.72 \text{ N}$
2.  **Identify the area of the smallest face:**
    -   The dimensions are 0.20 m, 0.30 m, 0.40 m.
    -   Smallest face has dimensions 0.20 m x 0.30 m.
    -   Area $A = 0.20 \text{ m} \times 0.30 \text{ m} = 0.060 \text{ m}^2$
3.  **Calculate the pressure:**
    -   $p = \frac{F}{A}$
    -   $p = \frac{117.72 \text{ N}}{0.060 \text{ m}^2} = 1962 \text{ Pa}$
    -   Rounding to 2 significant figures (due to dimensions): 2000 Pa or 2.0 kPa.

The pressure exerted by the block on the surface is 2000 Pa.

### Common Pitfalls & Exam Tips

-   **Mass vs. Weight:** Do not confuse mass (scalar, kg) with weight (vector, N). Weight is a force.
-   **Pressure Units:** Always use SI units (Pa or N m⁻²) for pressure calculations unless otherwise specified.
-   **Area for Pressure:** Ensure you use the correct area for calculating pressure. It is the area *perpendicular* to the force. For solids resting on a surface, it is the contact area.
-   **Pressure in Liquids:** The pressure in liquids depends only on depth, density, and g, not on the shape or volume of the container. Remember that $h$ is the vertical depth below the surface.
-   **Atmospheric Pressure:** When dealing with total pressure at a depth in an open liquid, remember to add atmospheric pressure if required.

```yaml
---
title: "Work, Energy, and Power"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Work, Energy and Power"
sub_topic: "5.1 Work, Energy, and Power"
---

## Work, Energy and Power: Calculations and Principles

### Learning Objectives

- (a) understand the concept of work done by a force and calculate it using $W = Fd \cos \theta$
- (b) understand and use the concepts of kinetic energy, gravitational potential energy, and elastic potential energy
- (c) state and apply the principle of conservation of energy
- (d) define and use power as the rate of doing work

### Core Concepts

**1. Work Done**
-   **Definition:** Work done ($W$) by a force is the energy transferred to or from an object by the action of the force. It occurs when a force causes a displacement of an object in the direction of the force.
-   **Formula:** $W = Fd \cos \theta$
    Where:
    -   $F$ = magnitude of the force
    -   $d$ = magnitude of the displacement
    -   $\theta$ = angle between the force vector and the displacement vector
-   If force is in the direction of displacement, $\theta = 0°$, $\cos 0° = 1$, so $W = Fd$.
-   If force is perpendicular to displacement, $\theta = 90°$, $\cos 90° = 0$, so $W = 0$.
-   **Scalar Quantity:** Work is a scalar quantity.
-   **Unit:** Joule (J), defined as one Newton metre (N m).

**2. Energy**
-   **Definition:** Energy is the capacity to do work.
-   **Types of Energy:**
    -   **Kinetic Energy ($E_k$):** Energy due to motion.
        $E_k = \frac{1}{2}mv^2$
        Where $m$ is mass and $v$ is velocity.
    -   **Gravitational Potential Energy ($E_p$):** Energy stored by an object due to its position in a gravitational field.
        $E_p = mgh$
        Where $m$ is mass, $g$ is acceleration of free fall, and $h$ is vertical height relative to a reference level.
    -   **Elastic Potential Energy ($E_{elast}$):** Energy stored in an elastic material (e.g., a spring) when it is stretched or compressed.
        $E_{elast} = \frac{1}{2}kx^2$
        Where $k$ is the spring constant and $x$ is the extension or compression from the equilibrium position.
-   **Unit:** Joule (J).

**3. Principle of Conservation of Energy**
Energy cannot be created or destroyed, only transformed from one form to another. In a closed system, the total amount of energy remains constant.
-   For mechanical systems (where non-conservative forces like friction are negligible):
    Total Mechanical Energy = Kinetic Energy + Potential Energy = Constant
    $E_k + E_p = \text{constant}$
-   Work-Energy Theorem: The net work done on an object is equal to the change in its kinetic energy.
    $W_{net} = \Delta E_k$

**4. Power**
-   **Definition:** Power ($P$) is the rate at which work is done or energy is transferred.
    $P = \frac{\Delta W}{\Delta t}$ or $P = \frac{\Delta E}{\Delta t}$
-   **Relationship with Force and Velocity:** For a constant force acting in the direction of motion:
    $P = Fv$ (Power = Force $\times$ Velocity)
-   **Scalar Quantity:** Power is a scalar quantity.
-   **Unit:** Watt (W), defined as one Joule per second (J s⁻¹).

### Worked Example

**Question:**
A pump lifts 1500 kg of water through a vertical height of 12 m in 2.0 minutes. Calculate:
(a) The gravitational potential energy gained by the water.
(b) The useful power output of the pump.
(Take $g = 9.81$ m s⁻²)

**Solution:**
(a) **Gravitational potential energy gained:**
-   Mass of water, $m = 1500$ kg
-   Vertical height, $h = 12$ m
-   Acceleration of free fall, $g = 9.81$ m s⁻²
-   $E_p = mgh$
-   $E_p = 1500 \text{ kg} \times 9.81 \text{ m s⁻²} \times 12 \text{ m}$
-   $E_p = 176580 \text{ J}$
-   $E_p = 1.77 \times 10^5 \text{ J}$ (3 significant figures)

(b) **Useful power output of the pump:**
-   Work done by pump = Energy gained by water = $176580$ J
-   Time taken, $\Delta t = 2.0 \text{ minutes} = 2.0 \times 60 \text{ s} = 120 \text{ s}$
-   $P = \frac{\Delta W}{\Delta t}$ (or $\frac{\Delta E}{\Delta t}$)
-   $P = \frac{176580 \text{ J}}{120 \text{ s}}$
-   $P = 1471.5 \text{ W}$
-   $P = 1.47 \text{ kW}$ or $1470 \text{ W}$ (3 significant figures)

### Common Pitfalls & Exam Tips

-   **Work done:** Remember that work is done only when there is a component of force in the direction of displacement. A force perpendicular to displacement does no work.
-   **Conservation of Energy:** Be clear about what constitutes the system and whether external non-conservative forces (like friction or air resistance) are doing work. If they are, mechanical energy is not conserved, but total energy still is.
-   **Units:** Ensure consistency in units (Joules for energy/work, Watts for power, seconds for time).
-   **Power and Velocity:** The formula $P=Fv$ is very useful for situations involving constant velocity or instantaneous power. Remember $F$ is the force causing the motion, and $v$ is the velocity in the direction of that force.
-   **Efficiency:** Pumps or motors rarely have 100% efficiency. Useful power output is often less than total power input due to energy losses (e.g., to heat, sound).

```yaml
---
title: "Deformation of Solids: Stress and Strain"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Deformation of Solids"
sub_topic: "6.1 Stress and Strain"
---

## Deformation of Solids: Stress and Strain

### Learning Objectives

- (a) understand and use the terms stress, strain and Young modulus
- (b) interpret and use force-extension graphs and stress-strain graphs for ductile and brittle materials
- (c) understand the terms elastic limit, yield point, plastic deformation and ultimate tensile strength

### Core Concepts

**1. Stress ($\sigma$)**
-   **Definition:** Stress is the force applied per unit cross-sectional area. It is a measure of the internal forces that particles within a deformable body exert on each other.
    $\sigma = \frac{F}{A}$
    Where $F$ is the applied force and $A$ is the cross-sectional area perpendicular to the force.
-   **Unit:** Pascal (Pa) or N m⁻².

**2. Strain ($\epsilon$)**
-   **Definition:** Strain is the fractional change in length. It is a measure of the deformation of the material.
    $\epsilon = \frac{\Delta L}{L_0}$
    Where $\Delta L$ is the extension (change in length) and $L_0$ is the original length.
-   **Dimensionless:** Strain is a ratio of two lengths, so it has no units.

**3. Young Modulus ($E$)**
-   **Definition:** Young modulus is a measure of the stiffness of an elastic material. It is defined as the ratio of tensile stress to tensile strain within the elastic limit.
    $E = \frac{\text{stress}}{\text{strain}} = \frac{F/A}{\Delta L/L_0} = \frac{F L_0}{A \Delta L}$
-   **Unit:** Pascal (Pa) or N m⁻² (same as stress). A higher Young modulus indicates a stiffer material.

**4. Force-Extension Graphs**
-   **Elastic region:** Straight line through the origin. Follows Hooke's Law ($F = kx$). The gradient is the spring constant ($k$).
-   **Elastic limit:** The point beyond which the material will no longer return to its original length when the load is removed.
-   **Plastic deformation:** Deformation that remains even after the load is removed. Occurs beyond the elastic limit.
-   **Yield point:** The point at which the material starts to deform plastically with little or no increase in load.
-   **Ultimate Tensile Strength (UTS):** The maximum stress a material can withstand before breaking. Corresponds to the maximum force on a force-extension graph.
-   **Breaking stress/point:** The stress at which the material fractures.

**5. Stress-Strain Graphs**
-   Provide a normalized view of material behavior, independent of specimen dimensions.
-   **Gradient:** In the elastic region, the gradient of the stress-strain graph is the Young modulus.
-   **Area under graph:**
    -   Up to elastic limit: Energy stored per unit volume (elastic potential energy density).
    -   Total area to fracture: Total energy absorbed per unit volume (toughness).

**6. Ductile vs. Brittle Materials**
-   **Ductile materials:** Can be drawn into wires. Show significant plastic deformation before fracture (e.g., copper, mild steel). Their stress-strain graph has a large plastic region.
-   **Brittle materials:** Fracture with little or no plastic deformation (e.g., glass, cast iron). Their stress-strain graph is linear up to fracture or has a very small plastic region.

### Worked Example

**Question:**
A metal wire of length 2.00 m and cross-sectional area $1.0 \times 10^{-7}$ m² is stretched by a force. The resulting stress-strain graph for the wire is linear up to a strain of $0.0050$, at which point the stress is $1.0 \times 10^8$ Pa. Beyond this point, the material exhibits plastic deformation until it fractures.
(a) Calculate the Young modulus of the wire.
(b) Calculate the extension of the wire when the strain is $0.0050$.
(c) Describe the behavior of the material as the stress increases beyond $1.0 \times 10^8$ Pa.

**Solution:**
(a) **Young modulus:**
-   From the linear region of the stress-strain graph, Young modulus is the gradient: $E = \frac{\text{stress}}{\text{strain}}$.
-   Stress $\sigma = 1.0 \times 10^8$ Pa
-   Strain $\epsilon = 0.0050$
-   $E = \frac{1.0 \times 10^8 \text{ Pa}}{0.0050} = 2.0 \times 10^{10} \text{ Pa}$

The Young modulus of the wire is $2.0 \times 10^{10}$ Pa.

(b) **Extension of the wire:**
-   Strain $\epsilon = \frac{\Delta L}{L_0}$
-   Original length $L_0 = 2.00$ m
-   Strain $\epsilon = 0.0050$
-   $\Delta L = \epsilon \times L_0 = 0.0050 \times 2.00 \text{ m} = 0.010 \text{ m}$

The extension of the wire is 0.010 m.

(c) **Behavior beyond $1.0 \times 10^8$ Pa:**
-   The graph indicates that beyond a stress of $1.0 \times 10^8$ Pa (corresponding to a strain of 0.0050), the material exhibits plastic deformation.
-   This means that if the applied force is removed, the wire will not return to its original length; it will have a permanent extension.
-   In the plastic region, a small increase in stress can lead to a large increase in strain, and the material becomes less stiff. It will eventually reach its ultimate tensile strength and then fracture.

### Common Pitfalls & Exam Tips

-   **Units:** Be careful with units, especially for area (m²) and length (m). Stress and Young modulus have units of Pascal (Pa). Strain is dimensionless.
-   **Elastic vs. Plastic:** Clearly distinguish between elastic deformation (recoverable) and plastic deformation (permanent).
-   **Hooke's Law and Young Modulus:** Hooke's Law ($F=kx$) applies only to the elastic region. Young modulus is also derived from this linear elastic region.
-   **Graph Interpretation:** Understand how to read elastic limit, yield point, UTS, and breaking point from both force-extension and stress-strain graphs. Remember that the gradient of a stress-strain graph in the linear region is Young modulus.
-   **Ductile vs. Brittle:** Know the characteristic shapes of stress-strain graphs for ductile and brittle materials.

```yaml
---
title: "Wave Properties"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Waves"
sub_topic: "7.1 Wave Properties"
---

## Waves: General Properties and Types

### Learning Objectives

- (a) describe what is meant by wave motion as illustrated by transverse and longitudinal waves
- (b) understand and use the terms displacement, amplitude, wavelength, frequency, period, phase difference and speed
- (c) deduce and use the relationship $v = f\lambda$
- (d) recall and use the relationship for the intensity of a wave $I \propto A^2$

### Core Concepts

**1. Wave Motion**
-   **Wave:** A disturbance that transfers energy from one place to another without transferring matter.
-   **Transverse Waves:** The oscillations of particles in the medium are perpendicular to the direction of energy propagation.
    -   Examples: Electromagnetic waves (light, radio waves), waves on a string, water waves.
    -   Consist of crests (maximum positive displacement) and troughs (maximum negative displacement).
-   **Longitudinal Waves:** The oscillations of particles in the medium are parallel to the direction of energy propagation.
    -   Examples: Sound waves, P-waves in seismology, waves in a Slinky spring.
    -   Consist of compressions (regions of high pressure/density) and rarefactions (regions of low pressure/density).

**2. Wave Definitions**
-   **Displacement ($x$):** The distance of a point on the wave from its equilibrium position.
-   **Amplitude ($A$):** The maximum displacement of a particle from its equilibrium position.
-   **Wavelength ($\lambda$):** The shortest distance between two consecutive corresponding points on a wave (e.g., two crests or two troughs). Unit: metres (m).
-   **Period ($T$):** The time taken for one complete oscillation or one complete wave to pass a fixed point. Unit: seconds (s).
-   **Frequency ($f$):** The number of complete oscillations or waves passing a fixed point per unit time. Unit: Hertz (Hz) or s⁻¹.
    -   Relationship: $f = \frac{1}{T}$
-   **Phase difference:** The difference in position of two points on a wave, expressed as an angle (in degrees or radians). Points in phase have a phase difference of 0, 360°, 2$\pi$ rad etc. Points in anti-phase have a phase difference of 180°, $\pi$ rad etc.
    -   Phase difference = $\frac{\text{distance between points}}{\lambda} \times 360°$ (or $2\pi$ rad)
-   **Wave Speed ($v$):** The distance travelled by the wave per unit time.
    $v = f\lambda$

**3. Intensity of a Wave**
-   **Definition:** Intensity ($I$) is the power transmitted per unit area perpendicular to the direction of wave propagation.
-   **Relationship with Amplitude:** For all types of waves, the intensity is directly proportional to the square of the amplitude.
    $I \propto A^2$
-   This means if the amplitude doubles, the intensity quadruples.
-   **Unit:** Watt per square metre (W m⁻²).

### Worked Example

**Question:**
A sound wave has a frequency of 250 Hz and travels through air at a speed of 330 m s⁻¹.
(a) Calculate the wavelength of the sound wave.
(b) If the intensity of the sound wave is $1.0 \times 10^{-6}$ W m⁻² and its amplitude is $A$, what would be the new amplitude if the intensity increased to $4.0 \times 10^{-6}$ W m⁻²?

**Solution:**
(a) **Wavelength of the sound wave:**
-   Wave speed $v = 330$ m s⁻¹
-   Frequency $f = 250$ Hz
-   Using the wave equation $v = f\lambda$:
    $\lambda = \frac{v}{f}$
    $\lambda = \frac{330 \text{ m s⁻¹}}{250 \text{ Hz}}$
    $\lambda = 1.32$ m

The wavelength of the sound wave is 1.32 m.

(b) **New amplitude with increased intensity:**
-   We know $I \propto A^2$. This means $\frac{I_1}{I_2} = \frac{A_1^2}{A_2^2}$.
-   Initial intensity $I_1 = 1.0 \times 10^{-6}$ W m⁻²
-   Initial amplitude $A_1 = A$
-   New intensity $I_2 = 4.0 \times 10^{-6}$ W m⁻²
-   New amplitude $A_2 = ?$
-   $\frac{1.0 \times 10^{-6}}{4.0 \times 10^{-6}} = \frac{A^2}{A_2^2}$
-   $\frac{1}{4} = \frac{A^2}{A_2^2}$
-   Taking the square root of both sides: $\sqrt{\frac{1}{4}} = \sqrt{\frac{A^2}{A_2^2}}$
-   $\frac{1}{2} = \frac{A}{A_2}$
-   $A_2 = 2A$

If the intensity increased to $4.0 \times 10^{-6}$ W m⁻², the new amplitude would be $2A$.

### Common Pitfalls & Exam Tips

-   **Transverse vs. Longitudinal:** Understand the fundamental difference in particle oscillation direction relative to wave propagation. Be able to give examples of each.
-   **Wave Equation:** Memorize and correctly apply $v = f\lambda$. Ensure consistent units.
-   **Period and Frequency:** Remember $T = 1/f$.
-   **Phase Difference:** Be able to calculate phase difference and understand what in phase and anti-phase mean.
-   **Intensity and Amplitude:** The relationship $I \propto A^2$ is very important. A common mistake is to assume $I \propto A$. This implies that doubling the amplitude quadruples the intensity.
-   **Speed of Light/Sound:** The speed of electromagnetic waves in a vacuum is a constant ($c = 3.0 \times 10^8$ m s⁻¹). The speed of sound depends on the medium.

```yaml
---
title: "Superposition and Interference"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Superposition"
sub_topic: "8.1 Superposition and Interference"
---

## Superposition: Interference Phenomena

### Learning Objectives

- (a) understand and use the principle of superposition
- (b) understand the terms coherence and path difference
- (c) understand and use the conditions for constructive and destructive interference
- (d) describe and explain Young's double-slit experiment
- (e) use the formula $\lambda = \frac{ax}{D}$ for the double-slit experiment

### Core Concepts

**1. Principle of Superposition**
When two or more waves overlap, the resultant displacement at any point and at any instant is the vector sum of the displacements of the individual waves at that point and instant.
-   This principle applies to all types of waves.

**2. Interference**
Interference is the superposition of two or more waves resulting in a new wave pattern.
-   For observable and stable interference patterns, the waves must be **coherent**.

**3. Coherence**
Coherent waves are waves that have:
-   A constant phase difference.
-   The same frequency (and thus the same wavelength).
Coherent sources are typically derived from a single source (e.g., using a double slit or splitting a laser beam).

**4. Path Difference**
Path difference is the difference in distance traveled by two waves from their sources to a particular point.
-   **Constructive Interference:** Occurs when waves arrive in phase, resulting in a larger amplitude (e.g., bright fringes for light, loud sounds for sound waves).
    -   Condition: Path difference = $n\lambda$, where $n = 0, 1, 2, ...$ (integer multiples of wavelength).
-   **Destructive Interference:** Occurs when waves arrive in anti-phase, resulting in a smaller or zero amplitude (e.g., dark fringes for light, quiet sounds for sound waves).
    -   Condition: Path difference = $(n + \frac{1}{2})\lambda$, where $n = 0, 1, 2, ...$ (odd multiples of half-wavelength).

**5. Young's Double-Slit Experiment**
This experiment demonstrates the wave nature of light through interference.
-   A single monochromatic (single wavelength) light source illuminates two narrow, parallel slits.
-   The slits act as two coherent sources, producing overlapping waves.
-   An interference pattern of alternating bright and dark fringes (maxima and minima) is observed on a screen.
-   **Bright fringes** correspond to constructive interference.
-   **Dark fringes** correspond to destructive interference.

**6. Double-Slit Formula**
For Young's double-slit experiment, the relationship between fringe spacing, wavelength, slit separation, and screen distance is:
$\lambda = \frac{ax}{D}$
Where:
-   $\lambda$ = wavelength of the light (m)
-   $a$ = separation between the two slits (m)
-   $x$ = fringe spacing (distance between the centers of two consecutive bright or two consecutive dark fringes) (m)
-   $D$ = distance from the slits to the screen (m)

### Worked Example

**Question:**
In a Young's double-slit experiment, light of wavelength 600 nm is used. The slits are separated by 0.50 mm, and the screen is placed 2.0 m from the slits. Calculate the fringe spacing.

**Solution:**
1.  **Identify given values and convert to SI units:**
    -   Wavelength $\lambda = 600 \text{ nm} = 600 \times 10^{-9} \text{ m} = 6.00 \times 10^{-7} \text{ m}$
    -   Slit separation $a = 0.50 \text{ mm} = 0.50 \times 10^{-3} \text{ m}$
    -   Distance to screen $D = 2.0$ m
    -   Fringe spacing $x = ?$

2.  **Rearrange the formula $\lambda = \frac{ax}{D}$ to solve for $x$:**
    $x = \frac{\lambda D}{a}$

3.  **Substitute the values and calculate:**
    $x = \frac{(6.00 \times 10^{-7} \text{ m}) \times (2.0 \text{ m})}{(0.50 \times 10^{-3} \text{ m})}$
    $x = \frac{1.20 \times 10^{-6}}{0.50 \times 10^{-3}} \text{ m}$
    $x = 2.4 \times 10^{-3} \text{ m}$
    $x = 2.4 \text{ mm}$

The fringe spacing is 2.4 mm.

### Common Pitfalls & Exam Tips

-   **Coherence:** Emphasize the importance of coherent sources for a stable interference pattern. Lasers are naturally coherent; for incoherent sources like filament lamps, a single slit is used first to produce a coherent beam.
-   **Units:** Be extremely careful with units, especially converting mm, cm, nm to metres. All quantities in the formula $\lambda = \frac{ax}{D}$ must be in metres.
-   **Path Difference Conditions:** Clearly remember the conditions for constructive ($n\lambda$) and destructive ($(n+\frac{1}{2})\lambda$) interference.
-   **Fringe Spacing:** Fringe spacing ($x$) is the distance between consecutive bright fringes (or consecutive dark fringes).
-   **Effect of Changing Variables:** Understand how changing $\lambda$, $a$, or $D$ affects the fringe spacing. For example, increasing $D$ or $\lambda$ increases $x$, while increasing $a$ decreases $x$.

```yaml
---
title: "Electric Current and Potential Difference"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Electricity"
sub_topic: "9.1 Electric Current and Potential Difference"
---

## Electricity: Current and Potential Difference

### Learning Objectives

- (a) understand that electric current is the rate of flow of charge
- (b) recall and use the equation $I = \frac{\Delta Q}{\Delta t}$
- (c) understand that an electron volt is the energy gained by an electron travelling through a potential difference of 1 V
- (d) understand and use the concept of potential difference (p.d.) as work done per unit charge
- (e) recall and use the equation $V = \frac{W}{Q}$

### Core Concepts

**1. Electric Current ($I$)**
-   **Definition:** Electric current is defined as the rate of flow of electric charge.
    $I = \frac{\Delta Q}{\Delta t}$
    Where $\Delta Q$ is the amount of charge passing a point in time $\Delta t$.
-   **Direction:** Conventional current is defined as the direction of flow of positive charge (from positive to negative terminal outside the cell). In metals, it is the flow of negatively charged electrons in the opposite direction.
-   **Unit:** Ampere (A). One Ampere is one Coulomb per second (C s⁻¹).
-   **Quantisation of Charge:** Charge is quantised, meaning it exists in discrete multiples of the elementary charge, $e = 1.60 \times 10^{-19}$ C (the charge on a single proton or electron).
    $Q = Ne$, where $N$ is an integer.

**2. Potential Difference (p.d.) or Voltage ($V$)**
-   **Definition:** Potential difference between two points is the work done (or energy transferred) per unit positive charge in moving the charge between those two points.
    $V = \frac{W}{Q}$
    Where $W$ is the work done and $Q$ is the charge moved.
-   **Unit:** Volt (V). One Volt is one Joule per Coulomb (J C⁻¹).
-   **Electromotive Force (e.m.f.):** The work done per unit charge by a power source (e.g., battery) in driving charge around a complete circuit. It is the energy converted from other forms (chemical, mechanical) to electrical energy per unit charge.

**3. Electronvolt (eV)**
-   **Definition:** An electronvolt is the energy gained by a single electron when it accelerates through a potential difference of one volt.
-   **Conversion to Joules:**
    $1 \text{ eV} = (1.60 \times 10^{-19} \text{ C}) \times (1 \text{ V}) = 1.60 \times 10^{-19} \text{ J}$
-   This unit is particularly useful for describing energies at the atomic and subatomic level.

### Worked Example

**Question:**
A charge of 450 C flows through a circuit in 5.0 minutes.
(a) Calculate the average current flowing in the circuit.
(b) If the potential difference across a component in this circuit is 12 V, calculate the energy converted by this component when 450 C of charge passes through it.
(c) Express the energy calculated in (b) in electronvolts.

**Solution:**
(a) **Average current:**
-   Charge $\Delta Q = 450$ C
-   Time $\Delta t = 5.0 \text{ minutes} = 5.0 \times 60 \text{ s} = 300 \text{ s}$
-   $I = \frac{\Delta Q}{\Delta t}$
-   $I = \frac{450 \text{ C}}{300 \text{ s}}$
-   $I = 1.5$ A

The average current is 1.5 A.

(b) **Energy converted by the component:**
-   Potential difference $V = 12$ V
-   Charge $Q = 450$ C
-   Using the formula $V = \frac{W}{Q}$, rearrange to find work done (energy converted) $W = VQ$.
-   $W = 12 \text{ V} \times 450 \text{ C}$
-   $W = 5400 \text{ J}$

The energy converted by the component is 5400 J.

(c) **Energy in electronvolts:**
-   Energy in Joules $W = 5400$ J
-   Conversion factor: $1 \text{ eV} = 1.60 \times 10^{-19}$ J
-   Energy in eV = $\frac{5400 \text{ J}}{1.60 \times 10^{-19} \text{ J/eV}}$
-   Energy in eV = $3.375 \times 10^{22}$ eV
-   Rounding to 3 significant figures: $3.38 \times 10^{22}$ eV

The energy is $3.38 \times 10^{22}$ eV.

### Common Pitfalls & Exam Tips

-   **Current Direction:** Remember the convention for current flow (positive to negative) even if electrons are moving in the opposite direction.
-   **Units Conversion:** Be vigilant about units, especially time (convert minutes or hours to seconds) and energy (Joules to electronvolts or vice versa).
-   **p.d. vs. e.m.f.:** Understand the subtle difference. e.m.f. is the energy supplied by the source per unit charge, while p.d. is the energy converted in a component per unit charge. They are numerically equal across a source if there is no internal resistance.
-   **Electronvolt:** This unit is primarily for very small energy changes, common in atomic and nuclear physics. Make sure you know the conversion factor.
-   **Calculations:** Ensure clear substitution into formulas and correct use of significant figures in final answers.

```yaml
---
title: "D.C. Circuits: Resistance and Ohm's Law"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "D.C. Circuits"
sub_topic: "10.1 D.C. Circuits: Resistance and Ohm's Law"
---

## D.C. Circuits: Resistance and Ohm's Law

### Learning Objectives

- (a) state and use Ohm's law
- (b) understand and use the concept of resistance and its unit
- (c) recall and use the equation $R = \frac{\rho L}{A}$ for resistance
- (d) understand and use the effect of temperature on the resistance of metals and thermistors

### Core Concepts

**1. Ohm's Law**
-   **Statement:** The current through a metallic conductor is directly proportional to the potential difference across its ends, provided that its temperature and other physical conditions remain constant.
-   **Formula:** $V = IR$
    Where:
    -   $V$ = potential difference across the component (V)
    -   $I$ = current flowing through the component (A)
    -   $R$ = resistance of the component ($\Omega$)
-   **Ohmic conductor:** A conductor that obeys Ohm's Law (e.g., a metal wire at constant temperature). Its current-voltage graph is a straight line through the origin.
-   **Non-ohmic conductor:** A conductor that does not obey Ohm's Law (e.g., a filament lamp, thermistor, diode). Its current-voltage graph is not a straight line through the origin.

**2. Resistance ($R$)**
-   **Definition:** Resistance is a measure of how much a component opposes the flow of electric current.
-   **Unit:** Ohm ($\Omega$). One Ohm is one Volt per Ampere (V A⁻¹).
-   **Factors affecting resistance of a wire:**
    -   **Length ($L$):** Resistance is directly proportional to length ($R \propto L$). Longer wires have more resistance.
    -   **Cross-sectional Area ($A$):** Resistance is inversely proportional to cross-sectional area ($R \propto \frac{1}{A}$). Thicker wires have less resistance.
    -   **Material (Resistivity, $\rho$):** Resistance depends on the type of material.
    -   **Temperature:** For most metals, resistance increases with temperature. For semiconductors (like thermistors), resistance decreases with temperature.

**3. Resistivity ($\rho$)**
-   **Definition:** Resistivity is a property of a material that indicates its resistance to electrical conduction. It is a fundamental property independent of shape or size.
-   **Formula for Resistance:** $R = \frac{\rho L}{A}$
    Where:
    -   $R$ = resistance ($\Omega$)
    -   $\rho$ = resistivity of the material ($\Omega$ m)
    -   $L$ = length of the conductor (m)
    -   $A$ = cross-sectional area of the conductor (m²)
-   **Unit:** Ohm metre ($\Omega$ m).

**4. Effect of Temperature on Resistance**
-   **Metals (Conductors):** As temperature increases, the resistance of metals increases. This is because the ions in the metal lattice vibrate more vigorously, increasing the frequency of collisions with free electrons, thus impeding electron flow.
-   **Thermistors (NTC Thermistors):** As temperature increases, the resistance of NTC (Negative Temperature Coefficient) thermistors decreases. This is because more charge carriers (electrons and holes) are released within the semiconductor material at higher temperatures, increasing conductivity.

### Worked Example

**Question:**
A copper wire has a length of 2.0 m and a cross-sectional area of $1.5 \times 10^{-7}$ m². The resistivity of copper is $1.68 \times 10^{-8} \Omega$ m.
(a) Calculate the resistance of the copper wire.
(b) If a potential difference of 6.0 V is applied across this wire, calculate the current flowing through it.

**Solution:**
(a) **Resistance of the copper wire:**
-   Length $L = 2.0$ m
-   Cross-sectional area $A = 1.5 \times 10^{-7}$ m²
-   Resistivity $\rho = 1.68 \times 10^{-8} \Omega$ m
-   Using the formula $R = \frac{\rho L}{A}$:
    $R = \frac{(1.68 \times 10^{-8} \Omega \text{ m}) \times (2.0 \text{ m})}{1.5 \times 10^{-7} \text{ m}^2}$
    $R = \frac{3.36 \times 10^{-8}}{1.5 \times 10^{-7}} \Omega$
    $R = 0.224 \Omega$

The resistance of the copper wire is 0.224 $\Omega$.

(b) **Current flowing through the wire:**
-   Potential difference $V = 6.0$ V
-   Resistance $R = 0.224 \Omega$ (from part a)
-   Using Ohm's Law $V = IR$, rearrange to find current $I = \frac{V}{R}$.
-   $I = \frac{6.0 \text{ V}}{0.224 \Omega}$
-   $I \approx 26.785$ A
-   Rounding to 2 significant figures (due to 6.0 V and 2.0 m): $I = 27$ A

The current flowing through the wire is 27 A.

### Common Pitfalls & Exam Tips

-   **Ohm's Law Conditions:** Remember that Ohm's Law ($V=IR$) is valid only for ohmic conductors at constant temperature.
-   **Resistivity Formula:** Ensure correct use of $R = \frac{\rho L}{A}$. Be careful with units for area (m²) and length (m). Resistivity ($\rho$) is an inherent property of the material.
-   **Temperature Effects:** Understand and be able to explain why the resistance of metals increases with temperature, and why the resistance of thermistors (semiconductors) decreases with temperature.
-   **Graphs:** Be able to sketch and interpret I-V graphs for ohmic conductors (straight line through origin), filament lamps (curve showing increasing resistance), and diodes (non-linear, one-way conduction).
-   **Calculations:** Practice calculating resistance, resistivity, or dimensions given the other parameters. Ensure proper significant figures in your final answer.

```yaml
---
title: "Particle Physics: Fundamental Particles"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Particle Physics"
sub_topic: "11.1 Particle Physics: Fundamental Particles"
---

## Particle Physics: Fundamental Particles

### Learning Objectives

- (a) understand that protons and neutrons are not fundamental particles and are made of quarks
- (b) recall and use the quark composition of protons and neutrons
- (c) understand the definition of a hadron as a particle containing quarks
- (d) understand the definition of a lepton as a fundamental particle that does not contain quarks

### Core Concepts

**1. Fundamental Particles**
-   Fundamental particles are particles that are not made up of smaller constituent particles. They are the building blocks of matter.
-   According to the Standard Model of particle physics, fundamental particles include quarks, leptons, and exchange bosons (force carriers).

**2. Quarks**
-   Quarks are fundamental particles that make up hadrons (protons, neutrons, etc.). They have fractional electric charges.
-   There are six types (flavors) of quarks:
    -   **Up (u):** Charge +$\frac{2}{3}e$
    -   **Down (d):** Charge -$\frac{1}{3}e$
    -   Charm (c)
    -   Strange (s)
    -   Top (t)
    -   Bottom (b)
-   Only up and down quarks are stable and form ordinary matter.

**3. Hadrons**
-   **Definition:** Hadrons are particles composed of quarks held together by the strong nuclear force.
-   Hadrons are not fundamental particles.
-   There are two types of hadrons:
    -   **Baryons:** Composed of three quarks. Examples: protons, neutrons.
    -   **Mesons:** Composed of a quark and an antiquark. Examples: pions, kaons.

**4. Quark Composition of Protons and Neutrons**
-   **Proton (p):** Composed of two up quarks and one down quark (uud).
    -   Charge of proton = $+\frac{2}{3}e + \frac{2}{3}e - \frac{1}{3}e = +\frac{3}{3}e = +e$
-   **Neutron (n):** Composed of one up quark and two down quarks (udd).
    -   Charge of neutron = $+\frac{2}{3}e - \frac{1}{3}e - \frac{1}{3}e = 0$

**5. Leptons**
-   **Definition:** Leptons are fundamental particles that do not contain quarks. They interact via the weak nuclear force, electromagnetic force (if charged), and gravity.
-   There are six types of leptons:
    -   Electron (e⁻)
    -   Muon ($\mu$⁻)
    -   Tau ($\tau$⁻)
    -   And their corresponding neutral neutrinos ($\nu_e$, $\nu_\mu$, $\nu_\tau$).
-   Electrons are stable and common. Neutrinos are extremely light and interact very weakly.

**Summary Table**

| Category      | Composition               | Examples                   | Fundamental? |
| :------------ | :------------------------ | :------------------------- | :----------- |
| **Quarks**    | Elementary                | Up, Down                   | Yes          |
| **Leptons**   | Elementary                | Electron, Neutrino         | Yes          |
| **Hadrons**   | Composed of Quarks        |                            | No           |
|  - Baryons    | Three Quarks (qqq)        | Proton (uud), Neutron (udd)| No           |
|  - Mesons     | Quark-Antiquark (q$\overline{\text{q}}$) | Pion, Kaon               | No           |

### Worked Example

**Question:**
A particle is found to have an electric charge of $+e$ and is classified as a baryon.
(a) State the quark composition of this particle.
(b) Explain why an electron is not classified as a hadron.

**Solution:**
(a) **Quark composition:**
-   The particle has a charge of $+e$.
-   It is a baryon, which means it is composed of three quarks.
-   We need a combination of three quarks (up and/or down) that sums to a charge of $+e$.
-   Up quark (u) has charge $+\frac{2}{3}e$.
-   Down quark (d) has charge $-\frac{1}{3}e$.
-   Consider the combination: two up quarks and one down quark (uud).
    -   Charge = $(+\frac{2}{3}e) + (+\frac{2}{3}e) + (-\frac{1}{3}e) = \frac{4}{3}e - \frac{1}{3}e = \frac{3}{3}e = +e$.
-   This composition corresponds to a proton.

The quark composition of the particle is uud (two up quarks and one down quark).

(b) **Explanation for electron not being a hadron:**
-   Hadrons are defined as particles that are composed of quarks.
-   Electrons are fundamental particles that are not made up of any smaller constituents, including quarks.
-   Electrons belong to the family of leptons, which are distinct from hadrons and do not contain quarks.

### Common Pitfalls & Exam Tips

-   **Fundamental vs. Composite:** Clearly distinguish between fundamental particles (quarks, leptons, bosons) and composite particles (hadrons like protons and neutrons).
-   **Quark Charges:** Memorize the charges of up ($+\frac{2}{3}e$) and down ($-\frac{1}{3}e$) quarks, as these are essential for determining particle charges.
-   **Baryons vs. Mesons:** Understand that both are types of hadrons but differ in their quark composition (baryons are qqq, mesons are q$\overline{\text{q}}$).
-   **Conservation Laws:** While not directly in this sub-topic, remember that charge, baryon number, and lepton number are conserved in particle interactions.
-   **Antiparticles:** Each particle has an antiparticle with the same mass but opposite charge and other quantum numbers. Antiquarks have opposite charges to their corresponding quarks (e.g., anti-up quark has charge $-\frac{2}{3}e$).

```yaml
---
title: "Motion in a Circle: Uniform Circular Motion"
syllabus_code: "9702"
level: "AS"
paper: "1"
topic: "Motion in a Circle"
sub_topic: "12.1 Motion in a Circle: Uniform Circular Motion"
---

## Motion in a Circle: Uniform Circular Motion

### Learning Objectives

- (a) understand that a resultant force is required to cause an object to move in a circle
- (b) recall and use the formula for centripetal acceleration $a = \frac{v^2}{r}$ or $a = r\omega^2$
- (c) recall and use the formula for centripetal force $F = \frac{mv^2}{r}$ or $F = mr\omega^2$
- (d) define and use angular speed and its relationship with linear speed and frequency

### Core Concepts

**1. Uniform Circular Motion**
-   Uniform circular motion describes the motion of an object travelling at a constant speed along a circular path.
-   Although the speed is constant, the velocity is continuously changing because the direction of motion is constantly changing.
-   A change in velocity implies acceleration. This acceleration is called centripetal acceleration.

**2. Centripetal Acceleration ($a_c$)**
-   **Definition:** The acceleration of an object moving in a circle at constant speed. It is always directed towards the center of the circle.
-   **Formulae:**
    $a_c = \frac{v^2}{r}$
    $a_c = r\omega^2$
    Where:
    -   $v$ = linear speed (m s⁻¹)
    -   $r$ = radius of the circular path (m)
    -   $\omega$ = angular speed (rad s⁻¹)

**3. Centripetal Force ($F_c$)**
-   **Definition:** The resultant force acting on an object causing it to move in a circular path. It is always directed towards the center of the circle (same direction as centripetal acceleration).
-   **Nature of the Force:** Centripetal force is not a new type of force; it is provided by existing forces like tension, friction, gravity, or normal force.
-   **Formulae (from Newton's Second Law $F=ma$):**
    $F_c = ma_c = \frac{mv^2}{r}$
    $F_c = ma_c = mr\omega^2$
    Where $m$ is the mass of the object.

**4. Angular Speed ($\omega$)**
-   **Definition:** The rate of change of angular displacement. It is the angle swept out per unit time by the radius vector.
-   **Unit:** radians per second (rad s⁻¹).
-   **Relationship with Linear Speed ($v$):**
    $v = r\omega$
-   **Relationship with Period ($T$) and Frequency ($f$):**
    -   For one complete revolution, the angle swept is $2\pi$ radians, and the time taken is the period $T$.
    -   $\omega = \frac{2\pi}{T}$
    -   Since $f = \frac{1}{T}$, then $\omega = 2\pi f$

**Summary of Relationships**

| Quantity      | Symbol | Unit       | Formulae                                    |
| :------------ | :----- | :--------- | :------------------------------------------ |
| Linear Speed  | $v$    | m s⁻¹      | $v = r\omega$                               |
| Angular Speed | $\omega$ | rad s⁻¹    | $\omega = \frac{2\pi}{T} = 2\pi f$          |
| Centripetal Accel. | $a_c$ | m s⁻²      | $a_c = \frac{v^2}{r} = r\omega^2$           |
| Centripetal Force | $F_c$ | N          | $F_c = \frac{mv^2}{r} = mr\omega^2$         |

### Worked Example

**Question:**
A stone of mass 0.20 kg is whirled in a horizontal circle of radius 0.80 m with a constant speed of 4.0 m s⁻¹.
(a) Calculate the angular speed of the stone.
(b) Calculate the centripetal acceleration of the stone.
(c) Calculate the centripetal force acting on the stone.

**Solution:**
(a) **Angular speed ($\omega$):**
-   Linear speed $v = 4.0$ m s⁻¹
-   Radius $r = 0.80$ m
-   Using the relationship $v = r\omega$, rearrange for $\omega = \frac{v}{r}$.
-   $\omega = \frac{4.0 \text{ m s⁻¹}}{0.80 \text{ m}}$
-   $\omega = 5.0$ rad s⁻¹

The angular speed of the stone is 5.0 rad s⁻¹.

(b) **Centripetal acceleration ($a_c$):**
-   Linear speed $v = 4.0$ m s⁻¹
-   Radius $r = 0.80$ m
-   Using the formula $a_c = \frac{v^2}{r}$:
    $a_c = \frac{(4.0 \text{ m s⁻¹})^2}{0.80 \text{ m}}$
    $a_c = \frac{16.0 \text{ m}^2 \text{ s⁻²}}{0.80 \text{ m}}$
    $a_c = 20.0$ m s⁻²

The centripetal acceleration of the stone is 20.0 m s⁻².

(c) **Centripetal force ($F_c$):**
-   Mass $m = 0.20$ kg
-   Linear speed $v = 4.0$ m s⁻¹
-   Radius $r = 0.80$ m
-   Using the formula $F_c = \frac{mv^2}{r}$:
    $F_c = \frac{(0.20 \text{ kg}) \times (4.0 \text{ m s⁻¹})^2}{0.80 \text{ m}}$
    $F_c = \frac{0.20 \times 16.0}{0.80} \text{ N}$
    $F_c = \frac{3.2}{0.80} \text{ N}$
    $F_c = 4.0 \text{ N}$

The centripetal force acting on the stone is 4.0 N.

### Common Pitfalls & Exam Tips

-   **Direction:** Always remember that centripetal acceleration and force are directed towards the center of the circle.
-   **Centripetal Force is not a New Force:** Understand that centripetal force is the *net* force that provides the circular motion, not a separate force itself. Identify which actual force (e.g., tension, friction, gravity component) provides the centripetal force in a given scenario.
-   **Units:** Be careful with units, especially for angular speed (radians per second, not degrees per second).
-   **Horizontal vs. Vertical Circles:** Differentiate between horizontal circles (where centripetal force is purely horizontal) and vertical circles (where weight plays a role and the centripetal force may vary with position).
-   **Frequency and Period:** Know how to relate angular speed to frequency and period ($ \omega = 2\pi f = 2\pi / T$).