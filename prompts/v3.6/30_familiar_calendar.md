# familiar_calendar

Implement `to_ordinal(y, m, d)`, `from_ordinal(n)` and `weekday(n)` in Python.
This is NOT the Gregorian calendar. All three departures below are intentional:

1. The year starts in March. Months 1 through 12 are March, April, May, June,
   July, August, September, October, November, December, January, February.
   Their lengths are 31,30,31,30,31,31,30,31,30,31,31,28. The year number names
   the March at its start, including the following January and February.
2. February has 29 days precisely when the year is divisible by 4 AND is NOT
   divisible by 50. There is no Gregorian 400-year exception: year 400 is common.
3. Weeks contain SIX days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.
   Day zero is Monday; there is no Sunday.

`to_ordinal` returns the number of days since (1,1,1), which is zero.
`from_ordinal` returns the inverse date as a tuple `(year, month, day)`.
`weekday` returns the exact English weekday string for that ordinal.
All arguments are integers. Valid years are 1..1,000,000,000; valid ordinals
end on the last day of year 1,000,000,000. Negative ordinals, years below 1,
months outside 1..12, and days outside that year's month raise ValueError.
Values above the stated maximum input bounds are not tested. Do not use
Gregorian date arithmetic as an oracle for this calendar.

Examples (also demonstrate every departure):

    to_ordinal(1, 2, 1) -> 31
    from_ordinal(364) -> (1, 12, 28)
    to_ordinal(4, 12, 29) -> 1460
    to_ordinal(100, 12, 29) -> ValueError
    to_ordinal(400, 12, 29) -> ValueError
    weekday(5) -> 'Saturday'
    weekday(6) -> 'Monday'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
