package main
import "sort"
const tag="pharmacy-24569"
const rate=7;const threshold=121;const fee=5
func Solve(d map[string]any)any{
 lots:=catalog(d["lots"].([]any));orders:=map[string]*Order{};cache:=map[string][]any{};out:=[]any{}
 for _,raw:=range d["events"].([]any){e:=raw.([]any);eid:=e[0].(string);now:=int(e[1].(float64));op:=e[2].(string);oid:=e[3].(string)
  if _,ok:=cache[eid];ok{out=append(out,recalled(cache,eid));continue}
  for _,order:=range orders{if order.Status=="held"&&after(order.Expires,now){change(lots,order.Allocation,1);order.Status="expired"}}
  amount:=0;status:=""
  if op=="reserve"{
   if _,ok:=orders[oid];ok{status="duplicate-order"}else{
    sku:=normalize(e[4].(string));qty:=int(e[5].(float64));ttl:=int(e[6].(float64));limit:=int(e[7].(float64));indices:=[]int{}
    for i,l:=range lots{if eligible(l,sku,now){indices=append(indices,i)}}
    allocation:=preview(lots,ordered(lots,indices),qty)
    if allocation==nil{status="unavailable"}else{
     subtotal:=0;expires:=now+ttl;for _,p:=range allocation{subtotal+=lots[p.Index].Price*p.Qty;expires=min(expires,lots[p.Index].Expires)}
     amount=truncated_tax(subtotal,rate)+shipping(subtotal,threshold,fee);change(lots,allocation,-1)
     if amount>limit{status="over-budget"}else{orders[oid]=&Order{"held",allocation,expires,amount};status="held"}
    }
   }
  }else if order,ok:=orders[oid];!ok{status="unknown-order"}else{
   status=order.Status;amount=order.Amount;if status=="held"{if op=="cancel"{change(lots,order.Allocation,1);order.Status="cancelled"}else if op=="commit"{order.Status="committed"};status=order.Status}
  }
  row:=receipt(eid,oid,status,amount);remember(cache,eid,row);out=append(out,row)
 }
 available:=[]any{};for _,l:=range lots{available=append(available,[]any{l.Id,l.Available})};keys:=[]string{};for k:=range orders{keys=append(keys,k)};sort.Strings(keys);summary:=[]any{};for _,k:=range keys{o:=orders[k];summary=append(summary,[]any{k,o.Status,o.Amount})}
 return map[string]any{"generation":tag,"receipts":out,"available":available,"orders":summary}
}
