# sql_traces_xl

Write a Python function:

    def build_query() -> str

It must return a single SQL SELECT statement as a string. The grader executes
it with sqlite3 against databases using this schema (names GENERATED for this
benchmark):

- nyxbri(id INTEGER PRIMARY KEY, zel TEXT, tul TEXT, fen INTEGER)
- taskor(id INTEGER PRIMARY KEY, sov_id INTEGER references nyxbri.id, gam INTEGER, jol TEXT)
- tasqua(id INTEGER PRIMARY KEY, rif_id INTEGER references nyxbri.id, qua INTEGER)

The report logic is HIDDEN. Below are 4 complete example
databases and the EXACT rows your query must return on each. Infer the hidden
report (which join, which filter, which grouping/aggregates, which HAVING
threshold, which ordering incl. tie-breaks) and write ONE SQL SELECT
(SQLite dialect) that computes it on ANY database with this schema:

  DATABASE 1 - full contents:
    nyxbri: [(1, 'zel1', 'mur', 70), (2, 'zel2', 'fen', 68), (3, 'zel3', 'mur', 65), (4, 'zel4', 'mur', 43), (5, 'zel5', 'mur', 65)]
    taskor: [(1, 3, 28, 'fen'), (2, 1, 18, 'dol'), (3, 3, 11, 'dol')]
    tasqua: [(1, 1, 136), (2, 3, 0), (3, 3, 148), (4, 1, 185), (5, 2, 0), (6, 3, 170), (7, 3, 5), (8, 2, 30), (9, 3, 91), (10, 3, 85)]
  your query's EXACT result on database 1:
    []

  DATABASE 2 - full contents:
    nyxbri: [(1, 'zel1', 'gam', 96), (2, 'zel2', 'fen', 98), (3, 'zel3', 'gam', 59), (4, 'zel4', 'hux', 32), (5, 'zel5', 'hux', 80), (6, 'zel6', 'fen', 73)]
    taskor: [(1, 5, 57, 'dol')]
    tasqua: [(1, 2, 62), (2, 6, 105), (3, 5, 164), (4, 6, 126), (5, 3, 8), (6, 2, 138), (7, 5, 47)]
  your query's EXACT result on database 2:
    [('hux', 114, 164)]

  DATABASE 3 - full contents:
    nyxbri: [(1, 'zel1', 'mur', 82), (2, 'zel2', 'hux', 87), (3, 'zel3', 'mur', 69), (4, 'zel4', 'fen', 51), (5, 'zel5', 'hux', 56), (6, 'zel6', 'mur', 0)]
    taskor: [(1, 3, 32, 'bri'), (2, 3, 45, 'fen'), (3, 5, 23, 'fen'), (4, 2, 27, 'fen'), (5, 4, 51, 'bri'), (6, 2, 22, 'dol')]
    tasqua: [(1, 2, 92), (2, 2, 54), (3, 5, 94), (4, 3, 164), (5, 6, 180), (6, 2, 94), (7, 3, 101), (8, 1, 141)]
  your query's EXACT result on database 3:
    [('fen', 51, None), ('mur', 90, 164)]

  DATABASE 4 - full contents:
    nyxbri: [(1, 'zel1', 'gam', 91), (2, 'zel2', 'mur', 14), (3, 'zel3', 'gam', 21), (4, 'zel4', 'fen', 81), (5, 'zel5', 'gam', 77), (6, 'zel6', 'mur', 32), (7, 'zel7', 'hux', 40)]
    taskor: [(1, 2, 33, 'fen'), (2, 4, 13, 'dol'), (3, 1, 9, 'fen'), (4, 1, 14, 'fen'), (5, 4, 54, 'fen'), (6, 3, 4, 'dol'), (7, 6, 53, 'bri'), (8, 1, 28, 'fen'), (9, 7, 50, 'fen'), (10, 6, 24, 'dol'), (11, 1, 45, 'bri'), (12, 1, 19, 'fen'), (13, 7, 53, 'bri'), (14, 7, 6, 'dol'), (15, 7, 15, 'bri'), (16, 5, 20, 'bri'), (17, 1, 22, 'dol'), (18, 3, 22, 'bri'), (19, 1, 58, 'dol')]
    tasqua: [(1, 1, 72)]
  your query's EXACT result on database 4:
    [('mur', 53, None), ('fen', 54, None), ('gam', 103, 72), ('hux', 103, None)]

Your query's result rows (values and their order) must match the hidden
reference exactly on every database tested, including edge cases: empty
tables, groups that fail the threshold, and ordering ties.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
