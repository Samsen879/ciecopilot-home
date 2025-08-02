## Linear Combinations of Random Variables: Expectation and Variance of aX + bY

**Syllabus Reference**: 4.1

**Learning Objective**: To calculate the expectation and variance of a linear combination of two independent random variables.

### Example Question
The independent random variables $X$ and $Y$ have the following properties:
$E(X) = 10$, $Var(X) = 5$
$E(Y) = 12$, $Var(Y) = 8$
The random variable $W$ is defined as $W = 4X + 3Y$. Find the value of $E(W)$ and $Var(W)$.

### Mark Scheme / Solution
$E(W) = E(4X + 3Y) = 4E(X) + 3E(Y)$ M1
$E(W) = 4(10) + 3(12) = 40 + 36 = 76$ A1
$Var(W) = Var(4X + 3Y) = 4^2 Var(X) + 3^2 Var(Y)$ M1
$Var(W) = 16(5) + 9(8) = 80 + 72 = 152$ A1

### Standard Solution Steps
- Step 1: Define the linear combination of the variables.
- Step 2: Apply the formulae for expectation and variance of the combination.

### Common Mistakes
- Forgetting to square the coefficients in the variance calculation.
- Incorrectly adding variances when a variable is subtracted.

### Tags
- linear combinations, expectation, variance, independent variables, 4.1

---
## Linear Combinations of Random Variables: Variance of aX - bY

**Syllabus Reference**: 4.1

**Learning Objective**: To understand and apply the variance formula for the difference of two independent random variables.

### Example Question
The masses, in grams, of two types of fruit, apples ($A$) and bananas ($B$), are independent random variables.
The distributions of $A$ and $B$ are such that $E(A) = 160$, $Var(A) = 25$ and $E(B) = 140$, $Var(B) = 20$.
A piece of fruit is chosen at random from each type. The random variable $D$ is the difference in their masses, given by $D = A - B$.
Find the mean and variance of $D$.

### Mark Scheme / Solution
$E(D) = E(A - B) = E(A) - E(B)$ M1
$E(D) = 160 - 140 = 20$ A1
$Var(D) = Var(A - B) = 1^2 Var(A) + (-1)^2 Var(B) = Var(A) + Var(B)$ M1
$Var(D) = 25 + 20 = 45$ A1

### Standard Solution Steps
- Step 1: Define the linear combination of the variables.
- Step 2: Apply the formulae for expectation and variance of the combination.

### Common Mistakes
- Incorrectly subtracting variances for a difference, i.e., calculating $Var(A - B)$ as $Var(A) - Var(B)$.
- Forgetting to square coefficients (especially the $-1$ for the subtracted variable).

### Tags
- linear combinations, expectation, variance, difference of variables, 4.1

---
## Linear Combinations of Random Variables: Sum of Independent Normal Variables

**Syllabus Reference**: 4.1

**Learning Objective**: To use the property that a linear combination of independent normal variables is also normally distributed.

### Example Question
The random variable $X$ follows a normal distribution with mean 20 and variance 9, i.e., $X \sim N(20, 9)$.
The random variable $Y$ follows a normal distribution with mean 30 and variance 16, i.e., $Y \sim N(30, 16)$.
$X$ and $Y$ are independent. The random variable $S$ is defined as $S = 2X + Y$.
- (i) State the distribution of $S$.
- (ii) Find $P(S > 75)$.

### Mark Scheme / Solution
- (i)
$E(S) = E(2X + Y) = 2E(X) + E(Y) = 2(20) + 30 = 70$ B1
$Var(S) = Var(2X + Y) = 2^2 Var(X) + 1^2 Var(Y) = 4(9) + 16 = 36 + 16 = 52$ M1 A1
Since $X$ and $Y$ are normal, $S$ is also normally distributed.
So, $S \sim N(70, 52)$ A1
- (ii)
$P(S > 75) = P(Z > \frac{75 - 70}{\sqrt{52}})$ M1
$= P(Z > 0.6933...)$
$= 1 - \Phi(0.6933)$ M1
$= 1 - 0.7559 = 0.244$ (3 s.f.) A1

### Standard Solution Steps
- Step 1: Calculate the expectation of the linear combination.
- Step 2: Calculate the variance of the linear combination.
- Step 3: State that the resulting distribution is Normal with the calculated mean and variance.
- Step 4: Standardise and use Normal distribution tables to find the required probability.

### Common Mistakes
- Forgetting to state that the resulting distribution is also Normal.
- Using the standard deviation instead of the variance in the $Var(aX + bY)$ formula.
- Calculation errors when standardising the variable for the probability calculation.

### Tags
- linear combinations, expectation, variance, normal distribution, probability calculation, 4.1

---