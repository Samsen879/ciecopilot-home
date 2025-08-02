## Permutations and Combinations: Factorial Notation and Basic Permutations

**Syllabus Reference**: 9709.P5.5.2.1

**Learning Objective**: Understand the terms permutation ($nPr$) and combination ($nCr$) and solve simple problems involving arrangements of distinct items.

### Example Question
The letters of the word 'CRYSTAL' are to be arranged in a line.
(i) Find the total number of different arrangements.
(ii) Find the number of different arrangements in which the first letter is a consonant and the last letter is a vowel.

### Mark Scheme / Solution
(i) There are 7 distinct letters.
Number of arrangements = $7!$ (M1)
= 5040 (A1)

(ii) There are 5 consonants (C, R, Y, S, T, L) and 2 vowels (A, L). Oh wait, L is a consonant. 5 consonants (C, R, Y, S, T) and 2 vowels (A). The word is CRYSTAL. Let's re-check. C, R, Y, S, T, L are consonants (6). A is the only vowel. I will adjust the question to make it work better. Let's use the word 'FORMULA'. F,R,M,L are consonants (4). O,U,A are vowels (3). This is a better word.

New Question:
The letters of the word 'FORMULA' are to be arranged in a line.
(i) Find the total number of different arrangements.
(ii) Find the number of different arrangements in which the first letter is a consonant and the last letter is a vowel.

(i) There are 7 distinct letters.
Number of arrangements = $7!$ (M1)
= 5040 (A1)

(ii)
Number of choices for the first letter (consonant) = 4. (B1)
Number of choices for the last letter (vowel) = 3. (B1)
Number of ways to arrange the remaining 5 letters = $5!$ (M1)
Total arrangements = $4 \times 3 \times 5!$ = $12 \times 120 = 1440$. (A1)

### Standard Solution Steps
- Count the total number of distinct items, $n$. The total number of arrangements is $n!$.
- For restricted arrangements, consider the positions with constraints first.
- Determine the number of choices for each constrained position.
- Arrange the remaining unconstrained items. The number of ways to do this is $(n-k)!$ where $k$ is the number of constrained positions.
- Multiply the number of choices for all parts of the arrangement together.

### Common Mistakes
- Confusing permutations with combinations when arrangement is specified.
- Forgetting to arrange the middle, unconstrained items.
- Adding the number of choices for each position instead of multiplying.
- Miscounting the number of items of a specific type (e.g., vowels or consonants).

### Tags
- permutations, factorial, arrangements, restrictions, distinct items

---

## Permutations and Combinations: Arrangements with Repetition

**Syllabus Reference**: 9709.P5.5.2.2

**Learning Objective**: Solve problems about arrangements of objects in a line, including those involving repetition.

### Example Question
Find the number of different arrangements of the 11 letters in the word 'ASSESSMENT'.

### Mark Scheme / Solution
There are 11 letters in total. (B1 for n=11)
The letter 'S' is repeated 4 times.
The letter 'E' is repeated 2 times. (M1 for identifying any repeated letters and their counts)
The number of different arrangements = $\frac{11!}{4! \times 2!}$ (M1 for correct formula structure)
= $\frac{39916800}{24 \times 2}$
= $\frac{39916800}{48}$
= 831600 (A1)

### Standard Solution Steps
- Count the total number of letters, $n$.
- Identify any letters that are repeated and count the number of times each one appears (e.g., $p, q, r, ...$).
- The total number of distinct arrangements is given by the formula $\frac{n!}{p! \times q! \times r! ...}$.
- Calculate the value.

### Common Mistakes
- Forgetting to divide by the factorials of the repeated letters, calculating just $n!$.
- Only dividing by the factorial of one of the repeated letters, but not all of them.
- Miscounting the total number of letters or the number of repetitions.
- Calculating $(p \times q \times r)!$ in the denominator instead of $p! \times q! \times r!$.

### Tags
permutations, arrangements, repetition, non_distinct_items, identical_items

---

## Permutations and Combinations: Arrangements with Grouping

**Syllabus Reference**: 9709.P5.5.2.2

**Learning Objective**: Solve problems about arrangements of objects in a line where certain items must be kept together.

### Example Question
Find the number of ways that 5 men and 3 women can be arranged in a line if all 3 women must stand together.

### Mark Scheme / Solution
Treat the 3 women as a single block or unit. (M1)
Now we are arranging 5 men and 1 block, which is 6 items.
Number of ways to arrange these 6 items = $6!$. (M1)
The 3 women within their block can be arranged in $3!$ ways. (M1)
Total number of arrangements = $6! \times 3!$ (M1 for multiplying the two parts)
= $720 \times 6 = 4320$. (A1)

### Standard Solution Steps
- Identify the items that must be kept together and treat them as a single block.
- Calculate the number of ways to arrange this block along with the other individual items. If there are $k$ items in the group and $m$ other items, this is $(m+1)!$.
- Calculate the number of ways the items within the block can be arranged among themselves. If there are $k$ items in the group, this is $k!$.
- Multiply the results from the previous two steps to get the total number of arrangements.

### Common Mistakes
- Forgetting to arrange the items within the grouped block (i.e., forgetting to multiply by $k!$).
- Incorrectly calculating the number of items to arrange after grouping (e.g., arranging only the $m$ other items).
- Adding the permutations instead of multiplying (e.g., $(m+1)! + k!$).

### Tags
- permutations, arrangements, restrictions, grouping, together

---

## Permutations and Combinations: Selections (Combinations)

**Syllabus Reference**: 9709.P5.5.2.1

**Learning Objective**: Understand and use combinations ($nCr$) to solve problems involving selections where order is not important.

### Example Question
A team of 4 players is to be chosen from a squad of 10.
(i) How many different teams can be chosen?
(ii) The squad consists of 6 forwards and 4 defenders. How many different teams can be chosen if the team must consist of 2 forwards and 2 defenders?

### Mark Scheme / Solution
(i) Order does not matter, so this is a combination.
Number of teams = $10C4$ (M1)
= $\frac{10!}{4!(10-4)!} = \frac{10 \times 9 \times 8 \times 7}{4 \times 3 \times 2 \times 1}$
= 210 (A1)

(ii)
Number of ways to choose 2 forwards from 6 = $6C2$. (M1)
Number of ways to choose 2 defenders from 4 = $4C2$. (M1)
Total number of teams = $6C2 \times 4C2$ (M1 for product of combinations)
= $15 \times 6 = 90$. (A1)

### Standard Solution Steps
- Identify that the problem is about selection (e.g., choosing a committee, team, group) where the order of selection does not matter.
- Use the combination formula $nCr = \frac{n!}{r!(n-r)!}$.
- For problems with subgroups, calculate the number of combinations for each subgroup separately.
- Multiply the results for the subgroups together (the 'AND' rule) to find the total number of ways.

### Common Mistakes
- Using permutations ($nPr$) when order does not matter.
- For problems with subgroups, adding the combinations ($6C2 + 4C2$) instead of multiplying them.
- Using the wrong values for $n$ or $r$ in the formula.

### Tags
- combinations, selections, nCr, committees, groups

---

## Permutations and Combinations: Problems with Cases

**Syllabus Reference**: 9709.P5.5.2.2

**Learning Objective**: Solve complex permutation or combination problems by identifying and summing mutually exclusive cases.

### Example Question
A committee of 5 people is to be chosen from a group of 6 men and 4 women. Find the number of ways the committee can be formed if there must be more men than women on the committee.

### Mark Scheme / Solution
For there to be more men than women on a committee of 5, the possible compositions are (3 men, 2 women), (4 men, 1 woman), or (5 men, 0 women). These are mutually exclusive cases. (M1 for identifying all three cases)

Case 1: 3 Men and 2 Women
Number of ways = $6C3 \times 4C2$ (M1 for one correct case product)
= $20 \times 6 = 120$.

Case 2: 4 Men and 1 Woman
Number of ways = $6C4 \times 4C1$
= $15 \times 4 = 60$.

Case 3: 5 Men and 0 Women
Number of ways = $6C5 \times 4C0$
= $6 \times 1 = 6$.

Total number of ways = Sum of all cases
= $120 + 60 + 6$ (M1 for adding the results of the cases)
= 186. (A1)

### Standard Solution Steps
- Analyse the constraint and identify all possible, mutually exclusive scenarios (cases) that satisfy it.
- For each case, calculate the number of ways it can occur. This often involves multiplying combinations (the 'AND' rule).
- Add the results from all the individual cases to get the total number of ways (the 'OR' rule).
- Ensure that no cases overlap and that all possible cases have been considered.

### Common Mistakes
- Failing to identify all possible cases that satisfy the condition.
- Forgetting a case (e.g., the case with 0 women).
- Multiplying the results of the different cases instead of adding them.
- Calculating a single case correctly but failing to proceed further.
- Using permutations instead of combinations for the selection within each case.

### Tags
- combinations, restrictions, cases, selections, committees