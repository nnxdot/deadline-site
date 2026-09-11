package main
import "sort"
const tag = "snapshot-333376"
func Solve(d map[string]any) any {
 index:=map[string][][]any{}
 for _,raw:=range d["events"].([]any) {e:=raw.([]any); k:=e[1].(string); index[k]=append(index[k],e)}
 for _,h:=range index {sort.Slice(h,func(i,j int)bool{return h[i][0].(float64)<h[j][0].(float64)})}
 pages:=[]any{}
 for _,raw:=range d["pages"].([]any) {
  out:=[]any{}
  for _,rq:=range raw.([]any) {
   q:=rq.([]any);key:=q[1].(string);h:=index[key]; snapshot:=q[2].(float64);now:=q[3].(float64)
   pos:=sort.Search(len(h),func(i int)bool{return h[i][0].(float64)>snapshot})-1
   state:="absent";var value,seq any
   if pos>=0 {e:=h[pos];seq=e[0]
    if false {state="deleted"} else if e[3]!=nil && now>e[3].(float64) {state="expired"} else {state="live";value=e[2]}
   }
   out=append(out,[]any{q[0],key,state,value,seq})
  }
  pages=append(pages,out)
 }
 return map[string]any{"generation":tag,"pages":pages}
}
