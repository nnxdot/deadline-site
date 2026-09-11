def preview(lots,indices,qty):
 result=[]
 for i in indices:
  take=min(qty,lots[i]['available'])
  if take:result.append([i,take]);qty-=take
  if qty==0:return result
 return None
