# the_midnight_machine

The big one. Implement a complete interpreter for MIDNIGHT, a small language
whose semantics were partly GENERATED for this benchmark - read every rule,
because some deliberately differ from what you would guess. Write:

    def run(src: str) -> list

run parses and executes a MIDNIGHT program and returns the list of output
strings. Everything below is graded, including exact error lines and codes,
and your interpreter is fuzz-compared against a hidden reference on
generated programs. A 99%-correct interpreter fails.

== SOURCE ==
- One statement per line. Lines are stripped; blank lines and lines whose
  first non-space character is "#" are ignored. Line numbers count EVERY
  source line (1-based), including ignored ones.

== TOKENS ==
- integers: digits (no sign - unary minus is an operator)
- strings: "..." with escapes \n (newline), \" (quote), \\ (backslash);
  any other escape is a syntax error
- identifiers: [a-z_][a-z0-9_]* (lowercase only)
- keywords (reserved, never identifiers): let set if elif else end while fun
  return print break continue and or not true false
- operators: == != <= >= < > + - * / % ( ) , =
- anything else (including uppercase letters outside strings): syntax error

== STATEMENTS ==
- "let NAME = expr"  declare NAME in the CURRENT scope with the value.
  Redeclaring a name already in that scope: name error.
- "set NAME = expr"  assign to an existing name, searching innermost scope
  outward; unknown name: name error.
- "print expr"       append the value's string form to the output (ints in
  decimal, strings as-is, booleans as true/false).
- "if expr" ... optional "elif expr" branches ... optional "else" ... "end"
- "while expr" ... "end"
- "break" / "continue"  only inside a loop; anywhere else it is a
  PARSE-time flow error. They affect the innermost loop.
- "fun NAME(a, b, ...)" ... "end"  functions are TOP-LEVEL only (a fun inside
  any block is a syntax error). Duplicate function name, duplicate parameter
  name, or a function named len/str/int: name error at the fun line.
- "return expr" / bare "return" (returns 0)  only inside a function; anywhere
  else is a parse-time flow error.
- "else"/"elif"/"end" must have nothing after them ("if"/"elif"/"while" take
  exactly one expression). A block left unclosed at end of file is a syntax
  error reported at the line that OPENED the block.

== EXPRESSIONS ==
Precedence, loosest to tightest:
  or  |  and  |  not  |  comparisons (non-chaining: "a < b < c" is a syntax
  error)  |  + -  |  * / %  |  unary -  |  literals, names, calls, ( )
- Types are STRICT: int, str, bool.
  + adds two ints or concatenates two strs; - * / % are int-only.
  / is FLOOR division (rounds toward negative infinity); % follows Python's sign rules.
  Division or modulo by zero: value error.
  Comparisons < <= > >= work on two ints or two strs (lexicographic);
  anything else (including bools): type error.
  == and != NEVER error: values of different types are simply unequal
  (bool and int are DIFFERENT types: 1 == true is false).
  and / or / not / if-conditions / while-conditions require ACTUAL booleans;
  a non-bool there is a type error. and/or short-circuit (the right side is
  not evaluated - and not type-checked - when the left side decides).
  Unary - requires an int.
- Builtins: len(s) -> length of a str (non-str: type error);
  str(x) -> string form; int(s) -> parse a str matching -?digits
  (non-str arg: type error; anything unparseable: value error).
  Wrong number of args to any builtin or function: args error.
- Calling an unknown function: name error. Function calls nested deeper than
  300: depth error.

== SCOPING ==
- Two scope levels only: globals, and one local scope per function CALL.
  Blocks (if/while bodies) do NOT create scopes: a let inside a loop body
  runs again on the second iteration and hits the redeclaration error.
- Function bodies see their locals first, then globals. let creates a LOCAL
  inside a function (it may shadow a global); set walks local then global.
- A function that finishes without return returns 0.

== ERRORS ==
On the FIRST error of any kind, execution stops and the LAST element of the
returned list is exactly:  HALT line {n}: {code}
where {code} is one of: syntax, name, type, args, value, flow, depth.
- Parse-time errors (syntax, flow, the fun-related name errors) are detected
  before anything runs: the returned list is JUST the error line.
- Runtime errors keep all output printed so far, then the error line.
- {n} is the source line of the statement being parsed/executed (for a
  condition, the line of its if/elif/while).

Example:
    run('let x = 3\nwhile x > 0\n  print x\n  set x = x - 1\nend\nprint 1 / 0')
    -> ['3', '2', '1', 'HALT line 6: value']

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
