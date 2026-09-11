def catalog(rows):
 return [dict(id=r[0],sku=r[1],available=r[2],expires=r[3],price=r[4]) for r in rows]
