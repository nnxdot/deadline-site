package main
const tag="patch-846579"
func Solve(d map[string]any) any {
 state:=map[string]any{};for k,v:=range d["initial"].(map[string]any){state[k]=v};version:=float64(1);if v,ok:=d["version"];ok{version=v.(float64)}
 var run func([]any)(bool,any)
 run=func(c []any)(bool,any){
  op:=c[0].(string)
  if op=="set" {k:=c[1].(string);state[k]=c[2];return true,[]any{"set",k,c[2]}}
  if op=="add" {k:=c[1].(string);old:=float64(0);if v,ok:=state[k];ok{old=v.(float64)};state[k]=old+c[2].(float64);return true,[]any{"add",k,state[k]}}
  if op=="del" {k:=c[1].(string);delete(state,k);return true,[]any{"del",k}}
  if op=="get" {k:=c[1].(string);v,present:=state[k];if !present{v=float64(0)};return true,[]any{"get",k,v,present}}
  if version==1{return true,[]any{"ignored",op}}
  return true,[]any{"ignored",op}
 }
 trace:=[]any{};for _,c:=range d["commands"].([]any){_,row:=run(c.([]any));trace=append(trace,row)}
 return map[string]any{"generation":tag,"values":state,"trace":trace}
}
