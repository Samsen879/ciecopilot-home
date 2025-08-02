# Summation of Series (FP1)

---

### Entry 1: Summation using Standard Formulae

#### Question

Let $S_n = \sum_{r=1}^{n} (r^3 - 4r)$.

(a) Use the standard results for $\sum r^3$ and $\sum r$ to show that $S_n = \frac{1}{4}n(n+1)(n^2+n-8)$.

(b) Hence, find the value of $\sum_{r=5}^{10} (r^3 - 4r)$.

(c) Find an expression for $\sum_{r=n+1}^{2n} (r^3 - 4r)$ in terms of $n$, simplifying your answer as a product of linear factors.

#### Solution

(a)
$S_n = \sum_{r=1}^{n} (r^3 - 4r) = \sum_{r=1}^{n} r^3 - 4 \sum_{r=1}^{n} r$
Using the standard formulae from MF19:
$\sum_{r=1}^{n} r^3 = \frac{1}{4}n^2(n+1)^2$
$\sum_{r=1}^{n} r = \frac{1}{2}n(n+1)$
So, $S_n = \frac{1}{4}n^2(n+1)^2 - 4\left(\frac{1}{2}n(n+1)\right)$
$S_n = \frac{1}{4}n^2(n+1)^2 - 2n(n+1)$
Factor out $\frac{1}{4}n(n+1)$:
$S_n = \frac{1}{4}n(n+1) [n(n+1) - 8]$
$S_n = \frac{1}{4}n(n+1)(n^2+n-8)$

(b)
The required sum is $S_{10} - S_4$.
$S_{10} = \frac{1}{4}(10)(11)(10^2+10-8) = \frac{1}{4}(110)(102) = \frac{11220}{4} = 2805$
$S_4 = \frac{1}{4}(4)(5)(4^2+4-8) = 5(16+4-8) = 5(12) = 60$
$\sum_{r=5}^{10} (r^3 - 4r) = 2805 - 60 = 2745$

(c)
The required sum is $S_{2n} - S_n$.
$S_{2n} = \frac{1}{4}(2n)(2n+1)((2n)^2+2n-8) = \frac{1}{2}n(2n+1)(4n^2+2n-8) = n(2n+1)(2n^2+n-4)$
$S_{2n} - S_n = n(2n+1)(2n^2+n-4) - \frac{1}{4}n(n+1)(n^2+n-8)$
Factor out $\frac{1}{4}n$:
$= \frac{1}{4}n [4(2n+1)(2n^2+n-4) - (n+1)(n^2+n-8)]$
$= \frac{1}{4}n [(8n+4)(2n^2+n-4) - (n^3+n^2-8n+n^2+n-8)]$
$= \frac{1}{4}n [16n^3+8n^2-32n+8n^2+4n-16 - (n^3+2n^2-7n-8)]$
$= \frac{1}{4}n [16n^3+16n^2-28n-16 - n^3-2n^2+7n+8]$
$= \frac{1}{4}n [15n^3+14n^2-21n-8]$

#### Mark Scheme

(a)
Splits the summation into $\sum r^3$ and $\sum r$. M1
Substitutes the correct standard formulae for both sums. M1
Factorises $\frac{1}{4}n(n+1)$ from the expression. M1
Correctly shows intermediate step $[n(n+1) - 8]$ and reaches the given answer. A1 AG

(b)
Expresses sum as $S_{10} - S_4$. M1
Calculates $S_{10}=2805$ and $S_4=60$. A1
Correct final answer $2745$. A1

(c)
Expresses sum as $S_{2n} - S_n$. M1
Correctly substitutes $2n$ into the formula for $S_n$. A1
Attempts to expand and simplify the expression for $S_{2n} - S_n$. M1
Obtains a correct simplified expression in polynomial form. A1
Final answer $\frac{1}{4}n(15n^3+14n^2-21n-8)$. A1

#### Common Mistakes

- Incorrectly recalling the standard formulae, e.g., mixing up the formulae for $\sum r^2$ and $\sum r^3$.
- Algebraic errors when factorising the expression for $S_n$. A common mistake is to write $S_n = \frac{1}{4}n(n+1)[n(n+1)] - 2n(n+1)$, forgetting the factor has been taken out.
- For part (b), calculating $S_{10} - S_5$ instead of $S_{10} - S_4$. The sum from $5$ to $10$ includes the term for $r=5$.
- For part (c), major algebraic errors when expanding $S_{2n}$ and simplifying the difference $S_{2n} - S_n$. Particular care must be taken with signs when subtracting the second bracket.

---

### Entry 2: Method of Differences with Partial Fractions

#### Question

Let the general term of a series be $u_r = \frac{2}{r(r+2)}$.

(a) Express $u_r$ in partial fractions.

(b) Hence, find an expression for $S_N = \sum_{r=1}^{N} u_r$.

(c) State the value of $\sum_{r=1}^{\infty} u_r$.

#### Solution

(a)
Let $\frac{2}{r(r+2)} = \frac{A}{r} + \frac{B}{r+2}$.
$2 = A(r+2) + Br$.
If $r=0$, $2 = 2A \implies A=1$.
If $r=-2$, $2 = -2B \implies B=-1$.
So, $u_r = \frac{1}{r} - \frac{1}{r+2}$.

(b)
$S_N = \sum_{r=1}^{N} \left(\frac{1}{r} - \frac{1}{r+2}\right)$.
List the terms to show the cancellation:
$r=1: \quad \frac{1}{1} - \frac{1}{3}$
$r=2: \quad \frac{1}{2} - \frac{1}{4}$
$r=3: \quad \frac{1}{3} - \frac{1}{5}$
$r=4: \quad \frac{1}{4} - \frac{1}{6}$
...
$r=N-1: \quad \frac{1}{N-1} - \frac{1}{N+1}$
$r=N: \quad \frac{1}{N} - \frac{1}{N+2}$

The terms that do not cancel are $\frac{1}{1}$, $\frac{1}{2}$, $-\frac{1}{N+1}$ and $-\frac{1}{N+2}$.
$S_N = 1 + \frac{1}{2} - \frac{1}{N+1} - \frac{1}{N+2}$.
$S_N = \frac{3}{2} - \frac{1}{N+1} - \frac{1}{N+2}$.
To simplify further:
$S_N = \frac{3(N+1)(N+2) - 2(N+2) - 2(N+1)}{2(N+1)(N+2)}$
$S_N = \frac{3(N^2+3N+2) - 2N-4 - 2N-2}{2(N+1)(N+2)}$
$S_N = \frac{3N^2+9N+6 - 4N-6}{2(N+1)(N+2)} = \frac{3N^2+5N}{2(N+1)(N+2)} = \frac{N(3N+5)}{2(N+1)(N+2)}$.

(c)
The sum to infinity is the limit of $S_N$ as $N \to \infty$.
$S_{\infty} = \lim_{N\to\infty} \left(\frac{3}{2} - \frac{1}{N+1} - \frac{1}{N+2}\right)$.
As $N \to \infty$, the terms $\frac{1}{N+1}$ and $\frac{1}{N+2}$ both tend to $0$.
So, $\sum_{r=1}^{\infty} u_r = \frac{3}{2}$.

#### Mark Scheme

(a)
Correctly sets up the partial fraction form $\frac{A}{r} + \frac{B}{r+2}$. M1
Finds either $A=1$ or $B=-1$. A1
Correct final form $\frac{1}{r} - \frac{1}{r+2}$. A1

(b)
Expresses the sum in terms of the partial fractions. M1
Lists at least two terms at the start and one at the end to show the cancellation pattern. M1
Correctly identifies all remaining terms: $1, \frac{1}{2}, -\frac{1}{N+1}, -\frac{1}{N+2}$. A1
Correctly states the sum as $S_N = \frac{3}{2} - \frac{1}{N+1} - \frac{1}{N+2}$. A1
(An optional A1 for a fully simplified single fraction form).

(c)
Considers the limit of their $S_N$ as $N \to \infty$. M1
States the correct sum to infinity as $\frac{3}{2}$. A1 FT (Follow through from their answer in (b)).

#### Common Mistakes

- In part (a), sign errors in calculating the numerators $A$ and $B$.
- In part (b), not writing out enough terms to see the cancellation pattern correctly. With a gap of 2 in the denominator (r and r+2), two terms remain at the beginning and two at the end. Students often mistakenly assume only one term remains at each end.
- Algebraic errors when combining the final terms into a single fraction.
- In part (c), stating that the sum diverges if their expression for $S_N$ contains a positive term in $N$. A convergent series requires that all terms involving $N$ tend to zero.

---

### Entry 3: Method of Differences and Convergence

#### Question

Let the general term of a series be $u_r = \frac{2r+1}{r^2(r+1)^2}$.

(a) Show that $u_r = \frac{1}{r^2} - \frac{1}{(r+1)^2}$.

(b) Hence, find $S_N = \sum_{r=1}^{N} \frac{2r+1}{r^2(r+1)^2}$.

(c) Find the sum to infinity, $S_{\infty}$, of the series.

(d) Find the smallest value of $N$ such that $S_N$ is within $10^{-4}$ of $S_{\infty}$.

#### Solution

(a)
Combine the right-hand side with a common denominator:
$\frac{1}{r^2} - \frac{1}{(r+1)^2} = \frac{(r+1)^2 - r^2}{r^2(r+1)^2}$
$= \frac{(r^2+2r+1) - r^2}{r^2(r+1)^2}$
$= \frac{2r+1}{r^2(r+1)^2} = u_r$.

(b)
$S_N = \sum_{r=1}^{N} \left(\frac{1}{r^2} - \frac{1}{(r+1)^2}\right)$.
This is a difference of consecutive terms, $f(r) - f(r+1)$ where $f(r) = \frac{1}{r^2}$.
List the terms:
$r=1: \quad \frac{1}{1^2} - \frac{1}{2^2}$
$r=2: \quad \frac{1}{2^2} - \frac{1}{3^2}$
...
$r=N: \quad \frac{1}{N^2} - \frac{1}{(N+1)^2}$
The sum telescopes to leave the first and last term:
$S_N = \frac{1}{1^2} - \frac{1}{(N+1)^2} = 1 - \frac{1}{(N+1)^2}$.

(c)
$S_{\infty} = \lim_{N\to\infty} S_N = \lim_{N\to\infty} \left(1 - \frac{1}{(N+1)^2}\right)$.
As $N \to \infty$, $\frac{1}{(N+1)^2} \to 0$.
So, $S_{\infty} = 1$.

(d)
We need to find the smallest $N$ such that $|S_{\infty} - S_N| < 10^{-4}$.
$|1 - (1 - \frac{1}{(N+1)^2})| < 10^{-4}$
$|\frac{1}{(N+1)^2}| < 10^{-4}$
$\frac{1}{(N+1)^2} < \frac{1}{10000}$
$(N+1)^2 > 10000$
$N+1 > \sqrt{10000}$
$N+1 > 100$
$N > 99$
The smallest integer value of $N$ is $100$.

#### Mark Scheme

(a)
Attempts to combine RHS with a common denominator. M1
Correctly expands $(r+1)^2$ and simplifies the numerator to obtain the LHS. A1 AG

(b)
Expresses the sum using the identity from part (a). M1
Lists at least the first two and last terms, or states $f(1) - f(N+1)$. M1
Correctly identifies the remaining terms and states $S_N = 1 - \frac{1}{(N+1)^2}$. A1

(c)
Considers the limit of their $S_N$ as $N \to \infty$. M1
States the correct sum to infinity $S_{\infty} = 1$. A1 FT

(d)
Sets up the inequality $|S_{\infty} - S_N| < 10^{-4}$. M1
Substitutes their expressions for $S_{\infty}$ and $S_N$ to get $\frac{1}{(N+1)^2} < 10^{-4}$. A1 FT
Solves the inequality to get $N > 99$. M1
States the smallest integer value $N = 100$. A1

#### Common Mistakes

- In part (a), algebraic errors when expanding brackets or simplifying the numerator.
- In part (b), incorrect cancellation. For this "consecutive" form $f(r)-f(r+1)$, only the first part of the first term and the second part of the last term remain. Students may incorrectly cancel and be left with more terms.
- In part (d), making an error when solving the inequality. For example, incorrectly taking the square root or getting the inequality sign reversed.
- In part (d), stating $N=99$ instead of $N=100$. The condition is $N > 99$, so the smallest integer $N$ must be $100$.