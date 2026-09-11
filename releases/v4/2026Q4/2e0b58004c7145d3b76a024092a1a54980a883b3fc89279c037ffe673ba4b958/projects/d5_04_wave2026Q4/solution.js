const TAG="window-230608";
exports.solve=d=>{const active=new Map(),out=[];for(const op of d.ops){
 if(op[0]==='put')active.set(op[1],op.slice(2));else if(op[0]==='drop')active.delete(op[1]);
 else{const [_,key,now,width]=op;let sum=0,count=0;for(const [t,k,v]of active.values())if((key==='*'||k===key)&&now-width<=t&&t<now){sum+=v;count++;}out.push([sum,count]);}
}return {generation:TAG,windows:out};};