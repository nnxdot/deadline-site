# sql_report

Write a Python function:

    def build_query() -> str

It must return a single SQL SELECT statement as a string. The grader executes
it with sqlite3 against databases using this schema (names GENERATED for this
benchmark):

- jolqua(id INTEGER PRIMARY KEY, dol TEXT, wex TEXT, fen INTEGER)
- sovpev(id INTEGER PRIMARY KEY, zel_id INTEGER references jolqua.id, rif INTEGER, kor TEXT)

Write ONE SQL SELECT statement (SQLite dialect) producing this report:

For each wex value in jolqua: consider the sovpev rows joined to
that wex's jolqua rows (via sovpev.zel_id = jolqua.id)
whose rif is at least 28. Keep only wex groups with at least
2 such rows. Output one row per kept group: (wex, the count of those
rows, the sum of their rif), ordered by that sum descending, ties
broken by wex ascending.

Your query's result rows (values and their order) must match the hidden
reference exactly on every database tested, including edge cases: empty
tables, groups that fail the threshold, and ordering ties.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
