# codec_a

Implement a binary record format GENERATED for this benchmark. Write:

    def encode(records: list) -> bytes
    def decode(data: bytes) -> list

Records are dicts with these fields, laid out on the wire IN THIS ORDER:
- "tas_qua": string; wire = 1 length byte (UTF-8 byte count, max 255) then the UTF-8 bytes
- "mur_kor": unsigned int, 4 bytes big-endian (0..2**32-1)

Message layout: 4 magic bytes b'huxk', then the record count as a 2-byte
big-endian unsigned int (more than 65535 records: encode error), then each
record's fields in order.

encode raises ValueError on any invalid field value (bools are not ints).
decode is STRICT: wrong magic, truncated data, invalid text bytes, trailing
bytes all raise ValueError.
decode(encode(x)) must round-trip exactly (fixed-width strings come back
without their padding).

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
