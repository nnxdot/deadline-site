def checksum(body):
 value=2697983606
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
