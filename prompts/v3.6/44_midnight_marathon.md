# midnight_marathon

The marathon. Implement a complete interpreter for MIDNIGHT, a small language
whose semantics were partly GENERATED for this benchmark - read every rule,
because some deliberately differ from what you would guess. Write:

    def run(src: str) -> list

run parses and executes a MIDNIGHT program and returns the list of output
strings. Everything below is graded, including exact error lines and codes,
and your interpreter is fuzz-compared against a hidden reference on generated
programs. A 99%-correct interpreter fails.

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
- Integers are unbounded (no overflow, no wraparound).
- Builtins: len(s) -> length of a str (non-str: type error);
  str(x) -> string form; int(s) -> parse a str matching -?digits
  (non-str arg: type error; anything unparseable: value error).
  Wrong number of args to any builtin or function: args error.
- Calling an unknown function: name error. Function calls nested deeper than
  600: depth error.

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

== SCALE - THIS IS THE MARATHON RUNG ==
The graded programs are LONG and DEEP, and they are checked exactly:
- sources up to ~260 lines (comments and blank lines included in numbering),
  with if/while blocks nested up to 8 levels;
- while-loops of up to 100,000 iterations whose accumulated state is compared
  exactly - including loops of negative floor division and modulo;
- recursion that runs right up to the 600-call limit: one graded program
  returns out of a chain of exactly 600 nested calls, and another must
  report "depth" one call later. Python's DEFAULT recursion limit is not
  enough to interpret those programs - a tree-walking interpreter needs
  several Python frames per MIDNIGHT call;
- errors raised tens of thousands of iterations into a run, where every line
  printed before the error must still be there, in order.
Wall-clock matters: the whole hidden batch must finish inside the task time
limit, so an interpreter that re-parses or re-scans per statement will time
out even when it is correct.

Examples (exact):

    run('print 2 + 3 * 4\nprint (2 + 3) * 4\nprint "he" + "llo"\nprint not false') -> ['14', '20', 'hello', 'true']
    run('let x = 3\nwhile x > 0\n  print x\n  set x = x - 1\nend\nprint 1 / 0') -> ['3', '2', '1', 'HALT line 6: value']
    run('print -7 / 2\nprint -7 % 2\nprint 7 / -2\nprint 7 % -2') -> ['-4', '1', '-4', '-1']
    run('print len("midnight")\nprint str(42) + "!"\nprint int("-19") + 1') -> ['8', '42!', '-18']
    run('print 1 == true\nprint "1" == 1\nprint "a" < "b"') -> ['false', 'false', 'true']
    run('let i = 0\nwhile i < 6\n  set i = i + 1\n  if i % 2 == 0\n    continue\n  end\n  if i == 5\n    break\n  end\n  print i\nend\nprint "done"') -> ['1', '3', 'done']
    run('fun fib(n)\n  if n < 2\n    return n\n  end\n  return fib(n - 1) + fib(n - 2)\nend\nprint fib(12)') -> ['144']
    run('let x = 1\nfun shadow()\n  let x = 9\n  set x = x + 1\n  return x\nend\nprint shadow()\nprint x') -> ['10', '1']
    run('fun noret(a)\n  print a\nend\nprint noret(5)') -> ['5', '0']
    run('fun f(n)\n  if n == 0\n    return 0\n  end\n  return 1 + f(n - 1)\nend\nprint f(599)') -> ['599']
    run('fun f(n)\n  if n == 0\n    return 0\n  end\n  return 1 + f(n - 1)\nend\nprint f(600)') -> ['HALT line 5: depth']
    run('let i = 0\nwhile i < 3\n  let t = 1\n  set i = i + 1\nend') -> ['HALT line 3: name']
    run('break') -> ['HALT line 1: flow']
    run('print y') -> ['HALT line 1: name']
    run('if 1\n  print 1\nend') -> ['HALT line 1: type']

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
