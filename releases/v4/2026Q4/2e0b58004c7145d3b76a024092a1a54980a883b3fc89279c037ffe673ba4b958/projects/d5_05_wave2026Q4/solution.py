TAG="window-262709"
def solve(d):
    active={};out=[]
    for op in d['ops']:
        if op[0]=='put':active[op[1]]=op[2:]
        elif op[0]=='drop':active.pop(op[1],None)
        else:
            _,key,now,width=op;total=count=0
            for t,k,v in active.values():
                if (key=='*' or k==key) and now-width<=t<now:total+=v;count+=1
            out.append([total,count])
    return {'generation':TAG,'windows':out}
