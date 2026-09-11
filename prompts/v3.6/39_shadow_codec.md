# shadow_codec

Implement `encode(records)` returning bytes and `decode(data)` returning a list
of records (dictionaries) in Python. Infer a single format in this EXACT finite
hypothesis space; the observations distinguish one member of it.

Every message has a constant five-byte magic, a two-byte unsigned big-endian
record count, the records in input order, then a one- OR two-byte unsigned
big-endian checksum. The magic may be any five bytes. The checksum is
`(A * sum(all preceding bytes) + B) % 2**(8*checksum_width)` with constant
integers A and B, each in 0..2**(8*checksum_width)-1.

Each record has exactly the six keys `dol_zim, iri_bri, jol_pev, qua_sov,
tul_hux, vex_ony`. A single unknown permutation gives their wire order.
Each key has a single unknown type from this list (types can repeat):

- unsigned integer: width 1, 2 or 4 bytes; either endianness for widths 2/4,
  big endian for width 1; integers in range, with bool explicitly rejected;
- Unicode string: UTF-8 bytes, preceded by their one-byte unsigned byte length;
- fixed ASCII string: width 1..8 bytes, padded on the RIGHT with one constant
  character chosen from underscore, period, hyphen, asterisk, space or digit 0.
  The unpadded value cannot contain that padding character anywhere.

There are no other fields, transforms, alignment, terminators or branches.
For encode, input is a list of at most 65,535 dictionaries with exactly those
keys. Invalid field types, unsigned overflow/negative values, an encoded string
longer than its limit, non-ASCII in a fixed field, or its padding character in a
fixed value must raise ValueError. Unicode strings have no surrogate codepoints.
decode receives only valid bytes produced by this format; malformed binary input
is outside its contract. Empty lists and empty strings are allowed. Fixed fields
are unpadded on decode. Tests use up to 300 records per call and the full field
ranges. Return ordinary Python integers and strings, preserving record order.

Observations are `records -> encode(records).hex()`. The inverse decode of each
right-hand byte string returns its left-hand records:

    [] -> '7a696d396b00005fcd'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c026162077a7a2dd6aa'
    [{'qua_sov': 0, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001000000006f6b2e2e2e012c026162077a7a2d6270'
    [{'qua_sov': 4294967295, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001ffffffff6f6b2e2e2e012c026162077a7a2dcafc'
    [{'qua_sov': 16909060, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001040302016f6b2e2e2e012c026162077a7a2d7f12'
    [{'qua_sov': 70000, 'jol_pev': '', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101002e2e2e2e2e012c026162077a7a2d6de4'
    [{'qua_sov': 70000, 'jol_pev': 'abcde', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006162636465012c026162077a7a2d64a9'
    [{'qua_sov': 70000, 'jol_pev': '9', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b000170110100392e2e2e2e012c026162077a7a2d8d63'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 0, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e0000026162077a7a2d55d1'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 65535, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2effff026162077a7a2d0a17'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 4626, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e1212026162077a7a2dbce5'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': '', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c00077a7a2da299'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'xyzzy9', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c0678797a7a7939077a7a2d1e22'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'béé', 'dol_zim': 7, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c0562c3a9c3a9077a7a2dedfc'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 0, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c026162007a7a2dc29f'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 255, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c026162ff7a7a2d9cc2'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 138, 'tul_hux': 'zz'}] -> '7a696d396b0001701101006f6b2e2e2e012c0261628a7a7a2d4dc1'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': ''}] -> '7a696d396b0001701101006f6b2e2e2e012c026162072d2d2d1db8'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'q7z'}] -> '7a696d396b0001701101006f6b2e2e2e012c0261620771377ad987'
    [{'qua_sov': 70000, 'jol_pev': 'ok', 'vex_ony': 300, 'iri_bri': 'ab', 'dol_zim': 7, 'tul_hux': 'c'}] -> '7a696d396b0001701101006f6b2e2e2e012c02616207632d2db856'
    [{'qua_sov': 0, 'jol_pev': '', 'vex_ony': 0, 'iri_bri': '', 'dol_zim': 0, 'tul_hux': ''}] -> '7a696d396b0001000000002e2e2e2e2e000000002d2d2d77c3'
    [{'qua_sov': 4294967295, 'jol_pev': 'zzzzz', 'vex_ony': 65535, 'iri_bri': 'xxxxxxxxx', 'dol_zim': 255, 'tul_hux': 'yyy'}] -> '7a696d396b0001ffffffff7a7a7a7a7affff09787878787878787878ff79797969b5'
    [{'qua_sov': 3141592653, 'jol_pev': 'ab', 'vex_ony': 4919, 'iri_bri': 'q', 'dol_zim': 17, 'tul_hux': ''}, {'qua_sov': 271828, 'jol_pev': 'zqx9', 'vex_ony': 60000, 'iri_bri': 'hello', 'dol_zim': 200, 'tul_hux': 'ab'}] -> '7a696d396b00024de640bb61622e2e2e13370171112d2d2dd42504007a7178392eea600568656c6c6fc861622dbc54'
    [{'qua_sov': 65536, 'jol_pev': 'a', 'vex_ony': 258, 'iri_bri': 'aa', 'dol_zim': 1, 'tul_hux': 'a'}, {'qua_sov': 1, 'jol_pev': 'bb', 'vex_ony': 2, 'iri_bri': '', 'dol_zim': 3, 'tul_hux': 'bb'}, {'qua_sov': 16777216, 'jol_pev': 'cc9', 'vex_ony': 513, 'iri_bri': 'éé', 'dol_zim': 9, 'tul_hux': 'c'}] -> '7a696d396b000300000100612e2e2e2e010202616101612d2d0100000062622e2e2e0002000362622d000000016363392e2e020104c3a9c3a909632d2db75b'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
