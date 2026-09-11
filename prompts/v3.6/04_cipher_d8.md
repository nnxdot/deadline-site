# cipher_d8

Write a Python function:

    def transform(s: str) -> str

This rule was built by a MACHINE: a composition of EXACTLY 8 elementary
string operations applied in sequence. Each is simple on its own (rotations,
reversals, block operations, alphabet or digit shifts, position-based
drops, and length-conditional operations that only fire on some inputs). Parameters differ per operation, and every stage genuinely
changes its input on most strings - there are no dead stages to skip.

Infer the composition from the examples and implement it EXACTLY. If you
cannot fully crack it, implement your best partial theory - the hidden tests
award partial credit per group. Hidden inputs use the same alphabet
(lowercase letters, digits, spaces).

    transform('') -> ''
    transform('a') -> 'w'
    transform('b') -> 'x'
    transform('z') -> 'v'
    transform('q') -> 'm'
    transform('ab') -> 'xw'
    transform('ba') -> 'wx'
    transform('abc') -> 'yxw'
    transform('abcd') -> 'yzwx'
    transform('abcde') -> 'azyxw'
    transform('abcdef') -> 'wxyzab'
    transform('hello') -> 'khhad'
    transform('world') -> 'zhnks'
    transform('12345') -> '54321'
    transform('a1b2c3') -> 'w1x2y3'
    transform('the quick fox') -> 'tkbadpqm gye '
    transform('deadline') -> 'wzhazaej'
    transform('midnight') -> 'zjepiecd'
    transform('aaa bbb') -> 'xxxwww '
    transform('0a0b0c') -> '0w0x0y'
    transform('zzz') -> 'vvv'
    transform('abcdefgh') -> 'yzadwxbc'
    transform('tempo') -> 'kliap'
    transform('mix 9') -> '9 tei'
    transform('sn') -> 'jo'
    transform('yko9uvt') -> 'prqkgu9'
    transform('8u w8u0am') -> 'iw0 q8q8s'
    transform('1b6') -> '6x1'
    transform('py b0vuv75jp') -> 'qr7x0rlu 5fl'
    transform('nhw') -> 'sdj'
    transform('tu') -> 'qp'
    transform('5baqonyzcp') -> 'kjuxwmyl5v'
    transform('k') -> 'g'
    transform(' cpvoty4uwxm') -> 'u4qrkp ylsti'
    transform('t0vr2g9fk') -> 'gb9r0pc2n'
    transform(' xszsityhvd') -> 'zrdot eovup'
    transform('63m1vcqmw') -> 'simi36yr1'
    transform(' 1e4opos3ivxc6e') -> 'a6ya1 lk43oktre'
    transform('dm9qr9roan5') -> '5jw9iz9nmkn'
    transform('a2') -> '2w'
    transform('icaw jdm0') -> '0izwyef s'
    transform('8u0') -> '0q8'
    transform('efmo04a9nh4') -> '4djiba40k9w'
    transform('tg6p t') -> 'pc6l p'
    transform('frq8brqzmyy') -> 'uuimnbnx8vm'
    transform('z117it6u  x0f3q') -> 'm3b11vpe7 q60t '
    transform(' mplb74qnqo9t') -> 'p9kli 7xhjm4m'
    transform('  2') -> '2  '
    transform('mqq1czu6fc') -> 'yvqmm1byi6'
    transform('ke ds') -> 'oz ag'
    transform('f9a') -> 'w9b'
    transform('y47nvv7mtji') -> 'efp74urrji7'
    transform(' yfxmv2qx ') -> 'ir2ubtt  m'
    transform('g a7ti') -> 'c w7pe'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
