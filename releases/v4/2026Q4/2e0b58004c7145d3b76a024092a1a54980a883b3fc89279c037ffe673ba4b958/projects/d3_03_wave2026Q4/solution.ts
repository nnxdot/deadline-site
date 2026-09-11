const TAG="patch-322650";
export function solve(d:any):any {
 let state=new Map<string,number>(Object.entries(d.initial) as [string,number][]);const version=d.version??1;
 function run(c:any[]):[boolean,any] {
  const op=c[0],key=c[1];
  if(op==='set'){state.set(key,c[2]);return [true,['set',key,c[2]]];}
  if(op==='add'){state.set(key,(state.get(key)??0)+c[2]);return [true,['add',key,state.get(key)]];}
  if(op==='del'){state.delete(key);return [true,['del',key]];}
  if(op==='get')return [true,['get',key,state.get(key)??0,state.has(key)]];
  if(version===1)return [true,['ignored',op]];
  return [true,['ignored',op]];
 }
 const trace=d.commands.map((c:any[])=>run(c)[1]);return {generation:TAG,values:Object.fromEntries(state),trace};
}
