## Series: Arithmetic Progressions
**Syllabus Reference**: 9709.P1.6.1
**Learning Objective**: Understand and use the formulas for arithmetic progressions including the nth term and sum of first n terms.
### Example Question
The 4th term of an arithmetic progression is 18 and the sum of the first 10 terms is 255.
(a) Find the first term and the common difference of the progression. [4]
(b) Given that the nth term of the progression is 63, find the value of n. [2]
### Mark Scheme / Solution
(a) Use the given information to form two simultaneous equations in terms of the first term $a$ and the common difference $d$.
4th term is 18: $a + (4-1)d = 18 \implies a + 3d = 18$ (Equation 1) (M1 for using nth term formula)
Sum of first 10 terms is 255: $\frac{10}{2}(2a + (10-1)d) = 255$ (M1 for using sum formula)
$5(2a + 9d) = 255 \implies 2a + 9d = 51$ (Equation 2) (A1 for correct simplified equation)
From Equation 1, $a = 18 - 3d$.
Substitute into Equation 2: $2(18 - 3d) + 9d = 51$ (M1 for substitution)
$36 - 6d + 9d = 51$
$3d = 15 \implies d = 5$ (A1 for correct value of d)
$a = 18 - 3(5) = 3$.
So, the first term $a = 3$ and the common difference $d = 5$. (A1 for correct values)

(b) nth term is 63: $u_n = a + (n-1)d = 63$.
$3 + (n-1)5 = 63$ (M1 for substitution)
$(n-1)5 = 60$
$n-1 = 12 \implies n = 13$. (A1 for correct value of n)
### Standard Solution Steps
- Use the nth term formula $u_n = a + (n-1)d$ for the first piece of information
- Use the sum formula $S_n = \frac{n}{2}(2a + (n-1)d)$ for the second piece of information
- Form two simultaneous equations and solve for $a$ and $d$
- For finding n, substitute known values into the nth term formula
### Common Mistakes
- Mixing up the formulas for the nth term and the sum of n terms
- Making algebraic errors when solving the simultaneous equations
- Forgetting that the common difference $d$ can be negative or a fraction
- Incorrect substitution of values
### Tags
arithmetic progression, AP, nth term, sum of terms, simultaneous equations

## Series: Geometric Progressions
**Syllabus Reference**: 9709.P1.6.2
**Learning Objective**: Understand and use the formulas for geometric progressions including the nth term, sum of first n terms, and sum to infinity.
### Example Question
The second term of a geometric progression is 8. The sum to infinity of the progression is 36.
(a) Find the possible values of the first term $a$ and the common ratio $r$. [4]
(b) For the case where the progression is convergent, find the sum of the first 8 terms, giving your answer correct to 3 decimal places. [3]
### Mark Scheme / Solution
(a) Use the given information to form two equations in terms of $a$ and $r$.
2nd term is 8: $ar = 8$ (Equation 1) (B1 for using nth term formula)
Sum to infinity is 36: $\frac{a}{1-r} = 36$ (Equation 2) (B1 for using sum to infinity formula)
From Equation 1, $a = \frac{8}{r}$.
Substitute into Equation 2: $\frac{8/r}{1-r} = 36$ (M1 for substitution)
$8 = 36r(1-r)$
$8 = 36r - 36r^2$
$36r^2 - 36r + 8 = 0$
$9r^2 - 9r + 2 = 0$ (A1 for correct quadratic equation)
Factorising: $(3r - 1)(3r - 2) = 0$ (M1 for factorising)
So, $r = \frac{1}{3}$ or $r = \frac{2}{3}$. (A1 for correct values of r)
Case 1: $r = \frac{1}{3} \implies a = \frac{8}{1/3} = 24$.
Case 2: $r = \frac{2}{3} \implies a = \frac{8}{2/3} = 12$.
Possible pairs are $(a=24, r=1/3)$ and $(a=12, r=2/3)$. (A1 for both correct pairs)

(b) Both values of $r$ satisfy $|r|<1$, so both are convergent. Using $a=12$ and $r=2/3$.
$S_8 = \frac{a(1-r^8)}{1-r} = \frac{12(1 - (\frac{2}{3})^8)}{1 - \frac{2}{3}}$ (M1 for using sum formula)
$S_8 = \frac{12(1 - \frac{256}{6561})}{1/3}$
$S_8 = 36(1 - \frac{256}{6561}) = 36(\frac{6305}{6561})$ (A1 for correct calculation)
$S_8 = 35.0266...$
$S_8 = 35.027$ (to 3 d.p.) (A1 for correct final answer)
### Standard Solution Steps
- Use the nth term formula $u_n = ar^{n-1}$ for given terms
- Use the sum to infinity formula $S_{\infty} = \frac{a}{1-r}$ where $|r| < 1$
- Form simultaneous equations and solve (often leading to a quadratic)
- Check convergence condition $|r| < 1$ before using sum to infinity
- Use sum formula $S_n = \frac{a(1-r^n)}{1-r}$ for finite sums
### Common Mistakes
- Using the wrong formulas, particularly for sum to infinity
- Errors when solving the simultaneous equations, especially when it leads to a quadratic
- Not checking the condition for convergence $|r|<1$ when using the sum to infinity formula
- Calculation errors with fractions and powers in the sum of n terms formula
### Tags
geometric progression, GP, nth term, sum of terms, sum to infinity, convergence

## Series: Binomial Expansion
**Syllabus Reference**: 9709.P1.6.3
**Learning Objective**: Use the binomial theorem to expand expressions of the form $(a+b)^n$ and find specific terms or coefficients.
### Example Question
(a) Find the first four terms in the expansion of $(2 - \frac{x}{4})^{10}$ in ascending powers of $x$. [4]
(b) Hence, find the coefficient of $x^3$ in the expansion of $(1 + 4x)(2 - \frac{x}{4})^{10}$. [2]
### Mark Scheme / Solution
(a) Expansion is $(2 - \frac{x}{4})^{10}$. Here $a=2$, $b=-\frac{x}{4}$, $n=10$.
Term 1: $\binom{10}{0} (2)^{10} = 1 \times 1024 = 1024$. (B1 for constant term)
Term 2: $\binom{10}{1} (2)^{9} (-\frac{x}{4})^1 = 10 \times 512 \times (-\frac{x}{4}) = -1280x$. (M1 for binomial coefficient, A1 for correct term)
Term 3: $\binom{10}{2} (2)^{8} (-\frac{x}{4})^2 = 45 \times 256 \times (\frac{x^2}{16}) = 720x^2$. (A1 for correct term)
Term 4: $\binom{10}{3} (2)^{7} (-\frac{x}{4})^3 = 120 \times 128 \times (-\frac{x^3}{64}) = -240x^3$. (A1 for correct term)
So, the first four terms are $1024 - 1280x + 720x^2 - 240x^3$.

(b) We need the coefficient of $x^3$ in $(1 + 4x)(1024 - 1280x + 720x^2 - 240x^3 + ...)$.
The terms which produce $x^3$ are:
$1 \times (-240x^3) = -240x^3$
$4x \times (720x^2) = 2880x^3$ (M1 for identifying terms)
The total coefficient of $x^3$ is $-240 + 2880 = 2640$. (A1 for correct coefficient)
### Standard Solution Steps
- Identify $a$, $b$, and $n$ in the binomial expression
- Apply the binomial theorem systematically for each term
- Pay attention to signs and powers of both parts of the binomial
- For coefficient problems, identify which products give the required power
- Calculate and add the relevant coefficients
### Common Mistakes
- Forgetting the negative sign on the term $b$ throughout the expansion
- Errors in calculating the binomial coefficients $\binom{n}{r}$
- Forgetting to raise both the number and the variable part of a term to the power
- In coefficient problems, only finding one of the products that gives the required term
- Sign errors when dealing with negative terms
### Tags
binomial expansion, binomial coefficient, coefficient of x, ascending powers