from catalog import catalog
from normalization import normalize,literal
from clock import due,after
from availability import eligible,inclusive
from ordering import ordered
from allocation import preview
from ledger import change
from money import taxed,truncated_tax
from shipping import shipping
from replay import remember,recalled
from receipts import receipt
TAG="pharmacy-75547"
RATE=7;THRESHOLD=93;FEE=9
def solve(d):
 lots=catalog(d['lots']);orders={};cache={};out=[]
 for e in d['events']:
  eid,now,op,oid=e[:4]
  if eid in cache:out.append(recalled(cache,eid));continue
  for order in orders.values():
   if order['status']=='held' and after(order['expires'],now):
    change(lots,order['allocation'],1);order['status']='expired'
  amount=0
  if op=='reserve':
   if oid in orders:status='duplicate-order'
   else:
    sku,qty,ttl,limit=e[4:];sku=literal(sku)
    indices=ordered(lots,[i for i,l in enumerate(lots) if eligible(l,sku,now)])
    allocation=preview(lots,indices,qty)
    if allocation is None:status='unavailable'
    else:
     subtotal=sum(lots[i]['price']*n for i,n in allocation)
     amount=truncated_tax(subtotal,RATE)+shipping(subtotal,THRESHOLD,FEE)
     change(lots,allocation,-1)
     if amount>limit:
      status='over-budget'
     else:
      orders[oid]={'status':'held','allocation':allocation,'expires':min([now+ttl]+[lots[i]['expires'] for i,n in allocation]),'amount':amount}
      status='held'
  elif oid not in orders:status='unknown-order'
  else:
   order=orders[oid];status=order['status'];amount=order['amount']
   if status=='held':
    if op=='cancel':change(lots,order['allocation'],1);order['status']='cancelled'
    elif op=='commit':order['status']='committed'
    status=order['status']
  row=receipt(eid,oid,status,amount);remember(cache,eid,row);out.append(row)
 return {'generation':TAG,'receipts':out,'available':[[l['id'],l['available']] for l in lots],
  'orders':[[k,v['status'],v['amount']] for k,v in sorted(orders.items())]}
