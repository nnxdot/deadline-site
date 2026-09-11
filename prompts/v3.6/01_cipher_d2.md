# cipher_d2

Write a Python function:

    def transform(s: str) -> str

This rule was built by a MACHINE: a composition of EXACTLY 2 elementary
string operations applied in sequence. Each is simple on its own (rotations,
reversals, block operations, alphabet or digit shifts, position-based
drops). Parameters differ per operation, and every stage genuinely
changes its input on most strings - there are no dead stages to skip.

Infer the composition from the examples and implement it EXACTLY. If you
cannot fully crack it, implement your best partial theory - the hidden tests
award partial credit per group. Hidden inputs use the same alphabet
(lowercase letters, digits, spaces).

    transform('') -> ''
    transform('a') -> 'k'
    transform('b') -> 'l'
    transform('z') -> 'j'
    transform('q') -> 'a'
    transform('ab') -> 'kl'
    transform('ba') -> 'lk'
    transform('abc') -> 'kml'
    transform('abcd') -> 'kmln'
    transform('abcde') -> 'kmoln'
    transform('abcdef') -> 'kmolnp'
    transform('hello') -> 'rvyov'
    transform('world') -> 'gbnyv'
    transform('12345') -> '13524'
    transform('a1b2c3') -> 'klm123'
    transform('the quick fox') -> 'doasuphr em y'
    transform('deadline') -> 'nkvxonso'
    transform('midnight') -> 'wnsrsxqd'
    transform('aaa bbb') -> 'kkllk l'
    transform('0a0b0c') -> '000klm'
    transform('zzz') -> 'jjj'
    transform('abcdefgh') -> 'kmoqlnpr'
    transform('tempo') -> 'dwyoz'
    transform('mix 9') -> 'wh9s '
    transform('') -> ''
    transform('4h0') -> '40r'
    transform('w5') -> 'g5'
    transform('l6 ') -> 'v 6'
    transform('xj2eahc94r') -> 'h2km4tor9b'
    transform('jylpxqijw') -> 'tvhsgizat'
    transform('') -> ''
    transform('ta6') -> 'd6k'
    transform('knqmxj6') -> 'uah6xwt'
    transform('g8b') -> 'ql8'
    transform('1rt49 5sh8vf ') -> '1d95rf b4 c8p'
    transform('6e08l ehmz3437') -> '60vow33o8 rj47'
    transform('ut356s1') -> 'e361d5c'
    transform('d82y') -> 'n28i'
    transform('toaixs') -> 'dkhysc'
    transform('b9u') -> 'le9'
    transform(' be0ly55h') -> ' ov5rl0i5'
    transform('d2a2eg38h') -> 'nko3r22q8'
    transform(' xyty') -> ' iihd'
    transform('') -> ''
    transform('tmvuyx23pqs27h') -> 'dfi2zc7weh3a2r'
    transform('1myxm3') -> '1iwwh3'
    transform('egs') -> 'ocq'
    transform('tjauh04') -> 'dkr4te0'
    transform('hi0dubwp4inp74h') -> 'r0eg4x7rsnlzsz4'
    transform('') -> ''
    transform('yjrnxiesq') -> 'ibhoatxsc'
    transform('iq4up 4a') -> 's4z4ae k'
    transform('k1buvc29') -> 'ulf21em9'
    transform('p4nhxdta5') -> 'zxhd54rnk'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
