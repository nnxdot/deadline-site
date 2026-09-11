# familiar_json

Write a Python function:

    def parse(text: str)

`text` holds one document written in JOSN. JOSN looks like JSON and is not
JSON. Return the value the document denotes, built only from Python `dict`,
`list`, `str`, `int`, `bool` and `None`. Any text that is not a well-formed
JOSN document must raise `ValueError`.

In every example below the argument is shown as a Python string literal, so a
backslash that occurs in the document appears doubled.

## THREE RULES THAT ARE NOT THE STANDARD JSON RULES

Read all three. Each one is demonstrated by an example further down. A
memorised JSON parser is wrong on all three.

**NOT the standard rule 1 — `\u` escapes are DECIMAL, not hexadecimal.**
Inside a string, `\u` is followed by EXACTLY FOUR DECIMAL DIGITS `0`-`9`, and
the escape denotes `chr(<that decimal number>)`. So `\u0065` is `'A'`
(`chr(65)`), NOT `'e'`. The hex letters `a`-`f` and `A`-`F` are not digits
here: any character other than `0`-`9` in those four positions is an error,
and so is a run of fewer than four digits. All values `0000`-`9999` are
legal, and there are no surrogate pairs — `\u0233` is `chr(233)`, one
character.

**NOT the standard rule 2 — arrays REQUIRE a trailing comma; objects FORBID
one.** Every element of an array, INCLUDING THE LAST ONE, must be followed by
a comma. `[1, 2,]` is the well-formed array `[1, 2]`; `[1, 2]` is an ERROR
because `2` has no comma after it. The empty array is written `[]`, with no
comma. Objects behave the opposite way, exactly like JSON: members are
separated by commas and a trailing comma is an ERROR, so `{a: 1,}` is
invalid. The empty object is `{}`.

**NOT the standard rule 3 — object keys may be bare names.** A key is either
a quoted string or a bare name matching `[A-Za-z_][A-Za-z0-9_]*`. `{a: 1}`
and `{"a": 1}` denote the same value. A bare name is a KEY ONLY: it is never
a value, so `[a,]` is an error, and a name that starts with a digit is not a
key, so `{1: 2}` is an error.

## Remaining syntax and string rules

- Values: object, array, string, number, `true`, `false`, `null`. The
  document is one value, optionally surrounded by whitespace, and nothing
  else may follow it.
- Whitespace is space, tab, newline and carriage return, and is allowed
  between any two tokens.
- Numbers are INTEGERS ONLY: an optional `-` followed by one or more decimal
  digits, with no leading zero unless the number is exactly `0`. No fraction,
  no exponent, no leading `+`. `-0` parses to `0`. So `01`, `1.5`, `1e3` and
  `+1` are all errors.
- Strings are delimited by `"`. The escapes `\"`, `\\`, `\/`, `\b`, `\f`,
  `\n`, `\r`, `\t` mean what they mean in JSON; `\u` means rule 1; any other
  escape is an error. Every other character stands for itself, including a
  raw control character such as a literal tab. An unterminated string is an
  error.
- Duplicate object keys are allowed and the LAST one wins, so
  `{a: 1, a: 2}` is `{'a': 2}`.
- Objects become `dict`, arrays become `list`, `true`/`false` become
  `True`/`False`, `null` becomes `None`.

## Examples

Rule 1, decimal escapes:

    parse('"\\u0065"') -> 'A'
    parse('"\\u0065\\u0066!"') -> 'AB!'
    parse('"\\u0233"') -> 'é'

Rule 2, array commas:

    parse('[]') -> []
    parse('[1, 2,]') -> [1, 2]
    parse('[[1,],]') -> [[1]]

Rule 3, object keys (and objects rejecting a trailing comma):

    parse('{a: 1}') -> {'a': 1}
    parse('{"a": 1}') -> {'a': 1}
    parse('{a:1,b:2}') -> {'a': 1, 'b': 2}
    parse('{a: [true, null,], "b c": -3}') -> {'a': [True, None], 'b c': -3}

Ordinary behaviour:

    parse('  7  ') -> 7
    parse('0') -> 0
    parse('-0') -> 0
    parse('[10, -408, 0,]') -> [10, -408, 0]
    parse('true') -> True
    parse('false') -> False
    parse('null') -> None
    parse('{}') -> {}
    parse('"a\\/b"') -> 'a/b'

Each of these raises `ValueError`:

    parse('[1, 2]')        last element is not followed by a comma
    parse('{a: 1,}')       an object may not end with a comma
    parse('"\\u006g"')      'g' is not a decimal digit
    parse('"\\u065"')       only three digits
    parse('[a,]')          a bare name is not a value
    parse('{1: 2}')        a bare key may not start with a digit
    parse('01')            leading zero
    parse('1.5')           not an integer
    parse('')              no value at all
    parse('[1,] x')        trailing content after the document
    parse('+1')            leading plus

Documents are at most 20,000 characters and nest at most 30 levels deep;
integers fit in 64 bits. Do not import `json`; a JSON parser gives the wrong
answer here.

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
