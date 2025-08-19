## Nuclear Physics: Binding Energy & Radioactive Decay

**Syllabus Reference**: 9702.23
**Learning Objective**: Understand the concepts of mass defect, binding energy, and the mathematical principles of radioactive decay, including half-life and the decay constant.

### Example Question
The nucleus of Polonium-210, $\ce{^{210}_{84}Po}$, is a radioactive alpha-emitter.

**Data:**
- Mass of a proton = 1.007276 u
- Mass of a neutron = 1.008665 u
- Mass of a Polonium-210 nucleus = 209.937220 u
- Half-life of Polonium-210 = 138 days
- 1 u (unified atomic mass unit) is equivalent to 931.5 MeV.

(a) (i) Define *mass defect*.
(a) (ii) Define *binding energy* of a nucleus.

(b) Calculate the binding energy per nucleon, in MeV, for the Polonium-210 nucleus.

(c) Polonium-210 decays into a stable isotope of lead (Pb). Write down the nuclear equation for this decay.

(d) For a sample of Polonium-210, calculate:
(d) (i) the decay constant, in s⁻¹.
(d) (ii) the time required for the number of undecayed Polonium-210 nuclei to decrease to 20% of its initial number.

### Mark Scheme / Solution
(a) (i) The difference between the total mass of the individual, separate nucleons (protons and neutrons) and the mass of the nucleus. [A1]
(a) (ii) The minimum energy required to completely separate all the nucleons of a nucleus to infinity. (Alternatively: the energy released when a nucleus is formed from its constituent nucleons). [A1]

(b) Number of protons ($Z$) = 84. Number of neutrons ($N$) = 210 - 84 = 126. [M1]
Total mass of constituent nucleons = ($84 \times 1.007276 \text{ u}) + (126 \times 1.008665 \text{ u})$
$= 84.611184 \text{ u} + 127.09179 \text{ u} = 211.702974 \text{ u}$ [M1]
Mass defect $\Delta m = 211.702974 \text{ u} - 209.937220 \text{ u} = 1.765754 \text{ u}$ [A1]
Binding energy = $1.765754 \text{ u} \times 931.5 \text{ MeV/u} = 1644.6$ MeV [M1]
Binding energy per nucleon = $\frac{1644.6 \text{ MeV}}{210} = 7.83$ MeV [A1]

(c) $\ce{^{210}_{84}Po -> ^{206}_{82}Pb + ^{4}_{2}He}$
[A1] for the correct daughter nucleus ($\ce{^{206}_{82}Pb}$).
[A1] for the correct alpha particle ($\ce{^{4}_{2}He}$), also written as $\alpha$.

(d) (i) Convert half-life to seconds:
$t_{1/2} = 138 \text{ days} \times 24 \text{ hr/day} \times 3600 \text{ s/hr} = 1.192 \times 10^7$ s [M1]
Use the formula $\lambda = \frac{\ln(2)}{t_{1/2}}$. [C1]
$\lambda = \frac{0.693}{1.192 \times 10^7 \text{ s}} = 5.81 \times 10^{-8}$ s⁻¹ [A1]

(d) (ii) Use the decay equation $N = N_0 e^{-\lambda t}$. We are given $N = 0.20 N_0$. [C1]
$0.20 N_0 = N_0 e^{-\lambda t}$
$0.20 = e^{-\lambda t}$
$\ln(0.20) = -\lambda t$ [M1]
$t = \frac{-\ln(0.20)}{\lambda} = \frac{-(-1.6094)}{5.81 \times 10^{-8} \text{ s⁻¹}} = 2.77 \times 10^7$ s [A1]
(This is approximately 320 days).

### Standard Solution Steps
- Part (a): Recall definitions of mass defect and binding energy; relate via $E=mc^2$
- Part (b):
  - Find Z and N, compute total separate nucleon mass
  - Compute mass defect $\Delta m$ and convert to MeV
  - Divide by A to get binding energy per nucleon
- Part (c): Conserve nucleon and proton numbers to write decay equation
- Part (d): Convert half-life to seconds, compute $\lambda=\ln 2 / t_{1/2}$; use $N=N_0 e^{-\lambda t}$ to solve for $t$

### Common Mistakes
- Confusing the definitions of mass defect (a mass) and binding energy (an energy).
- In binding energy calculations, making arithmetic errors when summing the masses of all constituent nucleons.
- Forgetting to divide the total binding energy by the nucleon number (A) when asked for the binding energy *per nucleon*.
- Incorrectly balancing the nucleon and proton numbers in the nuclear decay equation.
- Forgetting to convert the half-life into SI units (seconds) before calculating the decay constant, leading to an incorrect unit for $\lambda$.
- Errors in algebraic manipulation of the exponential decay equation, such as mishandling the negative sign or using base-10 logarithms (`log`) instead of natural logarithms (`ln`).
- Using the mass of the atom instead of the nucleus if both are provided. The binding energy calculation specifically concerns the constituents of the nucleus.

### Tags
nuclear_physics, binding_energy, mass_defect, radioactive_decay, alpha_decay, half_life, decay_constant, e_mc2, 23