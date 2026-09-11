# js_frame_recovery

Implement `module.exports.solve(data)` in JavaScript (Node.js 22, CommonJS).

data is an array of ASCII chunks (characters 0..127). Join them as
        one stream containing frames @length:payload#hh; length is canonical
        decimal 0..64, payload exactly length characters, hh exactly two LOWERCASE
        hex digits for sum of payload character codes modulo 256. Starting at
        current position, accept a complete valid frame and advance past it;
        otherwise discard ONE character and retry, including after a malformed or
        truncated frame at EOF. Valid frames inside rejected candidates can thus
        be recovered. Return accepted payloads in order. Ignore junk; chunk
        boundaries never alter results. <=20000 total characters. Replaces the
        underspecified 3.4 Task 24.

Examples:
    ["junk@1:a#61;"] -> ["a"]
    ["@64:oops@1:b#62;"] -> ["b"]

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
