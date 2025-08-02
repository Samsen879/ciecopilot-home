## Probability: Venn Diagrams and Basic Laws

**Syllabus Reference**: S1 5.3.2

**Learning Objective**: Use Venn diagrams to represent events and calculate probabilities, including understanding of intersection, union and complements.

### Example Question
In a college of 200 students, 80 take Music ($M$), 95 take Art ($A$) and 35 take both Music and Art.
(i) Draw a Venn diagram to represent this information.
(ii) A student is chosen at random. Find the probability that the student takes Music but not Art.
(iii) Find the probability that the student takes neither Music nor Art.
(iv) Find the probability that the student takes Art, given that they do not take Music.

### Mark Scheme / Solution
(i)
Number taking only Music = $80 - 35 = 45$. (M1 for subtraction)
Number taking only Art = $95 - 35 = 60$.
Number taking neither = $200 - (45 + 60 + 35) = 200 - 140 = 60$. (M1 for finding neither)
Correct Venn diagram with 45, 35, 60 and 60 in the correct regions. (A1)

(ii)
$P(M \cap A') = 45 / 200 = 9/40$. (B1 for correct numerator and denominator)

(iii)
$P(M' \cap A') = 60 / 200 = 3/10$. (B1 for correct numerator and denominator)

(iv)
The number of students who do not take Music is $60 + 60 = 120$. (M1 for denominator)
The number of students who take Art and do not take Music is 60.
$P(A|M') = P(A \cap M') / P(M') = 60 / 120 = 1/2$. (A1)

### Standard Solution Steps
- Start by drawing the two overlapping circles for the events.
- Fill in the intersection (the 'both' category) first.
- Calculate the values for the 'only' parts of each circle by subtracting the intersection value from the total for that event.
- Calculate the number of items outside both circles by subtracting the sum of all parts of the circles from the universal set total.
- Use the values in the Venn diagram to find the numerators for probability calculations. The denominator is the total number of items (200 in this case).
- For conditional probability $P(X|Y)$, the numerator is the number in the intersection of $X$ and $Y$, and the denominator is the total number in the condition $Y$.

### Common Mistakes
- Putting the total numbers for the events (80 and 95) into the main parts of the circles instead of subtracting the intersection first.
- Forgetting to calculate or include the number of items outside both circles.
- Using the wrong denominator for conditional probability; for $P(A|B)$, the denominator must be the total for event $B$, not the grand total.
- Arithmetic errors when subtracting to find the 'only' or 'neither' regions.

### Tags
- venn diagram, probability, addition rule, complement, conditional probability

---

## Probability: Conditional Probability and Independence

**Syllabus Reference**: S1 5.3.2, S1 5.3.3

**Learning Objective**: Understand conditional probability and independence and use the formulae $P(A|B) = P(A \cap B) / P(B)$ and $P(A \cap B) = P(A)P(B)$.

### Example Question
For two events $A$ and $B$, it is given that $P(A) = 0.5$, $P(B) = 0.4$ and $P(A \cup B) = 0.7$.
(i) Find $P(A \cap B)$.
(ii) Find $P(A|B)$.
(iii) Find $P(B|A')$.
(iv) Determine, with justification, whether events $A$ and $B$ are independent.

### Mark Scheme / Solution
(i)
Using the addition rule: $P(A \cup B) = P(A) + P(B) - P(A \cap B)$.
$0.7 = 0.5 + 0.4 - P(A \cap B)$. (M1 for correct formula)
$P(A \cap B) = 0.9 - 0.7 = 0.2$. (A1)

(ii)
Using the conditional probability formula: $P(A|B) = P(A \cap B) / P(B)$.
$P(A|B) = 0.2 / 0.4$. (M1 for substitution)
$P(A|B) = 0.5$. (A1)

(iii)
$P(B|A') = P(B \cap A') / P(A')$.
$P(A') = 1 - P(A) = 1 - 0.5 = 0.5$. (B1 for $P(A')$)
$P(B \cap A') = P(B) - P(A \cap B) = 0.4 - 0.2 = 0.2$. (M1 for numerator)
$P(B|A') = 0.2 / 0.5 = 0.4$. (A1)

(iv)
Method 1: Compare $P(A \cap B)$ with $P(A) \times P(B)$.
$P(A) \times P(B) = 0.5 \times 0.4 = 0.2$. (M1)
Since $P(A \cap B) = 0.2$ and $P(A) \times P(B) = 0.2$, the events are independent. (A1)

Method 2: Compare $P(A|B)$ with $P(A)$.
$P(A|B) = 0.5$ and $P(A) = 0.5$. (M1)
Since $P(A|B) = P(A)$, the events are independent. (A1)

### Standard Solution Steps
- For $P(A \cap B)$, rearrange the addition formula: $P(A \cap B) = P(A) + P(B) - P(A \cup B)$.
- For conditional probability $P(X|Y)$, always apply the formula $P(X \cap Y) / P(Y)$.
- Remember that $P(X') = 1 - P(X)$.
- To find a probability like $P(B \cap A')$, it's often helpful to visualize a Venn diagram. It corresponds to the part of $B$ that is not in $A$, so $P(B) - P(A \cap B)$.
- To test for independence, you must perform one of the valid numerical tests: check if $P(A \cap B) = P(A) \times P(B)$ or check if $P(A|B) = P(A)$.
- State the result of your test and a clear conclusion.

### Common Mistakes
- Confusing independence with mutual exclusivity.
- Stating that events are not independent just because $P(A \cap B) \neq 0$. This is incorrect; the test requires comparison with $P(A)P(B)$.
- Errors in the conditional probability formula, typically dividing by the wrong probability (e.g., using $P(A)$ in the denominator for $P(A|B)$).
- Algebraic errors when rearranging the addition formula.

### Tags
- conditional probability, independence, addition rule, formula application

---

## Probability: Tree Diagrams

**Syllabus Reference**: S1 5.3.3

**Learning Objective**: Calculate and use conditional probabilities, including the use of tree diagrams.

### Example Question
A company has two machines, Machine $X$ and Machine $Y$, which produce widgets. Machine $X$ produces 60% of the total output, and Machine $Y$ produces 40%. For Machine $X$, 5% of the widgets are defective. For Machine $Y$, 8% of the widgets are defective. A widget is selected at random from the total output.

(i) Draw a tree diagram showing the probabilities of a widget being from each machine and whether it is defective or not.
(ii) Find the probability that the widget is defective.
(iii) Given that the widget is defective, find the probability that it was produced by Machine $X$.

### Mark Scheme / Solution
(i)
First branches: Machine $X$ (0.6), Machine $Y$ (0.4). (B1)
Second branches from $X$: Defective (0.05), Not Defective (0.95). (B1)
Second branches from $Y$: Defective (0.08), Not Defective (0.92). (B1)
Correctly drawn and labelled tree diagram.

(ii)
The widget can be defective if it comes from $X$ AND is defective, OR from $Y$ AND is defective.
$P(\text{Defective}) = P(X \cap D) + P(Y \cap D)$.
$P(\text{Defective}) = (0.6 \times 0.05) + (0.4 \times 0.08)$. (M1 for summing two products)
$P(\text{Defective}) = 0.03 + 0.032 = 0.062$. (A1)

(iii)
We need to find $P(X|D)$.
Using the formula: $P(X|D) = P(X \cap D) / P(D)$. (M1 for formula structure)
We calculated both parts in (ii).
$P(X \cap D) = 0.6 \times 0.05 = 0.03$.
$P(D) = 0.062$.
$P(X|D) = 0.03 / 0.062$. (M1 for correct values)
$P(X|D) = 30/62 = 15/31$ or $0.484$. (A1)

### Standard Solution Steps
- Draw the first set of branches representing the first stage of the event (e.g., choosing a machine).
- From the end of each of those branches, draw the second set of branches for the second stage (e.g., defective or not), ensuring the probabilities on each pair of branches sum to 1.
- To find the probability of a final outcome, multiply along the branches.
- To find the probability of an event that can happen via multiple paths (like 'defective'), calculate the probability of each relevant path and add them together.
- For a conditional probability of the form "Given $B$ happened, what is the probability of $A$?", use the formula $P(A|B) = \frac{\text{Probability of path leading to A and B}}{\text{Total probability of B}}$.

### Common Mistakes
- Getting the conditional probabilities on the second branches wrong (e.g., confusing $P(D|X)$ with $P(D \cap X)$).
- Adding probabilities along a single path instead of multiplying.
- For a conditional probability like $P(X|D)$, incorrectly calculating it as just $P(X \cap D)$, forgetting to divide by the total probability of $D$.
- Not considering all possible paths to an outcome. For example, when calculating $P(D)$, forgetting the path through machine $Y$.

### Tags
- tree diagram, conditional probability, bayes' theorem, total probability

---

## Probability: Using Permutations and Combinations

**Syllabus Reference**: S1 5.3.1

**Learning Objective**: Evaluate probabilities by calculation using permutations or combinations.

### Example Question
A committee of 4 people is to be chosen at random from a group of 6 men and 8 women.
(i) Find the total number of different committees that can be chosen.
(ii) Find the probability that the committee consists of exactly 1 man and 3 women.
(iii) Find the probability that the committee includes at least one man.

### Mark Scheme / Solution
(i)
Total people = $6 + 8 = 14$. We are choosing 4.
Total number of committees = $^{14}C_4$. (M1)
$= \frac{14 \times 13 \times 12 \times 11}{4 \times 3 \times 2 \times 1} = 1001$. (A1)

(ii)
Number of ways to choose 1 man from 6 = $^6C_1 = 6$.
Number of ways to choose 3 women from 8 = $^8C_3 = 56$. (M1 for product of combinations)
Number of committees with 1 man and 3 women = $^6C_1 \times ^8C_3 = 6 \times 56 = 336$. (A1)
Probability = (Favourable outcomes) / (Total outcomes) = $336 / 1001$. (M1)
$P(\text{1 man, 3 women}) = 336/1001 = 48/143$. (A1)

(iii)
The opposite of 'at least one man' is 'zero men' (i.e., all women).
Number of ways to choose 4 women from 8 = $^8C_4 = 70$. (M1)
Probability of choosing 0 men (4 women) = $70 / 1001$. (A1)
$P(\text{at least one man}) = 1 - P(\text{0 men})$. (M1)
$= 1 - 70/1001 = 931/1001 = 133/143$. (A1)

### Standard Solution Steps
- First, determine if the problem is a permutation (order matters) or a combination (order doesn't matter). Committees are combinations.
- Calculate the denominator of the probability: the total number of possible outcomes without restrictions, which is $^{Total}C_{group size}$.
- Calculate the numerator: the number of favourable outcomes. This often involves multiplying combinations for subgroups (e.g., `(ways to choose men) x (ways to choose women)`).
- For 'at least' or 'at most' problems, consider if it's easier to calculate the probability of the complement event and subtract from 1.
- Divide the number of favourable outcomes by the total number of outcomes to get the final probability.

### Common Mistakes
- Using permutations ($^nP_r$) instead of combinations ($^nC_r$).
- Incorrectly calculating the number of favourable outcomes, for example adding combinations instead of multiplying them ($^6C_1 + ^8C_3$ instead of $^6C_1 \times ^8C_3$).
- For 'at least one' problems, only calculating the case for 'exactly one' and forgetting the other cases.
- When using the complement method, forgetting to subtract the calculated probability from 1.

### Tags
- probability, combinations, selections, committee, at least one