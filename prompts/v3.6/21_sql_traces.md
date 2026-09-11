# sql_traces

Write a Python function:

    def build_query() -> str

It must return a single SQL SELECT statement as a string. The grader executes
it with sqlite3 against databases using this schema (names GENERATED for this
benchmark):

- zelgam(id INTEGER PRIMARY KEY, iri TEXT, wex TEXT, pev INTEGER)
- sovjol(id INTEGER PRIMARY KEY, rif_id INTEGER references zelgam.id, jol INTEGER, ony TEXT)

The report logic is HIDDEN. Below are 4 complete example
databases and the EXACT rows your query must return on each. Infer the hidden
report (which join, which filter, which grouping/aggregates, which HAVING
threshold, which ordering incl. tie-breaks) and write ONE SQL SELECT
(SQLite dialect) that computes it on ANY database with this schema:

  DATABASE 1 - full contents:
    zelgam: [(1, 'iri1', 'nyx', 3), (2, 'iri2', 'bri', 56), (3, 'iri3', 'jol', 27), (4, 'iri4', 'bri', 41), (5, 'iri5', 'jol', 95)]
    sovjol: [(1, 2, 38, 'mur'), (2, 2, 30, 'bri'), (3, 2, 30, 'bri'), (4, 5, 20, 'bri'), (5, 5, 47, 'mur'), (6, 3, 2, 'mur'), (7, 3, 55, 'mur'), (8, 3, 48, 'mur'), (9, 4, 10, 'bri'), (10, 4, 35, 'mur'), (11, 3, 50, 'mur'), (12, 1, 3, 'bri'), (13, 3, 0, 'bri'), (14, 5, 18, 'gam'), (15, 4, 18, 'bri'), (16, 5, 37, 'gam'), (17, 4, 19, 'mur'), (18, 5, 12, 'bri'), (19, 3, 23, 'bri'), (20, 5, 26, 'mur'), (21, 5, 49, 'mur')]
  your query's EXACT result on database 1:
    [('bri', 3, 47), ('jol', 6, 75)]

  DATABASE 2 - full contents:
    zelgam: [(1, 'iri1', 'mur', 92), (2, 'iri2', 'bri', 2)]
    sovjol: [(1, 1, 29, 'mur'), (2, 2, 3, 'bri'), (3, 1, 33, 'bri'), (4, 1, 26, 'bri'), (5, 2, 10, 'bri'), (6, 1, 36, 'mur'), (7, 2, 47, 'bri'), (8, 1, 50, 'bri'), (9, 2, 51, 'bri')]
  your query's EXACT result on database 2:
    []

  DATABASE 3 - full contents:
    zelgam: [(1, 'iri1', 'bri', 67), (2, 'iri2', 'jol', 93)]
    sovjol: [(1, 1, 37, 'bri'), (2, 1, 13, 'bri'), (3, 1, 31, 'bri'), (4, 1, 22, 'mur'), (5, 1, 48, 'gam'), (6, 1, 47, 'bri'), (7, 2, 48, 'mur'), (8, 2, 16, 'mur'), (9, 2, 32, 'bri'), (10, 2, 17, 'gam'), (11, 2, 52, 'mur'), (12, 2, 18, 'gam'), (13, 2, 48, 'bri'), (14, 1, 44, 'bri'), (15, 2, 25, 'mur'), (16, 1, 4, 'mur'), (17, 2, 25, 'gam'), (18, 1, 23, 'mur'), (19, 2, 51, 'gam'), (20, 1, 12, 'bri'), (21, 2, 39, 'mur')]
  your query's EXACT result on database 3:
    [('jol', 3, 51), ('bri', 5, 74)]

  DATABASE 4 - full contents:
    zelgam: [(1, 'iri1', 'mur', 55), (2, 'iri2', 'bri', 64), (3, 'iri3', 'bri', 82), (4, 'iri4', 'jol', 27), (5, 'iri5', 'bri', 15)]
    sovjol: [(1, 4, 11, 'bri'), (2, 1, 6, 'bri'), (3, 2, 45, 'bri'), (4, 2, 13, 'gam'), (5, 3, 4, 'mur'), (6, 3, 42, 'mur'), (7, 4, 4, 'bri'), (8, 1, 24, 'bri'), (9, 4, 19, 'gam'), (10, 3, 25, 'bri'), (11, 4, 32, 'gam'), (12, 4, 59, 'bri'), (13, 1, 17, 'bri'), (14, 1, 11, 'bri'), (15, 3, 7, 'bri'), (16, 5, 31, 'mur'), (17, 2, 41, 'gam')]
  your query's EXACT result on database 4:
    [('bri', 3, 24), ('jol', 3, 34), ('mur', 3, 34)]

Your query's result rows (values and their order) must match the hidden
reference exactly on every database tested, including edge cases: empty
tables, groups that fail the threshold, and ordering ties.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
