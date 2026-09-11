import copy
def remember(cache,key,row):cache[key]=copy.deepcopy(row)
def recalled(cache,key):return copy.deepcopy(cache[key])
