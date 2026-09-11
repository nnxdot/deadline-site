# codec_traces

Reverse-engineer a binary record format from example encodings, then write:

    def encode(records: list) -> bytes
    def decode(data: bytes) -> list

Records are dicts with the fields ['tas_wex', 'ony_hux', 'vex_dol']. What you are told about
the wire shape: a message is 4 magic bytes, then the record count as a
2-byte big-endian unsigned int, then each record's fields IN SOME FIXED
ORDER (each field is one of: an unsigned int of width 1, 2, or 4 bytes
big-endian; a string as one length byte + UTF-8 bytes; or a fixed-width
ASCII string right-padded with some character), and finally ONE checksum
byte of the form (sum of every previous byte * A + B) mod 256.

The magic, the field order, each field's kind and parameters, the padding
character, and A and B are hidden - infer ALL of it from these exact
example encodings:

    encode([]) -> b'vexz\x00\x00\xfc'
    encode([{'tas_wex': 300, 'ony_hux': 7, 'vex_dol': 7}]) -> b'vexz\x00\x01\x01,\x07\x07\xb0'
    encode([{'tas_wex': 25137, 'ony_hux': 7, 'vex_dol': 7}]) -> b'vexz\x00\x01b1\x07\x07\xe2'
    encode([{'tas_wex': 2386, 'ony_hux': 7, 'vex_dol': 7}]) -> b'vexz\x00\x01\tR\x07\x07:'
    encode([{'tas_wex': 300, 'ony_hux': 34, 'vex_dol': 7}]) -> b'vexz\x00\x01\x01,"\x07\x01'
    encode([{'tas_wex': 300, 'ony_hux': 247, 'vex_dol': 7}]) -> b'vexz\x00\x01\x01,\xf7\x07\x80'
    encode([{'tas_wex': 300, 'ony_hux': 7, 'vex_dol': 140}]) -> b'vexz\x00\x01\x01,\x07\x8c?'
    encode([{'tas_wex': 300, 'ony_hux': 7, 'vex_dol': 67}]) -> b'vexz\x00\x01\x01,\x07Cd'
    encode([{'tas_wex': 0, 'ony_hux': 0, 'vex_dol': 0}]) -> b'vexz\x00\x01\x00\x00\x00\x00\xff'
    encode([{'tas_wex': 56036, 'ony_hux': 162, 'vex_dol': 30}, {'tas_wex': 26415, 'ony_hux': 195, 'vex_dol': 109}]) -> b'vexz\x00\x02\xda\xe4\xa2\x1eg/\xc3m\xce'
    encode([{'tas_wex': 48475, 'ony_hux': 216, 'vex_dol': 182}, {'tas_wex': 37324, 'ony_hux': 36, 'vex_dol': 102}, {'tas_wex': 47436, 'ony_hux': 186, 'vex_dol': 134}]) -> b'vexz\x00\x03\xbd[\xd8\xb6\x91\xcc$f\xb9L\xba\x86{'

decode(encode(x)) must round-trip exactly (padded strings come back without
padding). decode may assume well-formed input.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
