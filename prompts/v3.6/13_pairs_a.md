# pairs_a

Write a Python function:

    def count_pairs(a: list) -> int

Count the pairs of indices (i, j) with i < j where (a[i] + a[j]) % 374 == 67. The predicate was GENERATED for this benchmark.

Constraints:
- Elements are non-negative ints.
- len(a) can be up to 200,000 and the hidden tests include a list that big.
- PERFORMANCE IS PART OF THE SPEC: comparing every pair is quadratic and
  will time out for zero credit on that group. Handle 200,000 elements in
  a few seconds.

count_pairs([]) -> 0.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
