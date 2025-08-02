### Polar to Cartesian Conversion

A curve $C$ has the polar equation $r = \frac{8}{3\cos\theta + 4\sin\theta}$ for $0 < \theta < \pi$.

(i) Find the Cartesian equation of $C$, expressing your answer in the form $ax+by=c$.

(ii) Hence, find the shortest distance from the pole $O$ to the curve $C$.

***

*Mark Scheme*

(i)
The equation can be written as $r(3\cos\theta + 4\sin\theta) = 8$. M1
$3r\cos\theta + 4r\sin\theta = 8$.
Using the standard substitutions $x = r\cos\theta$ and $y = r\sin\theta$. M1
The Cartesian equation is $3x + 4y = 8$. A1

(ii)
The curve is a straight line. The shortest distance from the pole (the origin) to the line $3x+4y-8=0$ is required.
The formula for the perpendicular distance from $(x_0, y_0)$ to $ax+by+c=0$ is $\frac{|ax_0+by_0+c|}{\sqrt{a^2+b^2}}$. M1
Distance $= \frac{|3(0)+4(0)-8|}{\sqrt{3^2+4^2}} = \frac{|-8|}{\sqrt{9+16}} = \frac{8}{\sqrt{25}}$. M1
The shortest distance is $\frac{8}{5}$ or $1.6$. A1

### Sketching Polar Curves

The curve $C$ has polar equation $r = a(1 - \sin\theta)$ for $0 \le \theta < 2\pi$, where $a$ is a positive constant.

(i) Find the values of $r$ when $\theta = 0$, $\theta = \frac{\pi}{2}$, and $\theta = \frac{3\pi}{2}$.

(ii) Sketch the curve $C$. Your sketch should show the points found in part (i) and any lines of symmetry.

***

*Mark Scheme*

(i)
When $\theta = 0$, $r = a(1 - \sin 0) = a$. B1
When $\theta = \frac{\pi}{2}$, $r = a(1 - \sin\frac{\pi}{2}) = a(1-1) = 0$. B1
When $\theta = \frac{3\pi}{2}$, $r = a(1 - \sin\frac{3\pi}{2}) = a(1 - (-1)) = 2a$. B1

(ii)
The sketch shows a cardioid shape with its cusp at the pole. B1
The curve is symmetrical about the line $\theta = \frac{\pi}{2}$ (or the $y$-axis). B1
The curve passes through $(r, \theta)$ points $(a, 0)$, $(0, \frac{\pi}{2})$, and $(2a, \frac{3\pi}{2})$, with the maximum value of $r$ being $2a$. B1

### Area Enclosed by a Polar Curve

The curve $C$ has polar equation $r = 4\cos(2\theta)$ for $-\frac{\pi}{4} \le \theta \le \frac{\pi}{4}$.

(i) Sketch the curve $C$, showing the tangents at the pole.

(ii) Find the exact area of the region enclosed by the curve $C$.

***

*Mark Scheme*

(i)
The curve is a single loop of a four-petalled rose. The tangents at the pole are where $r=0$, which occurs when $\cos(2\theta)=0$. This gives $2\theta = \pm \frac{\pi}{2}$, so the tangents are $\theta = \pm\frac{\pi}{4}$. B1
The sketch shows a loop, symmetrical about the initial line. B1
The maximum value $r=4$ occurs at $\theta=0$ on the initial line. The loop correctly starts and ends at the pole on the lines $\theta=\pm\frac{\pi}{4}$. B1

(ii)
The area is given by the formula $A = \frac{1}{2} \int r^2 d\theta$. M1
The region is symmetrical about the initial line, so the area can be calculated as $2 \times \frac{1}{2} \int_{0}^{\frac{\pi}{4}} r^2 d\theta$.
$A = \int_{0}^{\frac{\pi}{4}} (4\cos(2\theta))^2 d\theta = \int_{0}^{\frac{\pi}{4}} 16\cos^2(2\theta) d\theta$. A1
Using the identity $\cos^2(x) = \frac{1}{2}(1+\cos(2x))$, so $\cos^2(2\theta) = \frac{1}{2}(1+\cos(4\theta))$. M1
$A = 16 \int_{0}^{\frac{\pi}{4}} \frac{1}{2}(1+\cos(4\theta)) d\theta = 8 \int_{0}^{\frac{\pi}{4}} (1+\cos(4\theta)) d\theta$.
$A = 8 \left[ \theta + \frac{1}{4}\sin(4\theta) \right]_{0}^{\frac{\pi}{4}}$. A1
$A = 8 \left[ (\frac{\pi}{4} + \frac{1}{4}\sin(\pi)) - (0 + \frac{1}{4}\sin(0)) \right]$. M1
$A = 8 \left[ (\frac{\pi}{4} + 0) - (0) \right] = 2\pi$. A1