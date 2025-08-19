**Syllabus Reference**: 9702.13

**Learning Objective**: Apply Newton's law of gravitation and field strength definitions to planetary contexts.

### Example Question
A research probe of mass 850 kg is in orbit around Mars. It is at a constant altitude of 4.00 x 10⁵ m above the Martian surface.

**Data:**
- Mass of Mars, $M = 6.42 \times 10^{23}$ kg
- Mean radius of Mars, $R = 3.39 \times 10^6$ m
- Gravitational constant, $G = 6.67 \times 10^{-11}$ N m² kg⁻²

**(a)** State Newton's law of gravitation. **[2]**

**(b)** Calculate the magnitude of the gravitational force that Mars exerts on the probe. **[3]**

**(c)** Determine the gravitational field strength, $g$, at the altitude of the probe. **[2]**

### Mark Scheme / Solution
**(a)**
- The gravitational force between two point masses is proportional to the product of their masses. **(M1)**
- And inversely proportional to the square of the separation between their centres. **(A1)**
- *Alternative: Correct formula $F = G \frac{m_1 m_2}{r^2}$ with all symbols defined for [2] marks.*

**(b)**
- Correct calculation of the total orbital radius, $r = R + \text{altitude}$.
$r = (3.39 \times 10^6) + (4.00 \times 10^5) = 3.79 \times 10^6$ m. **(C1)**
- Correct substitution into $F = G \frac{Mm}{r^2}$:
$F = \frac{(6.67 \times 10^{-11}) \times (6.42 \times 10^{23}) \times (850)}{(3.79 \times 10^6)^2}$ **(M1)**
- Correct calculation of force: $F = 2530$ N. **(A1)**
- *(Allow answer to 2 or 3 significant figures, e.g., 2500 N)*

**(c)**
- Correct formula used, either $g = \frac{F}{m}$ or $g = G \frac{M}{r^2}$. **(M1)**
- Correct calculation:
$g = \frac{2530}{850} = 2.98$ N kg⁻¹
OR
$g = \frac{(6.67 \times 10^{-11}) \times (6.42 \times 10^{23})}{(3.79 \times 10^6)^2} = 2.98$ N kg⁻¹ **(A1)**
- *(Accept units of m s⁻². Allow consequential error from part (b)).*

### Standard Solution Steps
- Part (a): Recall the formal definition of Newton's law. Key components: $F \propto m_1 m_2$ and $F \propto 1/r^2$
- Part (b):
  - Find total radius: add planet radius and altitude to get $r$
  - Apply $F = G \dfrac{Mm}{r^2}$ with correct squaring of $r$
- Part (c):
  - Method 1: Use $g = F/m$ from part (b)
  - Method 2: Use $g = G \dfrac{M}{r^2}$ with $M$ and $r$ from (b)

### Common Mistakes
-   **Incorrect Radius:** The most common error is using the altitude ($4.00 \times 10^5$ m) or the planet's radius ($3.39 \times 10^6$ m) for $r$ instead of their sum. Always remember $r$ is the distance between the *centres of mass*.
-   **Forgetting to Square:** Students often forget to square the radius term ($r$) in the denominator. This significantly alters the result.
-   **Mass Confusion:** Using the probe's mass ($m$) in the formula for $g$ ($g=GM/r^2$) instead of the planet's mass ($M$). The field is created by the large central mass.
-   **Unit Errors:** Providing the final answer for force or field strength without the correct units (N and N kg⁻¹ respectively).

### Tags
newtons_law_of_gravitation, gravitational_force, gravitational_field_strength, orbital_mechanics, mars_probe, 13

---

**Syllabus Reference**: 9702.13

**Learning Objective**: Use gravitational potential and $E_p=-GMm/r$ to compute energy changes.

### **Example Question**
An astronaut needs to move a piece of equipment with a mass of 15 kg from the surface of the Moon to a workshop located at an altitude of 30 km above the surface.

**Data:**
- Mass of the Moon, $M = 7.35 \times 10^{22}$ kg
- Mean radius of the Moon, $R = 1.74 \times 10^6$ m
- Gravitational constant, $G = 6.67 \times 10^{-11}$ N m² kg⁻²

**(a)** Define *gravitational potential* at a point. **[2]**

**(b)** Calculate the change in gravitational potential energy of the equipment when it is moved from the surface to the workshop. **[4]**

**(c)** State and explain whether the work done by the astronaut is positive or negative. **[1]**

### **Mark Scheme / Solution**
**(a)**
- Work done per unit mass... **(M1)**
- ...in moving the mass from infinity to that point. **(A1)**

**(b)**
- Correct formula for gravitational potential energy, $E_p = -G\frac{Mm}{r}$, or for potential $\phi = -G\frac{M}{r}$ used. **(M1)**
- Calculation of initial radius $r_1 = 1.74 \times 10^6$ m and final radius $r_2 = 1.74 \times 10^6 + 30000 = 1.77 \times 10^6$ m. **(C1)**
- Calculation of change in energy $\Delta E_p = (-G\frac{Mm}{r_2}) - (-G\frac{Mm}{r_1})$:
$\Delta E_p = - (6.67 \times 10^{-11})\frac{(7.35 \times 10^{22})(15)}{1.77 \times 10^6} - \left( - (6.67 \times 10^{-11})\frac{(7.35 \times 10^{22})(15)}{1.74 \times 10^6} \right)$
$\Delta E_p = (-4.15 \times 10^7) - (-4.22 \times 10^7)$ J **(M1)**
- $\Delta E_p = +7.0 \times 10^5$ J. **(A1)**
- *(Award full marks for a correct final answer. A mark of M1 can be awarded for correctly calculating one of the GPE values)*

**(c)**
- Positive. Work must be done *against* the Moon's gravitational field to move the equipment to a point of higher potential (further away). **(B1)**

### **Standard Solution Steps**
1.  **Part (a):** Recall the formal definition. It must include "work done per unit mass" and the reference point of "infinity".
2.  **Part (b):**
    - **Identify the Goal:** The question asks for the change in gravitational potential energy ($\Delta E_p$), which is equal to the work done. The formula is $\Delta E_p = E_{p,final} - E_{p,initial}$.
    - **Energy Formula:** The absolute gravitational potential energy at a distance $r$ is $E_p = -G \frac{Mm}{r}$.
    - **Calculate Radii:** Determine the initial radius ($r_1$, the Moon's radius) and the final radius ($r_2$, Moon's radius + altitude). Ensure altitude is in metres ($30 \text{ km} = 30000 \text{ m}$).
    - **Calculate Initial and Final Energy:** Substitute the values into the $E_p$ formula for both $r_1$ and $r_2$. Expect negative values.
    - **Find the Change:** Calculate $\Delta E_p = E_{p,final} - E_{p,initial}$. Since you are moving further away, the final potential energy will be less negative (larger) than the initial, resulting in a positive change.
3.  **Part (c):** To move an object away from a gravitational source, its potential energy must increase. This energy must be supplied by an external agent (the astronaut). Therefore, the astronaut does positive work on the equipment.

### **Common Mistakes**
-   **Sign Errors:** Forgetting the negative sign in the gravitational potential energy formula is the most critical and common error. This leads to an incorrect sign for the final answer.
-   **Using $\Delta E_p = mgh$:** This formula is only valid for small changes in height near a planet's surface where $g$ is constant. For significant altitude changes in space, it is incorrect.
-   **Altitude vs. Radius:** Using the altitude (30 km) as a radius instead of adding it to the Moon's radius.
-   **Unit Conversion:** Forgetting to convert the altitude from kilometres to metres before calculating.

### Tags
gravitational_potential, potential_energy, work_done, moon, energy_conservation, 13

---

**Syllabus Reference**: 9702.13

**Learning Objective**: Derive and use $T^2=4\pi^2 r^3/(GM)$ for circular orbits.

### **Example Question**
A satellite is in a stable, circular, geostationary orbit around the Earth.

**(a)** State two features of a geostationary orbit. **[2]**

**(b)** By considering the gravitational force providing the centripetal force, show that the period $T$ of a satellite in a circular orbit of radius $r$ is given by the expression:
$T^2 = \frac{4\pi^2 r^3}{GM}$
where $M$ is the mass of the Earth and $G$ is the gravitational constant. **[3]**

**(c)** Calculate the radius of this geostationary orbit. **[3]**

**Data:**
- Mass of the Earth, $M = 5.98 \times 10^{24}$ kg
- Gravitational constant, $G = 6.67 \times 10^{-11}$ N m² kg⁻²

### **Mark Scheme / Solution**
**(a)**
- The satellite orbits directly above the equator (in the equatorial plane). **(B1)**
- The period of the orbit is 24 hours (or 86400 s), matching the Earth's rotational period. **(B1)**
- *(Also allow: satellite moves in the same direction as Earth's rotation; remains at a fixed point above the Earth's surface).*

**(b)**
- Gravitational force equals centripetal force: $G \frac{Mm}{r^2} = m \frac{v^2}{r}$ or $G \frac{Mm}{r^2} = mr\omega^2$. **(M1)**
- Substitute $v = \frac{2\pi r}{T}$:
$G \frac{Mm}{r^2} = m \frac{(2\pi r/T)^2}{r} = m \frac{4\pi^2 r^2}{T^2 r}$ **(M1)**
- Rearrange for $T^2$:
$G \frac{M}{r^2} = \frac{4\pi^2 r}{T^2} \implies GMT^2 = 4\pi^2 r^3 \implies T^2 = \frac{4\pi^2 r^3}{GM}$. **(A1)**
- *(Award A1 for a clear and logical rearrangement to the final form).*

**(c)**
- Correctly state the period of a geostationary orbit in seconds: $T = 24 \times 60 \times 60 = 86400$ s. **(C1)**
- Rearrange the formula for $r$: $r^3 = \frac{GMT^2}{4\pi^2}$
$r^3 = \frac{(6.67 \times 10^{-11}) \times (5.98 \times 10^{24}) \times (86400)^2}{4\pi^2}$. **(M1)**
- Correct calculation: $r = (7.54 \times 10^{22})^{1/3} = 4.22 \times 10^7$ m. **(A1)**

### **Standard Solution Steps**
1.  **Part (a):** Recall the definition of a geostationary orbit. The key properties are its period (24 hours) and its location (above the equator).
2.  **Part (b):**
    - **Equate Forces:** The core principle for any stable orbit is that the gravitational force of attraction provides the necessary centripetal force to keep the object moving in a circle. Set $F_g = F_c$.
    - **Substitute Formulae:** Use $F_g = G \frac{Mm}{r^2}$ and a suitable formula for centripetal force. Using $F_c = m \frac{v^2}{r}$ is common.
    - **Introduce Period (T):** The orbital speed $v$ is related to the period $T$ by the equation for the circumference of a circle: $v = \frac{2\pi r}{T}$. Substitute this expression for $v$ into the force equation.
    - **Algebraic Rearrangement:** Carefully simplify the expression and rearrange it to make $T^2$ the subject.
3.  **Part (c):**
    - **Convert Period:** The period must be in SI units (seconds). Convert 24 hours to seconds.
    - **Rearrange Formula:** Take the expression from (b) and rearrange it to solve for the radius, $r$. This will involve isolating $r^3$ and then taking the cube root.
    - **Substitute and Calculate:** Input the values for $G$, $M$, and $T$ to find $r^3$, then take the cube root to find $r$.

### **Common Mistakes**
-   **Period in Hours:** Using $T=24$ instead of $T=86400$ s in the calculation. All quantities in physics formulae must be in SI base units.
-   **Algebraic Errors:** Making mistakes when rearranging the formula, especially when moving terms with squares and cubes between the numerator and denominator.
-   **Confusing $v$ and $\omega$:** Mixing up the formulae for centripetal force ($m v^2 / r$ vs $m r \omega^2$). While both can work, it's vital to be consistent.
-   **Final Step Error:** Calculating $r^3$ correctly but forgetting to take the cube root to find the final answer for $r$.

### Tags
geostationary_orbit, centripetal_force, orbital_period, kepler_third_law, satellite_motion, 13