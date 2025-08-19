## Gravitational fields: Geostationary Orbits

**Syllabus Reference**: 9702.13
**Learning Objective**: Analyse the motion of a satellite in a circular orbit, including geostationary orbits.

### Example Question
A satellite of mass 850 kg is to be placed in a geostationary orbit around the Earth. The mass of the Earth is $5.97 \times 10^{24}$ kg and its mean radius is $6.37 \times 10^6$ m. The universal gravitational constant $G$ is $6.67 \times 10^{-11}$ N m² kg⁻².

(a) State two features of a geostationary orbit.
(b) Show that the radius of the geostationary orbit is $4.22 \times 10^7$ m.
(c) Calculate the gravitational potential energy of the satellite when it is in this orbit.

### Mark Scheme / Solution
(a)
- 1. The satellite orbits directly above the Earth's equator.
- 2. The period of the orbit is 24 hours (or 86400 s), the same as the Earth's rotational period.
- 3. The satellite travels in the same direction as the Earth's rotation (west to east). [B2 for any two]

(b)
- The gravitational force provides the centripetal force. [M1]
- $\frac{GMm}{r^2} = m\omega^2r$
- $\frac{GM}{r^2} = (\frac{2\pi}{T})^2 r$ [C1]
- Rearrange for r: $r^3 = \frac{GMT^2}{4\pi^2}$.
- The period T must be in seconds: $T = 24 \times 60 \times 60 = 86400$ s. [C1]
- $r^3 = \frac{(6.67 \times 10^{-11}) \times (5.97 \times 10^{24}) \times (86400)^2}{4\pi^2}$
- $r^3 = \frac{2.97 \times 10^{24}}{39.48} = 7.53 \times 10^{22}$ m³. [M1]
- $r = \sqrt[3]{7.53 \times 10^{22}} = 4.223 \times 10^7$ m.
- $r \approx 4.22 \times 10^7$ m. [A1]

(c)
- Gravitational potential energy $\Phi = -\frac{GMm}{r}$. [M1]
- $\Phi = -\frac{(6.67 \times 10^{-11}) \times (5.97 \times 10^{24}) \times 850}{4.22 \times 10^7}$. [C1]
- $\Phi = -8.02 \times 10^9$ J. [A1]

### Standard Solution Steps
- For orbital motion, always start by equating the gravitational force to the required centripetal force ($F_g = F_c$).
- Express the centripetal force in terms of angular speed ($m\omega^2r$) as the period ($T$) is usually known.
- Relate angular speed to period using $\omega = 2\pi/T$.
- Ensure the period $T$ is converted to seconds.
- Substitute the expressions into the force equation and solve for the unknown variable (e.g., radius $r$).
- Use the formula $\Phi = -GMm/r$ for gravitational potential energy, remembering the negative sign.

### Common Mistakes
- Using the period in hours instead of seconds.
- Confusing the radius of the orbit ($r$) with the height above the Earth's surface ($h$). Remember $r = R_{Earth} + h$.
- Using $g = 9.81$ m s⁻² in orbital calculations; this value is only valid on the surface of the Earth. The acceleration of free fall decreases with altitude.
- Forgetting the negative sign for gravitational potential energy.

### Tags
gravitational_fields, geostationary_orbit, centripetal_force, gravitational_potential

## Temperature: Specific Heat Capacity

**Syllabus Reference**: 9702.14
**Learning Objective**: Define and use specific heat capacity.

### Example Question
An electrical heater, rated at 50 W, is used to heat a 0.80 kg block of a metal. The heater is switched on for 4.0 minutes and the temperature of the block increases from 20.0 °C to 55.0 °C.

(a) Define specific heat capacity.
(b) Calculate the energy supplied by the heater.
(c) Assuming all the energy from the heater is transferred to the block, calculate the specific heat capacity of the metal.
(d) In reality, the value calculated in (c) would be an overestimate. Explain why.

### Mark Scheme / Solution
(a)
- Specific heat capacity is the thermal energy required to raise the temperature of a unit mass (1 kg) of a substance by one degree (1 K or 1 °C), without a change of state. [B1]

(b)
- Energy supplied = Power × time. [M1]
- Time in seconds = $4.0 \times 60 = 240$ s. [C1]
- Energy = $50 \times 240 = 12000$ J. [A1]

(c)
- Thermal energy absorbed $Q = mc\Delta\theta$. We assume $Q$ is equal to energy supplied. [M1]
- Change in temperature $\Delta\theta = 55.0 - 20.0 = 35.0$ °C. [C1]
- $12000 = 0.80 \times c \times 35.0$.
- $c = \frac{12000}{0.80 \times 35.0} = \frac{12000}{28} = 428.6$ J kg⁻¹ K⁻¹.
- $c = 430$ J kg⁻¹ K⁻¹ (to 2 s.f.). [A1]

(d)
- In a real experiment, some thermal energy would be lost from the block to the surroundings. [B1]
- Therefore, the actual energy absorbed by the block is less than the 12000 J supplied. Since $c$ is calculated using $c = Q_{supplied}/(m\Delta\theta)$, using the larger supplied energy value in the numerator results in a calculated value of $c$ that is higher than the true value. [B1]

### Standard Solution Steps
- Calculate the electrical energy supplied using $E = P \times t$. Ensure time is in seconds.
- Calculate the change in temperature, $\Delta\theta$. Remember that a change in Celsius is the same as a change in Kelvin.
- Use the formula for thermal energy absorbed, $Q = mc\Delta\theta$.
- In a closed system, set the energy supplied equal to the energy absorbed and solve for the unknown quantity.
- When considering experimental reality, account for heat loss to the surroundings, which means energy supplied > energy absorbed.

### Common Mistakes
- Using time in minutes instead of seconds in the power equation.
- Forgetting to calculate the *change* in temperature and using just the initial or final temperature.
- In questions involving heat loss, getting the logic reversed when explaining why a calculated value is an over- or under-estimate.

### Tags
temperature, specific_heat_capacity, thermal_energy, power, 14

## Ideal gases: Gas Laws and Kinetic Theory

**Syllabus Reference**: 9702.15
**Learning Objective**: Use the ideal gas equation $pV = nRT$ and the relation $p = \frac{1}{3}\frac{Nm}{V}\langle c^2 \rangle$.

### Example Question
A cylinder contains 0.050 m³ of helium gas at a pressure of $2.0 \times 10^5$ Pa and a temperature of 27 °C. The molar mass of helium is $4.0$ g mol⁻¹. Assume helium behaves as an ideal gas.
($R = 8.31$ J K⁻¹ mol⁻¹, $N_A = 6.02 \times 10^{23}$ mol⁻¹)

(a) Calculate the number of moles of helium gas in the cylinder.
(b) Calculate the mass of a single helium atom.
(c) Using the kinetic theory equation $p = \frac{1}{3}\frac{Nm}{V}\langle c^2 \rangle$, calculate the root-mean-square (r.m.s.) speed of the helium atoms.

### Mark Scheme / Solution
(a)
- Convert temperature to Kelvin: $T = 27 + 273 = 300$ K. [C1]
- Use the ideal gas equation $pV = nRT$. [M1]
- $n = \frac{pV}{RT} = \frac{(2.0 \times 10^5) \times 0.050}{8.31 \times 300}$. [C1]
- $n = \frac{10000}{2493} = 4.01$ mol. [A1]

(b)
- Mass of one mole is 4.0 g = $0.0040$ kg. [C1]
- One mole contains $N_A$ atoms.
- Mass of one atom $m = \frac{\text{Molar Mass}}{N_A} = \frac{0.0040}{6.02 \times 10^{23}}$. [M1]
- $m = 6.64 \times 10^{-27}$ kg. [A1]

(c)
- Rearrange the kinetic theory equation for $\langle c^2 \rangle$: $\langle c^2 \rangle = \frac{3pV}{Nm}$. [M1]
- $N$ is the total number of atoms: $N = n \times N_A = 4.01 \times (6.02 \times 10^{23}) = 2.41 \times 10^{24}$. [C1]
- $\langle c^2 \rangle = \frac{3 \times (2.0 \times 10^5) \times 0.050}{(2.41 \times 10^{24}) \times (6.64 \times 10^{-27})} = \frac{30000}{1.60}$.
- $\langle c^2 \rangle = 1.875 \times 10^6$ m² s⁻². [C1]
- r.m.s. speed $c_{rms} = \sqrt{\langle c^2 \rangle} = \sqrt{1.875 \times 10^6} = 1369$ m s⁻¹.
- $c_{rms} = 1400$ m s⁻¹. [A1]

### Standard Solution Steps
- Always convert temperature to Kelvin for ideal gas calculations.
- Use $pV=nRT$ to relate the macroscopic properties of the gas.
- To find the mass of one atom, divide the molar mass (in kg) by Avogadro's constant.
- The kinetic theory equation relates macroscopic pressure and volume to the microscopic properties of the atoms (number, mass, and speed).
- Remember that $\langle c^2 \rangle$ is the mean-square speed, and the r.m.s. speed is its square root.

### Common Mistakes
- Using temperature in degrees Celsius instead of Kelvin.
- Confusing the number of moles ($n$) with the number of molecules ($N$).
- Confusing the universal gas constant ($R$) with the Boltzmann constant ($k$).
- Forgetting to take the square root to find the r.m.s. speed from the mean-square speed.
- Using molar mass in grams instead of kilograms when calculating the mass of an atom.

### Tags
ideal_gases, kinetic_theory, rms_speed, ideal_gas_law, 15

## Thermodynamics: First Law

**Syllabus Reference**: 9702.16
**Learning Objective**: Apply the first law of thermodynamics to a number of situations.

### Example Question
An ideal gas is enclosed in a cylinder by a frictionless piston. The gas initially has a volume of $3.0 \times 10^{-4}$ m³ at a pressure of $1.5 \times 10^5$ Pa. The gas is heated, and it expands at a constant pressure to a final volume of $7.5 \times 10^{-4}$ m³. During the expansion, $150$ J of thermal energy is supplied to the gas.

(a) State the first law of thermodynamics in terms of the increase in internal energy $\Delta U$, the heat supplied to the system $Q$, and the work done on the system $W$.
(b) Calculate the work done by the gas during the expansion.
(c) Use your answer in (b) to state the work done *on* the gas.
(d) Calculate the increase in the internal energy of the gas.

### Mark Scheme / Solution
(a)
- $\Delta U = Q + W$. [B1]
- Where $\Delta U$ is the increase in internal energy of the system, $Q$ is the thermal energy supplied to the system, and $W$ is the work done on the system. [B1]

(b)
- For expansion at constant pressure, work done by gas = $p\Delta V$. [M1]
- $\Delta V = (7.5 \times 10^{-4}) - (3.0 \times 10^{-4}) = 4.5 \times 10^{-4}$ m³. [C1]
- Work done by gas = $(1.5 \times 10^5) \times (4.5 \times 10^{-4}) = 67.5$ J. [A1]

(c)
- Work done *on* the gas is the negative of the work done *by* the gas. [M1]
- $W = -67.5$ J. [A1]

(d)
- Using the first law of thermodynamics: $\Delta U = Q + W$. [M1]
- $Q = +150$ J (heat is supplied).
- $W = -67.5$ J.
- $\Delta U = 150 + (-67.5) = 82.5$ J.
- $\Delta U = 83$ J. [A1]

### Standard Solution Steps
- Clearly state the first law of thermodynamics and the sign convention being used ($W$ as work done ON the system).
- Calculate the work done. For a constant pressure process, use $W_{by} = p\Delta V$.
- Determine the sign of $W$ (work done on the system). If the gas expands, it does work on the surroundings, so the work done *on* it is negative.
- Determine the sign of $Q$. If heat is supplied *to* the system, $Q$ is positive.
- Substitute the values of $Q$ and $W$ into the first law equation to find the change in internal energy $\Delta U$.

### Common Mistakes
- **Sign convention for work done.** This is the most common error. The CAIE syllabus defines $W$ as work done *on* the system. Expansion means $W$ is negative. Compression means $W$ is positive.
- Confusing work done *by* the gas with work done *on* the gas.
- Errors in calculating the change in volume $\Delta V$.
- Applying $W=p\Delta V$ to situations where pressure is not constant.

### Tags
thermodynamics, first_law, internal_energy, work_done, 16

## Oscillations: Simple Harmonic Motion and Energy

**Syllabus Reference**: 9702.17
**Learning Objective**: Use the defining equation for SHM, $a = -\omega^2 x$, and analyse energy changes in SHM.

### Example Question
A small block of mass 250 g is attached to a horizontal spring of spring constant $k=40$ N m⁻¹. The block rests on a frictionless surface. The block is pulled 5.0 cm from its equilibrium position and released, undergoing simple harmonic motion (SHM).

(a) Show that the angular frequency $\omega$ of the oscillations is 12.6 rad s⁻¹.
(b) Calculate the maximum speed of the block.
(c) Calculate the total energy of the oscillating system.
(d) Determine the speed of the block when it is 2.0 cm from the equilibrium position.

### Mark Scheme / Solution
(a)
- For a mass-spring system, $\omega^2 = k/m$. [M1]
- Mass $m = 250$ g $= 0.250$ kg.
- $\omega^2 = \frac{40}{0.250} = 160$. [C1]
- $\omega = \sqrt{160} = 12.649$ rad s⁻¹.
- $\omega \approx 12.6$ rad s⁻¹. [A1]

(b)
- Maximum speed $v_{max} = A\omega$ or $v_{max} = x_0 \omega$. [M1]
- Amplitude $A = 5.0$ cm $= 0.050$ m. [C1]
- $v_{max} = 0.050 \times 12.649 = 0.632$ m s⁻¹.
- $v_{max} = 0.63$ m s⁻¹. [A1]

(c)
- Total energy $E = \frac{1}{2}m v_{max}^2$ or $E = \frac{1}{2} k A^2$. [M1]
- Using $E = \frac{1}{2} k A^2$:
- $E = \frac{1}{2} \times 40 \times (0.050)^2 = 20 \times 0.0025 = 0.050$ J. [A1]

(d)
- By conservation of energy: Total Energy = Kinetic Energy + Potential Energy.
- $E = \frac{1}{2}mv^2 + \frac{1}{2}kx^2$. [M1]
- $0.050 = \frac{1}{2}(0.250)v^2 + \frac{1}{2}(40)(0.020)^2$. [C1]
- $0.050 = 0.125v^2 + 20(0.0004) = 0.125v^2 + 0.008$.
- $0.125v^2 = 0.050 - 0.008 = 0.042$.
- $v^2 = \frac{0.042}{0.125} = 0.336$.
- $v = \sqrt{0.336} = 0.580$ m s⁻¹.
- $v = 0.58$ m s⁻¹. [A1]
- Alternative using $v = \pm \omega \sqrt{A^2-x^2}$:
- $v = 12.6 \sqrt{0.050^2 - 0.020^2} = 12.6 \sqrt{0.0021} = 12.6 \times 0.0458 = 0.577$ m s⁻¹. [A1]

### Standard Solution Steps
- Ensure all units are SI units (kg, m, s).
- Calculate the angular frequency $\omega$ using the appropriate formula for the system (e.g., $\omega^2=k/m$ for a spring).
- Use the standard SHM equations ($v_{max}=A\omega$, $a_{max}=A\omega^2$) to find maximum values.
- Calculate total energy using the formula involving maximum speed or amplitude.
- To find velocity at a specific displacement, use conservation of energy or the formula $v = \pm \omega \sqrt{A^2-x^2}$.

### Common Mistakes
- Using mass in grams or amplitude/displacement in cm without converting to SI units.
- Confusing angular frequency $\omega$ (in rad s⁻¹) with frequency $f$ (in Hz).
- Errors in the energy conservation equation, e.g., forgetting the $\frac{1}{2}$ or mixing up KE and PE terms.
- Forgetting to square terms like amplitude or omega in energy calculations.

### Tags
oscillations, simple_harmonic_motion, shm, energy_in_shm, mass_spring_system, 17

## Electric fields: Charged Particles in Uniform Fields

**Syllabus Reference**: 9702.18
**Learning Objective**: Describe the motion of a beam of charged particles in a uniform electric field.

### Example Question
An electron is fired horizontally with a speed of $2.5 \times 10^7$ m s⁻¹ into a uniform electric field. The field is created by two parallel plates of length 8.0 cm, separated by 2.0 cm. A potential difference of 500 V is applied across the plates.
(Charge of an electron $e = 1.60 \times 10^{-19}$ C, mass of an electron $m_e = 9.11 \times 10^{-31}$ kg).

(a) Calculate the magnitude of the electric field strength between the plates.
(b) Calculate the vertical acceleration of the electron in the field.
(c) The electron enters the field at the midpoint between the plates. Calculate the magnitude of the vertical deflection of the electron as it emerges from the field.

### Mark Scheme / Solution
(a)
- For a uniform field between parallel plates, $E = V/d$. [M1]
- $d = 2.0$ cm $= 0.020$ m.
- $E = \frac{500}{0.020} = 25000$ V m⁻¹ (or N C⁻¹). [A1]

(b)
- Force on electron $F = eE$. [M1]
- $F = (1.60 \times 10^{-19}) \times 25000 = 4.0 \times 10^{-15}$ N.
- Using Newton's second law, $F=ma$, so $a = F/m_e$. [C1]
- $a = \frac{4.0 \times 10^{-15}}{9.11 \times 10^{-31}} = 4.39 \times 10^{15}$ m s⁻². [A1]

(c)
- This is analogous to projectile motion.
- First, find the time spent in the field. The horizontal velocity is constant.
- Time $t = \frac{\text{horizontal distance}}{\text{horizontal speed}} = \frac{L}{v_x}$. [M1]
- $L = 8.0$ cm $= 0.080$ m.
- $t = \frac{0.080}{2.5 \times 10^7} = 3.2 \times 10^{-9}$ s. [C1]
- Now consider vertical motion. Initial vertical velocity $u_y = 0$.
- Vertical deflection $s_y = u_y t + \frac{1}{2} a_y t^2$. [M1]
- $s_y = 0 + \frac{1}{2} \times (4.39 \times 10^{15}) \times (3.2 \times 10^{-9})^2$.
- $s_y = \frac{1}{2} \times (4.39 \times 10^{15}) \times (1.024 \times 10^{-17}) = 0.0225$ m.
- Deflection = $0.0225$ m = $2.25$ cm. [A1]
- (The electron hits the plate since deflection > 1.0 cm. The question is valid, the result is just large).

### Standard Solution Steps
- Treat the motion in two independent perpendicular directions: horizontal and vertical.
- Horizontal motion: Constant velocity (no force in this direction).
- Vertical motion: Constant acceleration (due to the uniform electric field).
- Calculate the electric field strength ($E=V/d$) and the electric force ($F=qE$).
- Use $F=ma$ to find the vertical acceleration.
- Use the horizontal motion to find the time the particle spends in the field ($t = L/v_x$).
- Use the vertical motion equations of kinematics (suvat) with the calculated time and acceleration to find the vertical displacement (deflection).

### Common Mistakes
- Using the wrong distance in $E=V/d$ (using plate length instead of plate separation).
- Forgetting that the horizontal velocity remains constant throughout the motion.
- Applying a force or acceleration in the horizontal direction.
- Errors in using the equations of motion (suvat).

### Tags
electric_fields, projectile_motion, uniform_field, charged_particles, 18

## Capacitance: Resistor-Capacitor (RC) Discharge Circuits

**Syllabus Reference**: 9702.19
**Learning Objective**: Analyse the discharge of a capacitor through a resistor.

### Example Question
A 4700 μF capacitor is charged to a potential difference of 12 V. It is then discharged through a 2.5 kΩ resistor.

(a) Define capacitance.
(b) Calculate the initial energy stored in the capacitor.
(c) Calculate the time constant of the discharge circuit.
(d) Calculate the potential difference across the capacitor after 15 s of discharging.

### Mark Scheme / Solution
(a)
- Capacitance is the ratio of the charge stored on a conductor to the potential difference between the conductors. ($C=Q/V$). [B1]

(b)
- Energy stored $E = \frac{1}{2}CV^2$. [M1]
- $C = 4700$ μF $= 4700 \times 10^{-6}$ F.
- $E = \frac{1}{2} \times (4700 \times 10^{-6}) \times (12)^2 = \frac{1}{2} \times (4.7 \times 10^{-3}) \times 144$. [C1]
- $E = 0.338$ J. [A1]

(c)
- Time constant $\tau = RC$. [M1]
- $R = 2.5$ kΩ $= 2500$ Ω.
- $\tau = 2500 \times (4700 \times 10^{-6}) = 11.75$ s. [A1]
- $\tau = 12$ s.

(d)
- Use the discharge equation $V = V_0 e^{-t/\tau}$. [M1]
- $V_0 = 12$ V, $t = 15$ s, $\tau = 11.75$ s.
- $V = 12 \times e^{-15 / 11.75} = 12 \times e^{-1.276}$. [C1]
- $V = 12 \times 0.279 = 3.35$ V.
- $V = 3.4$ V. [A1]

### Standard Solution Steps
- Ensure all values are in SI units (F for capacitance, Ω for resistance).
- Use the appropriate formula for energy stored ($E=\frac{1}{2}CV^2$ or $E=\frac{1}{2}QV$ or $E=\frac{Q^2}{2C}$).
- Calculate the time constant using $\tau = RC$.
- Use the exponential decay equations for discharge: $V = V_0 e^{-t/\tau}$, $I = I_0 e^{-t/\tau}$, or $Q = Q_0 e^{-t/\tau}$.
- Substitute the known values and solve for the unknown, being careful with the exponential function.

### Common Mistakes
- Unit conversion errors, especially for μF and kΩ.
- Using the charging equation ($V = V_0(1-e^{-t/\tau})$) for a discharging problem.
- Errors in calculating the time constant.
- Mathematical errors when evaluating the exponential term, especially with calculators.

### Tags
capacitance, capacitor_discharge, time_constant, stored_energy, 19

## Magnetic fields: Motion of Charged Particles

**Syllabus Reference**: 9702.20
**Learning Objective**: Analyse the motion of a charged particle in a uniform magnetic field.

### Example Question
A proton (mass $1.67 \times 10^{-27}$ kg, charge $+1.60 \times 10^{-19}$ C) enters a region of uniform magnetic field of flux density 0.50 T. The velocity of the proton is $4.0 \times 10^6$ m s⁻¹ and is perpendicular to the magnetic field.

(a) State the shape of the path of the proton in the magnetic field and explain why it takes this path.
(b) Calculate the magnitude of the magnetic force acting on the proton.
(c) Calculate the radius of the circular path of the proton.
(d) An electron enters the same field with the same velocity. State two ways its path would differ from the proton's path.

### Mark Scheme / Solution
(a)
- **Shape**: The path is a circle (or arc of a circle). [B1]
- **Explanation**: The magnetic force is always perpendicular to the velocity of the proton. A force that is always perpendicular to velocity provides a centripetal force, causing circular motion. [B1]

(b)
- Magnetic force $F = Bqv$. [M1]
- $F = 0.50 \times (1.60 \times 10^{-19}) \times (4.0 \times 10^6)$. [C1]
- $F = 3.2 \times 10^{-13}$ N. [A1]

(c)
- The magnetic force provides the centripetal force. [M1]
- $Bqv = \frac{mv^2}{r}$. [C1]
- Rearrange for radius $r = \frac{mv}{Bq}$.
- $r = \frac{(1.67 \times 10^{-27}) \times (4.0 \times 10^6)}{0.50 \times (1.60 \times 10^{-19})}$. [M1]
- $r = \frac{6.68 \times 10^{-21}}{8.0 \times 10^{-20}} = 0.0835$ m.
- $r = 8.4$ cm. [A1]

(d)
- 1. The path would curve in the opposite direction (e.g., anti-clockwise instead of clockwise) because the electron has a negative charge. [B1]
- 2. The radius of the path would be much smaller because the electron has a much smaller mass. [B1]

### Standard Solution Steps
- Recognise that a charged particle moving perpendicular to a uniform B-field experiences a force given by $F=Bqv$.
- Understand that this force is always perpendicular to velocity, thus acting as a centripetal force.
- Equate the magnetic force to the centripetal force: $Bqv = mv^2/r$.
- Solve this equation for the required quantity (e.g., radius $r$).
- Use Fleming's Left-Hand Rule to determine the direction of the force and hence the curvature of the path.

### Common Mistakes
- Using the wrong formula for force (e.g., $F=BIL$ for a wire).
- Forgetting to equate the magnetic force to the centripetal force.
- Algebraic errors when rearranging the equation to solve for the radius.
- Confusing the properties of a proton and an electron (charge sign and mass).

### Tags
magnetic_fields, force_on_charge, circular_motion, centripetal_force, 20

## Alternating currents: R.M.S. Values and Power

**Syllabus Reference**: 9702.21
**Learning Objective**: Understand and use the terms peak value, root-mean-square (r.m.s.) value and mean power in the context of alternating currents.

### Example Question
A sinusoidal alternating voltage supply has a peak value of 325 V and a frequency of 50 Hz. It is connected to a resistive heater with a resistance of 120 Ω.

(a) Define the root-mean-square (r.m.s.) value of an alternating current.
(b) Calculate the r.m.s. voltage of the supply.
(c) Calculate the r.m.s. current in the heater.
(d) Calculate the mean power dissipated by the heater.

### Mark Scheme / Solution
(a)
- The r.m.s. value of an alternating current is the value of the direct current that would dissipate thermal energy at the same rate in a given resistor. [B1]

(b)
- $V_{rms} = \frac{V_0}{\sqrt{2}}$, where $V_0$ is the peak voltage. [M1]
- $V_{rms} = \frac{325}{\sqrt{2}} = 229.8$ V.
- $V_{rms} = 230$ V. [A1]

(c)
- Use Ohm's Law with r.m.s. values: $I_{rms} = \frac{V_{rms}}{R}$. [M1]
- $I_{rms} = \frac{229.8}{120} = 1.915$ A.
- $I_{rms} = 1.9$ A. [A1]

(d)
- Mean power $P = V_{rms} \times I_{rms}$. [M1]
- $P = 229.8 \times 1.915 = 440$ W. [A1]
- Alternative 1: $P = I_{rms}^2 R = (1.915)^2 \times 120 = 3.667 \times 120 = 440$ W.
- Alternative 2: $P = \frac{V_{rms}^2}{R} = \frac{(229.8)^2}{120} = \frac{52808}{120} = 440$ W.

### Standard Solution Steps
- Remember the relationship between peak and r.m.s. values: $V_{rms} = V_0/\sqrt{2}$ and $I_{rms} = I_0/\sqrt{2}$.
- Apply Ohm's law ($V=IR$) using consistent values (either both peak or both r.m.s.). It is standard to work with r.m.s. values.
- Calculate the mean (average) power using any of the standard power formulae ($P=VI, P=I^2R, P=V^2/R$), but *always* use r.m.s. values for V and I.

### Common Mistakes
- Using peak values to calculate mean power. This gives a value that is twice the correct mean power ($P_{peak} = V_0 I_0 = 2 \times P_{mean}$).
- Confusing peak voltage with r.m.s. voltage. In many countries, the stated mains voltage (e.g., 230 V) is the r.m.s. value.
- Errors in applying Ohm's law or the power formulas.

### Tags
alternating_current, ac, rms, peak_value, mean_power, 21

## Quantum physics: Line Spectra and Photons

**Syllabus Reference**: 9702.22
**Learning Objective**: Explain the origin of the emission and absorption line spectra. Use the relation for the energy of a photon, $E=hf$.

### Example Question
The diagram shows some of the energy levels of an isolated hydrogen atom.

- - - - - - - - - - - 0 eV
- - - - - - - - - - - -1.51 eV
- - - - - - - - - - - -3.40 eV
- - - - - - - - - - - -13.6 eV

(a) Explain what is meant by an energy level of an atom.
(b) An electron in the ground state absorbs a photon and is excited to the -1.51 eV level. Calculate the energy of the absorbed photon.
(c) The electron then de-excites, returning to the ground state by emitting one or more photons. Determine the wavelengths of the three possible photons that could be emitted.
($h = 6.63 \times 10^{-34}$ J s, $c = 3.00 \times 10^8$ m s⁻¹, $e = 1.60 \times 10^{-19}$ C)

### Mark Scheme / Solution
(a)
- An energy level is one of a discrete set of allowed energy values that an electron can have within an atom. [B1]

(b)
- Energy of photon = Difference in energy levels.
- $\Delta E = E_{final} - E_{initial} = (-1.51) - (-13.6) = 12.09$ eV. [A1]

(c)
- The possible transitions are:
    1. -1.51 eV to -13.6 eV (direct)
    2. -1.51 eV to -3.40 eV
    3. -3.40 eV to -13.6 eV
- Use the relation $\Delta E = hf = \frac{hc}{\lambda}$. So, $\lambda = \frac{hc}{\Delta E}$. [M1]
- First, convert energy differences from eV to Joules by multiplying by $1.60 \times 10^{-19}$. [C1]
- **Transition 1**: $\Delta E = 12.09$ eV $= 1.934 \times 10^{-18}$ J.
    - $\lambda_1 = \frac{(6.63 \times 10^{-34}) \times (3.00 \times 10^8)}{1.934 \times 10^{-18}} = 1.028 \times 10^{-7}$ m (103 nm). [A1]
- **Transition 2**: $\Delta E = (-1.51) - (-3.40) = 1.89$ eV $= 3.024 \times 10^{-19}$ J.
    - $\lambda_2 = \frac{(6.63 \times 10^{-34}) \times (3.00 \times 10^8)}{3.024 \times 10^{-19}} = 6.58 \times 10^{-7}$ m (658 nm). [A1]
- **Transition 3**: $\Delta E = (-3.40) - (-13.6) = 10.2$ eV $= 1.632 \times 10^{-18}$ J.
    - $\lambda_3 = \frac{(6.63 \times 10^{-34}) \times (3.00 \times 10^8)}{1.632 \times 10^{-18}} = 1.218 \times 10^{-7}$ m (122 nm). [A1]

### Standard Solution Steps
- Understand that a photon is absorbed or emitted when an electron transitions between discrete energy levels.
- The photon energy is equal to the exact energy difference between the two levels: $\Delta E = E_1 - E_2$.
- Convert the energy difference from electron-volts (eV) to Joules (J) by multiplying by $1.60 \times 10^{-19}$.
- Use the photon energy equation $E=hf$ and the wave equation $c=f\lambda$ to relate energy to wavelength: $\lambda = hc/E$.
- Substitute values to calculate the wavelength.

### Common Mistakes
- Forgetting to convert energy from eV to J before using it in equations with constants in SI units.
- Errors in calculating the energy difference between levels.
- Identifying the incorrect possible transitions for de-excitation.
- Using the energy of a level itself rather than the difference between levels.

### Tags
quantum_physics, energy_levels, photon, emission_spectra, absorption_spectra, 22

## Nuclear physics: Mass-Energy Equivalence

**Syllabus Reference**: 9702.23
**Learning Objective**: Understand and use the relationship between mass and energy as given by $E=mc^2$.

### Example Question
One possible fission reaction of Uranium-235 is:
$ ^{235}_{92}\text{U} + ^1_0\text{n} \rightarrow ^{141}_{56}\text{Ba} + ^{92}_{36}\text{Kr} + 3(^1_0\text{n}) $
The masses of the particles involved are:
- Mass of $^{235}_{92}\text{U}$ nucleus = 235.0439 u
- Mass of $^{141}_{56}\text{Ba}$ nucleus = 140.9144 u
- Mass of $^{92}_{36}\text{Kr}$ nucleus = 91.9262 u
- Mass of a neutron ($^1_0\text{n}$) = 1.0087 u
(1 u = $1.66 \times 10^{-27}$ kg)

(a) Define mass defect.
(b) Calculate the mass defect for this reaction.
(c) Calculate the energy released in this single fission reaction, giving your answer in Joules.

### Mark Scheme / Solution
(a)
- Mass defect is the difference between the total mass of the individual, separate nucleons and the mass of the nucleus. [B1]

(b)
- Mass before reaction = Mass of U-235 + Mass of 1 neutron
- Mass before = $235.0439 + 1.0087 = 236.0526$ u. [C1]
- Mass after reaction = Mass of Ba-141 + Mass of Kr-92 + Mass of 3 neutrons
- Mass after = $140.9144 + 91.9262 + 3(1.0087) = 140.9144 + 91.9262 + 3.0261 = 235.8667$ u. [C1]
- Mass defect $\Delta m$ = Mass before - Mass after. [M1]
- $\Delta m = 236.0526 - 235.8667 = 0.1859$ u. [A1]

(c)
- Convert mass defect to kg:
- $\Delta m = 0.1859 \times (1.66 \times 10^{-27}) = 3.086 \times 10^{-28}$ kg. [C1]
- Use Einstein's mass-energy equivalence equation $E = \Delta m c^2$. [M1]
- $E = (3.086 \times 10^{-28}) \times (3.00 \times 10^8)^2$.
- $E = (3.086 \times 10^{-28}) \times (9.00 \times 10^{16}) = 2.777 \times 10^{-11}$ J.
- $E = 2.78 \times 10^{-11}$ J. [A1]

### Standard Solution Steps
- Carefully sum the masses of all particles/nuclei on the reactant (left) side of the equation.
- Carefully sum the masses of all particles/nuclei on the product (right) side of the equation. Pay attention to coefficients (e.g., 3 neutrons).
- The mass defect is the difference between these two totals (Mass before - Mass after).
- Convert the mass defect from atomic mass units (u) to kilograms (kg).
- Use the equation $E = \Delta m c^2$ to calculate the energy released.

### Common Mistakes
- Miscounting the number of particles on either side of the reaction, especially the neutrons.
- Calculating mass defect as (Mass after - Mass before), which gives the wrong sign.
- Forgetting to convert the mass defect from u to kg before using $E=mc^2$.
- Errors in squaring the speed of light.

### Tags
nuclear_physics, fission, mass_defect, mass_energy_equivalence, 23

## Medical physics: Ultrasound and Acoustic Impedance

**Syllabus Reference**: 9702.24
**Learning Objective**: Explain the principles behind the generation and detection of ultrasound. Use the equation for the specific acoustic impedance $Z = \rho c$.

### Example Question
Ultrasound is used in medical imaging to distinguish between different tissues.
(a) Define specific acoustic impedance.
(b) The speed of ultrasound in soft tissue is 1540 m s⁻¹ and its density is 1060 kg m⁻³. The speed of ultrasound in bone is 4080 m s⁻¹ and its density is 1900 kg m⁻³.
(i) Calculate the specific acoustic impedance of soft tissue.
(ii) Calculate the specific acoustic impedance of bone.
(c) The intensity reflection coefficient $\alpha$ at a boundary between two materials is given by $\alpha = (\frac{Z_2 - Z_1}{Z_2 + Z_1})^2$. Calculate the value of $\alpha$ for the boundary between soft tissue and bone.
(d) Explain why a gel is used between the ultrasound transducer and the patient's skin.

### Mark Scheme / Solution
(a)
- Specific acoustic impedance is the product of the density of a medium and the speed of sound in that medium. [B1]

(b)
(i)
- Use the formula $Z = \rho c$. [M1]
- $Z_{tissue} = 1060 \times 1540 = 1.632 \times 10^6$ kg m⁻² s⁻¹.
- $Z_{tissue} = 1.63 \times 10^6$ kg m⁻² s⁻¹. [A1]
(ii)
- $Z_{bone} = 1900 \times 4080 = 7.752 \times 10^6$ kg m⁻² s⁻¹.
- $Z_{bone} = 7.75 \times 10^6$ kg m⁻² s⁻¹. [A1]

(c)
- Substitute the Z-values into the reflection coefficient formula.
- $\alpha = (\frac{(7.75 \times 10^6) - (1.63 \times 10^6)}{(7.75 \times 10^6) + (1.63 \times 10^6)})^2$. [M1]
- $\alpha = (\frac{6.12 \times 10^6}{9.38 \times 10^6})^2 = (0.652)^2 = 0.425$.
- $\alpha = 0.43$. [A1]

(d)
- Without a gel, there is a layer of air between the transducer and the skin.
- Air has a very different (much lower) acoustic impedance compared to skin/tissue. [B1]
- This large mismatch in impedance would cause a very high reflection coefficient ($\alpha \approx 1$), meaning most of the ultrasound would be reflected at the surface and would not enter the body. The gel displaces the air and has an acoustic impedance similar to skin, allowing for efficient transmission of the ultrasound into the body. [B1]

### Standard Solution Steps
- Use the formula $Z=\rho c$ to calculate the specific acoustic impedance for each material.
- Substitute the Z-values into the intensity reflection coefficient formula. Be careful with the subtraction and addition.
- Square the result to find the final coefficient.
- For conceptual questions, relate the acoustic impedance mismatch to the amount of reflection at a boundary. A large mismatch means high reflection; a small mismatch means high transmission.

### Common Mistakes
- Using the wrong values for density or speed.
- Forgetting to square the term in the reflection coefficient formula.
- Incorrectly explaining the role of the coupling gel; the key is the impedance matching, not simply lubrication.

### Tags
medical_physics, ultrasound, acoustic_impedance, reflection_coefficient, 24

## Astronomy and cosmology: Hubble's Law and Redshift

**Syllabus Reference**: 9702.25
**Learning Objective**: Understand that the Universe is expanding and that this is suggested by the redshift of galaxies. Use Hubble's law.

### Example Question
(a) State Hubble's law.
(b) The light from a distant galaxy is analysed. A spectral line corresponding to hydrogen, which has a wavelength of 656.3 nm when measured in a laboratory on Earth, is observed to have a wavelength of 672.8 nm.
(i) Calculate the redshift, $z$, of this galaxy.
(ii) Calculate the recessional speed of the galaxy.
(iii) Use Hubble's law to estimate the distance to the galaxy.
(The Hubble constant $H_0 = 2.2 \times 10^{-18}$ s⁻¹)

### Mark Scheme / Solution
(a)
- Hubble's law states that the recessional speed of a galaxy is directly proportional to its distance from Earth. [B1]
- Mathematically, $v = H_0 d$. [B1]

(b)
(i)
- Redshift $z = \frac{\Delta \lambda}{\lambda}$. [M1]
- $\Delta \lambda = \lambda_{observed} - \lambda_{rest} = 672.8 - 656.3 = 16.5$ nm. [C1]
- $z = \frac{16.5}{656.3} = 0.0251$. [A1]

(ii)
- For non-relativistic speeds, $z \approx \frac{v}{c}$. So, $v = zc$. [M1]
- $v = 0.0251 \times (3.00 \times 10^8 \text{ m s⁻¹}) = 7.53 \times 10^6$ m s⁻¹. [A1]

(iii)
- From Hubble's law, $v = H_0 d$, so $d = \frac{v}{H_0}$. [M1]
- $d = \frac{7.53 \times 10^6}{2.2 \times 10^{-18}} = 3.42 \times 10^{24}$ m. [A1]

### Standard Solution Steps
- Calculate the change in wavelength, $\Delta\lambda$.
- Use the formula $z = \Delta\lambda/\lambda$ to find the redshift.
- Use the Doppler shift approximation $v = zc$ to find the recessional speed.
- Use Hubble's law, $v = H_0d$, to find the distance. Ensure you are using a consistent set of units (e.g., speed in m/s, distance in m, $H_0$ in s⁻¹).

### Common Mistakes
- Mixing up $\Delta\lambda$ and $\lambda$ in the redshift formula.
- Unit errors, especially if the Hubble constant is given in units of km s⁻¹ Mpc⁻¹. The value given here is in SI units, which simplifies the calculation.
- Using the relativistic Doppler formula when the simpler approximation is sufficient and expected.

### Tags
astronomy, cosmology, hubble_law, redshift, expanding_universe, 25