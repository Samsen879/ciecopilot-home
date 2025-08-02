## Permutations and Combinations: Basic Selections
**Syllabus Reference**: 9709.P5.5.2.1

**Learning Objective**
Understand the terms permutation (P) and combination (C) and solve simple problems involving selections.

**Example Question**
A school needs to form a committee. There are 10 teachers available.
(a) How many ways can a 4-person committee be selected?
(b) How many ways can a President, Vice-President, Secretary, and Treasurer be chosen from the 10 teachers?

**Mark Scheme / Solution**
(a) Order does not matter for a committee. This is a combination. Number of ways = $\binom{10}{4} = \frac{10!}{4!(10-4)!} = \frac{10 \times 9 \times 8 \times 7}{4 \times 3 \times 2 \times 1} = 210$.
(b) Order matters because the roles (President, etc.) are distinct. This is a permutation. Number of ways = ${}^{10}P_{4} = \frac{10!}{(10-4)!} = 10 \times 9 \times 8 \times 7 = 5040$.

**Standard Solution Steps**
- Identify if the order of selection matters in the context of the problem.
- If order does not matter, such as when selecting a group, committee, or team, use combinations $\binom{n}{k}$.
- If order matters, such as when assigning specific roles, arranging digits in a code, or ordering letters, use permutations ${}^{n}P_{r}$.
- Apply the correct formula using the total number of items to choose from ($n$) and the number of items to select ($k$ or $r$).

**Common Mistakes**
- Using permutations when combinations are required, or vice versa. This is the most common conceptual error.
- Confusing the total number of items ($n$) with the number of items being selected ($k$).
- Making calculation errors when simplifying the factorials.
- Incorrectly concluding that different wording implies a different method without analysing the context of order.

**Tags**
- permutations, combinations, selections, order matters, committee, roles, factorial

## Permutations and Combinations: Arrangements with Repetitions
**Syllabus Reference**: 9709.P5.5.2.2

**Learning Objective**
Solve problems about arrangements of objects in a line, including those involving repetition.

**Example Question**
Find the number of different arrangements of the letters in the word STATISTICS.

**Mark Scheme / Solution**
There are 10 letters in total.
The letter S appears 3 times.
The letter T appears 3 times.
The letter I appears 2 times.
The letter A appears 1 time.
The letter C appears 1 time.
Number of arrangements = $\frac{10!}{3!3!2!1!1!} = \frac{3628800}{6 \times 6 \times 2 \times 1 \times 1} = \frac{3628800}{72} = 50400$.

**Standard Solution Steps**
- Count the total number of objects, $n$.
- For each distinct type of object, count the number of times it is repeated ($n_1, n_2, \ldots, n_k$).
- The total number of distinct arrangements is given by the formula $\frac{n!}{n_1! n_2! \ldots n_k!}$.
- Calculate the final numerical result.

**Common Mistakes**
- Forgetting to divide by the factorials of the repeated items and simply calculating $n!$.
- Miscounting the total number of items or the number of repetitions for one or more items.
- Dividing by the number of repeated items instead of the factorial of that number, for example, dividing by 3 instead of $3!$.
- Errors in calculator entry for complex factorial expressions.

**Tags**
permutations, arrangements, repetition, identical items, non-distinct, words

## Permutations and Combinations: Arrangements with Restrictions (Together)
**Syllabus Reference**: 9709.P5.5.2.2

**Learning Objective**
Solve problems about arrangements of objects in a line, including those involving restriction.

**Example Question**
Find the number of ways to arrange the letters of the word TRIANGLE if the letters A and E must be together.

**Mark Scheme / Solution**
The word TRIANGLE has 8 distinct letters.
Treat the block (AE) as a single item. We are now arranging 7 items: (AE), T, R, I, N, G, L.
The number of ways to arrange these 7 items is $7! = 5040$.
Within the block (AE), the letters can be arranged in $2!$ ways (AE or EA).
Total arrangements = (Ways to arrange the 7 items) $\times$ (Internal arrangements of the block) = $7! \times 2! = 5040 \times 2 = 10080$.

**Standard Solution Steps**
- Identify the items that must be kept together and group them as a single block or unit.
- Calculate the number of permutations of this new set of items, which includes the single block and all other individual items.
- Calculate the number of internal permutations of the items within the block itself.
- Multiply the result from arranging the blocks and other items by the result from arranging the items within the block.

**Common Mistakes**
- Forgetting to multiply by the internal arrangements of the block, for example, calculating $7!$ but not multiplying by $2!$.
- Incorrectly counting the number of items to arrange after creating the block.
- Applying this method to problems where items must be kept separate.
- If the block contains repeated items, forgetting to account for these repetitions in the internal arrangement calculation.

**Tags**
- permutations, arrangements, restrictions, together, adjacent, block method, constraint

## Permutations and Combinations: Arrangements with Restrictions (Separated)
**Syllabus Reference**: 9709.P5.5.2.2

**Learning Objective**
Solve problems about arrangements of objects in a line, including those involving restriction.

**Example Question**
5 boys and 3 girls are to be seated in a row. Find the number of arrangements if no two girls are allowed to sit together.

**Mark Scheme / Solution**
First, arrange the 5 boys. This creates gaps where the girls can be seated.
The number of ways to arrange the 5 boys is $5! = 120$.
Arranging the 5 boys creates 6 possible slots for the girls, one at each end and one between each pair of boys: _ B _ B _ B _ B _ B _
We need to choose 3 of these 6 slots for the 3 distinct girls and arrange them. This is a permutation.
Number of ways to place the girls = ${}^{6}P_{3} = \frac{6!}{(6-3)!} = 6 \times 5 \times 4 = 120$.
Total arrangements = (Ways to arrange boys) $\times$ (Ways to place girls) = $5! \times {}^{6}P_{3} = 120 \times 120 = 14400$.

**Standard Solution Steps**
- Identify the group of items that must be kept separate.
- Arrange the other group of items first. This creates a number of available slots or gaps.
- Count the number of available slots. If there are $n$ items arranged, there will be $n+1$ slots available, including at both ends.
- Use permutations to place the "separated" items into the available slots. The number of ways is ${}^{slots}P_{items}$.
- Multiply the number of ways to arrange the first group by the number of ways to place the second group into the slots.

**Common Mistakes**
- Using the incorrect method of (Total arrangements) - (Arrangements where they are all together). This method is only valid if exactly two items must be separated and fails for three or more items.
- Incorrectly calculating the number of available slots, often by forgetting the slots at the ends and using $n-1$ instead of $n+1$.
- Using combinations instead of permutations to place the items into the slots. Since the items being placed are distinct, their order within the chosen slots matters.
- Arranging the "separated" group first, which makes the problem much more complex.

**Tags**
- permutations, arrangements, restrictions, separated, not together, gap method, constraint