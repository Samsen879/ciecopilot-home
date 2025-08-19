## Circular Motion: Motion in a Horizontal Circle

**Syllabus Reference**: 9231.FM.3
**Learning Objective**: Apply Newton's second law to solve problems involving particles moving in horizontal circles, such as a conical pendulum.

### Example Question
A particle of mass $0.5$ kg is attached to one end of a light inextensible string of length $1.5$ m. The other end of the string is fixed to a point O. The particle moves with constant angular speed in a horizontal circle, with the centre of the circle vertically below O. The string is inclined at an angle $\theta$ to the vertical and the tension in the string is $6$ N.

(i) Find the angle $\theta$.
(ii) Find the angular speed of the particle.

### Mark Scheme / Solution
- (i)
- A diagram showing a fixed point O, a particle P, and a string of length $1.5$ m making an angle $\theta$ with the vertical. The particle P is moving in a horizontal circle below O. Forces acting on P are tension $T$ along the string towards O, and weight $mg$ acting vertically downwards.
- For resolving forces vertically: $T \cos\theta = mg$ [M1]
- $6 \cos\theta = 0.5 \times 10$ [A1]
- $\cos\theta = 5/6$, so $\theta = \arccos(5/6) = 33.557...^\circ = 33.6^\circ$ [A1]
-
- (ii)
- The radius of the circle is $r = 1.5 \sin\theta$. [B1]
- $r = 1.5 \sin(33.557...^\circ) = 0.829...$ m.
- For resolving forces horizontally: $T \sin\theta = mr\omega^2$ [M1]
- $6 \sin(33.557...^\circ) = 0.5 \times (0.829...) \omega^2$ [A1 ft]
- $3.3166... = 0.4145... \omega^2$
- $\omega^2 = 8.00...$, so $\omega = 2.828... = 2.83$ rad s$^{-1}$ [A1]

### Standard Solution Steps
- For part (i), identify the forces acting on the particle: the tension $T$ in the string and its weight $mg$. Since there is no vertical acceleration, resolve the forces vertically to find the equilibrium equation $T \cos\theta = mg$. Substitute the given values for $T$, $m$, and $g$ to solve for $\theta$.
- For part (ii), first calculate the radius $r$ of the horizontal circle using trigonometry: $r = l \sin\theta$. Then, apply Newton's second law in the horizontal direction. The net horizontal force provides the centripetal force. The equation is $T \sin\theta = ma_c$. Use the formula for centripetal acceleration in terms of angular speed, $a_c = r\omega^2$. Substitute the known values of $T$, $\theta$, $m$, and $r$ into the equation $T \sin\theta = mr\omega^2$ and solve for $\omega$.

### Common Mistakes
- Confusing sine and cosine when resolving forces. A clear force diagram helps prevent this.
- Using the length of the string $l$ instead of the radius of the circle $r$ in the centripetal force formula.
- Forgetting to include the mass in the centripetal force equation, e.g., writing $T \sin\theta = r\omega^2$.
- Calculation errors, such as using degrees in a calculator set to radians mode.
- Inconsistent use of values; using a rounded value for $\theta$ in the calculation for part (ii) can lead to accuracy errors. It is best to use the full calculator value.

### Tags
circular_motion, centripetal_force, conical_pendulum, horizontal_circle, newtons_laws, FM.3

## Circular Motion: Motion in a Vertical Circle

**Syllabus Reference**: 9231.FM.3
**Learning Objective**: Apply principles of circular motion and conservation of energy to find speeds, tensions, and conditions for completing vertical circles.

### Example Question
A small bead P of mass $m$ is projected with speed $u$ from the lowest point of a smooth vertical circular wire of radius $a$ and centre O.

(i) Find an expression for $v^2$, where $v$ is the speed of the bead, when OP makes an angle $\theta$ with the downward vertical.
(ii) Find the reaction force exerted by the wire on the bead at this position.
(iii) Hence, find the minimum value of $u$ for the bead to complete the circle.

### Mark Scheme / Solution
- (i)
- A diagram showing a vertical circle with centre O and radius $a$. A bead P is at a position where the radius OP makes an angle $\theta$ with the downward vertical.
- Use conservation of energy between the lowest point and position P.
- Initial Energy = $(1/2)mu^2$. Final Energy = $(1/2)mv^2 + mgh$. [M1]
- The height gained is $h = a - a\cos\theta$. [B1]
- $(1/2)mu^2 = (1/2)mv^2 + mg(a - a\cos\theta)$. [A1]
- $u^2 = v^2 + 2ag(1 - \cos\theta)$.
- $v^2 = u^2 - 2ag(1 - \cos\theta)$. [A1]
-
- (ii)
- Resolve forces radially towards the centre O: $R - mg\cos\theta = \frac{mv^2}{a}$. [M1]
- $R = mg\cos\theta + \frac{m}{a}(u^2 - 2ag(1 - \cos\theta))$. [M1]
- $R = mg\cos\theta + \frac{mu^2}{a} - 2mg + 2mg\cos\theta$.
- $R = \frac{mu^2}{a} - 2mg + 3mg\cos\theta$. [A1]
-
- (iii)
- For the bead to complete the circle, the reaction force $R$ must be non-negative at all points, so $R \ge 0$. [M1]
- The minimum value of $R$ occurs at the highest point of the circle, where $\theta = \pi$ (or $180^\circ$), so $\cos\theta = -1$.
- Substitute $\cos\theta = -1$ into the expression for $R$: $R_{top} = \frac{mu^2}{a} - 2mg - 3mg = \frac{mu^2}{a} - 5mg$. [A1]
- For the condition $R_{top} \ge 0$, we require $\frac{mu^2}{a} - 5mg \ge 0$.
- $u^2 \ge 5ag$.
- The minimum value of $u$ is $\sqrt{5ag}$. [A1]

### Standard Solution Steps
- For part (i), establish a zero level for potential energy, usually the lowest point of the circle. Apply the principle of conservation of mechanical energy between the lowest point (speed $u$, PE $0$) and a general point P (speed $v$, PE $mgh$). Express the height $h$ in terms of $a$ and $\theta$, then rearrange the energy equation to find $v^2$.
- For part (ii), draw a force diagram for the bead at point P. The forces are its weight $mg$, and the normal reaction $R$ from the wire. Resolve these forces along the radial direction, towards the centre O. Set the net radial force equal to the centripetal force, $\frac{mv^2}{a}$. Substitute the expression for $v^2$ from part (i) into this force equation and simplify to find $R$.
- For part (iii), identify that for the bead to remain in contact with the wire, the reaction force $R$ must be greater than or equal to zero. Determine where $R$ is at its minimum; this occurs where $\cos\theta$ is minimum, which is at the top of the circle ($\theta = \pi$). Set the expression for $R$ at this point to be greater than or equal to zero and solve for the minimum initial speed $u$.

### Common Mistakes
- Incorrectly calculating the change in vertical height, $h$. Common errors include using $a\sin\theta$ or $a\theta$.
- Sign errors in the radial force equation, for example writing $R + mg\cos\theta = \frac{mv^2}{a}$.
- Forgetting a term in the energy conservation equation, such as the initial kinetic energy or the final potential energy.
- Using the wrong condition to find the minimum speed. A frequent error is to assume the speed $v$ is zero at the top of the circle, which is incorrect. The correct condition for a particle on the inside of a surface (or on a string) is that the reaction force (or tension) must be non-negative.

### Tags
circular_motion, centripetal_force, vertical_circle, conservation_of_energy, minimum_speed, FM.3