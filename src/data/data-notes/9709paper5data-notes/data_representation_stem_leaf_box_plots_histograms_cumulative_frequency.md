## Representation of Data: Stem-and-Leaf Diagrams and Box Plots

**Syllabus Reference**: 9709.P5.6.1

**Learning Objective**: Select a suitable way of presenting raw data and discuss advantages and/or disadvantages of particular representations. Construct and interpret stem-and-leaf diagrams and box-and-whisker plots.

**Example Question**
The times, in seconds, taken by 11 boys to run a 100m race are recorded as:
12.1, 13.2, 11.9, 14.1, 12.5, 11.8, 13.2, 12.8, 15.3, 13.9, 12.6
a) Construct a stem-and-leaf diagram for this data.
b) Find the median and interquartile range of the times.
The times for a group of 11 girls were also recorded. The median time for the girls was 13.5s and the interquartile range was 2.1s.
c) Draw a box-and-whisker plot for the boys' times and for the girls' times on the same diagram.
d) Compare the two distributions.

**Mark Scheme / Solution**
a) Stem-and-leaf diagram:
Key: 11 | 8 means 11.8 seconds
11 | 8 9
12 | 1 5 6 8
13 | 2 2 9
14 | 1
15 | 3

b) Total number of data points $n=11$.
Median is the $(n+1)/2 = 6$th value. Median = 12.8s.
Lower Quartile (Q1) is the $(n+1)/4 = 3$rd value. Q1 = 12.1s.
Upper Quartile (Q3) is the $3(n+1)/4 = 9$th value. Q3 = 13.9s.
Interquartile Range (IQR) = $Q3 - Q1 = 13.9 - 12.1 = 1.8$s.

c) Boys' plot: Min=11.8, Q1=12.1, Median=12.8, Q3=13.9, Max=15.3.
Girls' plot: Median=13.5, IQR=2.1. We need quartiles. Assuming symmetry around the median for a simple plot, $Q1 = 13.5 - 2.1/2 = 12.45$ and $Q3 = 13.5 + 2.1/2 = 14.55$. We cannot determine min/max for girls. Whiskers are not drawn for girls.
A diagram showing two box plots, one for boys (with whiskers) and one for girls (box only), correctly plotted on a single scale.

d) Comparison:
- On average, the boys were faster than the girls as their median time (12.8s) is lower than the girls' median time (13.5s).
- The boys' times were more consistent than the girls' times as their IQR (1.8s) is smaller than the girls' IQR (2.1s).

**Standard Solution Steps**
- For the stem-and-leaf diagram, identify the stem (the leading digits) and the leaf (the trailing digit).
- Write the stems vertically and then fill in the leaves for each data point. It is best to do an unordered diagram first, then an ordered one.
- Always include a key to explain how to read the diagram.
- To find the median and quartiles for $n$ data points, use the formulas $(n+1)/2$ for the median, $(n+1)/4$ for the lower quartile, and $3(n+1)/4$ for the upper quartile to find the position of the value.
- For the box-and-whisker plot, identify the five key values: minimum, lower quartile (Q1), median (Q2), upper quartile (Q3), and maximum.
- Draw a scale and plot the five points, drawing a box from Q1 to Q3 with a line at the median, and whiskers from the box to the min and max values.
- When comparing, always comment on a measure of central tendency (e.g., median) and a measure of spread (e.g., IQR or range), and use the context of the question.

**Common Mistakes**
- Forgetting to include a key for the stem-and-leaf diagram.
- Creating an unordered stem-and-leaf diagram and then trying to find the median from it.
- Miscalculating the position of the quartiles.
- When comparing distributions, just stating the values of the medians and IQRs without making a comparative statement in context (e.g., faster, more consistent).
- Mixing up the concepts of median and mean, or range and IQR.

**Tags**
representation of data, stem-and-leaf, box-and-whisker plot, median, quartiles, interquartile range, comparison

---

## Representation of Data: Histograms

**Syllabus Reference**
S1 6.1

**Learning Objective**
Construct and interpret histograms from grouped data.

**Example Question**
The table below shows the lengths, $x$ cm, of 90 leaves.
| Length ($x$ cm) | $0 < x \le 5$ | $5 < x \le 10$ | $10 < x \le 20$ | $20 < x \le 30$ | $30 < x \le 50$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Frequency | 15 | 20 | 30 | 15 | 10 |
a) Calculate the frequency densities for each class.
b) Draw a histogram to represent this data.

**Mark Scheme / Solution**
a) Frequency density is calculated as Frequency / Class Width.
- Class 1: Width = 5, F.D. = $15 / 5 = 3$
- Class 2: Width = 5, F.D. = $20 / 5 = 4$
- Class 3: Width = 10, F.D. = $30 / 10 = 3$
- Class 4: Width = 10, F.D. = $15 / 10 = 1.5$
- Class 5: Width = 20, F.D. = $10 / 20 = 0.5$

b) A histogram is drawn with the x-axis representing 'Length (cm)' and the y-axis representing 'Frequency Density'. The bars are drawn with the correct widths and heights calculated above.
- Bar 1: from 0 to 5, height 3
- Bar 2: from 5 to 10, height 4
- Bar 3: from 10 to 20, height 3
- Bar 4: from 20 to 30, height 1.5
- Bar 5: from 30 to 50, height 0.5

**Standard Solution Steps**
- Identify the class widths for each group. Be careful with unequal widths.
- Calculate the frequency density for each class using the formula: Frequency Density = Frequency / Class Width.
- Draw the axes. The horizontal axis is for the continuous variable (e.g., length, time) and the vertical axis is for Frequency Density.
- Label both axes clearly, including units.
- Draw each bar with its correct class width on the horizontal axis and its calculated frequency density as the height. There should be no gaps between the bars.

**Common Mistakes**
- Plotting frequency on the vertical axis instead of frequency density. This is the most common error.
- Making all bars have the same width, even when the class widths are unequal.
- Incorrectly calculating class widths, especially if the classes are given in a non-standard format.
- Forgetting to label the axes correctly.

**Tags**
- representation of data, histogram, grouped data, frequency density, class width

---

## Representation of Data: Cumulative Frequency Graphs

**Syllabus Reference**: 9709.P5.6.2

**Learning Objective**
Construct and use a cumulative frequency graph to estimate the median, quartiles, percentiles, and the number of data items in a given interval.

**Example Question**
The waiting times, $t$ minutes, for 80 patients at a clinic are summarised in the table.
| Time ($t$ min) | $0 < t \le 10$ | $10 < t \le 20$ | $20 < t \le 30$ | $30 < t \le 50$ | $50 < t \le 80$ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Frequency | 8 | 19 | 25 | 18 | 10 |
a) Draw a cumulative frequency graph to illustrate the data.
b) Use your graph to estimate the median waiting time.
c) Use your graph to estimate the interquartile range of the waiting times.
d) Use your graph to estimate the number of patients who waited for more than 40 minutes.

**Mark Scheme / Solution**
a) First, find the cumulative frequencies:
- $t \le 10$: 8
- $t \le 20$: $8 + 19 = 27$
- $t \le 30$: $27 + 25 = 52$
- $t \le 50$: $52 + 18 = 70$
- $t \le 80$: $70 + 10 = 80$
Plot points at the upper class boundary: (10, 8), (20, 27), (30, 52), (50, 70), (80, 80). Start the graph at (0, 0). Join points with a smooth curve or straight lines.

b) Median is at $50\%$ of the total frequency: $0.5 \times 80 = 40$. Reading from the graph at a cumulative frequency of 40 gives a median time of approximately 25 minutes.

c) Lower quartile (Q1) is at $25\%$ of total frequency: $0.25 \times 80 = 20$. Reading from the graph at CF=20 gives a time of approximately 16 minutes.
Upper quartile (Q3) is at $75\%$ of total frequency: $0.75 \times 80 = 60$. Reading from the graph at CF=60 gives a time of approximately 37 minutes.
IQR = $37 - 16 = 21$ minutes.

d) To find the number who waited more than 40 minutes:
Read the CF value at $t=40$. This is approximately 63.
This means 63 patients waited 40 minutes or less.
Number waiting more than 40 minutes = Total - Number waiting less = $80 - 63 = 17$.

**Standard Solution Steps**
- Create a cumulative frequency table by adding up the frequencies as you go down the classes.
- Draw and label the axes. Horizontal axis for the variable, vertical axis for cumulative frequency up to the total.
- Plot the cumulative frequency against the upper class boundary for each class. Always start the graph at the lowest boundary, which usually has a cumulative frequency of 0.
- Join the points with a smooth curve or with straight lines (an ogive).
- To find the median, read across from $0.5 \times n$ on the vertical axis to the curve, then read down to the horizontal axis.
- To find quartiles, use $0.25 \times n$ for Q1 and $0.75 \times n$ for Q3. For percentiles, use the appropriate percentage of $n$.
- To find the number of items above a value $x$, read the cumulative frequency at $x$ and subtract it from the total frequency $n$.

**Common Mistakes**
- Plotting points at the class midpoint instead of the upper class boundary.
- Forgetting to start the graph at the lowest boundary with a CF of 0.
- Reading the axes the wrong way round (e.g., starting on the time axis to find the median).
- Calculating the number of items between two values by subtracting the data values instead of the cumulative frequencies.
- Poorly drawn curves or scales, leading to inaccurate readings.

**Tags**
- representation of data, cumulative frequency, ogive, median, quartiles, percentiles, interpolation

---

## Representation of Data: Mean and Standard Deviation from Coded Data

**Syllabus Reference**
S1 6.3

**Learning Objective**
Calculate the mean and standard deviation of a set of data from given summary statistics in coded form.

**Example Question**
The heights, $x$ cm, of 20 people were measured. The results were coded using $y = x - 10$ and the following summary statistics were obtained:
$Σy = 50$
$Σy^2 = 400$
Find the mean and standard deviation of the heights, $x$.

**Mark Scheme / Solution**
Number of people, $n = 20$.
Coded variable $y = x - 10$.
Mean of the coded data:
$\bar{y} = \frac{Σy}{n} = \frac{50}{20} = 2.5$

Variance of the coded data:
$Var(y) = \frac{Σy^2}{n} - (\bar{y})^2 = \frac{400}{20} - (2.5)^2 = 20 - 6.25 = 13.75$

Standard deviation of the coded data:
$SD(y) = \sqrt{13.75} = 3.708...$

Now, decode to find the statistics for $x$.
The coding is of the form $y = x - a$, where $a = 10$.
Mean of $x$:
$\bar{x} = \bar{y} + a = 2.5 + 10 = 12.5$

Standard deviation of $x$:
Coding by addition/subtraction does not affect the spread.
$SD(x) = SD(y) = 3.71$ (3 s.f.)

**Standard Solution Steps**
- Identify the coding formula, for example $y = \frac{x-a}{b}$ or $y = x-a$.
- Use the given summary statistics ($Σy$, $Σy^2$, $n$) to calculate the mean ($\bar{y}$) and standard deviation ($SD(y)$) of the coded variable $y$.
- Use the formula $Var(y) = \frac{Σy^2}{n} - (\bar{y})^2$.
- Rearrange the coding formula to make $x$ the subject, for example $x = by + a$.
- Use the rules of decoding to find the mean and standard deviation of the original variable $x$.
- Mean: $\bar{x} = b\bar{y} + a$
- Standard Deviation: $SD(x) = |b| \times SD(y)$. Note that the shift '$a$' does not affect the standard deviation.

**Common Mistakes**
- Incorrectly applying the decoding rules. A common error is to add or subtract '$a$' from the standard deviation.
- Forgetting to square the mean of $y$ in the variance formula: using $Σy^2/n - \bar{y}$ instead of $Σy^2/n - (\bar{y})^2$.
- If coding is $y = (x-a)/c$, forgetting to square the divisor $c$ when finding the variance of $x$ from the variance of $y$. $Var(x) = c^2 Var(y)$.
- Prematurely rounding the mean of $y$ before using it to calculate the variance, which can lead to accuracy errors.

**Tags**
- representation of data, mean, standard deviation, variance, coded data, summary statistics, decoding

---

## Representation of Data: Mean and Standard Deviation from Grouped Data

**Syllabus Reference**
S1 6.3

**Learning Objective**
Calculate estimates of the mean and standard deviation of a set of data from a grouped frequency table.

**Example Question**
The table shows the time, $t$ minutes, taken by 40 students to complete a puzzle.
| Time ($t$ min) | $10 \le t < 14$ | $14 \le t < 16$ | $16 \le t < 20$ | $20 \le t < 28$ |
| :--- | :---: | :---: | :---: | :---: |
| Frequency ($f$) | 7 | 13 | 12 | 8 |
Calculate an estimate for the mean and standard deviation of the time taken.

**Mark Scheme / Solution**
First, find the midpoint ($x$) for each class and calculate $fx$ and $fx^2$.
| Time ($t$ min) | $f$ | Midpoint ($x$) | $fx$ | $fx^2$ |
| :--- | :---: | :---: | :---: | :---: |
| $10 \le t < 14$ | 7 | 12 | $7 \times 12 = 84$ | $84 \times 12 = 1008$ |
| $14 \le t < 16$ | 13 | 15 | $13 \times 15 = 195$ | $195 \times 15 = 2925$ |
| $16 \le t < 20$ | 12 | 18 | $12 \times 18 = 216$ | $216 \times 18 = 3888$ |
| $20 \le t < 28$ | 8 | 24 | $8 \times 24 = 192$ | $192 \times 24 = 4608$ |
| **Totals** | $Σf = 40$ | | $Σfx = 687$ | $Σfx^2 = 12429$ |

Estimate for the mean:
$\bar{x} = \frac{Σfx}{Σf} = \frac{687}{40} = 17.175$

Estimate for the standard deviation:
$SD(x) = \sqrt{\frac{Σfx^2}{Σf} - (\bar{x})^2} = \sqrt{\frac{12429}{40} - (17.175)^2}$
$SD(x) = \sqrt{310.725 - 294.980625} = \sqrt{15.744375} = 3.968...$

Mean $\approx 17.2$ minutes.
Standard Deviation $\approx 3.97$ minutes.

**Standard Solution Steps**
- For each group, calculate the class midpoint ($x$). This is the average of the lower and upper class boundaries.
- Create a table with columns for the midpoint ($x$), frequency ($f$), $fx$, and $fx^2$.
- Calculate the values of $fx$ and $fx^2$ for each row.
- Sum the columns to find the totals: $Σf$, $Σfx$, and $Σfx^2$. Note that $Σf$ should be the total number of data points, $n$.
- Use the formula $\bar{x} = \frac{Σfx}{Σf}$ to estimate the mean.
- Use the formula $SD = \sqrt{\frac{Σfx^2}{Σf} - (\bar{x})^2}$ to estimate the standard deviation.
- Keep the value of the mean as accurate as possible when using it in the standard deviation formula to avoid rounding errors.

**Common Mistakes**
- Using the class width or the upper class boundary instead of the midpoint for the value of $x$.
- Calculating $(Σfx)^2$ instead of $Σfx^2$. These are very different.
- Poor calculator use, for example, making an error when entering the standard deviation formula.
- Prematurely rounding the value of the mean before using it in the variance calculation, leading to an inaccurate final answer.

**Tags**
- representation of data, mean, standard deviation, grouped data, frequency table, estimation, midpoint