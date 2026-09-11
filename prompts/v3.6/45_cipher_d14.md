# cipher_d14

Implement `transform(s)` in Python. Infer a fixed 14-stage permutation
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
      "r2",
      "r4",
      "r3",
      "r1"
    ],
    [
      "b3",
      "b4",
      "b5",
      "b2"
    ],
    [
      "weave",
      "unodd",
      "even",
      "odd"
    ],
    [
      "r4",
      "r5",
      "r1",
      "r2"
    ],
    [
      "rev_mod2_0",
      "rev_mod3_1",
      "rev_mod3_0",
      "rev_mod2_1"
    ],
    [
      "b4",
      "b3",
      "b5",
      "b2"
    ],
    [
      "two_thirds",
      "ceil_half",
      "third",
      "half"
    ],
    [
      "unodd",
      "even",
      "odd",
      "weave"
    ],
    [
      "r_mod4",
      "r_mod5",
      "r_mod7",
      "r_mod3"
    ],
    [
      "rev_head",
      "rev_tail",
      "half",
      "rev"
    ],
    [
      "b3",
      "b6",
      "b4",
      "b5"
    ],
    [
      "r3",
      "r2",
      "r5",
      "r1"
    ],
    [
      "odd",
      "weave",
      "even",
      "unodd"
    ],
    [
      "b4",
      "b8",
      "b7",
      "b6"
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
    "output": "r"
  },
  {
    "input": "ab",
    "output": "rx"
  },
  {
    "input": "abc",
    "output": "tx1"
  },
  {
    "input": "abcd",
    "output": "tw29"
  },
  {
    "input": "abcde",
    "output": "uw3ac"
  },
  {
    "input": "abcdef",
    "output": "t066cj"
  },
  {
    "input": "abcdefg",
    "output": "xx58bjq"
  },
  {
    "input": "abcdefgh",
    "output": "yw57hjqs"
  },
  {
    "input": "abcdefghi",
    "output": "tz67hntuv"
  },
  {
    "input": "abcdefghij",
    "output": "t52bfoowv7"
  },
  {
    "input": "abcdefghijk",
    "output": "ux3bkqsq369"
  },
  {
    "input": "abcdefghijkl",
    "output": "z17aiqus606d"
  },
  {
    "input": "abcdefghijklm",
    "output": "v26gcont4c5hq"
  },
  {
    "input": "abcdefghijklmn",
    "output": "vy76mhyt35ckow"
  },
  {
    "input": "abcdefghijklmno",
    "output": "5078enmz85fmnvp"
  },
  {
    "input": "abcdefghijklmnop",
    "output": "sz5gilu29bknnmp0"
  },
  {
    "input": "abcdefghijklmnopq",
    "output": "537jgr1uwfhdpmyu7"
  },
  {
    "input": "abcdefghijklmnopqr",
    "output": "13ffqlpsb85rll07b7"
  },
  {
    "input": "abcdefghijklmnopqrs",
    "output": "76fbeh3786dehw0364o"
  },
  {
    "input": "abcdefghijklmnopqrst",
    "output": "xbi8urs290lijuy70mcj"
  },
  {
    "input": "abcdefghijklmnopqrstu",
    "output": "x65er0zx4d5lym1z2jrf0"
  },
  {
    "input": "abcdefghijklmnopqrstuv",
    "output": "vc7eqxmvdk7atu866pmnmz"
  },
  {
    "input": "abcdefghijklmnopqrstuvw",
    "output": "xdj6rqovamilg39ybpisqwv"
  },
  {
    "input": "abcdefghijklmnopqrstuvwx",
    "output": "3wmofm25xnalvxqe7qgos771"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxy",
    "output": "537jto1q4kqdy8zhljai0qyae"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz",
    "output": "55qbfw0yyh5tgrai1gkywbb89u"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0",
    "output": "vihqplb742cmuuxizfcxk1bnovj"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz01",
    "output": "xbmtcr2cvoazxbt796ghs7jahstq"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz012",
    "output": "v8hup2b3cbex04z076elb6cd4zd7q"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123",
    "output": "s45rh9az65iyi0f6dnol6qli3uvse9"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz01234",
    "output": "x6jer0dv41clu3ryq4c0d26fs103zil"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz012345",
    "output": "ma58woed4bznkl7e5qstq0j1vwti4h7t"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123456",
    "output": "txfehg3a0wzywnk5sr1t9d22ofwvz87tt"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz01234567",
    "output": "552ofmaj6hitirhufqo26wn85d3een9zrx"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz012345678",
    "output": "7kfb173jxmeumgc5zn1vmj84gc2gvmynj9r"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123456789",
    "output": "zn7l66itezcbo9j5hh2e0avm8k551cdybar7"
  },
  {
    "input": "abcdefghijklmnopqrstuvwxyz0123456789 ",
    "output": "vih4pcb30b6mw8kxs 3lb32poxwikr78fz1o9"
  },
  {
    "input": "aa",
    "output": "rw"
  },
  {
    "input": "aaaaaaa",
    "output": "rw16bgl"
  },
  {
    "input": "aaaaaaaaaaaaaaaaa",
    "output": "rw16bglqv05afkpuz"
  },
  {
    "input": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "output": "rw16bglqv05afkpuz49ejoty38dinsx"
  },
  {
    "input": "the quick fox",
    "output": "74lbiqp  noct"
  },
  {
    "input": "  spaces  ",
    "output": "9  8b 0u i"
  },
  {
    "input": "a1b2c3",
    "output": "syu628"
  },
  {
    "input": "999zz",
    "output": "gv0va"
  },
  {
    "input": "hello",
    "output": "23ckf"
  }
]
```

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
