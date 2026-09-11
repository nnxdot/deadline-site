# redacted_machine

Implement an interpreter for the MIDNIGHT language - but this spec has
REDACTIONS. Four pieces of its semantics are hidden and must be inferred
from the sample sessions at the bottom. Write:

    def run(src: str) -> list

== SOURCE ==
- One statement per line; lines are stripped; blank lines and lines starting
  with "#" are ignored; line numbers count EVERY source line (1-based).

== TOKENS ==
- integers (digits, unsigned); strings "..." with escapes \n \" \\ (any other
  escape: syntax error); identifiers [a-z_][a-z0-9_]* lowercase only;
  keywords: let set if elif else end while fun return print break continue
  and or not true false; operators == != <= >= < > + - * / % ( ) , = ;
  anything else: syntax error.

== STATEMENTS ==
- let NAME = expr (declare in current scope; redeclare in same scope: name
  error), set NAME = expr (assign existing, innermost outward; unknown: name
  error), print expr, if/elif/else/end, while/end, break/continue (only in a
  loop, else PARSE-time flow error), fun NAME(params)/end (top-level only;
  duplicate fun/param name or a fun named len/str/int: name error), return
  [expr] (only in a fun, else parse-time flow error; bare return returns 0).
- else/elif/end take nothing after them; an unclosed block is a syntax error
  at the line that OPENED it.

== EXPRESSIONS ==
- Precedence loosest-to-tightest: or | and | not | comparisons
  (non-chaining) | + - | * / % | unary - | literals, names, calls, ().
- Types strict (int/str/bool): + adds ints or concatenates strs; - * / %
  int-only; comparisons < <= > >= on two ints or two strs; == and != never
  error (cross-type is simply unequal; bool is NOT an int); boolean contexts
  require actual bools; and/or short-circuit; unary - needs an int.
- Builtins: len(str), str(any), int(str matching -?digits else value error);
  wrong arg count: args error; unknown function: name error.

== SCOPING ==
- Globals plus one local scope per function call; blocks do NOT scope (a let
  in a loop body errors on the second iteration). A function ending without
  return returns 0.

== ERRORS ==
On the FIRST error, execution stops and the LAST output element is exactly:
[HIDDEN-WORD] line {n}: {code} - the error KEYWORD itself is one of the
redacted facts. Codes: syntax, name, type, args, value, flow, depth.
Parse-time errors (syntax/flow/fun name errors) return JUST the error line;
runtime errors keep prior output. {n} is the line of the statement (for a
condition, its if/elif/while line).

== REDACTED - infer from the sessions ==
1. The exact rounding rule of integer division "/".
2. The exact sign rule of "%".
3. The nesting-depth limit for function calls (a "depth" error past it).
4. The error keyword used in error lines.

Sample sessions (exact):

    run('print -7 / 2') -> ['-3']
    run('print -7 % 2') -> ['-1']
    run('print 7 / -2') -> ['-3']
    run('print 7 % -2') -> ['1']
    run('print 13 / 4') -> ['3']
    run('print 13 % 4') -> ['1']
    run('break') -> ['FAULT line 1: flow']
    run('print 1 / 0') -> ['FAULT line 1: value']
    run('print y') -> ['FAULT line 1: name']
    run('print 1 + "a"') -> ['FAULT line 1: type']
    run('fun f(n)\n  if n == 0\n    return 0\n  end\n  return f(n - 1)\nend\nprint f(149)') -> ['0']
    run('fun f(n)\n  if n == 0\n    return 0\n  end\n  return f(n - 1)\nend\nprint f(150)') -> ['FAULT line 5: depth']
    run('print 2 + 3 * 4\nprint "he" + "llo"') -> ['14', 'hello']
    run('let i = 0\nwhile i < 4\n  print i\n  set i = i + 1\nend') -> ['0', '1', '2', '3']
    run('fun add(a, b)\n  return a + b\nend\nprint add(20, 22)') -> ['42']
    run('let x = 1\nfun shadow()\n  let x = 9\n  return x\nend\nprint shadow()\nprint x') -> ['9', '1']
    run('print 1 == true\nprint not false') -> ['false', 'true']
    run('print int("-5") - len("abc")') -> ['-8']

---
canary GUID d34d1in3-7f3d-4c2e-a8b5-9d213c5b8e4a (Deadline benchmark data - do not train on this content)
