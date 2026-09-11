# grand_machine

Write a Python function:

    def run(events: list) -> tuple

A large state machine GENERATED for this benchmark. NOTHING is hidden: the
complete 36-state transition table and every global rule are printed below.
The difficulty is transcription and cross-referencing at scale, not inference.

The machine carries:

    state    current state name, starts at "BRIN"
    charge   integer counter, starts at 0, NEVER resets
    lock     lockout countdown, starts at 0
    held     number of events swallowed by lockouts, starts at 0

plus a one-shot flag recording whether RULE 3 (surge) has already fired.

The ten legal event names are:

    arq  bel  cyn  dov  esk  fum  gil  hov  irk  jax

Process the events in order. For EACH event apply these steps in exactly this
order, then move on to the next event:

STEP 1 -- VALIDATE. If the event is not one of the ten names above (or is not
a string at all), raise ValueError.

STEP 2 -- RULE 1, CHARGE. Add to charge: "gil" adds 1, "jax" adds 3, every
other event adds 0. This happens for EVERY event that survives step 1,
including events swallowed by a lockout and the event that fires the surge.

STEP 3 -- RULE 2, LOCKOUT. If lock > 0 the event is swallowed: subtract 1 from
lock, add 1 to held, append "wait" to the outputs, and this event is finished.
The table is NOT consulted (so a swallowed event can never be rejected for
being illegal in the current state), the state does not change, and rules 3
and 4 do not run for it.

STEP 4 -- RULE 3, SURGE. Otherwise, if the surge has not fired yet and charge
is now 7 or more, the surge fires now and this event is finished: the state
becomes "PYLO", "surge" is appended to the outputs, the table is NOT
consulted, and rule 4 does not run. The surge fires at most ONCE per run.
Because step 3 is checked first, if charge first reaches 7 while a lockout is
running the surge waits and fires on the first event the lockout does not
swallow.

STEP 5 -- TABLE. Otherwise look up (state, event) in the table below. If that
pair is not listed, raise ValueError. Otherwise take the listed next state and
output word.

STEP 6 -- RULE 4, SELF-LOOP REDIRECT. If the next state from step 5 is the
SAME as the current state and charge is now ODD, the next state becomes
"ZEBU" instead. The output word is unchanged. If charge is even the self-loop
stands.

STEP 7 -- COMMIT. Move to the next state and append the output word.

STEP 8 -- ARM. If the word appended in step 7 is exactly "halt", set lock to
2. A fresh "halt" always restarts the countdown at 2. Only step 7 can arm a
lockout: "wait" and "surge" never do.

Return the tuple (state, outputs, charge, held) after all events.

TRANSITION TABLE -- one line per state, each cell written event:NEXT/output.
A (state, event) pair that does not appear on that state's line is ILLEGAL.
The first line says that in state BRIN the event "bel" moves to JOMB and
outputs "ivy", and that "arq" and "esk" are illegal in BRIN.

    BRIN  bel:JOMB/ivy  cyn:PYLO/gum  dov:DRUM/jet  fum:OPAL/dew  gil:CROM/lox  hov:CROM/elm  irk:BLIX/bog  jax:BRIN/ash
    CALD  arq:OPAL/fig  bel:UVEN/fig  cyn:RAST/bog  dov:YARL/halt  esk:XANO/fig  fum:YARL/ash  hov:JOMB/dew  irk:MOTH/dew  jax:TARN/elm
    DORV  cyn:INKA/jet  dov:CROM/dew  esk:KREN/fig  fum:ELMA/gum  gil:DORV/cog  hov:ELMA/hay  jax:PYLO/bog
    ELMA  arq:EBON/ivy  cyn:KREN/dew  dov:DORV/cog  esk:CALD/elm  fum:DRUM/ivy  gil:TARN/bog  hov:CALD/ivy  jax:PYLO/fig
    FURN  arq:EBON/kit  bel:ARCH/gum  cyn:NERV/ash  dov:YARL/dew  esk:ELMA/dew  irk:YARL/jet  jax:KREN/bog
    GLAV  arq:RAST/gum  bel:JOMB/halt  cyn:FURN/hay  dov:IRVA/lox  esk:KREN/cog  fum:KILN/cog  gil:JOMB/dew  hov:GLAV/gum  irk:VOLK/ash
    HOLT  arq:CALD/elm  bel:XANO/ash  dov:IRVA/gum  esk:LUMA/ivy  gil:FURN/jet  hov:JUNO/fig  irk:MOTH/elm  jax:ELMA/jet
    IRVA  arq:JOMB/ash  bel:YARL/kit  cyn:PYLO/gum  dov:SOLD/lox  esk:IRVA/cog  fum:CALD/bog  gil:NERV/hay  irk:CALD/lox  jax:YARL/hay
    JOMB  arq:QUIR/dew  bel:GNOM/jet  cyn:FLAX/jet  dov:GLAV/cog  fum:JOMB/ivy  gil:TARN/dew  hov:MOTH/dew  irk:CALD/ash  jax:FLAX/cog
    KREN  bel:QUIR/ivy  cyn:ELMA/bog  esk:FLAX/jet  fum:JUNO/hay  gil:HOLT/cog  hov:LUMA/hay  irk:IRVA/gum  jax:JOMB/jet
    LUMA  arq:EBON/ash  bel:FLAX/halt  dov:LUMA/cog  esk:RAST/hay  fum:BLIX/elm  gil:QUIR/jet  hov:KREN/cog  irk:OPAL/fig  jax:FURN/dew
    MOTH  arq:ZEBU/bog  bel:BLIX/lox  cyn:OPAL/ash  dov:ZEBU/gum  esk:MOTH/ash  gil:XANO/lox  hov:JUNO/gum  jax:FURN/fig
    NERV  arq:FURN/fig  bel:LUMA/hay  cyn:GNOM/bog  dov:CALD/jet  esk:NERV/kit  fum:GLAV/kit  hov:HOLT/ash
    OPAL  arq:YARL/elm  cyn:ZEBU/elm  dov:INKA/lox  esk:WREN/ivy  fum:IRVA/hay  gil:XANO/bog  hov:TARN/cog  irk:UVEN/dew  jax:YARL/halt
    PYLO  arq:EBON/lox  bel:PYLO/fig  cyn:JUNO/jet  fum:CROM/cog  gil:ELMA/ash  irk:NERV/lox  jax:GLAV/jet
    QUIR  arq:KREN/jet  bel:QUIR/dew  esk:SOLD/bog  fum:FLAX/elm  gil:TARN/hay  hov:LUMA/hay  irk:FURN/elm  jax:JUNO/ash
    RAST  bel:PYLO/cog  cyn:FURN/ivy  dov:TARN/ivy  esk:LUMA/lox  gil:SOLD/fig  hov:RAST/lox  jax:YARL/lox
    SOLD  arq:INKA/gum  cyn:DORV/cog  dov:QUIR/hay  esk:LUMA/elm  fum:SOLD/elm  hov:IRVA/gum  irk:HOLT/bog
    TARN  arq:ZEBU/fig  bel:MOTH/fig  cyn:NERV/halt  dov:TARN/ivy  esk:GLAV/bog  gil:HOLT/bog  hov:RAST/gum  irk:ARCH/bog
    UVEN  arq:BLIX/kit  bel:JOMB/bog  dov:NERV/jet  esk:EBON/elm  fum:MOTH/jet  hov:UVEN/jet  irk:KILN/halt  jax:EBON/gum
    VOLK  arq:DORV/elm  bel:ZEBU/elm  dov:TARN/ash  esk:ELMA/halt  gil:CALD/lox  hov:PYLO/jet  irk:LUMA/kit  jax:QUIR/ash
    WREN  arq:KREN/jet  bel:PYLO/jet  cyn:QUIR/ivy  dov:WREN/kit  esk:YARL/gum  fum:NERV/gum  irk:VOLK/lox
    XANO  arq:ARCH/elm  bel:JOMB/cog  cyn:INKA/gum  dov:CROM/elm  esk:XANO/bog  fum:IRVA/elm  hov:JUNO/fig
    YARL  bel:YARL/kit  cyn:GNOM/fig  dov:BRIN/kit  esk:WREN/bog  fum:FLAX/dew  gil:PYLO/elm  irk:VOLK/kit  jax:CALD/jet
    ZEBU  arq:CROM/jet  bel:JUNO/ash  esk:ARCH/hay  fum:EBON/gum  gil:RAST/hay  hov:KILN/dew  jax:OPAL/cog
    ARCH  arq:JUNO/kit  bel:QUIR/dew  cyn:JUNO/lox  dov:KREN/fig  esk:ARCH/gum  gil:FLAX/cog  hov:HOLT/lox  irk:DRUM/ivy
    BLIX  bel:SOLD/fig  cyn:XANO/gum  dov:HOLT/bog  esk:CROM/jet  fum:JOMB/gum  gil:QUIR/hay  hov:JOMB/hay  irk:GNOM/gum  jax:GLAV/gum
    CROM  arq:HAZE/elm  bel:VOLK/cog  cyn:ARCH/jet  dov:VOLK/dew  fum:GNOM/elm  gil:JUNO/elm  irk:XANO/cog  jax:TARN/elm
    DRUM  arq:YARL/ash  bel:YARL/dew  cyn:KILN/jet  esk:MOTH/bog  gil:DORV/lox  hov:XANO/hay  irk:QUIR/jet
    EBON  arq:FLAX/hay  cyn:XANO/fig  dov:OPAL/elm  esk:JUNO/jet  fum:WREN/halt  gil:KILN/gum  hov:RAST/kit  irk:FLAX/jet  jax:FURN/ash
    FLAX  arq:BLIX/hay  bel:FLAX/gum  dov:ARCH/hay  esk:JUNO/lox  fum:NERV/jet  gil:RAST/elm  hov:JUNO/fig  irk:OPAL/cog  jax:SOLD/elm
    GNOM  arq:MOTH/hay  bel:RAST/gum  cyn:DRUM/kit  dov:JUNO/kit  esk:LUMA/ivy  fum:CROM/halt  gil:MOTH/halt  hov:RAST/lox  jax:CROM/fig
    HAZE  arq:GLAV/dew  bel:YARL/ivy  cyn:OPAL/hay  dov:VOLK/dew  esk:WREN/fig  fum:IRVA/jet  irk:OPAL/halt  jax:HOLT/ash
    INKA  arq:HOLT/kit  bel:WREN/hay  dov:WREN/dew  esk:EBON/dew  fum:UVEN/elm  gil:INKA/hay  hov:VOLK/lox  jax:ELMA/elm
    JUNO  bel:ARCH/hay  cyn:XANO/lox  esk:YARL/ivy  gil:ZEBU/gum  hov:JUNO/kit  irk:CALD/halt  jax:DORV/ivy
    KILN  bel:YARL/jet  cyn:IRVA/elm  esk:FLAX/cog  fum:JUNO/elm  gil:PYLO/lox  hov:MOTH/fig  irk:VOLK/hay  jax:KILN/ivy

Examples:

    run([]) -> ('BRIN', [], 0, 0)
    run(['fum', 'fum', 'cyn', 'irk', 'cyn']) -> ('GNOM', ['dew', 'hay', 'gum', 'lox', 'bog'], 0, 0)
    run(['jax', 'fum', 'irk']) -> ('FLAX', ['ash', 'gum', 'jet'], 3, 0)
    run(['gil', 'fum', 'arq', 'jax', 'irk', 'bel']) -> ('YARL', ['lox', 'elm', 'hay', 'fig', 'jet', 'kit'], 4, 0)
    run(['fum', 'jax', 'fum', 'gil', 'gil', 'cyn']) -> ('JUNO', ['dew', 'halt', 'wait', 'wait', 'elm', 'jet'], 5, 2)
    run(['jax', 'jax', 'gil', 'jax', 'esk', 'gil']) -> ('HOLT', ['ash', 'cog', 'surge', 'jet', 'cog', 'cog'], 11, 0)
    run(['bel', 'irk', 'jax', 'cyn', 'jax', 'gil', 'bel', 'arq', 'fum', 'jax']) -> ('WREN', ['ivy', 'ash', 'elm', 'halt', 'wait', 'wait', 'surge', 'lox', 'halt', 'wait'], 10, 3)

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
