## Forces and Equilibrium: Equilibrium of a Particle

**Syllabus Reference**: 9709.P4.4.1
**Learning Objective**: Resolve forces and apply the conditions for the equilibrium of a particle under a set of coplanar forces.

### Example Question
A particle of weight $W$ N is held in equilibrium by two forces. The first force has magnitude $8$ N and acts at an angle of $60^\circ$ above the horizontal. The second force has magnitude $F$ N and acts horizontally. The particle and all forces are in the same vertical plane. Find the values of $F$ and $W$.

### Mark Scheme / Solution
Resolving forces vertically:
$8 \sin(60^\circ) - W = 0$ (M1)
$W = 8 \times \frac{\sqrt{3}}{2} = 4\sqrt{3}$
$W = 6.93$ (to 3 s.f.) (A1)

Resolving forces horizontally:
$F - 8 \cos(60^\circ) = 0$ (M1)
$F = 8 \times 0.5 = 4$
$F = 4.00$ (A1)

### Standard Solution Steps
- Identify that for a particle to be in equilibrium, the net force in any direction must be zero.
- Draw a clear diagram showing all forces acting on the particle (weight, applied forces).
- Resolve all forces into horizontal ($x$) and vertical ($y$) components.
- Set the sum of the horizontal components to zero ($\Sigma F_x = 0$) and solve for an unknown.
- Set the sum of the vertical components to zero ($\Sigma F_y = 0$) and solve for the other unknown.

### Common Mistakes
- Confusing sine and cosine when resolving forces. Remember SOH CAH TOA: the component opposite the angle uses sine, and the component adjacent uses cosine.
- Sign errors in the equations. A consistent coordinate system is essential (e.g., right is positive, up is positive). Forces acting left or down should be negative.
- Forgetting to include the particle's weight as a downward vertical force.

### Tags
forces, equilibrium, resolving forces, statics, coplanar forces, calculation

## Forces and Equilibrium: Object on a Rough Inclined Plane

**Syllabus Reference**: 9709.P4.4.1
**Learning Objective**: Apply equilibrium principles to a body on a rough inclined plane, including the concept of limiting friction ($F \leq \mu R$).

### Example Question
A box of mass $20$ kg rests on a rough plane inclined at an angle of $25^\circ$ to the horizontal. The coefficient of friction between the box and the plane is $\mu$. Use $g = 10$ m s$^{-2}$.

(i) The box is in equilibrium and on the point of sliding down the plane. Find the value of $\mu$ correct to 3 significant figures.

(ii) A force of magnitude $P$ N, acting parallel to the plane and up the line of greatest slope, is applied to the box. The box is now in limiting equilibrium and on the point of moving up the plane. Find the value of $P$.

### Mark Scheme / Solution
(i)
Resolve forces perpendicular to the plane:
$R - 20g \cos(25^\circ) = 0 \implies R = 200 \cos(25^\circ)$ (B1)

Resolve forces parallel to the plane (friction acts up the plane):
$F - 20g \sin(25^\circ) = 0 \implies F = 200 \sin(25^\circ)$ (M1)

The box is in limiting equilibrium, so $F = \mu R$. (M1)
$\mu (200 \cos(25^\circ)) = 200 \sin(25^\circ)$
$\mu = \frac{200 \sin(25^\circ)}{200 \cos(25^\circ)} = \tan(25^\circ)$
$\mu = 0.4663... = 0.466$ (to 3 s.f.) (A1)

(ii)
The normal reaction $R$ is unchanged: $R = 200 \cos(25^\circ)$.
Resolve forces parallel to the plane (friction now acts down the plane):
$P - F - 20g \sin(25^\circ) = 0$ (M1)

Friction is limiting, so $F = \mu R = 0.4663... \times (200 \cos(25^\circ))$. (M1)
$P = F + 20g \sin(25^\circ)$
$P = \mu (200 \cos(25^\circ)) + 200 \sin(25^\circ)$
$P = (\tan(25^\circ))(200 \cos(25^\circ)) + 200 \sin(25^\circ)$
$P = 200 \sin(25^\circ) + 200 \sin(25^\circ) = 400 \sin(25^\circ)$ (A1)
$P = 169.04... = 169$ (to 3 s.f.) (A1)

### Standard Solution Steps
- Draw a clear force diagram for each situation, labelling Weight ($mg$), Normal Reaction ($R$), Friction ($F$), and any applied forces.
- Resolve forces perpendicular to the plane to find the Normal Reaction, $R$.
- Resolve forces parallel to the plane. Critically, ensure the direction of friction ($F$) opposes the direction of *impending motion*.
- Apply the condition for limiting equilibrium, $F = \mu R$.
- Solve the resulting equations for the unknown quantity, using an unrounded value for $\mu$ in subsequent parts.

### Common Mistakes
- Incorrectly identifying the direction of the friction force. It acts up the slope if the object is about to slide down, and down the slope if it is about to be pushed up.
- Resolving the weight component incorrectly. Parallel component is $mg \sin(\theta)$, perpendicular is $mg \cos(\theta)$.
- Prematurely rounding the value of $\mu$ from part (i) before using it in part (ii), which leads to an inaccurate final answer.

### Tags
forces, equilibrium, friction, inclined plane, limiting equilibrium, statics, coefficient of friction, multi_part

## Forces and Equilibrium: Light Pin-Jointed Framework

**Syllabus Reference**: 9709.P4.4.1
**Learning Objective**: Analyse the forces (tensions and thrusts) in a simple pin-jointed framework in equilibrium by considering the equilibrium of a specific joint.

### Example Question
Three light rods $AB$, $BC$, and $AC$ are freely pin-jointed to form an isosceles triangle. The framework is in a vertical plane with the joint $C$ above the horizontal rod $AB$. Angle $CAB$ = Angle $CBA = 30^\circ$. A load of $50$ N is suspended from joint $C$. Find the force in the rod $AC$ and state whether it is in tension or compression.

### Mark Scheme / Solution
Consider the equilibrium of joint C. By symmetry, the force in rod AC equals the force in rod BC. Let this force be $T$. (B1)

Resolve forces vertically at joint C:
$T \sin(30^\circ) + T \sin(30^\circ) - 50 = 0$ (M1)
$2T \sin(30^\circ) = 50$
$2T(0.5) = 50$
$T = 50$ N (A1)

The forces from the rods on the joint are directed upwards, away from the joint. Therefore, the rods are being stretched.
The force in rod AC is $50$ N and it is in tension. (A1)

### Standard Solution Steps
- Isolate a joint where an external force is applied and there are at most two unknown rod forces.
- Draw a free-body diagram for the chosen joint, showing all external loads and internal rod forces acting on it. Assume unknown forces are tensile (pointing away from the joint).
- Resolve all forces into horizontal and vertical components.
- Apply the equilibrium conditions $\Sigma F_x = 0$ and $\Sigma F_y = 0$.
- Solve the resulting simultaneous equations for the unknown forces.
- Determine the state of each rod: a positive result indicates tension (assumption was correct); a negative result indicates compression/thrust.

### Common Mistakes
- Choosing the wrong joint to start with, such as a support joint, which introduces unknown reaction forces and makes the problem harder.
- Confusing tension and compression. A rod in tension pulls on the joint. A rod in compression (thrust) pushes on the joint.
- Errors in geometry when finding the correct angles for resolution.

### Tags
forces, equilibrium, framework, rods, pin-jointed, tension, thrust, compression, statics, calculation