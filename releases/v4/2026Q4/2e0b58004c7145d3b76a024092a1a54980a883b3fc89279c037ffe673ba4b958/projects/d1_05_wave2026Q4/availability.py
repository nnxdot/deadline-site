def eligible(lot,sku,now): return lot['sku']==sku and lot['expires']>now and lot['available']>0
def inclusive(lot,sku,now): return lot['sku']==sku and lot['expires']>=now and lot['available']>0
