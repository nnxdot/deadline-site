def checksum(body):
 value=1382955584
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
