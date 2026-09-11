# strange_calendar

A calendar GENERATED for this benchmark. Do not reach for datetime.

Rules of the calendar:
- Years are numbered 0, 1, 2, ... Each year has 7 months, numbered 1..7.
- A month normally has 26 days, but every month whose number is a
  multiple of 3 (months [3, 6]) has 27 days.
- A year is leap when divisible by 3 but not by 27. In a leap year, month 7 gains ONE extra
  day (on top of any bonus it already gets).
- Day numbers within a month start at 1. Absolute day 0 is year 0, month 1,
  day 1.
- Weeks have 6 days named, in cycle order: ['Briday', 'Dolday', 'Fenday', 'Gamday', 'Huxday', 'Korday'].
  Absolute day 0 is a "Gamday".

Write THREE functions:

    def to_ordinal(y: int, m: int, d: int) -> int
        Absolute day number. Invalid dates (y < 0, month out of range, day out
        of range for that month/year) raise ValueError.

    def from_ordinal(n: int) -> tuple
        (y, m, d) for absolute day n. Negative n raises ValueError.

    def weekday(n: int) -> str
        Weekday name of absolute day n. Negative n raises ValueError.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
