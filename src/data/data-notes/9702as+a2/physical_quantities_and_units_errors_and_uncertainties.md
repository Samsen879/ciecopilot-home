## Physical quantities and units: Homogeneity of physical equations

**Syllabus Reference**: 9702.1
**Learning Objective**: show an understanding of the principle of homogeneity of equations and use base units to check the homogeneity of physical equations

 

### Example Question
The period of oscillation $T$ of a charged liquid drop is suggested to depend on its radius $r$, its density $\rho$, and its surface tension $\sigma$. The relationship is given by the equation:
$T = k \rho^a r^b \sigma^c$
where $k$ is a dimensionless constant.

Surface tension $\sigma$ is defined as force per unit length.

Use dimensional analysis to determine the values of the exponents $a$, $b$, and $c$.

### Mark Scheme / Solution
1. Express all quantities in terms of SI base units:
   - Period $[T]$ = s [B1]
   - Density $[\rho]$ = kg m⁻³
   - Radius $[r]$ = m
   - Surface tension $[\sigma]$ = Force / Length = (kg m s⁻²) / m = kg s⁻² [B1]

2. Substitute the base units into the equation:
   s = (kg m⁻³)$^a$ (m)$^b$ (kg s⁻²)$^c$ [C1]

3. Group the base units by powers:
   s¹ = (kgᵃ m⁻³ᵃ) (mᵇ) (kgᶜ s⁻²ᶜ)
   s¹ = kg⁽ᵃ⁺ᶜ⁾ m⁽⁻³ᵃ⁺ᵇ⁾ s⁽⁻²ᶜ⁾ [M1]

4. Equate the exponents for each base unit:
   - For s:  $1 = -2c$  => $c = -1/2$ [M1]
   - For kg: $0 = a + c$ => $a = -c$ => $a = 1/2$
   - For m:  $0 = -3a + b$ => $b = 3a$ => $b = 3(1/2) = 3/2$

5. Final values:
   $a = 1/2$, $b = 3/2$, $c = -1/2$ [A1]

### Standard Solution Steps
- Step 1: Identify and write down the SI base units for every quantity in the equation ($T$, $\rho$, $r$, $\sigma$). The most complex is surface tension, which must be derived from its definition (Force/Length).
- Step 2: Substitute these base unit expressions into the given physical equation.
- Step 3: Apply the laws of indices to group all terms for each base unit (kg, m, s) together.
- Step 4: Apply the principle of homogeneity by equating the net power of each base unit on the left-hand side of the equation with the net power on the right-hand side. This creates a set of simultaneous linear equations for a, b, and c.
- Step 5: Solve the simultaneous equations to find the numerical values for the exponents a, b, and c.

### Common Mistakes
- Assuming a dimensionless constant like $k$ has units; balancing numbers instead of dimensions.
- Deriving base units incorrectly (e.g., forgetting Force = $kg\,m\,s^{-2}$).
- Index rules mistakes when grouping powers, e.g., $(m^{-3})^a$ misuse.
- Algebra slips when solving the simultaneous equations; forgetting zero powers.

### Tags
physical_quantities, dimensional_analysis, base_units, homogeneity, indices, 1

### Tags
physical_quantities, dimensional_analysis, base_units, homogeneity, error_checking, indices

---
## Physical quantities and units: Errors and Uncertainties

**Syllabus Reference**: 9702.1
**Learning Objective**: show an understanding of and use the rules for combining uncertainties

 

### Example Question
In an experiment to determine the resistivity $\rho$ of a metal wire, a student takes the following measurements:
- Length of wire, $L = 1.500 \pm 0.002$ m
- Diameter of wire, $d = 0.38 \pm 0.01$ mm
- Resistance of wire, $R = 5.2 \pm 0.1$ $\Omega$

The resistivity $\rho$ is calculated using the formula $\rho = \frac{RA}{L}$, where $A$ is the cross-sectional area of the wire.

(a) Calculate the value of the resistivity $\rho$.
(b) Calculate the percentage uncertainty in the value of $\rho$.
(c) State the value of $\rho$ with its absolute uncertainty, to an appropriate number of significant figures.

### Mark Scheme / Solution
(a) Calculate cross-sectional area $A = \pi (d/2)^2$:
   $d = 0.38$ mm $= 0.38 \times 10^{-3}$ m
   $A = \pi (0.19 \times 10^{-3})^2 = 1.134 \times 10^{-7}$ m² [C1]
   Calculate $\rho = \frac{RA}{L} = \frac{5.2 \times (1.134 \times 10^{-7})}{1.500}$
   $\rho = 3.93 \times 10^{-7}$ $\Omega$ m [A1]

(b) Calculate individual percentage uncertainties:
   - $\% \Delta R = (0.1 / 5.2) \times 100\% = 1.92\%$
   - $\% \Delta L = (0.002 / 1.500) \times 100\% = 0.13\%$
   - $\% \Delta d = (0.01 / 0.38) \times 100\% = 2.63\%$ [C1]
   Since $A \propto d^2$, the percentage uncertainty in $A$ is $2 \times \% \Delta d$.
   $\% \Delta A = 2 \times 2.63\% = 5.26\%$ [M1]
   Combine uncertainties for $\rho = \frac{RA}{L}$:
   $\% \Delta \rho = \% \Delta R + \% \Delta A + \% \Delta L$
   $\% \Delta \rho = 1.92\% + 5.26\% + 0.13\% = 7.31\%$ [A1]

(c) Calculate absolute uncertainty $\Delta \rho$:
   $\Delta \rho = 7.31\% \text{ of } 3.93 \times 10^{-7} = 0.0731 \times 3.93 \times 10^{-7}$
   $\Delta \rho = 0.287 \times 10^{-7}$ $\Omega$ m [M1]
   Round uncertainty to 1 or 2 s.f.: $\Delta \rho = 0.3 \times 10^{-7}$ $\Omega$ m.
   Round $\rho$ to match decimal places of uncertainty: $\rho = 3.9 \times 10^{-7}$ $\Omega$ m.
   Final answer: $\rho = (3.9 \pm 0.3) \times 10^{-7}$ $\Omega$ m [A1]

### Standard Solution Steps
- Step 1: Calculate the mean value of the desired quantity ($\rho$) using the mean values of the measurements. Ensure all units are converted to base SI units first (e.g., mm to m).
- Step 2: Calculate the percentage uncertainty for each individual measurement ($R$, $L$, $d$).
- Step 3: Use the rules for combining uncertainties. Since $A \propto d^2$, the percentage uncertainty in $A$ is twice that in $d$.
- Step 4: Since $\rho$ is calculated from a product and a division, add the percentage uncertainties of $R$, $A$, and $L$ to find the total percentage uncertainty in $\rho$.
- Step 5: Convert the final percentage uncertainty back into an absolute uncertainty by multiplying the percentage by the calculated mean value of $\rho$.
- Step 6: State the final answer by rounding the absolute uncertainty to one or two significant figures, and then rounding the mean value of $\rho$ to the same number of decimal places.

### Common Mistakes
- Adding absolute uncertainties for products/quotients; forgetting power rule for uncertainties.
- Forgetting to double the diameter uncertainty for area ($A\propto d^2$).
- Unit conversion mistakes (mm→m, mm²→m²); arithmetic slips.
- Rounding the uncertainty to too many s.f.; mismatch of main value precision.

### Tags
uncertainty, percentage_error, absolute_error, error_propagation, significant_figures, 1

### Tags
uncertainty, percentage_error, absolute_error, error_propagation, significant_figures, resistivity

---
## Physical quantities and units: Scalars and Vectors

**Syllabus Reference**: 9702.1
**Learning Objective**: add and subtract coplanar vectors

 

### Example Question
Two forces, $F_1$ and $F_2$, act on a single point P as shown in the diagram below.
- $F_1$ has a magnitude of 8.0 N and acts horizontally to the right.
- $F_2$ has a magnitude of 6.0 N and acts at an angle of 60° to the horizontal.

[Visual Description: A point P is shown with two arrows originating from it. One arrow, labelled $F_1$, is 8.0 N and points along the positive x-axis. The second arrow, labelled $F_2$, is 6.0 N and points into the first quadrant, making an angle of 60° with the positive x-axis.]

Determine the magnitude and direction of the resultant force acting on point P.

### Mark Scheme / Solution
**Method 1: Resolving into Components**
1. Resolve forces into horizontal (x) and vertical (y) components:
   - $F_{1x} = 8.0$ N, $F_{1y} = 0$ N
   - $F_{2x} = 6.0 \cos(60^\circ) = 3.0$ N [C1]
   - $F_{2y} = 6.0 \sin(60^\circ) = 5.20$ N [C1]

2. Sum the components:
   - Resultant x-component $R_x = F_{1x} + F_{2x} = 8.0 + 3.0 = 11.0$ N [M1]
   - Resultant y-component $R_y = F_{1y} + F_{2y} = 0 + 5.20 = 5.20$ N

3. Calculate magnitude of resultant force $R$ using Pythagoras' theorem:
   $R = \sqrt{R_x^2 + R_y^2} = \sqrt{11.0^2 + 5.20^2}$ [M1]
   $R = \sqrt{121 + 27.04} = \sqrt{148.04} = 12.17$ N
   $R \approx 12.2$ N [A1]

4. Calculate direction $\theta$ using trigonometry:
   $\tan(\theta) = \frac{R_y}{R_x} = \frac{5.20}{11.0}$ [M1]
   $\theta = \arctan(0.4727) = 25.3^\circ$
   Direction is $25.3^\circ$ above the horizontal (or above the 8.0 N force). [A1]

**Method 2: Vector Triangle (Cosine & Sine Rule)**
1. Draw vector triangle (place $F_2$ at the head of $F_1$). The angle inside the triangle between the vectors is $180^\circ - 60^\circ = 120^\circ$. [B1]
2. Use the cosine rule to find the magnitude of the resultant R:
   $R^2 = 8.0^2 + 6.0^2 - 2(8.0)(6.0)\cos(120^\circ)$ [C1]
   $R^2 = 64 + 36 - 96(-0.5) = 100 + 48 = 148$
   $R = \sqrt{148} = 12.17$ N $\approx 12.2$ N [A1]
3. Use the sine rule to find the angle $\theta$ the resultant makes with $F_1$:
   $\frac{\sin(\theta)}{6.0} = \frac{\sin(120^\circ)}{12.17}$ [M1]
   $\sin(\theta) = \frac{6.0 \times \sin(120^\circ)}{12.17} = 0.427$
   $\theta = \arcsin(0.427) = 25.3^\circ$ [A1]

### Standard Solution Steps
- **Method 1 (Component Resolution):**
  - Step 1: Define a coordinate system (e.g., x-horizontal, y-vertical).
  - Step 2: Resolve every vector into its x and y components using trigonometry ($F_x = F \cos \theta$, $F_y = F \sin \theta$).
  - Step 3: Sum all the x-components to get the total resultant x-component ($R_x$). Sum all y-components for $R_y$.
  - Step 4: Combine $R_x$ and $R_y$ using Pythagoras' theorem ($R = \sqrt{R_x^2 + R_y^2}$) to find the magnitude of the resultant.
  - Step 5: Use the inverse tangent function ($\theta = \arctan(R_y/R_x)$) to find the direction (angle) of the resultant.
- **Method 2 (Vector Triangle):**
  - Step 1: Draw a scale diagram or sketch, placing the vectors head-to-tail to form a triangle. The resultant is the vector from the tail of the first to the head of the last.
  - Step 2: Determine the internal angle of the triangle at the junction of the two force vectors.
  - Step 3: Apply the cosine rule to find the magnitude of the resultant side.
  - Step 4: Apply the sine rule to find one of the other internal angles, which gives the direction of the resultant relative to one of the original vectors.

### Common Mistakes
- Adding magnitudes directly ($8+6=14$ N) ignoring vector nature.
- Using 60° in cosine rule instead of internal 120° in the triangle construction.
- Mixing sine and cosine in resolution; calculator in radians mode.
- Omitting direction specification for the resultant.

### Tags
vectors, scalars, resultant_force, vector_addition, trigonometry, resolving_components, 1

### Tags
vectors, scalars, resultant_force, vector_addition, trigonometry, resolving_components, dynamics