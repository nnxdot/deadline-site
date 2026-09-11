# cipher_d6

Write a Python function:

    def transform(s: str) -> str

This rule was built by a MACHINE: a composition of EXACTLY 6 elementary
string operations applied in sequence. Each is simple on its own (rotations,
reversals, block operations, alphabet or digit shifts, position-based
drops, and length-conditional operations that only fire on some inputs). Parameters differ per operation, and every stage genuinely
changes its input on most strings - there are no dead stages to skip.

Infer the composition from the examples and implement it EXACTLY. If you
cannot fully crack it, implement your best partial theory - the hidden tests
award partial credit per group. Hidden inputs use the same alphabet
(lowercase letters, digits, spaces).

    transform('') -> ''
    transform('a') -> 'y'
    transform('b') -> 'z'
    transform('z') -> 'x'
    transform('q') -> 'o'
    transform('ab') -> 'zy'
    transform('ba') -> 'yz'
    transform('abc') -> 'zay'
    transform('abcd') -> 'bazy'
    transform('abcde') -> 'abcy'
    transform('abcdef') -> 'bazyc'
    transform('hello') -> 'jjmf'
    transform('world') -> 'pjbu'
    transform('12345') -> '3451'
    transform('a1b2c3') -> '2z1ya'
    transform('the quick fox') -> 'dmvsaifcor '
    transform('deadline') -> 'bycblgj'
    transform('midnight') -> 'lbgkfeg'
    transform('aaa bbb') -> 'zzzyy '
    transform('0a0b0c') -> 'z0y00'
    transform('zzz') -> 'xxx'
    transform('abcdefgh') -> 'bazyedc'
    transform('tempo') -> 'knmr'
    transform('mix 9') -> 'v 9k'
    transform(' nabahfd5sn6qqf') -> 'oodbqlzyd ly'
    transform('rbyryyvy') -> 'pwzptww'
    transform('kv40nz2') -> 'lx2i40'
    transform('ibp 4z') -> ' nzg4'
    transform('0emdipsl') -> 'bkc0qng'
    transform('ff') -> 'dd'
    transform('n8vy0yjoia') -> 'wt8lhw0y'
    transform('fszm') -> 'kxqd'
    transform('i up0htt') -> 'ns grf0'
    transform('3') -> '3'
    transform('zwobctas1n ') -> '1l zryxuq'
    transform('') -> ''
    transform('pifzs') -> 'dxqn'
    transform('ytc3m9918oh') -> '8mf399wr1'
    transform('21ezohy') -> 'mfw2cx'
    transform('5jpls21lnou7kk') -> 'jnh512q7mlii'
    transform('g3iqhmn vfm6sx') -> 'og3elkf6dtvq'
    transform('0kdkgcz') -> 'eax0bi'
    transform('vdduoh z5z') -> 'sbbt fmx'
    transform('') -> ''
    transform('') -> ''
    transform(' xijq72bc   ai4') -> 'yg4z  ho2 vg'
    transform('sd o') -> 'm bq'
    transform('1xlwn') -> 'jul1'
    transform('vwr') -> 'upt'
    transform('h694') -> '496f'
    transform('736i') -> 'g637'
    transform('bch') -> 'afz'
    transform('4bp') -> 'zn4'
    transform('25') -> '52'

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
