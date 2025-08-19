## A2 Level Topic 19: Capacitance

**Syllabus Reference**: 9702.19
**Learning Objective**: Understand and use the definition of capacitance, the formula for energy stored, and the equations for capacitor discharge.

### Example Question
A capacitor of capacitance $2200 \mu$F is charged by a power supply to a potential difference of $12.0$ V.

(a) Define capacitance. [1]

(b) Calculate:
(i) the charge stored on the capacitor. [2]
(ii) the energy stored in the capacitor. [2]

(c) The fully charged capacitor is disconnected from the power supply and connected across a resistor of resistance $4.7$ k$\Omega$ to discharge.
(i) Show that the time constant of the discharge circuit is approximately 10 s. [2]
(ii) Calculate the potential difference across the capacitor after a time of $5.0$ s. [2]

### Mark Scheme / Solution
(a)
Capacitance is the ratio of charge stored on a body to the potential difference across it. OR Charge stored per unit potential difference. [B1]

(b)
(i) Using $C = \frac{Q}{V}$, so $Q = CV$
$Q = (2200 \times 10^{-6} \text{ F}) \times (12.0 \text{ V})$ [C1]
$Q = 0.0264$ C. (accept $2.6 \times 10^{-2}$ C) [A1]

(ii) Using $W = \frac{1}{2}QV$ or $W = \frac{1}{2}CV^2$
$W = \frac{1}{2} \times (0.0264 \text{ C}) \times (12.0 \text{ V})$ [C1]
$W = 0.158$ J (or 0.16 J) [A1]

(c)
(i) Time constant $\tau = RC$
$\tau = (4.7 \times 10^3 \, \Omega) \times (2200 \times 10^{-6} \text{ F})$ [M1]
$\tau = 10.34$ s $\approx 10$ s [A1]

(ii) Using the discharge equation $V = V_0 e^{-t/RC}$
$V = 12.0 \times e^{-5.0 / 10.34}$ [C1]
$V = 12.0 \times e^{-0.4835} = 12.0 \times 0.6166$
$V = 7.40$ V [A1]

### Standard Solution Steps
- For part (a), recall the definition $C=Q/V$ and state it in words.
- For part (b)(i), rearrange the capacitance formula to $Q=CV$. Ensure capacitance is converted from $\mu$F to F before calculating.
- For part (b)(ii), select a correct formula for energy stored, e.g., $W = \frac{1}{2}QV$ or $W = \frac{1}{2}CV^2$, and substitute the known values.
- For part (c)(i), use the formula for the time constant, $\tau=RC$. Ensure resistance is converted from k$\Omega$ to $\Omega$ and capacitance from $\mu$F to F.
- For part (c)(ii), use the exponential decay formula for voltage, $V = V_0 e^{-t/RC}$. Substitute the initial voltage $V_0$, time $t$, and the calculated time constant $RC$.

### Common Mistakes
- Unit conversion errors: Forgetting to convert microfarads ($\mu$F) to farads (F) and kilohms (k$\Omega$) to ohms ($\Omega$).
- Formula confusion for energy: Using incorrect variations of the energy formula, such as $W=CV^2$ or $W=QV$.
- Exponential decay calculation errors: Incorrectly entering the negative exponent into the calculator, or mixing up $t$ and the time constant $RC$ in the formula $V = V_0 e^{-t/RC}$.
- Confusing initial and final values: Using the voltage at time $t$ to calculate the initial energy, or using the initial charge to find the final current.
- Forgetting that the time constant is a specific value, $\tau=RC$, and not a variable.

### Tags
capacitance, energy_stored, capacitor_discharge, time_constant, 9702.19