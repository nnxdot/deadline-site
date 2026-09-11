def checksum(body):
 value=2754701138
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
