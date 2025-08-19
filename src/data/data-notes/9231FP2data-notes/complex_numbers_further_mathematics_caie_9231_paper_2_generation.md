## Complex Numbers: De Moivre's Theorem and Roots of Equations

**Syllabus Reference**: 9231.FP2.2.5
**Learning Objective**: Use de Moivre's theorem to express trigonometrical ratios of multiple angles in terms of powers of trigonometrical ratios of the fundamental angle. Use these results to solve polynomial equations.
**Difficulty Profile**:
- Conceptual_Level: 4
- Computational_Complexity: 4
- Problem_Type: multi-step
**Cognitive Skills**: application, synthesis
**Time_Estimate**: 15
**Topic_Weight**: 9
**Prerequisite Skills**: de_moivres_theorem, binomial_expansion, trigonometric_identities, solving_trigonometric_equations, polynomial_roots
**Cross_Topic_Links**: algebra, trigonometry

### Example Question
(a) Use de Moivre's theorem to show that
$\sin(5\theta) \equiv 16\sin^5\theta - 20\sin^3\theta + 5\sin\theta$ [5]
(b) Hence find the exact roots of the equation $32x^5 - 40x^3 + 10x + 1 = 0$. [5]

### Mark Scheme / Solution
- (a) States de Moivre's theorem and considers $(\cos\theta + i\sin\theta)^5 = \cos(5\theta) + i\sin(5\theta)$. (M1)
- Uses the binomial theorem to expand $(\cos\theta + i\sin\theta)^5$. Let c = $\cos\theta$, s = $\sin\theta$.
- Expansion: $c^5 + 5c^4(is) + 10c^3(is)^2 + 10c^2(is)^3 + 5c(is)^4 + (is)^5$. (M1)
- Equates the imaginary parts of the expansion and de Moivre's theorem.
- $\sin(5\theta) = 5c^4s - 10c^2s^3 + s^5$. (M1)
- Uses the identity $c^2 = 1 - s^2$ to express the result entirely in terms of $\sin\theta$.
- $\sin(5\theta) = 5(1-s^2)^2s - 10(1-s^2)s^3 + s^5 = 5s(1-2s^2+s^4) - 10s^3(1-s^2) + s^5$. (M1)
- Correctly expands and simplifies to the given result.
- $= 5s - 10s^3 + 5s^5 - 10s^3 + 10s^5 + s^5 = 16s^5 - 20s^3 + 5s$. (A1)
- (b) Compares the given equation with the identity from part (a). Divides the equation by 2:
- $16x^5 - 20x^3 + 5x + 1/2 = 0$. (M1)
- Makes the substitution $x = \sin\theta$.
- $16\sin^5\theta - 20\sin^3\theta + 5\sin\theta = -1/2 \implies \sin(5\theta) = -1/2$. (M1)
- Finds the principal value and general solutions for $5\theta$.
- $5\theta = n\pi + (-1)^n(-\pi/6)$. (M1)
- Finds five distinct values for $\theta$ by taking n = 0, 1, 2, 3, 4.
- $5\theta = -\pi/6, 7\pi/6, 11\pi/6, 19\pi/6, 23\pi/6$.
- $\theta = -\pi/30, 7\pi/30, 11\pi/30, 19\pi/30, 23\pi/30$. (A1)
- States the five roots of the equation, which are $x = \sin(\theta)$ for these values.
- $x = \sin(-\pi/30), \sin(7\pi/30), \sin(11\pi/30), \sin(19\pi/30), \sin(23\pi/30)$. (A1)

### Standard Solution Steps
- Start with de Moivre's theorem: $(\cos\theta + i\sin\theta)^n = \cos(n\theta) + i\sin(n\theta)$. For n=5, we have $\cos(5\theta) + i\sin(5\theta)$.
- Expand the LHS using the binomial theorem: $(c+is)^5$, where c=cosθ and s=sinθ.
- $(c+is)^5 = c^5 + \binom{5}{1}c^4(is) + \binom{5}{2}c^3(is)^2 + \binom{5}{3}c^2(is)^3 + \binom{5}{4}c(is)^4 + (is)^5$
- $= c^5 + 5ic^4s - 10c^3s^2 - 10ic^2s^3 + 5cs^4 + is^5$.
- Equate the imaginary parts of the two expressions for $(\cos\theta + i\sin\theta)^5$.
- $\sin(5\theta) = 5c^4s - 10c^2s^3 + s^5$.
- To get an expression in terms of $\sin\theta$ only, substitute $c^2 = 1 - s^2$.
- $\sin(5\theta) = 5(1-s^2)^2s - 10(1-s^2)s^3 + s^5$.
- Expand and collect terms:
- $= 5s(1 - 2s^2 + s^4) - 10s^3 + 10s^5 + s^5$
- $= 5s - 10s^3 + 5s^5 - 10s^3 + 10s^5 + s^5$
- $= 16s^5 - 20s^3 + 5s$. The identity is proven.
- The structure of the polynomial $32x^5 - 40x^3 + 10x + 1 = 0$ is very similar to the identity in part (a).
- Rearrange the equation to match the identity: Divide by 2 to get $16x^5 - 20x^3 + 5x + 1/2 = 0$, which can be written as $16x^5 - 20x^3 + 5x = -1/2$.
- Let $x = \sin\theta$. The equation becomes $\sin(5\theta) = -1/2$.
- Solve this trigonometric equation for $5\theta$. The principal value is $-\pi/6$. The general solutions are given by $5\theta = n\pi + (-1)^n(-\pi/6)$.
- To find five distinct roots for the quintic polynomial, we need five distinct values for $\sin\theta$. We find these by choosing five consecutive integer values for n, for example n = 0, 1, 2, 3, 4.
- n=0: $5\theta = -\pi/6 \implies \theta = -\pi/30$
- n=1: $5\theta = \pi + \pi/6 = 7\pi/6 \implies \theta = 7\pi/30$
- n=2: $5\theta = 2\pi - \pi/6 = 11\pi/6 \implies \theta = 11\pi/30$
- n=3: $5\theta = 3\pi + \pi/6 = 19\pi/6 \implies \theta = 19\pi/30$
- n=4: $5\theta = 4\pi - \pi/6 = 23\pi/6 \implies \theta = 23\pi/30$
- The roots of the polynomial are $x = \sin\theta$ for each of these values of θ. These are the five exact roots.

### Teaching Insights
- Key_Concept: De Moivre's theorem plus binomial expansion is the key to linking $\cos(n\theta)/\sin(n\theta)$ with powers of $\cos\theta/\sin\theta$.
- Visual_Description: The key step is equating real parts for a $\cos(n\theta)$ identity and imaginary parts for a $\sin(n\theta)$ identity.
- Extension_Question: When solving the resulting polynomial, the connection might not be immediate. Students need to be prepared to manipulate the equation (e.g., by scaling) to match the identity.

### Error Analysis
- Conceptual_Misconception: Errors in binomial expansion coefficients or powers of i (e.g., $i^2 = -1, i^3 = -i, i^4 = 1$).
- Procedural_Error: Algebraic errors when substituting $c^2=1-s^2$ and expanding.
- Application_Error: In part (b), failing to manipulate the equation to match the identity, e.g., setting $\sin(5\theta) = -1$.
- Common_Mistakes: Finding only the principal value for $\theta$ and thus only one root, instead of the required five.

### Adaptive Learning Metadata
- Weakness_Indicators: Confusion between the solutions for $\theta$ and the roots of the equation, which are $x=\sin\theta$.
- Similar_Problems: Expressing powers of sin/cos in terms of multiple angles.
- Next_Level_Problems: Summation of series using C+iS method.

### API Integration Fields
- question_id: fp2_complex_demoivre_01
- topic_hash: 9231_complex_numbers_de_moivres_theorem
- version: 1.0
- last_updated: 2024-01-15
- author_model: Claude-3-Opus

### Tags
- Topic:complex_numbers
- Subtopic:de_moivres_theorem
- Skill:multiple_angle_formula
- Skill:polynomial_roots
- Syllabus:9231
- Level:FP2