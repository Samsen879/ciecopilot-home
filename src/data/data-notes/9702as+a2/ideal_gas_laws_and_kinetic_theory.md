# ideal_gases_kinetic_theory.md
## Ideal Gas Equation

**Syllabus Reference**: 9702.15
**Learning Objective**: State and use the ideal gas equation, $pV = nRT$, in calculations.

### Example Question
A cylinder with a fixed volume of $0.050$ m³ contains nitrogen gas at a pressure of $2.5 \times 10^5$ Pa and a temperature of $22\ ^{\circ}\text{C}$. The molar mass of nitrogen ($N_2$) is $28$ g mol⁻¹. The molar gas constant, $R$, is $8.31$ J K⁻¹ mol⁻¹.

(a) Calculate the number of moles of nitrogen gas in the cylinder.
(b) Calculate the mass of the nitrogen gas.
(c) The temperature of the gas is increased to $150\ ^{\circ}\text{C}$. Calculate the new pressure in the cylinder.

### Mark Scheme / Solution
- (a) Convert initial temperature to Kelvin: $T_1 = 22 + 273.15 = 295.15$ K. (C1)
- Use of $pV = nRT$ rearranged for n: $n = \frac{pV}{RT}$. (M1)
- Substitution: $n = \frac{(2.5 \times 10^5)(0.050)}{(8.31)(295.15)} = 5.093$ mol.
- Correct answer to 2 or 3 s.f.: $n = 5.1$ mol or $5.09$ mol. (A1)
- (b) Use of mass = moles × molar mass: $m = 5.093 \times (28 \times 10^{-3})$. (M1)
- Correct calculation: $m = 0.1426$ kg.
- Correct answer to 2 or 3 s.f.: $m = 0.14$ kg or $0.143$ kg. (A1)
- (c) Convert final temperature to Kelvin: $T_2 = 150 + 273.15 = 423.15$ K. (C1)
- Use of pressure law for constant volume: $\frac{P_2}{T_2} = \frac{P_1}{T_1}$. (M1)
- Rearrangement and substitution: $P_2 = P_1 \times \frac{T_2}{T_1} = (2.5 \times 10^5) \times \frac{423.15}{295.15}$.
- Correct final pressure: $P_2 = 3.58 \times 10^5$ Pa. (A1)

### Standard Solution Steps
- Convert Celsius to Kelvin by adding 273.15
- Rearrange $pV=nRT$ to solve for the required variable
- Substitute values with consistent SI units
- For mass from moles, use mass = moles × molar mass (in kg mol⁻¹)
- For constant volume and amount, use $P/T=\text{constant}$ to relate states

### Common Mistakes
- Forgetting to convert temperatures to Kelvin
- Using kPa, L or cm³ without converting to SI units (Pa, m³)
- Not converting molar mass to kg mol⁻¹ when computing mass
- Applying the wrong gas law when multiple variables change

### Tags
ideal_gas_law, pv_nrt, molar_gas_constant, kelvin_temperature, pressure_law, 15

---

## Kinetic Theory of Gases

**Syllabus Reference**: 9702.15
**Learning Objective**: State the basic assumptions of the kinetic theory of gases and understand the relationship between molecular motion and gas pressure.

### Example Question
(a) State four principal assumptions of the kinetic model of an ideal gas.
(b) By considering the motion of individual molecules, explain how a gas exerts pressure.

### Mark Scheme / Solution
- (a) Any four of the following:
    - 1. A gas contains a very large number of atoms or molecules, which move randomly. (B1)
    - 2. The volume of the individual atoms/molecules is negligible compared with the volume of the container. (B1)
    - 3. There are no intermolecular forces of attraction or repulsion between particles (except during collisions). (B1)
    - 4. All collisions between particles and between particles and the container walls are perfectly elastic. (B1)
    - 5. The duration of a collision is negligible compared with the time between collisions.
- (b) Explanation of pressure:
    - Gas molecules are in continuous, random motion and collide with the walls of the container. (M1)
    - When a molecule collides with a wall, its momentum changes. (M1)
    - According to Newton's second law, a force is exerted by the wall on the molecule to change its momentum. (C1)
    - By Newton's third law, the molecule exerts an equal and opposite force on the wall. (M1)
    - Pressure is defined as force per unit area. The average force on the wall from all molecular collisions results in the pressure of the gas. (A1)

### Standard Solution Steps
1.  **Part (a):** Memorise and recall the key assumptions of the kinetic theory. Be precise in the wording (e.g., "negligible volume," "perfectly elastic collisions," "no intermolecular forces").
2.  **Part (b):** Structure the explanation logically:
    - Start with the fundamental idea: random molecular motion leads to collisions with walls.
    - Connect the collision to a physical quantity: the change in a molecule's momentum.
    - Apply Newton's laws: Link the change in momentum to a force (Newton's 2nd Law). Then, establish the force exerted *by the molecule on the wall* (Newton's 3rd Law).
    - Define pressure: Relate the cumulative effect of these microscopic forces over the container's area to the macroscopic property of pressure.

### Common Mistakes
-   **Part (a):** Stating assumptions that are too vague, e.g., "molecules are small" instead of "volume of molecules is negligible compared to container volume."
-   Confusing elastic and inelastic collisions. In an ideal gas, collisions must be elastic to conserve kinetic energy.
-   Stating that there are no forces at all; it's crucial to specify *intermolecular forces* are negligible *except during collisions*.
-   **Part (b):** Providing an incomplete explanation, such as "molecules hit the walls and that creates pressure," without mentioning the concepts of momentum change and force.
-   Omitting the role of Newton's third law. It is essential for explaining why the force is exerted *on the wall*.
-   Confusing the force on a single molecule with the total pressure, which arises from the statistical average of countless collisions.

### Tags
kinetic_theory, ideal_gas, assumptions, molecular_motion, pressure, molecular_kinetic_energy, 15