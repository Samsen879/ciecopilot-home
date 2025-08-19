## Newton's Laws of Motion: Connected Particles

**Syllabus Reference**: 9709.P4.4.4
**Learning Objective**: Apply Newton's laws of motion to analyse the dynamics of two particles connected by a light inextensible string passing over a smooth pulley.

### Example Question
Two particles, $A$ and $B$, have masses of $5$ kg and $3$ kg respectively. They are connected by a light inextensible string which passes over a smooth, fixed pulley. The particles hang vertically and the system is released from rest. Use $g = 10$ m s$^{-2}$.

(i) Find the acceleration of the particles.
(ii) Find the tension in the string.

### Mark Scheme / Solution
Let the acceleration of the system be $a$ m s$^{-2}$ and the tension in the string be $T$ N.

(i)
For particle A (moving downwards):
$5g - T = 5a$
$50 - T = 5a$  --- (1) (M1)

For particle B (moving upwards):
$T - 3g = 3a$
$T - 30 = 3a$  --- (2) (M1)

To find the acceleration, add equations (1) and (2):
$(50 - T) + (T - 30) = 5a + 3a$ (M1 for attempting to solve simultaneous equations)
$20 = 8a$
$a = \frac{20}{8} = 2.5$
The acceleration is $2.5$ m s$^{-2}$. (A1)

(ii)
Substitute the value of $a$ into equation (2):
$T - 30 = 3(2.5)$ (M1)
$T - 30 = 7.5$
$T = 37.5$
The tension in the string is $37.5$ N. (A1)

### Standard Solution Steps
- Draw separate free-body diagrams for each particle, showing the weight acting downwards and the tension acting upwards.
- Apply Newton's Second Law ($F_{net} = ma$) to each particle individually, paying close attention to the direction of motion for each.
- For the heavier particle moving down, the net force is `Weight - Tension`.
- For the lighter particle moving up, the net force is `Tension - Weight`.
- This results in a pair of simultaneous linear equations with acceleration ($a$) and tension ($T$) as the unknowns.
- Solve the system of equations, typically by adding them to eliminate $T$ and find $a$ first.
- Substitute the value of $a$ back into one of the original equations to find $T$.

### Common Mistakes
- **Direction Errors:** Setting up the equations of motion with incorrect signs. The force in the direction of acceleration is positive, and the force opposing it is negative. For the descending mass, $mg > T$; for the ascending mass, $T > mg$.
- **Tension Errors:** Incorrectly assuming the tension is different for each particle. For a single light string over a smooth pulley, the tension is the same throughout.
- **Algebraic Slips:** Making errors when solving the simultaneous equations.
- **Forgetting Weight:** Omitting the weight ($mg$) from the force equations.

### Tags
newtons_laws, connected_particles, pulleys, dynamics, tension, acceleration, calculation

---

## Newton's Laws of Motion: Object on a Rough Inclined Plane

**Syllabus Reference**: 9709.P4.4.4
**Learning Objective**: Apply Newton's Second Law to a body accelerating on a rough inclined plane.

### Example Question
A crate of mass $12$ kg is being pulled up a rough plane inclined at $20^\circ$ to the horizontal. The pulling force has a magnitude of $95$ N and acts parallel to the plane. The coefficient of kinetic friction between the crate and the plane is $0.25$. Use $g = 10$ m s$^{-2}$.

Find the acceleration of the crate up the plane.

### Mark Scheme / Solution
First, resolve forces perpendicular to the plane to find the normal reaction, $R$.
There is no acceleration in this direction, so the net force is zero.
$R - 12g \cos(20^\circ) = 0$ (M1)
$R = 12 \times 10 \times \cos(20^\circ)$
$R = 120 \cos(20^\circ) = 112.76...$ N (A1)

Next, calculate the frictional force, $F$, which opposes the motion (acts down the plane).
$F = \mu R$ (M1)
$F = 0.25 \times 112.76...$
$F = 28.19...$ N

Now, apply Newton's Second Law ($F_{net} = ma$) parallel to the plane, in the direction of acceleration (up the plane).
The forces are the pulling force (up), the component of weight (down), and friction (down).
$95 - 12g \sin(20^\circ) - F = 12a$ (M1)
$95 - (12 \times 10 \times \sin(20^\circ)) - 28.19... = 12a$
$95 - 41.04... - 28.19... = 12a$ (A1 for correct substitution)
$25.76... = 12a$
$a = \frac{25.76...}{12} = 2.147...$
The acceleration of the crate is $2.15$ m s$^{-2}$ (to 3 s.f.). (A1)

### Standard Solution Steps
- Draw a clear free-body diagram showing all forces: applied force ($P$), weight ($mg$), normal reaction ($R$), and friction ($F$).
- Resolve the weight ($mg$) into components parallel ($mg \sin\theta$) and perpendicular ($mg \cos\theta$) to the plane.
- Apply equilibrium ($\Sigma F = 0$) perpendicular to the plane to find the normal reaction, $R$.
- Calculate the kinetic friction force using $F = \mu R$. Ensure its direction opposes the motion.
- Apply Newton's Second Law ($F_{net} = ma$) parallel to the plane. The net force is the sum of forces acting up the plane minus the sum of forces acting down the plane.
- Solve the final equation for the acceleration, $a$.

### Common Mistakes
- **Component Resolution:** Confusing $\sin\theta$ and $\cos\theta$ for the weight components. The component parallel to the slope is $mg \sin\theta$; the component perpendicular is $mg \cos\theta$.
- **Friction Direction:** Drawing the friction force in the wrong direction. For an object moving *up* the plane, friction acts *down* the plane.
- **Sign Errors in $F_{net}$:** Incorrectly summing the forces for the net force equation. A consistent positive direction (usually the direction of acceleration) must be established.
- **Premature Rounding:** Rounding the value of $R$ or $F$ too early, leading to an inaccurate final answer for acceleration. Use the calculator's memory function to retain precision.

### Tags
newtons_laws, inclined_plane, friction, dynamics, acceleration, resolving_forces, calculation