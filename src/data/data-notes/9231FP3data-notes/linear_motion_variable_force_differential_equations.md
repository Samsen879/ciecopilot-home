## FM.5: Linear Motion under a Variable Force
**Syllabus Reference**: 9231.FM.5
**Learning Objective**: Set up and solve first-order differential equations for the motion of a particle under a variable force, using the appropriate form of acceleration ($a = \frac{dv}{dt}$ or $a = v\frac{dv}{dx}$).

### Example Question
A particle P of mass 1.5 kg is projected vertically upwards with an initial speed of 50 m s⁻¹. The particle moves under the influence of gravity and a resistance to motion of magnitude $0.3v$ N, where $v$ m s⁻¹ is the speed of the particle at time $t$ seconds after projection.

(i) Show that the equation of motion for P while it is ascending is $\frac{dv}{dt} = -10 - 0.2v$.

(ii) Find the time taken for P to reach its greatest height.

### Mark Scheme / Solution
(i) Taking the upward direction as positive. The forces acting on the particle are its weight ($mg$) and the resistance force ($0.3v$), both acting downwards.

Using Newton's Second Law, $F_{net} = ma$:
$1.5 \frac{dv}{dt} = -1.5(10) - 0.3v$ **M1** (Applying $F=ma$ with correct forces and signs)
$1.5 \frac{dv}{dt} = -15 - 0.3v$
Dividing by the mass, 1.5:
$\frac{dv}{dt} = \frac{-15}{1.5} - \frac{0.3v}{1.5}$
$\frac{dv}{dt} = -10 - 0.2v$ **A1** (Correctly shown)

(ii) The particle reaches its greatest height when its velocity $v$ is 0.
Starting with the equation from part (i): $\frac{dv}{dt} = -(10 + 0.2v)$
Separate the variables:
$\int \frac{1}{10 + 0.2v} dv = \int -1 dt$ **M1** (Correctly separating variables)
$\frac{1}{0.2} \ln(10 + 0.2v) = -t + C$
$5 \ln(10 + 0.2v) = -t + C$ **A1** (Correct integration to obtain logarithmic term)
The initial conditions are $t=0$, $v=50$. Substitute these to find the constant of integration, $C$.
$5 \ln(10 + 0.2(50)) = -0 + C$
$C = 5 \ln(10 + 10) = 5 \ln(20)$ **M1** (Using initial conditions to find C)
The equation becomes: $t = 5 \ln(20) - 5 \ln(10 + 0.2v) = 5 \ln\left(\frac{20}{10 + 0.2v}\right)$ **A1**
Find the time when $v=0$:
$t = 5 \ln\left(\frac{20}{10 + 0}\right) = 5 \ln(2)$ **M1** (Substituting $v=0$ to find the time)
$t = 3.4657...$
$t = 3.47$ s (3 s.f.) **A1**

### Standard Solution Steps
- Define a positive direction and draw a force diagram to identify all forces acting on the particle (e.g., weight, resistance, driving force).
- Apply Newton's Second Law, $F_{net} = ma$, using $a = \frac{dv}{dt}$ as the motion is described in terms of time.
- Rearrange the equation into the form $\frac{dv}{dt} = f(v)$.
- Separate the variables so that all $v$ terms are on one side and all $t$ terms are on the other.
- Integrate both sides of the equation.
- Use the given initial conditions (e.g., speed at $t=0$) to solve for the constant of integration.
- Use the resulting equation to find the unknown quantity (e.g., time when $v=0$).

### Common Mistakes
- **Sign Errors:** Incorrectly assigning signs to forces. For upward motion, both weight and resistance act downwards (negative direction).
- **Integration Errors:** Mistakes in integrating expressions of the form $\frac{1}{a+bv}$, particularly forgetting the $\frac{1}{b}$ factor.
- **Forgetting the Constant of Integration:** Omitting the '$+ C$' after integration, which makes it impossible to satisfy the initial conditions.
- **Confusing Conditions:** Using the wrong condition, e.g., using $t=0$ instead of $v=0$ to find the time to maximum height.

### Tags
differential equation, variable force, resistance, newtons second law, kinematics, vertical motion, dv/dt

---

### Example Question
A car of mass 1200 kg moves on a straight horizontal road. The engine of the car provides a constant driving force of 4800 N. The resistance to motion is proportional to the square of the car's speed, $v$ m s⁻¹, and the car's maximum possible speed is 80 m s⁻¹.

(i) Show that the resistance force is $0.75v^2$ N.

(ii) The car starts from rest at a point O. By modelling the acceleration as $a = v\frac{dv}{dx}$, show that $v\frac{dv}{dx} = \frac{6400 - v^2}{1600}$.

(iii) Hence, find the distance the car travels to reach a speed of 60 m s⁻¹.

### Mark Scheme / Solution
(i) Let the resistance force be $R = kv^2$. At the maximum speed, $v=80$, the acceleration is 0, so the net force is 0.
Driving Force = Resistance
$4800 = k(80)^2$ **M1** (Setting forces equal at maximum speed)
$4800 = 6400k$
$k = \frac{4800}{6400} = 0.75$.
So the resistance force is $0.75v^2$ N. **A1** (Correctly shown)

(ii) Using Newton's Second Law, $F_{net} = ma$:
$4800 - 0.75v^2 = 1200 a$
The question requires a relationship between $v$ and $x$, so we use $a = v\frac{dv}{dx}$.
$4800 - 0.75v^2 = 1200 v\frac{dv}{dx}$ **M1** (Applying $F=ma$ with correct expression for $a$)
$v\frac{dv}{dx} = \frac{4800 - 0.75v^2}{1200}$
$v\frac{dv}{dx} = \frac{0.75(6400 - v^2)}{1200}$
$v\frac{dv}{dx} = \frac{6400 - v^2}{1200 / 0.75} = \frac{6400 - v^2}{1600}$ **A1** (Correctly shown)

(iii) Starting with the equation from part (ii):
$\int \frac{1600v}{6400 - v^2} dv = \int 1 dx$ **M1** (Correctly separating variables)
This integral is of the form $\int \frac{k f'(v)}{f(v)} dv = k \ln(f(v))$. The derivative of the denominator is $-2v$.
$\int \frac{-800(-2v)}{6400 - v^2} dv = \int 1 dx$
$-800 \ln(6400 - v^2) = x + C$ **A1, A1** (A1 for $k \ln(...)$ form, A1 for correct expression)
The car starts from rest ($v=0$) at $x=0$.
$-800 \ln(6400 - 0^2) = 0 + C \Rightarrow C = -800 \ln(6400)$ **M1** (Using initial conditions)
The equation becomes:
$x = -800 \ln(6400 - v^2) - (-800 \ln(6400))$
$x = 800 \ln\left(\frac{6400}{6400 - v^2}\right)$ **A1**
Find the distance $x$ when $v=60$:
$x = 800 \ln\left(\frac{6400}{6400 - 60^2}\right) = 800 \ln\left(\frac{6400}{6400 - 3600}\right)$
$x = 800 \ln\left(\frac{6400}{2800}\right) = 800 \ln\left(\frac{16}{7}\right)$ **M1** (Substituting $v=60$)
$x = 661.55...$
$x = 662$ m (3 s.f.) **A1**

### Standard Solution Steps
- Use the information about maximum speed (where $a=0$) to find the constant of proportionality in the resistance formula.
- Apply Newton's Second Law, $F_{net} = ma$, using $a = v\frac{dv}{dx}$ since a relationship between speed and distance is required.
- Separate variables so that all $v$ terms are on one side and $dx$ is on the other.
- Integrate both sides. The velocity-side integral often results in a logarithmic function.
- Use the initial conditions (e.g., starts from rest at $x=0$) to find the constant of integration.
- Rearrange the equation to make the required variable (e.g., $x$) the subject.
- Substitute the given final condition (e.g., $v=60$) to calculate the answer.

### Common Mistakes
- **Choice of Acceleration:** Using $a = \frac{dv}{dt}$ when a relationship between $v$ and $x$ is needed.
- **Integration of $v/(a^2-v^2)$:** This is a common form. Errors occur by not recognising it as a logarithmic integral, often attempting partial fractions incorrectly or using a trigonometric substitution when not needed. A key check is that the numerator is related to the derivative of the denominator.
- **Algebraic Errors:** Mistakes when simplifying the initial $F=ma$ equation or when rearranging the final logarithmic equation.
- **Terminal Velocity:** Misunderstanding that at terminal (maximum) velocity, acceleration is zero and thus the driving force equals the total resistance.

### Tags
differential equation, variable force, resistance, newtons second law, terminal velocity, v*dv/dx, kinematics, horizontal motion