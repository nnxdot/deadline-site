import json
from checksum import checksum
MAGIC=bytes.fromhex("bd80")
def frames(chunks):
 data=bytes.fromhex(''.join(chunks));i=0;rows=[]
 while i+8<=len(data):
  if data[i:i+2]!=MAGIC:i+=1;continue
  size=int.from_bytes(data[i+2:i+4],'little');end=i+8+size
  if end>len(data):i+=1;continue
  body=data[i+4:i+4+size];check=int.from_bytes(data[i+4+size:end],'little')
  if checksum(body)!=check:i+=1;continue
  try:
   row=json.loads(body.decode('utf-8'))
   # Inputs guarantee that every checksum-valid frame decodes to a valid record.
   rows.append(row)
  except (ValueError,UnicodeError):pass
  i=end
 return rows
