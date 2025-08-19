## D.C. Circuits: Internal Resistance and Terminal Potential Difference

**Syllabus Reference**: 9702.10

**Learning Objective**: Use e.m.f., internal resistance and external resistance to determine current, terminal p.d. and power in D.C. circuits.

### Example Question
A battery has e.m.f. 12.0 V and internal resistance 0.50 Ω. It is connected to a parallel network of 6.0 Ω and 12.0 Ω resistors.

Diagram: Source with e.m.f. E and internal resistance r in series with a parallel branch of 6.0 Ω and 12.0 Ω.

(a) Show that the total external resistance is 4.0 Ω. [2]

(b) Calculate the total current from the battery. [2]

(c) Find the terminal p.d. across the battery. [2]

(d) Determine the power dissipated in the 6.0 Ω resistor. [3]

### Mark Scheme / Solution
- For parallel combination, 1/RP = 1/6.0 + 1/12.0 → RP = 4.0 Ω (M1, A1)
- Total circuit resistance R = RP + r = 4.0 + 0.50 = 4.50 Ω; I = E/R = 12.0/4.50 = 2.67 A (M1, A1)
- Terminal p.d. V = E − Ir = 12.0 − (2.67 × 0.50) = 10.7 V (or V = IRP = 2.67 × 4.0 = 10.7 V) (M1, A1)
- P6Ω = V2/R = (10.7)2/6.0 = 19.1 W (M1, A1)

### Standard Solution Steps
- Combine the parallel branch to find RP using 1/RP = 1/R1 + 1/R2.
- Add internal resistance: Rtotal = RP + r; compute I = E/Rtotal.
- Find terminal p.d. either by V = E − Ir or V = IRP.
- Use P = V2/R to get power in an individual parallel branch.

### Common Mistakes
- Using E instead of terminal p.d. when calculating branch power.
- Forgetting to add internal resistance to the external resistance before finding the current.
- Inverting 1/R incorrectly for the parallel calculation.

### Tags
internal_resistance, emf, terminal_potential_difference, power_dissipation, parallel_circuits, 10

---

## D.C. Circuits: Potential Divider with LDR

**Syllabus Reference**: 9702.10

**Learning Objective**: Apply the potential divider relation; describe how an LDR changes output voltage with light level.

### Example Question
In a light-sensing circuit, a 9.0 V supply feeds a series pair of a 15 kΩ fixed resistor R and an LDR. A voltmeter measures the p.d. across R.

(a) When the LDR is 2.5 kΩ (bright), calculate the voltmeter reading. [3]

(b) The room is darkened. State and explain the change to the voltmeter reading. [3]

### Mark Scheme / Solution
- Use Vout = Vin × R/(R + RLDR) = 9.0 × 15/(15 + 2.5) = 7.71 V (M1, C1, A1)
- Darker → RLDR increases → larger share of Vin across LDR → smaller share across R → voltmeter reading decreases (A1, M1, A1)

### Standard Solution Steps
- Identify the potential divider and which component the output is across.
- Substitute values into Vout = Vin × Rupper/(Rupper + Rlower) with consistent placement for the measured component.
- Explain qualitatively how increasing RLDR shifts the voltage division.

### Common Mistakes
- Inverting the ratio when applying the divider formula.
- Stating “voltage changes” without linking to how RLDR changes the share of Vin.
- Mixing up LDR behaviour (in dark, resistance increases).

### Tags
potential_divider, ldr, sensing_circuits, qualitative_analysis, 10