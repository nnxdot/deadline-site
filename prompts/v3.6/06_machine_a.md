# machine_a

Write a Python function:

    def run(events: list) -> tuple

A state machine GENERATED for this benchmark. It starts in state "BRINYX"
and processes events in order. For each event, look up (current state, event)
in the transition table below, move to the new state, and append the output
word to the output list.

ONE OVERRIDE RULE: the event "gam" also increments a counter (which
starts at 0 and NEVER resets). On the exact transition where the counter
REACHES 3, the table is overridden: the machine moves to state
"GAMZEL" and outputs "rif!" instead of the table entry. Later
"gam" events keep incrementing the counter but follow the table
normally.

An event not in the table for the current state raises ValueError.
Return the tuple (final_state, outputs_list, counter_value).
run([]) -> ("BRINYX", [], 0).

Transition table (state | event | next state | output):

| state | event | next | output |
|---|---|---|---|
| BRINYX | gam | GAMZEL | vex-nyx |
| BRINYX | jol | GAMZEL | bri-hux |
| BRINYX | kor | GAMVEX | sov-qua |
| BRINYX | mur | HUXTUL | vex-nyx |
| GAMTAS | gam | GAMZEL | kor-sov |
| GAMTAS | jol | HUXTUL | bri-hux |
| GAMTAS | kor | GAMTAS | wex-jol |
| GAMTAS | mur | BRINYX | bri-hux |
| GAMVEX | gam | BRINYX | kor-sov |
| GAMVEX | jol | BRINYX | bri-hux |
| GAMVEX | kor | GAMVEX | bri-hux |
| GAMVEX | mur | GAMVEX | bri-hux |
| GAMZEL | gam | BRINYX | gam-bri |
| GAMZEL | jol | BRINYX | gam-bri |
| GAMZEL | kor | HUXTUL | kor-sov |
| GAMZEL | mur | HUXTUL | sov-qua |
| HUXTUL | gam | HUXTUL | wex-jol |
| HUXTUL | jol | GAMVEX | gam-bri |
| HUXTUL | kor | GAMZEL | bri-hux |
| HUXTUL | mur | GAMVEX | gam-bri |

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
