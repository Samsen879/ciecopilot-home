## A2 Level Topic 17: Oscillations

**Syllabus Reference**: 9702.17
**Learning Objective**: Describe the interchange between kinetic and potential energy during simple harmonic motion.

### Example Question
A small block of mass $m = 250$ g is attached to a horizontal spring of spring constant $k = 40.0$ N m$^{-1}$. The block is pulled a distance of $6.0$ cm from its equilibrium position on a frictionless surface and released from rest at time $t = 0$.

(a) Define *simple harmonic motion*.

(b) For the motion of the block, determine:
    (i) the angular frequency, $\omega$.
    (ii) the maximum speed, $v_{max}$, of the block.
    (iii) the total energy, $E_{T}$, of the oscillating system.
    (iv) the speed of the block when its displacement is $3.0$ cm from the equilibrium position.

### Mark Scheme / Solution
**(a) Definition**
- The acceleration of the object is directly proportional to its displacement from a fixed point (the equilibrium position). **[1]**
- The acceleration is always directed towards that fixed point (i.e., in the opposite direction to the displacement). **[1]**
- *Alternatively, accept the defining equation $a = -\omega^2 x$ with all terms defined.*

**(b) Calculations**
**(i) Angular frequency, $\omega$**
- Recall the formula for a mass-spring system: $\omega = \sqrt{\frac{k}{m}}$ **[C1]**
- Substitute values, ensuring mass is in kg: $\omega = \sqrt{\frac{40.0}{0.250}}$ **[M1]**
- $\omega = \sqrt{160} = 12.649$ rad s$^{-1}$
- **$\omega = 12.6$ rad s$^{-1}$** (to 3 s.f.) **[A1]**

**(ii) Maximum speed, $v_{max}$**
- Recall the formula for maximum speed: $v_{max} = \omega x_0$ **[C1]**
- Substitute values, ensuring displacement is in meters: $v_{max} = 12.649 \times 0.060$ **[M1]**
- $v_{max} = 0.75894$ m s$^{-1}$
- **$v_{max} = 0.759$ m s$^{-1}$** (to 3 s.f.) **[A1]**

**(iii) Total energy, $E_{T}$**
- Total energy is equal to the maximum potential energy or maximum kinetic energy.
- Using $E_T = \frac{1}{2} k x_0^2$ (or $E_T = \frac{1}{2} m v_{max}^2$) **[C1]**
- $E_T = \frac{1}{2} \times 40.0 \times (0.060)^2$ **[M1]**
- $E_T = 20.0 \times 0.0036 = 0.072$ J
- **$E_T = 0.072$ J** **[A1]**

**(iv) Speed at $x = 3.0$ cm**
- Recall the formula for speed at a given displacement: $v = \omega \sqrt{x_0^2 - x^2}$ **[C1]**
- Substitute values: $v = 12.649 \sqrt{(0.060)^2 - (0.030)^2}$ **[M1]**
- $v = 12.649 \sqrt{0.0036 - 0.0009} = 12.649 \sqrt{0.0027}$
- $v = 12.649 \times 0.05196 = 0.6572$ m s$^{-1}$
- **$v = 0.657$ m s$^{-1}$** (to 3 s.f.) **[A1]**
- *Alternative method using energy conservation:*
- *$\frac{1}{2} m v^2 + \frac{1}{2} k x^2 = E_T$ **[C1]***
- *$\frac{1}{2} (0.250) v^2 + \frac{1}{2} (40.0) (0.030)^2 = 0.072$ **[M1]***
- *$0.125 v^2 + 0.018 = 0.072 \implies 0.125 v^2 = 0.054 \implies v^2 = 0.432 \implies v = 0.657$ m s$^{-1}$ **[A1]***

### Standard Solution Steps
- List given quantities in SI units
- Select the appropriate SHM formula for the target quantity
- Compute angular frequency $\omega$ when needed
- Use $v_{max}=\omega x_0$ and $E_T=\tfrac{1}{2}kx_0^2$ (or $\tfrac{1}{2}mv_{max}^2$)
- For speed at displacement $x$, use $v=\omega\sqrt{x_0^2-x^2}$; for acceleration use $a=-\omega^2 x$
- Check significant figures and units

### Common Mistakes
- **Unit Conversion Errors**: Forgetting to convert mass from grams to kilograms or displacement/amplitude from centimeters to meters before calculation.
- **Frequency Confusion**: Using frequency $f$ (in Hz) instead of angular frequency $\omega$ (in rad s$^{-1}$) in SHM equations, or vice versa. Remember $\omega = 2\pi f$.
- **Energy Calculation**: Calculating only the potential energy at a given point instead of the total energy of the system when asked. The total energy remains constant.
- **Calculator Mode**: Having the calculator in degrees mode when using equations involving $\omega t$ (e.g., $x = x_0 \sin(\omega t)$), which requires radians.
- **Sign Errors**: Forgetting the negative sign in the defining equation for acceleration ($a = -\omega^2 x$), which indicates that acceleration is a restoring force.

### Tags
oscillations, simple_harmonic_motion, energy_in_shm, mass_spring_system, kinematics_of_shm, 17