## Trigonometry: Proving Identities

**Syllabus Reference**: 9709.P3.3.3
**Learning Objective**: Use trigonometric identities, including double angle and compound angle formulae, to simplify expressions and prove more complex identities.

### Example Question
Prove the identity $\frac{\cot x - \tan x}{\cot x + \tan x} \equiv \cos 2x$. [4]

### Mark Scheme / Solution
Start with the left-hand side (LHS) and express in terms of $\sin x$ and $\cos x$. M1
LHS $= \frac{\frac{\cos x}{\sin x} - \frac{\sin x}{\cos x}}{\frac{\cos x}{\sin x} + \frac{\sin x}{\cos x}}$

Create a single fraction in the numerator and the denominator by finding a common denominator $\sin x \cos x$. M1
Numerator: $\frac{\cos^2 x - \sin^2 x}{\sin x \cos x}$
Denominator: $\frac{\cos^2 x + \sin^2 x}{\sin x \cos x}$

Simplify the compound fraction.
LHS $= \frac{\cos^2 x - \sin^2 x}{\sin x \cos x} \times \frac{\sin x \cos x}{\cos^2 x + \sin^2 x} = \frac{\cos^2 x - \sin^2 x}{\cos^2 x + \sin^2 x}$ A1

Use the double angle identity $\cos 2x \equiv \cos^2 x - \sin^2 x$ and the Pythagorean identity $\cos^2 x + \sin^2 x \equiv 1$. A1
LHS $= \frac{\cos 2x}{1} = \cos 2x =$ RHS.
The identity is proven.

### Standard Solution Steps
- Choose one side of the identity to work on, usually the more complex side.
- Express all trigonometric functions in terms of sine and cosine (e.g., $\tan x = \frac{\sin x}{\cos x}$, $\sec x = \frac{1}{\cos x}$, etc.).
- Use algebraic manipulation, such as finding a common denominator or factorising, to simplify the expression.
- Systematically apply known identities (Pythagorean, compound angle, double angle) to transform the expression until it matches the other side.
- Conclude the proof by showing that LHS = RHS.

### Common Mistakes
- Attempting to "solve" the identity by moving terms from one side to the other. A proof requires transforming one side into the other.
- Making algebraic errors, particularly when finding a common denominator or simplifying complex fractions.
- Using incorrect identities or misremembering formulae (e.g., confusing the signs in double angle formulae).
- Cancelling terms incorrectly across addition or subtraction signs.

### Tags
trigonometry, identity, proof, double_angle, 3.3, simplifying_expressions

## Trigonometry: Harmonic Form (R-formula)

**Syllabus Reference**: 9709.P3.3.3
**Learning Objective**: Express $a \sin \theta \pm b \cos \theta$ in the forms $R \sin(\theta \pm \alpha)$ or $R \cos(\theta \mp \alpha)$. Use this form to solve equations and find maximum/minimum values.

### Example Question
(i) Express $5 \cos \theta - 12 \sin \theta$ in the form $R \cos(\theta + \alpha)$, where $R > 0$ and $0^\circ < \alpha < 90^\circ$. Give the value of $\alpha$ correct to 1 decimal place. [3]

(ii) Hence, solve the equation $5 \cos \theta - 12 \sin \theta = 8$ for $0^\circ \le \theta \le 360^\circ$. [4]

### Mark Scheme / Solution
(i) Let $5 \cos \theta - 12 \sin \theta \equiv R \cos(\theta + \alpha) \equiv R(\cos\theta\cos\alpha - \sin\theta\sin\alpha)$.
$R = \sqrt{5^2 + (-12)^2} = \sqrt{25 + 144} = \sqrt{169} = 13$. B1
Comparing coefficients:
$R \cos \alpha = 5 \Rightarrow 13 \cos \alpha = 5$
$R \sin \alpha = 12 \Rightarrow 13 \sin \alpha = 12$
$\tan \alpha = \frac{12}{5} = 2.4$. M1
$\alpha = \tan^{-1}(2.4) = 67.38...^\circ \approx 67.4^\circ$. A1
So, $5 \cos \theta - 12 \sin \theta = 13 \cos(\theta + 67.4^\circ)$.

(ii) Use the result from part (i) to rewrite the equation:
$13 \cos(\theta + 67.4^\circ) = 8$
$\cos(\theta + 67.4^\circ) = \frac{8}{13}$. M1
Let $\phi = \theta + 67.4^\circ$. The range for $\theta$ is $0^\circ \le \theta \le 360^\circ$, so the range for $\phi$ is $67.4^\circ \le \phi \le 427.4^\circ$.
Principal (basic) angle = $\cos^{-1}(\frac{8}{13}) = 52.0^\circ$. A1
Since $\cos \phi$ is positive, solutions for $\phi$ lie in the first and fourth quadrants.
$\phi = 360^\circ - 52.0^\circ = 308.0^\circ$ (This is in the range for $\phi$)
$\phi = 360^\circ + 52.0^\circ = 412.0^\circ$ (This is also in the range for $\phi$)
Now solve for $\theta$:
$\theta + 67.4^\circ = 308.0^\circ \Rightarrow \theta = 308.0^\circ - 67.4^\circ = 240.6^\circ$. A1
$\theta + 67.4^\circ = 412.0^\circ \Rightarrow \theta = 412.0^\circ - 67.4^\circ = 344.6^\circ$. A1

### Standard Solution Steps
- Calculate $R = \sqrt{a^2 + b^2}$.
- Use the expansion of the required form (e.g., $R \cos(\theta+\alpha)$) and compare coefficients with $a \cos \theta + b \sin \theta$ to set up equations for $\cos \alpha$ and $\sin \alpha$.
- Find $\alpha$ by calculating $\tan \alpha$ and taking the inverse tangent. Ensure $\alpha$ is in the correct quadrant as specified.
- Substitute the R-form into the equation to be solved.
- Isolate the trigonometric function (e.g., $\cos(\theta+\alpha)$).
- Adjust the domain of the variable to match the argument of the function (e.g., find the range for $\theta+\alpha$).
- Find the principal value (basic angle) and use quadrant rules (CAST) to find all solutions for the modified angle within its new range.
- Solve for the original variable $\theta$ and check that the solutions are in the original domain.

### Common Mistakes
- Using the wrong expansion, for example, using a '+' sign in the expansion of $\cos(\theta+\alpha)$.
- Errors in calculating $\alpha$, often by ignoring the signs of the coefficients for sine and cosine.
- Forgetting to adjust the domain for the new angle ($\theta \pm \alpha$), which can lead to missing solutions or including solutions outside the required range.
- Premature rounding of $\alpha$ or the basic angle, leading to final answers that are not accurate to the required degree.
- Finding only one solution when two (or more) exist within the specified interval.

### Tags
trigonometry, r_formula, harmonic_form, solving_equations, 3.3

## Trigonometry: Equations as Quadratics

**Syllabus Reference**: 9709.P3.3.3
**Learning Objective**: Recognise and solve trigonometric equations that can be reduced to a quadratic form by using identities.

### Example Question
Solve the equation $3 \cos 2\theta + 10 \sin \theta - 2 = 0$ for $0^\circ \le \theta \le 360^\circ$. [5]

### Mark Scheme / Solution
Use the identity $\cos 2\theta \equiv 1 - 2\sin^2 \theta$ to express the equation solely in terms of $\sin \theta$. M1
$3(1 - 2\sin^2 \theta) + 10 \sin \theta - 2 = 0$
$3 - 6\sin^2 \theta + 10 \sin \theta - 2 = 0$
$-6\sin^2 \theta + 10 \sin \theta + 1 = 0$
$6\sin^2 \theta - 10 \sin \theta - 1 = 0$. A1

Let $x = \sin \theta$. The equation is $6x^2 - 10x - 1 = 0$. Solve using the quadratic formula $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$. M1
$\sin \theta = \frac{-(-10) \pm \sqrt{(-10)^2 - 4(6)(-1)}}{2(6)}$
$\sin \theta = \frac{10 \pm \sqrt{100 + 24}}{12} = \frac{10 \pm \sqrt{124}}{12}$

$\sin \theta = \frac{10 + \sqrt{124}}{12} \approx 1.761$ or $\sin \theta = \frac{10 - \sqrt{124}}{12} \approx -0.0946$.
The solution $\sin \theta \approx 1.761$ is not possible, as $-1 \le \sin \theta \le 1$. B1

Solve for $\sin \theta = -0.0946$.
The basic angle is $\sin^{-1}(0.0946) \approx 5.43^\circ$.
Since $\sin \theta$ is negative, solutions are in the third and fourth quadrants.
$\theta = 180^\circ + 5.43^\circ = 185.4^\circ$. A1
$\theta = 360^\circ - 5.43^\circ = 354.6^\circ$. A1
Solutions are $\theta = 185.4^\circ$ and $\theta = 354.6^\circ$.

### Standard Solution Steps
- Identify the need to use a trigonometric identity to convert the equation into terms of a single trigonometric function (e.g., all $\sin \theta$ or all $\cos \theta$). Double angle identities are common choices.
- Rearrange the equation into the standard quadratic form $ay^2 + by + c = 0$, where $y$ is the trigonometric function.
- Solve the quadratic equation for $y$ using factorisation or the quadratic formula.
- Check the validity of the solutions for $y$. For sine and cosine, solutions must be in the range $[-1, 1]$. Discard any invalid solutions.
- For each valid solution, solve for the angle $\theta$ within the given domain.
- Start by finding the basic angle (principal value) using the absolute value of $y$.
- Use the sign of $y$ and quadrant rules (CAST) to find all possible solutions for $\theta$ in the required range.

### Common Mistakes
- Choosing the wrong identity for $\cos 2\theta$. Using $2\cos^2\theta-1$ or $\cos^2\theta-\sin^2\theta$ would not result in a single trigonometric function.
- Errors in algebraic rearrangement or when applying the quadratic formula.
- Forgetting to discard impossible solutions, such as $\sin\theta = 2$.
- When finding angles from a negative value (e.g., $\sin \theta = -0.0946$), using a calculator directly can give a negative principal angle, which can be confusing. It is often safer to find the basic angle using the positive value and then apply quadrant rules.
- Identifying the correct quadrants but calculating the angles incorrectly (e.g., using $180^\circ - \alpha$ for sine in the fourth quadrant instead of $360^\circ - \alpha$).

### Tags
trigonometry, quadratic_in_disguise, solving_equations, double_angle, 3.3, identities