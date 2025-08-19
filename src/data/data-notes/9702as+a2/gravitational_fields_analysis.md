## Gravitational Fields: Field Strength

**Syllabus Reference**: 9702.13
**Learning Objective**: Understand gravitational field strength as force per unit mass and recall and use the equation $g = \frac{GM}{r^2}$.

### Example Question
Mars has a mass of $6.42 \times 10^{23}$ kg and a mean radius of $3390$ km. Calculate the gravitational field strength at the surface of Mars. The gravitational constant $G$ is $6.67 \times 10^{-11}$ N m$^2$ kg$^{-2}$.

### Mark Scheme / Solution
- Conversion of radius from km to m: $3390 \times 1000 = 3.39 \times 10^6$ m. (C1)
- Correct substitution into $g = \frac{GM}{r^2}$: $g = \frac{(6.67 \times 10^{-11})(6.42 \times 10^{23})}{(3.39 \times 10^6)^2}$. (C1)
- Correct final answer with unit: $g = 3.73$ N kg$^{-1}$. (A1)

### Standard Solution Steps
- Identify the correct formula for gravitational field strength: $g = \frac{GM}{r^2}$.
- Convert all given values to base SI units. In this case, convert the radius from kilometres to metres.
- Substitute the values for $G$, the mass of the planet $M$, and the radius $r$ into the equation.
- Calculate the final value for $g$ and state the answer to an appropriate number of significant figures with the correct unit (N kg$^{-1}$ or m s$^{-2}$).

### Common Mistakes
- Forgetting to convert the radius from km to m.
- Forgetting to square the radius in the denominator.
- Using the mass of Earth instead of the specified planet.

### Tags
gravitational_field, field_strength, newtons_law_of_gravitation, planetary_physics, 13

## Gravitational Fields: Gravitational Potential

**Syllabus Reference**: 9702.13
**Learning Objective**: Understand gravitational potential and calculate the work done in moving a mass in a gravitational field using $W = m \Delta \phi$.

### Example Question
A satellite of mass $250$ kg is in a stable orbit around the Earth at an altitude of $600$ km. It is then moved to a higher orbit at an altitude of $1600$ km. Calculate the work done on the satellite to move it to the higher orbit.

- Mass of Earth, $M = 5.97 \times 10^{24}$ kg
- Radius of Earth, $R = 6.37 \times 10^6$ m
- Gravitational constant, $G = 6.67 \times 10^{-11}$ N m$^2$ kg$^{-2}$

### Mark Scheme / Solution
- Calculation of initial orbital radius $r_1 = (6.37 \times 10^6) + (600 \times 10^3) = 6.97 \times 10^6$ m. (C1)
- Calculation of final orbital radius $r_2 = (6.37 \times 10^6) + (1600 \times 10^3) = 7.97 \times 10^6$ m. (C1)
- Use of $\Delta E_p = GMm(\frac{1}{r_1} - \frac{1}{r_2})$ OR calculating initial and final potential energies separately using $E_p = -\frac{GMm}{r}$ and finding the difference. (M1)
- Correct substitution: Work done = $(6.67 \times 10^{-11})(5.97 \times 10^{24})(250)(\frac{1}{6.97 \times 10^6} - \frac{1}{7.97 \times 10^6})$. (C1)
- Correct final answer for work done: $1.81 \times 10^9$ J. (A1)

### Standard Solution Steps
- Calculate the initial orbital radius ($r_1$) by adding the Earth's radius to the initial altitude. Ensure all units are in metres.
- Calculate the final orbital radius ($r_2$) by adding the Earth's radius to the final altitude.
- Use the formula for the change in gravitational potential energy, which is equal to the work done: $W = \Delta E_p = E_{p,final} - E_{p,initial}$.
- Substitute $E_p = -\frac{GMm}{r}$ to get $W = (-\frac{GMm}{r_2}) - (-\frac{GMm}{r_1}) = GMm(\frac{1}{r_1} - \frac{1}{r_2})$.
- Substitute the known values and calculate the final answer. The result should be positive, as energy is required to move to a higher orbit (less negative potential).

### Common Mistakes
- Using the altitude instead of the orbital radius (distance from the centre of the Earth).
- Sign errors when calculating the change in potential. Remember that potential is always negative, and moving to a higher orbit means the potential becomes *less negative*.
- Mixing up $r_1$ and $r_2$ in the final calculation.

### Tags
gravitational_potential, potential_energy, work_done, orbital_mechanics, satellite, 13

## Gravitational Fields: Geostationary Orbits

**Syllabus Reference**: 9702.13
**Learning Objective**: Understand and analyse the motion of satellites in circular orbits, specifically geostationary orbits.

### Example Question
A geostationary satellite remains above the same point on the Earth's equator.
(a) State the period of a geostationary satellite.
(b) Calculate the altitude of a geostationary satellite above the Earth's surface.

- Mass of Earth, $M = 5.97 \times 10^{24}$ kg
- Radius of Earth, $R = 6.37 \times 10^6$ m
- Gravitational constant, $G = 6.67 \times 10^{-11}$ N m$^2$ kg$^{-2}$

### Mark Scheme / Solution
- (a) Period $T = 24$ hours or $86400$ s. (B1)
- (b) Equating gravitational force and centripetal force: $\frac{GMm}{r^2} = m \omega^2 r$ or $\frac{GMm}{r^2} = \frac{mv^2}{r}$. (M1)
- Substituting $\omega = \frac{2\pi}{T}$ to get $r^3 = \frac{GMT^2}{4\pi^2}$. (M1)
- Correct substitution: $r^3 = \frac{(6.67 \times 10^{-11})(5.97 \times 10^{24})(86400)^2}{4\pi^2}$. (C1)
- Calculation of orbital radius $r = 4.22 \times 10^7$ m. (A1)
- Calculation of altitude: Altitude $= r - R = (4.22 \times 10^7) - (6.37 \times 10^6) = 3.58 \times 10^7$ m. (A1)

### Standard Solution Steps
- For part (a), recall that a geostationary orbit must match the Earth's rotational period, which is 24 hours. Convert this to seconds.
- For part (b), the key insight is that the gravitational force provides the necessary centripetal force for the circular orbit.
- Set the two force equations equal: $\frac{GMm}{r^2} = m \omega^2 r$.
- Cancel the satellite mass $m$ and rearrange to solve for the orbital radius $r$. It's often easiest to use the angular velocity form, $\omega = \frac{2\pi}{T}$.
- The equation becomes $r^3 = \frac{GMT^2}{4\pi^2}$.
- Substitute the values for $G$, $M$, and the period $T$ in seconds to calculate $r^3$, then take the cube root to find $r$.
- Remember that $r$ is the distance from the centre of the Earth. To find the altitude, subtract the Earth's radius $R$ from the orbital radius $r$.

### Common Mistakes
- Using the period in hours instead of seconds.
- Forgetting to subtract the Earth's radius from the orbital radius to find the altitude. The question asks for altitude, not orbital radius.
- Errors in algebraic rearrangement, especially when solving for $r$.

### Tags
geostationary_orbit, satellite, centripetal_force, gravitational_force, orbital_period, 13