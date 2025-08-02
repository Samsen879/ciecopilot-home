## Differential Equations: Separation of Variables and Modelling

**Syllabus Reference**: 9709.P3.3.8
**Learning Objective**: Form and solve first-order differential equations by separating variables.

### Example Question 1: Solving by Separation of Variables

Solve the differential equation
$$ \frac{dy}{dx} = \frac{e^{2x}}{y^2\cos^2(x)} $$
given that $y=2$ when $x=0$. Express $y$ in terms of $x$. [6]

### Mark Scheme / Solution
The first step is to separate the variables, gathering all $y$ terms on one side and all $x$ terms on the other.
$ y^2 \,dy = \frac{e^{2x}}{\cos^2(x)} \,dx $
$ y^2 \,dy = e^{2x}\sec^2(x) \,dx $
Now, integrate both sides.
$ \int y^2 \,dy = \int e^{2x}\sec^2(x) \,dx $ M1

The left-hand side is a standard integral:
$ \int y^2 \,dy = \frac{y^3}{3} $ A1

The right-hand side requires integration by parts: $\int u \frac{dv}{dx} \,dx = uv - \int v \frac{du}{dx} \,dx$.
Let $u = e^{2x}$ and $\frac{dv}{dx} = \sec^2(x)$.
Then $\frac{du}{dx} = 2e^{2x}$ and $v = \tan(x)$. M1
$ \int e^{2x}\sec^2(x) \,dx = e^{2x}\tan(x) - \int 2e^{2x}\tan(x) \,dx $
This does not simplify well. Let's try the other way.
Let $u = \sec^2(x)$ and $\frac{dv}{dx} = e^{2x}$. This is also complex.

Let's reconsider the problem. A typical CAIE question would not have such a difficult integral unless it was part of a larger problem. *Correction: A more plausible question would be simpler. Let's adjust the question for realistic scope.*

**Revised Question:**
Solve the differential equation
$$ \frac{dy}{dx} = \frac{y+1}{(x+2)(2x+1)} $$
given that $y=1$ when $x=1$. Give your answer in the form $y = f(x)$. [7]

### Mark Scheme / Solution (for Revised Question)
1.  **Separate the variables**:
    $$ \int \frac{1}{y+1} \,dy = \int \frac{1}{(x+2)(2x+1)} \,dx $$
    M1

2.  **Use partial fractions for the x-term**:
    $$ \frac{1}{(x+2)(2x+1)} = \frac{A}{x+2} + \frac{B}{2x+1} $$
    $ 1 = A(2x+1) + B(x+2) $
    If $x=-2$, $1 = A(-3) \implies A = -\frac{1}{3}$.
    If $x=-\frac{1}{2}$, $1 = B(\frac{3}{2}) \implies B = \frac{2}{3}$.
    So, the integral becomes:
    $$ \int \frac{1}{y+1} \,dy = \int \left( \frac{2/3}{2x+1} - \frac{1/3}{x+2} \right) \,dx $$
    **M1** (Correct method for partial fractions) **A1** (Correct values for A and B)

3.  **Integrate both sides**:
    $$ \ln|y+1| = \frac{2}{3} \cdot \frac{1}{2}\ln|2x+1| - \frac{1}{3}\ln|x+2| + C $$
    $$ \ln|y+1| = \frac{1}{3}\ln|2x+1| - \frac{1}{3}\ln|x+2| + C $$
    A1

4.  **Find the constant C using initial conditions** ($y=1, x=1$):
    $$ \ln|1+1| = \frac{1}{3}\ln|2(1)+1| - \frac{1}{3}\ln|1+2| + C $$
    $$ \ln(2) = \frac{1}{3}\ln(3) - \frac{1}{3}\ln(3) + C $$
    $$ C = \ln(2) $$
    M1

5.  **Substitute C and simplify**:
    $$ \ln|y+1| = \frac{1}{3}\ln|2x+1| - \frac{1}{3}\ln|x+2| + \ln(2) $$
    $$ \ln(y+1) - \ln(2) = \frac{1}{3}(\ln(2x+1) - \ln(x+2)) $$
    $$ \ln\left(\frac{y+1}{2}\right) = \frac{1}{3}\ln\left(\frac{2x+1}{x+2}\right) = \ln\left(\left(\frac{2x+1}{x+2}\right)^{1/3}\right) $$
    M1
    $$ \frac{y+1}{2} = \left(\frac{2x+1}{x+2}\right)^{1/3} $$
    $$ y = 2\left(\frac{2x+1}{x+2}\right)^{1/3} - 1 $$
    A1

### Standard Solution Steps
1.  **Separate Variables**: Rearrange the equation so that all $y$ terms and $dy$ are on one side, and all $x$ terms and $dx$ are on the other.
2.  **Integrate**: Integrate both sides of the equation. If necessary, use techniques like partial fractions or integration by parts for the $x$ side. Remember to add a constant of integration, $C$.
3.  **Find C**: Substitute the given initial conditions (values of $x$ and $y$) into the integrated equation to solve for $C$.
4.  **Substitute C**: Replace $C$ in the general solution with the value you found.
5.  **Rearrange**: Make $y$ the subject of the equation, if required. This often involves using logarithm and exponential rules to simplify the expression.

### Common Mistakes
- **Separation**: Incorrectly separating the variables.
- **Integration**: Forgetting to include the constant of integration $+C$. Errors in standard integration, especially $\int \frac{1}{ax+b} \,dx = \frac{1}{a}\ln|ax+b|$.
- **Partial Fractions**: Making algebraic mistakes when finding the constants A and B.
- **Logarithms**: Incorrectly applying logarithm laws when simplifying the final expression. Forgetting that $k \ln(A) = \ln(A^k)$.
- **Initial Conditions**: Substituting the initial values into the equation before integration.

### Tags
differential_equations, separation_of_variables, partial_fractions, integration, initial_conditions, 3.8

---

### Example Question 2: Modelling with Differential Equations

A container is being filled with water. The volume of water in the container at time $t$ seconds is $V$ cm$^3$. The rate of increase of the volume, $\frac{dV}{dt}$, is proportional to the difference between a maximum volume of 5000 cm$^3$ and the current volume $V$.

(i) Show that $V$ and $t$ satisfy the differential equation $\frac{dV}{dt} = k(5000 - V)$, where $k$ is a positive constant. [1]

(ii) Initially, the container is empty. After 20 seconds, the volume of water is 1000 cm$^3$. Solve the differential equation to find $V$ in terms of $t$. [6]

(iii) Find the volume of water in the container after 60 seconds, giving your answer to 3 significant figures. [2]

### Mark Scheme / Solution
(i) "Rate of increase of volume" is $\frac{dV}{dt}$. B1
This is "proportional to" $(\propto)$ the "difference between a maximum volume of 5000 and the current volume $V$", which is $(5000 - V)$.
Combining these, we get $\frac{dV}{dt} \propto (5000 - V)$.
Introducing a constant of proportionality $k$, we have $\frac{dV}{dt} = k(5000 - V)$.

(ii) **Separate the variables**:
$$ \int \frac{1}{5000 - V} \,dV = \int k \,dt $$
M1

**Integrate both sides**:
$$ -\ln|5000 - V| = kt + C $$
A1

**Find C using initial conditions** ($t=0, V=0$):
$$ -\ln|5000 - 0| = k(0) + C \implies C = -\ln(5000) $$
M1

**Find k using the second condition** ($t=20, V=1000$):
$$ -\ln|5000 - 1000| = k(20) - \ln(5000) $$
$$ \ln(5000) - \ln(4000) = 20k $$
$$ \ln\left(\frac{5000}{4000}\right) = 20k \implies \ln(1.25) = 20k $$
$$ k = \frac{1}{20}\ln(1.25) \approx 0.011157... $$
**M1** (Substituting second condition to find k) **A1** (Correct expression for k)

**Form the final equation for V**:
$$ -\ln(5000-V) = \left(\frac{t}{20}\ln(1.25)\right) - \ln(5000) $$
$$ \ln(5000) - \ln(5000-V) = \frac{t}{20}\ln(1.25) $$
$$ \ln\left(\frac{5000}{5000-V}\right) = \ln\left(1.25^{t/20}\right) $$
$$ \frac{5000}{5000-V} = 1.25^{t/20} $$
$$ 5000-V = \frac{5000}{1.25^{t/20}} \implies V = 5000 - 5000(1.25^{-t/20}) $$
A1

(iii) **Find V when t = 60**:
$$ V = 5000 - 5000(1.25^{-60/20}) = 5000 - 5000(1.25^{-3}) $$
M1
$$ V = 5000 - 5000(0.512) = 5000 - 2560 = 2440 $$
The volume after 60 seconds is 2440 cm$^3$. A1

### Standard Solution Steps
1.  **Form the Equation**: Translate the verbal description of the rate of change into a mathematical equation involving a derivative and a constant of proportionality, $k$.
2.  **Separate and Integrate**: Separate the variables and integrate both sides. Pay close attention to signs, especially when integrating terms like $\frac{1}{A-x}$.
3.  **Use Initial Conditions**: Use the first condition (often at $t=0$) to find the constant of integration, $C$.
4.  **Find k**: Use the second given condition (at a later time $t$) to find the constant of proportionality, $k$.
5.  **Solve for the Variable**: Write the final equation for the variable (e.g., $V$ in terms of $t$) using the calculated values of $C$ and $k$. This may require significant algebraic manipulation using logarithm and exponential rules.
6.  **Answer the Question**: Use the final equation to calculate a value or describe a long-term behaviour as requested by the question.

### Common Mistakes
- **Forming the Equation**: Forgetting the constant of proportionality $k$. Using the wrong sign for rates of increase vs. decrease.
- **Integration**: Missing the negative sign from integrating $\frac{1}{A-V}$, which results in $-\ln|A-V|$.
- **Constants**: Confusing the roles of $C$ and $k$, or making algebraic errors when solving for them.
- **Log/Exp Manipulation**: Errors in combining log terms or converting a logarithmic equation to an exponential one. A common error is writing $\ln(A) - \ln(B) = \ln(A-B)$ instead of $\ln(A/B)$.
- **Final Calculation**: Rounding intermediate values (like $k$) too early, leading to an inaccurate final answer. It is best to use the exact form of $k$ (e.g., $\frac{1}{20}\ln(1.25)$) in the final calculation.

### Tags
differential_equations, modelling, rates_of_change, logarithmic_integration, newton's_law_of_cooling_analogue, 3.8