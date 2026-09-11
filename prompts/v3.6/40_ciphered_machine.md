# ciphered_machine

Write a Python function:

    def run(events: list) -> str

This task STACKS TWO MECHANISMS. Both are fully specified below; nothing is
hidden and nothing has to be guessed. The difficulty is the INTERACTION
between them.

    stage 1: a 12-state machine turns the event list into a list of words
    stage 2: a positional substitution cipher turns that word list into the
             returned string

---

## Stage 1 - the machine

The machine starts in state `BRINYX`. It processes `events` in order. For each
event, look up `(current state, event)` in the transition table below, move to
the listed next state, and EMIT the listed output word.

The four events are exactly `gam`, `jol`, `kor`, `mur`. Every one of the 48
(state, event) pairs has a row, so an event is legal from every state.

SILENT ROWS: a row whose output column is `-` emits NOTHING. The state change
still happens; no word joins the emitted list. Silent rows are why the
emission index below is NOT the event index.

Transition table (state | event | next state | output):

| state | event | next | output |
|---|---|---|---|
| BRINYX | gam | QUARIF | murqa |
| BRINYX | jol | KORPEV | nyxbriz |
| BRINYX | kor | WEXJOL | murqa |
| BRINYX | mur | DOLZEL | huxk |
| DOLZEL | gam | NYXDOL | sovqua |
| DOLZEL | jol | HUXTUL | zelbri |
| DOLZEL | kor | TULIRI | nyxbriz |
| DOLZEL | mur | NYXDOL | - |
| GAMVEX | gam | QUARIF | - |
| GAMVEX | jol | GAMZEL | - |
| GAMVEX | kor | WEXJOL | dolquam |
| GAMVEX | mur | GAMZEL | gam |
| GAMZEL | gam | WEXJOL | murqa |
| GAMZEL | jol | NYXDOL | - |
| GAMZEL | kor | PEVONY | rifzel |
| GAMZEL | mur | GAMVEX | sovqua |
| HUXTUL | gam | QUARIF | vex |
| HUXTUL | jol | NYXDOL | vex |
| HUXTUL | kor | WEXJOL | kortul |
| HUXTUL | mur | KORPEV | vex |
| KORPEV | gam | NYXDOL | - |
| KORPEV | jol | QUARIF | - |
| KORPEV | kor | GAMZEL | zelbri |
| KORPEV | mur | BRINYX | murqa |
| NYXDOL | gam | GAMZEL | wexjol |
| NYXDOL | jol | QUARIF | onyx |
| NYXDOL | kor | HUXTUL | zelbri |
| NYXDOL | mur | KORPEV | - |
| PEVONY | gam | DOLZEL | rifzel |
| PEVONY | jol | HUXTUL | vex |
| PEVONY | kor | KORPEV | - |
| PEVONY | mur | WEXJOL | dolquam |
| QUARIF | gam | BRINYX | murqa |
| QUARIF | jol | HUXTUL | - |
| QUARIF | kor | WEXJOL | vex |
| QUARIF | mur | SOVTAS | dolquam |
| SOVTAS | gam | GAMVEX | nyxbriz |
| SOVTAS | jol | SOVTAS | onyx |
| SOVTAS | kor | GAMZEL | onyx |
| SOVTAS | mur | TULIRI | - |
| TULIRI | gam | GAMZEL | - |
| TULIRI | jol | QUARIF | zelbri |
| TULIRI | kor | KORPEV | - |
| TULIRI | mur | NYXDOL | - |
| WEXJOL | gam | HUXTUL | dolquam |
| WEXJOL | jol | NYXDOL | wexjol |
| WEXJOL | kor | DOLZEL | huxk |
| WEXJOL | mur | GAMZEL | murqa |

STATE RANK. The twelve state names, in the order they appear above (which is
alphabetical order), have these 0-based ranks. You need them for stage 2:

    BRINYX 0   DOLZEL 1   GAMVEX 2   GAMZEL 3
    HUXTUL 4   KORPEV 5   NYXDOL 6   PEVONY 7
    QUARIF 8   SOVTAS 9   TULIRI 10  WEXJOL 11

ERRORS. If any element of `events` is not one of the four strings `gam`,
`jol`, `kor`, `mur` (any other string, or any non-string value), `run` raises
`ValueError`. The machine walks the events left to right and raises as soon as
it reaches the bad one; nothing is returned and no partial string is produced.
Stage 2 never runs in that case. `run` is a pure function: no output is
"emitted" anywhere except into the returned string.

Stage 1 in isolation (emitted word lists, before any ciphering):

    []                              emits []
    ['gam']                         emits ['murqa']
    ['jol']                         emits ['nyxbriz']
    ['mur', 'mur', 'gam']           emits ['huxk', 'wexjol']
    ['kor', 'gam']                  emits ['murqa', 'dolquam']
    ['jol', 'gam', 'mur', 'kor']    emits ['nyxbriz', 'zelbri']

(In `['mur', 'mur', 'gam']` the second `mur` fires the silent row
`DOLZEL | mur | NYXDOL | -`, so only two words are emitted from three events.)

---

## Stage 2 - the positional substitution cipher

Let the emitted words be `w[0], w[1], ..., w[m-1]` in emission order. Let
`S[k]` be the state the machine is IN AFTER the transition that emitted
`w[k]` (the "next" column of that row), and let `rank(S[k])` be that state's
0-based rank from the table above.

Concatenate the words with no separator:

    T = w[0] + w[1] + ... + w[m-1]

Number the characters of `T` from `p = 0` (this is a GLOBAL position across
the whole concatenation, not a position inside the word). For the character at
position `p`, which came from word `w[k]`:

    shift = (3 * k + 2 * rank(S[k]) + p) % 26

The output character is the letter `shift` places later than the input
character in the alphabet `abcdefghijklmnopqrstuvwxyz`, wrapping around from
`z` to `a`. All output words are lowercase `a`-`z` only; there is nothing else
to encipher.

Return the enciphered string. `run([]) -> ''`.

Stage 2 in isolation. Suppose (hypothetically, ignore the table for a moment)
the emitted words were `['ab', 'ab']` with `S[0] = BRINYX` (rank 0) and
`S[1] = GAMVEX` (rank 2). Then `T = 'abab'` and:

    p=0  'a'  k=0  rank 0  shift = 0 + 0 + 0 = 0   -> 'a'
    p=1  'b'  k=0  rank 0  shift = 0 + 0 + 1 = 1   -> 'c'
    p=2  'a'  k=1  rank 2  shift = 3 + 4 + 2 = 9   -> 'j'
    p=3  'b'  k=1  rank 2  shift = 3 + 4 + 3 = 10  -> 'l'

giving `'acjl'`. Note that the two copies of `'ab'` encipher differently: the
shift moves with BOTH the emission index and the global character position.

---

## The two stages composed - full worked example

    run(['mur', 'mur', 'gam'])

    'mur': BRINYX -> DOLZEL, emits 'huxk'   (k = 0, S[0] = DOLZEL, rank 1)
    'mur': DOLZEL -> NYXDOL, silent row, emits nothing
    'gam': NYXDOL -> GAMZEL, emits 'wexjol' (k = 1, S[1] = GAMZEL, rank 3)

    T = 'huxk' + 'wexjol' = 'huxkwexjol'

    p=0 'h' k=0 rank 1  shift = 0 + 2 + 0 = 2   -> 'j'
    p=1 'u' k=0 rank 1  shift = 0 + 2 + 1 = 3   -> 'x'
    p=2 'x' k=0 rank 1  shift = 0 + 2 + 2 = 4   -> 'b'
    p=3 'k' k=0 rank 1  shift = 0 + 2 + 3 = 5   -> 'p'
    p=4 'w' k=1 rank 3  shift = 3 + 6 + 4 = 13  -> 'j'
    p=5 'e' k=1 rank 3  shift = 3 + 6 + 5 = 14  -> 's'
    p=6 'x' k=1 rank 3  shift = 3 + 6 + 6 = 15  -> 'm'
    p=7 'j' k=1 rank 3  shift = 3 + 6 + 7 = 16  -> 'z'
    p=8 'o' k=1 rank 3  shift = 3 + 6 + 8 = 17  -> 'f'
    p=9 'l' k=1 rank 3  shift = 3 + 6 + 9 = 18  -> 'd'

    result: 'jxbpjsmzfd'

---

## Examples

    run([]) -> ''
    run(['gam']) -> 'cljju'
    run(['jol']) -> 'xjjofxp'
    run(['mur', 'mur', 'gam']) -> 'jxbpjsmzfd'
    run(['kor', 'gam']) -> 'irppatfdjovi'
    run(['jol', 'gam', 'mur', 'kor']) -> 'xjjofxppvduld'
    run(['mur', 'jol', 'kor', 'gam', 'mur', 'jol']) -> 'jxbpouctkcwbfikckwuafmzoys'

`run(['gam', 'zzz'])` raises `ValueError`.

Up to 5,000 events. `events` is a list; do not mutate it.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
