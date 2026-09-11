# calendar_traces

A calendar GENERATED for this benchmark - and this time you do NOT get its
rules. You get observations. Infer the whole cosmology and implement:

    def to_ordinal(y: int, m: int, d: int) -> int
    def from_ordinal(n: int) -> tuple
    def weekday(n: int) -> str

What you are told about the rules' SHAPE:
- Years are 0, 1, 2, ...; each year has the same number of months (at most
  15); day numbers start at 1; absolute day 0 is year 0, month 1, day 1.
- Months have a common base length; every k-th month (some fixed k) is one
  day longer.
- One leap rule of the form "year divisible by A but not by B" adds one day
  to ONE specific month.
- Weeks cycle through at most 9 fixed day names.
- Invalid dates / negative n raise ValueError.

All parameters - month count, base length, k, A, B, the leap month, the week
length, the names, the epoch weekday - must be inferred from these exact
observations (month boundaries for years 0, 1, and 6, plus samples):

    from_ordinal(0) -> (0, 1, 1)
    from_ordinal(35) -> (0, 1, 36)
    from_ordinal(36) -> (0, 2, 1)
    from_ordinal(71) -> (0, 2, 36)
    from_ordinal(72) -> (0, 3, 1)
    from_ordinal(107) -> (0, 3, 36)
    from_ordinal(108) -> (0, 4, 1)
    from_ordinal(144) -> (0, 4, 37)
    from_ordinal(145) -> (0, 5, 1)
    from_ordinal(180) -> (0, 5, 36)
    from_ordinal(181) -> (0, 6, 1)
    from_ordinal(216) -> (0, 6, 36)
    from_ordinal(217) -> (0, 7, 1)
    from_ordinal(252) -> (0, 7, 36)
    from_ordinal(253) -> (0, 8, 1)
    from_ordinal(289) -> (0, 8, 37)
    from_ordinal(290) -> (0, 9, 1)
    from_ordinal(325) -> (0, 9, 36)
    from_ordinal(326) -> (1, 1, 1)
    from_ordinal(361) -> (1, 1, 36)
    from_ordinal(362) -> (1, 2, 1)
    from_ordinal(397) -> (1, 2, 36)
    from_ordinal(398) -> (1, 3, 1)
    from_ordinal(433) -> (1, 3, 36)
    from_ordinal(434) -> (1, 4, 1)
    from_ordinal(470) -> (1, 4, 37)
    from_ordinal(471) -> (1, 5, 1)
    from_ordinal(506) -> (1, 5, 36)
    from_ordinal(507) -> (1, 6, 1)
    from_ordinal(542) -> (1, 6, 36)
    from_ordinal(543) -> (1, 7, 1)
    from_ordinal(578) -> (1, 7, 36)
    from_ordinal(579) -> (1, 8, 1)
    from_ordinal(615) -> (1, 8, 37)
    from_ordinal(616) -> (1, 9, 1)
    from_ordinal(651) -> (1, 9, 36)
    from_ordinal(1956) -> (6, 1, 1)
    from_ordinal(1991) -> (6, 1, 36)
    from_ordinal(1992) -> (6, 2, 1)
    from_ordinal(2027) -> (6, 2, 36)
    from_ordinal(2028) -> (6, 3, 1)
    from_ordinal(2064) -> (6, 3, 37)
    from_ordinal(2065) -> (6, 4, 1)
    from_ordinal(2101) -> (6, 4, 37)
    from_ordinal(2102) -> (6, 5, 1)
    from_ordinal(2137) -> (6, 5, 36)
    from_ordinal(2138) -> (6, 6, 1)
    from_ordinal(2173) -> (6, 6, 36)
    from_ordinal(2174) -> (6, 7, 1)
    from_ordinal(2209) -> (6, 7, 36)
    from_ordinal(2210) -> (6, 8, 1)
    from_ordinal(2246) -> (6, 8, 37)
    from_ordinal(2247) -> (6, 9, 1)
    from_ordinal(2282) -> (6, 9, 36)
    from_ordinal(1245208) -> (3817, 9, 20)
    from_ordinal(1113319) -> (3413, 6, 4)
    from_ordinal(1343352) -> (4118, 8, 31)
    from_ordinal(326995) -> (1002, 6, 16)
    from_ordinal(1486431) -> (4557, 6, 4)
    from_ordinal(884061) -> (2710, 6, 26)
    from_ordinal(1087112) -> (3333, 2, 33)
    from_ordinal(1144235) -> (3508, 4, 9)
    from_ordinal(46140) -> (141, 5, 9)
    from_ordinal(1452984) -> (4455, 1, 5)
    from_ordinal(869986) -> (2667, 5, 11)
    from_ordinal(1442244) -> (4422, 1, 29)
    from_ordinal(378226) -> (1159, 7, 7)
    from_ordinal(1140001) -> (3495, 4, 14)
    from_ordinal(401334) -> (1230, 5, 30)

    weekday(0) -> 'Gamday'
    weekday(1) -> 'Huxday'
    weekday(2) -> 'Iriday'
    weekday(3) -> 'Jolday'
    weekday(4) -> 'Korday'
    weekday(5) -> 'Briday'
    weekday(6) -> 'Fenday'
    weekday(7) -> 'Gamday'
    weekday(8) -> 'Huxday'
    weekday(9) -> 'Iriday'
    weekday(10) -> 'Jolday'
    weekday(11) -> 'Korday'
    weekday(12) -> 'Briday'
    weekday(13) -> 'Fenday'
    weekday(326) -> 'Korday'
    weekday(100000) -> 'Briday'
    weekday(1234567) -> 'Briday'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
