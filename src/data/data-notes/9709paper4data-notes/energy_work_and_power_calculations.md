## Energy, Work and Power: The Work-Energy Principle

**Syllabus Reference**: 9709.P4.4.5
**Learning Objective**: Apply the work-energy principle to solve problems involving changes in energy for a particle moving under the action of various forces, including friction.

### Example Question
A box of mass $10$ kg is projected with a speed of $8$ m s$^{-1}$ up a line of greatest slope of a rough plane inclined at $30^\circ$ to the horizontal. The coefficient of friction between the box and the plane is $0.2$. The box moves up the plane until it comes to instantaneous rest. Use $g = 10$ m s$^{-2}$.

Find the distance the box travels up the plane.

### Mark Scheme / Solution
Resolve forces perpendicular to the plane to find the normal reaction, $R$.
$R - 10g \cos(30^\circ) = 0$
$R = 10 \times 10 \times \frac{\sqrt{3}}{2} = 50\sqrt{3}$ N. (B1)

Calculate the frictional force, $F_f$.
$F_f = \mu R = 0.2 \times 50\sqrt{3} = 10\sqrt{3}$ N. (M1)

Apply the Work-Energy Principle:
Initial Energy ($E_i$) = Final Energy ($E_f$) + Work Done against resistance.
Let the distance travelled up the plane be $d$ m.
The vertical height gained is $h = d \sin(30^\circ)$.

Initial Kinetic Energy ($KE_i$) = $\frac{1}{2}mv^2 = \frac{1}{2}(10)(8^2) = 320$ J.
Initial Potential Energy ($GPE_i$) = $0$ (taking start point as reference).
Final Kinetic Energy ($KE_f$) = $0$ (since it comes to rest).
Final Potential Energy ($GPE_f$) = $mgh = 10g(d \sin(30^\circ)) = 100(0.5d) = 50d$ J. (A1 for both KE and GPE changes)

Work done against friction ($WD_f$) = $F_f \times d = 10\sqrt{3}d$ J.

Setting up the work-energy equation:
$KE_i + GPE_i = KE_f + GPE_f + WD_f$ (M1 for correct structure of the equation)
$320 + 0 = 0 + 50d + 10\sqrt{3}d$ (A1)
$320 = d(50 + 10\sqrt{3})$
$d = \frac{320}{50 + 10\sqrt{3}} = \frac{320}{67.32...}$
$d = 4.753...$
The distance travelled is $4.75$ m (to 3 s.f.). (A1)

### Standard Solution Steps
- **Identify Energies:** Determine the initial and final kinetic energy (KE) and gravitational potential energy (GPE) of the object.
- **Calculate Work Done:** Identify all non-conservative forces (like friction or an external driving force) and calculate the work done by or against them. Work done is `Force × distance moved in the direction of the force`.
- **Resolve Forces:** If friction is present on an incline, you must first resolve forces perpendicular to the plane to find the normal reaction $R$ in order to calculate the frictional force $F_f = \mu R$.
- **Apply Principle:** Set up the work-energy equation: $E_{initial} + WD_{driving} = E_{final} + WD_{resistive}$. A common form is `Change in KE + Change in GPE = Work Done by Driving Force - Work Done against Friction`.
- **Solve:** Substitute the calculated values and solve for the unknown quantity.

### Common Mistakes
- **Sign Errors:** Confusing work done *by* a force with work done *against* a force. It's often safer to think of it as an energy balance: `Initial Energy = Final Energy + Energy Lost`.
- **GPE Calculation:** Using the distance along the slope ($d$) instead of the vertical height ($h = d\sin\theta$) when calculating the change in GPE.
- **Incorrect Work Done by Friction:** Forgetting that the work done against friction is $F_f \times d$, not just $F_f$.
- **Mixing Methods:** Trying to combine $F=ma$ with energy principles in a single equation, which can lead to confusion. Stick to one method.

### Tags
work_energy_principle, energy, inclined_plane, friction, kinetic_energy, potential_energy, calculation

## Energy, Work and Power: Conservation of Energy and Non-Conservative Forces

**Syllabus Reference**: 9709.P4.4.5
**Learning Objective**: Solve problems involving the conservation of energy in systems with and without resistive forces.

### Example Question
A ball of mass $0.5$ kg is released from rest at a height of $15$ m above the ground. It hits the ground with a speed of $16$ m s$^{-1}$.

(i) Calculate the loss in energy of the ball due to air resistance.
(ii) The ball rebounds to a height of $10$ m. Find the magnitude of the impulse exerted by the ground on the ball.

### Mark Scheme / Solution
(i)
Initial energy ($E_i$) at height $15$ m:
$GPE_i = mgh = 0.5 \times 10 \times 15 = 75$ J.
$KE_i = 0$ (released from rest).
So, $E_i = 75$ J. (B1)

Final energy ($E_f$) just before hitting the ground:
$GPE_f = 0$.
$KE_f = \frac{1}{2}mv^2 = \frac{1}{2}(0.5)(16^2) = 0.25 \times 256 = 64$ J.
So, $E_f = 64$ J. (M1)

Loss in energy = Work done by air resistance = $E_i - E_f$. (M1)
Loss = $75 - 64 = 11$ J. (A1)

(ii)
Speed just before impact, $v_{down} = 16$ m s$^{-1}$.
To find speed just after rebound ($v_{up}$), consider the upward motion from the ground to $10$ m. Assume energy is conserved on the way up (or that resistance is negligible for this part).
$\frac{1}{2}mv_{up}^2 = mgh_{rebound}$ (M1)
$\frac{1}{2}v_{up}^2 = 10 \times 10 = 100$
$v_{up}^2 = 200 \implies v_{up} = \sqrt{200} = 10\sqrt{2}$ m s$^{-1}$.

Impulse $I = \Delta p = m(v_{final} - v_{initial})$. Let the upward direction be positive.
$v_{final} = +10\sqrt{2}$
$v_{initial} = -16$
$I = 0.5(10\sqrt{2} - (-16))$ (M1 for correct impulse formula with sign consideration)
$I = 0.5(14.142... + 16) = 0.5(30.142...)$
$I = 15.07...$
The impulse is $15.1$ Ns (to 3 s.f.). (A1)

### Standard Solution Steps
- **Energy Loss:** Calculate the total mechanical energy (KE + GPE) at the start and at the end. The difference is the energy lost to non-conservative forces like air resistance or friction.
- **Impulse:** Recall that impulse is the change in momentum ($I = \Delta p = mv - mu$).
- **Define Direction:** For impulse calculations involving a bounce, it is critical to define a positive direction (e.g., upwards) and assign the correct signs to the velocities before and after impact.
- **Find Velocities:** Use energy principles or kinematics to find the velocities immediately before and after the collision.

### Common Mistakes
- **Assuming Energy Conservation:** In part (i), incorrectly equating initial GPE to final KE, ignoring the stated energy loss.
- **Impulse Sign Error:** Forgetting that velocity is a vector and failing to use opposite signs for the downward (pre-impact) and upward (post-impact) velocities. This is the most common error in bounce/impulse problems.
- **Mixing up Energy and Momentum:** Confusing the energy loss during the fall with the energy loss during the bounce on the ground. The impulse calculation only cares about the change in momentum across the impact itself.

### Tags
conservation_of_energy, energy_loss, air_resistance, work_done, impulse, momentum, calculation, multi_part

## Energy, Work and Power: Power and Rate of Work

**Syllabus Reference**: 9709.P4.4.5
**Learning Objective**: Use the concept of power as the rate at which a force does work, and apply the formula $P = Fv$.

### Example Question
A cyclist and their bicycle have a combined mass of $80$ kg. The cyclist moves along a straight horizontal road. There is a constant resistance to motion of $25$ N. Use $g = 10$ m s$^{-2}$.

(i) Find the power the cyclist must produce to maintain a constant speed of $10$ m s$^{-1}$.
(ii) The cyclist now produces a constant power of $450$ W. Find the acceleration of the cyclist at the instant their speed is $9$ m s$^{-1}$.

### Mark Scheme / Solution
(i)
To maintain a constant speed, the net force is zero.
Therefore, the driving force ($F_D$) produced by the cyclist must equal the resistance force ($R$).
$F_D = R = 25$ N. (M1)

Power is given by $P = F_D \times v$.
$P = 25 \times 10$ (M1)
$P = 250$ W. (A1)

(ii)
The cyclist is now producing a constant power of $P = 450$ W.
At the instant the speed is $v = 9$ m s$^{-1}$, the driving force ($F_{D,new}$) is given by:
$P = F_{D,new} \times v$
$450 = F_{D,new} \times 9$ (M1)
$F_{D,new} = \frac{450}{9} = 50$ N. (A1)

Now apply Newton's Second Law ($F_{net} = ma$) to find the acceleration.
The net force is the new driving force minus the constant resistance.
$F_{net} = F_{D,new} - R$
$F_{net} = 50 - 25 = 25$ N. (M1)

$F_{net} = ma$
$25 = 80a$
$a = \frac{25}{80} = \frac{5}{16} = 0.3125$
The acceleration is $0.313$ m s$^{-2}$ (to 3 s.f.). (A1)

### Standard Solution Steps
- **Constant Velocity:** Recognise that at constant velocity, acceleration is zero, so the driving force equals the total resistive forces. Use $P = Fv$ with this driving force.
- **Constant Power:** When power is constant, the driving force is *not* constant; it changes with speed ($F_D = P/v$).
- **Acceleration:** To find acceleration at a specific instant:
    1.  Use the given power and instantaneous speed to calculate the driving force at that moment ($F_D = P/v$).
    2.  Calculate the net force: $F_{net} = F_D - R$.
    3.  Apply Newton's Second Law: $F_{net} = ma$ to find the acceleration $a$.

### Common Mistakes
- **Confusing Forces:** Using the resistive force or net force in the power equation $P=Fv$. This formula specifically relates power to the *driving force* that produces it.
- **Assuming Constant Force:** In part (ii), incorrectly assuming the driving force is the same as in part (i), instead of recalculating it based on the new power and speed.
- **Applying $F=ma$ Incorrectly:** Using only the driving force in $F=ma$ and forgetting to subtract the resistance to find the *net* force.

### Tags
power, work, newtons_laws, dynamics, acceleration, driving_force, resistance, calculation, multi_part