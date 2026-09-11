# shadow_eval

Write a Python function:

    def ev(s: str) -> int

An integer expression evaluator whose operator MEANINGS, PRECEDENCE LEVELS,
and ASSOCIATIVITIES are hidden. The space they are drawn from is declared
here in full - nothing outside it is hidden, and everything inside it is
inferable from the observations below:

* The operator symbols are [':', '&', '|', '#', '~']. Every symbol is a
  binary operator; there is no unary operator of any kind.
* Each symbol denotes exactly one of these nine integer operations (two
  symbols may denote the same one): add (a + b), subtract (a - b),
  multiply (a * b), floor-divide (a // b), modulo (a % b), maximum,
  minimum, absolute difference (|a - b|), gcd (of the absolute values,
  with gcd(x, 0) = x).
* Floor-divide and modulo use Python's floor semantics: the quotient is
  floored toward negative infinity and the remainder carries the sign of
  the right operand. A floor-divide or modulo whose right operand is 0
  raises ValueError.
* There are exactly FOUR precedence levels, numbered 0 (binds loosest) to
  3 (binds tightest). Each symbol sits on exactly one level and every level
  holds at least one symbol - so exactly one level holds two symbols.
* Each LEVEL is either left-associative or right-associative as a whole,
  and the four levels choose independently. Operators sharing a level are
  chained by that level's associativity.
* Parentheses group. Literals are non-negative decimal integers of any
  magnitude. Whitespace anywhere between tokens is ignored. Intermediate and
  final values may be negative.
* Every other input raises ValueError: an unknown character, an empty
  expression, two adjacent literals, a missing operand, a dangling operator,
  an empty pair of parentheses, and unbalanced or misplaced parentheses.

That space holds 9^5 * 3840 = 226,748,160 candidate languages. Exactly one
of them reproduces all of the following exact evaluations. Infer it, then
implement ev to match on ANY expression:

    ev('7 : 3') -> 1
    ev('3 : 7') -> 3
    ev('9 : 2') -> 1
    ev('12 : 5') -> 2
    ev('9 : 1') -> 0
    ev('7 & 3') -> 21
    ev('3 & 7') -> 21
    ev('9 & 2') -> 18
    ev('12 & 5') -> 60
    ev('9 & 1') -> 9
    ev('7 | 3') -> 4
    ev('3 | 7') -> -4
    ev('9 | 2') -> 7
    ev('12 | 5') -> 7
    ev('9 | 1') -> 8
    ev('7 # 3') -> 2
    ev('3 # 7') -> 0
    ev('9 # 2') -> 4
    ev('12 # 5') -> 2
    ev('9 # 1') -> 9
    ev('7 ~ 3') -> 4
    ev('3 ~ 7') -> 4
    ev('9 ~ 2') -> 7
    ev('12 ~ 5') -> 7
    ev('9 ~ 1') -> 8
    ev('2 : 3 & 4') -> 2
    ev('2 : 3 | 4') -> 0
    ev('9 : 7 # 3') -> 1
    ev('2 : 3 ~ 4') -> 0
    ev('2 & 3 : 4') -> 2
    ev('2 & 3 | 4') -> 2
    ev('2 & 3 # 4') -> 0
    ev('2 & 3 ~ 4') -> 2
    ev('2 | 3 : 4') -> 3
    ev('2 | 3 & 4') -> -4
    ev('2 | 3 # 4') -> 2
    ev('2 | 3 ~ 4') -> 1
    ev('2 # 3 : 4') -> 0
    ev('2 # 3 & 4') -> 0
    ev('2 # 3 | 4') -> -4
    ev('2 # 3 ~ 4') -> 2
    ev('2 ~ 3 : 4') -> 1
    ev('2 ~ 3 & 4') -> 4
    ev('2 ~ 3 | 4') -> -3
    ev('2 ~ 3 # 4') -> 0
    ev('30 : 17 : 7') -> 0
    ev('13 ~ 5 ~ 2') -> 6
    ev('100 # 6 # 3') -> 50
    ev('11 & 5 & 2') -> 110
    ev('20 | 7 | 4') -> 9
    ev('9 : 20 & 3') -> 9
    ev('17 # 4 ~ 2') -> 8
    ev('30 | 4 & 5 : 7') -> 4
    ev('13 ~ 5 # 2 & 3') -> 12
    ev('(30 : 17) : 7') -> 6
    ev('(13 ~ 5) # 2') -> 4
    ev('2 & (3 | 4)') -> -2
    ev('((41))') -> 41
    ev('41 # 5 ~ 3 | 2 & 6 : 19') -> 13
    ev('90 : 7 & 4 # 3 ~ 1') -> 6
    ev('(8 | 19) ~ 6 # 2') -> 8
    ev('25 & 3 : 11 | 4 ~ 2') -> 3
    ev('7') -> 7

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
