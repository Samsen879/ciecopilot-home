## A2 Level Topic 20: Force on a Conductor and Electromagnetic Induction

**Syllabus Reference**: 9702.20
**Learning Objective**: (d) solve problems involving the force on a current-carrying conductor in a magnetic field. (g) define magnetic flux and flux linkage. (h) recall and solve problems using Faraday’s law of electromagnetic induction and Lenz’s law.

### Example Question
A light, rigid, rectangular wire coil PQRS of 50 turns is connected to a 6.0 V power supply. The coil has a width PQ = 4.5 cm and a length PS = 8.0 cm. The coil is suspended so that its lower side, RS, is in a uniform horizontal magnetic field of flux density $B = 0.25$ T, as shown in the diagram. The magnetic field is directed into the page. The total resistance of the coil and connecting wires is $3.0 \, \Omega$.



(a) Calculate the magnitude and state the direction of the force on the side RS of the coil.

(b) The power supply is now removed and replaced with a sensitive voltmeter. The coil is then pulled vertically downwards at a constant speed of $2.0 \, \text{m s}^{-1}$.
(i) Calculate the magnetic flux linkage of the coil when the side RS has moved 3.0 cm into the field.
(ii) Calculate the e.m.f. induced in the coil.
(iii) State and explain the direction of the induced current in the side RS.

### Mark Scheme / Solution
(a)
Step 1: Calculate the current in the coil.
$I = \frac{V}{R} = \frac{6.0}{3.0} = 2.0$ A [C1]

Step 2: Calculate the force on the side RS. The length of the wire in the field is $L = \text{PQ} = 4.5$ cm $= 0.045$ m.
The force is on 50 turns of wire.
$F = N \times (BIL\sin\theta)$
Since the wire is perpendicular to the field, $\sin\theta = 1$.
$F = 50 \times (0.25 \times 2.0 \times 0.045)$ [M1]
$F = 1.125$ N, which rounds to $F = 1.1$ N (to 2 s.f.) [A1]

Step 3: Determine the direction of the force.
Using Fleming's Left-Hand Rule:
- Forefinger (Field): Into page
- Centre finger (Current): From R to S (right)
- Thumb (Force): Upwards [A1]

(b)
(i) Step 1: Calculate the magnetic flux through a single turn.
Area inside the field $A = \text{width} \times \text{depth} = 0.045 \times 0.030 = 0.00135 \, \text{m}^2$.
Flux $\Phi = BA = 0.25 \times 0.00135 = 3.375 \times 10^{-4}$ Wb. [C1]

Step 2: Calculate the flux linkage.
Flux linkage = $N\Phi = 50 \times 3.375 \times 10^{-4}$ [M1]
Flux linkage = $0.016875$ Wb, which rounds to $0.017$ Wb (to 2 s.f.) [A1]

(ii) Step 1: Apply Faraday's Law of electromagnetic induction.
The induced e.m.f. can be calculated using $E = N \frac{\Delta\Phi}{\Delta t}$ or by using $E = NBLv$ for a conductor moving at right angles to a field.
Using $E = NBLv$:
$E = 50 \times 0.25 \times 0.045 \times 2.0$ [M1]
$E = 1.125$ V, which rounds to $1.1$ V (to 2 s.f.) [A1]

(iii) Step 1: Apply Lenz's Law or Fleming's Right-Hand Rule.
According to Lenz's Law, the induced current will flow in a direction that creates a magnetic force to oppose the motion. The coil is moving downwards, so the induced force must be upwards. [M1]

Using Fleming's Left-Hand Rule to find the required current direction for an upward force:
- Thumb (Force): Upwards
- Forefinger (Field): Into page
This requires the Centre finger (Current) to point from S to R (left). [A1]

Alternatively, using Fleming's Right-Hand Rule:
- Thumb (Motion): Downwards
- Forefinger (Field): Into page
This gives the Centre finger (Induced Current) pointing from S to R (left).

Direction of induced current is from S to R. [A1]

### Standard Solution Steps
- For force on a conductor:
    - Step 1: Calculate the current $I$ using Ohm's Law ($I=V/R$) if not given.
    - Step 2: Identify the length $L$ of the wire that is inside the magnetic field.
    - Step 3: Apply the formula $F = NBIL\sin\theta$. For multiple turns ($N$), the force is multiplied by $N$. Ensure $\theta$ is the angle between the wire and the field lines.
    - Step 4: Use Fleming's Left-Hand Rule to determine the direction of the force.

- For induced e.m.f. (motional e.m.f.):
    - Step 1: Identify the variables required for Faraday's Law. This can be the rate of change of flux ($E = -N\frac{\Delta\Phi}{\Delta t}$) or the parameters for motional e.m.f. ($E = NBLv$).
    - Step 2: Substitute values into the chosen formula to calculate the magnitude of the e.m.f.
    - Step 3: Apply Lenz's Law or Fleming's Right-Hand Rule to determine the direction of the induced current. Lenz's Law states the induced effects will oppose the change that caused them.

### Common Mistakes
- Using the wrong length in $F=BIL$. Students sometimes use the length of the vertical side (PS) instead of the horizontal side (RS) which is actually cutting the flux.
- Forgetting to multiply by the number of turns ($N$) in both force and induction calculations.
- Confusing Fleming's Left-Hand Rule (for motor effect/force) with Fleming's Right-Hand Rule (for generator effect/induced current).
- Errors in applying the rules, e.g., pointing fingers in the wrong direction.
- Incorrectly calculating the area for flux; the area is only the part of the coil *inside* the field.
- Misunderstanding Lenz's Law: The induced current opposes the *change* causing it, not the field itself. If the coil is entering the field, the induced force opposes entry. If it is leaving, the force opposes leaving.

### Tags
magnetic_fields, magnetic_force, electromagnetic_induction, faraday_law, lenz_law, 20