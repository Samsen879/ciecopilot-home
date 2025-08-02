## Proof by Induction: Summation Formulas

**Syllabus Reference**: 1.7 Proof by induction

**Learning Objective**: Use the method of mathematical induction to establish a given result for summation of series.

### Example Question
Prove by mathematical induction that, for all positive integers $n$,
$ \sum_{r=1}^{n} r(r+3) = \frac{1}{3}n(n+1)(n+5) $.

### Mark Scheme / Solution
Let $P(n)$ be the statement $ \sum_{r=1}^{n} r(r+3) = \frac{1}{3}n(n+1)(n+5) $.

For $n=1$, LHS = $1(1+3) = 4$.
RHS = $\frac{1}{3}(1)(1+1)(1+5) = \frac{1}{3}(1)(2)(6) = 4$.
LHS = RHS, so $P(1)$ is true. B1

Assume that $P(k)$ is true for some positive integer $k$, so $ \sum_{r=1}^{k} r(r+3) = \frac{1}{3}k(k+1)(k+5) $. B1

Consider $P(k+1)$:
$ \sum_{r=1}^{k+1} r(r+3) = \sum_{r=1}^{k} r(r+3) + (k+1)(k+1+3) $ M1
$ = \frac{1}{3}k(k+1)(k+5) + (k+1)(k+4) $ M1
$ = \frac{1}{3}(k+1) [k(k+5) + 3(k+4)] $
$ = \frac{1}{3}(k+1) [k^2+5k + 3k+12] $
$ = \frac{1}{3}(k+1) [k^2+8k+12] $ A1
$ = \frac{1}{3}(k+1)(k+2)(k+6) $
$ = \frac{1}{3}(k+1)((k+1)+1)((k+1)+5) $
This is of the required form for $n=k+1$.

Since $P(1)$ is true and $P(k)$ true implies $P(k+1)$ is true, by the principle of mathematical induction, the statement is true for all positive integers $n$. A1

### Standard Solution Steps
- State the proposition $P(n)$.
- Prove the base case, usually for $n=1$, by showing LHS = RHS.
- State the inductive hypothesis, assuming the statement is true for $n=k$.
- Write down the expression for the $n=k+1$ case, separating the $k+1$ term.
- Use the inductive hypothesis to substitute the sum up to $k$.
- Manipulate the resulting algebraic expression by factorisation to show it matches the required formula for $n=k+1$.
- Write a concluding statement referencing the base case, the inductive step, and the principle of induction.

### Common Mistakes
- An incomplete or missing conclusion. Simply stating "proven" is not enough.
- Algebraic errors when combining the sum up to $k$ with the $(k+1)$th term, especially in factorisation.
- Forgetting to show the base case calculation clearly.
- Only stating the inductive hypothesis, but not explicitly using it in the $n=k+1$ step.

### Tags
- proof by induction, series, summation, algebra

---
## Proof by Induction: Divisibility

**Syllabus Reference**: 1.7 Proof by induction

**Learning Objective**: Use the method of mathematical induction to establish a given result for divisibility.

### Example Question
Prove by mathematical induction that, for all positive integers $n$, $f(n) = 5^{2n} - 6n + 8$ is divisible by 9.

### Mark Scheme / Solution
Let $P(n)$ be the statement "$f(n) = 5^{2n} - 6n + 8$ is divisible by 9".

For $n=1$, $f(1) = 5^2 - 6(1) + 8 = 25 - 6 + 8 = 27$.
$27 = 3 \times 9$, so $f(1)$ is divisible by 9. $P(1)$ is true. B1

Assume that $P(k)$ is true for some positive integer $k$, so $f(k) = 5^{2k} - 6k + 8 = 9m$ for some integer $m$. B1
This means $5^{2k} = 9m + 6k - 8$.

Consider $f(k+1)$:
$f(k+1) = 5^{2(k+1)} - 6(k+1) + 8$ M1
$ = 5^{2k} \cdot 5^2 - 6k - 6 + 8$
$ = 25(5^{2k}) - 6k + 2$
Substitute for $5^{2k}$ using the hypothesis: M1
$f(k+1) = 25(9m + 6k - 8) - 6k + 2$
$ = 225m + 150k - 200 - 6k + 2$
$ = 225m + 144k - 198$ A1
$ = 9(25m + 16k - 22)$
Since $m$ and $k$ are integers, $25m + 16k - 22$ is an integer.
Therefore $f(k+1)$ is divisible by 9.

Since $P(1)$ is true and $P(k)$ true implies $P(k+1)$ is true, by the principle of mathematical induction, the statement is true for all positive integers $n$. A1

### Standard Solution Steps
- State the proposition $P(n)$.
- Prove the base case for $n=1$.
- State the inductive hypothesis, assuming $f(k)$ is divisible by the required number for $n=k$. This can be written as $f(k) = dM$ where $d$ is the divisor.
- Consider $f(k+1)$ and manipulate it to isolate a multiple of $f(k)$.
- A common alternative is to consider $f(k+1) - c \cdot f(k)$, choosing a constant $c$ that simplifies the expression.
- Show that the resulting expression is a sum of terms, each of which is divisible by $d$.
- Write the full concluding statement.

### Common Mistakes
- Incorrectly manipulating $f(k+1)$. A common error is to write $f(k+1) = f(k) + \dots$ which is rarely true.
- Making an assertion without proof, such as stating $f(k+1) - f(k)$ is divisible by 9 without showing the algebra.
- Failing to express the assumption $f(k)$ is divisible by $d$ algebraically (e.g., $f(k)=dM$).

### Tags
- proof by induction, divisibility, number theory

---
## Proof by Induction: Recurrence Relations

**Syllabus Reference**: 1.7 Proof by induction

**Learning Objective**: Use the method of mathematical induction to establish a given result for recurrence relations.

### Example Question
A sequence $u_n$ is defined by $u_1 = 1$ and $u_{n+1} = 5u_n - 4$ for $n \ge 1$.
Prove by mathematical induction that $u_n = 5^{n-1} + 1$ for all positive integers $n$.

### Mark Scheme / Solution
Let $P(n)$ be the statement $u_n = 5^{n-1} + 1$.

For $n=1$, the formula gives $u_1 = 5^{1-1} + 1 = 5^0 + 1 = 1 + 1 = 2$.
From the definition, $u_1 = 1$.
Wait, let me adjust the question so the formula works. Let $u_n = \frac{1}{4}(5^n-1)$.
For $n=1$, $u_1 = 5u_0 - 4$... No, the question should be correct.
Let's restart the question with a working formula.

A sequence $u_n$ is defined by $u_1 = 2$ and $u_{n+1} = 3u_n - 2$ for $n \ge 1$.
Prove by mathematical induction that $u_n = 3^{n-1} + 1$ for all positive integers $n$.

Let $P(n)$ be the statement $u_n = 3^{n-1} + 1$.
For $n=1$, the formula gives $u_1 = 3^{1-1} + 1 = 1+1=2$. The definition states $u_1=2$. So $P(1)$ is true. B1

Assume that $P(k)$ is true for some positive integer $k$, so $u_k = 3^{k-1} + 1$. B1

Consider $u_{k+1}$. From the recurrence relation:
$u_{k+1} = 3u_k - 2$ M1
Substitute the assumption for $u_k$:
$u_{k+1} = 3(3^{k-1} + 1) - 2$ M1
$ = 3 \cdot 3^{k-1} + 3 - 2 $
$ = 3^k + 1$ A1
$ = 3^{(k+1)-1} + 1$
This is the required formula for $n=k+1$.

Since $P(1)$ is true and $P(k)$ true implies $P(k+1)$ is true, by the principle of mathematical induction, the statement is true for all positive integers $n$. A1

### Standard Solution Steps
- State the proposition $P(n)$.
- Prove the base case is true by comparing the given formula with the initial value from the recurrence definition.
- State the inductive hypothesis, assuming the formula is true for $n=k$.
- Use the recurrence relation to write an expression for $u_{k+1}$.
- Substitute the assumed formula for $u_k$ into this expression.
- Use algebraic manipulation (often laws of indices) to show the expression simplifies to the required formula for $n=k+1$.
- Write the full concluding statement.

### Common Mistakes
- Confusing the recurrence relation (the rule to get the next term) with the closed-form formula (the target expression).
- Errors with indices when simplifying the expression for $u_{k+1}$.
- In the base case, using the formula to check itself rather than comparing it to the given definition of $u_1$.

### Tags
- proof by induction, recurrence relations, sequences, series

---
## Proof by Induction: Powers of Matrices

**Syllabus Reference**: 1.7 Proof by induction

**Learning Objective**: Use the method of mathematical induction to establish a given result for matrix properties.

### Example Question
Let the matrix $\mathbf{M}$ be given by $\begin{pmatrix} 2 & -1 \\ 0 & 1 \end{pmatrix}$.
Prove by mathematical induction that, for all positive integers $n$,
$\mathbf{M}^n = \begin{pmatrix} 2^n & 1-2^n \\ 0 & 1 \end{pmatrix}$.

### Mark Scheme / Solution
Let $P(n)$ be the statement $\mathbf{M}^n = \begin{pmatrix} 2^n & 1-2^n \\ 0 & 1 \end{pmatrix}$.

For $n=1$, the formula gives $\mathbf{M}^1 = \begin{pmatrix} 2^1 & 1-2^1 \\ 0 & 1 \end{pmatrix} = \begin{pmatrix} 2 & -1 \\ 0 & 1 \end{pmatrix}$. This is the given matrix $\mathbf{M}$, so $P(1)$ is true. B1

Assume that $P(k)$ is true for some positive integer $k$, so $\mathbf{M}^k = \begin{pmatrix} 2^k & 1-2^k \\ 0 & 1 \end{pmatrix}$. B1

Consider $\mathbf{M}^{k+1} = \mathbf{M}^k \mathbf{M}$. M1
$\mathbf{M}^{k+1} = \begin{pmatrix} 2^k & 1-2^k \\ 0 & 1 \end{pmatrix} \begin{pmatrix} 2 & -1 \\ 0 & 1 \end{pmatrix}$ M1
$ = \begin{pmatrix} 2^k(2) + (1-2^k)(0) & 2^k(-1) + (1-2^k)(1) \\ 0(2) + 1(0) & 0(-1) + 1(1) \end{pmatrix} $
$ = \begin{pmatrix} 2^{k+1} & -2^k + 1-2^k \\ 0 & 1 \end{pmatrix} $ This is incorrect. Let's re-calculate.
$ = \begin{pmatrix} 2^k(2) + (1-2^k)(0) & 2^k(-1) + (1-2^k)(1) \\ 0(2) + 1(0) & 0(-1) + 1(1) \end{pmatrix} $
$ = \begin{pmatrix} 2 \cdot 2^k & -2^k + 1 - 2^k \\ 0 & 1 \end{pmatrix} $. Let's re-check the question's formula.
The top right element should be $1-2^{k+1}$. Let me adjust the question.
Let $\mathbf{M} = \begin{pmatrix} 3 & -2 \\ 1 & 0 \end{pmatrix}$. Prove $\mathbf{M}^n = \begin{pmatrix} 2^{n+1}-1 & 2-2^{n+1} \\ 2^n-1 & 2-2^n \end{pmatrix}$.

Let $P(n)$ be the statement $\mathbf{M}^n = \begin{pmatrix} 2^{n+1}-1 & 2-2^{n+1} \\ 2^n-1 & 2-2^n \end{pmatrix}$.
For $n=1$, formula gives $\mathbf{M}^1 = \begin{pmatrix} 2^2-1 & 2-2^2 \\ 2^1-1 & 2-2^1 \end{pmatrix} = \begin{pmatrix} 3 & -2 \\ 1 & 0 \end{pmatrix}$. This matches $\mathbf{M}$, so $P(1)$ is true. B1

Assume $P(k)$ is true: $\mathbf{M}^k = \begin{pmatrix} 2^{k+1}-1 & 2-2^{k+1} \\ 2^k-1 & 2-2^k \end{pmatrix}$. B1

Consider $\mathbf{M}^{k+1} = \mathbf{M}^k \mathbf{M}$. M1
$= \begin{pmatrix} 2^{k+1}-1 & 2-2^{k+1} \\ 2^k-1 & 2-2^k \end{pmatrix} \begin{pmatrix} 3 & -2 \\ 1 & 0 \end{pmatrix}$ M1
Top-left entry: $3(2^{k+1}-1) + 1(2-2^{k+1}) = 3 \cdot 2^{k+1} - 3 + 2 - 2^{k+1} = 2 \cdot 2^{k+1} - 1 = 2^{k+2} - 1$.
Top-right entry: $-2(2^{k+1}-1) + 0 = -2^{k+2} + 2$.
Bottom-left entry: $3(2^k-1) + 1(2-2^k) = 3 \cdot 2^k - 3 + 2 - 2^k = 2 \cdot 2^k - 1 = 2^{k+1} - 1$.
Bottom-right entry: $-2(2^k-1) + 0 = -2^{k+1} + 2$. A1
So $\mathbf{M}^{k+1} = \begin{pmatrix} 2^{k+2}-1 & 2-2^{k+2} \\ 2^{k+1}-1 & 2-2^{k+1} \end{pmatrix}$. This matches the formula for $n=k+1$.

Since $P(1)$ is true and $P(k)$ true implies $P(k+1)$ is true, by the principle of mathematical induction, the statement is true for all positive integers $n$. A1

### Standard Solution Steps
- State the proposition $P(n)$.
- Prove the base case for $n=1$ by showing the formula gives the original matrix.
- State the inductive hypothesis, assuming the formula is true for $n=k$.
- Set up the expression for the $n=k+1$ case as $\mathbf{M}^{k+1} = \mathbf{M}^k \mathbf{M}$.
- Substitute the assumed formula for $\mathbf{M}^k$ and multiply by $\mathbf{M}$.
- Carry out the matrix multiplication carefully, entry by entry.
- Simplify each entry to show the resulting matrix matches the required formula for $n=k+1$.
- Write the full concluding statement.

### Common Mistakes
- Errors in matrix multiplication, which is a very common source of failure.
- Errors in simplifying expressions involving powers, e.g., $3 \cdot 2^{k+1} - 2^{k+1} = 2 \cdot 2^{k+1} = 2^{k+2}$.
- Assuming $\mathbf{M}^{k+1} = \mathbf{M} \mathbf{M}^k$ but multiplying in the wrong order, i.e., calculating $\mathbf{M} \mathbf{M}^k$ instead of $\mathbf{M}^k \mathbf{M}$ (though often they are equal, it is not guaranteed unless the matrices commute).

### Tags
- proof by induction, matrices, linear algebra