## Alternating Currents: RMS, Rectification and Smoothing

**Syllabus Reference**: 9702.21
**Learning Objective**: Understand and apply the concepts of root-mean-square (RMS) values for alternating currents and voltages, and analyse the action of a full-wave rectifier and a smoothing capacitor.

### Example Question
(a) Define the root-mean-square (RMS) value of an alternating voltage.

(b) An alternating voltage supply has a peak value of 15.0 V and a frequency of 50 Hz. It is connected to a 100 Ω resistor. Calculate the RMS voltage of the supply.

(c) The supply is now connected to the input terminals P and Q of a bridge rectifier, as shown in Fig. 21.1. The 100 Ω resistor is connected across the output terminals X and Y.


*Fig. 21.1*

(i) On a copy of Fig. 21.1, draw arrows to show the path of conventional current through the circuit during the half-cycle when terminal P is positive with respect to terminal Q.
(ii) Sketch a graph to show the variation of the potential difference (p.d.) across the resistor with time for two complete cycles of the input voltage. Label the axes with appropriate values.

(d) A capacitor is connected in parallel with the resistor R to smooth the output voltage.
(i) Explain the action of the capacitor.
(ii) On your graph from (c)(ii), add a line to show the smoothed output p.d.

### Mark Scheme / Solution
- **(a)** The RMS value of an alternating voltage is the value of the direct voltage... (B1)
  ...that would produce the same heating effect (or dissipate the same power) in the same resistor. (B1)

- **(b)** Correct formula: $V_{RMS} = \frac{V_0}{\sqrt{2}}$. (C1)
  Calculation: $V_{RMS} = \frac{15.0}{\sqrt{2}} = 10.6$ V. (A1)

- **(c)(i)** Correct path shown from P, through the correct diode (e.g., D1), through the resistor from X to Y, and back through the second correct diode (e.g., D3) to Q. (B1)

- **(c)(ii)** Graph shows a full-wave rectified sine wave (all positive humps). (B1)
  Correct period shown (one input cycle of $T = 1/50 = 0.02$ s or 20 ms contains two humps). Peak voltage labelled as 15 V (or slightly less due to diode voltage drop, e.g., ~13.6 V, but 15 V is acceptable). (B1)

- **(d)(i)** When the input voltage is rising, the capacitor charges up. (M1)
  When the input voltage falls below the p.d. across the capacitor, the capacitor discharges through the resistor, maintaining the voltage. (A1)

- **(d)(ii)** Line drawn on graph from (c)(ii) showing a ripple effect: voltage rises to the peak and then shows a shallow, curved decay until the next peak recharges it. The smoothed voltage does not fall to zero. (B1)

### Standard Solution Steps
- **Part (a): Definition.** Recall the standard definition of RMS value. The key is to relate the AC value to an equivalent DC value based on the principle of power or heating effect ($P = V^2/R$).
- **Part (b): RMS Calculation.** Identify the formula relating peak voltage ($V_0$) and RMS voltage ($V_{RMS}$): $V_{RMS} = V_0 / \sqrt{2}$. Substitute the given peak value to find the answer.
- **Part (c)(i): Rectifier Path.** Trace the path of conventional current (from positive to negative). When P is positive, current flows from P. It can only pass through one of the two connected diodes. Follow the path through the load resistor (from X to Y) and then find the return path through another diode back to the negative terminal Q.
- **Part (c)(ii): Rectified Waveform.** A full-wave rectifier inverts the negative half-cycles of the AC input. The output is a series of positive humps. Since the input frequency is 50 Hz, its period is $1/50 = 20$ ms. The rectified output will have a frequency of 100 Hz, meaning its period is 10 ms. The sketch should show two full cycles of the input, which corresponds to four humps in the output over 40 ms. The peak voltage is the input peak voltage (minus the small voltage drop across two diodes, though labelling it as 15V is often accepted at this level).
- **Part (d)(i): Smoothing Explanation.** Explain the charge-discharge cycle. The capacitor acts as a temporary energy store. It charges when the rectified voltage is near its peak. As the rectified voltage starts to fall, the capacitor's voltage is higher, so it begins to discharge through the load resistor, "filling in" the troughs in the signal.
- **Part (d)(ii): Smoothed Waveform.** On the previous graph, draw a line that follows the rising edge of each rectified hump but then, from the peak, decays exponentially (as a shallow curve) until it meets the rising edge of the next hump. This creates a "sawtooth" or ripple waveform with a much higher average DC value.

### Common Mistakes
-   **RMS Calculation:** Using $V_{RMS} = V_0 \times \sqrt{2}$ instead of dividing. Forgetting the difference between peak and RMS values.
-   **Rectifier Path:** Drawing the current path through the wrong diodes or showing it splitting. In each half-cycle, current only flows through two specific diodes.
-   **Rectified Graph:** Drawing a half-wave rectified signal (every second hump missing) instead of a full-wave signal. Incorrectly labelling the time axis; the period of the rectified signal is half that of the input AC.
-   **Smoothing Explanation:** Providing a vague answer like "it smooths the current" without explaining the charge/discharge mechanism.
-   **Smoothed Graph:** Drawing the smoothed line incorrectly, for example, having it drop back to zero or drawing it as a straight line instead of a shallow curve.

### Tags
alternating_currents, rms, rectification, full_wave_rectifier, smoothing, capacitor, diode, 21