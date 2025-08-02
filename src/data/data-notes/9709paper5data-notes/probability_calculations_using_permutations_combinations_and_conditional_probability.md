## Probability: Using Permutations and Combinations

**Syllabus Reference**: 9709.P5.4.3.1

**Learning Objective**
Evaluate probabilities by using enumeration, permutations, or combinations.

**Example Question**
A committee of 4 people is to be chosen at random from a group of 6 men and 5 women. Find the probability that the committee consists of exactly 2 men and 2 women.

**Mark Scheme / Solution**
Total number of people is $6 + 5 = 11$.
The total number of ways to choose a committee of 4 from 11 people is $\binom{11}{4}$.
$\binom{11}{4} = \frac{11!}{4!7!} = \frac{11 \times 10 \times 9 \times 8}{4 \times 3 \times 2 \times 1} = 330$.

The number of ways to choose 2 men from 6 is $\binom{6}{2}$.
$\binom{6}{2} = \frac{6!}{2!4!} = \frac{6 \times 5}{2} = 15$.

The number of ways to choose 2 women from 5 is $\binom{5}{2}$.
$\binom{5}{2} = \frac{5!}{2!3!} = \frac{5 \times 4}{2} = 10$.

The number of ways to choose 2 men and 2 women is $15 \times 10 = 150$.

The probability is $\frac{\text{Favourable Outcomes}}{\text{Total Outcomes}} = \frac{150}{330} = \frac{15}{33} = \frac{5}{11}$.

**Standard Solution Steps**
- Identify that the order of selection does not matter, so combinations are the appropriate method.
- Calculate the total number of possible outcomes for the selection. This is the denominator of the probability fraction.
- Calculate the number of favourable outcomes that meet the specified conditions. This is the numerator.
- Divide the number of favourable outcomes by the total number of outcomes to find the probability.

**Common Mistakes**
- Using permutations when combinations are required for a selection problem.
- Incorrectly calculating the total sample space.
- Errors in calculating the number of favourable outcomes, for example by adding instead of multiplying the number of ways to choose from each group.
- Failing to simplify the final probability fraction.

**Tags**
- probability, combinations, selections, committee

## Probability: Independence and Mutual Exclusivity

**Syllabus Reference**: 9709.P5.4.3.2

**Learning Objective**
Use addition and multiplication of probabilities, and understand the concepts of mutually exclusive events and independent events.

**Example Question**
For two events A and B, it is given that $P(A) = 0.6$, $P(B) = 0.5$, and $P(A \cup B) = 0.8$. Determine whether events A and B are independent, justifying your answer.

**Mark Scheme / Solution**
First, find $P(A \cap B)$ using the addition rule:
$P(A \cup B) = P(A) + P(B) - P(A \cap B)$
$0.8 = 0.6 + 0.5 - P(A \cap B)$
$0.8 = 1.1 - P(A \cap B)$
$P(A \cap B) = 1.1 - 0.8 = 0.3$.

Next, test for independence by checking if $P(A \cap B) = P(A) \times P(B)$.
$P(A) \times P(B) = 0.6 \times 0.5 = 0.3$.

Since $P(A \cap B) = 0.3$ and $P(A) \times P(B) = 0.3$, the condition for independence is met.
Therefore, events A and B are independent.

**Standard Solution Steps**
- State the condition for independence: events A and B are independent if $P(A \cap B) = P(A) \times P(B)$.
- Use the given probabilities to find any missing values needed for the test. Often this involves using the addition rule $P(A \cup B) = P(A) + P(B) - P(A \cap B)$ to find $P(A \cap B)$.
- Calculate the product $P(A) \times P(B)$.
- Compare the value of $P(A \cap B)$ with the value of the product $P(A) \times P(B)$.
- Write a clear conclusion stating whether the events are independent or not, supported by the numerical comparison.

**Common Mistakes**
- Confusing independence with mutual exclusivity. Mutually exclusive events have $P(A \cap B) = 0$.
- Assuming events are independent without performing the mathematical check.
- Using an incorrect formula, such as adding probabilities instead of multiplying for the independence test.
- Making algebraic errors when rearranging the addition rule to find $P(A \cap B)$.
- Providing an incomplete justification, for example just stating the formula without showing the calculated values.

**Tags**
- probability, independence, mutual exclusivity, addition rule, multiplication rule

## Probability: Conditional Probability

**Syllabus Reference**: 9709.P5.4.3.3

**Learning Objective**
Calculate and use conditional probabilities, for example with tree diagrams, Venn diagrams, or contingency tables.

**Example Question**
In a certain town, 1% of the population has a particular disease. A test for this disease gives a positive result for 98% of people who have the disease, and for 5% of people who do not have the disease. A person is chosen at random and tests positive. Find the probability that this person actually has the disease.

**Mark Scheme / Solution**
Let D be the event that a person has the disease.
Let T be the event that a person tests positive.

From the question:
$P(D) = 0.01$, so $P(D') = 1 - 0.01 = 0.99$.
$P(T|D) = 0.98$ (probability of testing positive given they have the disease).
$P(T|D') = 0.05$ (probability of testing positive given they do not have the disease).

We need to find $P(D|T)$.
Using the formula: $P(D|T) = \frac{P(D \cap T)}{P(T)}$.

First, calculate $P(D \cap T)$:
$P(D \cap T) = P(T|D) \times P(D) = 0.98 \times 0.01 = 0.0098$.

Next, calculate the total probability of testing positive, $P(T)$:
$P(T) = P(T \cap D) + P(T \cap D')$
$P(T) = (P(T|D) \times P(D)) + (P(T|D') \times P(D'))$
$P(T) = (0.98 \times 0.01) + (0.05 \times 0.99) = 0.0098 + 0.0495 = 0.0593$.

Finally, calculate $P(D|T)$:
$P(D|T) = \frac{0.0098}{0.0593} = 0.16526...$
The probability is approximately $0.165$.

**Standard Solution Steps**
- Define the events using clear notation.
- List all probabilities given in the question, carefully distinguishing between simple and conditional probabilities.
- Identify the conditional probability required by the question, for example $P(A|B)$.
- Write down the conditional probability formula: $P(A|B) = P(A \cap B) / P(B)$.
- Calculate the denominator, $P(B)$, by considering all possible ways event B can occur. This often involves the law of total probability.
- Calculate the numerator, $P(A \cap B)$, which is often one of the terms used to calculate the denominator.
- Substitute the values into the formula to find the final answer.

**Common Mistakes**
- Confusing $P(A|B)$ with $P(B|A)$. In this example, mixing up $P(D|T)$ with the given $P(T|D)$.
- Using the wrong probability for the denominator in the formula. The denominator must be the probability of the condition, $P(B)$.
- Errors in setting up or calculating the total probability for the denominator, such as omitting one of the pathways.
- Attempting to calculate $P(A|B)$ by simply dividing $P(A)$ by $P(B)$.
- Misinterpreting the problem language, which is crucial for setting up the initial probabilities correctly.

**Tags**
- probability, conditional probability, tree diagram, bayes theorem