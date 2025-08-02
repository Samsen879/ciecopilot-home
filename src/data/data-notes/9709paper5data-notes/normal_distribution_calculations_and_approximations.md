## The Normal Distribution: Standardisation and Probabilities

**Syllabus Reference**: S1 5.5.1

**Learning Objective**: Understand the properties of a normal distribution, standardise a variable $X \sim N(\mu, \sigma^2)$ to $Z \sim N(0, 1)$, and use tables to calculate probabilities.

### Example Question
The masses of apples, $M$ grams, from a particular tree are normally distributed with a mean of 110 g and a standard deviation of 8 g.
(i) State the distribution of $M$ in the form $N(\mu, \sigma^2)$.
(ii) Find the probability that a randomly chosen apple has a mass between 100 g and 120 g.

### Mark Scheme / Solution
(i)
The mean $\mu = 110$.
The standard deviation $\sigma = 8$, so the variance $\sigma^2 = 8^2 = 64$. (M1 for correct variance)
Therefore, $M \sim N(110, 64)$. (A1)

(ii)
We need to find $P(100 < M < 120)$.
Standardise the boundary values:
$Z_1 = \frac{X - \mu}{\sigma} = \frac{100 - 110}{8} = -1.25$ (M1 for one correct standardisation)
$Z_2 = \frac{120 - 110}{8} = 1.25$
So we need $P(-1.25 < Z < 1.25)$.

Using standard normal tables/calculator:
$\Phi(1.25) = 0.8944$ (B1 for correct value from tables)
$P(-1.25 < Z < 1.25) = \Phi(1.25) - \Phi(-1.25)$
By symmetry, $\Phi(-1.25) = 1 - \Phi(1.25) = 1 - 0.8944 = 0.1056$. (M1 for using symmetry correctly)
$P(-1.25 < Z < 1.25) = 0.8944 - 0.1056 = 0.7888$.
Alternatively, $P(-1.25 < Z < 1.25) = 2 \times \Phi(1.25) - 1 = 2 \times 0.8944 - 1 = 0.7888$.
The probability is 0.789 (to 3 s.f.). (A1)

### Standard Solution Steps
1.  **Identify Parameters**: From the question, determine the mean $\mu$ and the standard deviation $\sigma$. Be careful to use $\sigma$, not the variance $\sigma^2$.
2.  **State the Goal**: Write down the probability you need to find, e.g., $P(X > a)$, $P(X < b)$, or $P(a < X < b)$.
3.  **Standardise**: Convert the $X$ value(s) to $Z$ value(s) using the formula $Z = \frac{X - \mu}{\sigma}$.
4.  **Sketch the Curve**: Draw a quick sketch of the standard normal curve and shade the required area. This helps to visualise whether you need to use $\Phi(z)$, $1-\Phi(z)$, or a combination.
5.  **Use Tables/Calculator**: Look up the value of $\Phi(z)$ for your calculated $Z$ score.
6.  **Calculate Final Probability**:
    *   For $P(Z < z)$, the answer is $\Phi(z)$.
    *   For $P(Z > z)$, the answer is $1 - \Phi(z)$.
    *   For $P(Z < -z)$, the answer is $1 - \Phi(z)$.
    *   For $P(a < Z < b)$, the answer is $\Phi(b) - \Phi(a)$.

### Common Mistakes
- **Variance vs. Standard Deviation**: Using the variance $\sigma^2$ instead of the standard deviation $\sigma$ in the standardisation formula. This is the most common error.
- **Table Reading Errors**: Misreading the normal distribution table.
- **Symmetry Errors**: Incorrectly calculating probabilities for negative Z-values, e.g., thinking $P(Z < -1) = P(Z < 1)$ instead of $P(Z > 1)$.
- **Final Calculation Errors**: Calculating $P(a < X < b)$ as $1 - \Phi(b) - \Phi(a)$ or other incorrect combinations. A sketch prevents this.
- **Premature Rounding**: Rounding the Z-score too early, leading to final answer inaccuracies. Keep at least 3-4 decimal places for Z-scores.

### Tags
normal_distribution, standardisation, z_score, probability, standard_normal

---

## The Normal Distribution: Inverse Calculations

**Syllabus Reference**: S1 5.5.1

**Learning Objective**: Use the normal distribution in reverse to find a variable's value given a probability, or to find unknown parameters $\mu$ and $\sigma$.

### Example Question
The lifetimes of a certain brand of light bulb are normally distributed. It is found that 15% of bulbs have a lifetime of less than 4800 hours and 10% have a lifetime of more than 5100 hours. Find the mean ($\mu$) and standard deviation ($\sigma$) of the lifetimes.

### Mark Scheme / Solution
Let $X$ be the lifetime of a bulb. $X \sim N(\mu, \sigma^2)$.
Given: $P(X < 4800) = 0.15$ and $P(X > 5100) = 0.10$.

**Step 1: Find Z-values for the given probabilities.**
For $P(X < 4800) = 0.15$:
The Z-value is negative. We look for $p=0.15$ in the table, which corresponds to looking up $1-0.15 = 0.85$.
$\Phi(z_1) = 0.85 \implies z_1 \approx 1.036$. So the required Z-value is $-1.036$. (B1)

For $P(X > 5100) = 0.10$:
This means $P(Z > z_2) = 0.10$, so $P(Z < z_2) = 0.90$.
$\Phi(z_2) = 0.90 \implies z_2 \approx 1.282$. (B1)

**Step 2: Set up simultaneous equations using the standardisation formula.**
Equation 1: $\frac{4800 - \mu}{\sigma} = -1.036 \implies 4800 - \mu = -1.036\sigma$ (M1 for one correct equation)
Equation 2: $\frac{5100 - \mu}{\sigma} = 1.282 \implies 5100 - \mu = 1.282\sigma$ (M1 for second correct equation)

**Step 3: Solve the simultaneous equations.**
Subtract Equation 1 from Equation 2:
$(5100 - \mu) - (4800 - \mu) = 1.282\sigma - (-1.036\sigma)$
$300 = 2.318\sigma$ (M1 for a valid method to solve)
$\sigma = \frac{300}{2.318} = 129.42... \approx 129$ (to 3 s.f.) (A1)

Substitute $\sigma$ back into Equation 2:
$5100 - \mu = 1.282 \times 129.42$
$5100 - \mu = 165.91$
$\mu = 5100 - 165.91 = 4934.09... \approx 4930$ (to 3 s.f.) (A1)

### Standard Solution Steps
1.  **Define Variables**: Let $X \sim N(\mu, \sigma^2)$.
2.  **Translate Probabilities**: Convert the problem statement into probability expressions, e.g., $P(X < a) = p$ or $P(X > b) = q$.
3.  **Sketch Curves**: Draw sketches for each piece of information. Shade the area corresponding to the probability. This is crucial for determining the sign of the Z-value.
4.  **Find Z-values**: Use the standard normal table *in reverse*.
    *   If $P(Z < z) = p$ and $p > 0.5$, look for $p$ in the body of the table to find $z$.
    *   If $P(Z < z) = p$ and $p < 0.5$, look for $1-p$ to find a positive Z-value, then take the negative of it.
5.  **Formulate Equations**: For each piece of information, create an equation using the standardisation formula: $z = \frac{x - \mu}{\sigma}$.
6.  **Solve**: Solve the resulting equation(s). If finding one unknown ($x$, $\mu$, or $\sigma$), this is simple algebra. If finding both $\mu$ and $\sigma$, you will need to solve a pair of simultaneous linear equations.

### Common Mistakes
- **Sign Errors on Z-values**: Using a positive Z-value for a probability less than 0.5, or vice versa. A sketch is the best way to avoid this.
- **Table Lookup Errors**: When finding Z for $P(X > b) = q$, incorrectly looking up $q$ instead of $1-q$ in the table.
- **Algebraic Errors**: Mistakes made when rearranging the standardisation formula or when solving simultaneous equations.
- **Confusing Finding $X$ with Finding $\mu$ or $\sigma$**: Applying the wrong method for the question type.

### Tags
inverse_normal, find_mu, find_sigma, normal_distribution, simultaneous_equations, z_score

---

## The Normal Distribution: Approximation to the Binomial

**Syllabus Reference**: S1 5.5.2

**Learning Objective**: Recall the conditions for using the normal distribution as an approximation to the binomial distribution, and use it with a continuity correction.

### Example Question
In a certain country, 65% of the population support the government. A random sample of 200 people is selected. Use a suitable approximation to find the probability that more than 140 people in the sample support the government.

### Mark Scheme / Solution
Let $X$ be the number of people who support the government.
$X \sim B(n, p)$ with $n=200$ and $p=0.65$. (B1 for stating binomial distribution and parameters)

**Step 1: Check conditions for approximation.**
$np = 200 \times 0.65 = 130$
$nq = 200 \times (1-0.65) = 200 \times 0.35 = 70$
Since both $np > 5$ and $nq > 5$, a normal approximation is suitable. (M1 for checking conditions)

**Step 2: Define the approximating normal distribution.**
Let $Y \sim N(\mu, \sigma^2)$.
Mean $\mu = np = 130$.
Variance $\sigma^2 = npq = 200 \times 0.65 \times 0.35 = 45.5$. (M1 for correct $\mu$ and $\sigma^2$)

**Step 3: Apply continuity correction.**
We need to find $P(X > 140)$. Since $X$ is discrete, this is equivalent to $P(X \ge 141)$.
The continuity correction for this discrete region is $P(Y > 140.5)$. (M1 for correct continuity correction)

**Step 4: Standardise and find the probability.**
$Z = \frac{Y - \mu}{\sigma} = \frac{140.5 - 130}{\sqrt{45.5}}$ (M1 for standardising with their $\mu, \sigma$ and corrected value)
$Z = \frac{10.5}{6.745} = 1.5566...$
$P(Z > 1.557) = 1 - \Phi(1.557)$
$= 1 - 0.9403 = 0.0597$ (A1)

### Standard Solution Steps
1.  **Identify the Binomial Distribution**: State $X \sim B(n, p)$ and identify $n$ and $p$.
2.  **Check Conditions**: Calculate $np$ and $nq$. State that since both are greater than 5, a normal approximation is appropriate.
3.  **Calculate Normal Parameters**: Find the mean $\mu = np$ and variance $\sigma^2 = npq$ for the approximating distribution.
4.  **Apply Continuity Correction (CC)**: This is the most critical step. Convert the discrete binomial inequality into a continuous normal inequality.

| Binomial ($X$) | Normal ($Y$) with CC | Reason                                    |
| :------------- | :--------------------- | :---------------------------------------- |
| $P(X > k)$     | $P(Y > k+0.5)$         | e.g., $>10$ is $11, 12...$, so start at 10.5  |
| $P(X \ge k)$   | $P(Y > k-0.5)$         | e.g., $\ge10$ is $10, 11...$, so start at 9.5   |
| $P(X < k)$     | $P(Y < k-0.5)$         | e.g., $<10$ is $9, 8...$, so end at 9.5     |
| $P(X \le k)$   | $P(Y < k+0.5)$         | e.g., $\le10$ is $10, 9...$, so end at 10.5   |
| $P(X = k)$     | $P(k-0.5 < Y < k+0.5)$ | The bar for $k$ goes from $k-0.5$ to $k+0.5$ |

5.  **Standardise and Solve**: Use the corrected value, $\mu$, and $\sigma = \sqrt{npq}$ to calculate the Z-score and find the final probability.

### Common Mistakes
- **Forgetting Conditions**: Failing to state and check that $np > 5$ and $nq > 5$.
- **Incorrect Parameters**: Using $\sigma = npq$ instead of $\sigma^2 = npq$.
- **Continuity Correction Errors**: This is the most frequent major mistake.
    - Forgetting the correction entirely.
    - Applying it in the wrong direction (e.g., using $140-0.5$ for $X>140$).
    - Confusing strict and non-strict inequalities (e.g., treating $P(X>k)$ the same as $P(X \ge k)$).
- **Using Binomial Formula**: Attempting to calculate the exact binomial probability when an approximation is clearly required due to large $n$.

### Tags
- normal approximation, binomial distribution, continuity correction, np > 5, nq > 5, large sample