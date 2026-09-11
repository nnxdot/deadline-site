def checksum(body):
 value=3459265675
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
