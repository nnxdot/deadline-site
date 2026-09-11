def checksum(body):
 value=2082670733
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
