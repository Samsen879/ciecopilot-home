## Temperature: Specific Heat and Latent Heat

**Syllabus Reference**: 9702.14
**Learning Objective**: Define and use specific heat capacity and specific latent heat in energy transfer calculations, applying the principle of conservation of energy.

### Example Question
A copper block of mass $450$ g is heated to a temperature of $350\ ^{\circ}\text{C}$. It is then quickly transferred to a well-insulated container holding $2.0$ kg of water initially at $25\ ^{\circ}\text{C}$. When thermal equilibrium is reached, some of the water has turned into steam. The mass of steam produced is found to be $12$ g.

(a) Calculate the heat energy absorbed by the water that turns into steam.
(b) Calculate the final temperature of the remaining water and the copper block.
(c) Determine the specific heat capacity of copper.

- Specific heat capacity of water = $4.2 \times 10^3$ J kg⁻¹ K⁻¹
- Specific latent heat of vaporisation of water = $2.3 \times 10^6$ J kg⁻¹

### Mark Scheme / Solution
- (a) Use of $Q = mL_v$ with mass of steam in kg: $Q = (12 \times 10^{-3}) \times (2.3 \times 10^6)$. (C1)
- Correct calculation: $Q = 27600$ J. (A1)
- (b) The presence of both water and steam at equilibrium means the final temperature must be the boiling point of water, $100\ ^{\circ}\text{C}$. (B1)
- (c) Heat energy gained by water to reach boiling point: $Q_1 = mc\Delta T = (2.0)(4.2 \times 10^3)(100 - 25)$. (C1)
- $Q_1 = 630000$ J.
- Total heat gained by water = Heat to raise temperature + Heat to vaporise = $630000 + 27600 = 657600$ J. (C1)
- Heat lost by copper block: $Q_{lost} = m_c c_c \Delta T = (0.450)(c_c)(350 - 100)$. (M1)
- Equating heat lost and heat gained: $(0.450)(c_c)(250) = 657600$. (M1)
- Calculation for $c_c$: $c_c = \frac{657600}{(0.450)(250)} = 5845$ J kg⁻¹ K⁻¹.
- Correct final answer to 2 or 3 s.f.: $c_c = 5800$ J kg⁻¹ K⁻¹ or $5850$ J kg⁻¹ K⁻¹. (A1)

### Standard Solution Steps
- **Part (a):** Identify the formula for latent heat, $Q = mL$. Convert the mass of steam from grams to kilograms. Substitute the values to find the energy used for vaporisation.
- **Part (b):** Recognise that if water is boiling to produce steam, the system must be at the boiling point of water. State this temperature as the final equilibrium temperature.
- **Part (c):** Apply the principle of conservation of energy: *Heat Lost by Hot Object = Heat Gained by Cold Object*.
- Calculate the total heat gained by the water. This has two components:
  - Heat to raise the temperature of the entire mass of water from $25\ ^{\circ}\text{C}$ to $100\ ^{\circ}\text{C}$ using $Q = mc\Delta T$.
  - Heat to convert 12 g of water at $100\ ^{\circ}\text{C}$ to steam at $100\ ^{\circ}\text{C}$ (calculated in part a).
- Set up the expression for heat lost by the copper block using $Q = mc\Delta T$. The temperature change is from its initial temperature to the final equilibrium temperature of $100\ ^{\circ}\text{C}$.
- Equate the heat lost by the copper to the total heat gained by the water.
- Solve the equation for the unknown specific heat capacity, $c_c$.

### Common Mistakes
-   Forgetting to convert mass from grams to kilograms for all substances.
-   In part (c), only calculating the heat gained to raise the water's temperature and forgetting to include the latent heat for the steam produced.
-   Using the mass of steam ($12$ g) instead of the total mass of water ($2.0$ kg) when calculating the heat absorbed to raise the temperature.
-   Incorrectly calculating the temperature change ($\Delta T$). For the copper, it's ($T_{initial} - T_{final}$), and for the water, it's ($T_{final} - T_{initial}$).

### Tags
specific_heat_capacity, specific_latent_heat, calorimetry, thermal_equilibrium, energy_conservation, 14

---

## Temperature: Thermodynamic Scale and Equilibrium

**Syllabus Reference**: 9702.14
**Learning Objective**: Understand thermal equilibrium and the thermodynamic (Kelvin) scale of temperature, and perform calculations based on it.

### Example Question
(a) State what is meant by thermal equilibrium.
(b) The thermodynamic scale of temperature is an absolute scale. Explain what is meant by an *absolute scale*.
(c) A constant-volume gas thermometer is used to determine an unknown temperature $T$. The pressure of the gas in the thermometer is measured at two points:
    - at the triple point of water, the pressure is $1.50 \times 10^5$ Pa.
    - at the unknown temperature $T$, the pressure is $2.05 \times 10^5$ Pa.
    Calculate the unknown temperature $T$ in Kelvin (K) and in degrees Celsius ($^{\circ}\text{C}$).

### Mark Scheme / Solution
- (a) Two bodies are in thermal equilibrium when there is no net flow of thermal energy between them. (B1) This occurs when the bodies are at the same temperature. (B1)
- (b) An absolute scale is a scale of temperature that does not depend on the property of any particular substance. (B1) Its zero point (0 K) is the absolute zero of temperature, where a system has minimum internal energy. (B1)
- (c) Correct relationship for the thermometer: $\frac{T}{P} = \text{constant}$ or $T \propto P$. (M1)
- Set up the ratio: $\frac{T}{2.05 \times 10^5} = \frac{273.16}{1.50 \times 10^5}$. (C1)
- Calculation for T in Kelvin: $T = 273.16 \times \frac{2.05 \times 10^5}{1.50 \times 10^5} = 373.2$ K. (A1)
- Conversion to Celsius: $T(^{\circ}\text{C}) = T(\text{K}) - 273.15 = 373.2 - 273.15 = 100.05\ ^{\circ}\text{C}$. (A1) (Accept 100 or 100.1)

### Standard Solution Steps
- **Part (a):** Provide a precise definition. The key concepts are "no net flow of thermal energy" and "same temperature".
- **Part (b):** Explain the two key features of an absolute scale: its independence from any specific material's properties and its absolute zero point.
- **Part (c):**
  - Recall that for a constant-volume gas thermometer, the thermodynamic temperature is directly proportional to the pressure ($T \propto P$).
  - The calibration point for the Kelvin scale is the triple point of water, defined as $273.16$ K.
  - Set up a ratio: $\frac{T_1}{P_1} = \frac{T_2}{P_2}$. Here, $T_1 = 273.16$ K, $P_1$ is the pressure at that point, and $P_2$ is the pressure at the unknown temperature $T_2$.
  - Rearrange the formula to solve for the unknown temperature $T$.
  - To convert the result from Kelvin to degrees Celsius, use the formula: $T(^{\circ}\text{C}) = T(\text{K}) - 273.15$.

### Common Mistakes
-   In (a), giving a vague definition like "temperatures are equal" without mentioning the net flow of energy.
-   In (b), confusing the thermodynamic scale with scales that rely on specific properties, like the expansion of mercury.
-   In (c), using the Celsius temperature for the triple point (0.01 °C) instead of the Kelvin value (273.16 K) in the ratio calculation.
-   Inverting the pressure ratio in the calculation, e.g., calculating $T = 273.16 \times \frac{P_{tr}}{P_T}$.
-   Using 273 instead of the more precise 273.16 for the triple point or 273.15 for the conversion, which can lead to rounding errors.

### Tags
thermodynamic_temperature, kelvin_scale, absolute_zero, thermal_equilibrium, constant_volume_gas_thermometer, 14