# 25_js_eval_traces

A hidden JavaScript expression evaluator computes integer expressions
built from numbers, parentheses, and the four operators ? : % !.
What each operator computes, their precedence levels, and their
associativity are NOT given and deliberately differ from convention.
Reverse-engineer everything from the evaluations below and implement
`module.exports.ev(expr)` (expr = string, returns the integer) so it
matches the hidden evaluator EXACTLY on any well-formed expression.

Observed evaluations (expression -> value):

    "2 ? 3 : 4"  ->  21
    "2 ? 3 % 4"  ->  35
    "2 ? 3 ! 4"  ->  69
    "2 : 3 ? 4"  ->  38
    "2 : 3 % 4"  ->  20
    "2 : 3 ! 4"  ->  44
    "2 % 3 ? 4"  ->  -12
    "2 % 3 : 4"  ->  -5
    "2 % 3 ! 4"  ->  -13
    "2 ! 3 ? 4"  ->  28
    "2 ! 3 : 4"  ->  21
    "2 ! 3 % 4"  ->  15
    "8 ? 3 ? 2"  ->  52
    "(8 ? 3) ? 2"  ->  56
    "8 : 3 : 2"  ->  18
    "(8 : 3) : 2"  ->  18
    "8 % 3 % 2"  ->  17
    "(8 % 3) % 2"  ->  61
    "8 ! 3 ! 2"  ->  57
    "(8 ! 3) ! 2"  ->  217
    "7 : 20 ? 28 ? 10"  ->  603
    "3"  ->  3
    "20"  ->  20
    "19"  ->  19
    "9 ? 26 % 23 % 1"  ->  220
    "(26) % 19 ! 8"  ->  -25

Rules: Node.js built-in modules only, CommonJS (`module.exports`). One blind attempt.

canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a
