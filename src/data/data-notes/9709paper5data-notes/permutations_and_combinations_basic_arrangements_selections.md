## Permutations and Combinations: Basic Arrangements and Selections

**Syllabus Reference**: S1 5.2.1

**Learning Objective**: Understand the terms permutation (P) and combination (C) and solve simple problems involving selections and arrangements.

### Example Question
A student is forming a 4-digit code using the digits {1, 2, 3, 4, 5, 6, 7} without repetition.

(i) How many different codes can be formed?
(ii) How many of these codes are even?
(iii) How many of these codes start with a prime number and end with an even number?

### Mark Scheme / Solution
(i)
The problem is about arranging 4 items from 7. Order matters.
Number of codes = $^7P_4 = 7 \times 6 \times 5 \times 4$ (M1)
= 840 (A1)

(ii)
For the code to be even, the last digit must be 2, 4, or 6 (3 choices).
Number of choices for the last digit = 3.
Number of remaining digits for the first three positions = 6.
Number of ways to arrange 3 digits from the remaining 6 = $^6P_3 = 6 \times 5 \times 4 = 120$. (M1)
Total even codes = $120 \times 3$ (M1)
= 360 (A1)

(iii)
Prime numbers in the set are {2, 3, 5, 7}. Even numbers are {2, 4, 6}.
This requires cases because the digit '2' is both prime and even.

*Case 1: The code starts with 2.*
1st digit is 2 (1 choice).
Last digit must be an even number from {4, 6} (2 choices).
The middle two digits must be chosen from the remaining 5 digits. $^5P_2 = 5 \times 4 = 20$ ways. (M1)
Number of codes in Case 1 = $1 \times 20 \times 2 = 40$. (A1)

*Case 2: The code starts with a prime other than 2.*
1st digit is from {3, 5, 7} (3 choices).
Last digit is from {2, 4, 6} (3 choices).
The middle two digits must be chosen from the remaining 5 digits. $^5P_2 = 5 \times 4 = 20$ ways. (M1)
Number of codes in Case 2 = $3 \times 20 \times 3 = 180$. (A1)

Total number of codes = $40 + 180 = 220$. (A1)

### Standard Solution Steps
- **Identify if order matters.** For codes, passwords, and arrangements in a line, order matters (use Permutations, P). For committees or groups, order does not matter (use Combinations, C).
- **Use the "box" or "slot" method.** Draw spaces for each position to be filled.
- **Deal with restrictions first.** Fill the positions that have constraints (e.g., must be even, must start with a vowel).
- **Be systematic.** Work from left to right or from the most constrained position outwards.
- **Watch for overlapping sets.** If a constraint involves items that overlap with another constraint (like the digit '2' being both prime and even), you must use separate cases.
- **Sum the results of mutually exclusive cases.**

### Common Mistakes
- Confusing Permutations and Combinations. Using $^7C_4$ instead of $^7P_4$ for part (i).
- When dealing with restrictions, reducing the number of choices for subsequent slots but forgetting to also reduce the pool of available items.
- Forgetting to consider all cases when constraints overlap. In part (iii), failing to separate the case where the starting digit is '2' from the cases where it is not.
- Multiplying probabilities for each case instead of adding them.

### Tags
- permutations, restrictions, arrangements, cases, fundamental counting principle

---

## Permutations and Combinations: Arrangements with Repetitions and Constraints

**Syllabus Reference**: S1 5.2.2

**Learning Objective**: Solve problems about arrangements of objects in a line, including those involving repetition and restriction.

### Example Question
Find the number of different ways the 11 letters of the word `STATISTICS` can be arranged if:

(i) there are no restrictions.
(ii) the arrangement must begin and end with the letter S.
(iii) the three T's must be together.
(iv) the two I's must not be next to each other.

### Mark Scheme / Solution
The word `STATISTICS` has 11 letters with repetitions: S (3), T (3), A (1), I (2), C (1).

(i)
Total arrangements = $\frac{11!}{3! \times 3! \times 2!}$ (M1 for 11!, M1 for denominator)
= $\frac{39916800}{6 \times 6 \times 2} = \frac{39916800}{72}$
= 554,400 (A1)

(ii)
Place an S at the start and an S at the end.
This leaves 9 letters to be arranged in the middle: S(1), T(3), A(1), I(2), C(1). (M1)
Number of arrangements = $\frac{9!}{3! \times 2!} = \frac{362880}{6 \times 2} = \frac{362880}{12}$ (M1)
= 30,240 (A1)

(iii)
Treat the three T's as a single block: (TTT).
Now we are arranging 9 "items": (TTT), S, S, S, A, I, I, C. (M1)
These 9 items have repetitions: S (3), I (2).
Number of arrangements = $\frac{9!}{3! \times 2!} = \frac{362880}{12}$ (M1)
= 30,240 (A1)
*Note: Since the T's are identical, there are no internal arrangements of the block.*

(iv)
Use the (Total arrangements) - (Arrangements with the two I's together) method.
Total arrangements from part (i) = 554,400.
To find arrangements with I's together, treat (II) as a single block.
We are arranging 10 "items": (II), S, S, S, T, T, T, A, C. (M1)
Repetitions are S(3), T(3).
Arrangements with I's together = $\frac{10!}{3! \times 3!} = \frac{3628800}{36} = 100,800$. (M1)
Arrangements with I's not together = 554,400 - 100,800 (M1)
= 453,600 (A1)

### Standard Solution Steps
- **Identify repetitions.** First, count the total number of items and the frequency of each repeated item.
- **For arrangements with repetitions**, use the formula $\frac{n!}{n_1! n_2! \dots}$.
- **For "together" constraints**, treat the group of items as a single block. Arrange this block with the other items. If the items within the block are distinct, multiply by the number of ways they can be arranged internally ($k!$).
- **For "not together" constraints**, the easiest method is often (Total ways) - (Ways they are together).
- **The "gap" method** is an alternative for "not together": arrange the other items first, creating "gaps" where the separated items can be placed.

### Common Mistakes
- Forgetting to divide by the factorials of repeated items. This is the most common error.
- In "together" problems, forgetting to multiply by the internal arrangements of the block if the items are distinct (e.g., if the question involved 3 different people sitting together).
- In "not together" problems, calculating the 'together' part incorrectly, leading to a wrong final answer even if the method is correct.
- Applying the `(Total) - (Together)` logic incorrectly to more complex separation problems (e.g., "no two of the three T's are together" requires the gap method).

### Tags
- permutations, arrangements, repetition, constraints, together, not together

---

## Permutations and Combinations: Selections with Conditions

**Syllabus Reference**: S1 5.2.1

**Learning Objective**: Solve simple problems involving selections, including subdividing a group into smaller groups.

### Example Question
A school council committee of 5 members is to be selected from a group of 6 boys and 8 girls.

(i) Find the number of different committees that can be formed.
(ii) Find the number of committees that include the youngest boy and the oldest girl.
(iii) Find the number of committees that consist of at least 3 boys.

### Mark Scheme / Solution
Total people to choose from = 6 boys + 8 girls = 14 people. We are selecting 5. Order does not matter, so we use Combinations.

(i)
Number of committees = $^{14}C_5$ (M1)
= $\frac{14!}{5! \times 9!} = \frac{14 \times 13 \times 12 \times 11 \times 10}{5 \times 4 \times 3 \times 2 \times 1}$
= 2002 (A1)

(ii)
The youngest boy and oldest girl are already chosen, so they occupy 2 spots on the committee.
We need to choose 3 more members from the remaining people.
Remaining people = (6-1) boys + (8-1) girls = 5 boys + 7 girls = 12 people. (M1)
Number of ways to choose the remaining 3 members = $^{12}C_3$ (M1)
= $\frac{12 \times 11 \times 10}{3 \times 2 \times 1} = 2 \times 11 \times 10 = 220$ (A1)

(iii)
"At least 3 boys" means the committee can have (3 boys AND 2 girls) OR (4 boys AND 1 girl) OR (5 boys AND 0 girls). We must calculate these cases and add them.

*Case 1: 3 boys and 2 girls*
Ways = $(^6C_3) \times (^8C_2)$ (M1 for product of combinations)
= $(20) \times (28) = 560$ (A1)

*Case 2: 4 boys and 1 girl*
Ways = $(^6C_4) \times (^8C_1)$
= $(15) \times (8) = 120$ (A1)

*Case 3: 5 boys and 0 girls*
Ways = $(^6C_5) \times (^8C_0)$
= $(6) \times (1) = 6$ (A1)

Total number of committees = $560 + 120 + 6 = 686$ (M1 for adding cases)

### Standard Solution Steps
- **Identify if order matters.** For selecting committees or groups, order does not matter, so use Combinations ($^nC_r$).
- **For simple selections**, use $^{n}C_{r}$ where $n$ is the total number of items and $r$ is the number to be chosen.
- **For selections with pre-determined members**, reduce both the total pool ($n$) and the number of slots to fill ($r$) before calculating the combinations.
- **For "AND" conditions** (e.g., choosing boys AND girls), multiply the number of ways for each part: $(Ways\_to\_choose\_boys) \times (Ways\_to\_choose\_girls)$.
- **For "OR" conditions** or "at least/at most" scenarios, break the problem into mutually exclusive cases, calculate the combinations for each case, and then add the results.

### Common Mistakes
- Using Permutations ($^nP_r$) instead of Combinations ($^nC_r$) for a selection problem.
- When dealing with pre-selected individuals, forgetting to reduce the pool of available people to choose from.
- For "at least" problems, only calculating the minimum case (e.g., only calculating for exactly 3 boys and forgetting the 4-boy and 5-boy cases).
- Adding instead of multiplying for "AND" conditions (e.g., $^6C_3 + ^8C_2$ instead of $^6C_3 \times ^8C_2$).

### Tags
- combinations, selections, committees, at least, cases, conditions