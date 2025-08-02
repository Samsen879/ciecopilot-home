## Trigonometry: Graphs of Trigonometric Functions
**Syllabus Reference**: 9709.P1.5.1
**Learning Objective**: Sketch and use the graphs of $y = \sin(x)$, $y = \cos(x)$, and $y = \tan(x)$ for $x$ in both degrees and radians. This includes understanding and applying transformations to these graphs.
### Example Question
The diagram shows part of the graph of $y = a + b \cos(cx)$.
a) Find the values of the constants $a$, $b$, and $c$. [4]
b) State the period and amplitude of the function. [2]
### Mark Scheme / Solution
a) Finding the constants:
The principal axis (midline) of the graph is the average of the maximum and minimum values. Midline $y = \frac{5 + (-1)}{2} = \frac{4}{2} = 2$. This gives the vertical shift, so $a = 2$. (M1 for finding midline)
The amplitude is the distance from the midline to a maximum or minimum point. Amplitude $= 5 - 2 = 3$. (A1 for correct amplitude)
The midline is $a = \frac{\text{max} + \text{min}}{2} = \frac{5 + (-1)}{2} = 2$. (A1 for correct value of a)
The period of the function is the horizontal length of one complete cycle. From the graph, one cycle is completed between $x=0$ and $x=2\pi$. The standard period of $\cos(x)$ is $2\pi$. The relationship is Period $= \frac{2\pi}{c}$.
So, $2\pi = \frac{2\pi}{c}$, which means $c=1$. (B1 for correct value of c)
The function is $y = 2 + 3\cos(x)$. Let's check: at $x=0$, $y = 2+3\cos(0) = 5$. The graph shows $y=-1$ at $x=0$. This means the cosine function is reflected. Thus, $b = -3$.
Correct function: $y = 2 - 3\cos(x)$.
Final values: $a=2$, $b=-3$, $c=1$. (A1 for all correct values)

b) Period and Amplitude:
The amplitude is $|b| = |-3| = 3$. (B1 for correct amplitude)
The period is $2\pi$ as determined above. (B1 for correct period)
### Standard Solution Steps
- Identify the midline by finding the average of maximum and minimum values
- Calculate amplitude as the distance from midline to maximum or minimum
- Determine period by measuring one complete cycle
- Use the relationship Period $= \frac{2\pi}{c}$ to find $c$
- Check signs by substituting key points
### Common Mistakes
- Confusing amplitude with the coefficient $b$ (amplitude is $|b|$)
- Not recognizing reflections when the graph is inverted
- Using wrong period formula for different trigonometric functions
- Errors in reading coordinates from the graph
### Tags
trigonometry, graphs, transformations, amplitude, period, cosine function

## Trigonometry: Exact Values and Identities
**Syllabus Reference**: 9709.P1.5.2
**Learning Objective**: Know and use the exact values of sin, cos, and tan for $30°$, $45°$, $60°$ (and $\pi/6$, $\pi/4$, $\pi/3$). Understand and use the identities $\tan\theta \equiv \frac{\sin\theta}{\cos\theta}$ and $\sin^2\theta + \cos^2\theta \equiv 1$.
### Example Question
a) Show that the equation $6\cos^2\theta + \tan^2\theta = 4$ can be written in the form $6\cos^4\theta - 4\cos^2\theta + 1 = 0$. [3]
b) Hence solve the equation $6\cos^2\theta + \tan^2\theta = 4$ for $0 \le \theta \le \pi$. Give your answers in terms of $\pi$. [4]
### Mark Scheme / Solution
a) Showing the transformation:
Start with the given equation: $6\cos^2\theta + \tan^2\theta = 4$.
Use the identity $\tan\theta \equiv \frac{\sin\theta}{\cos\theta}$, so $\tan^2\theta = \frac{\sin^2\theta}{\cos^2\theta}$. (M1)
Substitute this into the equation: $6\cos^2\theta + \frac{\sin^2\theta}{\cos^2\theta} = 4$.
Use the identity $\sin^2\theta \equiv 1 - \cos^2\theta$. (M1)
Substitute again: $6\cos^2\theta + \frac{1 - \cos^2\theta}{\cos^2\theta} = 4$.
Multiply the entire equation by $\cos^2\theta$ to eliminate the fraction: $6\cos^4\theta + (1 - \cos^2\theta) = 4\cos^2\theta$. (M1)
Rearrange the terms to one side to get the required form: $6\cos^4\theta - 4\cos^2\theta - \cos^2\theta + 1 = 0$.
$6\cos^4\theta - 5\cos^2\theta + 1 = 0$. (A1)

b) Solving the equation:
We need to solve $6\cos^4\theta - 5\cos^2\theta + 1 = 0$.
Let $u = \cos^2\theta$. The equation becomes a quadratic in $u$: $6u^2 - 5u + 1 = 0$. (M1)
Factorise the quadratic: $(3u - 1)(2u - 1) = 0$. (M1)
So, $u = 1/3$ or $u = 1/2$.
Substitute back $\cos^2\theta = u$.
Case 1: $\cos^2\theta = 1/2$. This gives $\cos\theta = \pm\frac{1}{\sqrt{2}}$. (A1)
For $\cos\theta = \frac{1}{\sqrt{2}}$, the principal value is $\theta = \arccos(\frac{1}{\sqrt{2}}) = \pi/4$. (B1)
For $\cos\theta = -\frac{1}{\sqrt{2}}$, the principal value is $\theta = \arccos(-\frac{1}{\sqrt{2}}) = 3\pi/4$. (B1)
The solutions are $\theta = \pi/4$ and $\theta = 3\pi/4$. (A1)
### Standard Solution Steps
- Use trigonometric identities to simplify equations
- Convert to a single trigonometric function when possible
- Use substitution to create quadratic equations
- Solve the quadratic and substitute back
- Find all solutions within the given range
### Common Mistakes
- Forgetting to use the $\pm$ when taking square roots
- Not finding all solutions within the given range
- Errors in algebraic manipulation when using identities
- Using degree values when radians are required
### Tags
trigonometry, identities, exact values, quadratic equations, solving equations

## Trigonometry: Solving Trigonometric Equations
**Syllabus Reference**: 9709.P1.5.3
**Learning Objective**: Solve trigonometric equations within a given range, finding all solutions. This includes equations of the form $\sin(ax + b) = k$ and equations that reduce to a quadratic.
### Example Question
Solve the equation $3\sin(2x - 20°) + 1 = 0$ for $0° \le x \le 180°$. [5]
### Mark Scheme / Solution
Isolate the trigonometric function.
$3\sin(2x - 20°) = -1$
$\sin(2x - 20°) = -1/3$ (B1)

Adjust the range.
The range for $x$ is $0° \le x \le 180°$.
Let $u = 2x - 20°$. We must find the range for $u$.
Lower bound: $2(0) - 20° = -20°$
Upper bound: $2(180°) - 20° = 360° - 20° = 340°$
So the new range is $-20° \le u \le 340°$. (M1)

Find the principal value.
Find the principal value for $u$ by taking the inverse sine.
$u_{pv} = \arcsin(-1/3) = -19.47°$. (Store the full calculator value). (A1)

Find all solutions within the adjusted range.
The sine function is negative in the 3rd and 4th quadrants.
The principal value $-19.47°$ is in the range $-20° \le u \le 340°$. So, $u_1 = -19.47°$.
The second solution is found using symmetry. For sine, the other solution is $180° - u_{pv}$.
$u_2 = 180° - (-19.47°) = 199.47°$. This is in the range. (M1)
The next solution would be $360° + u_{pv} = 360° - 19.47° = 340.53°$. This is outside the range for $u$.
So the solutions for $u$ are $-19.47°$ and $199.47°$.

Solve for the original variable ($x$).
For $u_1 = -19.47°$:
$2x - 20° = -19.47°$
$2x = 0.53°$
$x = 0.265°$ (A1)
For $u_2 = 199.47°$:
$2x - 20° = 199.47°$
$2x = 219.47°$
$x = 109.7°$ (A1)

Both solutions, $0.3°$ and $109.7°$ (rounded to 1 d.p.), are within the required range of $0° \le x \le 180°$.
### Standard Solution Steps
- Isolate the trigonometric function
- Adjust the range for the new variable if needed
- Find the principal value using inverse trigonometric functions
- Use CAST diagram or graph knowledge to find all solutions
- Convert back to the original variable
- Check all solutions are within the required range
### Common Mistakes
- Forgetting to find all solutions within the given range
- Incorrectly adjusting the range for equations of the form $\sin(ax+b)=k$
- Errors in algebraic manipulation when isolating the function
- Giving answers in degrees when radians are required, or vice versa
- Not checking final answers are within the original range
### Tags
trigonometry, equation solving, range adjustment, principal value, CAST diagram