def change(lots,allocation,sign):
 for i,n in allocation:lots[i]['available']+=sign*n
