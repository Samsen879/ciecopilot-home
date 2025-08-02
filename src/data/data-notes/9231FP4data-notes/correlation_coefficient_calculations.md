## Product Moment Correlation Coefficient and Regression: Calculation and Interpretation

### Syllabus Reference
- Cambridge International AS & A Level Mathematics (9709), Paper 5 (Probability & Statistics 1), Section 5.2

### Learning Objective
- To calculate and interpret the product moment correlation coefficient ($r$) for bivariate data.
- To calculate and use the equation of the regression line of $y$ on $x$.

### Example Question
The marks in a Physics test ($x$) and a Chemistry test ($y$) for 8 students were recorded.

- Student A: Physics 65, Chemistry 72
- Student B: Physics 73, Chemistry 81
- Student C: Physics 58, Chemistry 66
- Student D: Physics 82, Chemistry 85
- Student E: Physics 77, Chemistry 75
- Student F: Physics 68, Chemistry 79
- Student G: Physics 90, Chemistry 94
- Student H: Physics 75, Chemistry 88

- (i) Calculate the product moment correlation coefficient ($r$) between the Physics and Chemistry marks.
- (ii) Give an interpretation of your value for $r$.
- (iii) Find the equation of the regression line of $y$ on $x$.

### Mark Scheme / Solution
- The number of pairs of data points is $n=8$. B1

- **Summary Calculations**
- $\sum x = 65+73+58+82+77+68+90+75 = 588$ B1
- $\sum y = 72+81+66+85+75+79+94+88 = 640$ B1
- $\sum x^2 = 65^2+73^2+58^2+82^2+77^2+68^2+90^2+75^2 = 43896$ B1
- $\sum y^2 = 72^2+81^2+66^2+85^2+75^2+79^2+94^2+88^2 = 51836$ B1
- $\sum xy = (65)(72)+(73)(81)+(58)(66)+(82)(85)+(77)(75)+(68)(79)+(90)(94)+(75)(88) = 47648$ B1

- **Calculate Means**
- $\bar{x} = \frac{\sum x}{n} = \frac{588}{8} = 73.5$ B1
- $\bar{y} = \frac{\sum y}{n} = \frac{640}{8} = 80$ B1

- **Calculate Summary Statistics ($S_{xx}, S_{yy}, S_{xy}$)**
- $S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n} = 43896 - \frac{588^2}{8}$ M1
- $S_{xx} = 43896 - 43218 = 678$ A1
- $S_{yy} = \sum y^2 - \frac{(\sum y)^2}{n} = 51836 - \frac{640^2}{8}$ M1
- $S_{yy} = 51836 - 51200 = 636$ A1
- $S_{xy} = \sum xy - \frac{(\sum x)(\sum y)}{n} = 47648 - \frac{(588)(640)}{8}$ M1
- $S_{xy} = 47648 - 47040 = 608$ A1

- **(i) Calculate the Product Moment Correlation Coefficient (PMCC)**
- $r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}$ M1
- $r = \frac{608}{\sqrt{678 \times 636}} = \frac{608}{\sqrt{431168}} = \frac{608}{656.6338}$ M1
- $r = 0.9259...$
- $r = 0.926$ (3 s.f.) A1

- **(ii) Interpretation of r**
- There is a strong, positive linear correlation between the marks in Physics and Chemistry. B1

- **(iii) Calculate the Equation of the Regression Line of y on x**
- The equation is of the form $y = a + bx$.
- First, find the gradient, $b$:
- $b = \frac{S_{xy}}{S_{xx}} = \frac{608}{678}$ M1
- $b = 0.896755... = 0.897$ (3 s.f.) A1
- Next, find the y-intercept, $a$:
- $a = \bar{y} - b\bar{x}$ M1
- $a = 80 - (0.896755...)(73.5)$ M1
- $a = 80 - 65.911... = 14.088... = 14.1$ (3 s.f.) A1
- The regression equation is:
- $y = 14.1 + 0.897x$ A1