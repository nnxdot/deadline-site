# clause_engine

Implement `bill(account)` in Python. All money is integer cents; all arithmetic
must be exact. Apply the following 28 clauses in order. Intermediate amounts are
not rounded except where explicitly instructed. Return a dictionary with exactly
`net`, `tax`, `due`, `credit_left` integer values. Do not change the input.

Every input contains exactly the keys shown in the examples. plan is starter,
team or enterprise; region is local, remote or export; coupon is none, ten or
launch. annual, trial, support, locked, nonprofit, delinquent and tax_exempt are
booleans. All other fields are nonnegative integers: 0<=active<=seats<=120,
days<=30, peak_units<=units<=30000, carry_units<=6000, export_gb<=100,
incidents<=80, credit<=100000. Inputs obey this schema. No fields are omitted.

1. Start with base fee: starter=900, team=2400, enterprise=6100.
2. Included active seats: starter=2, team=8, enterprise=20.
3. Additional active seats cost 175 each (allocated but inactive seats cost nothing).
4. If at least 20 additional active seats are billable, their TOTAL seat charge is reduced by 15%, rounded DOWN.
5. Annual billing reduces the base fee only by 12%, rounded DOWN.
6. Trial waives base and seats, but waives no other component by itself.
7. Prorate (base + seats) together by days/30, rounded UP. days=0..30.
8. Monthly included units: starter=1000, team=5000, enterprise=20000; this allowance is NEVER prorated.
9. Add min(carry_units, 2000) to the included unit allowance.
10. Excess units cost 2 each; usage is max(0, units - adjusted allowance) * 2.
11. Peak surcharge is ceil(peak_units / 100) * 17, even when units are within the allowance.
12. First 10 export GB are free; further GB cost 23 each.
13. Optional support costs 350 plus 5 per active seat (including the plan's included seats).
14. For locked accounts, usage, peak and exports are waived. Subscription and support still apply.
15. Nonprofit accounts get 20% off subscription + support together, rounded DOWN, but no other charges.
16. Subtotal is discounted fixed charges + usage + peak + exports. No component is multiplied by another component's discount.
17. Each incident grants 150 credit, capped at the prorated subscription from clause 7 (before nonprofit discount).
18. Locked accounts receive no incident credit, including against their subscription or support.
19. Subtract the incident credit and clamp at zero to get post_sla.
20. Coupons are disabled for delinquent accounts; otherwise the named coupon can apply once.
21. Coupon ten takes floor(post_sla * 10 / 100) off, capped at 600.
22. Coupon launch takes 500 off only if annual=true AND days=30 AND trial=false; it never makes the net negative.
23. Net is post_sla minus the coupon discount; it excludes tax, late fee and wallet credit.
24. Tax rate in basis points: local=825, remote=500, export=0. Tax applies to net only.
25. Tax-exempt accounts have rate zero. Nonprofit status alone does NOT imply tax exemption.
26. Tax is net * rate / 10000 rounded to the nearest cent with exact halves rounded UP.
27. Add a late fee of 125 iff delinquent=true AND (net + tax)>0. The fee is not taxed and coupons do not reduce it.
28. Apply wallet credit last against net + tax + late fee. Return due=max(0, gross-credit) and credit_left=max(0, credit-gross). Return net and tax too, unchanged by wallet credit.

Examples:

    bill({'plan': 'starter', 'seats': 2, 'active': 2, 'annual': False, 'trial': False, 'days': 30, 'units': 1000, 'carry_units': 0, 'peak_units': 0, 'export_gb': 0, 'support': False, 'locked': False, 'nonprofit': False, 'incidents': 0, 'delinquent': False, 'coupon': 'none', 'region': 'local', 'tax_exempt': False, 'credit': 0}) -> {'net': 900, 'tax': 74, 'due': 974, 'credit_left': 0}

    bill({'plan': 'starter', 'seats': 25, 'active': 22, 'annual': True, 'trial': False, 'days': 7, 'units': 1000, 'carry_units': 0, 'peak_units': 0, 'export_gb': 0, 'support': True, 'locked': False, 'nonprofit': True, 'incidents': 0, 'delinquent': False, 'coupon': 'none', 'region': 'local', 'tax_exempt': False, 'credit': 0}) -> {'net': 1071, 'tax': 88, 'due': 1159, 'credit_left': 0}

    bill({'plan': 'starter', 'seats': 2, 'active': 2, 'annual': False, 'trial': True, 'days': 30, 'units': 2000, 'carry_units': 0, 'peak_units': 0, 'export_gb': 0, 'support': False, 'locked': False, 'nonprofit': False, 'incidents': 2, 'delinquent': False, 'coupon': 'none', 'region': 'local', 'tax_exempt': False, 'credit': 0}) -> {'net': 2000, 'tax': 165, 'due': 2165, 'credit_left': 0}

    bill({'plan': 'starter', 'seats': 2, 'active': 2, 'annual': False, 'trial': False, 'days': 30, 'units': 1000, 'carry_units': 0, 'peak_units': 0, 'export_gb': 0, 'support': False, 'locked': False, 'nonprofit': False, 'incidents': 0, 'delinquent': True, 'coupon': 'ten', 'region': 'local', 'tax_exempt': False, 'credit': 100000}) -> {'net': 900, 'tax': 74, 'due': 0, 'credit_left': 98901}

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
