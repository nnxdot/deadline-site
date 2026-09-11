# 23_js_cipher_traces

A hidden JavaScript program transforms strings. You can observe its
behavior below, but its rules are not given. Reverse-engineer it and
implement `module.exports.transform(s)` so that it reproduces the
hidden program EXACTLY, for any input string over lowercase letters,
digits, and spaces.

Observed behavior (input -> output):

    "3sm9j42po3"  ->  "yggy41iof2"
    "5n3fvrj0pjax1jbo"  ->  "fixam2pgr0e69w2y"
    "au654k2m h5b7z97"  ->  "ingjh nmh70znule"
    "pixeerkq 8e"  ->  "92ytq sx24m"
    "   g lix520"  ->  "  w ciu 9yg"
    " 4siq98 9iv7np"  ->  "4 m57mi2lvw 1k"

Rules: Node.js built-in modules only, CommonJS (`module.exports`). One blind attempt.

canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a
