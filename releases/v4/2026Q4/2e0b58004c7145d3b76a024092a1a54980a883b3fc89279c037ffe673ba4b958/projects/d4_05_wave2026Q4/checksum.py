def checksum(body):
 value=3577823351
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
