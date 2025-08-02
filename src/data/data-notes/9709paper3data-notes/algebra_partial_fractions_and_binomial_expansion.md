## Algebra: Partial Fractions

**Syllabus Reference**: 9709.P3.3.1
**Learning Objective**: Understand and use the decomposition of rational functions into partial fractions including cases where the denominator has repeated linear factors. Carry out the expansion of a rational function by first expressing it in partial fractions.

### Example Question
Let $f(x) = \frac{10x^2 - x + 7}{(2-x)(1+2x)^2}$.

(i) Express $f(x)$ in partial fractions. [4]

(ii) Hence, obtain the expansion of $f(x)$ in ascending powers of $x$, up to and including the term in $x^2$. [5]

(iii) State the set of values of $x$ for which the expansion is valid. [1]

### Mark Scheme / Solution
(i) Let $\frac{10x^2 - x + 7}{(2-x)(1+2x)^2} \equiv \frac{A}{2-x} + \frac{B}{1+2x} + \frac{C}{(1+2x)^2}$. M1
$10x^2 - x + 7 \equiv A(1+2x)^2 + B(2-x)(1+2x) + C(2-x)$.

Let $x = 2$: $10(4) - 2 + 7 = A(1+4)^2 \Rightarrow 45 = 25A \Rightarrow A = \frac{45}{25} = \frac{9}{5}$. A1

Let $x = -\frac{1}{2}$: $10(\frac{1}{4}) - (-\frac{1}{2}) + 7 = C(2 - (-\frac{1}{2})) \Rightarrow \frac{5}{2} + \frac{1}{2} + 7 = C(\frac{5}{2}) \Rightarrow 10 = \frac{5}{2}C \Rightarrow C=4$. A1

Comparing coefficients of $x^2$: $10 = 4A - 2B$.
$10 = 4(\frac{9}{5}) - 2B \Rightarrow 10 = \frac{36}{5} - 2B \Rightarrow 50 = 36 - 10B \Rightarrow 10B = -14 \Rightarrow B = -\frac{7}{5}$. A1

So, $f(x) = \frac{9}{5(2-x)} - \frac{7}{5(1+2x)} + \frac{4}{(1+2x)^2}$.

(ii) Rewrite terms for expansion:
$\frac{9}{5}(2-x)^{-1} = \frac{9}{5} \times 2^{-1}(1-\frac{x}{2})^{-1} = \frac{9}{10}(1-\frac{x}{2})^{-1}$.
$-\frac{7}{5}(1+2x)^{-1}$.
$4(1+2x)^{-2}$.

Expansion of $\frac{9}{10}(1-\frac{x}{2})^{-1} = \frac{9}{10}(1 + (-1)(-\frac{x}{2}) + \frac{(-1)(-2)}{2!}(-\frac{x}{2})^2 + ...) = \frac{9}{10}(1 + \frac{x}{2} + \frac{x^2}{4})$. M1

Expansion of $-\frac{7}{5}(1+2x)^{-1} = -\frac{7}{5}(1 + (-1)(2x) + \frac{(-1)(-2)}{2!}(2x)^2 + ...) = -\frac{7}{5}(1 - 2x + 4x^2)$. M1

Expansion of $4(1+2x)^{-2} = 4(1 + (-2)(2x) + \frac{(-2)(-3)}{2!}(2x)^2 + ...) = 4(1 - 4x + 12x^2)$. M1

Combine terms:
Constant: $\frac{9}{10} - \frac{7}{5} + 4 = \frac{9-14+40}{10} = \frac{35}{10} = \frac{7}{2}$.
$x$ term: $\frac{9}{10}(\frac{1}{2}) - \frac{7}{5}(-2) + 4(-4) = \frac{9}{20} + \frac{14}{5} - 16 = \frac{9+56-320}{20} = -\frac{255}{20} = -\frac{51}{4}$. A1
$x^2$ term: $\frac{9}{10}(\frac{1}{4}) - \frac{7}{5}(4) + 4(12) = \frac{9}{40} - \frac{28}{5} + 48 = \frac{9-224+1920}{40} = \frac{1705}{40} = \frac{341}{8}$. A1

Therefore, $f(x) = \frac{7}{2} - \frac{51}{4}x + \frac{341}{8}x^2 + ...$

(iii) Validity for $(1-\frac{x}{2})^{-1}$ is $|-\frac{x}{2}| < 1 \Rightarrow |x| < 2$.
Validity for $(1+2x)^{-1}$ and $(1+2x)^{-2}$ is $|2x| < 1 \Rightarrow |x| < \frac{1}{2}$.
The overall validity is the more restrictive condition, $|x| < \frac{1}{2}$. B1

### Standard Solution Steps
- Decompose the rational function into the correct form for partial fractions, including separate terms for the non-repeated and repeated linear factors.
- Solve for the unknown constants by substituting convenient values of x and/or comparing coefficients.
- Rewrite each partial fraction term in the form $k(1+ax)^n$ to prepare for binomial expansion.
- Apply the binomial theorem to each term, expanding up to the required power of x.
- Sum the corresponding terms from each expansion to find the final series.
- Determine the valid range for x by finding the most restrictive condition from all the individual expansions.

### Common Mistakes
- Using an incorrect form for the repeated factor, such as omitting the term with denominator $(1+2x)$. The correct form is $\frac{B}{1+2x} + \frac{C}{(1+2x)^2}$.
- Forgetting to factor out the constant from a term like $(2-x)$ to get it into the required $(1+...)$ form, leading to an incorrect expansion. It must be written as $2(1-\frac{x}{2})$.
- Making sign errors in the binomial formula, especially with negative terms like $(-x/2)$ or negative powers like $n=-2$.
- Choosing the incorrect overall range of validity, often picking the less restrictive range instead of the intersection of all valid ranges.

### Tags
algebra, partial_fractions, binomial_expansion, rational_functions, 3.1, series_expansion

## Algebra: Binomial Expansion

**Syllabus Reference**: 9709.P3.3.1
**Learning Objective**: Use the expansion of $(1+x)^n$, where n is a rational number.

### Example Question
(i) Find the first three terms in the expansion of $\frac{1}{\sqrt{1-4x}}$ in ascending powers of $x$. [3]

(ii) The first three terms in the expansion of $(1+ax)\sqrt{1-4x}$ are given as $1 - x + bx^2$. Find the values of the constants $a$ and $b$. [5]

(iii) State the set of values of $x$ for which the expansion is valid. [1]

### Mark Scheme / Solution
(i) $\frac{1}{\sqrt{1-4x}} = (1-4x)^{-1/2}$. M1
$= 1 + (-\frac{1}{2})(-4x) + \frac{(-\frac{1}{2})(-\frac{3}{2})}{2!}(-4x)^2 + ...$. M1
$= 1 + 2x + \frac{3/8}{2}(16x^2) + ...$
$= 1 + 2x + 6x^2 + ...$. A1

(ii) To find the expansion of $(1+ax)\sqrt{1-4x}$, we first need the expansion of $\sqrt{1-4x} = (1-4x)^{1/2}$.
$(1-4x)^{1/2} = 1 + (\frac{1}{2})(-4x) + \frac{(\frac{1}{2})(-\frac{1}{2})}{2!}(-4x)^2 + ...$. M1
$= 1 - 2x + \frac{-1/4}{2}(16x^2) + ...$
$= 1 - 2x - 2x^2 + ...$. A1

Now multiply $(1+ax)(1-2x-2x^2+...)$. M1
$= 1(1-2x-2x^2) + ax(1-2x-2x^2) + ...$
$= 1 - 2x - 2x^2 + ax - 2ax^2 - ...$
$= 1 + (-2+a)x + (-2-2a)x^2 + ...$.

Comparing coefficients with $1 - x + bx^2$:
Coefficient of $x$: $-2+a = -1 \Rightarrow a = 1$. A1
Coefficient of $x^2$: $-2-2a = b$.
Substituting $a=1$: $-2 - 2(1) = b \Rightarrow b = -4$. A1

(iii) The expansion of $(1-4x)^n$ is valid for $|-4x| < 1$. B1
This simplifies to $|4x| < 1$, which means $|x| < \frac{1}{4}$.

### Standard Solution Steps
- Rewrite the expression using a rational exponent, e.g., $\sqrt{...}$ becomes $(...)^{1/2}$.
- Apply the general binomial theorem formula $(1+y)^n = 1 + ny + \frac{n(n-1)}{2!}y^2 + ...$.
- Carefully substitute the values for $n$ and $y$ (including any negative signs) into the formula.
- Simplify each term to get the polynomial expansion.
- For product expansions, expand each function separately and then multiply the resulting polynomials, collecting like terms up to the required power.
- Compare the coefficients of the resulting expansion with the given expansion to form and solve equations for the unknown constants.

### Common Mistakes
- Incorrectly calculating the coefficient for the $x^2$ term, often by miscalculating $\frac{n(n-1)}{2}$ or by forgetting to square the entire term being substituted for $x$ (e.g., squaring just $x$ instead of $-4x$).
- When multiplying two expansions, such as $(1+ax)(1-2x-2x^2)$, failing to collect all terms that contribute to a specific power. For example, for the $x^2$ term, students might forget the contribution from $(ax)(-2x)$.
- Making sign errors, which are very common when both the exponent $n$ and the term in the bracket are negative.
- Forgetting to state the range of validity, or stating it incorrectly based on the unsimplified term (e.g., $|-4x|<1$ without simplifying to $|x|<1/4$).

### Tags
algebra, binomial_expansion, series, 3.1, approximation, comparing_coefficients