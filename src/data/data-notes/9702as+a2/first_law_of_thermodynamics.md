 
---
title: "The First Law of Thermodynamics"
syllabus_code: "9702"
level: "A2"
paper: "4"
topic: "Thermodynamics"
sub_topic: "16.1 The First Law of Thermodynamics"
---

### Learning Objectives

- (a) understand that internal energy is the sum of the random distribution of kinetic and potential energies of the molecules of a system
- (b) understand that a rise in temperature of a body leads to an increase in its internal energy
- (c) define the first law of thermodynamics as $\Delta U = Q + W$, where $Q$ is the heat supplied to the system and $W$ is the work done on the system
- (d) recall and use the first law of thermodynamics
- (e) show an understanding that for a gas expanding against a constant external pressure, the work done *by* the gas is $p\Delta V$ and therefore work done *on* the gas is $-p\Delta V$

### Core Concepts

#### 1. Internal Energy ($U$)
Internal energy is the sum of the random distribution of kinetic and potential energies of the molecules within a system.
- *Kinetic Energy*: Arises from the random, translational, and rotational motion of molecules. This component is directly proportional to the thermodynamic temperature of the system.
- *Potential Energy*: Arises from the intermolecular forces between molecules. For an ideal gas, these forces are assumed to be negligible, so the internal energy consists almost entirely of kinetic energy.

An increase in the temperature of a system will always result in an increase in its internal energy ($\Delta T > 0 \implies \Delta U > 0$).

#### 2. Work Done ($W$)
Work is done on or by a system when its volume changes. For a gas expanding or being compressed against a constant external pressure *p*, the work done *by* the gas is given by $p\Delta V$.

The first law of thermodynamics uses the convention of *work done on the system*.
- When a gas expands, its volume increases ($\Delta V > 0$). It does work on the surroundings, so the work done *on* the gas is negative.
- When a gas is compressed, its volume decreases ($\Delta V < 0$). Work is done on the gas by the surroundings, so the work done *on* the gas is positive.

Therefore, the work done *on the gas* at constant pressure is:
$$ W = -p\Delta V $$
where $\Delta V$ is the change in volume ($V_{final} - V_{initial}$).

#### 3. Heat ($Q$)
Heat is the transfer of thermal energy between a system and its surroundings due to a temperature difference.
- If heat is supplied *to* the system, $Q$ is positive.
- If heat is removed *from* the system, $Q$ is negative.

#### 4. The First Law of Thermodynamics
The first law is a statement of the principle of conservation of energy applied to a thermodynamic system. It states that the increase in internal energy of a system ($\Delta U$) is equal to the sum of the heat supplied *to* the system ($Q$) and the work done *on* the system ($W$).

The equation is:
$$ \Delta U = Q + W $$

Key sign conventions:
- $\Delta U$: positive for internal energy increase; negative for decrease
- $Q$: positive when heat enters the system; negative when heat leaves
- $W$: positive when work is done on the system (compression); negative when done by the system (expansion)

### Worked Example

#### Question 1
A fixed mass of an ideal gas is heated, causing it to expand at a constant pressure of $1.80 \times 10^5$ Pa. The volume of the gas increases from $2.50 \times 10^{-3}$ m$^3$ to $4.10 \times 10^{-3}$ m$^3$. During this process, $950$ J of thermal energy is supplied to the gas.

(a) Calculate the work done on the gas.
(b) Determine the increase in the internal energy of the gas.

#### Solution 1
(a)
1.  Identify the formula for work done on the gas at constant pressure: $W = -p\Delta V$.
2.  Calculate the change in volume, $\Delta V$:
    $\Delta V = V_{final} - V_{initial} = (4.10 \times 10^{-3}) - (2.50 \times 10^{-3}) = 1.60 \times 10^{-3}$ m$^3$.
3.  Substitute the values for pressure and change in volume:
    $W = -(1.80 \times 10^5 \text{ Pa}) \times (1.60 \times 10^{-3} \text{ m}^3)$
    $W = -288$ J.
    The work done *on* the gas is $-288$ J.

(b)
1.  State the first law of thermodynamics: $\Delta U = Q + W$.
2.  Identify the given values with their correct signs:
    - Heat supplied *to* the gas, $Q = +950$ J.
    - Work done *on* the gas, $W = -288$ J (from part a).
3.  Substitute these values into the equation:
    $\Delta U = 950 + (-288)$
    $\Delta U = +662$ J.
    The increase in internal energy is $662$ J.

#### Question 2
A sample of gas is contained in a cylinder. In one process, $500$ J of work is done to compress the gas. During the compression, $210$ J of heat is transferred from the gas to the surroundings.

(a) State the values of $W$ and $Q$ for this process.
(b) Calculate the change in internal energy of the gas.
(c) State whether the temperature of the gas increases or decreases, and explain your reasoning.

#### Solution 2
(a)
-   Work is done *on* the gas (compression), so $W$ is positive. $W = +500$ J.
-   Heat is transferred *from* the gas, so $Q$ is negative. $Q = -210$ J.

(b)
1.  Apply the first law of thermodynamics: $\Delta U = Q + W$.
2.  Substitute the values from part (a):
    $\Delta U = (-210) + 500$
    $\Delta U = +290$ J.
    The change in internal energy is an increase of $290$ J.

(c)
The temperature of the gas *increases*.
*Explanation:* The internal energy of the gas has increased ($\Delta U$ is positive). For a fixed mass of gas, the internal energy is directly related to its temperature. Therefore, an increase in internal energy corresponds to an increase in temperature.

### Common Pitfalls & Exam Tips

- *Sign Convention Errors*: This is the most frequent source of mistakes. Always be clear about the definitions in $\Delta U = Q + W$. Does $Q$ represent heat *in* or *out*? Does $W$ represent work done *on* or *by* the system? The CAIE syllabus convention is heat *in* (+) and work *on* (+). It is helpful to write down the signs of $Q$ and $W$ before calculating.

- *Work Done Calculation*: Remember that the work done *on* the gas is negative during expansion ($\Delta V > 0$) and positive during compression ($\Delta V < 0$). Do not forget the negative sign in the formula $W = -p\Delta V$.

- *Units*: Ensure all quantities are in SI base units before calculation. Pressure must be in pascals (Pa), not kPa or atm. Volume must be in cubic metres (m$^3$), not litres or cm$^3$.

- *Internal Energy of an Ideal Gas*: For an ideal gas, internal energy depends only on its temperature. If a process is *isothermal* (constant temperature), then the change in internal energy $\Delta U$ is zero. In this special case, the first law simplifies to $Q = -W$. This means any heat supplied to the gas is used entirely to do work on the surroundings.

- *State vs. Path Functions*: The change in internal energy, $\Delta U$, depends only on the initial and final states (e.g., initial and final temperature/pressure/volume). It is a *state function*. The heat transferred ($Q$) and work done ($W$) depend on the specific path taken between the two states. They are *path functions*.
 

## Thermodynamics: First Law and Sign Conventions

**Syllabus Reference**: 9702.16
**Learning Objective**: Apply the first law of thermodynamics to changes in internal energy, heat, and work; use $W=-p\Delta V$ for constant-pressure processes.

### Example Question
An ideal gas expands at constant pressure $p=1.80\times10^5$ Pa from $2.50\times10^{-3}$ m$^3$ to $4.10\times10^{-3}$ m$^3$ while receiving $950$ J of heat. Find the work done on the gas and the change in internal energy.

### Mark Scheme / Solution
- Calculate $\Delta V$: $\Delta V=1.60\times10^{-3}$ m$^3$ (C1)
- Use $W=-p\Delta V$: $W=-(1.80\times10^5)(1.60\times10^{-3})=-288$ J (M1)(C1)
- First law $\Delta U=Q+W$: $\Delta U=950+(-288)=+662$ J (M1)(A1)

### Standard Solution Steps
- Identify given $p, V_1, V_2, Q$ and compute $\Delta V$
- Determine sign of work using $W=-p\Delta V$
- Apply $\Delta U=Q+W$ and compute

### Common Mistakes
- Wrong sign for work on expansion/compression
- Mixing sign conventions for $Q$ and $W$
- Using $W=p\Delta V$ instead of $W=-p\Delta V$

### Tags
thermodynamics, first_law, internal_energy, work_done, 16