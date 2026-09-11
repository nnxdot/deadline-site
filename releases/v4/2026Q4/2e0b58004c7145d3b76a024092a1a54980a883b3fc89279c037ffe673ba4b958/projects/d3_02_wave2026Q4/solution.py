TAG="patch-576266"
def solve(d):
 s=dict(d['initial']);out=[]
 for c in d['commands']:
  o=c[0]
  if o=='set':s[c[1]]=c[2];out.append(['set',c[1],c[2]])
  elif o=='add':s[c[1]]=s.get(c[1],0)+c[2];out.append(['add',c[1],s[c[1]]])
  elif o=='del':s.pop(c[1],None);out.append(['del',c[1]])
  elif o=='get':out.append(['get',c[1],s.get(c[1],0),c[1] in s])
  else:out.append(['ignored',o])
 return {'generation':TAG,'values':s,'trace':out}
