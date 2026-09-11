# pairs_traces

Write a Python function:

    def count_pairs(a: list) -> int

Count the pairs of indices (i, j) with i < j whose values satisfy a HIDDEN
predicate. The predicate is one simple arithmetic relation between the two
numbers (symmetric: match(x, y) == match(y, x)). Infer it from these exact
labeled examples:

    match(126, 439) -> False
    match(287, 239) -> True
    match(355, 1087) -> False
    match(1694, 1646) -> True
    match(952, 762) -> False
    match(1967, 417) -> False
    match(1533, 1018) -> False
    match(893, 941) -> True
    match(1020, 356) -> False
    match(494, 542) -> True
    match(461, 509) -> True
    match(616, 1188) -> False
    match(1324, 1125) -> False
    match(936, 888) -> True
    match(820, 259) -> False
    match(1644, 1692) -> True
    match(1632, 1191) -> False
    match(897, 945) -> True
    match(937, 1365) -> False
    match(1316, 1877) -> False
    match(1604, 623) -> False
    match(615, 1959) -> False
    match(1628, 1676) -> True
    match(575, 623) -> True
    match(521, 1717) -> False
    match(546, 594) -> True
    match(1274, 1322) -> True
    match(528, 480) -> True
    match(1444, 1492) -> True
    match(1632, 127) -> False
    match(1227, 1237) -> False
    match(116, 1261) -> False
    match(980, 480) -> False
    match(906, 1320) -> False
    match(1362, 597) -> False
    match(125, 77) -> True
    match(1943, 1969) -> False
    match(798, 750) -> True
    match(1753, 1705) -> True
    match(932, 980) -> True
    match(766, 718) -> True
    match(632, 1802) -> False
    match(1073, 1121) -> True
    match(1489, 1442) -> False
    match(1721, 1673) -> True
    match(1775, 1727) -> True
    match(1758, 1462) -> False
    match(759, 175) -> False
    match(805, 1717) -> False
    match(1667, 1150) -> False
    match(734, 782) -> True
    match(686, 734) -> True
    match(221, 770) -> False
    match(1965, 269) -> False
    match(1620, 1668) -> True
    match(798, 750) -> True
    match(149, 1089) -> False
    match(1955, 1907) -> True
    match(158, 1352) -> False
    match(1449, 1401) -> True
    match(447, 1630) -> False
    match(1239, 727) -> False
    match(1598, 1646) -> True
    match(196, 148) -> True
    match(1210, 116) -> False
    match(1122, 1074) -> True
    match(1692, 1740) -> True
    match(533, 485) -> True
    match(788, 740) -> True
    match(1579, 1531) -> True
    match(1132, 1084) -> True
    match(759, 502) -> False
    match(398, 446) -> True
    match(1100, 1148) -> True
    match(1825, 1873) -> True
    match(1201, 1153) -> True
    match(1145, 1193) -> True
    match(322, 274) -> True
    match(336, 288) -> True
    match(1796, 1748) -> True
    match(259, 211) -> True
    match(668, 1320) -> False
    match(56, 104) -> True
    match(1999, 1951) -> True
    match(618, 1484) -> False
    match(1565, 462) -> False
    match(206, 1647) -> False
    match(1364, 1316) -> True
    match(1341, 1855) -> False
    match(289, 172) -> False
    match(1656, 1495) -> False
    match(1229, 1032) -> False
    match(77, 1119) -> False
    match(361, 819) -> False
    match(1441, 1489) -> True
    match(594, 1540) -> False
    match(1605, 1653) -> True
    match(952, 1670) -> False
    match(1626, 550) -> False
    match(926, 974) -> True
    match(373, 325) -> True
    match(1101, 290) -> False
    match(1595, 1643) -> True
    match(164, 1977) -> False
    match(343, 55) -> False
    match(1480, 1466) -> False
    match(1036, 610) -> False
    match(97, 145) -> True
    match(921, 969) -> True
    match(1260, 1824) -> False
    match(818, 866) -> True
    match(972, 643) -> False
    match(1117, 1069) -> True
    match(1067, 1115) -> True
    match(842, 436) -> False
    match(469, 421) -> True
    match(1310, 1358) -> True
    match(1859, 199) -> False
    match(1300, 957) -> False
    match(569, 816) -> False

Constraints:
- Elements are non-negative ints; len(a) up to 200,000, and the hidden tests
  include a list that big.
- PERFORMANCE IS PART OF THE SPEC: checking every pair is quadratic and will
  time out for zero credit on that group. Handle 200,000 elements in a few
  seconds - which also means the predicate's structure matters, not just
  its truth table.

count_pairs([]) -> 0.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
