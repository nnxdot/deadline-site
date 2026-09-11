# sql_report_xl_b

Write a Python function `build_query()` returning one SQLite SELECT query (WITH
and window functions allowed). This report is fully specified; no rules or
thresholds are hidden. The query runs independently on each database, read-only.

Schema (all columns NOT NULL; id columns are PRIMARY KEY):

    regions(id INTEGER, name TEXT)
    accounts(id INTEGER, region_id INTEGER, active INTEGER)
    events(id INTEGER, account_id INTEGER, day INTEGER, kind TEXT, amount INTEGER)

References always exist. active is 0 or 1. Event amounts are nonnegative integer
cents; kind is sale, refund or other. Names use ASCII and need not be unique.
There are 0..12 regions, up to 60 accounts and 3000 events. Empty tables are valid.

1. Consider events in the half-open day window [100,200). A qualifying SALE has
   kind='sale' and amount>=28. Count rows, including repeated amounts.
2. For each ACTIVE account independently, sum its qualifying sales and subtract
   ALL of its refunds in the window, regardless of refund amount. Other events
   are ignored. A missing refund sum is zero. Never join sales to refunds before
   aggregation: they are separate sets, and neither may multiply the other.
3. An account qualifies iff it has at least TWO qualifying sale rows AND its net
   after refunds is at least 50. Inactive accounts never qualify.
4. For each region compute the number of qualifying accounts, their total count
   of qualifying sale rows, and the sum of their nets. Rank its qualifying
   accounts by net DESC then account id ASC; take exactly the first TWO (or fewer
   if fewer qualify). Compute their net sum and the first account's id.
5. Dense-rank only regions that have qualifying accounts by total net DESC, with
   ties sharing a rank and no gaps. This rank ignores region name and id.
6. Return EVERY region, including empty ones, as columns in this exact order:
   region id, region name, qualifying account count, qualifying sale row count,
   total net, top-two net sum, best account id, dense rank.
   A region with no qualifying accounts has all numeric measures/rank zero and
   best account id NULL. Sort by total net DESC, name using SQLite BINARY ASC,
   region id ASC. Never merge regions that happen to share a name.

Example: regions (1,'a'),(2,'b'),(3,'empty'); active accounts 10 and 11 in region
1 and 20 in region 2. Account 10 has in-window sale amounts 28,28 and refund 6;
11 has sales 30,30; 20 has sales 28,28 and refund 6. With no other rows:

    [(1,'a',2,4,110,110,11,1), (2,'b',1,2,50,50,20,2),
     (3,'empty',0,0,0,0,None,0)]

Replacing account 11's two sales by one sale of 60 excludes account 11 and
makes the two nonempty regions tie at dense rank 1. A sale at day 200 is ignored;
a sale at day 100 counts. An amount of 27 does not meet the sale threshold.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
