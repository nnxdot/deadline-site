def checksum(body):
 value=460997262
 for byte in body:value=((value^byte)*16777619)&0xffffffff
 return value
