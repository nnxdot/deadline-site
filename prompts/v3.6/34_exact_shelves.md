# exact_shelves

Write a Python function:

    def solve(data: list) -> int

data is a two-element list [width, rects]. rects is a list of [w, h]
rectangles. Pack every rectangle into horizontal SHELVES stacked one on top
of another inside a strip of the given width:

  - Every rectangle sits on exactly one shelf, in the orientation given.
    Rotation is NOT allowed: a [3, 7] rectangle is never a [7, 3] one.
  - The widths of the rectangles sharing a shelf must sum to AT MOST width.
    Filling a shelf exactly to width is allowed.
  - A shelf's height is the largest h among the rectangles on it; a shelf
    with one [4, 9] rectangle is 9 tall no matter how much width is spare.
  - The strip's total height is the sum of the shelf heights. You may use
    as many shelves as you like, and the order of the shelves is irrelevant.

Return the MINIMUM achievable total height as an int. Only the number is
graded; you never have to report which rectangles share a shelf.

All values are ints, with 1 <= width <= 100, 1 <= h <= 100, and
1 <= w <= width for every rectangle (so a rectangle always fits on an empty
shelf), and 0 <= n <= 14 rectangles.

THIS IS AN EXACT-OPTIMUM TASK — ONLY THE TRUE MINIMUM SCORES:
A value that is merely close is graded exactly as wrong as a value that is
far off. First-fit / next-fit / best-fit decreasing height, decreasing
width, and decreasing area are all WRONG on the hidden cases, and so is any
search that may stop at a non-optimal packing. There are at most 14
rectangles precisely so that an exact method fits inside the time limit:
partitioning the rectangles into shelves with a subset dynamic program that
enumerates the submasks of each set is O(3^n) and settles n = 14 in a
fraction of a second in plain Python.

Examples:

    solve([5, []]) -> 0
    solve([5, [[5, 3]]]) -> 3
    solve([6, [[4, 5], [2, 5]]]) -> 5
    solve([9, [[2, 2], [6, 2], [1, 4], [3, 7], [5, 2]]]) -> 9

Notes on those examples. In the third, the two rectangles fill a width-6
shelf exactly (4 + 2), so one shelf of height 5 holds both; refusing exact
fills would cost 10. The fourth is the trap: the optimum puts rectangles 0
and 1 on one shelf (widths 2 + 6 = 8, height 2) and rectangles 2, 3 and 4 on
another (widths 1 + 3 + 5 = 9, exactly the strip width, height 7) for a
total of 9. Every decreasing-height or decreasing-width first-fit packing of
that instance is 11 tall.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
