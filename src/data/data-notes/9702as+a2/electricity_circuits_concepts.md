## Electricity: Current, Charge, and Energy Transfer

**Syllabus Reference**: 9702.9
**Learning Objective**: Understand current as rate of flow of charge; apply $Q=It$, $V=W/Q$, $P=VI$; relate p.d. to energy transfer per unit charge.

### Example Question

A resistor of resistance $12 \, \Omega$ is connected to a power supply. A steady current of $2.5 \, \text{A}$ flows through the resistor for $3.0$ minutes.

(a) Define potential difference (p.d.). [1]

(b) Calculate the total charge that passes through the resistor in this time. [2]

(c) Calculate the potential difference across the resistor. [2]

(d) Determine the work done (energy transferred) by the charge in the resistor during this time. [2]

---
### Mark Scheme / Solution

**(a)**
- **B1**: Potential difference is the work done (or energy transferred) per unit charge. (Accept equation $V = W/Q$ with symbols defined). [1]

**(b)**
- **C1**: Correct conversion of time: $t = 3.0 \times 60 = 180 \, \text{s}$. [1]
- **A1**: Use of $Q = It \implies Q = 2.5 \times 180 = 450 \, \text{C}$. [1]

**(c)**
- **C1**: Correct application of Ohm's Law, $V = IR$. [1]
- **A1**: $V = 2.5 \times 12 = 30 \, \text{V}$. [1]

**(d)**
- **C1**: Correct application of the formula $W = VQ$ or $W = VIt$ or $W=I^2Rt$. For example, using $W=VQ$. [1]
- **A1**: $W = 30 \times 450 = 13500 \, \text{J}$ (or $14 \, \text{kJ}$ to 2 s.f.). [1]

### Standard Solution Steps

- Part (a): Recall the formal definition of potential difference. The key concepts are "work done" or "energy transferred" and "per unit charge".
- Part (b):
  - List the known values: $I = 2.5 \, \text{A}$, $t = 3.0$ minutes.
  - Convert the time from minutes to the standard SI unit of seconds. This is a crucial first step.
  - Substitute the values into the formula for charge, $Q = It$.
  - Calculate the result and provide the answer with the correct unit, coulombs (C).
- Part (c):
  - Recall Ohm's Law, $V = IR$.
  - Substitute the given current $I$ and resistance $R$ to find the potential difference $V$.
- Part (d):
  - Recall the formula for work done/energy transferred, $W = VQ$.
  - Substitute the values for $V$ (from part c) and $Q$ (from part b).
  - Alternative method: use $W = VIt$ with given values.
  - Alternative method 2: use $W = P \times t = (I^2R) \times t$.
  - Ensure the final answer has the correct unit, joules (J).

### Common Mistakes

- Conceptual_Misconception: Confusing the definitions. For example, stating that p.d. is the flow of charge (which is current) or that current is energy per charge (which is p.d.).
- Time conversion: Forgetting to convert the time from minutes to seconds in part (b).
- Using incorrect values: Using the time value (180 s) in the Ohm's Law calculation in part (c).
- Calculation chain error: An error in part (b) or (c) can propagate to part (d) if using $W=VQ$.

### Tags
electricity, current, charge, potential_difference, resistance, energy_transfer, ohms_law, 9

---

## Electricity: Resistivity and Component Characteristics

**Syllabus Reference**: 9702.9
**Learning Objective**: Apply $R=\tfrac{\rho L}{A}$; sketch and explain I–V characteristics of an ohmic conductor, a diode, and a filament lamp.

### Example Question

(a) A wire is made from a metal of resistivity $4.9 \times 10^{-7} \, \Omega \, \text{m}$. The wire has a diameter of $0.50 \, \text{mm}$ and a length of $3.0 \, \text{m}$. Calculate the resistance of the wire. [3]

(b) The wire in (a) is replaced with a semiconductor diode.
   (i) Sketch the current–voltage (I–V) characteristic for a semiconductor diode. Include both positive (forward bias) and negative (reverse bias) voltage values on your sketch. [2]
   (ii) Use the principles of conduction in a semiconductor to explain the shape of your sketch for both forward and reverse bias. [3]

---
### Mark Scheme / Solution

**(a)**
- **C1**: Correctly calculate the cross-sectional area $A$. $A = \pi r^2 = \pi (0.25 \times 10^{-3})^2 = 1.96 \times 10^{-7} \, \text{m}^2$. [1]
- **C1**: Correctly substitute values into the resistivity formula $R = \frac{\rho L}{A}$. [1]
- **A1**: $R = \frac{(4.9 \times 10^{-7}) \times 3.0}{1.96 \times 10^{-7}} = 7.5 \, \Omega$. [1]

**(b)**
- **(i) Sketch:**
    - **B1**: Correct shape in forward bias (quadrant 1): negligible current until a threshold voltage (approx. 0.6-0.7V), then current increases sharply/exponentially. [1]
    - **B1**: Correct shape in reverse bias (quadrant 3): very small / almost zero leakage current for negative voltages. Axes must be labelled I and V. [1]

- **(ii) Explanation:**
    - **M1**: In forward bias, the applied p.d. reduces the potential barrier/depletion region width, allowing charge carriers (electrons and holes) to cross the junction easily. [1]
    - **A1**: This results in a large current for a small increase in voltage beyond the threshold voltage. [1]
    - **A1**: In reverse bias, the p.d. increases the potential barrier/depletion region width, preventing the flow of majority charge carriers. Only a very small leakage current (due to minority carriers) can flow, hence the resistance is very high. [1]

### Standard Solution Steps

1.  **Part (a):**
    - First, calculate the radius from the given diameter, remembering to convert mm to m: $r = \frac{0.50 \times 10^{-3}}{2} = 0.25 \times 10^{-3} \, \text{m}$.
    - Next, calculate the cross-sectional area using $A = \pi r^2$.
    - Substitute the given resistivity $\rho$, length $L$, and the calculated area $A$ into the formula $R = \frac{\rho L}{A}$.
    - Compute the final resistance.
2.  **Part (b)(i):**
    - Draw axes, labelling the vertical axis 'Current / I' and the horizontal axis 'Voltage / V'.
    - For positive V (forward bias), draw a line along the V-axis until a small positive voltage (the 'turn-on' or 'threshold' voltage), then show a curve that rises steeply.
    - For negative V (reverse bias), draw a line that is almost flat along the V-axis, indicating very little to no current flow.
3.  **Part (b)(ii):**
    - **Forward Bias:** Explain that the external voltage works against the internal potential barrier of the p-n junction. Once this barrier is overcome, charge carriers can flow, and the diode's resistance becomes very low.
    - **Reverse Bias:** Explain that the external voltage reinforces the internal potential barrier, making it even harder for majority charge carriers to cross. This results in an extremely high resistance.

### Common Mistakes

- **Conceptual_Misconception**: Students often mix up resistance and resistivity. Forgetting that resistivity is a property of the material, while resistance depends on the object's dimensions.
- **Common_Mistakes**:
    1.  **Area Calculation**: Using diameter instead of radius in $A = \pi r^2$, or forgetting to square the radius. Forgetting to convert mm to m for the radius is also frequent.
    2.  **I-V Sketch Axes**: Swapping the I and V axes. While a V-I graph is also valid, an I-V graph is the standard convention and questions usually specify it.
    3.  **Vague Explanation**: For the diode, simply stating "it only lets current flow one way" is not sufficient for all marks. The explanation must refer to the potential barrier/depletion region and the effect of forward/reverse bias on it.

### Tags
electricity, resistivity, resistance, iv_characteristics, diode, semiconductor, filament_lamp, 9