# codec_traces_xl

Reverse-engineer a binary record format from example encodings, then write:

    def encode(records: list) -> bytes
    def decode(data: bytes) -> list

Records are dicts with the fields ['hux_iri', 'bri_dol', 'hux_vex', 'ony_jol', 'jol_tul']. What you are told about
the wire shape: a message is 4 magic bytes, then the record count as a
2-byte big-endian unsigned int, then each record's fields IN SOME FIXED
ORDER (each field is one of: an unsigned int of width 1, 2, or 4 bytes
big-endian; a string as one length byte + UTF-8 bytes; or a fixed-width
ASCII string right-padded with some character), and finally ONE checksum
byte of the form (sum of every previous byte * A + B) mod 256.

The magic, the field order, each field's kind and parameters, the padding
character, and A and B are hidden - infer ALL of it from these exact
example encodings:

    encode([]) -> b'huxo\x00\x00v'
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\x01,\x02ok\x00\x01\x11p\x00\x01\x11pab____\xaa'
    encode([{'hux_iri': 42802, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\xa72\x02ok\x00\x01\x11p\x00\x01\x11pab____Z'
    encode([{'hux_iri': 18785, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01Ia\x02ok\x00\x01\x11p\x00\x01\x11pab____\x9e'
    encode([{'hux_iri': 300, 'bri_dol': 'xzyz', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\x01,\x04xzyz\x00\x01\x11p\x00\x01\x11pab____\xde'
    encode([{'hux_iri': 300, 'bri_dol': 'babéé', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\x01,\x07bab\xc3\xa9\xc3\xa9\x00\x01\x11p\x00\x01\x11pab____J'
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 1962887549, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\x01,\x02okt\xffI}\x00\x01\x11pab____\x86'
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 130905930, 'ony_jol': 70000, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\x01,\x02ok\x07\xcdwJ\x00\x01\x11pab____\xf6'
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 3294576408, 'jol_tul': 'ab'}]) -> b'huxo\x00\x01\x01,\x02ok\x00\x01\x11p\xc4_?\x18ab____\x8a'
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 2352728103, 'jol_tul': 'ab'}]) -> b"huxo\x00\x01\x01,\x02ok\x00\x01\x11p\x8c;\xc8'ab____z"
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': ''}]) -> b'huxo\x00\x01\x01,\x02ok\x00\x01\x11p\x00\x01\x11p______\x96'
    encode([{'hux_iri': 300, 'bri_dol': 'ok', 'hux_vex': 70000, 'ony_jol': 70000, 'jol_tul': 'xadb'}]) -> b'huxo\x00\x01\x01,\x02ok\x00\x01\x11p\x00\x01\x11pxadb__"'
    encode([{'hux_iri': 0, 'bri_dol': '', 'hux_vex': 0, 'ony_jol': 0, 'jol_tul': ''}]) -> b'huxo\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00______b'
    encode([{'hux_iri': 65528, 'bri_dol': 'xa', 'hux_vex': 1044980468, 'ony_jol': 2956938076, 'jol_tul': ''}, {'hux_iri': 34056, 'bri_dol': 'zz a', 'hux_vex': 3667168323, 'ony_jol': 1503380372, 'jol_tul': 'czz90'}]) -> b'huxo\x00\x02\xff\xf8\x02xa>I"\xf4\xb0?K\\______\x85\x08\x04zz a\xda\x94\x8cCY\x9b\xc3\x94czz90_.'
    encode([{'hux_iri': 62579, 'bri_dol': '', 'hux_vex': 1193714993, 'ony_jol': 4286480207, 'jol_tul': '999c'}, {'hux_iri': 3803, 'bri_dol': '', 'hux_vex': 2670944677, 'ony_jol': 2998388930, 'jol_tul': 'xyxbz'}, {'hux_iri': 31479, 'bri_dol': 'zzy', 'hux_vex': 2403378174, 'ony_jol': 3318309539, 'jol_tul': 'cycyz'}]) -> b'huxo\x00\x03\xf4s\x00G&\xa51\xff~\x7fO999c__\x0e\xdb\x00\x9f3a\xa5\xb2\xb7\xc8\xc2xyxbz_z\xf7\x03zzy\x8f@\xa3\xfe\xc5\xc9b\xa3cycyz_\xba'

decode(encode(x)) must round-trip exactly (padded strings come back without
padding). decode may assume well-formed input.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
