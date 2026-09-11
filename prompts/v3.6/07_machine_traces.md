# machine_traces

Write a Python function:

    def run(events: list) -> tuple

A hidden state machine, GENERATED for this benchmark. You do NOT get its
transition table - you get its observed behavior below, and you must
reverse-engineer the machine and reimplement it EXACTLY.

What you are told about its shape:
- It has EXACTLY 5 states and processes events from the set
  ['bri', 'hux', 'iri', 'jol']. run returns (final_state, outputs, counter) - one output word
  per event.
- Deterministic transitions: (state, event) always gives the same next state
  and output word... except:
- ONE specific event also increments a hidden counter (starting at 0, never
  resetting). On the exact transition where the counter reaches a hidden
  limit, the normal transition is overridden once: the machine jumps to a
  hidden trap state and emits a special output. Later occurrences of that
  event keep counting but follow the normal table.
- An event outside the event set raises ValueError.

Everything else - the state names, the table, which event counts, the limit,
the trap - must be inferred from these observed runs (all exact):

    run([]) -> ('BRIWEX', [], 0)
    run(['bri']) -> ('FENTAS', ['bri-mur'], 0)
    run(['hux']) -> ('BRIWEX', ['kor-pev'], 1)
    run(['iri']) -> ('GAMTUL', ['dol-mur'], 0)
    run(['jol']) -> ('GAMTAS', ['vex-iri'], 0)
    run(['bri', 'bri']) -> ('GAMBRI', ['bri-mur', 'vex-iri'], 0)
    run(['bri', 'hux']) -> ('GAMTAS', ['bri-mur', 'kor-pev'], 1)
    run(['bri', 'iri']) -> ('FENTAS', ['bri-mur', 'fen-vex'], 0)
    run(['bri', 'jol']) -> ('GAMTUL', ['bri-mur', 'kor-pev'], 0)
    run(['hux', 'bri']) -> ('FENTAS', ['kor-pev', 'bri-mur'], 1)
    run(['hux', 'hux']) -> ('BRIWEX', ['kor-pev', 'kor-pev'], 2)
    run(['hux', 'iri']) -> ('GAMTUL', ['kor-pev', 'dol-mur'], 1)
    run(['hux', 'jol']) -> ('GAMTAS', ['kor-pev', 'vex-iri'], 1)
    run(['iri', 'bri']) -> ('GAMTAS', ['dol-mur', 'vex-iri'], 0)
    run(['iri', 'hux']) -> ('GAMTUL', ['dol-mur', 'dol-mur'], 1)
    run(['iri', 'iri']) -> ('GAMTAS', ['dol-mur', 'wex-gam'], 0)
    run(['iri', 'jol']) -> ('BRIWEX', ['dol-mur', 'fen-vex'], 0)
    run(['jol', 'bri']) -> ('BRIWEX', ['vex-iri', 'dol-mur'], 0)
    run(['jol', 'hux']) -> ('GAMTAS', ['vex-iri', 'bri-mur'], 1)
    run(['jol', 'iri']) -> ('BRIWEX', ['vex-iri', 'fen-vex'], 0)
    run(['jol', 'jol']) -> ('GAMBRI', ['vex-iri', 'bri-mur'], 0)
    run(['bri', 'bri', 'jol', 'iri']) -> ('FENTAS', ['bri-mur', 'vex-iri', 'dol-mur', 'fen-vex'], 0)
    run(['iri', 'jol', 'hux', 'bri', 'iri', 'hux', 'jol']) -> ('GAMBRI', ['dol-mur', 'fen-vex', 'kor-pev', 'bri-mur', 'fen-vex', 'kor-pev', 'bri-mur'], 2)
    run(['hux', 'jol', 'bri', 'iri', 'hux', 'hux', 'bri', 'iri', 'iri', 'hux', 'hux', 'jol']) -> ('BRIWEX', ['kor-pev', 'vex-iri', 'dol-mur', 'dol-mur', 'dol-mur', 'jol!', 'bri-mur', 'fen-vex', 'dol-mur', 'dol-mur', 'dol-mur', 'fen-vex'], 5)
    run(['jol', 'jol', 'bri', 'jol', 'jol', 'jol', 'hux', 'jol', 'jol', 'iri']) -> ('BRIWEX', ['vex-iri', 'bri-mur', 'bri-mur', 'bri-mur', 'dol-mur', 'kor-pev', 'dol-mur', 'fen-vex', 'vex-iri', 'fen-vex'], 1)
    run(['jol', 'jol', 'jol', 'iri', 'jol', 'iri', 'bri', 'jol']) -> ('GAMTAS', ['vex-iri', 'bri-mur', 'dol-mur', 'fen-vex', 'kor-pev', 'wex-gam', 'dol-mur', 'vex-iri'], 0)
    run(['jol', 'bri', 'hux', 'bri', 'hux', 'iri', 'bri', 'jol', 'iri']) -> ('GAMTAS', ['vex-iri', 'dol-mur', 'kor-pev', 'bri-mur', 'kor-pev', 'fen-vex', 'bri-mur', 'kor-pev', 'wex-gam'], 2)
    run(['bri', 'jol', 'hux', 'bri', 'bri', 'jol', 'hux', 'iri', 'iri', 'bri']) -> ('GAMTAS', ['bri-mur', 'kor-pev', 'dol-mur', 'vex-iri', 'dol-mur', 'vex-iri', 'bri-mur', 'fen-vex', 'dol-mur', 'vex-iri'], 2)
    run(['bri', 'jol', 'bri', 'bri']) -> ('BRIWEX', ['bri-mur', 'kor-pev', 'vex-iri', 'dol-mur'], 0)
    run(['bri', 'iri', 'hux', 'iri', 'iri', 'hux', 'iri', 'bri', 'hux', 'bri']) -> ('GAMTAS', ['bri-mur', 'fen-vex', 'kor-pev', 'fen-vex', 'dol-mur', 'dol-mur', 'wex-gam', 'dol-mur', 'jol!', 'bri-mur'], 3)
    run(['jol', 'bri', 'bri', 'jol', 'iri', 'hux', 'bri', 'bri']) -> ('FENTAS', ['vex-iri', 'dol-mur', 'bri-mur', 'kor-pev', 'wex-gam', 'bri-mur', 'dol-mur', 'bri-mur'], 1)
    run(['jol', 'jol', 'iri', 'bri', 'bri', 'hux', 'iri', 'iri', 'iri', 'bri', 'jol', 'jol', 'hux', 'bri']) -> ('FENTAS', ['vex-iri', 'bri-mur', 'wex-gam', 'bri-mur', 'vex-iri', 'dol-mur', 'dol-mur', 'wex-gam', 'fen-vex', 'bri-mur', 'kor-pev', 'fen-vex', 'kor-pev', 'bri-mur'], 2)
    run(['hux', 'jol', 'bri', 'iri', 'jol', 'iri', 'bri', 'hux', 'jol']) -> ('GAMBRI', ['kor-pev', 'vex-iri', 'dol-mur', 'dol-mur', 'fen-vex', 'dol-mur', 'vex-iri', 'bri-mur', 'bri-mur'], 2)
    run(['iri', 'bri', 'jol', 'jol', 'iri', 'bri', 'hux', 'bri']) -> ('FENTAS', ['dol-mur', 'vex-iri', 'bri-mur', 'dol-mur', 'fen-vex', 'vex-iri', 'dol-mur', 'bri-mur'], 1)
    run(['jol', 'jol', 'iri', 'hux', 'bri', 'iri', 'jol']) -> ('GAMTUL', ['vex-iri', 'bri-mur', 'wex-gam', 'kor-pev', 'bri-mur', 'fen-vex', 'kor-pev'], 1)
    run(['jol', 'jol', 'hux', 'hux', 'hux', 'iri', 'iri', 'hux', 'iri', 'hux', 'jol']) -> ('GAMBRI', ['vex-iri', 'bri-mur', 'dol-mur', 'kor-pev', 'jol!', 'wex-gam', 'dol-mur', 'dol-mur', 'wex-gam', 'bri-mur', 'bri-mur'], 5)
    run(['iri', 'jol', 'jol', 'iri', 'bri', 'bri', 'hux', 'iri', 'hux']) -> ('GAMTUL', ['dol-mur', 'fen-vex', 'vex-iri', 'fen-vex', 'bri-mur', 'vex-iri', 'dol-mur', 'dol-mur', 'dol-mur'], 2)
    run(['iri', 'bri', 'iri', 'jol', 'iri', 'bri', 'jol', 'bri']) -> ('GAMTAS', ['dol-mur', 'vex-iri', 'fen-vex', 'vex-iri', 'fen-vex', 'bri-mur', 'kor-pev', 'vex-iri'], 0)
    run(['bri', 'jol', 'iri', 'bri', 'bri', 'jol', 'jol', 'jol', 'hux', 'hux', 'iri', 'iri']) -> ('GAMTUL', ['bri-mur', 'kor-pev', 'wex-gam', 'dol-mur', 'bri-mur', 'kor-pev', 'fen-vex', 'vex-iri', 'bri-mur', 'bri-mur', 'fen-vex', 'dol-mur'], 2)
    run(['jol', 'hux', 'bri', 'jol', 'iri', 'bri', 'jol', 'bri', 'jol', 'bri', 'hux', 'bri']) -> ('BRIWEX', ['vex-iri', 'bri-mur', 'dol-mur', 'vex-iri', 'fen-vex', 'bri-mur', 'kor-pev', 'vex-iri', 'bri-mur', 'bri-mur', 'bri-mur', 'dol-mur'], 2)
    run(['hux', 'iri', 'hux', 'jol', 'jol', 'hux', 'iri', 'jol']) -> ('GAMTAS', ['kor-pev', 'dol-mur', 'dol-mur', 'fen-vex', 'vex-iri', 'jol!', 'wex-gam', 'vex-iri'], 3)

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
