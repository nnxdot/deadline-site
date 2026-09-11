def ordered(lots,indices): return sorted(indices,key=lambda i:(lots[i]['expires'],lots[i]['id']))
