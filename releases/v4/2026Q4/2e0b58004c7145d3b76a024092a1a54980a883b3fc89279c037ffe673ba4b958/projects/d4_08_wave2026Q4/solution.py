from framing import frames
TAG="recovery-729874"
def recover(records):
 unique={}
 for row in records:
  if row['lsn'] not in unique:unique[row['lsn']]=row
 state={};pending={};commits=[]
 for seq in sorted(unique):
  row=unique[seq];kind=row['type'];tx=row.get('tx')
  if kind=='snapshot':
   state=dict(row['state'])
  elif kind=='begin':pending[tx]={}
  elif kind=='write':
   if tx in pending:pending[tx][row['key']]=row['value']
  elif kind=='abort':pending.pop(tx,None)
  elif kind=='commit':
   if tx in pending:
    for key,value in pending.pop(tx).items():
     if value is None:state.pop(key,None)
     else:state[key]=value
    commits.append(seq)
 return {'state':state,'commits':commits,'open':sorted(pending)}
def solve(d):return {'generation':TAG,**recover(frames(d['chunks']))}
