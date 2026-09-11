# exact_tardiness

Write a Python function:

    def solve(jobs: list) -> int

One machine runs every job, one at a time, with no gaps and no preemption.
You choose the ORDER; the first job starts at time 0 and each job then runs
for its full duration back to back.

jobs is a list of [duration, due, weight] triples of ints, with
1 <= duration <= 100, 0 <= due <= 1000, 0 <= weight <= 100, and 0 <= n <= 16
jobs. A job that finishes at time C has tardiness max(0, C - due) — zero if
it finishes at or before its due date. The cost of an order is the sum of
weight * tardiness over all jobs.

Return the MINIMUM cost over all n! orders, as an int. Only the number is
graded; you never have to report the order that achieves it.

THIS IS AN EXACT-OPTIMUM TASK — ONLY THE TRUE MINIMUM SCORES:
A value that is merely close is graded exactly as wrong as a value that is
far off. Earliest due date, shortest processing time, largest weight,
largest weight/duration ratio, minimum slack, and every other one-pass
priority rule return non-optimal costs on the hidden cases, as do local
searches that may stop at a non-optimal order. There are at most 16 jobs
precisely so that an exact method fits inside the time limit: the standard
subset dynamic program over the 2^n sets of already-scheduled jobs is
O(2^n * n) and settles n = 16 in a fraction of a second in plain Python.

Examples:

    solve([]) -> 0
    solve([[5, 5, 4]]) -> 0
    solve([[2, 1, 5], [3, 4, 1]]) -> 6
    solve([[5, 5, 2], [4, 8, 4], [5, 15, 6], [6, 6, 6]]) -> 38

Notes on those examples. The second job finishes at time 5, exactly its due
date, so its tardiness is 0, not 4. In the third, running job 0 first costs
5*1 + 1*1 = 6, while running job 1 first costs 0 + 5*4 = 20. The fourth is the
trap: earliest-due-date order (0, 3, 1, 2) costs 88, and shortest-processing
time, largest weight, weight/duration ratio and minimum slack all cost 88 or
more; the optimal order (3, 1, 2, 0) costs 38.

Ties are impossible to get wrong here: the answer is a single number, so any
two orders that both achieve the minimum give the same result.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
