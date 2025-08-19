# Deformation of Solids: Stress, Strain, and Energy

**Syllabus Reference**: 9702.6
**Learning Objective**: Understand and use the terms stress, strain, Young modulus, and strain energy. Appreciate the distinction between elastic and plastic deformation. Describe an experiment to determine the Young modulus of a metal in the form of a wire.

 

---
### Example Question

An experiment is conducted to find the Young modulus of a copper wire. The wire has an unstretched length of 2.50 m and a diameter of 0.56 mm. A mass of 4.5 kg is hung from the end of the wire, causing it to extend by 1.8 mm.

*(Assume the acceleration of free fall, g, is 9.81 m s⁻².)*

(a) Define:
    (i) Tensile stress
    (ii) Tensile strain

(b) For the copper wire with the 4.5 kg mass attached, calculate:
    (i) The tensile stress
    (ii) The tensile strain

(c) Use your answers from (b) to determine the Young modulus of copper.

(d) The uncertainty in the measurement of the diameter is $\pm 0.01$ mm. Calculate the percentage uncertainty in the value of the cross-sectional area.

### Mark Scheme / Solution
(a) (i) **Tensile stress** is the force applied per unit cross-sectional area of the wire. [B1]
   Formula: $\sigma = \frac{F}{A}$

   (ii) **Tensile strain** is the extension per unit original length of the wire. [B1]
   Formula: $\epsilon = \frac{x}{L}$

(b) (i) **Calculate Stress:**
   Force, $F = mg = 4.5 \times 9.81 = 44.145$ N [C1]
   Radius, $r = \frac{d}{2} = \frac{0.56 \times 10^{-3}}{2} = 0.28 \times 10^{-3}$ m
   Area, $A = \pi r^2 = \pi (0.28 \times 10^{-3})^2 = 2.463 \times 10^{-7}$ m² [M1]
   Stress, $\sigma = \frac{F}{A} = \frac{44.145}{2.463 \times 10^{-7}}$
   $\sigma = 1.792 \times 10^8$ Pa $\approx 1.8 \times 10^8$ Pa [A1]

   (ii) **Calculate Strain:**
   Extension, $x = 1.8$ mm $= 1.8 \times 10^{-3}$ m
   Original length, $L = 2.50$ m
   Strain, $\epsilon = \frac{x}{L} = \frac{1.8 \times 10^{-3}}{2.50}$ [M1]
   $\epsilon = 7.2 \times 10^{-4}$ (no units) [A1]

(c) **Calculate Young Modulus:**
   Young Modulus, $E = \frac{\text{Stress}}{\text{Strain}} = \frac{\sigma}{\epsilon}$ [C1]
   $E = \frac{1.792 \times 10^8}{7.2 \times 10^{-4}}$
   $E = 2.489 \times 10^{11}$ Pa $\approx 2.5 \times 10^{11}$ Pa [A1]

(d) **Calculate Percentage Uncertainty:**
   Percentage uncertainty in diameter, $\% \Delta d = \frac{\text{uncertainty}}{\text{value}} \times 100 = \frac{0.01}{0.56} \times 100 = 1.786\%$ [M1]
   Since Area, $A \propto d^2$ (or $A = \pi r^2 = \frac{\pi d^2}{4}$), the power is 2.
   Percentage uncertainty in Area, $\% \Delta A = 2 \times \% \Delta d$ [M1]
   $\% \Delta A = 2 \times 1.786\% = 3.57\%$
   $\% \Delta A \approx 3.6\%$ [A1]

### Standard Solution Steps
- Step 1: Recall the definitions of stress ($\sigma = F/A$) and strain ($\epsilon = x/L$).
- Step 2: Convert all given measurements to standard SI units (e.g., mm to m, kg to N).
- Step 3: Calculate the cross-sectional area ($A = \pi r^2$) from the diameter.
- Step 4: Substitute values into the formulas to calculate stress and strain.
- Step 5: Use the Young modulus formula ($E = \sigma / \epsilon$) to find the final value.
- Step 6: For uncertainty calculations, recall the rule for powers: if $Y = Z^n$, then $\% \Delta Y = |n| \times \% \Delta Z$.

 

### Common Mistakes
- **Error Patterns**:
    - **Conceptual_Misconception**: Confusing stress with pressure or force. Confusing strain with extension. Believing the Young modulus depends on the wire's length or thickness.
    - **Procedural_Error**: Forgetting to convert units, especially diameter from mm to m. Using diameter instead of radius to calculate the area.
    - **Application_Error**: In the uncertainty calculation, forgetting to multiply the percentage uncertainty of the diameter by 2. This is a very frequent mistake.
    - **Common_Mistakes**: Reporting strain with units. Strain is a ratio of lengths and is dimensionless.

- **Remediation Path**: Emphasise the definitions with analogies: Stress is like "force concentration," and Strain is "proportional stretching." Insist on a "unit check" step before any calculation. For uncertainties, create a summary table of rules (addition, multiplication, powers) and drill them with simple examples first.

 

### Tags
young_modulus, stress, strain, tensile, elastic_properties, uncertainty_analysis, deformation, 6

---
### Example Question

The graph below shows the force-extension graph for a metal wire of original length 1.5 m that is stretched until it breaks.

![A force-extension graph for a metal wire. The y-axis is Force / N and the x-axis is Extension / mm. The graph starts at (0,0), goes up linearly to point P at (2.0 mm, 80 N). After P, the curve starts to bend slightly, reaching an elastic limit at point E (3.0 mm, 100 N). After E, the curve bends more significantly (plastic deformation) to a maximum force and then curves down slightly before stopping at the breaking point B (6.0 mm, 110 N).](placeholder_url)

(a) State Hooke's Law. Explain how the graph shows the wire obeys Hooke's Law up to point P.

(b) Calculate the work done on the wire to produce an extension of 2.0 mm.

(c) Describe the behaviour of the wire when the force is increased beyond the elastic limit E, and then subsequently removed.

(d) Use the graph to estimate the total work done to break the wire.

### Mark Scheme / Solution
(a) **Hooke's Law** states that the force applied to an object is directly proportional to its extension, provided the limit of proportionality is not exceeded. ($F \propto x$ or $F = kx$) [B1]
   The graph shows a straight line passing through the origin from the start up to point P. This indicates a constant gradient, meaning that force is directly proportional to extension in this region. [B1]

(b) **Work Done / Strain Energy:**
   Work done is the area under the force-extension graph. For the linear region up to an extension of 2.0 mm, this is the area of a triangle. [C1]
   Extension $x = 2.0$ mm $= 2.0 \times 10^{-3}$ m. Force $F = 80$ N.
   Work Done = $\frac{1}{2} \times F \times x$ [M1]
   Work Done = $0.5 \times 80 \times (2.0 \times 10^{-3})$ [M1]
   Work Done = 0.080 J [A1]

(c) **Behaviour beyond Elastic Limit:**
   Beyond the elastic limit E, the wire undergoes **plastic deformation**. [B1]
   This means that if the force were removed, the wire would not return to its original length; it would be permanently stretched. The unloading curve would be a line parallel to the initial elastic section (0P), returning to the x-axis at a non-zero extension. [B1]

(d) **Total Work Done to Break:**
   The total work done is the total area under the graph up to the breaking point B. We can estimate this by counting squares. [M1]
   Let one large square be 20 N on the y-axis and 1.0 mm on the x-axis.
   Area of one large square = $20 \text{ N} \times (1.0 \times 10^{-3} \text{ m}) = 0.02$ J. [C1]
   Counting squares under the entire curve up to x = 6.0 mm (approximate):
   - Area up to 4 mm: ~ (100+115)/2 * 4 = 430 N mm = 0.43 J
   - Area from 4 mm to 6 mm: ~ 110 * 2 = 220 N mm = 0.22 J
   - Let's count squares for a better estimate. Number of large squares $\approx$ 26-28.
   Number of squares (visual estimation) is approximately 27. [M1]
   Total Work Done $\approx 27 \times 0.02$ J = 0.54 J.
   *(Accept any reasonable estimate from 0.50 J to 0.58 J, provided the method of counting squares is shown or implied).* [A1]

### Standard Solution Steps
- Step 1: To test Hooke's Law, check if the F-x graph is a straight line passing through the origin.
- Step 2: Recall that work done (or elastic potential energy stored) is the area under the F-x graph.
- Step 3: For the elastic region, this area is a triangle ($Area = \frac{1}{2}Fx$). For non-linear regions, the area must be estimated (e.g., by counting squares or using the trapezium rule).
- Step 4: Differentiate between elastic (returns to original shape) and plastic (permanently deformed) behaviour by referencing the limit of proportionality and the elastic limit on the graph.
- Step 5: Ensure all units are converted to SI units (N and m) before calculating energy in Joules.

 

### Common Mistakes
- **Error Patterns**:
    - **Conceptual_Misconception**: Confusing the limit of proportionality with the elastic limit (they are often very close but conceptually different). Assuming energy can be calculated by $E = Fx$ instead of the area of the triangle.
    - **Procedural_Error**: Forgetting to convert extension from mm to m when calculating work done, leading to an answer that is 1000 times too small.
    - **Application_Error**: When counting squares, using the axis values directly without calculating the energy value of a single square. Miscounting squares.
    - **Common_Mistakes**: Calculating the work done for plastic deformation using the formula $E_p = \frac{1}{2}Fx$, which is only valid for the linear (elastic) region.

- **Remediation Path**: Use physical springs and elastic bands to demonstrate elastic vs. plastic behaviour. Give students graphs printed on grid paper and have them physically shade the area and count squares to reinforce the concept. Emphasise that different formulas apply to different regions of the graph.

 

### Tags
force_extension_graph, elastic_deformation, plastic_deformation, hookes_law, strain_energy, work_done, material_properties, 6