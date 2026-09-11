# codec_of_programs

Implement `decode_run(data)` in Python. data is bytes or bytearray; return the
integer result of each PROGRAM record in wire order. Any invalid container or
PROGRAM raises ValueError (its message is not graded); no partial list is returned.

The complete binary format, with no padding or extra bytes, is:

- Four magic bytes `b'pgmk'`, one version byte equal to 3, then a two-byte
  unsigned big-endian record count (0..65535).
- Exactly count records, each: two-byte unsigned big-endian id; one flags byte
  (0=PROGRAM, 1=SKIPPED, nothing else); one payload-length byte (1..255); that
  many payload bytes. IDs must strictly increase, including across SKIPPED records.
- One checksum byte `(7 * sum(every preceding byte) + 29) % 256`.

Validate the entire container, including skipped record headers, IDs, lengths
and checksum. Then evaluate PROGRAM payloads. SKIPPED payload bytes are arbitrary
and are never parsed as programs. Empty messages are valid; empty payloads are not.

PROGRAM payloads are ASCII prefix expressions. A literal is `0`, a positive
integer with no leading zeros, or a negative integer with no leading zeros after
its minus sign; `-0` and plus-prefixed literals are forbidden. Binary operators
are `+ - * /`; each consumes exactly two expressions. Every token is separated
by EXACTLY ONE ASCII space, with no leading or trailing space. No parentheses,
tabs, newlines or other bytes are legal. Exactly one expression consumes the
whole payload. Arithmetic has unbounded integer precision; division truncates
toward zero, never uses floating point, and zero divisors are errors.

Inputs have at most 300 records; individual payloads use the full one-byte length
range. Malformed/truncated headers, payloads, flags, IDs, checksums and programs
are tested. Non-bytes/bytearray inputs must raise ValueError.

Examples (hex input -> result):

    '70676d6b030000fb' -> []
    '70676d6b030003000100062f202d3520330002010d6e6f7420612070726f6772616d000500092b2037202a20322033ac' -> [-1, 13]

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
