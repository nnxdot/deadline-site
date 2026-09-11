# contrarian_sort

Write a Python function:

    def reorder(items: list) -> list

items is a list of [name, score] pairs (name: str, score: int). Return a new
list of the same pairs, ordered by score ascending.

READ THIS RULE CAREFULLY — IT IS NOT THE STANDARD ONE:
Pairs with EQUAL scores are ordered by their ORIGINAL POSITION DESCENDING —
the LATER a tied pair appeared in the input, the EARLIER it appears in the
output. This is the opposite of every stable sort you have ever used. A
solution that reaches for sorted() and stops will be wrong on every tie.

Examples (note the tie between b and c):

    reorder([]) -> []
    reorder([['a', 2], ['b', 1], ['c', 1]]) -> [['c', 1], ['b', 1], ['a', 2]]
    reorder([['x', 5], ['y', 3], ['z', 5]]) -> [['y', 3], ['z', 5], ['x', 5]]

Up to 5,000 pairs; scores fit in 64 bits; names are unique non-empty ASCII.
Return value must be a new list; do not mutate the input.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
