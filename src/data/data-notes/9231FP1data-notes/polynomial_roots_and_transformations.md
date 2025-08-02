# FP1-Roots-of-Polynomials.md

## **Vieta's Formulas for Cubic and Quartic Equations**

This section covers the relationship between the coefficients and the roots of a polynomial. These relationships, known as Vieta's formulas, are fundamental for evaluating symmetric expressions of the roots without finding the roots themselves.

---

### **Exam-Style Question**

The equation $2x^4 - 8x^3 + kx^2 - 12x + 9 = 0$, where $k$ is a constant, has roots $\alpha, \beta, \gamma, \delta$.

**(a)** Find the value of:
   (i) $\alpha + \beta + \gamma + \delta$
   (ii) $\alpha\beta + \alpha\gamma + \alpha\delta + \beta\gamma + \beta\delta + \gamma\delta$
   (iii) $\alpha\beta\gamma\delta$

**(b)** Find an expression for $\sum \frac{1}{\alpha\beta}$ in terms of $k$.

**(c)** Given that $\alpha^2 + \beta^2 + \gamma^2 + \delta^2 = 10$, find the value of $k$.

---

### **Step-by-Step Solution**

**Part (a): Stating Vieta's Formulas**

For a quartic equation $ax^4 + bx^3 + cx^2 + dx + e = 0$, Vieta's formulas are:
- $\sum \alpha = \alpha + \beta + \gamma + \delta = -\frac{b}{a}$
- $\sum \alpha\beta = \alpha\beta + \alpha\gamma + ... = \frac{c}{a}$
- $\sum \alpha\beta\gamma = \alpha\beta\gamma + ... = -\frac{d}{a}$
- $\alpha\beta\gamma\delta = \frac{e}{a}$

For the equation $2x^4 - 8x^3 + kx^2 - 12x + 9 = 0$, we have $a=2, b=-8, c=k, d=-12, e=9$.

(i) $\sum \alpha = - \frac{-8}{2} = 4$ **[B1]**
(ii) $\sum \alpha\beta = \frac{k}{2}$ **[B1]**
(iii) $\alpha\beta\gamma\delta = \frac{9}{2}$ **[B1]**

**Part (b): Evaluating a Symmetric Function**

We need to find $\sum \frac{1}{\alpha\beta}$. This is the sum of the roots of the equation whose roots are the reciprocals of the product of the original roots taken two at a time. A more direct approach is to express this symmetrically.
The sum is $\frac{1}{\alpha\beta} + \frac{1}{\alpha\gamma} + \frac{1}{\alpha\delta} + \frac{1}{\beta\gamma} + \frac{1}{\beta\delta} + \frac{1}{\gamma\delta}$.

To simplify, we find a common denominator, which is $\alpha\beta\gamma\delta$.
> $\sum \frac{1}{\alpha\beta} = \frac{\gamma\delta + \beta\delta + \beta\gamma + \alpha\delta + \alpha\gamma + \alpha\beta}{\alpha\beta\gamma\delta} = \frac{\sum \alpha\beta}{\alpha\beta\gamma\delta}$ **[M1]**

Substituting the values from part (a):
> $\sum \frac{1}{\alpha\beta} = \frac{k/2}{9/2} = \frac{k}{9}$ **[A1]**

**Part (c): Finding the unknown coefficient $k$**

We are given $\sum \alpha^2 = 10$.
We use the identity $\sum \alpha^2 = (\sum \alpha)^2 - 2(\sum \alpha\beta)$. **[M1]**

Substituting the known values:
> $10 = (4)^2 - 2 \left(\frac{k}{2}\right)$ **[M1]**
> $10 = 16 - k$
> $k = 16 - 10$
> $k = 6$ **[A1]**

---

### **Standard Solution Steps**

1.  **Identify Coefficients:** For the polynomial $ax^n + bx^{n-1} + ...$, correctly identify $a, b, c, ...$.
2.  **Write Vieta's Formulas:** Carefully write down the sums of roots, paying close attention to the signs ($-\frac{b}{a}, +\frac{c}{a}, -\frac{d}{a}, ...$).
3.  **Identify the Symmetric Function:** Determine the symmetric function required by the question (e.g., $\sum \alpha^2$, $\sum \frac{1}{\alpha}$).
4.  **Use Standard Identities:** Recall or derive the necessary identity to relate the required function to the elementary symmetric polynomials from Vieta's formulas. The most common is $\sum \alpha^2 = (\sum \alpha)^2 - 2\sum \alpha\beta$.
5.  **Substitute and Solve:** Substitute the values from Vieta's formulas into the identity to calculate the result or solve for an unknown coefficient.

### **Common Mistakes and Pitfalls**

-   **Sign Errors:** The most frequent error is mixing up the signs in Vieta's formulas. Remember the alternating pattern: `(-, +, -, +, ...)` for $\frac{b}{a}, \frac{c}{a}, \frac{d}{a}, \frac{e}{a}$.
-   **Forgetting the 'a' Coefficient:** Students often forget to divide by the leading coefficient $a$ if it is not 1.
-   **Identity Confusion:** Confusing $(\sum \alpha)^2$ with $\sum \alpha^2$. These are not the same.
-   **Algebraic Errors:** Simple mistakes in algebraic manipulation when solving for an unknown coefficient like $k$.

### **Tags**
`roots of polynomials`, `vieta's formulas`, `symmetric functions`, `quartic equations`, `coefficients`

---
---

## **Transformation of Roots**

This section focuses on finding a new polynomial equation whose roots are a simple transformation (e.g., linear, reciprocal, square) of the roots of an original equation. The key technique is algebraic substitution.

---

### **Exam-Style Question**

The equation $x^3 - 3x^2 - 5x + 7 = 0$ has roots $\alpha, \beta, \gamma$.

Find a cubic equation, with integer coefficients, whose roots are $2\alpha-1, 2\beta-1, 2\gamma-1$.

---

### **Step-by-Step Solution**

**1. Define the transformation**
Let $y$ be a root of the new equation. The relationship between the new roots ($y$) and the old roots ($x = \alpha, \beta, \gamma$) is given by:
> $y = 2x - 1$

**2. Isolate the original root variable**
To substitute into the original equation, we must make $x$ the subject of the formula. **[M1]**
> $y + 1 = 2x$
> $x = \frac{y+1}{2}$

**3. Substitute into the original equation**
Replace every instance of $x$ in the original equation $x^3 - 3x^2 - 5x + 7 = 0$ with the expression for $x$ in terms of $y$. **[M1]**
> $\left(\frac{y+1}{2}\right)^3 - 3\left(\frac{y+1}{2}\right)^2 - 5\left(\frac{y+1}{2}\right) + 7 = 0$

**4. Expand and simplify**
Expand the terms and clear the denominators to obtain a polynomial in $y$.
> $\frac{(y+1)^3}{8} - \frac{3(y+1)^2}{4} - \frac{5(y+1)}{2} + 7 = 0$

Multiply the entire equation by 8 to eliminate the fractions: **[M1]**
> $(y+1)^3 - 6(y+1)^2 - 20(y+1) + 56 = 0$

Now, expand the binomial terms:
> $(y^3 + 3y^2 + 3y + 1) - 6(y^2 + 2y + 1) - 20(y+1) + 56 = 0$ **[A1]**
> $y^3 + 3y^2 + 3y + 1 - 6y^2 - 12y - 6 - 20y - 20 + 56 = 0$

Collect like terms:
> $y^3 + (3-6)y^2 + (3-12-20)y + (1-6-20+56) = 0$
> $y^3 - 3y^2 - 29y + 31 = 0$ **[A1]**

This is the required cubic equation.

---

### **Standard Solution Steps**

1.  **Establish the Relation:** Let the new root be $y$ and the original root be $x$. Write down the equation connecting them (e.g., $y = x^2$, $y = \frac{1}{x}$, $y = ax+b$).
2.  **Rearrange for x:** Manipulate the equation from Step 1 to express $x$ in terms of $y$. This is the substitution formula.
3.  **Substitute:** Replace $x$ in the original polynomial with the expression found in Step 2.
4.  **Simplify:** Expand all terms and multiply through by the lowest common multiple of any denominators to obtain a polynomial equation with integer coefficients.

### **Common Mistakes and Pitfalls**

-   **Incorrect Substitution:** Substituting $y$ for $x$ directly without rearrangement. This is a fundamental misunderstanding.
-   **Binomial Expansion Errors:** Errors when expanding expressions like $(y+1)^3$ or $(y-c)^2$.
-   **Arithmetic Errors:** Mistakes with negative signs or when combining coefficients after expansion.
-   **Incomplete Simplification:** Leaving the final equation with fractions instead of clearing them to obtain the required integer coefficients.

### **Tags**
`roots of polynomials`, `transformation of roots`, `substitution`, `cubic equations`, `algebraic manipulation`

---
---

## **Sum of Powers of Roots (Newton's Sums)**

This method provides a recurrence relation to find the sum of the powers of the roots of a polynomial, denoted $S_n = \sum \alpha^n$, without finding the roots themselves. It is particularly useful for powers higher than 2.

---

### **Exam-Style Question**

The equation $x^3 - 4x^2 + 2x - 5 = 0$ has roots $\alpha, \beta, \gamma$.
Let $S_n = \alpha^n + \beta^n + \gamma^n$.

**(a)** Find the values of $S_1$, $S_2$, and $S_3$.
**(b)** Find the value of $S_4$.
**(c)** Find the value of $S_{-1}$.

---

### **Step-by-Step Solution**

The given equation is $P(x) = x^3 - 4x^2 + 2x - 5 = 0$.

**Part (a): Finding $S_1, S_2, S_3$**

**$S_1$:** From Vieta's formulas, $S_1 = \sum \alpha = - \frac{-4}{1} = 4$. **[B1]**

**$S_2$:** We use the identity $\sum \alpha^2 = (\sum \alpha)^2 - 2(\sum \alpha\beta)$.
First, find $\sum \alpha\beta = \frac{2}{1} = 2$.
$S_2 = (\sum \alpha)^2 - 2(\sum \alpha\beta) = (4)^2 - 2(2) = 16 - 4 = 12$. **[M1 A1]**

**$S_3$:** Since $\alpha, \beta, \gamma$ are roots, they each satisfy the equation:
> $\alpha^3 - 4\alpha^2 + 2\alpha - 5 = 0$
> $\beta^3 - 4\beta^2 + 2\beta - 5 = 0$
> $\gamma^3 - 4\gamma^2 + 2\gamma - 5 = 0$

Summing these three equations gives:
> $(\alpha^3+\beta^3+\gamma^3) - 4(\alpha^2+\beta^2+\gamma^2) + 2(\alpha+\beta+\gamma) - (5+5+5) = 0$ **[M1]**
> $S_3 - 4S_2 + 2S_1 - 15 = 0$

Now, substitute the known values of $S_1$ and $S_2$:
> $S_3 - 4(12) + 2(4) - 15 = 0$
> $S_3 - 48 + 8 - 15 = 0$
> $S_3 - 55 = 0 \implies S_3 = 55$. **[A1]**

**Part (b): Finding $S_4$**

To find $S_4$, multiply the original equation $x^3 - 4x^2 + 2x - 5 = 0$ by $x$:
> $x^4 - 4x^3 + 2x^2 - 5x = 0$

This holds for each root. Summing over the roots:
> $(\sum \alpha^4) - 4(\sum \alpha^3) + 2(\sum \alpha^2) - 5(\sum \alpha) = 0$ **[M1]**
> $S_4 - 4S_3 + 2S_2 - 5S_1 = 0$

Substitute the known values:
> $S_4 - 4(55) + 2(12) - 5(4) = 0$
> $S_4 - 220 + 24 - 20 = 0$
> $S_4 - 216 = 0 \implies S_4 = 216$. **[A1]**

**Part (c): Finding $S_{-1}$**

To find $S_{-1} = \sum \frac{1}{\alpha}$, we can use Vieta's formulas directly or adapt the recurrence relation.
Using Vieta's formulas:
$S_{-1} = \frac{1}{\alpha} + \frac{1}{\beta} + \frac{1}{\gamma} = \frac{\beta\gamma + \alpha\gamma + \alpha\beta}{\alpha\beta\gamma}$. **[M1]**
From the equation, $\sum \alpha\beta = 2$ and $\alpha\beta\gamma = - \frac{-5}{1} = 5$.
$S_{-1} = \frac{2}{5}$. **[A1]**

*Alternative method for $S_{-1}$*:
Divide the original equation $x^3 - 4x^2 + 2x - 5 = 0$ by $x^3$:
$1 - \frac{4}{x} + \frac{2}{x^2} - \frac{5}{x^3} = 0$. Summing over the roots gives $3 - 4S_{-1} + 2S_{-2} - 5S_{-3} = 0$, which is more complex. The direct Vieta's formula method is superior here.

---

### **Standard Solution Steps**

1.  **Write Recurrence Relation:** For a polynomial of degree $k$, $a_k x^k + ... + a_0 = 0$, the sum of powers $S_n$ satisfies the recurrence $a_k S_n + a_{k-1} S_{n-1} + ... + a_1 S_{n-k+1} + a_0 S_{n-k} = 0$. This is derived by multiplying the polynomial by $x^{n-k}$ and summing over all roots.
2.  **Establish Base Cases:** Calculate initial sums, typically $S_1$ and $S_2$, using Vieta's formulas and the identity $\sum \alpha^2 = (\sum \alpha)^2 - 2\sum \alpha\beta$.
3.  **Apply Recurrence:** Use the recurrence relation and the base cases to find higher order sums ($S_3, S_4, ...$).
4.  **Handle Constant Term:** When summing the original equation (for $S_k$, where $k$ is the degree), remember the constant term $a_0$ is summed $k$ times, giving $k \cdot a_0$.
5.  **Negative Powers:** For $S_{-1}$, it is usually easiest to use the direct symmetric form $\sum \frac{1}{\alpha} = \frac{\sum \alpha\beta...}{\alpha\beta\gamma...}$.

### **Common Mistakes and Pitfalls**

-   **Constant Term Error:** In the recurrence for $S_3$ (from $x^3 - 4x^2 + 2x - 5 = 0$), a common error is writing `$S_3 - 4S_2 + 2S_1 - 5 = 0$` instead of `$S_3 - 4S_2 + 2S_1 - 3 \times 5 = 0$`. The constant is added for each root.
-   **Sign Errors:** Mistakes when substituting values into the recurrence, especially with negative coefficients or negative sum values.
-   **Complexity:** Trying to use the recurrence relation for negative powers when a simpler method (like the sum of roots of a transformed equation or direct evaluation of the symmetric function) exists.

### **Tags**
`roots of polynomials`, `newton's sums`, `sum of powers`, `recurrence relations`, `symmetric functions`, `cubic equations`