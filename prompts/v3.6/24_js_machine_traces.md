# 24_js_machine_traces

A hidden JavaScript state machine consumes event words and emits one
token per event, then reports where it ended up. Its states, wiring,
and emission rules are NOT given - only the traces below. Reverse-
engineer it and implement `module.exports.run(seq)` (seq = array of
event strings, returns the array the hidden machine returns) so it
matches EXACTLY on any event sequence.

Observed traces:

    ["nelo", "mimi", "nelo", "mimi", "miru", "mimi", "nelo", "mimi", "nelo"]  ->  ["gulo3", "kapi6", "ruzo4", "kapi6", "vegu2", "pipi7", "ruzo4", "kapi6", "ruzo4", "KARU"]
    ["nepi", "nepi", "nelo", "nelo", "mimi", "nepi", "nepi", "nelo"]  ->  ["vegu2", "piru3", "gulo3", "piru3", "pipi7", "kapi6", "gupi6", "ruzo4", "KAPI"]
    ["nepi", "mimi", "miru", "nepi", "nepi", "mimi", "mimi", "nelo", "miru", "miru"]  ->  ["vegu2", "kapi6", "vegu2", "kapi6", "gupi6", "pipi7", "pipi7", "ruzo4", "vegu2", "piru3", "MINE"]
    ["miru", "nelo", "nelo", "miru", "miru", "miru", "miru", "nepi", "nepi", "miru"]  ->  ["vegu2", "ruzo4", "piru3", "piru3", "vegu2", "piru3", "vegu2", "gupi6", "gupi6", "piru3", "KARU"]
    ["mimi", "mimi", "nelo", "nepi", "miru", "nepi", "nepi", "nepi", "nepi", "nelo"]  ->  ["ruzo4", "ruzo4", "gulo3", "piru3", "vegu2", "gupi6", "gupi6", "gupi6", "gupi6", "ruzo4", "KAPI"]

Rules: Node.js built-in modules only, CommonJS (`module.exports`). One blind attempt.

canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a
