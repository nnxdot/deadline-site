# cipher_d4

Write a Python function:

    def transform(s: str) -> str

This rule was built by a MACHINE: a composition of EXACTLY 4 elementary
string operations applied in sequence. Each is simple on its own (rotations,
reversals, block operations, alphabet or digit shifts, position-based
drops, and length-conditional operations that only fire on some inputs). Parameters differ per operation, and every stage genuinely
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
    transform('ab') -> 'lk'
    transform('ba') -> 'kl'
    transform('abc') -> 'mkl'
    transform('abcd') -> 'mkln'
    transform('abcde') -> 'mknlo'
    transform('abcdef') -> 'mkolpn'
    transform('hello') -> 'vrvoy'
    transform('world') -> 'bgvyn'
    transform('12345') -> '31425'
    transform('a1b2c3') -> 'lkm132'
    transform('the quick fox') -> 'odausphre my '
    transform('deadline') -> 'knvoosnx'
    transform('midnight') -> 'nwsdsqxr'
    transform('aaa bbb') -> 'kkllkl '
    transform('0a0b0c') -> '000kml'
    transform('zzz') -> 'jjj'
    transform('abcdefgh') -> 'mkorlpnq'
    transform('tempo') -> 'wdzoy'
    transform('mix 9') -> 'hw s9'
    transform('dk56rc3k7elh') -> '5nb73vum6uro'
    transform('xn 3ya') -> ' hixk3'
    transform('1fvf h6mi4z') -> 'f1 s64prpwj'
    transform('an0uztvcxvg') -> '0kjhffxdemq'
    transform('5prijirlau 012y') -> 'b5tkb i1zssv0e2'
    transform('') -> ''
    transform('n5g ') -> 'qx5 '
    transform('c fg46 fj7n') -> 'pm4t 7 6qpx'
    transform('dg3') -> '3nq'
    transform('8c5a') -> '58mk'
    transform('op0xa7x io74me') -> '0yksh7oz7h 4yw'
    transform('6d') -> 'n6'
    transform('qi3k') -> '3asu'
    transform('kd 52gsx  s97hm') -> ' u2 ccw7nq5h9 r'
    transform('') -> ''
    transform('4hwx9cxxsxu3do') -> 'g49cheyrmhh3hn'
    transform(' r p') -> '  bz'
    transform('37629fyht') -> '639di7p2r'
    transform('30hg1us5igcb') -> 'r31scm0eq5lq'
    transform('vix55ygmofd8i') -> 'hf5yqnssi5w8p'
    transform('859hl4kpb4gbr') -> '98vluqb54rzl4'
    transform('2einajxs6') -> 's2k6hotxc'
    transform('0fa9j5') -> 'k0tp59'
    transform('31 0oj4j6t5 y72') -> ' 3y6452i1t0t d7'
    transform('n') -> 'x'
    transform(' 2m') -> 'w 2'
    transform('cfcr 7cy fgro8p') -> 'mm  mqzyp7bibp8'
    transform('7') -> '7'
    transform('we64') -> '6go4'
    transform(' sm1umjp8few68') -> 'w e8to8cw1zgp6'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
