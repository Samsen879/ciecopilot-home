### Syllabus Reference
- 4.2 Inference using normal and t-distributions

### Learning Objective
- Understand and use properties of linear combinations of independent normal random variables to calculate probabilities. This includes the distribution of $aX \pm bY$ and the distribution of the sample mean, $\bar{X}$.

### Example Question
The mass, in grams, of a 'Red Delicious' apple, $A$, is modelled by the random variable $A \sim N(210, 15^2)$.
The mass, in grams, of a 'Navel' orange, $O$, is modelled by the random variable $O \sim N(260, 18^2)$.
The masses are independent.

- Find the probability that the total mass of 3 randomly selected apples is greater than the total mass of 2 randomly selected oranges.
- Find the probability that the mean mass of a random sample of 8 apples is less than 205g.

### Mark Scheme / Solution
**Part 1: Probability for a linear combination**

- Let $X$ be the total mass of 3 apples, so $X = A_1 + A_2 + A_3$. B1
- Let $Y$ be the total mass of 2 oranges, so $Y = O_1 + O_2$. B1
- We need to find $P(X > Y)$, which is equivalent to $P(X - Y > 0)$. M1

- First, find the distribution of $X$.
- $E(X) = E(A_1 + A_2 + A_3) = 3 \times E(A) = 3 \times 210 = 630$. M1
- $Var(X) = Var(A_1 + A_2 + A_3) = 3 \times Var(A) = 3 \times 15^2 = 675$. M1
- So, $X \sim N(630, 675)$. A1

- Next, find the distribution of $Y$.
- $E(Y) = E(O_1 + O_2) = 2 \times E(O) = 2 \times 260 = 520$. M1
- $Var(Y) = Var(O_1 + O_2) = 2 \times Var(O) = 2 \times 18^2 = 648$. M1
- So, $Y \sim N(520, 648)$. A1

- Now, define the difference $D = X - Y$.
- $E(D) = E(X) - E(Y) = 630 - 520 = 110$. M1
- $Var(D) = Var(X) + Var(Y) = 675 + 648 = 1323$. M1
- So, $D \sim N(110, 1323)$. A1

- Finally, calculate the required probability $P(D > 0)$.
- Standardise the value: $Z = \frac{D - \mu}{\sigma} = \frac{0 - 110}{\sqrt{1323}}$. M1
- $P(D > 0) = P(Z > \frac{-110}{36.373...}) = P(Z > -3.024)$. M1
- This is equal to $P(Z < 3.024)$. M1
- Using standard normal tables, $\Phi(3.024) = 0.9988$. A1

**Part 2: Probability for a sample mean**

- Let $\bar{A}$ be the mean mass of a sample of 8 apples. B1
- The distribution of the sample mean is $\bar{A} \sim N(\mu, \frac{\sigma^2}{n})$. M1
- $E(\bar{A}) = E(A) = 210$. B1
- $Var(\bar{A}) = \frac{Var(A)}{n} = \frac{15^2}{8} = \frac{225}{8} = 28.125$. M1
- So, $\bar{A} \sim N(210, 28.125)$. A1

- We need to find the probability $P(\bar{A} < 205)$. M1
- Standardise the value: $Z = \frac{\bar{A} - \mu_{\bar{A}}}{\sigma_{\bar{A}}} = \frac{205 - 210}{\sqrt{28.125}}$. M1
- $P(\bar{A} < 205) = P(Z < \frac{-5}{5.3033...}) = P(Z < -0.9428)$. M1
- By symmetry, this is equal to $1 - P(Z < 0.9428)$. M1
- Using standard normal tables, $1 - \Phi(0.9428) = 1 - 0.8271$. M1
- The final probability is $0.1729$. A1