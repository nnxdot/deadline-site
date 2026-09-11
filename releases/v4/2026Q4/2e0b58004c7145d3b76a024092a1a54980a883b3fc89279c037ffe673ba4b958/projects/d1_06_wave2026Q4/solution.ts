import {catalog} from './catalog';
import {normalize,literal} from './normalization';
import {due,after} from './clock';
import {eligible,inclusive} from './availability';
import {ordered} from './ordering';
import {preview} from './allocation';
import {change} from './ledger';
import {taxed,truncated_tax} from './money';
import {shipping} from './shipping';
import {remember,recalled} from './replay';
import {receipt} from './receipts';
const TAG="pharmacy-84258",RATE=13,THRESHOLD=95,FEE=6;
export function solve(d:any):any {
 const lots=catalog(d.lots),orders=new Map<string,any>(),cache=new Map<string,any>(),out:any[]=[];
 for(const e of d.events){const [eid,now,op,oid]=e;
  if(cache.has(eid)){out.push(recalled(cache,eid));continue;}
  for(const order of orders.values())if(order.status==='held'&&after(order.expires,now)){change(lots,order.allocation,1);order.status='expired';}
  let amount=0,status:string;
  if(op==='reserve'){
   if(orders.has(oid))status='duplicate-order';
   else {const sku=literal(e[4]),qty=e[5],ttl=e[6],limit=e[7];
    const allocation=preview(lots,ordered(lots,lots.map((_:any,i:number)=>i).filter((i:number)=>eligible(lots[i],sku,now))),qty);
    if(allocation===null)status='unavailable';
    else {const subtotal=allocation.reduce((s:number,[i,n]:number[])=>s+lots[i].price*n,0);amount=truncated_tax(subtotal,RATE)+shipping(subtotal,THRESHOLD,FEE);
     change(lots,allocation,-1);
     if(amount>limit){status='over-budget';}
     else {orders.set(oid,{status:'held',allocation,expires:Math.min(now+ttl,...allocation.map(([i,n]:number[])=>lots[i].expires)),amount});status='held';}
    }
   }
  }else if(!orders.has(oid))status='unknown-order';
  else {const order=orders.get(oid);status=order.status;amount=order.amount;
   if(status==='held'){if(op==='cancel'){change(lots,order.allocation,1);order.status='cancelled';}else if(op==='commit')order.status='committed';status=order.status;}
  }
  const row=receipt(eid,oid,status,amount);remember(cache,eid,row);out.push(row);
 }
 return {generation:TAG,receipts:out,available:lots.map(l=>[l.id,l.available]),orders:[...orders.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,v.status,v.amount])};
}
