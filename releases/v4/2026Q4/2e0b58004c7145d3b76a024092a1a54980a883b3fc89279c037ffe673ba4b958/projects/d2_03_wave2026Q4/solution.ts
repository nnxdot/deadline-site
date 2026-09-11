const TAG = "snapshot-444065";
export function solve(d: any): any {
 const index = new Map<string, any[]>();
 for (const e of d.events) { if (!index.has(e[1])) index.set(e[1], []); index.get(e[1])!.push(e); }
 for (const h of index.values()) h.sort((a,b)=>a[0]-b[0]);
 return {generation:TAG,pages:d.pages.map((page:any[])=>page.map((q:any[])=>{
  const [id,key,snapshot,now]=q, h=index.get(key)||[];
  let lo=0,hi=h.length;
  while(lo<hi) { const m=(lo+hi)>>>1; if(h[m][0]<=snapshot) lo=m+1; else hi=m; }
  const e=lo ? h[lo-1] : null;
  let state='absent', value=null, seq=null;
  if(e) { seq=e[0]; if(false) state='deleted';
   else if(e[3]!==null && now>e[3]) state='expired';
   else {state='live';value=e[2];} }
  return [id,key,state,value,seq];
 }))};
}
