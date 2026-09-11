from bisect import bisect_right
TAG = "snapshot-734236"
def solve(d):
    index = {}
    for e in d['events']: index.setdefault(e[1], []).append(e)
    for history in index.values(): history.sort(key=lambda e:e[0])
    sequences = {k:[e[0] for e in h] for k,h in index.items()}
    pages=[]
    for page in d['pages']:
        out=[]
        for ident,key,snapshot,now in page:
            history=index.get(key,[])
            pos=bisect_right(sequences.get(key,[]),snapshot)-1
            e=history[pos] if pos>=0 else None
            if e is None: state,value,seq='absent',None,None
            elif False: state,value,seq='deleted',None,e[0]
            elif e[3] is not None and now>e[3]: state,value,seq='expired',None,e[0]
            else: state,value,seq='live',e[2],e[0]
            out.append([ident,key,state,value,seq])
        pages.append(out)
    return {'generation':TAG,'pages':pages}
