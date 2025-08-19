## Progressive Waves: Graphical Analysis

**Syllabus Reference**: 9702.7.1
**Learning Objective**: understand and use the terms displacement, amplitude, phase difference, period, frequency, wavelength and speed; recall and use the wave equation $v = f\lambda$.

 

### Example Question
The graph shows the variation of displacement with time for a particle in a progressive wave.

[Visual Description: A sinusoidal graph of 'displacement / cm' (y-axis) versus 'time / ms' (x-axis). The wave starts at displacement 0, rises to a peak of +2.0 cm at t = 5 ms, returns to zero at t = 10 ms, reaches a trough of -2.0 cm at t = 15 ms, and completes one cycle at t = 20 ms.]

The speed of the wave is 300 m s⁻¹.

(a) From the graph, determine:
    (i) the amplitude of the wave.
    (ii) the period of the wave.
(b) Calculate the wavelength of the wave.
(c) Determine the phase difference, in radians, between the particle's displacement at $t = 5.0$ ms and its displacement at $t = 12.5$ ms.

### Mark Scheme / Solution
(a) (i) **Amplitude**: The maximum displacement from the equilibrium position.
   From the graph, the peak displacement is 2.0 cm.
   Amplitude = 2.0 cm or 0.020 m. [A1]

(a) (ii) **Period**: The time for one complete oscillation.
   From the graph, one cycle is completed in 20 ms.
   Period $T = 20$ ms or $0.020$ s. [A1]

(b) **Wavelength**:
   First, calculate frequency $f = 1/T$.
   $f = 1 / (20 \times 10^{-3} \text{ s}) = 50$ Hz. [C1]
   Then, use the wave equation $v = f\lambda$.
   $\lambda = v/f = 300 / 50$ [M1]
   $\lambda = 6.0$ m. [A1]

(c) **Phase Difference**:
   The time difference is $\Delta t = 12.5 - 5.0 = 7.5$ ms. [C1]
   The phase difference $\phi$ is related to the time difference $\Delta t$ by the formula:
   $\phi = \frac{\Delta t}{T} \times 2\pi$
   $\phi = \frac{7.5 \text{ ms}}{20 \text{ ms}} \times 2\pi$ [M1]
   $\phi = 0.375 \times 2\pi = 0.75\pi$ rad (or 2.36 rad). [A1]

### Standard Solution Steps
- **Step 1 (Part a):** Read the key features directly from the provided graph. The amplitude is the peak y-value. The period is the x-value for one full cycle. Pay close attention to the units on the axes (cm and ms).
- **Step 2 (Part b):** First, calculate the frequency using the relationship $f = 1/T$, where T is the period found in part (a). Ensure T is in seconds. Then, rearrange the wave equation ($v = f\lambda$) to solve for wavelength ($\lambda = v/f$).
- **Step 3 (Part c):** Calculate the time interval ($\Delta t$) between the two points in question. Express this interval as a fraction of the full period ($T$). The phase difference in radians is this fraction multiplied by $2\pi$.

 

### Common Mistakes
- Confusing displacement–time vs displacement–distance graphs (period vs wavelength)
- Using $v=f\lambda$ without先计算 $f=1/T$
- 单位换算错误（ms→s，cm→m）
- 相位差未乘 $2\pi$ 或角度/弧度混用

 

 

 

### Tags
progressive_wave, wave_equation, phase_difference, amplitude, period, frequency, graphical_analysis

---

## Doppler Effect for a Moving Source

**Syllabus Reference**: 9702.7.3
**Learning Objective**: understand and use the equation for the observed frequency when a source of sound waves moves relative to a stationary observer: $f_o = f_s \frac{v}{v \pm v_s}$.

 

### Example Question
An ambulance has a siren that emits a sound of a constant frequency of 650 Hz. It travels at a constant speed of 35 m s⁻¹ away from a stationary person waiting at a bus stop.
The speed of sound in the air is 340 m s⁻¹.

(a) Explain, in terms of wavefronts, why the frequency of the sound heard by the person is lower than 650 Hz.
(b) Calculate the frequency of the sound heard by the stationary person.

### Mark Scheme / Solution
(a) **Explanation**:
   - As the ambulance moves away from the person, it emits successive wavefronts. [B1]
   - Each subsequent wavefront is emitted from a position further away from the person. This causes the distance between consecutive wavefronts (the wavelength) to be stretched or increased. [B1]
   - Since wave speed $v$ is constant, and $v = f\lambda$, an increase in wavelength $\lambda$ results in a decrease in the observed frequency $f$. [B1]

(b) **Calculation**:
   Use the Doppler effect formula for a source moving away from a stationary observer:
   $f_o = f_s \left( \frac{v}{v + v_s} \right)$ [C1]
   Given: $f_s = 650$ Hz, $v = 340$ m s⁻¹, $v_s = 35$ m s⁻¹.
   $f_o = 650 \left( \frac{340}{340 + 35} \right)$ [M1]
   $f_o = 650 \left( \frac{340}{375} \right)$
   $f_o = 589.33...$ Hz
   $f_o \approx 590$ Hz (to 2 significant figures, consistent with $v_s$). [A1]

### Standard Solution Steps
- **Step 1 (Part a):** Start by describing the motion of the source. Explain that because the source is moving away, it is "running away" from the waves it produces in the direction of the observer. This increases the separation between wavefronts.
- **Step 2:** Link the increased separation of wavefronts to an increased (stretched) wavelength.
- **Step 3:** Use the wave equation ($v=f\lambda$) to logically deduce that since the wave speed in the medium is constant, an increased wavelength must correspond to a decreased frequency.
- **Step 4 (Part b):** Recall the Doppler effect formula. Identify that for a source moving *away*, the relative speed of the waves with respect to the source increases, so the denominator must be $v + v_s$.
- **Step 5:** Substitute the given values into the correct formula and calculate the result. State the final answer to an appropriate number of significant figures.

 

### Common Mistakes
- 用响度解释频率变化而非波阵面间距
- 公式分母号使用错误（靠近用 $v-v_s$，远离用 $v+v_s$）
- 混淆 $v_s$ 与 $v$
- 颠倒分式或算术疏忽

 

 

 

### Tags
doppler_effect, sound_waves, frequency_shift, wavefronts, moving_source

---

## Polarisation and Malus's Law

**Syllabus Reference**: 9702.7.5, 9702.7.2
**Learning Objective**: describe the phenomenon of polarisation as a property of transverse waves; understand the distinction between transverse and longitudinal waves.

 

### Example Question
(a) Explain why polarisation is evidence for the transverse nature of electromagnetic waves.

(b) Unpolarised light of initial intensity $I_0$ is incident on a polarising filter, P1. The light transmitted by P1 is then incident on a second polarising filter, P2. The transmission axis of P2 is at an angle of 30° to the transmission axis of P1.

    (i) State the intensity of the light transmitted by P1, in terms of $I_0$.
    (ii) Calculate the final intensity of the light transmitted by P2, in terms of $I_0$.

### Mark Scheme / Solution
(a) **Explanation**:
   - Transverse waves have oscillations in many planes, all of which are perpendicular to the direction of energy transfer. [B1]
   - Polarisation is the process of restricting these oscillations to a single plane. A polarising filter works by only allowing oscillations aligned with its transmission axis to pass through. [B1]
   - Longitudinal waves have oscillations that are parallel to the direction of energy transfer. Since there is only one possible direction of oscillation, they cannot be restricted to a specific plane and thus cannot be polarised. Therefore, the fact that light can be polarised proves it is a transverse wave. [B1]

(b) (i) **Intensity after P1**:
   When unpolarised light passes through the first polariser, its intensity is halved.
   Intensity = $\frac{1}{2} I_0$ or $0.5 I_0$. [A1]

(b) (ii) **Intensity after P2**:
   The light incident on P2 is now polarised with intensity $I_1 = \frac{1}{2} I_0$.
   Use Malus's Law: $I_{out} = I_{in} \cos^2\theta$ [C1]
   Here, $I_{in} = I_1 = \frac{1}{2} I_0$ and $\theta = 30^\circ$.
   $I_2 = (\frac{1}{2} I_0) \times \cos^2(30^\circ)$ [M1]
   We know $\cos(30^\circ) = \frac{\sqrt{3}}{2}$. So, $\cos^2(30^\circ) = (\frac{\sqrt{3}}{2})^2 = \frac{3}{4} = 0.75$.
   $I_2 = (\frac{1}{2} I_0) \times 0.75$
   $I_2 = 0.375 I_0$ or $\frac{3}{8} I_0$. [A1]

### Standard Solution Steps
- **Step 1 (Part a):** Define transverse and longitudinal waves in terms of their direction of oscillation relative to energy transfer. Define polarisation as the restriction of oscillations to a single plane. Logically connect these definitions to show that only a wave with multiple planes of oscillation (transverse) can be restricted in this way.
- **Step 2 (Part b i):** Recall the rule for the first polariser: an ideal polariser reduces the intensity of incident unpolarised light by exactly 50%.
- **Step 3 (Part b ii):** Recall Malus's Law ($I = I_{in} \cos^2\theta$). Identify the correct input intensity for this step, which is the output from the first filter ($I_1$).
- **Step 4:** Substitute the intensity from step 2 and the given angle into Malus's law. Ensure the calculator is in degrees mode and remember to square the cosine value to find the final intensity.

 

### Common Mistakes
- 误把马吕斯定律用于未极化光
- 多步计算时错误选用输入强度
- 遗漏平方：用 $\cos\theta$ 替代 $\cos^2\theta$
- 角度/弧度模式错误

**Remediation Path**: Use physical polarising filters in class to demonstrate the effect. Show how rotating the second filter changes the brightness. Emphasise the "two rules for two situations" approach to avoid confusion.

 

 

### Tags
polarisation, transverse_wave, malus_law, intensity, electromagnetic_wave