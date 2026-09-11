# cipher_d12

Implement `transform(s)` in Python. Infer a fixed 12-stage permutation
pipeline followed by a position-dependent alphabet substitution. Inputs contain
only lowercase ASCII letters, digits and spaces, with length 0..512.
Spaces participate in every permutation but are never substituted.

The exact finite hypothesis space is below: at each numbered stage choose ONE
of its four listed operations. Apply the stages in listed order to the current
string. Choices are constant across all calls. There are no other stages or
conditions. After all permutations, for each non-space character at zero-based
FINAL position i replace alphabet index x by (x+A+B*i) mod 36; spaces still count
as positions. A and B are constant integers 0..35. Exactly one member of this
space fits all the observations. Implement the inferred behavior for all lengths,
including lengths longer than the observations; memorizing the table is insufficient.

Operation definitions, with n the current string length (always the input length):

- rK: rotate LEFT by K modulo n; every operation leaves the empty string empty.
- bK: reverse each successive block of K characters, INCLUDING a shorter final block.
- even: concatenate characters at even indices, then those at odd indices.
- odd: concatenate characters at odd indices, then those at even indices.
- weave: inverse of even; unodd: inverse of odd. These are the unique inverse
  permutations at the current length, including odd lengths.
- rev: reverse all characters; rev_tail: keep the first character and reverse
  the rest; rev_head: reverse everything except the last character.
- rev_modM_R: reverse iff n modulo M equals R; otherwise identity.
- r_modM: rotate left by ONE iff n is divisible by M; otherwise identity.
- half, third, two_thirds, ceil_half: rotate LEFT by floor(n/2), floor(n/3),
  floor(2*n/3), ceil(n/2), respectively.

The listed names are operations, not unknown numeric parameter families: for
example r3 means exactly a left rotation by three. Inferring which operation
occupies each stage and both substitution parameters is the task.

## Hypothesis specification

```json
{
  "alphabet": "abcdefghijklmnopqrstuvwxyz0123456789",
  "shift_range": [
    0,
    35
  ],
  "stages": [
    [
      "r4",
      "r2",
      "r3",
      "r1"
    ],
    [
      "b3",
      "b4",
      "b2",
      "b5"
    ],
    [
      "unodd",
      "odd",
      "even",
      "weave"
    ],
    [
      "r5",
      "r4",
      "r2",
      "r1"
    ],
    [
      "rev_mod2_0",
      "rev_mod3_1",
      "rev_mod2_1",
      "rev_mod3_0"
    ],
    [
      "b5",
      "b4",
      "b3",
      "b2"
    ],
    [
      "half",
      "third",
      "ceil_half",
      "two_thirds"
    ],
    [
      "odd",
      "weave",
      "even",
      "unodd"
    ],
    [
      "r_mod7",
      "r_mod5",
      "r_mod4",
      "r_mod3"
    ],
    [
      "rev_tail",
      "rev_head",
      "rev",
      "half"
    ],
    [
      "b6",
      "b3",
      "b4",
      "b5"
    ],
    [
      "r3",
      "r1",
      "r2",
      "r5"
    ]
  ]
}
```

## Observations

```json
[
  {
    "input": "",
    "output": ""
  },
  {
    "input": "a",
    "output": "l"
  },
  {
    "input": "ab",
    "output": "mo"
  },
  {
    "input": "abc",
    "output": "lqs"
  },
  {
    "input": "abcd",
    "output": "oosw"
  },
  {
    "input": "abcde",
    "output": "mquyx"
  },
  {
    "input": "abcdef",
    "output": "oovv22"
  },
  {
    "input": "abcdefg",
    "output": "qov0024"
  },
  {
    "input": "abcdefgh",
    "output": "quv10138"
  },
  {
    "input": "abcdefghi",
    "output": "tuww17499"
  },
  {
    "input": "abcdefghij",
    "output": "osswx88fgi"
  },
  {
    "input": "abcdefghijk",
    "output": "sxtx30dbagn"
  },
  {
    "input": "abcdefghijkl",
    "output": "uvx2ybdaeffk"
  },
  {
    "input": "abcdefghijklm",
    "output": "npwy4c6ejiqiu"
  },
  {
    "input": "abcdefghijklmn",
    "output": "yzxy67b79ersqr"
  },
  {
    "input": "abcdefghijklmno",
    "output": "mrx85ag6gejtxt0"
  },
  {
    "input": "abcdefghijklmnop",
    "output": "uvvv5fhcemikyz3u"
  },
  {
    "input": "abcdefghijklmnopq",
    "output": "1tx87c4einspnr6yx"
  },
  {
    "input": "abcdefghijklmnopqr",
    "output": "p35430j9mhopm5zw9b"
  },
  {
    "input": "abcdefghijklmnopqrs",
    "output": "3r5az8glgngnv0v0e0c"
  },
  {
    "input": "abcdefghijklmnopqrst",
    "output": "s7801ghbrpqk0yzu934f"
  },
  {
    "input": "abcdefghijklmnopqrstu",
    "output": "z4v0g0cnrfr2tyt5a74le"
  },
  {
    "input": "abcdefghijklmnopqrstuv",
    "output": "m3xyb2l9mjyzt41uh5crln"
  },
  {
    "input": "abcdefghijklmnopqrstuvw",
    "output": "o490ydidiozqvo8d8m8kugh"
  },
  {
    "input": "abcdefghijklmnopqrstuvwx",
    "output": "2sc6d55fgkgwr6r78nigvwi1"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxy",
    "output": "16x8glcnaypunw41l3n6dr2tq"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz",
    "output": "0sg8y06jke0o34w34jketo34vb"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0",
    "output": "b27yc7c7ccn5a1wejaf8qvq6r99"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz01",
    "output": "2pc0f53fgmjyze2hcrsuvfhvt83d"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz012",
    "output": "b27yi9kyekpim7uglcntkpmkrdi9f"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123",
    "output": "auvv0detoq50lg8ni8juelm1xydezr"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz01234",
    "output": "d490c7c0c3h5a1f6h8dpkdk4lscneet"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz012345",
    "output": "e9vp2ucdsixydeij52h7mn2x78ri0cdn"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123456",
    "output": "3u5weu8w15a16xd490b7c0b20b2744sxp"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz01234567",
    "output": "ass80detos78nicrs6lfgvwb9arq2abql3"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz012345678",
    "output": "3e5a49591c27y316y8ubx8z4e5a5v4916x9"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123456789",
    "output": "ijx267mn2u9aqq1ydetl01ghoo45kcrs78z3"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123456789 ",
    "output": "b27ye18y35a16xb27x527y3uw1y 00sxozlh3"
  },
  {
    "input": "aa",
    "output": "lo"
  },
  {
    "input": "aaaaaaa",
    "output": "lorux03"
  },
  {
    "input": "aaaaaaaaaaaaaaaaa",
    "output": "lorux0369cfilorux"
  },
  {
    "input": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "output": "lorux0369cfilorux0369cfilorux03"
  },
  {
    "input": "the quick fox",
    "output": "pvbazn gekt1 "
  },
  {
    "input": "  spaces  ",
    "output": "0o c  5 rg"
  },
  {
    "input": "a1b2c3",
    "output": "dotlq1"
  },
  {
    "input": "999zz",
    "output": "kngjw"
  },
  {
    "input": "hello",
    "output": "pz284"
  }
]
```

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
