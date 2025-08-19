## Work, energy and power: Conservation of Energy

**Syllabus Reference**: 9702.5
**Learning Objective**: Apply the principle of conservation of energy to problems involving the conversion of energy between gravitational potential energy and kinetic energy. Understand work done against resistive forces.

 

### Example Question
A sledge of mass 8.0 kg starts from rest at the top of a smooth slope at point A, which is at a vertical height of 5.0 m above point B at the bottom of the slope. The sledge slides down the slope to point B.

 *(Descriptive text for a conceptual diagram)*

(a) State the principle of conservation of energy.
(b) Assuming the slope is perfectly smooth (no friction), calculate the speed of the sledge at point B.
(c) In reality, the slope is not smooth, and the sledge reaches point B with a speed of 9.0 m s⁻¹. Calculate:
    (i) the kinetic energy of the sledge at point B.
    (ii) the work done by the resistive forces as the sledge travels from A to B.

*Assume the acceleration of free fall, g, is 9.81 m s⁻².*

### Mark Scheme / Solution
(a) The principle of conservation of energy states that energy cannot be created or destroyed, only converted from one form to another. [B1]
In a closed system with no external forces, the total energy is constant.

(b) **Identify energy conversion:**
   Gravitational Potential Energy (GPE) at A is converted into Kinetic Energy (KE) at B. [M1]
   GPE lost = KE gained
   $mgh = \frac{1}{2}mv^2$ [C1]
   The mass 'm' cancels out: $gh = \frac{1}{2}v^2$
   $9.81 \times 5.0 = 0.5 \times v^2$ [M1]
   $49.05 = 0.5 \times v^2$
   $v^2 = 98.1$
   $v = \sqrt{98.1} = 9.904...$
   $v \approx 9.9$ m s⁻¹ [A1]

(c) (i) **Calculate final kinetic energy:**
   $E_k = \frac{1}{2}mv^2$
   $E_k = 0.5 \times 8.0 \times (9.0)^2$ [M1]
   $E_k = 0.5 \times 8.0 \times 81$
   $E_k = 324$ J [A1]

   (ii) **Calculate work done by resistive forces:**
   Work done by resistive forces = Initial GPE - Final KE [M1]
   Initial GPE at A = $mgh = 8.0 \times 9.81 \times 5.0 = 392.4$ J [C1]
   Work Done = $392.4 \text{ J} - 324 \text{ J}$
   Work Done = 68.4 J $\approx 68$ J [A1]
   *(This is the energy converted to thermal energy due to friction.)*

### Standard Solution Steps
- Identify the initial and final states (top and bottom).
- Compute initial energy (often GPE $mgh$).
- With no resistive forces, equate initial energy to final KE and solve for unknowns.
- With resistive forces, compute GPE and KE separately.
- Apply: Initial Energy = Final Energy + Work Done against Friction.
- Hence: Work Done = Initial GPE - Final KE.

### Common Mistakes
- Forgetting energy loss due to friction in part (c), reusing frictionless conservation.
- Missing the square on velocity in $E_k = \tfrac{1}{2}mv^2$ or missing the square root when solving for speed.
- Using the speed from (c) in part (b).
- Confusing work done by gravity with work done by resistive forces.

### Common Mistakes
- Forgetting friction losses and wrongly reusing the ideal (frictionless) model from part (b)
- Missing the square on velocity in $E_k=\tfrac{1}{2}mv^2$ or forgetting the square root when solving for $v$
- Using the speed from (c) in part (b)
- Confusing work done by gravity with work done by resistive forces

- **Remediation Path**: Emphasize the full form of the energy principle: `Initial Energy = Final Energy + Energy Transferred Out`. Use practical examples like rubbing hands together to show friction generating heat. Insist on writing down the formulas for GPE and KE before substituting numbers.

### Tags
work_energy_power, conservation_of_energy, kinetic_energy, potential_energy, friction, 5

---
## Work, energy and power: Work Done and Power

**Syllabus Reference**: 9702.5
**Learning Objective**: Define and calculate the work done by a force; define and calculate power as the rate of energy transfer.

 

### Example Question
A crate is pulled across a horizontal floor by a rope. The rope is inclined at an angle of 35° to the horizontal, and the tension in the rope is 90 N. The crate is pulled a distance of 15 m in a time of 12 s.

(a) Define work done by a force.
(b) Calculate the work done by the tension in the rope.
(c) Calculate the average power supplied by the rope.

### Mark Scheme / Solution
(a) Work done is the product of the force and the displacement in the direction of the force. [B1]
*(Alternatively: product of the displacement and the component of the force in the direction of displacement.)*

(b) **Identify force and displacement:**
   The component of the force in the direction of motion is $F \cos\theta$. [C1]
   Work Done, $W = (F \cos\theta) \times d$
   $F = 90$ N, $\theta = 35^\circ$, $d = 15$ m
   $W = (90 \times \cos(35^\circ)) \times 15$ [M1]
   $W = (90 \times 0.819) \times 15$
   $W = 73.71 \times 15 = 1105.7$ J
   $W \approx 1100$ J (to 2 s.f.) [A1]

(c) **Calculate average power:**
   Power is the rate of doing work, $P = \frac{W}{t}$. [C1]
   $P = \frac{1105.7 \text{ J}}{12 \text{ s}}$ [M1]
   $P = 92.14$ W
   $P \approx 92$ W (to 2 s.f.) [A1]

### Standard Solution Steps
- Step 1: Recall the definition of work done ($W=Fd\cos\theta$).
- Step 2: Draw a diagram to identify the force vector, the displacement vector, and the angle $\theta$ between them.
- Step 3: Calculate the component of the force that acts in the direction of the displacement ($F\cos\theta$).
- Step 4: Multiply this force component by the distance moved to find the work done.
- Step 5: Recall the definition of power ($P=W/t$).
- Step 6: Divide the work done by the time taken to find the average power.

### Common Mistakes
- Omitting the $\cos\theta$ factor when computing work.
- Using $\sin\theta$ instead of $\cos\theta$.
- Confusing work and power or using wrong units for power.

### Common Mistakes
- **Error Patterns**:
    - **Conceptual_Misconception**: Forgetting the $\cos\theta$ term and calculating work as $W = Fd = 90 \times 15$.
    - **Procedural_Error**: Using $\sin\theta$ instead of $\cos\theta$.
    - **Application_Error**: Calculator in radians mode instead of degrees.
    - **Common_Mistakes**: Confusing power and work, or force and power. Incorrect units (e.g., Joules for power).

- **Remediation Path**: Start with simple cases where the force and displacement are in the same direction ($\theta=0$, so $\cos\theta=1$). Then introduce angled forces and emphasize the concept of resolving the force vector. Use the analogy: "you only get credit for the part of your effort that actually moves the object forward."

### Tags
work, power, force, energy, trigonometry, rate_of_work, 5

---
## Work, energy and power: Power, Force and Velocity

**Syllabus Reference**: 9702.5
**Learning Objective**: Derive and apply the formula $P = Fv$ for the power developed by a force. Understand the concept of efficiency.

 

### Example Question
A car of mass 1200 kg travels along a straight, horizontal road at a constant speed of 25 m s⁻¹. The total resistive forces (friction and air resistance) acting on the car are constant and equal to 500 N.

(a) (i) Draw a free-body diagram showing the four main forces acting on the car.
    (ii) Explain why the driving force exerted by the engine must be equal to 500 N.
(b) Calculate the useful output power of the car's engine.
(c) The engine of the car has an efficiency of 20%. Calculate the rate at which the engine consumes fuel energy (the input power).
(d) The car now travels up a slope inclined at 2.0° to the horizontal, maintaining the same constant speed of 25 m s⁻¹. Calculate the new useful output power required from the engine.

### Mark Scheme / Solution
(a) (i) Diagram shows:
      - **Weight** ($W=mg$) acting vertically downwards from the centre of mass.
      - **Normal Contact Force** ($R$) acting vertically upwards from the road.
      - **Driving Force** ($F_D$) from the engine, acting horizontally forwards.
      - **Resistive Forces** ($F_R$) acting horizontally backwards. [B1 for all 4 forces correctly labelled]

    (ii) The car is moving at a *constant speed*, which means its acceleration is zero. [B1]
      According to Newton's First Law, if the acceleration is zero, the net force must be zero. Therefore, the forward driving force must be equal and opposite to the backward resistive forces. [B1]

(b) **Calculate output power:**
   Using the formula $P = Fv$, where $F$ is the driving force. [C1]
   $F = 500$ N, $v = 25$ m s⁻¹
   $P_{out} = 500 \times 25$ [M1]
   $P_{out} = 12500$ W (or 12.5 kW) [A1]

(c) **Calculate input power using efficiency:**
   Efficiency, $\eta = \frac{\text{Useful Power Out}}{\text{Total Power In}}$ [C1]
   $0.20 = \frac{12500}{P_{in}}$ [M1]
   $P_{in} = \frac{12500}{0.20} = 62500$ W (or 62.5 kW) [A1]

(d) **Calculate new driving force on the slope:**
   When moving up the slope, the engine must overcome both the resistive forces AND the component of the car's weight acting down the slope.
   Component of weight down slope = $mg \sin\theta$ [C1]
   Weight component = $1200 \times 9.81 \times \sin(2.0^\circ) = 410.8$ N [M1]
   New total force to overcome = Resistive forces + Weight component
   $F_{new} = 500 \text{ N} + 410.8 \text{ N} = 910.8$ N [M1]
   **Calculate new output power:**
   $P_{new} = F_{new} \times v$
   $P_{new} = 910.8 \times 25 = 22770$ W
   $P_{new} \approx 23000$ W (or 23 kW) [A1]

### Standard Solution Steps
- Step 1: Identify all forces acting on the object. If moving at a constant velocity, use Newton's First Law (Net Force = 0) to find the driving force.
- Step 2: Recall the formula for power: $P = Fv$. Ensure $F$ is the driving force and $v$ is the velocity in the direction of that force.
- Step 3: Substitute the values to find the useful output power.
- Step 4: If efficiency is involved, use the formula $\eta = P_{out} / P_{in}$ to find the required quantity.
- Step 5: If conditions change (e.g., moving up a slope), re-evaluate the forces. The driving force must now overcome additional forces (like a component of weight). Recalculate the required driving force before finding the new power.

### Common Mistakes
- Forgetting that at constant velocity the net force is zero (driving force equals resistive force).
- Resolving weight on a slope incorrectly (using cos instead of sin).
- Inverting the efficiency relation when finding input power.

### Common Mistakes
- **Error Patterns**:
    - **Conceptual_Misconception**: Forgetting that at constant velocity, driving force equals resistive force. On a slope, forgetting to include the component of weight as a force to be overcome.
    - **Procedural_Error**: Incorrectly resolving the weight vector on the slope (using cos instead of sin). Applying the efficiency formula upside down ($P_{in} = P_{out} \times \eta$).
    - **Application_Error**: Calculator in radians mode.
    - **Common_Mistakes**: Using the total weight 'mg' instead of the component 'mg sinθ' when calculating the force needed to go up a slope.

- **Remediation Path**: Strongly link this topic back to Dynamics. Insist on drawing a free-body diagram for every problem. Break down problems like (d) into steps: 1. What forces must be overcome? 2. Calculate the total force. 3. Use $P=Fv$.

### Tags
power, force, velocity, efficiency, newtons_laws, dynamics, friction, inclined_plane, 5
