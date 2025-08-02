## Representation of Data: Mean and Standard Deviation from Grouped Data

**Syllabus Reference**: 9709.P5.5.1.2

**Learning Objective**: Calculate and use the mean and standard deviation of a set of data (including grouped data).

### Example Question
The time, $t$ minutes, taken for 80 students to complete a logic puzzle is summarised as follows: 12 students took between 5 and 10 minutes ($5 \le t < 10$), 20 students took between 10 and 15 minutes ($10 \le t < 15$), 32 students took between 15 and 25 minutes ($15 \le t < 25$), and 16 students took between 25 and 30 minutes ($25 \le t < 30$).

Calculate an estimate for the mean and standard deviation of the time taken.

### Mark Scheme / Solution
Midpoints ($x$): 7.5, 12.5, 20, 27.5 (B1)
$\Sigma fx = (7.5 \times 12) + (12.5 \times 20) + (20 \times 32) + (27.5 \times 16) = 90 + 250 + 640 + 440 = 1420$ (M1 for $\Sigma fx$ calculation)
$\text{Mean} = \frac{\Sigma fx}{n} = \frac{1420}{80} = 17.75$ minutes (A1)
$\Sigma fx^2 = (7.5^2 \times 12) + (12.5^2 \times 20) + (20^2 \times 32) + (27.5^2 \times 16) = 675 + 3125 + 12800 + 12100 = 28700$ (M1 for $\Sigma fx^2$ calculation)
$\text{Standard Deviation} = \sqrt{\frac{28700}{80} - 17.75^2}$ (M1 for correct formula structure)
$\text{Standard Deviation} = \sqrt{358.75 - 315.0625} = \sqrt{43.6875} = 6.61$ (A1)

### Standard Solution Steps
- Identify the midpoint for each class interval.
- Calculate $\Sigma fx$ by multiplying each midpoint by its corresponding frequency and summing the results.
- Calculate the mean using the formula $\text{Mean} = \frac{\Sigma fx}{\Sigma f}$.
- Calculate $\Sigma fx^2$ by multiplying the square of each midpoint by its frequency and summing the results.
- Calculate the standard deviation using the formula $\sigma = \sqrt{\frac{\Sigma fx^2}{\Sigma f} - (\text{mean})^2}$.
- State the final answers to an appropriate degree of accuracy (usually 3 significant figures).

### Common Mistakes
- Using the class upper bound or the frequency instead of the class midpoint in calculations.
- Prematurely rounding the mean before using it in the standard deviation formula, leading to accuracy errors.
- Calculating $(\Sigma fx)^2$ instead of $\Sigma fx^2$.
- Forgetting to take the square root at the final step to find the standard deviation from the variance.

### Tags
- grouped data, mean, standard deviation, estimation, frequency table

---

## Representation of Data: Histograms with Variable Class Widths

**Syllabus Reference**: 9709.P5.5.1.1

**Learning Objective**: Draw and interpret histograms.

### Example Question
The masses, $m$ grams, of 100 letters are given as follows: 30 letters had a mass between 0 and 20 grams ($0 < m \le 20$), 25 letters had a mass between 20 and 30 grams ($20 < m \le 30$), 40 letters had a mass between 30 and 50 grams ($30 < m \le 50$), and 5 letters had a mass between 50 and 60 grams ($50 < m \le 60$).

A histogram is drawn to represent the data. The bar representing the $0 < m \le 20$ class has a height of 3 units. Find the height of the bar representing the $30 < m \le 50$ class.

### Mark Scheme / Solution
Class widths are 20, 10, 20, 10 (M1 for at least two correct widths)
Frequency densities are $\frac{30}{20} = 1.5$, $\frac{25}{10} = 2.5$, $\frac{40}{20} = 2$, $\frac{5}{10} = 0.5$ (M1 for at least two correct FD)
Let $k$ be the scaling factor. $\text{Height} = k \times \text{Frequency Density}$.
For the first bar: $3 = k \times 1.5$, so $k = 2$. (M1 for finding k or using ratios)
Height for $30 < m \le 50$ class = $k \times \text{Frequency Density} = 2 \times 2 = 4$ units. (A1)

### Standard Solution Steps
- Calculate the class width for each interval.
- Calculate the frequency density for each interval using the formula $\text{Frequency Density} = \frac{\text{Frequency}}{\text{Class Width}}$.
- If the height of one bar is given, establish the relationship between height and frequency density ($\text{Height} = k \times \text{FD}$) to find the scaling factor $k$.
- Use this scaling factor to calculate the height of the required bar.
- Alternatively, use ratios: $\frac{\text{Height}_1}{\text{FD}_1} = \frac{\text{Height}_2}{\text{FD}_2}$.

### Common Mistakes
- Plotting frequency on the vertical axis instead of frequency density. This is incorrect for variable class widths.
- Incorrectly calculating class widths, especially when dealing with non-integer boundaries.
- Making arithmetic errors when calculating frequency density.
- Forgetting to use the scaling factor $k$ if the vertical axis is not labelled as 'Frequency Density'.

### Tags
- histogram, frequency density, variable class width, scaling factor, data representation

---

## Representation of Data: Cumulative Frequency Graphs and Percentiles

**Syllabus Reference**: 9709.P5.5.1.3

**Learning Objective**: Use a cumulative frequency graph to estimate medians, quartiles, percentiles, and proportions.

### Example Question
The cumulative frequency graph below shows the lengths, in cm, of 160 fish from a lake.

[A cumulative frequency graph is shown. The x-axis is 'Length (cm)' from 0 to 50. The y-axis is 'Cumulative Frequency' from 0 to 160. The curve starts at (10, 0), passes through approximately (20, 40), (25, 80), (30, 120) and ends at (45, 160).]

(i) Estimate the interquartile range of the lengths.
(ii) Estimate the number of fish with a length greater than 35 cm.
(iii) The longest 15% of fish are classified as 'Large'. Estimate the minimum length for a fish to be classified as 'Large'.

### Mark Scheme / Solution
(i)
Total frequency $N = 160$.
Lower Quartile ($Q1$) is at $0.25 \times 160 = 40$. Reading from graph, $Q1 \approx 20$ cm. (M1)
Upper Quartile ($Q3$) is at $0.75 \times 160 = 120$. Reading from graph, $Q3 \approx 30$ cm. (M1)
Interquartile Range ($\text{IQR}$) = $Q3 - Q1 \approx 30 - 20 = 10$ cm. (A1)

(ii)
From the graph, the number of fish with length $\le 35$ cm is 140. (M1)
Number of fish with length $> 35$ cm = $160 - 140 = 20$. (A1)

(iii)
We need the length corresponding to the lowest 85% of fish, as 15% are longer.
Position on CF axis = $0.85 \times 160 = 136$. (M1)
Reading from the graph, the length corresponding to a CF of 136 is approximately 34 cm. (A1)

### Standard Solution Steps
- For quartiles/median, calculate the position on the cumulative frequency axis (e.g., $0.25N$, $0.5N$, $0.75N$).
- Read across from this value on the y-axis to the curve, and then read down to the x-axis to find the data value.
- For the number of items greater than a value $x$, find the cumulative frequency at $x$ from the graph and subtract this from the total frequency $N$.
- For the $k$-th percentile value, find the position $\frac{k}{100} \times N$ on the CF axis and read the corresponding data value. For the top $p$%, find the value at the $(100-p)$ percentile.

### Common Mistakes
- Reading from the wrong axis (e.g., finding 40 on the length axis and reading up to the CF axis).
- Using the percentage itself as the position (e.g., looking for 25 on the CF axis instead of $0.25 \times N$).
- For 'number of items > $x$', reporting the CF value at $x$ instead of subtracting it from the total.
- For finding the value of the top $p$% calculating $\frac{p}{100} \times N$ instead of $(1-\frac{p}{100}) \times N$.

### Tags
- cumulative frequency, median, interquartile range, percentiles, graphical interpretation

---

## Representation of Data: Mean and Standard Deviation from Coded Data

**Syllabus Reference**: 9709.P5.5.1.4

**Learning Objective**: Calculate and use the mean and standard deviation from given/coded totals.

### Example Question
The heights, $x$ cm, of 30 plants were measured. The results are summarised by $\Sigma (x - 50) = 84$ and $\Sigma (x - 50)^2 = 720$. Calculate the mean and standard deviation of the heights of the plants.

### Mark Scheme / Solution
Let $y = x - 50$. The coded summary statistics are $\Sigma y = 84$ and $\Sigma y^2 = 720$. $n=30$.
Mean of $y$: $\bar{y} = \frac{\Sigma y}{n} = \frac{84}{30} = 2.8$ (M1)
Mean of $x$: $\bar{x} = \bar{y} + 50 = 2.8 + 50 = 52.8$ cm (A1)
Variance of $y$: $Var(y) = \frac{\Sigma y^2}{n} - (\bar{y})^2 = \frac{720}{30} - (2.8)^2$ (M1 for formula)
$Var(y) = 24 - 7.84 = 16.16$ (A1)
Standard deviation of $x$ is the same as standard deviation of $y$.
$\sigma_x = \sigma_y = \sqrt{16.16}$ (M1 for equating SDs and taking root)
$\sigma_x = 4.02$ cm (to 3 s.f.) (A1)

### Standard Solution Steps
- Define a new variable for the coded data e.g., $y = x - a$.
- Calculate the mean of the coded variable $\bar{y} = \frac{\Sigma y}{n}$.
- Decode the mean to find the mean of the original variable: $\bar{x} = \bar{y} + a$.
- Calculate the variance of the coded variable using $Var(y) = \frac{\Sigma y^2}{n} - (\bar{y})^2$.
- Recognise that a shift transformation does not affect the spread of the data so $\sigma_x = \sigma_y$.
- Calculate the standard deviation by taking the square root of the variance.

### Common Mistakes
- Incorrectly decoding the mean (e.g., subtracting the constant $a$ instead of adding it).
- Incorrectly attempting to decode the standard deviation (e.g., $\sigma_x = \sigma_y + 50$), which is wrong as SD is unaffected by addition/subtraction.
- Using the wrong formula for variance, such as using $\Sigma (x-a)^2$ directly without dividing by $n$ and subtracting the mean squared.
- Forgetting to square the mean of the coded variable in the variance formula.

### Tags
- coded data, coding, mean, standard deviation, linear transformation