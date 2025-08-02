## Discrete Random Variables: Probability Distributions

**Syllabus Reference**: S1 5.4.1

**Learning Objective**: Understand the concept of a discrete random variable, its probability distribution, and calculate its expectation and variance.

### Example Question
Two fair four-sided dice, one red and one blue, have faces numbered 1, 2, 3, 4. They are rolled simultaneously. The discrete random variable $X$ is defined as the absolute difference between the scores on the two dice.

(i) Show that $P(X=1) = 3/8$.
(ii) Draw up the probability distribution table for $X$.
(iii) Calculate $E(X)$ and $Var(X)$.

### Mark Scheme / Solution
(i)
The sample space has $4 \times 4 = 16$ equally likely outcomes.
Outcomes where the difference is 1 are: (1,2), (2,1), (2,3), (3,2), (3,4), (4,3). There are 6 such outcomes. (M1)
$P(X=1) = 6/16 = 3/8$. (A1)

(ii)
Possible values of $X$ are 0, 1, 2, 3.
$P(X=0)$: (1,1), (2,2), (3,3), (4,4) -> $4/16 = 1/4$.
$P(X=2)$: (1,3), (3,1), (2,4), (4,2) -> $4/16 = 1/4$.
$P(X=3)$: (1,4), (4,1) -> $2/16 = 1/8$. (M1 for at least one other correct probability)
Probability distribution table:
| $x$ | 0 | 1 | 2 | 3 |
| :--- | :--- | :--- | :--- | :--- |
| $P(X=x)$ | $1/4$ | $3/8$ | $1/4$ | $1/8$ |
(A1 for fully correct table, probabilities must sum to 1)

(iii)
$E(X) = \Sigma x P(X=x) = (0 \times 1/4) + (1 \times 3/8) + (2 \times 1/4) + (3 \times 1/8)$ (M1 for correct formula)
$E(X) = 0 + 3/8 + 4/8 + 3/8 = 10/8 = 5/4$ or $1.25$. (A1)
$E(X^2) = \Sigma x^2 P(X=x) = (0^2 \times 1/4) + (1^2 \times 3/8) + (2^2 \times 1/4) + (3^2 \times 1/8)$ (M1 for attempt at $E(X^2)$)
$E(X^2) = 0 + 3/8 + 16/8 + 9/8 = 28/8 = 7/2$ or $3.5$.
$Var(X) = E(X^2) - [E(X)]^2 = 3.5 - (1.25)^2$ (M1 for correct variance formula)
$Var(X) = 3.5 - 1.5625 = 1.9375$ or $31/16$. (A1)

### Standard Solution Steps
- Systematically list all possible outcomes of the experiment to determine the sample space.
- Identify all possible values that the discrete random variable $X$ can take.
- For each value of $X$, count the number of favourable outcomes and divide by the total number of outcomes to find the probability.
- Tabulate the values of $X$ and their corresponding probabilities $P(X=x)$. Check that the probabilities sum to 1.
- Calculate the expectation (mean) using the formula $E(X) = \Sigma x P(X=x)$.
- Calculate $E(X^2)$ using the formula $E(X^2) = \Sigma x^2 P(X=x)$.
- Calculate the variance using the formula $Var(X) = E(X^2) - [E(X)]^2$.

### Common Mistakes
- Incorrectly listing the possible values of the random variable $X$.
- Errors in calculating the probabilities, often by miscounting outcomes.
- Probabilities in the distribution table not summing to 1, indicating a calculation error.
- The most common mistake: calculating variance as $E(X^2) - E(X)$ or $(E(X))^2$ instead of $E(X^2) - [E(X)]^2$.
- Calculating $(E(X))^2$ (squaring the sum) instead of $E(X^2)$ (summing the squares).

### Tags
- discrete random variable, probability distribution, expectation, variance, E(X), Var(X)

---

## Discrete Random Variables: The Binomial Distribution

**Syllabus Reference**: S1 5.4.2

**Learning Objective**: Use the binomial distribution B(n, p) for probabilities and recognise when it is a suitable model.

### Example Question
A biased coin is tossed 10 times. The probability of obtaining a Head on any single toss is 0.4.
(i) State two conditions for the number of Heads in 10 tosses to be modelled by a binomial distribution.
(ii) Find the probability of obtaining exactly 4 Heads.
(iii) Find the probability of obtaining at least 3 Heads.

### Mark Scheme / Solution
(i)
Any two from:
- There is a fixed number of trials ($n=10$).
- Each trial has only two possible outcomes (Head or Tail).
- The trials are independent of each other.
- The probability of success (Head) is constant for each trial ($p=0.4$).
(B1 for each correct condition, max 2)

(ii)
Let $X$ be the number of Heads. $X \sim B(10, 0.4)$.
$P(X=4) = {^{10}C_4} \times (0.4)^4 \times (0.6)^{10-4}$ (M1 for binomial formula with correct n, p, k)
$= 210 \times (0.4)^4 \times (0.6)^6$ (M1 for correct values)
$= 210 \times 0.0256 \times 0.046656 = 0.251$ (to 3 s.f.) (A1)

(iii)
$P(X \ge 3) = 1 - P(X \le 2)$ (M1 for correct complementary event approach)
$P(X=0) = (0.6)^{10} = 0.0060466$
$P(X=1) = {^{10}C_1} (0.4)^1 (0.6)^9 = 0.04031$
$P(X=2) = {^{10}C_2} (0.4)^2 (0.6)^8 = 0.12093$ (M1 for calculating P(0), P(1), P(2))
$P(X \le 2) = 0.0060466 + 0.04031 + 0.12093 = 0.1672866$
$P(X \ge 3) = 1 - 0.1672866 = 0.833$ (to 3 s.f.) (A1)

### Standard Solution Steps
- Check if the situation meets the conditions for a binomial distribution (fixed trials, two outcomes, constant probability, independent trials).
- Identify the parameters: $n$ (number of trials) and $p$ (probability of success).
- For $P(X=k)$, use the formula $P(X=k) = {^nC_k} p^k (1-p)^{n-k}$.
- For inequalities, decide the most efficient approach:
    - $P(X \le k) = P(X=0) + P(X=1) + ... + P(X=k)$.
    - $P(X \ge k)$ is often best calculated as $1 - P(X \le k-1)$.
    - $P(X < k) = P(X \le k-1)$.
    - $P(X > k) = 1 - P(X \le k)$.
- Perform calculations carefully, paying attention to combinations and powers.

### Common Mistakes
- Incorrectly identifying $n$ or $p$.
- Swapping $p$ and $(1-p)$ in the formula.
- Boundary errors with inequalities: For example, calculating $P(X \ge 3)$ as $1 - P(X \le 3)$ instead of the correct $1 - P(X \le 2)$.
- Forgetting the combination term ${^nC_k}$.
- Calculation errors, especially with powers and combinations.

### Tags
- binomial distribution, B(n,p), fixed trials, probability, inequalities, discrete random variable

---

## Discrete Random Variables: The Geometric Distribution

**Syllabus Reference**: S1 5.4.2

**Learning Objective**: Use the geometric distribution Geo(p) for probabilities and recognise when it is a suitable model.

### Example Question
A spinner is designed so that the probability of it landing on red is 0.2. The spinner is spun repeatedly. The random variable $X$ is the number of spins required to obtain the first red.

(i) Find the probability that the first red is obtained on the 5th spin.
(ii) Find the probability that the first red is obtained after the 3rd spin.
(iii) Find $E(X)$.

### Mark Scheme / Solution
Let $X$ be the number of spins to get the first red. $X \sim Geo(0.2)$.
$p = 0.2$, $q = 1 - 0.2 = 0.8$.

(i)
$P(X=5)$ requires 4 failures (Not Red) then 1 success (Red).
$P(X=5) = (0.8)^4 \times (0.2)^1$ (M1 for formula $q^{k-1}p$)
$= 0.4096 \times 0.2 = 0.08192$. (A1)

(ii)
$P(X > 3)$ means the first 3 spins are not red. (M1 for correct interpretation)
This is equivalent to FFF...
$P(X > 3) = (0.8)^3$ (M1 for formula $q^k$)
$= 0.512$. (A1)

(iii)
For a geometric distribution, $E(X) = 1/p$. (M1 for correct formula)
$E(X) = 1 / 0.2 = 5$. (A1)

### Standard Solution Steps
- Check if the situation fits the geometric distribution model (repeated independent trials, constant probability of success, variable of interest is the number of trials to get the *first* success).
- Identify the parameter $p$ (probability of success). Calculate $q = 1-p$.
- To find the probability that the first success occurs on the $k$-th trial, use the formula $P(X=k) = q^{k-1}p$.
- To find the probability that the first success occurs *after* the $k$-th trial, use the formula $P(X>k) = q^k$. This represents the event of having $k$ failures in a row.
- The expectation (mean number of trials to first success) is given by $E(X) = 1/p$.

### Common Mistakes
- Confusing the geometric and binomial distributions. The key difference is that geometric has a variable number of trials, while binomial has a fixed number.
- Using an incorrect exponent in the formula, such as $q^k p$ instead of $q^{k-1}p$ for $P(X=k)$.
- Calculating $P(X>k)$ by summing an infinite series instead of using the simpler $q^k$ formula.
- Using $1/q$ or $p$ for the expectation instead of $1/p$.

### Tags
- geometric distribution, Geo(p), first success, waiting time, expectation, discrete random variable

---

## Discrete Random Variables: Expectation and Variance of Standard Distributions

**Syllabus Reference**: S1 5.4.3

**Learning Objective**: Use formulae for the expectation and variance of the binomial and geometric distributions.

### Example Question
(a) The random variable $X$ follows a binomial distribution with parameters $n=20$ and $p=0.3$. Find the mean and variance of $X$.
(b) The random variable $Y$ follows a geometric distribution with parameter $p=0.1$.
(i) Find the expectation of $Y$.
(ii) A different random variable $W$ is such that $W \sim Geo(p)$ and $E(W)=8$. Find the value of $p$.

### Mark Scheme / Solution
(a)
$X \sim B(20, 0.3)$
Mean, $E(X) = np$. (M1)
$E(X) = 20 \times 0.3 = 6$. (A1)
Variance, $Var(X) = np(1-p) = npq$. (M1)
$q = 1 - 0.3 = 0.7$.
$Var(X) = 20 \times 0.3 \times 0.7 = 4.2$. (A1)

(b)
(i)
$Y \sim Geo(0.1)$
Expectation, $E(Y) = 1/p$. (M1)
$E(Y) = 1 / 0.1 = 10$. (A1)

(ii)
$W \sim Geo(p)$, $E(W)=8$.
$E(W) = 1/p$. (M1 for stating formula)
$8 = 1/p$.
$p = 1/8$ or $0.125$. (A1)

### Standard Solution Steps
- Identify the distribution (Binomial or Geometric) and its parameters ($n$ and $p$, or just $p$).
- **For Binomial B(n, p):**
    - Recall the formula for the mean (expectation): $E(X) = np$.
    - Recall the formula for the variance: $Var(X) = np(1-p)$ or $npq$.
- **For Geometric Geo(p):**
    - Recall the formula for the mean (expectation): $E(X) = 1/p$.
    - Note: The variance of the geometric distribution, $q/p^2$, is not in the S1 syllabus.
- Substitute the given parameters into the correct formula to find the required value.
- If given the mean or variance, set up an equation to solve for the unknown parameter.

### Common Mistakes
- Applying the wrong formula to the distribution (e.g., using $1/p$ for the mean of a binomial variable).
- For binomial variance, calculating $np$ and forgetting to multiply by $q=(1-p)$.
- Giving the standard deviation ($\sqrt{npq}$) when the variance ($npq$) is asked for.
- Confusing the roles of $p$ and $n$ in the formulae.
- Simple arithmetic errors when substituting values.

### Tags
- expectation, variance, mean, binomial distribution, geometric distribution, formula application