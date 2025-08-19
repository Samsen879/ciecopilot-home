```markdown
---
Syllabus_Reference: "9709_P4_4.1"
Topic: "Forces and Equilibrium"
Sub_Topic: "Equilibrium on an Inclined Plane"
Concept_Id: "FEP_01"
Difficulty_Profile:
  Cognitive_Load: "Medium"
  Procedural_Complexity: "Medium"
  Conceptual_Depth: "Moderate"
Tags:
  Topic_Tags:
    - "forces_equilibrium"
    - "inclined_plane"
    - "friction"
  Skill_Tags:
    - "resolving_forces"
    - "limiting_equilibrium"
  Question_Type_Tags:
    - "calculation"
    - "multi_part"
  AI_Tags: []
  Adaptive_Tags: []
API_Integration_Fields:
  Unique_Question_ID: "CIE9709P4_2025_M_41_Q1"
  Version: "1.0"
  Author: "Expert Analyst"
  Last_Updated: "2025-07-31"
---

### Problem Statement

A block of mass $10$ kg rests on a rough plane inclined at an angle of $30^\circ$ to the horizontal. The coefficient of static friction between the block and the plane is $0.4$. A force of magnitude $P$ N acts on the block, directed up the plane along a line of greatest slope. The block is in equilibrium.

(i) Find the greatest possible value of $P$.
(ii) Find the least possible value of $P$.

### Standard Solution Steps

1.  **Principle Identification & Initial Setup:**
    The block is in equilibrium, so the net force in any direction is zero. We resolve forces parallel and perpendicular to the inclined plane. The weight of the block is $W = mg = 10 \times 10 = 100$ N. The normal reaction force $R$ is found by resolving forces perpendicular to the plane.
    
    $R - W \cos(30^\circ) = 0$
    $R = 100 \cos(30^\circ) = 100 \times \frac{\sqrt{3}}{2} = 50\sqrt{3}$ N.
    
    The maximum possible friction force (limiting friction) is $F_{max} = \mu R$.
    $F_{max} = 0.4 \times 50\sqrt{3} = 20\sqrt{3}$ N (or $34.64...$ N).

2.  **Part (i) - Greatest value of $P$:**
    For the greatest value of $P$, the block is on the point of moving *up* the plane. Therefore, the frictional force $F$ acts *down* the plane and is at its maximum value, $F = F_{max}$. We resolve forces parallel to the plane.
    
    $P - W \sin(30^\circ) - F_{max} = 0$
    $P = W \sin(30^\circ) + F_{max}$

3.  **Equation Assembly and Solving for (i):**
    $P = 100 \sin(30^\circ) + 20\sqrt{3}$
    $P = 100 \times 0.5 + 20\sqrt{3}$
    $P = 50 + 20\sqrt{3}$
    $P = 84.641...$ N.

4.  **Part (ii) - Least value of $P$:**
    For the least value of $P$, the block is on the point of moving *down* the plane. Therefore, the frictional force $F$ acts *up* the plane and is at its maximum value, $F = F_{max}$. We resolve forces parallel to the plane.
    
    $P + F_{max} - W \sin(30^\circ) = 0$
    $P = W \sin(30^\circ) - F_{max}$

5.  **Equation Assembly and Solving for (ii):**
    $P = 100 \sin(30^\circ) - 20\sqrt{3}$
    $P = 50 - 20\sqrt{3}$
    $P = 15.358...$ N.

6.  **Final Answer:**
    (i) The greatest possible value of $P$ is $84.6$ N (3 s.f.).
    (ii) The least possible value of $P$ is $15.4$ N (3 s.f.).

### Marking Scheme

| Mark | Description                                                              |
| :--- | :----------------------------------------------------------------------- |
| **B1** | Correctly calculating the normal reaction $R = 50\sqrt{3}$ or $86.6$.           |
| **M1** | For using $F_{max} = \mu R$ with their calculated $R$.                             |
| **M1** | Setting up equilibrium equation parallel to plane for motion *up* the plane, with three terms and correct friction direction.    |
| **A1** | Correct greatest value of $P = 84.6$.                                           |
| **M1** | Setting up equilibrium equation parallel to plane for motion *down* the plane, with friction in the opposite direction.                           |
| **A1** | Correct least value of $P = 15.4$.                                           |

### Common Mistakes

- **Friction Direction:** Confusing the direction of the frictional force. For the greatest $P$, the block tends to move up, so friction acts down. For the least $P$, the block tends to slide down, so friction acts up.
- **Component Resolution:** Using $W$ ($100$ N) in the parallel equation instead of the component $W \sin(30^\circ)$.
- **Calculation of $F_{max}$:** Using the weight $W$ instead of the normal reaction $R$ to calculate the limiting friction (i.e., calculating $\mu W$ instead of $\mu R$).

### Expert Tips

- **Draw Two Diagrams:** For problems involving a range of values for a force, it's highly effective to draw two separate free-body diagrams: one for impending motion in one direction (e.g., up the slope) and another for impending motion in the opposite direction (down the slope). This makes the direction of friction in each case unambiguous.
- **Check for Self-Sustaining Equilibrium:** Before finding the 'least' value of $P$, it's a good habit to compare the component of weight down the slope ($W \sin \theta$) with the maximum static friction ($F_{max}$). If $W \sin \theta \le F_{max}$, the block can remain in equilibrium even with $P=0$, so the least value of $P$ would be $0$. In this case, $50 > 34.64$, so a positive force $P$ is required.

### Remediation Strategy

- **If struggling with friction direction:** Focus on the concept that friction is a *reactionary* force that *opposes motion or the tendency of motion*. Ask yourself, "If P were slightly larger, which way would the block move?" Friction opposes that. "If P were slightly smaller, which way would it move?" Friction opposes that.
- **If making resolution errors:** Consistently practice resolving the weight vector on inclined planes. Create a diagram showing that for an angle of inclination $\theta$, the component parallel to the plane is always $W \sin(\theta)$ and the component perpendicular is always $W \cos(\theta)$.

---
---

---
Syllabus_Reference: "9709_P4_4.1"
Topic: "Forces and Equilibrium"
Sub_Topic: "Connected Particles in Equilibrium"
Concept_Id: "FEP_02"
Difficulty_Profile:
  Cognitive_Load: "Medium"
  Procedural_Complexity: "Low"
  Conceptual_Depth: "Moderate"
Tags:
  Topic_Tags:
    - "forces_equilibrium"
    - "connected_particles"
    - "pulleys"
    - "friction"
  Skill_Tags:
    - "resolving_forces"
    - "system_equilibrium"
  Question_Type_Tags:
    - "calculation"
    - "multi_part"
  AI_Tags: []
  Adaptive_Tags: []
API_Integration_Fields:
  Unique_Question_ID: "CIE9709P4_2025_M_41_Q2"
  Version: "1.0"
  Author: "Expert Analyst"
  Last_Updated: "2025-07-31"
---

### Problem Statement

A particle $A$ of mass $5$ kg rests on a rough horizontal table. It is connected by a light inextensible string, which passes over a smooth pulley fixed at the edge of the table, to a particle $B$ of mass $2$ kg which hangs freely. The system is in equilibrium.

(i) Find the magnitude of the frictional force acting on particle $A$.

The coefficient of static friction between particle $A$ and the table is $0.6$. A third particle $C$ of mass $m$ kg is now attached to particle $B$.

(ii) Find the greatest possible value of $m$ for which particle $A$ remains in equilibrium.

### Standard Solution Steps

1.  **Principle Identification & Initial Setup (Part i):**
    The system is in equilibrium. We consider the forces acting on each particle separately. For particle $B$, the forces are its weight acting downwards and the tension $T$ in the string acting upwards.
    
2.  **Component Calculation (Part i):**
    Consider particle $B$: For equilibrium, the net force is zero.
    $T - W_B = 0$
    $T = 2g = 2 \times 10 = 20$ N.

    Consider particle $A$: The tension pulls $A$ towards the pulley. For equilibrium, the frictional force $F$ must oppose this tendency of motion and act away from the pulley.
    $T - F = 0$
    $F = T$

3.  **Final Answer (Part i):**
    The magnitude of the frictional force is $20$ N.

4.  **Principle Identification & Initial Setup (Part ii):**
    When particle $C$ is added, the new mass hanging is $(2+m)$ kg. For the greatest value of $m$, particle $A$ is on the point of sliding, so the friction on $A$ is limiting friction, $F_{max}$.

5.  **Component Calculation (Part ii):**
    First, calculate the maximum possible frictional force on $A$.
    Resolve forces vertically for $A$:
    $R - W_A = 0$
    $R = 5g = 5 \times 10 = 50$ N.

    The limiting friction is $F_{max} = \mu R$.
    $F_{max} = 0.6 \times 50 = 30$ N.

6.  **Equation Assembly and Solving (Part ii):**
    Consider the equilibrium of the combined hanging mass $(B+C)$. Let the new tension be $T'$.
    The weight is $W_{B+C} = (2+m)g = 10(2+m)$.
    For equilibrium, $T' = W_{B+C} = 10(2+m)$.

    For particle $A$ to be in limiting equilibrium, the tension pulling it must equal the maximum friction.
    $T' = F_{max}$
    $10(2+m) = 30$
    $2+m = 3$
    $m = 1$.

7.  **Final Answer (Part ii):**
    The greatest possible value of $m$ is $1$.

### Marking Scheme

| Mark | Description                                                              |
| :--- | :----------------------------------------------------------------------- |
| **M1** | (i) For considering the equilibrium of particle B to find the tension T. |
| **A1** | (i) Correctly finding the frictional force $F = 20$ N.                   |
| **B1** | (ii) Correctly calculating the normal reaction $R=50$ N on particle A.    |
| **M1** | (ii) For calculating the maximum frictional force using $F_{max} = \mu R$. |
| **M1** | (ii) For setting up the equilibrium equation for the combined hanging mass and for particle A, relating the new tension to $F_{max}$. |
| **A1** | (ii) For the correct final answer $m=1$.                               |

### Common Mistakes

- **Friction in Part (i):** Incorrectly assuming that friction is at its maximum value ($F_{max} = \mu R$) in part (i). In static equilibrium, friction is only as large as it needs to be to prevent motion.
- **Mass in Part (ii):** Forgetting to use the *total* hanging mass $(2+m)$ kg when calculating the new weight and tension.
- **Mixing Up Bodies:** Using the mass of the hanging particle to calculate the normal reaction on the particle on the table.

### Expert Tips

- **Isolate and Analyze:** Always analyze each body in the system separately. Draw a free-body diagram for each to identify all forces acting on it.
- **Tension is Key:** The tension in the string is the force that connects the two parts of the system. Finding the tension by analyzing the simpler part (usually the hanging block) is often the first step.
- **Friction States:** Be clear about the state of friction. Is it static equilibrium (where $F \le \mu R$) or limiting equilibrium (where $F = \mu R$)? The wording of the question ("in equilibrium", "about to move", "greatest/least value") is the clue.

### Remediation Strategy

- **Friction Concept:** Review the difference between static friction and limiting (maximum) static friction. Work through examples where an object is on a rough surface and the pulling force is gradually increased, and calculate the friction at each stage until it slips.
- **Connected Systems:** Practice setting up equilibrium equations for multiple simple connected particle systems (e.g., two particles on a table connected by a string) before adding complexities like pulleys and hanging masses.

---
---

---
Syllabus_Reference: "9709_P4_4.1"
Topic: "Forces and Equilibrium"
Sub_Topic: "Equilibrium under Coplanar Forces"
Concept_Id: "FEP_03"
Difficulty_Profile:
  Cognitive_Load: "Medium"
  Procedural_Complexity: "Medium"
  Conceptual_Depth: "Shallow"
Tags:
  Topic_Tags:
    - "forces_equilibrium"
    - "coplanar_forces"
  Skill_Tags:
    - "resolving_forces"
    - "simultaneous_equations"
    - "trigonometry"
  Question_Type_Tags:
    - "calculation"
  AI_Tags: []
  Adaptive_Tags: []
API_Integration_Fields:
  Unique_Question_ID: "CIE9709P4_2025_M_41_Q3"
  Version: "1.0"
  Author: "Expert Analyst"
  Last_Updated: "2025-07-31"
---

### Problem Statement

A particle of weight $50$ N is suspended in equilibrium by two light inextensible strings. One string is inclined at $60^\circ$ to the horizontal and the other is inclined at $45^\circ$ to the horizontal. Find the tensions in the two strings.

### Standard Solution Steps

1.  **Principle Identification & Initial Setup:**
    The particle is in equilibrium under the action of three forces: its weight ($W=50$ N), the tension in the first string ($T_1$), and the tension in the second string ($T_2$). We will resolve the forces horizontally and vertically. The net force in each direction is zero.

2.  **Horizontal Resolution:**
    The horizontal components of the tensions must balance. Let $T_1$ be the tension in the string at $60^\circ$ and $T_2$ be the tension in the string at $45^\circ$.
    
    $T_1 \cos(60^\circ) - T_2 \cos(45^\circ) = 0$
    $T_1 \times 0.5 = T_2 \times \frac{\sqrt{2}}{2}$
    $T_1 = \sqrt{2} T_2$ --- (1)

3.  **Vertical Resolution:**
    The sum of the upward vertical components of the tensions must balance the downward weight.
    
    $T_1 \sin(60^\circ) + T_2 \sin(45^\circ) - W = 0$
    $T_1 \frac{\sqrt{3}}{2} + T_2 \frac{\sqrt{2}}{2} = 50$ --- (2)

4.  **Equation Assembly and Solving:**
    We have a system of two simultaneous equations. Substitute equation (1) into equation (2).
    
    $(\sqrt{2} T_2) \frac{\sqrt{3}}{2} + T_2 \frac{\sqrt{2}}{2} = 50$
    $T_2 (\frac{\sqrt{6}}{2} + \frac{\sqrt{2}}{2}) = 50$
    $T_2 (\frac{\sqrt{6} + \sqrt{2}}{2}) = 50$
    $T_2 = \frac{100}{\sqrt{6} + \sqrt{2}}$
    $T_2 = 25.881...$ N.

    Now find $T_1$ using equation (1):
    $T_1 = \sqrt{2} \times T_2$
    $T_1 = \sqrt{2} \times 25.881... = 36.602...$ N.

5.  **Final Answer:**
    The tensions in the strings are $36.6$ N and $25.9$ N (to 3 s.f.).

### Marking Scheme

| Mark | Description                                                              |
| :--- | :----------------------------------------------------------------------- |
| **M1** | For resolving forces horizontally and setting the net horizontal force to zero. |
| **A1** | For a correct horizontal resolution equation (e.g., $T_1 \cos(60^\circ) = T_2 \cos(45^\circ)$). |
| **M1** | For resolving forces vertically and setting the sum of upward forces equal to the weight. |
| **A1** | For a correct vertical resolution equation (e.g., $T_1 \sin(60^\circ) + T_2 \sin(45^\circ) = 50$). |
| **M1** | For a complete method to solve the two simultaneous equations for either $T_1$ or $T_2$. |
| **A1** | For one correct tension value ($T_1=36.6$ or $T_2=25.9$).                  |
| **A1** | For the second correct tension value.                                     |

### Common Mistakes

- **Angle Errors:** Using the angle to the vertical instead of the horizontal, or confusing which angle belongs to which tension.
- **Trigonometric Errors:** Swapping `sin` and `cos` during resolution.
- **Algebraic Slips:** Making errors when solving the simultaneous equations, especially when dealing with surds.
- **Sign Errors:** Incorrectly setting up the initial equations, for example by having both horizontal components as positive.

### Expert Tips

- **Draw a Clear Diagram:** Start with a large, clear free-body diagram. Mark the horizontal and vertical lines passing through the particle. Clearly label all forces ($T_1, T_2, W$) and all given angles with respect to the horizontal. This single step prevents most resolution errors.
- **Check Reasonableness:** Once you have the answers, check if they make sense. The string that is more vertical (at $60^\circ$ to horizontal) should be taking more of the vertical load, so you might expect it to have a higher tension. Here, $T_1 > T_2$, which matches this intuition.
- **Alternative Method (Lami's Theorem):** For a particle in equilibrium under three forces, you can use Lami's Theorem: $\frac{A}{\sin \alpha} = \frac{B}{\sin \beta} = \frac{C}{\sin \gamma}$. While valid, resolving forces is more fundamental and universally applicable to problems with more than three forces.

### Remediation Strategy

- **Resolution Drills:** Practice resolving forces in various contexts. Use a worksheet with multiple force vectors at different angles and resolve each into horizontal and vertical components until it becomes second nature. Remember: "component *adjacent* to the angle uses `cos`" and "component *opposite* the angle uses `sin`".
- **Simultaneous Equations Practice:** If algebraic errors are the issue, revisit methods for solving simultaneous equations, including substitution and elimination. Practice with purely numerical examples before tackling ones with trigonometric values.
```