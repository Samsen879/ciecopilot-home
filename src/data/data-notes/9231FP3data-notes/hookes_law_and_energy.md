## Hooke's Law and Energy

**Syllabus Reference**: 9231.FM.4
**Learning Objective**: Apply Hooke's law and the principles of work and energy to problems involving elastic strings and springs.

---

### Example Question 1
A particle of mass $0.8$ kg is suspended from a fixed point by a light elastic spring of natural length $1.2$ m and modulus of elasticity $24$ N.

(i) Find the extension of the spring when the particle hangs in equilibrium.
(ii) The particle is pulled vertically downwards a further $0.5$ m from the equilibrium position and released from rest. Find the speed of the particle when it is $0.3$ m below the equilibrium position.

#### Mark Scheme / Solution
- (i)
- For equilibrium, resolve forces vertically: $T = mg$. [M1]
- Using Hooke's Law, $T = \frac{\lambda e}{l}$: $\frac{24 e}{1.2} = 0.8 \times 10$. [A1]
- $20e = 8 \implies e = 0.4$ m. [A1]
-
- (ii)
- Apply the principle of conservation of energy between the release point (A) and the target point (B).
- At point A (release):
  - Extension $x_A = 0.4 + 0.5 = 0.9$ m.
  - Speed $v_A = 0$.
- At point B (target):
  - Extension $x_B = 0.4 + 0.3 = 0.7$ m.
- Energy conservation equation: $KE_A + GPE_A + EPE_A = KE_B + GPE_B + EPE_B$.
- Taking the equilibrium position as the zero level for GPE ($h=0$):
  - Loss in GPE = $mg(0.5 - 0.3) = 0.8 \times 10 \times 0.2 = 1.6$ J.
- Change in Energy: Loss in EPE + Loss in GPE = Gain in KE. [M1]
- $(\frac{\lambda x_A^2}{2l} - \frac{\lambda x_B^2}{2l}) + mg(h_A - h_B) = \frac{1}{2}mv_B^2$.
- $(\frac{24(0.9)^2}{2 \times 1.2} - \frac{24(0.7)^2}{2 \times 1.2}) + (1.6) = \frac{1}{2}(0.8)v_B^2$. [A1 for EPE terms, A1 for GPE/KE terms]
- $(10 \times 0.9^2 - 10 \times 0.7^2) + 1.6 = 0.4v_B^2$.
- $(8.1 - 4.9) + 1.6 = 0.4v_B^2$.
- $3.2 + 1.6 = 0.4v_B^2$.
- $4.8 = 0.4v_B^2$.
- $v_B^2 = 12$.
- $v_B = \sqrt{12} = 3.464... = 3.46$ m s$^{-1}$ (3 s.f.). [A1]

#### Standard Solution Steps
1.  **Part (i):** For equilibrium, the net force is zero. Set the upward tension ($T$) from the spring equal to the downward force of weight ($mg$). Substitute Hooke's Law, $T = \frac{\lambda e}{l}$, and solve for the equilibrium extension, $e$.
2.  **Part (ii):** Identify the two positions of interest: the release point and the target point. Apply the principle of conservation of mechanical energy. It is often simplest to formulate this as: Initial Energy = Final Energy.
3.  The total mechanical energy at any point is the sum of Kinetic Energy ($KE = \frac{1}{2}mv^2$), Gravitational Potential Energy ($GPE = mgh$), and Elastic Potential Energy ($EPE = \frac{\lambda x^2}{2l}$).
4.  Define a zero level for GPE (e.g., the equilibrium position). Calculate the heights and extensions at the initial and final points relative to this zero level and the natural length.
5.  Substitute all known values into the conservation of energy equation and solve for the unknown speed.

#### Common Mistakes
-   Confusing extension with the total length of the spring. The extension is the length *beyond* the natural length.
-   Errors in calculating GPE. A common mistake is using the extension instead of the vertical displacement for the height change. Defining a clear zero potential energy level helps avoid this.
-   In the energy equation, using the change in extension from equilibrium ($\Delta x$) instead of the absolute extension ($x$) in the EPE formula. $EPE$ depends on the total extension from the natural length.
-   Arithmetic errors, especially when squaring terms in the EPE calculation.

#### Tags
hookes_law, conservation_of_energy, elastic_potential_energy, spring, equilibrium, FM.4

---

### Example Question 2
A particle P of mass $2$ kg is attached to one end of a light elastic string of natural length $0.8$ m and modulus of elasticity $40$ N. The other end of the string is attached to a fixed point O on a rough horizontal plane. The coefficient of friction between the particle and the plane is $0.25$. The particle is held at O and projected horizontally with a speed of $3$ m s$^{-1}$ along the plane, moving away from O.

(i) Find the distance the particle travels before first coming to instantaneous rest.
(ii) Show that the particle does not remain at rest in this position.

#### Mark Scheme / Solution
- (i)
- The normal reaction is $R = mg = 2 \times 10 = 20$ N.
- The friction force is $F_f = \mu R = 0.25 \times 20 = 5$ N. [B1]
- Let the distance travelled be $d$ m. The particle comes to rest, so final KE is 0.
- The string only starts to stretch when $d > 0.8$ m. The extension is $x = d - 0.8$.
- Apply the Work-Energy Principle: Initial Energy = Final Energy + Work Done against Friction. [M1]
- $KE_{initial} = EPE_{final} + WD_{friction}$.
- $\frac{1}{2}(2)(3^2) = \frac{40(d-0.8)^2}{2 \times 0.8} + 5d$. [A1 for EPE, A1 for WD]
- $9 = 25(d-0.8)^2 + 5d$.
- $9 = 25(d^2 - 1.6d + 0.64) + 5d$.
- $9 = 25d^2 - 40d + 16 + 5d$.
- $25d^2 - 35d + 7 = 0$. [A1]
- Using the quadratic formula: $d = \frac{-(-35) \pm \sqrt{(-35)^2 - 4(25)(7)}}{2(25)} = \frac{35 \pm \sqrt{1225 - 700}}{50}$.
- $d = \frac{35 \pm \sqrt{525}}{50}$.
- $d = 1.158...$ or $d = 0.241...$
- Since the string must be stretched for EPE to exist, we require $d > 0.8$. Therefore, $d = 1.16$ m (3 s.f.). [A1]
-
- (ii)
- At the point of instantaneous rest, the extension is $x = 1.158... - 0.8 = 0.358...$ m.
- The tension in the string is $T = \frac{\lambda x}{l} = \frac{40(0.358...)}{0.8} = 17.91...$ N. [M1]
- The maximum available static friction (limiting friction) is $F_{max} = 5$ N.
- Since the tension ($17.9$ N) is greater than the limiting friction ($5$ N), the net force is non-zero. Thus the particle will not remain at rest and will accelerate back towards O. [A1]

#### Standard Solution Steps
1.  **Part (i):** Calculate the constant frictional force using $F_f = \mu mg$.
2.  Apply the work-energy principle. The initial energy is purely kinetic. This energy is converted into elastic potential energy stored in the string and work done against the opposing frictional force.
3.  Let the total distance travelled be $d$. The work done by friction is $F_f \times d$. The extension of the string is $x = d - l$.
4.  Form the energy equation: $KE_{initial} = EPE_{final} + WD_{friction}$. This will result in a quadratic equation for $d$.
5.  Solve the quadratic equation. Choose the physically valid solution (in this case, the one that implies the string has stretched, i.e., $d > l$).
6.  **Part (ii):** At the position of instantaneous rest, calculate the tension in the string using Hooke's Law with the extension found in part (i).
7.  Compare this tension force with the maximum available static friction force. If the tension exceeds the limiting friction, the particle will move.

#### Common Mistakes
-   Forgetting that the string is slack for the first $0.8$ m of motion, and thus EPE is only stored after that point.
-   Incorrectly setting up the work-energy equation. A common error is to subtract the work done from the wrong side or mix up initial and final states.
-   Algebraic errors when expanding and simplifying the quadratic equation.
-   Choosing the wrong root of the quadratic equation without physical justification.
-   In part (ii), comparing the tension to the particle's weight instead of the frictional force on a horizontal plane.

#### Tags
hookes_law, work_energy_principle, friction, elastic_string, quadratic_equation, FM.4

---

### Example Question 3
A light elastic string has a natural length of $1.5$ m and a modulus of elasticity of $60$ N. A particle P of mass $3$ kg is attached to one end of the string. The other end of the string is attached to a fixed point O on a ceiling. The particle is held at a point $0.5$ m vertically below O and released from rest.

(i) Show that the maximum extension, $x$ m, of the string satisfies the equation $20x^2 - 30x - 30 = 0$.
(ii) Find the maximum speed of P during its motion.

#### Mark Scheme / Solution
- (i)
- The particle is released from a point $0.5$ m below O. The natural length of the string is $1.5$ m.
- The particle falls a distance of $1.5 - 0.5 = 1.0$ m before the string becomes taut. [B1]
- Let the maximum extension be $x$. The total distance the particle falls from its release point to its lowest point is $(1.0 + x)$ m.
- Apply conservation of energy between the release point and the lowest point.
- Loss in GPE = Gain in EPE. [M1]
- $mg(1.0 + x) = \frac{\lambda x^2}{2l}$. [A1 for GPE term, A1 for EPE term]
- $3(10)(1 + x) = \frac{60 x^2}{2 \times 1.5}$.
- $30(1 + x) = \frac{60x^2}{3}$.
- $30 + 30x = 20x^2$.
- Therefore, $20x^2 - 30x - 30 = 0$. [A1 - shown]
-
- (ii)
- The maximum speed occurs when the acceleration is zero, which is at the equilibrium position.
- Find the extension at equilibrium, $e_{eq}$: $T = mg \implies \frac{60 e_{eq}}{1.5} = 3 \times 10$. [M1]
- $40 e_{eq} = 30 \implies e_{eq} = 0.75$ m.
- Apply conservation of energy between the release point and the equilibrium position to find $v_{max}$.
- Loss in GPE = Gain in KE + Gain in EPE. [M1]
- The particle falls a distance of $(1.0 + 0.75) = 1.75$ m from release to equilibrium.
- $mg(1.75) = \frac{1}{2}mv_{max}^2 + \frac{\lambda (0.75)^2}{2l}$. [A1]
- $3(10)(1.75) = \frac{1}{2}(3)v_{max}^2 + \frac{60(0.75)^2}{2 \times 1.5}$.
- $52.5 = 1.5 v_{max}^2 + 10(0.75)^2$.
- $52.5 = 1.5 v_{max}^2 + 5.625$.
- $46.875 = 1.5 v_{max}^2$.
- $v_{max}^2 = 31.25$.
- $v_{max} = \sqrt{31.25} = 5.590... = 5.59$ m s$^{-1}$ (3 s.f.). [A1]

#### Standard Solution Steps
1.  **Part (i):** First, determine the distance the particle falls before the string starts to stretch. This is the difference between the string's natural length and the initial drop from the attachment point.
2.  Apply the principle of conservation of energy between the initial release point and the lowest point (where speed is momentarily zero).
3.  The total loss in GPE from the start to the lowest point must equal the total EPE gained in the string at maximum extension. Formulate this equation and rearrange it into the required quadratic form.
4.  **Part (ii):** Recognise that maximum speed occurs at the point of zero acceleration, which is the static equilibrium position.
5.  First, calculate the extension ($e_{eq}$) at this equilibrium position by setting tension ($T$) equal to weight ($mg$).
6.  Apply conservation of energy again, this time between the release point and the equilibrium position. The loss in GPE is converted into both KE (which is now maximal) and EPE.
7.  Solve the resulting energy equation for the maximum speed.

#### Common Mistakes
-   **Part (i):** Incorrectly calculating the GPE loss. The height fallen is the *total* vertical displacement from the release point to the lowest point, not just the maximum extension $x$.
-   Setting up the energy equation between the point where the string becomes taut and the lowest point, but forgetting the particle already has KE at the taut point. It is safer to use the release point where KE is zero.
-   **Part (ii):** Assuming maximum speed occurs at the point of maximum extension or when GPE is lowest. Maximum speed occurs where the net force (and thus acceleration) is zero.
-   Using the maximum extension $x$ from part (i) in the energy calculation for part (ii), instead of the equilibrium extension $e_{eq}$.

#### Tags
hookes_law, conservation_of_energy, GPE, EPE, maximum_speed, equilibrium, show_that, FM.4